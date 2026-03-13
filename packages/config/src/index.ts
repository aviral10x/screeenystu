// ScreenCraft application constants

export const APP_NAME = 'ScreenCraft';
export const APP_VERSION = '0.1.0';
export const APP_IDENTIFIER = 'com.screencraft.app';

// Schema version — must match Rust SCHEMA_VERSION
export const SCHEMA_VERSION = 1;

// Project file extension
export const PROJECT_EXTENSION = '.screencraft';
export const PROJECT_MANIFEST_FILE = 'project.json';

// Project bundle directory structure
export const PROJECT_DIRS = {
  ASSETS: 'assets',
  CACHE: 'cache',
  EXPORTS: 'exports',
  THUMBNAILS: 'cache/thumbnails',
  WAVEFORMS: 'cache/waveforms',
  PROXIES: 'cache/proxies',
} as const;

// Default canvas settings
export const DEFAULT_PADDING = 48;
export const DEFAULT_CORNER_RADIUS = 12;
export const DEFAULT_SHADOW_BLUR = 40;

// Default cursor settings
export const DEFAULT_CURSOR_SIZE = 1.5;
export const DEFAULT_CURSOR_SMOOTHING = 0.5;
export const DEFAULT_HIDE_STATIC_DELAY_MS = 3000;

// Recording defaults
export const DEFAULT_FPS = 60;
export const DEFAULT_CAPTURE_AUDIO = true;
export const DEFAULT_CAPTURE_CAMERA = false;

// Export defaults
export const DEFAULT_EXPORT_FPS = 30;
export const DEFAULT_EXPORT_RESOLUTION = '1080p' as const;
export const DEFAULT_EXPORT_FORMAT = 'mp4' as const;

// Undo/redo limits
export const MAX_UNDO_STACK_SIZE = 200;

// Auto-save interval
export const AUTOSAVE_INTERVAL_MS = 30_000;

// Zoom analysis defaults
export const MIN_ZOOM_SEGMENT_DURATION_MS = 1500;
export const MAX_ZOOM_SCALE = 3.0;
export const MIN_ZOOM_CONFIDENCE = 0.3;

// API endpoints
export const SHARE_API_URL = process.env.SCREENCRAFT_API_URL || 'http://localhost:3001';
