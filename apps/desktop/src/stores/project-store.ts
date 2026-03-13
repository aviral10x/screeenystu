import { create } from 'zustand';

export type ActiveTool = 'select' | 'trim' | 'zoom' | 'speed' | 'caption' | 'mask';

export interface SourceInfo {
  id: string;
  filename: string;
  mediaType: 'screen' | 'mic' | 'camera' | 'system_audio';
  durationMs: number | null;
  relativePath?: string;
}

interface ProjectState {
  projectId: string | null;
  projectName: string;
  projectPath: string | null;
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
  setProject: (id: string, name: string, path?: string) => void;
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
  projectPath: null,
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

  setProject: (id, name, path) => set({ projectId: id, projectName: name, projectPath: path || null, isDirty: false }),
  clearProject: () =>
    set({
      projectId: null,
      projectName: 'Untitled',
      projectPath: null,
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

export function hydrateProject(jsonStr: string, projectPath?: string) {
  try {
    const data = JSON.parse(jsonStr);
    useProjectStore.getState().setProject(data.id, data.name, projectPath);
    
    // Parse sources and format them
    const parsedSources = (data.sources || []).map((s: any) => ({
      id: s.id,
      filename: s.filename,
      mediaType: s.media_type,
      durationMs: s.duration_ms,
      relativePath: s.relative_path,
    }));
    useProjectStore.getState().setSources(parsedSources);
    
    // If the project has timeline trim, set it
    if (data.timeline) {
      useProjectStore.getState().setPlayhead(data.timeline.playhead_ms || 0);
      useProjectStore.getState().setDuration(data.capture_session?.duration_ms || 0);
      if (data.timeline.trim) {
        useProjectStore.getState().setTrim(data.timeline.trim.start_ms, data.timeline.trim.end_ms);
      }
    }
  } catch (e) {
    console.error('Failed to parse project JSON', e);
  }
}

