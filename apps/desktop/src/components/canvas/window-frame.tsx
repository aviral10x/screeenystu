import { useCanvasStore } from '@/stores/canvas-store';

export type FrameStyle = 'none' | 'macos' | 'browser' | 'clean';

interface WindowFrameProps {
  children: React.ReactNode;
}

/**
 * Wraps video content in a window frame mockup.
 * The frame style is read from the canvas store.
 */
export function WindowFrame({ children }: WindowFrameProps) {
  const frameStyle = useCanvasStore((s) => s.frameStyle ?? 'none');

  if (frameStyle === 'none') {
    return <div className="w-full h-full">{children}</div>;
  }

  if (frameStyle === 'macos') {
    return (
      <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
        {/* macOS title bar */}
        <div className="flex items-center h-8 px-3 bg-[#2d2d2d] border-b border-[#1a1a1a] flex-shrink-0">
          {/* Traffic lights */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
          </div>
          {/* Title */}
          <div className="flex-1 text-center">
            <span className="text-[11px] text-[#999] font-medium">Screen Recording</span>
          </div>
          <div className="w-14" />
        </div>
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  if (frameStyle === 'browser') {
    return (
      <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
        {/* Browser chrome */}
        <div className="flex items-center h-10 px-3 bg-[#292929] border-b border-[#1a1a1a] flex-shrink-0 gap-2">
          {/* Traffic lights */}
          <div className="flex items-center gap-2 mr-3">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          {/* nav buttons */}
          <div className="flex items-center gap-1 text-[#666]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </div>
          {/* URL bar */}
          <div className="flex-1 h-7 rounded-md bg-[#1a1a1a] border border-[#333] flex items-center px-3 mx-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" className="mr-2 flex-shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-[11px] text-[#888] truncate">localhost:3000</span>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // clean frame
  return (
    <div className="w-full h-full flex flex-col">
      {/* Subtle top bar */}
      <div className="h-2 bg-gradient-to-b from-white/5 to-transparent flex-shrink-0" />
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
