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
\\author{Nguyen Van A}
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
 * Compiles LaTeX source code to a standardized PDF document
 */
export async function compileLatexToPdf(code: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 55;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 16;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Extract metadata
  const titleMatch = code.match(/\\title\{([^}]+)\}/);
  const authorMatch = code.match(/\\author\{([^}]+)\}/);
  const title = titleMatch ? removeDiacritics(titleMatch[1]) : 'Latex Document';
  const author = authorMatch ? removeDiacritics(authorMatch[1]) : '';

  // Render Title
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

  // Render Author
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

  // Draw dividing line
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    color: rgb(0.85, 0.88, 0.92),
    thickness: 1,
  });
  y -= 25;

  const lines = code.split('\n');
  let inDocument = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

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

    // Check page space
    if (y < margin + 40) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    // Section header
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
      continue;
    }

    // Subsection header
    if (trimmed.startsWith('\\subsection{')) {
      const subTitle = trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');
      y -= 6;
      currentPage.drawText(removeDiacritics(subTitle), {
        x: margin,
        y: y,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });
      y -= 18;
      continue;
    }

    // Math formula block ($$ ... $$)
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      const formula = trimmed.slice(2, -2).trim();
      y -= 6;
      currentPage.drawRectangle({
        x: margin,
        y: y - 10,
        width: contentWidth,
        height: 28,
        color: rgb(0.96, 0.98, 1),
        borderColor: rgb(0.8, 0.88, 0.98),
        borderWidth: 1,
      });

      currentPage.drawText(`[EQ]  ${removeDiacritics(formula)}`, {
        x: margin + 15,
        y: y - 2,
        size: 11,
        font: fontBold,
        color: rgb(0.05, 0.35, 0.7),
      });
      y -= 38;
      continue;
    }

    // Itemize bullet point
    if (trimmed.startsWith('\\item')) {
      const itemText = trimmed.replace(/^\\item\s*/, '');
      currentPage.drawText('•', {
        x: margin + 8,
        y: y,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      currentPage.drawText(removeDiacritics(itemText), {
        x: margin + 22,
        y: y,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= lineHeight;
      continue;
    }

    // Ignore environment tags
    if (trimmed.startsWith('\\begin{') || trimmed.startsWith('\\end{')) {
      continue;
    }

    // Normal text paragraph
    if (trimmed.length > 0) {
      const cleanLine = removeDiacritics(trimmed.replace(/\\textbf\{([^}]+)\}/g, '$1').replace(/\\textit\{([^}]+)\}/g, '$1'));
      currentPage.drawText(cleanLine, {
        x: margin,
        y: y,
        size: 10,
        font: font,
        color: rgb(0.25, 0.25, 0.3),
      });
      y -= lineHeight + 2;
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
