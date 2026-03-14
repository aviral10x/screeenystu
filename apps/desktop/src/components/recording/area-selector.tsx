import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Rect { x: number; y: number; width: number; height: number }

interface AreaSelectorProps {
  onSelect: (rect: Rect) => void;
  onCancel: () => void;
}

type HandleType =
  | 'nw' | 'n' | 'ne'
  | 'w'           | 'e'
  | 'sw' | 's' | 'se'
  | 'move';

const HANDLES: { id: HandleType; cx: number; cy: number; cursor: string }[] = [
  { id: 'nw', cx: 0,   cy: 0,   cursor: 'nw-resize' },
  { id: 'n',  cx: 0.5, cy: 0,   cursor: 'n-resize'  },
  { id: 'ne', cx: 1,   cy: 0,   cursor: 'ne-resize' },
  { id: 'w',  cx: 0,   cy: 0.5, cursor: 'w-resize'  },
  { id: 'e',  cx: 1,   cy: 0.5, cursor: 'e-resize'  },
  { id: 'sw', cx: 0,   cy: 1,   cursor: 'sw-resize' },
  { id: 's',  cx: 0.5, cy: 1,   cursor: 's-resize'  },
  { id: 'se', cx: 1,   cy: 1,   cursor: 'se-resize' },
];

const ASPECT_RATIOS = ['Any', '16:9', '4:3', '1:1', '9:16'];

export function AreaSelector({ onSelect, onCancel }: AreaSelectorProps) {
  const [phase, setPhase] = useState<'drawing' | 'adjusting'>('drawing');
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspect, setAspect] = useState('Any');
  const drawStart = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ handle: HandleType; startRect: Rect; startMouse: { x: number; y: number } } | null>(null);

  // ---- Drawing phase ----
  const handleOverlayDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'drawing') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drawStart.current = { x: e.clientX, y: e.clientY };
    setRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
  };

  const handleOverlayMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'drawing' || e.buttons === 0) return;
    const x = Math.min(drawStart.current.x, e.clientX);
    const y = Math.min(drawStart.current.y, e.clientY);
    const width = Math.abs(e.clientX - drawStart.current.x);
    const height = Math.abs(e.clientY - drawStart.current.y);
    setRect({ x, y, width, height });
  };

  const handleOverlayUp = () => {
    if (phase !== 'drawing') return;
    if (rect.width > 30 && rect.height > 30) {
      setPhase('adjusting');
    }
  };

  // ---- Handle drag (resize + move) ----
  const onHandleDown = (e: React.PointerEvent, handle: HandleType) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { handle, startRect: { ...rect }, startMouse: { x: e.clientX, y: e.clientY } };
  };

  const onHandleMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || e.buttons === 0) return;
    const { handle, startRect, startMouse } = dragRef.current;
    const dx = e.clientX - startMouse.x;
    const dy = e.clientY - startMouse.y;
    let { x, y, width, height } = startRect;

    if (handle === 'move') {
      x += dx; y += dy;
    } else {
      if (handle.includes('e')) width = Math.max(40, startRect.width + dx);
      if (handle.includes('s')) height = Math.max(40, startRect.height + dy);
      if (handle.includes('w')) { x = startRect.x + dx; width = Math.max(40, startRect.width - dx); }
      if (handle.includes('n')) { y = startRect.y + dy; height = Math.max(40, startRect.height - dy); }
    }
    setRect({ x, y, width, height });
  }, []);

  const onHandleUp = useCallback(() => { dragRef.current = null; }, []);

  const handleStart = () => onSelect(rect);

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ cursor: phase === 'drawing' ? 'crosshair' : 'default' }}
      onPointerDown={phase === 'drawing' ? handleOverlayDown : undefined}
      onPointerMove={phase === 'drawing' ? handleOverlayMove : onHandleMove}
      onPointerUp={phase === 'drawing' ? handleOverlayUp : onHandleUp}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      tabIndex={0}
      autoFocus
    >
      {/* Dark overlay with cutout */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Instruction tip */}
      {phase === 'drawing' && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl border border-white/10 pointer-events-none animate-pulse">
          Click and drag to select recording area · ESC to cancel
        </div>
      )}

      {(rect.width > 0 && rect.height > 0) && (
        <>
          {/* The selection frame with cutout effect */}
          <div
            className="absolute border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          >
            {/* Move handle (drag interior) */}
            {phase === 'adjusting' && (
              <div
                className="absolute inset-0"
                style={{ cursor: 'move' }}
                onPointerDown={(e) => onHandleDown(e, 'move')}
              />
            )}

            {/* Corner + edge resize handles */}
            {phase === 'adjusting' && HANDLES.map((h) => (
              <div
                key={h.id}
                className="absolute w-3 h-3 bg-white rounded-full border-2 border-[#6200ea] shadow-md z-10"
                style={{
                  left: `calc(${h.cx * 100}% - 6px)`,
                  top: `calc(${h.cy * 100}% - 6px)`,
                  cursor: h.cursor,
                }}
                onPointerDown={(e) => onHandleDown(e, h.id)}
              />
            ))}
          </div>

          {/* HUD panel */}
          {phase === 'adjusting' && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-20 flex flex-col gap-3"
                style={{
                  left: rect.x + rect.width / 2,
                  top: rect.y + rect.height + 14,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="bg-[#16171E]/95 backdrop-blur border border-[#2D2E40] rounded-xl px-4 py-3 shadow-2xl text-[13px] text-white flex flex-col gap-2.5 min-w-[300px]">
                  {/* Size & Position row */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[#A0A2B1]">
                      <span className="text-[11px] uppercase tracking-wider text-[#6B6D76]">Size</span>
                      <span className="text-white font-medium tabular-nums">{Math.round(rect.width)}</span>
                      <span className="text-[#4A4B5A]">×</span>
                      <span className="text-white font-medium tabular-nums">{Math.round(rect.height)}</span>
                      <span className="text-[#6B6D76] text-[11px]">px</span>
                    </div>
                    <div className="w-px h-3 bg-[#2D2E40]" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-[#6B6D76]">Position</span>
                      <span className="text-white font-medium tabular-nums">{Math.round(rect.x)}</span>
                      <span className="text-[#4A4B5A]">×</span>
                      <span className="text-white font-medium tabular-nums">{Math.round(rect.y)}</span>
                      <span className="text-[#6B6D76] text-[11px]">px</span>
                    </div>
                  </div>

                  {/* Aspect + Saved row */}
                  <div className="flex items-center gap-2">
                    <select
                      value={aspect}
                      onChange={(e) => setAspect(e.target.value)}
                      className="flex-1 bg-[#0D0E14] border border-[#2D2E40] rounded-lg px-2.5 py-1.5 text-[12px] text-[#D0D0DC] focus:outline-none focus:border-[#4E39FD] appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%236B6D76' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                    >
                      {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button className="flex-1 bg-[#0D0E14] border border-[#2D2E40] rounded-lg px-2.5 py-1.5 text-[12px] text-[#6B6D76] hover:text-[#D0D0DC] hover:border-[#3D3E50] transition-colors">
                      ⊡ Saved
                    </button>
                  </div>
                </div>

                {/* Start button below the HUD */}
                <button
                  onClick={handleStart}
                  className="w-full flex items-center justify-center gap-2 bg-[#4E39FD] hover:bg-[#5C4DFF] text-white font-medium py-2.5 rounded-xl text-[14px] transition-colors shadow-[0_4px_14px_rgba(78,57,253,0.4)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  Start recording
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}
    </div>
  );
}
