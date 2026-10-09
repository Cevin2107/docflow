import React, { useRef, useState } from 'react';
import { 
  Upload, 
  Sparkles, 
  ArrowLeft, 
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
  Layers, 
  FileText,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { ToolType } from '../../types/document';
import { TOOLS_REGISTRY } from '../../types/tools';

interface ToolUploadViewProps {
  activeTool: ToolType;
  onFileUpload: (files: FileList | File[]) => void;
  onUseSample: (pageCount?: number) => void;
  onBackToHome: () => void;
  onSelectOtherTool: (tool: ToolType) => void;
}

export const ToolUploadView: React.FC<ToolUploadViewProps> = ({
  activeTool,
  onFileUpload,
  onUseSample,
  onBackToHome,
  onSelectOtherTool,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get tool metadata from registry or defaults
  const toolMeta = TOOLS_REGISTRY.find((t) => t.id === activeTool) || {
    id: activeTool,
    title: 'Xử lý Tài liệu PDF',
    shortDesc: 'Tải tài liệu PDF lên để bắt đầu thao tác',
    category: 'organize',
    iconName: 'FileText'
  };

  const isMerge = activeTool === 'merge';

  const getToolIcon = () => {
    switch (activeTool) {
      case 'merge': return <Combine className="w-8 h-8 text-blue-600" />;
      case 'split': return <Split className="w-8 h-8 text-indigo-600" />;
      case 'compress': return <FileArchive className="w-8 h-8 text-emerald-600" />;
      case 'sign': return <FileSignature className="w-8 h-8 text-amber-600" />;
      case 'latex': return <Code2 className="w-8 h-8 text-purple-600" />;
      case 'pdf-to-word': return <FileType2 className="w-8 h-8 text-sky-600" />;
      case 'edit': return <PenLine className="w-8 h-8 text-rose-600" />;
      case 'protect': return <Lock className="w-8 h-8 text-emerald-600" />;
      case 'watermark': return <Stamp className="w-8 h-8 text-rose-600" />;
      case 'page-numbers': return <Hash className="w-8 h-8 text-sky-600" />;
      case 'remove-blank': return <FileMinus className="w-8 h-8 text-teal-600" />;
      default: return <Layers className="w-8 h-8 text-brand-600" />;
    }
  };

  const getToolCustomGuidance = () => {
    switch (activeTool) {
      case 'merge':
        return {
          badge: 'Ghép nhiều tệp',
          instruction: 'Chọn 2 hoặc nhiều tệp PDF từ máy tính của bạn để gộp lại theo thứ tự mong muốn.',
          btnLabel: 'Chọn các tệp PDF để ghép',
          sampleLabel: 'Tạo 2 tệp PDF mẫu (gồm 10 trang) để thử ghép ngay',
          samplePages: 10,
        };
      case 'split':
        return {
          badge: 'Tách & Chia nhỏ',
          instruction: 'Tải tệp PDF lên để trích xuất trang, tách theo khoảng hoặc tự tạo các nhóm PDF đóng gói ZIP.',
          btnLabel: 'Chọn tệp PDF cần chia',
          sampleLabel: 'Dùng tệp PDF mẫu 20 trang để thử các chế độ tách',
          samplePages: 20,
        };
      case 'compress':
        return {
          badge: 'Giảm dung lượng',
          instruction: 'Tối ưu hóa và nén tệp PDF với 3 chế độ (Cực mạnh, Khuyên dùng, Nhẹ) giữ độ nét cao.',
          btnLabel: 'Chọn tệp PDF cần nén',
          sampleLabel: 'Dùng tệp PDF mẫu để kiểm tra tỷ lệ giảm dung lượng',
          samplePages: 15,
        };
      case 'pdf-to-word':
        return {
          badge: 'Chuyển sang Word DOCX',
          instruction: 'Chuyển đổi tài liệu PDF sang Word DOCX có thể chỉnh sửa văn bản, bảng biểu.',
          btnLabel: 'Chọn tệp PDF cần chuyển sang Word',
          sampleLabel: 'Dùng tệp PDF mẫu để thử chuyển đổi sang DOCX',
          samplePages: 5,
        };
      case 'sign':
        return {
          badge: 'Ký tên điện tử',
          instruction: 'Ký tài liệu PDF nhanh chóng bằng cách vẽ tay, gõ chữ ký hoặc tải ảnh chữ ký lên.',
          btnLabel: 'Chọn tệp PDF cần ký tên',
          sampleLabel: 'Dùng tệp PDF mẫu để thử ký tên ngay',
          samplePages: 5,
        };
      case 'watermark':
        return {
          badge: 'Đóng dấu bản quyền',
          instruction: 'Chèn chữ chìm bản quyền (Watermark) với góc nghiêng, độ mờ và vị trí tùy chỉnh.',
          btnLabel: 'Chọn tệp PDF cần đóng dấu',
          sampleLabel: 'Dùng tệp PDF mẫu để thử đóng dấu',
          samplePages: 8,
        };
      case 'page-numbers':
        return {
          badge: 'Đánh số trang',
          instruction: 'Đánh số thứ tự trang tự động với định dạng và vị trí linh hoạt trên các trang.',
          btnLabel: 'Chọn tệp PDF cần đánh số trang',
          sampleLabel: 'Dùng tệp PDF mẫu để thử đánh số trang',
          samplePages: 12,
        };
      case 'remove-blank':
        return {
          badge: 'Xóa trang trắng',
          instruction: 'Hệ thống tự động phát hiện các trang trống không có nội dung và loại bỏ nhanh.',
          btnLabel: 'Chọn tệp PDF cần quét trang trắng',
          sampleLabel: 'Dùng tệp PDF mẫu (có sẵn trang trắng) để quét thử',
          samplePages: 20,
        };
      default:
        return {
          badge: 'Quản lý trang',
          instruction: 'Kéo thả sắp xếp thứ tự, xoay, nhân bản, xóa và chọn khoảng trang dễ dàng.',
          btnLabel: 'Chọn tệp PDF từ thiết bị',
          sampleLabel: 'Dùng tệp PDF mẫu 20 trang để thử',
          samplePages: 20,
        };
    }
  };

  const guidance = getToolCustomGuidance();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 min-h-screen">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && onFileUpload(e.target.files)}
        accept="application/pdf"
        multiple={isMerge}
        className="hidden"
      />

      <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        
        {/* Navigation back */}
        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 hover:text-brand-600 transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Trang chủ</span>
          </button>

          <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold text-[11px] border border-brand-200">
            {guidance.badge}
          </span>
        </div>

        {/* Tool Icon & Title */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100/80 border border-slate-200 flex items-center justify-center mx-auto shadow-inner">
            {getToolIcon()}
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {toolMeta.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
              {guidance.instruction}
            </p>
          </div>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-50/50 scale-102 ring-4 ring-brand-500/20'
              : 'border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-3 shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6 stroke-[2.2]" />
          </div>

          <span className="font-bold text-sm text-slate-900 mb-1">
            {guidance.btnLabel}
          </span>
          <span className="text-xs text-slate-500">
            {isMerge ? 'Chọn nhiều tệp PDF cùng lúc hoặc kéo thả vào đây' : 'Kéo và thả tệp PDF của bạn vào đây'}
          </span>
        </div>

        {/* Instant Sample Test Button */}
        <div className="space-y-2">
          <button
            onClick={() => onUseSample(guidance.samplePages)}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{guidance.sampleLabel}</span>
          </button>
        </div>

        {/* Security notice & Footer */}
        <div className="flex flex-col items-center justify-center gap-1.5 pt-2 text-center">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% xử lý an toàn trên trình duyệt • Không tải dữ liệu lên máy chủ</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Một sản phẩm phát triển bởi <span className="font-semibold text-slate-600">Đào Bá Anh Quân</span>
          </p>
        </div>

      </div>
    </div>
  );
};
