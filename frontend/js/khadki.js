/**
 * khadki.js – Canvas drawing for Khadki Station
 *
 * Track layout (canvas 1160×420):
 *   PF1 (main through-line, top):   Y = 90   ← 17613 halts here
 *   PF2 (loop/overtake line, mid):  Y = 195  ← 14806 overtakes / halts on this
 *   PF3 (UP direction):             Y = 280  ← 22106 Indrayani (Pune→Mumbai)
 *   PF4 (VB overtake, Scenario C):  Y = 365  ← 22225 VB passes below all in Sc-C
 *
 * Signal assignments:
 *   Approach (Mumbai side):  H1→PF1,  H7→PF2,  H6→PF3-area (below)
 *   Starters on platforms:   S1→PF1,  S2→PF2(Mumbai end),  S3→PF2(Pune end)
 *   Departure (Pune side):   H2→PF1,  H5→PF2,  H3/H4→PF3-area
 */

const K = {
  W: 1160, H: 420,        // canvas height extended to 420 to fit PF4
  // Track Y centres
  Y_PF1: 90,
  Y_PF2: 195,
  Y_PF3: 280,
  Y_PF4: 365,             // extra track for Scenario C VB overtake
  // Platform pixel boundaries (horizontal)
  PF1_X1: 280, PF1_X2: 900,
  PF2_X1: 300, PF2_X2: 880,
  PF3_X1: 310, PF3_X2: 870,
  PF4_X1: 310, PF4_X2: 870,
  PF_H: 26,
  // Junction X positions
  J_L: 255,
  J_R: 945,
  COACH_PX: 14,
};

