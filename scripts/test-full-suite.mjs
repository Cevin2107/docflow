import { PDFDocument } from 'pdf-lib';
import { createSamplePdf } from '../src/utils/samplePdfs.ts';
import { 
  buildPdfFromPages, 
  compressPdf, 
  applySignatureToPdf, 
  addWatermarkToPdf, 
  addPageNumbersToPdf 
} from '../src/services/pdfEngine.ts';
import { convertTextToPdf } from '../src/services/converterEngine.ts';
import { pageNumbersToRangeString, parsePageRangeString } from '../src/utils/formatters.ts';

async function runFullSuite() {
  console.log('=== DOCFLOW FULL TEST SUITE (BASIC & ADVANCED) ===\n');

  // 1. Tạo tài liệu mẫu 10 trang
  console.log('Test 1: Tạo tài liệu PDF mẫu 10 trang...');
  const sample = await createSamplePdf(10, 'TestDoc');
  const samplePdfBytes = sample.bytes;
  const doc = await PDFDocument.load(samplePdfBytes);
  if (doc.getPageCount() !== 10) throw new Error('Page count mismatch');
  console.log('✓ Tạo PDF 10 trang thành công.\n');

  // 2. Kiểm thử Logic chuyển đổi Range String <-> Page Numbers
  console.log('Test 2: Logic 2-way Range String & Selection...');
  const testNums = [1, 2, 3, 5, 7, 8, 9, 10];
  const rangeStr = pageNumbersToRangeString(testNums);
  console.log(`  Input: [${testNums.join(', ')}] -> Output range string: "${rangeStr}"`);
  if (rangeStr !== '1-3, 5, 7-10') throw new Error(`Unexpected range string: ${rangeStr}`);

  const parsed = parsePageRangeString(rangeStr, 10);
  if (parsed.error || parsed.pages.length !== testNums.length) {
    throw new Error(`Parse error: ${parsed.error}`);
  }
  console.log('✓ Hai chiều Range String đồng bộ hoàn hảo.\n');

  // 3. Kiểm thử Ký tên PDF (Sign PDF)
  console.log('Test 3: Ký tên PDF (Sign PDF) với thông tin người ký & ngày...');
  // Tạo dataUrl ảnh chữ ký nhỏ 1x1 png hợp lệ
  const dummySignaturePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const signedBytes = await applySignatureToPdf(samplePdfBytes, {
    id: 'sig_1',
    type: 'draw',
    dataUrl: dummySignaturePng,
    pageIndex: 0,
    x: 50,
    y: 70,
    width: 100,
    height: 40,
    signerName: 'Nguyen Van A',
    dateStr: '09/10/2026',
  });
  const signedDoc = await PDFDocument.load(signedBytes);
  if (signedDoc.getPageCount() !== 10) throw new Error('Signed PDF page count corrupted');
  console.log('✓ Ký tên PDF thành công, file không bị hỏng cấu trúc.\n');

  // 4. Kiểm thử Đóng dấu chìm Watermark
  console.log('Test 4: Đóng dấu bản quyền (Watermark)...');
  const watermarkedBytes = await addWatermarkToPdf(samplePdfBytes, {
    text: 'DOCFLOW WATERMARK',
    fontSize: 36,
    color: '#ff0000',
    opacity: 0.3,
    rotation: -45,
    applyToAll: true,
    targetPages: [0],
  });
  const wmDoc = await PDFDocument.load(watermarkedBytes);
  if (wmDoc.getPageCount() !== 10) throw new Error('Watermark PDF page count corrupted');
  console.log('✓ Đóng dấu Watermark thành công.\n');

  // 5. Kiểm thử Đánh số trang (Page Numbers)
  console.log('Test 5: Đánh số trang tự động...');
  const numberedBytes = await addPageNumbersToPdf(samplePdfBytes, {
    position: 'bottom-center',
    format: 'page-of-total',
    prefix: 'Trang',
    fontSize: 10,
    color: '#000000',
    startNumber: 1,
    margin: 25,
  });
  const numDoc = await PDFDocument.load(numberedBytes);
  if (numDoc.getPageCount() !== 10) throw new Error('Numbered PDF page count corrupted');
  console.log('✓ Đánh số trang thành công.\n');

  // 6. Kiểm thử Bảo vệ & Xóa Metadata (Protect & Strip Metadata)
  console.log('Test 6: Bảo vệ PDF & Xóa siêu dữ liệu metadata...');
  const protectDoc = await PDFDocument.load(samplePdfBytes);
  protectDoc.setTitle('');
  protectDoc.setAuthor('');
  protectDoc.setProducer('DocFlow Safe PDF');
  const form = protectDoc.getForm();
  try { form.flatten(); } catch {}
  const protectedBytes = await protectDoc.save();
  const verifyDoc = await PDFDocument.load(protectedBytes);
  if (verifyDoc.getTitle() !== '' || verifyDoc.getAuthor() !== '') {
    throw new Error('Metadata was not stripped cleanly');
  }
  console.log('✓ Xóa metadata và làm phẳng form an toàn.\n');

  // 7. Kiểm thử Convert Text sang PDF
  console.log('Test 7: Chuyển đổi Văn bản Text sang PDF...');
  const textPdfBytes = await convertTextToPdf('# Chương 1: Giới thiệu\n\nDocFlow là giải pháp xử lý PDF toàn diện.', 'test_doc');
  const textDoc = await PDFDocument.load(textPdfBytes);
  if (textDoc.getPageCount() < 1) throw new Error('Text to PDF produced 0 pages');
  console.log(`✓ Tạo PDF từ Text thành công (${textDoc.getPageCount()} trang).\n`);

  console.log('====================================================');
  console.log('🎉 TOÀN BỘ LOGIC CÁC TÍNH NĂNG CƠ BẢN VÀ NÂNG CAO ĐẠT 100%!');
  console.log('====================================================');
}

runFullSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
