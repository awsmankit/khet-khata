// Medicinal and aromatic herb fields: tulsi, aloe vera, ashwagandha, menthol mint,
// lemongrass, stevia, isabgol and vetiver. All grown in rows on ploughed ridges.
import * as THREE from 'three'
import { blade, ellipsoid, lerp, merge, prep, smooth, transform, tube } from '../../geometry.js'
import { V, assembleField, ramp, rowSpots, tone } from '../../crops.js'

const TAU = Math.PI * 2
const tmp = new THREE.Color()

const cameras = {
  low: () => ({ position: V(5.2, 1.6, 10.2), target: V(-0.4, 0.25, 2.4) }),
  mid: () => ({ position: V(5.5, 1.9, 10.5), target: V(-0.4, 0.4, 2.4) }),
  tall: () => ({ position: V(6.1, 2.5, 11.2), target: V(-0.5, 0.75, 2.4) }),
}

// Points a leaf blade (built along +Z) out along azimuth `az` from `at`.
function place(geometry, at, az) {
  transform(geometry, { rotation: [0, Math.PI / 2 - az, 0] })
  geometry.translate(at.x, at.y, at.z)
  return geometry
}

function stemDirection(lean, az) {
  return V(Math.sin(lean) * Math.cos(az), Math.cos(lean), Math.sin(lean) * Math.sin(az))
}

// A curved branch from `start`, leaning `lean` radians off vertical toward `az`, bending upward.
function branchCurve(start, az, lean, length, lift = 0.25) {
  const dir = stemDirection(lean, az)
  const mid = start.clone().addScaledVector(dir, length * 0.5)
  const end = start.clone().addScaledVector(stemDirection(lean * (1 - lift), az), length)
  return { points: [start, mid, end], curve: new THREE.CatmullRomCurve3([start, mid, end]), end, dir }
}

function herbField(ctx, { variants, rowGap, plantGap, jitter = 0.25, wind, plant, attachments, materialOptions, camera, scarecrow }) {
  const { random, quality } = ctx
  const spots = rowSpots({ width: 12, depth: 16, rowGap, plantGap: plantGap / Math.sqrt(quality), random, jitter })
  assembleField(ctx, { variants, spots, baseY: 0.035, wind, plant, attachments, materialOptions })
  const config = { plot: { width: 12, depth: 16, rowGap }, soil: 'furrow', camera: cameras[camera]() }
  if (scarecrow !== undefined) config.scarecrow = scarecrow
  return config
}

/* ================================================================ tulsi */
function tulsiVariant(random) {
  const stems = []
  const leaves = []
  const spikes = []
  const height = random.range(0.52, 0.64)
  stems.push(tube([V(), V(0.005, 0.1, 0), V(0, 0.2, 0.005)], 0.011, 0.008, { radial: 5, tubular: 3, colorFn: (c, x, y) => c.setScalar(0.7 + y) }))
  // a leaf: young ones (near the tips) carry a purple tinge baked into the vertex colours
  const leaf = (at, az, size, young) => blade({
    length: 0.075 * size, width: 0.045 * size, rise: random.range(0.2, 0.65), droop: random.range(0.5, 0.95), segments: 3, fold: 0.28, shape: 'oval',
    base: young ? '#c8bcc4' : '#c4c4c4', tip: young ? '#d8b4d0' : '#ececec', rib: '#ffffff',
  })
  const branches = 9
  const tips = V()
  for (let b = 0; b < branches; b += 1) {
    const az = b * 2.4 + random.gauss() * 0.3
    const startY = random.range(0.04, 0.2)
    const lean = random.range(0.3, 0.85)
    const length = ((height - startY) / Math.cos(lean * 0.6)) * random.range(0.85, 1.04)
    const branch = branchCurve(V(0, startY, 0), az, lean, length, 0.45)
    stems.push(tube(branch.points, 0.0055, 0.0025, { radial: 4, tubular: 4, colorFn: (c, x, y) => c.setScalar(0.75 + y * 0.4) }))
    for (let node = 0; node < 6; node += 1) {
      const t = 0.2 + node * 0.14
      const at = branch.curve.getPointAt(t)
      const size = lerp(1.25, 0.8, t) * random.range(0.9, 1.1)
      for (const side of [-1, 1]) {
        const leafAz = az + side * Math.PI / 2 + (node % 2) * Math.PI / 2 + random.gauss() * 0.25
        leaves.push(place(leaf(at, leafAz, size, t > 0.85), at, leafAz))
        // short leafy side shoot in the leaf axil fills the bush out
        if (node > 0 && node < 4 && side === (node % 2 ? 1 : -1)) {
          const shootAz = leafAz + side * 0.5
          const shoot = at.clone().add(V(Math.cos(shootAz) * 0.03, 0.025, Math.sin(shootAz) * 0.03))
          leaves.push(place(leaf(shoot, shootAz + 0.6, size * 0.7, true), shoot, shootAz + 0.6))
          leaves.push(place(leaf(shoot, shootAz - 0.6, size * 0.7, true), shoot, shootAz - 0.6))
        }
      }
    }
    for (let index = 0; index < 4; index += 1) {
      const tipAz = az + (index / 4) * TAU
      leaves.push(place(blade({ length: 0.045, width: 0.028, rise: random.range(0.8, 1.15), droop: 0.5, segments: 3, fold: 0.3, shape: 'oval', base: '#c4b8c0', tip: '#dab6d2' }), branch.end, tipAz))
    }
    // purple flower spike
    const spikeTop = branch.end.clone().add(V(random.gauss() * 0.015, random.range(0.09, 0.13), random.gauss() * 0.015))
    spikes.push(tube([branch.end, branch.end.clone().lerp(spikeTop, 0.5), spikeTop], 0.0022, 0.0012, { radial: 3, tubular: 3, color: '#8a7a8a' }))
    for (let whorl = 0; whorl < 5; whorl += 1) {
      const at = branch.end.clone().lerp(spikeTop, 0.15 + whorl * 0.2)
      const r = 0.008 * (1 - whorl * 0.1)
      spikes.push(transform(ellipsoid(r, 0.0045, r, { widthSegments: 5, heightSegments: 2, colorFn: (c, x, y) => c.setScalar(0.85 + y * 30) }), { position: [at.x, at.y, at.z] }))
    }
    tips.add(branch.end)
  }
  tips.divideScalar(branches)
  return { plant: merge(stems), leaves: merge(leaves), spikes: merge(spikes), pivots: { leaves: V(), spikes: tips } }
}

