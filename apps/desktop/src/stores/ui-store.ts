import { create } from 'zustand';

export type AppView = 'home' | 'recording' | 'editor' | 'settings';

interface UIState {
  view: AppView;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  timelineHeight: number;
  commandMenuOpen: boolean;

  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setTimelineHeight: (height: number) => void;
  toggleCommandMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'home',
  sidebarOpen: true,
  inspectorOpen: true,
  timelineHeight: 250,
  commandMenuOpen: false,

  setView: (view) => set({ view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  setTimelineHeight: (height) => set({ timelineHeight: Math.max(150, Math.min(500, height)) }),
  toggleCommandMenu: () => set((state) => ({ commandMenuOpen: !state.commandMenuOpen })),
}));
