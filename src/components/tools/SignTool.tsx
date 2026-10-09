import React, { useRef, useState, useEffect } from 'react';
import { 
  FileSignature, 
  PenTool, 
  Type, 
  Upload, 
  Trash2, 
  Check, 
  Download, 
  Workflow,
  Calendar,
  User,
  Sparkles
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { SignatureItem, ToolType } from '../../types/document';
import { applySignatureToPdf } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';
import { getOutputName } from '../../utils/formatters';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

interface SignToolProps {
  onSetPendingSignature: (sig: SignatureItem | null) => void;
  pendingSignature: SignatureItem | null;
}

export const SignTool: React.FC<SignToolProps> = ({
  onSetPendingSignature,
  pendingSignature,
}) => {
  const {
    document,
    activePageIndex,
    setActivePageIndex,
    chainWorkflow,
    addToast,
  } = useWorkspace();

  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');

  // Drawing Pad state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState<string>('#000000');
  const [hasDrawn, setHasDrawn] = useState(false);

  // Type signature state
  const [typedText, setTypedText] = useState('Nguyen Van A');
  const [fontFamily, setFontFamily] = useState('cursive');

  // Signer metadata
  const [signerName, setSignerName] = useState('');
  const [includeDate, setIncludeDate] = useState(true);
  const [dateStr, setDateStr] = useState(new Date().toLocaleDateString('vi-VN'));

  const [isApplying, setIsApplying] = useState(false);

  // Init / clear draw canvas
  const clearDrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSetPendingSignature(null);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Save as pending signature
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL('image/png');
      updateSignatureItem(dataUrl, 'draw');
    }
  };

  // Type signature to canvas helper
  const renderTypedToDataUrl = (text: string, font: string): string => {
    const canvas = window.document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 36px ${font}`;
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 200, 75);
    return canvas.toDataURL('image/png');
  };

  const handleApplyTyped = () => {
    if (!typedText.trim()) return;
    const dataUrl = renderTypedToDataUrl(typedText.trim(), fontFamily);
    updateSignatureItem(dataUrl, 'type');
    addToast('Đã tạo chữ ký mẫu. Bạn có thể kéo vị trí chữ ký trên bản vẽ preview.', 'info');
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateSignatureItem(dataUrl, 'image');
      addToast('Đã tải ảnh chữ ký thành công', 'success');
    };
    reader.readAsDataURL(file);
  };

  const updateSignatureItem = (dataUrl: string, type: 'draw' | 'type' | 'image') => {
    const sig: SignatureItem = {
      id: `sig_${Date.now()}`,
      type,
      dataUrl,
      pageIndex: activePageIndex,
      x: 60, // Default bottom-right
      y: 75,
      width: 160,
      height: 70,
      signerName: signerName.trim() || undefined,
      dateStr: includeDate ? dateStr : undefined,
    };
    onSetPendingSignature(sig);
  };

  const handleApplySignatureToDocument = async (chainNext = false) => {
    if (!document || !pendingSignature) {
      addToast('Vui lòng tạo chữ ký trước khi áp dụng', 'warning');
      return;
    }

    setIsApplying(true);
    try {
      const signedBytes = await applySignatureToPdf(document.data, pendingSignature);
      const outName = getOutputName(document.name, 'signed');

      if (chainNext) {
        await chainWorkflow(signedBytes, 'Ký tên tài liệu', outName, 'compress');
      } else {
        downloadFile(signedBytes, outName);
        addToast(`Đã xuất tài liệu có chữ ký: ${outName}`, 'success');
      }

      onSetPendingSignature(null);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chèn chữ ký: ${err?.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleContinueWithTool = async (targetTool: ToolType) => {
    if (!document) return;
    setIsApplying(true);
    try {
      let bytesToChain = document.data;
      if (pendingSignature) {
        bytesToChain = await applySignatureToPdf(document.data, pendingSignature);
        onSetPendingSignature(null);
      }
      const outName = getOutputName(document.name, 'signed');
      await chainWorkflow(bytesToChain, 'Ký tên tài liệu', outName, targetTool);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp: ${err?.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const getSignBytesForShare = async (): Promise<Uint8Array | null> => {
    if (!document) return null;
    if (pendingSignature) {
      return await applySignatureToPdf(document.data, pendingSignature);
    }
    return document.data;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <FileSignature className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Ký tên PDF (Sign)</h3>
          <p className="text-[11px] text-slate-600">Thêm chữ ký hiển thị và ngày ký vào tài liệu</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setTab('draw')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
            tab === 'draw' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Vẽ</span>
        </button>
        <button
          onClick={() => setTab('type')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
            tab === 'type' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Gõ tên</span>
        </button>
        <button
          onClick={() => setTab('upload')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
            tab === 'upload' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Tải ảnh</span>
        </button>
      </div>

      {/* Pen Color picker */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">Màu mực:</span>
        <div className="flex items-center gap-2">
          {[
            { color: '#000000', label: 'Đen' },
            { color: '#1d4ed8', label: 'Xanh' },
            { color: '#b91c1c', label: 'Đỏ' },
          ].map((c) => (
            <button
              key={c.color}
              onClick={() => setPenColor(c.color)}
              style={{ backgroundColor: c.color }}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                penColor === c.color ? 'border-brand-500 scale-110' : 'border-white'
              }`}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Tab 1: Draw Canvas */}
      {tab === 'draw' && (
        <div className="space-y-2">
          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner">
            <canvas
              ref={canvasRef}
              width={280}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-32 block cursor-crosshair touch-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={clearDrawCanvas}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa và vẽ lại</span>
            </button>
            <span className="text-[10px] text-slate-600">Vẽ chữ ký bằng chuột hoặc cảm ứng</span>
          </div>
        </div>
      )}

      {/* Tab 2: Type Signature */}
      {tab === 'type' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên của bạn:</label>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kiểu chữ viết tay:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Cursive', font: 'cursive' },
                { name: 'Brush Script', font: 'Brush Script MT, cursive' },
                { name: 'Great Vibes', font: 'serif' },
                { name: 'Sign Handwriting', font: 'sans-serif' },
              ].map((f) => (
                <button
                  key={f.font}
                  onClick={() => setFontFamily(f.font)}
                  className={`p-2 rounded-lg border text-xs text-center italic transition-colors ${
                    fontFamily === f.font ? 'border-brand-500 bg-brand-50 font-bold' : 'border-slate-200 bg-white'
                  }`}
                  style={{ fontFamily: f.font }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleApplyTyped}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
          >
            Tạo mẫu chữ ký
          </button>
        </div>
      )}

      {/* Tab 3: Upload Image */}
      {tab === 'upload' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Tải tệp ảnh chữ ký (PNG/JPG):</label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleUploadImage}
            className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>
      )}

      {/* Signer metadata fields */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Tên người ký (tùy chọn):</span>
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="VD: Nguyễn Văn A"
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-1.5 text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={includeDate}
              onChange={(e) => setIncludeDate(e.target.checked)}
              className="rounded text-brand-600"
            />
            <span>Đính kèm ngày ký ({dateStr})</span>
          </label>
        </div>
      </div>

      {/* Target page selector */}
      <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <span className="text-slate-700 font-medium">Ký vào trang:</span>
        <span className="font-bold text-brand-700">Trang {activePageIndex + 1}</span>
      </div>

      {/* Action CTA buttons */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleApplySignatureToDocument(false)}
            disabled={isApplying || !pendingSignature}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Áp dụng chữ ký & Tải xuống PDF</span>
          </button>

          <SharePdfButton
            getPdfBytes={getSignBytesForShare}
            fileName={getOutputName(document?.name || 'document', 'signed')}
          />
        </div>

        {/* Workflow Chaining Dropdown */}
        <ContinueWorkflowDropdown
          onSelectTool={handleContinueWithTool}
          currentTool="sign"
          label="Tiếp tục làm việc với PDF này..."
        />
      </div>
    </div>
  );
};
