/**
 * Simulation State Machine – Backend (Node.js)
 * Authoritative simulation running server-side at 20 FPS.
 *
 * Khadki track assignment:
 *   PF1 (Y=90)  → 17613 Panvel-Nanded  – HALTS here (H1 stays RED)
 *   PF2 (Y=195) → 14806 Barmer-YPR     – overtakes via PF2 (H7→S2→S3→H5)
 *   PF2 (Y=195) → 22225 Vande Bharat   – overtakes via PF2, 12s after 14806
 *   PF3 (Y=280) → 22106 Indrayani      – UP direction right→left
 *
 * After BOTH 14806 and 22225 have fully exited: H1→yellow→green, then 17613 departs.
 */

const { TRAIN_DEFINITIONS, TIMELINE, SPEEDS, COACH_PX } = require('./trains');
const { getDefaultDapodiStates, getDefaultKhadkiStates } = require('./signals');

// Canvas widths – must match frontend constants
const DAPODI_W = 1160;
const KHADKI_W = 1160;

// PF1 halt boundaries
const K_PF1_X1 = 280, K_PF1_X2 = 900;

// PF2 signal trigger positions
const K_H7_X  = 210;  // Mumbai-side PF2 approach signal
const K_S2_X  = 305;  // PF2 Mumbai-end starter
const K_S3_X  = 855;  // PF2 Pune-end starter
const K_H5_X  = 940;  // PF2 Pune-side departure signal

class SimulationEngine {
  constructor() {
    this._interval = null;
    this.speed = 1.0;
    this.reset();
  }

  reset() {
    this.simTime   = 0;
    this.lastTick  = Date.now();

    this.dapodiSignals = getDefaultDapodiStates();
    this.khadkiSignals = getDefaultKhadkiStates(); // H1 pre-set RED

    this.signalQueue   = [];
    this.triggeredKeys = new Set();
    this._departTime17613  = null;
    this._departTime14806  = null;
    this._activeScenarioId = 'A'; // default Scenario A

    this.trains = {};
    Object.values(TRAIN_DEFINITIONS).forEach(def => {
      this.trains[def.number] = this._makeTrain(def);
    });
  }

  _makeTrain(def) {
    const len = def.coaches * COACH_PX;
    return {
      number:    def.number,
      name:      def.name,
      shortName: def.shortName,
      type:      def.type,
      priority:  def.priority,
      coaches:   def.coaches,
      length:    len,
      color:     def.color,
      direction: def.direction,
      delayMin:  def.khadki.actualDelay,

      d_active: false, d_done: false, d_x: -(len + 20), d_speed: 0, d_phase: 'waiting',
      k_active: false, k_done: false, k_x: -(len + 20), k_speed: 0, k_phase: 'waiting',
      k_stopped: false,
    };
  }

  // ── Signal helpers ──────────────────────────────────────────────────────
  _schedSig(station, id, toState, delay) {
    this.signalQueue.push({ station, id, toState, atTime: this.simTime + delay });
  }

  _procQueue() {
    this.signalQueue = this.signalQueue.filter(item => {
      if (this.simTime >= item.atTime) {
        if (item.station === 'dapodi') this.dapodiSignals[item.id] = item.toState;
        else                           this.khadkiSignals[item.id]  = item.toState;
        return false;
      }
      return true;
    });
  }

  // Dapodi signal: RED → yellow(6s) → green(12s)
  _trigD(sigId, trainKey) {
    const key = `d_${sigId}_${trainKey}`;
    if (this.triggeredKeys.has(key)) return;
    this.triggeredKeys.add(key);
    this.dapodiSignals[sigId] = 'red';
    this._schedSig('dapodi', sigId, 'yellow', 6);
    this._schedSig('dapodi', sigId, 'green',  12);
  }

