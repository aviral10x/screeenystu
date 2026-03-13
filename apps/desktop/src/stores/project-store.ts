import { create } from 'zustand';

export type ActiveTool = 'select' | 'trim' | 'zoom' | 'speed' | 'caption' | 'mask';

export interface SourceInfo {
  id: string;
  filename: string;
  mediaType: 'screen' | 'mic' | 'camera' | 'system_audio';
  durationMs: number | null;
}

interface ProjectState {
  projectId: string | null;
  projectName: string;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  playheadMs: number;
  isPlaying: boolean;
  durationMs: number;

  // Trim
  trimStartMs: number | null;
  trimEndMs: number | null;

  // Sources
  sources: SourceInfo[];

  // Active tool
  activeTool: ActiveTool;

  // Actions
  setProject: (id: string, name: string) => void;
  clearProject: () => void;
  setDirty: (dirty: boolean) => void;
  setUndoRedo: (canUndo: boolean, canRedo: boolean) => void;
  setPlayhead: (ms: number) => void;
  setPlaying: (playing: boolean) => void;
  setDuration: (ms: number) => void;
  setTrim: (start: number | null, end: number | null) => void;
  setSources: (sources: SourceInfo[]) => void;
  setActiveTool: (tool: ActiveTool) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  projectName: 'Untitled',
  isDirty: false,
  canUndo: false,
  canRedo: false,
  playheadMs: 0,
  isPlaying: false,
  durationMs: 0,
  trimStartMs: null,
  trimEndMs: null,
  sources: [],
  activeTool: 'select',

  setProject: (id, name) => set({ projectId: id, projectName: name, isDirty: false }),
  clearProject: () =>
    set({
      projectId: null,
      projectName: 'Untitled',
      isDirty: false,
      canUndo: false,
      canRedo: false,
      playheadMs: 0,
      isPlaying: false,
      durationMs: 0,
      trimStartMs: null,
      trimEndMs: null,
      sources: [],
      activeTool: 'select',
    }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setUndoRedo: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setPlayhead: (ms) => set({ playheadMs: ms }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setDuration: (ms) => set({ durationMs: ms }),
  setTrim: (start, end) => set({ trimStartMs: start, trimEndMs: end, isDirty: true }),
  setSources: (sources) => set({ sources }),
  setActiveTool: (tool) => set({ activeTool: tool }),
}));
