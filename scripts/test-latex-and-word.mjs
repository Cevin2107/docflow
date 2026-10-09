import { PDFDocument } from 'pdf-lib';
import { 
  LATEX_TEMPLATES, 
  compileLatexToPdf, 
  compileLatexToWord, 
  validateLatexSyntax 
} from '../src/services/latexEngine.ts';
import { Document, Paragraph, HeadingLevel, Packer } from 'docx';

async function runLatexAndWordTests() {
  console.log('=== TESTING LATEX & WORD CONVERSION ENGINES ===\n');

  // Test 1: Validate LaTeX Syntax
  console.log('Test 1: Validating LaTeX templates syntax...');
  const reportErrors = validateLatexSyntax(LATEX_TEMPLATES.report);
  if (reportErrors.length > 0) {
    throw new Error(`Report template has errors: ${JSON.stringify(reportErrors)}`);
  }
  const mathErrors = validateLatexSyntax(LATEX_TEMPLATES.math);
  if (mathErrors.length > 0) {
    throw new Error(`Math template has errors: ${JSON.stringify(mathErrors)}`);
  }
  console.log('✓ LaTeX syntax validator checked clean on all templates.\n');

  // Test 2: Compile LaTeX to PDF
  console.log('Test 2: Compiling LaTeX Math template to PDF...');
  const pdfBytes = await compileLatexToPdf(LATEX_TEMPLATES.math);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (pdfDoc.getPageCount() < 1) {
    throw new Error('LaTeX compiler did not output any pages');
  }
  console.log(`✓ LaTeX compiled to PDF with ${pdfDoc.getPageCount()} page(s), size: ${pdfBytes.length} bytes.\n`);

  // Test 3: Compile LaTeX to Word (DOCX)
  console.log('Test 3: Compiling LaTeX Report template to Word DOCX...');
  const docxBlob = await compileLatexToWord(LATEX_TEMPLATES.report);
  if (docxBlob.size === 0) {
    throw new Error('LaTeX to Word conversion returned empty blob');
  }
  console.log(`✓ LaTeX compiled to Word DOCX successfully (${docxBlob.size} bytes).\n`);

  // Test 4: DOCX Package generation with docx library
  console.log('Test 4: Testing Word DOCX document builder...');
  const testDoc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'DocFlow PDF to Word Test', heading: HeadingLevel.TITLE }),
        new Paragraph({ text: 'Đây là đoạn văn kiểm thử tài liệu Word trích xuất từ PDF.' }),
      ]
    }]
  });
  const generatedBlob = await Packer.toBlob(testDoc);
  if (generatedBlob.size === 0) {
    throw new Error('Word document packer returned empty blob');
  }
  console.log(`✓ Word DOCX packer generated valid document (${generatedBlob.size} bytes).\n`);

  console.log('==============================================');
  console.log('🎉 ALL LATEX & WORD ENGINE TESTS PASSED 100%!');
  console.log('==============================================');
}

runLatexAndWordTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
