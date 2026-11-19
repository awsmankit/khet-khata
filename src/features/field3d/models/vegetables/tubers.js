// Alliums on beds (onion, garlic) and tuber crops on ridges (potato, sweet potato).
import * as THREE from 'three'
import { ellipsoid, lerp, merge, smooth, transform } from '../../engine/geometry.js'
import { V, ramp, shade, tone } from '../../engine/plantKit.js'
import { TAU, arcPoints, bedField, cornerCamera, flower, grow, lathe, leaf, noise2, out, palmLeaf, pinnate, put, quatDir, ridgeField, slot, stem } from './kit.js'

/* ---------------------------------------------------------------- onion */
function hollowLeaf(points, radius) {
  return stem(points, (t) => radius * lerp(1, 0.25, Math.pow(t, 1.4)), { radial: 4, tubular: 6, colorFn: (c, x, y) => c.setScalar(0.82 + 0.18 * Math.min(1, y / 0.4)) })
}

function onionVariant(random) {
  const upright = [stem([V(0, 0.03, 0), V(0, 0.06, 0), V(0, 0.09, 0)], (t) => lerp(0.0075, 0.0065, t), { radial: 6, tubular: 2, colorFn: shade(0.85, 1) })]
  const fallen = []
  const count = 6
  const start = random() * TAU
  for (let k = 0; k < count; k += 1) {
    const az = start + k * 2.6 + random.gauss() * 0.2
    const length = random.range(0.34, 0.48)
    const points = arcPoints(length, random.range(1.3, 1.5), random.range(0.5, 1.3), 6).map((p) => p.applyAxisAngle(V(0, 1, 0), az).add(V(0, 0.05, 0)))
    upright.push(hollowLeaf(points, random.range(0.0048, 0.0058)))
  }
  // tops that have toppled at the neck and lie on the bed
  const fall = random() * TAU
  for (let k = 0; k < count - 1; k += 1) {
    const az = fall + random.gauss() * 0.45
    const length = random.range(0.3, 0.42)
    const dir = out(az)
    const points = [V(0, 0.04, 0), V(0, 0.075, 0).addScaledVector(dir, 0.02), V(0, 0.05, 0).addScaledVector(dir, 0.09), V(0, 0.022, 0).addScaledVector(dir, 0.2), V(0, 0.018, 0).addScaledVector(dir, length).add(out(az + 1.57, random.gauss() * 0.04))]
    fallen.push(hollowLeaf(points, random.range(0.0042, 0.0052)))
  }
  return { upright: merge(upright), fallen: merge(fallen), slots: { bulb: [slot(V(), quatDir(V(random.gauss() * 0.08, 1, random.gauss() * 0.08), random() * TAU))] } }
}

function onionBulb(radius) {
  const length = radius * 1.85
  const bulb = lathe((t) => (t < 0.16 ? lerp(0.13, 0.45, t / 0.16) : Math.pow(Math.sin(Math.PI * Math.min(0.999, 0.18 + 0.82 * Math.pow((t - 0.16) / 0.84, 0.85))), 0.75)) * radius, length, {
    radial: 8, rows: 7, colorFn: (c, x, y, z) => c.setScalar(0.84 + 0.16 * Math.abs(Math.sin(Math.atan2(z, x) * 7 + y * 30)) * smooth(-length, 0, y)),
  })
  bulb.translate(0, length * 0.62, 0)
  return bulb
}

