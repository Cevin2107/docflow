import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { removeDiacritics } from '../utils/formatters';
import katex from 'katex';
import html2canvas from 'html2canvas';

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
\\[E = mc^2\\]
\\[f(x) = \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\\]

\\section{Ma trận & Hệ phương trình}
Hệ phương trình lượng giác:
\\[\\begin{bmatrix} x = \\alpha + k2\\pi \\\\ x = \\pi - \\alpha + k2\\pi \\end{bmatrix} \\quad (k \\in \\mathbb{Z})\\]

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
 * Fallback string cleaner for Word export and plain text
 */
export function cleanMathExpression(expr: string): string {
  if (!expr) return '';
  let s = expr;

  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\gamma/g, 'γ');
  s = s.replace(/\\delta/g, 'δ');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\omega/g, 'ω');
  s = s.replace(/\\varphi/g, 'φ');
  s = s.replace(/\\mathbb\{Z\}/g, 'ℤ');
  s = s.replace(/\\mathbb\{R\}/g, 'ℝ');
  s = s.replace(/\\mathbb\{N\}/g, 'ℕ');
  s = s.replace(/\\in/g, ' ∈ ');
  s = s.replace(/\\notin/g, ' ∉ ');
  s = s.replace(/\\pm/g, ' ± ');
  s = s.replace(/\\cdot/g, ' · ');
  s = s.replace(/\\times/g, ' × ');
  s = s.replace(/\\neq/g, ' ≠ ');
  s = s.replace(/\\le\b/g, ' ≤ ');
  s = s.replace(/\\leq\b/g, ' ≤ ');
  s = s.replace(/\\ge\b/g, ' ≥ ');
  s = s.replace(/\\geq\b/g, ' ≥ ');
  s = s.replace(/\\implies/g, ' ⟹ ');
  s = s.replace(/\\iff/g, ' ⟺ ');
  s = s.replace(/\\circ/g, '°');
  s = s.replace(/\\quad/g, '   ');
  s = s.replace(/\\qquad/g, '      ');
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\begin\{bmatrix\}/g, '[ ');
  s = s.replace(/\\end\{bmatrix\}/g, ' ]');
  s = s.replace(/\\\\/g, '  |  ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function cleanInlineMath(text: string): string {
  if (!text) return '';
  let res = text.replace(/\\\\\((.*?)\\\\\)/g, (_, m) => cleanMathExpression(m));
  res = res.replace(/\\\((.*?)\\\)/g, (_, m) => cleanMathExpression(m));
  res = res.replace(/\$([^$]+)\$/g, (_, m) => cleanMathExpression(m));
  return res;
}

/**
 * Validates LaTeX source code
 */
export function validateLatexSyntax(code: string): LatexCompileError[] {
  const errors: LatexCompileError[] = [];
  const lines = code.split('\n');

  const hasDocClass = code.includes('\\documentclass');
  const hasBeginDoc = code.includes('\\begin{document}');
  const hasEndDoc = code.includes('\\end{document}');

  const isFreeformMathDoc = !hasDocClass && (
    code.includes('\\[') || code.includes('\\(') || code.includes('$$') ||
    code.includes('\\begin{') || code.includes('\\alpha') || code.includes('\\sin') ||
    lines.some((l) => l.trim().startsWith('#'))
  );

  if (!hasDocClass && !isFreeformMathDoc) {
    errors.push({ line: 1, message: 'Gợi ý: Thêm \\documentclass{article} cho cấu trúc LaTeX chuẩn', type: 'warning' });
  }

  if (hasBeginDoc && !hasEndDoc) {
    errors.push({ line: lines.length, message: 'Thiếu thẻ kết thúc \\end{document}', type: 'error' });
  }

  return errors;
}

/**
 * Safely renders LaTeX math using KaTeX with fallback
 */
function renderKaTeX(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return `<span class="katex-fallback font-mono text-blue-700">${formula}</span>`;
  }
}

/**
 * Converts any LaTeX, Markdown, or Math text into beautiful, semantic HTML
 */
