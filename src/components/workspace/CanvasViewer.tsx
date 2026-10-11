import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  Loader2,
  Move,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Maximize,
  Minimize
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { loadPdfDocument, renderPageToCanvas, getPageDimensions } from '../../services/pdfWorker';
import { SignatureItem } from '../../types/document';
import { drawWatermarkOnCanvas, resolveTargetPages } from '../../services/watermarkRenderer';

interface CanvasViewerProps {
  pendingSignature?: SignatureItem | null;
  onUpdatePendingSignature?: (sig: SignatureItem) => void;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  pendingSignature,
  onUpdatePendingSignature,
}) => {
  const {
    document,
    sourceDocs,
    activePageIndex,
    setActivePageIndex,
    zoom,
    setZoom,
    fitMode,
    setFitMode,
    rotatePage,
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    isRightPanelOpen,
    setIsRightPanelOpen,
    activeTool,
    watermarkPreview,
    pageNumberPreview,
  } = useWorkspace();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRenderTaskRef = useRef<any>(null);

  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Dragging signature state
  const [isDraggingSig, setIsDraggingSig] = useState(false);

  const currentPage = document?.pages[activePageIndex];

  // Auto calculate Fit Width / Fit Page
  const calculateAutoFit = useCallback(async (mode: 'fit-width' | 'fit-page') => {
    if (!document || !currentPage || !containerRef.current) return;
    try {
      const srcBytes = sourceDocs.get(currentPage.sourceDocId);
      if (!srcBytes) return;

      const pdfDoc = await loadPdfDocument(currentPage.sourceDocId, srcBytes);
      const dims = await getPageDimensions(pdfDoc, currentPage.sourcePageIndex, currentPage.rotation || 0);

      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const containerHeight = containerRef.current.clientHeight - 80;

      if (dims.width <= 0) return;

      if (mode === 'fit-width') {
        const optimalScale = Math.max(0.4, Math.min(2.0, containerWidth / dims.width));
        setZoom(Number(optimalScale.toFixed(2)));
        setFitMode('fit-width');
      } else {
        const scaleX = containerWidth / dims.width;
        const scaleY = containerHeight / dims.height;
        const optimalScale = Math.max(0.4, Math.min(2.0, Math.min(scaleX, scaleY)));
        setZoom(Number(optimalScale.toFixed(2)));
        setFitMode('fit-page');
      }
    } catch (err) {
      console.warn('Auto fit calculation notice:', err);
    }
  }, [document, currentPage, sourceDocs, setZoom, setFitMode]);

  // Initial auto fit on mount or doc change
  useEffect(() => {
    if (document) {
      calculateAutoFit('fit-width');
    }
  }, [document?.id]);

  // Handle window / container resize
  useEffect(() => {
    const handleResize = () => {
      if (fitMode === 'fit-width') {
        calculateAutoFit('fit-width');
      } else if (fitMode === 'fit-page') {
        calculateAutoFit('fit-page');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitMode, calculateAutoFit]);

  // Render active page onto canvas with collision cancellation
  useEffect(() => {
    let isCancelled = false;

    async function render() {
      if (!document || !currentPage || !canvasRef.current) return;
      
      // Cancel previous ongoing render task if any
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeRenderTaskRef.current = null;
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
            activeRenderTaskRef.current = task;
          }
        );
      } catch (err: any) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          console.error('Canvas render error:', err);
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
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeRenderTaskRef.current = null;
      }
    };
  }, [document, currentPage?.pageId, currentPage?.rotation, sourceDocs, zoom]);

  // Live Unified Watermark Canvas Overlay Preview
  useEffect(() => {
    if (activeTool !== 'watermark' || !watermarkPreview || !canvasRef.current || !watermarkCanvasRef.current || !document) {
      if (watermarkCanvasRef.current) {
        const ctx = watermarkCanvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, watermarkCanvasRef.current.width, watermarkCanvasRef.current.height);
      }
      return;
    }

    const mainCanvas = canvasRef.current;
    const wmCanvas = watermarkCanvasRef.current;

    const targetPages = resolveTargetPages(document.pages.length, watermarkPreview, activePageIndex);
    const shouldShow = targetPages.includes(activePageIndex);

    if (!shouldShow) {
      const ctx = wmCanvas.getContext('2d');
      ctx?.clearRect(0, 0, wmCanvas.width, wmCanvas.height);
      return;
    }

    // Match physical pixel size with main page canvas
    if (wmCanvas.width !== mainCanvas.width || wmCanvas.height !== mainCanvas.height) {
      wmCanvas.width = mainCanvas.width;
      wmCanvas.height = mainCanvas.height;
    }

    drawWatermarkOnCanvas(wmCanvas, wmCanvas.width, wmCanvas.height, watermarkPreview, zoom);
  }, [activeTool, watermarkPreview, activePageIndex, zoom, isRendering, document]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!document) return;

      if (e.key === 'ArrowLeft' && activePageIndex > 0) {
        setActivePageIndex(activePageIndex - 1);
      } else if (e.key === 'ArrowRight' && activePageIndex < document.pages.length - 1) {
        setActivePageIndex(activePageIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, activePageIndex, setActivePageIndex]);

  // Handle signature dragging on canvas
  const handleSignatureMouseDown = (e: React.MouseEvent) => {
    if (!pendingSignature) return;
    setIsDraggingSig(true);
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSig || !pendingSignature || !onUpdatePendingSignature || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newXPct = Math.max(0, Math.min(85, ((e.clientX - canvasRect.left) / canvasRect.width) * 100));
    const newYPct = Math.max(0, Math.min(85, ((e.clientY - canvasRect.top) / canvasRect.height) * 100));

    onUpdatePendingSignature({
      ...pendingSignature,
      x: Math.round(newXPct),
      y: Math.round(newYPct),
      pageIndex: activePageIndex,
    });
  };

  const handleContainerMouseUp = () => {
    setIsDraggingSig(false);
  };

  if (!document || !currentPage) {
    return (
      <div className="flex-1 bg-slate-100 flex items-center justify-center p-6 text-slate-500">
        <p className="text-sm">Không có trang nào để hiển thị</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      className="flex-1 bg-slate-200/60 overflow-auto relative flex flex-col items-center justify-start p-4 sm:p-6 select-none"
    >
      {/* Floating Canvas Controls Pill */}
      <div className="sticky top-2 z-20 mb-4 bg-white/95 backdrop-blur shadow-md border border-slate-200/90 rounded-2xl px-3 py-1.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs max-w-full">
        
        {/* Toggle Left Sidebar */}
        <button
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          className={`p-1.5 rounded-lg transition-colors ${
            isLeftSidebarOpen ? 'bg-slate-100 text-brand-700' : 'text-slate-500 hover:text-slate-800'
          }`}
          title={isLeftSidebarOpen ? 'Thu gọn danh sách trang' : 'Mở danh sách trang'}
        >
          {isLeftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>

        {/* Page Nav */}
        <div className="flex items-center gap-1 border-x border-slate-200 px-2">
          <button
            disabled={activePageIndex <= 0}
            onClick={() => setActivePageIndex(activePageIndex - 1)}
            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
            title="Trang trước (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-800 min-w-16 text-center text-[11px]">
            {activePageIndex + 1} / {document.pages.length}
          </span>
          <button
            disabled={activePageIndex >= document.pages.length - 1}
            onClick={() => setActivePageIndex(activePageIndex + 1)}
            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
            title="Trang tiếp (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setZoom((z) => Math.max(0.3, Number((z - 0.15).toFixed(2))));
              setFitMode('custom');
            }}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            title="Thu nhỏ (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-700 min-w-10 text-center font-semibold text-[11px]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => {
              setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
              setFitMode('custom');
            }}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            title="Phóng to (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Auto Fit Buttons */}
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
          <button
            onClick={() => calculateAutoFit('fit-width')}
            className={`px-2 py-1 text-[11px] rounded-md font-semibold transition-colors ${
              fitMode === 'fit-width' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Vừa chiều rộng (Fit Width)"
          >
            Vừa khung
          </button>
          <button
            onClick={() => calculateAutoFit('fit-page')}
            className={`px-2 py-1 text-[11px] rounded-md font-semibold transition-colors ${
              fitMode === 'fit-page' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toàn bộ trang (Fit Page)"
          >
            Toàn trang
          </button>
        </div>

        {/* Rotate Button */}
        <div className="border-l border-slate-200 pl-2 flex items-center gap-1">
          <button
            onClick={() => rotatePage(currentPage.pageId, 90)}
            className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md font-medium text-[11px]"
            title="Xoay trang 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xoay</span>
          </button>
        </div>

        {/* Toggle Right Panel */}
        <button
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className={`p-1.5 rounded-lg border-l border-slate-200 pl-2 transition-colors ${
            isRightPanelOpen ? 'bg-slate-100 text-brand-700' : 'text-slate-500 hover:text-slate-800'
          }`}
          title={isRightPanelOpen ? 'Thu gọn bảng công cụ' : 'Mở bảng công cụ'}
        >
          {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
        </button>

      </div>

      {/* Main Canvas Card */}
      <div className="relative shadow-xl rounded-sm border border-slate-300 bg-white transition-all duration-100 my-auto">
        {isRendering && (
          <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-xs p-1.5 rounded-full shadow-xs z-10">
            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
          </div>
        )}

        {renderError ? (
          <div className="p-8 text-center text-rose-600">
            <p className="font-semibold text-sm">Không thể kết xuất trang</p>
            <p className="text-xs text-slate-500 mt-1">{renderError}</p>
          </div>
        ) : (
          <div className="relative">
            <canvas ref={canvasRef} className="block rounded-xs max-w-full h-auto" />

            {/* Interactive Signature Overlay */}
            {pendingSignature && pendingSignature.pageIndex === activePageIndex && (
              <div
                onMouseDown={handleSignatureMouseDown}
                style={{
                  position: 'absolute',
                  left: `${pendingSignature.x}%`,
                  top: `${pendingSignature.y}%`,
                  width: `${pendingSignature.width}px`,
                  height: `${pendingSignature.height}px`,
                  cursor: isDraggingSig ? 'grabbing' : 'grab',
                }}
                className="group border-2 border-dashed border-brand-500 bg-brand-50/20 rounded p-1 hover:border-brand-600 select-none z-30 transition-shadow hover:shadow-lg"
              >
                <img
                  src={pendingSignature.dataUrl}
                  alt="Chữ ký"
                  className="w-full h-full object-contain pointer-events-none"
                />
                
                {/* Drag handle pill */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shadow-sm opacity-90 group-hover:opacity-100 whitespace-nowrap">
                  <Move className="w-2.5 h-2.5" />
                  <span>Kéo để định vị</span>
                </div>

                {/* Subtitle signer & date */}
                {(pendingSignature.signerName || pendingSignature.dateStr) && (
                  <div className="absolute -bottom-5 left-0 text-[10px] text-slate-700 font-medium whitespace-nowrap bg-white/90 px-1 rounded border border-slate-200">
                    {pendingSignature.signerName && <span>{pendingSignature.signerName} </span>}
                    {pendingSignature.dateStr && <span>• {pendingSignature.dateStr}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Live Watermark Canvas Overlay Preview */}
            {activeTool === 'watermark' && (
              <canvas
                ref={watermarkCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
              />
            )}

            {/* Live Page Number Overlay Preview */}
            {activeTool === 'page-numbers' && pageNumberPreview && (
              <div 
                className={`absolute inset-0 pointer-events-none p-4 flex select-none z-20 ${
                  pageNumberPreview.position.includes('center')
                    ? 'justify-center'
                    : pageNumberPreview.position.includes('left')
                    ? 'justify-start'
                    : 'justify-end'
                } ${
                  pageNumberPreview.position.includes('top') 
                    ? 'items-start' 
                    : 'items-end'
                }`}
              >
                <span
                  style={{
                    fontSize: `${Math.max(10, (pageNumberPreview.fontSize || 12) * zoom)}px`,
                    color: pageNumberPreview.color || '#1e293b',
                  }}
                  className="bg-white/80 font-bold px-2 py-0.5 rounded shadow-2xs border border-slate-300 font-mono"
                >
                  {pageNumberPreview.format === 'page-of-total'
                    ? `Trang ${activePageIndex + (pageNumberPreview.startNumber || 1)} / ${document?.pages.length || 1}`
                    : pageNumberPreview.format === 'custom'
                    ? `${pageNumberPreview.prefix} ${activePageIndex + (pageNumberPreview.startNumber || 1)}`
                    : `${activePageIndex + (pageNumberPreview.startNumber || 1)}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
