/**
 * dapodi.js – Canvas drawing for Dapodi Station
 *
 * Layout (canvas 1160×320):
 *   DN line (PF1, top):  y = 100
 *   UP line (PF2, bottom): y = 210
 *
 * Dapodi signals (from backend/data/signals.js):
 *   H1 x=200 (Mumbai DN), H2 x=200 (Mumbai UP)
 *   S1 x=340 (PF1 starter), S2 x=790 (PF2 starter)
 *   H3 x=960 (Pune DN), H4 x=960 (Pune UP)
 */

const D = {
  W: 1160, H: 320,
  Y_DN: 105,   // DN line (PF1 side) track centre
  Y_UP: 210,   // UP line (PF2 side) track centre
  PF1_X1: 320, PF1_X2: 830,
  PF2_X1: 320, PF2_X2: 830,
  PF_H:   28,
  J_L:    265, // left junction centre X
  J_R:    905, // right junction centre X
};

// Signal positions on Dapodi canvas
const D_SIGNALS = [
  { id:'H1', x:200,  trackY: D.Y_DN, type:'home',    line:'dn' },
  { id:'H2', x:200,  trackY: D.Y_UP, type:'home',    line:'up' },
  { id:'S1', x:340,  trackY: D.Y_DN, type:'starter', line:'dn' },
  { id:'S2', x:790,  trackY: D.Y_UP, type:'starter', line:'up' },
  { id:'H3', x:960,  trackY: D.Y_DN, type:'home',    line:'dn' },
  { id:'H4', x:960,  trackY: D.Y_UP, type:'home',    line:'up' },
];

function drawDapodiStation(ctx, trainData, signalStates) {
  ctx.clearRect(0, 0, D.W, D.H);

  // ── Background ───────────────────────────────────────────
  ctx.fillStyle = '#050a10';
  ctx.fillRect(0, 0, D.W, D.H);
  _drawGrid(ctx, D.W, D.H);

  // ── Track geometry ───────────────────────────────────────
  _drawDapodiTracks(ctx);

  // ── Platforms ────────────────────────────────────────────
  _drawPlatform(ctx, D.PF1_X1, D.Y_DN - D.PF_H - 7, D.PF1_X2 - D.PF1_X1, D.PF_H, 'PF – 1  (DN)');
  _drawPlatform(ctx, D.PF2_X1, D.Y_UP + 7,           D.PF2_X2 - D.PF2_X1, D.PF_H, 'PF – 2  (UP)');

  // ── Direction labels ─────────────────────────────────────
  _drawDirectionLabels(ctx, D.W);

  // ── Signals ─────────────────────────────────────────────
  D_SIGNALS.forEach(sig => {
    const state = signalStates[sig.id] || 'green';
    const yOff  = sig.line === 'dn' ? sig.trackY - 42 : sig.trackY + 42;
    if (sig.type === 'home')    drawHomeSignal(ctx, sig.x, yOff, state, sig.id);
    else                         drawStarterSignal(ctx, sig.x, yOff, state, sig.id);
  });

  // ── Trains ───────────────────────────────────────────────
  if (trainData) _drawDapodiTrains(ctx, trainData);
}

function _drawDapodiTracks(ctx) {
  // Crossover lines (junction diamonds)
  ctx.save();
  ctx.strokeStyle = '#3a5566';
  ctx.lineWidth = 1.5;
  // Left junction
  ctx.beginPath(); ctx.moveTo(D.J_L - 45, D.Y_DN); ctx.lineTo(D.J_L + 15, D.Y_UP); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(D.J_L - 45, D.Y_UP); ctx.lineTo(D.J_L + 15, D.Y_DN); ctx.stroke();
  // Right junction
  ctx.beginPath(); ctx.moveTo(D.J_R - 15, D.Y_DN); ctx.lineTo(D.J_R + 45, D.Y_UP); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(D.J_R - 15, D.Y_UP); ctx.lineTo(D.J_R + 45, D.Y_DN); ctx.stroke();
  ctx.restore();

  // Sleepers
  ctx.save();
  ctx.strokeStyle = '#1e2e3e';
  ctx.lineWidth = 4;
  for (let x = 10; x < D.W; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, D.Y_DN - 7); ctx.lineTo(x, D.Y_DN + 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, D.Y_UP - 7); ctx.lineTo(x, D.Y_UP + 7); ctx.stroke();
  }
  ctx.restore();

  // Rails
  ctx.save();
  ctx.strokeStyle = '#7a8899';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, D.Y_DN); ctx.lineTo(D.W, D.Y_DN); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, D.Y_UP); ctx.lineTo(D.W, D.Y_UP); ctx.stroke();
  ctx.restore();
}