// Signal definitions for Khadki canvas
const K_SIGNALS = [
  // ── Mumbai-side approach signals ──────────────────────────
  { id:'H1', x:150,  trackY:K.Y_PF1, type:'home',    side:'above' }, // PF1 DN approach
  { id:'H7', x:210,  trackY:K.Y_PF2, type:'home',    side:'above' }, // PF2 approach
  { id:'H6', x:180,  trackY:K.Y_PF3, type:'home',    side:'below' }, // PF3 area

  // ── Starter signals on platforms ──────────────────────────
  { id:'S1', x:590,  trackY:K.Y_PF1, type:'starter', side:'above' }, // PF1 starter (Pune-side)
  { id:'S2', x:305,  trackY:K.Y_PF2, type:'starter', side:'above' }, // PF2 starter (Mumbai-end)
  { id:'S3', x:855,  trackY:K.Y_PF2, type:'starter', side:'above' }, // PF2 starter (Pune-end)

  // ── Pune-side departure signals ───────────────────────────
  { id:'H2', x:960,  trackY:K.Y_PF1, type:'home',    side:'above' }, // PF1 Pune departure
  { id:'H5', x:940,  trackY:K.Y_PF2, type:'home',    side:'above' }, // PF2 Pune departure
  { id:'H3', x:990,  trackY:K.Y_PF3, type:'home',    side:'above' }, // PF3 area
  { id:'H4', x:945,  trackY:K.Y_PF3, type:'home',    side:'below' }, // PF3 lower
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DRAW FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
function drawKhadkiStation(ctx, trainData, signalStates) {
  const W = K.W, H = K.H;
  ctx.clearRect(0, 0, W, H);

  // Background + grid
  ctx.fillStyle = '#050a10';
  ctx.fillRect(0, 0, W, H);
  _kGrid(ctx);

  // Infrastructure
  _drawKhadkiTracks(ctx);
  _drawAllPlatforms(ctx);
  _kDirLabels(ctx);

  // Signals
  K_SIGNALS.forEach(sig => {
    const state  = (signalStates && signalStates[sig.id]) || 'green';
    const offset = sig.side === 'above' ? -44 : 44;
    const cy     = sig.trackY + offset;
    if (sig.type === 'home') drawHomeSignal(ctx, sig.x, cy, state, sig.id);
    else                      drawStarterSignal(ctx, sig.x, cy, state, sig.id);
  });

  // Trains
  if (trainData) _drawKhadkiTrains(ctx, trainData);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACK GEOMETRY
// ─────────────────────────────────────────────────────────────────────────────
function _drawKhadkiTracks(ctx) {
  ctx.save();

  // ── Junction diverter lines (left side) ─────────────────
  ctx.strokeStyle = '#4a6070';
  ctx.lineWidth = 1.5;
  // PF1 main line continues full width
  ctx.beginPath(); ctx.moveTo(0, K.Y_PF1); ctx.lineTo(K.J_L, K.Y_PF1); ctx.stroke();
  // PF2 diverges left of J_L from main
  ctx.beginPath(); ctx.moveTo(K.J_L - 80, K.Y_PF1); ctx.lineTo(K.J_L, K.Y_PF2); ctx.stroke();
  // PF3 diverges further left from main
  ctx.beginPath(); ctx.moveTo(K.J_L - 100, K.Y_PF1); ctx.lineTo(K.J_L, K.Y_PF3); ctx.stroke();
  // PF4 diverges even further left (Scenario C VB track)
  ctx.strokeStyle = '#3a5060';
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(K.J_L - 115, K.Y_PF1); ctx.lineTo(K.J_L, K.Y_PF4); ctx.stroke();
  ctx.setLineDash([]);

  // ── Junction diverter lines (right side) ────────────────
  ctx.strokeStyle = '#4a6070';
  ctx.beginPath(); ctx.moveTo(K.J_R, K.Y_PF1); ctx.lineTo(K.W, K.Y_PF1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(K.J_R, K.Y_PF2); ctx.lineTo(K.J_R + 80, K.Y_PF1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(K.J_R, K.Y_PF3); ctx.lineTo(K.J_R + 100, K.Y_PF1); ctx.stroke();
  ctx.strokeStyle = '#3a5060';
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(K.J_R, K.Y_PF4); ctx.lineTo(K.J_R + 115, K.Y_PF1); ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  // ── Sleepers ─────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#1e2e3e';
  ctx.lineWidth = 4;
  // PF1 full width
  for (let x = 10; x < K.W; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, K.Y_PF1 - 7); ctx.lineTo(x, K.Y_PF1 + 7); ctx.stroke();
  }
  // PF2 between junctions
  for (let x = K.J_L + 5; x < K.J_R; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, K.Y_PF2 - 7); ctx.lineTo(x, K.Y_PF2 + 7); ctx.stroke();
  }
  // PF3 between junctions
  for (let x = K.J_L + 5; x < K.J_R; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, K.Y_PF3 - 7); ctx.lineTo(x, K.Y_PF3 + 7); ctx.stroke();
  }
  // PF4 between junctions (dashed sleepers to indicate bypass line)
  ctx.strokeStyle = '#162030';
  for (let x = K.J_L + 5; x < K.J_R; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, K.Y_PF4 - 7); ctx.lineTo(x, K.Y_PF4 + 7); ctx.stroke();
  }
  ctx.restore();

  // ── Main rails ───────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#8a99aa';
  ctx.lineWidth = 3;
  // PF1 full width
  ctx.beginPath(); ctx.moveTo(0,     K.Y_PF1); ctx.lineTo(K.W,   K.Y_PF1); ctx.stroke();
  // PF2 between junctions
  ctx.beginPath(); ctx.moveTo(K.J_L, K.Y_PF2); ctx.lineTo(K.J_R, K.Y_PF2); ctx.stroke();
  // PF3 between junctions
  ctx.beginPath(); ctx.moveTo(K.J_L, K.Y_PF3); ctx.lineTo(K.J_R, K.Y_PF3); ctx.stroke();
  // PF4 between junctions (lighter – bypass/through line for VB in Sc-C)
  ctx.strokeStyle = '#5a6e7e';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(K.J_L, K.Y_PF4); ctx.lineTo(K.J_R, K.Y_PF4); ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORMS
// ─────────────────────────────────────────────────────────────────────────────
function _drawAllPlatforms(ctx) {
  // PF1 – above track (17613 halts here)
  _kPlatform(ctx,
    K.PF1_X1, K.Y_PF1 - K.PF_H - 8,
    K.PF1_X2 - K.PF1_X1, K.PF_H,
    'PLATFORM  1  (PF1)'
  );
  // PF2 – above track (overtake platform)
  _kPlatform(ctx,
    K.PF2_X1, K.Y_PF2 - K.PF_H - 6,
    K.PF2_X2 - K.PF2_X1, K.PF_H,
    'PLATFORM  2  (PF2)'
  );
  // PF3 – below track (Indrayani)
  _kPlatform(ctx,
    K.PF3_X1, K.Y_PF3 + 8,
    K.PF3_X2 - K.PF3_X1, K.PF_H,
    'PLATFORM  3  (PF3)'
  );
  // PF4 – below track (VB bypass line in Scenario C only – shown dimmed)
  _kPlatform(ctx,
    K.PF4_X1, K.Y_PF4 + 8,
    K.PF4_X2 - K.PF4_X1, K.PF_H,
    'BYPASS LINE  (SC-C VB)',
    true   // dim flag
  );
}

function _kPlatform(ctx, x, y, w, h, label, dim = false) {
  ctx.save();
  ctx.fillStyle   = dim ? '#101820' : '#192637';
  ctx.strokeStyle = dim ? '#243040' : '#3a5a6a';
  ctx.lineWidth = 1.5;
  if (dim) ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle   = dim ? '#344a5a' : '#5a6e7e';
  ctx.font = `bold 10px Courier New`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 4);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAIN DRAWING
// ─────────────────────────────────────────────────────────────────────────────
function _drawKhadkiTrains(ctx, trainData) {
  const all = Object.values(trainData);

  // ── 17613 Panvel-Nanded – PF1 (halts) ───────────────────
  const t1 = all.find(t => t.number === '17613');
  if (t1 && t1.khadki.active) {
    const x = _clampX(t1.khadki.x, t1.length);
    _kDrawTrain(ctx, x, K.Y_PF1, t1, false);

    if (t1.khadki.stopped) {
      _drawPF1OccupationBar(ctx, x, t1);
      const bx = Math.max(K.PF1_X1, Math.min(K.PF1_X2 - 136, x + t1.length / 2 - 68));
      _kDelayBadge(ctx, bx, K.Y_PF1 + 20, t1.delayMin);
    }

    // Speed label while moving
    if (!t1.khadki.stopped && t1.khadki.speed > 0) {
      _kSpeedLabel(ctx, x + t1.length / 2, K.Y_PF1 - 28, t1.khadki.speed);
    }
  }

  // ── 14806 Barmer-Yesvantpur – PF2 (overtake) ────────────
  const t2 = all.find(t => t.number === '14806');
  if (t2 && t2.khadki.active && !t2.khadki.done) {
    const x = _clampX(t2.khadki.x, t2.length);
    _kDrawTrain(ctx, x, K.Y_PF2, t2, false);
    _kSpeedLabel(ctx, x + t2.length / 2, K.Y_PF2 - 28, t2.khadki.speed);

    const front = x + t2.length;
    if (front > K.PF2_X1 - 10 && x < K.PF2_X2 + 10) {
      _kOvertakeLabel(ctx,
        Math.min(x + t2.length / 2, K.W - 120),
        K.Y_PF2 - 46,
        '⟳ OVERTAKING  17613  (PF2)', '#ff8800'
      );
    }
  }

  // ── 22225 Vande Bharat – PF2 (Sc-A/B) or PF4 bypass (Sc-C) ─────────────
  const t3 = all.find(t => t.number === '22225');
  if (t3 && t3.khadki.active && !t3.khadki.done) {
    const x   = _clampX(t3.khadki.x, t3.length);
    // In Scenario C the VB passes below both halted trains on the bypass line
    const scId = window._scenarioId || 'A';
    const vbY  = scId === 'C' ? K.Y_PF4 : K.Y_PF2;

    _kDrawTrain(ctx, x, vbY, t3, false);
    _kSpeedLabel(ctx, x + t3.length / 2, vbY - 28, t3.khadki.speed);

    const front = x + t3.length;
    if (front > K.PF2_X1 - 10 && x < K.PF2_X2 + 10) {
      const label  = scId === 'C'
        ? '⟳ VB  OVERTAKING  17613 + 14806  (BYPASS)'
        : '⟳ VB  OVERTAKING  17613  (PF2)';
      const labelY = scId === 'C' ? vbY - 30 : vbY - 46;
      _kOvertakeLabel(ctx,
        Math.min(x + t3.length / 2, K.W - 160),
        labelY,
        label, '#ffdd00'
      );
    }
  }

  // ── 22106 Indrayani – PF3 right→left ─────────────────────
  const t4 = all.find(t => t.number === '22106');
  if (t4 && t4.khadki.active) {
    // khadki.x = right edge (front going left)
    const rightEdge = Math.min(K.W + t4.length + 5, t4.khadki.x);
    const leftEdge  = rightEdge - t4.length;
    _kDrawTrain(ctx, leftEdge, K.Y_PF3, t4, true);
    _kSpeedLabel(ctx, leftEdge + t4.length / 2, K.Y_PF3 - 28, t4.khadki.speed);
  }
}

function _drawPF1OccupationBar(ctx, trainX, t1) {
  const pfLen   = K.PF1_X2 - K.PF1_X1;
  const occupied = Math.min(t1.length, pfLen);
  const pct     = Math.round((occupied / pfLen) * 100);
  const barY    = K.Y_PF1 - 112;

  ctx.save();
  // Background track
  ctx.fillStyle = '#0a1e10';
  ctx.fillRect(K.PF1_X1, barY, pfLen, 9);
  // Filled portion
  ctx.fillStyle = pct > 85 ? '#ff5500' : '#44ff88';
  ctx.fillRect(K.PF1_X1, barY, occupied, 9);
  // Label
  ctx.fillStyle = '#aaccaa';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText(`PF-1 OCCUPIED: ${pct}%  ✦  17613 HALTED`, K.PF1_X1, barY - 3);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function _clampX(x, len) {
  return Math.max(-(len + 5), Math.min(K.W + 5, x));
}

function _kDrawTrain(ctx, x, y, t, flip) {
  const len = t.length, h = 18, hy = y - h / 2;

  const grad = ctx.createLinearGradient(x, hy, x, hy + h);
  grad.addColorStop(0,   _kLighten(t.color, 55));
  grad.addColorStop(0.5, t.color);
  grad.addColorStop(1,   _kDarken(t.color, 55));

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (!flip) ctx.roundRect(x, hy, len, h, [3, 10, 10, 3]);
  else        ctx.roundRect(x, hy, len, h, [10, 3,  3, 10]);
  ctx.fill();

  // Outline
  ctx.strokeStyle = _kLighten(t.color, 90);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Coach dividers
  ctx.strokeStyle = _kDarken(t.color, 25);
  ctx.lineWidth = 0.5;
  for (let i = 1; i < t.coaches; i++) {
    const cx = x + i * K.COACH_PX;
    ctx.beginPath(); ctx.moveTo(cx, hy + 2); ctx.lineTo(cx, hy + h - 2); ctx.stroke();
  }

  // Cab-end highlight
  ctx.fillStyle = _kLighten(t.color, 110);
  if (!flip) ctx.fillRect(x + len - 5, hy + 3, 4, h - 6);
  else        ctx.fillRect(x + 1,       hy + 3, 4, h - 6);

  // Labels
  ctx.fillStyle = '#00000099';
  ctx.font = 'bold 9px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(t.number, x + len / 2, y + 1);
  ctx.font = '8px Courier New';
  ctx.fillStyle = '#00000077';
  ctx.fillText(t.shortName, x + len / 2, y + 10);
  ctx.restore();
}

function _kDelayBadge(ctx, x, y, delayMin) {
  ctx.save();
  ctx.fillStyle = '#ff880033';
  ctx.strokeStyle = '#ff8800';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, 136, 20, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8800';
  ctx.font = 'bold 10px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(`⏱ DELAY: +${delayMin} MIN`, x + 68, y + 13);
  ctx.restore();
}

function _kOvertakeLabel(ctx, cx, y, text, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = 'bold 10px Courier New';
  ctx.textAlign = 'center';
  ctx.shadowColor = color;
  ctx.shadowBlur = 7;
  ctx.fillText(text, cx, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function _kSpeedLabel(ctx, cx, y, speed) {
  if (!speed) return;
  const kmh = Math.abs(Math.round(speed * 3.2));
  if (kmh < 1) return;
  ctx.save();
  ctx.fillStyle = '#8899aa';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(kmh + ' km/h', cx, y);
  ctx.restore();
}

function _kGrid(ctx) {
  ctx.save();
  ctx.strokeStyle = '#0c1820';
  ctx.lineWidth = 1;
  for (let x = 0; x < K.W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, K.H); ctx.stroke();
  }
  for (let y = 0; y < K.H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(K.W, y); ctx.stroke();
  }
  ctx.restore();
}

function _kDirLabels(ctx) {
  ctx.save();
  ctx.fillStyle = '#2d4f6e';
  ctx.font = '11px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('← MUMBAI (UP)', 10, 22);
  ctx.textAlign = 'right';
  ctx.fillText('PUNE (DN) →', K.W - 10, 22);
  ctx.restore();
}

function _kLighten(hex, amt) {
  const [r,g,b] = _kParseHex(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function _kDarken(hex, amt) {
  const [r,g,b] = _kParseHex(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}
function _kParseHex(hex) {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