function buildOnion(ctx) {
  const { random } = ctx
  const plot = { width: 8, depth: 11 }
  const { spots } = bedField(ctx, plot, { pitch: 1.4, top: 1.1, height: 0.12, rows: [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45], gap: 0.12, jitterX: 0.012, jitterZ: 0.12 })
  const variants = [0, 1, 2].map(() => onionVariant(random))
  const base = (g) => {
    const w = lerp(0.3, 1, smooth(0, 0.4, g))
    return [w, lerp(0.12, 1, smooth(0, 0.5, g)), w]
  }
  const falling = (g) => smooth(0.82, 0.88, g)
  spots.forEach((spot) => { spot.offset = random.gauss() * 0.025 })
  grow(ctx, {
    spots, variants, wind: { strength: 0.1, flutter: 0.016, refHeight: 0.45, ground: 0 }, scale: base,
    layers: {
      upright: {
        materialOptions: { roughness: 0.5, metalness: 0.02 },
        scale: (g) => {
          const [w, h] = base(g)
          const f = falling(g)
          return [w * lerp(1, 0.3, f), h * lerp(1, 0.25, f), w * lerp(1, 0.3, f)]
        },
        color: (c, g, entry) => tone(ramp(c, g, [[0, '#7ca876'], [0.4, '#5e8c70'], [0.75, '#62886a'], [0.86, '#9a9a58']]), entry),
      },
      fallen: {
        materialOptions: { roughness: 0.6 },
        scale: falling,
        color: (c, g, entry) => tone(ramp(c, g, [[0.82, '#7a9460'], [0.92, '#a59a58'], [1, '#b49c66']]), entry),
      },
    },
    organs: {
      bulb: {
        geometries: [onionBulb(0.038), onionBulb(0.042)], plantScale: () => 1, materialOptions: { roughness: 0.45 },
        scale: (g) => {
          const w = lerp(0.18, 1, smooth(0.3, 0.86, g))
          return [w, lerp(0.35, 1, smooth(0.25, 0.8, g)), w]
        },
        color: (c, g, o) => tone(ramp(c, g, [[0.3, '#e4e6c8'], [0.55, '#d6b0b0'], [0.75, '#b5546a'], [0.9, '#a2465a'], [1, '#9a5244']]), o),
      },
    },
  })
  return { plot: { ...plot, rowGap: 1.4 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.45, back: 1.5, targetY: 0.12 }) }
}

/* ---------------------------------------------------------------- garlic */
function garlicVariant(random) {
  const height = random.range(0.1, 0.14)
  const parts = [stem([V(), V(0, height * 0.5, 0), V(0, height, 0)], (t) => lerp(0.0075, 0.005, t), { radial: 5, tubular: 2, colorFn: shade(0.82, 1) })]
  const plane = random() * TAU
  const count = 7
  for (let k = 0; k < count; k += 1) {
    const f = k / (count - 1)
    const az = plane + (k % 2 ? Math.PI : 0) + random.gauss() * 0.25
    const geometry = leaf({ length: lerp(0.36, 0.26, f) * random.range(0.9, 1.1), width: 0.024, shape: 'strap', rise: lerp(1.2, 1.45, f), droop: random.range(0.8, 1.4), segments: 6, across: 1, cup: 0, fold: 0.45, random })
    put(geometry, V(0, lerp(0.02, height, f), 0), az)
    parts.push(geometry)
  }
  return { leaves: merge(parts) }
}

function buildGarlic(ctx) {
  const { random } = ctx
  const plot = { width: 8, depth: 11 }
  const { spots } = bedField(ctx, plot, { pitch: 1.4, top: 1.1, height: 0.12, rows: [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45], gap: 0.1, jitterX: 0.012, jitterZ: 0.1 })
  const variants = [0, 1, 2].map(() => garlicVariant(random))
  grow(ctx, {
    spots, variants, wind: { strength: 0.1, flutter: 0.014, refHeight: 0.45, ground: 0 },
    scale: (g) => {
      const w = lerp(0.3, 1, smooth(0, 0.42, g))
      return [w, lerp(0.1, 1, smooth(0, 0.55, g)) * lerp(1, 0.8, smooth(0.85, 1, g)), w]
    },
    layers: { leaves: { materialOptions: { roughness: 0.55 }, color: (c, g, entry) => tone(ramp(c, g, [[0, '#7aa872'], [0.4, '#5d8c62'], [0.75, '#638a5e'], [0.88, '#9a9a5a'], [1, '#b0985e']]), entry) } },
  })
  return { plot: { ...plot, rowGap: 1.4 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.45, back: 1.5, targetY: 0.12 }) }
}

/* ---------------------------------------------------------------- potato */
function potatoLeaf(random, size) {
  return pinnate({
    length: 0.22 * size, rise: random.range(0.5, 0.9), droop: random.range(0.6, 1.0), pairs: 3, start: 0.3, rachis: 0.0024,
    leaflet: { length: 0.055, width: 0.036, shape: 'ovate', rise: 0.15, droop: 0.35, segments: 3, across: 1, cup: 0.2, wave: 0.12, waves: 2 },
    leafletAngle: 1.1, shrink: 0.3, terminal: 1.15, small: 0.4, random,
  })
}

