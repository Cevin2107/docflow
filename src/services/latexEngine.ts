import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Paragraph, TextRun, HeadingLevel, Packer, Table, TableRow, TableCell, WidthType } from 'docx';
import { removeDiacritics } from '../utils/formatters';

export interface LatexCompileError {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

export interface LatexCompileResult {
  pdfBytes?: Uint8Array;
  docxBlob?: Blob;
  errors: LatexCompileError[];
  title: string;
}

export const LATEX_TEMPLATES = {
  report: `\\documentclass{article}
\\title{Báo cáo Kỹ thuật DocFlow}
\\author{Nguyễn Văn A}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Giới thiệu}
Hệ thống Unified PDF Workspace hỗ trợ quản lý tài liệu tập trung.
Tất cả các bước xử lý tài liệu được kết nối liên tục (Workflow Chaining).

\\section{Tính năng cốt lõi}
\\begin{itemize}
  \\item Ghép và chia tách PDF linh hoạt.
  \\item Quản lý trang theo thời gian thực.
  \\item Bảo mật dữ liệu 100% trong trình duyệt.
\\end{itemize}

\\section{Kết luận}
DocFlow mang lại trải nghiệm làm việc năng suất và an toàn.
\\end{document}`,

  math: `\\documentclass{article}
\\title{Tài liệu Công thức Toán học & Khoa học}
\\author{Khoa Công nghệ Thông tin}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Định lý và Công thức}
Xét phương trình vi phân và tích phân cơ bản:
$$E = mc^2$$
$$f(x) = \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

\\section{Ma trận & Hệ phương trình}
Hệ phương trình tuyến tính hai ẩn:
$$a_1 x + b_1 y = c_1$$
$$a_2 x + b_2 y = c_2$$

\\section{Nhận xét}
Công thức được biên dịch tự động chuẩn hóa sang PDF và Word DOCX.
\\end{document}`,

  thesis: `\\documentclass{report}
\\title{Luận văn Tốt nghiệp: Hệ thống Xử lý Tài liệu Đám mây}
\\author{Học viên: Trần Thị B}
\\date{2026}

\\begin{document}
\\maketitle

\\section{Tóm tắt Đề tài}
Nghiên cứu tập trung vào việc tối ưu hóa hiệu năng render canvas và các thuật toán phân tách trang tài liệu PDF.

\\section{Phương pháp Nghiên cứu}
Phân tích cấu trúc object stream trong PDF và áp dụng pipeline xử lý song song.

\\section{Kết quả Đạt được}
Giảm thời gian xử lý tệp lớn xuống dưới 1 giây mà không tiêu tốn băng thông máy chủ.
\\end{document}`,

  assignment: `\\documentclass{article}
\\title{Bài tập lớn môn Xử lý Ảnh & Tài liệu}
\\author{Nhóm 5 - Lớp KHTN}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Câu hỏi 1}
Trình bày nguyên lý nén tệp PDF không làm suy giảm chất lượng văn bản.

\\section{Câu hỏi 2}
Viết đoạn mã mô phỏng thuật toán phát hiện trang trắng dựa trên mật độ điểm ảnh pixel.

\\section{Lời giải}
1. Phân tích đối tượng XObject trong cấu trúc cây tài liệu.
2. Kiểm tra chỉ số RGB của ma trận canvas điểm ảnh.
\\end{document}`,
};

/**
 * Validates LaTeX source code for common syntax issues
 */
export function validateLatexSyntax(code: string): LatexCompileError[] {
  const errors: LatexCompileError[] = [];
  const lines = code.split('\n');

  if (!code.includes('\\documentclass')) {
    errors.push({ line: 1, message: 'Thiếu khai báo \\documentclass{...}', type: 'warning' });
  }

  if (code.includes('\\begin{document}') && !code.includes('\\end{document}')) {
    errors.push({ line: lines.length, message: 'Thiếu thẻ kết thúc \\end{document}', type: 'error' });
  }

  // Check matched braces and environments
  const envStack: { name: string; line: number }[] = [];

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    // Check open environment
    const beginMatch = lineText.match(/\\begin\{([a-zA-Z0-9*]+)\}/);
    if (beginMatch) {
      envStack.push({ name: beginMatch[1], line: lineNum });
    }

    // Check close environment
    const endMatch = lineText.match(/\\end\{([a-zA-Z0-9*]+)\}/);
    if (endMatch) {
      const closedName = endMatch[1];
      if (envStack.length === 0) {
        errors.push({ line: lineNum, message: `\\end{${closedName}} không có \\begin tương ứng`, type: 'error' });
      } else {
        const top = envStack.pop()!;
        if (top.name !== closedName) {
          errors.push({
            line: lineNum,
            message: `Môi trường không khớp: bắt đầu \\begin{${top.name}} ở dòng ${top.line} nhưng kết thúc \\end{${closedName}}`,
            type: 'error',
          });
        }
      }
    }
  });

  return errors;
}

