import React, { useState } from 'react';
import {
  FileText,
  RotateCcw,
  RotateCw,
  History,
  Layers,
  Sparkles,
  ShieldCheck,
  FolderPlus,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatBytes } from '../../utils/formatters';

interface NavbarProps {
  currentView: 'home' | 'workspace';
  onNavigate: (view: 'home' | 'workspace') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const {
    document,
    canUndo,
    canRedo,
    undo,
    redo,
    revisions,
    currentRevisionIndex,
    revertToRevision,
    loadSampleDocument,
    isLoading
  } = useWorkspace();

  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 group text-left focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">DocFlow</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700 rounded-md border border-brand-200">v3.6</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 block -mt-0.5">Unified PDF Toolkit by Đào Bá Anh Quân</span>
            </div>
          </button>
        </div>

        {/* Right Info & Workspace CTA */}
        <div className="flex items-center gap-3">
          {/* Privacy Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Cục bộ • An toàn dữ liệu</span>
          </div>

          {/* If there's an ongoing document session, allow jumping into workspace */}
          {document && (
            <button
              onClick={() => onNavigate('workspace')}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tiếp tục trong Workspace ({document.pages.length} trang)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
