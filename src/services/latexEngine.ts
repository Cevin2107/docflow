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
 * Safely renders LaTeX math using KaTeX with output='html' to prevent MathML duplicate text artifacts
 */
export function renderKaTeX(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html', // Pure HTML output prevents double overlapping text in html2canvas
    });
  } catch {
    return `<span class="katex-fallback font-mono text-blue-700 font-semibold">${formula}</span>`;
  }
}

/**
 * Parses inline formatting: Math \( ... \) or $ ... $, bold **...**, italic *...*
 */
export function parseInlineContent(text: string): string {
  if (!text) return '';
  // 1. Double backslash display math embedded in text \\\[ ... \\\]
  let parsed = text.replace(/\\\\\[(.*?)\\\\\]/g, (_, m) => renderKaTeX(m, true));
  // 2. Standard display math embedded in text \[ ... \]
  parsed = parsed.replace(/\\\[(.*?)\\\]/g, (_, m) => renderKaTeX(m, true));
  // 3. Double backslash inline math \\( ... \\)
  parsed = parsed.replace(/\\\\\((.*?)\\\\\)/g, (_, m) => renderKaTeX(m, false));
  // 4. Standard inline math \( ... \)
  parsed = parsed.replace(/\\\((.*?)\\\)/g, (_, m) => renderKaTeX(m, false));
  // 5. Double dollar math $$ ... $$
  parsed = parsed.replace(/\$\$([^$]+)\$\$/g, (_, m) => renderKaTeX(m, true));
  // 6. Single dollar math $ ... $
  parsed = parsed.replace(/\$([^$]+)\$/g, (_, m) => renderKaTeX(m, false));
  // 7. Bold **...**
  parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  // 8. Italic *...*
  parsed = parsed.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-700">$1</em>');
  return parsed;
}

export interface DocumentBlock {
  type: 'h1' | 'h2' | 'h3' | 'hr' | 'display-math' | 'blockquote' | 'list-item' | 'paragraph';
  content: string;
  isNested?: boolean;
  innerBlocks?: DocumentBlock[];
}

/**
 * Hierarchical document block tokenizer for freeform LaTeX and Markdown Math
 */
export function parseDocumentBlocks(rawLines: string[]): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Ignore formal document tags
    if (trimmed.includes('\\begin{document}') || trimmed.includes('\\end{document}') ||
        trimmed === '\\maketitle' || trimmed.startsWith('\\documentclass')) {
      i++;
      continue;
    }

    // 1. Display Math block (\[ ... \] or $$ ... $$) with handling for trailing punctuation (. or ,)
    const isMathStart = trimmed.startsWith('\\[') || trimmed.startsWith('$$');
    if (isMathStart) {
      const isSingleLine = (trimmed.startsWith('\\[') && trimmed.includes('\\]')) ||
                           (trimmed.startsWith('$$') && trimmed.slice(2).includes('$$'));

      if (isSingleLine) {
        const inner = trimmed
          .replace(/^(\\\[|\$\$)/, '')
          .replace(/(\\\]|\$\$)[.,;]?\s*$/, '')
          .trim();
        blocks.push({ type: 'display-math', content: inner });
        i++;
        continue;
      }

      // Collect multi-line math block
      const mathLines = [trimmed];
      i++;
      while (i < rawLines.length) {
        const line = rawLines[i].trim();
        mathLines.push(line);
        i++;
        if (line.includes('\\]') || line.slice(2).includes('$$') || line.includes('\\end{array}')) {
          break;
        }
      }
      const fullMath = mathLines.join('\n')
        .replace(/^(\\\[|\$\$)/, '')
        .replace(/(\\\]|\$\$)[.,;]?\s*$/, '')
        .trim();
      blocks.push({ type: 'display-math', content: fullMath });
      continue;
    }

    // 2. Blockquote (> ...) - Collect all consecutive lines and parse recursively
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length) {
        const line = rawLines[i];
        const lineTrimmed = line.trim();
        if (lineTrimmed.startsWith('>')) {
          const stripped = lineTrimmed.replace(/^>\s?/, '');
          quoteLines.push(stripped);
          i++;
        } else if (lineTrimmed === '') {
          if (i + 1 < rawLines.length && rawLines[i + 1].trim().startsWith('>')) {
            quoteLines.push('');
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      const innerQuoteBlocks = parseDocumentBlocks(quoteLines);
      blocks.push({ type: 'blockquote', content: '', innerBlocks: innerQuoteBlocks });
      continue;
    }

    // 3. Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '\\hrule') {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith('# ') || trimmed.startsWith('\\section{')) {
      const text = trimmed.startsWith('# ')
        ? trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');
      blocks.push({ type: 'h1', content: text });
      i++;
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('\\subsection{')) {
      const text = trimmed.startsWith('## ')
        ? trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');
      blocks.push({ type: 'h2', content: text });
      i++;
      continue;
    }

    if (trimmed.startsWith('### ') || trimmed.startsWith('\\subsubsection{')) {
      const text = trimmed.startsWith('### ')
        ? trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\subsubsection\{([^}]+)\}.*/, '$1');
      blocks.push({ type: 'h3', content: text });
      i++;
      continue;
    }

    // 5. List items
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('\\item') || rawLine.match(/^\s+[*•-]/)) {
      const isNested = rawLine.startsWith('  ') || rawLine.startsWith('\t');
      const itemText = trimmed.replace(/^(\*|-|•|\\item)\s*/, '');
      blocks.push({ type: 'list-item', content: itemText, isNested });
      i++;
      continue;
    }

    // 6. Regular paragraph
    blocks.push({ type: 'paragraph', content: trimmed });
    i++;
  }

  return blocks;
}

