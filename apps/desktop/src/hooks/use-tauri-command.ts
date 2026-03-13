import { invoke } from '@tauri-apps/api/core';

/**
 * Type-safe wrapper around Tauri invoke.
 */
export async function tauriCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args);
}

/**
 * Project commands
 */
export const projectCommands = {
  create: (name: string) => tauriCommand<string>('create_project', { name }),
  save: (path: string) => tauriCommand<void>('save_project', { path }),
  load: (path: string) => tauriCommand<string>('load_project', { path }),
  getState: () => tauriCommand<string>('get_project_state'),
  undo: () => tauriCommand<string>('undo'),
  redo: () => tauriCommand<string>('redo'),
  getDefaultProjectsDir: () => tauriCommand<string>('get_default_projects_dir'),
  listRecentProjects: () => tauriCommand<Array<{ id: string; name: string; path: string; last_modified: number }>>('list_recent_projects'),
  createFromRecording: (name: string, captureDir: string) =>
    tauriCommand<string>('create_project_from_recording', {
      name: name,
      captureDir: captureDir,
    }),
  saveBundle: (bundlePath: string, captureDir?: string) =>
    tauriCommand<void>('save_project_bundle', {
      projectId: '',
      bundlePath: bundlePath,
      captureDir: captureDir ?? null,
    }),
};

/**
 * Recording commands
 */
export const recordingCommands = {
  startRecording: (config: Record<string, unknown>) =>
    tauriCommand<string>('start_recording', { config: JSON.stringify(config) }),
  pauseRecording: () => tauriCommand<void>('pause_recording'),
  resumeRecording: () => tauriCommand<void>('resume_recording'),
  stopRecording: () => tauriCommand<string>('stop_recording'),
  addFlag: (label?: string) => tauriCommand<void>('add_recording_flag', { label }),
};

/**
 * Source listing commands
 */
export const sourceCommands = {
  listDisplays: () => tauriCommand<string>('list_displays'),
  listWindows: () => tauriCommand<string>('list_windows'),
  listMics: () => tauriCommand<string>('list_mics'),
  listCameras: () => tauriCommand<string>('list_cameras'),
};

/**
 * Permissions commands
 */
export const permissionCommands = {
  checkPermissions: () => tauriCommand<string>('check_permissions'),
  requestPermission: (type: 'screen' | 'camera' | 'microphone' | 'accessibility') =>
    tauriCommand<string>('request_permission', { permissionType: type }),
};
