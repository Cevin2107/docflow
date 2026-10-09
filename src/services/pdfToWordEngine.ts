import * as pdfjsLib from 'pdfjs-dist';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';

export interface PdfToWordResult {
  docxBlob: Blob;
  wordCount: number;
  paragraphCount: number;
  warnings?: string[];
}

/**
 * Converts a PDF document into a Word DOCX document using PDF.js text extraction
 */
export async function convertPdfToDocx(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  docTitle: string = 'Document'
): Promise<PdfToWordResult> {
  const paragraphs: Paragraph[] = [];
  let totalWords = 0;
  const warnings: string[] = [];

  // Title header
  paragraphs.push(
    new Paragraph({
      text: docTitle.replace(/\.[^/.]+$/, ''),
      heading: HeadingLevel.TITLE,
    })
  );

  const numPages = pdfDoc.numPages;

  for (let pageIdx = 1; pageIdx <= numPages; pageIdx++) {
    const page = await pdfDoc.getPage(pageIdx);
    const textContent = await page.getTextContent();

    if (textContent.items.length === 0) {
      warnings.push(`Trang ${pageIdx} không chứa văn bản (có thể là trang ảnh/bản scan).`);
      continue;
    }

    // Page break marker if > 1
    if (pageIdx > 1) {
      paragraphs.push(
        new Paragraph({
          text: `--- Trang ${pageIdx} ---`,
          children: [new TextRun({ text: '', italics: true, color: '64748b' })],
        })
      );
    }

    // Group items into text lines based on Y position
    const lineMap = new Map<number, string[]>();
    for (const rawItem of textContent.items) {
      if ('str' in rawItem) {
        const item = rawItem as { str: string; transform: number[] };
        const yPos = Math.round(item.transform[5]);
        if (!lineMap.has(yPos)) {
          lineMap.set(yPos, []);
        }
        lineMap.get(yPos)!.push(item.str);
      }
    }

    // Sort lines from top to bottom (higher Y in PDF is higher up)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedY) {
      const lineText = lineMap.get(y)!.join(' ').trim();
      if (!lineText) continue;

      const words = lineText.split(/\s+/).filter(Boolean);
      totalWords += words.length;

      // Heuristic for heading: short line, uppercase or ends without period
      const isHeading = lineText.length < 50 && (lineText.toUpperCase() === lineText || !lineText.endsWith('.'));

      if (isHeading && lineText.length > 3) {
        paragraphs.push(
          new Paragraph({
            text: lineText,
            heading: HeadingLevel.HEADING_2,
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            text: lineText,
          })
        );
      }
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

  const docxBlob = await Packer.toBlob(doc);

  return {
    docxBlob,
    wordCount: totalWords,
    paragraphCount: paragraphs.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
