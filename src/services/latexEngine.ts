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
 * Cleans and converts LaTeX math symbols to Unicode representations for rendering
 */
export function cleanMathExpression(expr: string): string {
  if (!expr) return '';
  let s = expr;

  // Greek letters
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\gamma/g, 'γ');
  s = s.replace(/\\delta/g, 'δ');
  s = s.replace(/\\epsilon/g, 'ε');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\lambda/g, 'λ');
  s = s.replace(/\\mu/g, 'μ');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\sigma/g, 'σ');
  s = s.replace(/\\tau/g, 'τ');
  s = s.replace(/\\phi/g, 'φ');
  s = s.replace(/\\varphi/g, 'φ');
  s = s.replace(/\\omega/g, 'ω');
  s = s.replace(/\\Delta/g, 'Δ');
  s = s.replace(/\\Omega/g, 'Ω');
  s = s.replace(/\\Theta/g, 'Θ');

  // Math sets
  s = s.replace(/\\mathbb\{Z\}/g, 'ℤ');
  s = s.replace(/\\mathbb\{R\}/g, 'ℝ');
  s = s.replace(/\\mathbb\{N\}/g, 'ℕ');
  s = s.replace(/\\mathbb\{Q\}/g, 'ℚ');
  s = s.replace(/\\mathbb\{C\}/g, 'ℂ');

  // Logic & Set Operators
  s = s.replace(/\\in/g, ' ∈ ');
  s = s.replace(/\\notin/g, ' ∉ ');
  s = s.replace(/\\subset/g, ' ⊂ ');
  s = s.replace(/\\subseteq/g, ' ⊆ ');
  s = s.replace(/\\setminus/g, ' \\ ');
  s = s.replace(/\\mid/g, ' | ');
  s = s.replace(/\\infty/g, '∞');
  s = s.replace(/\\pm/g, ' ± ');
  s = s.replace(/\\mp/g, ' ∓ ');
  s = s.replace(/\\cdot/g, ' · ');
  s = s.replace(/\\times/g, ' × ');
  s = s.replace(/\\div/g, ' ÷ ');
  s = s.replace(/\\neq/g, ' ≠ ');
  s = s.replace(/\\le\b/g, ' ≤ ');
  s = s.replace(/\\leq\b/g, ' ≤ ');
  s = s.replace(/\\ge\b/g, ' ≥ ');
  s = s.replace(/\\geq\b/g, ' ≥ ');
  s = s.replace(/\\approx/g, ' ≈ ');
  s = s.replace(/\\equiv/g, ' ≡ ');
  s = s.replace(/\\implies/g, ' ⟹ ');
  s = s.replace(/\\iff/g, ' ⟺ ');
  s = s.replace(/\\to\b/g, ' ⟶ ');
  s = s.replace(/\\rightarrow/g, ' ⟶ ');
  s = s.replace(/\\leftarrow/g, ' ⟵ ');
  s = s.replace(/\\circ/g, '°');

  // Spacing & accents
  s = s.replace(/\\quad/g, '   ');
  s = s.replace(/\\qquad/g, '      ');
  s = s.replace(/\\,/g, ' ');
  s = s.replace(/\\;/g, ' ');
  s = s.replace(/\\!/g, '');

  // Parentheses & brackets
  s = s.replace(/\\left\(/g, '(');
  s = s.replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[');
  s = s.replace(/\\right\]/g, ']');
  s = s.replace(/\\left\\\{/g, '{');
  s = s.replace(/\\right\\\}/g, '}');
  s = s.replace(/\\left\|/g, '|');
  s = s.replace(/\\right\|/g, '|');

  // Text inside math
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');

  // Trig & Functions
  s = s.replace(/\\sin\b/g, 'sin');
  s = s.replace(/\\cos\b/g, 'cos');
  s = s.replace(/\\tan\b/g, 'tan');
  s = s.replace(/\\cot\b/g, 'cot');
  s = s.replace(/\\ln\b/g, 'ln');
  s = s.replace(/\\log\b/g, 'log');
  s = s.replace(/\\lim\b/g, 'lim');

  // Fractions & Roots
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // Matrix and systems
  s = s.replace(/\\begin\{bmatrix\}/g, '[ ');
  s = s.replace(/\\end\{bmatrix\}/g, ' ]');
  s = s.replace(/\\begin\{pmatrix\}/g, '( ');
  s = s.replace(/\\end\{pmatrix\}/g, ' )');
  s = s.replace(/\\begin\{cases\}/g, '{ ');
  s = s.replace(/\\end\{cases\}/g, ' }');

  // Clean trailing line breaks
  s = s.replace(/\\\\/g, '   |   ');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Replaces inline math delimiters \( ... \) and $ ... $ with clean math symbols
 */
export function cleanInlineMath(text: string): string {
  if (!text) return '';
  let res = text.replace(/\\\((.*?)\\\)/g, (_, m) => cleanMathExpression(m));
  res = res.replace(/\$([^$]+)\$/g, (_, m) => cleanMathExpression(m));
  return res;
}

/**
 * Validates LaTeX source code for syntax issues.
 * Gracefully permits freeform Markdown + Math documents without forcing \documentclass.
 */
export function validateLatexSyntax(code: string): LatexCompileError[] {
  const errors: LatexCompileError[] = [];
  const lines = code.split('\n');

  const hasDocClass = code.includes('\\documentclass');
  const hasBeginDoc = code.includes('\\begin{document}');
  const hasEndDoc = code.includes('\\end{document}');

  // Detect if document is freeform Math/Markdown
  const isFreeformMathDoc = !hasDocClass && (
    code.includes('\\[') || code.includes('\\(') || code.includes('$$') ||
    code.includes('\\begin{bmatrix}') || code.includes('\\begin{array}') ||
    code.includes('\\sin') || code.includes('\\cos') || code.includes('\\alpha') ||
    lines.some(l => l.trim().startsWith('#'))
  );

  if (!hasDocClass && !isFreeformMathDoc) {
    errors.push({ line: 1, message: 'Gợi ý: Thêm khai báo \\documentclass{...} cho chuẩn LaTeX', type: 'warning' });
  }

  if (hasBeginDoc && !hasEndDoc) {
    errors.push({ line: lines.length, message: 'Thiếu thẻ kết thúc \\end{document}', type: 'error' });
  }

  return errors;
}

/**
 * Renders a LaTeX \begin{array} table on canvas
 */
function renderMathArrayTable(
  ctx: CanvasRenderingContext2D,
  arrayStr: string,
  startX: number,
  startY: number,
  maxWidth: number,
  fontFamily: string
): number {
  const inner = arrayStr
    .replace(/\\begin\{array\}\{[^}]*\}/, '')
    .replace(/\\end\{array\}/, '')
    .trim();

  const rawRows = inner.split(/\\\\/);
  const rows: string[][] = [];

  for (const rawRow of rawRows) {
    const cleanedRow = rawRow.replace(/\\hline/g, '').trim();
    if (!cleanedRow) continue;
    const cells = cleanedRow.split('&').map(c => cleanMathExpression(c.trim()));
    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return 0;

  const numCols = Math.max(...rows.map(r => r.length));
  if (numCols === 0) return 0;

  const colWidth = maxWidth / numCols;
  const rowHeight = 24;
  const totalHeight = rows.length * rowHeight;

  ctx.save();
  for (let r = 0; r < rows.length; r++) {
    const y = startY + r * rowHeight;
    const isHeader = r === 0;

    for (let c = 0; c < numCols; c++) {
      const x = startX + c * colWidth;
      const cellText = rows[r][c] || '';

      if (isHeader) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(x, y, colWidth, rowHeight);
      }

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, colWidth, rowHeight);

      ctx.font = (isHeader ? 'bold 8.5pt ' : '9.5pt ') + fontFamily;
      ctx.fillStyle = isHeader ? '#1e293b' : '#334155';
      ctx.textAlign = 'center';
      ctx.fillText(cellText, x + colWidth / 2, y + 16);
    }
  }
  ctx.restore();

  return totalHeight;
}

