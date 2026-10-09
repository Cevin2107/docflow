import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft,
  Edit3, 
  Download, 
  ChevronDown,
  RotateCcw,
  RotateCw,
  Combine,
  Split,
  FileArchive,
  FileSignature,
  Code2,
  FileType2,
  Lock,
  PenLine,
  Stamp,
  Hash,
  FileMinus,
  Image,
  Layers,
  Upload,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ToolType } from '../../types/document';
import { formatBytes } from '../../utils/formatters';

interface TopBarProps {
  onOpenExportModal: () => void;
  onBackToHome?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenExportModal, onBackToHome }) => {
  const { 
    document, 
    sourceDocs,
    updateDocumentName, 
    activeTool, 
    setActiveTool,
    selectedPageIds,
    undo,
    redo,
    canUndo,
    canRedo,
    clearDocument,
    loadDocumentFromFile,
  } = useWorkspace();

  const [isEditingName, setIsEditingName] = useState(false);
  const [docNameInput, setDocNameInput] = useState(document?.name || 'document.pdf');
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const swapFileInputRef = useRef<HTMLInputElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowToolDropdown(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveName = () => {
    if (docNameInput.trim()) {
      const cleanName = docNameInput.trim().endsWith('.pdf') ? docNameInput.trim() : `${docNameInput.trim()}.pdf`;
      updateDocumentName(cleanName);
    }
    setIsEditingName(false);
  };

  const handleSwapFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      loadDocumentFromFile(file);
    }
    if (swapFileInputRef.current) swapFileInputRef.current.value = '';
  };

  // Tools catalog for the quick switcher
  const toolsCatalog: { id: ToolType; label: string; icon: any; category: string }[] = [
    { id: 'overview', label: 'Quản lý trang (Lưới)', icon: Layers, category: 'Thao tác trang' },
    { id: 'split', label: 'Chia PDF', icon: Split, category: 'Thao tác trang' },
    { id: 'merge', label: 'Ghép nhiều PDF', icon: Combine, category: 'Thao tác trang' },
    { id: 'compress', label: 'Nén PDF', icon: FileArchive, category: 'Tối ưu' },
    { id: 'remove-blank', label: 'Xóa trang trắng', icon: FileMinus, category: 'Tối ưu' },
    { id: 'protect', label: 'Bảo vệ PDF', icon: Lock, category: 'Tối ưu' },
    { id: 'sign', label: 'Ký tên số', icon: FileSignature, category: 'Ký & Đóng dấu' },
    { id: 'watermark', label: 'Đóng dấu Watermark', icon: Stamp, category: 'Ký & Đóng dấu' },
    { id: 'page-numbers', label: 'Đánh số trang', icon: Hash, category: 'Ký & Đóng dấu' },
    { id: 'pdf-to-word', label: 'PDF sang Word', icon: FileType2, category: 'Chuyển đổi' },
    { id: 'pdf-to-image', label: 'PDF sang Hình ảnh', icon: Image, category: 'Chuyển đổi' },
    { id: 'latex', label: 'LaTeX Studio', icon: Code2, category: 'Soạn thảo' },
  ];

  const currentToolInfo = toolsCatalog.find((t) => t.id === activeTool) || {
    id: activeTool,
    label: 'Công cụ PDF',
    icon: Layers,
    category: 'Chung'
  };

  const CurrentToolIcon = currentToolInfo.icon;

  // Compute number of distinct source files if in Merge
  const distinctMergeFilesCount = document ? new Set(document.pages.map((p) => p.sourceDocId)).size : 0;

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 shadow-2xs z-30 flex items-center justify-between px-3 sm:px-5 gap-3 shrink-0">
      {/* Hidden file input for quick file swapping */}
      <input
        type="file"
        ref={swapFileInputRef}
        onChange={handleSwapFile}
        accept="application/pdf"
        className="hidden"
      />

      {/* LEFT: Back to Home + Active Tool Badge + Switch Tool Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-2xs"
            title="Quay lại danh mục công cụ Trang chủ"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trang chủ</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Current Tool Badge & Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowToolDropdown(!showToolDropdown)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-bold text-slate-900 border border-slate-200 transition-colors"
            title="Nhấn để đổi sang công cụ khác"
          >
            <CurrentToolIcon className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">{currentToolInfo.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {/* Quick Tool Switcher Dropdown */}
          {showToolDropdown && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Chuyển sang công cụ khác:
              </div>
              <div className="max-h-80 overflow-y-auto py-1 space-y-1">
                {toolsCatalog.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = tool.id === activeTool;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setActiveTool(tool.id);
                        setShowToolDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-500'}`} />
                        <span>{tool.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{tool.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Context-Aware Document / Project Status */}
      <div className="flex items-center gap-2 min-w-0 max-w-sm sm:max-w-md lg:max-w-xl justify-center">
        
        {/* CASE A: LATEX STUDIO (Independent Code Project, NEVER shows unrelated PDF!) */}
        {activeTool === 'latex' ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200/80 text-xs font-semibold">
            <Code2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="font-mono">latex_document.tex</span>
            <span className="text-purple-300">•</span>
            <span className="text-[11px] text-purple-600 font-normal hidden sm:inline">XeLaTeX Engine</span>
          </div>
        ) : activeTool === 'merge' ? (
          /* CASE B: MERGE (Multi-Document Mode) */
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200/80 text-xs font-semibold">
            <Combine className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Ghép nhiều tệp</span>
            <span className="text-blue-300">•</span>
            <span className="text-[11px] text-blue-700 font-normal">
              {distinctMergeFilesCount || 0} tệp ({document?.pages.length || 0} trang)
            </span>
            <button
              onClick={clearDocument}
              className="ml-1 text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
              title="Làm mới danh sách tệp ghép"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : document ? (
          /* CASE C: SINGLE DOCUMENT TOOLS */
          <div className="flex items-center gap-2 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={docNameInput}
                  onChange={(e) => setDocNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                  className="px-2 py-0.5 text-xs font-bold text-slate-900 border border-brand-500 rounded-md focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  onClick={handleSaveName}
                  className="text-xs px-2 py-0.5 bg-brand-600 text-white rounded font-medium"
                >
                  Lưu
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setDocNameInput(document.name);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1.5 cursor-pointer group py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors min-w-0"
                title="Nhấn để đổi tên tệp"
              >
                <span className="text-xs font-bold text-slate-800 group-hover:text-brand-600 truncate max-w-[120px] sm:max-w-[200px] md:max-w-[280px]">
                  {document.name}
                </span>
                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0 font-medium">
              <span><b>{document.pages.length}</b> trang</span>
              {document.fileSize > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{formatBytes(document.fileSize)}</span>
                </>
              )}
              {/* Only show selected page count when on overview or split where page selection is relevant */}
              {(activeTool === 'overview' || activeTool === 'split') && selectedPageIds.size > 0 && (
                <span className="text-brand-700 font-bold pl-1 border-l border-slate-300">
                  (Chọn {selectedPageIds.size})
                </span>
              )}
            </div>

            {/* Quick Reset File button */}
            <div className="flex items-center gap-1">
              <button
                onClick={clearDocument}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                title="Đóng tệp hiện tại"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Chưa nạp tệp</span>
        )}
      </div>

      {/* RIGHT: Undo / Redo & Overview Export Action */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* Compact Undo / Redo (Only for active document editing) */}
        {activeTool !== 'latex' && (
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Hoàn tác (Undo)"
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Làm lại (Redo)"
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Overview Primary Export Button (Overview page has no right panel) */}
        {activeTool === 'overview' && document && (
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-xs shadow-brand-500/20 transition-all"
            title="Xuất tài liệu PDF đã sắp xếp"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất PDF</span>
          </button>
        )}

      </div>

    </header>
  );
};
