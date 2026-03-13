import { useEffect, useRef, useCallback } from 'react';
import { type WebcamLayout } from '@/stores/canvas-store';

interface WebcamOverlayProps {
  webcam: WebcamLayout;
  canvasPadding: number;
  cameraSrc?: string | null;
  playheadMs?: number;
  isPlaying?: boolean;
}

/**
 * Renders the webcam preview overlay on the canvas.
 */
export function WebcamOverlay({ webcam, canvasPadding, cameraSrc, playheadMs = 0, isPlaying = false }: WebcamOverlayProps) {
  const size = `${webcam.size * 100}%`;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Synchronize camera video with main playhead
  useEffect(() => {
    if (!videoRef.current || !isPlaying) return;
    if (Math.abs(videoRef.current.currentTime * 1000 - playheadMs) > 200) {
      videoRef.current.currentTime = playheadMs / 1000;
    }
  }, [playheadMs, isPlaying]);

  useEffect(() => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
  }, [isPlaying]);

  // Position mapping
  const positions: Record<string, { bottom: string; right: string; top?: string; left?: string }> = {
    'bottom-right': { bottom: `${canvasPadding + 16}px`, right: `${canvasPadding + 16}px` },
    'bottom-left': { bottom: `${canvasPadding + 16}px`, left: `${canvasPadding + 16}px`, right: 'auto' },
    'top-right': { top: `${canvasPadding + 16}px`, right: `${canvasPadding + 16}px`, bottom: 'auto' },
    'top-left': { top: `${canvasPadding + 16}px`, left: `${canvasPadding + 16}px`, bottom: 'auto', right: 'auto' },
  };

  const pos = webcam.position === 'custom'
    ? { left: `${webcam.customX * 100}%`, top: `${webcam.customY * 100}%`, bottom: 'auto', right: 'auto' }
    : positions[webcam.position] || positions['bottom-right'];

  const borderRadius = webcam.shape === 'circle'
    ? '50%'
    : webcam.shape === 'rounded'
      ? `${webcam.cornerRadius}px`
      : '4px';

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        width: size,
        aspectRatio: '1/1',
        ...pos,
        borderRadius,
        border: `${webcam.borderWidth}px solid ${webcam.borderColor}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {cameraSrc ? (
        <video
          ref={videoRef}
          src={cameraSrc}
          className="w-full h-full object-cover bg-surface-900"
          playsInline
          muted={true}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
      )}
    </div>
  );
}
