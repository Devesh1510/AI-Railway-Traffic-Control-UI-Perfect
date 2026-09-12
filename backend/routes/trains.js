/**
 * Route: /api/trains
 * Returns live train positions, phases, delays, and speeds.
 */

const express = require('express');
const router  = express.Router();
const engine  = require('../data/simulation');
const { TRAIN_DEFINITIONS } = require('../data/trains');

// GET /api/trains — full train state snapshot
router.get('/', (req, res) => {
  const state = engine.getState();

  const result = Object.values(state.trains).map(tr => {
    const def = TRAIN_DEFINITIONS[tr.number];
    return {
      number:    tr.number,
      name:      tr.name,
      shortName: tr.shortName,
      type:      tr.type,
      priority:  tr.priority,
      coaches:   tr.coaches,
      length:    tr.length,
      color:     tr.color,
      direction: tr.direction,
      delayMin:  tr.delayMin,
      dapodi: {
        x:       tr.d_x,
        speed:   tr.d_speed,
        phase:   tr.d_phase,
        active:  tr.d_active,
        done:    tr.d_done,
        scheduled: def.dapodi.scheduled,
        action:    def.dapodi.action,
        platform:  def.dapodi.platform,
      },
      khadki: {
        x:       tr.k_x,
        speed:   tr.k_speed,
        phase:   tr.k_phase,
        active:  tr.k_active,
        done:    tr.k_done,
        stopped: tr.k_stopped || false,
        scheduled: def.khadki.scheduled,
        action:    def.khadki.action,
        platform:  def.khadki.platform,
      },
    };
  });

  res.json({ trains: result, simTime: state.simTime });
});

// GET /api/trains/:number — single train
router.get('/:number', (req, res) => {
  const state = engine.getState();
  const tr    = state.trains[req.params.number];
  if (!tr) return res.status(404).json({ error: 'Train not found' });
  res.json(tr);
});

module.exports = router;
