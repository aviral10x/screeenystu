import { useEffect, useCallback, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useRecordingStore } from '@/stores/recording-store';
import { useUIStore } from '@/stores/ui-store';
import { recordingCommands, sourceCommands, projectCommands } from '@/hooks/use-tauri-command';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

export function RecordingSetup() {
  const {
    target,
    setTarget,
    micEnabled,
    toggleMic,
    cameraEnabled,
    toggleCamera,
    systemAudioEnabled,
    toggleSystemAudio,
    displays,
    setDisplays,
    windows,
    setWindows,
    mics,
    setMics,
    cameras,
    setCameras,
    selectedDisplayId,
    selectDisplay,
    selectedWindowId,
    selectWindow,
    countdownSeconds,
    setCountdown,
    setStatus,
    setCaptureOutputDir,
    setElapsed,
  } = useRecordingStore();

  const setView = useUIStore((s) => s.setView);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdownValue] = useState<number | null>(null);

  // Load available sources on mount
  useEffect(() => {
    async function loadSources() {
      try {
        const [displaysRes, windowsRes, micsRes, camerasRes] = await Promise.allSettled([
          sourceCommands.listDisplays(),
          sourceCommands.listWindows(),
          sourceCommands.listMics(),
          sourceCommands.listCameras(),
        ]);

        if (displaysRes.status === 'fulfilled') {
          const data = JSON.parse(displaysRes.value);
          setDisplays(data.displays || []);
        }
        if (windowsRes.status === 'fulfilled') {
          const data = JSON.parse(windowsRes.value);
          setWindows(data.windows || []);
        }
        if (micsRes.status === 'fulfilled') {
          const data = JSON.parse(micsRes.value);
          setMics(data.devices || []);
        }
        if (camerasRes.status === 'fulfilled') {
          const data = JSON.parse(camerasRes.value);
          setCameras(data.cameras || []);
        }
      } catch (e) {
        console.error('Failed to load sources:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSources();
  }, []);

  // Start recording with countdown
  const handleStartRecording = useCallback(async () => {
    setStatus('countdown');

    // Countdown
    for (let i = countdownSeconds; i > 0; i--) {
      setCountdownValue(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdownValue(null);

    // Build config
    const config: Record<string, unknown> = {
      mic_enabled: micEnabled,
      camera_enabled: cameraEnabled,
      system_audio_enabled: systemAudioEnabled,
      fps: 60,
    };

    if (target === 'fullscreen') {
      config.target = { type: 'FullDisplay', display_id: selectedDisplayId ?? 1 };
    } else if (target === 'window') {
      config.target = { type: 'Window', window_id: selectedWindowId ?? 0 };
    }

    try {
      setStatus('recording');
      setElapsed(0);
      await recordingCommands.startRecording(config);
    } catch (e) {
      console.error('Failed to start recording:', e);
      setStatus('idle');
    }
  }, [target, selectedDisplayId, selectedWindowId, micEnabled, cameraEnabled, systemAudioEnabled, countdownSeconds]);

  if (countdown !== null) {
    return <CountdownOverlay seconds={countdown} />;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">New Recording</h2>
          <p className="text-surface-400 text-sm">Choose what to record</p>
        </div>

        {/* Target selection */}
        <div className="space-y-3">
          <label className="text-xs text-surface-400 uppercase tracking-wider">Record</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'fullscreen' as const, label: 'Full Screen', icon: 'M3 3h7v2H5v5H3V3zM14 3h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zM17 19v-5h2v7h-7v-2h5z' },
              { value: 'window' as const, label: 'Window', icon: 'M3 3h18v18H3V3zm2 4v12h14V7H5z' },
              { value: 'area' as const, label: 'Area', icon: 'M4 7V4h3M4 17v3h3M17 4h3v3M20 17v3h-3M7 7h10v10H7z' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTarget(opt.value)}
                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                  target === opt.value
                    ? 'border-accent-500 bg-accent-600/10 text-accent-400'
                    : 'border-surface-700 bg-surface-800/50 text-surface-300 hover:border-surface-600'
                }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={opt.icon} />
                </svg>
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Display selector (for fullscreen) */}
        {target === 'fullscreen' && displays.length > 1 && (
          <div className="space-y-2">
            <label className="text-xs text-surface-400 uppercase tracking-wider">Display</label>
            <div className="flex gap-2">
              {displays.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectDisplay(d.id)}
                  className={`flex-1 p-3 rounded-lg border text-sm transition-all ${
                    selectedDisplayId === d.id
                      ? 'border-accent-500 bg-accent-600/10 text-accent-400'
                      : 'border-surface-700 text-surface-300 hover:border-surface-600'
                  }`}
                >
                  {d.is_main ? 'Main Display' : `Display ${d.id}`}
                  <span className="block text-xs text-surface-500 mt-0.5">
                    {d.width}×{d.height}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Window selector */}
        {target === 'window' && (
          <div className="space-y-2">
            <label className="text-xs text-surface-400 uppercase tracking-wider">Window</label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-700 bg-surface-800/50">
              {windows.length === 0 ? (
                <p className="p-3 text-sm text-surface-500">No windows available</p>
              ) : (
                windows.map((w) => (
                  <button
                    key={w.window_id}
                    onClick={() => selectWindow(w.window_id)}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-surface-800 last:border-0 transition-colors ${
                      selectedWindowId === w.window_id
                        ? 'bg-accent-600/10 text-accent-400'
                        : 'text-surface-300 hover:bg-surface-700'
                    }`}
                  >
                    <span className="block font-medium">{w.title || 'Untitled'}</span>
                    <span className="text-xs text-surface-500">{w.app_name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Audio/Camera toggles */}
        <div className="space-y-3">
          <label className="text-xs text-surface-400 uppercase tracking-wider">Inputs</label>
          <div className="space-y-2">
            <ToggleRow label="Microphone" enabled={micEnabled} onToggle={toggleMic} />
            <ToggleRow label="System Audio" enabled={systemAudioEnabled} onToggle={toggleSystemAudio} />
            <ToggleRow label="Camera" enabled={cameraEnabled} onToggle={toggleCamera} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setView('home')}>
            Cancel
          </Button>
          <button
            onClick={handleStartRecording}
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            Start Recording
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-surface-700 bg-surface-800/30 hover:border-surface-600 transition-colors"
    >
      <span className="text-sm text-surface-200">{label}</span>
      <div
        className={`w-9 h-5 rounded-full transition-colors relative ${
          enabled ? 'bg-accent-600' : 'bg-surface-600'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

function CountdownOverlay({ seconds }: { seconds: number }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-black/50">
      <motion.div
        key={seconds}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="text-8xl font-bold text-white drop-shadow-2xl"
      >
        {seconds}
      </motion.div>
    </div>
  );
}
