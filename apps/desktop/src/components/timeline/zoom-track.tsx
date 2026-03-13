import { useCallback, useRef, useState } from 'react';
import { useZoomStore, type ZoomSegment } from '@/stores/zoom-store';
import { useProjectStore } from '@/stores/project-store';

interface ZoomTrackProps {
  pixelsPerSecond: number;
  trackOffset: number;
}

export function ZoomTrack({ pixelsPerSecond, trackOffset }: ZoomTrackProps) {
  const { segments, selectedSegmentId, selectSegment, hoverSegment, updateSegment, removeSegment } =
    useZoomStore();
  const durationMs = useProjectStore((s) => s.durationMs);

  return (
    <div className="relative h-full">
      {segments.map((seg) => (
        <ZoomClip
          key={seg.id}
          segment={seg}
          isSelected={seg.id === selectedSegmentId}
          pixelsPerSecond={pixelsPerSecond}
          trackOffset={trackOffset}
          durationMs={durationMs}
          onSelect={() => selectSegment(seg.id)}
          onHover={(h) => hoverSegment(h ? seg.id : null)}
          onResize={(startMs, endMs) =>
            updateSegment(seg.id, {
              time_range: { start_ms: startMs, end_ms: endMs },
            })
          }
          onDelete={() => removeSegment(seg.id)}
        />
      ))}
    </div>
  );
}

interface ZoomClipProps {
  segment: ZoomSegment;
  isSelected: boolean;
  pixelsPerSecond: number;
  trackOffset: number;
  durationMs: number;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onResize: (startMs: number, endMs: number) => void;
  onDelete: () => void;
}

function ZoomClip({
  segment,
  isSelected,
  pixelsPerSecond,
  trackOffset,
  durationMs,
  onSelect,
  onHover,
  onResize,
  onDelete,
}: ZoomClipProps) {
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const startRef = useRef(segment.time_range.start_ms);
  const endRef = useRef(segment.time_range.end_ms);

  const left = trackOffset + (segment.time_range.start_ms / 1000) * pixelsPerSecond;
  const width = ((segment.time_range.end_ms - segment.time_range.start_ms) / 1000) * pixelsPerSecond;

  const confidenceColor = segment.auto_generated
    ? segment.confidence && segment.confidence > 0.6
      ? 'bg-emerald-600/40 border-emerald-500/60'
      : 'bg-amber-600/40 border-amber-500/60'
    : 'bg-blue-600/40 border-blue-500/60';

  const handleEdgeDrag = useCallback(
    (edge: 'left' | 'right', e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(edge);
      startRef.current = segment.time_range.start_ms;
      endRef.current = segment.time_range.end_ms;

      const startX = e.clientX;

      const onMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX;
        const deltaMs = (deltaX / pixelsPerSecond) * 1000;

        if (edge === 'left') {
          const newStart = Math.max(0, Math.round(startRef.current + deltaMs));
          if (newStart < endRef.current - 200) {
            onResize(newStart, endRef.current);
          }
        } else {
          const newEnd = Math.min(durationMs, Math.round(endRef.current + deltaMs));
          if (newEnd > startRef.current + 200) {
            onResize(startRef.current, newEnd);
          }
        }
      };

      const onUp = () => {
        setIsDragging(null);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [segment, pixelsPerSecond, durationMs, onResize],
  );

  return (
    <div
      className={`absolute top-0.5 bottom-0.5 rounded cursor-pointer border transition-colors ${confidenceColor} ${
        isSelected ? 'ring-1 ring-white/50' : ''
      }`}
      style={{ left: `${left}px`, width: `${Math.max(width, 4)}px` }}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        onDelete();
      }}
    >
      {/* Scale badge */}
      {width > 30 && (
        <span className="absolute top-0.5 left-1 text-[8px] font-mono text-white/80 leading-none">
          {segment.scale.toFixed(1)}×
        </span>
      )}

      {/* Left edge handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-white/30 rounded-l"
        onMouseDown={(e) => handleEdgeDrag('left', e)}
      />

      {/* Right edge handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-white/30 rounded-r"
        onMouseDown={(e) => handleEdgeDrag('right', e)}
      />
    </div>
  );
}
