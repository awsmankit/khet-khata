// Rosette and head family (cauliflower, cabbage, broccoli, lettuce, spinach), root crops
// with shoulders at the soil (radish, beetroot, turnip, carrot) and leafy greens
// (fenugreek, amaranth).
import * as THREE from 'three'
import { ellipsoid, lerp, merge, prep, smooth, transform } from '../../geometry.js'
import { V, ramp, shade, tone } from '../../crops.js'
import { TAU, bedField, cornerCamera, grow, lathe, leaf, noise2, noise3, out, pinnate, put, quatDir, ridgeField, slot, stem } from './kit.js'

const c1 = new THREE.Color()
const c2 = new THREE.Color()

// Leaves in a golden-angle rosette; f = 0 for the outer (oldest) leaf, 1 for the innermost.
function ring(random, count, make, { y0 = 0.01, y1 = 0.05, r0 = 0, r1 = 0, spin = 2.4 } = {}) {
  const parts = []
  const start = random() * TAU
  for (let index = 0; index < count; index += 1) {
    const f = count === 1 ? 0 : index / (count - 1)
    const az = start + index * spin + random.gauss() * 0.15
    parts.push(put(make(f, index, az), out(az, lerp(r0, r1, f)).add(V(0, lerp(y0, y1, f), 0)), az))
  }
  return parts
}

const rosetteScale = (start = 0.12, end = 0.6) => (g) => {
  const w = lerp(start, 1, smooth(0, end, g))
  return [w, lerp(start * 0.8, 1, smooth(0, end * 0.95, g)), w]
}

/* ---------------------------------------------------------------- cole crops */
function bumpyDome(random, { radius, height, detail = 3, bumps = 60, depth = 0.08, florets = 0 }) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const position = geometry.attributes.position
  const v = V()
  for (let index = 0; index < position.count; index += 1) {
    v.fromBufferAttribute(position, index)
    const k = 1 + depth * (Math.abs(Math.sin(v.x * bumps * 0.17 + 1.3) * Math.sin(v.z * bumps * 0.19) * Math.sin(v.y * bumps * 0.13 + 0.7)) - 0.4) + depth * 0.6 * (noise3(v.x * 6, v.y * 6, v.z * 6) - 0.5)
    v.multiplyScalar(k)
    const y = v.y < -0.1 ? -0.1 + (v.y + 0.1) * 0.15 : v.y
    position.setXYZ(index, v.x * radius, y * height, v.z * radius)
  }
  geometry.computeVertexNormals()
  const parts = [prep(geometry, '#ffffff', (c, x, y, z) => {
    const r = Math.hypot(x / radius, y / height, z / radius)
    c.setScalar(lerp(0.62, 1.04, smooth(0.86, 1.06, r)) * (0.94 + 0.06 * noise2(x * 300, z * 300)))
  })]
  for (let index = 0; index < florets; index += 1) {
    const az = random() * TAU
    const el = Math.asin(random.range(0.15, 0.95))
    const p = V(Math.cos(el) * Math.sin(az) * radius * 0.96, Math.sin(el) * height * 0.98, Math.cos(el) * Math.cos(az) * radius * 0.96)
    const size = radius * random.range(0.22, 0.32)
    const dome = ellipsoid(size, size * 0.7, size, { widthSegments: 7, heightSegments: 4, colorFn: (c, x, y, z) => c.setScalar(lerp(0.7, 1.05, smooth(-size * 0.2, size * 0.7, y)) * (0.92 + 0.12 * noise2(x * 900, (y + z) * 900))) })
    parts.push(orientTo(dome, p, V(p.x / radius, p.y / height, p.z / radius)))
  }
  return merge(parts)
}

function orientTo(geometry, at, direction) {
  geometry.applyQuaternion(quatDir(direction))
  geometry.translate(at.x, at.y, at.z)
  return geometry
}

function coleLeaf(random, { length, width, rise, droop, cup = 0.35, wave = 0.12, petiole = 0.12, shape = 'obovate', across = 2, segments = 6, ribColor = '#ffffff' }) {
  return leaf({ length, width, shape, rise, droop, segments, across, cup, wave, waves: 3, petiole, base: '#b2b2b2', tip: '#dedede', rib: ribColor, edge: 0.8, random })
}