export function convertLatexToHtml(rawCode: string): string {
  if (!rawCode) return '';

  // 1. Normalize escaped backslashes (\\( -> \(, \\[ -> \[, etc.)
  let code = rawCode.replace(/\\\\([()[\]])/g, '\\$1');

  const lines = code.split('\n');
  const htmlParts: string[] = [];

  let inDocument = !code.includes('\\begin{document}');
  let inDisplayMath = false;
  let mathBuffer: string[] = [];

  // Extract metadata
  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const authorMatch = code.match(/\\author\{([^}]+)\}/);
  const dateMatch = code.match(/\\date\{([^}]+)\}/);
  const mdTitleMatch = code.match(/^#\s+(.+)$/m);

  const docTitle = titleMatch ? titleMatch[1] : (mdTitleMatch ? mdTitleMatch[1].replace(/\*\*/g, '').trim() : '');
  const docAuthor = authorMatch ? authorMatch[1] : '';
  const docDate = dateMatch ? (dateMatch[1] === '\\today' ? new Date().toLocaleDateString('vi-VN') : dateMatch[1]) : '';

  // Render Document Header
  if (docTitle) {
    htmlParts.push(`
      <header class="doc-header pb-4 mb-6 border-b-2 border-slate-200 text-center">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">${docTitle}</h1>
        ${(docAuthor || docDate) ? `
          <div class="text-xs sm:text-sm font-medium text-slate-500 flex items-center justify-center gap-3">
            ${docAuthor ? `<span>Tác giả: <strong class="text-slate-700 font-semibold">${docAuthor}</strong></span>` : ''}
            ${(docAuthor && docDate) ? `<span>•</span>` : ''}
            ${docDate ? `<span>Ngày: ${docDate}</span>` : ''}
          </div>
        ` : ''}
      </header>
    `);
  }

  function parseInline(text: string): string {
    // 1. Parse inline math \( ... \)
    let parsed = text.replace(/\\\((.*?)\\\)/g, (_, m) => renderKaTeX(m, false));
    // 2. Parse inline math $ ... $
    parsed = parsed.replace(/\$([^$]+)\$/g, (_, m) => renderKaTeX(m, false));
    // 3. Parse Markdown bold **...**
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    // 4. Parse Markdown italic *...*
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-700">$1</em>');
    return parsed;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // LaTeX document boundaries
    if (trimmed.includes('\\begin{document}')) {
      inDocument = true;
      continue;
    }
    if (trimmed.includes('\\end{document}')) {
      break;
    }
    if (!inDocument && !trimmed.startsWith('\\section') && !trimmed.startsWith('#')) {
      continue;
    }
    if (trimmed === '\\maketitle' || trimmed.startsWith('\\documentclass')) {
      continue;
    }

    // Accumulate multi-line display math
    if (inDisplayMath) {
      mathBuffer.push(trimmed);
      if (trimmed.includes('\\]') || trimmed.includes('$$') || trimmed.includes('\\end{array}')) {
        inDisplayMath = false;
        const fullFormula = mathBuffer.join('\n').replace(/\\\[|\\\]|\$\$/g, '').trim();
        mathBuffer = [];

        const renderedMath = renderKaTeX(fullFormula, true);
        htmlParts.push(`
          <div class="katex-display-center text-center my-4 py-3 px-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 overflow-x-auto shadow-2xs">
            ${renderedMath}
          </div>
        `);
      }
      continue;
    }

    if (!trimmed) {
      continue;
    }

    // Start of display math block
    if (trimmed.startsWith('\\[') || trimmed.startsWith('$$')) {
      const isSingleLine = (trimmed.startsWith('\\[') && trimmed.includes('\\]') && trimmed.length > 3) ||
                           (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4);

      if (!isSingleLine) {
        inDisplayMath = true;
        mathBuffer = [trimmed];
        continue;
      }

      const inner = trimmed.replace(/^(\\\[|\$\$)/, '').replace(/(\\\]|\$\$)$/, '').trim();
      const renderedMath = renderKaTeX(inner, true);
      htmlParts.push(`
        <div class="katex-display-center text-center my-4 py-3 px-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 overflow-x-auto shadow-2xs">
          ${renderedMath}
        </div>
      `);
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '\\hrule') {
      htmlParts.push(`<hr class="my-5 border-slate-200" />`);
      continue;
    }

    // Heading 1 (# or \section)
    if (trimmed.startsWith('# ') || trimmed.startsWith('\\section{')) {
      let title = trimmed.startsWith('# ')
        ? trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');

      if (title.toLowerCase() === docTitle.toLowerCase() && i < 6) {
        continue;
      }

      htmlParts.push(`
        <h2 class="text-lg sm:text-xl font-bold text-blue-900 border-b border-blue-100 pb-2 mt-7 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
          <span>${parseInline(title)}</span>
        </h2>
      `);
      continue;
    }

    // Heading 2 (## or \subsection)
    if (trimmed.startsWith('## ') || trimmed.startsWith('\\subsection{')) {
      const title = trimmed.startsWith('## ')
        ? trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');

      htmlParts.push(`
        <h3 class="text-base sm:text-lg font-bold text-blue-800 mt-5 mb-2.5">
          ${parseInline(title)}
        </h3>
      `);
      continue;
    }

    // Heading 3 (### or \subsubsection)
    if (trimmed.startsWith('### ') || trimmed.startsWith('\\subsubsection{')) {
      const title = trimmed.startsWith('### ')
        ? trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\subsubsection\{([^}]+)\}.*/, '$1');

      htmlParts.push(`
        <h4 class="text-sm sm:text-base font-semibold text-slate-900 mt-4 mb-2">
          ${parseInline(title)}
        </h4>
      `);
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quote = trimmed.replace(/^>\s*/, '');
      htmlParts.push(`
        <blockquote class="border-l-4 border-indigo-500 bg-indigo-50/50 px-4 py-2.5 my-3 text-slate-700 rounded-r-xl italic text-xs sm:text-sm">
          ${parseInline(quote)}
        </blockquote>
      `);
      continue;
    }

    // List item (*, -, \item)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('\\item') || rawLine.match(/^\s+[*•-]/)) {
      const isNested = rawLine.startsWith('  ') || rawLine.startsWith('\t');
      const itemText = trimmed.replace(/^(\*|-|•|\\item)\s*/, '');

      htmlParts.push(`
        <div class="${isNested ? 'ml-7' : 'ml-2'} flex items-start gap-2.5 my-1.5 text-xs sm:text-sm text-slate-700">
          <span class="${isNested ? 'text-slate-400 font-bold' : 'text-blue-600 font-extrabold'} select-none shrink-0 mt-0.5">
            ${isNested ? '–' : '•'}
          </span>
          <div class="flex-1 leading-relaxed">
            ${parseInline(itemText)}
          </div>
        </div>
      `);
      continue;
    }

    // Ignore raw environment tags
    if (trimmed.startsWith('\\begin{') || trimmed.startsWith('\\end{')) {
      continue;
    }

    // Normal paragraph
    htmlParts.push(`
      <p class="my-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
        ${parseInline(trimmed)}
      </p>
    `);
  }

  return `
    <div class="docflow-math-document p-6 sm:p-10 max-w-4xl mx-auto bg-white text-slate-900 font-sans leading-relaxed selection:bg-blue-100">
      ${htmlParts.join('\n')}
    </div>
  `;
}