function _drawDapodiTrains(ctx, trainData) {
  const all = Object.values(trainData);

  // DN trains (left→right): 17613, 14806, 22225
  const dnTrains = all.filter(t => t.direction === 'DN');
  dnTrains.forEach((t, idx) => {
    if (!t.dapodi.active || t.dapodi.done) return;
    const yOffset = (idx - 1) * 5; // spread slightly so overlapping trains are visible
    const x = Math.max(-(t.length + 5), t.dapodi.x);
    _drawTrain(ctx, x, D.Y_DN + yOffset, t, false);
    _drawSpeedLabel(ctx, x + t.length / 2, D.Y_DN + yOffset - 26, t.dapodi.speed);
  });

  // UP train (right→left): 22106
  const upTrains = all.filter(t => t.direction === 'UP');
  upTrains.forEach(t => {
    if (!t.dapodi.active || t.dapodi.done) return;
    // x stored as right-edge for UP trains
    const rightEdge = Math.min(D.W + t.length + 5, t.dapodi.x);
    const leftEdge  = rightEdge - t.length;
    _drawTrain(ctx, leftEdge, D.Y_UP, t, true);
    _drawSpeedLabel(ctx, leftEdge + t.length / 2, D.Y_UP - 26, t.dapodi.speed);
  });
}

function _drawTrain(ctx, x, y, t, flip) {
  const len = t.length, h = 18;
  const hy  = y - h / 2;

  // Body gradient
  const grad = ctx.createLinearGradient(x, hy, x, hy + h);
  grad.addColorStop(0,   _lighten(t.color, 50));
  grad.addColorStop(0.5, t.color);
  grad.addColorStop(1,   _darken(t.color, 50));

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (!flip) ctx.roundRect(x, hy, len, h, [3, 10, 10, 3]);
  else        ctx.roundRect(x, hy, len, h, [10, 3, 3, 10]);
  ctx.fill();

  // Outline
  ctx.strokeStyle = _lighten(t.color, 80);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Coach dividers
  ctx.strokeStyle = _darken(t.color, 30);
  ctx.lineWidth = 0.5;
  const COACH_PX = 14;
  for (let i = 1; i < t.coaches; i++) {
    const cx = x + i * COACH_PX;
    ctx.beginPath(); ctx.moveTo(cx, hy + 2); ctx.lineTo(cx, hy + h - 2); ctx.stroke();
  }

  // Cab end highlight
  ctx.fillStyle = _lighten(t.color, 100);
  if (!flip) ctx.fillRect(x + len - 5, hy + 3, 4, h - 6);
  else        ctx.fillRect(x + 1,       hy + 3, 4, h - 6);

  // Train number & short name
  ctx.fillStyle = '#00000099';
  ctx.font = 'bold 9px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(t.number, x + len / 2, y + 1);
  ctx.font = '8px Courier New';
  ctx.fillStyle = '#00000077';
  ctx.fillText(t.shortName, x + len / 2, y + 10);

  ctx.restore();
}

function _drawSpeedLabel(ctx, cx, cy, speed) {
  if (!speed) return;
  const kmh = Math.abs(Math.round(speed * 3.2));
  if (kmh <= 0) return;
  ctx.save();
  ctx.fillStyle = '#8899aa';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(`${kmh} km/h`, cx, cy);
  ctx.restore();
}

function _drawPlatform(ctx, x, y, w, h, label) {
  ctx.save();
  ctx.fillStyle = '#192637';
  ctx.strokeStyle = '#3a5a6a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#5a6e7e';
  ctx.font = 'bold 11px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 4);
  ctx.restore();
}

function _drawGrid(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = '#0c1820';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

function _drawDirectionLabels(ctx, W) {
  ctx.save();
  ctx.fillStyle = '#2d4f6e';
  ctx.font = '11px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('← MUMBAI (UP)', 10, 22);
  ctx.textAlign = 'right';
  ctx.fillText('PUNE (DN) →', W - 10, 22);
  ctx.restore();
}

function _lighten(hex, amt) {
  const [r, g, b] = _parseHex(hex);
  return `rgb(${Math.min(255, r+amt)},${Math.min(255, g+amt)},${Math.min(255, b+amt)})`;
}
function _darken(hex, amt) {
  const [r, g, b] = _parseHex(hex);
  return `rgb(${Math.max(0, r-amt)},${Math.max(0, g-amt)},${Math.max(0, b-amt)})`;
}
function _parseHex(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
