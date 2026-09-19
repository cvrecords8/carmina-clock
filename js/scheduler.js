/**
 * Computes next fire time for an alarm (local timezone).
 * @param {import('./storage.js').Alarm} alarm
 * @param {Date} [from]
 * @returns {Date | null}
 */
export function getNextFireDate(alarm, from = new Date()) {
  if (!alarm.enabled) return null;

  const [h, m] = alarm.time.split(":").map(Number);
  const days = alarm.days?.length ? [...alarm.days].sort((a, b) => a - b) : null;

  if (!days) {
    const candidate = new Date(from);
    candidate.setHours(h, m, 0, 0);
    if (alarm.oneShotDate) {
      const shot = new Date(alarm.oneShotDate + "T" + alarm.time + ":00");
      if (shot <= from) return null;
      return shot;
    }
    if (candidate <= from) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(from);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    if (d <= from) continue;
    if (days.includes(d.getDay())) return d;
  }
  return null;
}

/**
 * @param {import('./storage.js').Alarm} alarm
 * @param {Date} firedAt
 */
export function shouldFireNow(alarm, firedAt = new Date()) {
  if (!alarm.enabled) return false;
  const [h, m] = alarm.time.split(":").map(Number);
  const matchTime =
    firedAt.getHours() === h && firedAt.getMinutes() === m && firedAt.getSeconds() < 2;

  if (!matchTime) return false;

  const days = alarm.days?.length ? alarm.days : null;
  if (!days) {
    if (alarm.oneShotDate) {
      const today = formatDateKey(firedAt);
      return alarm.oneShotDate === today;
    }
    return true;
  }
  return days.includes(firedAt.getDay());
}

export function formatDateKey(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Local calendar date when a one-time alarm should fire. */
export function computeOneShotDate(timeStr, from = new Date()) {
  const [h, m] = timeStr.split(":").map(Number);
  const candidate = new Date(from);
  candidate.setHours(h, m, 0, 0);
  if (candidate <= from) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return formatDateKey(candidate);
}

export function formatRepeatLabel(days) {
  if (!days?.length) return "Once";
  if (days.length === 7) return "Every day";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join() === "1,2,3,4,5") return "Weekdays";
  if (sorted.join() === "0,6") return "Weekends";
  return sorted.map((i) => names[i]).join(", ");
}
