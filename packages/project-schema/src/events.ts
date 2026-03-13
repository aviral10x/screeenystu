import { z } from 'zod';

export const CursorPointSchema = z.object({
  timestamp_ms: z.number(),
  x: z.number(),
  y: z.number(),
  visible: z.boolean(),
});

export const ClickEventSchema = z.object({
  timestamp_ms: z.number(),
  x: z.number(),
  y: z.number(),
  button: z.enum(['Left', 'Right', 'Middle']),
  click_type: z.enum(['Single', 'Double', 'Triple']),
});

export const KeyboardEventSchema = z.object({
  timestamp_ms: z.number(),
  key: z.string(),
  modifiers: z.array(z.enum(['Command', 'Shift', 'Option', 'Control', 'Function'])),
  event_type: z.enum(['KeyDown', 'KeyUp']),
  is_shortcut: z.boolean(),
  display_label: z.string().nullable(),
});

export const InteractionStreamSchema = z.object({
  cursor_points: z.array(CursorPointSchema),
  click_events: z.array(ClickEventSchema),
  keyboard_events: z.array(KeyboardEventSchema),
  scroll_events: z.array(z.any()),
  typing_segments: z.array(z.any()),
  active_app_changes: z.array(z.any()),
});
