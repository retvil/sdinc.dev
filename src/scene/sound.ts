// Synthesized UI sound effects (Web Audio API — no audio files).
// The device is a physical instrument: its interactions have quiet,
// mechanical sound cues. All SFX are synthesized at runtime, are very
// low in volume by design, and are gated behind a persistent mute toggle
// (localStorage). Every public play* function is a no-op when muted or
// when the browser has no Web Audio support.
//
// reduced-motion note: honors prefers-reduced-motion globally.
// the visual presentation must retain full meaning without the sound;
// this module only adds optional audio cues, never visual ones.

type Ctor = typeof AudioContext;

// Cache a single AudioContext for the page's lifetime. Browsers cap the
// number of concurrent contexts (~6–11); creating one per SFX call would
// leak them and, past the cap, new contexts start suspended. The context
// is created lazily on the first gesture and reused.
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

/** Begin an SFX: return a ready-to-schedule context, or null to bail. */
function beginSfx(): { ctx: AudioContext; now: number } | null {
  if (muted) return null;
  const ctx = audioContext();
  if (!ctx) return null;
  // A context created outside a user gesture may start 'suspended'; resume
  // it so the scheduled nodes actually sound.
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, now: ctx.currentTime };
}

let muted = false;
try {
  muted = localStorage.getItem('sdinc:muted') === '1';
} catch {
  /* storage unavailable — default to unmuted, in-memory only */
}

/**
 * 3.6: release the cached context when the page goes to the background so a
 * hidden tab does not hold one of the browser's limited concurrent
 * AudioContext slots indefinitely. A suspended context is cheap and wakes on
 * the next gesture — beginSfx() already resumes it. Only installed once, in
 * the browser; no-op in non-browser contexts (tests, build).
 *
 * Deferred (rAF-then-idle) so any SFX scheduled in the same tick finishes
 * before the context suspends.
 */
let idleSuspendBound = false;
function bindIdleSuspend(): void {
  if (idleSuspendBound || typeof document === 'undefined') return;
  idleSuspendBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    const ctx = cachedCtx;
    if (!ctx || ctx.state !== 'running') return;
    // Defer past the longest SFX (~0.9s vault rumble) so an in-flight cue
    // finishes before we park the context. Guard: only suspend if this same
    // context is still the live one and still running at that moment.
    window.setTimeout(() => {
      if (cachedCtx === ctx && ctx.state === 'running') void ctx.suspend();
    }, 1000);
  });
}
bindIdleSuspend();

/**
 * Rotor detent click: a very short, quiet mechanical tick. Emitted on
 * every dial step (click / arrow keys / wheel) to make the rotary knob
 * feel like a physical detent mechanism. ~45 ms, barely audible.
 */
export function playRotorClick(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  // A short high-frequency "tick" from a band-passed noise burst.
  const dur = 0.045;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    const t = i / frames;
    // Fast-decaying white-noise burst shaped into a click.
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2400;
  band.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(band).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur);
}

/**
 * Rotor confirm: a slightly deeper, shorter "snap" — the detent locking
 * into place when the user presses Enter/Space on the dial. ~70 ms, a
 * touch louder than a plain step click but still quiet.
 */
export function playRotorConfirm(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  // A low blip (the lock engaging) layered over the tick.
  const blip = ctx.createOscillator();
  const blipGain = ctx.createGain();
  blip.type = 'sine';
  blip.frequency.setValueAtTime(220, now);
  blip.frequency.exponentialRampToValueAtTime(90, now + 0.07);
  blipGain.gain.setValueAtTime(0.0001, now);
  blipGain.gain.exponentialRampToValueAtTime(0.12, now + 0.006);
  blipGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  blip.connect(blipGain).connect(ctx.destination);
  blip.start(now);
  blip.stop(now + 0.1);

  // A soft tick so the confirm reads as a detent, not a pure tone.
  const dur = 0.05;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    const t = i / frames;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(band).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur);
}

/**
 * Vault-door opening rumble: sub-bass thump + filtered brown-noise sweep
 * + a slow "door grinding" resonant sweep. ~0.9s, quiet by design.
 */
export function playVaultOpen(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

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

/**
 * Pip-Boy screen click: a short, crisp mechanical tick, band-passed around
 * 3.2 kHz. Emitted on every screen button press — direction nodes, section
 * tabs, project list items — to make on-screen interaction feel like
 * pressing a physical Pip-Boy button. ~45 ms, quiet by design.
 */
export function playScreenClick(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  const dur = 0.045;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    const t = i / frames;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 28);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3200;
  band.Q.value = 4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(band).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur);
}

