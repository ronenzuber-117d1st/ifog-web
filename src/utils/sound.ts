// Singleton Web Audio manager for match sounds + music.
// Web Audio context must be created after a user gesture — call preload() from a click handler.

// ─── Enabled state (persisted) ────────────────────────────────────────────────

let _on = localStorage.getItem('ifog-sound') !== 'off';

export function isSoundEnabled(): boolean { return _on; }

export function setSoundEnabled(enabled: boolean): void {
  _on = enabled;
  localStorage.setItem('ifog-sound', enabled ? 'on' : 'off');
  if (_music) _music.volume = enabled ? MUSIC_VOL : 0;
  if (_crowdGain) {
    const c = getCtx();
    _crowdGain.gain.cancelScheduledValues(c.currentTime);
    _crowdGain.gain.setTargetAtTime(enabled ? BASE_VOL : 0, c.currentTime, 0.3);
  }
}

// ─── Web Audio context ────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
const _bufs = new Map<string, AudioBuffer>();

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') void _ctx.resume();
  return _ctx;
}

async function loadBuf(url: string): Promise<AudioBuffer> {
  if (_bufs.has(url)) return _bufs.get(url)!;
  const c = getCtx();
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  const buf = await c.decodeAudioData(ab);
  _bufs.set(url, buf);
  return buf;
}

function playBuf(buf: AudioBuffer, vol = 1.0, offsetSec = 0) {
  const c = getCtx();
  const src = c.createBufferSource();
  const gain = c.createGain();
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(gain);
  gain.connect(c.destination);
  src.start(c.currentTime + offsetSec);
}

// ─── Preload ──────────────────────────────────────────────────────────────────

const SOUNDS = {
  kickoff:  '/sounds/TRILLER.WAV',
  halftime: '/sounds/MTRILLER.WAV',
  fulltime: '/sounds/TRILLER3.WAV',
  crowd:    '/sounds/LEISELP1.WAV',
};

const BALL_URLS = Array.from({ length: 10 }, (_, i) => `/sounds/BALL${i}.WAV`);

export async function preload(): Promise<void> {
  const all = [...Object.values(SOUNDS), ...BALL_URLS];
  await Promise.all(all.map(u => loadBuf(u).catch(() => {})));
}

// ─── Ball kicks ───────────────────────────────────────────────────────────────

export function playKick(vol = 0.55): void {
  if (!_on) return;
  const url = BALL_URLS[Math.floor(Math.random() * BALL_URLS.length)];
  loadBuf(url).then(buf => playBuf(buf, vol)).catch(() => {});
}

// ─── Whistles ─────────────────────────────────────────────────────────────────

export function whistle(variant: 'kickoff' | 'halftime' | 'fulltime'): void {
  if (!_on) return;
  loadBuf(SOUNDS[variant]).then(buf => playBuf(buf, 0.8)).catch(() => {});
}

// ─── Crowd ────────────────────────────────────────────────────────────────────

let _crowdSrc: AudioBufferSourceNode | null = null;
let _crowdGain: GainNode | null = null;

const BASE_VOL  = 0.30;
const ROAR_VOL  = 0.75;
const QUIET_VOL = 0.12;

export function startCrowd(): void {
  if (!_on || _crowdSrc) return;
  const c = getCtx();
  loadBuf(SOUNDS.crowd).then(buf => {
    if (_crowdSrc) return;
    _crowdSrc = c.createBufferSource();
    _crowdSrc.buffer = buf;
    _crowdSrc.loop = true;
    _crowdGain = c.createGain();
    _crowdGain.gain.value = 0;
    _crowdSrc.connect(_crowdGain);
    _crowdGain.connect(c.destination);
    _crowdSrc.start();
    _crowdGain.gain.setTargetAtTime(BASE_VOL, c.currentTime, 2.5);
  }).catch(() => {});
}

export function stopCrowd(): void {
  if (!_crowdGain || !_crowdSrc) return;
  const c = getCtx();
  _crowdGain.gain.setTargetAtTime(0, c.currentTime, 2.0);
  const src = _crowdSrc;
  _crowdSrc = null;
  _crowdGain = null;
  setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } }, 5000);
}

export function crowdRoar(): void {
  if (!_crowdGain) return;
  const c = getCtx();
  _crowdGain.gain.cancelScheduledValues(c.currentTime);
  _crowdGain.gain.setTargetAtTime(ROAR_VOL, c.currentTime, 0.12);
  _crowdGain.gain.setTargetAtTime(BASE_VOL, c.currentTime + 5, 3.0);
}

export function crowdCalm(): void {
  if (!_crowdGain) return;
  const c = getCtx();
  _crowdGain.gain.cancelScheduledValues(c.currentTime);
  _crowdGain.gain.setTargetAtTime(QUIET_VOL, c.currentTime, 1.5);
}

export function crowdResume(): void {
  if (!_crowdGain) return;
  const c = getCtx();
  _crowdGain.gain.cancelScheduledValues(c.currentTime);
  _crowdGain.gain.setTargetAtTime(BASE_VOL, c.currentTime, 1.5);
}

// ─── Music (MP3, HTMLAudioElement) ────────────────────────────────────────────

const MUSIC_VOL = 0.38;
let _music: HTMLAudioElement | null = null;
let _fadeTimer: ReturnType<typeof setInterval> | null = null;

function clearFade() {
  if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null; }
}

export function playMusic(src: string): void {
  // Same track already running → skip
  if (_music && !_music.paused && _music.src.endsWith(src.replace(/^\//, ''))) return;

  clearFade();
  const old = _music;
  _music = null;

  const startNew = () => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = _on ? MUSIC_VOL : 0;
    void audio.play().catch(() => {});
    _music = audio;
  };

  if (old && !old.paused) {
    // Fade out old track over ~400ms then start new
    _fadeTimer = setInterval(() => {
      old.volume = Math.max(0, old.volume - 0.06);
      if (old.volume <= 0) {
        clearFade();
        old.pause();
        startNew();
      }
    }, 40);
  } else {
    startNew();
  }
}

export function stopMusic(): void {
  clearFade();
  const old = _music;
  _music = null;
  if (!old || old.paused) return;
  _fadeTimer = setInterval(() => {
    old.volume = Math.max(0, old.volume - 0.06);
    if (old.volume <= 0) { clearFade(); old.pause(); }
  }, 40);
}
