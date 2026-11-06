/**
 * api.js – All HTTP calls to the backend
 * Base URL: http://localhost:3000
 */

const API_BASE = 'http://localhost:3000';

const API = {
  /** Fetch full simulation state (trains + signals + simTime) */
  async getState() {
    const res = await fetch(`${API_BASE}/api/state`);
    if (!res.ok) throw new Error('State fetch failed');
    return res.json();
  },

  /** Fetch train data only */
  async getTrains() {
    const res = await fetch(`${API_BASE}/api/trains`);
    if (!res.ok) throw new Error('Trains fetch failed');
    return res.json();
  },

  /** Fetch signal data for both stations */
  async getSignals() {
    const res = await fetch(`${API_BASE}/api/signals`);
    if (!res.ok) throw new Error('Signals fetch failed');
    return res.json();
  },

  /** Fetch analytics payload */
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/api/analytics`);
    if (!res.ok) throw new Error('Analytics fetch failed');
    return res.json();
  },

  /** Set simulation speed */
  async setSpeed(s) {
    const res = await fetch(`${API_BASE}/api/control/speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: s }),
    });
    if (!res.ok) throw new Error('Speed set failed');
    return res.json();
  },

  /** Reset simulation */
  async reset() {
    const res = await fetch(`${API_BASE}/api/control/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Reset failed');
    return res.json();
  },

  /** Send chosen scenario id to backend */
  async setScenario(id) {
    const res = await fetch(`${API_BASE}/api/scenarios/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: id }),
    });
    if (!res.ok) throw new Error('Scenario select failed');
    return res.json();
  },

  /** Health check */
  async ping() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