function cauliflowerVariant(random) {
  const parts = [stem([V(), V(0, 0.06, 0), V(0, 0.11, 0)], (t) => lerp(0.022, 0.018, t), { radial: 6, tubular: 2, colorFn: shade(0.8, 0.95) })]
  parts.push(...ring(random, 17, (f) => coleLeaf(random, {
    length: lerp(0.44, 0.3, f) * random.range(0.9, 1.1), width: lerp(0.18, 0.13, f), rise: lerp(0.42, 0.85, f) + random.gauss() * 0.06, droop: lerp(0.85, 0.6, f),
    cup: lerp(0.25, 0.4, f), wave: 0.14, petiole: lerp(0.14, 0.08, f),
  }), { y0: 0.03, y1: 0.08, r0: 0.04, r1: 0.11 }))
  return { leaves: merge(parts), slots: { head: [slot(V(0, 0.12, 0), quatDir(V(random.gauss() * 0.05, 1, random.gauss() * 0.05), random() * TAU))] } }
}

function cabbageHead(random, radius) {
  const parts = []
  const ball = new THREE.IcosahedronGeometry(radius, 3)
  ball.scale(1, 0.86, 1)
  parts.push(prep(ball, '#ffffff', (c, x, y, z) => {
    const a = Math.atan2(z, x)
    const seam = Math.abs(Math.sin(a * 1.5 + y * 22 + 0.6))
    const vein = Math.abs(Math.sin(a * 9 - y * 30))
    c.setScalar(lerp(0.78, 1, smooth(0.0, 0.25, seam)) * (vein < 0.08 ? 1.08 : 1) * lerp(0.85, 1.02, smooth(-radius, radius, y)))
  }))
  for (let k = 0; k < 4; k += 1) {
    const az = (k / 4) * TAU + random.gauss() * 0.2
    const wrapper = leaf({ length: radius * 1.9, width: radius * 1.9, shape: 'round', rise: 1.45, droop: -1.25, segments: 6, across: 3, cup: 0.7, base: '#c8c8c8', tip: '#e8e8e8', rib: '#ffffff', random })
    put(wrapper, out(az, radius * 0.97).add(V(0, -radius * 0.65, 0)), az)
    parts.push(wrapper)
  }
  return merge(parts)
}

function cabbageVariant(random) {
  const parts = ring(random, 13, (f) => coleLeaf(random, {
    length: lerp(0.34, 0.26, f) * random.range(0.9, 1.1), width: lerp(0.32, 0.25, f), shape: 'round', rise: lerp(0.25, 0.6, f) + random.gauss() * 0.06, droop: lerp(0.6, 0.45, f),
    cup: lerp(0.45, 0.6, f), wave: 0.06, petiole: 0.1, across: 3,
  }), { y0: 0.02, y1: 0.05, r0: 0.06, r1: 0.12 })
  return { leaves: merge(parts), slots: { head: [slot(V(0, 0.118, 0), quatDir(V(random.gauss() * 0.06, 1, random.gauss() * 0.06), random() * TAU))] } }
}

function broccoliVariant(random) {
  const height = random.range(0.26, 0.32)
  const parts = [stem([V(), V(random.gauss() * 0.01, height * 0.5, 0), V(0, height, 0)], (t) => lerp(0.026, 0.02, t), { radial: 7, tubular: 3, colorFn: shade(0.8, 0.95) })]
  const curve = new THREE.CatmullRomCurve3([V(), V(0, height * 0.5, 0), V(0, height, 0)])
  const count = 13
  const start = random() * TAU
  for (let index = 0; index < count; index += 1) {
    const f = index / (count - 1)
    const az = start + index * 2.4
    const at = curve.getPointAt(lerp(0.1, 0.72, f)).add(out(az, 0.02))
    parts.push(put(coleLeaf(random, { length: lerp(0.46, 0.34, f) * random.range(0.9, 1.1), width: lerp(0.15, 0.11, f), rise: lerp(0.55, 0.9, f), droop: lerp(1.0, 0.8, f), cup: 0.3, wave: 0.26, petiole: 0.3 }), at, az))
  }
  return { leaves: merge(parts), slots: { head: [slot(V(0, height + 0.02, 0), quatDir(V(random.gauss() * 0.08, 1, random.gauss() * 0.08), random() * TAU))] } }
}

