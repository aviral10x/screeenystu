import { create } from 'zustand';

export interface ZoomSegment {
  id: string;
  time_range: { start_ms: number; end_ms: number };
  target_rect: { x: number; y: number; width: number; height: number };
  scale: number;
  ease_in: string;
  ease_out: string;
  transition_in_ms: number;
  transition_out_ms: number;
  auto_generated: boolean;
  confidence: number | null;
}

interface ZoomState {
  segments: ZoomSegment[];
  selectedSegmentId: string | null;
  hoveredSegmentId: string | null;
  isAnalyzing: boolean;

  setSegments: (segments: ZoomSegment[]) => void;
  addSegment: (segment: ZoomSegment) => void;
  removeSegment: (id: string) => void;
  updateSegment: (id: string, updates: Partial<ZoomSegment>) => void;
  selectSegment: (id: string | null) => void;
  hoverSegment: (id: string | null) => void;
  setAnalyzing: (v: boolean) => void;

  /** Get active zoom segment at a given time */
  getActiveSegment: (timeMs: number) => ZoomSegment | null;
}

export const useZoomStore = create<ZoomState>((set, get) => ({
  segments: [],
  selectedSegmentId: null,
  hoveredSegmentId: null,
  isAnalyzing: false,

  setSegments: (segments) => set({ segments }),
  addSegment: (segment) => set((s) => ({ segments: [...s.segments, segment] })),
  removeSegment: (id) => set((s) => ({ segments: s.segments.filter((z) => z.id !== id) })),
  updateSegment: (id, updates) =>
    set((s) => ({
      segments: s.segments.map((z) => (z.id === id ? { ...z, ...updates } : z)),
    })),
  selectSegment: (id) => set({ selectedSegmentId: id }),
  hoverSegment: (id) => set({ hoveredSegmentId: id }),
  setAnalyzing: (v) => set({ isAnalyzing: v }),

  getActiveSegment: (timeMs) => {
    const { segments } = get();
    return (
      segments.find(
        (s) => timeMs >= s.time_range.start_ms && timeMs <= s.time_range.end_ms,
      ) ?? null
    );
  },
}));
