import { useEffect, useRef } from 'react'
import { crystalSprite, glowSprite, rngFor } from './crystal'

/* -------------------------------------------------------------------------- */
/*  The backdrop for the inner pages: a dusk of its own, made from the         */
/*  homepage's palette (plum sky, rose horizon, crimson crystal) but not the   */
/*  homepage painting.                                                         */
/*                                                                            */
/*  A shader draws it: clouds swirling round a rift that sits just off-screen, */
/*  thin fracture lines glowing out of it, three layers of hazy ridges with a  */
/*  jagged, crystalline front ridge, and mist along the ground. A 2D canvas    */
/*  adds stars, drifting crystal fragments and out-of-focus dust.              */
/*  The rift sits in a different corner on each page and glides there when     */
/*  you navigate.                                                              */
/* -------------------------------------------------------------------------- */

/** Where the rift sits for each page: x from the left, y from the bottom, in screen fractions. May lie outside 0..1. */
const RIFTS: Record<string, [number, number]> = {
  '/about': [0.08, 0.96],
  '/projects': [0.92, 0.98],
  '/contact': [0.5, 1.07],
}
const DEFAULT_RIFT: [number, number] = [0.5, 1.04]

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform vec2 uMouse;
uniform vec2 uRift;

float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(13.1, 7.7); a *= 0.5; } return s; }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 s = frag / uRes;
  float asp = uRes.x / uRes.y;
  float t = uT;

  vec2 p = vec2((s.x - 0.5) * asp, s.y - 0.5) + uMouse * vec2(0.012, 0.008);
  vec2 rp = vec2((uRift.x - 0.5) * asp, uRift.y - 0.5);
  vec2 d = p - rp;
  float r = length(d);
  float ang = atan(d.y, d.x);
  float pulse = 0.5 + 0.5 * sin(t * 0.8);

  /* sky: plum overhead, rose at the horizon */
  vec3 top = vec3(0.050, 0.024, 0.078);
  vec3 mid = vec3(0.190, 0.095, 0.260);
  vec3 low = vec3(0.500, 0.180, 0.300);
  vec3 col = mix(low, mid, smoothstep(0.18, 0.62, s.y));
  col = mix(col, top, smoothstep(0.55, 1.0, s.y));

  /* clouds swirl round the rift and drift very slowly */
  vec2 q = vec2(ang * 1.2 + r * 3.0 - t * 0.015, r * 2.0 - t * 0.010);
  float cl = fbm(q * vec2(1.6, 1.0) + 2.0 * fbm(q * 1.5 + t * 0.01));
  float cm = smoothstep(0.35, 0.75, cl);
  vec3 cloud = mix(vec3(0.085, 0.045, 0.125), vec3(0.45, 0.20, 0.32), exp(-r * 1.8) * 0.9 + 0.08);
  col = mix(col, cloud, cm * 0.78);

  /* the rift's glow breathes */
  col += vec3(0.75, 0.16, 0.30) * exp(-r * 3.6) * (0.45 + 0.15 * pulse);
  col += vec3(0.95, 0.45, 0.55) * exp(-r * 11.0) * (0.30 + 0.10 * pulse);

  /* fracture lines running out of it: thin, steady, never flashing */
  vec2 vq = vec2(ang * 3.4 + 2.2 * fbm(d * 3.0), r * 2.6);
  float vein = 1.0 - abs(2.0 * fbm(vq) - 1.0);
  float vmask = exp(-r * 1.5) * smoothstep(0.06, 0.30, r);
  col += vec3(0.95, 0.35, 0.50) * smoothstep(0.93, 1.0, vein) * vmask * (0.42 + 0.18 * pulse);
  col += vec3(0.70, 0.15, 0.35) * smoothstep(0.88, 1.0, vein) * vmask * 0.12;

  /* a rose haze sitting on the horizon, behind the ridges */
  col += vec3(0.50, 0.14, 0.25) * exp(-abs(s.y - 0.27) * 5.0) * 0.22;

  /* ridges: far and soft, then nearer and darker, then a jagged crystalline front */
  float y0 = 0.20 + 0.10 * fbm(vec2(p.x * 1.6 + 3.0, 1.0));
  float c0 = smoothstep(0.0, 0.004, y0 - s.y);
  col = mix(col, mix(vec3(0.34, 0.15, 0.27), vec3(0.14, 0.07, 0.19), 0.45), c0);

  float y1 = 0.13 + 0.09 * fbm(vec2(p.x * 2.6 + 7.0, 3.0));
  float c1 = smoothstep(0.0, 0.004, y1 - s.y);
  col = mix(col, vec3(0.085, 0.040, 0.125), c1);

  float peaks = 1.0 - abs(2.0 * noise(vec2(p.x * 5.0 + 11.0, 5.0)) - 1.0);
  float y2 = 0.050 + 0.095 * peaks * (0.55 + 0.9 * fbm(vec2(p.x * 1.9 + 5.0, 9.0)));
  float c2 = smoothstep(0.0, 0.003, y2 - s.y);
  col = mix(col, vec3(0.032, 0.016, 0.050), c2);
  col += vec3(0.85, 0.30, 0.45) * smoothstep(0.006, 0.0, abs(s.y - y2)) * 0.30 * exp(-abs(p.x - rp.x) * 0.9);

  /* mist crawling along the ground */
  float fog = fbm(vec2(p.x * 2.4 + t * 0.020, s.y * 7.0 - t * 0.004));
  col = mix(col, vec3(0.50, 0.26, 0.40), fog * (1.0 - smoothstep(0.06, 0.32, s.y)) * 0.20);

  vec2 v = s - 0.5;
  col *= 1.0 - 0.55 * dot(v, v);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

