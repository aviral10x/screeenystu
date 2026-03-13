import { useMemo, useRef } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useCursorStore, type ClickEffectStyle } from '@/stores/cursor-store';

interface CursorOverlayProps {
  cursorPoints: Array<{ timestamp_ms: number; x: number; y: number; visible: boolean }>;
  clickEvents: Array<{ timestamp_ms: number; x: number; y: number; button: string; click_type: string }>;
  keyboardEvents: Array<{ timestamp_ms: number; key: string; modifiers: string[]; is_shortcut: boolean; display_label?: string }>;
  sourceWidth: number;
  sourceHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export function CursorOverlay({
  cursorPoints,
  clickEvents,
  keyboardEvents,
  sourceWidth,
  sourceHeight,
  containerWidth,
  containerHeight,
}: CursorOverlayProps) {
  const playheadMs = useProjectStore((s) => s.playheadMs);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const { style } = useCursorStore();
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);

  if (!style.visible || cursorPoints.length === 0) return null;

  const cursorPos = useMemo(() => {
    return interpolateCursorPosition(cursorPoints, playheadMs);
  }, [cursorPoints, playheadMs]);

  if (!cursorPos) return null;

  const scaleX = containerWidth / sourceWidth;
  const scaleY = containerHeight / sourceHeight;
  const x = cursorPos.x * scaleX;
  const y = cursorPos.y * scaleY;

  // Update trail history
  if (style.trailEnabled) {
    trailRef.current.push({ x, y });
    if (trailRef.current.length > style.trailLength) {
      trailRef.current = trailRef.current.slice(-style.trailLength);
    }
  }

  // Active click (within 600ms)
  const activeClick = clickEvents.find(
    (c) => playheadMs >= c.timestamp_ms && playheadMs <= c.timestamp_ms + 600,
  );
  const clickAge = activeClick ? (playheadMs - activeClick.timestamp_ms) / 600 : 1;

  // Active shortcut (within 1500ms)
  const activeShortcut = keyboardEvents.find(
    (k) => k.is_shortcut && playheadMs >= k.timestamp_ms && playheadMs <= k.timestamp_ms + 1500,
  );
  const shortcutAge = activeShortcut ? (playheadMs - activeShortcut.timestamp_ms) / 1500 : 1;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Spotlight effect */}
      {style.spotlightEnabled && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle ${style.spotlightRadius}px at ${x}px ${y}px, transparent 0%, rgba(0,0,0,${style.spotlightOpacity}) 100%)`,
          }}
        />
      )}

      {/* Cursor trail */}
      {style.trailEnabled && trailRef.current.length > 1 && (
        <svg className="absolute inset-0 w-full h-full">
          {trailRef.current.map((point, i) => {
            if (i === trailRef.current.length - 1) return null;
            const next = trailRef.current[i + 1];
            const progress = i / trailRef.current.length;
            return (
              <line
                key={i}
                x1={point.x}
                y1={point.y}
                x2={next.x}
                y2={next.y}
                stroke={style.highlightColor}
                strokeWidth={2 + progress * 3}
                strokeLinecap="round"
                opacity={progress * style.trailOpacity}
              />
            );
          })}
        </svg>
      )}

      {/* Click effects */}
      {style.clickEffectEnabled && activeClick && (
        <ClickEffect
          style={style.clickEffectStyle}
          x={activeClick.x * scaleX}
          y={activeClick.y * scaleY}
          age={clickAge}
          color={style.clickEffectColor}
        />
      )}

      {/* Cursor dot */}
      <div
        className="absolute rounded-full"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${style.size}px`,
          height: `${style.size}px`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: style.color,
          boxShadow: `0 0 ${style.size * 0.8}px ${style.highlightColor}50, 0 2px 8px rgba(0,0,0,0.3)`,
          transition: isPlaying ? 'none' : 'left 0.05s, top 0.05s',
        }}
      >
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ backgroundColor: style.highlightColor }}
        />
      </div>

      {/* Keyboard shortcut badge */}
      {style.shortcutBadgeEnabled && activeShortcut && activeShortcut.display_label && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${x + style.size + 4}px`,
            top: `${y - 28}px`,
            opacity: shortcutAge < 0.8 ? 1 : 1 - (shortcutAge - 0.8) / 0.2,
            transform: `translateY(${shortcutAge < 0.1 ? (1 - shortcutAge / 0.1) * 6 : 0}px)`,
          }}
        >
          <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-black/85 text-white border border-white/15 shadow-xl backdrop-blur-sm">
            {activeShortcut.display_label}
          </div>
        </div>
      )}
    </div>
  );
}

/** Different click effect styles */
function ClickEffect({ style, x, y, age, color }: {
  style: ClickEffectStyle; x: number; y: number; age: number; color: string;
}) {
  if (style === 'ripple') {
    return (
      <>
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${x}px`, top: `${y}px`,
            width: `${24 + age * 50}px`, height: `${24 + age * 50}px`,
            transform: 'translate(-50%, -50%)',
            border: `2px solid ${color}`,
            opacity: (1 - age) * 0.8,
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${x}px`, top: `${y}px`,
            width: `${16 + age * 30}px`, height: `${16 + age * 30}px`,
            transform: 'translate(-50%, -50%)',
            border: `1.5px solid ${color}`,
            opacity: (1 - age) * 0.5,
          }}
        />
      </>
    );
  }

  if (style === 'pulse') {
    return (
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: `${x}px`, top: `${y}px`,
          width: `${30 + age * 20}px`, height: `${30 + age * 20}px`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          opacity: (1 - age) * 0.3,
        }}
      />
    );
  }

  if (style === 'ring') {
    return (
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: `${x}px`, top: `${y}px`,
          width: `${40}px`, height: `${40}px`,
          transform: `translate(-50%, -50%) scale(${1 + age * 0.5})`,
          border: `3px solid ${color}`,
          opacity: (1 - age),
        }}
      />
    );
  }

  // confetti
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 10 + age * 40;
    return {
      px: x + Math.cos(angle) * dist,
      py: y + Math.sin(angle) * dist,
      hue: (i * 45) % 360,
    };
  });

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${p.px}px`, top: `${p.py}px`,
            width: '4px', height: '4px',
            borderRadius: i % 2 === 0 ? '50%' : '1px',
            backgroundColor: `hsl(${p.hue}, 80%, 60%)`,
            opacity: (1 - age) * 0.9,
            transform: `translate(-50%, -50%) rotate(${age * 180}deg)`,
          }}
        />
      ))}
    </>
  );
}

function interpolateCursorPosition(
  points: Array<{ timestamp_ms: number; x: number; y: number; visible: boolean }>,
  timeMs: number,
): { x: number; y: number } | null {
  if (points.length === 0) return null;

  let low = 0;
  let high = points.length - 1;

  if (timeMs <= points[0].timestamp_ms) return { x: points[0].x, y: points[0].y };
  if (timeMs >= points[high].timestamp_ms) return { x: points[high].x, y: points[high].y };

  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].timestamp_ms <= timeMs) low = mid;
    else high = mid;
  }

  const p0 = points[low];
  const p1 = points[high];
  const dt = p1.timestamp_ms - p0.timestamp_ms;
  if (dt === 0) return { x: p0.x, y: p0.y };

  let t = (timeMs - p0.timestamp_ms) / dt;
  t = t * t * (3 - 2 * t);

  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t,
  };
}
