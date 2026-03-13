// Supported video codecs
export const VIDEO_CODECS = {
  H264: 'h264',
  H265: 'h265',
  VP9: 'vp9',
  AV1: 'av1',
} as const;

// Supported audio codecs
export const AUDIO_CODECS = {
  AAC: 'aac',
  OPUS: 'opus',
  FLAC: 'flac',
} as const;

// Supported container formats
export const CONTAINER_FORMATS = {
  MP4: 'mp4',
  MOV: 'mov',
  WEBM: 'webm',
  GIF: 'gif',
} as const;

// Resolution presets
export const RESOLUTION_PRESETS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4K': { width: 3840, height: 2160 },
} as const;

// Frame rate presets
export const FPS_PRESETS = [24, 30, 60] as const;

// Common aspect ratios
export const ASPECT_RATIOS = {
  '16:9': 16 / 9,
  '16:10': 16 / 10,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:3': 4 / 3,
  '21:9': 21 / 9,
} as const;

export type VideoCodec = (typeof VIDEO_CODECS)[keyof typeof VIDEO_CODECS];
export type AudioCodec = (typeof AUDIO_CODECS)[keyof typeof AUDIO_CODECS];
export type ContainerFormat = (typeof CONTAINER_FORMATS)[keyof typeof CONTAINER_FORMATS];
export type ResolutionPreset = keyof typeof RESOLUTION_PRESETS;
export type FpsPreset = (typeof FPS_PRESETS)[number];
