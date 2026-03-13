import { useCallback } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useZoomStore } from '@/stores/zoom-store';
import { tauriCommand } from './use-tauri-command';

/**
 * Provides undo/redo operations that sync Tauri command stack with UI stores.
 */
export function useUndoRedo() {
  const { setDirty, setUndoRedo } = useProjectStore();

  const undo = useCallback(async () => {
    try {
      const result = await tauriCommand<string>('undo');
      if (result) {
        const state = JSON.parse(result);
        syncUIFromProject(state);
        setUndoRedo(state.can_undo ?? false, state.can_redo ?? true);
        setDirty(true);
      }
    } catch (e) {
      console.error('Undo failed:', e);
    }
  }, []);

  const redo = useCallback(async () => {
    try {
      const result = await tauriCommand<string>('redo');
      if (result) {
        const state = JSON.parse(result);
        syncUIFromProject(state);
        setUndoRedo(state.can_undo ?? true, state.can_redo ?? false);
        setDirty(true);
      }
    } catch (e) {
      console.error('Redo failed:', e);
    }
  }, []);

  return { undo, redo };
}

/**
 * Sync UI stores from project state after undo/redo.
 */
function syncUIFromProject(state: any) {
  // Sync zoom segments
  if (state.zoom_segments) {
    useZoomStore.getState().setSegments(state.zoom_segments);
  }

  // Sync trim
  if (state.trim) {
    useProjectStore.getState().setTrim(state.trim.start_ms, state.trim.end_ms);
  } else {
    useProjectStore.getState().setTrim(null, null);
  }

  // Sync duration if available
  if (state.duration_ms) {
    useProjectStore.getState().setDuration(state.duration_ms);
  }
}
