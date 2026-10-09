import React, { useState, useEffect } from 'react';
import { Stamp, Download, Workflow } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WatermarkOptions, ToolType } from '../../types/document';
import { addWatermarkToPdf } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';
import { getOutputName } from '../../utils/formatters';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

export const WatermarkTool: React.FC = () => {
  const { document, activePageIndex, chainWorkflow, addToast, setWatermarkPreview } = useWorkspace();

  const [options, setOptions] = useState<WatermarkOptions>({
    text: 'BẢN QUYỀN DOCFLOW',
    fontSize: 42,
    color: '#ef4444',
    opacity: 0.25,
    rotation: -45,
    applyToAll: true,
    targetPages: [activePageIndex],
  });

  // Sync to live preview on document canvas
  useEffect(() => {
    setWatermarkPreview(options);
    return () => setWatermarkPreview(null);
  }, [options, setWatermarkPreview]);

  const [isProcessing, setIsProcessing] = useState(false);

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        Vui lòng nạp tài liệu PDF trước.
      </div>
    );
  }

  const handleApply = async (chain = false) => {
    setIsProcessing(true);
    try {
      const watermarkedBytes = await addWatermarkToPdf(document.data, {
        ...options,
        targetPages: [activePageIndex],
      });
      const outName = getOutputName(document.name, 'watermarked');

      if (chain) {
        await chainWorkflow(watermarkedBytes, 'Chèn dấu chìm (Watermark)', outName, 'compress');
      } else {
        downloadFile(watermarkedBytes, outName);
        addToast(`Đã đóng dấu bản quyền: ${outName}`, 'success');
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
        targetPages: [activePageIndex],
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
      targetPages: [activePageIndex],
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <Stamp className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Đóng dấu chìm (Watermark)</h3>
          <p className="text-[11px] text-slate-600">Bảo mật tài liệu với chữ mờ bản quyền</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Preset quick buttons */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mẫu chữ nhanh:</label>
          <div className="flex flex-wrap gap-1.5">
            {['BẢN NHÁP', 'TUYỆT MẬT', 'CONFIDENTIAL', 'DOCFLOW'].map((txt) => (
              <button
                key={txt}
                onClick={() => setOptions({ ...options, text: txt })}
                className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
              >
                {txt}
              </button>
            ))}
          </div>
        </div>

        {/* Text input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung dấu chìm:</label>
          <input
            type="text"
            value={options.text}
            onChange={(e) => setOptions({ ...options, text: e.target.value })}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-semibold"
          />
        </div>

        {/* Opacity slider */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
            <span>Độ mờ (Opacity):</span>
            <span>{Math.round(options.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.8}
            step={0.05}
            value={options.opacity}
            onChange={(e) => setOptions({ ...options, opacity: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Font size & Color */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cỡ chữ (pt):</label>
            <input
              type="number"
              min={18}
              max={80}
              value={options.fontSize}
              onChange={(e) => setOptions({ ...options, fontSize: parseInt(e.target.value, 10) || 40 })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Màu sắc:</label>
            <input
              type="color"
              value={options.color}
              onChange={(e) => setOptions({ ...options, color: e.target.value })}
              className="w-full h-8 px-1 py-0.5 border border-slate-300 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Scope */}
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-slate-700">
            <input
              type="checkbox"
              checked={options.applyToAll}
              onChange={(e) => setOptions({ ...options, applyToAll: e.target.checked })}
              className="rounded text-brand-600"
            />
            <span>Áp dụng lên tất cả các trang</span>
          </label>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleApply(false)}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Đóng dấu & Tải xuống PDF</span>
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
