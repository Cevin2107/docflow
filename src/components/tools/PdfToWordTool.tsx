import React, { useState } from 'react';
import { FileType2, Download, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { loadPdfDocument } from '../../services/pdfWorker';
import { convertPdfToDocx, PdfToWordResult } from '../../services/pdfToWordEngine';
import { downloadFile } from '../../services/zipService';
import { ToolType } from '../../types/document';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

export const PdfToWordTool: React.FC = () => {
  const { document, addToast, chainWorkflow } = useWorkspace();
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<PdfToWordResult | null>(null);

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        Vui lòng nạp tài liệu PDF trước.
      </div>
    );
  }

  const handleStartConversion = async () => {
    setIsConverting(true);
    try {
      const pdfProxy = await loadPdfDocument(document.id, document.data);
      const res = await convertPdfToDocx(pdfProxy, document.name);
      setConversionResult(res);
      addToast('Chuyển đổi PDF sang Word DOCX hoàn tất!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển đổi: ${err?.message}`, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadDocx = () => {
    if (!conversionResult) return;
    const docxName = document.name.replace(/\.[^/.]+$/, '') + '.docx';
    downloadFile(
      conversionResult.docxBlob,
      docxName,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    addToast(`Đã tải xuống: ${docxName}`, 'success');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
          <FileType2 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">PDF sang Word (DOCX)</h3>
          <p className="text-[11px] text-slate-600">Trích xuất văn bản và cấu trúc sang tài liệu Word</p>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
        <div className="flex justify-between text-slate-700">
          <span>Tài liệu:</span>
          <b className="truncate max-w-[180px]">{document.name}</b>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>Tổng số trang:</span>
          <b>{document.pages.length} trang</b>
        </div>
      </div>

      {/* Conversion Options */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800 block">Tùy chọn chuyển đổi:</label>
        <div className="space-y-1.5 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded text-brand-600" />
            <span>Bảo toàn tiếng Việt có dấu (Unicode)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded text-brand-600" />
            <span>Tự động nhận diện tiêu đề và ngắt đoạn</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded text-brand-600" />
            <span>Giữ cấu trúc dòng và bảng biểu cơ bản</span>
          </label>
        </div>
      </div>

      {!conversionResult ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartConversion}
            disabled={isConverting}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isConverting ? 'Đang trích xuất & chuyển đổi...' : 'Chuyển sang Word (.docx)'}</span>
          </button>

          <SharePdfButton
            getPdfBytes={() => document.data}
            fileName={document.name}
          />
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Chuyển đổi thành công!</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-slate-500 block">Số từ trích xuất:</span>
              <span className="font-bold text-slate-800">{conversionResult.wordCount} từ</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-slate-500 block">Số đoạn văn:</span>
              <span className="font-bold text-slate-800">{conversionResult.paragraphCount} đoạn</span>
            </div>
          </div>

          {conversionResult.warnings && conversionResult.warnings.length > 0 && (
            <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              {conversionResult.warnings.map((w, idx) => (
                <div key={idx}>⚠ {w}</div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDocx}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Tải xuống tệp Word (.docx)</span>
              </button>

              <SharePdfButton
                getPdfBytes={() => document.data}
                fileName={document.name}
              />
            </div>

            <ContinueWorkflowDropdown
              onSelectTool={(tool) => chainWorkflow(document.data, 'Chuyển sang Word', document.name, tool)}
              currentTool="pdf-to-word"
              label="Tiếp tục làm việc với PDF này..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
