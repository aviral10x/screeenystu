import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { save } from '@tauri-apps/plugin-dialog';
import { tauriCommand } from '@/hooks/use-tauri-command';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { id: 'web', name: 'Web', desc: '1080p · MP4 · 30fps', icon: '🌐' },
  { id: 'presentation', name: 'Presentation', desc: '1440p · MP4 · 30fps', icon: '📊' },
  { id: 'high_quality', name: 'High Quality', desc: '4K · MP4 · 60fps', icon: '✨' },
  { id: 'social', name: 'Social', desc: '1080p · MP4 · Portrait', icon: '📱' },
  { id: 'gif', name: 'GIF', desc: '720p · 15fps', icon: '🎞️' },
];

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState('web');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  // Listen for progress events
  useEffect(() => {
    if (!isExporting) return;

    let unlisten: (() => void) | null = null;
    listen<{ progress: number; percent: number }>('export-progress', (event) => {
      setProgress(event.payload.percent);
      if (event.payload.progress >= 1.0) {
        setIsExporting(false);
        setProgress(100);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [isExporting]);

  const handleExport = useCallback(async () => {
    const ext = selectedPreset === 'gif' ? 'gif' : 'mp4';
    const filePath = await save({
      defaultPath: `recording.${ext}`,
      filters: [
        {
          name: ext.toUpperCase(),
          extensions: [ext],
        },
      ],
    });

    if (!filePath) return;

    setIsExporting(true);
    setProgress(0);

    try {
      const result = await tauriCommand<string>('start_export', {
        presetName: selectedPreset,
        outputPath: filePath,
      });
      const job = JSON.parse(result);
      setJobId(job.id);
    } catch (e) {
      console.error('Export failed:', e);
      setIsExporting(false);
    }
  }, [selectedPreset]);

  const handleCancel = useCallback(async () => {
    if (jobId) {
      try {
        await tauriCommand('cancel_export', { jobId });
      } catch (e) {
        console.error('Failed to cancel:', e);
      }
    }
    setIsExporting(false);
    setProgress(0);
  }, [jobId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Export</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {!isExporting ? (
          <>
            {/* Preset selector */}
            <div className="p-6 space-y-3">
              <label className="text-xs text-surface-400 uppercase tracking-wider">
                Quality Preset
              </label>
              <div className="space-y-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedPreset === preset.id
                        ? 'border-accent-500 bg-accent-600/10'
                        : 'border-surface-700 bg-surface-800/30 hover:border-surface-600'
                    }`}
                  >
                    <span className="text-xl">{preset.icon}</span>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${selectedPreset === preset.id ? 'text-accent-400' : 'text-surface-200'}`}>
                        {preset.name}
                      </p>
                      <p className="text-xs text-surface-500">{preset.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-surface-800 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <button
                onClick={handleExport}
                className="flex-1 h-10 rounded-xl bg-accent-600 text-white font-medium hover:bg-accent-500 transition-all active:scale-[0.98]"
              >
                Export
              </button>
            </div>
          </>
        ) : (
          /* Progress view */
          <div className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-accent-600/20 flex items-center justify-center">
                {progress >= 100 ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" className="text-accent-400 animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-surface-200">
                {progress >= 100 ? 'Export Complete!' : 'Exporting...'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-600 to-accent-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-center text-xs text-surface-500">{progress}%</p>

            <div className="flex gap-3">
              {progress >= 100 ? (
                <button
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl bg-accent-600 text-white font-medium hover:bg-accent-500 transition-all"
                >
                  Done
                </button>
              ) : (
                <Button variant="ghost" className="flex-1" onClick={handleCancel}>
                  Cancel Export
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