/**
 * Renders LaTeX content to high-resolution Canvas pages with 100% Vietnamese Unicode support
 */
function renderLatexPagesToCanvas(
  code: string,
  meta: { title: string; author: string; date: string }
): HTMLCanvasElement[] {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const scale = 2; // 2x Retina scale for high-DPI crisp print quality
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const canvases: HTMLCanvasElement[] = [];

  function createNewCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(pageWidth * scale);
    canvas.height = Math.round(pageHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidth, pageHeight);
    return { canvas, ctx };
  }

  let { canvas: currentCanvas, ctx: currentCtx } = createNewCanvas();
  let currentY = margin;
  let pageNumber = 1;

  function wrapText(text: string, maxWidth: number, font: string): string[] {
    currentCtx.font = font;
    const words = text.split(/\s+/);
    const resultLines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = currentCtx.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine) {
        resultLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
    return resultLines.length > 0 ? resultLines : [''];
  }

  function checkPageBreak(requiredHeight: number) {
    if (currentY + requiredHeight > pageHeight - margin - 35) {
      // Draw page number footer
      currentCtx.font = `9pt ${fontFamily}`;
      currentCtx.fillStyle = '#94a3b8';
      currentCtx.textAlign = 'center';
      currentCtx.fillText(`Trang ${pageNumber}`, pageWidth / 2, pageHeight - margin / 2);
      currentCtx.textAlign = 'left';

      canvases.push(currentCanvas);
      pageNumber++;

      const newPage = createNewCanvas();
      currentCanvas = newPage.canvas;
      currentCtx = newPage.ctx;
      currentY = margin;
    }
  }

  // Render Title (Giữ nguyên tiếng Việt có dấu)
  if (meta.title) {
    const titleLines = wrapText(meta.title, contentWidth, `bold 18pt ${fontFamily}`);
    currentCtx.font = `bold 18pt ${fontFamily}`;
    currentCtx.fillStyle = '#0f172a';
    for (const line of titleLines) {
      checkPageBreak(28);
      currentCtx.fillText(line, margin, currentY + 18);
      currentY += 26;
    }
    currentY += 4;
  }

  // Render Author & Date (Giữ nguyên tiếng Việt có dấu)
  if (meta.author || meta.date) {
    checkPageBreak(22);
    currentCtx.font = `italic 10.5pt ${fontFamily}`;
    currentCtx.fillStyle = '#475569';
    const dateFormatted = meta.date === '\\today' ? new Date().toLocaleDateString('vi-VN') : meta.date;
    const subText = [
      meta.author ? `Tác giả: ${meta.author}` : '',
      dateFormatted ? `Ngày: ${dateFormatted}` : ''
    ].filter(Boolean).join('   •   ');

    currentCtx.fillText(subText, margin, currentY + 11);
    currentY += 20;
  }

  // Divider line
  checkPageBreak(16);
  currentCtx.strokeStyle = '#e2e8f0';
  currentCtx.lineWidth = 1;
  currentCtx.beginPath();
  currentCtx.moveTo(margin, currentY);
  currentCtx.lineTo(pageWidth - margin, currentY);
  currentCtx.stroke();
  currentY += 20;

  const lines = code.split('\n');
  let inDocument = false;
  let sectionIndex = 1;
  let subsectionIndex = 1;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      currentY += 6;
      continue;
    }

    if (trimmed.includes('\\begin{document}')) {
      inDocument = true;
      continue;
    }
    if (trimmed.includes('\\end{document}')) {
      break;
    }
    if (!inDocument && !trimmed.startsWith('\\section')) {
      continue;
    }
    if (trimmed === '\\maketitle' || trimmed.startsWith('\\documentclass')) {
      continue;
    }

    // Section header (Giữ nguyên tiếng Việt có dấu)
    if (trimmed.startsWith('\\section{')) {
      const secTitle = trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');
      subsectionIndex = 1;
      checkPageBreak(38);
      currentY += 10;
      currentCtx.font = `bold 13pt ${fontFamily}`;
      currentCtx.fillStyle = '#1d4ed8';
      const sectionText = `${sectionIndex}. ${secTitle}`;
      const wrappedSec = wrapText(sectionText, contentWidth, `bold 13pt ${fontFamily}`);
      for (const line of wrappedSec) {
        currentCtx.fillText(line, margin, currentY + 13);
        currentY += 20;
      }
      sectionIndex++;
      currentY += 4;
      continue;
    }

    // Subsection header (Giữ nguyên tiếng Việt có dấu)
    if (trimmed.startsWith('\\subsection{')) {
      const subTitle = trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');
      checkPageBreak(30);
      currentY += 8;
      currentCtx.font = `bold 11pt ${fontFamily}`;
      currentCtx.fillStyle = '#1e293b';
      const subText = `${sectionIndex - 1}.${subsectionIndex} ${subTitle}`;
      const wrappedSub = wrapText(subText, contentWidth, `bold 11pt ${fontFamily}`);
      for (const line of wrappedSub) {
        currentCtx.fillText(line, margin, currentY + 11);
        currentY += 16;
      }
      subsectionIndex++;
      currentY += 4;
      continue;
    }

    // Math formula block ($$ ... $$)
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      const formula = trimmed.slice(2, -2).trim();
      checkPageBreak(44);
      currentY += 6;
      currentCtx.fillStyle = '#f8fafc';
      currentCtx.strokeStyle = '#cbd5e1';
      currentCtx.lineWidth = 1;
      currentCtx.beginPath();
      if (typeof (currentCtx as any).roundRect === 'function') {
        (currentCtx as any).roundRect(margin, currentY, contentWidth, 32, 6);
      } else {
        currentCtx.rect(margin, currentY, contentWidth, 32);
      }
      currentCtx.fill();
      currentCtx.stroke();

      currentCtx.font = `bold 11pt "Cambria Math", "Times New Roman", ${fontFamily}`;
      currentCtx.fillStyle = '#0284c7';
      currentCtx.textAlign = 'center';
      currentCtx.fillText(formula, pageWidth / 2, currentY + 20);
      currentCtx.textAlign = 'left';

      currentY += 40;
      continue;
    }

    // Itemize bullet point (Giữ nguyên tiếng Việt có dấu)
    if (trimmed.startsWith('\\item')) {
      const itemText = trimmed.replace(/^\\item\s*/, '');
      const wrappedItem = wrapText(itemText, contentWidth - 24, `10pt ${fontFamily}`);
      checkPageBreak(wrappedItem.length * 16 + 4);

      currentCtx.font = `bold 11pt ${fontFamily}`;
      currentCtx.fillStyle = '#2563eb';
      currentCtx.fillText('•', margin + 6, currentY + 10);

      currentCtx.font = `10pt ${fontFamily}`;
      currentCtx.fillStyle = '#334155';
      for (let i = 0; i < wrappedItem.length; i++) {
        currentCtx.fillText(wrappedItem[i], margin + 20, currentY + 10);
        currentY += 16;
      }
      currentY += 2;
      continue;
    }

    // Environment tags
    if (trimmed.startsWith('\\begin{') || trimmed.startsWith('\\end{')) {
      continue;
    }

    // Regular paragraph (Giữ nguyên tiếng Việt có dấu)
    if (trimmed.length > 0) {
      const cleanLine = trimmed
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textit\{([^}]+)\}/g, '$1');
      const wrapped = wrapText(cleanLine, contentWidth, `10pt ${fontFamily}`);
      checkPageBreak(wrapped.length * 16);

      currentCtx.font = `10pt ${fontFamily}`;
      currentCtx.fillStyle = '#334155';
      for (const line of wrapped) {
        currentCtx.fillText(line, margin, currentY + 10);
        currentY += 16;
      }
      currentY += 4;
    }
  }

  // Draw footer on final page
  currentCtx.font = `9pt ${fontFamily}`;
  currentCtx.fillStyle = '#94a3b8';
  currentCtx.textAlign = 'center';
  currentCtx.fillText(`Trang ${pageNumber}`, pageWidth / 2, pageHeight - margin / 2);
  currentCtx.textAlign = 'left';

  canvases.push(currentCanvas);
  return canvases;
}