function potatoVariant(random, ridgeY) {
  const stems = []
  const leaves = []
  const flowers = []
  const count = random() < 0.5 ? 3 : 4
  for (let k = 0; k < count; k += 1) {
    const az = (k / count) * TAU + random.gauss() * 0.4
    const height = random.range(0.42, 0.58)
    const lean = random.range(0.2, 0.45)
    const top = out(az, Math.sin(lean) * height).add(V(0, Math.cos(lean) * height, 0))
    const points = [V(), out(az, 0.04).add(V(0, height * 0.4, 0)), top]
    stems.push(stem(points, (t) => lerp(0.008, 0.004, t), { radial: 5, tubular: 4, colorFn: shade(0.75, 1) }))
    const curve = new THREE.CatmullRomCurve3(points)
    for (let n = 0; n < 5; n += 1) {
      const t = 0.18 + n * 0.17
      leaves.push(put(potatoLeaf(random, lerp(1.1, 0.75, t) * random.range(0.9, 1.1)), curve.getPointAt(t), az + (n % 2 ? 1 : -1) * random.range(0.5, 1.3)))
    }
    if (k < 2) flowers.push(slot(top, quatDir(V(random.gauss() * 0.2, 1, random.gauss() * 0.2), random() * TAU), { h: 1 }))
  }
  // tubers turned up on the ridge at digging time, following the ridge slope (plants face +/-X)
  const tubers = []
  for (let k = 0; k < 4; k += 1) {
    const x = random.range(-0.14, 0.14)
    const z = random.range(-0.12, 0.12)
    const r = random.range(0.024, 0.034)
    const tuber = ellipsoid(r * 1.2, r * 0.85, r, { detail: 1, colorFn: (c, px, py, pz) => c.setScalar(0.85 + 0.15 * noise2(px * 300, pz * 300)) })
    transform(tuber, { rotation: [0, random() * TAU, 0] })
    tuber.translate(x, ridgeY(x) + r * 0.45, z)
    tubers.push(tuber)
  }
  return { stems: merge(stems), leaves: merge(leaves), tubers: merge(tubers), slots: { flower: flowers } }
}

function potatoFlowers(random) {
  const parts = []
  for (let k = 0; k < 5; k += 1) {
    const f = flower({ petals: 5, length: 0.016, width: 0.016, rise: 0.25, droop: 0.3, cup: 0.25, segments: 2, center: 0.003, centerColor: '#ffe14a', cone: 0.009, coneColor: '#f4d23a', petal: ['#f0f0f0', '#ffffff'], random })
    transform(f, { rotation: [random.gauss() * 0.5, random() * TAU, random.gauss() * 0.5] })
    const at = out(random() * TAU, random.range(0.01, 0.035)).add(V(0, 0.02 + random() * 0.02, 0))
    f.translate(at.x, at.y, at.z)
    parts.push(f)
  }
  return merge(parts)
}

function buildPotato(ctx) {
  const { random } = ctx
  const plot = { width: 9, depth: 12 }
  const pitch = 0.6
  const ridge = 0.18
  const { spots } = ridgeField(ctx, plot, { pitch, height: ridge, gap: 0.25, color: '#86644a' })
  const ridgeY = (x) => ridge * Math.pow(0.5 + 0.5 * Math.cos((TAU * x) / pitch), 0.85) - ridge
  spots.forEach((spot) => { spot.yaw = random() < 0.5 ? 0 : Math.PI; spot.tilt = [0, 0]; spot.kind = random() < 0.35 ? 1 : 0 })
  const variants = [0, 1, 2].map(() => potatoVariant(random, ridgeY))
  const scale = (g) => {
    const w = lerp(0.2, 1, smooth(0.05, 0.45, g)) * lerp(1, 1.12, smooth(0.82, 0.98, g))
    return [w, lerp(0.05, 1, smooth(0.05, 0.5, g)) * lerp(1, 0.5, smooth(0.8, 0.97, g)), w]
  }
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#6aa046'], [0.4, '#4f8a38'], [0.72, '#54883a'], [0.84, '#9a9c48'], [0.92, '#a08a4a'], [1, '#7c6644']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.12, flutter: 0.014, refHeight: 0.55, ground: 0 }, scale,
    layers: {
      stems: { color: leafColor },
      leaves: { color: leafColor, materialOptions: { roughness: 0.75 } },
      tubers: { scale: (g) => smooth(0.96, 0.99, g), color: (c, g, entry) => tone(c.set('#cfae7e'), entry), materialOptions: { roughness: 0.8 } },
    },
    organs: {
      flower: { geometries: [potatoFlowers(random), potatoFlowers(random)], scale: flowerLife(0.34, 0.6), color: (c, g, o) => tone(c.set(o.kind ? '#c4a6e6' : '#ffffff'), o) },
    },
  })
  return { plot: { ...plot, rowGap: pitch }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.6, back: 1.8, targetY: 0.2 }) }
}

