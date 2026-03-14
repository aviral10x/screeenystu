import { create } from 'zustand';

export type RecordingStatus = 'idle' | 'preparing' | 'countdown' | 'recording' | 'paused' | 'finishing';
export type RecordingTarget = 'fullscreen' | 'window' | 'area' | 'device';

export interface DisplayInfo {
  id: number;
  width: number;
  height: number;
  is_main: boolean;
}

export interface WindowInfo {
  window_id: number;
  title: string;
  app_name: string;
  bundle_id: string;
  width: number;
  height: number;
  is_on_screen: boolean;
}

export interface MicInfo {
  id: number;
  name: string;
  uid: string;
}

export interface CameraInfo {
  id: string;
  name: string;
}

interface RecordingState {
  status: RecordingStatus;
  target: RecordingTarget;
  elapsedMs: number;
  micEnabled: boolean;
  cameraEnabled: boolean;
  systemAudioEnabled: boolean;
  countdownSeconds: number;

  // Available sources
  displays: DisplayInfo[];
  windows: WindowInfo[];
  mics: MicInfo[];
  cameras: CameraInfo[];
  selectedDisplayId: number | null;
  selectedWindowId: number | null;
  selectedMicId: string | null;
  selectedCameraId: string | null;

  // Capture output
  captureOutputDir: string | null;

  // Actions
  setStatus: (status: RecordingStatus) => void;
  setTarget: (target: RecordingTarget) => void;
  setElapsed: (ms: number) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleSystemAudio: () => void;
  setCountdown: (secs: number) => void;
  setDisplays: (displays: DisplayInfo[]) => void;
  setWindows: (windows: WindowInfo[]) => void;
  setMics: (mics: MicInfo[]) => void;
  setCameras: (cameras: CameraInfo[]) => void;
  selectDisplay: (id: number) => void;
  selectWindow: (id: number) => void;
  selectMic: (uid: string) => void;
  selectCamera: (id: string) => void;
  setCaptureOutputDir: (dir: string | null) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  status: 'idle',
  target: 'fullscreen',
  elapsedMs: 0,
  micEnabled: true,
  cameraEnabled: false,
  systemAudioEnabled: true,
  countdownSeconds: 3,

  displays: [],
  windows: [],
  mics: [],
  cameras: [],
  selectedDisplayId: null,
  selectedWindowId: null,
  selectedMicId: null,
  selectedCameraId: null,

  captureOutputDir: null,

  setStatus: (status) => set({ status }),
  setTarget: (target) => set({ target }),
  setElapsed: (ms) => set({ elapsedMs: ms }),
  toggleMic: () => set((s) => ({ micEnabled: !s.micEnabled })),
  toggleCamera: () => set((s) => ({ cameraEnabled: !s.cameraEnabled })),
  toggleSystemAudio: () => set((s) => ({ systemAudioEnabled: !s.systemAudioEnabled })),
  setCountdown: (secs) => set({ countdownSeconds: secs }),
  setDisplays: (displays) =>
    set((s) => ({
      displays,
      selectedDisplayId:
        s.selectedDisplayId ?? displays.find((d) => d.is_main)?.id ?? displays[0]?.id ?? null,
    })),
  setWindows: (windows) => set({ windows }),
  setMics: (mics) =>
    set((s) => ({
      mics,
      selectedMicId: s.selectedMicId ?? mics[0]?.uid ?? null,
    })),
  setCameras: (cameras) => set({ cameras }),
  selectDisplay: (id) => set({ selectedDisplayId: id }),
  selectWindow: (id) => set({ selectedWindowId: id }),
  selectMic: (uid) => set({ selectedMicId: uid }),
  selectCamera: (id) => set({ selectedCameraId: id, cameraEnabled: true }),
  setCaptureOutputDir: (dir) => set({ captureOutputDir: dir }),
  reset: () =>
    set({
      status: 'idle',
      elapsedMs: 0,
      captureOutputDir: null,
    }),
}));
