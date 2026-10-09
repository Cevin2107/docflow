import { PDFDocument } from 'pdf-lib';
import { createSamplePdf } from '../src/utils/samplePdfs.ts';
import { parsePageRangeString, getOutputName, removeDiacritics } from '../src/utils/formatters.ts';
import { buildPdfFromPages, mergePdfs, compressPdf, buildCustomGroupsPdfs } from '../src/services/pdfEngine.ts';
import { createZipArchive } from '../src/services/zipService.ts';

async function runTests() {
  console.log('=== STARTING DOCFLOW ACCEPTANCE TESTS ===\n');

  // Test 1: Generate 20-page sample PDF
  console.log('Test 1: Generating 20-page sample PDF with page 5 blank...');
  const sample = await createSamplePdf(20, 'TestDoc');
  const sampleDoc = await PDFDocument.load(sample.bytes);
  if (sampleDoc.getPageCount() !== 20) {
    throw new Error(`Expected 20 pages, got ${sampleDoc.getPageCount()}`);
  }
  console.log('✓ Sample PDF generated successfully with 20 pages.\n');

  // Test 2: Scenario B - Split One PDF (ranges 1-3, 5-7, 9-13 = 11 pages)
  console.log('Test 2: Scenario B — Split One PDF with ranges 1-3, 5-7, 9-13...');
  const parsedRange = parsePageRangeString('1-3, 5-7, 9-13', 20);
  if (parsedRange.error || parsedRange.pages.length !== 11) {
    throw new Error(`Expected 11 pages for ranges 1-3, 5-7, 9-13, got ${parsedRange.pages.length}`);
  }
  
  const sourceDocsMap = new Map();
  sourceDocsMap.set('doc_1', sample.bytes);
  
  const targetPages = parsedRange.pages.map((pNum) => ({
    pageId: `p_${pNum}`,
    sourceDocId: 'doc_1',
    sourceDocName: 'TestDoc.pdf',
    sourcePageIndex: pNum - 1,
    rotation: 0
  }));
  
  const splitOneBytes = await buildPdfFromPages(targetPages, sourceDocsMap);
  const splitOneDoc = await PDFDocument.load(splitOneBytes);
  if (splitOneDoc.getPageCount() !== 11) {
    throw new Error(`Expected split One PDF to have 11 pages, got ${splitOneDoc.getPageCount()}`);
  }
  console.log('✓ Scenario B passed: Exact 11 pages generated in single PDF.\n');

  // Test 3: Scenario C — Auto Split by Ranges (1-3, 5-7, 9-13 => 3 PDFs with 3, 3, 5 pages)
  console.log('Test 3: Scenario C — Auto Split into 3 separate PDFs...');
  const ranges = ['1-3', '5-7', '9-13'];
  const expectedCounts = [3, 3, 5];
  const autoSplitFiles = [];
  
  for (let i = 0; i < ranges.length; i++) {
    const p = parsePageRangeString(ranges[i], 20);
    const pObjs = p.pages.map((pNum) => ({
      pageId: `p_${i}_${pNum}`,
      sourceDocId: 'doc_1',
      sourceDocName: 'TestDoc.pdf',
      sourcePageIndex: pNum - 1,
      rotation: 0
    }));
    const b = await buildPdfFromPages(pObjs, sourceDocsMap);
    const d = await PDFDocument.load(b);
    if (d.getPageCount() !== expectedCounts[i]) {
      throw new Error(`Part ${i+1}: expected ${expectedCounts[i]} pages, got ${d.getPageCount()}`);
    }
    autoSplitFiles.push({ name: `TestDoc_part_0${i+1}.pdf`, bytes: b });
  }
  console.log('✓ Scenario C passed: 3 PDFs created with lengths [3, 3, 5].\n');

  // Test 4: Scenario D — Custom Split Groups
  // Group 1: pages 1, 2, 3, 5 (4 pages)
  // Group 2: pages 6-9, 12-16 (9 pages)
  // Group 3: pages 4, 10, 11, 17-20 (7 pages)
  console.log('Test 4: Scenario D — Custom Split into 3 custom groups...');
  const g1Indices = [1, 2, 3, 5].map(p => p - 1);
  const g2Indices = [6, 7, 8, 9, 12, 13, 14, 15, 16].map(p => p - 1);
  const g3Indices = [4, 10, 11, 17, 18, 19, 20].map(p => p - 1);

  const customGroups = [
    {
      name: 'PDF_1.pdf',
      pages: g1Indices.map(idx => ({ pageId: `g1_${idx}`, sourceDocId: 'doc_1', sourceDocName: 'TestDoc.pdf', sourcePageIndex: idx, rotation: 0 }))
    },
    {
      name: 'PDF_2.pdf',
      pages: g2Indices.map(idx => ({ pageId: `g2_${idx}`, sourceDocId: 'doc_1', sourceDocName: 'TestDoc.pdf', sourcePageIndex: idx, rotation: 0 }))
    },
    {
      name: 'PDF_3.pdf',
      pages: g3Indices.map(idx => ({ pageId: `g3_${idx}`, sourceDocId: 'doc_1', sourceDocName: 'TestDoc.pdf', sourcePageIndex: idx, rotation: 0 }))
    }
  ];

  const customResults = await buildCustomGroupsPdfs(customGroups, sourceDocsMap);
  if (customResults[0].pageCount !== 4 || customResults[1].pageCount !== 9 || customResults[2].pageCount !== 7) {
    throw new Error('Custom split page counts did not match configuration');
  }
  console.log('✓ Scenario D passed: Custom groups produced PDFs with [4, 9, 7] pages.\n');

  // Test 5: ZIP packaging
  console.log('Test 5: Packaging custom split PDFs into ZIP archive...');
  const zipBlob = await createZipArchive(customResults);
  if (zipBlob.size === 0) {
    throw new Error('ZIP archive generation failed');
  }
  console.log(`✓ ZIP archive created successfully (${zipBlob.size} bytes).\n`);

  // Test 6: Scenario A — Merge PDF
  console.log('Test 6: Scenario A — Merge multiple PDFs...');
  const mergedBytes = await mergePdfs([
    { name: 'part1.pdf', bytes: customResults[0].bytes },
    { name: 'part2.pdf', bytes: customResults[1].bytes },
  ]);
  const mergedDoc = await PDFDocument.load(mergedBytes);
  if (mergedDoc.getPageCount() !== 13) { // 4 + 9 = 13
    throw new Error(`Expected merged document to have 13 pages, got ${mergedDoc.getPageCount()}`);
  }
  console.log('✓ Scenario A passed: Merged 4 + 9 = 13 pages seamlessly.\n');

  // Test 7: Compression
  console.log('Test 7: Compress PDF...');
  const compressed = await compressPdf(mergedBytes, 'balanced');
  console.log(`✓ Compressed PDF: original ${mergedBytes.length} bytes -> compressed ${compressed.length} bytes.\n`);

  console.log('========================================');
  console.log('🎉 ALL ACCEPTANCE SCENARIOS PASSED 100%!');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
