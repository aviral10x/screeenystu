import { z } from 'zod';

export const MediaTypeSchema = z.enum([
  'ScreenRecording',
  'CameraRecording',
  'MicrophoneAudio',
  'SystemAudio',
  'BackgroundMusic',
  'ImportedVideo',
  'ImportedAudio',
  'ImportedImage',
]);

export const SourceMediaSchema = z.object({
  id: z.string().uuid(),
  media_type: MediaTypeSchema,
  relative_path: z.string(),
  filename: z.string(),
  duration_ms: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  fps: z.number().nullable(),
  sample_rate: z.number().nullable(),
  file_size_bytes: z.number(),
  added_at: z.string(),
  codec: z.string().nullable(),
  has_proxy: z.boolean(),
  proxy_path: z.string().nullable(),
});