function flowerLife(from, to) {
  return (g) => smooth(from, from + 0.05, g) * (1 - smooth(to - 0.05, to, g))
}

/* ---------------------------------------------------------------- sweet potato */
function sweetPotatoVariant(random, ridgeY, lobed) {
  const stems = []
  const leaves = []
  const runners = 5
  for (let k = 0; k < runners; k += 1) {
    // runners head mostly along the ridge, some spill down into the furrows
    const az = (k / runners) * TAU + random.gauss() * 0.3
    const length = random.range(0.6, 0.95)
    const points = []
    for (let n = 0; n <= 8; n += 1) {
      const t = n / 8
      const p = out(az + Math.sin(t * 5 + k) * 0.25, length * t)
      p.y = ridgeY(p.x) + 0.022
      points.push(p)
    }
    stems.push(stem(points, (t) => lerp(0.0045, 0.0025, t), { radial: 4, tubular: 12, colorFn: shade(0.8, 1) }))
    const curve = new THREE.CatmullRomCurve3(points)
    const leavesOn = Math.round(length / 0.07)
    for (let n = 0; n < leavesOn; n += 1) {
      const t = 0.08 + (n / leavesOn) * 0.9
      const at = curve.getPointAt(t)
      const side = az + (n % 2 ? 1 : -1) * random.range(0.6, 1.6)
      const pet = random.range(0.07, 0.14)
      const tip = at.clone().add(out(side, pet * 0.35)).add(V(0, pet, 0))
      stems.push(stem([at, at.clone().lerp(tip, 0.5).add(out(side, 0.01)), tip], () => 0.0018, { radial: 3, tubular: 2, colorFn: shade(0.85, 1) }))
      const size = random.range(0.85, 1.15) * lerp(1, 0.75, t)
      const blade = lobed
        ? palmLeaf({ lobes: 5, spread: 2.6, length: 0.075 * size, width: 0.04 * size, shape: 'lance', rise: 0.1, droop: 0.35, segments: 3, across: 1, cup: 0.1, sideScale: 0.4, random })
        : leaf({ length: 0.1 * size, width: 0.095 * size, shape: 'heart', lobe: 0.2, rise: 0.15, droop: 0.45, segments: 4, across: 2, cup: 0.15, random })
      leaves.push(put(blade, tip, side + random.gauss() * 0.4))
    }
  }
  return { stems: merge(stems), leaves: merge(leaves) }
}

function buildSweetPotato(ctx) {
  const { random } = ctx
  const plot = { width: 9, depth: 12 }
  const pitch = 0.7
  const ridge = 0.16
  const { spots } = ridgeField(ctx, plot, { pitch, height: ridge, gap: 0.34 })
  const ridgeY = (x) => ridge * Math.pow(0.5 + 0.5 * Math.cos((TAU * x) / pitch), 0.85) - ridge
  spots.forEach((spot) => { spot.yaw = random() < 0.5 ? 0 : Math.PI; spot.tilt = [0, 0]; spot.s = random.range(0.95, 1.05) })
  const variants = [false, true, false].map((lobed) => sweetPotatoVariant(random, ridgeY, lobed))
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#6c9a48'], [0.4, '#4a8436'], [0.88, '#4f8238'], [1, '#768a40']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.05, flutter: 0.016, refHeight: 0.25, ground: 0 },
    scale: (g) => lerp(0.15, 1, smooth(0, 0.55, g)),
    layers: {
      stems: { color: (c, g, entry) => tone(ramp(c, g, [[0, '#6e8a48'], [0.5, '#6a5a48'], [1, '#6a5a48']]), entry) },
      leaves: { color: leafColor, materialOptions: { roughness: 0.62 } },
    },
  })
  return { plot: { ...plot, rowGap: pitch }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.5, back: 1.6, targetY: 0.1 }) }
}

export const tubers = { onion: buildOnion, garlic: buildGarlic, potato: buildPotato, 'sweet-potato': buildSweetPotato }
