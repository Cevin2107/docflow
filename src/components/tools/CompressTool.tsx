import React, { useState } from 'react';
import { 
  FileArchive, 
  Sparkles, 
  ArrowDown, 
  Download, 
  Workflow, 
  Check, 
  FileCheck,
  Percent
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatBytes, getOutputName } from '../../utils/formatters';
import { compressPdf } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';
import { CompressionLevel, ToolType } from '../../types/document';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

export const CompressTool: React.FC = () => {
  const {
    document,
    chainWorkflow,
    addToast,
    setActiveTool,
  } = useWorkspace();

  const [level, setLevel] = useState<CompressionLevel>('balanced');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedResult, setCompressedResult] = useState<{
    bytes: Uint8Array;
    originalSize: number;
    compressedSize: number;
    reductionPct: number;
  } | null>(null);

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-600">
        Vui lòng mở một tài liệu PDF để nén.
      </div>
    );
  }

  const handleStartCompress = async () => {
    setIsCompressing(true);
    try {
      const compressedBytes = await compressPdf(document.data, level);
      const originalSize = document.fileSize;
      const compressedSize = compressedBytes.length;
      const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      setCompressedResult({
        bytes: compressedBytes,
        originalSize,
        compressedSize,
        reductionPct: Math.max(0, reduction),
      });

      addToast(`Đã tối ưu và nén tệp (${Math.max(0, reduction)}% giảm)`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi nén PDF: ${err?.message}`, 'error');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedResult) return;
    const name = getOutputName(document.name, 'compressed');
    downloadFile(compressedResult.bytes, name);
    addToast(`Đã tải xuống: ${name}`, 'success');
  };

  const handleContinueWithTool = async (targetTool: ToolType) => {
    if (!document) return;
    try {
      const bytes = compressedResult ? compressedResult.bytes : await compressPdf(document.data, level);
      const name = getOutputName(document.name, 'compressed');
      await chainWorkflow(bytes, 'Nén tài liệu PDF', name, targetTool);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp: ${err?.message}`, 'error');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <FileArchive className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Nén PDF (Compress)</h3>
          <p className="text-[11px] text-slate-600">Tối ưu dung lượng giữ nguyên độ sắc nét</p>
        </div>
      </div>

      {/* Preset Cards */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800 block">
          Chọn mức độ nén:
        </label>

        <div className="grid grid-cols-1 gap-2">
          {/* Low */}
          <div
            onClick={() => setLevel('low')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              level === 'low'
                ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-slate-900">Nén Nhẹ (Low)</span>
              {level === 'low' && <Check className="w-4 h-4 text-brand-600" />}
            </div>
            <p className="text-[11px] text-slate-600">Ưu tiên chất lượng hình ảnh cao nhất, tối ưu stream PDF.</p>
          </div>

          {/* Balanced */}
          <div
            onClick={() => setLevel('balanced')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              level === 'balanced'
                ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-slate-900">Cân Bằng (Balanced - Khuyên dùng)</span>
              {level === 'balanced' && <Check className="w-4 h-4 text-brand-600" />}
            </div>
            <p className="text-[11px] text-slate-600">Cân bằng tối ưu giữa độ nét và kích thước tệp phù hợp gửi email.</p>
          </div>

          {/* High */}
          <div
            onClick={() => setLevel('high')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              level === 'high'
                ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-slate-900">Nén Mạnh (High)</span>
              {level === 'high' && <Check className="w-4 h-4 text-brand-600" />}
            </div>
            <p className="text-[11px] text-slate-600">Ưu tiên dung lượng nhỏ nhất, loại bỏ metadata dư thừa.</p>
          </div>
        </div>
      </div>

      {/* Start Compress button & Share */}
      {!compressedResult && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartCompress}
            disabled={isCompressing}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCompressing ? 'Đang nén tài liệu...' : 'Bắt đầu nén PDF'}</span>
          </button>

          <SharePdfButton
            getPdfBytes={() => document.data}
            fileName={document.name}
          />
        </div>
      )}

      {/* Result Metrics Card (PRD Section 6.2) */}
      {compressedResult && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Kết quả nén thành công</span>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              -{compressedResult.reductionPct}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-slate-500 block">Dung lượng gốc:</span>
              <span className="font-semibold text-slate-700">{formatBytes(compressedResult.originalSize)}</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-medium block">Sau khi nén:</span>
              <span className="font-bold text-emerald-800">{formatBytes(compressedResult.compressedSize)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải xuống tệp đã nén</span>
              </button>

              <SharePdfButton
                getPdfBytes={() => compressedResult.bytes}
                fileName={getOutputName(document.name, 'compressed')}
              />
            </div>

            {/* Workflow Chaining Dropdown */}
            <ContinueWorkflowDropdown
              onSelectTool={handleContinueWithTool}
              currentTool="compress"
              label="Tiếp tục làm việc với PDF này..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