interface Star { x: number; y: number; size: number; ph: number; sp: number; flare: boolean }
interface Frag { x: number; y: number; vx: number; size: number; rot: number; spin: number; tumble: number; tumbleSp: number; bob: number; depth: number; sprite: number }
interface Dust { x: number; y: number; vx: number; vy: number; size: number; life: number; max: number }

export function DuskBackdrop({ variant }: { variant: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const glRef = useRef<HTMLCanvasElement | null>(null)
  const fxRef = useRef<HTMLCanvasElement | null>(null)
  const targetRef = useRef<[number, number]>(DEFAULT_RIFT)
  targetRef.current = RIFTS[variant] ?? DEFAULT_RIFT

  useEffect(() => {
    const host = hostRef.current
    const glCanvas = glRef.current
    const fx = fxRef.current
    if (!host || !glCanvas || !fx) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const ctx = fx.getContext('2d')
    const gl = glCanvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
    if (!gl || !ctx) { glCanvas.style.display = 'none'; return }

    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const software = /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(
      dbg ? String(gl.getParameter((dbg as { UNMASKED_RENDERER_WEBGL: number }).UNMASKED_RENDERER_WEBGL) || '') : '',
    )

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error('backdrop: shader failed —', gl.getShaderInfoLog(sh) || 'no log'); gl.deleteShader(sh); return null }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) { glCanvas.style.display = 'none'; return }
    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.bindAttribLocation(program, 0, 'aPos')
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { glCanvas.style.display = 'none'; return }
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const U: Record<string, WebGLUniformLocation | null> = {}
    for (const n of ['uRes', 'uT', 'uMouse', 'uRift']) U[n] = gl.getUniformLocation(program, n)

    let alive = true
    let raf = 0
    let cssW = 1
    let cssH = 1
    let dpr = 1
    const stars: Star[] = []
    const frags: Frag[] = []
    const dust: Dust[] = []

    const sharp = [101, 113, 127].map((sd) => crystalSprite(sd, 0))
    const soft = [131, 149, 163].map((sd) => crystalSprite(sd, 2.4))
    const starSprite = glowSprite([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(215,205,255,0.55)'], [1, 'rgba(190,180,255,0)']])
    const bokeh = glowSprite([[0, 'rgba(230,150,190,0.05)'], [0.78, 'rgba(230,150,190,0.09)'], [0.93, 'rgba(255,190,215,0.22)'], [1, 'rgba(230,150,190,0)']])

    function seed() {
      stars.length = 0
      frags.length = 0
      const rnd = rngFor(7311)
      const gap = Math.max(52, cssW / 20)
      let tries = 0
      while (stars.length < 70 && tries++ < 4000) {
        const x = rnd() * cssW
        const y = rnd() * cssH * 0.55
        if (stars.some((o) => (o.x - x) ** 2 + (o.y - y) ** 2 < gap * gap)) continue
        stars.push({ x, y, size: 0.8 + rnd() * 1.4, ph: rnd() * 6.28, sp: 0.5 + rnd() * 1.6, flare: rnd() < 0.14 })
      }
      for (let i = 0; i < 7; i++) {
        frags.push({
          x: rnd() * cssW, y: cssH * (0.12 + rnd() * 0.55), vx: (4 + rnd() * 8) * (rnd() < 0.5 ? -1 : 1),
          size: 16 + rnd() * 30, rot: rnd() * 6.28, spin: (0.15 + rnd() * 0.3) * (rnd() < 0.5 ? -1 : 1),
          tumble: rnd() * 6.28, tumbleSp: 0.3 + rnd() * 0.4, bob: rnd() * 6.28, depth: 0.45 + rnd() * 0.55, sprite: i % 3,
        })
      }
    }

    function resize() {
      const r = host!.getBoundingClientRect()
      cssW = Math.max(1, Math.round(r.width))
      cssH = Math.max(1, Math.round(r.height))
      dpr = software ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
      const k = software ? 0.5 : 1
      glCanvas!.width = Math.max(2, Math.round(cssW * dpr * k))
      glCanvas!.height = Math.max(2, Math.round(cssH * dpr * k))
      fx!.width = Math.round(cssW * dpr)
      fx!.height = Math.round(cssH * dpr)
      seed()
    }
    resize()

    let mx = 0, my = 0, tmx = 0, tmy = 0
    const onMove = (e: PointerEvent) => { tmx = (e.clientX / window.innerWidth - 0.5) * 2; tmy = (e.clientY / window.innerHeight - 0.5) * 2 }
    window.addEventListener('pointermove', onMove, { passive: true })

    const rift: [number, number] = [...targetRef.current]
    let T = reduced ? 5 : 0
    let last = performance.now()
    let visible = true

    function drawGl() {
      gl!.useProgram(program)
      gl!.viewport(0, 0, glCanvas!.width, glCanvas!.height)
      gl!.uniform2f(U.uRes, glCanvas!.width, glCanvas!.height)
      gl!.uniform1f(U.uT, T)
      gl!.uniform2f(U.uMouse, mx, -my)
      gl!.uniform2f(U.uRift, rift[0], rift[1])
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    }

    function drawFx(dt: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, cssW, cssH)

      ctx!.globalCompositeOperation = 'lighter'
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i]
        d.life += dt
        if (d.life >= d.max) { dust.splice(i, 1); continue }
        d.x += (d.vx + Math.sin(T * 0.6 + i) * 3) * dt
        d.y += d.vy * dt
        ctx!.globalAlpha = Math.sin((Math.PI * d.life) / d.max) * 0.9
        ctx!.drawImage(bokeh, d.x - d.size / 2, d.y - d.size / 2, d.size, d.size)
      }
      for (const st of stars) {
        const tw = Math.pow(0.5 + 0.5 * Math.sin(T * st.sp + st.ph), 3)
        const sz = st.size * 3.2
        ctx!.globalAlpha = 0.16 + 0.76 * tw
        ctx!.drawImage(starSprite, st.x - sz, st.y - sz, sz * 2, sz * 2)
        if (st.flare && tw > 0.6) {
          ctx!.globalAlpha = (tw - 0.55) * 1.2
          ctx!.strokeStyle = 'rgba(245,235,255,0.9)'
          ctx!.lineWidth = 0.8
          ctx!.beginPath()
          ctx!.moveTo(st.x - st.size * 3.4, st.y); ctx!.lineTo(st.x + st.size * 3.4, st.y)
          ctx!.moveTo(st.x, st.y - st.size * 3.4); ctx!.lineTo(st.x, st.y + st.size * 3.4)
          ctx!.stroke()
        }
      }

      ctx!.globalCompositeOperation = 'source-over'
      for (const f of frags) {
        f.x += f.vx * dt
        f.rot += f.spin * dt
        f.tumble += f.tumbleSp * dt
        const m = f.size * 2
        if (f.x < -m) f.x = cssW + m
        if (f.x > cssW + m) f.x = -m
        const y = f.y + Math.sin(T * 0.5 + f.bob) * 9 - my * 8 * f.depth
        const x = f.x - mx * 14 * f.depth
        const face = Math.abs(Math.cos(f.tumble))
        const sz = f.size * (0.6 + 0.6 * f.depth)
        ctx!.save()
        ctx!.translate(x, y)
        ctx!.rotate(f.rot)
        ctx!.scale(0.35 + 0.65 * face, 1)
        ctx!.globalAlpha = 0.42 + 0.34 * f.depth
        ctx!.drawImage(f.depth < 0.8 ? soft[f.sprite] : sharp[f.sprite], -sz, -sz, sz * 2, sz * 2)
        ctx!.restore()
      }
      ctx!.globalAlpha = 1
    }

    function tick(now: number) {
      if (!alive) return
      raf = requestAnimationFrame(tick)
      if (!visible) { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      T += dt
      mx += (tmx - mx) * 0.05
      my += (tmy - my) * 0.05
      const k = 1 - Math.exp(-dt * 2.2)
      rift[0] += (targetRef.current[0] - rift[0]) * k
      rift[1] += (targetRef.current[1] - rift[1]) * k
      if (dust.length < 14 && Math.random() < dt * 2) {
        dust.push({ x: Math.random() * cssW, y: cssH * (0.45 + Math.random() * 0.55), vx: 3 + Math.random() * 7, vy: -(2 + Math.random() * 6), size: 10 + Math.random() * 34, life: 0, max: 9 + Math.random() * 9 })
      }
      drawGl()
      drawFx(dt)
    }

    if (reduced) {
      drawGl()
      drawFx(0)
    } else {
      raf = requestAnimationFrame(tick)
    }

    const ro = new ResizeObserver(() => { resize(); if (reduced) { drawGl(); drawFx(0) } })
    ro.observe(host)
    const onVis = () => { visible = !document.hidden; last = performance.now() }
    document.addEventListener('visibilitychange', onVis)
    const onLost = (e: Event) => { e.preventDefault(); glCanvas.style.display = 'none' }
    glCanvas.addEventListener('webglcontextlost', onLost)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVis)
      glCanvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteProgram(program)
      // The context stays alive: StrictMode runs this effect twice on the same canvas.
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d0614 0%, #2a1636 62%, #6a2a46 100%)' }}
    >
      <canvas ref={glRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={fxRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
