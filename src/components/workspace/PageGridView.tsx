import React, { useState, useCallback, memo } from 'react';
import { 
  RotateCw, 
  Trash2, 
  Plus, 
  Eye, 
  Check, 
  Square, 
  CheckSquare, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { parsePageRangeString } from '../../utils/formatters';
import { DocPage } from '../../types/document';

interface PageGridViewProps {
  onAddPdfClick: () => void;
  onInspectPage?: (pageIndex: number) => void;
}

// ==========================================
// MEMOIZED PAGE CARD COMPONENT
// Renders individual page with minimal chrome
// Only re-renders when its own selection/thumbnail changes
// ==========================================
interface PageCardProps {
  page: DocPage;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  isOver: boolean;
  onSelect: (e: React.MouseEvent, index: number, pageId: string) => void;
  onInspect: (index: number) => void;
  onRotate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const PageCard = memo<PageCardProps>(({
  page,
  index,
  isSelected,
  isDragging,
  isOver,
  onSelect,
  onInspect,
  onRotate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={(e) => onSelect(e, index, page.pageId)}
      className={`group relative bg-white rounded-xl border transition-all duration-150 flex flex-col justify-between overflow-hidden cursor-pointer select-none ${
        isOver
          ? 'border-brand-500 ring-4 ring-brand-400/30 scale-102 shadow-lg z-10'
          : isSelected
          ? 'border-brand-600 ring-2 ring-brand-500/40 bg-brand-50/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      } ${isDragging ? 'opacity-30' : 'opacity-100'}`}
    >
      {/* Sleek Minimal Header: Page number + Checkbox & Quick Actions on Hover */}
      <div 
        className={`px-2.5 py-1.5 flex items-center justify-between border-b transition-colors text-xs ${
          isSelected ? 'bg-brand-50/70 border-brand-200' : 'bg-slate-50/60 border-slate-100'
        }`}
      >
        {/* Left: Checkbox & Page Number */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div 
            className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
              isSelected 
                ? 'bg-brand-600 text-white' 
                : 'border border-slate-300 bg-white group-hover:border-brand-400'
            }`}
          >
            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>
          <span className={`font-semibold text-xs truncate ${isSelected ? 'text-brand-900 font-bold' : 'text-slate-700'}`}>
            Trang {index + 1}
          </span>
        </div>

        {/* Right: Quick Micro Actions */}
        <div className="flex items-center gap-1">
          {/* Small "Xem" button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(index);
            }}
            className="px-1.5 py-0.5 rounded bg-white hover:bg-brand-50 hover:text-brand-700 text-slate-600 text-[11px] font-medium flex items-center gap-1 border border-slate-200 hover:border-brand-300 transition-colors shadow-2xs"
            title="Xem phóng to trang này"
          >
            <Eye className="w-3 h-3 text-brand-600" />
            <span className="hidden sm:inline">Xem</span>
          </button>

          {/* Quick rotate & delete on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRotate(page.pageId);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Xoay trang 90°"
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(page.pageId);
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Xóa trang"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Center: Page Preview Thumbnail */}
      <div 
        className={`p-2.5 flex items-center justify-center min-h-[155px] sm:min-h-[175px] relative transition-colors ${
          isSelected ? 'bg-brand-50/15' : 'bg-slate-50/30'
        }`}
        title="Bấm để chọn/bỏ chọn (Giữ Shift để chọn khoảng)"
      >
        {page.thumbnailUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={page.thumbnailUrl}
              alt={`Trang ${index + 1}`}
              loading="lazy"
              className={`max-h-32 sm:max-h-38 max-w-full object-contain rounded-xs border bg-white shadow-2xs transition-transform duration-150 ${
                isSelected ? 'border-brand-400 shadow-xs' : 'border-slate-200'
              }`}
              style={{
                transform: page.rotation % 180 !== 0 
                  ? `rotate(${page.rotation}deg) scale(0.78)` 
                  : `rotate(${page.rotation || 0}deg)`,
              }}
            />
            {page.rotation > 0 && (
              <span className="absolute bottom-1 right-2 bg-slate-900/80 text-white text-[9px] px-1 py-0.2 rounded font-mono font-semibold">
                {page.rotation}°
              </span>
            )}
          </div>
        ) : (
          <div className="w-20 h-28 bg-white rounded border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
            <span className="text-[10px] text-slate-400">Đang tải...</span>
          </div>
        )}

        {/* Selected badge in corner */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-brand-600 text-white p-0.5 rounded-full shadow-sm">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        )}
      </div>
    </div>
  );
});

PageCard.displayName = 'PageCard';

// ==========================================
// MAIN PAGE GRID VIEW COMPONENT
// ==========================================
export const PageGridView: React.FC<PageGridViewProps> = ({ 
  onAddPdfClick, 
  onInspectPage 
}) => {
  const {
    document,
    activeTool,
    selectedPageIds,
    toggleSelectPage,
    selectAllPages,
    clearSelection,
    selectPagesByIds,
    setSelectedPageIds,
    reorderPages,
    rotatePage,
    rotateSelectedPages,
    deletePage,
    deleteSelectedPages,
    duplicateSelectedPages,
    setActivePageIndex,
    addToast,
  } = useWorkspace();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Range selection state
  const [rangeInput, setRangeInput] = useState<string>('');
  const [showRangeBar, setShowRangeBar] = useState<boolean>(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  if (!document) return null;

  const totalPages = document.pages.length;
  const allSelected = selectedPageIds.size === totalPages && totalPages > 0;

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex((prev) => (prev !== index ? index : prev));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderPages(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, reorderPages]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Card click: Select / Deselect page (supports Shift + Click)
  const handlePageSelect = useCallback((e: React.MouseEvent, index: number, pageId: string) => {
    if (e.shiftKey && lastClickedIndex !== null && document) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeIds = document.pages.slice(start, end + 1).map((p) => p.pageId);
      
      setSelectedPageIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
      addToast(`Đã chọn từ trang ${start + 1} đến ${end + 1}`, 'info');
    } else {
      toggleSelectPage(pageId, true);
    }
    setLastClickedIndex(index);
  }, [lastClickedIndex, document, setSelectedPageIds, toggleSelectPage, addToast]);

  // Inspect page callback
  const handleInspect = useCallback((index: number) => {
    setActivePageIndex(index);
    if (onInspectPage) onInspectPage(index);
  }, [setActivePageIndex, onInspectPage]);

  // Rotate single page
  const handleRotate = useCallback((pageId: string) => {
    rotatePage(pageId, 90);
  }, [rotatePage]);

  // Delete single page
  const handleDelete = useCallback((pageId: string) => {
    deletePage(pageId);
  }, [deletePage]);

  // Add range to existing selection (Cumulative selection)
  const handleAddRange = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRangeError(null);

    if (!rangeInput.trim()) {
      setRangeError('Vui lòng nhập khoảng trang (ví dụ: 1-5, 8, 12-15)');
      return;
    }

    const res = parsePageRangeString(rangeInput, totalPages);
    if (res.error) {
      setRangeError(res.error);
      return;
    }

    const idsToAdd: string[] = [];
    res.pages.forEach((pNum) => {
      const page = document.pages[pNum - 1];
      if (page) idsToAdd.push(page.pageId);
    });

    if (idsToAdd.length === 0) {
      setRangeError('Không có trang hợp lệ trong khoảng đã nhập');
      return;
    }

    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      idsToAdd.forEach((id) => next.add(id));
      return next;
    });

    addToast(`Đã thêm ${idsToAdd.length} trang (${rangeInput}) vào vùng chọn`, 'success');
    setRangeInput(''); // Clear input so user can type next range and add consecutively
  };

  // Deselect pages in the specified range
  const handleRemoveRange = () => {
    if (!rangeInput.trim()) return;
    const res = parsePageRangeString(rangeInput, totalPages);
    if (res.error || res.pages.length === 0) return;

    const idsToRemove = new Set<string>();
    res.pages.forEach((pNum) => {
      const page = document.pages[pNum - 1];
      if (page) idsToRemove.add(page.pageId);
    });

    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      idsToRemove.forEach((id) => next.delete(id));
      return next;
    });

    addToast(`Đã bỏ ${idsToRemove.size} trang (${rangeInput}) khỏi vùng chọn`, 'info');
    setRangeInput('');
  };

  // Quick range helpers
  const handleSelectOdd = () => {
    const ids = document.pages.filter((_, idx) => (idx + 1) % 2 === 1).map((p) => p.pageId);
    selectPagesByIds(ids);
    addToast(`Đã chọn ${ids.length} trang lẻ`, 'info');
  };

  const handleSelectEven = () => {
    const ids = document.pages.filter((_, idx) => (idx + 1) % 2 === 0).map((p) => p.pageId);
    selectPagesByIds(ids);
    addToast(`Đã chọn ${ids.length} trang chẵn`, 'info');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-7xl mx-auto space-y-3.5">
        
        {/* Streamlined Clean Toolbar */}
        <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Quick Selection Controls */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              <button
                onClick={selectAllPages}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  allSelected ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Chọn tất cả các trang"
              >
                <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
                <span>Tất cả</span>
              </button>

              <button
                onClick={handleSelectOdd}
                className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors"
                title="Chọn các trang lẻ (1, 3, 5...)"
              >
                Trang lẻ
              </button>
              <button
                onClick={handleSelectEven}
                className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors"
                title="Chọn các trang chẵn (2, 4, 6...)"
              >
                Trang chẵn
              </button>

              <button
                onClick={clearSelection}
                disabled={selectedPageIds.size === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                title="Bỏ chọn toàn bộ trang đang chọn"
              >
                <X className="w-3.5 h-3.5" />
                <span>Bỏ chọn</span>
              </button>

              <span className="text-slate-200 hidden sm:inline">|</span>

            {activeTool !== 'split' ? (
              <button
                onClick={() => setShowRangeBar(!showRangeBar)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                  showRangeBar 
                    ? 'bg-brand-50 text-brand-700 border-brand-200' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3 text-brand-600" />
                <span>Khoảng trang</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 hidden sm:inline ml-1 font-normal">
                💡 Chọn trang trên lưới • Dải trang tự động điền ở cột bên phải
              </span>
            )}
          </div>

          {/* Right: Counter & Add PDF */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span>{totalPages} trang</span>
              {selectedPageIds.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold text-[11px] border border-brand-200">
                  Đã chọn {selectedPageIds.size}
                </span>
              )}
            </div>

            <button
              onClick={onAddPdfClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-xl border border-brand-200 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm PDF</span>
            </button>
          </div>
        </div>

        {/* Expandable Range Selection Bar (Only in Overview mode where right panel is absent) */}
        {activeTool !== 'split' && showRangeBar && (
          <div className="bg-white rounded-xl p-3 border border-brand-200/90 shadow-2xs flex flex-wrap items-center gap-2.5 animate-in slide-in-from-top-2 duration-150">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Thêm khoảng trang:
            </span>
            <form onSubmit={handleAddRange} className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => {
                  setRangeInput(e.target.value);
                  if (rangeError) setRangeError(null);
                }}
                placeholder="VD: 1-5, 8, 12-15... (nhấn Enter để thêm)"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                title="Cộng thêm khoảng trang này vào các trang đã chọn trước đó"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
              {selectedPageIds.size > 0 && rangeInput.trim() && (
                <button
                  type="button"
                  onClick={handleRemoveRange}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-medium transition-colors shrink-0"
                  title="Bỏ các trang trong khoảng này khỏi danh sách đã chọn"
                >
                  Bỏ bớt
                </button>
              )}
            </form>
            {rangeError && (
              <span className="text-xs text-rose-600 font-medium">{rangeError}</span>
            )}
            <button
              onClick={() => setShowRangeBar(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded ml-auto"
              title="Đóng thanh khoảng trang"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 5 Pages Per Row Grid (Responsive & Air-rich) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {document.pages.map((page, idx) => (
            <PageCard
              key={page.pageId}
              page={page}
              index={idx}
              isSelected={selectedPageIds.has(page.pageId)}
              isDragging={draggedIndex === idx}
              isOver={dragOverIndex === idx}
              onSelect={handlePageSelect}
              onInspect={handleInspect}
              onRotate={handleRotate}
              onDelete={handleDelete}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}

          {/* "+ Thêm tệp PDF" card at the end of the grid */}
          <div
            onClick={onAddPdfClick}
            className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-white/40 hover:bg-brand-50/20 transition-all group min-h-[190px]"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="font-semibold text-xs text-slate-700 group-hover:text-brand-600">
              Ghép thêm PDF
            </span>
          </div>

        </div>

      </div>

      {/* Floating Batch Actions Bar when pages are selected */}
      {selectedPageIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl px-4 sm:px-5 py-2.5 shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-brand-400"></span>
            <span>Đã chọn <b className="text-brand-300">{selectedPageIds.size}</b> trang</span>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => rotateSelectedPages(90)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-brand-400" />
              <span>Xoay</span>
            </button>
            <button
              onClick={duplicateSelectedPages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              <span>Nhân bản</span>
            </button>
            <button
              onClick={deleteSelectedPages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <button
            onClick={clearSelection}
            className="text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap"
          >
            Hủy chọn
          </button>
        </div>
      )}
    </div>
  );
};
