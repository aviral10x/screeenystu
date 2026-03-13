import { z } from 'zod';
import { TimelineStateSchema } from './timeline';
import { SourceMediaSchema } from './media';

export const CanvasSettingsSchema = z.object({
  aspect_ratio: z.union([
    z.literal('Landscape16x9'),
    z.literal('Landscape16x10'),
    z.literal('Portrait9x16'),
    z.literal('Square1x1'),
    z.object({ Custom: z.object({ width: z.number(), height: z.number() }) }),
  ]),
  background: z.discriminatedUnion('type', [
    z.object({ type: z.literal('SolidColor'), color: z.string() }),
    z.object({
      type: z.literal('LinearGradient'),
      from: z.string(),
      to: z.string(),
      angle: z.number(),
    }),
    z.object({ type: z.literal('RadialGradient'), from: z.string(), to: z.string() }),
    z.object({ type: z.literal('Image'), path: z.string() }),
    z.object({ type: z.literal('Transparent') }),
  ]),
  padding: z.number(),
  corner_radius: z.number(),
  shadow: z.object({
    enabled: z.boolean(),
    color: z.string(),
    blur: z.number(),
    offset_x: z.number(),
    offset_y: z.number(),
    spread: z.number(),
  }),
  inset: z.number(),
});

export const CursorSettingsSchema = z.object({
  visible: z.boolean(),
  smoothing_enabled: z.boolean(),
  smoothing_amount: z.number(),
  size_multiplier: z.number(),
  use_custom_cursor: z.boolean(),
  hide_when_static: z.boolean(),
  hide_static_delay_ms: z.number(),
  click_emphasis: z.object({
    enabled: z.boolean(),
    style: z.enum(['Pulse', 'Ring', 'Ripple']),
    color: z.string(),
    size: z.number(),
    duration_ms: z.number(),
    sound_enabled: z.boolean(),
  }),
});

export const ProjectSchema = z.object({
  schema_version: z.number(),
  id: z.string().uuid(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  capture_session: z.any().nullable(),
  sources: z.array(SourceMediaSchema),
  timeline: TimelineStateSchema,
  interaction_stream: z.any().nullable(),
  zoom_segments: z.array(z.any()),
  speed_segments: z.array(z.any()),
  caption_segments: z.array(z.any()),
  mask_segments: z.array(z.any()),
  camera_layout_segments: z.array(z.any()),
  canvas: CanvasSettingsSchema,
  cursor_settings: CursorSettingsSchema,
  export_presets: z.array(z.any()),
  preset_id: z.string().nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;
