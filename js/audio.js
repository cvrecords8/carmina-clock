import { getTrackById } from "./tracks.js";

/**
 * Web Audio + HTMLMediaElement bridge for fade-in and reliable looping.
 * Browsers block autoplay until a user gesture unlocks the audio context.
 */
export class AlarmAudioEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.context = null;
    /** @type {GainNode | null} */
    this.gain = null;
    /** @type {MediaElementAudioSourceNode | null} */
    this.source = null;
    /** @type {HTMLAudioElement | null} */
    this.media = null;
    this.unlocked = false;
    this.fadeRaf = null;
  }

  ensureContext() {
    if (!this.context) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.context = new Ctx();
      this.gain = this.context.createGain();
      this.gain.connect(this.context.destination);
      this.gain.gain.value = 0;
    }
    return this.context;
  }

  /**
   * Call from click/touch — required for autoplay policy.
   * @returns {Promise<boolean>}
   */
  async unlock() {
    this.ensureContext();
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.unlocked = this.context.state === "running";
    return this.unlocked;
  }

  _stopFade() {
    if (this.fadeRaf) {
      cancelAnimationFrame(this.fadeRaf);
      this.fadeRaf = null;
    }
  }

  _detachMedia() {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        /* already disconnected */
      }
      this.source = null;
    }
    if (this.media) {
      this.media.pause();
      this.media.removeAttribute("src");
      this.media.load();
      this.media = null;
    }
  }

  /**
   * @param {string} trackId
   * @param {{ preview?: boolean, fadeSeconds?: number, targetVolume?: number }} opts
   */
  async play(trackId, opts = {}) {
    const { preview = false, fadeSeconds = 30, targetVolume = 0.85 } = opts;
    await this.unlock();

    const track = getTrackById(trackId);
    this.stop();

    this.ensureContext();
    this.media = document.createElement("audio");
    this.media.preload = "auto";
    this.media.loop = track.loop && !preview;
    this.media.crossOrigin = "anonymous";

    const canOgg = this.media.canPlayType("audio/ogg; codecs=vorbis");
    if (canOgg && track.srcOgg) {
      this.media.src = track.srcOgg;
    } else {
      this.media.src = track.src;
    }

    this.source = this.context.createMediaElementSource(this.media);
    this.source.connect(this.gain);

    const peak = preview ? targetVolume * 0.6 : targetVolume;
    if (preview || fadeSeconds <= 0) {
      this.gain.gain.cancelScheduledValues(this.context.currentTime);
      this.gain.gain.setValueAtTime(peak, this.context.currentTime);
    } else {
      this.gain.gain.cancelScheduledValues(this.context.currentTime);
      this.gain.gain.setValueAtTime(0, this.context.currentTime);
      this.gain.gain.linearRampToValueAtTime(
        peak,
        this.context.currentTime + fadeSeconds
      );
    }

    try {
      await this.media.play();
    } catch (err) {
      console.warn("Playback blocked:", err);
      throw err;
    }

    if (preview) {
      this.media.addEventListener(
        "ended",
        () => {
          if (!this.media?.loop) this.stop();
        },
        { once: true }
      );
      setTimeout(() => this.stop(), 45000);
    }

    return track;
  }

  stop() {
    this._stopFade();
    this._detachMedia();
    if (this.gain && this.context) {
      this.gain.gain.cancelScheduledValues(this.context.currentTime);
      this.gain.gain.setValueAtTime(0, this.context.currentTime);
    }
  }

  isPlaying() {
    return Boolean(this.media && !this.media.paused);
  }
}

export const audioEngine = new AlarmAudioEngine();
