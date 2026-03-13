import { cn } from '@/lib/utils';
import { useProjectStore, type ActiveTool } from '@/stores/project-store';

const tools: { id: ActiveTool; label: string; icon: string; shortcut?: string }[] = [
  { id: 'select', label: 'Select', icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z', shortcut: 'V' },
  { id: 'trim', label: 'Trim', icon: 'M6 9l6 6 6-6', shortcut: 'T' },
  { id: 'zoom', label: 'Zoom', icon: 'M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35', shortcut: 'Z' },
  { id: 'speed', label: 'Speed', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', shortcut: 'R' },
  { id: 'caption', label: 'Captions', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', shortcut: 'C' },
  { id: 'mask', label: 'Masks', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v8M8 12h8' },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { activeTool, setActiveTool, sources } = useProjectStore();

  return (
    <aside
      className={cn(
        'h-full w-60 bg-surface-900 border-r border-surface-800 flex flex-col no-select',
        className,
      )}
    >
      {/* Tools */}
      <div className="p-3 space-y-0.5">
        <p className="text-[10px] uppercase tracking-widest text-surface-500 px-2 mb-2">Tools</p>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
              activeTool === tool.id
                ? 'bg-accent-600/15 text-accent-400'
                : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={tool.icon} />
            </svg>
            <span className="flex-1 text-left">{tool.label}</span>
            {tool.shortcut && (
              <span className="text-[10px] text-surface-600 font-mono">{tool.shortcut}</span>
            )}
          </button>
        ))}
      </div>

      <div className="h-px bg-surface-800 mx-3" />

      {/* Sources */}
      <div className="p-3 flex-1 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-surface-500 px-2 mb-2">Sources</p>
        <div className="space-y-0.5">
          {sources.length === 0 ? (
            <div className="px-2.5 py-1.5 text-sm text-surface-500 italic">
              No sources yet
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
              >
                <SourceIcon type={source.mediaType} />
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-xs">{source.filename}</span>
                  {source.durationMs && (
                    <span className="text-[10px] text-surface-500">
                      {(source.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add buttons */}
      <div className="p-3 border-t border-surface-800 space-y-1">
        <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Text
        </button>
        <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          Add Media
        </button>
      </div>

      {/* Settings */}
      <div className="p-3 border-t border-surface-800">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}

function SourceIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    screen: 'M3 3h18v14H3zM8 21h8M12 17v4',
    mic: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2',
    camera: 'M23 7l-7 5 7 5V7zM1 5h15v14H1z',
    system_audio: 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07',
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500 flex-shrink-0">
      <path d={icons[type] || icons.screen} />
    </svg>
  );
}
