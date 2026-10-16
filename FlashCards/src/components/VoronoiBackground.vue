<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GUI } from 'dat.gui'

const canvas = ref(null)
let raf = null
let ctx = null
let points = []
let width = 0
let height = 0
let dpr = 1
let gui = null

const NUM_POINTS = 200

// Tunable parameters
const params = {
  velocity: 20.0,       // impulse magnitude
  resistance: 0.975,    // damping per frame (higher = slower stop)
  idleDrift: 0.02,     // idle drift amount
  showPoints: false,   // debug: show point positions
}

function initPoints() {
  points = []
  for (let i = 0; i < NUM_POINTS; i++) {
    points.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      // Each particle has its own sensitivity to flow impulses
      flowResponse: 0.3 + Math.random() * 0.7,
      // Very slow idle drift so they're never fully frozen
      idleAngle: Math.random() * Math.PI * 2,
      idleSpeed: 0.01 + Math.random() * 0.03,
    })
  }
}

function pushFlow(dir) {
  const dirX = dir === 'next' ? -1 : 1
  for (const p of points) {
    // Each particle gets its own random impulse magnitude
    const impulse = (params.velocity * 0.3 + Math.random() * params.velocity) * p.flowResponse
    p.vx += dirX * impulse
    // Small random vertical component for organic turbulence
    p.vy += (Math.random() - 0.5) * impulse * 0.4
  }
}

defineExpose({ pushFlow })

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.value.width = width * dpr
  canvas.value.height = height * dpr
  canvas.value.style.width = width + 'px'
  canvas.value.style.height = height + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  initPoints()
}

function updatePoints() {
  for (const p of points) {
    // Damping — controlled by resistance param
    p.vx *= params.resistance
    p.vy *= params.resistance

    // Very slow idle drift (so cells barely creep when at rest)
    p.idleAngle += 0.003
    p.vx += Math.cos(p.idleAngle) * p.idleSpeed * params.idleDrift
    p.vy += Math.sin(p.idleAngle * 1.2) * p.idleSpeed * params.idleDrift

    p.x += p.vx
    p.y += p.vy

    // Wrap around (toroidal)
    if (p.x < 0) p.x += width
    if (p.x > width) p.x -= width
    if (p.y < 0) p.y += height
    if (p.y > height) p.y -= height
  }
}

// Compute Voronoi edges via half-plane intersection for each cell
function drawVoronoi() {
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
  ctx.lineWidth = 1

  const margin = 200
  const clipBounds = { xl: -margin, xr: width + margin, yt: -margin, yb: height + margin }

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    let polygon = [
      { x: clipBounds.xl, y: clipBounds.yt },
      { x: clipBounds.xr, y: clipBounds.yt },
      { x: clipBounds.xr, y: clipBounds.yb },
      { x: clipBounds.xl, y: clipBounds.yb },
    ]

    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      const q = points[j]
      const mx = (p.x + q.x) / 2
      const my = (p.y + q.y) / 2
      const nx = p.x - q.x
      const ny = p.y - q.y
      polygon = clipPolygon(polygon, mx, my, nx, ny)
      if (polygon.length === 0) break
    }

    if (polygon.length > 2) {
      ctx.beginPath()
      ctx.moveTo(polygon[0].x, polygon[0].y)
      for (let k = 1; k < polygon.length; k++) {
        ctx.lineTo(polygon[k].x, polygon[k].y)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }

  // Debug: show point positions
  if (params.showPoints) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    for (const p of points) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// Clip a convex polygon against a half-plane: dot(P - M, N) >= 0
function clipPolygon(poly, mx, my, nx, ny) {
  const result = []
  const len = poly.length
  for (let i = 0; i < len; i++) {
    const cur = poly[i]
    const next = poly[(i + 1) % len]
    const dc = (cur.x - mx) * nx + (cur.y - my) * ny
    const dn = (next.x - mx) * nx + (next.y - my) * ny

    if (dc >= 0) {
      result.push(cur)
      if (dn < 0) {
        result.push(intersect(cur, next, mx, my, nx, ny))
      }
    } else if (dn >= 0) {
      result.push(intersect(cur, next, mx, my, nx, ny))
    }
  }
  return result
}

function intersect(a, b, mx, my, nx, ny) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const denom = dx * nx + dy * ny
  if (denom === 0) return { x: a.x, y: a.y }
  const t = ((mx - a.x) * nx + (my - a.y) * ny) / denom
  return { x: a.x + t * dx, y: a.y + t * dy }
}

function animate() {
  updatePoints()
  drawVoronoi()
  raf = requestAnimationFrame(animate)
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  animate()

  // gui = new GUI()
  // gui.add(params, 'velocity', 0.5, 20, 0.1)
  // gui.add(params, 'resistance', 0.80, 0.999, 0.001)
  // gui.add(params, 'idleDrift', 0, 0.1, 0.001)
  // gui.add(params, 'showPoints')
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  if (gui) gui.destroy()
})
</script>

<template>
  <canvas ref="canvas" class="voronoi-bg"></canvas>
</template>

<style scoped>
.voronoi-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  z-index: -1;
  pointer-events: none;
}
</style>