/**
 * Physical toggle-switch click: a sharp, metallic "tack" — like a
 * mechanical rock-switch being flipped. The sound is built from a
 * very short high-frequency noise transient (15 ms) plus a short
 * decaying 5 kHz sine ping to simulate the metallic snap of the
 * switch contacts. This is distinct from the Pip-Boy screen tick:
 * it has no low thump, no warm tone — just a crisp click.
 * ~30 ms total.
 */
export function playButtonPress(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  // 1. Sharp noise transient (the "snap" of the switch).
  const dur = 0.015;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    const t = i / frames;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 50);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.01);
  noise.connect(hp).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur + 0.02);

  // 2. Short metallic ping (contact snap) — 5 kHz sine, fast decay.
  const ping = ctx.createOscillator();
  const pingGain = ctx.createGain();
  ping.type = 'sine';
  ping.frequency.setValueAtTime(5000, now);
  pingGain.gain.setValueAtTime(0.0001, now);
  pingGain.gain.exponentialRampToValueAtTime(0.08, now + 0.004);
  pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  ping.connect(pingGain).connect(ctx.destination);
  ping.start(now);
  ping.stop(now + 0.06);

  // 3. Lower metallic overtone (2.2 kHz) for the "tick" character.
  const tick = ctx.createOscillator();
  const tickGain = ctx.createGain();
  tick.type = 'sine';
  tick.frequency.setValueAtTime(2200, now);
  tickGain.gain.setValueAtTime(0.0001, now);
  tickGain.gain.exponentialRampToValueAtTime(0.05, now + 0.003);
  tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  tick.connect(tickGain).connect(ctx.destination);
  tick.start(now);
  tick.stop(now + 0.05);
}

/**
 * Tab-switch Pip-Boy cue: a short mechanical "page turn" — a crisp switch
 * snap layered over a quiet low-passed cloth swish (the shutter sliding
 * across the display). ~0.18 s, quiet by design. Used on profile ↔
 * projects ↔ contact mode switches (the light tab transition), distinct
 * from the heavier playVaultOpen (~0.9 s) that opens a project.
 */
export function playTabSwitch(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  // 1. Crisp mechanical snap (like playButtonPress, but softer).
  const snapDur = 0.015;
  const snapFrames = Math.floor(ctx.sampleRate * snapDur);
  const snapBuffer = ctx.createBuffer(1, snapFrames, ctx.sampleRate);
  const snapData = snapBuffer.getChannelData(0);
  for (let i = 0; i < snapFrames; i += 1) {
    const t = i / snapFrames;
    snapData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 50);
  }
  const snapNoise = ctx.createBufferSource();
  snapNoise.buffer = snapBuffer;
  const snapHp = ctx.createBiquadFilter();
  snapHp.type = 'highpass';
  snapHp.frequency.value = 3000;
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.1, now);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, now + snapDur + 0.01);
  snapNoise.connect(snapHp).connect(snapGain).connect(ctx.destination);
  snapNoise.start(now);
  snapNoise.stop(now + snapDur + 0.02);

  // 2. Short metallic ping (the "click" of the detent engaging).
  const ping = ctx.createOscillator();
  const pingGain = ctx.createGain();
  ping.type = 'sine';
  ping.frequency.setValueAtTime(4200, now);
  pingGain.gain.setValueAtTime(0.0001, now);
  pingGain.gain.exponentialRampToValueAtTime(0.06, now + 0.004);
  pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  ping.connect(pingGain).connect(ctx.destination);
  ping.start(now);
  ping.stop(now + 0.06);

  // 3. Cloth "scrape" / friction: brown noise through a descending lowpass,
  //    louder and a bit longer than a plain swish so it reads as cloth
  //    rubbing across the display (~0.22 s, overlapping the shutter roll).
  const swishDur = 0.22;
  const swishFrames = Math.floor(ctx.sampleRate * swishDur);
  const swishBuffer = ctx.createBuffer(1, swishFrames, ctx.sampleRate);
  const swishData = swishBuffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < swishFrames; i += 1) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    swishData[i] = lastOut * 3.2;
  }
  const swishNoise = ctx.createBufferSource();
  swishNoise.buffer = swishBuffer;
  const swishLp = ctx.createBiquadFilter();
  swishLp.type = 'lowpass';
  swishLp.frequency.setValueAtTime(800, now + 0.02);
  swishLp.frequency.exponentialRampToValueAtTime(130, now + swishDur);
  swishLp.Q.value = 4;
  const swishGain = ctx.createGain();
  swishGain.gain.setValueAtTime(0.0001, now + 0.02);
  swishGain.gain.exponentialRampToValueAtTime(0.16, now + 0.1);
  swishGain.gain.exponentialRampToValueAtTime(0.0001, now + swishDur);
  swishNoise.connect(swishLp).connect(swishGain).connect(ctx.destination);
  swishNoise.start(now + 0.02);
  swishNoise.stop(now + swishDur + 0.02);
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
