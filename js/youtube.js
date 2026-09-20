/**
 * In-page YouTube embed player only.
 */

/** @param {string} url */
export function getYouTubeVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") {
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
  } catch {
    /* ignore */
  }
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

/** @param {string} videoId @param {{ mute?: boolean }} opts */
export function embedUrl(videoId, opts = {}) {
  const id = encodeURIComponent(videoId);
  const mute = opts.mute ? 1 : 0;
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${mute}&rel=0&loop=1&playlist=${id}&playsinline=1&enablejsapi=1`;
}

/**
 * @param {{ youtubeUrl?: string, videoId?: string }} source
 * @returns {string | null}
 */
export function buildEmbedSrc(source, opts = {}) {
  const videoId = source.videoId || getYouTubeVideoId(source.youtubeUrl ?? "");
  if (!videoId) return null;
  return embedUrl(videoId, opts);
}

export class YouTubeAlarmPlayer {
  constructor() {
    /** @type {Record<string, HTMLElement | null>} */
    this.hosts = {};
    /** @type {HTMLIFrameElement | null} */
    this.iframe = null;
  }

  /** @param {Record<string, HTMLElement | null>} hosts */
  setHosts(hosts) {
    this.hosts = { ...this.hosts, ...hosts };
  }

  /**
   * @param {{ youtubeUrl?: string, videoId?: string }} source
   * @param {{ surface?: string }} opts
   */
  play(source, opts = {}) {
    const surface = opts.surface ?? "alarm";
    const { mute = false } = opts;
    const host = this.hosts[surface];
    const src = buildEmbedSrc(source, { mute });
    this.stop();

    if (!src || !host) return { embedded: false };

    host.hidden = false;
    host.replaceChildren();
    const iframe = document.createElement("iframe");
    iframe.className = "yt-player__iframe";
    iframe.src = src;
    iframe.title = "Alarm player";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    host.appendChild(iframe);
    this.iframe = iframe;
    return { embedded: true };
  }

  stop() {
    if (this.iframe) this.iframe.src = "about:blank";
    for (const host of Object.values(this.hosts)) {
      if (host) {
        host.hidden = true;
        host.replaceChildren();
      }
    }
    this.iframe = null;
  }
}

export const youtubePlayer = new YouTubeAlarmPlayer();