function buildTulsi(ctx) {
  const variants = [0, 1, 2].map(() => tulsiVariant(ctx.random))
  return herbField(ctx, {
    variants, rowGap: 0.6, plantGap: 0.55, camera: 'mid',
    wind: { strength: 0.12, flutter: 0.012, refHeight: 0.6, ground: 0 },
    plant: {
      scale: (g) => [lerp(0.3, 1, smooth(0, 0.5, g)), lerp(0.22, 1, smooth(0, 0.55, g)), lerp(0.3, 1, smooth(0, 0.5, g))],
      color: (c, g, entry) => tone(ramp(c, g, [[0, '#6a7a44'], [0.5, '#6a5a48'], [1, '#6a5444']]), entry),
    },
    attachments: [
      { key: 'leaves', scale: () => 1, color: (c, g, entry) => tone(ramp(c, g, [[0, '#6a9a42'], [0.35, '#5a8c3a'], [0.65, '#55803a'], [0.9, '#5e7a3c'], [1, '#6a7a42']]).lerp(tmp.set('#5a3a4c'), Math.max(0, 0.1 + entry.tone * 2)), entry) },
      { key: 'spikes', scale: (g) => smooth(0.34, 0.5, g), color: (c, g, entry) => tone(ramp(c, g, [[0.34, '#6f7a4a'], [0.46, '#8a5a86'], [0.7, '#93629a'], [0.88, '#6e4a5a'], [1, '#5e4a42']]), entry) },
    ],
  })
}

/* ================================================================ aloe vera */
// A thick, channelled succulent leaf: four-sided cross-section (two edges, a sunken top
// channel and a rounded keel) tapering to a point, with small pale teeth on the edges.
function fleshyLeaf(random, { length, width, thickness, rise, droop, segments = 8, teeth = true }) {
  const positions = []
  const colors = []
  const indices = []
  const point = V()
  const step = length / segments
  const spots = () => (random() < 0.3 ? 1.18 : 1)
  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments
    const theta = rise - droop * Math.pow(t, 1.5)
    const half = (width / 2) * Math.pow(1 - t, 0.75) * Math.min(1, 0.75 + t * 2.5) + 0.0008
    const thick = thickness * Math.pow(1 - t, 0.7) + 0.0006
    const normal = V(0, Math.cos(theta), -Math.sin(theta))
    const left = point.clone().add(V(-half, 0, 0)).addScaledVector(normal, thick * 0.2)
    const right = point.clone().add(V(half, 0, 0)).addScaledVector(normal, thick * 0.2)
    const channel = point.clone().addScaledVector(normal, thick * 0.2 - half * 0.22)
    const keel = point.clone().addScaledVector(normal, -thick)
    const tipShade = 1 - smooth(0.85, 1, t) * 0.25
    for (const [vertex, value] of [[left, 0.86], [channel, 0.98 * spots()], [right, 0.86], [keel, 0.74 * spots()]]) {
      positions.push(vertex.x, vertex.y, vertex.z)
      const v = value * tipShade
      colors.push(v, v, v)
    }
    point.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar(step))
  }
  for (let row = 0; row < segments; row += 1) {
    const a = row * 4
    const b = a + 4
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4
      indices.push(a + side, b + side, a + next, a + next, b + side, b + next)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const parts = [prep(geometry)]
  if (teeth) {
    const toothPositions = []
    for (let row = 1; row < segments; row += 1) {
      for (const [edge, sign] of [[0, -1], [2, 1]]) {
        const i = (row * 4 + edge) * 3
        const j = ((row + 1) * 4 + edge) * 3
        const x = positions[i]
        const y = positions[i + 1]
        const z = positions[i + 2]
        const nx = positions[j]
        const ny = positions[j + 1]
        const nz = positions[j + 2]
        toothPositions.push(x, y, z, lerp(x, nx, 0.45), lerp(y, ny, 0.45), lerp(z, nz, 0.45), lerp(x, nx, 0.6) + sign * 0.005, lerp(y, ny, 0.6), lerp(z, nz, 0.6))
      }
    }
    const toothGeometry = new THREE.BufferGeometry()
    toothGeometry.setAttribute('position', new THREE.Float32BufferAttribute(toothPositions, 3))
    toothGeometry.computeVertexNormals()
    parts.push(prep(toothGeometry, '#ffffff', (c) => c.setScalar(1.05)))
  }
  return merge(parts)
}

