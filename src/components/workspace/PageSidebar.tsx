import React, { useState } from 'react';
import { 
  RotateCw, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  CheckSquare, 
  Square, 
  GripVertical,
  PlusCircle,
  Eye,
  Check
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface PageSidebarProps {
  onAddPdfClick: () => void;
}

export const PageSidebar: React.FC<PageSidebarProps> = ({ onAddPdfClick }) => {
  const {
    document,
    activePageIndex,
    setActivePageIndex,
    selectedPageIds,
    toggleSelectPage,
    selectAllPages,
    clearSelection,
    reorderPages,
    rotatePage,
    rotateSelectedPages,
    deletePage,
    deleteSelectedPages,
    duplicatePage,
    duplicateSelectedPages,
  } = useWorkspace();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!document) {
    return (
      <aside className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col items-center justify-center text-center">
        <p className="text-xs text-slate-600">Chưa có tài liệu nào được mở</p>
      </aside>
    );
  }

  const allSelected = selectedPageIds.size === document.pages.length && document.pages.length > 0;

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderPages(draggedIndex, targetIndex);
      setActivePageIndex(targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <aside className="w-64 md:w-72 bg-slate-50/70 border-r border-slate-200 flex flex-col h-full shrink-0 select-none">
      
      {/* Header with selection and actions */}
      <div className="p-3 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={allSelected ? clearSelection : selectAllPages}
              className="text-xs font-medium text-slate-700 hover:text-brand-600 flex items-center gap-1 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-brand-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{allSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}</span>
            </button>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {document.pages.length} trang
          </span>
        </div>

        {/* Batch actions when multiple pages selected */}
        {selectedPageIds.size > 0 && (
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-2 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <span className="font-semibold text-brand-900">
              Đã chọn {selectedPageIds.size}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => rotateSelectedPages(90)}
                title="Xoay 90° các trang đã chọn"
                className="p-1 hover:bg-white rounded text-brand-700 hover:text-brand-900 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={duplicateSelectedPages}
                title="Nhân bản các trang đã chọn"
                className="p-1 hover:bg-white rounded text-brand-700 hover:text-brand-900 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={deleteSelectedPages}
                title="Xóa các trang đã chọn"
                className="p-1 hover:bg-white rounded text-rose-600 hover:text-rose-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pages List with Drag & Drop */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {document.pages.map((page, idx) => {
          const isCurrent = idx === activePageIndex;
          const isSelected = selectedPageIds.has(page.pageId);
          const isDragging = draggedIndex === idx;
          const isOver = dragOverIndex === idx;

          return (
            <div
              key={page.pageId}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`relative rounded-xl border transition-all duration-150 group ${
                isOver
                  ? 'border-brand-500 ring-2 ring-brand-500/30 scale-[1.02]'
                  : isCurrent
                  ? 'border-brand-500 bg-brand-50/30 shadow-xs'
                  : isSelected
                  ? 'border-brand-300 bg-brand-50/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              } ${isDragging ? 'opacity-40' : 'opacity-100'}`}
            >
              {/* Top Bar inside thumbnail item */}
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <button
                    onClick={() => toggleSelectPage(page.pageId, true)}
                    className="text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="font-semibold text-slate-700">Trang {idx + 1}</span>
                </div>

                {/* Accessible Move Up/Down buttons for mobile/keyboard */}
                <div className="flex items-center gap-0.5">
                  <button
                    disabled={idx === 0}
                    onClick={() => reorderPages(idx, idx - 1)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    title="Di chuyển lên trước"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === document.pages.length - 1}
                    onClick={() => reorderPages(idx, idx + 1)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    title="Di chuyển xuống sau"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Thumbnail Content */}
              <div 
                onClick={() => setActivePageIndex(idx)}
                className="p-2 cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
              >
                {page.thumbnailUrl ? (
                  <div className="relative overflow-hidden rounded shadow-xs border border-slate-200/80 bg-white w-28 h-36 flex items-center justify-center p-1">
                    <img
                      src={page.thumbnailUrl}
                      alt={`Thumbnail trang ${idx + 1}`}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                      style={{
                        transform: page.rotation % 180 !== 0 
                          ? `rotate(${page.rotation}deg) scale(0.72)` 
                          : `rotate(${page.rotation || 0}deg)`,
                      }}
                    />
                    {page.rotation > 0 && (
                      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] px-1 rounded font-mono">
                        {page.rotation}°
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-28 h-36 bg-slate-100 rounded border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500">
                    Trang {idx + 1}
                  </div>
                )}
              </div>

              {/* Bottom Quick Actions (Hover) */}
              <div className="px-2 py-1 bg-slate-50/70 border-t border-slate-100 rounded-b-xl flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => rotatePage(page.pageId, 90)}
                  title="Xoay trang 90°"
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => duplicatePage(page.pageId)}
                  title="Nhân bản trang"
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deletePage(page.pageId)}
                  title="Xóa trang"
                  className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add more files CTA button */}
        <button
          onClick={onAddPdfClick}
          className="w-full py-3 px-2 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand-600 bg-white hover:bg-brand-50/30 transition-all"
        >
          <PlusCircle className="w-4 h-4 text-brand-600" />
          <span>Thêm tệp PDF khác</span>
        </button>
      </div>
    </aside>
  );
};
