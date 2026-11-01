// Hulk Voice & Audio Synthesizer for REST API Offline Alerts
// Native Web Audio API sub-bass monster rumble + Web Speech API ultra-deep pitch

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synthesizes an authentic deep monster roar / sub-bass impact
 */
export function playHulkRoar(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Sub-bass heavy oscillator (55Hz -> 35Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    // Rumble noise transient
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.linearRampToValueAtTime(60, now + 0.25);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.25);
  } catch {
    // Fail gracefully
  }
}

/**
 * Speaks text using an ultra-low, heavy booming Hulk monster voice
 */
export function speakHulk(text: string, withRoar = true): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    if (withRoar) {
      playHulkRoar();
    }

    window.speechSynthesis.cancel(); // Cancel any existing speech

    const utterance = new SpeechSynthesisUtterance(text);
    // Ultra deep pitch for Hulk monster effect
    utterance.pitch = 0.25;
    // Deliberate heavy cadence
    utterance.rate = 0.84;
    utterance.volume = 1.0;

    // Pick a deep voice if available
    const voices = window.speechSynthesis.getVoices();
    const deepVoice = voices.find(
      (v) =>
        v.lang.includes('hi') ||
        v.lang.includes('en-IN') ||
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('ravi')
    );
    if (deepVoice) {
      utterance.voice = deepVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Hulk speech error:', err);
  }
}

export const HULK_VOICES = {
  clickOutside:
    'Arey pehle A P I toh start karde re! Hulk smash! Bahar click mat kar, pehle terminal me A P I start kar!',
  modalOpen:
    'Arey pehle A P I toh start karde re! REST API band hai! Terminal me command run kar!',
  replay:
    'Hulk bol raha hai! Pehle A P I toh start karde re! Command copy kar aur terminal me chala!',
  connected:
    'Hulk happy! REST API start ho gaya! Ab aage badho!',
};

