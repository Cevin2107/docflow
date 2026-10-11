import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Code2, 
  Play, 
  FileDown, 
  Download,
  FileType2,
  Eye,
  AlertTriangle, 
  Workflow,
  Printer
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LATEX_TEMPLATES, 
  compileLatexToPdf, 
  compileLatexToWord, 
  validateLatexSyntax, 
  convertLatexToHtml,
  generateDocumentHtml,
  LatexCompileError 
} from '../../services/latexEngine';
import { renderLatexViaService } from '../../services/pdfServiceClient.ts';
import { downloadFile } from '../../services/zipService';

export const LatexTool: React.FC = () => {
  const { chainWorkflow, addToast } = useWorkspace();

  const [code, setCode] = useState<string>(LATEX_TEMPLATES.math);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof LATEX_TEMPLATES>('math');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileErrors, setCompileErrors] = useState<LatexCompileError[]>([]);
  const [compiledPdfBytes, setCompiledPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'math' | 'pdf'>('math');

  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const [compileStatusText, setCompileStatusText] = useState<string>('');

  // Validate syntax on code change
  useEffect(() => {
    const errors = validateLatexSyntax(code);
    setCompileErrors(errors);
  }, [code]);

  // Clean up blob URL
  useEffect(() => {
    if (compiledPdfBytes) {
      const blob = new Blob([compiledPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfPreviewUrl(null);
    }
  }, [compiledPdfBytes]);

  // Compute live HTML with KaTeX formulas
  const liveHtmlContent = useMemo(() => {
    return convertLatexToHtml(code);
  }, [code]);

  const livePreviewRef = useRef<HTMLDivElement | null>(null);

  // Auto-fit math equations and tables in realtime preview
  useEffect(() => {
    if (previewMode !== 'math' || !livePreviewRef.current) return;
    const runAutoFit = () => {
      const container = livePreviewRef.current;
      if (!container) return;
      const targets = container.querySelectorAll<HTMLElement>('.docflow-autofit-target');
      targets.forEach((el) => {
        el.style.zoom = '1';
        const parent = el.parentElement || el;
        const availableWidth = parent.clientWidth;
        const inner = el.querySelector<HTMLElement>('.katex-html') || el.querySelector<HTMLElement>('.mtable') || el.querySelector<HTMLElement>('table') || el;
        const naturalWidth = Math.max(el.scrollWidth, inner.scrollWidth || 0);

        if (availableWidth > 0 && naturalWidth > availableWidth + 2) {
          const ratio = Math.max(0.55, availableWidth / naturalWidth);
          el.style.zoom = ratio.toFixed(4);
        }
      });
    };

    const timer = setTimeout(runAutoFit, 60);
    window.addEventListener('resize', runAutoFit);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', runAutoFit);
    };
  }, [liveHtmlContent, previewMode]);

  const handleSelectTemplate = (key: keyof typeof LATEX_TEMPLATES) => {
    setSelectedTemplate(key);
    setCode(LATEX_TEMPLATES[key]);
    setCompiledPdfBytes(null);
    addToast(`Đã áp dụng mẫu: ${key}`, 'info');
  };

  const handleCompilePdf = async () => {
    setIsCompiling(true);
    setCompileStatusText('Đang kết nối PDF Service & biên dịch vector A4...');
    try {
      // 1. Ưu tiên gọi backend Chromium PDF Service độc lập
      try {
        const pdfBytes = await renderLatexViaService(code, {
          paperSize: 'A4',
          orientation: 'portrait',
          margins: { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' },
          fontSize: '11pt',
        });
        setCompiledPdfBytes(pdfBytes);
        setPreviewMode('pdf');
        addToast('Biên dịch PDF thành công! Chuẩn A4 vector sắc nét 100%.', 'success');
        return;
      } catch (serviceErr: any) {
        console.warn('PDF Service không khả dụng, chuyển sang chế độ in vector trình duyệt:', serviceErr);
      }

      // 2. Fallback nếu service offline: Mở hộp thoại In Vector qua iframe
      setCompileStatusText('Đang mở hộp thoại In Vector...');
      handlePrintDocument();
      addToast('PDF Service offline. Đang mở hộp thoại In Vector làm giải pháp thay thế.', 'info');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi biên dịch: ${err?.message}`, 'error');
    } finally {
      setIsCompiling(false);
      setCompileStatusText('');
    }
  };

  const handleDownloadPdf = () => {
    if (!compiledPdfBytes) return;
    downloadFile(compiledPdfBytes, 'latex_document.pdf');
    addToast('Đã tải xuống latex_document.pdf', 'success');
  };

  const handlePrintDocument = () => {
    const iframe = printFrameRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Use unified standalone HTML with embedded KaTeX CSS, print layout and AutoFit script
    const standaloneHtml = generateDocumentHtml(code, {
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' },
      fontSize: '11pt',
    });

    doc.open();
    doc.write(standaloneHtml);
    doc.close();

    addToast(
      'Đang mở hộp thoại In Vector. Vui lòng chọn "Lưu dưới dạng PDF" (Save as PDF) và bỏ chọn "Headers and footers" trong cài đặt in (Tệp in sẽ không tự động đưa vào Workspace).',
      'info'
    );

    const win = iframe.contentWindow;
    if (win) {
      if ('fonts' in win.document) {
        win.document.fonts.ready.then(() => {
          setTimeout(() => {
            win.focus();
            win.print();
          }, 150);
        });
      } else {
        setTimeout(() => {
          win.focus();
          win.print();
        }, 300);
      }
    }
  };

  const handleConvertToWord = async () => {
    setIsCompiling(true);
    try {
      const docxBlob = await compileLatexToWord(code);
      downloadFile(
        docxBlob, 
        'latex_document.docx', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      addToast('Đã xuất thành công tài liệu Word DOCX!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi xuất Word: ${err?.message}`, 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownloadTex = () => {
    const blob = new Blob([code], { type: 'text/x-tex;charset=utf-8' });
    downloadFile(blob, 'document.tex', 'text/x-tex');
    addToast('Đã tải xuống mã nguồn .tex', 'success');
  };

  const handleChainToWorkspace = async () => {
    if (!compiledPdfBytes) {
      const bytes = await compileLatexToPdf(code);
      await chainWorkflow(bytes, 'Biên dịch LaTeX', 'latex_compiled.pdf', 'compress');
    } else {
      await chainWorkflow(compiledPdfBytes, 'Biên dịch LaTeX', 'latex_compiled.pdf', 'compress');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100">
      {/* Dedicated print iframe (must not be display:none to allow font loading and page layout calculation) */}
      <iframe
        ref={printFrameRef}
        title="DocFlow Print Frame"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1024px',
          height: '768px',
          border: '0',
          visibility: 'hidden',
        }}
      />

      {/* Main Dual-Pane Studio Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        
        {/* Left Pane: Code Editor */}
        <div className="flex flex-col border-r border-slate-800 h-full overflow-hidden bg-slate-950">
          
          {/* Editor Pane Toolbar */}
          <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* File tag & Template Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-purple-400 font-bold px-2 py-0.5 bg-purple-950/60 rounded border border-purple-800/60">
                document.tex
              </span>

              <div className="flex items-center gap-1 ml-1">
                {[
                  { id: 'math', label: 'Toán học' },
                  { id: 'report', label: 'Báo cáo' },
                  { id: 'thesis', label: 'Luận văn' },
                  { id: 'assignment', label: 'Bài tập' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id as any)}
                    className={`py-0.5 px-2 rounded-md text-[11px] font-medium transition-colors ${
                      selectedTemplate === t.id
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-800/90 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownloadTex}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg flex items-center gap-1 transition-colors border border-slate-700"
                title="Tải mã nguồn .tex"
              >
                <FileDown className="w-3 h-3" />
                <span className="hidden sm:inline">Tải .tex</span>
              </button>

              <button
                onClick={handleCompilePdf}
                disabled={isCompiling}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
                title="Biên dịch PDF vector chuẩn A4"
              >
                <Play className={`w-3 h-3 fill-current ${isCompiling ? 'animate-spin' : ''}`} />
                <span>{isCompiling ? 'Đang biên dịch...' : 'Biên dịch PDF'}</span>
              </button>
            </div>
          </div>

          {/* Line Numbers & Code Input */}
          <div className="flex-1 flex overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              placeholder="Dán mã nguồn LaTeX hoặc tài liệu Toán học Markdown vào đây..."
              className="flex-1 p-3 text-xs font-mono leading-relaxed bg-slate-950 text-slate-100 selection:bg-purple-600 selection:text-white focus:outline-hidden resize-none overflow-y-auto no-scrollbar"
            />
          </div>

          {/* Syntax check footer */}
          {compileErrors.length > 0 && (
            <div className="p-2.5 bg-amber-950/60 border-t border-amber-900/60 text-xs text-amber-300 space-y-1 max-h-24 overflow-y-auto">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Cảnh báo cú pháp:</span>
              </div>
              {compileErrors.map((err, idx) => (
                <div key={idx} className="text-[11px] font-mono pl-5">
                  Dòng {err.line}: {err.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Pane: Live KaTeX Math & PDF Viewer */}
        <div className="flex flex-col h-full overflow-hidden bg-slate-900/50">
          
          {/* Preview Pane Toolbar */}
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
            {/* View Mode Toggle: Math vs PDF */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setPreviewMode('math')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                  previewMode === 'math'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Xem Toán học (KaTeX)</span>
              </button>

              <button
                onClick={() => setPreviewMode('pdf')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                  previewMode === 'pdf'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileDown className="w-3 h-3" />
                <span>Bản in PDF {compiledPdfBytes ? '✓' : ''}</span>
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrintDocument}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                title="In nhanh qua trình duyệt (Ctrl+P)"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleConvertToWord}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                title="Xuất sang định dạng Word (.docx)"
              >
                <FileType2 className="w-3 h-3" />
                <span className="hidden sm:inline">Xuất Word</span>
              </button>

              {compiledPdfBytes ? (
                <>
                  <button
                    onClick={handleDownloadPdf}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                    title="Tải tệp PDF về máy"
                  >
                    <Download className="w-3 h-3" />
                    <span>Tải PDF</span>
                  </button>

                  <button
                    onClick={handleChainToWorkspace}
                    className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    title="Đưa vào Workspace để tiếp tục Ký, Nén hoặc Ghép"
                  >
                    <Workflow className="w-3 h-3" />
                    <span className="hidden sm:inline">Đưa vào Workspace</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCompilePdf}
                  disabled={isCompiling}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                  title="Biên dịch PDF chuẩn A4"
                >
                  <Play className={`w-3 h-3 fill-current ${isCompiling ? 'animate-spin' : ''}`} />
                  <span>Biên dịch PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* Preview Canvas / Document Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start justify-center bg-slate-950/60 relative">
            {/* Compiling Spinner Overlay */}
            {isCompiling && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-50 animate-in fade-in duration-150">
                <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs sm:text-sm font-semibold text-purple-200 animate-pulse">
                  {compileStatusText || 'Đang biên dịch PDF chuẩn A4...'}
                </span>
                <span className="text-[11px] text-slate-400">Tự động ngắt trang thông minh, bảo toàn công thức toán & lề trang</span>
              </div>
            )}

            {previewMode === 'math' ? (
              /* Mode 1: Interactive KaTeX Live Math Document */
              <div className="w-full max-w-3xl">
                <div className="w-full bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden min-h-[800px] animate-in fade-in duration-200">
                  <div 
                    ref={livePreviewRef}
                    dangerouslySetInnerHTML={{ __html: liveHtmlContent }} 
                    className="p-6 sm:p-10 select-text"
                  />
                </div>
              </div>
            ) : (
              /* Mode 2: Compiled PDF Viewer */
              pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  title="LaTeX Compiled PDF Preview"
                  className="w-full h-full min-h-[750px] rounded-2xl border border-slate-700 bg-white shadow-2xl"
                />
              ) : (
                <div className="text-center p-8 max-w-sm space-y-4 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <FileDown className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-200">
                      Chưa có bản in PDF
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nhấn nút <b className="text-purple-400">Biên dịch PDF</b> để tạo tài liệu PDF vector chuẩn A4 sắc nét 100%.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleCompilePdf}
                      disabled={isCompiling}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                    >
                      <Play className={`w-3.5 h-3.5 fill-current ${isCompiling ? 'animate-spin' : ''}`} />
                      <span>Biên dịch PDF ngay</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
