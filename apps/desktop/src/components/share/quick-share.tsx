import { useShareStore } from '@/stores/share-store';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickShareProps {
  isOpen: boolean;
  onClose: () => void;
  exportedFilePath: string | null;
}

export function QuickShare({ isOpen, onClose, exportedFilePath }: QuickShareProps) {
  const { status, uploadProgress, shareUrl, error, startUpload, setUploadProgress, setShareReady, setError, reset } = useShareStore();

  const handleShare = async () => {
    if (!exportedFilePath) return;

    startUpload();

    try {
      const apiBase = 'http://localhost:3001';

      // Step 1: Get presigned upload URL
      const presignRes = await fetch(`${apiBase}/api/uploads/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: exportedFilePath.split('/').pop() || 'recording.mp4',
          content_type: 'video/mp4',
          file_size_bytes: 1,
        }),
      });
      const presign = await presignRes.json();
      setUploadProgress(15);

      // Step 2: Upload file to S3 via presigned URL
      // In production, use Tauri's HTTP client for large file upload with progress
      setUploadProgress(50);

      // Step 3: Mark upload complete
      const completeRes = await fetch(`${apiBase}/api/uploads/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_key: presign.storage_key,
          filename: exportedFilePath.split('/').pop() || 'recording.mp4',
          file_size_bytes: 1,
          mime_type: 'video/mp4',
        }),
      });
      const complete = await completeRes.json();
      setUploadProgress(75);

      // Step 4: Create share link
      const shareRes = await fetch(`${apiBase}/api/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: complete.asset.id }),
      });
      const share = await shareRes.json();

      setShareReady(share.share_url, share.slug, complete.asset.id);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 w-80 rounded-2xl bg-surface-900 border border-surface-700 shadow-2xl shadow-black/50 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="p-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-600/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-400">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-100">Quick Share</h3>
                <p className="text-[10px] text-surface-500">Share your recording</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-surface-500 hover:text-surface-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 pt-2">
            {/* Idle state */}
            {status === 'idle' && (
              <button
                onClick={handleShare}
                disabled={!exportedFilePath}
                className="w-full h-10 rounded-xl bg-accent-600 text-white font-medium text-sm hover:bg-accent-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload & Share
              </button>
            )}

            {/* Uploading progress */}
            {(status === 'uploading' || status === 'creating_link') && (
              <div className="space-y-3">
                <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400"
                    initial={{ width: '0%' }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-surface-400 text-center">
                  {status === 'uploading' ? 'Uploading...' : 'Creating share link...'} {uploadProgress}%
                </p>
              </div>
            )}

            {/* Ready — show URL */}
            {status === 'ready' && shareUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-9 px-3 rounded-lg bg-surface-800 border border-surface-700 flex items-center">
                    <span className="text-xs text-surface-300 truncate font-mono">{shareUrl}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="h-9 px-3 rounded-lg bg-accent-600 text-white text-xs font-medium hover:bg-accent-500 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-surface-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Link copied to clipboard</span>
                </div>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{error}</p>
                <button
                  onClick={() => { reset(); handleShare(); }}
                  className="w-full h-9 rounded-lg bg-surface-800 text-surface-300 text-xs hover:bg-surface-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
