/**
 * AI Traffic Scenario Definitions
 * Pune Division | Central Railway
 *
 * Each scenario describes a complete traffic management plan:
 * confidence  – AI model confidence %
 * totalDelay  – predicted cumulative section delay in minutes
 * trains      – per-train overrides (halt, platform, delayMin, etc.)
 */

const SCENARIOS = {

  // ── SCENARIO A ────────────────────────────────────────────────────────────
  // Current optimal plan: 17613 halts PF1, 14806+22225 overtake on PF2
  A: {
    id: 'A',
    label: 'Optimal Overtake Plan',
    subtitle: '17613 halts Khadki PF1 · 14806 & 22225 overtake via PF2',
    confidence: 95,
    totalDelay: 30,
    badge: 'RECOMMENDED',
    badgeColor: '#00cc66',
    reasoning: [
      'VB (P1) and AC Exp (P3) clear the section without stopping.',
      '17613 absorbs wait at Khadki PF1; released after both overtakes.',
      'Minimal cascading delay – only 17613 affected.',
      'Signal block recovery within normal window at all sections.',
    ],
    trains: {
      '17613': { haltKhadki: true,  haltPlatform: 'PF1', delayMin: 20, overtakes: 2 },
      '14806': { haltKhadki: false, haltDapodi: false,   delayMin: 0  },
      '22225': { haltKhadki: false, haltDapodi: false,   delayMin: 15 },
      '22106': { haltKhadki: false, haltDapodi: false,   delayMin: 5  },
    },
    timeline: {
      '22106': { d: 19, k: 2  },
      '17613': { d: 5,  k: 21 },
      '14806': { d: 14, k: 30 },
      '22225': { d: 22, k: 42 },
    },
  },

  // ── SCENARIO B ────────────────────────────────────────────────────────────
  // All trains non-stop – no halts anywhere
  B: {
    id: 'B',
    label: 'All Trains Non-Stop',
    subtitle: 'Every train crosses Dapodi & Khadki without halting',
    confidence: 92,
    totalDelay: 20,
    badge: 'LOW DELAY',
    badgeColor: '#44aaff',
    reasoning: [
      'Requires precise headway management – all paths pre-cleared.',
      '17613 uses alternate loop entry at Khadki, does not halt.',
      'Lower cumulative delay but needs co-ordination from Shivajinagar.',
      'Ideal if 17613 departure from Panvel is advanced by 15 min.',
    ],
    trains: {
      '17613': { haltKhadki: false, haltDapodi: false, delayMin: 20 },
      '14806': { haltKhadki: false, haltDapodi: false, delayMin: 0  },
      '22225': { haltKhadki: false, haltDapodi: false, delayMin: 15 },
      '22106': { haltKhadki: false, haltDapodi: false, delayMin: 5  },
    },
    timeline: {
      '22106': { d: 19, k: 2  },
      '17613': { d: 5,  k: 14 },
      '14806': { d: 14, k: 26 },
      '22225': { d: 22, k: 38 },
    },
  },

  // ── SCENARIO C ────────────────────────────────────────────────────────────
  // 17613 + 14806 halt at Khadki PF1/PF2; Indrayani waits before Khadki;
  // VB overtakes all from PF3; both released one by one
  C: {
    id: 'C',
    label: 'VB Overtakes Both + Indrayani Delayed',
    subtitle: '17613 & 14806 halt · Indrayani waits · VB overtakes from PF3',
    confidence: 70,
    totalDelay: 45,
    badge: 'HIGH DELAY',
    badgeColor: '#ff6644',
    reasoning: [
      '14806 (P3) also held at Khadki PF2 – unusual but required for path conflict.',
      'Indrayani (UP) must wait outside Khadki until VB clears PF3.',
      'VB overtakes both 17613 (PF1) and 14806 (PF2) simultaneously from PF3.',
      'Cascading: Indrayani picks up 10-15 min delay due to PF3 occupation.',
    ],
    trains: {
      '17613': { haltKhadki: true,  haltPlatform: 'PF1', delayMin: 20, overtakes: 1 },
      '14806': { haltKhadki: true,  haltPlatform: 'PF2', delayMin: 0,  overtakes: 1 },
      '22225': { haltKhadki: false, haltDapodi:   false, delayMin: 15 },
      '22106': { haltKhadki: true,  haltPlatform: 'PF3_wait', delayMin: 15 },
    },
    timeline: {
      '22106': { d: 19, k: 2   },
      '17613': { d: 5,  k: 21  },
      '14806': { d: 14, k: 30  },
      '22225': { d: 22, k: 44  },
    },
  },
};

module.exports = { SCENARIOS };
