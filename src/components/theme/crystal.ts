/* Shared painting helpers for the living scenes: a seeded generator, and sprites drawn once into small canvases. */

/** A small seeded generator, so every visitor gets the same shards and stars. */
export function rngFor(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

/**
 * One crystal fragment, painted once into a sprite: an irregular, elongated outline with a few spikes,
 * split into facets that are shaded by how they face the light, with a thin hot rim. Far fragments are
 * painted blurred, which is what gives the scene some depth of field.
 */
export function crystalSprite(seed: number, blur: number): HTMLCanvasElement {
  const S = 168
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const rng = rngFor(seed)
  const n = 8 + Math.floor(rng() * 3)
  const stretch = 0.42 + rng() * 0.4
  const tilt = rng() * Math.PI
  const R = S * 0.34
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.5
    let rr = 0.5 + rng() * 0.5
    if (rng() < 0.28) rr *= 1.35
    const x = Math.cos(ang) * rr
    const y = Math.sin(ang) * rr * stretch
    pts.push([(x * Math.cos(tilt) - y * Math.sin(tilt)) * R, (x * Math.sin(tilt) + y * Math.cos(tilt)) * R])
  }
  const apex: [number, number] = [(rng() - 0.5) * R * 0.3, (rng() - 0.5) * R * 0.3]
  const lightA = -2.2 + (rng() - 0.5) * 0.6
  const dark = [22, 4, 14]
  const mid = [126, 33, 64]
  const hot = [222, 96, 132]
  g.translate(S / 2, S / 2)
  g.filter = blur ? `blur(${blur}px)` : 'none'
  g.shadowColor = 'rgba(255,70,120,0.32)'
  g.shadowBlur = 7
  for (let i = 0; i < n; i++) {
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const mxp = (p1[0] + p2[0]) / 2 - apex[0]
    const myp = (p1[1] + p2[1]) / 2 - apex[1]
    const face = Math.atan2(myp, mxp)
    const lit = Math.min(1, Math.max(0, 0.5 + 0.5 * Math.cos(face - lightA) + (rng() - 0.5) * 0.3))
    const col = lit > 0.78 ? mix(mid, hot, (lit - 0.78) / 0.22) : mix(dark, mid, lit / 0.78)
    g.beginPath()
    g.moveTo(apex[0], apex[1])
    g.lineTo(p1[0], p1[1])
    g.lineTo(p2[0], p2[1])
    g.closePath()
    g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`
    g.fill()
  }
  g.shadowBlur = 0
  g.lineJoin = 'round'
  for (let i = 0; i < n; i++) {
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    g.strokeStyle = `rgba(255,150,180,${0.10 + 0.30 * Math.max(0, Math.cos(Math.atan2((p1[1] + p2[1]) / 2, (p1[0] + p2[0]) / 2) - lightA))})`
    g.lineWidth = 0.9
    g.beginPath(); g.moveTo(apex[0], apex[1]); g.lineTo(p1[0], p1[1]); g.stroke()
  }
  g.beginPath()
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
  g.strokeStyle = 'rgba(255,120,160,0.42)'
  g.lineWidth = 1.1
  g.stroke()
  return c
}

/** A soft round glow, used for sparks, twinkles and dust. */
export function glowSprite(stops: [number, string][], size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [o, col] of stops) r.addColorStop(o, col)
  g.fillStyle = r
  g.fillRect(0, 0, size, size)
  return c
}
