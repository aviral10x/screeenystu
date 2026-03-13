import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { tauriCommand } from './use-tauri-command';

const AUTO_SAVE_INTERVAL_MS = 30_000;
const CRASH_RECOVERY_KEY = 'screencraft:unsaved-state';

/**
 * Auto-save hook. Saves project state periodically and on beforeunload.
 */
export function useAutoSave() {
  const { projectId, isDirty, setDirty } = useProjectStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = async () => {
    if (!projectId || !isDirty) return;
    try {
      await tauriCommand('save_project');
      setDirty(false);
      clearCrashRecoveryState();
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (useProjectStore.getState().isDirty) save();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [projectId]);

  useEffect(() => {
    const handler = () => {
      if (useProjectStore.getState().isDirty) persistCrashRecoveryState();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.hidden && useProjectStore.getState().isDirty) save();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return { save };
}

function persistCrashRecoveryState() {
  try {
    localStorage.setItem(CRASH_RECOVERY_KEY, JSON.stringify({
      timestamp: Date.now(),
      projectId: useProjectStore.getState().projectId,
      projectName: useProjectStore.getState().projectName,
      playheadMs: useProjectStore.getState().playheadMs,
      aspectRatio: useCanvasStore.getState().aspectRatio,
    }));
  } catch {}
}

function clearCrashRecoveryState() {
  try { localStorage.removeItem(CRASH_RECOVERY_KEY); } catch {}
}

export function checkCrashRecovery(): {
  hasRecovery: boolean;
  projectId?: string;
  projectName?: string;
  timestamp?: number;
} {
  try {
    const raw = localStorage.getItem(CRASH_RECOVERY_KEY);
    if (!raw) return { hasRecovery: false };
    const state = JSON.parse(raw);
    if (Date.now() - state.timestamp > 24 * 3600_000) {
      clearCrashRecoveryState();
      return { hasRecovery: false };
    }
    return { hasRecovery: true, projectId: state.projectId, projectName: state.projectName, timestamp: state.timestamp };
  } catch {
    return { hasRecovery: false };
  }
}
