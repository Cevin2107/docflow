import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MergeTool } from '../tools/MergeTool';
import { SplitTool } from '../tools/SplitTool';
import { CompressTool } from '../tools/CompressTool';
import { SignTool } from '../tools/SignTool';
import { ConvertTool } from '../tools/ConvertTool';
import { PageNumberTool } from '../tools/PageNumberTool';
import { WatermarkTool } from '../tools/WatermarkTool';
import { RemoveBlankTool } from '../tools/RemoveBlankTool';
import { LatexTool } from '../tools/LatexTool';
import { PdfToWordTool } from '../tools/PdfToWordTool';
import { ProtectTool } from '../tools/ProtectTool';
import { EditTool } from '../tools/EditTool';
import { SignatureItem } from '../../types/document';
import { 
  Combine, 
  Split, 
  FileArchive, 
  FileSignature, 
  Image, 
  Hash, 
  Stamp, 
  FileMinus,
  Layers,
  ChevronRight,
  Code2,
  FileType2,
  Lock,
  PenLine
} from 'lucide-react';

interface ToolPanelProps {
  onShowOutputModal: (files: { name: string; bytes: Uint8Array; pageCount: number }[], zipName: string) => void;
  pendingSignature: SignatureItem | null;
  onSetPendingSignature: (sig: SignatureItem | null) => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  onShowOutputModal,
  pendingSignature,
  onSetPendingSignature,
}) => {
  const { activeTool, setActiveTool } = useWorkspace();

  return (
    <aside className="w-80 md:w-96 bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-xs overflow-y-auto">
      {activeTool === 'overview' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bảng điều khiển công cụ</h3>
              <p className="text-[11px] text-slate-600">Chọn thao tác bạn muốn thực hiện trên tài liệu</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'merge', title: 'Ghép PDF (Merge)', desc: 'Thêm tài liệu khác và gộp thứ tự các trang', icon: Combine, color: 'text-blue-600 bg-blue-50' },
              { id: 'split', title: 'Chia PDF (Split & Groups)', desc: 'Tách theo khoảng, mỗi N trang hoặc gom nhóm tuỳ biến', icon: Split, color: 'text-indigo-600 bg-indigo-50' },
              { id: 'compress', title: 'Nén PDF (Compress)', desc: 'Giảm kích thước tệp với 3 chế độ nén', icon: FileArchive, color: 'text-emerald-600 bg-emerald-50' },
              { id: 'sign', title: 'Ký tên PDF (Sign)', desc: 'Vẽ chữ ký, gõ tên hoặc chèn ảnh chữ ký', icon: FileSignature, color: 'text-amber-600 bg-amber-50' },
              { id: 'latex', title: 'Biên dịch LaTeX (LaTeX to PDF/Word)', desc: 'Soạn thảo LaTeX, compile ra PDF và xuất sang Word', icon: Code2, color: 'text-purple-600 bg-purple-50' },
              { id: 'pdf-to-word', title: 'PDF sang Word (DOCX)', desc: 'Trích xuất văn bản và cấu trúc sang file Word', icon: FileType2, color: 'text-sky-600 bg-sky-50' },
              { id: 'edit', title: 'Chỉnh sửa & Che dữ liệu (Redact)', desc: 'Thêm ghi chú, hình khối và che thông tin nhạy cảm', icon: PenLine, color: 'text-rose-600 bg-rose-50' },
              { id: 'protect', title: 'Bảo vệ & Làm phẳng (Protect)', desc: 'Làm phẳng form và loại bỏ metadata ẩn', icon: Lock, color: 'text-emerald-600 bg-emerald-50' },
              { id: 'pdf-to-image', title: 'PDF sang Ảnh', desc: 'Trích xuất toàn bộ trang thành PNG/JPG/ZIP', icon: Image, color: 'text-purple-600 bg-purple-50' },
              { id: 'page-numbers', title: 'Đánh số trang', desc: 'Chèn số thứ tự trang tự động với vị trí linh hoạt', icon: Hash, color: 'text-sky-600 bg-sky-50' },
              { id: 'watermark', title: 'Chèn Watermark', desc: 'Đóng dấu bản quyền chữ mờ trên các trang', icon: Stamp, color: 'text-rose-600 bg-rose-50' },
              { id: 'remove-blank', title: 'Xóa trang trắng', desc: 'Tự động phát hiện và xóa các trang trống', icon: FileMinus, color: 'text-teal-600 bg-teal-50' },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id as any)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-slate-50/70 transition-all text-left flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tool.color} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-800 group-hover:text-brand-600 transition-colors">
                        {tool.title}
                      </div>
                      <div className="text-[11px] text-slate-600 leading-snug">
                        {tool.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTool === 'merge' && <MergeTool />}
      {activeTool === 'split' && <SplitTool onShowOutputModal={onShowOutputModal} />}
      {activeTool === 'compress' && <CompressTool />}
      {activeTool === 'sign' && (
        <SignTool
          pendingSignature={pendingSignature}
          onSetPendingSignature={onSetPendingSignature}
        />
      )}
      {activeTool === 'latex' && <LatexTool />}
      {activeTool === 'pdf-to-word' && <PdfToWordTool />}
      {activeTool === 'edit' && <EditTool />}
      {activeTool === 'protect' && <ProtectTool />}
      {(activeTool === 'pdf-to-image' || activeTool === 'image-to-pdf') && <ConvertTool />}
      {activeTool === 'page-numbers' && <PageNumberTool />}
      {activeTool === 'watermark' && <WatermarkTool />}
      {activeTool === 'remove-blank' && <RemoveBlankTool />}
    </aside>
  );
};
