import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useZoomStore } from '@/stores/zoom-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { CursorOverlay } from './cursor-overlay';
import { WindowFrame } from './window-frame';
import { WebcamOverlay } from './webcam-overlay';

export function PreviewCanvas() {
  const { projectId, playheadMs, isPlaying, durationMs, setPlayhead, setDuration, setPlaying } =
    useProjectStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { background, padding, cornerRadius, shadowEnabled, shadowIntensity, webcam, aspectRatio } =
    useCanvasStore();

  const videoSrc = projectId ? getVideoSrc() : null;
  const activeZoom = useZoomStore((s) => s.getActiveSegment(playheadMs));

  // Compute zoom transform
  const zoomTransform = useMemo(() => {
    if (!activeZoom) return { scale: 1, x: 0, y: 0 };

    const rect = activeZoom.target_rect;
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    const { start_ms, end_ms } = activeZoom.time_range;
    const transIn = activeZoom.transition_in_ms;
    const transOut = activeZoom.transition_out_ms;

    let scale = activeZoom.scale;
    const elapsed = playheadMs - start_ms;
    const remaining = end_ms - playheadMs;

    if (elapsed < transIn && transIn > 0) {
      const t = elapsed / transIn;
      scale = 1 + (activeZoom.scale - 1) * t * t * (3 - 2 * t);
    } else if (remaining < transOut && transOut > 0) {
      const t = remaining / transOut;
      scale = 1 + (activeZoom.scale - 1) * t * t * (3 - 2 * t);
    }

    const translateX = -(centerX - 0.5) * 100 * (scale - 1);
    const translateY = -(centerY - 0.5) * 100 * (scale - 1);

    return { scale, x: translateX, y: translateY };
  }, [activeZoom, playheadMs]);

  // Aspect ratio dimensions
  const aspectRatioStyle = useMemo(() => {
    const ratios: Record<string, string> = {
      '16:9': '16/9',
      '9:16': '9/16',
      '1:1': '1/1',
      '16:10': '16/10',
      '4:3': '4/3',
      auto: '16/9',
    };
    return ratios[aspectRatio] || '16/9';
  }, [aspectRatio]);

  // Sync video
  useEffect(() => {
    if (!videoRef.current || !isPlaying) return;
    if (Math.abs(videoRef.current.currentTime * 1000 - playheadMs) > 200) {
      videoRef.current.currentTime = playheadMs / 1000;
    }
  }, [playheadMs]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration * 1000);
  }, [setDuration]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) setPlayhead(videoRef.current.currentTime * 1000);
  }, [isPlaying, setPlayhead]);

  useEffect(() => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
  }, [isPlaying]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setPlayhead(0);
  }, [setPlaying, setPlayhead]);

  // Background style
  const bgStyle = useMemo(() => {
    if (background.gradient) return { background: background.gradient };
    if (background.color) return { backgroundColor: background.color };
    return { backgroundColor: '#09090b' };
  }, [background]);

  // Shadow style
  const videoShadow = shadowEnabled
    ? `0 ${20 * shadowIntensity}px ${60 * shadowIntensity}px rgba(0,0,0,${0.3 + 0.4 * shadowIntensity}), 0 ${8 * shadowIntensity}px ${20 * shadowIntensity}px rgba(0,0,0,${0.2 + 0.3 * shadowIntensity})`
    : 'none';

  if (!videoSrc) {
    return (
      <div className="h-full w-full bg-surface-950 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-3xl overflow-hidden"
          style={{ ...bgStyle, aspectRatio: aspectRatioStyle, borderRadius: '16px' }}
        >
          <div
            className="absolute bg-surface-900 border border-surface-700 flex items-center justify-center"
            style={{
              inset: `${padding}px`,
              borderRadius: `${cornerRadius}px`,
              boxShadow: videoShadow,
            }}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-surface-800 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <p className="text-surface-500 text-sm">No recording loaded</p>
              <p className="text-surface-600 text-xs">Record or open a project to get started</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-surface-950 flex items-center justify-center p-4"
    >
      {/* Composed canvas */}
      <div
        className="relative w-full max-w-4xl overflow-hidden"
        style={{ ...bgStyle, aspectRatio: aspectRatioStyle, borderRadius: '16px' }}
      >
        {/* Video frame with padding and styling */}
        <div
          className="absolute overflow-hidden"
          style={{
            inset: `${padding}px`,
            borderRadius: `${cornerRadius}px`,
            boxShadow: videoShadow,
          }}
        >
          {/* Window frame mockup (wraps video) */}
          <WindowFrame>
            {/* Zoom transform wrapper */}
            <div
              style={{
                transform: `scale(${zoomTransform.scale}) translate(${zoomTransform.x}%, ${zoomTransform.y}%)`,
                transformOrigin: 'center center',
                transition: isPlaying ? 'none' : 'transform 0.3s ease',
                width: '100%',
                height: '100%',
              }}
            >
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain bg-black"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                playsInline
                muted={false}
              />
            </div>
          </WindowFrame>

          {/* Cursor overlay */}
          <CursorOverlay
            cursorPoints={[]}
            clickEvents={[]}
            keyboardEvents={[]}
            sourceWidth={1920}
            sourceHeight={1080}
            containerWidth={containerRef.current?.clientWidth ?? 1920}
            containerHeight={containerRef.current?.clientHeight ?? 1080}
          />
        </div>

        {/* Webcam overlay */}
        {webcam.visible && (
          <WebcamOverlay
            webcam={webcam}
            canvasPadding={padding}
          />
        )}

        {/* Play overlay when paused */}
        {!isPlaying && durationMs > 0 && (
          <div
            className="absolute flex items-center justify-center cursor-pointer bg-black/10 hover:bg-black/20 transition-colors"
            style={{
              inset: `${padding}px`,
              borderRadius: `${cornerRadius}px`,
            }}
            onClick={() => setPlaying(true)}
          >
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="black" className="ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        )}

        {/* Zoom indicator */}
        {activeZoom && (
          <div
            className="absolute px-2 py-1 rounded-md bg-black/60 text-white text-xs font-mono backdrop-blur-sm"
            style={{ top: `${padding + 8}px`, right: `${padding + 8}px` }}
          >
            {zoomTransform.scale.toFixed(1)}×
          </div>
        )}
      </div>
    </div>
  );
}

function getVideoSrc(): string | null {
  return null;
}
