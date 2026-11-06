/**
 * scenario.js – AI Scenario Chooser
 *
 * Shows the modal before any simulation starts.
 * When the user clicks a scenario card the chosen config is:
 *   1) Sent to the backend via POST /api/scenarios/select (if online)
 *   2) Applied directly to the OFFLINE engine (always, as fallback)
 *   3) Modal dismissed → initSimulation() called to start the render loop
 *
 * Scenario configs mirror backend/data/scenarios.js exactly so the
 * offline engine produces the same behaviour without a server.
 */

// ── Inline scenario definitions (mirrors backend) ─────────────────────────
const SC = {
  A: {
    id: 'A',
    // Scenario A: default — 17613 halts PF1, 14806+22225 overtake PF2
    timeline:  { '22106':{d:19,k:2}, '17613':{d:5,k:21}, '14806':{d:14,k:30}, '22225':{d:22,k:42} },
    trains:    { '17613':{haltKhadki:true,  haltPF:'PF1', delayMin:20},
                 '14806':{haltKhadki:false, delayMin:0 },
                 '22225':{haltKhadki:false, delayMin:15},
                 '22106':{haltKhadki:false, delayMin:5 } },
    kSigInit:  { H1:'red', H2:'red', H3:'green', H4:'green', H5:'green', H6:'green', H7:'green', S1:'red', S2:'green', S3:'green' },
    dSigInit:  { H1:'green', H2:'green', S1:'green', S2:'green', H3:'green', H4:'green' },
  },

  B: {
    id: 'B',
    // Scenario B: all trains non-stop, no halts
    timeline:  { '22106':{d:19,k:2}, '17613':{d:5,k:14}, '14806':{d:14,k:26}, '22225':{d:22,k:38} },
    trains:    { '17613':{haltKhadki:false, delayMin:20},
                 '14806':{haltKhadki:false, delayMin:0 },
                 '22225':{haltKhadki:false, delayMin:15},
                 '22106':{haltKhadki:false, delayMin:5 } },
    // All signals green — no pre-set red (no halts planned)
    kSigInit:  { H1:'green', H2:'green', H3:'green', H4:'green', H5:'green', H6:'green', H7:'green', S1:'green', S2:'green', S3:'green' },
    dSigInit:  { H1:'green', H2:'green', S1:'green', S2:'green', H3:'green', H4:'green' },
  },

  C: {
    id: 'C',
    // Scenario C: 17613 halts PF1, 14806 halts PF2, 22106 waits before Khadki,
    //             22225 VB overtakes all from PF3, then releases 17613 then 14806
    timeline:  { '22106':{d:19,k:2}, '17613':{d:5,k:21}, '14806':{d:14,k:30}, '22225':{d:22,k:44} },
    trains:    { '17613':{haltKhadki:true,  haltPF:'PF1', delayMin:20},
                 '14806':{haltKhadki:true,  haltPF:'PF2', delayMin:0 },
                 '22225':{haltKhadki:false, delayMin:15},
                 '22106':{haltKhadki:true,  haltPF:'PF3_WAIT', delayMin:15} },
    kSigInit:  { H1:'red', H2:'red', H3:'red', H4:'red', H5:'green', H6:'green', H7:'green', S1:'red', S2:'red', S3:'green' },
    dSigInit:  { H1:'green', H2:'green', S1:'green', S2:'green', H3:'green', H4:'green' },
  },
};

// ── State ─────────────────────────────────────────────────────────────────
let _chosenScenario = null;

// ── Clock tick in modal ───────────────────────────────────────────────────
(function _modalClock() {
  function tick() {
    const el = document.getElementById('scClock');
    if (!el) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
})();

// ── Called when user clicks a card ───────────────────────────────────────
function selectScenario(id) {
  const sc = SC[id];
  if (!sc) return;
  _chosenScenario = sc;

  // Visual – highlight chosen card
  document.querySelectorAll('.sc-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('sc-card-' + id);
  if (card) card.classList.add('selected');

  // Show brief "Applying…" feedback then launch
  const btn = card ? card.querySelector('.sc-select-btn') : null;
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '⏳ APPLYING SCENARIO…';
    btn.disabled = true;
  }

  // Notify backend (fire-and-forget; simulation runs regardless)
  API.setScenario(id).catch(() => {/* backend may be offline */});

  // Apply to offline engine immediately
  OFFLINE.applyScenario(sc);

  // Short pause so user sees feedback, then dismiss modal and start
  setTimeout(() => {
    const overlay = document.getElementById('scenarioOverlay');
    if (overlay) overlay.classList.add('hidden');
    initSimulation();
  }, 600);
}
