import {
  createAlarmId,
  loadAlarms,
  loadPrefs,
  saveAlarms,
  savePrefs,
} from "./storage.js";
import { TRACKS, getTrackById } from "./tracks.js";
import {
  computeOneShotDate,
  formatDateKey,
  getNextFireDate,
  shouldFireNow,
} from "./scheduler.js";
import { youtubePlayer } from "./youtube.js";
import { applyTheme } from "./theme.js";
import {
  advanceInteractionAffirmation,
  renderAffirmation,
  startAffirmationCycle,
} from "./affirmations.js";

/** @type {import('./storage.js').Alarm[]} */
let alarms = loadAlarms();
let prefs = loadPrefs();
/** @type {import('./storage.js').Alarm | null} */
let ringingAlarm = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let snoozeTimeout = null;
/** @type {(() => void) | null} */
let stopAffirmations = null;
let lastFiredMinuteKey = "";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const $ = (id) => document.getElementById(id);

const el = {
  heroInteractionAff: $("heroInteractionAff"),
  heroInteractionLang: $("heroInteractionLang"),
  heroNextTime: $("heroNextTime"),
  heroNextLabel: $("heroNextLabel"),
  alarmList: $("alarmList"),
  emptyState: $("emptyState"),
  btnNewAlarm: $("btnNewAlarm"),
  alarmModal: $("alarmModal"),
  alarmForm: $("alarmForm"),
  modalTitle: $("modalTitle"),
  alarmHour: $("alarmHour"),
  alarmMinute: $("alarmMinute"),
  alarmPeriod: $("alarmPeriod"),
  alarmLabel: $("alarmLabel"),
  alarmSnooze: $("alarmSnooze"),
  alarmTrack: $("alarmTrack"),
  alarmId: $("alarmId"),
  dayPicker: $("dayPicker"),
  btnPreview: $("btnPreview"),
  previewEmbed: $("previewEmbed"),
  btnDeleteAlarm: $("btnDeleteAlarm"),
  btnCloseModal: $("btnCloseModal"),
  btnCancel: $("btnCancel"),
  alarmOverlay: $("alarmOverlay"),
  overlayInteractionAff: $("overlayInteractionAff"),
  overlayInteractionLang: $("overlayInteractionLang"),
  overlayLabel: $("overlayLabel"),
  overlayTitle: $("overlayTitle"),
  overlayAffirmation: $("overlayAffirmation"),
  overlayAffLang: $("overlayAffLang"),
  overlayEmbed: $("overlayEmbed"),
  btnSnooze: $("btnSnooze"),
  btnDismiss: $("btnDismiss"),
};

function init() {
  populateTimeSelects();
  populateSnoozeOptions(el.alarmSnooze, prefs.defaultSnoozeMinutes);
  populateTrackSelect(el.alarmTrack);
  applyTheme();

  youtubePlayer.setHosts({
    preview: el.previewEmbed,
    alarm: el.overlayEmbed,
  });

  bindDayPicker();
  bindEvents();
  bindInteractionAffirmations();
  renderAlarmList();
  updateHeroNext();
  setInterval(tickClock, 1000);
  setInterval(checkAlarms, 1000);
}

function populateTimeSelects() {
  el.alarmHour.innerHTML = "";
  for (let h = 1; h <= 12; h++) {
    const opt = document.createElement("option");
    opt.value = String(h);
    opt.textContent = String(h);
    el.alarmHour.appendChild(opt);
  }
  el.alarmMinute.innerHTML = "";
  for (let m = 0; m < 60; m++) {
    const label = String(m).padStart(2, "0");
    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    el.alarmMinute.appendChild(opt);
  }
}

function setTimeSelects(time24) {
  const [h24, minute] = time24.split(":").map(Number);
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  el.alarmHour.value = String(h12);
  el.alarmMinute.value = String(minute).padStart(2, "0");
  el.alarmPeriod.value = period;
}

function readTimeFromSelects() {
  let h = Number(el.alarmHour.value);
  const minute = el.alarmMinute.value;
  const period = el.alarmPeriod.value;
  if (period === "AM") {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return `${String(h).padStart(2, "0")}:${minute}`;
}

function populateSnoozeOptions(select, selected = 9) {
  select.innerHTML = "";
  [5, 9, 10, 15, 20].forEach((n) => {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = `${n} minutes`;
    if (n === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

function populateTrackSelect(select) {
  select.innerHTML = "";
  TRACKS.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
  });
}

function bindDayPicker() {
  el.dayPicker.querySelectorAll(".day-dot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", pressed ? "false" : "true");
    });
  });
}

