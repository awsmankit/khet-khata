// Tall family: colocasia (elephant ears), elephant foot yam (one mottled stalk with an
// umbrella of leaflets) and tapioca (knobby woody stems, palmate leaves at the top).
import * as THREE from 'three'
import { lerp, merge, smooth } from '../../engine/geometry.js'
import { V, ramp, shade, tone } from '../../engine/plantKit.js'
import { TAU, cornerCamera, grow, leaf, noise2, out, palmLeaf, put, ridgeField, stem } from './kit.js'

const c1 = new THREE.Color()

/* ---------------------------------------------------------------- colocasia */
function colocasiaVariant(random) {
  const stems = []
  const leaves = []
  const count = random() < 0.5 ? 5 : 6
  const start = random() * TAU
  for (let k = 0; k < count; k += 1) {
    const f = k / (count - 1)
    const az = start + k * 2.4 + random.gauss() * 0.15
    const length = lerp(0.85, 1.05, f) * random.range(0.88, 1.08)
    const lean = lerp(0.45, 0.15, f)
    const top = out(az, Math.sin(lean) * length).add(V(0, Math.cos(lean) * length, 0))
    const points = [out(az, 0.02), out(az, 0.06).add(V(0, length * 0.45, 0)), top]
    stems.push(stem(points, (t) => lerp(0.017, 0.007, t), { radial: 6, tubular: 6, colorFn: shade(0.8, 1.05) }))
    const size = lerp(1, 0.85, f) * random.range(0.9, 1.1)
    const blade = leaf({
      length: 0.48 * size, width: 0.4 * size, shape: 'heart', lobe: 0.32, rise: random.range(-0.75, -0.35), droop: 0.45, segments: 9, across: 4, cup: -0.12, fold: 0.04,
      colorFn: (c, t, u) => c.setScalar(lerp(0.9, 1, t) * (Math.abs(u) < 0.13 ? 1.18 : 1) * (Math.abs(Math.sin((t * 6 + Math.abs(u) * 2.2) * Math.PI)) < 0.12 ? 1.08 : 1) * lerp(1, 0.86, Math.abs(u))), random,
    })
    leaves.push(put(blade, top, az))
  }
  // a young leaf still furled in the centre
  const furled = leaf({ length: 0.3, width: 0.08, shape: 'lance', rise: 1.45, droop: 0.3, segments: 5, across: 1, cup: 0.9, random })
  leaves.push(put(furled, V(0, 0.55, 0), random() * TAU))
  stems.push(stem([V(), V(0, 0.3, 0), V(0, 0.56, 0)], (t) => lerp(0.014, 0.008, t), { radial: 5, tubular: 3, colorFn: shade(0.8, 1.05) }))
  return { stems: merge(stems), leaves: merge(leaves) }
}

function buildColocasia(ctx) {
  const { random } = ctx
  const plot = { width: 10, depth: 12 }
  const { spots } = ridgeField(ctx, plot, { pitch: 0.75, gap: 0.5, height: 0.14, color: '#7e5f45' })
  const variants = [0, 1, 2].map(() => colocasiaVariant(random))
  const scale = (g) => {
    const w = lerp(0.15, 1, smooth(0, 0.5, g))
    return [w, lerp(0.1, 1, smooth(0, 0.55, g)) * lerp(1, 0.8, smooth(0.86, 1, g)), w]
  }
  grow(ctx, {
    spots, variants, wind: { strength: 0.12, flutter: 0.025, refHeight: 1.1, ground: 0 }, scale,
    layers: {
      stems: { color: (c, g, entry) => tone(ramp(c, g, [[0, '#7c9a5a'], [0.5, '#6d7a52'], [1, '#7a7050']]), entry) },
      leaves: { materialOptions: { roughness: 0.42, metalness: 0.02 }, color: (c, g, entry) => tone(ramp(c, g, [[0, '#6a9a52'], [0.4, '#4a7f3e'], [0.82, '#4c7c3e'], [0.92, '#8f9450'], [1, '#a59a5a']]), entry) },
    },
  })
  return { plot: { ...plot, rowGap: 0.75 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.95, back: 2.2, targetY: 0.6 }) }
}