  // Khadki signal: RED → (optionally) yellow(6s) → green(12s)
  _trigK(sigId, trainKey, stayRed = false) {
    const key = `k_${sigId}_${trainKey}`;
    if (this.triggeredKeys.has(key)) return;
    this.triggeredKeys.add(key);
    this.khadkiSignals[sigId] = 'red';
    if (!stayRed) {
      this._schedSig('khadki', sigId, 'yellow', 6);
      this._schedSig('khadki', sigId, 'green',  12);
    }
  }

  // ── Main tick ───────────────────────────────────────────────────────────
  tick() {
    const now    = Date.now();
    const realDt = Math.min((now - this.lastTick) / 1000, 0.1);
    this.lastTick = now;
    const dt = realDt * this.speed;
    this.simTime += dt;

    this._procQueue();
    this._tick22106(dt);
    this._tick17613(dt);
    this._tick14806(dt);
    this._tick22225(dt);
  }

  // ── 22106 Indrayani – UP direction (right→left) ─────────────────────────
  _tick22106(dt) {
    const tr = this.trains['22106'];
    const tl = TIMELINE['22106'];

    // Dapodi – enters from right on UP line
    if (!tr.d_active && this.simTime >= tl.dapodi_enter) {
      tr.d_active = true; tr.d_x = DAPODI_W + 20; tr.d_speed = -SPEEDS.NORMAL; tr.d_phase = 'entering';
    }
    if (tr.d_active && !tr.d_done) {
      tr.d_x += tr.d_speed * dt;
      const f = tr.d_x; // right edge = front for UP train
      if (f < 970) this._trigD('H4', '22106');
      if (f < 800) this._trigD('S2', '22106');
      if (f < 210) this._trigD('H2', '22106');
      if (tr.d_x + tr.length < 0) { tr.d_done = true; tr.d_phase = 'done'; }
    }

    // Khadki – PF3, enters from right
    if (!tr.k_active && this.simTime >= tl.khadki_enter) {
      tr.k_active = true; tr.k_x = KHADKI_W + 20; tr.k_speed = -SPEEDS.NORMAL; tr.k_phase = 'entering';
    }
    if (tr.k_active && !tr.k_done) {
      tr.k_x += tr.k_speed * dt;
      const f = tr.k_x;
      if (f < 1000) this._trigK('H3',  '22106');
      if (f < 870)  this._trigK('S3',  '22106_pf3'); // S3 shared – separate key
      if (f < 200)  this._trigK('H6',  '22106');
      if (tr.k_x + tr.length < 0) { tr.k_done = true; tr.k_phase = 'done'; }
    }
  }

