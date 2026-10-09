import React, { createContext, useContext, useState, useCallback } from 'react';
import { DocFlowDocument, DocPage, RevisionSnapshot, SplitGroup, ToolType, WatermarkOptions, PageNumberOptions } from '../types/document';
import { loadPdfDocument, generatePageThumbnail } from '../services/pdfWorker';
import { createSamplePdf } from '../utils/samplePdfs';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export interface WorkspaceContextType {
  // Document state
  document: DocFlowDocument | null;
  sourceDocs: Map<string, Uint8Array>;
  activePageIndex: number;
  selectedPageIds: Set<string>;
  zoom: number;
  fitMode: 'fit-page' | 'fit-width' | 'custom';
  
  // Layout Panel state
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Tool state
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  
  // Revision & Undo / Redo
  revisions: RevisionSnapshot[];
  currentRevisionIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  revertToRevision: (revisionId: string) => void;

  // Split custom groups
  splitGroups: SplitGroup[];
  setSplitGroups: React.Dispatch<React.SetStateAction<SplitGroup[]>>;

  // Live preview options
  watermarkPreview: WatermarkOptions | null;
  setWatermarkPreview: React.Dispatch<React.SetStateAction<WatermarkOptions | null>>;
  pageNumberPreview: PageNumberOptions | null;
  setPageNumberPreview: React.Dispatch<React.SetStateAction<PageNumberOptions | null>>;

  // Actions
  setDocument: React.Dispatch<React.SetStateAction<DocFlowDocument | null>>;
  loadDocumentFromFile: (file: File) => Promise<void>;
  loadSampleDocument: (pageCount?: number) => Promise<void>;
  addSourcePdf: (name: string, bytes: Uint8Array) => Promise<void>;
  updateDocumentName: (name: string) => void;
  setActivePageIndex: (index: number) => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setFitMode: (mode: 'fit-page' | 'fit-width' | 'custom') => void;
  toggleSelectPage: (pageId: string, multi?: boolean) => void;
  selectAllPages: () => void;
  clearSelection: () => void;
  clearDocument: () => void;
  selectPagesByIds: (ids: string[]) => void;
  setSelectedPageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Page operations
  reorderPages: (sourceIndex: number, destinationIndex: number) => void;
  rotatePage: (pageId: string, delta?: number) => void;
  rotateSelectedPages: (delta?: number) => void;
  deletePage: (pageId: string) => void;
  deleteSelectedPages: () => void;
  duplicatePage: (pageId: string) => void;
  duplicateSelectedPages: () => void;
  removePagesByIds: (ids: string[]) => void;

  // Workflow Chaining
  chainWorkflow: (
    newBytes: Uint8Array,
    actionName: string,
    newDocName?: string,
    nextTool?: ToolType
  ) => Promise<void>;

  // Toast notifications
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  removeToast: (id: string) => void;

  // Loading state
  isLoading: boolean;
  loadingMessage: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [document, setDocument] = useState<DocFlowDocument | null>(null);
  const [sourceDocs, setSourceDocs] = useState<Map<string, Uint8Array>>(new Map());
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'fit-page' | 'fit-width' | 'custom'>('fit-width');
  const [activeTool, setActiveToolState] = useState<ToolType>('overview');

  // Layout panel toggles
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);

  const setActiveTool = useCallback((tool: ToolType) => {
    setActiveToolState(tool);
    // Automatically open right panel when a specific tool is chosen, close when in general overview
    if (tool !== 'overview') {
      setIsRightPanelOpen(true);
    }
  }, []);

  // Revisions
  const [revisions, setRevisions] = useState<RevisionSnapshot[]>([]);
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState<number>(-1);

  // Split Groups for Custom Split
  const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([]);

  // Live preview options
  const [watermarkPreview, setWatermarkPreview] = useState<WatermarkOptions | null>(null);
  const [pageNumberPreview, setPageNumberPreview] = useState<PageNumberOptions | null>(null);

  // Loading & Toasts
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Helper to commit a state revision
  const commitRevision = useCallback((doc: DocFlowDocument, actionName: string) => {
    const newRevId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const snapshot: RevisionSnapshot = {
      revisionId: newRevId,
      parentRevisionId: revisions[currentRevisionIndex]?.revisionId || null,
      actionName,
      timestamp: Date.now(),
      document: { ...doc, pages: [...doc.pages] },
    };

    const updated = revisions.slice(0, currentRevisionIndex + 1);
    updated.push(snapshot);
    setRevisions(updated);
    setCurrentRevisionIndex(updated.length - 1);
  }, [revisions, currentRevisionIndex]);

  // Progressive background thumbnail generation (batched & non-blocking to prevent lag)
  const triggerBackgroundThumbnailLoading = (docId: string, pdfBytes: Uint8Array, pageCount: number) => {
    setTimeout(async () => {
      try {
        const pdfProxy = await loadPdfDocument(docId, pdfBytes);
        const batchMap = new Map<number, string>();

        for (let i = 0; i < pageCount; i++) {
          // Yield to event loop between pages so main thread remains 100% fluid
          await new Promise((resolve) => setTimeout(resolve, 15));

          const url = await generatePageThumbnail(pdfProxy, i, 0, 140);
          batchMap.set(i, url);

          // Flush every 4 pages or on the last page to minimize React re-renders
          if (batchMap.size >= 4 || i === pageCount - 1) {
            const currentBatch = new Map(batchMap);
            batchMap.clear();

            setDocument((prev) => {
              if (!prev) return prev;
              let hasChange = false;
              const updatedPages = prev.pages.map((p) => {
                // Match specifically by sourceDocId and sourcePageIndex
                if (p.sourceDocId === docId && currentBatch.has(p.sourcePageIndex)) {
                  const newThumb = currentBatch.get(p.sourcePageIndex);
                  if (newThumb && p.thumbnailUrl !== newThumb) {
                    hasChange = true;
                    return { ...p, thumbnailUrl: newThumb };
                  }
                }
                return p;
              });
              return hasChange ? { ...prev, pages: updatedPages } : prev;
            });
          }
        }
      } catch (err) {
        console.warn('Background thumbnail generation completed with notice', err);
      }
    }, 50);
  };

  // Load document from File
  const loadDocumentFromFile = useCallback(async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage(`Đang mở tệp ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const docId = `doc_${Date.now()}`;

      const pdfProxy = await loadPdfDocument(docId, bytes);
      const pageCount = pdfProxy.numPages;

      // Generate first 2 thumbnails immediately for instant display
      const initialThumbCount = Math.min(pageCount, 2);
      const initialThumbs: string[] = [];
      for (let i = 0; i < initialThumbCount; i++) {
        const url = await generatePageThumbnail(pdfProxy, i, 0, 150);
        initialThumbs.push(url);
      }

      const pages: DocPage[] = Array.from({ length: pageCount }, (_, idx) => ({
        pageId: `page_${docId}_${idx + 1}`,
        sourceDocId: docId,
        sourceDocName: file.name,
        sourcePageIndex: idx,
        rotation: 0,
        thumbnailUrl: initialThumbs[idx] || '',
      }));

      const newDoc: DocFlowDocument = {
        id: docId,
        name: file.name,
        fileSize: file.size,
        data: bytes,
        pages,
        updatedAt: Date.now(),
      };

      setSourceDocs((prev) => new Map(prev).set(docId, bytes));
      setDocument(newDoc);
      setActivePageIndex(0);
      setSelectedPageIds(new Set());

      // Init revision 1
      const initialRev: RevisionSnapshot = {
        revisionId: `rev_init_${Date.now()}`,
        parentRevisionId: null,
        actionName: 'Tải lên tài liệu ban đầu',
        timestamp: Date.now(),
        document: newDoc,
      };
      setRevisions([initialRev]);
      setCurrentRevisionIndex(0);

      // Default split groups
      setSplitGroups([
        { id: 'group_1', name: 'Nhóm PDF 1', pageIds: pages.slice(0, Math.ceil(pageCount / 2)).map((p) => p.pageId) },
        { id: 'group_2', name: 'Nhóm PDF 2', pageIds: pages.slice(Math.ceil(pageCount / 2)).map((p) => p.pageId) },
      ]);

      // Lazy load remaining thumbnails progressively in background
      triggerBackgroundThumbnailLoading(docId, bytes, pageCount);

      addToast(`Đã mở thành công: ${file.name} (${pageCount} trang)`, 'success');
    } catch (error: any) {
      console.error('Load PDF error:', error);
      addToast(`Lỗi mở tệp: ${error?.message || 'Tệp PDF không hợp lệ hoặc bị mã hóa'}`, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [addToast]);

  // Load sample document for instant testing
  const loadSampleDocument = useCallback(async (pageCount: number = 20) => {
    setIsLoading(true);
    setLoadingMessage(`Đang tạo tài liệu mẫu ${pageCount} trang...`);
    try {
      const sample = await createSamplePdf(pageCount, 'Tai_lieu_kiem_thu_DocFlow');
      const docId = `sample_${Date.now()}`;

      const pdfProxy = await loadPdfDocument(docId, sample.bytes);
      // Quick first 2 thumbnails
      const initialThumbCount = Math.min(pageCount, 2);
      const initialThumbs: string[] = [];
      for (let i = 0; i < initialThumbCount; i++) {
        const url = await generatePageThumbnail(pdfProxy, i, 0, 150);
        initialThumbs.push(url);
      }

      const pages: DocPage[] = Array.from({ length: pageCount }, (_, idx) => ({
        pageId: `page_${docId}_${idx + 1}`,
        sourceDocId: docId,
        sourceDocName: sample.name,
        sourcePageIndex: idx,
        rotation: 0,
        thumbnailUrl: initialThumbs[idx] || '',
      }));

      const newDoc: DocFlowDocument = {
        id: docId,
        name: sample.name,
        fileSize: sample.bytes.length,
        data: sample.bytes,
        pages,
        updatedAt: Date.now(),
      };

      setSourceDocs((prev) => new Map(prev).set(docId, sample.bytes));
      setDocument(newDoc);
      setActivePageIndex(0);
      setSelectedPageIds(new Set());

      const initialRev: RevisionSnapshot = {
        revisionId: `rev_sample_${Date.now()}`,
        parentRevisionId: null,
        actionName: `Tạo tài liệu mẫu (${pageCount} trang)`,
        timestamp: Date.now(),
        document: newDoc,
      };
      setRevisions([initialRev]);
      setCurrentRevisionIndex(0);

      setSplitGroups([
        {
          id: 'group_1',
          name: 'PDF 1 — Phần 1',
          pageIds: [pages[0]?.pageId, pages[1]?.pageId, pages[2]?.pageId, pages[4]?.pageId].filter(Boolean),
        },
        {
          id: 'group_2',
          name: 'PDF 2 — Phần 2',
          pageIds: pages.slice(5, 9).map((p) => p.pageId),
        },
      ]);

      // Lazy load remaining thumbnails in background
      triggerBackgroundThumbnailLoading(docId, sample.bytes, pageCount);

      addToast(`Đã nạp tài liệu mẫu gồm ${pageCount} trang!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Lỗi khi tạo tài liệu mẫu', 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [addToast]);

  // Add source PDF for merging
  const addSourcePdf = useCallback(async (name: string, bytes: Uint8Array) => {
    setIsLoading(true);
    setLoadingMessage(`Đang thêm ${name}...`);
    try {
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const pdfProxy = await loadPdfDocument(docId, bytes);
      const pageCount = pdfProxy.numPages;

      // Sinh trước thumbnail cho các trang đầu để hiển thị tức thì
      const initialThumbCount = Math.min(pageCount, 4);
      const initialThumbs: string[] = [];
      for (let i = 0; i < initialThumbCount; i++) {
        const url = await generatePageThumbnail(pdfProxy, i, 0, 140);
        initialThumbs.push(url);
      }

      const newPages: DocPage[] = Array.from({ length: pageCount }, (_, idx) => ({
        pageId: `page_${docId}_${idx + 1}`,
        sourceDocId: docId,
        sourceDocName: name,
        sourcePageIndex: idx,
        rotation: 0,
        thumbnailUrl: initialThumbs[idx] || '',
      }));

      setSourceDocs((prev) => new Map(prev).set(docId, bytes));

      setDocument((prev) => {
        if (!prev) {
          const doc: DocFlowDocument = {
            id: docId,
            name,
            fileSize: bytes.length,
            data: bytes,
            pages: newPages,
            updatedAt: Date.now(),
          };
          commitRevision(doc, `Thêm tài liệu ${name}`);
          return doc;
        }

        const updatedDoc: DocFlowDocument = {
          ...prev,
          pages: [...prev.pages, ...newPages],
          fileSize: prev.fileSize + bytes.length,
          updatedAt: Date.now(),
        };
        commitRevision(updatedDoc, `Ghép thêm ${name} (${pageCount} trang)`);
        return updatedDoc;
      });

      triggerBackgroundThumbnailLoading(docId, bytes, pageCount);
      addToast(`Đã thêm ${name} (+${pageCount} trang)`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Không thể đọc tài liệu ${name}: ${err?.message}`, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [commitRevision, addToast]);

  const updateDocumentName = useCallback((name: string) => {
    setDocument((prev) => {
      if (!prev) return null;
      return { ...prev, name, updatedAt: Date.now() };
    });
  }, []);

  // Selection
  const toggleSelectPage = useCallback((pageId: string, multi = false) => {
    setSelectedPageIds((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const selectAllPages = useCallback(() => {
    if (!document) return;
    setSelectedPageIds(new Set(document.pages.map((p) => p.pageId)));
  }, [document]);

  const clearSelection = useCallback(() => {
    setSelectedPageIds(new Set());
  }, []);

  const clearDocument = useCallback(() => {
    setDocument(null);
    setSourceDocs(new Map());
    setSelectedPageIds(new Set());
    setActivePageIndex(0);
    setRevisions([]);
    setCurrentRevisionIndex(-1);
    setSplitGroups([]);
    setWatermarkPreview(null);
    setPageNumberPreview(null);
  }, []);

  const selectPagesByIds = useCallback((ids: string[]) => {
    setSelectedPageIds(new Set(ids));
  }, []);

  // Reordering
  const reorderPages = useCallback((sourceIndex: number, destinationIndex: number) => {
    setDocument((prev) => {
      if (!prev) return null;
      if (sourceIndex === destinationIndex) return prev;
      const reordered = Array.from(prev.pages);
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(destinationIndex, 0, moved);

      const updated: DocFlowDocument = {
        ...prev,
        pages: reordered,
        updatedAt: Date.now(),
      };
      commitRevision(updated, `Di chuyển trang ${sourceIndex + 1} sang vị trí ${destinationIndex + 1}`);
      return updated;
    });
  }, [commitRevision]);

  // Page Operations
  const rotatePage = useCallback((pageId: string, delta = 90) => {
    setDocument((prev) => {
      if (!prev) return null;
      const pages = prev.pages.map((p) => {
        if (p.pageId === pageId) {
          const newRot = (p.rotation + delta) % 360;
          return { ...p, rotation: newRot };
        }
        return p;
      });
      const updated = { ...prev, pages, updatedAt: Date.now() };
      commitRevision(updated, `Xoay trang (${delta}°)`);
      return updated;
    });
  }, [commitRevision]);

  const rotateSelectedPages = useCallback((delta = 90) => {
    setDocument((prev) => {
      if (!prev || selectedPageIds.size === 0) return prev;
      const pages = prev.pages.map((p) => {
        if (selectedPageIds.has(p.pageId)) {
          return { ...p, rotation: (p.rotation + delta) % 360 };
        }
        return p;
      });
      const updated = { ...prev, pages, updatedAt: Date.now() };
      commitRevision(updated, `Xoay ${selectedPageIds.size} trang đã chọn`);
      return updated;
    });
    addToast(`Đã xoay ${selectedPageIds.size} trang`, 'info');
  }, [selectedPageIds, commitRevision, addToast]);

  const deletePage = useCallback((pageId: string) => {
    setDocument((prev) => {
      if (!prev) return null;
      if (prev.pages.length <= 1) {
        addToast('Không thể xóa trang duy nhất còn lại của tài liệu', 'warning');
        return prev;
      }
      const pages = prev.pages.filter((p) => p.pageId !== pageId);
      const updated = { ...prev, pages, updatedAt: Date.now() };
      commitRevision(updated, 'Xóa trang');
      return updated;
    });
  }, [commitRevision, addToast]);

  const deleteSelectedPages = useCallback(() => {
    setDocument((prev) => {
      if (!prev || selectedPageIds.size === 0) return prev;
      if (selectedPageIds.size >= prev.pages.length) {
        addToast('Không thể xóa toàn bộ các trang của tài liệu', 'warning');
        return prev;
      }
      const pages = prev.pages.filter((p) => !selectedPageIds.has(p.pageId));
      const count = selectedPageIds.size;
      const updated = { ...prev, pages, updatedAt: Date.now() };
      commitRevision(updated, `Xóa ${count} trang đã chọn`);
      clearSelection();
      addToast(`Đã xóa ${count} trang`, 'info');
      return updated;
    });
  }, [selectedPageIds, commitRevision, clearSelection, addToast]);

  const duplicatePage = useCallback((pageId: string) => {
    setDocument((prev) => {
      if (!prev) return null;
      const idx = prev.pages.findIndex((p) => p.pageId === pageId);
      if (idx === -1) return prev;
      const target = prev.pages[idx];
      const dup: DocPage = {
        ...target,
        pageId: `dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      const pages = [...prev.pages.slice(0, idx + 1), dup, ...prev.pages.slice(idx + 1)];
      const updated = { ...prev, pages, updatedAt: Date.now() };
      commitRevision(updated, `Nhân bản trang ${idx + 1}`);
      return updated;
    });
    addToast('Đã nhân bản trang', 'success');
  }, [commitRevision, addToast]);

  const duplicateSelectedPages = useCallback(() => {
    setDocument((prev) => {
      if (!prev || selectedPageIds.size === 0) return prev;
      const newPages: DocPage[] = [];
      prev.pages.forEach((p) => {
        newPages.push(p);
        if (selectedPageIds.has(p.pageId)) {
          newPages.push({
            ...p,
            pageId: `dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          });
        }
      });
      const updated = { ...prev, pages: newPages, updatedAt: Date.now() };
      commitRevision(updated, `Nhân bản ${selectedPageIds.size} trang`);
      return updated;
    });
    addToast(`Đã nhân bản ${selectedPageIds.size} trang`, 'success');
  }, [selectedPageIds, commitRevision, addToast]);

  const removePagesByIds = useCallback((ids: string[]) => {
    setDocument((prev) => {
      if (!prev) return null;
      const removeSet = new Set(ids);
      const pages = prev.pages.filter((p) => !removeSet.has(p.pageId));
      if (pages.length === 0) {
        addToast('Không thể xóa hết tất cả các trang', 'warning');
        return prev;
      }
      const updated = { ...prev, pages, updatedAt: Date.now() };
      commitRevision(updated, `Xóa ${ids.length} trang trắng`);
      return updated;
    });
  }, [commitRevision, addToast]);

  // Undo / Redo
  const canUndo = currentRevisionIndex > 0;
  const canRedo = currentRevisionIndex < revisions.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const targetIdx = currentRevisionIndex - 1;
    const snapshot = revisions[targetIdx];
    if (snapshot) {
      setDocument(snapshot.document);
      setCurrentRevisionIndex(targetIdx);
      addToast(`Đã hoàn tác: ${revisions[currentRevisionIndex].actionName}`, 'info');
    }
  }, [canUndo, currentRevisionIndex, revisions, addToast]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const targetIdx = currentRevisionIndex + 1;
    const snapshot = revisions[targetIdx];
    if (snapshot) {
      setDocument(snapshot.document);
      setCurrentRevisionIndex(targetIdx);
      addToast(`Đã làm lại: ${snapshot.actionName}`, 'info');
    }
  }, [canRedo, currentRevisionIndex, revisions, addToast]);

  const revertToRevision = useCallback((revisionId: string) => {
    const idx = revisions.findIndex((r) => r.revisionId === revisionId);
    if (idx !== -1) {
      setDocument(revisions[idx].document);
      setCurrentRevisionIndex(idx);
      addToast(`Đã quay lại: ${revisions[idx].actionName}`, 'info');
    }
  }, [revisions, addToast]);

  // Workflow Chaining
  const chainWorkflow = useCallback(async (
    newBytes: Uint8Array,
    actionName: string,
    newDocName?: string,
    nextTool?: ToolType
  ) => {
    setIsLoading(true);
    setLoadingMessage(`Đang chuyển tiếp kết quả: ${actionName}...`);
    try {
      const docId = `doc_chain_${Date.now()}`;
      const pdfProxy = await loadPdfDocument(docId, newBytes);
      const pageCount = pdfProxy.numPages;

      const fileName = newDocName || document?.name || 'document_processed.pdf';

      const initialThumbCount = Math.min(pageCount, 2);
      const initialThumbs: string[] = [];
      for (let i = 0; i < initialThumbCount; i++) {
        const url = await generatePageThumbnail(pdfProxy, i, 0, 150);
        initialThumbs.push(url);
      }

      const newPages: DocPage[] = Array.from({ length: pageCount }, (_, idx) => ({
        pageId: `page_${docId}_${idx + 1}`,
        sourceDocId: docId,
        sourceDocName: fileName,
        sourcePageIndex: idx,
        rotation: 0,
        thumbnailUrl: initialThumbs[idx] || '',
      }));

      const chainedDoc: DocFlowDocument = {
        id: docId,
        name: fileName,
        fileSize: newBytes.length,
        data: newBytes,
        pages: newPages,
        updatedAt: Date.now(),
      };

      setSourceDocs((prev) => new Map(prev).set(docId, newBytes));
      setDocument(chainedDoc);
      setActivePageIndex(0);
      setSelectedPageIds(new Set());

      commitRevision(chainedDoc, actionName);

      if (nextTool) {
        setActiveTool(nextTool);
      }

      triggerBackgroundThumbnailLoading(docId, newBytes, pageCount);
      addToast(`Đã lưu phiên bản mới sau bước: "${actionName}". Sẵn sàng tiếp tục!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi chuyển tiếp tài liệu: ${err?.message}`, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [document, commitRevision, addToast, setActiveTool]);

  return (
    <WorkspaceContext.Provider
      value={{
        document,
        setDocument,
        sourceDocs,
        activePageIndex,
        selectedPageIds,
        zoom,
        fitMode,
        isLeftSidebarOpen,
        setIsLeftSidebarOpen,
        isRightPanelOpen,
        setIsRightPanelOpen,
        activeTool,
        setActiveTool,
        revisions,
        currentRevisionIndex,
        canUndo,
        canRedo,
        undo,
        redo,
        revertToRevision,
        splitGroups,
        setSplitGroups,
        watermarkPreview,
        setWatermarkPreview,
        pageNumberPreview,
        setPageNumberPreview,
        loadDocumentFromFile,
        loadSampleDocument,
        addSourcePdf,
        updateDocumentName,
        setActivePageIndex,
        setZoom,
        setFitMode,
        toggleSelectPage,
        selectAllPages,
        clearSelection,
        clearDocument,
        selectPagesByIds,
        setSelectedPageIds,
        reorderPages,
        rotatePage,
        rotateSelectedPages,
        deletePage,
        deleteSelectedPages,
        duplicatePage,
        duplicateSelectedPages,
        removePagesByIds,
        chainWorkflow,
        toasts,
        addToast,
        removeToast,
        isLoading,
        loadingMessage,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
