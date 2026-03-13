/// Frontend-facing TypeScript types.
/// These mirror key Rust types from project-model for IPC communication.

export interface Project {
  schema_version: number;
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  sources: SourceMedia[];
  canvas: CanvasSettings;
  cursor_settings: CursorSettings;
}

export interface SourceMedia {
  id: string;
  media_type: MediaType;
  relative_path: string;
  filename: string;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  file_size_bytes: number;
}

export type MediaType =
  | 'ScreenRecording'
  | 'CameraRecording'
  | 'MicrophoneAudio'
  | 'SystemAudio'
  | 'BackgroundMusic'
  | 'ImportedVideo'
  | 'ImportedAudio'
  | 'ImportedImage';

export interface CanvasSettings {
  aspect_ratio: AspectRatio;
  background: Background;
  padding: number;
  corner_radius: number;
  shadow: ShadowSettings;
  inset: number;
}

export type AspectRatio =
  | 'Landscape16x9'
  | 'Landscape16x10'
  | 'Portrait9x16'
  | 'Square1x1'
  | { Custom: { width: number; height: number } };

export type Background =
  | { type: 'SolidColor'; color: string }
  | { type: 'LinearGradient'; from: string; to: string; angle: number }
  | { type: 'RadialGradient'; from: string; to: string }
  | { type: 'Image'; path: string }
  | { type: 'Transparent' };

export interface ShadowSettings {
  enabled: boolean;
  color: string;
  blur: number;
  offset_x: number;
  offset_y: number;
  spread: number;
}

export interface CursorSettings {
  visible: boolean;
  smoothing_enabled: boolean;
  smoothing_amount: number;
  size_multiplier: number;
  hide_when_static: boolean;
  click_emphasis: {
    enabled: boolean;
    style: 'Pulse' | 'Ring' | 'Ripple';
    color: string;
    size: number;
  };
}

export interface TimeRange {
  start_ms: number;
  end_ms: number;
}

export interface RecordingConfig {
  target: RecordingTarget;
  mic_enabled: boolean;
  camera_enabled: boolean;
  system_audio_enabled: boolean;
}

export type RecordingTarget =
  | { type: 'FullDisplay'; display_id: number }
  | { type: 'Window'; window_id: number }
  | { type: 'Area'; x: number; y: number; width: number; height: number };