  // ── 17613 Panvel-Nanded – DN (left→right), HALTS PF1 ───────────────────
  // ── 17613 Panvel-Nanded – DN (left→right), HALTS PF1 (Scenario A/C) or non-stop (Scenario B) ──
  _tick17613(dt) {
    const tr     = this.trains['17613'];
    const tl     = TIMELINE['17613'];
    const scId   = this._activeScenarioId || 'A';
    const doHalt = (scId !== 'B');

    // Dapodi PF1
    if (!tr.d_active && this.simTime >= tl.dapodi_enter) {
      tr.d_active = true; tr.d_x = -(tr.length + 20); tr.d_speed = SPEEDS.NORMAL; tr.d_phase = 'entering';
    }
    if (tr.d_active && !tr.d_done) {
      tr.d_x += tr.d_speed * dt;
      const f = tr.d_x + tr.length;
      if (f > 200) this._trigD('H1', '17613');
      if (f > 340) this._trigD('S1', '17613');
      if (f > 960) this._trigD('H3', '17613');
      if (tr.d_x > DAPODI_W + 20) { tr.d_done = true; tr.d_phase = 'done'; }
    }

    // Khadki PF1
    if (!tr.k_active && this.simTime >= tl.khadki_enter) {
      tr.k_active = true; tr.k_x = -(tr.length + 20);
      tr.k_speed = SPEEDS.NORMAL;
      tr.k_phase = doHalt ? 'approaching' : 'entering';
      tr.k_stopped = false;
    }
    if (tr.k_active && !tr.k_done) {
      if (!doHalt) {
        // Scenario B – non-stop through PF1, trigger signals normally
        tr.k_x += tr.k_speed * dt;
        const f = tr.k_x + tr.length;
        if (f > 155) this._trigK('H1', '17613_b_enter');
        if (f > 960) this._trigK('H2', '17613_b_dep');
      } else if (!tr.k_stopped) {
        const f = tr.k_x + tr.length;
        if (f > 150) this._trigK('H1', '17613_approach', true);
        if (f > K_PF1_X1 - 120 && tr.k_phase === 'approaching') {
          tr.k_speed = SPEEDS.SLOW; tr.k_phase = 'decelerating';
        }
        if (f >= K_PF1_X2 - 8 && (tr.k_phase === 'approaching' || tr.k_phase === 'decelerating')) {
          tr.k_stopped = true; tr.k_speed = 0; tr.k_phase = 'halted';
          this._trigK('H1', '17613_halt',   true);
          this._trigK('S1', '17613_s1halt', true);
        } else if (tr.k_phase !== 'halted') {
          tr.k_x += tr.k_speed * dt;
        }
      } else {
        // Halted – waiting for release
        const b14done = this.trains['14806'].k_done;
        const b22done = this.trains['22225'].k_done;
        if (b14done && b22done) {
          const rk = 'k_17613_release';
          if (!this.triggeredKeys.has(rk)) {
            this.triggeredKeys.add(rk);
            this.khadkiSignals['S1'] = 'green';
            this._schedSig('khadki', 'H2', 'yellow', 3);
            this._schedSig('khadki', 'H2', 'green',  6);
            this._departTime17613 = this.simTime + 6.2;
          }
        }
        if (this._departTime17613 && this.simTime >= this._departTime17613) {
          this._departTime17613 = null;
          tr.k_stopped = false; tr.k_speed = SPEEDS.NORMAL; tr.k_phase = 'departing';
        }
        if (tr.k_phase === 'departing') {
          const front = tr.k_x + tr.length;
          if (front > 960) this._trigK('H2', '17613_depart_pass');
        }
        if (!tr.k_stopped) tr.k_x += tr.k_speed * dt;
      }
      if (tr.k_x > KHADKI_W + 20) { tr.k_done = true; tr.k_phase = 'done'; }
    }
  }

