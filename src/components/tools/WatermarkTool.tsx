import React, { useState, useEffect, useRef } from 'react';
import { 
  Stamp, 
  Download, 
  Type, 
  Image as ImageIcon, 
  Grid, 
  AlignJustify, 
  Sparkles, 
  Upload, 
  X, 
  RotateCw, 
  Check, 
  SlidersHorizontal,
  Layers,
  FileCheck2,
  Lock,
  Eye
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  WatermarkOptions, 
  ToolType, 
  WatermarkType, 
  WatermarkLayoutMode, 
  WatermarkPosition,
  WatermarkFontFamily,
  WatermarkRenderStyle,
  WatermarkStampBorder,
  WatermarkPageScope
} from '../../types/document';
import { addWatermarkToPdf } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';
import { getOutputName } from '../../utils/formatters';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

interface PresetItem {
  id: string;
  name: string;
  badge: string;
  options: Partial<WatermarkOptions>;
}

const PRESET_WATERMARKS: PresetItem[] = [
  {
    id: 'top-secret',
    name: 'Tuyệt mật',
    badge: 'Đỏ • Khung kép',
    options: {
      type: 'stamp',
      mode: 'single',
      position: 'center',
      text: 'TUYỆT MẬT',
      fontSize: 48,
      color: '#dc2626',
      opacity: 0.35,
      rotation: -30,
      stampBorder: 'double',
      renderStyle: 'fill',
      fontFamily: 'sans-serif',
      isBold: true,
    },
  },
  {
    id: 'internal-only',
    name: 'Nội bộ',
    badge: 'Lam • Khung đơn',
    options: {
      type: 'stamp',
      mode: 'single',
      position: 'center',
      text: 'CHỈ LƯU HÀNH NỘI BỘ',
      fontSize: 38,
      color: '#2563eb',
      opacity: 0.3,
      rotation: -35,
      stampBorder: 'single',
      renderStyle: 'fill',
      fontFamily: 'sans-serif',
      isBold: true,
    },
  },
  {
    id: 'draft',
    name: 'Dự thảo',
    badge: 'Cam • Viền rỗng',
    options: {
      type: 'text',
      mode: 'single',
      position: 'center',
      text: 'DỰ THẢO - DRAFT',
      fontSize: 52,
      color: '#d97706',
      opacity: 0.28,
      rotation: -45,
      renderStyle: 'stroke',
      strokeWidth: 2,
      fontFamily: 'sans-serif',
      isBold: true,
    },
  },
  {
    id: 'approved',
    name: 'Đã phê duyệt',
    badge: 'Lục • Khung tròn',
    options: {
      type: 'stamp',
      mode: 'single',
      position: 'center',
      text: '✓ ĐÃ PHÊ DUYỆT',
      fontSize: 42,
      color: '#059669',
      opacity: 0.4,
      rotation: 0,
      stampBorder: 'single',
      renderStyle: 'fill',
      fontFamily: 'sans-serif',
      isBold: true,
    },
  },
  {
    id: 'matrix-leak',
    name: 'GIA SƯ ĐBAQ',
    badge: 'Lưới lặp toàn trang',
    options: {
      type: 'text',
      mode: 'tiled',
      tiledSpacing: 200,
      text: 'GIA SƯ ĐÀO BÁ ANH QUÂN',
      fontSize: 32,
      color: '#0d141e',
      opacity: 0.10,
      rotation: -30,
      renderStyle: 'fill',
      fontFamily: 'sans-serif',
      isBold: true,
    },
  },
  {
    id: 'copyright',
    name: 'Bản quyền',
    badge: 'Chéo giữa trang',
    options: {
      type: 'text',
      mode: 'single',
      position: 'center',
      text: 'ĐÀO BÁ ANH QUÂN',
      fontSize: 44,
      color: '#ef4444',
      opacity: 0.25,
      rotation: -45,
      renderStyle: 'fill',
      fontFamily: 'sans-serif',
      isBold: true,
    },
  },
];

const COLOR_PALETTE = [
  '#ef4444', // Red
  '#dc2626', // Deep Red
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#475569', // Slate
  '#0f172a', // Dark
];