/**
 * Compiles LaTeX source code to a standardized PDF document with full Vietnamese Unicode preservation
 */
export async function compileLatexToPdf(code: string): Promise<Uint8Array> {
  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const authorMatch = code.match(/\\author\{([^}]+)\}/);
  const dateMatch = code.match(/\\date\{([^}]+)\}/);

  const rawTitle = titleMatch ? titleMatch[1].trim() : 'Tài liệu LaTeX';
  const rawAuthor = authorMatch ? authorMatch[1].trim() : '';
  const rawDate = dateMatch ? dateMatch[1].trim() : '';

  // 1. Browser runtime: High-resolution Canvas rendering retaining 100% Vietnamese diacritics
  if (typeof document !== 'undefined') {
    const canvases = renderLatexPagesToCanvas(code, {
      title: rawTitle,
      author: rawAuthor,
      date: rawDate,
    });

    const pdfDoc = await PDFDocument.create();

    for (const canvas of canvases) {
      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pngImage = await pdfDoc.embedPng(new Uint8Array(arrayBuffer));
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: 595.28,
        height: 841.89,
      });
    }

    return await pdfDoc.save();
  }

  // 2. Headless fallback for Node environments (test suites)
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 55;
  const lineHeight = 16;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const title = removeDiacritics(rawTitle);
  const author = removeDiacritics(rawAuthor);

  if (title) {
    currentPage.drawText(title, {
      x: margin,
      y: y,
      size: 20,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    y -= 26;
  }

  if (author) {
    currentPage.drawText(`Author: ${author}`, {
      x: margin,
      y: y,
      size: 11,
      font: fontItalic,
      color: rgb(0.35, 0.4, 0.48),
    });
    y -= 22;
  }

  const lines = code.split('\n');
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('\\section{')) {
      const secTitle = trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');
      y -= 10;
      currentPage.drawText(removeDiacritics(secTitle), {
        x: margin,
        y: y,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.3, 0.6),
      });
      y -= 20;
    } else if (trimmed.length > 0 && !trimmed.startsWith('\\')) {
      currentPage.drawText(removeDiacritics(trimmed), {
        x: margin,
        y: y,
        size: 10,
        font: font,
        color: rgb(0.25, 0.25, 0.3),
      });
      y -= lineHeight;
    }
  }

  return await pdfDoc.save();
}

