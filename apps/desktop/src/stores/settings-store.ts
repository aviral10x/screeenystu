import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ResolutionPreset = '720p' | '1080p' | '4K';
export type ExportFormat = 'mp4' | 'gif';
export type ExportCompression = 'studio' | 'social' | 'web' | 'web-low';
export type ExportFrameRate = 30 | 60;

interface SettingsState {
  // General
  startAtLogin: boolean;
  hideDockIcon: boolean;
  usageDataEnabled: boolean;

  // Recording
  projectsDir: string | null;
  highlightRecordedArea: boolean;
  createZoomsAutomatically: boolean;
  showRecordingWidget: boolean;
  maxCameraResolution: ResolutionPreset;

  // Editing
  useLastProjectSettings: boolean;
  autoSave: boolean;
  presetsDir: string | null;

  // Quick Export
  showQuickExportWidget: boolean;
  alwaysSaveOnQuickExport: boolean;
  exportFormat: ExportFormat;
  exportFrameRate: ExportFrameRate;
  exportResolution: ResolutionPreset;
  exportCompression: ExportCompression;
  privateShareableLink: boolean;

  // Actions
  set: (patch: Partial<Omit<SettingsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const defaults: Omit<SettingsState, 'set' | 'reset'> = {
  startAtLogin: false,
  hideDockIcon: false,
  usageDataEnabled: true,
  projectsDir: null,
  highlightRecordedArea: true,
  createZoomsAutomatically: true,
  showRecordingWidget: true,
  maxCameraResolution: '1080p',
  useLastProjectSettings: false,
  autoSave: true,
  presetsDir: null,
  showQuickExportWidget: true,
  alwaysSaveOnQuickExport: false,
  exportFormat: 'mp4',
  exportFrameRate: 60,
  exportResolution: '1080p',
  exportCompression: 'social',
  privateShareableLink: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: 'screencraft-settings' }
  )
);
