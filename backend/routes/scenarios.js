/**
 * Route: /api/scenarios
 * Returns all scenario definitions and accepts a selected scenario to apply.
 */

const express   = require('express');
const router    = express.Router();
const { SCENARIOS } = require('../data/scenarios');
const engine    = require('../data/simulation');

// GET /api/scenarios – list all scenarios (metadata only, no full train config)
router.get('/', (req, res) => {
  const list = Object.values(SCENARIOS).map(s => ({
    id:          s.id,
    label:       s.label,
    subtitle:    s.subtitle,
    confidence:  s.confidence,
    totalDelay:  s.totalDelay,
    badge:       s.badge,
    badgeColor:  s.badgeColor,
    reasoning:   s.reasoning,
  }));
  res.json({ scenarios: list });
});

// GET /api/scenarios/:id – full scenario detail including timeline
router.get('/:id', (req, res) => {
  const s = SCENARIOS[req.params.id.toUpperCase()];
  if (!s) return res.status(404).json({ error: 'Scenario not found' });
  res.json(s);
});

// POST /api/scenarios/select  { scenarioId: 'A' | 'B' | 'C' }
// Applies the chosen scenario to the simulation engine and resets
router.post('/select', (req, res) => {
  const id = (req.body.scenarioId || '').toUpperCase();
  const s  = SCENARIOS[id];
  if (!s) return res.status(400).json({ error: 'Invalid scenario id' });

  engine.applyScenario(s);   // implemented in simulation.js
  res.json({
    message:    `Scenario ${id} applied`,
    scenarioId: id,
    label:      s.label,
  });
});

module.exports = router;