function aloeVariant(random, withStalk) {
  const leaves = []
  const count = 17
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1) // 0 = outer, oldest
    const az = index * 2.4 + random.gauss() * 0.15
    const geometry = fleshyLeaf(random, {
      length: lerp(0.58, 0.34, t) * random.range(0.9, 1.08),
      width: lerp(0.085, 0.06, t),
      thickness: lerp(0.024, 0.018, t),
      rise: lerp(0.95, 1.42, t) + random.gauss() * 0.06,
      droop: lerp(0.6, 0.15, t) + random.range(0, 0.2),
    })
    leaves.push(place(geometry, V(0, 0.01 + t * 0.05, 0), az))
  }
  const variant = { plant: merge(leaves), pivots: {} }
  if (withStalk) {
    const parts = []
    const lean = V(random.gauss() * 0.06, 0, random.gauss() * 0.06)
    const top = V(lean.x, random.range(0.95, 1.1), lean.z)
    const raceme = top.clone().add(V(lean.x * 0.3, 0.24, lean.z * 0.3))
    parts.push(tube([V(0, 0.06, 0), V(lean.x * 0.4, 0.55, lean.z * 0.4), top, raceme], 0.009, 0.004, { radial: 5, tubular: 7, color: '#a8a890' }))
    const flowers = 34
    for (let index = 0; index < flowers; index += 1) {
      const t = index / flowers
      const at = top.clone().lerp(raceme, t)
      const az = index * 2.4
      const open = t < 0.62
      const dir = open ? V(Math.cos(az) * 0.5, -0.85, Math.sin(az) * 0.5).normalize() : V(Math.cos(az) * 0.5, 0.6, Math.sin(az) * 0.5).normalize()
      const length = open ? 0.03 : 0.02 * (1.15 - t * 0.5)
      const flower = prep(new THREE.CylinderGeometry(0.0045, 0.0032, length, 5, 1), '#ffffff', (c, x, y) => (open ? c.set('#f0902c').lerp(tmp.set('#f7c24a'), smooth(0, -length / 2, y)) : c.set('#a8b056').lerp(tmp.set('#e0a040'), 0.3)))
      flower.translate(0, length / 2, 0)
      const base = at.clone().add(V(Math.cos(az) * 0.008, 0, Math.sin(az) * 0.008))
      flower.applyMatrix4(new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(1, 1, 1)))
      parts.push(flower)
    }
    variant.stalk = merge(parts)
    variant.pivots.stalk = V(0, 0.06, 0)
  }
  return variant
}

function buildAloe(ctx) {
  const variants = [aloeVariant(ctx.random, true), aloeVariant(ctx.random, false), aloeVariant(ctx.random, false)]
  return herbField(ctx, {
    variants, rowGap: 0.75, plantGap: 0.55, jitter: 0.15, camera: 'mid', scarecrow: false,
    wind: { strength: 0.04, flutter: 0.002, refHeight: 0.6, ground: 0 },
    materialOptions: { roughness: 0.5 },
    plant: {
      scale: (g) => lerp(0.4, 1, smooth(0, 0.5, g)),
      color: (c, g, entry) => tone(ramp(c, g, [[0, '#7f9a66'], [0.4, '#71905c'], [0.8, '#7a9460'], [1, '#86966a']]), entry),
    },
    attachments: [{
      key: 'stalk',
      scale: (g) => smooth(0.4, 0.5, g) * (1 - smooth(0.72, 0.8, g)),
      color: (c, g, entry) => tone(ramp(c, g, [[0.4, '#c8d0b0'], [0.5, '#ffffff'], [0.66, '#ffffff'], [0.75, '#c8a878']]), entry),
      materialOptions: { roughness: 0.6 },
    }],
  })
}

/* ================================================================ ashwagandha */
function husk() {
  const profile = []
  for (let index = 0; index <= 4; index += 1) {
    const t = index / 4
    profile.push(new THREE.Vector2(Math.max(0.0012, 0.015 * Math.sin(Math.PI * Math.pow(t, 0.8)) * (t > 0.92 ? 0.7 : 1)), -t * 0.036))
  }
  const geometry = new THREE.LatheGeometry(profile, 5)
  return prep(geometry, '#ffffff', (c, x, y) => c.setScalar(0.85 + Math.abs(Math.sin(Math.atan2(x, 0.0001 + Math.abs(y)) * 5)) * 0.15))
}

