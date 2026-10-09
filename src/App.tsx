import React, { useState } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { HomePage } from './components/home/HomePage';
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout';
import { ToolType } from './types/document';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'workspace'>('home');
  const { setActiveTool, isLoading, loadingMessage } = useWorkspace();

  const handleOpenTool = (toolId: ToolType) => {
    setActiveTool(toolId);
    setCurrentView('workspace');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      {/* Global Navbar only shown on Home view */}
      {currentView === 'home' && (
        <Navbar currentView={currentView} onNavigate={setCurrentView} />
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'home' ? (
          <HomePage onOpenTool={handleOpenTool} />
        ) : (
          <WorkspaceLayout onNavigateHome={() => setCurrentView('home')} />
        )}
      </main>

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 flex items-center gap-4 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900">Đang xử lý tài liệu</h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">{loadingMessage || 'Vui lòng đợi trong giây lát...'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <AppContent />
    </WorkspaceProvider>
  );
}