  // ── 14806 Barmer-Yesvantpur – DN (left→right), PF2 OVERTAKE ────────────
  _tick14806(dt) {
    const tr   = this.trains['14806'];
    const tl   = TIMELINE['14806'];
    const scId = this._activeScenarioId || 'A';

    // Dapodi – always passes through
    if (!tr.d_active && this.simTime >= tl.dapodi_enter) {
      tr.d_active = true; tr.d_x = -(tr.length + 20); tr.d_speed = SPEEDS.NORMAL; tr.d_phase = 'entering';
    }
    if (tr.d_active && !tr.d_done) {
      tr.d_x += tr.d_speed * dt;
      const f = tr.d_x + tr.length;
      if (f > 200) this._trigD('H1', '14806');
      if (f > 340) this._trigD('S1', '14806');
      if (f > 960) this._trigD('H3', '14806');
      if (tr.d_x > DAPODI_W + 20) { tr.d_done = true; tr.d_phase = 'done'; }
    }

    // Khadki
    if (!tr.k_active && this.simTime >= tl.khadki_enter) {
      tr.k_active = true; tr.k_x = -(tr.length + 20); tr.k_speed = SPEEDS.NORMAL;
      tr.k_phase = (scId === 'C') ? 'approaching' : 'entering';
      tr.k_stopped = false;
    }
    if (tr.k_active && !tr.k_done) {
      if (scId === 'B') {
        // Non-stop on PF1 main line
        tr.k_x += tr.k_speed * dt;
        const f = tr.k_x + tr.length;
        if (f > 155) this._trigK('H1', '14806_b_pf1');
        if (f > 960) this._trigK('H2', '14806_b_dep');
        if (tr.k_x > KHADKI_W + 20) { tr.k_done = true; tr.k_phase = 'done'; }
        return;
      }
      if (scId === 'A' && !tr.k_stopped) {
        // PF2 non-stop overtake
        tr.k_x += tr.k_speed * dt;
        const f = tr.k_x + tr.length;
        if (f > K_H7_X) this._trigK('H7', '14806_enter');
        if (f > K_S2_X) this._trigK('S2', '14806');
        if (f > K_S3_X) this._trigK('S3', '14806_exit');
        if (f > K_H5_X) this._trigK('H5', '14806');
        if (tr.k_x > KHADKI_W + 20) {
          tr.k_done = true; tr.k_phase = 'done';
          if (!this.triggeredKeys.has('ot1')) { this.triggeredKeys.add('ot1'); this.trains['17613'].delayMin += 5; }
        }
        return;
      }
      // Scenario C: halt at PF2 until VB passes
      if (!tr.k_stopped) {
        tr.k_x += tr.k_speed * dt;
        const f = tr.k_x + tr.length;
        if (f > K_H7_X) this._trigK('H7', '14806_enter');
        if (f > K_S2_X) this._trigK('S2', '14806');
        if (f >= 880 && tr.k_phase === 'approaching') {
          tr.k_stopped = true; tr.k_speed = 0; tr.k_phase = 'halted';
          this._trigK('H5', '14806_halt', true);
          this._trigK('S3', '14806_s3halt', true);
        }
      } else {
        if (this.trains['22225'].k_done) {
          const rk = 'k_14806_rel';
          if (!this.triggeredKeys.has(rk)) {
            this.triggeredKeys.add(rk);
            this.khadkiSignals['S3'] = 'green';
            this._schedSig('khadki', 'H5', 'yellow', 3);
            this._schedSig('khadki', 'H5', 'green', 6);
            this._departTime14806 = this.simTime + 6.2;
          }
          if (this._departTime14806 && this.simTime >= this._departTime14806) {
            this._departTime14806 = null;
            tr.k_stopped = false; tr.k_speed = SPEEDS.NORMAL; tr.k_phase = 'departing';
            this.trains['17613'].delayMin += 5;
          }
        }
        if (!tr.k_stopped) tr.k_x += tr.k_speed * dt;
      }
      if (tr.k_x > KHADKI_W + 20) { tr.k_done = true; tr.k_phase = 'done'; }
    }
  }