function ashwagandhaVariant(random) {
  const stems = []
  const leaves = []
  const husks = []
  const berries = []
  const height = random.range(0.62, 0.92)
  stems.push(tube([V(), V(0.01, height * 0.4, 0), V(-0.01, height, 0.01)], 0.011, 0.004, { radial: 5, tubular: 4, colorFn: (c, x, y) => c.setScalar(0.72 + y * 0.3) }))
  const branches = 5
  const fruitCenter = V()
  let fruitCount = 0
  for (let b = 0; b <= branches; b += 1) {
    const main = b === branches
    const az = b * 2.4 + random.gauss() * 0.3
    const startY = main ? height * 0.45 : random.range(0.06, 0.3)
    const lean = main ? 0.1 : random.range(0.3, 0.6)
    const length = main ? height * 0.55 : (height - startY) * random.range(0.85, 1.05)
    const branch = branchCurve(V(0, startY, 0), az, lean, length, 0.35)
    if (!main) stems.push(tube(branch.points, 0.006, 0.0025, { radial: 4, tubular: 4, colorFn: (c, x, y) => c.setScalar(0.75 + y * 0.3) }))
    for (let node = 0; node < 7; node += 1) {
      const t = 0.2 + node * 0.12
      const at = branch.curve.getPointAt(Math.min(1, t))
      const side = node % 2 ? 1 : -1
      const leafAz = az + side * (Math.PI / 2 + random.gauss() * 0.3)
      const size = lerp(1.15, 0.7, t)
      leaves.push(place(blade({ length: 0.085 * size, width: 0.05 * size, rise: random.range(0.2, 0.5), droop: random.range(0.6, 1.0), segments: 3, fold: 0.2, shape: 'oval', base: '#b0b0b0', tip: '#dadada', rib: '#eeeeee' }), at, leafAz))
      if (t > 0.3 && t < 0.9 && (node % 2 === 0 || random() < 0.3)) {
        // lantern husk hanging below the node
        const hangAz = leafAz + Math.PI * 0.8
        const hang = at.clone().add(V(Math.cos(hangAz) * 0.012, -0.008, Math.sin(hangAz) * 0.012))
        const tilt = new THREE.Quaternion().setFromAxisAngle(V(Math.sin(hangAz), 0, -Math.cos(hangAz)), random.range(0.1, 0.4))
        const huskGeometry = husk()
        huskGeometry.applyMatrix4(new THREE.Matrix4().compose(hang, tilt, V(1, 1, 1)))
        husks.push(huskGeometry)
        const berry = ellipsoid(0.0075, 0.0075, 0.0075, { widthSegments: 5, heightSegments: 3, colorFn: (c, x, y) => c.setScalar(0.85 + y * 15) })
        const tip = V(0, -0.034, 0).applyQuaternion(tilt).add(hang)
        berry.translate(tip.x, tip.y, tip.z)
        berries.push(berry)
        fruitCenter.add(hang)
        fruitCount += 1
      }
    }
    for (let leaf = 0; leaf < 3; leaf += 1) leaves.push(place(blade({ length: 0.045, width: 0.028, rise: 0.9, droop: 0.5, segments: 3, fold: 0.25, shape: 'oval', base: '#bdbdbd', tip: '#e6e6e6' }), branch.end, az + (leaf / 3) * TAU))
  }
  fruitCenter.divideScalar(Math.max(1, fruitCount))
  return { plant: merge(stems), leaves: merge(leaves), husks: merge(husks), berries: merge(berries), pivots: { leaves: V(), husks: fruitCenter, berries: fruitCenter } }
}

function buildAshwagandha(ctx) {
  const variants = [0, 1, 2].map(() => ashwagandhaVariant(ctx.random))
  return herbField(ctx, {
    variants, rowGap: 0.6, plantGap: 0.45, camera: 'mid',
    wind: { strength: 0.14, flutter: 0.012, refHeight: 0.8, ground: 0 },
    materialOptions: { roughness: 0.92 },
    plant: {
      scale: (g) => [lerp(0.25, 1, smooth(0.04, 0.5, g)), lerp(0.15, 1, smooth(0.04, 0.55, g)), lerp(0.25, 1, smooth(0.04, 0.5, g))],
      color: (c, g, entry) => tone(ramp(c, g, [[0, '#7c8a5a'], [0.6, '#7a8458'], [1, '#8a7c5a']]), entry),
    },
    attachments: [
      { key: 'leaves', scale: (g) => 1 - smooth(0.9, 1, g) * 0.35, color: (c, g, entry) => tone(ramp(c, g, [[0, '#7a9060'], [0.5, '#6f875a'], [0.78, '#7f8a58'], [0.9, '#a39a5a'], [1, '#9a8a5a']]), entry) },
      { key: 'husks', scale: (g) => smooth(0.42, 0.58, g), color: (c, g, entry) => tone(ramp(c, g, [[0.42, '#8aa85a'], [0.62, '#93a456'], [0.76, '#c4b27a'], [0.9, '#cfb886'], [1, '#bfa47a']]), entry), materialOptions: { roughness: 0.85, side: THREE.DoubleSide } },
      { key: 'berries', scale: (g) => smooth(0.58, 0.7, g), color: (c, g, entry) => tone(ramp(c, g, [[0.58, '#7a9a3a'], [0.68, '#d27a2a'], [0.8, '#d8401f'], [1, '#c0301c']]), entry), materialOptions: { roughness: 0.35 } },
    ],
  })
}