function buildCole(ctx, kind) {
  const { random } = ctx
  const plot = { width: 9, depth: 12 }
  const pitch = kind === 'broccoli' ? 0.6 : 0.6
  const { spots } = ridgeField(ctx, plot, { pitch, gap: kind === 'cabbage' ? 0.45 : 0.5, height: 0.1 })
  const make = { cauliflower: cauliflowerVariant, cabbage: cabbageVariant, broccoli: broccoliVariant }[kind]
  const variants = [0, 1, 2].map(() => make(random))
  const leafStops = {
    cauliflower: [[0, '#79a173'], [0.4, '#5c8674'], [1, '#5a8070']],
    cabbage: [[0, '#7fa77a'], [0.4, '#6b9580'], [1, '#6a917c']],
    broccoli: [[0, '#6f9a6a'], [0.4, '#4f7a62'], [1, '#4c745e']],
  }[kind]
  const head = {
    cauliflower: { geometries: [bumpyDome(random, { radius: 0.12, height: 0.09, bumps: 70, depth: 0.09 }), bumpyDome(random, { radius: 0.114, height: 0.085, bumps: 60, depth: 0.1 })], scale: (g) => smooth(0.48, 0.86, g), materialOptions: { roughness: 0.85 }, color: (c, g, o) => tone(ramp(c, g, [[0.48, '#e8ecd0'], [0.65, '#f4efdb'], [0.9, '#f2ead0'], [1, '#e9dcb4']]), o) },
    cabbage: { geometries: [cabbageHead(random, 0.126), cabbageHead(random, 0.114)], scale: (g) => lerp(0, 1, smooth(0.25, 0.85, g)), materialOptions: { roughness: 0.5 }, color: (c, g, o) => tone(ramp(c, g, [[0.25, '#8db07c'], [0.6, '#a8c38f'], [1, '#b7cc98']]), o) },
    broccoli: { geometries: [bumpyDome(random, { radius: 0.096, height: 0.072, detail: 2, bumps: 40, depth: 0.12, florets: 16 }), bumpyDome(random, { radius: 0.09, height: 0.072, detail: 2, bumps: 45, depth: 0.12, florets: 14 })], scale: (g) => smooth(0.5, 0.86, g), materialOptions: { roughness: 0.9 }, color: (c, g, o) => tone(ramp(c, g, [[0.5, '#5d7a46'], [0.7, '#3f5e3a'], [0.94, '#3d5c3c'], [1, '#6c7a3a']]), o) },
  }[kind]
  grow(ctx, {
    spots, variants, wind: { strength: 0.08, flutter: 0.01, refHeight: 0.5, ground: 0 }, scale: rosetteScale(0.12, 0.55),
    layers: { leaves: { color: (c, g, entry) => tone(ramp(c, g, leafStops), entry), materialOptions: { roughness: 0.55, metalness: 0.02 } } },
    organs: { head },
  })
  return { plot: { ...plot, rowGap: pitch }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 2.4, back: 1.4, targetY: 0.02, targetZ: 0.18 }) }
}

/* ---------------------------------------------------------------- lettuce and spinach */
function lettuceVariant(random) {
  const parts = ring(random, 15, (f) => leaf({
    length: lerp(0.17, 0.11, f) * random.range(0.9, 1.1), width: lerp(0.15, 0.1, f), shape: 'obovate', rise: lerp(0.45, 1.35, f), droop: lerp(0.75, 0.4, f),
    segments: 5, across: 2, cup: 0.35, wave: 0.55, waves: 4, petiole: 0.05, base: '#e4e4e4', tip: '#b8b8b8', rib: '#ffffff', edge: 0.82, random,
  }), { y0: 0.01, y1: 0.03, r1: 0.02 })
  return { leaves: merge(parts) }
}

function spinachVariant(random) {
  const parts = ring(random, 10, (f) => leaf({
    length: lerp(0.24, 0.16, f) * random.range(0.88, 1.1), width: lerp(0.1, 0.075, f), shape: 'ovate', rise: lerp(0.8, 1.3, f), droop: lerp(1.0, 0.6, f),
    segments: 6, across: 1, cup: 0.3, wave: 0.12, waves: 2, petiole: 0.38, random,
  }), { y0: 0.005, y1: 0.02 })
  return { leaves: merge(parts) }
}

