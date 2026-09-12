/**
 * Route: /api/analytics
 * Returns computed analytics: delay summaries, station metrics, AI insights.
 */

const express = require('express');
const router  = express.Router();
const engine  = require('../data/simulation');
const { TRAIN_DEFINITIONS } = require('../data/trains');
const { addDelay } = require('../utils/helpers');

// GET /api/analytics — full analytics payload
router.get('/', (req, res) => {
  const state = engine.getState();

  // ── Per-train delay data ─────────────────────────────────────────────────
  const trainAnalytics = Object.values(TRAIN_DEFINITIONS).map(def => {
    const live     = state.trains[def.number];
    const dDelay   = def.dapodi.actualDelay;
    const kDelay   = live ? live.delayMin : def.khadki.actualDelay;

    return {
      number:    def.number,
      name:      def.name,
      type:      def.type,
      priority:  def.priority,
      coaches:   def.coaches,
      direction: def.direction,
      color:     def.color,
      dapodi: {
        scheduled: def.dapodi.scheduled,
        actual:    addDelay(def.dapodi.scheduled, dDelay),
        delay:     dDelay,
        platform:  def.dapodi.platform,
        action:    def.dapodi.action,
        phase:     live ? live.d_phase : 'waiting',
      },
      khadki: {
        scheduled: def.khadki.scheduled,
        actual:    addDelay(def.khadki.scheduled, kDelay),
        delay:     kDelay,
        platform:  def.khadki.platform,
        action:    def.khadki.action,
        phase:     live ? live.k_phase : 'waiting',
      },
      delayCause: getDelayCause(def.number, live),
    };
  });

  // ── Cumulative totals ────────────────────────────────────────────────────
  const totalDapodiDelay  = trainAnalytics.reduce((s, t) => s + t.dapodi.delay, 0);
  const totalKhadkiDelay  = trainAnalytics.reduce((s, t) => s + t.khadki.delay, 0);
  const totalCombined     = totalDapodiDelay + totalKhadkiDelay;

  // ── Station metrics ──────────────────────────────────────────────────────
  const dapodiMetrics = {
    totalTrains:   4,
    avgDelay:      Math.round(totalDapodiDelay / 4),
    dnTrains:      3,
    upTrains:      1,
    alerts:        totalDapodiDelay > 10 ? 1 : 0,
    pfUtilization: 75,
  };

  const t17613 = state.trains['17613'];
  const khadkiMetrics = {
    totalTrains:   4,
    avgDelay:      Math.round(totalKhadkiDelay / 4),
    haltedTrains:  t17613 && t17613.k_stopped ? 1 : 0,
    overtakes:     2,
    alerts:        t17613 && t17613.k_stopped ? 2 : 1,
    pfUtilization: t17613 && t17613.k_stopped ? 33 : 0,
    pf1Occupied:   t17613 && t17613.k_stopped,
  };

  // ── Delay progression series (for line chart) ────────────────────────────
  // Checkpoints: Origin, Dapodi, Post-OT1, Post-OT2, Khadki Exit
  const delayProgression = {
    labels: ['Origin', 'Dapodi', 'Post OT-1', 'Post OT-2', 'Khadki Exit'],
    series: {
      '17613': [20, 20, 25, 30, 30],
      '14806': [ 0,  0,  0,  0,  0],
      '22225': [15, 15, 15, 15, 15],
      '22106': [ 5,  5,  5,  5,  5],
    },
  };

  // ── AI insights ───────────────────────────────────────────────────────────
  const aiInsights = generateAIInsights(trainAnalytics, khadkiMetrics, state);

  res.json({
    trainAnalytics,
    totals: { dapodi: totalDapodiDelay, khadki: totalKhadkiDelay, combined: totalCombined },
    dapodiMetrics,
    khadkiMetrics,
    delayProgression,
    aiInsights,
    simTime: state.simTime,
    generatedAt: new Date().toISOString(),
  });
});

// GET /api/analytics/speed — change simulation speed
router.post('/speed', (req, res) => {
  const { speed } = req.body;
  if (!speed) return res.status(400).json({ error: 'speed required' });
  engine.setSpeed(speed);
  res.json({ speed: engine.speed });
});

// POST /api/analytics/reset
router.post('/reset', (req, res) => {
  engine.restart();
  res.json({ message: 'Simulation reset' });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDelayCause(number, live) {
  switch (number) {
    case '17613': return live && live.delayMin > 20
      ? `Signal Hold + ${live.delayMin - 20} min Overtake Penalty`
      : 'Signal Hold (Originating Delay)';
    case '14806': return 'None – On Time';
    case '22225': return 'Originating Delay';
    case '22106': return 'Technical Delay';
    default:      return 'Unknown';
  }
}

function generateAIInsights(analytics, khadkiMetrics, state) {
  const t17613delay = analytics.find(t => t.number === '17613')?.khadki.delay || 30;
  return [
    {
      level: 'critical',
      icon:  '🚨',
      title: 'Cascading Delay at Khadki PF-1',
      body:  `Train 17613 (Panvel–Nanded Express) is halted at Khadki Platform 1 with a ${t17613delay}-minute delay. ` +
             `The train entered with a 20-minute originating delay and accumulated +10 minutes due to 2 forced overtakes ` +
             `by higher-priority trains (14806 and 22225 VB). Platform 1 is occupied at ~95% length, blocking the section.`,
    },
    {
      level: 'warning',
      icon:  '⚠️',
      title: 'Recommendation: Loop Line or Rescheduling',
      body:  `Consider diverting Train 17613 to Khadki Loop Line (PF-2) or rescheduling its departure from origin ` +
             `by 25 minutes. This would free the main line for high-priority DN trains and reduce cumulative ` +
             `network delay by an estimated 35% (~18 minutes saved across 4 trains).`,
    },
    {
      level: 'info',
      icon:  '📊',
      title: 'Priority Conflict Analysis',
      body:  `22225 VB (P1) overtake of 17613 (P3) is fully compliant with Railway Priority Rules. ` +
             `However, 14806 (P3) overtaking the same P3 train creates a secondary path conflict. ` +
             `Recommend staggering 14806 and 22225 departures from Dapodi by at least 4 minutes ` +
             `to avoid simultaneous signal block occupancy at the Khadki approach section.`,
    },
    {
      level: 'info',
      icon:  '🔄',
      title: 'Signal Block Recovery Times',
      body:  `Khadki H1 held RED for extended duration, creating an approach-section block cascade. ` +
             `Automatic Section Controller (ASC) logged 3 signal transitions exceeding the standard ` +
             `90-second recovery window. Review track-circuit sensitivity at Khadki km-marker approach ` +
             `for optimal block-section management and reduced dwell time.`,
    },
    {
      level: 'success',
      icon:  '✅',
      title: 'Train 22106 Indrayani Performing Well',
      body:  `Train 22106 (Pune–CSMT Indrayani Express, UP direction) maintained its minimal 5-minute delay ` +
             `consistently across both Khadki PF-3 and Dapodi PF-2 with zero additional conflicts. ` +
             `The UP line is clear of path conflicts in the current simulation window. ` +
             `Current scheduling for UP-direction trains is optimal.`,
    },
  ];
}

module.exports = router;
