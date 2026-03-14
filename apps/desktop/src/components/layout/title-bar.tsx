import { useUIStore } from '@/stores/ui-store';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '../ui/button';

interface TitleBarProps {
  onExport?: () => void;
}

export function TitleBar({ onExport }: TitleBarProps) {
  const { view, toggleSidebar, toggleInspector, setView } = useUIStore();
  const { projectName, isDirty, canUndo, canRedo } = useProjectStore();

  return (
    <header
      data-tauri-drag-region
      className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl no-select"
    >
      {/* Left section */}
      <div className="flex items-center gap-2">
        {/* macOS traffic lights spacer */}
        <div className="w-16" />

        {view === 'editor' && (
          <>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Toggle Sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </Button>
            <div className="h-4 w-px bg-surface-700 mx-1" />
            <Button variant="ghost" size="sm" disabled={!canUndo} title="Undo (⌘Z)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
              </svg>
            </Button>
            <Button variant="ghost" size="sm" disabled={!canRedo} title="Redo (⇧⌘Z)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
              </svg>
            </Button>
          </>
        )}
      </div>

      {/* Center: Project name */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-surface-200">
          {view === 'home' ? 'ScreenCraft' : projectName}
        </span>
        {isDirty && (
          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse-soft" title="Unsaved changes" />
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {view === 'editor' && (
          <>
            <Button variant="ghost" size="icon" onClick={toggleInspector} title="Toggle Inspector">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
              </svg>
            </Button>
            <div className="h-4 w-px bg-surface-700 mx-1" />
            <button
              onClick={onExport}
              className="h-8 px-4 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 transition-all active:scale-[0.98] shadow-lg shadow-accent-600/20"
            >
              Export
            </button>
            <div className="h-4 w-px bg-surface-700 mx-1" />
          </>
        )}
        {/* Settings gear — always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView('settings')}
          title="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </Button>
      </div>
    </header>
  );
}