function bindEvents() {
  el.btnNewAlarm.addEventListener("click", () => openModal());
  el.btnCloseModal.addEventListener("click", closeModal);
  el.btnCancel.addEventListener("click", closeModal);
  el.alarmForm.addEventListener("submit", onSaveAlarm);
  el.btnDeleteAlarm.addEventListener("click", onDeleteAlarm);
  el.btnPreview.addEventListener("click", onPreview);

  el.btnSnooze.addEventListener("click", onSnooze);
  el.btnDismiss.addEventListener("click", onDismiss);
}

function refreshInteractionAffirmations() {
  const item = advanceInteractionAffirmation();
  renderAffirmation(el.heroInteractionAff, el.heroInteractionLang, item);
  renderAffirmation(el.overlayInteractionAff, el.overlayInteractionLang, item);
}

let lastInteractionAdvance = 0;

function onUserInteraction(event) {
  if (event.target.closest(".yt-player__iframe, .yt-player iframe")) return;
  const now = Date.now();
  if (now - lastInteractionAdvance < 180) return;
  lastInteractionAdvance = now;
  refreshInteractionAffirmations();
}

function bindInteractionAffirmations() {
  refreshInteractionAffirmations();
  document.addEventListener("pointerup", onUserInteraction);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key === "Shift" || e.key === "Meta" || e.key === "Control") return;
    onUserInteraction(e);
  });
}

function tickClock() {
  updateHeroNext();
}

function updateHeroNext() {
  const enabled = alarms.filter((a) => a.enabled);
  if (!enabled.length) {
    el.heroNextTime.textContent = "—";
    el.heroNextLabel.textContent = "No alarms set";
    return;
  }

  let nearest = null;
  let nearestDate = null;
  const now = new Date();

  for (const alarm of enabled) {
    const next = getNextFireDate(alarm, now);
    if (!next) continue;
    if (!nearestDate || next < nearestDate) {
      nearestDate = next;
      nearest = alarm;
    }
  }

  if (!nearest || !nearestDate) {
    el.heroNextTime.textContent = formatNowTime();
    el.heroNextTime.setAttribute("datetime", new Date().toISOString());
    el.heroNextLabel.textContent = "No upcoming alarms";
    return;
  }

  el.heroNextTime.textContent = formatDisplayTime(nearest.time);
  el.heroNextTime.setAttribute("datetime", nearestDate.toISOString());
  el.heroNextLabel.textContent = nearest.label || "Next alarm";
}

function renderAlarmList() {
  el.alarmList.innerHTML = "";
  const visible = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
  el.emptyState.hidden = visible.length > 0;

  visible.forEach((alarm) => {
    const li = document.createElement("li");
    li.className = "alarm-row" + (alarm.enabled ? "" : " alarm-row--off");

    const daysHtml = [1, 2, 3, 4, 5, 6, 0]
      .map((d) => {
        const on = alarm.days?.includes(d);
        return `<span class="day-pill${on ? " day-pill--on" : ""}">${DAY_LABELS[d]}</span>`;
      })
      .join("");

    li.innerHTML = `
      <button type="button" class="alarm-row__main" data-action="edit">
        <div class="alarm-row__time">${formatDisplayTime(alarm.time)}</div>
        <p class="alarm-row__label">${escapeHtml(alarm.label || "Alarm")}</p>
      </button>
      <div class="alarm-row__days">${daysHtml}</div>
      <label class="switch switch--gold" aria-label="Toggle alarm">
        <input type="checkbox" class="switch__input" data-action="toggle" ${alarm.enabled ? "checked" : ""} />
        <span class="switch__track"><span class="switch__thumb"></span></span>
      </label>
    `;

    li.querySelector('[data-action="edit"]').addEventListener("click", () => openModal(alarm.id));
    li.querySelector('[data-action="toggle"]').addEventListener("change", (e) => {
      alarm.enabled = e.target.checked;
      persist();
      renderAlarmList();
      updateHeroNext();
    });

    el.alarmList.appendChild(li);
  });
}