function buildLettuce(ctx) {
  const { random } = ctx
  const plot = { width: 8, depth: 11 }
  const { layout, spots } = bedField(ctx, plot, { pitch: 1.3, top: 1.0, height: 0.14, rows: [-0.33, 0, 0.33], gap: 0.3 })
  layout.centers.forEach((center, index) => spots.forEach((spot) => { if (Math.abs(spot.x - center) < 0.6) spot.kind = index % 2 }))
  const variants = [0, 1, 2].map(() => lettuceVariant(random))
  grow(ctx, {
    spots, variants, wind: { strength: 0.05, flutter: 0.01, refHeight: 0.25, ground: 0 }, scale: rosetteScale(0.1, 0.7),
    layers: { leaves: { materialOptions: { roughness: 0.6 }, color: (c, g, entry) => tone(ramp(c, g, entry.kind ? [[0, '#86a04a'], [0.3, '#8a4a44'], [0.7, '#7a2e3a'], [1, '#73303a']] : [[0, '#8fbf52'], [0.5, '#86b94c'], [1, '#7aae44']]), entry) } },
  })
  return { plot: { ...plot, rowGap: 1.3 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.45, back: 1.6, targetY: 0.08 }) }
}

function buildSpinach(ctx) {
  const { random } = ctx
  const plot = { width: 8, depth: 11 }
  const { spots } = bedField(ctx, plot, { pitch: 1.3, top: 1.0, height: 0.12, rows: [-0.4, -0.2, 0, 0.2, 0.4], gap: 0.13 })
  const variants = [0, 1, 2].map(() => spinachVariant(random))
  grow(ctx, {
    spots, variants, wind: { strength: 0.06, flutter: 0.012, refHeight: 0.25, ground: 0 },
    // cut back for the first picking, then it grows again
    scale: (g) => {
      const w = lerp(0.12, 1, smooth(0, 0.45, g)) * lerp(1, 0.55, smooth(0.5, 0.54, g) * (1 - smooth(0.56, 0.85, g)))
      return [w, w, w]
    },
    layers: { leaves: { materialOptions: { roughness: 0.38, metalness: 0.03 }, color: (c, g, entry) => tone(ramp(c, g, [[0, '#5f9a3f'], [0.4, '#3d7030'], [1, '#3a6a2e']]), entry) } },
  })
  return { plot: { ...plot, rowGap: 1.3 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.4, back: 1.5, targetY: 0.08 }) }
}

/* ---------------------------------------------------------------- root crops */
function lyrateLeaf(random, size, { rise, droop }) {
  return pinnate({
    length: 0.26 * size, rise, droop, pairs: 3, start: 0.35, rachis: 0.0032,
    leaflet: { length: 0.045, width: 0.035, shape: 'oval', rise: 0.15, droop: 0.4, segments: 3, across: 1, cup: 0.2, wave: 0.25, waves: 2 },
    leafletAngle: 1.3, shrink: 0.55, terminal: 2.6, random,
  })
}

// Root top showing at the soil: t = 0 at the crown; `above` is how much sits above ground.
function rootTop({ radius, length, above, profile, colorFn, radial = 9 }) {
  const geometry = lathe((t) => radius * profile(t), length, { radial, rows: 7, colorFn })
  geometry.translate(0, above, 0)
  return geometry
}

