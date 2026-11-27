// Audio settings for the offline workshop. Source files are served unchanged.
export const AUDIO_SETTINGS = {
  workshop: { file: '工坊背景.mp3', group: 'music', volume: .055, fadeIn: 1.5 },
  gallery: { file: '展厅音乐.mp3', group: 'music', volume: .13, fadeIn: 2.5 },
  entrance: { file: '瓷器登场.mp3', group: 'ui', volume: .44 },
  complete: { file: '修复完成.mp3', group: 'ui', volume: .14, duration: 2.8 },
  click: { file: '按钮点击.mp3', group: 'ui', volume: .25, cooldown: 100, duration: .22 },
  assembly: { file: '瓷器拼合.wav', group: 'tool', volume: .55, cooldown: 110, duration: .50 },
  suction: { file: '吸管吸水.mp3', group: 'tool', volume: .45, offset: .40, duration: 1.56 },
  drop: { file: '水滴声.mp3', group: 'tool', volume: .50, duration: .36 },
  mix: { file: '搅拌声.mp3', group: 'tool', volume: .40, offset: 3.0, loopEnd: 5.5 },
  repair: { file: '修复瓷器声.mp3', group: 'tool', volume: .40, offset: .76 },
  paint: { file: '涂色声.mp3', group: 'tool', volume: 2.2, offset: .56, loopEnd: 1.17 },
  dustBrush: { file: '扫灰尘.mp3', group: 'tool', volume: .35 },
  dustBlower: { file: '气吹.mp3', group: 'tool', volume: .35, cooldown: 450 },
};

export const AUDIO_TIMING = {
  // Relative to the existing museum camera entrance, in milliseconds.
  entranceOffsetMs: 720,
  // Relative to the start of the cue. The file has a long nearly silent tail.
  galleryMusicTailMs: 3200,
  dropContactMs: 1170,
  lastAssemblyCueGapMs: 590,
  workshopFadeOutSeconds: 1.0,
  galleryFadeOutSeconds: 1.1,
  toolIdleMs: 150,
  toolFadeOutSeconds: .15,
};

const MUSIC_KEY = 'celadon-background-music';
const ACTION_BUTTONS =
  '.next-button, .paper-reset, .pigment-item, .exhibition-themes button, .exhibition-actions button, [data-audio-action]';

function ramp(gain, value, seconds, now) {
  if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(now);
  else {
    const current = gain.value;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(current, now);
  }
  if (seconds > 0) gain.linearRampToValueAtTime(value, now + seconds);
  else gain.setValueAtTime(value, now);
}

export class AudioManager {
  constructor() {
    this.encoded = new Map();
    this.decoded = new Map();
    this.voices = new Map();
    this.pending = new Map();
    this.cooldowns = new Map();
    this.timers = new Map();
    this.completed = new Set();
    this.musicEnabled = true;
    this.stage = null;
    this.context = null;
    this.musicBus = null;
  }

  mount() {
    const listeners = new AbortController();
    this.listeners = listeners;
    try { this.musicEnabled = window.localStorage.getItem(MUSIC_KEY) !== 'off'; } catch {}
    const options = { capture: true, signal: listeners.signal };
    const gesture = event => {
      if (event.isTrusted && event.target instanceof Element && event.target.closest('.journey-flow')) this.unlock();
    };
    window.addEventListener('pointerdown', gesture, options);
    window.addEventListener('pointerup', gesture, options);
    window.addEventListener('touchend', gesture, { ...options, passive: true });
    window.addEventListener('keydown', gesture, options);
    window.addEventListener('click', event => {
      gesture(event);
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const button = event.target.closest(ACTION_BUTTONS);
      if (!button?.closest('.journey-flow') || button.matches(':disabled,[aria-disabled="true"]')
        || button.closest('[inert],[aria-hidden="true"]')
        || button.matches('.pigment-item[aria-pressed="true"]')) return;
      if (button.matches('.paper-reset') && button.closest('.design-surface')?.querySelector('.model-loading, .load-error')) return;
      this.once('click');
      if (button.matches('.exhibition-museum-return')) this.leaveGallery();
    }, options);

    const hide = () => {
      this.clearTransient();
      if (this.stage === 'exhibition' && this.galleryEntered) this.galleryReady = true;
      this.context?.suspend().catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hide();
      else if (this.context) this.unlock();
    }, options);
    window.addEventListener('pagehide', hide, options);
    window.addEventListener('pageshow', () => { if (this.context && !document.hidden) this.unlock(); }, options);

