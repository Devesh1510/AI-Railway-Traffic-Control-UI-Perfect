/**
 * analytics.js – Analytics tab rendering, charts, PDF export
 * Uses Chart.js (loaded via CDN in index.html)
 */

// Use window property so app.js can reset this flag across scripts
window._chartsInited = false;
let _charts = {};

// ── Entry point – called when analytics tab is opened ────────────────────────
async function renderAnalytics() {
  try {
    const data = await API.getAnalytics();
    _buildTrainSummary(data.trainAnalytics);
    _buildDelayTable(data.trainAnalytics, data.totals);
    _buildStationAnalysis(data.dapodiMetrics, data.khadkiMetrics);
    _buildAIInsights(data.aiInsights);
    if (!window._chartsInited) {
      _destroyCharts();
      _initCharts(data);
      window._chartsInited = true;
    } else {
      _updateCharts(data);
    }
  } catch (err) {
    console.warn('[Analytics] fetch failed, using static data:', err.message);
    _renderStaticFallback();
  }
}

// ── Train Summary Table ───────────────────────────────────────────────────────
function _buildTrainSummary(trains) {
  const tbody = document.getElementById('trainSummaryBody');
  if (!tbody) return;

  tbody.innerHTML = trains.map(t => {
    const dStatus = _phaseLabel(t.dapodi.phase);
    const kStatus = _phaseLabel(t.khadki.phase);
    const prioCol = t.priority === 1 ? '#ff4444' : t.priority === 2 ? '#ff8844' : '#ffaa44';
    return `<tr>
      <td><span style="color:${t.color};font-weight:bold;">${t.number}</span></td>
      <td>${t.name}</td>
      <td>${t.type}</td>
      <td><span style="color:${prioCol};">P${t.priority}</span></td>
      <td>${t.coaches} LHB</td>
      <td>${t.direction === 'DN' ? 'Mumbai → Pune' : 'Pune → Mumbai'}</td>
      <td>${dStatus}</td>
      <td>${kStatus}</td>
    </tr>`;
  }).join('');
}

// ── Delay Analysis Table ──────────────────────────────────────────────────────
function _buildDelayTable(trains, totals) {
  const tbody = document.getElementById('delayTableBody');
  const tfoot = document.getElementById('delayTableFoot');
  if (!tbody) return;

  tbody.innerHTML = trains.map(t => {
    const dBadge = t.dapodi.delay > 0
      ? `<span class="badge-delay">+${t.dapodi.delay} min</span>`
      : `<span class="badge-ontime">On Time</span>`;
    const kBadge = t.khadki.delay > 0
      ? `<span class="badge-delay">+${t.khadki.delay} min</span>`
      : `<span class="badge-ontime">On Time</span>`;
    return `<tr>
      <td><span style="color:${t.color};font-weight:bold;">${t.number}</span></td>
      <td>${t.name}</td>
      <td>${t.dapodi.scheduled}</td>
      <td>${t.dapodi.actual}</td>
      <td>${dBadge}</td>
      <td>${t.khadki.scheduled}</td>
      <td>${t.khadki.actual}</td>
      <td>${kBadge}</td>
      <td style="color:#8899aa;max-width:200px;white-space:normal;">${t.delayCause}</td>
    </tr>`;
  }).join('');

  if (tfoot && totals) {
    tfoot.innerHTML = `<tr>
      <td colspan="4">CUMULATIVE TOTAL (ALL TRAINS)</td>
      <td><span style="color:#ff8800;font-weight:bold;">+${totals.dapodi} min</span></td>
      <td colspan="2"></td>
      <td><span style="color:#ff8800;font-weight:bold;">+${totals.khadki} min</span></td>
      <td style="color:#ffaa44;">Combined: +${totals.combined} min</td>
    </tr>`;
  }
}