/* ================================================================ mint */
function mintVariant(random) {
  const stems = []
  const leaves = []
  const spikes = []
  const tips = V()
  const count = 9
  for (let index = 0; index < count; index += 1) {
    const az = (index / count) * TAU + random.gauss() * 0.4
    const start = V(Math.cos(az) * random.range(0.03, 0.14), 0, Math.sin(az) * random.range(0.03, 0.14))
    const lean = random.range(0.35, 0.8)
    const height = random.range(0.28, 0.45)
    const branch = branchCurve(start, az, lean, height / Math.cos(lean * 0.6), 0.5)
    stems.push(tube(branch.points, 0.0032, 0.0022, { radial: 4, tubular: 4, colorFn: (c, x, y) => c.setScalar(0.7 + y * 0.6) }))
    for (let node = 0; node < 5; node += 1) {
      const t = 0.12 + node * 0.18
      const at = branch.curve.getPointAt(t)
      for (const side of [-1, 1]) {
        const leafAz = az + side * Math.PI / 2 + (node % 2) * Math.PI / 2 + random.gauss() * 0.2
        const size = lerp(1.15, 0.8, t)
        const leaf = blade({ length: 0.085 * size, width: 0.055 * size, rise: random.range(0.1, 0.45), droop: random.range(0.4, 0.8), segments: 3, fold: 0.3, shape: 'oval', base: '#a4a4a4', tip: '#d8d8d8', rib: '#f0f0f0' })
        // crinkled surface: break up the shading
        const color = leaf.attributes.color
        for (let v = 0; v < color.count; v += 1) {
          const k = 0.86 + random() * 0.22
          color.setXYZ(v, color.getX(v) * k, color.getY(v) * k, color.getZ(v) * k)
        }
        leaves.push(place(leaf, at, leafAz))
      }
    }
    for (let leaf = 0; leaf < 3; leaf += 1) leaves.push(place(blade({ length: 0.05, width: 0.032, rise: 0.85, droop: 0.4, segments: 3, fold: 0.3, shape: 'oval', base: '#bcbcbc', tip: '#ececec' }), branch.end, az + (leaf / 3) * TAU))
    // lilac flower spike at the tip
    const top = branch.end.clone().add(V(0, 0.055, 0))
    spikes.push(tube([branch.end, branch.end.clone().lerp(top, 0.5), top], 0.0022, 0.0014, { radial: 3, tubular: 2, color: '#9a9a9a' }))
    for (let whorl = 0; whorl < 3; whorl += 1) {
      const at = branch.end.clone().lerp(top, 0.3 + whorl * 0.3)
      spikes.push(transform(ellipsoid(0.008 - whorl * 0.0012, 0.009, 0.008 - whorl * 0.0012, { widthSegments: 5, heightSegments: 2, colorFn: (c) => c.setScalar(random.range(0.88, 1.02)) }), { position: [at.x, at.y, at.z] }))
    }
    tips.add(branch.end)
  }
  tips.divideScalar(count)
  return { plant: merge(stems), leaves: merge(leaves), spikes: merge(spikes), pivots: { leaves: V(), spikes: tips } }
}

function buildMint(ctx) {
  const variants = [0, 1, 2].map(() => mintVariant(ctx.random))
  return herbField(ctx, {
    variants, rowGap: 0.5, plantGap: 0.4, jitter: 0.35, camera: 'low',
    wind: { strength: 0.12, flutter: 0.012, refHeight: 0.45, ground: 0 },
    materialOptions: { roughness: 0.82 },
    plant: {
      scale: (g) => [lerp(0.3, 1, smooth(0, 0.5, g)), lerp(0.2, 1, smooth(0.03, 0.6, g)), lerp(0.3, 1, smooth(0, 0.5, g))],
      color: (c, g, entry) => tone(ramp(c, g, [[0, '#6a7a44'], [0.7, '#5d6a40'], [1, '#6a5a40']]), entry),
    },
    attachments: [
      { key: 'leaves', scale: () => 1, color: (c, g, entry) => tone(ramp(c, g, [[0, '#6fa04a'], [0.35, '#4f8a38'], [0.7, '#4a8236'], [0.9, '#5d8a3c'], [1, '#6f8a42']]), entry) },
      { key: 'spikes', scale: (g) => smooth(0.66, 0.8, g), color: (c, g, entry) => tone(ramp(c, g, [[0.66, '#8a9a6a'], [0.76, '#b7a2cc'], [0.92, '#c2a8d6'], [1, '#a890b8']]), entry), materialOptions: { roughness: 0.9 } },
    ],
  })
}