function rootCrop(ctx, kind) {
  const { random } = ctx
  const plot = { width: 8, depth: 11 }
  const settings = {
    radish: { pitch: 0.45, gap: 0.12, height: 0.12, count: 8 },
    turnip: { pitch: 0.45, gap: 0.18, height: 0.12, count: 9 },
    beetroot: { pitch: 0.45, gap: 0.14, height: 0.12, count: 10 },
    carrot: { pitch: 0.4, gap: 0.085, height: 0.12, count: 7 },
  }[kind]
  const { spots } = ridgeField(ctx, plot, { pitch: settings.pitch, gap: settings.gap, height: settings.height })
  const variants = [0, 1, 2].map(() => {
    let parts
    if (kind === 'carrot') {
      parts = ring(random, settings.count, (f) => pinnate({
        length: lerp(0.34, 0.24, f) * random.range(0.85, 1.12), rise: lerp(1.0, 1.4, f), droop: random.range(0.7, 1.1), pairs: 4, start: 0.3, rachis: 0.0018, rachisColor: '#d0d0d0',
        leaflet: { length: 0.048, width: 0.026, shape: 'lance', rise: 0.25, droop: 0.4, segments: 2, across: 1, cup: 0.1, wave: 0.8, waves: 3 },
        leafletAngle: 0.9, shrink: 0.3, terminal: 0.9, random,
      }), { y0: 0.01, y1: 0.02 })
    } else if (kind === 'beetroot') {
      parts = ring(random, settings.count, (f) => leaf({
        length: lerp(0.27, 0.18, f) * random.range(0.9, 1.1), width: lerp(0.12, 0.08, f), shape: 'ovate', rise: lerp(0.75, 1.3, f), droop: lerp(0.95, 0.6, f), segments: 6, across: 2, cup: 0.25, wave: 0.2, waves: 2.5, petiole: 0.38, random,
        colorFn: (c, t, u, inBlade) => {
          if (!inBlade || Math.abs(u) < 0.01) return c.set('#9c2236').multiplyScalar(lerp(0.85, 1.05, t))
          return c.set('#3f6a32').lerp(c1.set('#7a2a34'), Math.max(0, 0.45 - Math.abs(u)) * 0.9).multiplyScalar(lerp(0.85, 1, t) * lerp(1, 0.85, Math.abs(u)))
        },
      }), { y0: 0.02, y1: 0.03, r1: 0.01 })
    } else {
      const size = kind === 'turnip' ? 1.15 : 1
      parts = ring(random, settings.count, (f) => lyrateLeaf(random, lerp(1.1, 0.75, f) * size * random.range(0.9, 1.1), { rise: lerp(0.8, 1.35, f), droop: lerp(1.0, 0.7, f) }), { y0: 0.03, y1: 0.05 })
    }
    return { leaves: merge(parts), slots: { root: [slot(V(), quatDir(V(random.gauss() * 0.06, 1, random.gauss() * 0.06), random() * TAU))] } }
  })
  const roots = {
    radish: [0.024, 0.026].map((radius) => rootTop({
      radius, length: 0.14, above: 0.075, profile: (t) => Math.min(1, Math.pow(Math.sin(Math.min(1, t * 3.5) * Math.PI * 0.5), 0.5)) * lerp(1, 0.75, t),
      colorFn: (c, x, y) => c.set('#f6f6ef').lerp(c2.set('#c4d6a2'), smooth(0.0, 0.07, y)),
    })),
    turnip: [0.058, 0.064].map((radius) => rootTop({
      radius, length: 0.1, above: 0.05, profile: (t) => Math.pow(Math.sin(Math.PI * Math.min(0.999, t * 0.92 + 0.04)), 0.55),
      colorFn: (c, x, y) => c.set('#f2efe6').lerp(c2.set('#8a3a7c'), smooth(0.005, 0.035, y)),
    })),
    beetroot: [0.045, 0.05].map((radius) => rootTop({
      radius, length: 0.09, above: 0.035, profile: (t) => Math.pow(Math.sin(Math.PI * Math.min(0.999, t * 0.95 + 0.03)), 0.6),
      colorFn: (c, x, y) => c.setScalar(0.8 + 0.2 * smooth(-0.04, 0.03, y)),
    })),
    carrot: [0.017, 0.019].map((radius) => rootTop({
      radius, length: 0.07, above: 0.016, profile: (t) => Math.min(1, t * 6) * lerp(1, 0.6, t), radial: 7,
      colorFn: (c, x, y) => c.setScalar(0.82 + 0.18 * smooth(-0.02, 0.012, y)),
    })),
  }[kind]
  const rootColor = {
    radish: (c, g, o) => tone(c.set('#ffffff'), o),
    turnip: (c, g, o) => tone(c.set('#ffffff'), o),
    beetroot: (c, g, o) => tone(ramp(c, g, [[0.3, '#8a3040'], [0.7, '#5e1528'], [1, '#521224']]), o),
    carrot: (c, g, o) => tone(ramp(c, g, [[0.3, '#d8762c'], [0.7, '#cf3e1f'], [1, '#c3341c']]), o),
  }[kind]
  const leafStops = {
    radish: [[0, '#7aa84e'], [0.4, '#5d9040'], [0.9, '#5f8c3e'], [1, '#7f8f44']],
    turnip: [[0, '#7aa452'], [0.4, '#5c8a4a'], [0.9, '#5c864a'], [1, '#7f8a48']],
    beetroot: [[0, '#ffffff'], [0.8, '#f4f4f0'], [1, '#e6dcc0']],
    carrot: [[0, '#5f9a3e'], [0.4, '#3f7a2e'], [0.9, '#40742e'], [1, '#5f7a34']],
  }[kind]
  grow(ctx, {
    spots, variants, wind: { strength: 0.08, flutter: 0.014, refHeight: 0.35, ground: 0 }, scale: rosetteScale(0.1, kind === 'carrot' ? 0.55 : 0.5),
    layers: { leaves: { materialOptions: { roughness: kind === 'beetroot' ? 0.5 : 0.85 }, color: (c, g, entry) => tone(ramp(c, g, leafStops), entry) } },
    organs: {
      root: {
        geometries: roots, materialOptions: { roughness: kind === 'beetroot' ? 0.45 : 0.6 }, color: rootColor, plantScale: () => 1,
        scale: (g) => {
          const w = lerp(0.05, 1, smooth(0.2, 0.92, g))
          return [w, lerp(0.05, 1, smooth(0.18, 0.85, g)), w]
        },
      },
    },
  })
  return { plot: { ...plot, rowGap: settings.pitch }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.45, back: 1.5, targetY: 0.1 }) }
}