// ── Station Analysis Cards ────────────────────────────────────────────────────
function _buildStationAnalysis(dm, km) {
  const dBody = document.getElementById('dapodiAnalysisBody');
  if (dBody) {
    dBody.innerHTML = `
      <div class="analysis-stats">
        <div class="stat-item"><div class="stat-val">4</div><div class="stat-lbl">TOTAL TRAINS</div></div>
        <div class="stat-item"><div class="stat-val" style="color:#ffaa00;">${dm.avgDelay}<span style="font-size:12px;">min</span></div><div class="stat-lbl">AVG DELAY</div></div>
        <div class="stat-item"><div class="stat-val">${dm.dnTrains}</div><div class="stat-lbl">DN TRAINS</div></div>
        <div class="stat-item"><div class="stat-val">${dm.upTrains}</div><div class="stat-lbl">UP TRAINS</div></div>
      </div>
      <div class="analysis-note">
        PF-1 (DN): 3 trains &bull; PF-2 (UP): 1 train<br>
        No significant platform conflicts at Dapodi.<br>
        All signals operating in normal sequence.
      </div>`;
  }

  const kBody = document.getElementById('khadkiAnalysisBody');
  if (kBody) {
    const haltColor  = km.haltedTrains > 0 ? '#ff4444' : '#44cc66';
    const alertColor = km.alerts > 1       ? '#ff4444' : '#ffaa00';
    kBody.innerHTML = `
      <div class="analysis-stats">
        <div class="stat-item"><div class="stat-val">4</div><div class="stat-lbl">TOTAL TRAINS</div></div>
        <div class="stat-item"><div class="stat-val" style="color:#ff4444;">${km.avgDelay}<span style="font-size:12px;">min</span></div><div class="stat-lbl">AVG DELAY</div></div>
        <div class="stat-item"><div class="stat-val" style="color:${haltColor};">${km.haltedTrains}</div><div class="stat-lbl">HALTED</div></div>
        <div class="stat-item"><div class="stat-val" style="color:#ffaa00;">${km.overtakes}</div><div class="stat-lbl">OVERTAKES</div></div>
      </div>
      <div class="analysis-note" style="border-left-color: ${alertColor};">
        PF-1: ${km.pf1Occupied ? '<span style="color:#ff8800;">OCCUPIED by 17613 (~95% length)</span>' : 'Free'}<br>
        Main line: 14806 &amp; 22225 overtaking<br>
        <span style="color:${alertColor};">⚠ ${km.alerts} active alert(s) – PF-1 blocking cascade</span>
      </div>`;
  }
}

// ── AI Insights ───────────────────────────────────────────────────────────────
function _buildAIInsights(insights) {
  const body = document.getElementById('aiInsightsBody');
  if (!body || !insights) return;

  body.innerHTML = insights.map(ins => {
    const cls = ins.level === 'critical' ? 'critical'
              : ins.level === 'warning'  ? 'warning'
              : ins.level === 'success'  ? 'success'
              : '';
    return `<div class="ai-insight-item ${cls}">
      <div class="ai-icon">${ins.icon}</div>
      <div class="ai-text"><strong>${ins.title}</strong><br>${ins.body}</div>
    </div>`;
  }).join('');
}

// ── Destroy existing chart instances (called before re-init on reset) ────────
function _destroyCharts() {
  Object.values(_charts).forEach(c => { try { c.destroy(); } catch (_) {} });
  _charts = {};
}

// ── Chart Initialisation ──────────────────────────────────────────────────────

// Fixed pixel dimensions for all charts — no responsive auto-sizing.
// This guarantees charts never overflow their container.
const CHART_W = 680;
const CHART_H = 220;

// Set explicit canvas dimensions before Chart.js touches it
function _prepCanvas(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  canvas.width  = CHART_W;
  canvas.height = CHART_H;
  canvas.style.width  = CHART_W + 'px';
  canvas.style.height = CHART_H + 'px';
  return canvas;
}

