/**
 * Utility helpers for backend
 */

/**
 * Format simulation seconds as HH:MM:SS display clock
 * Base time: 14:00:00
 */
function formatSimClock(simSecs) {
  const base = 14 * 3600;
  const total = (base + simSecs) % 86400;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/**
 * Add scheduled time + delay → actual time string
 */
function addDelay(scheduled, delayMinutes) {
  const [h, m] = scheduled.split(':').map(Number);
  const totalMin = h * 60 + m + delayMinutes;
  const nh = Math.floor(totalMin / 60) % 24;
  const nm = totalMin % 60;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
}

/**
 * Clamp a number between min and max
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

module.exports = { formatSimClock, addDelay, clamp };
