import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Loader2,
  Maximize2
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { loadPdfDocument, renderPageToCanvas } from '../../services/pdfWorker';

interface PageInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageIndex: number;
  onPageChange: (index: number) => void;
}

export const PageInspectModal: React.FC<PageInspectModalProps> = ({
  isOpen,
  onClose,
  pageIndex,
  onPageChange,
}) => {
  const { document, sourceDocs, rotatePage } = useWorkspace();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeTaskRef = useRef<any>(null);

  const [zoom, setZoom] = useState(1.1);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const currentPage = document?.pages[pageIndex];

  useEffect(() => {
    let isCancelled = false;

    async function render() {
      if (!isOpen || !document || !currentPage || !canvasRef.current) return;

      if (activeTaskRef.current) {
        try {
          activeTaskRef.current.cancel();
        } catch {}
        activeTaskRef.current = null;
      }

      setIsRendering(true);
      setRenderError(null);

      try {
        const srcBytes = sourceDocs.get(currentPage.sourceDocId);
        if (!srcBytes) throw new Error('Không tìm thấy dữ liệu tệp nguồn');

        const pdfDoc = await loadPdfDocument(currentPage.sourceDocId, srcBytes);
        if (isCancelled || !canvasRef.current) return;

        await renderPageToCanvas(
          pdfDoc,
          currentPage.sourcePageIndex,
          canvasRef.current,
          zoom,
          currentPage.rotation || 0,
          (task) => {
            activeTaskRef.current = task;
          }
        );
      } catch (err: any) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          console.error(err);
          setRenderError(err?.message || 'Lỗi khi vẽ trang');
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    render();

    return () => {
      isCancelled = true;
      if (activeTaskRef.current) {
        try {
          activeTaskRef.current.cancel();
        } catch {}
        activeTaskRef.current = null;
      }
    };
  }, [isOpen, document, currentPage?.pageId, currentPage?.rotation, pageIndex, zoom, sourceDocs]);

  if (!isOpen || !document || !currentPage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-900">
              Chi tiết: Trang {pageIndex + 1} / {document.pages.length}
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
              <button
                disabled={pageIndex <= 0}
                onClick={() => onPageChange(pageIndex - 1)}
                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-slate-700 font-semibold">{pageIndex + 1}</span>
              <button
                disabled={pageIndex >= document.pages.length - 1}
                onClick={() => onPageChange(pageIndex + 1)}
                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                title="Trang tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="p-0.5 text-slate-600 hover:text-slate-900">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono min-w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} className="p-0.5 text-slate-600 hover:text-slate-900">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Rotate */}
            <button
              onClick={() => rotatePage(currentPage.pageId, 90)}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Xoay 90°</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: High Res Canvas */}
        <div className="flex-1 overflow-auto bg-slate-200/60 p-6 flex items-center justify-center relative">
          {isRendering && (
            <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-md z-10">
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
            </div>
          )}

          {renderError ? (
            <div className="text-center text-rose-600 p-8">
              <p className="font-semibold text-sm">Không thể kết xuất trang</p>
              <p className="text-xs text-slate-500 mt-1">{renderError}</p>
            </div>
          ) : (
            <div className="bg-white shadow-xl rounded border border-slate-300">
              <canvas ref={canvasRef} className="block rounded-xs max-w-full h-auto" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
