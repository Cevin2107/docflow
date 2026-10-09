import React, { useState, useEffect } from 'react';
import { Hash, Download, Workflow } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PageNumberOptions, ToolType } from '../../types/document';
import { addPageNumbersToPdf } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';
import { getOutputName } from '../../utils/formatters';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

export const PageNumberTool: React.FC = () => {
  const { document, chainWorkflow, addToast, setPageNumberPreview } = useWorkspace();

  const [options, setOptions] = useState<PageNumberOptions>({
    position: 'bottom-center',
    format: 'page-of-total',
    prefix: 'Trang',
    fontSize: 10,
    color: '#334155',
    startNumber: 1,
    margin: 30,
  });

  // Sync to live preview on document canvas
  useEffect(() => {
    setPageNumberPreview(options);
    return () => setPageNumberPreview(null);
  }, [options, setPageNumberPreview]);

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
      const numberedBytes = await addPageNumbersToPdf(document.data, options);
      const outName = getOutputName(document.name, 'numbered');

      if (chain) {
        await chainWorkflow(numberedBytes, 'Đánh số trang', outName, 'compress');
      } else {
        downloadFile(numberedBytes, outName);
        addToast(`Đã xuất thành công: ${outName}`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi đánh số trang: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueWithTool = async (targetTool: ToolType) => {
    if (!document) return;
    setIsProcessing(true);
    try {
      const numberedBytes = await addPageNumbersToPdf(document.data, options);
      const outName = getOutputName(document.name, 'numbered');
      await chainWorkflow(numberedBytes, 'Đánh số trang', outName, targetTool);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPageNumberBytesForShare = async (): Promise<Uint8Array | null> => {
    if (!document) return null;
    return await addPageNumbersToPdf(document.data, options);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <Hash className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Đánh số trang (Page Numbers)</h3>
          <p className="text-[11px] text-slate-600">Thêm số trang tự động vào chân hoặc đầu trang</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Position */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Vị trí đặt số trang:</label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {[
              { id: 'top-left', label: 'Trên - Trái' },
              { id: 'top-center', label: 'Trên - Giữa' },
              { id: 'top-right', label: 'Trên - Phải' },
              { id: 'bottom-left', label: 'Dưới - Trái' },
              { id: 'bottom-center', label: 'Dưới - Giữa' },
              { id: 'bottom-right', label: 'Dưới - Phải' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setOptions({ ...options, position: p.id as any })}
                className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-medium transition-colors ${
                  options.position === p.id ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Định dạng hiển thị:</label>
          <select
            value={options.format}
            onChange={(e) => setOptions({ ...options, format: e.target.value as any })}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          >
            <option value="page-of-total">Trang 1 / {document.pages.length}</option>
            <option value="number-only">Chỉ số: 1</option>
            <option value="custom">Tùy biến: {options.prefix} 1</option>
          </select>
        </div>

        {/* Font size & Color */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cỡ chữ (pt):</label>
            <input
              type="number"
              min={6}
              max={24}
              value={options.fontSize}
              onChange={(e) => setOptions({ ...options, fontSize: parseInt(e.target.value, 10) || 10 })}
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
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleApply(false)}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Áp dụng & Tải xuống PDF</span>
          </button>

          <SharePdfButton
            getPdfBytes={getPageNumberBytesForShare}
            fileName={getOutputName(document.name, 'numbered')}
          />
        </div>

        {/* Workflow Chaining Dropdown */}
        <ContinueWorkflowDropdown
          onSelectTool={handleContinueWithTool}
          currentTool="page-numbers"
          label="Tiếp tục làm việc với PDF này..."
        />
      </div>
    </div>
  );
};
