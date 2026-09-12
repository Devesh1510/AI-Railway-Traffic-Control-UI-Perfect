/**
 * Signal definitions for Dapodi and Khadki stations
 * Pune Division | Central Railway
 *
 * Home Signal (H): 4 aspects – Red, Yellow, Green, Route-Yellow (top→bottom)
 * Starter Signal (S): 2 aspects – Red (top), Green (bottom)
 *
 * ── Dapodi canvas: 1160 × 320 ─────────────────────────────────────────────
 *   DN line (PF1): trackY = 105
 *   UP line (PF2): trackY = 210
 *
 * ── Khadki canvas: 1160 × 380 ─────────────────────────────────────────────
 *   PF1 (DN through-line, top):    trackY = 90
 *   PF2 (overtake/loop line, mid): trackY = 195
 *   PF3 (UP direction, bottom):    trackY = 280
 *
 * Signal assignment at Khadki:
 *   H1  – Mumbai-side PF1 approach   (stays RED when 17613 halted)
 *   H7  – Mumbai-side PF2 approach   (turns RED as 14806/22225 enter PF2)
 *   H6  – Mumbai-side PF3 / bottom area
 *   S1  – PF1 starter towards Pune   (stays RED while 17613 halted)
 *   S2  – PF2 Mumbai-end starter     (turns RED as overtakers pass)
 *   S3  – PF2 Pune-end starter       (turns RED as overtakers exit)
 *   H2  – PF1 Pune-side departure
 *   H5  – PF2 Pune-side departure    (turns RED as overtakers pass)
 *   H3  – PF3 Pune-side departure
 *   H4  – PF3 / bottom Pune-side
 */

// ── DAPODI ────────────────────────────────────────────────────────────────────
const DAPODI_SIGNALS = {
  // Mumbai-side approach
  H1: { id:'H1', x:200,  trackY:105, type:'home',    line:'dn', side:'above', label:'H1',
        desc:'Home – Mumbai approach DN (PF1)' },
  H2: { id:'H2', x:200,  trackY:210, type:'home',    line:'up', side:'below', label:'H2',
        desc:'Home – Mumbai approach UP (PF2)' },

  // Starter signals on platforms
  S1: { id:'S1', x:340,  trackY:105, type:'starter', line:'dn', side:'above', label:'S1',
        desc:'Starter – PF1 towards Mumbai end' },
  S2: { id:'S2', x:790,  trackY:210, type:'starter', line:'up', side:'below', label:'S2',
        desc:'Starter – PF2 towards Pune end' },

  // Pune-side departure
  H3: { id:'H3', x:960,  trackY:105, type:'home',    line:'dn', side:'above', label:'H3',
        desc:'Home – Pune departure DN (PF1)' },
  H4: { id:'H4', x:960,  trackY:210, type:'home',    line:'up', side:'below', label:'H4',
        desc:'Home – Pune departure UP (PF2)' },
};

// ── KHADKI ────────────────────────────────────────────────────────────────────
const KHADKI_SIGNALS = {
  // ── Mumbai-side approach signals ─────────────────────────
  // H1: PF1 approach – pre-set RED (17613 must stop here)
  H1: { id:'H1', x:150,  trackY:90,  type:'home',    line:'pf1', side:'above', label:'H1',
        desc:'Home – Mumbai approach PF1 (DN) – RED for 17613 halt' },
  // H7: PF2 approach – GREEN initially, turns RED as 14806/22225 divert in
  H7: { id:'H7', x:210,  trackY:195, type:'home',    line:'pf2', side:'above', label:'H7',
        desc:'Home – Mumbai approach PF2 (overtake route)' },
  // H6: PF3 / bottom area approach (for 22106 Indrayani coming from Pune)
  H6: { id:'H6', x:180,  trackY:280, type:'home',    line:'pf3', side:'below', label:'H6',
        desc:'Home – Mumbai-side PF3/bottom approach (UP)' },

  // ── Starter signals on platforms ─────────────────────────
  // S1: PF1 Pune-end starter – stays RED while 17613 halted, turns GREEN on release
  S1: { id:'S1', x:590,  trackY:90,  type:'starter', line:'pf1', side:'above', label:'S1',
        desc:'Starter – PF1 towards Pune (held RED while 17613 halted)' },
  // S2: PF2 Mumbai-end starter – turns RED as overtakers enter PF2
  S2: { id:'S2', x:305,  trackY:195, type:'starter', line:'pf2', side:'above', label:'S2',
        desc:'Starter – PF2 Mumbai-end (overtake entry)' },
  // S3: PF2 Pune-end starter – turns RED as overtakers exit PF2
  S3: { id:'S3', x:855,  trackY:195, type:'starter', line:'pf2', side:'above', label:'S3',
        desc:'Starter – PF2 Pune-end (overtake exit)' },

  // ── Pune-side departure signals ───────────────────────────
  // H2: PF1 Pune-side – turns RED as 17613 departs (after release)
  H2: { id:'H2', x:960,  trackY:90,  type:'home',    line:'pf1', side:'above', label:'H2',
        desc:'Home – Pune departure PF1 (DN)' },
  // H5: PF2 Pune-side – turns RED as 14806/22225 exit PF2
  H5: { id:'H5', x:940,  trackY:195, type:'home',    line:'pf2', side:'above', label:'H5',
        desc:'Home – Pune departure PF2 (overtake exit)' },
  // H3: PF3 Pune-side – turns RED as 22106 (Indrayani) enters from Pune side
  H3: { id:'H3', x:990,  trackY:280, type:'home',    line:'pf3', side:'above', label:'H3',
        desc:'Home – Pune departure PF3 (UP direction)' },
  // H4: PF3 bottom / secondary
  H4: { id:'H4', x:945,  trackY:280, type:'home',    line:'pf3', side:'below', label:'H4',
        desc:'Home – Pune departure PF3 lower (UP)' },
};

// ── Default states ────────────────────────────────────────────────────────────

/** Dapodi: all green at simulation start */
function getDefaultDapodiStates() {
  const s = {};
  Object.keys(DAPODI_SIGNALS).forEach(k => { s[k] = 'green'; });
  return s;
}

/**
 * Khadki defaults:
 *   H1 = RED  (17613 must stop – pre-set before simulation begins)
 *   S1 = RED  (PF1 starter held until 17613 released)
 *   All PF2 signals (H7, S2, S3, H5) = GREEN (PF2 loop clear initially)
 *   All PF3 signals (H6, H3, H4)     = GREEN
 *   H2 = RED  (PF1 Pune departure – held RED so 17613 cannot proceed; released after VB passes)
 */
function getDefaultKhadkiStates() {
  const s = {};
  Object.keys(KHADKI_SIGNALS).forEach(k => { s[k] = 'green'; });
  s['H1'] = 'red';   // PF1 approach  – blocked (train behind 17613 must stop)
  s['S1'] = 'red';   // PF1 starter   – held while 17613 halted
  s['H2'] = 'red';   // PF1 departure – THIS is why 17613 halts; released after VB clears
  return s;
}

module.exports = {
  DAPODI_SIGNALS,
  KHADKI_SIGNALS,
  getDefaultDapodiStates,
  getDefaultKhadkiStates,
};
