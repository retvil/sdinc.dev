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
 * Fallout 3 Pip-Boy authentic SFX helpers.
 *
 * The reference (Fallout 3 Pip-Boy UI) uses short, crisp, slightly warm
 * mechanical clicks with a metallic "resonant" character — like tapping a
 * brushed-aluminium instrument housing, not a plastic key. Two building
 * blocks capture that:
 *
 *   - a very short high-frequency noise transient (the "snap" of contact),
 *     band-passed so it reads as a click rather than a thump;
 *   - one or two detuned sine pings (the housing ringing) at mid/high
 *     frequencies with fast exponential decay.
 *
 * Both are quiet by design and layered so the result feels "metallic +
 * warm". A shared lowpass (the "Pip-Boy filter") softens the very top of
 * the spectrum so the cue never sounds harsh or digital — it sits in the
 * same 100 Hz–6 kHz window as the game's UI kit.
 */

/** Apply the shared "Pip-Boy" character filter to a gain node's output. */
function pipboyBus(ctx: AudioContext, gain: GainNode): AudioNode {
  // A gentle lowpass keeps the metallic pings from going glassy/harsh.
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 6500;
  lp.Q.value = 0.7;
  gain.connect(lp);
  return lp;
}

/** A short, decaying noise burst ("snap" of a mechanical contact). */
function snapNoise(
  ctx: AudioContext,
  now: number,
  durSec: number,
  bandHz: number,
  peakGain: number,
  decay = 28,
): AudioNode {
  const frames = Math.floor(ctx.sampleRate * durSec);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    const t = i / frames;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * decay);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = bandHz;
  band.Q.value = 4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peakGain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
  noise.connect(band).connect(gain);
  noise.start(now);
  noise.stop(now + durSec + 0.01);
  return gain;
}

/** A short metallic "ring" (sine ping with a detuned overtone). */
function metalPing(
  ctx: AudioContext,
  now: number,
  freqHz: number,
  overtoneRatio: number,
  durSec: number,
  peakGain: number,
): AudioNode {
  const master = ctx.createGain();
  for (const [ratio, amp] of [
    [1, 1],
    [overtoneRatio, 0.35],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freqHz * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peakGain * amp, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + durSec + 0.02);
  }
  return master;
}

/**
 * Rotor detent click: a crisp, warm mechanical tick — the rotor "snapping"
 * into a detent as the dial turns. Fallout 3 Pip-Boy character: a short
 * mid-band noise snap (the cam engaging) layered with a quiet 1.6 kHz
 * metallic ring (the housing ringing). ~45 ms, quiet by design.
 */
export function playRotorClick(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  const snap = snapNoise(ctx, now, 0.035, 2600, 0.09, 32);
  const ring = metalPing(ctx, now, 1600, 2.3, 0.07, 0.05);
  const bus = pipboyBus(ctx, ctx.createGain());
  const master = ctx.createGain();
  master.gain.value = 0.7;
  snap.connect(master);
  ring.connect(master);
  master.connect(bus);
  bus.connect(ctx.destination);
}

/**
 * Rotor confirm / selection lock-in: the detent locking into place when the
 * user presses Enter/Space on the dial. Fallout 3 Pip-Boy character: a
 * heavier, warmer "thock" than the plain step tick — a low metallic thump
 * (the cam seating) plus a short mid-band snap and a faint 880 Hz housing
 * ring. ~90 ms, a touch louder than the step click but still quiet.
 */
export function playRotorConfirm(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  // 1. Low metallic "thock" (the lock seating) — a short sine drop.
  const thock = ctx.createOscillator();
  thock.type = 'sine';
  thock.frequency.setValueAtTime(180, now);
  thock.frequency.exponentialRampToValueAtTime(70, now + 0.08);
  const thockGain = ctx.createGain();
  thockGain.gain.setValueAtTime(0.0001, now);
  thockGain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
  thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  thock.connect(thockGain);
  thock.start(now);
  thock.stop(now + 0.1);

  // 2. Snap + housing ring (the detent cam engaging).
  const snap = snapNoise(ctx, now, 0.04, 2200, 0.08, 30);
  const ring = metalPing(ctx, now, 880, 2.7, 0.09, 0.06);

  const master = ctx.createGain();
  master.gain.value = 0.85;
  thockGain.connect(master);
  snap.connect(master);
  ring.connect(master);
  const bus = pipboyBus(ctx, ctx.createGain());
  master.connect(bus);
  bus.connect(ctx.destination);
}

/**
 * Vault / project-open rumble: the heavy mechanical "vault door" cue —
 * Fallout 3 Pip-Boy character for opening a data section. ~0.95 s:
 *   1. a sub-bass thump (the lock disengaging),
 *   2. a long brown-noise grind through a descending lowpass (the door
 *      sliding / hydraulics),
 *   3. a detuned metallic "shutter" sweep (the hatch catching),
 *   4. a final soft metallic "clack" when it seats.
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

  // 4. Final "clack" when the door seats (a quiet metallic snap).
  const clack = snapNoise(ctx, now + 0.6, 0.05, 1400, 0.1, 26);
  const clackRing = metalPing(ctx, now + 0.6, 520, 2.4, 0.1, 0.07);
  const clackMaster = ctx.createGain();
  clackMaster.gain.value = 0.6;
  clack.connect(clackMaster);
  clackRing.connect(clackMaster);
  const clackBus = pipboyBus(ctx, ctx.createGain());
  clackMaster.connect(clackBus);
  clackBus.connect(ctx.destination);
}

/**
 * Pip-Boy screen button press: a warm, crisp metallic click — like pressing
 * a Pip-Boy membrane button. Fallout 3 character: a short ~3 kHz snap (the
 * contact) plus a 2.4 kHz housing ring, both run through the shared
 * lowpass so it sits warm, never harsh. ~50 ms, quiet by design.
 */
export function playScreenClick(): void {
  const sfx = beginSfx();
  if (!sfx) return;
  const { ctx, now } = sfx;

  const snap = snapNoise(ctx, now, 0.04, 3000, 0.1, 30);
  const ring = metalPing(ctx, now, 2400, 2.1, 0.06, 0.06);
  const master = ctx.createGain();
  master.gain.value = 0.75;
  snap.connect(master);
  ring.connect(master);
  const bus = pipboyBus(ctx, ctx.createGain());
  master.connect(bus);
  bus.connect(ctx.destination);
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
