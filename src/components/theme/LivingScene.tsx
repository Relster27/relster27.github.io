import { useEffect, useRef } from 'react'
import { crystalSprite, glowSprite, rngFor } from './crystal'

/* -------------------------------------------------------------------------- */
/*  Brings the painting to life without replacing it.                          */
/*                                                                            */
/*  The image is drawn by a shader that treats it as three layers, using a     */
/*  mask of the foreground trees: sky, distant trees, and near trees.          */
/*    - the clouds swirl slowly around the rift and drift sideways             */
/*    - the crystal rift breathes, drifts, and sends energy out along its arms  */
/*    - the near trees sway, and the warm light on their edges flickers        */
/*    - mist crawls through the bottom of the forest                           */
/*    - stars twinkle in the open sky; the crystal glints where it is bright   */
/*    - the layers shift against each other as the pointer moves (parallax)    */
/*  A 2D canvas on top adds floating crystal shards, sparks off the rift, and  */
/*  dust. The still image sits underneath as the fallback if WebGL is missing. */
/* -------------------------------------------------------------------------- */

const IMG_W = 1024
const IMG_H = 574
/** Where the rift's heart is in the painting, as fractions (x from the left, y from the bottom). */
const RIFT_U = 0.522
const RIFT_V = 0.704
/** Same crop as `object-cover object-[50%_28%]`, so the fallback image and the shader line up. */
const POS_Y = 0.28

/** The living rift. These are the values tuned in the mockup; everything below stays in open sky, never on the trees. */
const RIFT_DEPTH = 0.1       // how far it swells when it breathes in
const BREATH_SECONDS = 3     // one full breath
const RIFT_ENERGY = 0.05     // brightness of the energy running out of it
const RIFT_MOVE = 0.5        // drift, twist and the arms' undulation
const RIFT_PARTICLES = 0.2   // how many sparks and streaks leave it

/** A quick inhale and a slower exhale, with a faint tremor at the top. */
function breathAt(t: number) {
  const ph = (t / BREATH_SECONDS) % 1
  const ease = (x: number) => x * x * (3 - 2 * x)
  const inh = 0.38
  let b = ph < inh ? ease(ph / inh) : ease(1 - (ph - inh) / (1 - inh))
  b += 0.035 * Math.sin(t * 2.1) * b
  return { b: Math.max(0, Math.min(1, b)), exhaling: ph >= inh }
}

/** The directions of the rift's two arms, as seen by the shader (aspect-corrected, y up). */
const ARMS: [number, number][] = [[0.968, -0.251], [0.925, 0.380]]

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform sampler2D uImg;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform vec4 uCover;
uniform vec2 uMouse;
uniform float uT;
uniform float uBreath;
uniform float uSince;

const float DEPTH = ${RIFT_DEPTH.toFixed(3)};
const float ENERGY = ${RIFT_ENERGY.toFixed(3)};
const float MOVE = ${RIFT_MOVE.toFixed(3)};
const vec2 ARM_A = vec2(${ARMS[0][0]}, ${ARMS[0][1]});
const vec2 ARM_B = vec2(${ARMS[1][0]}, ${ARMS[1][1]});

const float IA = ${(IMG_W / IMG_H).toFixed(4)};
const vec2 RIFT = vec2(${RIFT_U}, ${RIFT_V});

float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + vec2(13.1, 7.7); a *= 0.5; } return s; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

/* a travelling ripple that makes an arm writhe a little, strongest near the heart */
vec2 undul(vec2 d, vec2 dir, float phase) {
  vec2 nrm = vec2(-dir.y, dir.x);
  float along = dot(d, dir), across = dot(d, nrm);
  float a = abs(along);
  float band = (1.0 - smoothstep(0.0, 0.10, abs(across))) * (1.0 - smoothstep(0.10, 0.62, a)) * smoothstep(0.02, 0.16, a);
  return nrm * sin(a * 13.0 - uT * 1.4 + phase) * 0.0065 * band;
}