/**
 * Converts LaTeX source to a structured Word .docx document
 */
export async function compileLatexToWord(code: string): Promise<Blob> {
  const lines = code.split('\n');
  const paragraphs: Paragraph[] = [];

  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const authorMatch = code.match(/\\author\{([^}]+)\}/);

  if (titleMatch) {
    paragraphs.push(
      new Paragraph({
        text: titleMatch[1],
        heading: HeadingLevel.TITLE,
      })
    );
  }

  if (authorMatch) {
    paragraphs.push(
      new Paragraph({
        text: `Tác giả: ${authorMatch[1]}`,
        children: [new TextRun({ text: '', italics: true })],
      })
    );
  }

  let inDocument = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.includes('\\begin{document}')) {
      inDocument = true;
      continue;
    }
    if (trimmed.includes('\\end{document}')) break;
    if (!inDocument) continue;

    if (trimmed.startsWith('\\section{')) {
      const sec = trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');
      paragraphs.push(
        new Paragraph({
          text: sec,
          heading: HeadingLevel.HEADING_1,
        })
      );
      continue;
    }

    if (trimmed.startsWith('\\subsection{')) {
      const sub = trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');
      paragraphs.push(
        new Paragraph({
          text: sub,
          heading: HeadingLevel.HEADING_2,
        })
      );
      continue;
    }

    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      const eq = trimmed.slice(2, -2).trim();
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Công thức] ${eq}`,
              bold: true,
              color: '0369a1',
            }),
          ],
        })
      );
      continue;
    }

    if (trimmed.startsWith('\\item')) {
      const item = trimmed.replace(/^\\item\s*/, '');
      paragraphs.push(
        new Paragraph({
          text: `• ${item}`,
        })
      );
      continue;
    }

    if (trimmed.length > 0 && !trimmed.startsWith('\\begin') && !trimmed.startsWith('\\end')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed,
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
