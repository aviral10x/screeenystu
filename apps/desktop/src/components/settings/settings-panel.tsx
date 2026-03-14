import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';

// ─── Public Component ─────────────────────────────────────────────────────────

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<
    'general' | 'recording' | 'editing' | 'quick-export' | 'shortcuts' | 'advanced'
  >('general');
  const setView = useUIStore((s) => s.setView);

  const tabs = [
    { id: 'general' as const,      label: 'General',      icon: <GearIcon /> },
    { id: 'recording' as const,    label: 'Recording',    icon: <RecordIcon /> },
    { id: 'editing' as const,      label: 'Editing',      icon: <EditIcon /> },
    { id: 'quick-export' as const, label: 'Quick export', icon: <ExportIcon /> },
    { id: 'shortcuts' as const,    label: 'Shortcuts',    icon: <ShortcutsIcon /> },
    { id: 'advanced' as const,     label: 'Advanced',     icon: <AdvancedIcon /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#111214] text-white relative">
      {/* Close button */}
      <div className="absolute top-0 left-0 flex items-center h-12 px-4 z-10">
        <button
          onClick={() => setView('home')}
          className="w-3 h-3 rounded-full bg-[#FF5F57] hover:opacity-80 transition-opacity"
          title="Close"
        />
        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] ml-2 opacity-40 cursor-not-allowed" />
        <div className="w-3 h-3 rounded-full bg-[#28C840] ml-2 opacity-40 cursor-not-allowed" />
      </div>

      {/* Icon Tab Bar */}
      <div
        data-tauri-drag-region
        className="flex items-end justify-center pt-8 pb-0 border-b border-[#252628] gap-1 px-8 bg-[#111214]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 px-5 pb-3 pt-2 rounded-t-lg text-[11px] font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-white bg-[#1C1D20]'
                : 'text-[#6B6D76] hover:text-[#A0A2B1]'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-white' : 'text-[#6B6D76]'}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#1C1D20]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'general'      && <GeneralTab />}
            {activeTab === 'recording'    && <RecordingTab />}
            {activeTab === 'editing'      && <EditingTab />}
            {activeTab === 'quick-export' && <QuickExportTab />}
            {activeTab === 'shortcuts'    && <ShortcutsTab />}
            {activeTab === 'advanced'     && <AdvancedTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Tab Contents ─────────────────────────────────────────────────────────────

function GeneralTab() {
  const { startAtLogin, hideDockIcon, usageDataEnabled, set, reset } = useSettingsStore();
  return (
    <SettingsList>
      <SettingsRow
        title="Start ScreenCraft at login"
        description="Automatically start ScreenCraft when starting your computer."
        control={<Toggle enabled={startAtLogin} onChange={(v) => set({ startAtLogin: v })} />}
      />
      <Divider />
      <SettingsRow
        title="Hide Dock Icon"
        description="Will hide the Dock icon when there are no opened projects and no recordings in progress. You can still access ScreenCraft from the menu bar icon."
        control={<Toggle enabled={hideDockIcon} onChange={(v) => set({ hideDockIcon: v })} />}
      />
      <Divider />
      <SettingsRow
        title="Usage data"
        description={
          <>
            The app will collect usage data to help us improve it. It will never collect the content
            of your recordings.{' '}
            <a href="#" className="underline text-[#A0A2B1] underline-offset-2 hover:text-white transition-colors">
              Terms of Service and Privacy Policy
            </a>
            .
          </>
        }
        control={<Toggle enabled={usageDataEnabled} onChange={(v) => set({ usageDataEnabled: v })} />}
      />
      <Divider />
      {/* Reset */}
      <div className="px-6 pt-2 pb-6">
        <button
          onClick={() => { if (confirm('Reset all preferences to defaults?')) reset(); }}
          className="w-full py-2.5 rounded-lg border border-[#2D2E40] text-[#FF5F57] text-[14px] font-medium hover:bg-[#FF5F57]/10 transition-colors"
        >
          Reset preferences
        </button>
      </div>
    </SettingsList>
  );
}

function RecordingTab() {
  const { projectsDir, highlightRecordedArea, createZoomsAutomatically, showRecordingWidget, maxCameraResolution, set } = useSettingsStore();
  return (
    <SettingsList>
      <SettingsRow
        title="Save new projects to"
        description={projectsDir ?? '~/Movies/ScreenCraft'}
        control={
          <SecondaryButton onClick={() => {}}>Change directory</SecondaryButton>
        }
      />
      <Divider />
      <SettingsRow
        title="Highlight recorded area during recording"
        description="When enabled, part of the screen not being recorded will be slightly dimmed."
        control={<Toggle enabled={highlightRecordedArea} onChange={(v) => set({ highlightRecordedArea: v })} />}
      />
      <SettingsRow
        title="Create zooms automatically"
        description="When enabled, ScreenCraft will analyze your actions during the recording and create zooms automatically in every new project."
        control={<Toggle enabled={createZoomsAutomatically} onChange={(v) => set({ createZoomsAutomatically: v })} />}
      />
      <SettingsRow
        title="Show recording widget"
        description="When enabled, ScreenCraft will show a widget with the recording in progress status and controls."
        control={<Toggle enabled={showRecordingWidget} onChange={(v) => set({ showRecordingWidget: v })} />}
      />
      <Divider />
      <SettingsRow
        title="Maximum camera resolution"
        description="Max resolution at which your webcam will be recorded (if your webcam supports it). Higher resolutions improve video quality but may impact performance during recording."
        control={
          <SegmentedControl
            options={['720p', '1080p', '4K'] as const}
            value={maxCameraResolution}
            onChange={(v) => set({ maxCameraResolution: v as any })}
          />
        }
      />
    </SettingsList>
  );
}

function EditingTab() {
  const { useLastProjectSettings, autoSave, presetsDir, set } = useSettingsStore();
  return (
    <SettingsList>
      <SettingsRow
        title="Use last project settings as default for new recordings"
        description="When enabled, new recordings will be created with the same settings as the last project you edited. Note: If some of your presets is marked as default, it will be used instead."
        control={<Toggle enabled={useLastProjectSettings} onChange={(v) => set({ useLastProjectSettings: v })} />}
      />
      <Divider />
      <SettingsRow
        title="Use autosave"
        description="When enabled, app will save your project changes automatically every 30 seconds."
        control={<Toggle enabled={autoSave} onChange={(v) => set({ autoSave: v })} />}
      />
      <Divider />
      <SettingsRow
        title="Save presets in"
        description={presetsDir ?? '~/Documents/ScreenCraft Presets'}
        control={
          <SecondaryButton onClick={() => {}}>Change directory</SecondaryButton>
        }
      />
    </SettingsList>
  );
}

function QuickExportTab() {
  const {
    exportFormat, exportFrameRate, exportResolution, exportCompression,
    privateShareableLink, showQuickExportWidget, alwaysSaveOnQuickExport, set,
  } = useSettingsStore();

  const compressionDescriptions: Record<string, string> = {
    studio: 'Best possible quality. File size is noticeably larger.',
    social: 'Good for sharing on social media, etc. Compression is noticeable when taking a good look. Keep in mind that social media server might further compress the video.',
    web: 'Good for embedding on websites. Quality is decent, and file size is reasonable.',
    'web-low': 'Lower quality but very small file size. Good for previews or low-bandwidth scenarios.',
  };

  return (
    <SettingsList>
      {/* Quick export settings card */}
      <div className="px-6 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <ExportIcon />
          <span className="font-medium text-[15px]">Quick export settings</span>
        </div>
        <p className="text-[13px] text-[#6B6D76] mb-5">These settings will be used when using quick export or exporting from the widget.</p>

        <div className="border border-[#2D2E40] rounded-xl p-5 space-y-5">
          {/* Row 1: Format + Frame Rate + Private shareable link */}
          <div className="flex items-start gap-8">
            <div className="space-y-2">
              <p className="text-[12px] text-[#6B6D76] uppercase tracking-wider">Format</p>
              <SegmentedControl
                options={['MP4', 'GIF'] as const}
                value={exportFormat === 'mp4' ? 'MP4' : 'GIF'}
                onChange={(v) => set({ exportFormat: v === 'MP4' ? 'mp4' : 'gif' })}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[12px] text-[#6B6D76] uppercase tracking-wider">Frame rate</p>
              <SegmentedControl
                options={['30 FPS', '60 FPS'] as const}
                value={exportFrameRate === 30 ? '30 FPS' : '60 FPS'}
                onChange={(v) => set({ exportFrameRate: v === '30 FPS' ? 30 : 60 })}
              />
            </div>
            <div className="ml-auto space-y-1 min-w-[220px]">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#6B6D76]">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-[14px] font-medium">Private Shareable Link</span>
                <div className="ml-auto">
                  <Toggle enabled={privateShareableLink} onChange={(v) => set({ privateShareableLink: v })} />
                </div>
              </div>
              <p className="text-[12px] text-[#6B6D76] pl-5">Only the people you share this video with will be able to watch it.</p>
            </div>
          </div>

          {/* Row 2: Resolution */}
          <div className="space-y-2">
            <p className="text-[12px] text-[#6B6D76] uppercase tracking-wider">Resolution</p>
            <SegmentedControl
              options={['720p', '1080p', '4K'] as const}
              value={exportResolution}
              onChange={(v) => set({ exportResolution: v as any })}
            />
          </div>

          {/* Row 3: Compression */}
          <div className="space-y-2">
            <p className="text-[12px] text-[#6B6D76] uppercase tracking-wider">Compression</p>
            <SegmentedControl
              options={['Studio', 'Social Media', 'Web', 'Web (Low)'] as const}
              value={exportCompression === 'studio' ? 'Studio' : exportCompression === 'social' ? 'Social Media' : exportCompression === 'web' ? 'Web' : 'Web (Low)'}
              onChange={(v) => {
                const map: Record<string, string> = { 'Studio': 'studio', 'Social Media': 'social', 'Web': 'web', 'Web (Low)': 'web-low' };
                set({ exportCompression: map[v] as any });
              }}
            />
            <p className="text-[12px] text-[#8A8C9A] pt-1">{compressionDescriptions[exportCompression]}</p>
          </div>
        </div>
      </div>

      <Divider className="mt-6" />

      <SettingsRow
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
        title="Show quick export widget after recording"
        description="After the recording is done, a widget will appear that allows you to quickly export the recording. If disabled - full editor will be opened instead."
        control={<Toggle enabled={showQuickExportWidget} onChange={(v) => set({ showQuickExportWidget: v })} />}
      />
      <SettingsRow
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>}
        title="Always save project when using quick export widget"
        description="If enabled, the project will be always saved after using the quick export widget. If disabled, You will be asked if you want to save or delete project."
        control={<Toggle enabled={alwaysSaveOnQuickExport} onChange={(v) => set({ alwaysSaveOnQuickExport: v })} />}
      />
    </SettingsList>
  );
}

function ShortcutsTab() {
  const [subTab, setSubTab] = useState<'recording' | 'editing'>('recording');

  type Shortcut = { icon: React.ReactNode; title: string; description?: string; keys: string[] };
  const recordingShortcuts: Shortcut[] = [
    { icon: <RecordIcon />, title: 'Start new Recording / Finish recording', description: 'This shortcut will open new recording picker from anywhere in the system and it will also stop current recording.', keys: ['⌘', 'Control', '↵'] },
    { icon: <PauseIcon />, title: 'Resume/Pause recording in progress', keys: ['⌘', '⌥', 'P'] },
    { icon: <RestartIcon />, title: 'Restart recording in progress', keys: ['⌘', '⌥', '⏮'] },
    { icon: <FlagIcon />, title: 'Create recording flag', description: 'Press this shortcut while recording to create a recording flag. Later, you will see moments marked with flags on the video timeline.', keys: ['⌘', '⌥', 'Control F'] },
    { icon: <MonitorSmallIcon />, title: 'Record entire display', keys: ['⌘', '⌥', '3'] },
    { icon: <WindowSmallIcon />, title: 'Record single window', keys: ['⌘', '⌥', '4'] },
    { icon: <AreaSmallIcon />, title: 'Record area', keys: ['⌘', '⌥', '5'] },
    { icon: <HideIcon />, title: 'Show/Hide recording controls', description: 'While recording is in progress, will show widget allowing you to finish, cancel or restart recording.', keys: ['⌘', "⌥", "'"] },
  ];

  const editingShortcuts: Shortcut[] = [
    { icon: <PlayIcon />, title: 'Play / Pause', keys: ['Space'] },
    { icon: <SplitIcon />, title: 'Split clip at playhead', keys: ['⌘', 'B'] },
    { icon: <DeleteIcon />, title: 'Delete selected clip', keys: ['⌘', '⌫'] },
    { icon: <ZoomInIcon />, title: 'Add zoom at playhead', keys: ['⌘', 'Z'] },
  ];

  const shortcuts = subTab === 'recording' ? recordingShortcuts : editingShortcuts;

  return (
    <div className="px-6 pt-6 pb-8">
      {/* Sub-tab toggle */}
      <div className="flex gap-1 p-1 bg-[#111214] rounded-xl w-fit mb-8">
        {(['recording', 'editing'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              subTab === t ? 'bg-[#1C1D20] text-white shadow' : 'text-[#6B6D76] hover:text-white'
            }`}
          >
            {t === 'recording' ? <RecordIcon /> : <PlayIcon />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {shortcuts.map((s, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-[#1E1F24] last:border-0">
            <span className="mt-0.5 text-[#6B6D76] shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-[#E4E4E6] font-medium">{s.title}</p>
              {s.description && <p className="text-[12px] text-[#6B6D76] mt-0.5 leading-relaxed">{s.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <button className="text-[#4A4B53] hover:text-[#FF5F57] transition-colors mr-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
              </button>
              {s.keys.map((k, ki) => (
                <kbd
                  key={ki}
                  className="min-w-[32px] h-8 px-2 inline-flex items-center justify-center text-[12px] font-medium bg-[#111214] border border-[#2D2E40] rounded-lg text-[#C0C2CC]"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#1A1B24] border border-[#2D2E40] flex items-center justify-center mb-4 text-[#4A4B53]">
        <AdvancedIcon />
      </div>
      <p className="text-[15px] font-medium text-[#6B6D76]">Advanced options</p>
      <p className="text-[13px] text-[#4A4B53] mt-1">Coming soon</p>
    </div>
  );
}

// ─── Shared Sub-components ───────────────────────────────────────────────────

function SettingsList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-[#1E1F24]">{children}</div>;
}

function SettingsRow({
  title, description, control, icon,
}: {
  title: string;
  description?: React.ReactNode;
  control?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 px-6 py-5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#6B6D76] shrink-0">{icon}</span>}
          <p className="text-[15px] font-medium text-[#E4E4E6]">{title}</p>
        </div>
        {description && (
          <p className="text-[13px] text-[#6B6D76] mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      {control && <div className="shrink-0 flex items-center pt-0.5">{control}</div>}
    </div>
  );
}

function Divider({ className }: { className?: string }) {
  return <div className={`h-px bg-[#252628] mx-6 ${className ?? ''}`} />;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? 'bg-[#7C5CFC]' : 'bg-[#3A3B44]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition duration-200 ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-[#2D2E40] bg-[#111214]">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-[13px] font-medium transition-colors border-r border-[#2D2E40] last:border-r-0 ${
            value === opt
              ? 'bg-[#2D2E40] text-white'
              : 'text-[#6B6D76] hover:text-[#A0A2B1] hover:bg-[#1A1B20]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg bg-[#252628] border border-[#3A3B44] text-[13px] font-medium text-[#D0D0DC] hover:bg-[#2D2E38] transition-colors whitespace-nowrap"
    >
      {children}
    </button>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function RecordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function ShortcutsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="4" height="4" rx="1" />
      <rect x="9" y="4" width="6" height="4" rx="1" />
      <rect x="18" y="4" width="4" height="4" rx="1" />
      <rect x="2" y="11" width="4" height="4" rx="1" />
      <rect x="9" y="11" width="6" height="4" rx="1" />
      <rect x="18" y="11" width="4" height="4" rx="1" />
      <rect x="2" y="18" width="20" height="4" rx="1" />
    </svg>
  );
}
function AdvancedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      <circle cx="12" cy="12" r="7" strokeDasharray="2 2" />
    </svg>
  );
}
function PauseIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="10" y1="4" x2="10" y2="20"/><line x1="14" y1="4" x2="14" y2="20"/></svg>;
}
function RestartIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>;
}
function FlagIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
}
function MonitorSmallIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
}
function WindowSmallIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>;
}
function AreaSmallIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h3M4 17v3h3M17 4h3v3M20 17v3h-3"/></svg>;
}
function HideIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
function PlayIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}
function SplitIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 12l10-3M2 12l10 3M22 12l-10-3M22 12l-10 3"/></svg>;
}
function DeleteIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>;
}
function ZoomInIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
}
