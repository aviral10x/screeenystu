import { useEffect } from 'react';
import { useProjectStore, type ActiveTool } from '@/stores/project-store';
import { useZoomStore } from '@/stores/zoom-store';
import { tauriCommand } from './use-tauri-command';

/**
 * Global keyboard shortcuts for the editor.
 * Mount once at the app level.
 */
export function useShortcuts() {
  const { isPlaying, setPlaying, playheadMs, setPlayhead, durationMs, setActiveTool } =
    useProjectStore();
  const { selectedSegmentId, removeSegment } = useZoomStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't capture when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const meta = e.metaKey || e.ctrlKey;

      // Space — Play/Pause
      if (e.code === 'Space' && !meta) {
        e.preventDefault();
        setPlaying(!isPlaying);
        return;
      }

      // ⌘Z — Undo
      if (meta && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        tauriCommand('undo').catch(() => {});
        return;
      }

      // ⌘⇧Z — Redo
      if (meta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        tauriCommand('redo').catch(() => {});
        return;
      }

      // I — Set trim in point
      if (e.key === 'i' && !meta) {
        e.preventDefault();
        tauriCommand('set_trim', { startMs: playheadMs, endMs: durationMs }).catch(() => {});
        useProjectStore.getState().setTrim(playheadMs, durationMs);
        return;
      }

      // O — Set trim out point
      if (e.key === 'o' && !meta) {
        e.preventDefault();
        const trimStart = useProjectStore.getState().trimStartMs ?? 0;
        tauriCommand('set_trim', { startMs: trimStart, endMs: playheadMs }).catch(() => {});
        useProjectStore.getState().setTrim(trimStart, playheadMs);
        return;
      }

      // S — Split at playhead
      if (e.key === 's' && !meta) {
        e.preventDefault();
        tauriCommand('split_at_playhead', { playheadMs }).catch(() => {});
        return;
      }

      // Delete/Backspace — Remove selected segment
      if ((e.key === 'Delete' || e.key === 'Backspace') && !meta && selectedSegmentId) {
        e.preventDefault();
        removeSegment(selectedSegmentId);
        tauriCommand('remove_zoom_segment', { segmentId: selectedSegmentId }).catch(() => {});
        return;
      }

      // ⌘E — Export
      if (meta && e.key === 'e') {
        e.preventDefault();
        // Dispatch custom event that AppShell listens for
        window.dispatchEvent(new CustomEvent('open-export'));
        return;
      }

      // Tool shortcuts (single keys)
      const toolKeys: Record<string, ActiveTool> = {
        v: 'select',
        t: 'trim',
        z: 'zoom',
        r: 'speed',
        c: 'caption',
      };
      if (!meta && toolKeys[e.key]) {
        e.preventDefault();
        setActiveTool(toolKeys[e.key]);
        return;
      }

      // Arrow keys — nudge playhead
      if (e.key === 'ArrowRight' && !meta) {
        e.preventDefault();
        setPlayhead(Math.min(durationMs, playheadMs + (e.shiftKey ? 1000 : 100)));
        return;
      }
      if (e.key === 'ArrowLeft' && !meta) {
        e.preventDefault();
        setPlayhead(Math.max(0, playheadMs - (e.shiftKey ? 1000 : 100)));
        return;
      }

      // Home / End
      if (e.key === 'Home') {
        e.preventDefault();
        setPlayhead(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setPlayhead(durationMs);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, playheadMs, durationMs, selectedSegmentId]);
}