    // Start fetching during idle time, without creating a playback context.
    const preload = () => {
      for (const key of Object.keys(AUDIO_SETTINGS)) void this.fetchEncoded(key);
    };
    const idle = typeof window.requestIdleCallback === 'function';
    const handle = idle ? window.requestIdleCallback(preload, { timeout: 1500 }) : window.setTimeout(preload, 300);
    return () => {
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      this.dispose();
    };
  }

  unlock() {
    if (!this.listeners || document.hidden) return;
    try {
      if (!this.context) {
        const Context = window.AudioContext ?? window.webkitAudioContext;
        if (!Context) return;
        const context = new Context();
        const musicBus = context.createGain();
        musicBus.gain.value = this.musicEnabled ? 1 : 0;
        musicBus.connect(context.destination);
        this.context = context;
        this.musicBus = musicBus;
      }
      const context = this.context;
      if (context.state === 'running') {
        this.syncMusic();
      } else if (!this.resuming) {
        this.resuming = context.resume().then(() => {
          if (this.context === context) this.syncMusic();
        }).catch(() => {}).finally(() => {
          if (this.context === context) this.resuming = null;
        });
      }
      if (!this.preparedEffects) {
        this.preparedEffects = true;
        for (const [key, settings] of Object.entries(AUDIO_SETTINGS)) {
          if (settings.group !== 'music' && settings.file) void this.decode(key);
        }
      }
    } catch {}
  }

  fetchEncoded(key) {
    const file = AUDIO_SETTINGS[key]?.file;
    if (!file || !this.listeners) return Promise.resolve(null);
    if (!this.encoded.has(key)) {
      const url = new URL(encodeURIComponent(file), import.meta.url);
      this.encoded.set(key, fetch(url, { signal: this.listeners.signal })
        .then(response => response.ok ? response.arrayBuffer() : null)
        .catch(() => null));
    }
    return this.encoded.get(key);
  }

  decode(key) {
    const context = this.context;
    if (!context) return Promise.resolve(null);
    if (!this.decoded.has(key)) {
      this.decoded.set(key, this.fetchEncoded(key).then(data => {
        if (!data || this.context !== context) return null;
        return context.decodeAudioData(data.slice(0));
      }).catch(() => null));
    }
    return this.decoded.get(key);
  }

  play(key, options = {}) {
    const settings = AUDIO_SETTINGS[key];
    const context = this.context;
    if (!settings?.file || !context || document.hidden || !this.listeners
      || this.pending.has(key) || this.voices.has(key)) return;
    const request = Symbol(key);
    this.pending.set(key, request);
    void Promise.all([this.decode(key), this.resuming]).then(([buffer]) => {
      if (this.pending.get(key) !== request) return;
      this.pending.delete(key);
      if (!buffer || this.context !== context || context.state !== 'running' || document.hidden) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const now = context.currentTime;
      const loop = options.loop ?? false;
      const start = Math.min(options.offset ?? settings.offset ?? 0, Math.max(0, buffer.duration - .001));
      const duration = options.duration ?? settings.duration;
      const fadeIn = options.fadeIn ?? 0;
      const volume = settings.volume;
      source.buffer = buffer;
      source.loop = loop;
      if (loop && settings.loopEnd && settings.loopEnd <= buffer.duration) {
        source.loopStart = start;
        source.loopEnd = settings.loopEnd;
      }
      source.connect(gain).connect(settings.group === 'music' ? this.musicBus : context.destination);
      gain.gain.setValueAtTime(fadeIn > 0 ? 0 : volume, now);
      if (fadeIn > 0) gain.gain.linearRampToValueAtTime(volume, now + fadeIn);
      const voice = { source, gain, release: null };
      source.onended = () => {
        window.clearTimeout(voice.release);
        source.disconnect();
        gain.disconnect();
        if (this.voices.get(key) === voice) this.voices.delete(key);
      };
      this.voices.set(key, voice);
      try {
        if (duration && !loop) {
          const span = Math.min(duration, buffer.duration - start);
          const tail = Math.min(.08, span / 3);
          gain.gain.setValueAtTime(volume, now + span - tail);
          gain.gain.linearRampToValueAtTime(0, now + span);
          source.start(now, start, span);
        } else source.start(now, start);
      } catch {
        source.onended();
      }
    }).catch(() => {
      if (this.pending.get(key) === request) this.pending.delete(key);
    });
  }

  once(key, options) {
    if (!AUDIO_SETTINGS[key]?.file || !this.context || document.hidden) return;
    const now = performance.now();
    if (now - (this.cooldowns.get(key) ?? -Infinity) < (AUDIO_SETTINGS[key].cooldown ?? 80)) return;
    this.cooldowns.set(key, now);
    this.play(key, options);
  }

  later(name, callback, ms, group) {
    this.cancelTimer(name);
    const handle = window.setTimeout(() => {
      this.timers.delete(name);
      if (this.listeners && !document.hidden) callback();
    }, ms);
    this.timers.set(name, { handle, group });
  }

  cancelTimer(name) {
    window.clearTimeout(this.timers.get(name)?.handle);
    this.timers.delete(name);
  }

  stop(key, seconds = AUDIO_TIMING.toolFadeOutSeconds) {
    this.pending.delete(key);
    this.cancelTimer('idle:' + key);
    const voice = this.voices.get(key);
    if (!voice || !this.context) return;
    if (voice.release !== null && seconds > 0) return;
    const release = () => {
      this.voices.delete(key);
      try { voice.source.stop(); } catch {}
    };
    window.clearTimeout(voice.release);
    if (!seconds) release();
    else {
      ramp(voice.gain.gain, 0, seconds, this.context.currentTime);
      voice.release = window.setTimeout(release, seconds * 1000 + 25);
    }
  }

  pulse(key) {
    if (!AUDIO_SETTINGS[key]?.file || !this.context || document.hidden) return;
    const voice = this.voices.get(key);
    if (voice?.release != null) {
      window.clearTimeout(voice.release);
      voice.release = null;
      ramp(voice.gain.gain, AUDIO_SETTINGS[key].volume, .06, this.context.currentTime);
    } else if (!voice) {
      this.play(key, { loop: true, fadeIn: .035 });
    }
    this.later('idle:' + key, () => this.stop(key), AUDIO_TIMING.toolIdleMs, 'tool');
  }

  dustContact(tool, effective) {
    if (tool === 'brush' && AUDIO_SETTINGS.dustBrush.file) {
      if (effective) this.pulse('dustBrush');
      else this.stop('dustBrush');
    } else if (tool === 'blower' && AUDIO_SETTINGS.dustBlower.file) {
      if (effective && !this.blowerActive) this.once('dustBlower');
      this.blowerActive = effective;
    }
  }

  complete(stage, delay = 0) {
    if (this.completed.has(stage)) return;
    this.completed.add(stage);
    const play = () => {
      this.stop('complete', 0);
      this.once('complete');
    };
    if (delay) this.later('complete:' + stage, play, delay, 'ui');
    else play();
  }

  fragmentPlaced(last) {
    this.stop('assembly', 0);
    this.once('assembly');
    if (last) this.complete('assembly', AUDIO_TIMING.lastAssemblyCueGapMs);
  }

  repairGif(type) {
    if (type === 'take') this.once('suction');
    else this.later('dropContact', () => this.once('drop'), AUDIO_TIMING.dropContactMs, 'tool');
  }

  clearTools() {
    for (const [key, settings] of Object.entries(AUDIO_SETTINGS)) {
      if (settings.group === 'tool') this.stop(key, 0);
    }
    for (const [name, timer] of this.timers) if (timer.group === 'tool') this.cancelTimer(name);
    this.blowerActive = false;
  }

  clearTransient() {
    this.clearTools();
    for (const [key, settings] of Object.entries(AUDIO_SETTINGS)) {
      if (settings.group === 'ui') this.stop(key, 0);
    }
    for (const name of this.timers.keys()) this.cancelTimer(name);
  }

  setStage(stage) {
    if (!stage || stage === this.stage) return;
    this.clearTools();
    this.stage = stage;
    if (stage === 'exhibition') {
      this.galleryReady = false;
      this.fadeWorkshop();
    } else {
      this.workshopLeaving = false;
      this.galleryEntered = false;
      this.galleryReady = false;
      this.galleryLeaving = false;
      this.cancelTimer('entrance');
      this.cancelTimer('galleryMusic');
      this.stop('entrance', .2);
      this.stop('gallery', AUDIO_TIMING.galleryFadeOutSeconds);
    }
    this.syncMusic();
  }

  fadeWorkshop() {
    this.workshopLeaving = true;
    this.stop('workshop', AUDIO_TIMING.workshopFadeOutSeconds);
  }

  enterGallery(announce) {
    this.setStage('exhibition');
    if (this.galleryEntered) return;
    this.galleryEntered = true;
    if (announce && this.context && !document.hidden) {
      this.later('entrance', () => this.once('entrance'), AUDIO_TIMING.entranceOffsetMs, 'gallery');
      this.later('galleryMusic', () => {
        this.galleryReady = true;
        this.syncMusic();
      }, AUDIO_TIMING.entranceOffsetMs + AUDIO_TIMING.galleryMusicTailMs, 'gallery');
    } else {
      this.galleryReady = true;
      this.syncMusic();
    }
  }

  leaveGallery() {
    this.galleryLeaving = true;
    this.cancelTimer('entrance');
    this.cancelTimer('galleryMusic');
    this.stop('gallery', AUDIO_TIMING.galleryFadeOutSeconds);
    this.stop('entrance', .22);
  }

  syncMusic() {
    if (!this.stage || this.context?.state !== 'running' || document.hidden) return;
    if (this.stage === 'exhibition') {
      if (this.galleryReady && !this.galleryLeaving) this.play('gallery', { loop: true, fadeIn: AUDIO_SETTINGS.gallery.fadeIn });
    } else if (!this.workshopLeaving) {
      this.play('workshop', { loop: true, fadeIn: AUDIO_SETTINGS.workshop.fadeIn });
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    try { window.localStorage.setItem(MUSIC_KEY, enabled ? 'on' : 'off'); } catch {}
    if (!this.context || !this.musicBus) return;
    ramp(this.musicBus.gain, enabled ? 1 : 0, .18, this.context.currentTime);
    this.syncMusic();
  }

  dispose() {
    this.listeners?.abort();
    this.listeners = null;
    this.clearTransient();
    this.stop('workshop', 0);
    this.stop('gallery', 0);
    this.musicBus?.disconnect();
    this.musicBus = null;
    this.context?.close().catch(() => {});
    this.context = null;
    this.resuming = null;
    this.encoded.clear();
    this.decoded.clear();
    this.cooldowns.clear();
    this.completed.clear();
    this.preparedEffects = false;
    this.stage = null;
    this.galleryEntered = false;
    this.galleryReady = false;
    this.galleryLeaving = false;
    this.workshopLeaving = false;
  }
}

export const audio = new AudioManager();
