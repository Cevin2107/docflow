import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Combine,
  Split,
  FileArchive,
  FileSignature,
  Image,
  Hash,
  Stamp,
  FileMinus,
  FileText,
  ArrowRight,
  Layers,
  Lock,
  Zap,
  Code2,
  FileType2,
  PenLine,
  Sliders,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TOOLS_REGISTRY } from '../../types/tools';
import { ToolType } from '../../types/document';

interface HomePageProps {
  onOpenTool: (toolId: ToolType) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenTool }) => {
  const { document, loadSampleDocument, isLoading, clearDocument } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter tools based on search and category
  const filteredTools = TOOLS_REGISTRY.filter((tool) => {
    const matchesSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Combine': return <Combine className="w-5 h-5 text-blue-600" />;
      case 'Split': return <Split className="w-5 h-5 text-indigo-600" />;
      case 'FileArchive': return <FileArchive className="w-5 h-5 text-emerald-600" />;
      case 'FileSignature': return <FileSignature className="w-5 h-5 text-amber-600" />;
      case 'Image': return <Image className="w-5 h-5 text-sky-600" />;
      case 'Hash': return <Hash className="w-5 h-5 text-cyan-600" />;
      case 'Stamp': return <Stamp className="w-5 h-5 text-rose-600" />;
      case 'FileMinus': return <FileMinus className="w-5 h-5 text-teal-600" />;
      case 'Code2': return <Code2 className="w-5 h-5 text-purple-600" />;
      case 'FileType2': return <FileType2 className="w-5 h-5 text-blue-700" />;
      case 'Lock': return <Lock className="w-5 h-5 text-emerald-600" />;
      case 'PenLine': return <PenLine className="w-5 h-5 text-rose-600" />;
      default: return <Layers className="w-5 h-5 text-brand-600" />;
    }
  };

  const getBadgeStyle = (badge?: string) => {
    switch (badge) {
      case 'Phổ biến':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Mạnh mẽ':
      case 'Pro':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Bảo mật':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Nhanh':
      case 'Khuyên dùng':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">

      {/* Session Resume Banner if a document is already in memory */}
      {document && (
        <div className="bg-brand-50 border-b border-brand-200/80 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-brand-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Phiên làm việc hiện tại:</span>
              <strong className="truncate max-w-xs sm:max-w-md">{document.name}</strong>
              <span className="text-brand-600 font-medium">({document.pages.length} trang)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenTool('overview')}
                className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs"
              >
                Mở trong Workspace →
              </button>
              <button
                onClick={clearDocument}
                className="px-2 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border border-slate-200"
                title="Đóng phiên làm việc để bắt đầu với tài liệu mới"
              >
                <X className="w-3.5 h-3.5" />
                <span>Bắt đầu mới</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section: Pure Tool Portal */}
      <section className="pt-10 pb-12 px-4 sm:px-6 bg-gradient-to-b from-white via-slate-50/60 to-slate-50 border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto text-center space-y-4">

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>DocFlow v3.6 — Bộ Công Cụ Xử Lý PDF & Tài Liệu Trực Quan</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight">
            Chọn công cụ bạn cần <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-sky-500">để bắt đầu ngay</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Mỗi tính năng được thiết kế chuyên biệt, giao diện trực quan, thao tác nhanh chóng và xử lý 100% tại máy của bạn — không tải tệp lên máy chủ, bảo mật tuyệt đối.
          </p>

          {/* Quick Demo Sample Option */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-slate-700">100% Cục bộ & Riêng tư</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-slate-700">Tốc độ tức thì</span>
            </div>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => {
                loadSampleDocument(20).then(() => onOpenTool('overview'));
              }}
              disabled={isLoading}
              className="text-brand-600 hover:text-brand-800 font-semibold underline underline-offset-2 flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Dùng tệp mẫu 20 trang để thử nghiệm</span>
            </button>
          </div>

        </div>
      </section>

      {/* Tools Directory Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-6">

        {/* Search & Categories Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: 'Tất cả công cụ' },
              { id: 'organize', label: 'Quản lý & Chia tách' },
              { id: 'convert', label: 'Chuyển đổi' },
              { id: 'edit-sign', label: 'Ký tên & Bản quyền' },
              { id: 'optimize', label: 'Tối ưu & Bảo mật' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm công cụ..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Tools Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onOpenTool(tool.id)}
              className="group p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-brand-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100/80 group-hover:bg-brand-50 flex items-center justify-center transition-colors">
                    {getToolIcon(tool.iconName)}
                  </div>
                  {tool.badge && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getBadgeStyle(tool.badge)}`}>
                      {tool.badge}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition-colors mb-1.5">
                  {tool.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {tool.shortDesc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600 group-hover:text-brand-600">
                <span>Vào công cụ</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12 border-t border-slate-200 text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Một sản phẩm phát triển bởi <strong className="font-bold text-brand-600">Đào Bá Anh Quân</strong></span>
        </div>
        <p className="font-semibold text-xs text-slate-700">DocFlow — Unified PDF, Document & Image Toolkit v3.6</p>
        <p className="text-[11px] text-slate-500">100% xử lý cục bộ trên trình duyệt • Không gửi tài liệu lên bất kỳ máy chủ nào</p>
      </footer>

    </div>
  );
};
