import React, { useState } from 'react';
import { FileMinus, Sparkles, Trash2, CheckCircle2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { loadPdfDocument, isPageBlank } from '../../services/pdfWorker';

export const RemoveBlankTool: React.FC = () => {
  const { document, removePagesByIds, addToast } = useWorkspace();
  const [isScanning, setIsScanning] = useState(false);
  const [blankPageIndices, setBlankPageIndices] = useState<number[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        Vui lòng nạp tài liệu PDF trước.
      </div>
    );
  }

  const handleScanBlankPages = async () => {
    setIsScanning(true);
    setBlankPageIndices([]);
    try {
      const pdfProxy = await loadPdfDocument(document.id, document.data);
      const blanks: number[] = [];

      for (let i = 0; i < document.pages.length; i++) {
        const blank = await isPageBlank(pdfProxy, document.pages[i].sourcePageIndex);
        if (blank) {
          blanks.push(i);
        }
      }

      setBlankPageIndices(blanks);
      setHasScanned(true);

      if (blanks.length === 0) {
        addToast('Không phát hiện trang trắng nào trong tài liệu!', 'info');
      } else {
        addToast(`Phát hiện ${blanks.length} trang trắng khả nghi!`, 'warning');
      }
    } catch (err: any) {
      console.error(err);
      addToast('Lỗi khi quét trang trắng', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmDelete = () => {
    if (blankPageIndices.length === 0) return;
    const idsToRemove = blankPageIndices.map((idx) => document.pages[idx]?.pageId).filter(Boolean);
    removePagesByIds(idsToRemove);
    setBlankPageIndices([]);
    setHasScanned(false);
    addToast(`Đã xóa thành công ${idsToRemove.length} trang trắng khỏi tài liệu!`, 'success');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <FileMinus className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Xóa trang trắng (Remove Blank)</h3>
          <p className="text-[11px] text-slate-600">Tự động phát hiện và loại bỏ các trang trống</p>
        </div>
      </div>

      <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
        Hệ thống phân tích mật độ văn bản và điểm ảnh để xác định các trang trắng, có preview trước khi bạn xóa.
      </div>

      <button
        onClick={handleScanBlankPages}
        disabled={isScanning}
        className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
      >
        <Sparkles className="w-4 h-4" />
        <span>{isScanning ? 'Đang quét phân tích từng trang...' : 'Quét tìm trang trắng'}</span>
      </button>

      {hasScanned && (
        <div className="space-y-3 pt-2">
          {blankPageIndices.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 text-xs">
              <span className="font-bold text-amber-900 block">
                Phát hiện {blankPageIndices.length} trang trắng:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {blankPageIndices.map((idx) => {
                  const page = document.pages[idx];
                  return (
                    <div
                      key={idx}
                      className="bg-white border-2 border-amber-300/80 rounded-xl p-2.5 text-center space-y-1.5 shadow-2xs"
                    >
                      {page?.thumbnailUrl ? (
                        <img
                          src={page.thumbnailUrl}
                          alt={`Trang ${idx + 1}`}
                          className="h-28 w-auto mx-auto object-contain bg-slate-50 border border-slate-200 rounded"
                        />
                      ) : (
                        <div className="h-28 w-20 mx-auto bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400">
                          Trang trống
                        </div>
                      )}
                      <div className="font-bold text-xs text-amber-900">
                        Trang {idx + 1}
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                        Phát hiện trống
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleConfirmDelete}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa {blankPageIndices.length} trang trắng này</span>
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tài liệu hoàn toàn sạch, không có trang trắng nào!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
