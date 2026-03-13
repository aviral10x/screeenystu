import { useRef, useCallback, useMemo, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useZoomStore } from '@/stores/zoom-store';
import { ZoomTrack } from './zoom-track';
import { WaveformTrack } from './waveform-track';
import { TrimHandles } from './trim-handles';
import { SpeedTrack } from './speed-track';
import { Button } from '../ui/button';
import { tauriCommand } from '@/hooks/use-tauri-command';

export function TimelinePanel() {
  const { playheadMs, isPlaying, durationMs, setPlaying, setPlayhead, activeTool, projectId, projectPath, sources } = useProjectStore();
  const { segments, setSegments, isAnalyzing, setAnalyzing } = useZoomStore();
  const [speedSegments, setSpeedSegments] = useState<any[]>([]);
  const rulerRef = useRef<HTMLDivElement>(null);

  const micSrc = useMemo(() => {
    if (!projectId || !projectPath) return null;
    const micSource = sources.find((s) => s.mediaType === 'mic');
    if (!micSource || !micSource.relativePath) return null;
    return `${projectPath}/${micSource.relativePath}`;
  }, [projectId, projectPath, sources]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const frames = Math.floor((ms % 1000) / (1000 / 30));
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const pixelsPerSecond = 80;
  const trackLabelWidth = 112;
  const totalSeconds = Math.ceil(durationMs / 1000) || 10;

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!rulerRef.current || durationMs === 0) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - trackLabelWidth;
      const timelinePx = totalSeconds * pixelsPerSecond;
      const ratio = Math.max(0, Math.min(1, x / timelinePx));
      setPlayhead(ratio * durationMs);
    },
    [durationMs, setPlayhead, totalSeconds],
  );

  const handleAutoZoom = useCallback(async () => {
    setAnalyzing(true);
    try {
      const result = await tauriCommand<string>('analyze_zoom');
      const newSegments = JSON.parse(result);
      setSegments(newSegments);
      await tauriCommand('apply_zoom_suggestions', { segmentsJson: result });
    } catch (e) {
      console.error('Auto zoom failed:', e);
    } finally {
      setAnalyzing(false);
    }
  }, [setSegments, setAnalyzing]);

  const handleSplit = useCallback(async () => {
    try {
      await tauriCommand('split_at_playhead', { playheadMs });
    } catch (e) {
      console.error('Split failed:', e);
    }
  }, [playheadMs]);

  const rulerMarks = useMemo(() => {
    const marks = [];
    for (let i = 0; i <= totalSeconds; i++) marks.push(i);
    return marks;
  }, [totalSeconds]);

  const clipWidth = (durationMs / 1000) * pixelsPerSecond;

  return (
    <div className="h-full flex flex-col bg-surface-900 no-select">
      {/* Transport controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPlayhead(0)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPlaying(!isPlaying)}
            className="hover:bg-accent-600/20 hover:text-accent-400"
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setPlayhead(durationMs)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </Button>

          <div className="w-px h-5 bg-surface-700 mx-2" />

          {/* Auto Zoom */}
          <button
            onClick={handleAutoZoom}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="30 70" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M11 8v6M8 11h6" />
              </svg>
            )}
            Auto Zoom
          </button>

          {/* Split */}
          <button
            onClick={handleSplit}
            className="flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20" />
            </svg>
            Split
          </button>
        </div>

        {/* Time display */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-surface-200">{formatTime(playheadMs)}</span>
          <span className="text-surface-600">/</span>
          <span className="text-surface-400">{formatTime(durationMs)}</span>
        </div>

        {/* Info */}
        <div className="flex items-center gap-2 text-[10px] text-surface-500">
          {segments.length > 0 && <span>{segments.length} zooms</span>}
          {speedSegments.length > 0 && <span>{speedSegments.length} speed</span>}
          <span className="uppercase">{activeTool}</span>
        </div>
      </div>

      {/* Timeline ruler + tracks area */}
      <div className="flex-1 relative overflow-hidden" ref={rulerRef} onClick={handleSeek}>
        {/* Ruler */}
        <div className="h-6 border-b border-surface-800 bg-surface-900/50 flex items-end" style={{ paddingLeft: `${trackLabelWidth}px` }}>
          {rulerMarks.map((sec) => (
            <div key={sec} className="flex-shrink-0" style={{ width: pixelsPerSecond }}>
              <div className="text-[9px] text-surface-600 px-1">{sec > 0 ? `${sec}s` : ''}</div>
              <div className="h-1 border-l border-surface-700" />
            </div>
          ))}
        </div>

        {/* Track lanes */}
        <div className="flex-1 relative">
          {/* Main recording track with trim handles */}
          <div className="h-10 flex items-center border-b border-surface-800/50">
            <div className="w-28 flex-shrink-0 px-3 text-[10px] text-surface-500 uppercase tracking-wider">
              Recording
            </div>
            <div className="flex-1 h-6 mx-2 relative">
              {durationMs > 0 ? (
                <>
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-accent-600/20 border border-accent-500/30 overflow-hidden"
                    style={{ width: `${clipWidth}px` }}
                  >
                    <WaveformTrack
                      audioPath={micSrc}
                      durationMs={durationMs}
                      pixelsPerSecond={pixelsPerSecond}
                      trackOffset={0}
                      color="#818cf8"
                    />
                  </div>
                  <TrimHandles
                    pixelsPerSecond={pixelsPerSecond}
                    trackOffset={0}
                    durationMs={durationMs}
                    clipWidth={clipWidth}
                  />
                </>
              ) : (
                <div className="h-full rounded bg-surface-800/50 border border-surface-700/50" />
              )}
            </div>
          </div>

          {/* Zoom track */}
          <div className="h-7 flex items-center border-b border-surface-800/50">
            <div className="w-28 flex-shrink-0 px-3 text-[10px] text-surface-500 uppercase tracking-wider">
              Zooms
            </div>
            <div className="flex-1 h-5 mx-2 relative">
              <ZoomTrack pixelsPerSecond={pixelsPerSecond} trackOffset={0} />
            </div>
          </div>

          {/* Speed track */}
          <div className="h-7 flex items-center border-b border-surface-800/50">
            <div className="w-28 flex-shrink-0 px-3 text-[10px] text-surface-500 uppercase tracking-wider">
              Speed
            </div>
            <div className="flex-1 h-5 mx-2 relative">
              <SpeedTrack
                segments={speedSegments}
                pixelsPerSecond={pixelsPerSecond}
                trackOffset={0}
                onSegmentsChange={setSpeedSegments}
              />
            </div>
          </div>

          {/* Captions track */}
          <div className="h-7 flex items-center border-b border-surface-800/50">
            <div className="w-28 flex-shrink-0 px-3 text-[10px] text-surface-500 uppercase tracking-wider">
              Captions
            </div>
            <div className="flex-1 h-4 mx-2" />
          </div>

          {/* Playhead */}
          {durationMs > 0 && (
            <div
              className="absolute top-0 bottom-0 w-px bg-accent-500 pointer-events-none z-10"
              style={{
                left: `calc(${trackLabelWidth}px + ${(playheadMs / durationMs) * (totalSeconds * pixelsPerSecond)}px)`,
              }}
            >
              <div className="w-3 h-3 -ml-1.5 bg-accent-500 rounded-b-sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
