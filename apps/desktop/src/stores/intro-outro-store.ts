import { create } from 'zustand';

export type IntroStyle = 'fade' | 'slide-up' | 'zoom-in' | 'typewriter';
export type OutroStyle = 'fade' | 'slide-down' | 'zoom-out';

export interface TitleCardConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  durationMs: number;
  style: IntroStyle | OutroStyle;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

interface IntroOutroState {
  intro: TitleCardConfig;
  outro: TitleCardConfig;

  setIntro: (updates: Partial<TitleCardConfig>) => void;
  setOutro: (updates: Partial<TitleCardConfig>) => void;
}

export const useIntroOutroStore = create<IntroOutroState>((set) => ({
  intro: {
    enabled: false,
    title: 'My Screen Recording',
    subtitle: '',
    durationMs: 2000,
    style: 'fade',
    backgroundColor: '#09090b',
    textColor: '#ffffff',
    fontSize: 36,
  },
  outro: {
    enabled: false,
    title: 'Thanks for watching',
    subtitle: '',
    durationMs: 2000,
    style: 'fade',
    backgroundColor: '#09090b',
    textColor: '#ffffff',
    fontSize: 36,
  },

  setIntro: (updates) => set((s) => ({ intro: { ...s.intro, ...updates } })),
  setOutro: (updates) => set((s) => ({ outro: { ...s.outro, ...updates } })),
}));
