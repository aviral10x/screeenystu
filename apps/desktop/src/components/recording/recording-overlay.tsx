import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useRecordingStore } from '@/stores/recording-store';
import { useUIStore } from '@/stores/ui-store';
import { recordingCommands, projectCommands } from '@/hooks/use-tauri-command';
import { motion } from 'framer-motion';

interface CaptureEvent {
  event: string;
  output_dir?: string;
  elapsed_ms?: number;
  duration_ms?: number;
  state?: string;
  files?: Record<string, string>;
}

export function RecordingOverlay() {
  const { status, elapsedMs, micEnabled, cameraEnabled, setStatus, setElapsed, setCaptureOutputDir, reset } =
    useRecordingStore();
  const setView = useUIStore((s) => s.setView);
  const unlistenRef = useRef<(() => void) | null>(null);

  // Listen for capture events from the Rust backend
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<CaptureEvent>('recording-event', (event) => {
        const data = event.payload;

        switch (data.event) {
          case 'started':
            if (data.output_dir) setCaptureOutputDir(data.output_dir);
            break;
          case 'progress':
            if (data.elapsed_ms !== undefined) setElapsed(data.elapsed_ms);
            break;
          case 'paused':
            setStatus('paused');
            break;
          case 'resumed':
            setStatus('recording');
            break;
          case 'stopped':
            handleRecordingStopped(data);
            break;
        }
      });
      unlistenRef.current = unlisten;
    };
    setupListener();

    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const handleRecordingStopped = async (data: CaptureEvent) => {
    setStatus('finishing');

    if (data.output_dir) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await projectCommands.createFromRecording(`Recording ${timestamp}`, data.output_dir);
        setView('editor');
      } catch (e) {
        console.error('Failed to create project from recording:', e);
      }
    }

    reset();
  };

  const handlePauseResume = async () => {
    try {
      if (status === 'recording') {
        await recordingCommands.pauseRecording();
        setStatus('paused');
      } else if (status === 'paused') {
        await recordingCommands.resumeRecording();
        setStatus('recording');
      }
    } catch (e) {
      console.error('Failed to pause/resume:', e);
    }
  };

  const handleStop = async () => {
    try {
      await recordingCommands.stopRecording();
    } catch (e) {
      console.error('Failed to stop recording:', e);
    }
  };

  const handleFlag = async () => {
    try {
      await recordingCommands.addFlag();
    } catch (e) {
      console.error('Failed to add flag:', e);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (status !== 'recording' && status !== 'paused') return null;

  return (
    <div className="flex-1 flex items-end justify-center pb-8">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-900/95 backdrop-blur-xl border border-surface-700/50 shadow-2xl"
      >
        {/* Recording indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-surface-700">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
            }`}
          />
          <span className="text-sm font-mono text-surface-200 min-w-[60px]">
            {formatTime(elapsedMs)}
          </span>
        </div>

        {/* Mic/Camera indicators */}
        <div className="flex items-center gap-1.5 pr-3 border-r border-surface-700">
          {micEnabled && (
            <div className="w-6 h-6 rounded-full bg-surface-800 flex items-center justify-center" title="Mic on">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </div>
          )}
          {cameraEnabled && (
            <div className="w-6 h-6 rounded-full bg-surface-800 flex items-center justify-center" title="Camera on">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Flag button */}
          <button
            onClick={handleFlag}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-yellow-400 transition-colors"
            title="Add flag"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>

          {/* Pause/Resume */}
          <button
            onClick={handlePauseResume}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-300 hover:bg-surface-800 hover:text-white transition-colors"
            title={status === 'recording' ? 'Pause' : 'Resume'}
          >
            {status === 'recording' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Stop */}
          <button
            onClick={handleStop}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-600/30"
            title="Stop recording"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
