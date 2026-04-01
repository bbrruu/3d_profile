// charts.js - Chart.js rendering helpers for InvestSim

// Dark theme defaults
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#30363d';
Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size = 12;

const _chartInstances = {};

/**
 * Destroy an existing chart by canvas ID to prevent re-render errors
 */
function destroyChart(id) {
  if (_chartInstances[id]) {
    _chartInstances[id].destroy();
    delete _chartInstances[id];
  }
}

/**
 * Render an equity curve (line chart with area fill)
 * @param {string} canvasId
 * @param {Array<{date: string, value: number}>} history
 * @param {string} label
 * @param {string} color - hex color
 */
function renderEquityCurve(canvasId, history, label, color = '#4f9eed') {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (!history || history.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8b949e';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet', canvas.width / 2, canvas.height / 2);
    return;
  }

  const labels = history.map(h => h.date);
  const values = history.map(h => h.value);

  const ctx = canvas.getContext('2d');

  // Create gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, color + '33');
  gradient.addColorStop(1, color + '00');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: color,
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: history.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: color
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2230',
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label: ctx => 'NT$' + ctx.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 0 })
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#30363d22', drawBorder: false },
          ticks: {
            maxTicksLimit: 8,
            maxRotation: 0
          }
        },
        y: {
          grid: { color: '#30363d66', drawBorder: false },
          ticks: {
            callback: v => 'NT$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
          }
        }
      }
    }
  });

  _chartInstances[canvasId] = chart;
}

/**
 * Render allocation doughnut chart
 * @param {string} canvasId
 * @param {Array<{label: string, value: number}>} segments
 */
function renderAllocationChart(canvasId, segments) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (!segments || segments.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8b949e';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No holdings', canvas.width / 2, canvas.height / 2);
    return;
  }

  const COLORS = [
    '#4f9eed', '#3fb950', '#f0883e', '#bc8cff',
    '#f85149', '#79c0ff', '#56d364', '#ffa657',
    '#d2a8ff', '#ff7b72', '#39d353', '#58a6ff'
  ];

  const labels = segments.map(s => s.label);
  const values = segments.map(s => s.value);
  const colors = segments.map((_, i) => COLORS[i % COLORS.length]);

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#161b22',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 12,
            boxWidth: 12,
            color: '#8b949e',
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: '#1c2230',
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` NT$${ctx.parsed.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  _chartInstances[canvasId] = chart;
}