export const WatermarkTool: React.FC = () => {
  const { document, activePageIndex, chainWorkflow, addToast, setWatermarkPreview } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [options, setOptions] = useState<WatermarkOptions>({
    type: 'text',
    mode: 'single',
    text: 'BẢN QUYỀN DOCFLOW',
    fontSize: 44,
    color: '#ef4444',
    opacity: 0.25,
    rotation: -45,
    position: 'center',
    fontFamily: 'sans-serif',
    isBold: true,
    isItalic: false,
    renderStyle: 'fill',
    strokeWidth: 2,
    stampBorder: 'single',
    tiledSpacing: 180,
    pageScope: 'all',
    customPageRange: '',
    applyToAll: true,
    targetPages: [activePageIndex],
  });

  const [activeTab, setActiveTab] = useState<'presets' | 'content' | 'appearance' | 'scope'>('presets');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync with live workspace preview
  useEffect(() => {
    setWatermarkPreview(options);
    return () => setWatermarkPreview(null);
  }, [options, setWatermarkPreview]);

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        Vui lòng nạp tài liệu PDF trước.
      </div>
    );
  }

  const handleApplyPreset = (preset: PresetItem) => {
    setOptions((prev) => ({
      ...prev,
      ...preset.options,
    }));
    addToast(`Đã áp dụng mẫu: ${preset.name}`, 'info');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Vui lòng chọn tệp hình ảnh (PNG, JPG, SVG)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOptions((prev) => ({
        ...prev,
        type: 'image',
        imageDataUrl: dataUrl,
        imageScale: prev.imageScale || 0.4,
      }));
      addToast('Đã tải lên logo dấu chìm thành công!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setOptions((prev) => ({
      ...prev,
      imageDataUrl: undefined,
      type: 'text',
    }));
  };

  const handleApply = async (chain = false) => {
    setIsProcessing(true);
    try {
      const watermarkedBytes = await addWatermarkToPdf(document.data, {
        ...options,
        applyToAll: options.pageScope === 'all',
      });
      const outName = getOutputName(document.name, 'watermarked');

      if (chain) {
        await chainWorkflow(watermarkedBytes, 'Chèn dấu chìm (Watermark)', outName, 'compress');
      } else {
        downloadFile(watermarkedBytes, outName);
        addToast(`Đã xuất PDF có dấu chìm: ${outName}`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi đóng dấu: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueWithTool = async (targetTool: ToolType) => {
    if (!document) return;
    setIsProcessing(true);
    try {
      const watermarkedBytes = await addWatermarkToPdf(document.data, {
        ...options,
        applyToAll: options.pageScope === 'all',
      });
      const outName = getOutputName(document.name, 'watermarked');
      await chainWorkflow(watermarkedBytes, 'Chèn dấu chìm (Watermark)', outName, targetTool);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getWatermarkBytesForShare = async (): Promise<Uint8Array | null> => {
    if (!document) return null;
    return await addWatermarkToPdf(document.data, {
      ...options,
      applyToAll: options.pageScope === 'all',
    });
  };

  return (
    <div className="p-4 space-y-4 text-slate-800">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
        <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shadow-xs">
          <Stamp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Đóng dấu chìm (Watermark)</h3>
          <p className="text-[11px] text-slate-600">Bảo mật văn bản với chữ, con dấu hoặc logo bản quyền</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'presets' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mẫu sẵn</span>
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'content' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Nội dung</span>
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'appearance' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Kiểu dáng</span>
        </button>
        <button
          onClick={() => setActiveTab('scope')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'scope' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Trang</span>
        </button>
      </div>

      {/* Tab 1: Presets */}
      {activeTab === 'presets' && (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">Mẫu đóng dấu chuyên nghiệp (1-Click):</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_WATERMARKS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-brand-500 bg-white hover:bg-brand-50/20 transition-all flex flex-col justify-between group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-brand-600">
                    {preset.name}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full border border-white shadow-2xs"
                    style={{ backgroundColor: preset.options.color || '#ef4444' }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 font-medium">{preset.badge}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Content (Text, Stamp, Image Logo) */}
      {activeTab === 'content' && (
        <div className="space-y-3.5">
          {/* Watermark Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Loại dấu chìm:</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setOptions({ ...options, type: 'text' })}
                className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  (options.type || 'text') === 'text' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Chữ</span>
              </button>
              <button
                onClick={() => setOptions({ ...options, type: 'stamp' })}
                className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  options.type === 'stamp' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>Con dấu</span>
              </button>
              <button
                onClick={() => setOptions({ ...options, type: 'image' })}
                className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  options.type === 'image' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Logo ảnh</span>
              </button>
            </div>
          </div>

          {/* Text / Stamp content */}
          {options.type !== 'image' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung văn bản:</label>
                <input
                  type="text"
                  value={options.text}
                  onChange={(e) => setOptions({ ...options, text: e.target.value })}
                  placeholder="Nhập nội dung dấu chìm..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              {/* Stamp Border Style */}
              {options.type === 'stamp' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kiểu khung con dấu:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'single', label: 'Khung đơn' },
                      { id: 'double', label: 'Khung kép' },
                      { id: 'dashed', label: 'Nét đứt' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setOptions({ ...options, stampBorder: b.id as WatermarkStampBorder })}
                        className={`py-1.5 px-2 text-[11px] rounded-lg font-semibold border transition-all ${
                          (options.stampBorder || 'single') === b.id
                            ? 'border-brand-500 bg-brand-50/30 text-brand-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Family & Style */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phông chữ:</label>
                  <select
                    value={options.fontFamily || 'sans-serif'}
                    onChange={(e) => setOptions({ ...options, fontFamily: e.target.value as WatermarkFontFamily })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                  >
                    <option value="sans-serif">Inter (Hiện đại)</option>
                    <option value="serif">Times (Cổ điển)</option>
                    <option value="monospace">Courier (Máy đánh chữ)</option>
                    <option value="Impact">Impact (Đậm nét)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kiểu nét chữ:</label>
                  <select
                    value={options.renderStyle || 'fill'}
                    onChange={(e) => setOptions({ ...options, renderStyle: e.target.value as WatermarkRenderStyle })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                  >
                    <option value="fill">Đặc (Solid fill)</option>
                    <option value="stroke">Viền rỗng (Hollow outline)</option>
                    <option value="both">Cả đặc & viền</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Image Logo upload */}
          {options.type === 'image' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleImageUpload}
                className="hidden"
              />

              {options.imageDataUrl ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={options.imageDataUrl}
                      alt="Watermark logo"
                      className="w-12 h-12 object-contain bg-white rounded-lg border border-slate-200 p-1"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Logo đã sẵn sàng</p>
                      <p className="text-[10px] text-slate-600">Được vẽ sắc nét chuẩn vector PNG</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Xóa logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-50/20 transition-all text-slate-600 hover:text-brand-600"
                >
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Tải lên Logo / Con dấu công ty</span>
                  <span className="text-[10px] text-slate-600">PNG trong suốt, JPG, WebP</span>
                </button>
              )}

              {options.imageDataUrl && (
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Tỉ lệ kích thước Logo:</span>
                    <span>{Math.round((options.imageScale || 0.4) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={options.imageScale || 0.4}
                    onChange={(e) => setOptions({ ...options, imageScale: parseFloat(e.target.value) })}
                    className="w-full accent-brand-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Appearance (Layout Mode, Position, Color, Opacity, Rotation) */}
      {activeTab === 'appearance' && (
        <div className="space-y-3.5">
          {/* Layout Mode: Single vs Tiled Matrix */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Bố cục hiển thị:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOptions({ ...options, mode: 'single' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  (options.mode || 'single') === 'single'
                    ? 'border-brand-500 bg-brand-50/30 text-brand-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <AlignJustify className="w-4 h-4" />
                <span>Đơn lẻ theo vị trí</span>
              </button>
              <button
                onClick={() => setOptions({ ...options, mode: 'tiled' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  options.mode === 'tiled'
                    ? 'border-brand-500 bg-brand-50/30 text-brand-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Ma trận lặp toàn trang</span>
              </button>
            </div>
          </div>

          {/* Single Position Selector */}
          {(options.mode || 'single') === 'single' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vị trí đặt dấu:</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'top-left', label: 'Trên trái' },
                  { id: 'top-center', label: 'Đầu trang' },
                  { id: 'top-right', label: 'Trên phải' },
                  { id: 'center', label: 'Chính giữa' },
                  { id: 'bottom-left', label: 'Dưới trái' },
                  { id: 'bottom-center', label: 'Cuối trang' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setOptions({ ...options, position: pos.id as WatermarkPosition })}
                    className={`py-1 px-1.5 text-[11px] rounded-lg font-medium border transition-all text-center ${
                      (options.position || 'center') === pos.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tiled Spacing */}
          {options.mode === 'tiled' && (
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Khoảng cách ma trận lặp:</span>
                <span>{options.tiledSpacing || 180}px</span>
              </div>
              <input
                type="range"
                min={120}
                max={300}
                step={20}
                value={options.tiledSpacing || 180}
                onChange={(e) => setOptions({ ...options, tiledSpacing: parseInt(e.target.value, 10) })}
                className="w-full accent-brand-600"
              />
            </div>
          )}

          {/* Color & Palette (Only for Text/Stamp) */}
          {options.type !== 'image' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Màu sắc:</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-600">{options.color}</span>
                  <input
                    type="color"
                    value={options.color}
                    onChange={(e) => setOptions({ ...options, color: e.target.value })}
                    className="w-6 h-6 rounded-md cursor-pointer border-0 p-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setOptions({ ...options, color: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                      options.color.toLowerCase() === c.toLowerCase() ? 'border-brand-600 scale-105' : 'border-white'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {options.color.toLowerCase() === c.toLowerCase() && (
                      <Check className="w-3 h-3 text-white drop-shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opacity */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Độ mờ (Opacity):</span>
              <span>{Math.round((options.opacity ?? 0.25) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.85}
              step={0.05}
              value={options.opacity ?? 0.25}
              onChange={(e) => setOptions({ ...options, opacity: parseFloat(e.target.value) })}
              className="w-full accent-brand-600"
            />
          </div>

          {/* Font size & Rotation */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cỡ chữ (pt):</label>
              <input
                type="number"
                min={14}
                max={90}
                value={options.fontSize || 44}
                onChange={(e) => setOptions({ ...options, fontSize: parseInt(e.target.value, 10) || 40 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Góc xoay (°):</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={-90}
                  max={90}
                  value={options.rotation ?? -45}
                  onChange={(e) => setOptions({ ...options, rotation: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={() => setOptions({ ...options, rotation: 0 })}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                  title="Ngang 0°"
                >
                  0°
                </button>
                <button
                  onClick={() => setOptions({ ...options, rotation: -45 })}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                  title="Chéo -45°"
                >
                  -45°
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Page Scope */}
      {activeTab === 'scope' && (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">Áp dụng lên các trang:</label>
          <div className="space-y-1.5">
            {[
              { id: 'all', label: 'Tất cả các trang', desc: `Toàn bộ ${document.pages.length} trang` },
              { id: 'first', label: 'Chỉ trang đầu tiên', desc: 'Trang bìa / Trang 1' },
              { id: 'odd', label: 'Các trang lẻ', desc: 'Trang 1, 3, 5, ...' },
              { id: 'even', label: 'Các trang chẵn', desc: 'Trang 2, 4, 6, ...' },
              { id: 'custom', label: 'Tùy chọn phạm vi', desc: 'Nhập dải trang mong muốn' },
            ].map((sc) => (
              <label
                key={sc.id}
                className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  (options.pageScope || 'all') === sc.id
                    ? 'border-brand-500 bg-brand-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="pageScope"
                  checked={(options.pageScope || 'all') === sc.id}
                  onChange={() => setOptions({ ...options, pageScope: sc.id as WatermarkPageScope })}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">{sc.label}</p>
                  <p className="text-[10px] text-slate-600">{sc.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {options.pageScope === 'custom' && (
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhập số trang (vd: 1, 3-5, 8):
              </label>
              <input
                type="text"
                value={options.customPageRange || ''}
                onChange={(e) => setOptions({ ...options, customPageRange: e.target.value })}
                placeholder="Ví dụ: 1, 3-5, 8"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleApply(false)}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isProcessing ? 'Đang đóng dấu...' : 'Đóng dấu & Tải xuống PDF'}</span>
          </button>

          <SharePdfButton
            getPdfBytes={getWatermarkBytesForShare}
            fileName={getOutputName(document.name, 'watermarked')}
          />
        </div>

        {/* Workflow Chaining Dropdown */}
        <ContinueWorkflowDropdown
          onSelectTool={handleContinueWithTool}
          currentTool="watermark"
          label="Tiếp tục làm việc với PDF này..."
        />
      </div>
    </div>
  );
};
