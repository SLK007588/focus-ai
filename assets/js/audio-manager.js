// Minimal AudioManager to preload and safely play audio with user gesture and proper promise handling.
class AudioManager {
  constructor(map = {}) {
    // map = { name: 'assets/audio/file.mp3', ... }
    this.map = Object.assign({}, map);
    this.cache = new Map();
    this.enabled = false; // becomes true after user gesture
  }

  register(name, src) {
    this.map[name] = src;
  }

  async preload(name) {
    const src = this.map[name];
    if (!src) throw new Error('Audio source not found for ' + name);
    if (this.cache.has(name)) return this.cache.get(name);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
    // Attach a small error handler for better diagnostics
    audio.addEventListener('error', (e) => {
      console.error('Audio load error:', name, src, e);
    });
    // store but don't trigger load() here; browser decides when to fetch
    this.cache.set(name, audio);
    return audio;
  }

  async enableOnUserGesture(buttonSelectorOrElement) {
    if (this.enabled) return true;
    const el = (typeof buttonSelectorOrElement === 'string')
      ? document.querySelector(buttonSelectorOrElement)
      : buttonSelectorOrElement;
    if (!el) throw new Error('Enable element not found');
    const clickHandler = async () => {
      try {
        // Attempt a silent play on a tiny silent audio to unlock playback on mobile/desktop
        const blank = new Audio();
        blank.src = this._silentDataUri();
        // Some browsers will reject; swallow errors but mark enabled anyway
        await blank.play().catch(()=>{ /* ignore */});
      } catch (err) {
        console.warn('Audio unlock attempt failed:', err);
      } finally {
        this.enabled = true;
        el.removeEventListener('click', clickHandler);
        if (el instanceof HTMLElement) el.style.display = 'none';
        console.info('AudioManager enabled by user gesture.');
      }
    };
    el.addEventListener('click', clickHandler);
  }

  _silentDataUri() {
    // Very small silent wav data-uri. Works as a quick attempt to unlock audio in many browsers.
    return "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQgAAAAA";
  }

  async play(name, { loop = false, volume = 1 } = {}) {
    if (!this.map[name]) {
      console.warn('AudioManager: no mapping for', name);
      return Promise.reject(new Error('No audio mapped'));
    }
    const audio = await this.preload(name);
    audio.loop = loop;
    audio.volume = Math.max(0, Math.min(1, volume));
    if (!this.enabled) {
      const err = new Error('Audio not enabled by user gesture');
      console.warn(err);
      return Promise.reject(err);
    }
    try {
      const playPromise = audio.play();
      if (playPromise && playPromise instanceof Promise) {
        await playPromise;
      }
      return audio;
    } catch (err) {
      console.error('AudioManager play failed for', name, err);
      // Best-effort retry: reload and try again
      try {
        audio.load();
        await audio.play();
        return audio;
      } catch (err2) {
        console.error('AudioManager retry failed for', name, err2);
        throw err2;
      }
    }
  }

  pause(name) {
    const a = this.cache.get(name);
    if (a) a.pause();
  }

  stop(name) {
    const a = this.cache.get(name);
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  }
}

// Expose the manager factory for simple usage:
window.createAudioManager = (map) => new AudioManager(map);
export { AudioManager };