/* ---------------------------------------------------------------- elephant foot yam */
function yamVariant(random) {
  const stalks = []
  const rachis = []
  const leaves = []
  const height = random.range(1.0, 1.4)
  const top = V(random.gauss() * 0.04, height, random.gauss() * 0.04)
  const seed = random() * 100
  const mottle = (c, x, y, z) => {
    const n = noise2((Math.atan2(z, x) + 3.2) * 3.5 + seed, y * 9)
    const m = noise2((Math.atan2(z, x) + 3.2) * 9 + seed, y * 26)
    c.set('#6f7d4c')
    if (n > 0.62) c.lerp(c1.set('#2f3a26'), 0.85)
    else if (m > 0.78) c.lerp(c1.set('#d8dcc4'), 0.75)
    else if (n < 0.25) c.lerp(c1.set('#8f9a6a'), 0.6)
  }
  stalks.push(stem([V(), V(random.gauss() * 0.02, height * 0.5, random.gauss() * 0.02), top], (t) => lerp(0.04, 0.024, t), { radial: 9, tubular: 8, colorFn: mottle }))
  const leaflet = (size, yaw, at) => leaves.push(put(leaf({ length: 0.17 * size, width: 0.08 * size, shape: 'ovate', rise: 0.22, droop: 0.38, segments: 4, across: 2, cup: 0.12, random }), at, yaw))
  const branch = (from, az, length, depth, rise) => {
    const end = from.clone().add(out(az, length)).add(V(0, length * rise, 0))
    const mid = from.clone().lerp(end, 0.5).add(V(0, length * 0.06, 0))
    rachis.push(stem([from, mid, end], (t) => lerp(0.012 / (depth + 1), 0.009 / (depth + 1), t), { radial: 4, tubular: 3, colorFn: mottle }))
    const curve = new THREE.CatmullRomCurve3([from, mid, end])
    if (depth < 2) {
      branch(end, az - random.range(0.35, 0.55), length * random.range(0.7, 0.85), depth + 1, rise - 0.12)
      branch(end, az + random.range(0.35, 0.55), length * random.range(0.7, 0.85), depth + 1, rise - 0.12)
      if (depth === 1) for (const side of [-1, 1]) for (const t of [0.35, 0.75]) leaflet(0.85, az + side * 1.1, curve.getPointAt(t))
    } else {
      for (let k = 0; k < 4; k += 1) for (const side of [-1, 1]) leaflet(random.range(0.85, 1.1), az + side * 1.0 + random.gauss() * 0.1, curve.getPointAt(0.15 + k * 0.25))
      leaflet(1.15, az, end)
    }
  }
  const start = random() * TAU
  for (let k = 0; k < 3; k += 1) branch(top, start + (k / 3) * TAU + random.gauss() * 0.15, random.range(0.12, 0.15), 0, 0.14)
  return { stalks: merge([...stalks, ...rachis]), leaves: merge(leaves) }
}

function buildYam(ctx) {
  const { random } = ctx
  const plot = { width: 12, depth: 14 }
  const { spots } = ridgeField(ctx, plot, { pitch: 0.9, gap: 0.9, height: 0.15, color: '#80614a' })
  spots.forEach((spot) => { spot.offset = random.gauss() * 0.04 })
  const variants = [0, 1, 2].map(() => yamVariant(random))
  const scale = (g) => {
    const w = lerp(0.08, 1, smooth(0.08, 0.4, g))
    return [w * lerp(1, 0.85, smooth(0.86, 1, g)), lerp(0.03, 1, smooth(0.02, 0.32, g)) * lerp(1, 0.7, smooth(0.88, 1, g)), w * lerp(1, 0.85, smooth(0.86, 1, g))]
  }
  grow(ctx, {
    spots, variants, wind: { strength: 0.1, flutter: 0.02, refHeight: 1.4, ground: 0 }, scale,
    layers: {
      stalks: { color: (c, g, entry) => tone(ramp(c, g, [[0, '#ffffff'], [0.85, '#f4f4ee'], [1, '#d8ccaa']]), entry) },
      leaves: { materialOptions: { roughness: 0.55 }, color: (c, g, entry) => tone(ramp(c, g, [[0, '#7aa452'], [0.3, '#4a7e36'], [0.8, '#4c7c38'], [0.9, '#a09a48'], [1, '#a88a50']]), entry) },
    },
  })
  return { plot: { ...plot, rowGap: 0.9 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 3.0, back: 2.6, targetY: 0.7 }) }
}

