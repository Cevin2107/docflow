import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates a sample PDF with N pages on the fly for testing
 * Page 5 is intentionally blank for testing "Remove Blank Pages"
 */
export async function createSamplePdf(pageCount: number = 20, docTitle: string = 'Tai_lieu_mau_DocFlow'): Promise<{ name: string; bytes: Uint8Array }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
    const { width, height } = page.getSize();

    // Make page 5 blank if pageCount >= 6, for testing blank page detection
    if (pageCount >= 6 && i === 5) {
      // Intentionally leave page 5 completely blank
      continue;
    }

    // Top Header Banner
    page.drawRectangle({
      x: 0,
      y: height - 60,
      width: width,
      height: 60,
      color: rgb(0.04, 0.45, 0.78),
    });

    page.drawText('DOCFLOW UNIFIED PDF WORKSPACE', {
      x: 40,
      y: height - 38,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`TEST DOCUMENT - PAGE ${i} OF ${pageCount}`, {
      x: 40,
      y: height - 50,
      size: 9,
      font: font,
      color: rgb(0.85, 0.92, 1),
    });

    // Main Big Page Number Badge
    page.drawRectangle({
      x: 40,
      y: height - 160,
      width: 80,
      height: 80,
      color: rgb(0.93, 0.96, 1),
      borderColor: rgb(0.05, 0.55, 0.95),
      borderWidth: 2,
    });

    page.drawText(String(i).padStart(2, '0'), {
      x: i >= 10 ? 56 : 66,
      y: height - 138,
      size: 38,
      font: fontBold,
      color: rgb(0.05, 0.45, 0.8),
    });

    // Content Title
    page.drawText(`Tai lieu kiem thu DocFlow - Trang ${i}`, {
      x: 140,
      y: height - 110,
      size: 17,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    page.drawText(`PAGE IDENTIFIER: PAGE_UUID_${i.toString().padStart(3, '0')}`, {
      x: 140,
      y: height - 135,
      size: 10,
      font: font,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Decorative content blocks
    page.drawRectangle({
      x: 40,
      y: height - 320,
      width: width - 80,
      height: 120,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.85, 0.9, 0.95),
      borderWidth: 1,
    });

    page.drawText(`Phan ${Math.ceil(i / 4)}: Mo ta quy trinh xu ly tai lieu`, {
      x: 60,
      y: height - 230,
      size: 13,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });

    const sampleLines = [
      `1. Trang nay duoc tao tu dong phuc vu kiem thu Split PDF, Merge PDF va Reorder.`,
      `2. Kiem tra tinh toan ven cua noi dung, xoay goc (rotation) va danh so trang.`,
      `3. Thu nghiem chu ky dien tu (Sign PDF) va nen tep (Compress PDF) khong mat mat du lieu.`,
      `4. Du lieu duoc xu ly 100% tai trinh duyet nguoi dung voi tinh bao mat cao.`,
    ];

    let lineY = height - 255;
    for (const line of sampleLines) {
      page.drawText(line, {
        x: 60,
        y: lineY,
        size: 9.5,
        font: font,
        color: rgb(0.3, 0.35, 0.45),
      });
      lineY -= 16;
    }

    // Grid / Graph Box
    page.drawRectangle({
      x: 40,
      y: 100,
      width: width - 80,
      height: 380,
      color: rgb(0.99, 0.99, 1),
      borderColor: rgb(0.88, 0.92, 0.96),
      borderWidth: 1,
    });

    page.drawText(`Bieu do kiem thu (Trang ${i})`, {
      x: 60,
      y: 450,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.45),
    });

    // Grid lines
    for (let g = 0; g < 5; g++) {
      page.drawLine({
        start: { x: 60, y: 150 + g * 55 },
        end: { x: width - 60, y: 150 + g * 55 },
        color: rgb(0.9, 0.93, 0.96),
        thickness: 1,
      });
    }

    // Footer
    page.drawText(`DocFlow Unified PDF System - Test Document v3.6 - Trang ${i}/${pageCount}`, {
      x: 40,
      y: 40,
      size: 8.5,
      font: font,
      color: rgb(0.5, 0.55, 0.65),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    name: `${docTitle}_${pageCount}trang.pdf`,
    bytes: pdfBytes,
  };
}