/* ---------------------------------------------------------------- fenugreek */
function fenugreekVariant(random) {
  const stems = []
  const leaves = []
  const flowers = []
  const pods = []
  const tri = (size) => {
    const parts = []
    for (let k = -1; k <= 1; k += 1) {
      const g = leaf({ length: 0.024 * size, width: 0.016 * size, shape: 'obovate', rise: 0.5, droop: 0.4, segments: 2, across: 1, cup: 0.2, rib: null, random })
      transform(g, { rotation: [0, k * 1.0, 0] })
      g.translate(0, 0, 0.01 * size)
      parts.push(g)
    }
    return merge(parts)
  }
  const plants = 3
  for (let p = 0; p < plants; p += 1) {
    const base = out(random() * TAU, random.range(0.01, 0.05))
    const height = random.range(0.3, 0.45)
    for (let b = 0; b < 2; b += 1) {
      const az = random() * TAU
      const lean = random.range(0.1, 0.45)
      const top = base.clone().add(out(az, Math.sin(lean) * height)).add(V(0, Math.cos(lean) * height, 0))
      const points = [base, base.clone().lerp(top, 0.5).add(out(az, 0.02)), top]
      stems.push(stem(points, (t) => lerp(0.0025, 0.0012, t), { radial: 3, tubular: 4, colorFn: shade(0.8, 1) }))
      const curve = new THREE.CatmullRomCurve3(points)
      for (let k = 0; k < 7; k += 1) {
        const t = 0.14 + k * 0.13
        const at = curve.getPointAt(Math.min(1, t))
        const leafAz = az + k * 2.4
        leaves.push(put(tri(random.range(0.9, 1.25)), at, leafAz))
        if (b === 0 && (k === 4 || k === 6)) {
          const h = t
          flowers.push(slot(at, quatDir(out(leafAz + Math.PI, 0.6).add(V(0, 1, 0)), random() * TAU), { h, offset: 0.1 * (0.5 - h) }))
          pods.push(slot(at, quatDir(out(leafAz + Math.PI, 0.5).add(V(0, 1, 0)), random() * TAU), { h, offset: 0.1 * (0.5 - h) }))
        }
      }
    }
  }
  return { stems: merge(stems), leaves: merge(leaves), slots: { flower: flowers, pod: pods } }
}

function sicklePod(random) {
  const length = random.range(0.08, 0.1)
  const points = Array.from({ length: 5 }, (_, k) => {
    const t = k / 4
    return V(0.025 * Math.sin(t * 1.4), t * length, 0)
  })
  return stem(points, (t) => (t > 0.9 ? 0.0012 : 0.0022), { radial: 3, tubular: 5, colorFn: shade(0.85, 1) })
}