  // ── 22225 Vande Bharat – DN (left→right), PF2 OVERTAKE (12s after 14806)
  _tick22225(dt) {
    const tr   = this.trains['22225'];
    const tl   = TIMELINE['22225'];
    const scId = this._activeScenarioId || 'A';

    // Dapodi – always passes through
    if (!tr.d_active && this.simTime >= tl.dapodi_enter) {
      tr.d_active = true; tr.d_x = -(tr.length + 20); tr.d_speed = SPEEDS.NORMAL; tr.d_phase = 'entering';
    }
    if (tr.d_active && !tr.d_done) {
      tr.d_x += tr.d_speed * dt;
      const f = tr.d_x + tr.length;
      if (f > 200) this._trigD('H1', '22225');
      if (f > 340) this._trigD('S1', '22225');
      if (f > 960) this._trigD('H3', '22225');
      if (tr.d_x > DAPODI_W + 20) { tr.d_done = true; tr.d_phase = 'done'; }
    }

    // Khadki
    if (!tr.k_active && this.simTime >= tl.khadki_enter) {
      tr.k_active = true; tr.k_x = -(tr.length + 20); tr.k_speed = SPEEDS.NORMAL; tr.k_phase = 'entering';
    }
    if (tr.k_active && !tr.k_done) {
      if (scId === 'B') {
        // Non-stop on PF1 main line
        tr.k_x += tr.k_speed * dt;
        const f = tr.k_x + tr.length;
        if (f > 155) this._trigK('H1', '22225_b_pf1');
        if (f > 960) this._trigK('H2', '22225_b_dep');
        if (tr.k_x > KHADKI_W + 20) { tr.k_done = true; tr.k_phase = 'done'; }
        return;
      }
      if (scId === 'A') {
        // PF2 overtake (12s after 14806)
        tr.k_x += tr.k_speed * dt;
        const f = tr.k_x + tr.length;
        if (f > K_H7_X) this._trigK('H7', '22225_enter');
        if (f > K_S2_X) this._trigK('S2', '22225');
        if (f > K_S3_X) this._trigK('S3', '22225_exit');
        if (f > K_H5_X) this._trigK('H5', '22225');
        if (tr.k_x > KHADKI_W + 20) {
          tr.k_done = true; tr.k_phase = 'done';
          if (!this.triggeredKeys.has('ot2')) { this.triggeredKeys.add('ot2'); this.trains['17613'].delayMin += 5; }
        }
        return;
      }
      // Scenario C: PF3 non-stop overtake (passes both halted trains)
      tr.k_x += tr.k_speed * dt;
      const f = tr.k_x + tr.length;
      if (f > 155) this._trigK('H6', '22225_c_pf3');
      if (f > 855) this._trigK('S3', '22225_c_s3');
      if (f > 960) this._trigK('H3', '22225_c_dep');
      if (tr.k_x > KHADKI_W + 20) {
        tr.k_done = true; tr.k_phase = 'done';
        if (!this.triggeredKeys.has('ot_vb_17613')) { this.triggeredKeys.add('ot_vb_17613'); this.trains['17613'].delayMin += 5; }
        if (!this.triggeredKeys.has('ot_vb_14806')) { this.triggeredKeys.add('ot_vb_14806'); this.trains['14806'].delayMin += 5; }
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────
  getState() {
    return {
      simTime:       this.simTime,
      speed:         this.speed,
      trains:        this.trains,
      dapodiSignals: this.dapodiSignals,
      khadkiSignals: this.khadkiSignals,
      timestamp:     Date.now(),
    };
  }

  setSpeed(s) { this.speed = parseFloat(s) || 1.0; }

  applyScenario(sc) {
    const { SCENARIOS } = require('./scenarios');
    const chosen = typeof sc === 'string' ? SCENARIOS[sc.toUpperCase()] : sc;
    if (!chosen) return;
    this._activeScenario   = chosen;
    this._activeScenarioId = chosen.id;
    this.stop();
    this.reset();
    this._activeScenarioId = chosen.id; // reset() clears it, restore
    // Override timeline
    if (chosen.timeline) {
      const { TIMELINE } = require('./trains');
      Object.keys(chosen.timeline).forEach(n => {
        TIMELINE[n].dapodi_enter = chosen.timeline[n].d;
        TIMELINE[n].khadki_enter = chosen.timeline[n].k;
      });
    }
    // Override signal defaults
    if (chosen.kSigInit) Object.assign(this.khadkiSignals, chosen.kSigInit);
    if (chosen.dSigInit) Object.assign(this.dapodiSignals, chosen.dSigInit);
    // Override train delays
    if (chosen.trains) {
      Object.keys(chosen.trains).forEach(num => {
        if (this.trains[num] && chosen.trains[num].delayMin !== undefined) {
          this.trains[num].delayMin = chosen.trains[num].delayMin;
        }
      });
    }
    this.start(50);
    console.log('[Engine] Scenario', chosen.id, 'applied');
  }

  start(intervalMs = 50) {
    if (this._interval) return;
    this._interval = setInterval(() => this.tick(), intervalMs);
    console.log('[Simulation] Started – tick every', intervalMs, 'ms');
  }

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  restart() { this.stop(); this.reset(); this.start(); }
}

const engine = new SimulationEngine();
module.exports = engine;