/**
 * Renders an individual DocumentBlock into clean, scoped HTML
 */
export function renderSingleBlockHtml(block: DocumentBlock): string {
  switch (block.type) {
    case 'h1':
      return `
        <div class="docflow-block docflow-h1 text-xl sm:text-2xl font-extrabold text-blue-900 border-b-2 border-blue-200 pb-2 mt-6 mb-3 text-center">
          ${parseInlineContent(block.content)}
        </div>
      `;

    case 'h2':
      return `
        <div class="docflow-block docflow-h2 text-base sm:text-lg font-bold text-blue-800 border-b border-slate-200 pb-1 mt-5 mb-2.5 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
          <span>${parseInlineContent(block.content)}</span>
        </div>
      `;

    case 'h3':
      return `
        <div class="docflow-block docflow-h3 text-sm sm:text-base font-bold text-slate-800 mt-3.5 mb-1.5">
          ${parseInlineContent(block.content)}
        </div>
      `;

    case 'hr':
      return `<div class="docflow-block docflow-hr my-4 border-t border-slate-200"></div>`;

    case 'display-math':
      return `
        <div class="docflow-block docflow-math katex-display-center text-center my-3 py-2 px-3 bg-slate-50/90 rounded-xl border border-slate-200/80 shadow-2xs overflow-x-auto">
          <div class="katex-math-scaler inline-block max-w-full">
            ${renderKaTeX(block.content, true)}
          </div>
        </div>
      `;

    case 'blockquote':
      return `
        <div class="docflow-block docflow-quote my-3 border-l-4 border-indigo-500 bg-indigo-50/70 p-3.5 pl-4 rounded-r-xl shadow-2xs space-y-2">
          ${block.innerBlocks ? block.innerBlocks.map(renderSingleBlockHtml).join('\n') : ''}
        </div>
      `;

    case 'list-item':
      return `
        <div class="docflow-block docflow-list ${block.isNested ? 'ml-6' : 'ml-1'} flex items-start gap-2.5 my-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <span class="${block.isNested ? 'text-slate-400 font-bold' : 'text-blue-600 font-extrabold'} select-none shrink-0 mt-0.5">
            ${block.isNested ? '–' : '•'}
          </span>
          <div class="flex-1">
            ${parseInlineContent(block.content)}
          </div>
        </div>
      `;

    case 'paragraph':
      return `
        <div class="docflow-block docflow-p my-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
          ${parseInlineContent(block.content)}
        </div>
      `;
  }
}

/**
 * Converts a list of DocumentBlocks to clean HTML
 */
function renderBlocksToHtml(blocks: DocumentBlock[]): string {
  return blocks.map(renderSingleBlockHtml).join('\n');
}