/* ---------------------------------------------------------------- tapioca */
function tapiocaVariant(random) {
  const stems = []
  const petioles = []
  const leaves = []
  const bark = (c, x, y, z) => c.set('#8c806a').multiplyScalar(0.85 + 0.25 * noise2(x * 60 + y * 9, z * 60))
  const knobby = (r0, r1, length) => (t) => lerp(r0, r1, t) * (1 + 0.3 * Math.pow(Math.max(0, Math.cos(((t * length) / 0.07) * TAU)), 10))
  const crown = (tip, az) => {
    // palmate leaves on long red petioles clustered on the upper third of the plant
    for (let k = 0; k < 13; k += 1) {
      const f = k / 12
      const leafAz = az + k * 2.4 + random.gauss() * 0.2
      const at = tip.clone().add(V(0, -lerp(0.75, 0.02, f), 0))
      const pet = lerp(0.34, 0.15, f) * random.range(0.85, 1.15)
      const end = at.clone().add(out(leafAz, pet * lerp(0.9, 0.55, f))).add(V(0, pet * lerp(0.15, 0.6, f), 0))
      petioles.push(stem([at, at.clone().lerp(end, 0.5).add(V(0, 0.03, 0)), end], (t) => lerp(0.0042, 0.0028, t), { radial: 3, tubular: 3, colorFn: shade(0.85, 1) }))
      const size = lerp(1, 0.7, f) * random.range(0.9, 1.1)
      leaves.push(put(palmLeaf({ lobes: 7, spread: 4.2, length: 0.26 * size, width: 0.075 * size, shape: 'lance', rise: lerp(0.05, 0.4, f), droop: 0.5, segments: 4, across: 1, cup: 0.18, sideScale: 0.3, random }), end, leafAz))
    }
  }
  const count = random() < 0.5 ? 2 : 3
  const start = random() * TAU
  for (let k = 0; k < count; k += 1) {
    const az = start + (k / count) * TAU + random.gauss() * 0.3
    const height = random.range(1.25, 1.5)
    const lean = random.range(0.06, 0.18)
    const fork = out(az, Math.sin(lean) * height).add(V(0, Math.cos(lean) * height, 0))
    const points = [out(az, 0.02), out(az, 0.05).add(V(0, height * 0.5, 0)), fork]
    stems.push(stem(points, knobby(0.022, 0.016, height), { radial: 6, tubular: Math.round(height / 0.03), colorFn: bark }))
    const branches = random() < 0.5 ? 2 : 3
    for (let b = 0; b < branches; b += 1) {
      const baz = az + (b / branches - 0.5) * 2.2 + random.gauss() * 0.3
      const length = random.range(0.75, 1.0)
      const tip = fork.clone().add(out(baz, length * 0.45)).add(V(0, length * 0.85, 0))
      stems.push(stem([fork, fork.clone().lerp(tip, 0.5).add(out(baz, 0.05)), tip], knobby(0.014, 0.007, length), { radial: 5, tubular: Math.round(length / 0.035), colorFn: (c, x, y, z) => (y > tip.y - 0.3 ? c.set('#7f8a52') : bark(c, x, y, z)) }))
      crown(tip, baz)
    }
  }
  return { stems: merge(stems), petioles: merge(petioles), leaves: merge(leaves) }
}

function buildTapioca(ctx) {
  const { random } = ctx
  const plot = { width: 12, depth: 14 }
  const { spots } = ridgeField(ctx, plot, { pitch: 1.0, gap: 1.0, height: 0.15, color: '#8a5a40' })
  const variants = [0, 1, 2].map(() => tapiocaVariant(random))
  const scale = (g) => {
    const w = lerp(0.12, 1, smooth(0, 0.5, g))
    return [w, lerp(0.06, 1, smooth(0, 0.62, g)), w]
  }
  grow(ctx, {
    spots, variants, wind: { strength: 0.12, flutter: 0.022, refHeight: 2.5, ground: 0 }, scale,
    layers: {
      stems: { color: (c, g, entry) => tone(c.set('#ffffff'), entry), materialOptions: { roughness: 0.92 } },
      petioles: { color: (c, g, entry) => tone(c.set('#a8443a'), entry) },
      leaves: { materialOptions: { roughness: 0.6 }, color: (c, g, entry) => tone(ramp(c, g, [[0, '#6a9a4a'], [0.3, '#3e6e2e'], [0.85, '#426e30'], [1, '#6a7a38']]), entry) },
    },
  })
  return { plot: { ...plot, rowGap: 1.0 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 2.7, back: 3.0, targetY: 1.3 }) }
}

export const aroids = { colocasia: buildColocasia, 'elephant-foot-yam': buildYam, tapioca: buildTapioca }
