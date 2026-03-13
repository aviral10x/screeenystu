import { z } from 'zod';

export const TimeRangeSchema = z.object({
  start_ms: z.number(),
  end_ms: z.number(),
});

export const NormalizedRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const EasingCurveSchema = z.union([
  z.literal('Linear'),
  z.literal('EaseIn'),
  z.literal('EaseOut'),
  z.literal('EaseInOut'),
  z.object({
    CubicBezier: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }),
]);

export const TimelineStateSchema = z.object({
  trim: TimeRangeSchema.nullable(),
  playhead_ms: z.number(),
  ui_zoom: z.number(),
  is_playing: z.boolean(),
});

export const ZoomSegmentSchema = z.object({
  id: z.string().uuid(),
  time_range: TimeRangeSchema,
  target_rect: NormalizedRectSchema,
  scale: z.number(),
  ease_in: EasingCurveSchema,
  ease_out: EasingCurveSchema,
  transition_in_ms: z.number(),
  transition_out_ms: z.number(),
  auto_generated: z.boolean(),
  confidence: z.number().nullable(),
});

export const SpeedSegmentSchema = z.object({
  id: z.string().uuid(),
  time_range: TimeRangeSchema,
  speed: z.number(),
  preserve_pitch: z.boolean(),
  mute_audio: z.boolean(),
  auto_detected: z.boolean(),
});

export const MaskSegmentSchema = z.object({
  id: z.string().uuid(),
  time_range: TimeRangeSchema,
  mask_type: z.enum(['Rectangle', 'RoundedRectangle', 'Spotlight']),
  rect: NormalizedRectSchema,
  dim_opacity: z.number(),
  corner_radius: z.number(),
  feather: z.number(),
});

export const CameraLayoutSegmentSchema = z.object({
  id: z.string().uuid(),
  time_range: TimeRangeSchema,
  layout: z.any(),
  transition_ms: z.number(),
  transition_easing: EasingCurveSchema,
});
