// ============================================================
// charts.js – Chart.js rendering helpers (dark theme)
// ============================================================

// Apply dark theme defaults once Chart.js is loaded
function initChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = '#8b949e';
  Chart.defaults.borderColor = '#30363d';
  Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
}

const _chartInstances = {};

function destroyChart(id) {
  if (_chartInstances[id]) {
    _chartInstances[id].destroy();
    delete _chartInstances[id];
  }
}

/* ── Equity Curve (line) ────────────────────────────────── */
function renderEquityCurve(canvasId, history, label, color) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  destroyChart(canvasId);

  const col = color || '#4f9eed';
  const labels = history.map(function(h) { return h.date; });
  const values = history.map(function(h) { return h.value; });

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: label || 'Equity',
        data: values,
        borderColor: col,
        backgroundColor: col + '22',
        fill: true,
        tension: 0.3,
        pointRadius: history.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          callbacks: {
            label: function(ctx) {
              return ' NT$' + Number(ctx.parsed.y).toLocaleString();
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#30363d33' },
          ticks: {
            color: '#8b949e',
            maxTicksLimit: 8,
            maxRotation: 0
          }
        },
        y: {
          grid: { color: '#30363d66' },
          ticks: {
            color: '#8b949e',
            callback: function(v) {
              if (Math.abs(v) >= 1000000) return 'NT$' + (v / 1000000).toFixed(1) + 'M';
              if (Math.abs(v) >= 1000) return 'NT$' + (v / 1000).toFixed(0) + 'K';
              return 'NT$' + v;
            }
          }
        }
      }
    }
  });
}

/* ── Allocation Doughnut ────────────────────────────────── */
function renderAllocationChart(canvasId, segments) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  destroyChart(canvasId);

  if (!segments || segments.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8b949e';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No positions', canvas.width / 2, canvas.height / 2);
    return;
  }

  const COLORS = [
    '#4f9eed', '#3fb950', '#f85149', '#f0c040',
    '#a371f7', '#fd7e14', '#20c997', '#e83e8c',
    '#6f42c1', '#17a2b8', '#ffc107', '#28a745'
  ];

  const labels = segments.map(function(s) { return s.label; });
  const data   = segments.map(function(s) { return s.value; });
  const colors = segments.map(function(_, i) { return COLORS[i % COLORS.length]; });

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#0d1117',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#8b949e',
            padding: 12,
            font: { size: 11 },
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label: function(ctx) {
              const total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ' NT$' + Number(ctx.parsed).toLocaleString() + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}
