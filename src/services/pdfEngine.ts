import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { DocPage, PageNumberOptions, WatermarkOptions, SignatureItem } from '../types/document';
import { removeDiacritics } from '../utils/formatters';
import { generateWatermarkPngBytes, resolveTargetPages } from './watermarkRenderer';

/**
 * Compiles a new PDF from a list of DocPage objects and a lookup of source document buffers.
 * Preserves source document integrity and applies per-page rotations and custom order.
 */
export async function buildPdfFromPages(
  pages: DocPage[],
  sourceDocs: Map<string, Uint8Array>
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error('Không có trang nào được chọn để tạo PDF.');
  }

  const outputDoc = await PDFDocument.create();
  // Cache parsed source PDFDocuments during this build operation
  const parsedSources = new Map<string, PDFDocument>();

  for (const page of pages) {
    let srcDoc = parsedSources.get(page.sourceDocId);
    if (!srcDoc) {
      const srcBytes = sourceDocs.get(page.sourceDocId);
      if (!srcBytes) {
        throw new Error(`Không tìm thấy dữ liệu tài liệu nguồn: ${page.sourceDocName}`);
      }
      srcDoc = await PDFDocument.load(srcBytes);
      parsedSources.set(page.sourceDocId, srcDoc);
    }

    if (page.sourcePageIndex < 0 || page.sourcePageIndex >= srcDoc.getPageCount()) {
      throw new Error(`Chỉ mục trang ${page.sourcePageIndex + 1} vượt quá giới hạn của tài liệu nguồn.`);
    }

    // Copy page into output document
    const [copiedPage] = await outputDoc.copyPages(srcDoc, [page.sourcePageIndex]);
    
    // Apply per-page rotation
    if (page.rotation) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + page.rotation) % 360));
    }

    outputDoc.addPage(copiedPage);
  }

  return await outputDoc.save();
}

/**
 * Merges multiple entire PDF documents in sequence
 */
export async function mergePdfs(pdfBuffers: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  if (pdfBuffers.length === 0) {
    throw new Error('Vui lòng chọn ít nhất một tệp PDF để ghép.');
  }

  const mergedDoc = await PDFDocument.create();

  for (const item of pdfBuffers) {
    const srcDoc = await PDFDocument.load(item.bytes);
    const pageIndices = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return await mergedDoc.save();
}

/**
 * Splits a PDF into multiple documents according to custom groups
 */
export async function buildCustomGroupsPdfs(
  groups: { name: string; pages: DocPage[] }[],
  sourceDocs: Map<string, Uint8Array>
): Promise<{ name: string; bytes: Uint8Array; pageCount: number }[]> {
  const results: { name: string; bytes: Uint8Array; pageCount: number }[] = [];

  for (const group of groups) {
    if (group.pages.length === 0) continue;
    const bytes = await buildPdfFromPages(group.pages, sourceDocs);
    const safeName = group.name.endsWith('.pdf') ? group.name : `${group.name}.pdf`;
    results.push({
      name: safeName,
      bytes,
      pageCount: group.pages.length,
    });
  }

  return results;
}

/**
 * Compress PDF at low, balanced, or high compression levels
 */
export async function compressPdf(
  data: Uint8Array,
  level: 'low' | 'balanced' | 'high'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });

  // Optimize objects, strip unused metadata if high
  if (level === 'high') {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('DocFlow Compressor');
    pdfDoc.setCreator('DocFlow');
  }

  // Save with pdf-lib object stream compression enabled
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  return compressedBytes;
}

/**
 * Embeds a signature onto a PDF page
 */
export async function applySignatureToPdf(
  data: Uint8Array,
  signature: SignatureItem
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data);
  const pages = pdfDoc.getPages();

  if (signature.pageIndex < 0 || signature.pageIndex >= pages.length) {
    throw new Error('Trang ký không hợp lệ.');
  }

  const page = pages[signature.pageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Signature image embedding (PNG / JPEG)
  let embeddedImage;
  if (signature.dataUrl.includes('image/png')) {
    const base64Data = signature.dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    embeddedImage = await pdfDoc.embedPng(imageBytes);
  } else {
    const base64Data = signature.dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    embeddedImage = await pdfDoc.embedJpg(imageBytes);
  }

  // Calculate coordinates (signature.x & y are percentages: 0 to 100)
  const x = (signature.x / 100) * pageWidth;
  // In PDF coordinates, (0,0) is bottom-left
  const y = pageHeight - ((signature.y / 100) * pageHeight) - signature.height;

  page.drawImage(embeddedImage, {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: signature.width,
    height: signature.height,
  });

  // Optional: Embed signer name and date
  if (signature.signerName || signature.dateStr) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let textY = y - 12;

    if (signature.signerName) {
      page.drawText(`Signed by: ${removeDiacritics(signature.signerName)}`, {
        x: Math.max(0, x),
        y: Math.max(10, textY),
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      textY -= 12;
    }

    if (signature.dateStr) {
      page.drawText(`Date: ${removeDiacritics(signature.dateStr)}`, {
        x: Math.max(0, x),
        y: Math.max(10, textY),
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Adds page numbers to all or selected pages
 */
export async function addPageNumbersToPdf(
  data: Uint8Array,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const currentNum = options.startNumber + i;

    let text = `${currentNum}`;
    if (options.format === 'page-of-total') {
      text = `Trang ${currentNum} / ${total}`;
    } else if (options.format === 'custom') {
      text = `${options.prefix} ${currentNum}`;
    }

    const safeText = removeDiacritics(text);
    const textWidth = font.widthOfTextAtSize(safeText, options.fontSize);
    let x = width / 2 - textWidth / 2;
    let y = options.margin;

    switch (options.position) {
      case 'bottom-center':
        x = width / 2 - textWidth / 2;
        y = options.margin;
        break;
      case 'bottom-right':
        x = width - options.margin - textWidth;
        y = options.margin;
        break;
      case 'bottom-left':
        x = options.margin;
        y = options.margin;
        break;
      case 'top-center':
        x = width / 2 - textWidth / 2;
        y = height - options.margin;
        break;
      case 'top-right':
        x = width - options.margin - textWidth;
        y = height - options.margin;
        break;
      case 'top-left':
        x = options.margin;
        y = height - options.margin;
        break;
    }

    // Convert hex color to rgb
    const hex = options.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.2;
    const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.2;
    const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.2;

    page.drawText(safeText, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  return await pdfDoc.save();
}

/**
 * Adds watermark text diagonally across pages
 */
export async function addWatermarkToPdf(
  data: Uint8Array,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data);
  const pages = pdfDoc.getPages();
  const targetIndices = new Set(resolveTargetPages(pages.length, options));

  // Pre-generate watermark PNG if all target pages share the same size, or generate per unique size
  const pngCache = new Map<string, any>();

  for (let idx = 0; idx < pages.length; idx++) {
    if (!targetIndices.has(idx)) {
      continue;
    }
    const page = pages[idx];
    const { width, height } = page.getSize();
    const sizeKey = `${Math.round(width)}x${Math.round(height)}`;

    let watermarkImage = pngCache.get(sizeKey);
    if (!watermarkImage) {
      const pngBytes = await generateWatermarkPngBytes(width, height, options);
      watermarkImage = await pdfDoc.embedPng(pngBytes);
      pngCache.set(sizeKey, watermarkImage);
    }

    page.drawImage(watermarkImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await pdfDoc.save();
}
