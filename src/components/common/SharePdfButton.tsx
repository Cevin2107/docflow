import React, { useState } from 'react';
import { 
  Share2, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Link as LinkIcon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { sharePdfViaPone } from '../../services/shareService';
import { useWorkspace } from '../../context/WorkspaceContext';

interface SharePdfButtonProps {
  getPdfBytes: () => Promise<Uint8Array | null> | Uint8Array | null;
  fileName?: string;
  className?: string;
  variant?: 'outline' | 'secondary' | 'full';
}

export const SharePdfButton: React.FC<SharePdfButtonProps> = ({
  getPdfBytes,
  fileName = 'document.pdf',
  className = '',
  variant = 'outline',
}) => {
  const { addToast } = useWorkspace();
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleStartShare = async () => {
    setIsSharing(true);
    try {
      const bytes = await getPdfBytes();
      if (!bytes || bytes.length === 0) {
        addToast('Không có dữ liệu PDF để chia sẻ', 'warning');
        return;
      }

      addToast('Đang nén và tạo liên kết chia sẻ...', 'info');
      const url = await sharePdfViaPone(bytes, fileName);
      setShareUrl(url);
      setModalOpen(true);

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        addToast('Đã tạo liên kết pone.rs và sao chép vào bộ nhớ tạm!', 'success');
        setTimeout(() => setCopied(false), 3000);
      } catch {
        addToast('Đã tạo liên kết chia sẻ pone.rs!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi tạo link chia sẻ: ${err?.message || 'Không thể kết nối tới máy chủ'}`, 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      addToast('Đã sao chép liên kết vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      addToast('Không thể sao chép liên kết', 'error');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleStartShare}
        disabled={isSharing}
        title="Nén và tạo liên kết chia sẻ công khai qua pone.rs"
        className={
          className ||
          (variant === 'full'
            ? 'w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-brand-600 rounded-xl border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50'
            : 'py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-brand-600 rounded-xl border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50')
        }
      >
        {isSharing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
            <span>Đang tạo link...</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5 text-brand-600" />
            <span>Chia sẻ</span>
          </>
        )}
      </button>

      {/* Share Link Modal */}
      {modalOpen && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Liên kết chia sẻ đã sẵn sàng</h3>
                  <p className="text-[11px] text-slate-600">Lưu trữ bảo mật & tải nhanh qua pone.rs</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL Input Box with Copy Button */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Đường dẫn tệp PDF:</span>
                <span className="text-[10px] text-emerald-600 font-medium">Đã tối ưu nén</span>
              </label>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                <LinkIcon className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-xs text-slate-800 font-mono w-full px-1 focus:outline-hidden selection:bg-brand-100"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors ${
                    copied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Meta notice */}
            <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Bất kỳ ai có liên kết này đều có thể xem hoặc tải tệp trực tiếp. Tệp được lưu trữ trên hạ tầng phân phối nhanh pone.rs.</span>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Mở trong tab mới</span>
              </a>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
