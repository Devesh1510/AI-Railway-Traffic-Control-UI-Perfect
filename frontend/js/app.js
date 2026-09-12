/**
 * app.js – Entry point, tab switching, speed/reset controls
 * Loaded last so all other modules are available.
 */

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(name, btnEl) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
  } else {
    const target = document.querySelector(`[data-tab="${name}"]`);
    if (target) target.classList.add('active');
  }

  document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
  const section = document.getElementById('tab-' + name);
  if (section) section.classList.add('active');

  if (name === 'analytics') renderAnalytics();
}

// ── Speed ─────────────────────────────────────────────────────────────────────
function setSpeed(s, btnEl) {
  document.querySelectorAll('.ctrl-btn[data-speed]').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  // Always update offline engine (it runs even when backend is connected
  // and we may switch to it at any time)
  OFFLINE.setSpeed(s);

  // Also tell backend if it's up
  API.setSpeed(s).catch(() => {/* backend may be offline, that's fine */});
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetSim() {
  OFFLINE.reset();

  API.reset().catch(() => {/* backend may be offline */});

  // Rebuild analytics charts on next open
  window._chartsInited = false;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  // NOTE: Canvas sizes are set by initSimulation() using fixed pixel constants.
  // Do NOT resize canvases by DOM clientWidth – hidden tabs give width=0.
  initSimulation();
  console.log('[App] AI Railway Traffic Control System – Pune Division ready');
});
