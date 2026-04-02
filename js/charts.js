// ============================================================
// charts.js – Chart.js rendering helpers (dark theme)
// ============================================================
import Chart from 'chart.js/auto'
import { fmtNum, fmtPct } from './utils.js'

export function initChartDefaults() {
  Chart.defaults.color = '#8b949e'
  Chart.defaults.borderColor = '#30363d'
  Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif"
}

const _chartInstances = {}

function destroyChart(id) {
  if (_chartInstances[id]) {
    _chartInstances[id].destroy()
    delete _chartInstances[id]
  }
}

/* ── Equity Curve (line) ────────────────────────────────── */
export function renderEquityCurve(canvasId, history, label, color) {
  const canvas = document.getElementById(canvasId)
  if (!canvas) return
  destroyChart(canvasId)

  const col = color || '#4f9eed'
  const labels = history.map(h => h.date)
  const values = history.map(h => h.value)

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
            label: ctx => ' NT$' + Number(ctx.parsed.y).toLocaleString()
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#30363d33' },
          ticks: { color: '#8b949e', maxTicksLimit: 8, maxRotation: 0 }
        },
        y: {
          grid: { color: '#30363d66' },
          ticks: {
            color: '#8b949e',
            callback: v => {
              if (Math.abs(v) >= 1000000) return 'NT$' + (v / 1000000).toFixed(1) + 'M'
              if (Math.abs(v) >= 1000)    return 'NT$' + (v / 1000).toFixed(0) + 'K'
              return 'NT$' + v
            }
          }
        }
      }
    }
  })
}

/* ── Allocation Doughnut ────────────────────────────────── */
export function renderAllocationChart(canvasId, segments) {
  const canvas = document.getElementById(canvasId)
  if (!canvas) return
  destroyChart(canvasId)

  if (!segments || segments.length === 0) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#8b949e'
    ctx.font = '14px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No positions', canvas.width / 2, canvas.height / 2)
    return
  }

  const COLORS = [
    '#4f9eed','#3fb950','#f85149','#f0c040',
    '#a371f7','#fd7e14','#20c997','#e83e8c',
    '#6f42c1','#17a2b8','#ffc107','#28a745'
  ]

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: segments.map(s => s.label),
      datasets: [{
        data: segments.map(s => s.value),
        backgroundColor: segments.map((_, i) => COLORS[i % COLORS.length]),
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
          labels: { color: '#8b949e', padding: 12, font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
              const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0
              return ' NT$' + Number(ctx.parsed).toLocaleString() + ' (' + pct + '%)'
            }
          }
        }
      }
    }
  })
}

/* ── Price History Chart ─────────────────────────────────── */
// points: [{ time: Date, close: number }]
export function renderPriceChart(canvasId, points) {
  destroyChart(canvasId)
  const canvas = document.getElementById(canvasId)
  if (!canvas) return

  if (!points || points.length === 0) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#8b949e'
    ctx.font = '14px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No data available', canvas.width / 2, canvas.height / 2)
    return
  }

  const spanMs   = points[points.length - 1].time - points[0].time
  const intraday = spanMs < 2 * 86400000
  const labels   = points.map(p => intraday
    ? p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : p.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  const values = points.map(p => p.close)
  const first  = values.find(v => v != null) ?? values[0]
  const last   = values[values.length - 1]
  const color  = last >= first ? '#3fb950' : '#f85149'

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{ data: values, borderColor: color, backgroundColor: color + '18',
        fill: true, tension: 0.2, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1,
          titleColor: '#8b949e', bodyColor: '#e6edf3',
          callbacks: { label: ctx => ' ' + fmtNum(ctx.parsed.y, 2) }
        }
      },
      scales: {
        x: { grid: { color: '#30363d22' }, ticks: { color: '#8b949e', maxTicksLimit: 8, maxRotation: 0 } },
        y: { position: 'right', grid: { color: '#30363d44' }, ticks: { color: '#8b949e', callback: v => fmtNum(v, 2) } }
      }
    }
  })
}