/* ================================================================ lemongrass */
function lemongrassVariant(random) {
  const parts = []
  for (let index = 0; index < 9; index += 1) {
    const az = random() * TAU
    const base = V(Math.cos(az) * random.range(0, 0.05), 0, Math.sin(az) * random.range(0, 0.05))
    const lean = random.range(0.05, 0.25)
    parts.push(tube([base, base.clone().addScaledVector(stemDirection(lean, az), 0.12), base.clone().addScaledVector(stemDirection(lean, az), 0.24)], 0.011, 0.008, { radial: 5, tubular: 2, colorFn: (c, x, y) => c.set('#c9b9a0').lerp(tmp.set('#d6d8b8'), Math.min(1, y * 4)) }))
  }
  const blades = 38
  for (let index = 0; index < blades; index += 1) {
    const az = random() * TAU
    const at = V(Math.cos(az) * random.range(0.01, 0.06), random.range(0.08, 0.22), Math.sin(az) * random.range(0.01, 0.06))
    parts.push(place(blade({ length: random.range(0.95, 1.45), width: random.range(0.016, 0.022), rise: random.range(1.32, 1.54), droop: random.range(0.95, 1.8), segments: 7, fold: 0.3, base: '#c8c8b8', tip: '#f2f2e6', rib: '#ffffff' }), at, az))
  }
  return { plant: merge(parts) }
}

function buildLemongrass(ctx) {
  const variants = [0, 1, 2].map(() => lemongrassVariant(ctx.random))
  // grows tall, is cut back to a stub at the first harvest, then regrows
  const height = (g) => (g < 0.58 ? lerp(0.18, 1, smooth(0, 0.5, g)) : lerp(0.3, 0.95, smooth(0.62, 0.9, g)))
  return herbField(ctx, {
    variants, rowGap: 0.75, plantGap: 0.6, jitter: 0.12, camera: 'tall',
    wind: { strength: 0.22, flutter: 0.016, refHeight: 1.2, ground: 0 },
    plant: {
      scale: (g) => {
        const h = height(g)
        return [lerp(0.5, 1, h), h, lerp(0.5, 1, h)]
      },
      color: (c, g, entry) => tone(ramp(c, g, [[0, '#86a84e'], [0.45, '#7ea24a'], [0.56, '#8aa450'], [0.6, '#a8a462'], [0.68, '#8aac52'], [0.9, '#7ea24a'], [1, '#8aa250']]), entry),
    },
  })
}

/* ================================================================ stevia */
function steviaVariant(random) {
  const stems = []
  const leaves = []
  const flowers = []
  const tops = V()
  const count = 7
  for (let index = 0; index < count; index += 1) {
    const az = (index / count) * TAU + random.gauss() * 0.4
    const start = V(Math.cos(az) * 0.02, 0, Math.sin(az) * 0.02)
    const height = random.range(0.4, 0.55)
    const lean = random.range(0.12, 0.45)
    const branch = branchCurve(start, az, lean, height, 0.3)
    stems.push(tube(branch.points, 0.004, 0.0022, { radial: 4, tubular: 4, colorFn: (c, x, y) => c.setScalar(0.72 + y * 0.5) }))
    for (let node = 0; node < 7; node += 1) {
      const t = 0.14 + node * 0.125
      const at = branch.curve.getPointAt(t)
      for (const side of [-1, 1]) {
        const leafAz = az + side * Math.PI / 2 + (node % 2) * Math.PI / 2 + random.gauss() * 0.2
        const size = lerp(1.15, 0.7, t)
        leaves.push(place(blade({ length: 0.08 * size, width: 0.032 * size, rise: random.range(0.3, 0.7), droop: random.range(0.4, 0.8), segments: 3, fold: 0.3, shape: 'lance', base: '#b4b4b4', tip: '#e4e4e4', rib: '#f6f6f6' }), at, leafAz))
      }
    }
    for (let leaf = 0; leaf < 3; leaf += 1) leaves.push(place(blade({ length: 0.03, width: 0.012, rise: 1.0, droop: 0.4, segments: 3, fold: 0.3, shape: 'lance', base: '#bebebe', tip: '#eeeeee' }), branch.end, az + (leaf / 3) * TAU))
    // tiny white flower heads in a flat-topped cluster
    for (let head = 0; head < 6; head += 1) {
      const a = random() * TAU
      const r = Math.sqrt(random()) * 0.032
      const at = branch.end.clone().add(V(Math.cos(a) * r, 0.012 + (0.032 - r) * 0.3, Math.sin(a) * r))
      flowers.push(transform(ellipsoid(0.0055, 0.0045, 0.0055, { widthSegments: 5, heightSegments: 2, colorFn: (c) => c.setScalar(random.range(0.9, 1)) }), { position: [at.x, at.y, at.z] }))
    }
    tops.add(branch.end)
  }
  tops.divideScalar(count)
  return { plant: merge(stems), leaves: merge(leaves), flowers: merge(flowers), pivots: { leaves: V(), flowers: tops } }
}

