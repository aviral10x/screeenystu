import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AreaSelectorProps {
  onSelect: (rect: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

export function AreaSelector({ onSelect, onCancel }: AreaSelectorProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    if (width > 50 && height > 50) {
      onSelect({ x, y, width, height });
    } else {
      onCancel();
    }
  };

  const minX = Math.min(startPoint.x, currentPoint.x);
  const minY = Math.min(startPoint.y, currentPoint.y);
  const w = Math.abs(currentPoint.x - startPoint.x);
  const h = Math.abs(currentPoint.y - startPoint.y);

  return (
    <div
      className="fixed inset-0 z-[9999] cursor-crosshair bg-black/40 backdrop-blur-[2px]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      tabIndex={0}
      autoFocus
    >
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-surface-900/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl border border-surface-700 pointer-events-none animate-pulse">
        Click and drag to select recording area. Press ESC to cancel.
      </div>
      
      {isDrawing && (
        <div
          className="absolute border-2 border-accent-500 bg-accent-500/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            left: minX,
            top: minY,
            width: w,
            height: h,
          }}
        >
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {Math.round(w)} x {Math.round(h)}
          </div>
        </div>
      )}
    </div>
  );
}
