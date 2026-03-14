import { create } from 'zustand';
import type { FrameStyle } from '@/components/canvas/window-frame';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '16:10' | '4:3' | 'auto';

export interface BackgroundStyle {
  type: 'wallpaper' | 'gradient' | 'color' | 'image';
  // wallpaper specific
  wallpaperId?: string;
  backgroundBlur?: number;
  // gradient specific
  gradientColors?: [string, string];
  gradientAngle?: number;
  // color specific
  color?: string;
  // image specific
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
  inset: number;
  shadowEnabled: boolean;
  shadowIntensity: number;
  frameStyle: FrameStyle;
  webcam: WebcamLayout;

  setAspectRatio: (ratio: AspectRatio) => void;
  setBackground: (bg: BackgroundStyle) => void;
  setPadding: (px: number) => void;
  setCornerRadius: (px: number) => void;
  setInset: (px: number) => void;
  setShadowEnabled: (on: boolean) => void;
  setShadowIntensity: (v: number) => void;
  setFrameStyle: (style: FrameStyle) => void;
  setWebcam: (updates: Partial<WebcamLayout>) => void;
}

export const GRADIENT_PRESETS: [string, string][] = [
  ['#3F37C9', '#8C87DF'], ['#4f46e5', '#7c3aed'], ['#2563eb', '#06b6d4'],
  ['#059669', '#14b8a6'], ['#ea580c', '#ec4899'], ['#0f172a', '#1e293b'],
  ['#f97316', '#ef4444'], ['#8b5cf6', '#d946ef'], ['#10b981', '#3b82f6'],
  ['#f43f5e', '#f97316'], ['#6366f1', '#a855f7'], ['#84cc16', '#14b8a6'],
  ['#14b8a6', '#6366f1'], ['#f59e0b', '#ef4444'], ['#3b82f6', '#8b5cf6'],
  ['#ec4899', '#8b5cf6'], ['#06b6d4', '#3b82f6'], ['#1e293b', '#334155'],
];

export const WALLPAPER_CATEGORIES = ['macOS', 'Spring', 'Sunset', 'Radiant'];

export const useCanvasStore = create<CanvasState>((set) => ({
  aspectRatio: '16:9',
  background: { type: 'wallpaper', wallpaperId: 'macos-1', backgroundBlur: 20 },
  padding: 48,
  cornerRadius: 12,
  inset: 0,
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
  setInset: (px) => set({ inset: px }),
  setShadowEnabled: (on) => set({ shadowEnabled: on }),
  setShadowIntensity: (v) => set({ shadowIntensity: v }),
  setFrameStyle: (style) => set({ frameStyle: style }),
  setWebcam: (updates) => set((s) => ({ webcam: { ...s.webcam, ...updates } })),
}));
