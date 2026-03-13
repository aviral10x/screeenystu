import { create } from 'zustand';

export type ClickEffectStyle = 'ripple' | 'pulse' | 'confetti' | 'ring';

export interface CursorStyle {
  size: number;
  color: string;
  highlightColor: string;
  clickEffectEnabled: boolean;
  clickEffectColor: string;
  clickEffectStyle: ClickEffectStyle;
  shortcutBadgeEnabled: boolean;
  smoothingFactor: number;
  visible: boolean;
  spotlightEnabled: boolean;
  spotlightRadius: number;
  spotlightOpacity: number;
  trailEnabled: boolean;
  trailLength: number;
  trailOpacity: number;
}

interface CursorState {
  style: CursorStyle;
  setStyle: (updates: Partial<CursorStyle>) => void;
  resetStyle: () => void;
}

const defaultStyle: CursorStyle = {
  size: 20,
  color: '#ffffff',
  highlightColor: '#6366f1',
  clickEffectEnabled: true,
  clickEffectColor: '#6366f1',
  clickEffectStyle: 'ripple',
  shortcutBadgeEnabled: true,
  smoothingFactor: 0.15,
  visible: true,
  spotlightEnabled: false,
  spotlightRadius: 120,
  spotlightOpacity: 0.6,
  trailEnabled: false,
  trailLength: 8,
  trailOpacity: 0.3,
};

export const useCursorStore = create<CursorState>((set) => ({
  style: { ...defaultStyle },
  setStyle: (updates) => set((s) => ({ style: { ...s.style, ...updates } })),
  resetStyle: () => set({ style: { ...defaultStyle } }),
}));