function buildFenugreek(ctx) {
  const { random } = ctx
  const plot = { width: 8, depth: 10 }
  const { spots } = bedField(ctx, plot, { pitch: 1.3, top: 1.0, height: 0.1, rows: [-0.4, -0.2, 0, 0.2, 0.4], gap: 0.18, jitterX: 0.03, jitterZ: 0.25 })
  const variants = [0, 1, 2].map(() => fenugreekVariant(random))
  const green = (c, g, entry) => tone(ramp(c, g, [[0, '#7aae52'], [0.4, '#5c9a3e'], [0.75, '#6a9a40'], [0.9, '#a6a24e'], [1, '#b39a58']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.12, flutter: 0.015, refHeight: 0.4, ground: 0 }, scale: rosetteScale(0.12, 0.5),
    layers: { stems: { color: green }, leaves: { color: green, materialOptions: { roughness: 0.75 } } },
    organs: {
      flower: { geometries: [ellipsoid(0.006, 0.005, 0.006, { detail: 0, color: '#ffffff' })], scale: (g) => smooth(0.4, 0.46, g) * (1 - smooth(0.58, 0.64, g)), color: (c, g, o) => tone(c.set('#f6f4e8'), o) },
      pod: { geometries: [sicklePod(random), sicklePod(random)], scale: (g) => smooth(0.55, 0.72, g), color: (c, g, o) => tone(ramp(c, g, [[0.55, '#8ab854'], [0.8, '#86a84a'], [0.92, '#b8a858'], [1, '#b0945a']]), o) },
    },
  })
  return { plot: { ...plot, rowGap: 1.3 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.45, back: 1.5, targetY: 0.12 }) }
}

/* ---------------------------------------------------------------- amaranth greens */
function amaranthVariant(random) {
  const stems = []
  const leaves = []
  for (let p = 0; p < 2; p += 1) {
    const base = out(random() * TAU, p * 0.04)
    const height = random.range(0.3, 0.48)
    const top = base.clone().add(V(random.gauss() * 0.03, height, random.gauss() * 0.03))
    const points = [base, base.clone().lerp(top, 0.5), top]
    stems.push(stem(points, (t) => lerp(0.005, 0.002, t), { radial: 4, tubular: 3, colorFn: shade(0.8, 1) }))
    const curve = new THREE.CatmullRomCurve3(points)
    let az = random() * TAU
    for (let k = 0; k < 11; k += 1) {
      const t = 0.1 + k * 0.085
      az += 2.4
      const s = lerp(1.1, 0.55, t) * random.range(0.9, 1.1)
      leaves.push(put(leaf({ length: 0.12 * s, width: 0.065 * s, shape: 'ovate', rise: lerp(0.4, 1.0, t), droop: 0.8, segments: 4, across: 1, cup: 0.25, petiole: 0.3, random }), curve.getPointAt(Math.min(1, t)), az))
    }
    for (let k = 0; k < 3; k += 1) leaves.push(put(leaf({ length: 0.05, width: 0.03, shape: 'ovate', rise: 1.2, droop: 0.4, segments: 3, across: 1, cup: 0.3, random }), top, az + k * 2.1))
  }
  return { stems: merge(stems), leaves: merge(leaves) }
}

function buildAmaranth(ctx) {
  const { random } = ctx
  const plot = { width: 8, depth: 10 }
  const { spots } = bedField(ctx, plot, { pitch: 1.3, top: 1.0, height: 0.1, rows: [-0.4, -0.2, 0, 0.2, 0.4], gap: 0.17 })
  // red and green kinds sown in blocks, with some mixing
  spots.forEach((spot) => { spot.kind = (Math.floor((spot.z + 20) / 2.2) % 2 === 0) !== (random() < 0.15) ? 1 : 0 })
  const variants = [0, 1, 2].map(() => amaranthVariant(random))
  const color = (c, g, entry) => tone(ramp(c, g, entry.kind ? [[0, '#7a6a3a'], [0.3, '#8a2f4a'], [1, '#7c2444']] : [[0, '#7aae4a'], [0.4, '#5f9a3a'], [1, '#5a9238']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.12, flutter: 0.016, refHeight: 0.45, ground: 0 }, scale: rosetteScale(0.12, 0.7),
    layers: { stems: { color }, leaves: { color, materialOptions: { roughness: 0.62 } } },
  })
  return { plot: { ...plot, rowGap: 1.3 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.5, back: 1.5, targetY: 0.15 }) }
}

export const heads = {
  cauliflower: (ctx) => buildCole(ctx, 'cauliflower'),
  cabbage: (ctx) => buildCole(ctx, 'cabbage'),
  broccoli: (ctx) => buildCole(ctx, 'broccoli'),
  lettuce: buildLettuce,
  spinach: buildSpinach,
  radish: (ctx) => rootCrop(ctx, 'radish'),
  turnip: (ctx) => rootCrop(ctx, 'turnip'),
  beetroot: (ctx) => rootCrop(ctx, 'beetroot'),
  carrot: (ctx) => rootCrop(ctx, 'carrot'),
  fenugreek: buildFenugreek,
  'amaranth-leaves': buildAmaranth,
}