/**
 * Compiles LaTeX source code or Math Markdown to a standardized PDF document
 */
export async function compileLatexToPdf(code: string): Promise<Uint8Array> {
  // 1. Browser runtime: High-resolution Canvas rendering retaining 100% Vietnamese and KaTeX Math
  if (typeof document !== 'undefined') {
    const htmlContent = convertLatexToHtml(code);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-10000px';
    container.style.left = '-10000px';
    container.style.width = '794px'; // A4 width at 96 DPI
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    container.innerHTML = htmlContent;

    document.body.appendChild(container);

    try {
      // Allow fonts and math to settle
      await new Promise((r) => setTimeout(r, 60));

      const fullCanvas = await html2canvas(container, {
        scale: 2, // 2x Retina resolution for sharp formulas
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const pdfDoc = await PDFDocument.create();
      const a4WidthPt = 595.28;
      const a4HeightPt = 841.89;

      const pageCanvasHeight = Math.round(fullCanvas.width * (a4HeightPt / a4WidthPt));
      const totalPages = Math.max(1, Math.ceil(fullCanvas.height / pageCanvasHeight));

      for (let p = 0; p < totalPages; p++) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = fullCanvas.width;
        pageCanvas.height = pageCanvasHeight;
        const pageCtx = pageCanvas.getContext('2d')!;

        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvasHeight);

        const srcY = p * pageCanvasHeight;
        const srcH = Math.min(pageCanvasHeight, fullCanvas.height - srcY);

        pageCtx.drawImage(
          fullCanvas,
          0,
          srcY,
          fullCanvas.width,
          srcH,
          0,
          0,
          fullCanvas.width,
          srcH
        );

        // Footer page numbers
        pageCtx.font = '22px sans-serif';
        pageCtx.fillStyle = '#94a3b8';
        pageCtx.textAlign = 'center';
        pageCtx.fillText(`Trang ${p + 1} / ${totalPages}`, pageCanvas.width / 2, pageCanvasHeight - 20);

        const dataUrl = pageCanvas.toDataURL('image/png');
        const imgBytes = await (await fetch(dataUrl)).arrayBuffer();
        const pngImage = await pdfDoc.embedPng(new Uint8Array(imgBytes));

        const pdfPage = pdfDoc.addPage([a4WidthPt, a4HeightPt]);
        pdfPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: a4WidthPt,
          height: a4HeightPt,
        });
      }

      return await pdfDoc.save();
    } finally {
      document.body.removeChild(container);
    }
  }

  // 2. Headless fallback for Node environments (test suites)
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 55;
  const lineHeight = 16;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const rawTitle = titleMatch ? titleMatch[1] : 'Tai lieu LaTeX';
  const title = removeDiacritics(rawTitle);

  if (title) {
    currentPage.drawText(title, {
      x: margin,
      y: y,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    y -= 30;
  }

  const lines = code.split('\n');
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('\\section{') || trimmed.startsWith('# ')) {
      const secTitle = trimmed.replace(/^(\\section\{|#\s+)([^}]+)\}.*/, '$2');
      y -= 10;
      currentPage.drawText(removeDiacritics(secTitle), {
        x: margin,
        y: y,
        size: 13,
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
 * Converts LaTeX source or Math Markdown to a structured Word .docx document
 */
export async function compileLatexToWord(code: string): Promise<Blob> {
  const lines = code.split('\n');
  const paragraphs: Paragraph[] = [];

  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const authorMatch = code.match(/\\author\{([^}]+)\}/);
  const mdTitleMatch = code.match(/^#\s+(.+)$/m);

  const titleText = titleMatch ? titleMatch[1] : (mdTitleMatch ? mdTitleMatch[1].replace(/\*\*/g, '').trim() : '');

  if (titleText) {
    paragraphs.push(
      new Paragraph({
        text: titleText,
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

  let inDocument = !code.includes('\\begin{document}');

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.includes('\\begin{document}')) {
      inDocument = true;
      continue;
    }
    if (trimmed.includes('\\end{document}')) break;
    if (!inDocument) continue;

    // Heading 1
    if (trimmed.startsWith('\\section{') || trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
      let sec = '';
      if (trimmed.startsWith('\\section{')) {
        sec = trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');
      } else if (trimmed.startsWith('# ')) {
        sec = trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '');
        if (sec.toLowerCase() === titleText.toLowerCase()) continue;
      } else {
        sec = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
      }

      paragraphs.push(
        new Paragraph({
          text: cleanInlineMath(sec),
          heading: HeadingLevel.HEADING_1,
        })
      );
      continue;
    }

    // Heading 2
    if (trimmed.startsWith('\\subsection{') || trimmed.startsWith('### ')) {
      let sub = '';
      if (trimmed.startsWith('\\subsection{')) {
        sub = trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');
      } else {
        sub = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
      }

      paragraphs.push(
        new Paragraph({
          text: cleanInlineMath(sub),
          heading: HeadingLevel.HEADING_2,
        })
      );
      continue;
    }

    // Display Math
    if (trimmed.startsWith('\\[') || trimmed.startsWith('$$')) {
      const eq = trimmed.replace(/^(\\\[|\$\$)/, '').replace(/(\\\]|\$\$)$/, '').trim();
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Công thức]  ${cleanMathExpression(eq)}`,
              bold: true,
              color: '0369a1',
            }),
          ],
        })
      );
      continue;
    }

    // List item
    if (trimmed.startsWith('\\item') || trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const item = trimmed.replace(/^(\\item|\*|-)\s*/, '');
      paragraphs.push(
        new Paragraph({
          text: `• ${cleanInlineMath(item).replace(/\*\*([^*]+)\*\*/g, '$1')}`,
        })
      );
      continue;
    }

    // Normal paragraph
    if (trimmed.length > 0 && !trimmed.startsWith('\\begin') && !trimmed.startsWith('\\end') && trimmed !== '---') {
      paragraphs.push(
        new Paragraph({
          text: cleanInlineMath(trimmed).replace(/\*\*([^*]+)\*\*/g, '$1'),
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
