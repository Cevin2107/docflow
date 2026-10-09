import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { removeDiacritics } from '../utils/formatters';

export interface ConvertedImageResult {
  pageNumber: number;
  fileName: string;
  dataUrl: string;
  blob: Blob;
}

/**
 * Converts PDF pages into images (PNG, JPEG, WebP)
 */
export async function convertPdfToImages(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndices: number[], // 0-based
  format: 'png' | 'jpeg' | 'webp' = 'png',
  scaleMultiplier: number = 2.0, // High quality 2x
  baseDocName: string = 'document'
): Promise<ConvertedImageResult[]> {
  const cleanBase = baseDocName.replace(/\.[^/.]+$/, '');
  const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
  const extension = format === 'jpeg' ? 'jpg' : format;
  const results: ConvertedImageResult[] = [];

  for (const pageIdx of pageIndices) {
    const page = await pdfDoc.getPage(pageIdx + 1);
    const viewport = page.getViewport({ scale: scaleMultiplier });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill white background for jpg/webp
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render as any)({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), mimeType, 0.92);
    });

    const padNumber = String(pageIdx + 1).padStart(3, '0');
    const fileName = `${cleanBase}_page_${padNumber}.${extension}`;

    results.push({
      pageNumber: pageIdx + 1,
      fileName,
      dataUrl,
      blob,
    });
  }

  return results;
}

/**
 * Converts multiple image files into a single PDF
 */
export async function convertImagesToPdf(
  images: { name: string; file: File | Blob }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const imgItem of images) {
    const arrayBuffer = await imgItem.file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const isPng = imgItem.name.toLowerCase().endsWith('.png');

    let embeddedImage;
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(bytes);
    }

    const { width, height } = embeddedImage.scale(1.0);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await pdfDoc.save();
}

/**
 * Converts text or markdown content into a clean PDF document
 */
export async function convertTextToPdf(
  text: string,
  title: string = 'Document'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont('Helvetica');
  const fontBold = await pdfDoc.embedFont('Helvetica-Bold');

  const lines = text.split('\n');
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 16;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Title
  currentPage.drawText(removeDiacritics(title), {
    x: margin,
    y: y,
    size: 18,
    font: fontBold,
  });
  y -= 30;

  for (const rawLine of lines) {
    if (y < margin + lineHeight) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const isHeading = rawLine.startsWith('#');
    const rawLineText = isHeading ? rawLine.replace(/^#+\s*/, '') : rawLine;
    const lineText = removeDiacritics(rawLineText);
    const currentFont = isHeading ? fontBold : font;
    const fontSize = isHeading ? 13 : 10;

    // Simple word wrapping
    const words = lineText.split(' ');
    let currentChunk = '';

    for (const word of words) {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      const testWidth = currentFont.widthOfTextAtSize(testChunk, fontSize);

      if (testWidth > contentWidth && currentChunk) {
        currentPage.drawText(currentChunk, {
          x: margin,
          y: y,
          size: fontSize,
          font: currentFont,
        });
        y -= lineHeight;
        currentChunk = word;

        if (y < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk) {
      currentPage.drawText(currentChunk, {
        x: margin,
        y: y,
        size: fontSize,
        font: currentFont,
      });
      y -= lineHeight;
    }
  }

  return await pdfDoc.save();
}
