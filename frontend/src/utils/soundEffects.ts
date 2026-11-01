// Retro Sound Effects Engine using native Web Audio API
// Zero external files, zero latency, 100% authentic retro synthesized audio

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Initialize sound state from localStorage if available
try {
  const stored = localStorage.getItem('retro_sound_enabled');
  if (stored !== null) {
    soundEnabled = stored === 'true';
  }
} catch {
  soundEnabled = true;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type RetroSoundType =
  | 'click'     // Tactile micro-click (general clicks, chips, labels)
  | 'button'    // Arcade button push (primary/secondary buttons)
  | 'nav'       // Terminal chirp / menu step (navigation links, tabs)
  | 'toggle'    // Relay snap / switch flip (dark/light toggle, sound toggle)
  | 'success'   // 8-bit coin / fanfare (login, apply, task start, export)
  | 'error'     // Retro buzzer / glitch (error messages, validation)
  | 'slide'     // Pneumatic drawer slide / whoosh (sign-in slide-in drawer)
  | 'modal';    // Retro window pop (modal dialog open/close)

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem('retro_sound_enabled', enabled ? 'true' : 'false');
  } catch {}
}

export function toggleSound(): boolean {
  const next = !soundEnabled;
  setSoundEnabled(next);
  if (next) {
    // Play a friendly beep when unmuting
    playRetroSound('toggle');
  }
  return next;
}

export function playRetroSound(type: RetroSoundType = 'click'): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        // High-frequency, super-short square click (20ms)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.02);
        break;
      }

      case 'button': {
        // Warm punchy arcade button (square wave 420Hz -> 560Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }

      case 'nav': {
        // Futuristic dual-tone terminal chirp
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(520, now);
        osc1.frequency.setValueAtTime(740, now + 0.025);
        gain1.gain.setValueAtTime(0.05, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.06);
        break;
      }

      case 'toggle': {
        // Crisp retro relay toggle (frequency sweep downward)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case 'success': {
        // 8-Bit Power-Up Melody: C5 (523Hz) -> E5 (659Hz) -> G5 (783Hz) -> C6 (1046Hz)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        const step = 0.045;
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * step;
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.05, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + step);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + step);
        });
        break;
      }

      case 'error': {
        // Retro low buzzer (150Hz -> 90Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'slide': {
        // Retro pneumatic drawer whoosh (frequency upward sweep)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'modal': {
        // Retro window open/close chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
    }
  } catch {
    // Fail gracefully if audio context throws
  }
}

/**
 * Initializes a single document-level click listener so ANY clickable element
 * automatically triggers an appropriate retro sound according to element type.
 */
export function initGlobalSoundListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleClick = (e: MouseEvent) => {
    // Resume audio context on first user click if suspended
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check for explicit data-sound attribute
    const soundElem = target.closest('[data-sound]') as HTMLElement | null;
    if (soundElem) {
      const explicitType = soundElem.getAttribute('data-sound') as RetroSoundType;
      if (explicitType) {
        playRetroSound(explicitType);
        return;
      }
    }

    // Check for toggle buttons / switches / dark mode
    if (target.closest('[aria-label*="toggle" i], [aria-label*="theme" i], input[type="checkbox"], [role="switch"]')) {
      playRetroSound('toggle');
      return;
    }

    // Check for navigation links / breadcrumbs / tabs
    if (target.closest('a, [role="tab"], nav button, [data-nav]')) {
      playRetroSound('nav');
      return;
    }

    // Check for action buttons
    if (target.closest('button, [role="button"]')) {
      playRetroSound('button');
      return;
    }
  };

  document.addEventListener('click', handleClick, { passive: true });
  return () => {
    document.removeEventListener('click', handleClick);
  };
}

