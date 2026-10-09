import React, { useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TopBar } from './TopBar';
import { PageGridView } from './PageGridView';
import { CanvasViewer } from './CanvasViewer';
import { ToolUploadView } from './ToolUploadView';
import { MergeWorkspaceView } from './MergeWorkspaceView';
import { PageInspectModal } from './PageInspectModal';
import { OutputOverviewModal, GeneratedOutputItem } from '../tools/OutputOverviewModal';
import { SignatureItem } from '../../types/document';
import { buildPdfFromPages } from '../../services/pdfEngine';
import { downloadFile } from '../../services/zipService';

// Individual Tools
import { SplitTool } from '../tools/SplitTool';
import { CompressTool } from '../tools/CompressTool';
import { SignTool } from '../tools/SignTool';
import { LatexTool } from '../tools/LatexTool';
import { PdfToWordTool } from '../tools/PdfToWordTool';
import { WatermarkTool } from '../tools/WatermarkTool';
import { PageNumberTool } from '../tools/PageNumberTool';
import { EditTool } from '../tools/EditTool';
import { ProtectTool } from '../tools/ProtectTool';
import { RemoveBlankTool } from '../tools/RemoveBlankTool';
import { ConvertTool } from '../tools/ConvertTool';

interface WorkspaceLayoutProps {
  onNavigateHome: () => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ onNavigateHome }) => {
  const {
    document,
    sourceDocs,
    loadDocumentFromFile,
    loadSampleDocument,
    addSourcePdf,
    addToast,
    activePageIndex,
    setActivePageIndex,
    activeTool,
    setActiveTool,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal inspecting single page
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  // Signature state for interactive placement
  const [pendingSignature, setPendingSignature] = useState<SignatureItem | null>(null);

  // Output overview modal state
  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const [outputFiles, setOutputFiles] = useState<GeneratedOutputItem[]>([]);
  const [outputZipName, setOutputZipName] = useState('split_documents.zip');

  // Handle file uploads (supports multiple files for merge)
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (activeTool === 'merge' && files.length > 1) {
      // First file initializes document if empty
      const firstFile = files[0];
      if (!document) {
        await loadDocumentFromFile(firstFile);
      } else {
        const buf = await firstFile.arrayBuffer();
        await addSourcePdf(firstFile.name, new Uint8Array(buf));
      }

      // Add remaining files as source docs
      for (let i = 1; i < files.length; i++) {
        const f = files[i];
        const buf = await f.arrayBuffer();
        await addSourcePdf(f.name, new Uint8Array(buf));
      }
      addToast(`Đã nạp ${files.length} tệp PDF để chuẩn bị ghép`, 'success');
    } else {
      const singleFile = files[0];
      if (document) {
        const buf = await singleFile.arrayBuffer();
        await addSourcePdf(singleFile.name, new Uint8Array(buf));
      } else {
        await loadDocumentFromFile(singleFile);
      }
    }
  };

  const handleOpenExportModal = async () => {
    if (!document) return;
    try {
      const bytes = await buildPdfFromPages(document.pages, sourceDocs);
      downloadFile(bytes, document.name);
      addToast(`Đã xuất tệp thành công: ${document.name}`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Lỗi xuất PDF: ${err?.message}`, 'error');
    }
  };

  const handleShowOutputModal = (files: GeneratedOutputItem[], zipName: string) => {
    setOutputFiles(files);
    setOutputZipName(zipName);
    setOutputModalOpen(true);
  };

  // ==============================================================
  // 1. TOOL-FIRST ENTRY: LaTeX doesn't require a PDF upload
  // ==============================================================
  if (activeTool === 'latex') {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900">
        <TopBar 
          onOpenExportModal={handleOpenExportModal} 
          onBackToHome={onNavigateHome} 
        />
        <div className="flex-1 overflow-hidden">
          <LatexTool />
        </div>
        <footer className="h-6 bg-slate-950 text-slate-400 text-[11px] px-4 flex items-center justify-between shrink-0 border-t border-slate-800 z-10 select-none">
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            DocFlow LaTeX Studio
          </span>
          <span className="text-slate-400 text-[11px]">
            Một sản phẩm phát triển bởi <span className="text-slate-200 font-semibold">Đào Bá Anh Quân</span>
          </span>
        </footer>
      </div>
    );
  }

  // ==============================================================
  // 2. TOOL-FIRST ENTRY: If no document is loaded yet,
  //    show that specific tool's customized upload view
  // ==============================================================
  if (!document) {
    return (
      <ToolUploadView
        activeTool={activeTool}
        onFileUpload={handleFileUpload}
        onUseSample={(pageCount) => loadSampleDocument(pageCount || 20)}
        onBackToHome={onNavigateHome}
        onSelectOtherTool={setActiveTool}
      />
    );
  }

  // ==============================================================
  // 3. TOOL-SPECIFIC WORKSPACE: Document is loaded!
  //    Adapt the layout & preview to match the active tool!
  // ==============================================================
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        accept="application/pdf"
        multiple={activeTool === 'merge'}
        className="hidden"
      />

      {/* Top Workspace Header with Back to Home & Tool Switcher */}
      <TopBar 
        onOpenExportModal={handleOpenExportModal} 
        onBackToHome={onNavigateHome} 
      />

      {/* Main Workspace Body: Tailored per Active Tool */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* CASE A: MERGE PDF (Dedicated Multi-Document Workspace) */}
        {activeTool === 'merge' && (
          <MergeWorkspaceView />
        )}

        {/* CASE B: SPLIT PDF (Dedicated Split Workspace) */}
        {activeTool === 'split' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Interactive Page Grid with Split Status */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
              <PageGridView
                onAddPdfClick={() => fileInputRef.current?.click()}
                onInspectPage={(idx) => {
                  setActivePageIndex(idx);
                  setInspectModalOpen(true);
                }}
              />
            </div>
            {/* Right: Dedicated Split Panel (One PDF vs Custom Groups vs Auto Split) */}
            <aside className="w-96 md:w-[420px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <SplitTool onShowOutputModal={handleShowOutputModal} />
            </aside>
          </div>
        )}

        {/* CASE C: COMPRESS PDF (Dedicated Compression Studio) */}
        {activeTool === 'compress' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Document Canvas Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer />
            </div>
            {/* Right: Dedicated Compression Console */}
            <aside className="w-96 md:w-[400px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <CompressTool />
            </aside>
          </div>
        )}

        {/* CASE D: PDF TO WORD (Dedicated Conversion Studio) */}
        {activeTool === 'pdf-to-word' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Document Canvas Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer />
            </div>
            {/* Right: Dedicated PDF to Word Console */}
            <aside className="w-96 md:w-[400px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <PdfToWordTool />
            </aside>
          </div>
        )}

        {/* CASE E: SIGN PDF (Dedicated Signature Studio with Canvas placement) */}
        {activeTool === 'sign' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Center: Interactive Canvas Viewer with draggable signature */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer
                pendingSignature={pendingSignature}
                onUpdatePendingSignature={setPendingSignature}
              />
            </div>
            {/* Right: Signature Pad & Placement Controls */}
            <aside className="w-96 md:w-[400px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <SignTool
                pendingSignature={pendingSignature}
                onSetPendingSignature={setPendingSignature}
              />
            </aside>
          </div>
        )}

        {/* CASE F: WATERMARK (Interactive Watermark Canvas Studio) */}
        {activeTool === 'watermark' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer />
            </div>
            <aside className="w-96 md:w-[380px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <WatermarkTool />
            </aside>
          </div>
        )}

        {/* CASE G: PAGE NUMBERS (Interactive Numbering Canvas Studio) */}
        {activeTool === 'page-numbers' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer />
            </div>
            <aside className="w-96 md:w-[380px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <PageNumberTool />
            </aside>
          </div>
        )}

        {/* CASE H: EDIT & REDACT (Interactive Annotation & Blackout Studio) */}
        {activeTool === 'edit' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer />
            </div>
            <aside className="w-96 md:w-[380px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <EditTool />
            </aside>
          </div>
        )}

        {/* CASE I: PROTECT PDF (Password Protection & Security Studio) */}
        {activeTool === 'protect' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer />
            </div>
            <aside className="w-96 md:w-[380px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <ProtectTool />
            </aside>
          </div>
        )}

        {/* CASE J: REMOVE BLANK PAGES (Automated Blank Scanner Workspace) */}
        {activeTool === 'remove-blank' && (
          <div className="flex-1 flex overflow-y-auto">
            <div className="max-w-xl mx-auto w-full p-6">
              <RemoveBlankTool />
            </div>
          </div>
        )}

        {/* CASE K: PDF TO IMAGE & CONVERTER STUDIO */}
        {activeTool === 'pdf-to-image' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
              <CanvasViewer />
            </div>
            <aside className="w-96 md:w-[400px] bg-white flex flex-col h-full shrink-0 shadow-xs overflow-y-auto border-l border-slate-200">
              <ConvertTool />
            </aside>
          </div>
        )}

        {/* CASE L: GENERAL OVERVIEW / ORGANIZE (Full-width 5-column grid) */}
        {activeTool === 'overview' && (
          <PageGridView
            onAddPdfClick={() => fileInputRef.current?.click()}
            onInspectPage={(idx) => {
              setActivePageIndex(idx);
              setInspectModalOpen(true);
            }}
          />
        )}

      </div>

      {/* Workspace Status Bar Footer */}
      <footer className="h-6.5 bg-slate-900 text-slate-400 text-[11px] px-4 flex items-center justify-between shrink-0 border-t border-slate-800 z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-medium">DocFlow Studio</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 truncate max-w-xs">{document.name}</span>
          <span className="text-slate-500 text-[10px]">({document.pages.length} trang)</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Một sản phẩm phát triển bởi <span className="text-slate-200 font-semibold">Đào Bá Anh Quân</span>
        </div>
      </footer>

      {/* Page Inspection Modal (high-res single page zoom) */}
      <PageInspectModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        pageIndex={activePageIndex}
        onPageChange={setActivePageIndex}
      />

      {/* Output Overview & ZIP Modal */}
      <OutputOverviewModal
        isOpen={outputModalOpen}
        onClose={() => setOutputModalOpen(false)}
        files={outputFiles}
        defaultZipName={outputZipName}
      />
    </div>
  );
};