function _initCharts(data) {
  // All charts use responsive:false — we control the size manually
  const chartDefaults = (yLabel = 'Minutes') => ({
    responsive: false,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    layout: { padding: { top: 4, right: 8, bottom: 4, left: 8 } },
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          color: '#8899aa',
          font: { family: 'Courier New', size: 10 },
          boxWidth: 12,
          padding: 10,
          generateLabels(chart) {
            return Chart.defaults.plugins.legend.labels.generateLabels(chart).map(item => {
              item.text = item.text.length > 18 ? item.text.slice(0, 17) + '…' : item.text;
              return item;
            });
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#557799', font: { family: 'Courier New', size: 10 }, maxRotation: 0 },
        grid:  { color: '#0d1a28' },
      },
      y: {
        ticks: { color: '#557799', font: { family: 'Courier New', size: 10 } },
        grid:  { color: '#0d1a28' },
        title: { display: true, text: yLabel, color: '#446677', font: { family: 'Courier New', size: 10 } },
      },
    },
  });

  const trains = data.trainAnalytics;
  const labels  = trains.map(t => `${t.number}`);
  const colors  = trains.map(t => t.color);
  const colorsA = colors.map(c => c + '88');

  // ── Bar: delay per train per station ───────────────────
  _charts.delay = new Chart(_prepCanvas('chartDelay'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Dapodi Delay (min)',
          data: trains.map(t => t.dapodi.delay),
          backgroundColor: colorsA,
          borderColor: colors,
          borderWidth: 1.5,
        },
        {
          label: 'Khadki Delay (min)',
          data: trains.map(t => t.khadki.delay),
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 1.5,
        },
      ],
    },
    options: chartDefaults('Delay (min)'),
  });

  // ── Line: delay progression over checkpoints ────────────
  const prog = data.delayProgression;
  _charts.line = new Chart(_prepCanvas('chartLine'), {
    type: 'line',
    data: {
      labels: prog.labels,
      datasets: trains.map(t => ({
        label: t.number,
        data: prog.series[t.number] || [],
        borderColor: t.color,
        backgroundColor: t.color + '22',
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
      })),
    },
    options: chartDefaults('Delay (min)'),
  });

  // ── Doughnut: delay causes – driven by live delayCauses payload ────────────
  const causes = data.delayCauses || {
    labels: ['Signal Hold', 'Overtake Penalty', 'Originating Delay', 'Technical Delay'],
    data:   [20, 10, 15, 5],
    colors: {
      background: ['#ff444488', '#ff880088', '#ffdd0088', '#44cc6688'],
      border:     ['#ff4444',   '#ff8800',   '#ffdd00',   '#44cc66'],
    },
  };
  _charts.pie = new Chart(_prepCanvas('chartPie'), {
    type: 'doughnut',
    data: {
      labels: causes.labels,
      datasets: [{
        data:            causes.data,
        backgroundColor: causes.colors.background,
        borderColor:     causes.colors.border,
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      layout: { padding: 4 },
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            color: '#8899aa',
            font: { family: 'Courier New', size: 10 },
            boxWidth: 12,
            padding: 8,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} min`,
          },
        },
      },
    },
  });

  // ── Grouped bar: train delays by station ─────────────────
  _charts.timeline = new Chart(_prepCanvas('chartTimeline'), {
    type: 'bar',
    data: {
      labels: ['Dapodi', 'Khadki'],
      datasets: trains.map(t => ({
        label: t.number,
        data: [t.dapodi.delay, t.khadki.delay],
        backgroundColor: t.color + '88',
        borderColor: t.color,
        borderWidth: 1.5,
      })),
    },
    options: chartDefaults('Delay (min)'),
  });
}

// ── Live chart data update (called on subsequent analytics opens) ─────────────
function _updateCharts(data) {
  if (!_charts.delay) return;
  const trains = data.trainAnalytics;

  // Bar: per-train delay
  _charts.delay.data.datasets[0].data = trains.map(t => t.dapodi.delay);
  _charts.delay.data.datasets[1].data = trains.map(t => t.khadki.delay);
  _charts.delay.update('none');

  // Line: delay progression checkpoints
  trains.forEach((t, i) => {
    if (_charts.line.data.datasets[i]) {
      _charts.line.data.datasets[i].data = data.delayProgression.series[t.number] || [];
    }
  });
  _charts.line.update('none');

  // Doughnut: delay causes – update from live delayCauses payload
  if (_charts.pie && data.delayCauses) {
    _charts.pie.data.labels                    = data.delayCauses.labels;
    _charts.pie.data.datasets[0].data          = data.delayCauses.data;
    _charts.pie.data.datasets[0].backgroundColor = data.delayCauses.colors.background;
    _charts.pie.data.datasets[0].borderColor     = data.delayCauses.colors.border;
    _charts.pie.update('none');
  }

  // Grouped bar: station traffic flow
  if (_charts.timeline) {
    trains.forEach((t, i) => {
      if (_charts.timeline.data.datasets[i]) {
        _charts.timeline.data.datasets[i].data = [t.dapodi.delay, t.khadki.delay];
      }
    });
    _charts.timeline.update('none');
  }
}

// ── PDF export ────────────────────────────────────────────────────────────────
function exportPDF() {
  // 1. Make sure analytics tab is active and data is loaded
  switchTab('analytics', document.querySelector('[data-tab="analytics"]'));

  // 2. Render analytics data fresh (so charts are up-to-date)
  renderAnalytics().then(() => {
    // 3. Small delay to let Chart.js finish drawing
    setTimeout(() => window.print(), 400);
  }).catch(() => {
    setTimeout(() => window.print(), 400);
  });
}

// ── Static fallback if backend is offline ─────────────────────────────────────
function _renderStaticFallback() {
  const staticData = {
    trainAnalytics: [
      { number:'17613', name:'Panvel–Nanded Express',      type:'Mail Express',  priority:3, coaches:17, color:'#4488ff', direction:'DN',
        dapodi:{ scheduled:'14:10', actual:'14:30', delay:20, phase:'done',    action:'pass' },
        khadki:{ scheduled:'14:25', actual:'14:55', delay:30, phase:'halted',  action:'halt' },
        delayCause:'Signal Hold + 2 Overtakes' },
      { number:'14806', name:'Barmer–Yesvantpur AC Exp',   type:'Mail Express',  priority:3, coaches:18, color:'#ff7744', direction:'DN',
        dapodi:{ scheduled:'14:15', actual:'14:15', delay:0,  phase:'done',    action:'pass' },
        khadki:{ scheduled:'14:30', actual:'14:30', delay:0,  phase:'done',    action:'pass' },
        delayCause:'None – On Time' },
      { number:'22225', name:'CSMT–Solapur Vande Bharat',  type:'Vande Bharat',  priority:1, coaches:20, color:'#ffdd00', direction:'DN',
        dapodi:{ scheduled:'14:20', actual:'14:35', delay:15, phase:'done',    action:'pass' },
        khadki:{ scheduled:'14:35', actual:'14:50', delay:15, phase:'done',    action:'pass' },
        delayCause:'Originating Delay' },
      { number:'22106', name:'Pune–CSMT Indrayani Express', type:'Superfast',    priority:2, coaches:16, color:'#44cc66', direction:'UP',
        dapodi:{ scheduled:'14:05', actual:'14:10', delay:5,  phase:'done',    action:'pass' },
        khadki:{ scheduled:'14:18', actual:'14:23', delay:5,  phase:'done',    action:'pass' },
        delayCause:'Technical Delay' },
    ],
    totals: { dapodi:40, khadki:50, combined:90 },
    dapodiMetrics: { avgDelay:10, dnTrains:3, upTrains:1, alerts:1, pfUtilization:75 },
    khadkiMetrics: { avgDelay:13, haltedTrains:1, overtakes:2, alerts:2, pf1Occupied:true },
    delayProgression: {
      labels: ['Origin','Dapodi','Post OT-1','Post OT-2','Khadki Exit'],
      series: { '17613':[20,20,25,30,30], '14806':[0,0,0,0,0], '22225':[15,15,15,15,15], '22106':[5,5,5,5,5] },
    },
    delayCauses: {
      labels: ['Signal Hold', 'Overtake Penalty', 'Originating Delay', 'Technical Delay'],
      data:   [20, 10, 15, 5],
      colors: {
        background: ['#ff444488', '#ff880088', '#ffdd0088', '#44cc6688'],
        border:     ['#ff4444',   '#ff8800',   '#ffdd00',   '#44cc66'],
      },
    },
    aiInsights: [
      { level:'critical', icon:'🚨', title:'Cascading Delay at Khadki PF-1',
        body:'Train 17613 (Panvel–Nanded Express) is halted at Khadki Platform 1 with a 30-minute delay. The train entered with a 20-minute originating delay and accumulated +10 minutes due to 2 forced overtakes by higher-priority trains (14806 and 22225 VB). Platform 1 is occupied at ~95% length, blocking the section.' },
      { level:'warning', icon:'⚠️', title:'Recommendation: Loop Line or Rescheduling',
        body:'Consider diverting Train 17613 to Khadki Loop Line (PF-2) or rescheduling its departure from origin by 25 minutes. This would free the main line for high-priority DN trains and reduce cumulative network delay by an estimated 35%.' },
      { level:'info', icon:'📊', title:'Priority Conflict Analysis',
        body:'22225 VB (P1) overtake of 17613 (P3) is fully compliant with Railway Priority Rules. However, 14806 (P3) overtaking the same P3 train creates a secondary path conflict. Recommend staggering 14806 and 22225 departures from Dapodi by at least 4 minutes.' },
      { level:'info', icon:'🔄', title:'Signal Block Recovery Times',
        body:'Khadki H1 held RED for extended duration, creating an approach-section block cascade. ASC logged 3 signal transitions exceeding the standard 90-second recovery window. Review track-circuit sensitivity at Khadki approach.' },
      { level:'success', icon:'✅', title:'Train 22106 Indrayani Performing Well',
        body:'Train 22106 maintained its minimal 5-minute delay consistently across both Khadki PF-3 and Dapodi PF-2 with zero additional conflicts. Current scheduling for UP-direction trains is optimal.' },
    ],
  };

  _buildTrainSummary(staticData.trainAnalytics);
  _buildDelayTable(staticData.trainAnalytics, staticData.totals);
  _buildStationAnalysis(staticData.dapodiMetrics, staticData.khadkiMetrics);
  _buildAIInsights(staticData.aiInsights);
  if (!window._chartsInited) {
    _initCharts(staticData);
    window._chartsInited = true;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _phaseLabel(phase) {
  const map = {
    waiting:      '<span style="color:#556677;">PENDING</span>',
    approaching:  '<span style="color:#44ccff;">APPROACHING</span>',
    decelerating: '<span style="color:#ffcc00;">SLOWING</span>',
    halted:       '<span style="color:#ff4444;">HALTED</span>',
    departing:    '<span style="color:#00ff88;">DEPARTING</span>',
    entering:     '<span style="color:#44ccff;">ENTERING</span>',
    passing:      '<span style="color:#44ccff;">PASSING</span>',
    done:         '<span style="color:#5588aa;">PASSED</span>',
  };
  return map[phase] || `<span style="color:#556677;">${(phase || '–').toUpperCase()}</span>`;
}