function buildStevia(ctx) {
  const variants = [0, 1, 2].map(() => steviaVariant(ctx.random))
  // grows bushy, is cut at the first harvest, regrows and flowers, then is cut back
  const size = (g) => {
    if (g < 0.47) return lerp(0.25, 1, smooth(0, 0.42, g))
    if (g < 0.94) return lerp(0.45, 1, smooth(0.5, 0.74, g))
    return 0.42
  }
  return herbField(ctx, {
    variants, rowGap: 0.5, plantGap: 0.4, camera: 'low',
    wind: { strength: 0.12, flutter: 0.012, refHeight: 0.5, ground: 0 },
    plant: {
      scale: (g) => {
        const s = size(g)
        return [lerp(0.6, 1, s), s, lerp(0.6, 1, s)]
      },
      color: (c, g, entry) => tone(c.set('#6a8048'), entry),
    },
    attachments: [
      { key: 'leaves', scale: () => 1, color: (c, g, entry) => tone(ramp(c, g, [[0, '#6aa040'], [0.4, '#58903a'], [0.48, '#6aa646'], [0.7, '#5a923a'], [0.9, '#6a8a3e'], [1, '#6aa040']]), entry) },
      { key: 'flowers', scale: (g) => smooth(0.76, 0.84, g) * (1 - smooth(0.92, 0.95, g)), color: (c, g, entry) => tone(c.set('#f4f2ea'), entry), materialOptions: { roughness: 0.9 } },
    ],
  })
}

/* ================================================================ isabgol */
function isabgolVariant(random) {
  const leaves = []
  const spikes = []
  for (let index = 0; index < 16; index += 1) {
    const az = index * 2.4 + random.gauss() * 0.2
    leaves.push(place(blade({ length: random.range(0.12, 0.2), width: random.range(0.007, 0.01), rise: random.range(0.9, 1.35), droop: random.range(0.7, 1.4), segments: 3, fold: 0.35, shape: 'strap', base: '#a6a6a6', tip: '#dedede' }), V(0, 0.005, 0), az))
  }
  const scapes = 7
  for (let index = 0; index < scapes; index += 1) {
    const az = random() * TAU
    const lean = random.range(0.05, 0.3)
    const height = random.range(0.2, 0.32)
    const dir = stemDirection(lean, az)
    const top = dir.clone().multiplyScalar(height).add(V(0, 0.01, 0))
    spikes.push(tube([V(0, 0.01, 0), dir.clone().multiplyScalar(height * 0.5).add(V(0, 0.01, 0)), top], 0.0013, 0.0011, { radial: 3, tubular: 2, color: '#b8b8b8' }))
    const spike = ellipsoid(0.008, 0.026, 0.008, { widthSegments: 5, heightSegments: 4, colorFn: (c, x, y) => c.setScalar(0.85 + 0.15 * Math.abs(Math.sin(y * 420))) })
    spike.applyMatrix4(new THREE.Matrix4().compose(top.clone().addScaledVector(dir, 0.024), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(1, 1, 1)))
    spikes.push(spike)
  }
  return { plant: merge(leaves), spikes: merge(spikes), pivots: { spikes: V() } }
}

function buildIsabgol(ctx) {
  const variants = [0, 1, 2].map(() => isabgolVariant(ctx.random))
  return herbField(ctx, {
    variants, rowGap: 0.3, plantGap: 0.22, jitter: 0.35, camera: 'low',
    wind: { strength: 0.14, flutter: 0.01, refHeight: 0.3, ground: 0 },
    plant: {
      scale: (g) => [lerp(0.3, 1, smooth(0.03, 0.45, g)), lerp(0.2, 1, smooth(0.03, 0.5, g)), lerp(0.3, 1, smooth(0.03, 0.45, g))],
      color: (c, g, entry) => tone(ramp(c, g, [[0, '#7aa04a'], [0.4, '#6a9442'], [0.7, '#7a9246'], [0.84, '#aca05a'], [1, '#c4ac6c']]), entry),
    },
    attachments: [{
      key: 'spikes',
      scale: (g) => smooth(0.44, 0.6, g),
      color: (c, g, entry) => tone(ramp(c, g, [[0.44, '#8aa45a'], [0.58, '#a8b06a'], [0.68, '#e0dcc4'], [0.8, '#cbbf98'], [0.92, '#b8946a'], [1, '#a88860']]), entry),
    }],
  })
}

