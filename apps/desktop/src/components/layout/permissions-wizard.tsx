import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { permissionCommands } from '@/hooks/use-tauri-command';

interface PermissionsWizardProps {
  onComplete: () => void;
}

export function PermissionsWizard({ onComplete }: PermissionsWizardProps) {
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({
    screen: false,
    camera: false,
    microphone: false,
    accessibility: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      setError(null);
      const resStr = await permissionCommands.checkPermissions();
      const res = JSON.parse(resStr);
      if (res.permissions) {
        setPermissions(res.permissions);
      }
    } catch (e: any) {
      console.error('Failed to check permissions:', e);
      setError('Could not read permissions. Please restart the app.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll every 2 seconds to catch system setting changes
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRequest = async (type: 'screen' | 'camera' | 'microphone' | 'accessibility') => {
    try {
      await permissionCommands.requestPermission(type);
      await checkStatus();
    } catch (e) {
      console.error(`Failed to request ${type} permission:`, e);
    }
  };
  
  const allCoreGranted = permissions.screen && permissions.accessibility;

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-900 via-surface-950 to-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-surface-900/80 backdrop-blur-xl border border-surface-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        <div className="relative text-center mb-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent-500/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 className="text-3xl font-light text-white tracking-tight mb-3">
            Welcome to <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-blue-400">ScreenCraft</span>
          </h2>
          <p className="text-surface-400">
            To unlock the full potential of your video editor, please grant the following macOS permissions.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-10 relative">
          <PermissionItem
            title="Screen Recording"
            description="Required to capture your displays and windows."
            icon={<MonitorIcon />}
            isGranted={permissions.screen}
            isRequired={true}
            onRequest={() => handleRequest('screen')}
          />
          <PermissionItem
            title="Accessibility"
            description="Required to record keyboard shortcuts and interactions."
            icon={<MouseIcon />}
            isGranted={permissions.accessibility}
            isRequired={true}
            onRequest={() => handleRequest('accessibility')}
          />
          <PermissionItem
            title="Microphone"
            description="Required to record your voice while capturing."
            icon={<MicIcon />}
            isGranted={permissions.microphone}
            isRequired={false}
            onRequest={() => handleRequest('microphone')}
          />
          <PermissionItem
            title="Camera"
            description="Required to show a webcam overlay while capturing."
            icon={<CameraIcon />}
            isGranted={permissions.camera}
            isRequired={false}
            onRequest={() => handleRequest('camera')}
          />
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={onComplete}
            disabled={!allCoreGranted}
            className={`w-full py-3.5 px-6 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group ${
              allCoreGranted
                ? 'bg-white text-black hover:bg-surface-100 shadow-xl shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5'
                : 'bg-surface-800 text-surface-500 cursor-not-allowed'
            }`}
          >
            {allCoreGranted && (
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
            )}
            <span className="relative">
              {allCoreGranted ? 'Continue to App' : 'Grant required permissions to continue'}
            </span>
          </button>
          
          {!allCoreGranted && (
             <p className="text-xs text-surface-500 mt-4 h-4">
               Please restart ScreenCraft after granting permissions in System Settings.
             </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PermissionItem({
  title,
  description,
  icon,
  isGranted,
  isRequired,
  onRequest,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  isGranted: boolean;
  isRequired: boolean;
  onRequest: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-800/50 border border-surface-700/50 group hover:bg-surface-800 transition-colors">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        isGranted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-700 text-surface-400'
      }`}>
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-surface-100 truncate">{title}</h3>
          {!isRequired && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded-md">
              Optional
            </span>
          )}
        </div>
        <p className="text-sm text-surface-400 leading-snug pr-4">{description}</p>
      </div>

      <div className="shrink-0 flex items-center justify-center w-24">
        <AnimatePresence mode="wait">
          {isGranted ? (
            <motion.div
              key="granted"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="flex items-center gap-1.5 text-emerald-400 font-medium text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              Granted
            </motion.div>
          ) : (
            <motion.button
              key="request"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onRequest}
              className="h-8 px-4 text-sm font-medium text-white bg-accent-600 hover:bg-accent-500 rounded-lg transition-colors border border-accent-500/50 shadow-lg shadow-accent-600/20"
            >
              Request
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MonitorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function MouseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="7" />
      <line x1="12" y1="6" x2="12" y2="10" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
