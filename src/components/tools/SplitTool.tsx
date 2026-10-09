import React, { useState, useEffect, useRef } from 'react';
import { 
  Split, 
  Layers, 
  FolderPlus, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle, 
  Download, 
  Archive, 
  FileCheck, 
  Scissors,
  GripVertical,
  ArrowRight,
  Info,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { parsePageRangeString, pageNumbersToRangeString, getOutputName } from '../../utils/formatters';
import { buildPdfFromPages, buildCustomGroupsPdfs } from '../../services/pdfEngine';
import { downloadFile, createZipArchive } from '../../services/zipService';
import { DocPage, SplitGroup, ToolType } from '../../types/document';
import { ContinueWorkflowDropdown } from '../common/ContinueWorkflowDropdown';
import { SharePdfButton } from '../common/SharePdfButton';

interface SplitToolProps {
  onShowOutputModal?: (files: { name: string; bytes: Uint8Array; pageCount: number }[], zipName: string) => void;
}

export const SplitTool: React.FC<SplitToolProps> = ({ onShowOutputModal }) => {
  const {
    document,
    sourceDocs,
    selectedPageIds,
    toggleSelectPage,
    selectAllPages,
    clearSelection,
    selectPagesByIds,
    setSelectedPageIds,
    splitGroups,
    setSplitGroups,
    addToast,
    chainWorkflow,
  } = useWorkspace();

  const [splitMode, setSplitMode] = useState<'one-pdf' | 'multiple-pdfs'>('one-pdf');
  const [multiSubMode, setMultiSubMode] = useState<'auto-ranges' | 'every-n' | 'breakpoints' | 'custom-groups'>('auto-ranges');

  // Mode 1: One PDF states (with live two-way sync)
  const isInternalSyncRef = useRef(false);
  const [rangeInput, setRangeInput] = useState<string>('');
  const [onePdfOutputName, setOnePdfOutputName] = useState<string>('');
  const [showAdditiveBox, setShowAdditiveBox] = useState<boolean>(false);
  const [additiveInput, setAdditiveInput] = useState<string>('');
  const [additiveError, setAdditiveError] = useState<string | null>(null);

  // Sync from Grid Selection -> rangeInput
  useEffect(() => {
    if (isInternalSyncRef.current) return;
    if (!document) return;

    const selectedNums: number[] = [];
    document.pages.forEach((p, idx) => {
      if (selectedPageIds.has(p.pageId)) {
        selectedNums.push(idx + 1);
      }
    });

    const formatted = pageNumbersToRangeString(selectedNums);
    setRangeInput(formatted);
  }, [selectedPageIds, document]);

  // Mode 2: Auto split states
  const [autoRangesInput, setAutoRangesInput] = useState<string>('1-3, 5-7, 9-13');
  const [everyNCount, setEveryNCount] = useState<number>(4);
  const [breakpoints, setBreakpoints] = useState<number[]>([3, 7]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom Groups editing states
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState<string>('');

  if (!document) {
    return (
      <div className="p-4 text-center text-xs text-slate-600">
        Vui lòng mở hoặc tạo một tài liệu PDF trước.
      </div>
    );
  }

  const totalPages = document.pages.length;

  // Track assigned page IDs across groups in Custom Split
  const assignedPageIds = new Set<string>();
  splitGroups.forEach((g) => g.pageIds.forEach((id) => assignedPageIds.add(id)));
  const unassignedCount = document.pages.filter((p) => !assignedPageIds.has(p.pageId)).length;

  // User types in rangeInput -> update selectedPageIds on grid
  const handleRangeInputChange = (newVal: string) => {
    setRangeInput(newVal);
    if (!document) return;

    if (!newVal.trim()) {
      isInternalSyncRef.current = true;
      setSelectedPageIds(new Set());
      setTimeout(() => { isInternalSyncRef.current = false; }, 0);
      return;
    }

    const parsed = parsePageRangeString(newVal, totalPages);
    if (!parsed.error && parsed.pages.length > 0) {
      isInternalSyncRef.current = true;
      const newSelectedIds = new Set<string>();
      parsed.pages.forEach((pNum) => {
        const page = document.pages[pNum - 1];
        if (page) newSelectedIds.add(page.pageId);
      });
      setSelectedPageIds(newSelectedIds);
      setTimeout(() => { isInternalSyncRef.current = false; }, 0);
    }
  };

  // Additive range submission (e.g. user enters "10-15" to add to existing selection)
  const handleAddExtraRange = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAdditiveError(null);
    if (!additiveInput.trim()) return;

    const parsed = parsePageRangeString(additiveInput, totalPages);
    if (parsed.error) {
      setAdditiveError(parsed.error);
      return;
    }

    const newIds = new Set(selectedPageIds);
    parsed.pages.forEach((pNum) => {
      const page = document.pages[pNum - 1];
      if (page) newIds.add(page.pageId);
    });

    setSelectedPageIds(newIds);
    addToast(`Đã thêm các trang (${additiveInput}) vào vùng chọn`, 'success');
    setAdditiveInput('');
    setShowAdditiveBox(false);
  };

  // --- Handlers for Mode 1: One PDF ---
  const handleExportOnePdf = async () => {
    setIsProcessing(true);
    try {
      const parsed = parsePageRangeString(rangeInput, totalPages);
      if (parsed.error) {
        addToast(parsed.error, 'error');
        return;
      }

      // Map parsed 1-based page numbers to DocPage objects in document order
      const targetPages: DocPage[] = parsed.pages.map((pNum) => document.pages[pNum - 1]);
      const pdfBytes = await buildPdfFromPages(targetPages, sourceDocs);

      const outName = onePdfOutputName.trim()
        ? (onePdfOutputName.endsWith('.pdf') ? onePdfOutputName : `${onePdfOutputName}.pdf`)
        : getOutputName(document.name, 'extracted');

      downloadFile(pdfBytes, outName);
      addToast(`Đã xuất thành công: ${outName} (${targetPages.length} trang)`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi tách PDF: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Workflow Chaining: Continue processing extracted pages in another tool
  const handleContinueOnePdf = async (targetTool: ToolType) => {
    if (!document) return;
    const parsed = parsePageRangeString(rangeInput, totalPages);
    if (parsed.error || parsed.pages.length === 0) {
      addToast(parsed.error || 'Vui lòng chọn ít nhất một trang để tiếp tục', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const targetPages: DocPage[] = parsed.pages.map((pNum) => document.pages[pNum - 1]);
      const pdfBytes = await buildPdfFromPages(targetPages, sourceDocs);
      const outName = onePdfOutputName.trim()
        ? (onePdfOutputName.endsWith('.pdf') ? onePdfOutputName : `${onePdfOutputName}.pdf`)
        : getOutputName(document.name, 'extracted');

      await chainWorkflow(pdfBytes, `Trích xuất ${targetPages.length} trang`, outName, targetTool);
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp tài liệu: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get PDF bytes for pone.rs sharing
  const getOnePdfBytesForShare = async (): Promise<Uint8Array | null> => {
    if (!document) return null;
    const parsed = parsePageRangeString(rangeInput, totalPages);
    if (parsed.error || parsed.pages.length === 0) {
      return document.data;
    }
    const targetPages: DocPage[] = parsed.pages.map((pNum) => document.pages[pNum - 1]);
    return await buildPdfFromPages(targetPages, sourceDocs);
  };

  // --- Handlers for Mode 2: Auto Split by Ranges ---
  const handleExportAutoRanges = async () => {
    setIsProcessing(true);
    try {
      const parts = autoRangesInput.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) {
        addToast('Vui lòng nhập danh sách khoảng trang hợp lệ', 'error');
        return;
      }

      const generatedFiles: { name: string; bytes: Uint8Array; pageCount: number }[] = [];

      for (let i = 0; i < parts.length; i++) {
        const partStr = parts[i];
        const parsed = parsePageRangeString(partStr, totalPages);
        if (parsed.error) {
          addToast(`Khoảng "${partStr}": ${parsed.error}`, 'error');
          return;
        }

        const pages: DocPage[] = parsed.pages.map((pNum) => document.pages[pNum - 1]);
        const bytes = await buildPdfFromPages(pages, sourceDocs);
        const fileName = getOutputName(document.name, 'part', i + 1);

        generatedFiles.push({
          name: fileName,
          bytes,
          pageCount: pages.length,
        });
      }

      if (onShowOutputModal) {
        onShowOutputModal(generatedFiles, getOutputName(document.name, 'split', undefined, 'zip'));
      } else {
        // Direct zip download fallback
        const zipBlob = await createZipArchive(generatedFiles);
        downloadFile(zipBlob, getOutputName(document.name, 'split', undefined, 'zip'), 'application/zip');
        addToast(`Đã đóng gói ${generatedFiles.length} tệp PDF vào ZIP`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi tạo nhiều PDF: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers for Mode 2: Split Every N Pages ---
  const handleExportEveryN = async () => {
    setIsProcessing(true);
    try {
      const n = Math.max(1, Math.min(totalPages, everyNCount));
      const generatedFiles: { name: string; bytes: Uint8Array; pageCount: number }[] = [];
      let partIdx = 1;

      for (let start = 0; start < totalPages; start += n) {
        const end = Math.min(start + n, totalPages);
        const slicePages = document.pages.slice(start, end);
        const bytes = await buildPdfFromPages(slicePages, sourceDocs);
        const fileName = getOutputName(document.name, 'part', partIdx++);

        generatedFiles.push({
          name: fileName,
          bytes,
          pageCount: slicePages.length,
        });
      }

      if (onShowOutputModal) {
        onShowOutputModal(generatedFiles, getOutputName(document.name, 'split', 'every_n', 'zip'));
      } else {
        const zipBlob = await createZipArchive(generatedFiles);
        downloadFile(zipBlob, getOutputName(document.name, 'split', 'every_n', 'zip'), 'application/zip');
        addToast(`Đã chia thành ${generatedFiles.length} tệp PDF (mỗi tệp ${n} trang)`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers for Mode 2: Custom Split Groups ---
  const handleAddGroup = () => {
    const newId = `group_${Date.now()}`;
    const newGroup: SplitGroup = {
      id: newId,
      name: `Nhóm PDF ${splitGroups.length + 1}`,
      pageIds: [],
    };
    setSplitGroups([...splitGroups, newGroup]);
  };

  const handleRemoveGroup = (groupId: string) => {
    setSplitGroups(splitGroups.filter((g) => g.id !== groupId));
  };

  const handleAddSelectedToGroup = (groupId: string) => {
    if (selectedPageIds.size === 0) {
      addToast('Vui lòng chọn trang từ danh sách trước khi thêm vào nhóm', 'info');
      return;
    }
    setSplitGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          // Combine existing pages with selected pages without duplicating in same group
          const set = new Set(g.pageIds);
          selectedPageIds.forEach((id) => set.add(id));
          return { ...g, pageIds: Array.from(set) };
        }
        return g;
      })
    );
    addToast(`Đã thêm ${selectedPageIds.size} trang vào nhóm`, 'success');
  };

  const handleRemovePageFromGroup = (groupId: string, pageId: string) => {
    setSplitGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, pageIds: g.pageIds.filter((id) => id !== pageId) };
        }
        return g;
      })
    );
  };

  const handleExportCustomGroups = async () => {
    if (splitGroups.length === 0) {
      addToast('Vui lòng tạo ít nhất 1 nhóm PDF', 'warning');
      return;
    }
    // Check if any group is empty
    const emptyGroup = splitGroups.find((g) => g.pageIds.length === 0);
    if (emptyGroup) {
      addToast(`Nhóm "${emptyGroup.name}" chưa có trang nào. Vui lòng thêm trang trước khi xuất.`, 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const pageLookup = new Map<string, DocPage>();
      document.pages.forEach((p) => pageLookup.set(p.pageId, p));

      const groupsToBuild = splitGroups.map((g) => ({
        name: g.name,
        pages: g.pageIds.map((id) => pageLookup.get(id)!).filter(Boolean),
      }));

      const generatedFiles = await buildCustomGroupsPdfs(groupsToBuild, sourceDocs);

      if (onShowOutputModal) {
        onShowOutputModal(generatedFiles, 'custom_split_documents.zip');
      } else {
        const zipBlob = await createZipArchive(generatedFiles);
        downloadFile(zipBlob, 'custom_split_documents.zip', 'application/zip');
        addToast(`Đã xuất thành công gói ZIP gồm ${generatedFiles.length} tệp PDF!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi xuất nhóm: ${err?.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Info */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
          <Split className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Chia PDF (Split & Group)</h3>
          <p className="text-[11px] text-slate-600">Tổng số: {totalPages} trang trong tài liệu</p>
        </div>
      </div>

      {/* Mode Selection Screen (PRD Section 4.1) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setSplitMode('one-pdf')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex flex-col items-center gap-1 ${
            splitMode === 'one-pdf'
              ? 'bg-white text-brand-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Một PDF (One PDF)</span>
        </button>
        <button
          onClick={() => setSplitMode('multiple-pdfs')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex flex-col items-center gap-1 ${
            splitMode === 'multiple-pdfs'
              ? 'bg-white text-brand-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Nhiều PDF (Multiple)</span>
        </button>
      </div>

      {/* ---------------- MODE 1: ONE PDF ---------------- */}
      {splitMode === 'one-pdf' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-3 text-xs text-sky-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">Mục tiêu: Gom các trang đã chọn thành 1 PDF duy nhất</span>
            Nhập các khoảng trang (ví dụ: <code className="bg-sky-100 px-1 py-0.5 rounded font-mono">1-3, 5-7, 9-13</code>).
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Khoảng trang cần trích xuất:
              </label>
              <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                Đã chọn {selectedPageIds.size} / {totalPages} trang
              </span>
            </div>

            {/* Input directly bound to selection with live two-way synchronization */}
            <div className="relative">
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => handleRangeInputChange(e.target.value)}
                placeholder="Chọn trang trên lưới hoặc nhập: 1-3, 5-7, 9"
                className="w-full pl-3 pr-8 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono shadow-2xs"
              />
              {rangeInput && (
                <button
                  type="button"
                  onClick={() => {
                    clearSelection();
                    setRangeInput('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                  title="Xóa trắng các trang đã chọn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Feedback / Guidance */}
            {rangeInput.trim() ? (
              (() => {
                const res = parsePageRangeString(rangeInput, totalPages);
                if (res.error) {
                  return <p className="text-[11px] text-rose-600 mt-1 font-medium">⚠ {res.error}</p>;
                }
                return (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[11px] text-emerald-600 font-medium">
                      ✓ Hợp lệ: Sẽ trích xuất {res.pages.length} trang vào 1 tệp PDF mới
                    </p>
                    {res.warnings?.map((w, idx) => (
                      <p key={idx} className="text-[10px] text-amber-600">⚠ {w}</p>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                💡 Nhấp chọn từng trang trên lưới bên trái hoặc gõ khoảng trang vào ô trên.
              </p>
            )}

            {/* Action to add extra ranges into selection */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdditiveBox(!showAdditiveBox)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 border ${
                  showAdditiveBox 
                    ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-2xs' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-brand-600" />
                <span>+ Thêm khoảng trang vào danh sách</span>
              </button>
            </div>

            {/* Clean intuitive range input box */}
            {showAdditiveBox && (
              <form onSubmit={handleAddExtraRange} className="mt-2 p-3 bg-brand-50/70 rounded-xl border border-brand-200/80 space-y-2 animate-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-brand-900">
                    Khoảng trang muốn chọn thêm:
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">VD: 5-8, 12</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={additiveInput}
                    onChange={(e) => {
                      setAdditiveInput(e.target.value);
                      if (additiveError) setAdditiveError(null);
                    }}
                    placeholder="VD: 5-8, 12"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:border-brand-500 focus:outline-hidden shadow-2xs"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors shrink-0 shadow-2xs"
                  >
                    Thêm vào
                  </button>
                </div>
                {additiveError && (
                  <p className="text-[10px] text-rose-600 font-medium">⚠ {additiveError}</p>
                )}
              </form>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên tệp đầu ra (tùy chọn):
            </label>
            <input
              type="text"
              value={onePdfOutputName}
              onChange={(e) => setOnePdfOutputName(e.target.value)}
              placeholder={getOutputName(document.name, 'extracted')}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Export & Actions Row */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportOnePdf}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Xuất một PDF</span>
              </button>

              <SharePdfButton
                getPdfBytes={getOnePdfBytesForShare}
                fileName={onePdfOutputName || getOutputName(document.name, 'extracted')}
              />
            </div>

            {/* Workflow Chaining Dropdown: Tiếp tục làm việc với PDF này */}
            <ContinueWorkflowDropdown
              onSelectTool={handleContinueOnePdf}
              currentTool="split"
              isProcessing={isProcessing}
              label="Tiếp tục làm việc với PDF này..."
            />
          </div>
        </div>
      )}

      {/* ---------------- MODE 2: MULTIPLE PDFS ---------------- */}
      {splitMode === 'multiple-pdfs' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Sub-modes tabs */}
          <div className="flex border-b border-slate-200 gap-1 text-[11px] font-semibold">
            <button
              onClick={() => setMultiSubMode('auto-ranges')}
              className={`pb-2 px-2 border-b-2 transition-colors ${
                multiSubMode === 'auto-ranges'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Theo khoảng
            </button>
            <button
              onClick={() => setMultiSubMode('every-n')}
              className={`pb-2 px-2 border-b-2 transition-colors ${
                multiSubMode === 'every-n'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Mỗi N trang
            </button>
            <button
              onClick={() => setMultiSubMode('custom-groups')}
              className={`pb-2 px-2 border-b-2 transition-colors ${
                multiSubMode === 'custom-groups'
                  ? 'border-brand-600 text-brand-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Custom Groups ✨
            </button>
          </div>

          {/* Submode A: Auto Ranges */}
          {multiSubMode === 'auto-ranges' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                Mỗi khoảng trang hợp lệ sẽ tạo thành một file PDF riêng biệt trong gói ZIP.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhập các khoảng (VD: 1-3, 5-7, 9-13):
                </label>
                <input
                  type="text"
                  value={autoRangesInput}
                  onChange={(e) => setAutoRangesInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                onClick={handleExportAutoRanges}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Archive className="w-4 h-4" />
                <span>Tạo các PDF & Đóng gói ZIP</span>
              </button>
            </div>
          )}

          {/* Submode B: Every N pages */}
          {multiSubMode === 'every-n' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                Chia tài liệu đều đặn mỗi N trang một tệp. Nhóm cuối tự động nhận số trang còn lại.
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Số trang mỗi tệp:</label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={everyNCount}
                  onChange={(e) => setEveryNCount(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono text-center"
                />
              </div>
              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Sẽ tạo khoảng <b>{Math.ceil(totalPages / (everyNCount || 1))}</b> tệp PDF.
              </div>
              <button
                onClick={handleExportEveryN}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Archive className="w-4 h-4" />
                <span>Chia & Tải ZIP</span>
              </button>
            </div>
          )}

          {/* Submode C: Custom Split Groups (PRD Section 4.4) */}
          {multiSubMode === 'custom-groups' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Các nhóm PDF đầu ra</span>
                <button
                  onClick={handleAddGroup}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 bg-brand-50 hover:bg-brand-100/70 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm nhóm PDF</span>
                </button>
              </div>

              {/* Unassigned pages alert badge */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs">
                <span className="text-slate-600">Trang chưa gán vào nhóm nào:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                  unassignedCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {unassignedCount} trang
                </span>
              </div>

              {/* Groups List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                {splitGroups.map((group, gIdx) => (
                  <div
                    key={group.id}
                    className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {editingGroupId === group.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={groupNameInput}
                            onChange={(e) => setGroupNameInput(e.target.value)}
                            className="px-2 py-1 text-xs border border-brand-500 rounded flex-1 font-semibold"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (groupNameInput.trim()) {
                                setSplitGroups(splitGroups.map((g) => g.id === group.id ? { ...g, name: groupNameInput.trim() } : g));
                              }
                              setEditingGroupId(null);
                            }}
                            className="p-1 bg-brand-600 text-white rounded text-xs"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                          <span>{group.name}</span>
                          <button
                            onClick={() => {
                              setGroupNameInput(group.name);
                              setEditingGroupId(group.id);
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {group.pageIds.length} trang
                        </span>
                        <button
                          onClick={() => handleRemoveGroup(group.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Xóa nhóm này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Add Selected button */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAddSelectedToGroup(group.id)}
                        className="w-full py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm {selectedPageIds.size} trang đang chọn vào nhóm này</span>
                      </button>
                    </div>

                    {/* Chips for pages inside this group */}
                    {group.pageIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {group.pageIds.map((pId) => {
                          const docPageIdx = document.pages.findIndex((p) => p.pageId === pId);
                          return (
                            <span
                              key={pId}
                              className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-brand-200"
                            >
                              <span>Trang {docPageIdx !== -1 ? docPageIdx + 1 : '?'}</span>
                              <button
                                onClick={() => handleRemovePageFromGroup(group.id, pId)}
                                className="text-brand-400 hover:text-rose-600"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Chưa có trang nào</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleExportCustomGroups}
                disabled={isProcessing || splitGroups.length === 0}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                <span>Xem tổng quan & Xuất ZIP</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
