# Carmina — Sufi Dawn Alarm

A minimalist, responsive single-page alarm clock with curated ambient Sufi ringtones, Persian green and periwinkle styling, soft volume fade-in, and offline-friendly `localStorage` persistence.

## Quick start

1. Add MP3 files listed in `assets/audio/README.md` (or change paths in `js/tracks.js`).
2. Serve over HTTP (required for modules and audio). From this folder:

   ```bash
   npx --yes serve .
   ```

3. Open the URL shown, tap **Enable sound** or interact once so the browser allows playback.
4. Create alarms, preview ringtones, and leave the tab open (or grant notifications).

---

## Core features & UX design

### User flows

| Flow | Behavior |
|------|----------|
| **Single alarm** | Leave repeat days unchecked; fires once on the chosen time (today or tomorrow if time passed). Auto-disables after firing. |
| **Recurring alarm** | Select Su–Sa chips; fires every matching weekday at `:00` seconds. |
| **Snooze** | Per-alarm snooze minutes (5–20); overlay **Snooze** re-triggers the same track after delay. |
| **Preview** | Modal **Preview** plays ~45s with a short fade-in (user gesture unlocks audio). |
| **Soft wake** | Global **Wake fade-in** (15–60s) ramps gain via Web Audio `GainNode.linearRampToValueAtTime`. |
| **Custom label** | Optional text on list items and full-screen alarm overlay. |

### Layout & aesthetic

- **Header:** Brand + optional “Enable sound” for autoplay unlock.
- **Hero clock:** Large serif time, subtle floating color orbs (Persian green + periwinkle).
- **Alarm list:** Time, label, repeat summary, next fire, toggle switch; tap row to edit.
- **Preferences:** Default snooze, fade duration, optional `Notification` API when tab is backgrounded.
- **Modal:** Time picker, label, day chips, ringtone select + preview.
- **Alarm overlay:** Full-screen gradient, snooze / dismiss when firing.

Motion is gentle (`fade-up`, drifting orbs); respects `prefers-reduced-motion`.

**Palette:** Persian green `#00693E`, periwinkle `#B8C5E8` / `#7B8FD4`, cream glass panels.

---

## Technical architecture

| Layer | Choice |
|-------|--------|
| UI | Static **HTML5 + CSS3** (glassmorphism, CSS variables, no build step) |
| Logic | **ES modules** vanilla JavaScript |
| Audio | **HTMLAudioElement** for decode/stream + **Web Audio API** (`AudioContext`, `MediaElementSource`, `GainNode`) for fade-in |
| Persistence | **`localStorage`** keys `carmina_alarms_v1`, `carmina_prefs_v1` |
| Notifications | Optional **`Notification`** API (requires permission + HTTPS or localhost) |

### Autoplay policy

Browsers block audio until a **user gesture** (click/touch). The app:

1. Shows **Enable sound** until `audioContext.resume()` succeeds.
2. Calls `unlock()` on first document click and before preview/alarm play.
3. Keeps the tab awake responsibility on the user (typical for web alarms); notifications supplement background tabs.

### Why not React?

For a single partner-focused clock, vanilla keeps payload tiny and avoids tooling. The same patterns map directly to React (state for alarms, `useEffect` interval for scheduler, ref to `AudioContext`).

---

## Audio strategy

1. **Content:** Prefer instrumental ney, rubab/setar, santoor, or very soft vocal dhikr—no loud percussion or sharp attacks at loop points.
2. **Formats:** Primary **MP3**; optional **OGG Vorbis** when `canPlayType` supports it (`js/audio.js`).
3. **Looping:** Set `audio.loop = true` for alarms; edit files with a crossfade loop in Audacity/Reaper. Preview uses the same file without loop (auto-stops at 45s).
4. **Levels:** Target ~−14 LUFS; fade-in handles the last mile so wake-up feels gradual.

---

## Implementation reference

### Alarm scheduler (minute match)

See `js/scheduler.js` — compares local hours/minutes and repeat days / one-shot date.

### Play with fade-in

See `js/audio.js` — `AlarmAudioEngine.play(trackId, { fadeSeconds, targetVolume })`.

### Persist alarms

See `js/storage.js` — `loadAlarms()` / `saveAlarms(alarms)`.

### Fire + notify

See `js/app.js` — `checkAlarms()` every second, `fireAlarm()` shows overlay and starts playback.

---

## File map

```
index.html          Shell & modal markup
css/styles.css      Theme & responsive layout
js/app.js           UI, scheduler tick, overlay
js/audio.js         Web Audio fade + media element
js/storage.js       localStorage
js/tracks.js        Ringtone catalog
js/scheduler.js     Next fire & shouldFireNow
assets/audio/       Your MP3/OGG files
```

---

## Limitations

- Web alarms need the page loaded (or a installed PWA with background support— not included). Use notifications as a backup cue.
- iOS Safari may suspend timers in background; keep screen on or use a native wrapper for critical wake-ups.
- Replace placeholder audio paths with files you have rights to use.
