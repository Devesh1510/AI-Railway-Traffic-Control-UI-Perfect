/**
 * Route: /api/signals
 * Returns current signal states for Dapodi and Khadki.
 */

const express = require('express');
const router  = express.Router();
const engine  = require('../data/simulation');
const { DAPODI_SIGNALS, KHADKI_SIGNALS } = require('../data/signals');

// GET /api/signals — all signal states with metadata
router.get('/', (req, res) => {
  const state = engine.getState();

  const dapodiFull = Object.keys(DAPODI_SIGNALS).map(k => ({
    ...DAPODI_SIGNALS[k],
    state: state.dapodiSignals[k] || 'green',
  }));

  const khadkiFull = Object.keys(KHADKI_SIGNALS).map(k => ({
    ...KHADKI_SIGNALS[k],
    state: state.khadkiSignals[k] || 'green',
  }));

  res.json({
    dapodi:  dapodiFull,
    khadki:  khadkiFull,
    simTime: state.simTime,
  });
});

// GET /api/signals/dapodi
router.get('/dapodi', (req, res) => {
  const state = engine.getState();
  const full  = Object.keys(DAPODI_SIGNALS).map(k => ({
    ...DAPODI_SIGNALS[k],
    state: state.dapodiSignals[k] || 'green',
  }));
  res.json({ signals: full, simTime: state.simTime });
});

// GET /api/signals/khadki
router.get('/khadki', (req, res) => {
  const state = engine.getState();
  const full  = Object.keys(KHADKI_SIGNALS).map(k => ({
    ...KHADKI_SIGNALS[k],
    state: state.khadkiSignals[k] || 'green',
  }));
  res.json({ signals: full, simTime: state.simTime });
});

module.exports = router;
