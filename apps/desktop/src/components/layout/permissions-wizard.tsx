import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { permissionCommands } from '@/hooks/use-tauri-command';

interface PermissionsWizardProps {
  onComplete: () => void;
}

type WizardStep = 'permissions' | 'user-type';

export function PermissionsWizard({ onComplete }: PermissionsWizardProps) {
  const [step, setStep] = useState<WizardStep>('permissions');
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({
    screen: false,
    camera: false,
    microphone: false,
    accessibility: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [usageDataEnabled, setUsageDataEnabled] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

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
  const canContinue = allCoreGranted && termsAccepted;

  return (
    <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center p-8 font-sans">
      <AnimatePresence mode="wait">
        {step === 'permissions' ? (
          <motion.div
            key="permissions-step"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[560px] relative"
          >
            <div className="relative text-center mb-10">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#180A30] border-4 border-[#8B3DFF] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(139,61,255,0.3)]">
                 <div className="w-12 h-12 rounded-full bg-[#0B0C10]" />
              </div>
              
              <h1 className="text-3xl font-semibold text-white tracking-tight mb-3">
                Welcome to ScreenCraft!
              </h1>
              <p className="text-[#8F909A] text-sm">
                Before you can start recording, we need to ask you for a few permissions.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-6 mb-10">
              <PermissionCard
                title="Screen Recording Permission"
                description="ScreenCraft needs to capture video of your screen. You might need to restart the app after granting it."
                buttonText="Allow Screen Recording"
                grantedText="Screen Recording enabled"
                isGranted={permissions.screen}
                onRequest={() => handleRequest('screen')}
              />
              <PermissionCard
                title="Accessibility Permission"
                description="ScreenCraft needs to capture mouse movements and shortcut keystrokes while you are recording your screen."
                buttonText="Allow Accessibility access"
                grantedText="Accessibility access enabled"
                isGranted={permissions.accessibility}
                onRequest={() => handleRequest('accessibility')}
              />
              
              {/* Usage Data Card */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="font-medium text-[#E4E4E6] text-[15px] mb-1.5">Usage data</h3>
                  <p className="text-[13px] text-[#8F909A] leading-relaxed">
                    The app will collect usage data to help us improve it. It will never collect the content of your recordings.<br/>
                    <a href="#" className="underline decoration-[#4A4B53] hover:text-white transition-colors underline-offset-2">Terms of Service and Privacy Policy</a>.
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <Toggle enabled={usageDataEnabled} onChange={setUsageDataEnabled} />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <label className="flex items-center gap-3 cursor-pointer mb-6 group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded border border-[#2D2E35] bg-[#12131A] peer-checked:bg-[#4E39FD] peer-checked:border-[#4E39FD] transition-all flex items-center justify-center">
                     <AnimatePresence>
                       {termsAccepted && (
                         <motion.svg 
                           initial={{ scale: 0, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           exit={{ scale: 0, opacity: 0 }}
                           width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                         >
                           <polyline points="20 6 9 17 4 12" />
                         </motion.svg>
                       )}
                     </AnimatePresence>
                  </div>
                </div>
                <span className="text-[13px] text-[#6B6D76] group-hover:text-[#8F909A] transition-colors">
                  I agree to the <a href="#" className="underline decoration-[#4A4B53] hover:text-white transition-colors underline-offset-2">Terms of Service</a> and <a href="#" className="underline decoration-[#4A4B53] hover:text-white transition-colors underline-offset-2">Privacy Policy</a>.
                </span>
              </label>

              <button
                onClick={() => setStep('user-type')}
                disabled={!canContinue}
                className={`py-3 px-8 rounded-lg font-medium text-[15px] transition-all duration-300 flex items-center justify-center gap-2 ${
                  canContinue
                    ? 'bg-[#4E39FD] hover:bg-[#5C4DFF] text-white shadow-[0_4px_14px_rgba(78,57,253,0.4)]'
                    : 'bg-[#15161C] text-[#34353E] cursor-not-allowed border border-[#1C1D24]'
                }`}
              >
                {canContinue && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                     <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                )}
                Accept and Continue
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="user-type-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[640px] relative pt-16"
          >
            <button 
              onClick={() => setStep('permissions')}
              className="absolute top-0 left-0 flex items-center gap-2 text-[14px] text-[#A1A1AA] hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Go back
            </button>

            <div className="relative text-center mb-10 mt-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#180A30] border-4 border-[#8B3DFF] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(139,61,255,0.3)]">
                 <div className="w-12 h-12 rounded-full bg-[#0B0C10]" />
              </div>
              
              <h2 className="text-[32px] font-semibold text-white tracking-tight mb-3">
                Are you a new user?
              </h2>
              <p className="text-[#8F909A] text-[15px]">
                Have you used ScreenCraft before?
              </p>
            </div>

            <div className="space-y-4">
               <UserTypeCard 
                 icon={<SunIcon />}
                 title="I am a new user"
                 description="Feel free to play with all the features of ScreenCraft. You only need to activate ScreenCraft when exporting recordings to video files."
                 onClick={onComplete}
               />
               
               <UserTypeCard 
                 icon={<LayersIcon />}
                 title="I am an existing user"
                 description="We want to check if you have access to the current version of ScreenCraft. We are asking about it now to avoid interrupting your work when exporting your videos later."
                 onClick={onComplete}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PermissionCard({
  title,
  description,
  buttonText,
  grantedText,
  isGranted,
  onRequest,
}: {
  title: string;
  description: string;
  buttonText: string;
  grantedText: string;
  isGranted: boolean;
  onRequest: () => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0 pr-6">
        <h3 className="font-medium text-[#E4E4E6] text-[15px] mb-1.5">{title}</h3>
        <p className="text-[13px] text-[#8F909A] leading-relaxed">{description}</p>
      </div>

      <div className="shrink-0 w-[240px] pt-1">
        <AnimatePresence mode="wait">
          {isGranted ? (
            <motion.div
              key="granted"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-[#1A3824] bg-[#0E1F15] text-[#4ADE80] font-medium text-[13px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M20 6L9 17l-5-5" />
              </svg>
              {grantedText}
            </motion.div>
          ) : (
            <motion.button
              key="request"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onRequest}
              className="w-full h-10 px-4 rounded-lg bg-[#181920] border border-[#272833] hover:bg-[#202129] transition-colors text-[#A0A2B1] hover:text-[#D1D2DA] font-medium text-[13px] flex items-center justify-center"
            >
              {buttonText}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function UserTypeCard({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full text-left p-6 rounded-2xl bg-[#16171E] border border-[#252630] hover:bg-[#1A1B24] hover:border-[#383A4A] transition-all duration-300 group flex flex-col"
    >
      <div className="w-8 h-8 flex items-center justify-center text-[#E4E4E6] mb-5">
        {icon}
      </div>
      <div className="flex items-center justify-between w-full mb-3">
        <h3 className="text-xl font-medium text-white">{title}</h3>
        <span className="text-[#6B6D76] group-hover:text-white transition-colors transform group-hover:translate-x-1 duration-300">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <line x1="5" y1="12" x2="19" y2="12" />
             <polyline points="12 5 19 12 12 19" />
           </svg>
        </span>
      </div>
      <p className="text-[15px] text-[#A1A1AA] leading-relaxed pr-8">
        {description}
      </p>
    </button>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-[#7E57C2]' : 'bg-[#2D2E35]'
      }`}
      onClick={() => onChange(!enabled)}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M5 5l1.5 1.5" />
      <path d="M17.5 17.5L19 19" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M5 19l1.5-1.5" />
      <path d="M17.5 6.5L19 5" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
