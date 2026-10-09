import React, { useState, useRef, useEffect } from 'react';
import { 
  Workflow, 
  ChevronDown, 
  FileArchive, 
  FileSignature, 
  Stamp, 
  Hash, 
  FileType2, 
  Image, 
  Lock, 
  PenLine,
  ArrowRight
} from 'lucide-react';
import { ToolType } from '../../types/document';

interface ContinueWorkflowDropdownProps {
  onSelectTool: (tool: ToolType) => void | Promise<void>;
  currentTool?: ToolType;
  disabled?: boolean;
  isProcessing?: boolean;
  label?: string;
}

export const ContinueWorkflowDropdown: React.FC<ContinueWorkflowDropdownProps> = ({
  onSelectTool,
  currentTool,
  disabled = false,
  isProcessing = false,
  label = 'Tiếp tục làm việc với PDF này...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  const allPipelineTools: { id: ToolType; label: string; desc: string; icon: any; color: string }[] = [
    { id: 'compress', label: 'Nén PDF', desc: 'Giảm dung lượng tệp', icon: FileArchive, color: 'text-amber-600 bg-amber-50' },
    { id: 'sign', label: 'Ký tên số', desc: 'Chèn chữ ký điện tử', icon: FileSignature, color: 'text-indigo-600 bg-indigo-50' },
    { id: 'watermark', label: 'Đóng dấu chìm', desc: 'Thêm Watermark bản quyền', icon: Stamp, color: 'text-rose-600 bg-rose-50' },
    { id: 'page-numbers', label: 'Đánh số trang', desc: 'Tự động thêm số trang', icon: Hash, color: 'text-blue-600 bg-blue-50' },
    { id: 'pdf-to-word', label: 'PDF sang Word', desc: 'Trích xuất văn bản .docx', icon: FileType2, color: 'text-cyan-600 bg-cyan-50' },
    { id: 'pdf-to-image', label: 'Chuyển sang ảnh', desc: 'Xuất ra PNG/JPG độ nét cao', icon: Image, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'protect', label: 'Bảo vệ & Làm phẳng', desc: 'Flatten form, xóa metadata', icon: Lock, color: 'text-teal-600 bg-teal-50' },
    { id: 'edit', label: 'Biên tập & Che dữ liệu', desc: 'Bôi đen che thông tin nhạy cảm', icon: PenLine, color: 'text-orange-600 bg-orange-50' },
  ];

  const pipelineTools = allPipelineTools.filter((t) => t.id !== currentTool);

  const handleChoose = async (tool: ToolType) => {
    setIsOpen(false);
    await onSelectTool(tool);
  };

  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        type="button"
        onClick={() => !disabled && !isProcessing && setIsOpen(!isOpen)}
        disabled={disabled || isProcessing}
        className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all shadow-2xs ${
          isOpen
            ? 'bg-slate-50 border-brand-500 ring-2 ring-brand-500/20 text-brand-700'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Workflow className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-brand-600' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-72 overflow-y-auto">
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Chọn công cụ xử lý tiếp</span>
            <span className="text-[10px] text-brand-600 font-normal">Không cần tải lại tệp</span>
          </div>

          <div className="grid grid-cols-1 gap-0.5 pt-1">
            {pipelineTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleChoose(tool.id)}
                  className="w-full p-2 rounded-xl text-left hover:bg-brand-50/60 active:bg-brand-100/60 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${tool.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-800 group-hover:text-brand-700">
                        {tool.label}
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">
                        {tool.desc}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
