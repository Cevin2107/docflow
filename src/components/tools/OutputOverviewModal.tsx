import React, { useState } from 'react';
import { 
  X, 
  Archive, 
  Download, 
  FileText, 
  Edit2, 
  Check, 
  Workflow, 
  FileCheck,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { createZipArchive, downloadFile } from '../../services/zipService';
import { useWorkspace } from '../../context/WorkspaceContext';

export interface GeneratedOutputItem {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

interface OutputOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: GeneratedOutputItem[];
  defaultZipName?: string;
}

export const OutputOverviewModal: React.FC<OutputOverviewModalProps> = ({
  isOpen,
  onClose,
  files: initialFiles,
  defaultZipName = 'split_documents.zip',
}) => {
  const { chainWorkflow, addToast } = useWorkspace();

  const [files, setFiles] = useState<GeneratedOutputItem[]>(initialFiles);
  const [zipName, setZipName] = useState(defaultZipName);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [isZipping, setIsZipping] = useState(false);

  // Sync when initialFiles changes
  React.useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  if (!isOpen || files.length === 0) return null;

  const handleDownloadSingle = (item: GeneratedOutputItem) => {
    downloadFile(item.bytes, item.name);
    addToast(`Đã tải xuống: ${item.name}`, 'success');
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zipBlob = await createZipArchive(files);
      const safeZipName = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
      downloadFile(zipBlob, safeZipName, 'application/zip');
      addToast(`Đã tải xuống gói ZIP (${files.length} tệp PDF)`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Lỗi khi nén ZIP', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  const handleChainSelected = async (item: GeneratedOutputItem) => {
    await chainWorkflow(item.bytes, `Xử lý tệp ${item.name}`, item.name, 'compress');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Tổng quan tệp đầu ra (Output Overview)</h3>
              <p className="text-xs text-slate-600">Đã tạo thành công {files.length} tệp PDF độc lập</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File items list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
            <span>Danh sách PDF được tạo:</span>
            <span>Tổng cộng: {files.length} tệp</span>
          </div>

          {files.map((file, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-slate-200 hover:border-brand-300 bg-white shadow-xs flex items-center justify-between gap-3 text-xs transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  {editingIdx === idx ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="px-2 py-0.5 border border-brand-500 rounded text-xs flex-1 font-semibold"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (nameInput.trim()) {
                            const updated = [...files];
                            updated[idx].name = nameInput.trim().endsWith('.pdf') ? nameInput.trim() : `${nameInput.trim()}.pdf`;
                            setFiles(updated);
                          }
                          setEditingIdx(null);
                        }}
                        className="p-1 bg-brand-600 text-white rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                      <span className="truncate">{file.name}</span>
                      <button
                        onClick={() => {
                          setNameInput(file.name);
                          setEditingIdx(idx);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                        title="Đổi tên tệp"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                    <span>{file.pageCount} trang</span>
                    <span>•</span>
                    <span>{(file.bytes.length / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>

              {/* Action buttons per file */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleDownloadSingle(file)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  title="Tải riêng tệp này"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </button>

                {/* Continue to chain this file */}
                <button
                  onClick={() => handleChainSelected(file)}
                  className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  title="Mở tệp này trong workspace để tiếp tục xử lý (Nén, Ký...)"
                >
                  <Workflow className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tiếp tục xử lý</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer & ZIP Download */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Tên file ZIP:</span>
            <input
              type="text"
              value={zipName}
              onChange={(e) => setZipName(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700"
            >
              Đóng
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
            >
              <Archive className="w-4 h-4" />
              <span>{isZipping ? 'Đang đóng gói...' : 'Tải xuống gói ZIP'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