/* ================================================================ vetiver */
function vetiverVariant(random, culms) {
  const parts = []
  const blades = 54
  for (let index = 0; index < blades; index += 1) {
    const az = random() * TAU
    const at = V(Math.cos(az) * random.range(0, 0.07), random.range(0, 0.06), Math.sin(az) * random.range(0, 0.07))
    parts.push(place(blade({ length: random.range(0.9, 1.5), width: random.range(0.008, 0.012), rise: random.range(1.42, 1.55), droop: random.range(0.15, 0.55), segments: 5, fold: 0.45, base: '#a8a8a0', tip: '#e2e2d4', rib: '#f0f0e6' }), at, az))
  }
  const variant = { plant: merge(parts), pivots: {} }
  if (culms) {
    const heads = []
    for (let index = 0; index < culms; index += 1) {
      const az = random() * TAU
      const lean = random.range(0.03, 0.12)
      const height = random.range(1.55, 1.85)
      const dir = stemDirection(lean, az)
      const top = dir.clone().multiplyScalar(height)
      heads.push(tube([V(), dir.clone().multiplyScalar(height * 0.5), top], 0.0035, 0.0022, { radial: 3, tubular: 4, color: '#b8b0a0' }))
      // narrow upright purplish panicle
      for (let branch = 0; branch < 12; branch += 1) {
        const at = top.clone().addScaledVector(dir, branch * 0.022)
        const a = branch * 2.4
        const out = V(Math.cos(a) * 0.035, 0.09, Math.sin(a) * 0.035)
        heads.push(tube([at, at.clone().addScaledVector(out, 0.5), at.clone().add(out)], 0.0012, 0.0008, { radial: 3, tubular: 2, color: '#9a8890' }))
      }
    }
    variant.culms = merge(heads)
    variant.pivots.culms = V(0, 0.3, 0)
  }
  return variant
}

function buildVetiver(ctx) {
  const variants = [vetiverVariant(ctx.random, 3), vetiverVariant(ctx.random, 0), vetiverVariant(ctx.random, 2)]
  return herbField(ctx, {
    variants, rowGap: 0.6, plantGap: 0.5, jitter: 0.12, camera: 'tall',
    wind: { strength: 0.12, flutter: 0.01, refHeight: 1.4, ground: 0 },
    plant: {
      scale: (g) => [lerp(0.45, 1, smooth(0, 0.5, g)), lerp(0.18, 1, smooth(0, 0.55, g)), lerp(0.45, 1, smooth(0, 0.5, g))],
      color: (c, g, entry) => tone(ramp(c, g, [[0, '#6f9248'], [0.4, '#5a7d3e'], [0.75, '#5f7c40'], [0.9, '#7c8450'], [1, '#86844f']]), entry),
    },
    attachments: [{
      key: 'culms',
      scale: (g) => smooth(0.6, 0.72, g) * (1 - smooth(0.92, 0.98, g)),
      color: (c, g, entry) => tone(ramp(c, g, [[0.6, '#8a9a6a'], [0.72, '#a07a96'], [0.85, '#8a6a7a'], [1, '#9a8468']]), entry),
    }],
  })
}

export const herbModels = {
  tulsi: {
    build: buildTulsi,
    stages: [[0, 'Transplanted'], [0.2, 'Branching'], [0.4, 'Flower spikes'], [0.65, 'Full bloom'], [0.88, 'Ready to cut']],
    showcase: 0.62,
  },
  'aloe-vera': {
    build: buildAloe,
    stages: [[0, 'Suckers planted', 'Jul'], [0.22, 'Rosettes fill out', 'Oct'], [0.45, 'Flower stalks', 'Jan'], [0.7, 'First leaf cut', 'Apr'], [0.88, 'Mature rosettes', 'Jun']],
    showcase: 0.56,
  },
  ashwagandha: {
    build: buildAshwagandha,
    stages: [[0, 'Sowing'], [0.15, 'Seedlings'], [0.32, 'Branching'], [0.46, 'Flowering'], [0.66, 'Berries ripen'], [0.88, 'Leaves dry, roots dug']],
    showcase: 0.78,
  },
  mint: {
    build: buildMint,
    stages: [[0, 'Suckers planted'], [0.15, 'Sprouting'], [0.38, 'Spreading'], [0.68, 'Flowering'], [0.88, 'Ready to cut']],
    showcase: 0.76,
  },
  lemongrass: {
    build: buildLemongrass,
    stages: [[0, 'Slips planted', 'Jun'], [0.2, 'Tillering', 'Aug'], [0.45, 'Ready to cut', 'Oct'], [0.6, 'After cutting', 'Nov'], [0.85, 'Regrown', 'Feb']],
    showcase: 0.5,
  },
  stevia: {
    build: buildStevia,
    stages: [[0, 'Cuttings planted', 'Feb'], [0.25, 'Bushy growth', 'Apr'], [0.45, 'First harvest', 'Jun'], [0.6, 'Regrowth', 'Aug'], [0.78, 'Flowering', 'Oct'], [0.95, 'Cut back', 'Dec']],
    showcase: 0.8,
  },
  isabgol: {
    build: buildIsabgol,
    stages: [[0, 'Sowing'], [0.15, 'Seedlings'], [0.32, 'Tillering'], [0.48, 'Spikes emerge'], [0.66, 'Flowering and seed fill'], [0.88, 'Ready to harvest']],
    showcase: 0.74,
  },
  vetiver: {
    build: buildVetiver,
    stages: [[0, 'Slips planted', 'Jul'], [0.22, 'Tillering', 'Oct'], [0.45, 'Dense clumps', 'Jan'], [0.66, 'Flowering', 'Apr'], [0.88, 'Roots dug', 'Jun']],
    showcase: 0.5,
  },
}