function formatDisplayTime(time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function resetDayPicker() {
  el.dayPicker.querySelectorAll(".day-dot").forEach((btn) => {
    btn.setAttribute("aria-pressed", "false");
  });
}

function setDayPicker(days) {
  resetDayPicker();
  if (!days?.length) return;
  days.forEach((d) => {
    const btn = el.dayPicker.querySelector(`[data-day="${d}"]`);
    if (btn) btn.setAttribute("aria-pressed", "true");
  });
}

function readDaysFromForm() {
  return [...el.dayPicker.querySelectorAll('.day-dot[aria-pressed="true"]')].map((btn) =>
    Number(btn.getAttribute("data-day"))
  );
}

function openModal(id = null) {
  const editing = id ? alarms.find((a) => a.id === id) : null;
  el.modalTitle.textContent = editing ? "Edit alarm" : "New alarm";
  el.btnDeleteAlarm.hidden = !editing;
  el.alarmId.value = editing?.id ?? "";

  if (editing) {
    setTimeSelects(editing.time);
    el.alarmLabel.value = editing.label ?? "";
    el.alarmSnooze.value = String(editing.snoozeMinutes);
    el.alarmTrack.value = editing.trackId;
    setDayPicker(editing.days);
  } else {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    setTimeSelects(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
    el.alarmLabel.value = "";
    el.alarmSnooze.value = String(prefs.defaultSnoozeMinutes);
    el.alarmTrack.value = TRACKS[0].id;
    resetDayPicker();
  }

  el.alarmModal.showModal();
}

function setPreviewOpen(open) {
  el.alarmModal.classList.toggle("sheet--preview-open", open);
}

function closeModal() {
  setPreviewOpen(false);
  el.alarmModal.close();
  youtubePlayer.stop();
}

function onSaveAlarm(e) {
  e.preventDefault();
  const id = el.alarmId.value || createAlarmId();
  const days = readDaysFromForm();
  const time = readTimeFromSelects();

  /** @type {import('./storage.js').Alarm} */
  const alarm = {
    id,
    time,
    label: el.alarmLabel.value.trim(),
    days,
    snoozeMinutes: Number(el.alarmSnooze.value),
    trackId: el.alarmTrack.value,
    enabled: true,
    oneShotDate: days.length ? null : computeOneShotDate(time),
  };

  const idx = alarms.findIndex((a) => a.id === id);
  if (idx >= 0) alarms[idx] = alarm;
  else alarms.push(alarm);

  persist();
  renderAlarmList();
  updateHeroNext();
  closeModal();
}

function onDeleteAlarm() {
  const id = el.alarmId.value;
  alarms = alarms.filter((a) => a.id !== id);
  persist();
  renderAlarmList();
  updateHeroNext();
  closeModal();
}

function onPreview() {
  const track = getTrackById(el.alarmTrack.value);
  setPreviewOpen(true);
  youtubePlayer.play(track, { surface: "preview" });
}

function persist() {
  saveAlarms(alarms);
}

function checkAlarms() {
  if (ringingAlarm) return;

  const now = new Date();
  const minuteKey = `${formatDateKey(now)}-${now.getHours()}-${now.getMinutes()}`;

  for (const alarm of alarms) {
    if (!shouldFireNow(alarm, now)) continue;
    if (lastFiredMinuteKey === minuteKey + alarm.id) continue;

    lastFiredMinuteKey = minuteKey + alarm.id;
    fireAlarm(alarm);
    break;
  }
}

function showAffirmation(item) {
  el.overlayAffirmation.classList.add("affirmation--fade");
  requestAnimationFrame(() => {
    setTimeout(() => {
      renderAffirmation(el.overlayAffirmation, el.overlayAffLang, item);
      el.overlayAffirmation.classList.remove("affirmation--fade");
    }, 280);
  });
}

function fireAlarm(alarm) {
  ringingAlarm = alarm;
  const track = getTrackById(alarm.trackId);

  el.overlayLabel.textContent = alarm.label || "For you";
  el.overlayTitle.textContent = formatDisplayTime(alarm.time);
  el.alarmOverlay.hidden = false;

  stopAffirmations?.();
  stopAffirmations = startAffirmationCycle(showAffirmation, 7000);

  youtubePlayer.play(track, { surface: "alarm" });

  if (prefs.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
    new Notification("Carmina — " + (alarm.label || "Alarm"), {
      body: formatDisplayTime(alarm.time),
      tag: "carmina-alarm",
      requireInteraction: true,
    });
  }

  if (!alarm.days?.length) {
    alarm.enabled = false;
    alarm.oneShotDate = null;
    persist();
    renderAlarmList();
    updateHeroNext();
  }
}

function onSnooze() {
  if (!ringingAlarm) return;
  const alarm = ringingAlarm;
  const minutes = alarm.snoozeMinutes || prefs.defaultSnoozeMinutes;
  clearAlarmUi();

  if (snoozeTimeout) clearTimeout(snoozeTimeout);
  snoozeTimeout = setTimeout(() => {
    snoozeTimeout = null;
    fireAlarm({ ...alarm, label: (alarm.label || "Alarm") + " (snooze)" });
  }, minutes * 60 * 1000);

  ringingAlarm = null;
}

function clearAlarmUi() {
  youtubePlayer.stop();
  stopAffirmations?.();
  stopAffirmations = null;
  el.alarmOverlay.hidden = true;
}

function onDismiss() {
  clearAlarmUi();
  ringingAlarm = null;
  if (snoozeTimeout) {
    clearTimeout(snoozeTimeout);
    snoozeTimeout = null;
  }
}

init();
