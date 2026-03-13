import { create } from 'zustand';
import type { FrameStyle } from '@/components/canvas/window-frame';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '16:10' | '4:3' | 'auto';

export interface BackgroundStyle {
  type: 'gradient' | 'solid' | 'image';
  gradient?: string;
  color?: string;
  imagePath?: string;
}

export type WebcamPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
export type WebcamShape = 'circle' | 'rounded' | 'rectangle';

export interface WebcamLayout {
  visible: boolean;
  position: WebcamPosition;
  customX: number;
  customY: number;
  size: number;
  shape: WebcamShape;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
}

interface CanvasState {
  aspectRatio: AspectRatio;
  background: BackgroundStyle;
  padding: number;
  cornerRadius: number;
  shadowEnabled: boolean;
  shadowIntensity: number;
  frameStyle: FrameStyle;
  webcam: WebcamLayout;

  setAspectRatio: (ratio: AspectRatio) => void;
  setBackground: (bg: BackgroundStyle) => void;
  setPadding: (px: number) => void;
  setCornerRadius: (px: number) => void;
  setShadowEnabled: (on: boolean) => void;
  setShadowIntensity: (v: number) => void;
  setFrameStyle: (style: FrameStyle) => void;
  setWebcam: (updates: Partial<WebcamLayout>) => void;
}

const BACKGROUNDS: BackgroundStyle[] = [
  { type: 'gradient', gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
  { type: 'gradient', gradient: 'linear-gradient(135deg, #2563eb, #06b6d4)' },
  { type: 'gradient', gradient: 'linear-gradient(135deg, #059669, #14b8a6)' },
  { type: 'gradient', gradient: 'linear-gradient(135deg, #ea580c, #ec4899)' },
  { type: 'gradient', gradient: 'linear-gradient(135deg, #0f172a, #1e293b)' },
  { type: 'solid', color: '#09090b' },
  { type: 'solid', color: '#ffffff' },
  { type: 'gradient', gradient: 'linear-gradient(135deg, #f97316, #ef4444)' },
];

export { BACKGROUNDS };

export const useCanvasStore = create<CanvasState>((set) => ({
  aspectRatio: '16:9',
  background: BACKGROUNDS[0],
  padding: 48,
  cornerRadius: 12,
  shadowEnabled: true,
  shadowIntensity: 0.5,
  frameStyle: 'none',
  webcam: {
    visible: false,
    position: 'bottom-right',
    customX: 0.85,
    customY: 0.85,
    size: 0.15,
    shape: 'circle',
    cornerRadius: 999,
    borderWidth: 3,
    borderColor: '#ffffff',
  },

  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setBackground: (bg) => set({ background: bg }),
  setPadding: (px) => set({ padding: px }),
  setCornerRadius: (px) => set({ cornerRadius: px }),
  setShadowEnabled: (on) => set({ shadowEnabled: on }),
  setShadowIntensity: (v) => set({ shadowIntensity: v }),
  setFrameStyle: (style) => set({ frameStyle: style }),
  setWebcam: (updates) => set((s) => ({ webcam: { ...s.webcam, ...updates } })),
}));
