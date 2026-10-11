import puppeteer from 'puppeteer-core';
import type { Browser, Page } from 'puppeteer-core';
import { detectChromeExecutable } from './chromeDetector.ts';
import { generateDocumentHtml } from '../../src/shared/latex/htmlGenerator.ts';
import type { DocumentOptions } from '../../src/shared/latex/types.ts';

const MAX_CONCURRENT_JOBS = parseInt(process.env.PDF_MAX_CONCURRENCY || '3', 10);
const JOB_TIMEOUT_MS = 40000; // 40s per task

class PdfRenderEngine {
  private browser: Browser | null = null;
  private isLaunching = false;
  private activeJobs = 0;
  private queue: Array<() => void> = [];

  /**
   * Lazily initializes or reconnects to headless Chromium instance
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    if (this.isLaunching) {
      // Wait for launch to finish
      while (this.isLaunching) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.browser && this.browser.connected) {
        return this.browser;
      }
    }

    this.isLaunching = true;
    try {
      const executablePath = detectChromeExecutable();
      console.log(`[PdfEngine] Khởi động Chromium từ: ${executablePath}`);

      this.browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--no-first-run',
          '--font-render-hinting=medium',
        ],
      });

      this.browser.on('disconnected', () => {
        console.warn('[PdfEngine] Chromium instance bị ngắt kết nối. Sẽ tự động tái khởi động khi có request mới.');
        this.browser = null;
      });

      return this.browser;
    } finally {
      this.isLaunching = false;
    }
  }

  /**
   * Enqueues rendering request to respect concurrency limits
   */
  private async acquireSlot(): Promise<() => void> {
    if (this.activeJobs < MAX_CONCURRENT_JOBS) {
      this.activeJobs++;
      return () => {
        this.activeJobs--;
        const next = this.queue.shift();
        if (next) next();
      };
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.activeJobs++;
        resolve(() => {
          this.activeJobs--;
          const next = this.queue.shift();
          if (next) next();
        });
      });
    });
  }

  /**
   * Renders LaTeX source code into a standardized vector PDF document
   * @param code LaTeX source code
   * @param options Document format & styling options
   */
  public async renderLatexToPdf(code: string, options?: DocumentOptions): Promise<Uint8Array> {
    const releaseSlot = await this.acquireSlot();

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Quá thời gian biên dịch (${JOB_TIMEOUT_MS / 1000}s)! Vui lòng kiểm tra lại tài liệu.`));
      }, JOB_TIMEOUT_MS);
      // Don't keep event loop alive for timer if completed
      timer.unref?.();
    });

    try {
      return await Promise.race([this.executeRender(code, options), timeoutPromise]);
    } finally {
      releaseSlot();
    }
  }

  private async executeRender(code: string, options?: DocumentOptions): Promise<Uint8Array> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 1. Strict Security: Block all external network requests (anti SSRF)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        // Allow data URIs, about:blank, or local relative assets
        if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:')) {
          req.continue();
        } else {
          // Block all outbound requests to external Internet/Intranet
          req.abort();
        }
      });

      // 2. Set viewport to standard high-DPI desktop
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      // 3. Generate Complete Standalone HTML using unified shared generator
      const html = generateDocumentHtml(code, {
        paperSize: options?.paperSize || 'A4',
        orientation: options?.orientation || 'portrait',
        margins: options?.margins || { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' },
        fontSize: options?.fontSize || '11pt',
        documentTitle: options?.documentTitle,
      });

      // 4. Set page content with strict timeout
      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 30000,
      });

      // 5. Emulate print media and run Auto-Fit calculation in exact print environment
      await page.emulateMediaType('print');

      await page.evaluate(async () => {
        if ('fonts' in document) {
          await (document as any).fonts.ready;
        }
        if (typeof (window as any).docflowFitElements === 'function') {
          (window as any).docflowFitElements();
        }
        await new Promise((r) => setTimeout(r, 200));
      });

      // 6. Generate Vector PDF
      const pdfBuffer = await page.pdf({
        format: (options?.paperSize?.toUpperCase() === 'LETTER' ? 'Letter' : 'A4') as any,
        landscape: options?.orientation === 'landscape',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: options?.margins?.top || '20mm',
          bottom: options?.margins?.bottom || '18mm',
          left: options?.margins?.left || '18mm',
          right: options?.margins?.right || '18mm',
        },
      });

      return new Uint8Array(pdfBuffer);
    } finally {
      await page.close().catch(() => {});
    }
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const pdfEngine = new PdfRenderEngine();
