/**
 * Train definitions – static metadata
 * Pune Division | Central Railway
 */

const COACH_PX = 14; // pixels per LHB coach on canvas

const TRAIN_DEFINITIONS = {
  '17613': {
    number: '17613',
    name: 'Panvel–Nanded Express',
    shortName: 'PNV-NED',
    type: 'Mail Express',
    priority: 3,
    coaches: 17,
    color: '#4488ff',
    direction: 'DN',        // Mumbai → Pune (left → right)
    dapodi: {
      platform: 'PF1',
      scheduled: '14:10',
      actualDelay: 20,      // minutes late
      action: 'pass',       // passes through (brief slow)
    },
    khadki: {
      platform: 'PF1',
      scheduled: '14:25',
      actualDelay: 20,      // starts at 20, increases per overtake
      action: 'halt',       // STOPS at platform
    },
    overtakes: 2,           // gets overtaken 2 times at Khadki
    delayPerOvertake: 5,    // +5 min each
  },

  '14806': {
    number: '14806',
    name: 'Barmer–Yesvantpur AC Express',
    shortName: 'BMR-YPR',
    type: 'Mail Express',
    priority: 3,
    coaches: 18,
    color: '#ff7744',
    direction: 'DN',
    dapodi: {
      platform: 'PF1',
      scheduled: '14:15',
      actualDelay: 0,
      action: 'pass',
    },
    khadki: {
      platform: 'PF2',      // overtakes via PF2 (17613 on PF1)
      scheduled: '14:30',
      actualDelay: 0,
      action: 'pass',
    },
    overtakes: 0,
  },

  '22225': {
    number: '22225',
    name: 'CSMT–Solapur Vande Bharat',
    shortName: 'VB EXP',
    type: 'Vande Bharat',
    priority: 1,
    coaches: 20,
    color: '#ffdd00',
    direction: 'DN',
    dapodi: {
      platform: 'PF1',
      scheduled: '14:20',
      actualDelay: 15,
      action: 'pass',
    },
    khadki: {
      platform: 'PF2',      // overtakes via PF2, 12s after 14806
      scheduled: '14:35',
      actualDelay: 15,
      action: 'pass',
    },
    overtakes: 0,
  },

  '22106': {
    number: '22106',
    name: 'Pune–CSMT Indrayani Express',
    shortName: 'INDRAYANI',
    type: 'Superfast',
    priority: 2,
    coaches: 16,
    color: '#44cc66',
    direction: 'UP',        // Pune → Mumbai (right → left)
    dapodi: {
      platform: 'PF2',
      scheduled: '14:05',
      actualDelay: 5,
      action: 'pass',
    },
    khadki: {
      platform: 'PF3',
      scheduled: '14:18',
      actualDelay: 5,
      action: 'pass',
    },
    overtakes: 0,
  },
};

// Simulation timeline: when each train enters the canvas (in simulation seconds)
//
// 22106 Indrayani (UP, right→left):
//   khadki_enter: 2   → enters Khadki first (Pune→Mumbai direction)
//   dapodi_enter: 19  → enters Dapodi AFTER fully clearing Khadki canvas
//                       (1160px ÷ 90px/s ≈ 13s travel + ~4s gap = t=19)
//
// 22225 enters Khadki at t=42 → 12 sim-seconds after 14806 (t=30)
const TIMELINE = {
  '22106': { dapodi_enter: 19, khadki_enter: 2  },
  '17613': { dapodi_enter: 5,  khadki_enter: 21 },
  '14806': { dapodi_enter: 14, khadki_enter: 30 },
  '22225': { dapodi_enter: 22, khadki_enter: 42 },
};

const SPEEDS = {
  NORMAL:  90,  // px/sec
  SLOW:    50,  // px/sec (approaching stop)
  STOPPED: 0,
};

module.exports = { TRAIN_DEFINITIONS, TIMELINE, SPEEDS, COACH_PX };
