import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { playRetroSound } from '../../utils/soundEffects';
import { speakHulk, playHulkRoar, HULK_VOICES } from '../../utils/hulkVoice';

interface ApiOfflineModalProps {
  checkIntervalMs?: number;
}

export const ApiOfflineModal: React.FC<ApiOfflineModalProps> = ({
  checkIntervalMs = 3000,
}) => {
  const { theme } = useTheme();

  const [isApiOnline, setIsApiOnline] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('api_voice_guidance_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const [hulkAngryCount, setHulkAngryCount] = useState<number>(0);
  const [outsideWarningMessage, setOutsideWarningMessage] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnnouncedRef = useRef<boolean>(false);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Available terminal commands to run the REST API
  const terminalCommands = [
    {
      id: 'uvicorn',
      title: 'COMMAND 1 (RECOMMENDED // FASTAPI RELOAD)',
      cmd: 'python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001 --reload',
      desc: 'Starts FastAPI server on port 8001 with active worker daemon and task queue.',
    },
    {
      id: 'cd-main',
      title: 'COMMAND 2 (DIRECT PYTHON SCRIPT)',
      cmd: 'cd backend && python main.py',
      desc: 'Navigates into backend folder and starts REST API server directly.',
    },
    {
      id: 'unified',
      title: 'COMMAND 3 (FULL STACK UNIFIED LAUNCHER)',
      cmd: 'python start_app.py',
      desc: 'Simultaneously boots both FastAPI backend (8001) and Vite frontend (5173).',
    },
  ];

  // Health check ping function
  const checkApiHealth = async (): Promise<boolean> => {
    setChecking(true);
    const endpoints = [
      'http://127.0.0.1:8001/health',
      'http://localhost:8001/health',
      'http://127.0.0.1:8000/health',
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && (data.status === 'ok' || data.service)) {
            setChecking(false);
            return true;
          }
        }
      } catch {
        // Fallback to next endpoint
      }
    }

    setChecking(false);
    return false;
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isApiOnline && !isMinimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isApiOnline, isMinimized]);

  // Periodic health check
  useEffect(() => {
    let mounted = true;

    const performCheck = async () => {
      const online = await checkApiHealth();
      if (!mounted) return;

      if (!online) {
        setIsApiOnline(false);
        if (!hasAnnouncedRef.current) {
          hasAnnouncedRef.current = true;
          playRetroSound('error');
          if (!isVoiceMuted) {
            speakHulk(HULK_VOICES.modalOpen);
          }
        }
      } else {
        if (!isApiOnline) {
          playRetroSound('success');
          if (!isVoiceMuted) {
            speakHulk(HULK_VOICES.connected);
          }
        }
        setIsApiOnline(true);
        hasAnnouncedRef.current = false;
        setIsMinimized(false);
        setOutsideWarningMessage(null);
      }
    };

    performCheck();
    pollTimerRef.current = setInterval(performCheck, checkIntervalMs);

    return () => {
      mounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [checkIntervalMs, isApiOnline, isVoiceMuted]);

  // Handle click OUTSIDE the popup
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only fire if clicking directly on the backdrop container
    if (e.target === e.currentTarget) {
      // Trigger Hulk shake
      setShake(true);
      setTimeout(() => setShake(false), 450);

      // Play Hulk roaring voice
      playHulkRoar();
      if (!isVoiceMuted) {
        speakHulk(HULK_VOICES.clickOutside);
      }

      setHulkAngryCount((prev) => prev + 1);
      setOutsideWarningMessage('💥 HULK: "START THE REST API FIRST! DO NOT CLICK OUTSIDE!"');

      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = setTimeout(() => {
        setOutsideWarningMessage(null);
      }, 5000);
    }
  };

  const handleCopyCommand = async (cmd: string, index: number) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedIndex(index);
      playRetroSound('button');
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  const handleToggleVoice = () => {
    const next = !isVoiceMuted;
    setIsVoiceMuted(next);
    try {
      localStorage.setItem('api_voice_guidance_muted', next ? 'true' : 'false');
    } catch {}
    if (!next) {
      speakHulk(HULK_VOICES.replay);
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleReplayHulkVoice = () => {
    playHulkRoar();
    speakHulk(HULK_VOICES.replay);
  };

  const handleManualRetry = async () => {
    playRetroSound('button');
    const online = await checkApiHealth();
    if (online) {
      setIsApiOnline(true);
      playRetroSound('success');
      speakHulk(HULK_VOICES.connected);
    } else {
      playRetroSound('error');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  // If API is online, show a persistent live status badge at bottom-right
  if (isApiOnline) {
    return (
      <div
        className={`fixed bottom-4 right-4 z-[9990] px-3.5 py-2 border-2 ${
          theme === 'dark'
            ? 'border-emerald-500/80 bg-[#0B0E14]/95 text-emerald-400'
            : 'border-[#18181B] bg-white/95 text-emerald-800'
        } retro-shadow-sm font-mono text-[11px] flex items-center gap-2 select-none backdrop-blur-md transition-all hover:scale-105 group`}
        title="FastAPI REST Backend is active on http://127.0.0.1:8001"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block shadow-[0_0_10px_#10B981]" />
        <span className="font-bold tracking-wider">REST API: ONLINE (PORT 8001)</span>
        <a
          href="http://127.0.0.1:8001"
          target="_blank"
          rel="noopener noreferrer"
          className={`ml-1 px-1.5 py-0.5 border text-[10px] font-bold ${
            theme === 'dark'
              ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
              : 'border-[#18181B] bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
          title="Open REST API Status in new tab"
        >
          API ↗
        </a>
      </div>
    );
  }

  // Minimized floating banner at bottom-right
  if (isMinimized) {
    return (
      <div
        className={`fixed bottom-4 right-4 z-[99999] p-3 border-2 ${
          theme === 'dark'
            ? 'border-emerald-500 bg-[#0B0E14] text-emerald-400'
            : 'border-[#18181B] bg-white text-[#B91C1C]'
        } retro-shadow font-mono text-[12px] flex items-center gap-3 animate-slide-in-right cursor-pointer select-none`}
        onClick={() => setIsMinimized(false)}
        title="Click to restore REST API Terminal Guide"
      >
        <span className="w-2.5 h-2.5 bg-red-500 animate-ping inline-block" />
        <span className="font-black uppercase text-red-500">[HULK: REST API OFFLINE]</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="underline font-bold text-emerald-500 ml-1"
        >
          [OPEN TERMINAL GUIDE ↗]
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-mono select-none overflow-hidden"
    >
      {/* Central Centered Retro Guide Modal */}
      <div
        className={`relative w-full max-w-xl max-h-[92vh] flex flex-col border-2 ${
          theme === 'dark'
            ? 'border-[#10B981] bg-[#0E121B] text-[#F4F4F5]'
            : 'border-[#18181B] bg-white text-[#09090B]'
        } retro-shadow-lg overflow-hidden ${
          shake ? 'animate-hulk-shake ring-4 ring-red-500' : 'animate-fade-in'
        }`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="api-modal-title"
      >
        {/* Retro Alert Titlebar */}
        <div
          className={`h-11 shrink-0 border-b-2 ${
            theme === 'dark'
              ? 'border-[#10B981] bg-[#141A26] text-emerald-400'
              : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'
          } px-4 flex items-center justify-between font-bold text-[12px]`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40 animate-pulse" />
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
            <span id="api-modal-title" className="ml-2 font-mono truncate">
              HULK_CONSOLE // REST_API_REQUIRED.EXE
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Hulk Voice Replay Button */}
            <button
              type="button"
              onClick={handleReplayHulkVoice}
              className={`px-2 py-0.5 border-2 text-[11px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                theme === 'dark'
                  ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80'
                  : 'border-[#F5F3EC] bg-white/20 text-white hover:bg-white/30'
              }`}
              title="Listen to Hulk Voice"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>HULK VOICE</span>
            </button>

            {/* Mute Toggle */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className="p-1 hover:opacity-80 border border-current text-[11px] cursor-pointer"
              title={isVoiceMuted ? 'Voice is Muted' : 'Voice is Active'}
            >
              {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Minimize */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:opacity-80 border border-current text-[11px] cursor-pointer"
              title="Minimize guide while working in terminal"
            >
              [ _ ]
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-[12px]">
          
          {/* Hulk Roar Warning Alert (Triggered on click outside or offline) */}
          {outsideWarningMessage ? (
            <div className="p-3 border-2 border-red-500 bg-red-500/20 text-red-400 font-bold text-[12px] animate-hulk-shake flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500 shrink-0 animate-bounce" />
              <span className="flex-1">{outsideWarningMessage}</span>
              {hulkAngryCount > 1 && <span className="px-1.5 py-0.5 border border-red-500 bg-red-600 text-white text-[10px] font-black">RAGE x{hulkAngryCount}</span>}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-current/20 pb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black uppercase border-2 border-red-500 bg-red-500/15 text-red-500">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>[REST_API_STATUS: OFFLINE // PORT 8001]</span>
              </div>

              {/* Real-time Ping Indicator */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                <span className={`w-2 h-2 rounded-full ${checking ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                <span>{checking ? 'PINGING HEALTH...' : 'AUTO-POLLING EVERY 3s ▋'}</span>
              </div>
            </div>
          )}

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-[19px] sm:text-[21px] font-black uppercase tracking-tight text-red-500">
              REST API Server is Offline!
            </h2>
            <p className={`text-[12px] leading-relaxed ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}>
              The backend REST API server must be running to power the job application bot.
              If you click outside the popup, Hulk gets angry! <strong>Please start the API in your terminal first.</strong>
            </p>
          </div>

          {/* Hulk Voice Speech Card */}
          <div
            className={`p-3.5 border-2 ${
              theme === 'dark'
                ? 'border-emerald-500 bg-[#0B0E14] text-emerald-300'
                : 'border-emerald-700 bg-emerald-50 text-emerald-950'
            } retro-shadow-sm flex items-start gap-3`}
          >
            <div className="p-2 border border-current bg-current/10 shrink-0 text-emerald-500">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-[12px] flex-1">
              <div className="font-black uppercase flex items-center justify-between text-emerald-500">
                <span>🔊 HULK VOICE GUIDANCE:</span>
                <button
                  type="button"
                  onClick={handleReplayHulkVoice}
                  className="underline font-bold hover:opacity-80 cursor-pointer text-[11px]"
                >
                  [REPLAY VOICE]
                </button>
              </div>
              <p className="italic font-bold text-[13px] leading-snug">
                "Start the REST API first! Hulk smash! Run the command in your terminal!"
              </p>
              <div className="text-[10px] opacity-75">
                (Clicking outside the modal triggers Hulk's angry voice!)
              </div>
            </div>
          </div>

          {/* Step 1: Terminal Location */}
          <div className="space-y-1.5">
            <div className="font-bold uppercase text-emerald-600 flex items-center justify-between text-[11px]">
              <span>STEP 1: Open Terminal in Project Folder</span>
              <span className="opacity-75">[VS CODE: Ctrl + `]</span>
            </div>
            <div className="p-2 border border-current/20 bg-black/40 text-[11px] select-all font-mono">
              d:\Projects\Naukri-autoapply-bot-main
            </div>
          </div>

          {/* Step 2: Commands to Copy */}
          <div className="space-y-2">
            <div className="font-bold uppercase text-emerald-600 text-[11px]">
              STEP 2: Run This Command in Your Terminal:
            </div>

            {terminalCommands.map((item, idx) => (
              <div
                key={item.id}
                className={`p-3 border-2 ${
                  idx === 0
                    ? theme === 'dark'
                      ? 'border-[#10B981] bg-[#141A26]'
                      : 'border-[#18181B] bg-[#F5F3EC]'
                    : theme === 'dark'
                    ? 'border-[#2E384D] bg-[#0E121B]'
                    : 'border-zinc-300 bg-white'
                } retro-shadow-sm space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-[11px] uppercase text-emerald-600">
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCommand(item.cmd, idx)}
                    className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                      copiedIndex === idx
                        ? 'border-emerald-500 bg-emerald-500 text-black font-black'
                        : theme === 'dark'
                        ? 'border-[#10B981] bg-[#111520] text-emerald-400 hover:bg-emerald-950/40'
                        : 'border-[#18181B] bg-white text-black hover:bg-zinc-100'
                    }`}
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>COPIED! ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY COMMAND</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2 border border-current/30 bg-black text-[#E6EDF3] text-[12px] font-mono select-all overflow-x-auto">
                  <code>{item.cmd}</code>
                </div>
                <p className="text-[10px] opacity-75">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Automatic Recovery Reassurance */}
          <div className="p-2.5 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[11px] space-y-0.5">
            <div className="font-bold">⚡ AUTOMATIC RADAR RECOVERY:</div>
            <div className="opacity-90">
              As soon as the REST API starts in your terminal, this modal will automatically dismiss <strong>without needing a refresh</strong>!
            </div>
          </div>

        </div>

        {/* Modal Fixed Footer Strip */}
        <div
          className={`h-12 shrink-0 border-t-2 ${
            theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'
          } px-4 flex items-center justify-between text-[11px]`}
        >
          <button
            type="button"
            onClick={handleManualRetry}
            disabled={checking}
            className={`px-3 py-1.5 font-bold uppercase text-[11px] border-2 ${
              theme === 'dark'
                ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14]'
                : 'border-[#18181B] bg-[#15803D] text-white'
            } retro-shadow transition-all cursor-pointer flex items-center gap-1.5`}
            data-sound="button"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'TESTING...' : 'TEST NOW'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="text-[11px] underline opacity-75 hover:opacity-100 font-bold text-zinc-400"
          >
            [MINIMIZE TO CORNER]
          </button>
        </div>
      </div>
    </div>
  );
};
