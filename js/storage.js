const ALARMS_KEY = "carmina_alarms_v1";
const PREFS_KEY = "carmina_prefs_v1";

const defaultPrefs = {
  defaultSnoozeMinutes: 9,
  fadeInSeconds: 30,
  notificationsEnabled: false,
  darkMode: true,
};

export function loadAlarms() {
  try {
    const raw = localStorage.getItem(ALARMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlarms(alarms) {
  localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...defaultPrefs };
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return { ...defaultPrefs };
  }
}

export function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function createAlarmId() {
  return `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** @typedef {{ id: string, time: string, label: string, days: number[], snoozeMinutes: number, trackId: string, enabled: boolean, oneShotDate?: string | null }} Alarm */
