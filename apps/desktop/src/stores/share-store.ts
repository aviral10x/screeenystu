import { create } from 'zustand';

export type ShareStatus = 'idle' | 'uploading' | 'creating_link' | 'ready' | 'error';

interface ShareState {
  status: ShareStatus;
  uploadProgress: number; // 0-100
  shareUrl: string | null;
  shareSlug: string | null;
  assetId: string | null;
  error: string | null;

  startUpload: () => void;
  setUploadProgress: (pct: number) => void;
  setShareReady: (url: string, slug: string, assetId: string) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  status: 'idle',
  uploadProgress: 0,
  shareUrl: null,
  shareSlug: null,
  assetId: null,
  error: null,

  startUpload: () => set({ status: 'uploading', uploadProgress: 0, error: null }),
  setUploadProgress: (pct) => set({ uploadProgress: pct }),
  setShareReady: (url, slug, assetId) => set({
    status: 'ready',
    shareUrl: url,
    shareSlug: slug,
    assetId,
    uploadProgress: 100,
  }),
  setError: (msg) => set({ status: 'error', error: msg }),
  reset: () => set({
    status: 'idle',
    uploadProgress: 0,
    shareUrl: null,
    shareSlug: null,
    assetId: null,
    error: null,
  }),
}));
