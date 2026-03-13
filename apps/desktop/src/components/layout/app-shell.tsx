import { useState, useEffect } from 'react';
import { TitleBar } from './title-bar';
import { Sidebar } from './sidebar';
import { PreviewCanvas } from '../canvas/preview-canvas';
import { TimelinePanel } from '../timeline/timeline-panel';
import { InspectorPanel } from '../inspector/inspector-panel';
import { RecordingSetup } from '../recording/recording-setup';
import { RecordingOverlay } from '../recording/recording-overlay';
import { ExportDialog } from '../export/export-dialog';
import { QuickShare } from '../share/quick-share';
import { useUIStore } from '@/stores/ui-store';
import { useRecordingStore } from '@/stores/recording-store';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useAutoSave } from '@/hooks/use-auto-save';
import { motion, AnimatePresence } from 'framer-motion';

export function AppShell() {
  const { view, sidebarOpen, inspectorOpen, timelineHeight } = useUIStore();
  const recordingStatus = useRecordingStore((s) => s.status);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  // Global keyboard shortcuts
  useShortcuts();

  // Auto-save project periodically
  useAutoSave();

  // Listen for ⌘E export shortcut
  useEffect(() => {
    const handler = () => setShowExport(true);
    window.addEventListener('open-export', handler);
    return () => window.removeEventListener('open-export', handler);
  }, []);

  // Home view
  if (view === 'home') {
    return (
      <div className="flex flex-col h-full">
        <TitleBar />
        <HomeView />
      </div>
    );
  }

  // Recording setup view
  if (view === 'recording' && (recordingStatus === 'idle' || recordingStatus === 'countdown')) {
    return (
      <div className="flex flex-col h-full">
        <TitleBar />
        <RecordingSetup />
      </div>
    );
  }

  // Active recording view
  if (view === 'recording' && (recordingStatus === 'recording' || recordingStatus === 'paused' || recordingStatus === 'finishing')) {
    return (
      <div className="flex flex-col h-full bg-surface-950">
        <TitleBar />
        <RecordingOverlay />
      </div>
    );
  }

  // Editor view
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TitleBar onExport={() => setShowExport(true)} />
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Canvas */}
          <div className="flex-1 min-h-0 flex">
            <div className="flex-1 min-w-0">
              <PreviewCanvas />
            </div>

            {/* Inspector */}
            <AnimatePresence mode="wait">
              {inspectorOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 overflow-hidden"
                >
                  <InspectorPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timeline */}
          <div
            className="flex-shrink-0 border-t border-surface-800"
            style={{ height: timelineHeight }}
          >
            <TimelinePanel />
          </div>
        </div>
      </div>

      {/* Export dialog */}
      <ExportDialog isOpen={showExport} onClose={() => setShowExport(false)} />

      {/* Quick share widget */}
      <QuickShare
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        exportedFilePath={lastExportPath}
      />
    </div>
  );
}

function HomeView() {
  const setView = useUIStore((s) => s.setView);

  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8"
      >
        <div className="space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-2xl shadow-accent-600/30">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">ScreenCraft</h1>
          <p className="text-surface-400 text-sm max-w-md">
            Record, edit, and share beautiful screen recordings
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <button
            onClick={() => setView('recording')}
            className="h-12 px-6 rounded-xl bg-accent-600 text-white font-medium hover:bg-accent-500 transition-all shadow-lg shadow-accent-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8" />
            </svg>
            New Recording
          </button>
          <button
            onClick={() => setView('editor')}
            className="h-12 px-6 rounded-xl bg-surface-800 text-surface-200 font-medium hover:bg-surface-700 transition-all border border-surface-700 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Open Project
          </button>
        </div>

        <div className="mt-8">
          <p className="text-surface-500 text-xs uppercase tracking-wider mb-4">Recent Projects</p>
          <p className="text-surface-600 text-sm">No recent projects</p>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="mt-4 text-surface-600 text-[10px]">
          Press <kbd className="px-1 py-0.5 rounded bg-surface-800 text-surface-400 font-mono">Space</kbd> to play · <kbd className="px-1 py-0.5 rounded bg-surface-800 text-surface-400 font-mono">⌘E</kbd> to export
        </div>
      </motion.div>
    </div>
  );
}
