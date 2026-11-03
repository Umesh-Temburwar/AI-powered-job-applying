import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  ShieldAlert,
  Eye,
  EyeOff,
  Bot,
  Sparkles,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { playRetroSound } from '../../utils/soundEffects';
import { verifyMasterPassword } from '../../utils/authGate';

interface BotLaunchPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  commandLabel?: string;
  platform?: string;
  mode?: string;
}

export const BotLaunchPasswordModal: React.FC<BotLaunchPasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Verify Password to Start Bot',
  commandLabel,
  platform,
  mode = 'LIVE APPLY',
}) => {
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsVerifying(false);
      setShake(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Kripya password enter karein (Please enter the master password).');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const isValid = await verifyMasterPassword(password);
      if (isValid) {
        playRetroSound('success');
        setIsVerifying(false);
        onClose();
        await onConfirm();
      } else {
        playRetroSound('error');
        setError('Access Denied! Galat password hai. (Incorrect password to start bot.)');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setIsVerifying(false);
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    } catch {
      setError('Verification error occurred. Please try again.');
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-mono select-none"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-md border-2 ${
          theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'
        } retro-shadow transition-all ${shake ? 'animate-shake' : ''}`}
      >
        {/* Terminal Title Bar */}
        <div
          className={`px-4 py-2 border-b-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-zinc-300'
              : 'border-[#18181B] bg-[#09090B] text-white'
          } flex items-center justify-between text-[11px]`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold tracking-wide">
              SECURITY_VERIFICATION // BOT_LAUNCH_AUTH.EXE
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="hover:text-red-400 cursor-pointer p-0.5"
            title="Close dialog"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          <div className="text-center mb-4">
            <div
              className={`w-12 h-12 mx-auto mb-2.5 border-2 ${
                theme === 'dark'
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                  : 'border-emerald-600 bg-emerald-50 text-emerald-700'
              } flex items-center justify-center retro-shadow-sm`}
            >
              <Bot className="w-6 h-6" />
            </div>

            <div className="inline-block px-2 py-0.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase border border-amber-500/50 text-amber-500 bg-amber-500/10">
              [AUTHENTICATION_REQUIRED // BOT_LAUNCH]
            </div>

            <h2 className="text-[15px] font-bold text-theme-primary">
              {title}
            </h2>
            <p
              className={`text-[11px] mt-1 leading-relaxed ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Bot automation start karne ke liye master access password enter karein.
            </p>
          </div>

          {/* Action Context Preview */}
          {(commandLabel || platform) && (
            <div
              className={`mb-4 p-2.5 border text-[11px] leading-tight ${
                theme === 'dark'
                  ? 'border-[#2E384D] bg-[#0B0E14] text-zinc-300'
                  : 'border-[#18181B]/30 bg-[#F5F3EC] text-zinc-800'
              }`}
            >
              {commandLabel && (
                <div className="flex items-center justify-between py-0.5">
                  <span className="opacity-70">Task:</span>
                  <span className="font-bold text-emerald-500 truncate max-w-[240px]">
                    {commandLabel}
                  </span>
                </div>
              )}
              {platform && (
                <div className="flex items-center justify-between py-0.5">
                  <span className="opacity-70">Platform:</span>
                  <span className="font-semibold">{platform}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-0.5">
                <span className="opacity-70">Mode:</span>
                <span className="font-semibold text-amber-400">{mode}</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-3.5 p-2.5 border-2 border-red-500 bg-red-500/10 text-red-500 text-[11px] flex items-start gap-2"
            >
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="bot-launch-password"
                className={`block text-[10px] font-bold mb-1 uppercase ${
                  theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                Master Password:
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="bot-launch-password"
                  name="bot-launch-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password (e.g. Umesh)"
                  disabled={isVerifying}
                  autoComplete="current-password"
                  autoFocus
                  className={`w-full px-3 py-2 pr-9 border-2 text-[12px] ${
                    theme === 'dark'
                      ? 'border-[#2E384D] bg-[#0B0E14] text-white placeholder-zinc-600 focus:border-emerald-500'
                      : 'border-[#18181B] bg-[#F5F3EC] text-black placeholder-zinc-400 focus:border-emerald-600'
                  } outline-none transition-colors duration-150`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${
                    theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-black'
                  } cursor-pointer`}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isVerifying}
                className={`flex-1 py-2 px-3 border-2 ${
                  theme === 'dark'
                    ? 'border-[#2E384D] bg-[#141A26] text-zinc-300 hover:bg-[#1A2234]'
                    : 'border-[#18181B] bg-white text-zinc-800 hover:bg-zinc-100'
                } font-bold text-[11px] uppercase tracking-wider cursor-pointer transition-all disabled:opacity-50`}
              >
                [X] Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider border-2 border-emerald-500 retro-shadow cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    VERIFYING...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    VERIFY &amp; START
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
