import React, { useState, useRef } from 'react';
import { 
  Image, 
  FileImage, 
  Archive, 
  Download, 
  Upload, 
  Check, 
  FileText,
  FileCode,
  Sparkles
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { loadPdfDocument } from '../../services/pdfWorker';
import { convertPdfToImages, convertImagesToPdf, convertTextToPdf, ConvertedImageResult } from '../../services/converterEngine';
import { createZipArchive, downloadFile } from '../../services/zipService';
import { getOutputName } from '../../utils/formatters';
import { SharePdfButton } from '../common/SharePdfButton';

export const ConvertTool: React.FC = () => {
  const {
    document,
    sourceDocs,
    addSourcePdf,
    addToast,
    loadDocumentFromFile,
  } = useWorkspace();

  const [activeSubTab, setActiveSubTab] = useState<'pdf-to-img' | 'img-to-pdf' | 'text-to-pdf'>('pdf-to-img');

  // PDF to Image state
  const [imgFormat, setImgFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [imgDpi, setImgDpi] = useState<number>(2.0); // 2x high res
  const [extractedImages, setExtractedImages] = useState<ConvertedImageResult[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // Image to PDF state
  const [uploadedImages, setUploadedImages] = useState<{ name: string; file: File; previewUrl: string }[]>([]);
  const [isConvertingImg, setIsConvertingImg] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Text to PDF state
  const [textContent, setTextContent] = useState('# Tài liệu DocFlow\n\nĐây là nội dung văn bản được chuyển đổi tự động sang tệp PDF định dạng chuẩn.');

  // Handle PDF to Images extraction
  const handleExtractImages = async () => {
    if (!document) return;
    setIsExtracting(true);
    try {
      const pdfProxy = await loadPdfDocument(document.id, document.data);
      const pageIndices = document.pages.map((_, i) => i);
      const results = await convertPdfToImages(pdfProxy, pageIndices, imgFormat, imgDpi, document.name);

      setExtractedImages(results);
      addToast(`Đã trích xuất ${results.length} hình ảnh từ PDF`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi trích xuất ảnh: ${err?.message}`, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadAllImagesZip = async () => {
    if (extractedImages.length === 0) return;
    const zipFiles = extractedImages.map((img) => ({
      name: img.fileName,
      bytes: img.blob,
    }));
    const zipBlob = await createZipArchive(zipFiles);
    downloadFile(zipBlob, getOutputName(document?.name || 'images', 'extracted', undefined, 'zip'), 'application/zip');
    addToast('Đã tải xuống gói ZIP hình ảnh', 'success');
  };

  // Handle Image to PDF
  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImgs: { name: string; file: File; previewUrl: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newImgs.push({
        name: f.name,
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    }
    setUploadedImages((prev) => [...prev, ...newImgs]);
  };

  const handleConvertImagesToPdf = async () => {
    if (uploadedImages.length === 0) return;
    setIsConvertingImg(true);
    try {
      const pdfBytes = await convertImagesToPdf(uploadedImages);
      downloadFile(pdfBytes, 'anh_chuyen_doi.pdf');
      addToast('Đã chuyển đổi thành công ảnh sang PDF!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển ảnh sang PDF: ${err?.message}`, 'error');
    } finally {
      setIsConvertingImg(false);
    }
  };

  // Handle Text to PDF
  const handleConvertTextToPdf = async () => {
    try {
      const pdfBytes = await convertTextToPdf(textContent, 'Tai_Lieu_DocFlow');
      downloadFile(pdfBytes, 'van_ban_chuyen_doi.pdf');
      addToast('Đã tạo tệp PDF từ văn bản!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển văn bản: ${err?.message}`, 'error');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <Image className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Chuyển đổi tài liệu (Convert)</h3>
          <p className="text-[11px] text-slate-600">PDF sang Ảnh, Ảnh sang PDF, Text sang PDF</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('pdf-to-img')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'pdf-to-img' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>PDF → Ảnh</span>
        </button>
        <button
          onClick={() => setActiveSubTab('img-to-pdf')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'img-to-pdf' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileImage className="w-3.5 h-3.5" />
          <span>Ảnh → PDF</span>
        </button>
        <button
          onClick={() => setActiveSubTab('text-to-pdf')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'text-to-pdf' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Text → PDF</span>
        </button>
      </div>

      {/* ---------------- Subtab 1: PDF to Image ---------------- */}
      {activeSubTab === 'pdf-to-img' && (
        <div className="space-y-3">
          {!document ? (
            <p className="text-xs text-slate-500 italic">Vui lòng nạp tài liệu PDF trước.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Định dạng ảnh:</label>
                  <select
                    value={imgFormat}
                    onChange={(e) => setImgFormat(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="png">PNG (Độ nét cao)</option>
                    <option value="jpeg">JPG (Nhẹ hơn)</option>
                    <option value="webp">WebP (Tối ưu web)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Độ phân giải:</label>
                  <select
                    value={imgDpi}
                    onChange={(e) => setImgDpi(parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value={1.5}>Tiêu chuẩn (150 DPI)</option>
                    <option value={2.0}>Sắc nét cao (300 DPI)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExtractImages}
                  disabled={isExtracting}
                  className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isExtracting ? 'Đang trích xuất ảnh...' : 'Trích xuất toàn bộ ảnh'}</span>
                </button>

                <SharePdfButton
                  getPdfBytes={() => document.data}
                  fileName={document.name}
                />
              </div>

              {extractedImages.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Đã trích xuất {extractedImages.length} ảnh</span>
                    <button
                      onClick={handleDownloadAllImagesZip}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Tải ZIP tất cả</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {extractedImages.map((img) => (
                      <div key={img.fileName} className="p-1 border border-slate-200 rounded-lg bg-white text-center text-[10px]">
                        <img src={img.dataUrl} alt={img.fileName} className="h-16 w-full object-contain mx-auto" />
                        <span className="truncate block mt-1 text-slate-600">{img.fileName}</span>
                        <button
                          onClick={() => downloadFile(img.blob, img.fileName, img.blob.type)}
                          className="mt-1 text-brand-600 hover:underline flex items-center justify-center gap-0.5 mx-auto"
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>Tải ảnh</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------------- Subtab 2: Image to PDF ---------------- */}
      {activeSubTab === 'img-to-pdf' && (
        <div className="space-y-3">
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImagesSelected}
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full py-3 px-3 border-2 border-dashed border-brand-300 hover:border-brand-500 rounded-xl bg-brand-50/30 text-brand-700 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 text-brand-600" />
            <span>Chọn hình ảnh từ máy tính</span>
          </button>

          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800">Đã chọn {uploadedImages.length} ảnh:</span>
              <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                {uploadedImages.map((item, idx) => (
                  <div key={idx} className="border rounded p-1 bg-white relative">
                    <img src={item.previewUrl} alt={item.name} className="h-14 w-full object-contain" />
                    <span className="text-[9px] truncate block text-slate-600 mt-0.5">{item.name}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConvertImagesToPdf}
                disabled={isConvertingImg}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Chuyển đổi thành PDF & Tải xuống</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Subtab 3: Text to PDF ---------------- */}
      {activeSubTab === 'text-to-pdf' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung văn bản / Markdown:</label>
            <textarea
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <button
            onClick={handleConvertTextToPdf}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Xuất văn bản ra PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
