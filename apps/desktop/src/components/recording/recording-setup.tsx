import { useEffect, useCallback, useState, useRef } from 'react';
import { useRecordingStore } from '@/stores/recording-store';
import { useUIStore } from '@/stores/ui-store';
import { recordingCommands, sourceCommands, projectCommands } from '@/hooks/use-tauri-command';
import { AnimatePresence, motion } from 'framer-motion';
import { AreaSelector } from './area-selector';
import { CameraPreview } from './camera-preview';

export function RecordingSetup() {
  const {
    target, setTarget,
    micEnabled, toggleMic,
    cameraEnabled, toggleCamera,
    systemAudioEnabled, toggleSystemAudio,
    displays, setDisplays,
    windows, setWindows,
    mics, setMics,
    cameras, setCameras,
    selectedDisplayId, selectDisplay,
    selectedWindowId, selectWindow,
    selectedMicId, selectMic,
    selectedCameraId, selectCamera,
    countdownSeconds,
    setStatus, setCaptureOutputDir, setElapsed,
  } = useRecordingStore();

  const setView = useUIStore((s) => s.setView);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showWindowPicker, setShowWindowPicker] = useState(false);
  const [showMicPicker, setShowMicPicker] = useState(false);
  const [showCamPicker, setShowCamPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSelectingArea, setIsSelectingArea] = useState(false);

  // Load sources on mount
  useEffect(() => {
    async function load() {
      try {
        const [displaysRes, windowsRes, micsRes, camerasRes] = await Promise.allSettled([
          sourceCommands.listDisplays(),
          sourceCommands.listWindows(),
          sourceCommands.listMics(),
          sourceCommands.listCameras(),
        ]);
        if (displaysRes.status === 'fulfilled') setDisplays(JSON.parse(displaysRes.value).displays || []);
        if (windowsRes.status === 'fulfilled') setWindows(JSON.parse(windowsRes.value).windows || []);
        if (micsRes.status === 'fulfilled') setMics(JSON.parse(micsRes.value).devices || []);
        if (camerasRes.status === 'fulfilled') setCameras(JSON.parse(camerasRes.value).cameras || []);
      } catch (e) {
        console.error('Failed to load sources:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Auto-select mic and camera when available
  useEffect(() => {
    if (!selectedMicId && mics.length) selectMic(mics[0].uid);
  }, [mics]);

  const startActualRecording = async (areaRect?: { x: number; y: number; width: number; height: number }) => {
    setStatus('countdown');
    for (let i = countdownSeconds; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);

    let outputDir: string | undefined;
    try {
      const baseDir = await projectCommands.getDefaultProjectsDir();
      const date = new Date();
      const ts = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}_${String(date.getHours()).padStart(2,'0')}-${String(date.getMinutes()).padStart(2,'0')}-${String(date.getSeconds()).padStart(2,'0')}`;
      outputDir = `${baseDir}/Recording_${ts}`;
      setCaptureOutputDir(outputDir);
    } catch (e) { console.error(e); }

    const config: Record<string, unknown> = {
      mic_enabled: micEnabled,
      camera_enabled: cameraEnabled,
      system_audio_enabled: systemAudioEnabled,
      fps: 60,
      output_dir: outputDir,
    };

    if (target === 'fullscreen') config.target = { type: 'FullDisplay', display_id: selectedDisplayId ?? 1 };
    else if (target === 'window') config.target = { type: 'Window', window_id: selectedWindowId ?? 0 };
    else if (target === 'area') config.target = { type: 'Area', x: areaRect?.x ?? 0, y: areaRect?.y ?? 0, width: areaRect?.width ?? 1280, height: areaRect?.height ?? 720, display_id: selectedDisplayId ?? 1 };

    try {
      setStatus('recording');
      setElapsed(0);
      await recordingCommands.startRecording(config);
    } catch (e) {
      console.error('Failed to start recording:', e);
      setStatus('idle');
    }
  };

  const handleStart = useCallback(async () => {
    if (target === 'area') {
      setIsSelectingArea(true);
    } else {
      startActualRecording();
    }
  }, [target, selectedDisplayId, selectedWindowId, micEnabled, cameraEnabled, systemAudioEnabled]);

  if (isSelectingArea) {
    return (
      <AreaSelector
        onSelect={(rect) => { setIsSelectingArea(false); startActualRecording(rect); }}
        onCancel={() => setIsSelectingArea(false)}
      />
    );
  }

  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[120px] font-bold text-white drop-shadow-2xl select-none"
          >
            {countdown}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Derived info
  const mainDisplay = displays.find((d) => d.is_main) ?? displays[0];
  const selectedMic = mics.find((m) => m.uid === selectedMicId);
  const selectedCam = cameras.find((c) => c.id === selectedCameraId);
  const selectedWin = windows.find((w) => w.window_id === selectedWindowId);

  const SOURCE_TABS = [
    { id: 'fullscreen' as const, label: 'Display', icon: <MonitorIcon /> },
    { id: 'window'    as const, label: 'Window',  icon: <WindowIcon /> },
    { id: 'area'      as const, label: 'Area',    icon: <AreaIcon /> },
    { id: 'device'    as const, label: 'Device',  icon: <DeviceIcon /> },
  ];

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col" onClick={() => { setShowWindowPicker(false); setShowMicPicker(false); setShowCamPicker(false); setShowSettings(false); }}>
      {/* Transparent backdrop, screen is visible through it */}

      {/* Center display label + start button (for display mode) */}
      {target === 'fullscreen' && (
        <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center pointer-events-auto"
          >
            <h2 className="text-3xl font-semibold text-white drop-shadow mb-1">
              {mainDisplay ? 'Built-in Retina Display' : 'Display'}
            </h2>
            {mainDisplay && (
              <p className="text-[#B0B2C1] text-sm mb-6 drop-shadow">
                {mainDisplay.width}×{mainDisplay.height} · 60FPS
              </p>
            )}
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="group flex items-center gap-2 bg-[#4E39FD] hover:bg-[#5C4DFF] text-white font-medium px-6 py-3 rounded-xl transition-all shadow-[0_4px_20px_rgba(78,57,253,0.5)] disabled:opacity-50"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:animate-pulse" />
              Start recording
              <svg className="opacity-60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </motion.div>
        </div>
      )}

      {target === 'window' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {selectedWin ? (
              <>
                <h2 className="text-2xl font-semibold text-white drop-shadow mb-2">{selectedWin.title || selectedWin.app_name}</h2>
                <p className="text-sm text-[#B0B2C1] mb-6">{selectedWin.width}×{selectedWin.height}</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-white drop-shadow mb-2">Select a window</h2>
                <p className="text-sm text-[#B0B2C1] mb-6">Click a window below in the toolbar to begin</p>
              </>
            )}
            <button
              onClick={handleStart}
              disabled={isLoading || !selectedWindowId}
              className="flex items-center gap-2 bg-[#4E39FD] hover:bg-[#5C4DFF] text-white font-medium px-6 py-3 rounded-xl transition-all shadow-[0_4px_20px_rgba(78,57,253,0.5)] disabled:opacity-50"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
              Start recording
            </button>
          </motion.div>
        </div>
      )}

      {(target === 'area' || target === 'device') && (
        <div className="flex-1" />
      )}

      {/* Camera PiP */}
      <AnimatePresence>
        {cameraEnabled && selectedCameraId && (
          <div className="fixed bottom-24 left-8 pointer-events-auto z-[9995]">
            <CameraPreview
              deviceId={selectedCameraId}
              onClose={toggleCamera}
            />
          </div>
        )}
      </AnimatePresence>

      {/* --- FLOATING TOOLBAR --- */}
      <div className="flex justify-center pb-5 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex items-stretch h-14 bg-[#1A1B23]/95 backdrop-blur-xl rounded-2xl border border-[#2D2E40] shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={() => setView('home')}
            className="flex items-center justify-center w-12 h-full text-[#6B6D76] hover:text-white hover:bg-white/5 rounded-l-2xl transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="8" y1="8" x2="16" y2="16" />
              <line x1="16" y1="8" x2="8" y2="16" />
            </svg>
          </button>

          <Divider />

          {/* Source tabs */}
          <div className="flex items-center">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setTarget(tab.id); if (tab.id === 'window') setShowWindowPicker((s) => !s); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full text-[11px] font-medium transition-colors ${
                  target === tab.id
                    ? 'text-white'
                    : 'text-[#6B6D76] hover:text-[#A0A2B1]'
                }`}
              >
                <span className={`transition-colors ${target === tab.id ? 'text-white' : 'text-[#6B6D76]'}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          <Divider />

          {/* Camera pill */}
          <div className="relative">
            <button
              onClick={() => { setShowCamPicker((s) => !s); setShowMicPicker(false); setShowSettings(false); }}
              className={`flex items-center gap-2 px-4 h-full text-[13px] transition-colors ${
                cameraEnabled && selectedCam ? 'text-white' : 'text-[#6B6D76] hover:text-[#A0A2B1]'
              }`}
            >
              <CamIcon muted={!cameraEnabled || !selectedCam} />
              <span className="max-w-[100px] truncate">
                {selectedCam && cameraEnabled ? selectedCam.name : 'No camera'}
              </span>
            </button>

            <AnimatePresence>
              {showCamPicker && (
                <DropdownPopover>
                  {cameras.length === 0 ? (
                    <p className="px-4 py-3 text-[12px] text-[#6B6D76]">No cameras found</p>
                  ) : cameras.map((c) => (
                    <DropdownItem
                      key={c.id}
                      label={c.name}
                      active={selectedCameraId === c.id && cameraEnabled}
                      onClick={() => { selectCamera(c.id); setShowCamPicker(false); }}
                    />
                  ))}
                  <div className="border-t border-[#252630] mt-1 pt-1">
                    <DropdownItem
                      label="No camera"
                      active={!cameraEnabled}
                      onClick={() => { if (cameraEnabled) toggleCamera(); setShowCamPicker(false); }}
                    />
                  </div>
                </DropdownPopover>
              )}
            </AnimatePresence>
          </div>

          {/* Mic pill */}
          <div className="relative">
            <button
              onClick={() => { setShowMicPicker((s) => !s); setShowCamPicker(false); setShowSettings(false); }}
              className={`flex items-center gap-2 px-4 h-full text-[13px] transition-colors ${
                micEnabled && selectedMic ? 'text-white' : 'text-[#6B6D76] hover:text-[#A0A2B1]'
              }`}
            >
              <MicIcon muted={!micEnabled} />
              <span className="max-w-[120px] truncate">
                {selectedMic && micEnabled ? selectedMic.name : 'No microphone'}
              </span>
            </button>

            <AnimatePresence>
              {showMicPicker && (
                <DropdownPopover>
                  {mics.length === 0 ? (
                    <p className="px-4 py-3 text-[12px] text-[#6B6D76]">No mics found</p>
                  ) : mics.map((m) => (
                    <DropdownItem
                      key={m.uid}
                      label={m.name}
                      active={selectedMicId === m.uid && micEnabled}
                      onClick={() => { selectMic(m.uid); if (!micEnabled) toggleMic(); setShowMicPicker(false); }}
                    />
                  ))}
                  <div className="border-t border-[#252630] mt-1 pt-1">
                    <DropdownItem
                      label="No microphone"
                      active={!micEnabled}
                      onClick={() => { if (micEnabled) toggleMic(); setShowMicPicker(false); }}
                    />
                  </div>
                </DropdownPopover>
              )}
            </AnimatePresence>
          </div>

          {/* System Audio pill */}
          <button
            onClick={toggleSystemAudio}
            className={`flex items-center gap-2 px-4 h-full text-[13px] transition-colors ${
              systemAudioEnabled ? 'text-white' : 'text-[#6B6D76] hover:text-[#A0A2B1]'
            }`}
          >
            <SysAudioIcon muted={!systemAudioEnabled} />
            <span>{systemAudioEnabled ? 'System audio' : 'No system audio'}</span>
          </button>

          <Divider />

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => { setShowSettings((s) => !s); setShowMicPicker(false); setShowCamPicker(false); }}
              className="flex items-center gap-1 px-3 h-full text-[#6B6D76] hover:text-white rounded-r-2xl transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <AnimatePresence>
              {showSettings && (
                <DropdownPopover>
                  <div className="px-4 py-3 space-y-3 min-w-[200px]">
                    <p className="text-[11px] text-[#6B6D76] uppercase tracking-wider font-medium">Recording Options</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#D0D0DC]">Frame rate</span>
                      <span className="text-[13px] text-[#6E70FF] font-medium">60 FPS</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#D0D0DC]">Countdown</span>
                      <span className="text-[13px] text-[#6E70FF] font-medium">{countdownSeconds}s</span>
                    </div>
                  </div>
                </DropdownPopover>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Window picker popover */}
        <AnimatePresence>
          {showWindowPicker && target === 'window' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-[72px] left-1/2 -translate-x-1/2 bg-[#14151D]/98 backdrop-blur-xl border border-[#2D2E40] rounded-xl shadow-2xl overflow-hidden min-w-[320px] max-h-[380px] flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-4 pt-3 pb-1 text-[11px] text-[#6B6D76] uppercase tracking-wider font-medium">Select Window</p>
              <div className="overflow-y-auto">
                {windows.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-[#6B6D76]">No windows found</p>
                ) : windows.map((w) => (
                  <button
                    key={w.window_id}
                    onClick={() => { selectWindow(w.window_id); setShowWindowPicker(false); }}
                    className={`w-full text-left px-4 py-2.5 transition-colors flex flex-col ${
                      selectedWindowId === w.window_id
                        ? 'bg-[#4E39FD]/20 text-white'
                        : 'text-[#A0A2B1] hover:bg-[#1E1F2A] hover:text-white'
                    }`}
                  >
                    <span className="text-[13px] font-medium truncate">{w.title || 'Untitled'}</span>
                    <span className="text-[11px] text-[#6B6D76]">{w.app_name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---- Small sub-components ----

function Divider() {
  return <div className="w-px self-stretch bg-[#2D2E40] my-2.5 mx-0.5 shrink-0" />;
}

function DropdownPopover({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full mb-2 right-0 bg-[#14151D]/98 backdrop-blur-xl border border-[#2D2E40] rounded-xl shadow-2xl overflow-hidden z-50 py-1 min-w-[180px]"
    >
      {children}
    </motion.div>
  );
}

function DropdownItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-[13px] transition-colors flex items-center gap-2 ${
        active ? 'text-white' : 'text-[#A0A2B1] hover:bg-[#1E1F2A] hover:text-white'
      }`}
    >
      {active && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      <span className={active ? '' : 'ml-[20px]'}>{label}</span>
    </button>
  );
}

// ---- Icons ----
function MonitorIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function WindowIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  );
}
function AreaIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h3M4 17v3h3M17 4h3v3M20 17v3h-3" />
      <rect x="7" y="7" width="10" height="10" rx="1" strokeDasharray="2 1.5" />
    </svg>
  );
}
function DeviceIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function CamIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M15 16.5A4.5 4.5 0 019 11V9M21 8.5v7l-4-3.5" />
      <path d="M9 5h6a2 2 0 012 2v2.5" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}
function MicIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6" />
      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
function SysAudioIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
