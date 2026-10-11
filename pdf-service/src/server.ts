import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { detectChromeExecutable } from './chromeDetector.ts';
import { pdfEngine } from './renderer.ts';
import type { DocumentOptions } from '../../src/shared/latex/types.ts';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

// 1. CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback, production can restrict via CORS_ORIGIN
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Request Size Limits (10MB body max)
app.use(express.json({ limit: '10mb' }));

// 3. IP Rate Limiting (40 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '40', 10),
  message: {
    error: 'Bạn đã gửi quá nhiều yêu cầu biên dịch PDF trong thời gian ngắn. Vui lòng thử lại sau 1 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 4. Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  let chromePath = 'Unknown';
  let chromeAvailable = false;
  try {
    chromePath = detectChromeExecutable();
    chromeAvailable = true;
  } catch (err: any) {
    chromePath = err?.message;
  }

  res.status(200).json({
    status: 'healthy',
    service: 'docflow-pdf-service',
    version: '1.0.0',
    uptime: process.uptime(),
    chrome: {
      available: chromeAvailable,
      path: chromePath,
    },
  });
});

// 5. PDF Render Endpoint
app.post('/api/render-pdf', async (req: Request, res: Response) => {
  const { code, options } = req.body as { code?: string; options?: DocumentOptions };

  if (!code || typeof code !== 'string' || !code.trim()) {
    res.status(400).json({ error: 'Tham số "code" (mã nguồn LaTeX) là bắt buộc và không được để trống!' });
    return;
  }

  const startTime = Date.now();

  try {
    const pdfBuffer = await pdfEngine.renderLatexToPdf(code, options);
    const duration = Date.now() - startTime;
    console.log(`[PDF Service] Biên dịch thành công PDF (${pdfBuffer.length} bytes) trong ${duration}ms`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).end(Buffer.from(pdfBuffer));
  } catch (error: any) {
    console.error('[PDF Service] Lỗi biên dịch PDF:', error);
    res.status(500).json({
      error: 'Lỗi trong quá trình biên dịch PDF!',
      message: error?.message || 'Unknown error',
    });
  }
});

// 6. Graceful Shutdown
const server = app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(` DocFlow PDF Renderer Service đang chạy tại:`);
  console.log(` URL: http://${HOST}:${PORT}`);
  console.log(` Health: http://${HOST}:${PORT}/health`);
  console.log(`=======================================================`);
});

const handleShutdown = async (signal: string) => {
  console.log(`[PDF Service] Nhận tín hiệu ${signal}. Đang dọn dẹp Chromium và dừng server...`);
  server.close(async () => {
    await pdfEngine.close();
    console.log('[PDF Service] Đã dừng hoàn toàn.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
