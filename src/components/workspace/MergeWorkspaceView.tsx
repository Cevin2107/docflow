import React, { useRef, useState } from 'react';
import { 
  Combine, 
  Upload, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Download, 
  Workflow, 
  FileText, 
  CheckCircle2, 
  Plus, 
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  RotateCcw
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatBytes } from '../../utils/formatters';
import { buildPdfFromPages } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';
import { DocPage, ToolType } from '../../types/document';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

export const MergeWorkspaceView: React.FC = () => {
  const {
    document,
    setDocument,
    sourceDocs,
    addSourcePdf,
    chainWorkflow,
    addToast,
    loadSampleDocument,
    clearDocument,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedName, setMergedName] = useState('tai_lieu_hop_nhat.pdf');

  // Compute source documents in their current order in document.pages
  const sourceDocsSummary: { 
    docId: string; 
    name: string; 
    pageCount: number; 
    size?: number;
    startPage: number;
    endPage: number;
  }[] = [];

  if (document) {
    const docMap = new Map<string, { docId: string; name: string; pageCount: number; size?: number }>();
    const docOrder: string[] = [];

    document.pages.forEach((p) => {
      if (!docMap.has(p.sourceDocId)) {
        docOrder.push(p.sourceDocId);
        const rawBytes = sourceDocs.get(p.sourceDocId);
        docMap.set(p.sourceDocId, {
          docId: p.sourceDocId,
          name: p.sourceDocName,
          pageCount: 0,
          size: rawBytes ? rawBytes.length : undefined,
        });
      }
      docMap.get(p.sourceDocId)!.pageCount++;
    });

    let runningPage = 1;
    docOrder.forEach((docId) => {
      const info = docMap.get(docId)!;
      sourceDocsSummary.push({
        ...info,
        startPage: runningPage,
        endPage: runningPage + info.pageCount - 1,
      });
      runningPage += info.pageCount;
    });
  }

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        await addSourcePdf(file.name, new Uint8Array(buffer));
      } else {
        addToast(`Bỏ qua tệp không phải PDF: ${file.name}`, 'warning');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Move document up or down in the merge sequence
  const handleMoveFile = (docId: string, direction: 'up' | 'down') => {
    if (!document) return;
    const docIdx = sourceDocsSummary.findIndex((s) => s.docId === docId);
    if (docIdx === -1) return;
    const targetIdx = direction === 'up' ? docIdx - 1 : docIdx + 1;
    if (targetIdx < 0 || targetIdx >= sourceDocsSummary.length) return;

    // Swap doc order
    const newSummary = [...sourceDocsSummary];
    const temp = newSummary[docIdx];
    newSummary[docIdx] = newSummary[targetIdx];
    newSummary[targetIdx] = temp;

    // Group pages by docId
    const pagesByDoc = new Map<string, DocPage[]>();
    document.pages.forEach((p) => {
      if (!pagesByDoc.has(p.sourceDocId)) pagesByDoc.set(p.sourceDocId, []);
      pagesByDoc.get(p.sourceDocId)!.push(p);
    });

    // Reconstruct pages array in new document order
    const newPages: DocPage[] = [];
    newSummary.forEach((s) => {
      const docPages = pagesByDoc.get(s.docId) || [];
      newPages.push(...docPages);
    });

    setDocument({
      ...document,
      pages: newPages,
      updatedAt: Date.now(),
    });
    addToast(`Đã di chuyển tệp "${temp.name}" ${direction === 'up' ? 'lên trước' : 'xuống sau'}`, 'info');
  };

  // Remove a source file from merge list
  const handleRemoveFile = (docId: string, docName: string) => {
    if (!document) return;
    const remainingPages = document.pages.filter((p) => p.sourceDocId !== docId);
    if (remainingPages.length === 0) {
      addToast('Không thể xóa toàn bộ tệp khỏi danh sách ghép', 'warning');
      return;
    }

    setDocument({
      ...document,
      pages: remainingPages,
      updatedAt: Date.now(),
    });
    addToast(`Đã xóa tệp "${docName}" khỏi danh sách ghép`, 'info');
  };

  const handleExportMerged = async (chainNext = false) => {
    if (!document || document.pages.length === 0) {
      addToast('Không có trang nào để ghép', 'warning');
      return;
    }

    setIsMerging(true);
    try {
      const mergedBytes = await buildPdfFromPages(document.pages, sourceDocs);
      const outName = mergedName.trim()
        ? (mergedName.endsWith('.pdf') ? mergedName : `${mergedName}.pdf`)
        : 'tai_lieu_hop_nhat.pdf';

      if (chainNext) {
        await chainWorkflow(mergedBytes, 'Ghép tài liệu PDF', outName, 'compress');
      } else {
        downloadFile(mergedBytes, outName);
        addToast(`Đã xuất tệp ghép thành công: ${outName}`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi ghép PDF: ${err?.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleContinueWithTool = async (targetTool: ToolType) => {
    if (!document || document.pages.length === 0) return;
    setIsMerging(true);
    try {
      const mergedBytes = await buildPdfFromPages(document.pages, sourceDocs);
      const outName = mergedName.trim()
        ? (mergedName.endsWith('.pdf') ? mergedName : `${mergedName}.pdf`)
        : 'tai_lieu_hop_nhat.pdf';
      await chainWorkflow(mergedBytes, 'Ghép nhiều tài liệu PDF', outName, targetTool);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp: ${err?.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const getMergedBytesForShare = async (): Promise<Uint8Array | null> => {
    if (!document || document.pages.length === 0) return null;
    return await buildPdfFromPages(document.pages, sourceDocs);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-100/70 p-4 sm:p-6 lg:p-8">
      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesUpload}
        accept="application/pdf"
        multiple
        className="hidden"
      />

      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* Banner / Toolbar Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
              <Combine className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ghép nhiều tệp PDF (Merge Workspace)
              </h2>
              <p className="text-xs text-slate-500">
                Sắp xếp thứ tự các tệp tài liệu, xem trước chuỗi trang kết hợp và xuất file PDF hoàn chỉnh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearDocument}
              className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Xóa danh sách hiện tại để ghép các tệp hoàn toàn mới"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bắt đầu mới</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-xl border border-brand-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm tệp PDF</span>
            </button>
          </div>
        </div>

        {/* 2-Columns: Files Management on Left / Summary & Merged Action on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 spans): Source Files List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Thứ tự các tệp cần ghép ({sourceDocsSummary.length})
                </span>
                <span className="text-xs text-slate-500">
                  Tổng: <b className="text-brand-700">{document?.pages.length || 0} trang</b>
                </span>
              </div>

              {sourceDocsSummary.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500">Chưa có tệp nào được tải lên.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Tải lên tệp PDF
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sourceDocsSummary.map((src, idx) => (
                    <div
                      key={src.docId}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-300 bg-white shadow-2xs flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Numerical Badge */}
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200/60">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate max-w-xs sm:max-w-md">
                            {src.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-brand-700">
                              Trang {src.startPage} - {src.endPage} ({src.pageCount} trang)
                            </span>
                            {src.size && (
                              <>
                                <span>•</span>
                                <span>{formatBytes(src.size)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Move Up/Down & Remove buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveFile(src.docId, 'up')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 transition-colors"
                          title="Di chuyển lên trước"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={idx === sourceDocsSummary.length - 1}
                          onClick={() => handleMoveFile(src.docId, 'down')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 transition-colors"
                          title="Di chuyển xuống sau"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          disabled={sourceDocsSummary.length <= 1}
                          onClick={() => handleRemoveFile(src.docId, src.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 transition-colors"
                          title="Xóa tệp khỏi danh sách ghép"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Sequence Preview of All Merged Pages */}
            {document && document.pages.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Thứ tự trang sau khi ghép ({document.pages.length} trang)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Trang sẽ xuất hiện theo thứ tự từ trái sang phải
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1 max-h-72 overflow-y-auto p-1">
                  {document.pages.map((p, idx) => (
                    <div
                      key={p.pageId}
                      className="border border-slate-200 rounded-xl p-2 bg-slate-50/70 flex flex-col items-center justify-center text-center space-y-1 hover:border-brand-400 transition-colors shadow-2xs"
                    >
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={`Trang ${idx + 1}`}
                          className="h-20 w-auto object-contain rounded bg-white shadow-2xs border border-slate-200"
                        />
                      ) : (
                        <div className="h-20 w-14 bg-white rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-300">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-slate-800">
                        Trang {idx + 1}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate max-w-[70px]">
                        {p.sourceDocName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Output Configuration & Actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5 sticky top-4">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-3">
                Cấu hình tệp đầu ra
              </span>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Tên tệp sau khi ghép:
                </label>
                <input
                  type="text"
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>

              {/* Stats box */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Số tài liệu gộp:</span>
                  <span className="font-bold text-slate-900">{sourceDocsSummary.length}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tổng số trang đầu ra:</span>
                  <span className="font-bold text-brand-700">{document?.pages.length || 0} trang</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportMerged(false)}
                    disabled={isMerging || !document || document.pages.length === 0}
                    className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isMerging ? 'Đang ghép tài liệu...' : 'Ghép & Tải xuống PDF'}</span>
                  </button>

                  <SharePdfButton
                    getPdfBytes={getMergedBytesForShare}
                    fileName={mergedName || 'tai_lieu_hop_nhat.pdf'}
                  />
                </div>

                {/* Workflow Chaining Dropdown */}
                <ContinueWorkflowDropdown
                  onSelectTool={handleContinueWithTool}
                  currentTool="merge"
                  disabled={!document || document.pages.length === 0}
                  isProcessing={isMerging}
                  label="Tiếp tục làm việc với PDF này..."
                />
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