/* energy running along one arm, from the heart out to the tip */
float stream(vec2 d, vec2 dir) {
  vec2 nrm = vec2(-dir.y, dir.x);
  float along = dot(d, dir), across = dot(d, nrm);
  float a = abs(along);
  float w = 0.05 * (1.0 - smoothstep(0.0, 0.62, a)) + 0.007;
  float band = 1.0 - smoothstep(0.0, w, abs(across + 0.007 * sin(a * 30.0 - uT * 2.0)));
  float fl = fbm(vec2(a * 10.0 - uT * 1.8, across * 34.0 + sign(along) * 3.0));
  return pow(smoothstep(0.35, 0.85, fl), 2.0) * band * (1.0 - smoothstep(0.12, 0.62, a)) * smoothstep(0.01, 0.06, a);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 s = frag / uRes;
  float t = uT;

  /* a slow push in and out, then onto the image's own coordinates */
  float zoom = 1.045 + 0.012 * sin(t * 0.17);
  vec2 sz = (s - 0.5) / zoom + 0.5;
  vec2 uv0 = vec2(uCover.z + sz.x * uCover.x, uCover.w + sz.y * uCover.y);

  /* parallax: near trees travel further than the sky */
  float m0 = texture2D(uMask, uv0).r;
  vec2 uv1 = uv0 + uMouse * vec2(0.0035, 0.0022) * (0.35 + 1.5 * m0);
  float m = texture2D(uMask, uv1).r;

  /* open sky only: not the near trees, and nothing below the treeline */
  float free = (1.0 - m) * smoothstep(0.46, 0.56, uv1.y);

  /* the rift is not still: the body drifts, twists a little, the arms undulate, and it swells as it breathes in */
  vec2 d0 = (uv1 - RIFT) * vec2(IA, 1.0);
  float body = exp(-dot(d0, d0) * 2.4) * MOVE * free;
  float tw = 0.016 * sin(t * 0.45 + 1.3) * body;
  vec2 drr = vec2(cos(tw) * d0.x - sin(tw) * d0.y, sin(tw) * d0.x + cos(tw) * d0.y);
  drr += (undul(drr, ARM_A, 0.0) + undul(drr, ARM_B, 2.1)) * MOVE * free;
  vec2 uvM = RIFT + drr / vec2(IA, 1.0) + vec2(sin(t * 0.37), cos(t * 0.29)) * 0.0035 * body;
  float fall = exp(-dot(d0, d0) * 5.5) * free;
  vec2 uvB = RIFT + (uvM - RIFT) / (1.0 + uBreath * DEPTH * 0.13 * fall);

  /* sky: swirl round the rift, plus a drifting warp. Weighted away from the horizon so the far trees stay put. */
  float sw = (1.0 - m) * smoothstep(0.40, 0.64, uv1.y);
  vec2 d = (uvB - RIFT) * vec2(IA, 1.0);
  float r = length(d);
  float ang = 0.034 * sin(t * 0.22 + r * 4.0) * exp(-r * 2.0);
  vec2 uvS = RIFT + (rot(ang) * d) / vec2(IA, 1.0);
  vec2 wq = uvB * vec2(3.0, 5.0);
  vec2 warp = (vec2(fbm(wq + vec2(t * 0.035, 0.0)), fbm(wq + vec2(5.0, t * 0.03))) - 0.5) * 0.016;
  vec2 uvSky = mix(uvB, uvS + warp, sw);

  /* near trees: a breath of wind, stronger toward the tops */
  float sway = sin(uv1.y * 20.0 + t * 0.7 + uv1.x * 6.0) * 0.0013 + (noise(vec2(t * 0.2, uv1.x * 4.0)) - 0.5) * 0.0014;
  vec2 uvF = uv1 + vec2(sway, 0.0) * smoothstep(0.10, 0.66, uv1.y);

  vec2 uv = clamp(mix(uvSky, uvF, m), 0.002, 0.998);
  vec3 col = texture2D(uImg, uv).rgb;
  float lum = dot(col, vec3(0.3, 0.55, 0.15));

  /* the rift breathes: it fills with light as it swells */
  vec2 dr = (uv - RIFT) * vec2(IA, 1.0);
  float rd = length(dr);
  float rang = atan(dr.y, dr.x);
  float red = smoothstep(0.12, 0.45, col.r - max(col.g, col.b) * 0.75);
  float pulse = 0.5 + 0.5 * sin(t * 1.15);
  col += vec3(0.60, 0.13, 0.22) * red * exp(-rd * 3.2) * (0.16 + 0.22 * pulse) * free;
  col += vec3(0.90, 0.35, 0.30) * exp(-rd * 9.0) * (0.08 + 0.10 * pulse) * free;
  col *= 1.0 + 0.22 * uBreath * DEPTH * exp(-rd * 3.0) * free;
  col += vec3(0.95, 0.30, 0.45) * exp(-rd * 7.0) * (0.06 + 0.24 * uBreath) * ENERGY * free;

  /* a soft ring leaves the heart each time it lets go */
  float ringR = uSince * 0.24;
  float ring = exp(-pow((rd - ringR) / 0.032, 2.0)) * max(0.0, 1.0 - uSince / 3.2);
  col += vec3(1.0, 0.45, 0.62) * ring * 0.30 * ENERGY * smoothstep(0.0, 0.05, rd) * free;

  /* energy streaming out along both arms, and faint rays fanning from the heart */
  float e = stream(dr, ARM_A) + stream(dr, ARM_B);
  col += vec3(1.0, 0.55, 0.72) * e * (0.75 + 0.55 * uBreath) * ENERGY * free;
  col += vec3(0.80, 0.25, 0.42) * e * e * 0.35 * ENERGY * free;
  float ray = pow(noise(vec2(rang * 6.0 + t * 0.08, 2.0)), 3.0) * exp(-rd * 2.3);
  col += vec3(0.95, 0.35, 0.50) * ray * (0.12 + 0.30 * uBreath) * ENERGY * free;

  /* warm edge light on the near trees flickers like it comes from a fire */
  float warm = smoothstep(0.04, 0.28, col.r - col.b) * smoothstep(0.30, 0.65, lum) * m;
  col *= 1.0 + warm * (0.40 * (noise(vec2(uv.x * 40.0, t * 0.9)) - 0.5) + 0.10 * sin(t * 1.15));

  /* mist in the undergrowth */
  float band = (1.0 - smoothstep(0.08, 0.34, uvF.y)) * smoothstep(0.0, 0.10, uvF.y);
  float fog = fbm(vec2(uv.x * 4.2 + t * 0.04, uv.y * 9.0 - t * 0.01));
  col = mix(col, vec3(0.55, 0.32, 0.50), fog * band * 0.22);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

interface Shard { a: number; rx: number; ry: number; sp: number; size: number; rot: number; spin: number; tumble: number; tumbleSp: number; bob: number; depth: number; sprite: number }
interface Mote { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; kind: 0 | 1 }
interface Star { x: number; y: number; size: number; ph: number; sp: number; flare: boolean }
interface Flow { cx: number; cy: number; dx: number; dy: number; nx: number; ny: number; dist: number; v: number; w: number; life: number; max: number; size: number; streak: boolean; ph: number }
interface Glint { x: number; y: number; life: number; max: number; size: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function LivingScene({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const glRef = useRef<HTMLCanvasElement | null>(null)
  const fxRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    const glCanvas = glRef.current
    const fx = fxRef.current
    if (!host || !glCanvas || !fx) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const ctx = fx.getContext('2d')
    const gl = glCanvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
    glCanvas.style.display = 'none'
    if (!gl || !ctx) return

    let alive = true
    let raf = 0
    let ready = false

    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const software = /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(
      dbg ? String(gl.getParameter((dbg as { UNMASKED_RENDERER_WEBGL: number }).UNMASKED_RENDERER_WEBGL) || '') : '',
    )

    /* ---- program ---- */
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('living scene: shader failed —', gl.getShaderInfoLog(sh) || 'no log')
        gl.deleteShader(sh)
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.bindAttribLocation(program, 0, 'aPos')
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const U: Record<string, WebGLUniformLocation | null> = {}
    for (const n of ['uImg', 'uMask', 'uRes', 'uCover', 'uMouse', 'uT', 'uBreath', 'uSince']) U[n] = gl.getUniformLocation(program, n)

    const makeTexture = (img: HTMLImageElement, unit: number) => {
      const tex = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return tex
    }

    /* ---- sizing ---- */
    let cssW = 1
    let cssH = 1
    let dpr = 1
    const cover = { fw: 1, fh: 1, ox: 0, oy: 0 }
    function resize() {
      const r = host!.getBoundingClientRect()
      cssW = Math.max(1, Math.round(r.width))
      cssH = Math.max(1, Math.round(r.height))
      dpr = software ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      glCanvas!.width = Math.round(cssW * dpr)
      glCanvas!.height = Math.round(cssH * dpr)
      fx!.width = Math.round(cssW * dpr)
      fx!.height = Math.round(cssH * dpr)
      const ca = cssW / cssH
      const ia = IMG_W / IMG_H
      cover.fw = ca > ia ? 1 : ca / ia
      cover.fh = ca > ia ? ia / ca : 1
      cover.ox = (1 - cover.fw) / 2
      cover.oy = 1 - (1 - cover.fh) * POS_Y - cover.fh
    }
    resize()

    /** The rift's heart in CSS pixels, so the particles orbit the right spot. */
    const riftPx = () => {
      const sx = (RIFT_U - cover.ox) / cover.fw
      const sy = (RIFT_V - cover.oy) / cover.fh
      const zoom = 1.045
      return { x: ((sx - 0.5) * zoom + 0.5) * cssW, y: (1 - ((sy - 0.5) * zoom + 0.5)) * cssH }
    }

    /* ---- sprites and particle state ---- */
    const sharp = [11, 23, 37, 41].map((sd) => crystalSprite(sd, 0))
    const soft = [53, 67, 71, 89].map((sd) => crystalSprite(sd, 2.2))
    const sparkSprite = glowSprite([[0, 'rgba(255,235,245,1)'], [0.22, 'rgba(255,150,195,0.8)'], [1, 'rgba(255,70,130,0)']])
    const streakSprite = glowSprite([[0, 'rgba(255,200,225,0.95)'], [0.3, 'rgba(255,110,160,0.55)'], [1, 'rgba(255,70,130,0)']])
    const starSprite = glowSprite([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(205,220,255,0.55)'], [1, 'rgba(180,200,255,0)']])
    const bokehSprite = glowSprite([[0, 'rgba(255,170,190,0.05)'], [0.78, 'rgba(255,170,190,0.10)'], [0.93, 'rgba(255,200,210,0.26)'], [1, 'rgba(255,170,190,0)']])
    const shards: Shard[] = Array.from({ length: 12 }, (_, i) => ({
      a: (i / 12) * Math.PI * 2 + i,
      rx: 0.10 + ((i * 37) % 60) / 100,
      ry: 0.05 + ((i * 53) % 40) / 100,
      sp: (0.022 + ((i * 13) % 6) / 160) * (i % 2 ? 1 : -1),
      size: 16 + ((i * 11) % 30),
      rot: i * 1.3,
      spin: (0.18 + (i % 4) * 0.16) * (i % 2 ? 1 : -1),
      tumble: i * 0.9,
      tumbleSp: 0.35 + (i % 5) * 0.12,
      bob: i * 2.1,
      depth: 0.45 + (i % 5) * 0.14,
      sprite: i % 4,
    }))
    const motes: Mote[] = []
    const flow: Flow[] = []
    const stars: Star[] = []
    const glints: Glint[] = []
    let glintSpots: [number, number][] = []
    let maskData: ImageData | null = null

    /* screen <-> painting coordinates, matching the shader's crop and its slow zoom */
    const ZOOM = 1.045
    const uvToCss = (u: number, v: number): [number, number] => {
      const sx = (u - cover.ox) / cover.fw
      const sy = (v - cover.oy) / cover.fh
      return [((sx - 0.5) * ZOOM + 0.5) * cssW, (1 - ((sy - 0.5) * ZOOM + 0.5)) * cssH]
    }
    const cssToUv = (x: number, y: number): [number, number] => {
      const sx = (x / cssW - 0.5) / ZOOM + 0.5
      const sy = (1 - y / cssH - 0.5) / ZOOM + 0.5
      return [cover.ox + sx * cover.fw, cover.oy + sy * cover.fh]
    }
    const maskAt = (u: number, v: number) => {
      if (!maskData) return 1
      const x = Math.min(maskData.width - 1, Math.max(0, Math.floor(u * maskData.width)))
      const y = Math.min(maskData.height - 1, Math.max(0, Math.floor((1 - v) * maskData.height)))
      return maskData.data[(y * maskData.width + x) * 4] / 255
    }

    /** 1 in open sky, 0 over trees and below the treeline: the same rule the shader uses, so nothing glows on the forest. */
    const freeAt = (x: number, y: number) => {
      const [u, v] = cssToUv(x, y)
      const t = Math.min(1, Math.max(0, (v - 0.46) / 0.10))
      return (1 - maskAt(u, v)) * t * t * (3 - 2 * t)
    }

    function spawnFlow() {
      const c = riftPx()
      const arm = ARMS[Math.random() < 0.5 ? 0 : 1]
      const sign = Math.random() < 0.5 ? -1 : 1
      const unit = (cssH / cover.fh) * ZOOM          /* one shader unit, in screen pixels */
      flow.push({
        cx: c.x, cy: c.y, dx: arm[0] * sign, dy: -arm[1] * sign, nx: arm[1] * sign, ny: arm[0] * sign,
        dist: 4, v: (0.22 + Math.random() * 0.34) * unit, w: (Math.random() - 0.5) * 2,
        life: 0, max: 1.1 + Math.random() * 1.1, size: 4 + Math.random() * 7 * Math.max(0.6, cssW / 1440), streak: Math.random() < 0.25, ph: Math.random() * 6.28,
      })
    }

    /** Stars go only where there is open sky, spread by plain random numbers, so they look the same on every GPU. */
    function seedStars() {
      stars.length = 0
      const rnd = rngFor(20260)
      /* Dart throwing with a minimum gap: evenly spread, never clumped, never a grid, and the same for everyone. */
      const gap = Math.max(46, cssW / 24)
      let tries = 0
      while (stars.length < 80 && tries++ < 4000) {
        const x = rnd() * cssW
        const y = rnd() * cssH * 0.5
        const [u, v] = cssToUv(x, y)
        if (v < 0 || v > 1 || u < 0 || u > 1 || maskAt(u, v) > 0.1) continue
        if (stars.some((o) => (o.x - x) ** 2 + (o.y - y) ** 2 < gap * gap)) continue
        stars.push({ x, y, size: 0.8 + rnd() * 1.5, ph: rnd() * 6.28, sp: 0.5 + rnd() * 1.8, flare: rnd() < 0.16 })
      }
    }

    /** Bright, reddish facets of the crystal in the painting: the only places a glint is allowed to appear. */
    function findGlintSpots(img: HTMLImageElement) {
      const c = document.createElement('canvas')
      c.width = IMG_W
      c.height = IMG_H
      const g = c.getContext('2d')!
      g.drawImage(img, 0, 0, IMG_W, IMG_H)
      const x0 = 130, y0 = 20, w = 780, h = 330
      const d = g.getImageData(x0, y0, w, h).data
      glintSpots = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          if (d[i] > 150 && d[i] - d[i + 1] > 55 && d[i] > d[i + 2] * 0.9) glintSpots.push([(x0 + x) / IMG_W, 1 - (y0 + y) / IMG_H])
        }
      }
    }

    function spawnMote(kind: 0 | 1) {
      const c = riftPx()
      if (kind === 0) {
        const a = Math.random() * Math.PI * 2
        const dist = (0.02 + Math.random() * 0.34) * cssW
        motes.push({ x: c.x + Math.cos(a) * dist, y: c.y + Math.sin(a) * dist * 0.45, vx: (Math.random() - 0.5) * 10, vy: -(4 + Math.random() * 16), life: 0, max: 2.4 + Math.random() * 3.2, size: 5 + Math.random() * 9, kind })
      } else {
        motes.push({ x: Math.random() * cssW, y: cssH * (0.5 + Math.random() * 0.5), vx: 3 + Math.random() * 8, vy: -(2 + Math.random() * 7), life: 0, max: 8 + Math.random() * 8, size: 8 + Math.random() * 30, kind })
      }
    }

    let mx = 0
    let my = 0
    let tmx = 0
    let tmy = 0
    const onMove = (e: PointerEvent) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2
      tmy = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    /** A four-point flare: a soft core and two thin crossed rays. */
    function flare(x: number, y: number, size: number, alpha: number, sprite: HTMLCanvasElement) {
      ctx!.globalAlpha = alpha
      ctx!.drawImage(sprite, x - size, y - size, size * 2, size * 2)
      ctx!.strokeStyle = 'rgba(255,235,245,0.9)'
      ctx!.lineWidth = 0.8
      ctx!.beginPath()
      ctx!.moveTo(x - size * 2.4, y); ctx!.lineTo(x + size * 2.4, y)
      ctx!.moveTo(x, y - size * 2.4); ctx!.lineTo(x, y + size * 2.4)
      ctx!.stroke()
    }

    function drawFx(t: number, dt: number) {
      const c = riftPx()
      const k = Math.max(0.6, cssW / 1440)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, cssW, cssH)

      /* out-of-focus dust, behind everything */
      ctx!.globalCompositeOperation = 'lighter'
      for (let i = motes.length - 1; i >= 0; i--) {
        const m2 = motes[i]
        m2.life += dt
        if (m2.life >= m2.max) { motes.splice(i, 1); continue }
        m2.x += (m2.vx + Math.sin(t * 0.7 + i) * 4) * dt
        m2.y += m2.vy * dt
        if (m2.kind === 1) {
          ctx!.globalAlpha = Math.sin((Math.PI * m2.life) / m2.max) * 0.9
          ctx!.drawImage(bokehSprite, m2.x - m2.size / 2, m2.y - m2.size / 2, m2.size, m2.size)
        }
      }

      /* stars twinkle with a slow, uneven pulse */
      for (const st of stars) {
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * st.sp + st.ph), 3)
        const sz = st.size * 3.2
        ctx!.globalAlpha = 0.18 + 0.82 * tw
        ctx!.drawImage(starSprite, st.x - sz, st.y - sz, sz * 2, sz * 2)
        if (st.flare && tw > 0.55) flare(st.x, st.y, st.size * 1.6, (tw - 0.5) * 1.4, starSprite)
      }

      /* crystal fragments, tumbling: they turn edge-on and back, which is what makes them read as solid */
      ctx!.globalCompositeOperation = 'source-over'
      for (const s of shards) {
        s.a += s.sp * dt
        s.rot += s.spin * dt
        s.tumble += s.tumbleSp * dt
        const swell = 1 + breath * RIFT_DEPTH * 0.14               /* pushed outward as the rift inflates */
        const x = c.x + Math.cos(s.a) * s.rx * cssW * 0.5 * swell - mx * 12 * s.depth
        const y = c.y + Math.sin(s.a) * s.ry * cssH * 0.5 * swell + Math.sin(t * 0.6 + s.bob) * 7 - my * 7 * s.depth
        const sz = s.size * k * (0.6 + 0.6 * s.depth)
        const face = Math.abs(Math.cos(s.tumble))
        const sprite = s.depth < 0.8 ? soft[s.sprite] : sharp[s.sprite]
        ctx!.save()
        ctx!.translate(x, y)
        ctx!.rotate(s.rot)
        ctx!.scale(0.35 + 0.65 * face, 1)
        ctx!.globalAlpha = (0.55 + 0.4 * s.depth) * (0.15 + 0.85 * freeAt(x, y))
        ctx!.drawImage(sprite, -sz, -sz, sz * 2, sz * 2)
        ctx!.restore()
        if (s.depth >= 0.8 && face > 0.92) {                       /* a facet catches the rift's light */
          ctx!.globalCompositeOperation = 'lighter'
          ctx!.globalAlpha = (face - 0.92) * 7 * 0.5
          ctx!.drawImage(sparkSprite, x - sz * 0.45, y - sz * 0.45, sz * 0.9, sz * 0.9)
          ctx!.globalCompositeOperation = 'source-over'
        }
      }

      /* sparks and glints, additive, on top */
      ctx!.globalCompositeOperation = 'lighter'
      for (const m2 of motes) {
        if (m2.kind !== 0) continue
        const f = Math.sin((Math.PI * m2.life) / m2.max)
        ctx!.globalAlpha = 0.85 * f
        ctx!.drawImage(sparkSprite, m2.x - m2.size / 2, m2.y - m2.size / 2, m2.size, m2.size)
      }
      for (let i = glints.length - 1; i >= 0; i--) {
        const gl2 = glints[i]
        gl2.life += dt
        if (gl2.life >= gl2.max) { glints.splice(i, 1); continue }
        const f = Math.sin((Math.PI * gl2.life) / gl2.max)
        flare(gl2.x, gl2.y, gl2.size * k * (0.6 + 0.5 * f), f * 0.95, sparkSprite)
      }
      /* energy leaving the heart along the arms */
      for (let i = flow.length - 1; i >= 0; i--) {
        const f2 = flow[i]
        f2.life += dt
        if (f2.life >= f2.max) { flow.splice(i, 1); continue }
        f2.dist += f2.v * dt
        f2.v *= 1 - 0.18 * dt
        const wob = Math.sin(f2.dist * 0.05 + f2.ph) * 6 * f2.w
        const x = f2.cx + f2.dx * f2.dist + f2.nx * wob
        const y = f2.cy + f2.dy * f2.dist + f2.ny * wob
        ctx!.globalAlpha = 0.9 * Math.sin((Math.PI * f2.life) / f2.max) * freeAt(x, y)
        if (f2.streak) {
          ctx!.save()
          ctx!.translate(x, y)
          ctx!.rotate(Math.atan2(f2.dy, f2.dx))
          const L = f2.size * 4.2
          ctx!.drawImage(streakSprite, -L, -f2.size * 0.9, L * 2, f2.size * 1.8)
          ctx!.restore()
        } else {
          ctx!.drawImage(sparkSprite, x - f2.size, y - f2.size, f2.size * 2, f2.size * 2)
        }
      }
      ctx!.globalAlpha = 1
      ctx!.globalCompositeOperation = 'source-over'
    }

    /* ---- loop ---- */
    let breath = 0
    let sinceExhale = 9
    let wasExhaling = false
    let flowAcc = 0
    let T = reduced ? 3 : 0
    let last = performance.now()
    let visible = true

    function drawGl() {
      gl!.useProgram(program)
      gl!.viewport(0, 0, glCanvas!.width, glCanvas!.height)
      gl!.uniform1i(U.uImg, 0)
      gl!.uniform1i(U.uMask, 1)
      gl!.uniform2f(U.uRes, glCanvas!.width, glCanvas!.height)
      gl!.uniform4f(U.uCover, cover.fw, cover.fh, cover.ox, cover.oy)
      gl!.uniform2f(U.uMouse, mx, -my)
      gl!.uniform1f(U.uT, T)
      gl!.uniform1f(U.uBreath, breath)
      gl!.uniform1f(U.uSince, sinceExhale)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    }

    function tick(now: number) {
      if (!alive) return
      raf = requestAnimationFrame(tick)
      if (!visible || !ready) { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      T += dt
      mx += (tmx - mx) * 0.05
      my += (tmy - my) * 0.05
      const br = breathAt(T)
      breath = br.b
      if (br.exhaling && !wasExhaling) sinceExhale = 0
      wasExhaling = br.exhaling
      sinceExhale += dt
      flowAcc += dt * RIFT_PARTICLES * (6 + (br.exhaling ? 34 : 8) * (0.4 + 0.6 * br.b))      /* more of it as it lets go */
      while (flowAcc >= 1) { flowAcc -= 1; if (flow.length < 160) spawnFlow() }
      drawGl()
      let sparks = 0
      for (const m3 of motes) if (m3.kind === 0) sparks++
      if (sparks < 22 && Math.random() < dt * 8) spawnMote(0)
      if (motes.length - sparks < 22 && Math.random() < dt * 3) spawnMote(1)
      if (glints.length < 14 && glintSpots.length && Math.random() < dt * 7) {
        const [u, v] = glintSpots[(Math.random() * glintSpots.length) | 0]
        const [gx, gy] = uvToCss(u, v)
        glints.push({ x: gx, y: gy, life: 0, max: 0.45 + Math.random() * 0.7, size: 3 + Math.random() * 5 })
      }
      drawFx(T, dt)
    }

    /** 4K for big or high-density screens, 2K otherwise: the texture never has to shrink by much, so it stays sharp. */
    const pickImage = () => {
      /* the <img> underneath already chose a file for this screen; reuse it so the browser downloads one, not two */
      const chosen = hostRef.current?.querySelector('img')?.currentSrc ?? ''
      if (chosen) return chosen.includes('homepage-4k') && !software && (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) >= 4096 ? '/images/homepage-4k.webp' : '/images/homepage-2k.webp'
      const need = Math.max(window.innerWidth * 1.05, window.innerHeight * (IMG_W / IMG_H) * 1.05) * Math.min(window.devicePixelRatio || 1, 2)
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
      return !software && need > 2100 && maxTex >= 4096 ? '/images/homepage-4k.webp' : '/images/homepage-2k.webp'
    }

    Promise.all([loadImage(pickImage()), loadImage('/images/homepage-mask.png')])
      .then(([img, mask]) => {
        if (!alive) return
        makeTexture(img, 0)
        makeTexture(mask, 1)
        const mc = document.createElement('canvas')
        mc.width = 256
        mc.height = Math.round((256 * IMG_H) / IMG_W)
        const mctx = mc.getContext('2d')
        if (mctx) {
          mctx.drawImage(mask, 0, 0, mc.width, mc.height)
          maskData = mctx.getImageData(0, 0, mc.width, mc.height)
        }
        findGlintSpots(img)
        seedStars()
        ready = true
        glCanvas.style.display = ''
        if (reduced) drawGl()
      })
      .catch(() => { /* the still image underneath stays */ })

    if (!reduced) raf = requestAnimationFrame(tick)

    const ro = new ResizeObserver(() => { resize(); if (ready) seedStars(); if (reduced && ready) drawGl() })
    ro.observe(host)
    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true }, { threshold: 0 })
    io.observe(host)
    const onVis = () => { visible = !document.hidden; last = performance.now() }
    document.addEventListener('visibilitychange', onVis)
    const onLost = (e: Event) => { e.preventDefault(); ready = false; glCanvas.style.display = 'none' }
    glCanvas.addEventListener('webglcontextlost', onLost)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVis)
      glCanvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteProgram(program)
      // The context stays alive: StrictMode runs this effect twice on the same canvas.
    }
  }, [])

  return (
    <div ref={hostRef} aria-hidden="true" className={`overflow-hidden ${className}`}>
      {/* the still painting: what you see until the scene is ready, and if WebGL is unavailable */}
      <img
        src="/images/homepage-2k.webp"
        srcSet="/images/homepage-2k.webp 2048w, /images/homepage-4k.webp 4096w"
        sizes="max(100vw, calc(100vh * 1.784))"
        alt=""
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[50%_28%]"
      />
      <canvas ref={glRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={fxRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  )
}
