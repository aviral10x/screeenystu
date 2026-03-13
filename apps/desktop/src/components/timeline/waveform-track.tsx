import { useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface WaveformTrackProps {
  /** Path to audio file */
  audioPath: string | null;
  /** Duration in milliseconds */
  durationMs: number;
  /** Pixels per second for scaling */
  pixelsPerSecond: number;
  /** Track offset (left margin for labels) */
  trackOffset: number;
  /** Color of the waveform */
  color?: string;
}

export function WaveformTrack({
  audioPath,
  durationMs,
  pixelsPerSecond,
  trackOffset,
  color = '#6366f1',
}: WaveformTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);

  // Decode audio file and extract peak data
  useEffect(() => {
    if (!audioPath) return;

    let cancelled = false;

    async function decodePeaks() {
      try {
        const src = convertFileSrc(audioPath!);
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();

        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Downsample to ~4 peaks per pixel
        const channelData = audioBuffer.getChannelData(0);
        const totalWidth = (durationMs / 1000) * pixelsPerSecond;
        const samplesPerPeak = Math.max(1, Math.floor(channelData.length / (totalWidth * 4)));
        const numPeaks = Math.ceil(channelData.length / samplesPerPeak);

        const peakData = new Float32Array(numPeaks);
        for (let i = 0; i < numPeaks; i++) {
          let max = 0;
          const start = i * samplesPerPeak;
          const end = Math.min(start + samplesPerPeak, channelData.length);
          for (let j = start; j < end; j++) {
            const abs = Math.abs(channelData[j]);
            if (abs > max) max = abs;
          }
          peakData[i] = max;
        }

        if (!cancelled) {
          setPeaks(peakData);
        }

        audioCtx.close();
      } catch (e) {
        console.error('Failed to decode audio for waveform:', e);
      }
    }

    decodePeaks();
    return () => { cancelled = true; };
  }, [audioPath, durationMs, pixelsPerSecond]);

  // Render waveform to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const barWidth = Math.max(1, width / peaks.length);
    const centerY = height / 2;
    const maxAmp = height / 2 - 1;

    ctx.fillStyle = color;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const amp = peaks[i] * maxAmp;

      if (amp < 0.5) continue;

      ctx.globalAlpha = 0.4 + peaks[i] * 0.6;
      ctx.fillRect(x, centerY - amp, Math.max(barWidth - 0.5, 0.5), amp * 2);
    }

    ctx.globalAlpha = 1;
  }, [peaks, color]);

  const totalWidth = (durationMs / 1000) * pixelsPerSecond;

  return (
    <div className="relative h-full" style={{ paddingLeft: `${trackOffset}px` }}>
      {peaks ? (
        <canvas
          ref={canvasRef}
          className="h-full"
          style={{ width: `${totalWidth}px` }}
        />
      ) : (
        <div
          className="h-full flex items-center"
          style={{ width: `${totalWidth}px` }}
        >
          {audioPath && (
            <div className="flex items-center gap-1.5 px-2 text-surface-600">
              <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="30 70" />
              </svg>
              <span className="text-[9px]">Loading waveform...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
