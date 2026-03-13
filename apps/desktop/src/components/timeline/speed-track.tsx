import { useCallback, useState } from 'react';
import { tauriCommand } from '@/hooks/use-tauri-command';
import { useProjectStore } from '@/stores/project-store';

interface SpeedSegment {
  id: string;
  time_range: { start_ms: number; end_ms: number };
  speed: number;
  preserve_pitch: boolean;
  mute_audio: boolean;
  auto_detected: boolean;
}

interface SpeedTrackProps {
  segments: SpeedSegment[];
  pixelsPerSecond: number;
  trackOffset: number;
  onSegmentsChange: (segments: SpeedSegment[]) => void;
}

export function SpeedTrack({ segments, pixelsPerSecond, trackOffset, onSegmentsChange }: SpeedTrackProps) {
  const durationMs = useProjectStore((s) => s.durationMs);

  const handleAddSpeed = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const timeMs = Math.round((x / pixelsPerSecond) * 1000);
      const startMs = Math.max(0, timeMs - 1000);
      const endMs = Math.min(durationMs, timeMs + 1000);

      try {
        const id = await tauriCommand<string>('add_speed_segment', {
          startMs,
          endMs,
          speed: 2.0,
          preservePitch: true,
        });
        onSegmentsChange([
          ...segments,
          {
            id,
            time_range: { start_ms: startMs, end_ms: endMs },
            speed: 2.0,
            preserve_pitch: true,
            mute_audio: false,
            auto_detected: false,
          },
        ]);
      } catch (e) {
        console.error('Failed to add speed segment:', e);
      }
    },
    [segments, pixelsPerSecond, durationMs, onSegmentsChange],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await tauriCommand('remove_speed_segment', { segmentId: id });
        onSegmentsChange(segments.filter((s) => s.id !== id));
      } catch (e) {
        console.error('Failed to remove speed segment:', e);
      }
    },
    [segments, onSegmentsChange],
  );

  return (
    <div className="relative h-full" onDoubleClick={handleAddSpeed}>
      {segments.map((seg) => {
        const left = trackOffset + (seg.time_range.start_ms / 1000) * pixelsPerSecond;
        const width = ((seg.time_range.end_ms - seg.time_range.start_ms) / 1000) * pixelsPerSecond;

        const speedColor = seg.speed > 1
          ? 'bg-orange-600/40 border-orange-500/60'
          : seg.speed < 1
            ? 'bg-blue-600/40 border-blue-500/60'
            : 'bg-surface-600/40 border-surface-500/60';

        return (
          <div
            key={seg.id}
            className={`absolute top-0.5 bottom-0.5 rounded border cursor-pointer ${speedColor}`}
            style={{ left: `${left}px`, width: `${Math.max(width, 4)}px` }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleRemove(seg.id);
            }}
          >
            {width > 24 && (
              <span className="absolute top-0.5 left-1 text-[8px] font-mono text-white/80 leading-none">
                {seg.speed}×
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
