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
import { projectCommands } from '@/hooks/use-tauri-command';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { hydrateProject } from '@/stores/project-store';

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
  const { data: recentProjects, isLoading } = useQuery({
    queryKey: ['recent-projects'],
    queryFn: () => projectCommands.listRecentProjects(),
  });

  const loadProject = async (path: string) => {
    try {
      const jsonStr = await projectCommands.load(path);
      // The path passed here is the project.json file, we want the directory path as the project path
      const dirPath = path.substring(0, path.lastIndexOf('/'));
      hydrateProject(jsonStr, dirPath);
      setView('editor');
    } catch (e) {
      console.error('Failed to load project:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-surface-950">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-600/10 blur-[100px] rounded-full pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center w-full max-w-lg space-y-8"
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
          <h1 className="text-3xl font-bold text-white tracking-tight">ScreenCraft</h1>
          <p className="text-surface-400 text-sm max-w-md mx-auto">
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
        </div>

        <div className="mt-12 text-left bg-surface-900/50 rounded-2xl border border-surface-800 p-6 backdrop-blur-xl">
          <p className="text-surface-300 font-medium mb-4">Recent Projects</p>
          
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="w-5 h-5 rounded-full border-2 border-surface-600 border-t-accent-500 animate-spin" />
              </div>
            ) : recentProjects?.length ? (
              recentProjects.map((project: any) => (
                <button
                  key={project.id}
                  onClick={() => loadProject(`${project.path}/project.json`)}
                  className="w-full flex flex-col text-left p-3 rounded-xl border border-transparent hover:border-surface-700 hover:bg-surface-800/80 transition-all group"
                >
                  <span className="text-sm font-medium text-surface-200 group-hover:text-accent-400 transition-colors">
                    {project.name}
                  </span>
                  <span className="text-xs text-surface-500 mt-1">
                    {new Date(project.last_modified * 1000).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </button>
              ))
            ) : (
              <div className="text-center p-6 text-surface-500 text-sm bg-surface-900/30 rounded-xl border border-surface-800/50">
                No recent projects found
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
