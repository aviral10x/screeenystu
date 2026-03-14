import { useState } from 'react';
import { useZoomStore, type ZoomSegment } from '@/stores/zoom-store';
import { useCursorStore, type ClickEffectStyle } from '@/stores/cursor-store';
import { useCanvasStore, WALLPAPER_CATEGORIES, GRADIENT_PRESETS, type AspectRatio } from '@/stores/canvas-store';
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
    inset, setInset,
    shadowEnabled, setShadowEnabled,
    shadowIntensity, setShadowIntensity,
    frameStyle, setFrameStyle,
    webcam, setWebcam,
  } = useCanvasStore();
  const { style, setStyle } = useCursorStore();
  const { intro, outro, setIntro, setOutro } = useIntroOutroStore();

  const [bgTab, setBgTab] = useState<'wallpaper' | 'gradient' | 'color' | 'image'>(background.type);

  // Sync tab with store if store changes externally
  if (bgTab !== background.type) {
    setBgTab(background.type);
  }

  const handleBgTabChange = (tab: 'wallpaper' | 'gradient' | 'color' | 'image') => {
    setBgTab(tab);
    if (tab === 'wallpaper') setBackground({ type: 'wallpaper', wallpaperId: 'macos-1', backgroundBlur: 20 });
    else if (tab === 'gradient') setBackground({ type: 'gradient', gradientColors: ['#3F37C9', '#8C87DF'] });
    else if (tab === 'color') setBackground({ type: 'color', color: '#3F37C9' });
    else if (tab === 'image') setBackground({ type: 'image', imagePath: '' });
  };

  return (
    <div className="h-full w-full bg-[#111214] border-l border-[#1E1F24] flex flex-col no-select text-white">
      <div className="p-3 border-b border-[#1E1F24] gap-2 flex items-center">
        <div className="w-5 h-5 rounded-md bg-[#1C1D20] border border-[#2D2E40] flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        </div>
        <h3 className="text-[13px] font-medium text-[#E4E4E6]">Canvas</h3>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[#2D2E40]">
        
        {/* Aspect Ratio */}
        <Section label="Aspect Ratio">
          <div className="grid grid-cols-3 gap-1.5">
            {(['16:9', '9:16', '1:1', '16:10', '4:3', 'auto'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`h-7 rounded-lg text-[11px] font-medium transition-colors border ${
                  aspectRatio === ratio
                    ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-[#7C5CFC]'
                    : 'border-[#2D2E40] text-[#A0A2B1] hover:border-[#4A4B53] hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </Section>

        {/* Background Block */}
        <div className="space-y-4">
          <Section label="Background">
            <div className="flex p-1 bg-[#1C1D20] rounded-xl border border-[#2D2E40]">
              {(['wallpaper', 'gradient', 'color', 'image'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleBgTabChange(tab)}
                  className={`flex-1 h-7 rounded-lg text-[12px] font-medium capitalize transition-colors ${
                    bgTab === tab
                      ? 'bg-[#2D2E40] text-white shadow-sm'
                      : 'text-[#6B6D76] hover:text-[#A0A2B1]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </Section>

          {/* Wallpaper Tab */}
          {bgTab === 'wallpaper' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <Section label="Wallpaper">
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  <button className="shrink-0 h-7 w-8 flex items-center justify-center rounded-lg border border-[#2D2E40] text-[#A0A2B1] hover:text-white bg-[#1A1B24]">★</button>
                  {WALLPAPER_CATEGORIES.map((cat) => (
                    <button key={cat} className={`shrink-0 h-7 px-3 rounded-lg text-[11px] font-medium transition-colors border ${cat === 'macOS' ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-[#7C5CFC]' : 'border-[#2D2E40] text-[#A0A2B1] hover:text-white'}`}>{cat}</button>
                  ))}
                </div>
                <button className="w-full h-8 mt-2 rounded-lg bg-[#1C1D20] border border-[#2D2E40] text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-[#252628] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                  Pick random wallpaper
                </button>
                <div className="grid grid-cols-5 gap-1.5 mt-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <button key={i} className={`aspect-square rounded-lg border-2 ${i === 0 ? 'border-white' : 'border-transparent hover:border-[#4A4B53]'} overflow-hidden transition-all`} onClick={() => setBackground({ ...background, wallpaperId: `macos-${i}` })}>
                      <div className="w-full h-full bg-gradient-to-br from-[#4f46e5] to-[#ec4899] opacity-80" />
                    </button>
                  ))}
                </div>
              </Section>
              <Section label="Background blur">
                <SliderRow value={background.backgroundBlur ?? 20} min={0} max={100} onChange={(v) => setBackground({ ...background, backgroundBlur: v })} suffix="" hideValue />
              </Section>
            </div>
          )}

          {/* Gradient Tab */}
          {bgTab === 'gradient' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <Section label="Background Gradient">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-[#1C1D20] border border-[#2D2E40] rounded-lg p-1.5">
                    <div className="w-6 h-6 rounded bg-[#3F37C9]" />
                    <span className="text-[11px] font-mono text-[#E4E4E6]">#3F37C9</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-[#1C1D20] border border-[#2D2E40] rounded-lg p-1.5">
                    <div className="w-6 h-6 rounded bg-[#8C87DF]" />
                    <span className="text-[11px] font-mono text-[#E4E4E6]">#8C87DF</span>
                  </div>
                </div>
              </Section>
              <Section label="Gradient presets">
                <div className="bg-[#1C1D20] border border-[#2D2E40] rounded-xl p-2.5 grid grid-cols-6 gap-1.5">
                  <button className="aspect-square rounded border border-[#4A4B53] flex items-center justify-center bg-transparent"><span className="w-4 h-px bg-white/20 rotate-45" /></button>
                  {GRADIENT_PRESETS.map((g, i) => (
                    <button key={i} onClick={() => setBackground({ type: 'gradient', gradientColors: g })} className="aspect-square rounded shadow-sm hover:scale-105 transition-transform" style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }} />
                  ))}
                  <button className="aspect-[2/1] col-span-2 rounded border border-[#2D2E40] bg-[#111214] flex items-center justify-center text-[#A0A2B1] hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </Section>
            </div>
          )}

          {/* Color Tab */}
          {bgTab === 'color' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <Section label="Background Color">
                <div className="flex-1 flex items-center gap-3 bg-[#1C1D20] border border-[#2D2E40] rounded-xl p-2">
                  <div className="w-10 h-8 rounded-lg" style={{ background: background.color || '#3F37C9' }} />
                  <span className="text-[13px] font-mono text-[#E4E4E6] uppercase">{background.color || '#3F37C9'}</span>
                </div>
              </Section>
            </div>
          )}
          
          {/* Image Tab */}
          {bgTab === 'image' && (
            <div className="p-4 border border-dashed border-[#2D2E40] rounded-xl flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-8 h-8 rounded-full bg-[#1C1D20] flex items-center justify-center text-[#A0A2B1]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <p className="text-[12px] text-[#A0A2B1]">Click or drag an image here</p>
            </div>
          )}
        </div>

        <Divider />

        {/* Layout Modifiers */}
        <div className="space-y-6">
          <Section label="Padding" action={<ResetButton onClick={() => setPadding(48)} />}>
            <SliderRow value={padding} min={0} max={120} onChange={setPadding} hideValue />
          </Section>
          
          <Section label="Rounded corners" action={<ResetButton onClick={() => setCornerRadius(12)} />}>
            <SliderRow value={cornerRadius} min={0} max={64} onChange={setCornerRadius} hideValue />
          </Section>

          <Section label="Inset" action={<ResetButton onClick={() => setInset(0)} />}>
            <SliderRow value={inset} min={0} max={100} onChange={setInset} hideValue />
          </Section>
        </div>

        <Divider />

        {/* Shadow */}
        <div className="space-y-3">
          <Section label="Shadow" action={<ResetButton onClick={() => setShadowIntensity(0.5)} />}>
            <SliderRow value={shadowIntensity} min={0} max={1} step={0.01} onChange={setShadowIntensity} hideValue />
          </Section>
          <button className="w-full h-10 px-3 flex items-center justify-between rounded-lg hover:bg-[#1C1D20] transition-colors border border-transparent hover:border-[#2D2E40]">
            <span className="text-[12px] font-medium text-[#A0A2B1]">Advanced shadow settings</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6B6D76]"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <Divider />

        {/* Window Frame */}
        <Section label="Window Frame">
          <div className="grid grid-cols-2 gap-1.5">
            {([['none', 'None'], ['macos', 'macOS'], ['browser', 'Browser'], ['clean', 'Clean']] as [FrameStyle, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFrameStyle(id)}
                className={`h-7 rounded-lg text-[11px] font-medium border transition-colors ${
                  frameStyle === id
                    ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-[#7C5CFC]'
                    : 'border-[#2D2E40] text-[#A0A2B1] hover:border-[#4A4B53] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
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
function Section({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[#A0A2B1] uppercase tracking-wider font-medium">{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}
function Divider() { return <div className="h-px bg-[#1E1F24]" />; }
function SliderRow({ value, min, max, step, onChange, suffix, hideValue }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string; hideValue?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="flex-1 h-1 bg-[#2D2E40] rounded-full appearance-none cursor-pointer accent-[#7C5CFC]" />
      {!hideValue && (
        <span className="text-[10px] text-[#A0A2B1] font-mono w-10 text-right">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}
        </span>
      )}
    </div>
  );
}
function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-medium text-[#6B6D76] hover:text-[#E4E4E6] px-1.5 py-0.5 rounded transition-colors"
    >
      Reset
    </button>
  );
}
function ToggleRow({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-8 h-[18px] rounded-full transition-colors relative ${checked ? 'bg-[#7C5CFC]' : 'bg-[#2D2E40]'}`}>
      <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}
function LabeledToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between"><span className="text-[11px] text-[#A0A2B1]">{label}</span><ToggleRow checked={checked} onChange={onChange} /></div>;
}
