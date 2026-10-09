import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Play, 
  FileDown, 
  Download,
  FileType2,
  Eye,
  AlertTriangle, 
  Workflow,
  Sparkles
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LATEX_TEMPLATES, 
  compileLatexToPdf, 
  compileLatexToWord, 
  validateLatexSyntax, 
  LatexCompileError 
} from '../../services/latexEngine';
import { downloadFile } from '../../services/zipService';

export const LatexTool: React.FC = () => {
  const { chainWorkflow, addToast } = useWorkspace();

  const [code, setCode] = useState<string>(LATEX_TEMPLATES.report);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof LATEX_TEMPLATES>('report');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileErrors, setCompileErrors] = useState<LatexCompileError[]>([]);
  const [compiledPdfBytes, setCompiledPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

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

  const handleSelectTemplate = (key: keyof typeof LATEX_TEMPLATES) => {
    setSelectedTemplate(key);
    setCode(LATEX_TEMPLATES[key]);
    setCompiledPdfBytes(null);
    addToast(`Đã áp dụng mẫu: ${key}`, 'info');
  };

  const handleCompilePdf = async () => {
    setIsCompiling(true);
    try {
      const pdfBytes = await compileLatexToPdf(code);
      setCompiledPdfBytes(pdfBytes);
      addToast('Biên dịch LaTeX sang PDF thành công!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi biên dịch: ${err?.message}`, 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!compiledPdfBytes) return;
    downloadFile(compiledPdfBytes, 'latex_document.pdf');
    addToast('Đã tải xuống latex_document.pdf', 'success');
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
      {/* Main Dual-Pane Studio Body: 100% height without redundant header */}
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
                  { id: 'report', label: 'Báo cáo' },
                  { id: 'math', label: 'Toán học' },
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
                className="px-3 py-1 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>{isCompiling ? 'Đang biên dịch...' : 'Compile PDF'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex">
            {/* Line numbers simulated column */}
            <div className="w-10 py-3 bg-slate-950 text-slate-600 font-mono text-xs select-none text-right pr-2 leading-relaxed shrink-0 border-r border-slate-900">
              {Array.from({ length: 45 }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Editor textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
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

        {/* Right Pane: Live PDF Viewer / Output Console */}
        <div className="flex flex-col h-full overflow-hidden bg-slate-900/50">
          
          {/* Preview Pane Toolbar */}
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-slate-300">Live Preview Đầu Ra</span>
            </div>

            {compiledPdfBytes && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Tải PDF</span>
                </button>
                <button
                  onClick={handleConvertToWord}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                >
                  <FileType2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Xuất Word (.docx)</span>
                </button>
                <button
                  onClick={handleChainToWorkspace}
                  className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Đưa vào Workspace để tiếp tục Ký, Nén hoặc Ghép"
                >
                  <Workflow className="w-3 h-3" />
                  <span className="hidden sm:inline">Đưa vào Workspace</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex items-center justify-center bg-slate-950/40">
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                title="LaTeX Compiled PDF Preview"
                className="w-full h-full rounded-xl border border-slate-700 bg-white shadow-xl"
              />
            ) : (
              <div className="text-center p-8 max-w-sm space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <Code2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">
                    Sẵn sàng biên dịch
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nhấn nút <b className="text-purple-400">Compile PDF</b> ở thanh công cụ bên trái để biên dịch mã nguồn LaTeX và xem trước kết quả trực tiếp.
                  </p>
                </div>
                <button
                  onClick={handleCompilePdf}
                  disabled={isCompiling}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Biên dịch ngay bây giờ</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
