import { create } from 'zustand';

export type ClickEffectStyle = 'ripple' | 'pulse' | 'confetti' | 'ring';

export type CursorPredefinedStyle = 'default' | 'pointer' | 'circle' | 'custom1' | 'custom2';
export type ClickSound = 'none' | 'click' | 'pop' | 'snap';
export type RotationType = 'none' | 'auto' | 'fixed';

export interface CursorStyle {
  // Appearance
  size: number;
  cursorStyle: CursorPredefinedStyle;
  
  // Behavior toggles
  alwaysUsePointer: boolean;
  hideIfNotMoving: boolean;
  loopCursorPosition: boolean;
  hideCursor: boolean;
  
  // Effects
  clickEffectEnabled: boolean;
  clickEffectStyle: ClickEffectStyle;
  clickSound: ClickSound;
  rotation: RotationType;

  // Legacy/Retained fields
  color: string;
  highlightColor: string;
  clickEffectColor: string;
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
  // New Screen Studio fields
  size: 20,
  cursorStyle: 'default',
  alwaysUsePointer: false,
  hideIfNotMoving: false,
  loopCursorPosition: false,
  hideCursor: false,
  clickEffectEnabled: true,
  clickEffectStyle: 'ripple',
  clickSound: 'click',
  rotation: 'auto',

  // Existing/Legacy
  color: '#ffffff',
  highlightColor: '#6366f1',
  clickEffectColor: '#6366f1',
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
