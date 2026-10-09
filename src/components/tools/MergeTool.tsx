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
  Sparkles
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatBytes } from '../../utils/formatters';
import { buildPdfFromPages } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';

export const MergeTool: React.FC = () => {
  const {
    document,
    sourceDocs,
    addSourcePdf,
    chainWorkflow,
    addToast,
    loadSampleDocument,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedName, setMergedName] = useState('tai_lieu_hop_nhat.pdf');

  // Extract unique source documents from current document pages
  const sourceDocsSummary: { docId: string; name: string; pageCount: number; size?: number }[] = [];
  if (document) {
    const docMap = new Map<string, { docId: string; name: string; pageCount: number }>();
    document.pages.forEach((p) => {
      if (!docMap.has(p.sourceDocId)) {
        docMap.set(p.sourceDocId, {
          docId: p.sourceDocId,
          name: p.sourceDocName,
          pageCount: 0,
        });
      }
      docMap.get(p.sourceDocId)!.pageCount++;
    });
    docMap.forEach((val) => sourceDocsSummary.push(val));
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

  const handleExportMerged = async (chainNext = false) => {
    if (!document || document.pages.length === 0) {
      addToast('Không có trang nào để ghép', 'warning');
      return;
    }

    setIsMerging(true);
    try {
      const mergedBytes = await buildPdfFromPages(document.pages, sourceDocs);
      const outName = mergedName.trim() ? (mergedName.endsWith('.pdf') ? mergedName : `${mergedName}.pdf`) : 'tai_lieu_hop_nhat.pdf';

      if (chainNext) {
        // Workflow chaining: chain into Compress or Sign next!
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

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <Combine className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Ghép PDF (Merge)</h3>
          <p className="text-[11px] text-slate-600">Hợp nhất nhiều tệp PDF thành một tệp duy nhất</p>
        </div>
      </div>

      {/* Upload button */}
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilesUpload}
          accept="application/pdf"
          multiple
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 px-3 border-2 border-dashed border-brand-300 hover:border-brand-500 rounded-xl bg-brand-50/30 hover:bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4 text-brand-600" />
          <span>+ Tải lên thêm tệp PDF</span>
        </button>
      </div>

      {/* List of current source documents */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800 block">
          Danh sách tài liệu đang có ({sourceDocsSummary.length}):
        </label>

        {sourceDocsSummary.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sourceDocsSummary.map((src, idx) => (
              <div
                key={src.docId}
                className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-xs flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-[11px] text-slate-600 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate max-w-[180px]">
                      {src.name}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {src.pageCount} trang
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 bg-slate-50 rounded-xl text-xs text-slate-600">
            Chưa có tệp nào. Bạn có thể nhấn tải lên tệp hoặc tạo tệp mẫu để thử nghiệm.
          </div>
        )}
      </div>

      {/* Output Filename input */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Tên tệp hợp nhất:
        </label>
        <input
          type="text"
          value={mergedName}
          onChange={(e) => setMergedName(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={() => handleExportMerged(false)}
          disabled={isMerging || !document}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Ghép & Tải xuống PDF</span>
        </button>

        {/* Workflow chaining button (PRD Scenario E) */}
        <button
          onClick={() => handleExportMerged(true)}
          disabled={isMerging || !document}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Workflow className="w-4 h-4" />
          <span>Ghép & Tiếp tục Nén/Ký (Chaining)</span>
        </button>
      </div>
    </div>
  );
};