/**
 * Renders LaTeX & Math Markdown content to high-resolution Canvas pages with 100% Vietnamese support
 */
function renderLatexPagesToCanvas(
  code: string,
  meta: { title: string; author: string; date: string }
): HTMLCanvasElement[] {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const scale = 2; // Retina 2x scale for sharp print quality
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

  // Determine Title: from meta.title or from Markdown # Title
  let docTitle = meta.title;
  const mdTitleMatch = code.match(/^#\s+(.+)$/m);
  if ((!docTitle || docTitle === 'Tài liệu LaTeX') && mdTitleMatch) {
    docTitle = mdTitleMatch[1].replace(/\*\*/g, '').trim();
  }

  // Draw Header Title
  if (docTitle) {
    const titleLines = wrapText(docTitle, contentWidth, `bold 17pt ${fontFamily}`);
    currentCtx.font = `bold 17pt ${fontFamily}`;
    currentCtx.fillStyle = '#0f172a';
    for (const line of titleLines) {
      checkPageBreak(28);
      currentCtx.fillText(line, margin, currentY + 17);
      currentY += 25;
    }
    currentY += 4;
  }

  // Draw Author & Date
  if (meta.author || meta.date) {
    checkPageBreak(22);
    currentCtx.font = `italic 10pt ${fontFamily}`;
    currentCtx.fillStyle = '#475569';
    const dateFormatted = meta.date === '\\today' ? new Date().toLocaleDateString('vi-VN') : meta.date;
    const subText = [
      meta.author ? `Tác giả: ${meta.author}` : '',
      dateFormatted ? `Ngày: ${dateFormatted}` : ''
    ].filter(Boolean).join('   •   ');

    currentCtx.fillText(subText, margin, currentY + 10);
    currentY += 18;
  }

  // Divider line
  checkPageBreak(16);
  currentCtx.strokeStyle = '#e2e8f0';
  currentCtx.lineWidth = 1;
  currentCtx.beginPath();
  currentCtx.moveTo(margin, currentY);
  currentCtx.lineTo(pageWidth - margin, currentY);
  currentCtx.stroke();
  currentY += 18;

  const lines = code.split('\n');
  const hasFormalDocument = code.includes('\\begin{document}');
  let inDocument = !hasFormalDocument; // Freeform documents are parsed directly

  let inMathBlock = false;
  let mathBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check formal LaTeX boundaries
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

    // 1. Multi-line Math Block Accumulation (\[ ... \] or $$ ... $$ or \begin{array})
    if (inMathBlock) {
      mathBuffer.push(trimmed);
      if (trimmed.includes('\\]') || trimmed.includes('$$') || trimmed.includes('\\end{array}')) {
        inMathBlock = false;
        const fullFormula = mathBuffer.join('\n');
        mathBuffer = [];

        // Check if formula is a matrix/array table
        if (fullFormula.includes('\\begin{array}')) {
          checkPageBreak(140);
          currentY += 6;
          const tableH = renderMathArrayTable(currentCtx, fullFormula, margin, currentY, contentWidth, fontFamily);
          currentY += tableH + 12;
        } else {
          // Normal display formula box
          const cleanF = cleanMathExpression(fullFormula.replace(/\\\[|\\\]|\$\$/g, ''));
          const fLines = wrapText(cleanF, contentWidth - 30, `bold 10pt "Cambria Math", "Times New Roman", ${fontFamily}`);
          const boxH = Math.max(34, fLines.length * 18 + 14);

          checkPageBreak(boxH + 10);
          currentY += 6;

          currentCtx.fillStyle = '#f8fafc';
          currentCtx.strokeStyle = '#cbd5e1';
          currentCtx.lineWidth = 1;
          currentCtx.beginPath();
          if (typeof (currentCtx as any).roundRect === 'function') {
            (currentCtx as any).roundRect(margin, currentY, contentWidth, boxH, 6);
          } else {
            currentCtx.rect(margin, currentY, contentWidth, boxH);
          }
          currentCtx.fill();
          currentCtx.stroke();

          currentCtx.font = `bold 10pt "Cambria Math", "Times New Roman", ${fontFamily}`;
          currentCtx.fillStyle = '#0284c7';
          currentCtx.textAlign = 'center';
          for (let fl = 0; fl < fLines.length; fl++) {
            currentCtx.fillText(fLines[fl], pageWidth / 2, currentY + 18 + fl * 18);
          }
          currentCtx.textAlign = 'left';

          currentY += boxH + 8;
        }
      }
      continue;
    }

    if (!trimmed) {
      currentY += 4;
      continue;
    }

    // Check Start of Display Math (\[ ... \] or $$ ... $$)
    if (trimmed.startsWith('\\[') || trimmed.startsWith('$$')) {
      const hasClose = (trimmed.startsWith('\\[') && trimmed.includes('\\]') && trimmed.length > 3) ||
                        (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4);

      if (!hasClose) {
        inMathBlock = true;
        mathBuffer = [trimmed];
        continue;
      }

      // Single line display math
      const innerMath = trimmed.replace(/^(\\\[|\$\$)/, '').replace(/(\\\]|\$\$)$/, '').trim();
      const cleanF = cleanMathExpression(innerMath);
      const fLines = wrapText(cleanF, contentWidth - 30, `bold 10pt "Cambria Math", "Times New Roman", ${fontFamily}`);
      const boxH = Math.max(32, fLines.length * 18 + 12);

      checkPageBreak(boxH + 8);
      currentY += 6;

      currentCtx.fillStyle = '#f8fafc';
      currentCtx.strokeStyle = '#cbd5e1';
      currentCtx.lineWidth = 1;
      currentCtx.beginPath();
      if (typeof (currentCtx as any).roundRect === 'function') {
        (currentCtx as any).roundRect(margin, currentY, contentWidth, boxH, 6);
      } else {
        currentCtx.rect(margin, currentY, contentWidth, boxH);
      }
      currentCtx.fill();
      currentCtx.stroke();

      currentCtx.font = `bold 10pt "Cambria Math", "Times New Roman", ${fontFamily}`;
      currentCtx.fillStyle = '#0284c7';
      currentCtx.textAlign = 'center';
      for (let fl = 0; fl < fLines.length; fl++) {
        currentCtx.fillText(fLines[fl], pageWidth / 2, currentY + 18 + fl * 18);
      }
      currentCtx.textAlign = 'left';

      currentY += boxH + 8;
      continue;
    }

    // Horizontal Rule (--- or ***)
    if (trimmed === '---' || trimmed === '***' || trimmed === '\\hrule') {
      checkPageBreak(14);
      currentY += 6;
      currentCtx.strokeStyle = '#e2e8f0';
      currentCtx.lineWidth = 1;
      currentCtx.beginPath();
      currentCtx.moveTo(margin, currentY);
      currentCtx.lineTo(pageWidth - margin, currentY);
      currentCtx.stroke();
      currentY += 10;
      continue;
    }

    // Section / Markdown Heading 1 & 2
    if (trimmed.startsWith('\\section{') || trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
      let secTitle = '';
      let isH1 = false;
      if (trimmed.startsWith('\\section{')) {
        secTitle = trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');
        isH1 = true;
      } else if (trimmed.startsWith('# ')) {
        secTitle = trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '');
        isH1 = true;
        // Skip duplicate title if already drawn in header
        if (secTitle.toLowerCase() === docTitle.toLowerCase() && i < 5) continue;
      } else {
        secTitle = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
      }

      secTitle = cleanInlineMath(secTitle);
      checkPageBreak(36);
      currentY += 8;

      currentCtx.font = isH1 ? `bold 13pt ${fontFamily}` : `bold 11.5pt ${fontFamily}`;
      currentCtx.fillStyle = isH1 ? '#1e3a8a' : '#1e40af';
      const wrappedSec = wrapText(secTitle, contentWidth, currentCtx.font);
      for (const line of wrappedSec) {
        currentCtx.fillText(line, margin, currentY + 12);
        currentY += 18;
      }
      currentY += 4;
      continue;
    }

    // Subsection / Markdown Heading 3 (###)
    if (trimmed.startsWith('\\subsection{') || trimmed.startsWith('### ')) {
      let subTitle = '';
      if (trimmed.startsWith('\\subsection{')) {
        subTitle = trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');
      } else {
        subTitle = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
      }

      subTitle = cleanInlineMath(subTitle);
      checkPageBreak(28);
      currentY += 6;

      currentCtx.font = `bold 10.5pt ${fontFamily}`;
      currentCtx.fillStyle = '#0f172a';
      const wrappedSub = wrapText(subTitle, contentWidth, currentCtx.font);
      for (const line of wrappedSub) {
        currentCtx.fillText(line, margin, currentY + 11);
        currentY += 16;
      }
      currentY += 4;
      continue;
    }

    // Markdown Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteText = cleanInlineMath(trimmed.replace(/^>\s*/, '').replace(/\*+/g, ''));
      const wrappedQ = wrapText(quoteText, contentWidth - 24, `italic 9.5pt ${fontFamily}`);
      const quoteH = wrappedQ.length * 15 + 10;

      checkPageBreak(quoteH + 6);
      currentY += 4;

      currentCtx.fillStyle = '#f8fafc';
      currentCtx.fillRect(margin, currentY, contentWidth, quoteH);

      currentCtx.fillStyle = '#6366f1';
      currentCtx.fillRect(margin, currentY, 3, quoteH);

      currentCtx.font = `italic 9.5pt ${fontFamily}`;
      currentCtx.fillStyle = '#475569';
      for (let q = 0; q < wrappedQ.length; q++) {
        currentCtx.fillText(wrappedQ[q], margin + 12, currentY + 12 + q * 15);
      }

      currentY += quoteH + 6;
      continue;
    }

    // List item (*, -, \item)
    if (trimmed.startsWith('\\item') || trimmed.startsWith('* ') || trimmed.startsWith('- ') || rawLine.match(/^\s+[*•-]/)) {
      const isNested = rawLine.startsWith('  ') || rawLine.startsWith('\t');
      const itemRaw = trimmed.replace(/^(\\item|\*|-|•)\s*/, '');
      const itemClean = cleanInlineMath(itemRaw).replace(/\*\*([^*]+)\*\*/g, '$1');
      const itemMargin = isNested ? margin + 24 : margin + 10;
      const wrappedItem = wrapText(itemClean, contentWidth - (isNested ? 30 : 16), `9.5pt ${fontFamily}`);

      checkPageBreak(wrappedItem.length * 15 + 4);

      currentCtx.font = `bold 10pt ${fontFamily}`;
      currentCtx.fillStyle = isNested ? '#64748b' : '#2563eb';
      currentCtx.fillText(isNested ? '–' : '•', itemMargin - 10, currentY + 10);

      currentCtx.font = `9.5pt ${fontFamily}`;
      currentCtx.fillStyle = '#334155';
      for (let it = 0; it < wrappedItem.length; it++) {
        currentCtx.fillText(wrappedItem[it], itemMargin, currentY + 10);
        currentY += 15;
      }
      currentY += 2;
      continue;
    }

    // Ignore environment boundaries
    if (trimmed.startsWith('\\begin{') || trimmed.startsWith('\\end{')) {
      continue;
    }

    // Regular Paragraph
    const cleanPara = cleanInlineMath(trimmed)
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\textit\{([^}]+)\}/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1');

    const wrappedP = wrapText(cleanPara, contentWidth, `9.5pt ${fontFamily}`);
    checkPageBreak(wrappedP.length * 15 + 4);

    currentCtx.font = `9.5pt ${fontFamily}`;
    currentCtx.fillStyle = '#334155';
    for (const line of wrappedP) {
      currentCtx.fillText(line, margin, currentY + 10);
      currentY += 15;
    }
    currentY += 4;
  }

  // Draw footer on last page
  currentCtx.font = `9pt ${fontFamily}`;
  currentCtx.fillStyle = '#94a3b8';
  currentCtx.textAlign = 'center';
  currentCtx.fillText(`Trang ${pageNumber}`, pageWidth / 2, pageHeight - margin / 2);
  currentCtx.textAlign = 'left';

  canvases.push(currentCanvas);
  return canvases;
}

/**
 * Compiles LaTeX source code or Math Markdown to a standardized PDF document with full Vietnamese Unicode preservation
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
    if (trimmed.startsWith('\\section{') || trimmed.startsWith('# ')) {
      const secTitle = trimmed.replace(/^(\\section\{|#\s+)([^}]+)\}.*/, '$2');
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

    // Heading 1 & Section
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

    // Heading 2 & Subsection
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

    // Display Math formulas
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