/**
 * Converts any LaTeX, Markdown, or Math text into beautiful, semantic HTML
 */
export function convertLatexToHtml(rawCode: string): string {
  if (!rawCode) return '';

  // Normalize escaped backslashes in math delimiters (\\( -> \(, \\[ -> \[, etc.)
  let code = rawCode.replace(/\\\\([()[\]])/g, '\\$1');

  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const authorMatch = code.match(/\\author\{([^}]+)\}/);
  const dateMatch = code.match(/\\date\{([^}]+)\}/);
  const mdTitleMatch = code.match(/^#\s+(.+)$/m);

  const docTitle = titleMatch ? titleMatch[1] : (mdTitleMatch ? mdTitleMatch[1].replace(/\*\*/g, '').trim() : '');
  const docAuthor = authorMatch ? authorMatch[1] : '';
  const docDate = dateMatch ? (dateMatch[1] === '\\today' ? new Date().toLocaleDateString('vi-VN') : dateMatch[1]) : '';

  const lines = code.split('\n');
  const blocks = parseDocumentBlocks(lines);

  // Filter out duplicate top-level title if present in blocks
  const filteredBlocks = blocks.filter((b, idx) => {
    if (idx < 5 && b.type === 'h1' && docTitle && b.content.toLowerCase() === docTitle.toLowerCase()) {
      return false;
    }
    return true;
  });

  const bodyHtml = renderBlocksToHtml(filteredBlocks);

  return `
    <div class="docflow-math-document p-6 sm:p-10 max-w-4xl mx-auto bg-white text-slate-900 font-sans leading-relaxed selection:bg-blue-100">
      ${docTitle ? `
        <header class="doc-header pb-4 mb-5 border-b-2 border-slate-200 text-center">
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">${docTitle}</h1>
          ${(docAuthor || docDate) ? `
            <div class="text-xs sm:text-sm font-medium text-slate-500 flex items-center justify-center gap-3">
              ${docAuthor ? `<span>Tác giả: <strong class="text-slate-700 font-semibold">${docAuthor}</strong></span>` : ''}
              ${(docAuthor && docDate) ? `<span>•</span>` : ''}
              ${docDate ? `<span>Ngày: ${docDate}</span>` : ''}
            </div>
          ` : ''}
        </header>
      ` : ''}

      <div class="docflow-content space-y-1">
        ${bodyHtml}
      </div>
    </div>
  `;
}

/**
 * Compiles LaTeX source code or Math Markdown to a standardized PDF document with proper A4 margins and sharp KaTeX formulas
 * Uses Smart A4 Pagination to prevent equation/line page-split and preserve exact margins across all pages
 */
