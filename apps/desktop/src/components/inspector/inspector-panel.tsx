import { useZoomStore, type ZoomSegment } from '@/stores/zoom-store';
import { useCursorStore, type ClickEffectStyle } from '@/stores/cursor-store';
import { useCanvasStore, BACKGROUNDS, type AspectRatio } from '@/stores/canvas-store';
import { useIntroOutroStore, type IntroStyle, type OutroStyle } from '@/stores/intro-outro-store';
import type { FrameStyle } from '@/components/canvas/window-frame';

export function InspectorPanel() {
  const selectedSegment = useZoomStore((s) =>
    s.segments.find((z) => z.id === s.selectedSegmentId) ?? null,
  );

  if (selectedSegment) {
    return <ZoomInspector segment={selectedSegment} />;
  }

  return <CanvasInspector />;
}

function CanvasInspector() {
  const {
    aspectRatio, setAspectRatio,
    background, setBackground,
    padding, setPadding,
    cornerRadius, setCornerRadius,
    shadowEnabled, setShadowEnabled,
    shadowIntensity, setShadowIntensity,
    frameStyle, setFrameStyle,
    webcam, setWebcam,
  } = useCanvasStore();
  const { style, setStyle } = useCursorStore();
  const { intro, outro, setIntro, setOutro } = useIntroOutroStore();

  return (
    <div className="h-full w-full bg-surface-900 border-l border-surface-800 flex flex-col no-select">
      <div className="p-3 border-b border-surface-800">
        <h3 className="text-xs font-medium text-surface-300 uppercase tracking-wider">Inspector</h3>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
        {/* Aspect Ratio */}
        <Section label="Aspect Ratio">
          <div className="grid grid-cols-3 gap-1">
            {(['16:9', '9:16', '1:1', '16:10', '4:3', 'auto'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`h-6 rounded text-[10px] font-medium transition-colors ${
                  aspectRatio === ratio
                    ? 'border border-accent-500 bg-accent-600/15 text-accent-400'
                    : 'border border-surface-700 text-surface-400 hover:border-surface-600'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </Section>

        <Divider />

        {/* Background */}
        <Section label="Background">
          <div className="flex gap-1 flex-wrap">
            {BACKGROUNDS.map((bg, i) => (
              <button
                key={i}
                onClick={() => setBackground(bg)}
                className={`h-6 w-6 rounded border transition-colors ${
                  JSON.stringify(background) === JSON.stringify(bg)
                    ? 'border-accent-500 ring-1 ring-accent-500/50'
                    : 'border-surface-600 hover:border-surface-400'
                }`}
                style={{ background: bg.gradient || bg.color || '#09090b' }}
              />
            ))}
          </div>
        </Section>

        {/* Padding + Radius */}
        <Section label="Padding">
          <SliderRow value={padding} min={0} max={120} onChange={setPadding} suffix="px" />
        </Section>
        <Section label="Corner Radius">
          <SliderRow value={cornerRadius} min={0} max={32} onChange={setCornerRadius} suffix="px" />
        </Section>

        {/* Shadow */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-surface-400 uppercase tracking-wider">Shadow</span>
          <ToggleRow checked={shadowEnabled} onChange={setShadowEnabled} />
        </div>
        {shadowEnabled && (
          <SliderRow value={shadowIntensity} min={0} max={1} step={0.05} onChange={setShadowIntensity} suffix="" />
        )}

        <Divider />

        {/* Window Frame */}
        <Section label="Window Frame">
          <div className="grid grid-cols-2 gap-1">
            {([['none', 'None'], ['macos', 'macOS'], ['browser', 'Browser'], ['clean', 'Clean']] as [FrameStyle, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFrameStyle(id)}
                className={`h-6 rounded text-[10px] font-medium border transition-colors ${
                  frameStyle === id
                    ? 'border-accent-500 bg-accent-600/15 text-accent-400'
                    : 'border-surface-700 text-surface-400 hover:border-surface-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Divider />

        {/* Cursor */}
        <Section label="Cursor">
          <div className="space-y-1.5">
            <LabeledToggle label="Visible" checked={style.visible} onChange={(v) => setStyle({ visible: v })} />
            <LabeledToggle label="Click Effects" checked={style.clickEffectEnabled} onChange={(v) => setStyle({ clickEffectEnabled: v })} />
            {style.clickEffectEnabled && (
              <div className="grid grid-cols-2 gap-1 ml-0">
                {(['ripple', 'pulse', 'ring', 'confetti'] as ClickEffectStyle[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle({ clickEffectStyle: s })}
                    className={`h-5 rounded text-[9px] border transition-colors ${
                      style.clickEffectStyle === s
                        ? 'border-accent-500 bg-accent-600/15 text-accent-400'
                        : 'border-surface-700 text-surface-500 hover:border-surface-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <LabeledToggle label="Shortcut Badges" checked={style.shortcutBadgeEnabled} onChange={(v) => setStyle({ shortcutBadgeEnabled: v })} />
            <LabeledToggle label="Spotlight" checked={style.spotlightEnabled} onChange={(v) => setStyle({ spotlightEnabled: v })} />
            {style.spotlightEnabled && (
              <SliderRow value={style.spotlightRadius} min={50} max={300} onChange={(v) => setStyle({ spotlightRadius: v })} suffix="px" />
            )}
            <LabeledToggle label="Trail" checked={style.trailEnabled} onChange={(v) => setStyle({ trailEnabled: v })} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-300">Size</span>
              <input
                type="range" min="10" max="40" value={style.size}
                onChange={(e) => setStyle({ size: +e.target.value })}
                className="w-16 h-1 bg-surface-700 rounded-full appearance-none cursor-pointer accent-accent-500"
              />
            </div>
          </div>
        </Section>

        <Divider />

        {/* Camera */}
        <Section label="Camera">
          <div className="space-y-1.5">
            <LabeledToggle label="Show Webcam" checked={webcam.visible} onChange={(v) => setWebcam({ visible: v })} />
            {webcam.visible && (
              <>
                <div className="grid grid-cols-2 gap-1">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setWebcam({ position: pos })}
                      className={`h-5 rounded text-[9px] border transition-colors ${
                        webcam.position === pos
                          ? 'border-accent-500 bg-accent-600/15 text-accent-400'
                          : 'border-surface-700 text-surface-500'
                      }`}
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>
                <SliderRow value={webcam.size} min={0.05} max={0.4} step={0.01} onChange={(v) => setWebcam({ size: v })} suffix="" />
                <div className="flex gap-1">
                  {(['circle', 'rounded', 'rectangle'] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setWebcam({ shape })}
                      className={`flex-1 h-5 rounded text-[9px] border transition-colors ${
                        webcam.shape === shape
                          ? 'border-accent-500 bg-accent-600/15 text-accent-400'
                          : 'border-surface-700 text-surface-500'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Section>

        <Divider />

        {/* Intro */}
        <Section label="Intro">
          <div className="space-y-1.5">
            <LabeledToggle label="Enabled" checked={intro.enabled} onChange={(v) => setIntro({ enabled: v })} />
            {intro.enabled && (
              <>
                <input
                  type="text"
                  value={intro.title}
                  onChange={(e) => setIntro({ title: e.target.value })}
                  placeholder="Title"
                  className="w-full h-7 px-2 rounded-md bg-surface-800 border border-surface-700 text-xs text-surface-200 focus:border-accent-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={intro.subtitle}
                  onChange={(e) => setIntro({ subtitle: e.target.value })}
                  placeholder="Subtitle (optional)"
                  className="w-full h-7 px-2 rounded-md bg-surface-800 border border-surface-700 text-xs text-surface-200 focus:border-accent-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-1">
                  {(['fade', 'slide-up', 'zoom-in', 'typewriter'] as IntroStyle[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setIntro({ style: s })}
                      className={`h-5 rounded text-[9px] border transition-colors ${
                        intro.style === s
                          ? 'border-accent-500 bg-accent-600/15 text-accent-400'
                          : 'border-surface-700 text-surface-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <SliderRow value={intro.durationMs} min={500} max={5000} step={100} onChange={(v) => setIntro({ durationMs: v })} suffix="ms" />
              </>
            )}
          </div>
        </Section>

        {/* Outro */}
        <Section label="Outro">
          <div className="space-y-1.5">
            <LabeledToggle label="Enabled" checked={outro.enabled} onChange={(v) => setOutro({ enabled: v })} />
            {outro.enabled && (
              <>
                <input
                  type="text"
                  value={outro.title}
                  onChange={(e) => setOutro({ title: e.target.value })}
                  placeholder="Title"
                  className="w-full h-7 px-2 rounded-md bg-surface-800 border border-surface-700 text-xs text-surface-200 focus:border-accent-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-1">
                  {(['fade', 'slide-down', 'zoom-out'] as OutroStyle[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setOutro({ style: s })}
                      className={`h-5 rounded text-[9px] border transition-colors ${
                        outro.style === s
                          ? 'border-accent-500 bg-accent-600/15 text-accent-400'
                          : 'border-surface-700 text-surface-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <SliderRow value={outro.durationMs} min={500} max={5000} step={100} onChange={(v) => setOutro({ durationMs: v })} suffix="ms" />
              </>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function ZoomInspector({ segment }: { segment: ZoomSegment }) {
  const updateSegment = useZoomStore((s) => s.updateSegment);
  const selectSegment = useZoomStore((s) => s.selectSegment);

  return (
    <div className="h-full w-full bg-surface-900 border-l border-surface-800 flex flex-col no-select">
      <div className="p-3 border-b border-surface-800 flex items-center justify-between">
        <h3 className="text-xs font-medium text-surface-300 uppercase tracking-wider">Zoom Segment</h3>
        <button onClick={() => selectSegment(null)} className="text-xs text-surface-500 hover:text-surface-300">✕</button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        <Section label="Scale">
          <SliderRow value={segment.scale} min={1} max={4} step={0.1} onChange={(v) => updateSegment(segment.id, { scale: v })} suffix="×" />
        </Section>

        <Section label="Time Range">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-surface-500">Start</span>
              <span className="block text-surface-200 font-mono">{(segment.time_range.start_ms / 1000).toFixed(1)}s</span>
            </div>
            <div>
              <span className="text-surface-500">End</span>
              <span className="block text-surface-200 font-mono">{(segment.time_range.end_ms / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </Section>

        <Divider />

        <Section label="Transition In">
          <SliderRow value={segment.transition_in_ms} min={0} max={2000} step={50} onChange={(v) => updateSegment(segment.id, { transition_in_ms: v })} suffix="ms" />
        </Section>
        <Section label="Transition Out">
          <SliderRow value={segment.transition_out_ms} min={0} max={2000} step={50} onChange={(v) => updateSegment(segment.id, { transition_out_ms: v })} suffix="ms" />
        </Section>

        {segment.auto_generated && (
          <>
            <Divider />
            <div className="text-[10px] text-surface-500 bg-surface-800/50 rounded-lg p-2">
              Auto-generated · Confidence: {((segment.confidence ?? 0) * 100).toFixed(0)}%
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Utility Components ---
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-[11px] text-surface-400 uppercase tracking-wider">{label}</label>{children}</div>;
}
function Divider() { return <div className="h-px bg-surface-800" />; }
function SliderRow({ value, min, max, step, onChange, suffix }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="flex-1 h-1 bg-surface-700 rounded-full appearance-none cursor-pointer accent-accent-500" />
      <span className="text-[10px] text-surface-300 font-mono w-10 text-right">
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}
      </span>
    </div>
  );
}
function ToggleRow({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-8 h-[18px] rounded-full transition-colors relative ${checked ? 'bg-accent-600' : 'bg-surface-600'}`}>
      <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}
function LabeledToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between"><span className="text-[11px] text-surface-300">{label}</span><ToggleRow checked={checked} onChange={onChange} /></div>;
}
