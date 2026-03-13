import { useCallback, useRef } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { tauriCommand } from '@/hooks/use-tauri-command';

interface TrimHandlesProps {
  pixelsPerSecond: number;
  trackOffset: number;
  durationMs: number;
  clipWidth: number;
}

export function TrimHandles({ pixelsPerSecond, trackOffset, durationMs, clipWidth }: TrimHandlesProps) {
  const { trimStartMs, trimEndMs, setTrim } = useProjectStore();

  const trimStart = trimStartMs ?? 0;
  const trimEnd = trimEndMs ?? durationMs;

  const leftPx = trackOffset + (trimStart / 1000) * pixelsPerSecond;
  const rightPx = trackOffset + (trimEnd / 1000) * pixelsPerSecond;

  const handleDrag = useCallback(
    (edge: 'left' | 'right', e: React.MouseEvent) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startVal = edge === 'left' ? trimStart : trimEnd;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const deltaMs = (delta / pixelsPerSecond) * 1000;
        const newVal = Math.round(Math.max(0, Math.min(durationMs, startVal + deltaMs)));

        if (edge === 'left') {
          if (newVal < trimEnd - 500) {
            setTrim(newVal, trimEnd);
          }
        } else {
          if (newVal > trimStart + 500) {
            setTrim(trimStart, newVal);
          }
        }
      };

      const onUp = () => {
        // Sync to backend
        const state = useProjectStore.getState();
        tauriCommand('set_trim', {
          startMs: state.trimStartMs ?? 0,
          endMs: state.trimEndMs ?? durationMs,
        }).catch(() => {});

        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [trimStart, trimEnd, pixelsPerSecond, durationMs, setTrim],
  );

  return (
    <>
      {/* Left dimmed region */}
      {trimStart > 0 && (
        <div
          className="absolute inset-y-0 bg-black/40 rounded-l"
          style={{ left: `${trackOffset}px`, width: `${leftPx - trackOffset}px` }}
        />
      )}

      {/* Right dimmed region */}
      {trimEnd < durationMs && (
        <div
          className="absolute inset-y-0 bg-black/40 rounded-r"
          style={{
            left: `${rightPx}px`,
            width: `${trackOffset + clipWidth - rightPx}px`,
          }}
        />
      )}

      {/* Left handle */}
      <div
        className="absolute top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
        style={{ left: `${leftPx - 1}px` }}
        onMouseDown={(e) => handleDrag('left', e)}
      >
        <div className="absolute inset-y-0.5 w-1 rounded bg-yellow-500/80 group-hover:bg-yellow-400 transition-colors" />
      </div>

      {/* Right handle */}
      <div
        className="absolute top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
        style={{ left: `${rightPx - 0.5}px` }}
        onMouseDown={(e) => handleDrag('right', e)}
      >
        <div className="absolute inset-y-0.5 w-1 rounded bg-yellow-500/80 group-hover:bg-yellow-400 transition-colors" />
      </div>
    </>
  );
}
