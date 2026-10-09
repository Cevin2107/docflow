import React, { useState } from 'react';
import { 
  PenLine, 
  Square, 
  Type, 
  Highlighter, 
  EyeOff, 
  Download, 
  Workflow, 
  Plus, 
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { EditAnnotation, ToolType } from '../../types/document';
import { downloadFile } from '../../services/zipService';
import { getOutputName, removeDiacritics } from '../../utils/formatters';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

export const EditTool: React.FC = () => {
  const { document, activePageIndex, chainWorkflow, addToast } = useWorkspace();

  const [annotations, setAnnotations] = useState<EditAnnotation[]>([]);
  const [annotationType, setAnnotationType] = useState<'text' | 'rect' | 'highlight' | 'redact'>('text');
  const [inputText, setInputText] = useState('Ghi chú quan trọng');
  const [color, setColor] = useState('#ef4444');
  const [isApplying, setIsApplying] = useState(false);

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        Vui lòng nạp tài liệu PDF trước.
      </div>
    );
  }

  const handleAddAnnotation = () => {
    const newAnn: EditAnnotation = {
      id: `ann_${Date.now()}`,
      type: annotationType,
      pageIndex: activePageIndex,
      x: 20,
      y: 30 + annotations.length * 8,
      width: annotationType === 'text' ? 180 : 150,
      height: annotationType === 'text' ? 24 : 35,
      color: annotationType === 'redact' ? '#000000' : color,
      text: annotationType === 'text' ? inputText : undefined,
      fontSize: 12,
    };
    setAnnotations([...annotations, newAnn]);
    addToast(`Đã thêm ${annotationType.toUpperCase()} vào Trang ${activePageIndex + 1}`, 'info');
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  const buildEditedBytes = async (): Promise<Uint8Array> => {
    if (!document) throw new Error('Chưa nạp tài liệu');
    const pdfDoc = await PDFDocument.load(document.data);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const ann of annotations) {
      if (ann.pageIndex < 0 || ann.pageIndex >= pages.length) continue;
      const page = pages[ann.pageIndex];
      const { width: pWidth, height: pHeight } = page.getSize();

      const x = (ann.x / 100) * pWidth;
      const y = pHeight - ((ann.y / 100) * pHeight) - ann.height;

      const hex = ann.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
      const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
      const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

      if (ann.type === 'redact') {
        page.drawRectangle({
          x,
          y,
          width: ann.width,
          height: ann.height,
          color: rgb(0, 0, 0),
        });
      } else if (ann.type === 'highlight') {
        page.drawRectangle({
          x,
          y,
          width: ann.width,
          height: ann.height,
          color: rgb(1, 0.95, 0.2),
          opacity: 0.45,
        });
      } else if (ann.type === 'rect') {
        page.drawRectangle({
          x,
          y,
          width: ann.width,
          height: ann.height,
          borderColor: rgb(r, g, b),
          borderWidth: 2,
          color: rgb(r, g, b),
          opacity: 0.15,
        });
      } else if (ann.type === 'text' && ann.text) {
        const safeText = removeDiacritics(ann.text);
        page.drawText(safeText, {
          x,
          y,
          size: ann.fontSize || 12,
          font,
          color: rgb(r, g, b),
        });
      }
    }

    return await pdfDoc.save();
  };

  const handleApplyToPdf = async () => {
    if (annotations.length === 0) {
      addToast('Vui lòng thêm ít nhất một ghi chú hoặc vùng che dữ liệu', 'warning');
      return;
    }

    setIsApplying(true);
    try {
      const editedBytes = await buildEditedBytes();
      const outName = getOutputName(document.name, 'extracted', 'edited');
      downloadFile(editedBytes, outName);
      addToast(`Đã xuất tệp thành công: ${outName}`, 'success');
      setAnnotations([]);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi áp dụng chỉnh sửa: ${err?.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleContinueWithTool = async (targetTool: ToolType) => {
    if (!document) return;
    setIsApplying(true);
    try {
      const editedBytes = annotations.length > 0 ? await buildEditedBytes() : document.data;
      const outName = getOutputName(document.name, 'extracted', 'edited');
      await chainWorkflow(editedBytes, 'Chỉnh sửa & Che dữ liệu', outName, targetTool);
      setAnnotations([]);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp: ${err?.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const getEditBytesForShare = async (): Promise<Uint8Array | null> => {
    if (!document) return null;
    if (annotations.length > 0) {
      return await buildEditedBytes();
    }
    return document.data;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <PenLine className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Chỉnh sửa & Che dữ liệu (Edit & Redact)</h3>
          <p className="text-[11px] text-slate-600">Thêm text, khung hình và loại bỏ thông tin nhạy cảm</p>
        </div>
      </div>

      {/* Type Chooser */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setAnnotationType('text')}
          className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${
            annotationType === 'text' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span className="text-[10px]">Chữ</span>
        </button>
        <button
          onClick={() => setAnnotationType('rect')}
          className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${
            annotationType === 'rect' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          <span className="text-[10px]">Khung</span>
        </button>
        <button
          onClick={() => setAnnotationType('highlight')}
          className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${
            annotationType === 'highlight' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span className="text-[10px]">Highlight</span>
        </button>
        <button
          onClick={() => setAnnotationType('redact')}
          className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${
            annotationType === 'redact' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span className="text-[10px]">Redact</span>
        </button>
      </div>

      {/* Field controls */}
      <div className="space-y-3">
        {annotationType === 'text' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung chữ:</label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        )}

        {annotationType !== 'redact' && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Màu sắc:</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-7 rounded border border-slate-300 cursor-pointer"
            />
          </div>
        )}

        <button
          onClick={handleAddAnnotation}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm vào Trang {activePageIndex + 1}</span>
        </button>
      </div>

      {/* Annotations List */}
      {annotations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <span className="text-xs font-bold text-slate-800 block">Danh sách thao tác ({annotations.length}):</span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="p-2 border border-slate-200 rounded-lg bg-white flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                    {ann.type}
                  </span>
                  <span className="text-slate-600 truncate max-w-[140px]">
                    {ann.text || `Trang ${ann.pageIndex + 1}`}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveAnnotation(ann.id)}
                  className="text-slate-400 hover:text-rose-600 p-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyToPdf}
            disabled={isApplying || annotations.length === 0}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Áp dụng & Tải xuống PDF</span>
          </button>

          <SharePdfButton
            getPdfBytes={getEditBytesForShare}
            fileName={getOutputName(document.name, 'extracted', 'edited')}
          />
        </div>

        {/* Workflow Chaining Dropdown */}
        <ContinueWorkflowDropdown
          onSelectTool={handleContinueWithTool}
          currentTool="edit"
          disabled={isApplying}
          label="Tiếp tục làm việc với PDF này..."
        />
      </div>
    </div>
  );
};