export async function compileLatexToPdf(code: string): Promise<Uint8Array> {
  // 1. Browser runtime: Smart Multi-Page A4 pagination with sharp KaTeX rendering
  if (typeof document !== 'undefined') {
    // Standard A4 dimensions at 96 DPI: 210mm x 297mm -> 794px x 1123px
    const A4_WIDTH_PX = 794;
    const A4_HEIGHT_PX = 1123;
    const PAD_TOP = 48;
    const PAD_BOTTOM = 44;
    const PAD_X = 54;
    const FOOTER_RESERVED = 32;
    const USABLE_PAGE_HEIGHT = A4_HEIGHT_PX - PAD_TOP - PAD_BOTTOM - FOOTER_RESERVED; // ~999px
    const TARGET_PAGE_HEIGHT = 960; // Safe threshold preventing edge overflow

    // Normalize code and parse document structure
    const normalizedCode = code.replace(/\\\\([()[\]])/g, '\\$1');
    const titleMatch = normalizedCode.match(/\\title\{([^}]+)\}/);
    const authorMatch = normalizedCode.match(/\\author\{([^}]+)\}/);
    const dateMatch = normalizedCode.match(/\\date\{([^}]+)\}/);
    const mdTitleMatch = normalizedCode.match(/^#\s+(.+)$/m);

    const docTitle = titleMatch ? titleMatch[1] : (mdTitleMatch ? mdTitleMatch[1].replace(/\*\*/g, '').trim() : '');
    const docAuthor = authorMatch ? authorMatch[1] : '';
    const docDate = dateMatch ? (dateMatch[1] === '\\today' ? new Date().toLocaleDateString('vi-VN') : dateMatch[1]) : '';

    const lines = normalizedCode.split('\n');
    const rawBlocks = parseDocumentBlocks(lines);
    const filteredBlocks = rawBlocks.filter((b, idx) => {
      if (idx < 5 && b.type === 'h1' && docTitle && b.content.toLowerCase() === docTitle.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Build block HTML units
    const blockHtmlUnits: string[] = [];

    if (docTitle) {
      blockHtmlUnits.push(`
        <div class="docflow-block docflow-header pb-4 mb-4 border-b-2 border-slate-200 text-center">
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">${docTitle}</h1>
          ${(docAuthor || docDate) ? `
            <div class="text-xs font-medium text-slate-500 flex items-center justify-center gap-3">
              ${docAuthor ? `<span>Tác giả: <strong class="text-slate-700 font-semibold">${docAuthor}</strong></span>` : ''}
              ${(docAuthor && docDate) ? `<span>•</span>` : ''}
              ${docDate ? `<span>Ngày: ${docDate}</span>` : ''}
            </div>
          ` : ''}
        </div>
      `);
    }

    filteredBlocks.forEach((block) => {
      blockHtmlUnits.push(renderSingleBlockHtml(block));
    });

    // Create an invisible in-DOM measurement container
    const measurer = document.createElement('div');
    measurer.style.position = 'fixed';
    measurer.style.left = '0';
    measurer.style.top = '0';
    measurer.style.width = `${A4_WIDTH_PX}px`;
    measurer.style.padding = `0 ${PAD_X}px`;
    measurer.style.boxSizing = 'border-box';
    measurer.style.visibility = 'hidden';
    measurer.style.pointerEvents = 'none';
    measurer.style.zIndex = '-99999';
    measurer.style.backgroundColor = '#ffffff';
    measurer.style.color = '#0f172a';
    measurer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    measurer.innerHTML = blockHtmlUnits.map((html, idx) => `
      <div class="docflow-measure-item" data-idx="${idx}">
        ${html}
      </div>
    `).join('');

    document.body.appendChild(measurer);

    let pages: { blockHtmls: string[] }[] = [];

    try {
      if ('fonts' in document) {
        await (document as any).fonts.ready;
      }
      await new Promise((r) => setTimeout(r, 120));

      const measureElements = Array.from(measurer.querySelectorAll('.docflow-measure-item')) as HTMLElement[];
      const blockHeights = measureElements.map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const mt = parseFloat(style.marginTop || '0');
        const mb = parseFloat(style.marginBottom || '0');
        return Math.max(20, rect.height + mt + mb);
      });

      // Auto-scale excessively wide math formulas/tables to fit within page margins
      const maxContentWidth = A4_WIDTH_PX - (PAD_X * 2);
      measureElements.forEach((el, idx) => {
        const mathScaler = el.querySelector('.katex-math-scaler') as HTMLElement | null;
        if (mathScaler && mathScaler.scrollWidth > maxContentWidth) {
          const ratio = (maxContentWidth - 8) / mathScaler.scrollWidth;
          const scaleVal = Math.max(0.68, Math.min(0.98, ratio)).toFixed(3);
          blockHtmlUnits[idx] = blockHtmlUnits[idx].replace(
            'class="katex-math-scaler inline-block max-w-full"',
            `class="katex-math-scaler inline-block" style="transform: scale(${scaleVal}); transform-origin: center top;"`
          );
        }
      });

      // Smart pagination packing algorithm
      pages = [{ blockHtmls: [] }];
      let currentHeight = 0;

      for (let i = 0; i < blockHtmlUnits.length; i++) {
        const html = blockHtmlUnits[i];
        const h = blockHeights[i] || 32;

        const isHeading = html.includes('docflow-h1') || html.includes('docflow-h2') || html.includes('docflow-h3');
        // Prevent orphan headings at bottom of page
        const isOrphanHeading = isHeading && (TARGET_PAGE_HEIGHT - currentHeight < 110) && currentHeight > 0;

        if ((currentHeight + h > TARGET_PAGE_HEIGHT || isOrphanHeading) && pages[pages.length - 1].blockHtmls.length > 0) {
          pages.push({ blockHtmls: [] });
          currentHeight = 0;
        }

        pages[pages.length - 1].blockHtmls.push(html);
        currentHeight += h;
      }
    } finally {
      document.body.removeChild(measurer);
    }

    // Render individual A4 pages and compile into final PDF
    const pdfDoc = await PDFDocument.create();
    const a4WidthPt = 595.28;
    const a4HeightPt = 841.89;
    const totalPages = Math.max(1, pages.length);

    for (let p = 0; p < totalPages; p++) {
      const pageData = pages[p] || { blockHtmls: [] };
      const pageContainer = document.createElement('div');
      pageContainer.style.position = 'fixed';
      pageContainer.style.left = '0';
      pageContainer.style.top = '0';
      pageContainer.style.width = `${A4_WIDTH_PX}px`;
      pageContainer.style.height = `${A4_HEIGHT_PX}px`;
      pageContainer.style.padding = `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px ${PAD_X}px`;
      pageContainer.style.boxSizing = 'border-box';
      pageContainer.style.backgroundColor = '#ffffff';
      pageContainer.style.color = '#0f172a';
      pageContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      pageContainer.style.zIndex = '-99999';
      pageContainer.style.overflow = 'hidden';

      pageContainer.innerHTML = `
        <div style="height: ${USABLE_PAGE_HEIGHT}px; overflow: hidden; display: flex; flex-direction: column;">
          ${pageData.blockHtmls.join('\n')}
        </div>
        <div style="position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-size: 11px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          Trang ${p + 1} / ${totalPages}
        </div>
      `;

      document.body.appendChild(pageContainer);

      try {
        const pageCanvas = await html2canvas(pageContainer, {
          scale: 2, // 2x Retina resolution
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: A4_WIDTH_PX,
          windowHeight: A4_HEIGHT_PX,
        });

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
      } finally {
        document.body.removeChild(pageContainer);
      }
    }

    return await pdfDoc.save();
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
  const lines = code.replace(/\\\\([()[\]])/g, '\\$1').split('\n');
  const blocks = parseDocumentBlocks(lines);
  const paragraphs: Paragraph[] = [];

  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const authorMatch = code.match(/\\author\{([^}]+)\}/);
  const mdTitleMatch = code.match(/^#\s+(.+)$/m);

  const docTitle = titleMatch ? titleMatch[1] : (mdTitleMatch ? mdTitleMatch[1].replace(/\*\*/g, '').trim() : '');

  if (docTitle) {
    paragraphs.push(
      new Paragraph({
        text: docTitle,
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

  function addBlockToWord(b: DocumentBlock) {
    switch (b.type) {
      case 'h1':
        if (docTitle && b.content.toLowerCase() === docTitle.toLowerCase()) return;
        paragraphs.push(
          new Paragraph({
            text: cleanInlineMath(b.content),
            heading: HeadingLevel.HEADING_1,
          })
        );
        break;

      case 'h2':
        paragraphs.push(
          new Paragraph({
            text: cleanInlineMath(b.content),
            heading: HeadingLevel.HEADING_2,
          })
        );
        break;

      case 'h3':
        paragraphs.push(
          new Paragraph({
            text: cleanInlineMath(b.content),
            heading: HeadingLevel.HEADING_3,
          })
        );
        break;

      case 'display-math':
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Công thức]  ${cleanMathExpression(b.content)}`,
                bold: true,
                color: '0369a1',
              }),
            ],
          })
        );
        break;

      case 'blockquote':
        if (b.innerBlocks) {
          b.innerBlocks.forEach(addBlockToWord);
        }
        break;

      case 'list-item':
        paragraphs.push(
          new Paragraph({
            text: `• ${cleanInlineMath(b.content).replace(/\*\*([^*]+)\*\*/g, '$1')}`,
          })
        );
        break;

      case 'paragraph':
        paragraphs.push(
          new Paragraph({
            text: cleanInlineMath(b.content).replace(/\*\*([^*]+)\*\*/g, '$1'),
          })
        );
        break;
    }
  }

  blocks.forEach(addBlockToWord);

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
