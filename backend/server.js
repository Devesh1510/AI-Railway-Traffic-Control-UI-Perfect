/**
 * AI-Powered Railway Traffic Control System
 * Backend Server – Express.js
 * Pune Division | Central Railway
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const trainRoutes     = require('./routes/trains');
const signalRoutes    = require('./routes/signals');
const analyticsRoutes = require('./routes/analytics');
const engine          = require('./data/simulation');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/trains',    trainRoutes);
app.use('/api/signals',   signalRoutes);
app.use('/api/analytics', analyticsRoutes);

// Simulation control endpoints
app.post('/api/control/speed', (req, res) => {
  const { speed } = req.body;
  if (!speed) return res.status(400).json({ error: 'speed required' });
  engine.setSpeed(parseFloat(speed));
  res.json({ speed: engine.speed, message: `Speed set to ${engine.speed}x` });
});

app.post('/api/control/reset', (req, res) => {
  engine.restart();
  res.json({ message: 'Simulation reset successfully' });
});

app.get('/api/control/state', (req, res) => {
  const s = engine.getState();
  res.json({
    simTime:  s.simTime,
    speed:    s.speed,
    running:  true,
    timestamp: s.timestamp,
  });
});

// Full simulation state (used by frontend polling)
// Remaps flat engine properties to nested dapodi/khadki sub-objects
// so the frontend JS (dapodi.js, khadki.js) can use t.dapodi.x etc.
app.get('/api/state', (req, res) => {
  const raw = engine.getState();
  const { TRAIN_DEFINITIONS } = require('./data/trains');

  const mappedTrains = {};
  Object.values(raw.trains).forEach(t => {
    const def = TRAIN_DEFINITIONS[t.number] || {};
    mappedTrains[t.number] = {
      number:    t.number,
      name:      t.name,
      shortName: t.shortName,
      type:      t.type,
      priority:  t.priority,
      coaches:   t.coaches,
      length:    t.length,
      color:     t.color,
      direction: t.direction,
      delayMin:  t.delayMin,
      dapodi: {
        x:       t.d_x,
        speed:   t.d_speed,
        phase:   t.d_phase,
        active:  t.d_active,
        done:    t.d_done,
      },
      khadki: {
        x:       t.k_x,
        speed:   t.k_speed,
        phase:   t.k_phase,
        active:  t.k_active,
        done:    t.k_done,
        stopped: t.k_stopped || false,
      },
    };
  });

  res.json({
    simTime:       raw.simTime,
    speed:         raw.speed,
    trains:        mappedTrains,
    dapodiSignals: raw.dapodiSignals,
    khadkiSignals:  raw.khadkiSignals,
    timestamp:     raw.timestamp,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'AI-Rail-Control', port: PORT });
});

// Fallback → serve frontend index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  AI Railway Traffic Control System               ║`);
  console.log(`║  Pune Division | Central Railway                 ║`);
  console.log(`║  Server running at http://localhost:${PORT}         ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
  engine.start(50); // 50ms tick = 20 FPS server-side state
});

module.exports = app;
