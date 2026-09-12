/**
 * signals.js – Canvas drawing functions for signals
 * Home signal (H): 4 aspects – Red, Yellow, Green, Route-Yellow (top → bottom)
 * Starter signal (S): 2 aspects – Red, Green (top → bottom)
 */

const SIG_COLORS = {
  on:  { red: '#ff2222', yellow: '#ffee00', green: '#00ff44', route: '#ff9900' },
  off: { red: '#3a0000', yellow: '#2a2200', green: '#002200', route: '#2a1200' },
};

/**
 * Draw a Home (Junction) Signal – 4 aspects
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  – centre X
 * @param {number} cy  – centre Y of housing
 * @param {string} state – 'red' | 'yellow' | 'green'
 * @param {string} label – e.g. 'H1'
 */
function drawHomeSignal(ctx, cx, cy, state, label) {
  const boxW = 16, boxH = 62, r = 5.5;
  const halfH = boxH / 2;

  // Housing (vertical rectangle)
  ctx.save();
  ctx.fillStyle = '#1a1a2e';
  ctx.strokeStyle = '#334466';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx - boxW / 2, cy - halfH, boxW, boxH, 3);
  ctx.fill();
  ctx.stroke();

  // Mast (post below housing)
  ctx.strokeStyle = '#3a4a5a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + halfH);
  ctx.lineTo(cx, cy + halfH + 20);
  ctx.stroke();
  ctx.restore();

  // Aspect positions: top→bottom = red, yellow, green, route-yellow
  const yPositions = [
    cy - halfH + 7,
    cy - halfH + 21,
    cy - halfH + 35,
    cy - halfH + 50,
  ];

  // Determine which aspects are lit
  let lit = [false, false, false, false];
  if (state === 'red')    lit = [true,  false, false, false];
  if (state === 'yellow') lit = [false, true,  false, true ];
  if (state === 'green')  lit = [false, false, true,  false];

  const aspectColors = ['red', 'yellow', 'green', 'route'];

  ctx.save();
  aspectColors.forEach((col, i) => {
    const isOn  = lit[i];
    const color = isOn ? SIG_COLORS.on[col] : SIG_COLORS.off[col];
    ctx.beginPath();
    ctx.arc(cx, yPositions[i], r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (isOn) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 12;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
  });
  ctx.restore();

  // Label below mast
  ctx.save();
  ctx.fillStyle = '#7799aa';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + halfH + 32);
  ctx.restore();
}

/**
 * Draw a Starter Signal – 2 aspects (Red top, Green bottom)
 */
function drawStarterSignal(ctx, cx, cy, state, label) {
  const boxW = 13, boxH = 30, r = 4.5;
  const halfH = boxH / 2;

  // Housing
  ctx.save();
  ctx.fillStyle = '#1a1a2e';
  ctx.strokeStyle = '#334466';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx - boxW / 2, cy - halfH, boxW, boxH, 2);
  ctx.fill();
  ctx.stroke();

  // Mast
  ctx.strokeStyle = '#3a4a5a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + halfH);
  ctx.lineTo(cx, cy + halfH + 16);
  ctx.stroke();
  ctx.restore();

  const yTop    = cy - halfH + 7;
  const yBottom = cy - halfH + 21;
  const litRed   = state === 'red';
  const litGreen = state === 'green';

  ctx.save();
  // Red
  ctx.beginPath();
  ctx.arc(cx, yTop, r, 0, Math.PI * 2);
  ctx.fillStyle = litRed ? SIG_COLORS.on.red : SIG_COLORS.off.red;
  ctx.fill();
  if (litRed) { ctx.shadowColor = SIG_COLORS.on.red; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0; }

  // Green
  ctx.beginPath();
  ctx.arc(cx, yBottom, r, 0, Math.PI * 2);
  ctx.fillStyle = litGreen ? SIG_COLORS.on.green : SIG_COLORS.off.green;
  ctx.fill();
  if (litGreen) { ctx.shadowColor = SIG_COLORS.on.green; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0; }
  ctx.restore();

  // Label
  ctx.save();
  ctx.fillStyle = '#7799aa';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + halfH + 26);
  ctx.restore();
}

/**
 * Build the signal status HTML list for info panels
 */
function buildSignalStatusHTML(signals, states) {
  return signals.map(sig => {
    const s   = states[sig.id] || 'green';
    const col = s === 'red' ? '#ff3333' : s === 'yellow' ? '#ffee00' : '#00ff44';
    return `<div class="signal-row">
      <div class="signal-state-dot" style="background:${col};box-shadow:0 0 5px ${col};"></div>
      <span class="sig-label">${sig.id}</span>
      <span class="sig-state" style="color:${col};">${s.toUpperCase()}</span>
      <span style="margin-left:auto;font-size:9px;color:#446677;">${sig.type === 'home' ? '4-asp' : '2-asp'}</span>
    </div>`;
  }).join('');
}
