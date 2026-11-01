// Synthesized vault-door opening sound (Web Audio API — no audio file).
// A low mechanical rumble: sub-bass thump + filtered brown-noise sweep +
// a slow "door grinding" resonant sweep. ~0.9s, quiet by design, always
// mutable. The AudioContext is created lazily on the FIRST user gesture
// (a browser user-gesture context is required to start audio; the Open
// button / dial confirm are gestures). Mute state is held here and
// persisted to localStorage so it survives reloads.
//
// reduced-motion note (per SDINC-projects-specifications 00-common §6):
// the visual presentation must retain full meaning without the sound;
// this module only adds an optional audio cue, never a visual one.

type Ctor = typeof AudioContext;

// Cache a single AudioContext for the page's lifetime. Browsers cap the
// number of concurrent contexts (~6–11); creating one per playVaultOpen()
// would leak them and, past the cap, new contexts start suspended. The
// context is created lazily on the first gesture and reused.
let cachedCtx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (cachedCtx) return cachedCtx;
  if (typeof window === 'undefined') return null;
  const AC: Ctor | undefined =
    window.AudioContext ??
    // Some older browsers expose only the WebKit-prefixed constructor.
    (window as Window & { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!AC) return null;
  cachedCtx = new AC();
  return cachedCtx;
}

let muted = false;
try {
  muted = localStorage.getItem('sdinc:muted') === '1';
} catch {
  /* storage unavailable — default to unmuted, in-memory only */
}

/** Play a short vault-door opening rumble. No-op when muted or no Web Audio. */
export function playVaultOpen(): void {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  // A context created outside a user gesture may start 'suspended'; resume
  // it so the scheduled nodes actually sound.
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime;

  // 1. Sub-bass thump (the "lock release").
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(70, now);
  thump.frequency.exponentialRampToValueAtTime(34, now + 0.5);
  thumpGain.gain.setValueAtTime(0.0001, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  thump.connect(thumpGain).connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.65);

  // 2. Door-grinding sweep: brown noise through a descending lowpass.
  const dur = 0.85;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < frames; i += 1) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02; // brown noise
    data[i] = lastOut * 3.2;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(120, now + dur);
  filter.Q.value = 4;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.16, now + 0.08);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur);

  // 3. Metallic "shutter slide" — a detuned saw blip, very quiet.
  const slide = ctx.createOscillator();
  const slideGain = ctx.createGain();
  slide.type = 'sawtooth';
  slide.frequency.setValueAtTime(180, now + 0.1);
  slide.frequency.exponentialRampToValueAtTime(60, now + 0.55);
  slideGain.gain.setValueAtTime(0.0001, now + 0.1);
  slideGain.gain.exponentialRampToValueAtTime(0.05, now + 0.16);
  slideGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  slide.connect(slideGain).connect(ctx.destination);
  slide.start(now + 0.1);
  slide.stop(now + 0.6);
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): boolean {
  muted = value;
  try {
    localStorage.setItem('sdinc:muted', value ? '1' : '0');
  } catch {
    /* in-memory only */
  }
  return muted;
}

export function toggleMuted(): boolean {
  return setMuted(!muted);
}
