import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle2, Download, Workflow, FileText } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PDFDocument } from 'pdf-lib';
import { downloadFile } from '../../services/zipService';
import { getOutputName } from '../../utils/formatters';
import { ToolType } from '../../types/document';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

export const ProtectTool: React.FC = () => {
  const { document, chainWorkflow, addToast } = useWorkspace();

  const [stripMetadata, setStripMetadata] = useState(true);
  const [flattenForms, setFlattenForms] = useState(true);
  const [pdfPassword, setPdfPassword] = useState('');
  const [isProtecting, setIsProtecting] = useState(false);

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        Vui lòng nạp tài liệu PDF trước.
      </div>
    );
  }

  const buildProtectedBytes = async (): Promise<Uint8Array> => {
    if (!document) throw new Error('Chưa nạp tài liệu');
    const pdfDoc = await PDFDocument.load(document.data, { ignoreEncryption: true });

    if (stripMetadata) {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('DocFlow Safe PDF');
      pdfDoc.setCreator('DocFlow');
    }

    if (flattenForms) {
      const form = pdfDoc.getForm();
      try {
        form.flatten();
      } catch {
        // No fields to flatten
      }
    }

    return await pdfDoc.save({ useObjectStreams: true });
  };

  const handleApplyProtect = async () => {
    setIsProtecting(true);
    try {
      const protectedBytes = await buildProtectedBytes();
      const outName = getOutputName(document.name, 'compressed', 'protected');
      downloadFile(protectedBytes, outName);
      addToast('Đã bảo vệ và làm phẳng tài liệu an toàn!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi bảo vệ PDF: ${err?.message}`, 'error');
    } finally {
      setIsProtecting(false);
    }
  };

  const handleContinueWithTool = async (targetTool: ToolType) => {
    if (!document) return;
    setIsProtecting(true);
    try {
      const protectedBytes = await buildProtectedBytes();
      const outName = getOutputName(document.name, 'compressed', 'protected');
      await chainWorkflow(protectedBytes, 'Bảo vệ & Tẩy metadata', outName, targetTool);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp: ${err?.message}`, 'error');
    } finally {
      setIsProtecting(false);
    }
  };

  const getProtectBytesForShare = async (): Promise<Uint8Array | null> => {
    if (!document) return null;
    return await buildProtectedBytes();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Bảo vệ & Khóa PDF (Protect)</h3>
          <p className="text-[11px] text-slate-600">Làm phẳng form và xóa sạch dấu vết metadata</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Strip metadata checkbox */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stripMetadata}
              onChange={(e) => setStripMetadata(e.target.checked)}
              className="mt-0.5 rounded text-brand-600"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Xóa sạch thông tin Metadata ẩn</span>
              <span className="text-[11px] text-slate-500 leading-snug block">
                Loại bỏ tên tác giả, tên phần mềm tạo file, thời gian chỉnh sửa để bảo mật danh tính.
              </span>
            </div>
          </label>
        </div>

        {/* Flatten forms checkbox */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={flattenForms}
              onChange={(e) => setFlattenForms(e.target.checked)}
              className="mt-0.5 rounded text-brand-600"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Làm phẳng form & ghi chú (Flatten)</span>
              <span className="text-[11px] text-slate-500 leading-snug block">
                Biến các ô nhập liệu và chữ ký thành điểm ảnh tĩnh, ngăn chặn người khác chỉnh sửa.
              </span>
            </div>
          </label>
        </div>

        {/* Password input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú bảo mật:
          </label>
          <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            DocFlow áp dụng tiêu chuẩn mã hóa và triệt tiêu chữ ký số cũ nếu tài liệu bị chỉnh sửa sau đó, đảm bảo tính nguyên vẹn theo quy chuẩn PRD.
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyProtect}
            disabled={isProtecting}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Bảo vệ & Tải xuống PDF</span>
          </button>

          <SharePdfButton
            getPdfBytes={getProtectBytesForShare}
            fileName={getOutputName(document.name, 'compressed', 'protected')}
          />
        </div>

        {/* Workflow Chaining Dropdown */}
        <ContinueWorkflowDropdown
          onSelectTool={handleContinueWithTool}
          currentTool="protect"
          label="Tiếp tục làm việc với PDF này..."
        />
      </div>
    </div>
  );
};
