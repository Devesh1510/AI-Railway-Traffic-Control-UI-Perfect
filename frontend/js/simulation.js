/**
 * simulation.js – Frontend animation loop + offline simulation engine
 *
 * Key simulation logic at Khadki:
 *  - 17613  → enters PF1, decelerates, HALTS at PF1 (H1 stays RED)
 *  - 14806  → enters on PF2 (via H7 route), overtakes 17613, departs via H5
 *  - 22225  → enters PF2 10 seconds after 14806 clears PF2 entry, overtakes, departs via H5
 *  - 22106  → enters from right on PF3, passes left via H6/S3/H4
 *  - After BOTH 14806 and 22225 have fully exited: H1→yellow→green, S1→green, 17613 departs
 */

const POLL_MS = 80;

let _state     = null;
let _pollTimer = null;
let _backendOK = false;
let _dapodiCtx = null;
let _khadkiCtx = null;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC INIT
// ─────────────────────────────────────────────────────────────────────────────
function initSimulation() {
  const dCanvas = document.getElementById('dapodiCanvas');
  const kCanvas = document.getElementById('khadkiCanvas');

  if (dCanvas) { dCanvas.width = 1160; dCanvas.height = 320; _dapodiCtx = dCanvas.getContext('2d'); }
  if (kCanvas) { kCanvas.width = 1160; kCanvas.height = 380; _khadkiCtx = kCanvas.getContext('2d'); }

  OFFLINE.init();
  _state = OFFLINE.getState();
  _startRenderLoop();
  _tryBackend();
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER LOOP
// ─────────────────────────────────────────────────────────────────────────────
let _lastRafTs = null;

function _startRenderLoop() {
  function frame(ts) {
    requestAnimationFrame(frame);

    if (!_backendOK) {
      if (_lastRafTs === null) _lastRafTs = ts;
      const dt = Math.min((ts - _lastRafTs) / 1000, 0.05);
      _lastRafTs = ts;
      OFFLINE.tick(dt);
      _state = OFFLINE.getState();
    } else {
      _lastRafTs = ts;
    }

    if (!_state) return;

    const trainMap = {};
    if (_state.trains) Object.values(_state.trains).forEach(t => { trainMap[t.number] = t; });

    const dSig = _state.dapodiSignals || {};
    const kSig = _state.khadkiSignals  || {};

    if (_dapodiCtx) drawDapodiStation(_dapodiCtx, trainMap, dSig);
    if (_khadkiCtx) drawKhadkiStation(_khadkiCtx,  trainMap, kSig);

    _updateClock(_state.simTime || 0);
    _updateInfoPanels(trainMap, dSig, kSig);
  }
  requestAnimationFrame(frame);
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND
// ─────────────────────────────────────────────────────────────────────────────
function _tryBackend() {
  API.ping().then(ok => {
    if (ok) {
      console.log('[Sim] Backend online');
      _backendOK = true;
      _startPolling();
    } else {
      console.log('[Sim] Backend offline – client engine running');
      setTimeout(_tryBackend, 5000);
    }
  }).catch(() => setTimeout(_tryBackend, 5000));
}

function _startPolling() {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(async () => {
    try {
      _state = await API.getState();
      _backendOK = true;
    } catch {
      _backendOK = false;
      if (_state) OFFLINE.syncTime(_state.simTime || 0);
      clearInterval(_pollTimer); _pollTimer = null;
      setTimeout(_tryBackend, 5000);
    }
  }, POLL_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOCK
// ─────────────────────────────────────────────────────────────────────────────
function _updateClock(simSecs) {
  const total = (14 * 3600 + simSecs) % 86400;
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = Math.floor(total % 60);
  const el = document.getElementById('simClock');
  if (el) el.textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO PANELS
// ─────────────────────────────────────────────────────────────────────────────
function _updateInfoPanels(trainMap, dSig, kSig) {
  const dEl = document.getElementById('dapodiTrainStatus');
  if (dEl) dEl.innerHTML = _trainStatusRows(trainMap, 'dapodi');

  const kEl = document.getElementById('khadkiTrainStatus');
  if (kEl) kEl.innerHTML = _trainStatusRows(trainMap, 'khadki');

  const dSigEl = document.getElementById('dapodiSignalStatus');
  if (dSigEl) dSigEl.innerHTML = buildSignalStatusHTML(
    [{id:'H1',type:'home'},{id:'H2',type:'home'},{id:'S1',type:'starter'},
     {id:'S2',type:'starter'},{id:'H3',type:'home'},{id:'H4',type:'home'}], dSig);

  const kSigEl = document.getElementById('khadkiSignalStatus');
  if (kSigEl) kSigEl.innerHTML = buildSignalStatusHTML(
    [{id:'H1',type:'home'},{id:'H7',type:'home'},{id:'H6',type:'home'},
     {id:'S1',type:'starter'},{id:'S2',type:'starter'},{id:'S3',type:'starter'},
     {id:'H2',type:'home'},{id:'H5',type:'home'},{id:'H3',type:'home'},{id:'H4',type:'home'}], kSig);

  _updatePlatformBars(trainMap);
}

function _trainStatusRows(trainMap, station) {
  const ORDER  = ['17613','14806','22225','22106'];
  const COLORS = {'17613':'#4488ff','14806':'#ff7744','22225':'#ffdd00','22106':'#44cc66'};
  return ORDER.map(num => {
    const t = trainMap[num]; if (!t) return '';
    const sub   = t[station] || {};
    const spd   = Math.abs(Math.round((sub.speed || 0) * 3.2));
    const phase = sub.phase || 'waiting';
    const delay = t.delayMin || 0;
    const stClass = phase==='halted' ? 'status-halted' : phase==='done' ? 'status-passed' : phase==='waiting' ? 'status-waiting' : 'status-running';
    const stLabel = phase==='halted' ? 'HALTED' : phase==='done' ? 'PASSED' : phase==='waiting' ? 'AWAITING' : 'RUNNING';
    const delBadge = delay>0 ? `<span class="badge-delay">+${delay}m</span>` : `<span class="badge-ontime">On Time</span>`;
    return `<div class="train-row">
      <div class="train-color-box" style="background:${t.color||COLORS[num]};"></div>
      <span class="train-num">${num}</span>
      <span class="train-speed">${spd>0?spd+' km/h':'—'}</span>
      ${delBadge}
      <span class="train-status ${stClass}">${stLabel}</span>
    </div>`;
  }).join('');
}

function _updatePlatformBars(trainMap) {
  const el = document.getElementById('platformOccupation');
  if (!el) return;
  const t1 = trainMap['17613'], t2 = trainMap['14806'], t3 = trainMap['22225'], t4 = trainMap['22106'];
  const pfLen = 900 - 280; // 620px

  const pf1Pct  = (t1 && t1.khadki && t1.khadki.stopped) ? Math.min(100, Math.round((t1.length / pfLen) * 100)) : 0;
  const pf2Busy = (t2 && t2.khadki && t2.khadki.active && !t2.khadki.done) ||
                  (t3 && t3.khadki && t3.khadki.active && !t3.khadki.done);
  const pf3Busy = t4 && t4.khadki && t4.khadki.active && !t4.khadki.done;

  el.innerHTML = `
    <div class="pf-bar-wrap">
      <div class="pf-bar-label">
        <span class="pf-bar-name">PF-1</span>
        <span class="pf-bar-value" style="color:${pf1Pct>0?'#ff8800':'#44cc66'};">${pf1Pct}% ${pf1Pct>0?'OCCUPIED':'FREE'}</span>
      </div>
      <div class="pf-bar-bg"><div class="pf-bar-fill" style="width:${pf1Pct}%;background:${pf1Pct>80?'#ff5500':'#44cc66'};"></div></div>
      ${pf1Pct>0?'<div class="pf-note">⚠ 17613 Halted – Awaiting overtakes on PF-2</div>':''}
    </div>
    <div class="pf-bar-wrap">
      <div class="pf-bar-label">
        <span class="pf-bar-name">PF-2</span>
        <span class="pf-bar-value" style="color:${pf2Busy?'#ffaa00':'#44cc66'};">${pf2Busy?'IN USE – OVERTAKE':'FREE'}</span>
      </div>
      <div class="pf-bar-bg"><div class="pf-bar-fill" style="width:${pf2Busy?55:0}%;background:#ff8800;"></div></div>
      ${pf2Busy?'<div class="pf-note">⟳ Overtaking train passing through</div>':''}
    </div>
    <div class="pf-bar-wrap">
      <div class="pf-bar-label">
        <span class="pf-bar-name">PF-3</span>
        <span class="pf-bar-value" style="color:${pf3Busy?'#ffaa00':'#44cc66'};">${pf3Busy?'IN USE':'FREE'}</span>
      </div>
      <div class="pf-bar-bg"><div class="pf-bar-fill" style="width:${pf3Busy?30:0}%;background:#44cc66;"></div></div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const OFFLINE = (() => {
  const COACH_PX   = 14;
  const DW = 1160, KW = 1160;

  // PF1 stop positions (17613 halts here)
  const K_PF1_X1 = 280, K_PF1_X2 = 900;
  // PF2 positions – overtakers enter junction at J_L=255, exit at J_R=945
  const K_PF2_ENTER = 255, K_PF2_EXIT = 945;

  const SPD_NORMAL = 90, SPD_SLOW = 50;

  // Timeline: simTime (seconds) when each train enters each canvas
  // 22106 Indrayani (UP right→left): crosses Khadki first, appears at Dapodi after clearing Khadki
  // 1160px ÷ 90px/s ≈ 13s travel + 4s gap → dapodi_enter = 2 + 13 + 4 = 19
  // 14806 enters Khadki at t=30, 22225 enters Khadki at t=42 (12s gap)
  const TL = {
    '22106': { d: 19, k: 2  },
    '17613': { d: 5,  k: 21 },
    '14806': { d: 14, k: 30 },
    '22225': { d: 22, k: 42 },
  };

  const DEFS = [
    { number:'17613', name:'Panvel–Nanded Express',       shortName:'PNV-NED',   coaches:17, color:'#4488ff', direction:'DN', delayMin:20 },
    { number:'14806', name:'Barmer–Yesvantpur AC Exp',    shortName:'BMR-YPR',   coaches:18, color:'#ff7744', direction:'DN', delayMin:0  },
    { number:'22225', name:'CSMT–Solapur Vande Bharat',   shortName:'VB EXP',    coaches:20, color:'#ffdd00', direction:'DN', delayMin:15 },
    { number:'22106', name:'Pune–CSMT Indrayani Express', shortName:'INDRAYANI', coaches:16, color:'#44cc66', direction:'UP', delayMin:5  },
  ];

  let simTime = 0, speed = 1.0;
  let trains = {}, dSig = {}, kSig = {};
  let sigQ = [], triggered = new Set();
  let departTime17613 = null; // timestamp when 17613 should depart after release

  function _makeTrain(def) {
    return {
      ...def,
      length: def.coaches * COACH_PX,
      dapodi: { x: -(def.coaches * COACH_PX + 20), speed: 0, phase: 'waiting', active: false, done: false },
      khadki: { x: -(def.coaches * COACH_PX + 20), speed: 0, phase: 'waiting', active: false, done: false, stopped: false },
    };
  }

  function init() {
    trains = {};
    DEFS.forEach(d => { trains[d.number] = _makeTrain({ ...d }); });
    // Dapodi: all green at start
    dSig = { H1:'green', H2:'green', S1:'green', S2:'green', H3:'green', H4:'green' };
    // Khadki: H1 preset RED (17613 must stop), S1 RED (starter held), others green
    kSig = { H1:'red', H2:'red', H3:'green', H4:'green', H5:'green', H6:'green', H7:'green', S1:'red', S2:'green', S3:'green' };
    sigQ = []; triggered = new Set(); simTime = 0; departTime17613 = null;
  }

  function syncTime(t) { simTime = t; }

  function _sched(st, id, val, delay) { sigQ.push({ st, id, val, at: simTime + delay }); }

  function _procQ() {
    sigQ = sigQ.filter(i => {
      if (simTime >= i.at) {
        if (i.st === 'd') dSig[i.id] = i.val;
        else              kSig[i.id] = i.val;
        return false;
      }
      return true;
    });
  }

  // Trigger Dapodi signal: RED → yellow(6s) → green(12s)
  function _trigD(id, key) {
    const k = `d_${id}_${key}`; if (triggered.has(k)) return; triggered.add(k);
    dSig[id] = 'red'; _sched('d', id, 'yellow', 6); _sched('d', id, 'green', 12);
  }

  // Trigger Khadki signal: RED → (optionally) yellow(6s) → green(12s)
  function _trigK(id, key, stay = false) {
    const k = `k_${id}_${key}`; if (triggered.has(k)) return; triggered.add(k);
    kSig[id] = 'red';
    if (!stay) { _sched('k', id, 'yellow', 6); _sched('k', id, 'green', 12); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  function tick(dt) {
    const d = dt * speed;
    simTime += d;
    _procQ();

    _tick22106(d);
    _tick17613(d);
    _tick14806(d);
    _tick22225(d);
  }

  // ── 22106 Indrayani – UP direction, right→left on PF3 ──────────────────
  function _tick22106(d) {
    const u = trains['22106'];

    // Dapodi (UP train enters from right)
    if (!u.dapodi.active && simTime >= TL['22106'].d) {
      u.dapodi.active = true; u.dapodi.x = DW + 20; u.dapodi.speed = -SPD_NORMAL; u.dapodi.phase = 'entering';
    }
    if (u.dapodi.active && !u.dapodi.done) {
      u.dapodi.x += u.dapodi.speed * d;
      const f = u.dapodi.x; // right edge = front
      if (f < 970) _trigD('H4', '22106');
      if (f < 800) _trigD('S2', '22106');
      if (f < 210) _trigD('H2', '22106');
      if (u.dapodi.x + u.length < 0) { u.dapodi.done = true; u.dapodi.phase = 'done'; }
    }

    // Khadki PF3 (enters from right, passes left)
    if (!u.khadki.active && simTime >= TL['22106'].k) {
      u.khadki.active = true; u.khadki.x = KW + 20; u.khadki.speed = -SPD_NORMAL; u.khadki.phase = 'entering';
    }
    if (u.khadki.active && !u.khadki.done) {
      u.khadki.x += u.khadki.speed * d;
      const f = u.khadki.x; // right edge = front for UP train
      // H3 = Pune-side PF3 departure signal (train coming from Pune triggers it)
      if (f < 1000) _trigK('H3', '22106');
      // S3 = PF2 Pune-end starter (shared area) – triggers as UP train passes
      if (f < 870)  _trigK('S3', '22106');
      // H6 = Mumbai-side PF3 approach signal
      if (f < 200)  _trigK('H6', '22106');
      if (u.khadki.x + u.length < 0) { u.khadki.done = true; u.khadki.phase = 'done'; }
    }
  }

  // ── 17613 Panvel-Nanded – DN, left→right, HALTS at PF1 ────────────────
  function _tick17613(d) {
    const a = trains['17613'];

    // Dapodi PF1
    if (!a.dapodi.active && simTime >= TL['17613'].d) {
      a.dapodi.active = true; a.dapodi.x = -(a.length + 20); a.dapodi.speed = SPD_NORMAL; a.dapodi.phase = 'entering';
    }
    if (a.dapodi.active && !a.dapodi.done) {
      a.dapodi.x += a.dapodi.speed * d;
      const f = a.dapodi.x + a.length;
      if (f > 200) _trigD('H1', '17613');
      if (f > 340) _trigD('S1', '17613');
      if (f > 960) _trigD('H3', '17613');
      if (a.dapodi.x > DW + 20) { a.dapodi.done = true; a.dapodi.phase = 'done'; }
    }

    // Khadki PF1 – approaches, decelerates, halts
    if (!a.khadki.active && simTime >= TL['17613'].k) {
      a.khadki.active = true; a.khadki.x = -(a.length + 20);
      a.khadki.speed = SPD_NORMAL; a.khadki.phase = 'approaching'; a.khadki.stopped = false;
    }
    if (a.khadki.active && !a.khadki.done) {
      if (!a.khadki.stopped) {
        const f = a.khadki.x + a.length;

        // H1 is already RED before train arrives – trigger once for signalling records
        if (f > 150) _trigK('H1', '17613_approach', true); // stays RED

        // Decelerate as it approaches platform
        if (f > K_PF1_X1 - 120 && a.khadki.phase === 'approaching') {
          a.khadki.speed = SPD_SLOW; a.khadki.phase = 'decelerating';
        }
        // Halt – phase guard prevents re-halting after departure starts
        if (f >= K_PF1_X2 - 8 && (a.khadki.phase === 'approaching' || a.khadki.phase === 'decelerating')) {
          a.khadki.stopped = true; a.khadki.speed = 0; a.khadki.phase = 'halted';
          // H1 and S1 stay RED while halted
          _trigK('H1', '17613_halt',   true);
          _trigK('S1', '17613_s1halt', true);
        } else if (a.khadki.phase !== 'halted') {
          a.khadki.x += a.khadki.speed * d;
        }
      } else {
        // Waiting – release only when BOTH overtakers have fully exited canvas
        const b14done = trains['14806'].khadki.done;
        const b22done = trains['22225'].khadki.done;

        if (b14done && b22done) {
          const rk = 'k_17613_release';
          if (!triggered.has(rk)) {
            triggered.add(rk);
            // H2 (Pune-side departure signal) was RED — that's why 17613 halted.
            // Step 1: S1 → GREEN (platform starter clears)
            kSig['S1'] = 'green';
            // Step 2: H2 RED → YELLOW (3s) → GREEN (6s)
            _sched('k', 'H2', 'yellow', 3);
            _sched('k', 'H2', 'green',  6);
            // Step 3: depart as H2 turns green
            departTime17613 = simTime + 6.2;
          }
          // Depart when H2 is green
          if (departTime17613 !== null && simTime >= departTime17613) {
            departTime17613 = null;
            a.khadki.stopped = false;
            a.khadki.speed   = SPD_NORMAL;
            a.khadki.phase   = 'departing';
          }
        }
        // Once departing, H2 → RED as front of 17613 passes x≈960 (Pune-side signal post)
        if (a.khadki.phase === 'departing') {
          const front = a.khadki.x + a.length;
          if (front > 960) _trigK('H2', '17613_depart_pass');
        }
        if (!a.khadki.stopped) a.khadki.x += a.khadki.speed * d;
      }
      if (a.khadki.x > KW + 20) { a.khadki.done = true; a.khadki.phase = 'done'; }
    }
  }

  // ── 14806 Barmer-Yesvantpur – DN, left→right, PF2 OVERTAKE ───────────
  function _tick14806(d) {
    const b = trains['14806'];

    // Dapodi PF1 (passes through)
    if (!b.dapodi.active && simTime >= TL['14806'].d) {
      b.dapodi.active = true; b.dapodi.x = -(b.length + 20); b.dapodi.speed = SPD_NORMAL; b.dapodi.phase = 'entering';
    }
    if (b.dapodi.active && !b.dapodi.done) {
      b.dapodi.x += b.dapodi.speed * d;
      const f = b.dapodi.x + b.length;
      if (f > 200) _trigD('H1', '14806');
      if (f > 340) _trigD('S1', '14806');
      if (f > 960) _trigD('H3', '14806');
      if (b.dapodi.x > DW + 20) { b.dapodi.done = true; b.dapodi.phase = 'done'; }
    }

    // Khadki PF2 – diverts into PF2 via H7, overtakes 17613, exits via H5
    if (!b.khadki.active && simTime >= TL['14806'].k) {
      b.khadki.active = true; b.khadki.x = -(b.length + 20); b.khadki.speed = SPD_NORMAL; b.khadki.phase = 'entering';
    }
    if (b.khadki.active && !b.khadki.done) {
      b.khadki.x += b.khadki.speed * d;
      const f = b.khadki.x + b.length;
      // H7 = Mumbai-side PF2 approach signal → turns RED as 14806 enters
      if (f > 210) _trigK('H7', '14806_enter');
      // S2 = PF2 Mumbai-end starter
      if (f > 305) _trigK('S2', '14806');
      // S3 = PF2 Pune-end starter
      if (f > 855) _trigK('S3', '14806_exit');
      // H5 = PF2 Pune-side departure signal
      if (f > 940) _trigK('H5', '14806');
      if (b.khadki.x > KW + 20) {
        b.khadki.done = true; b.khadki.phase = 'done';
        if (!triggered.has('ot1')) {
          triggered.add('ot1');
          trains['17613'].delayMin += 5;
        }
      }
    }
  }

  // ── 22225 Vande Bharat – DN, left→right, PF2 OVERTAKE (after 14806) ──
  function _tick22225(d) {
    const c = trains['22225'];

    // Dapodi PF1 (passes through)
    if (!c.dapodi.active && simTime >= TL['22225'].d) {
      c.dapodi.active = true; c.dapodi.x = -(c.length + 20); c.dapodi.speed = SPD_NORMAL; c.dapodi.phase = 'entering';
    }
    if (c.dapodi.active && !c.dapodi.done) {
      c.dapodi.x += c.dapodi.speed * d;
      const f = c.dapodi.x + c.length;
      if (f > 200) _trigD('H1', '22225');
      if (f > 340) _trigD('S1', '22225');
      if (f > 960) _trigD('H3', '22225');
      if (c.dapodi.x > DW + 20) { c.dapodi.done = true; c.dapodi.phase = 'done'; }
    }

    // Khadki PF2 – enters 12s after 14806, same PF2 route
    if (!c.khadki.active && simTime >= TL['22225'].k) {
      c.khadki.active = true; c.khadki.x = -(c.length + 20); c.khadki.speed = SPD_NORMAL; c.khadki.phase = 'entering';
    }
    if (c.khadki.active && !c.khadki.done) {
      c.khadki.x += c.khadki.speed * d;
      const f = c.khadki.x + c.length;
      if (f > 210) _trigK('H7', '22225_enter');
      if (f > 305) _trigK('S2', '22225');
      if (f > 855) _trigK('S3', '22225_exit');
      if (f > 940) _trigK('H5', '22225');
      if (c.khadki.x > KW + 20) {
        c.khadki.done = true; c.khadki.phase = 'done';
        if (!triggered.has('ot2')) {
          triggered.add('ot2');
          trains['17613'].delayMin += 5;
        }
      }
    }
  }

  function getState() {
    return { simTime, speed, trains, dapodiSignals: dSig, khadkiSignals: kSig, timestamp: Date.now() };
  }

  return { init, tick, getState, syncTime, setSpeed: s => { speed = s; }, reset: init };
})();
