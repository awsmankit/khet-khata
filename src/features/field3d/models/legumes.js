// 3D models for the "legume" group of crops (pulses, oilseeds, fibre and cash crops). See MODELS_BRIEF.md.
//
// Two shared families built on one stem-skeleton engine (./legume/plant.js):
//  - pulse(): the legume bush family. Parameters: habit (erect, bushy, spreading, mat,
//    climbing, shrub), leaf type (pinnate, trifoliate, tetrafoliate, tendril), leaflet
//    size, flower colour, pod shape, placement and colour ramp.
//  - herb(): upright herbs and bushes with simple or palmate leaves and their own
//    flowering sites (heads, trumpets, cups, spikes, bolls).
import * as THREE from 'three'
import { lerp, smooth, tube, transform, prep, merge, ellipsoid } from '../engine/geometry.js'
import { tone, shade } from '../engine/plantKit.js'
import { V, aim, leaflet, compoundLeaf, simpleLeaf, palmateLeaf, peaFlower, cupFlower, trumpet, daisy, pod, squareCapsule, spinyCapsule, lint, bur } from './legumes/parts.js'
import { plantField, legumeSites, rampFn, growth, heading, flat, pick, propField } from './legumes/plant.js'

const solid = (hex) => (c, g, entry) => tone(c.set(hex), entry)
const span = (a, b, fadeIn = 0.05, fadeOut = 0.06) => (g) => smooth(a, a + fadeIn, g) * (1 - smooth(b - fadeOut, b, g))

/* ================================================================== pulse family */
function buildPulse(ctx, P) {
  const t = P.t
  const leafOptions = P.leaf
  const podShape = P.pod.shape
  const spec = {
    habit: P.habit,
    leaf: (random, node) => {
      if (P.leafChance && random() > P.leafChance) return null
      const geometry = compoundLeaf(random, { ...leafOptions, rise: pick(random, leafOptions.rise ?? [0.4, 0.7]), droop: pick(random, leafOptions.droop ?? [0.4, 0.8]) })
      const s = random.range(0.85, 1.1) * (1 - (P.leafShrink ?? 0.25) * node.t)
      geometry.scale(s, s, s)
      return geometry
    },
    sites: (random, sk, out) => {
      if (P.sites) { P.sites(random, sk, out); return }
      legumeSites(random, sk, out, {
        pod: { ...P.pod, make: (r) => pod({ ...podShape, length: podShape.length * r.range(0.85, 1.1) }) },
        flower: { ...P.flower, make: () => peaFlower({ size: P.flower.size, streak: P.flower.streak ?? null }) },
      })
    },
    rowGap: P.rowGap,
    plantGap: P.plantGap,
    jitter: P.jitter,
    height: P.height,
    budget: P.budget,
    wind: { strength: P.wind ?? 0.16, flutter: P.flutter ?? 0.012, refHeight: Math.max(0.4, P.height), ground: 0 },
    plant: { scale: P.grow ?? growth.plant(t), color: rampFn(P.colors.stem ?? P.colors.leaf) },
    parts: [
      { key: 'leaves', scale: growth.leaves(t), color: rampFn(P.colors.leaf), materialOptions: { roughness: P.roughness ?? 0.72 } },
      { key: 'stalks', scale: growth.stalks(t), color: rampFn(P.colors.stem ?? P.colors.leaf) },
      { key: 'flowers', scale: growth.flowers(t), color: solid(P.flower.color), materialOptions: { roughness: 0.6, emissive: P.flower.glow ?? '#000000' } },
      { key: 'pods', scale: growth.pods(t), color: rampFn(P.colors.pod), materialOptions: { roughness: P.podRoughness ?? 0.7 } },
      ...(P.parts || []),
    ],
    extras: P.extras,
    camera: P.camera,
  }
  return plantField(ctx, spec)
}
const pulse = (P) => ({ stages: P.stages, showcase: P.showcase, build: (ctx) => buildPulse(ctx, P) })

const trifoliate = (leaflet, more = {}) => ({ pairs: 1, terminal: true, petiole: 0.05, rachis: 0.012, side: 1.15, stalk: 'ribbon', stalkRadius: 0.0011, taper: 0, terminalScale: 1.08, leaflet: { rows: 1, fold: 0.2, rise: 0.12, droop: 0.45, shape: 'oval', base: 0.6, tip: 0.94, rib: 1, ...leaflet }, ...more })
const pinnate = (leaflet, more = {}) => ({ pairs: 5, terminal: true, petiole: 0.006, rachis: 0.04, side: 1.0, stalk: 'ribbon', stalkRadius: 0.0007, taper: 0.2, terminalScale: 1, leaflet: { rows: 0, fold: 0.3, rise: 0.1, droop: 0.2, shape: 'obovate', base: 0.62, tip: 0.95, ...leaflet }, ...more })

// Field-pea twig supports and paddy stubble for utera lathyrus.
function peaSticks(ctx, { plot }) {
  const random = ctx.random
  const twig = []
  twig.push(tube([V(), V(0.01, 0.4, 0), V(-0.01, 0.82, 0.01)], 0.005, 0.003, { radial: 3, tubular: 3, color: '#8a7a62' }))
  for (const [y, a, len] of [[0.3, 0.4, 0.26], [0.48, 2.6, 0.24], [0.62, 4.4, 0.2]]) {
    const start = V(0, y, 0)
    const end = start.clone().add(V(Math.cos(a) * len * 0.6, len * 0.8, Math.sin(a) * len * 0.6))
    twig.push(tube([start, start.clone().lerp(end, 0.5).add(V(0, 0.02, 0)), end], 0.0028, 0.0015, { radial: 3, tubular: 2, color: '#8e7c64' }))
  }
  const geometry = merge(twig)
  const placements = []
  const rowGap = 0.45
  for (let x = -plot.width / 2 + rowGap / 2; x < plot.width / 2; x += rowGap) {
    for (let z = -plot.depth / 2 + 0.3; z < plot.depth / 2; z += 0.7) placements.push([V(x + random.gauss() * 0.03, 0.02, z + random.gauss() * 0.08), random() * Math.PI * 2, random.range(0.85, 1.1), random.gauss() * 0.06, random.gauss() * 0.06])
  }
  propField(ctx, geometry, placements, { roughness: 1 })
}

function paddyStubble(ctx, { plot }) {
  const random = ctx.random
  const straws = []
  for (let k = 0; k < 7; k += 1) {
    const a = (k / 7) * Math.PI * 2
    const h = random.range(0.1, 0.17)
    const straw = prep(new THREE.CylinderGeometry(0.0022, 0.0028, h, 3, 1, true), '#ffffff', (c, x, y) => c.setScalar(lerp(0.6, 1, y / h + 0.5)))
    straw.translate(0, h / 2, 0)
    transform(straw, { rotation: [Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18] })
    straw.translate(Math.cos(a) * 0.012, 0, Math.sin(a) * 0.012)
    straws.push(straw)
  }
  const geometry = merge(straws)
  const colors = geometry.attributes.color
  const tint = new THREE.Color('#c9b07a')
  for (let index = 0; index < colors.count; index += 1) colors.setXYZ(index, colors.getX(index) * tint.r, colors.getY(index) * tint.g, colors.getZ(index) * tint.b)
  const placements = []
  for (let x = -plot.width / 2 + 0.1; x < plot.width / 2; x += 0.2) {
    for (let z = -plot.depth / 2 + 0.08; z < plot.depth / 2; z += 0.15) {
      if (random() < 0.12) continue
      placements.push([V(x + random.gauss() * 0.025, 0.0, z + random.gauss() * 0.025), random() * Math.PI * 2, random.range(0.8, 1.15), random.gauss() * 0.08, random.gauss() * 0.08])
    }
  }
  propField(ctx, geometry, placements, { roughness: 1 })
}

/* ================================================================== herb family */
// Generic build for non-legume herbs: P supplies habit, leaf(), sites(), parts and colours.
function buildHerb(ctx, P) {
  return plantField(ctx, {
    habit: P.habit,
    leaf: P.leaf,
    leafKey: P.leafKey,
    sites: P.sites,
    rowGap: P.rowGap,
    plantGap: P.plantGap,
    jitter: P.jitter,
    budget: P.budget,
    height: P.height,
    yaw: P.yaw,
    yawJitter: P.yawJitter,
    sizeRange: P.sizeRange,
    tilt: P.tilt,
    wind: { strength: P.wind ?? 0.18, flutter: P.flutter ?? 0.012, refHeight: P.height, ground: 0 },
    plant: { scale: P.grow, color: rampFn(P.colors.stem) },
    parts: [{ key: 'leaves', scale: P.leafScale ?? (() => 1), color: rampFn(P.colors.leaf), materialOptions: { roughness: P.roughness ?? 0.7 } }, ...P.parts],
    extras: P.extras,
    camera: P.camera,
  })
}
const herb = (P) => ({ stages: P.stages, showcase: P.showcase, build: (ctx) => buildHerb(ctx, P) })
const tallGrow = (end, xz = 0.3) => (g) => {
  const s = smooth(0, end, g)
  return [lerp(xz, 1, s) * lerp(0.15, 1, s), lerp(0.04, 1, s), lerp(xz, 1, s) * lerp(0.15, 1, s)]
}
const sizeAlong = (node, low, high) => lerp(low, high, node.t)

/* ------------------------------------------------------------------ sunflower */
function sunflowerSites(random, sk, out) {
  const tip = sk.tips[0]
  const top = tip.p
  const heads = [
    { centre: top.clone().add(V(0.07, 0.03, 0.01)), dir: V(1, 0.4, 0.18).normalize(), suffix: 'Up' },
    { centre: top.clone().add(V(0.1, -0.07, 0.015)), dir: V(0.5, -0.85, 0.1).normalize(), suffix: 'Down' },
  ]
  heads.forEach(({ centre, dir, suffix }) => {
    const head = daisy(random, { rays: 28, rayLength: 0.12, rayWidth: 0.034, disc: 0.1, depth: 0.045, rayRows: 1, segments: 18, rise: -0.28, droop: -0.12, rings: suffix === 'Up' ? 3 : 1, bracts: 16, bractLength: 0.05, backSegments: 12 })
    const back = head.back
    const neckEnd = centre.clone().addScaledVector(dir, -0.045)
    const neck = tube([top.clone().add(V(0, -0.08, 0)), top.clone().add(V(0.015, 0.02, 0)), neckEnd], 0.011, 0.014, { radial: 5, tubular: 3, colorFn: shade(0.75, 0.95) })
    aim(back, centre, dir)
    aim(head.disc, centre, dir)
    aim(head.rays, centre, dir)
    out.add(`back${suffix}`, merge([back, neck]), centre)
    out.add(`disc${suffix}`, head.disc, centre)
    if (suffix === 'Up') out.add('rays', head.rays, centre)
    else head.rays.dispose()
  })
}

const sunflower = herb({
  height: 1.75,
  rowGap: 0.6,
  plantGap: 0.3,
  jitter: 0.15,
  yaw: 0,
  yawJitter: 0.22,
  tilt: 0.04,
  wind: 0.12,
  flutter: 0.014,
  habit: { stems: 1, length: [1.5, 1.8], lean: [0, 0.04], radius: 0.016, tipRadius: 0.6, radial: 6, tubular: 5, nodes: [14, 18], zone: [0.06, 0.9], stemShade: shade(0.62, 1) },
  leaf: (random, node) => {
    const s = sizeAlong(node, 1.15, 0.55) * random.range(0.9, 1.08)
    return simpleLeaf(random, { petiole: 0.1 * s, petioleRadius: 0.0035, length: 0.24 * s, width: 0.19 * s, rows: 4, shape: 'heart', fold: 0.12, rise: lerp(0.2, 0.55, node.t), droop: 0.6, wave: 0.12, base: 0.6, tip: 0.92, rib: 1 })
  },
  sites: sunflowerSites,
  grow: tallGrow(0.5, 0.4),
  leafScale: (g) => 1 - 0.25 * smooth(0.9, 1, g),
  colors: {
    stem: [[0, '#6c9c3e'], [0.7, '#6a963c'], [0.85, '#9a8e4a'], [1, '#8a7448']],
    leaf: [[0, '#4f8a30'], [0.66, '#4c862e'], [0.8, '#7c8a38'], [0.9, '#7a6a3a'], [1, '#6a5638']],
  },
  parts: [
    { key: 'backUp', scale: (g) => smooth(0.28, 0.42, g) * (1 - smooth(0.82, 0.86, g)), color: rampFn([[0.3, '#6a9a3c'], [0.7, '#6a923a'], [0.82, '#8f8a42']]) },
    { key: 'discUp', scale: (g) => smooth(0.38, 0.46, g) * (1 - smooth(0.82, 0.86, g)), color: rampFn([[0.38, '#7a8a34'], [0.5, '#6e7a30'], [0.6, '#655a26'], [0.7, '#4a321a'], [0.82, '#3c2a18']]), materialOptions: { roughness: 0.95 } },
    { key: 'rays', scale: (g) => smooth(0.43, 0.49, g) * (1 - 0.65 * smooth(0.66, 0.8, g)) * (1 - smooth(0.82, 0.86, g)), color: rampFn([[0.43, '#e2c024'], [0.48, '#f2c21a'], [0.64, '#f2c21a'], [0.74, '#b8862a'], [0.82, '#7a5a2a']]), materialOptions: { roughness: 0.7, emissive: '#3a2800' } },
    { key: 'backDown', scale: (g) => smooth(0.83, 0.87, g), color: rampFn([[0.83, '#8f8a42'], [0.92, '#8a6a3a'], [1, '#6e5232']]) },
    { key: 'discDown', scale: (g) => smooth(0.83, 0.87, g), color: rampFn([[0.83, '#3c2a18'], [1, '#30241a']]), materialOptions: { roughness: 0.95 } },
  ],
  stages: [[0, 'Sowing'], [0.14, 'Vegetative'], [0.3, 'Star bud'], [0.44, 'Flowering'], [0.64, 'Seed filling'], [0.86, 'Ready to harvest']],
  showcase: 0.55,
})

/* ------------------------------------------------------------------ sesame */
function sesameSites(random, sk, out) {
  sk.nodes.forEach((node) => {
    if (node.t < 0.38 || node.level > 2 || random() > 0.62) return
    const high = node.t > 0.7
    const outDir = flat(node.az)
    const base = node.p.clone().addScaledVector(outDir, 0.006)
    const flower = trumpet({ length: 0.036, mouth: 0.0095, lobes: 5, lobeLength: 0.011, flare: 1.2, radial: 5, base: 0.88, tip: 1 })
    aim(flower, base.clone().add(V(0, 0.004, 0)), heading(random, node.az, 1, -0.25, 0.15))
    out.add(high ? 'flowersHigh' : 'flowersLow', flower, node.p)
    const capsule = squareCapsule(0.03, 0.0048)
    aim(capsule, base, heading(random, node.az, 0.22, 1, 0.06), Math.PI / 4)
    out.add(high ? 'capsHigh' : 'capsLow', capsule, node.p)
  })
}

const sesameFlower = rampFn([[0.3, '#f6e6ee'], [0.7, '#f3dde8']])
const sesameCaps = rampFn([[0.45, '#7aa24a'], [0.72, '#86a24c'], [0.84, '#a89a5a'], [1, '#8a6e48']])
const sesame = herb({
  height: 1.15,
  rowGap: 0.3,
  plantGap: 0.15,
  wind: 0.2,
  habit: { stems: 1, length: [1.0, 1.3], lean: [0, 0.05], radius: 0.005, radial: 4, tubular: 5, nodes: [13, 16], zone: [0.06, 0.97], phyllo: 'opposite', branches: { count: [0, 2], zone: [0.25, 0.45], length: [0.45, 0.6], lean: [0.2, 0.35], nodes: [4, 6] } },
  leaf: (random, node) => {
    const s = sizeAlong(node, 1.25, 0.6) * random.range(0.88, 1.08)
    return simpleLeaf(random, { petiole: 0.03 * s, petioleTube: false, petioleRadius: 0.0012, length: 0.12 * s, width: 0.04 * s, rows: 1, shape: 'lance', fold: 0.25, rise: 0.25, droop: 0.75, base: 0.6, tip: 0.92, rib: 1 })
  },
  sites: sesameSites,
  grow: tallGrow(0.55, 0.45),
  leafScale: (g) => 1 - 0.6 * smooth(0.8, 0.97, g),
  colors: {
    stem: [[0, '#6a9a40'], [0.7, '#6c963e'], [0.84, '#9a9450'], [1, '#8f7a50']],
    leaf: [[0, '#5a9038'], [0.7, '#568c36'], [0.82, '#8f9a46'], [0.92, '#a09048'], [1, '#8a7448']],
  },
  parts: [
    { key: 'flowersLow', scale: span(0.34, 0.58), color: sesameFlower, materialOptions: { roughness: 0.6 } },
    { key: 'flowersHigh', scale: span(0.46, 0.74), color: sesameFlower, materialOptions: { roughness: 0.6 } },
    { key: 'capsLow', scale: (g) => smooth(0.48, 0.62, g), color: sesameCaps },
    { key: 'capsHigh', scale: (g) => smooth(0.6, 0.74, g), color: sesameCaps },
  ],
  stages: [[0, 'Sowing'], [0.12, 'Vegetative'], [0.34, 'Flowering'], [0.55, 'Capsule filling'], [0.8, 'Maturity'], [0.92, 'Ready to harvest']],
  showcase: 0.58,
})

/* ------------------------------------------------------------------ linseed */
function linseedSites(random, sk, out) {
  sk.tips.forEach((tip) => {
    for (let k = 0; k < 3; k += 1) {
      const a = tip.az + k * 2.1 + random.gauss() * 0.4
      const end = tip.p.clone().add(V(Math.cos(a) * 0.022, random.range(0.012, 0.03), Math.sin(a) * 0.022))
      out.add('stalks', tube([tip.p.clone().add(V(0, -0.02, 0)), tip.p.clone().lerp(end, 0.5).add(V(0, 0.004, 0)), end], 0.001, 0.0008, { radial: 3, tubular: 2, color: '#d0d0d0' }), tip.p)
      const flower = cupFlower({ petals: 5, length: 0.016, width: 0.014, open: 1.2, rows: 0, shape: 'obovate', centre: 0.75, petal: 1, colorPow: 0.5, droop: 0.2, roll: 0.25 })
      aim(flower, end, heading(random, a, 0.35, 1, 0.15))
      out.add('flowers', flower, tip.p)
      const capsule = pod({ length: 0.011, width: 0.009, thick: 0.009, puffy: true, rows: 3, radial: 5, base: 0.85, tip: 1 })
      aim(capsule, end, heading(random, a, 0.3, 1, 0.15))
      out.add('pods', capsule, tip.p)
    }
  })
}

const linseed = herb({
  height: 0.5,
  rowGap: 0.25,
  plantGap: 0.1,
  wind: 0.2,
  flutter: 0.014,
  habit: { stems: [3, 4], length: [0.44, 0.55], lean: [0.04, 0.16], arch: [0, 0.08], radius: 0.0017, radial: 3, tubular: 3, nodes: [9, 12], zone: [0.06, 0.82], baseSpread: 0.012 },
  leaf: (random, node) => leaflet({ length: 0.026 * sizeAlong(node, 1.1, 0.75), width: 0.0045, rows: 0, shape: 'linear', fold: 0.3, rise: 1.0, droop: 0.4, base: 0.62, tip: 0.95 }),
  sites: linseedSites,
  grow: tallGrow(0.45, 0.5),
  colors: {
    stem: [[0, '#6c9a48'], [0.66, '#6a9446'], [0.8, '#a8a05a'], [0.92, '#b09a5e'], [1, '#a58e5a']],
    leaf: [[0, '#6a9a48'], [0.66, '#649446'], [0.8, '#a8a05a'], [0.92, '#b09a5e'], [1, '#a58e5a']],
  },
  parts: [
    { key: 'stalks', scale: (g) => smooth(0.34, 0.42, g), color: rampFn([[0.3, '#6a9a48'], [0.7, '#6a9446'], [0.85, '#b09a5e']]) },
    { key: 'flowers', scale: span(0.38, 0.66), color: solid('#7aa8ea'), materialOptions: { roughness: 0.55, emissive: '#0c1c3c' } },
    { key: 'pods', scale: (g) => smooth(0.54, 0.68, g), color: rampFn([[0.54, '#88aa58'], [0.74, '#8ea656'], [0.86, '#c2a868'], [1, '#a88a58']]) },
  ],
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.38, 'Flowering'], [0.62, 'Capsules forming'], [0.88, 'Ready to harvest']],
  showcase: 0.52,
})

/* ------------------------------------------------------------------ castor */
function castorSpike(random, tip, out, key, length) {
  const dir = tip.tangent.clone().multiplyScalar(0.4).add(V(0, 1, 0)).normalize()
  const start = tip.p.clone()
  const end = start.clone().addScaledVector(dir, length)
  out.add(`${key}Axis`, tube([start, start.clone().lerp(end, 0.5).add(V(0.005, 0, 0)), end], 0.004, 0.0025, { radial: 4, tubular: 3, color: '#d8d8d8' }), start)
  const capsules = Math.round(random.range(15, 20))
  for (let k = 0; k < capsules; k += 1) {
    const f = 0.25 + 0.75 * (k / capsules)
    const a = k * 2.4 + random.gauss() * 0.3
    const at = start.clone().lerp(end, f)
    const outDir = flat(a)
    const capsule = spinyCapsule(random, 0.0125, 6)
    capsule.translate(at.x + outDir.x * 0.016, at.y + 0.004, at.z + outDir.z * 0.016)
    out.add(key, capsule, start)
  }
  // male flowers: cream clusters on the lower spike
  for (let k = 0; k < 4; k += 1) {
    const at = start.clone().lerp(end, 0.05 + k * 0.05)
    const blob = ellipsoid(0.008, 0.007, 0.008, { widthSegments: 4, heightSegments: 3, colorFn: (c) => c.setScalar(random.range(0.85, 1)) })
    const a = k * 2.2
    blob.translate(at.x + Math.cos(a) * 0.012, at.y, at.z + Math.sin(a) * 0.012)
    out.add(`${key}Male`, blob, start)
  }
}

const castorCapsule = (shift) => rampFn([[0.3 + shift, '#a2c070'], [0.62 + shift, '#9cba68'], [0.72 + shift * 0.6, '#a8a060'], [0.84, '#94744a'], [0.92, '#86643e'], [1, '#76583a']])
const castor = herb({
  height: 2.2,
  rowGap: 1.0,
  plantGap: 0.6,
  roughness: 0.68,
  jitter: 0.12,
  wind: 0.14,
  flutter: 0.02,
  habit: {
    stems: 1, length: [1.8, 2.2], lean: [0, 0.05], radius: 0.02, tipRadius: 0.45, radial: 6, tubular: 5, nodes: [16, 20], zone: [0.1, 0.86], stemShade: shade(0.75, 1),
    branches: { count: [3, 5], zone: [0.4, 0.75], length: [0.38, 0.5], lean: [0.45, 0.7], arch: [-0.35, -0.1], nodes: [6, 8], radius: 0.55 },
  },
  leaf: (random, node) => {
    const s = (node.level === 1 ? sizeAlong(node, 1.15, 0.75) : 0.75) * random.range(0.88, 1.08)
    const red = random() < 0.65
    return palmateLeaf(random, { lobes: 8, length: 0.32 * s, width: 0.11 * s, spread: Math.PI * 2, petiole: 0.32 * s, petioleRadius: 0.0045, rise: 0.75, tilt: -0.12, cup: 0.18, lobeDroop: 0.32, rows: 2, shape: 'lance', base: red ? '#d8a49a' : 0.62, tip: 0.95, rib: red ? '#ffb0a4' : 1, petioleColor: red ? '#ff8c80' : '#d8d8c8' })
  },
  sites: (random, sk, out) => sk.tips.forEach((tip) => castorSpike(random, tip, out, tip.level === 1 ? 'spikeA' : 'spikeB', tip.level === 1 ? random.range(0.32, 0.4) : random.range(0.2, 0.28))),
  grow: tallGrow(0.55, 0.35),
  leafScale: (g) => 1 - 0.3 * smooth(0.9, 1, g),
  colors: {
    stem: [[0, '#8a7a5a'], [0.3, '#93685a'], [0.8, '#8c6050'], [1, '#7c5e48']],
    leaf: [[0, '#4e7c38'], [0.6, '#4a7636'], [0.85, '#5f7a3a'], [1, '#7a7442']],
  },
  parts: [
    { key: 'spikeAAxis', scale: (g) => smooth(0.3, 0.4, g), color: rampFn([[0.3, '#9a8a5a'], [0.6, '#a0685a'], [1, '#7c5e48']]) },
    { key: 'spikeA', scale: (g) => smooth(0.33, 0.5, g), color: castorCapsule(0) },
    { key: 'spikeAMale', scale: span(0.3, 0.48), color: solid('#efe2b4') },
    { key: 'spikeBAxis', scale: (g) => smooth(0.44, 0.54, g), color: rampFn([[0.44, '#9a8a5a'], [0.7, '#a0685a'], [1, '#7c5e48']]) },
    { key: 'spikeB', scale: (g) => smooth(0.47, 0.64, g), color: castorCapsule(0.14) },
    { key: 'spikeBMale', scale: span(0.44, 0.62), color: solid('#efe2b4') },
  ],
  stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.25, 'Vegetative'], [0.36, 'Primary spike'], [0.52, 'Secondary spikes'], [0.86, 'Ready to harvest']],
  showcase: 0.6,
})

/* ------------------------------------------------------------------ safflower */
function safflowerSites(random, sk, out) {
  sk.tips.forEach((tip) => {
    const dir = tip.tangent.clone().add(V(0, 1.2, 0)).normalize()
    const centre = tip.p.clone().addScaledVector(dir, 0.012)
    const globe = ellipsoid(0.017, 0.02, 0.017, { widthSegments: 6, heightSegments: 4, colorFn: (c, x, y) => c.setScalar(lerp(0.75, 1, y / 0.04 + 0.5)) })
    const parts = [globe]
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2 + random.gauss() * 0.2
      const spine = leaflet({ length: 0.03, width: 0.008, rows: 0, shape: 'lance', fold: 0.3, rise: 0.5, droop: 0.2, base: 0.8, tip: 1 })
      spine.rotateY(Math.PI / 2 - a)
      spine.translate(Math.cos(a) * 0.012, -0.004, Math.sin(a) * 0.012)
      parts.push(spine)
    }
    const head = merge(parts)
    head.translate(centre.x, centre.y, centre.z)
    out.add('heads', head, centre)
    const tuft = prep(new THREE.CylinderGeometry(0.018, 0.009, 0.02, 7, 1, true), '#ffffff', (c, x, y) => c.setScalar(lerp(0.8, 1, y / 0.02 + 0.5)))
    const cap = prep(new THREE.CircleGeometry(0.018, 7), '#ffffff', (c) => c.setScalar(1))
    cap.rotateX(-Math.PI / 2)
    cap.translate(0, 0.01, 0)
    const brush = merge([tuft, cap])
    brush.translate(0, 0.01, 0)
    brush.rotateX(Math.PI / 2)
    aim(brush, centre.clone().addScaledVector(dir, 0.014), dir)
    out.add('florets', brush, centre)
  })
}

const safflower = herb({
  height: 0.9,
  rowGap: 0.45,
  plantGap: 0.18,
  wind: 0.16,
  habit: { stems: 1, length: [0.8, 1.0], lean: [0, 0.06], radius: 0.0045, radial: 4, tubular: 4, nodes: [15, 18], zone: [0.04, 0.8], stemShade: shade(0.75, 1), branches: { count: [4, 7], zone: [0.42, 0.85], length: [0.3, 0.45], lean: [0.4, 0.65], arch: [-0.3, -0.08], nodes: [2, 4], radius: 0.6 } },
  leaf: (random, node) => {
    const s = (node.level === 1 ? sizeAlong(node, 1.3, 0.7) : 0.65) * random.range(0.9, 1.08)
    return leaflet({ length: 0.085 * s, width: 0.032 * s, rows: 2, shape: 'lance', fold: 0.35, rise: 0.45, droop: 0.45, wave: 0.45, base: 0.62, tip: 0.95, rib: 1 })
  },
  sites: safflowerSites,
  grow: tallGrow(0.5, 0.5),
  leafScale: (g) => 1 - 0.4 * smooth(0.85, 1, g),
  colors: {
    stem: [[0, '#7aa050'], [0.7, '#7e9e4e'], [0.85, '#b0a462'], [1, '#a89062']],
    leaf: [[0, '#5f9446'], [0.7, '#5e9044'], [0.84, '#a09c52'], [1, '#a48a56']],
  },
  parts: [
    { key: 'heads', scale: (g) => smooth(0.32, 0.46, g), color: rampFn([[0.32, '#7aa050'], [0.7, '#7e9c4e'], [0.84, '#b0a462'], [1, '#a08658']]) },
    { key: 'florets', scale: (g) => smooth(0.46, 0.52, g) * (1 - 0.6 * smooth(0.72, 0.84, g)), color: rampFn([[0.46, '#f4c22c'], [0.54, '#f7a21c'], [0.64, '#ee7d1a'], [0.74, '#cf4f1c'], [0.84, '#8a4a2a']]), materialOptions: { roughness: 0.85, emissive: '#3a1800' } },
  ],
  stages: [[0, 'Sowing'], [0.12, 'Rosette'], [0.28, 'Stem elongation'], [0.46, 'Flowering'], [0.68, 'Seed filling'], [0.9, 'Ready to harvest']],
  showcase: 0.6,
})

/* ------------------------------------------------------------------ niger */
function nigerSites(random, sk, out) {
  sk.tips.forEach((tip) => {
    const heads = tip.level === 1 ? 3 : 2
    for (let k = 0; k < heads; k += 1) {
      const a = tip.az + k * 2.3 + random.gauss() * 0.3
      const lift = k === 0 ? 0.01 : random.range(0.01, 0.03)
      const start = tip.p.clone().add(V(0, -0.03 * k, 0))
      const end = k === 0 ? tip.p.clone().add(V(0, lift, 0)) : start.clone().add(V(Math.cos(a) * 0.04, 0.035 + lift, Math.sin(a) * 0.04))
      if (k > 0) out.add('stalks', tube([start, start.clone().lerp(end, 0.5).add(V(0, 0.006, 0)), end], 0.0012, 0.001, { radial: 3, tubular: 2, color: '#d0d0d0' }), tip.p)
      const head = daisy(random, { rays: 8, rayLength: 0.015, rayWidth: 0.0075, disc: 0.0065, depth: 0.006, rayRows: 0, segments: 6, rise: 0.05, droop: -0.2, backSegments: 6 })
      const dir = heading(random, a, 0.45, 1, 0.12)
      aim(head.rays, end, dir)
      aim(head.disc, end, dir)
      aim(head.back, end, dir)
      out.add('rays', head.rays, tip.p)
      out.add('discs', merge([head.disc, head.back]), tip.p)
    }
  })
}

const niger = herb({
  height: 1.0,
  rowGap: 0.3,
  plantGap: 0.15,
  wind: 0.2,
  habit: { stems: 1, length: [0.9, 1.1], lean: [0, 0.06], radius: 0.0042, radial: 4, tubular: 4, nodes: [10, 12], zone: [0.06, 0.75], phyllo: 'opposite', stemShade: shade(0.7, 1), branches: { count: [4, 6], zone: [0.35, 0.82], length: [0.28, 0.42], lean: [0.4, 0.65], arch: [-0.25, 0], nodes: [2, 3], radius: 0.6 } },
  leaf: (random, node) => {
    const s = (node.level === 1 ? sizeAlong(node, 1.15, 0.7) : 0.6) * random.range(0.9, 1.08)
    return leaflet({ length: 0.11 * s, width: 0.032 * s, rows: 1, shape: 'lance', fold: 0.25, rise: 0.35, droop: 0.6, base: 0.6, tip: 0.93, rib: 1 })
  },
  sites: nigerSites,
  grow: tallGrow(0.48, 0.45),
  leafScale: (g) => 1 - 0.45 * smooth(0.82, 0.98, g),
  colors: {
    stem: [[0, '#5e8e3a'], [0.68, '#5e8a3a'], [0.82, '#8a8a46'], [1, '#7a6a44']],
    leaf: [[0, '#4f8a34'], [0.68, '#4d8632'], [0.82, '#8f9046'], [1, '#86744a']],
  },
  parts: [
    { key: 'stalks', scale: (g) => smooth(0.36, 0.44, g), color: rampFn([[0.36, '#5e8e3a'], [0.8, '#6e8a3c'], [1, '#7a6a44']]) },
    { key: 'discs', scale: (g) => smooth(0.38, 0.46, g), color: rampFn([[0.38, '#7c9a40'], [0.46, '#d8a420'], [0.64, '#b88a24'], [0.76, '#6a4c26'], [1, '#4a3a26']]) },
    { key: 'rays', scale: (g) => smooth(0.45, 0.5, g) * (1 - smooth(0.66, 0.76, g)), color: rampFn([[0.45, '#f2cc24'], [0.52, '#f7c814'], [0.66, '#eab818']]), materialOptions: { roughness: 0.7, emissive: '#3a2a00' } },
  ],
  stages: [[0, 'Sowing'], [0.14, 'Vegetative'], [0.36, 'Bud formation'], [0.46, 'Flowering'], [0.68, 'Seed filling'], [0.9, 'Ready to harvest']],
  showcase: 0.58,
})

/* ------------------------------------------------------------------ cotton */
function cottonSites(random, sk, out) {
  const sites = [...sk.nodes.filter((node) => node.level === 2), ...sk.tips.filter((tip) => tip.level === 2)]
  sites.forEach((node) => {
    if (random() > 0.5) return
    const late = node.p.y > sk.top * 0.55
    const suffix = late ? 'B' : 'A'
    const dir = heading(random, node.az, 0.7, 0.55, 0.15)
    const at = node.p.clone().addScaledVector(flat(node.az), 0.01).add(V(0, 0.008, 0))
    const stalk = tube([node.p, at], 0.0015, 0.0012, { radial: 3, tubular: 1, color: '#d0d0d0' })
    const bracts = []
    for (let k = 0; k < 3; k += 1) {
      const a = (k / 3) * Math.PI * 2
      const bract = leaflet({ length: 0.03, width: 0.026, rows: 0, shape: 'heart', fold: -0.2, rise: 0.9, droop: 0.4, base: 0.75, tip: 0.95 })
      bract.rotateY(a)
      bracts.push(bract)
    }
    const bractGeometry = merge(bracts)
    bractGeometry.rotateX(Math.PI / 2)
    const boll = merge([pod({ length: 0.048, width: 0.036, thick: 0.034, puffy: true, rows: 3, radial: 5, base: 0.8, tip: 1 }), bractGeometry])
    aim(boll, at, dir)
    out.add(`boll${suffix}`, merge([boll, stalk]), at)
    const flower = (random() < 0.55 ? 'cream' : 'pink') + suffix
    const bloom = cupFlower({ petals: 5, length: 0.045, width: 0.04, open: 0.5, rows: 1, centre: 0.8, petal: 1, colorPow: 0.5, droop: 0.15, roll: 0.45, column: 0.02 })
    aim(bloom, at.clone().addScaledVector(dir, 0.02), dir)
    out.add(flower, bloom, at)
    const openDir = dir.clone().add(V(0, 0.5, 0)).normalize()
    const kapas = lint(random, 0.033)
    aim(kapas, at.clone().addScaledVector(openDir, 0.008), openDir, random() * Math.PI)
    out.add(`lint${suffix}`, kapas, at)
    const shell = bur(random, 0.03)
    aim(shell, at.clone().addScaledVector(openDir, 0.014), openDir, Math.PI / 4)
    out.add(`bur${suffix}`, shell, at)
  })
}

const cottonParts = (suffix, shift) => [
  { key: `cream${suffix}`, scale: span(0.36 + shift, 0.56 + shift), color: solid('#f3edc6'), materialOptions: { roughness: 0.6 } },
  { key: `pink${suffix}`, scale: span(0.4 + shift, 0.6 + shift), color: solid('#e586a8'), materialOptions: { roughness: 0.6 } },
  { key: `boll${suffix}`, scale: (g) => smooth(0.42 + shift, 0.58 + shift, g) * (1 - smooth(0.7 + shift, 0.74 + shift, g)), color: rampFn([[0.42 + shift, '#7da846'], [0.6 + shift, '#6f9a40'], [0.7 + shift, '#8a8a42']]) },
  { key: `lint${suffix}`, scale: (g) => smooth(0.7 + shift, 0.78 + shift, g), color: solid('#f6f5ee'), materialOptions: { roughness: 1, emissive: '#262626' } },
  { key: `bur${suffix}`, scale: (g) => smooth(0.7 + shift, 0.76 + shift, g), color: rampFn([[0.7, '#7a6a3c'], [0.85, '#6a4c30'], [1, '#5a4030']]) },
]

const cotton = herb({
  height: 1.25,
  rowGap: 0.9,
  plantGap: 0.45,
  jitter: 0.15,
  wind: 0.12,
  flutter: 0.014,
  habit: {
    stems: 1, length: [1.15, 1.35], lean: [0, 0.05], radius: 0.009, tipRadius: 0.35, radial: 5, tubular: 5, nodes: [10, 13], zone: [0.15, 0.95], stemShade: shade(0.55, 0.95),
    branches: { count: [9, 12], zone: [0.12, 0.85], length: [0.32, 0.45], lean: [0.95, 1.2], arch: [0, 0.2], nodes: [4, 6], radius: 0.5, cone: 0.75 },
  },
  leaf: (random, node) => {
    const s = (node.level === 1 ? sizeAlong(node, 1.1, 0.75) : 0.95) * random.range(0.88, 1.08)
    return palmateLeaf(random, { lobes: 5, length: 0.1 * s, width: 0.062 * s, spread: 2.0, petiole: 0.075 * s, petioleRadius: 0.0014, rise: 0.75, tilt: 0.1, cup: 0.06, lobeDroop: 0.3, rows: 1, shape: 'lance', base: 0.58, tip: 0.92, rib: 1 })
  },
  sites: cottonSites,
  grow: tallGrow(0.55, 0.4),
  leafScale: (g) => 1 - 0.35 * smooth(0.84, 0.98, g),
  colors: {
    stem: [[0, '#6a8a3e'], [0.5, '#6a7a3c'], [0.8, '#7a5a3a'], [1, '#6a4a34']],
    leaf: [[0, '#4c8030'], [0.62, '#4a7c2e'], [0.78, '#587a32'], [0.9, '#6f7036'], [1, '#7a5836']],
  },
  parts: [...cottonParts('A', 0), ...cottonParts('B', 0.06)],
  stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.26, 'Square formation'], [0.38, 'Flowering'], [0.52, 'Boll development'], [0.74, 'Boll bursting']],
  showcase: 0.88,
})

/* ------------------------------------------------------------------ jute and mesta */
const jute = herb({
  height: 3.2,
  rowGap: 0.3,
  plantGap: 0.1,
  jitter: 0.35,
  wind: 0.26,
  flutter: 0.016,
  habit: { stems: 2, length: [2.9, 3.4], lean: [0.01, 0.05], radius: 0.009, tipRadius: 0.3, radial: 4, tubular: 5, nodes: [16, 20], zone: [0.5, 1], baseSpread: 0.02, stemShade: shade(0.7, 1) },
  leaf: (random, node) => {
    const s = sizeAlong(node, 1.1, 0.7) * random.range(0.88, 1.08)
    return simpleLeaf(random, { petiole: 0.03 * s, petioleTube: false, petioleRadius: 0.0011, length: 0.12 * s, width: 0.042 * s, rows: 1, shape: 'lance', fold: 0.2, rise: 0.35, droop: 0.75, wave: 0.15, base: 0.6, tip: 0.94, rib: 1 })
  },
  sites: (random, sk, out) => sk.nodes.forEach((node) => {
    if (node.t < 0.8 || random() > 0.3) return
    const flower = cupFlower({ petals: 5, length: 0.011, width: 0.009, open: 1.1, rows: 0, centre: 0.85, petal: 1 })
    aim(flower, node.p.clone().addScaledVector(flat(node.az), 0.006), heading(random, node.az, 0.6, 0.8))
    out.add('flowers', flower, node.p)
  }),
  grow: tallGrow(0.75, 0.3),
  colors: {
    stem: [[0, '#6e9a44'], [0.6, '#7a9c48'], [0.8, '#a2a456'], [1, '#aca05a']],
    leaf: [[0, '#5a8f30'], [0.6, '#5a8c30'], [0.78, '#7a9a36'], [1, '#93983e']],
  },
  parts: [{ key: 'flowers', scale: span(0.56, 0.8), color: solid('#f2d43a'), materialOptions: { roughness: 0.6, emissive: '#2a2000' } }],
  stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.3, 'Rapid growth'], [0.58, 'Flowering'], [0.82, 'Ready to cut']],
  showcase: 0.72,
})

const mesta = herb({
  height: 2.7,
  rowGap: 0.3,
  plantGap: 0.13,
  jitter: 0.3,
  wind: 0.24,
  flutter: 0.016,
  habit: { stems: 1, length: [2.4, 2.9], lean: [0.01, 0.05], radius: 0.009, tipRadius: 0.3, radial: 4, tubular: 5, nodes: [20, 24], zone: [0.42, 1], stemShade: shade(0.72, 1) },
  leaf: (random, node) => {
    const s = sizeAlong(node, 1.1, 0.65) * random.range(0.88, 1.08)
    return palmateLeaf(random, { lobes: 5, length: 0.13 * s, width: 0.032 * s, spread: 1.9, petiole: 0.07 * s, petioleRadius: 0.0012, rise: 0.55, tilt: 0.1, cup: 0.05, lobeDroop: 0.35, rows: 1, shape: 'lance', base: 0.62, tip: 0.94, petioleColor: '#f0b4b0' })
  },
  sites: (random, sk, out) => sk.nodes.forEach((node) => {
    if (node.t < 0.62 || node.t > 0.95 || random() > 0.3) return
    const flower = cupFlower({ petals: 5, length: 0.048, width: 0.042, open: 1.0, rows: 1, centre: '#5c1622', petal: 1, colorPow: 0.32, droop: 0.2, roll: 0.45, column: 0.022 })
    aim(flower, node.p.clone().addScaledVector(flat(node.az), 0.01), heading(random, node.az, 0.8, 0.5))
    out.add('flowers', flower, node.p)
  }),
  grow: tallGrow(0.72, 0.3),
  colors: {
    stem: [[0, '#7a8a48'], [0.35, '#88604a'], [0.8, '#8a5a46'], [1, '#86644a']],
    leaf: [[0, '#4f8a34'], [0.6, '#4c8432'], [0.8, '#6e8a38'], [1, '#86883e']],
  },
  parts: [{ key: 'flowers', scale: span(0.54, 0.8), color: solid('#f7e27a'), materialOptions: { roughness: 0.55, emissive: '#2a2000' } }],
  stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.3, 'Rapid growth'], [0.56, 'Flowering'], [0.84, 'Ready to cut']],
  showcase: 0.66,
})

/* ------------------------------------------------------------------ sunn hemp */
function sunnSites(random, sk, out) {
  sk.tips.forEach((tip) => {
    const length = tip.level === 1 ? random.range(0.16, 0.22) : random.range(0.1, 0.14)
    const dir = tip.tangent.clone().add(V(0, 1.5, 0)).normalize()
    const start = tip.p.clone()
    const end = start.clone().addScaledVector(dir, length)
    out.add('stalks', tube([start, start.clone().lerp(end, 0.5), end], 0.0018, 0.001, { radial: 3, tubular: 2, color: '#d0d0d0' }), start)
    const flowers = tip.level === 1 ? 7 : 4
    for (let k = 0; k < flowers; k += 1) {
      const f = 0.15 + 0.85 * (k / flowers)
      const a = k * 2.5 + random.gauss() * 0.3
      const at = start.clone().lerp(end, f).addScaledVector(flat(a), 0.008)
      const flower = peaFlower({ size: 0.022, streak: 0.85 })
      aim(flower, at, heading(random, a, 1, 0.25, 0.1))
      out.add('flowers', flower, start)
      if (k < flowers - 2) {
        const seedpod = pod({ length: 0.03, width: 0.013, thick: 0.012, puffy: true, rows: 3, radial: 4, base: 0.85, tip: 1 })
        aim(seedpod, at, heading(random, a, 1, 0.5, 0.1))
        out.add('pods', seedpod, start)
      }
    }
  })
}

const sunnHemp = herb({
  height: 1.95,
  rowGap: 0.3,
  plantGap: 0.1,
  jitter: 0.35,
  wind: 0.24,
  flutter: 0.016,
  habit: { stems: 1, length: [1.8, 2.1], lean: [0.01, 0.06], radius: 0.006, tipRadius: 0.35, radial: 4, tubular: 4, nodes: [16, 20], zone: [0.3, 0.92], branches: { count: [2, 3], zone: [0.68, 0.88], length: [0.1, 0.16], lean: [0.3, 0.55], arch: -0.1, nodes: [1, 2], radius: 0.5 } },
  leaf: (random, node) => leaflet({ length: 0.085 * sizeAlong(node, 1.1, 0.75), width: 0.017, rows: 0, shape: 'lance', fold: 0.3, rise: 0.55, droop: 0.6, base: 0.62, tip: 0.95 }),
  sites: sunnSites,
  grow: tallGrow(0.6, 0.35),
  colors: {
    stem: [[0, '#6a9a40'], [0.7, '#6e963e'], [0.9, '#9a9450'], [1, '#9a8a50']],
    leaf: [[0, '#5a9038'], [0.7, '#588c36'], [0.9, '#8a9244'], [1, '#90884a']],
  },
  parts: [
    { key: 'stalks', scale: (g) => smooth(0.36, 0.44, g), color: rampFn([[0.36, '#7a9a40'], [1, '#8a8a48']]) },
    { key: 'flowers', scale: span(0.4, 0.78, 0.05, 0.08), color: solid('#ffd21c'), materialOptions: { roughness: 0.6, emissive: '#3a2a00' } },
    { key: 'pods', scale: (g) => smooth(0.58, 0.74, g), color: rampFn([[0.58, '#8aa850'], [0.8, '#98a058'], [1, '#a89a60']]) },
  ],
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.4, 'Flowering'], [0.66, 'Pod formation'], [0.88, 'Ready to cut']],
  showcase: 0.56,
})

/* ------------------------------------------------------------------ tobacco */
function tobaccoSites(random, sk, out) {
  const tip = sk.tips[0]
  const top = tip.p.clone()
  for (let b = 0; b < 6; b += 1) {
    const a = b * 2.4 + random.gauss() * 0.3
    const start = top.clone().add(V(0, -0.02 - b * 0.012, 0))
    const end = start.clone().add(V(Math.cos(a) * random.range(0.05, 0.09), random.range(0.07, 0.12), Math.sin(a) * random.range(0.05, 0.09)))
    out.add('stalks', tube([start, start.clone().lerp(end, 0.5).add(V(0, 0.01, 0)), end], 0.003, 0.0018, { radial: 3, tubular: 2, color: '#d0d0d0' }), top)
    for (let k = 0; k < 4; k += 1) {
      const fa = a + (k - 1.5) * 0.7
      const at = end.clone().add(V(Math.cos(fa) * 0.008, random.range(-0.004, 0.01), Math.sin(fa) * 0.008))
      const flower = trumpet({ length: 0.045, mouth: 0.009, lobes: 5, lobeLength: 0.011, flare: 1.3, radial: 5, base: 0.82, tip: 1 })
      aim(flower, at, heading(random, fa, 0.6, 0.8, 0.2))
      out.add('flowers', flower, top)
    }
  }
}

const tobacco = herb({
  height: 1.35,
  rowGap: 0.9,
  plantGap: 0.6,
  jitter: 0.12,
  wind: 0.12,
  flutter: 0.016,
  habit: { stems: 1, length: [1.2, 1.45], lean: [0, 0.04], radius: 0.014, tipRadius: 0.4, radial: 6, tubular: 5, nodes: [16, 20], zone: [0.04, 0.84], stemShade: shade(0.7, 1) },
  leaf: (random, node) => {
    const s = sizeAlong(node, 1.1, 0.5) * random.range(0.9, 1.08)
    return leaflet({ length: 0.5 * s, width: 0.27 * s, rows: 8, shape: 'oval', fold: 0.14, rise: lerp(0.35, 0.8, node.t), droop: lerp(1.25, 0.9, node.t), wave: 0.22, base: 0.6, tip: 0.92, rib: 1 })
  },
  sites: tobaccoSites,
  grow: tallGrow(0.62, 0.35),
  colors: {
    stem: [[0, '#6c9c44'], [0.6, '#6c9842'], [0.82, '#9aa856'], [1, '#a8a05a']],
    leaf: [[0, '#5f9a3c'], [0.5, '#5a9438'], [0.7, '#78a040'], [0.84, '#aeb052'], [1, '#c2ae5e']],
  },
  parts: [
    { key: 'stalks', scale: (g) => smooth(0.46, 0.54, g), color: rampFn([[0.46, '#7aa048'], [1, '#9a9a52']]) },
    { key: 'flowers', scale: span(0.5, 0.84, 0.06, 0.08), color: rampFn([[0.5, '#f0c0d0'], [0.58, '#e886a8'], [0.76, '#d87098'], [0.84, '#a86a6a']]), materialOptions: { roughness: 0.6 } },
  ],
  stages: [[0, 'Transplanting'], [0.12, 'Establishment'], [0.3, 'Rapid growth'], [0.52, 'Flowering'], [0.72, 'Leaf ripening'], [0.9, 'Ready to harvest']],
  showcase: 0.64,
})

/* ================================================================== pulses */
const chickpea = pulse({
  height: 0.48,
  rowGap: 0.3,
  plantGap: 0.16,
  habit: { stems: [4, 5], length: [0.3, 0.44], lean: [0.2, 0.75], arch: [0.15, 0.4], radius: 0.0022, nodes: [7, 9], zone: [0.12, 1], outward: 0.5, branches: { count: [2, 3], zone: [0.2, 0.65], length: [0.4, 0.6], lean: [0.5, 0.85], arch: 0.25, nodes: [4, 6] } },
  leaf: pinnate({ length: 0.019, width: 0.012, shape: 'obovate' }, { pairs: 4, rachis: 0.045, side: 0.9, rise: [0.4, 0.9], droop: [0.4, 0.9] }),
  leafShrink: 0.2,
  pod: { place: 'axil', zone: [0.3, 1], chance: 0.6, count: 1, dir: [1, -0.15], shape: { length: 0.027, width: 0.017, thick: 0.015, puffy: true, rows: 3, radial: 4, base: 0.8, tip: 1 } },
  flower: { size: 0.012, color: '#d97fab', count: 1 },
  colors: {
    leaf: [[0, '#7b9d5a'], [0.55, '#6f9455'], [0.72, '#80975a'], [0.82, '#b09d5e'], [0.92, '#a8875a'], [1, '#9a7a52']],
    pod: [[0.48, '#8fae5c'], [0.72, '#98ad5e'], [0.84, '#c2aa6c'], [1, '#b0915e']],
  },
  t: { grow: 0.5, flower: [0.36, 0.62], pod: [0.48, 0.68], drop: [0.9, 1, 0.3] },
  wind: 0.14,
  stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.24, 'Branching'], [0.38, 'Flowering'], [0.56, 'Pod filling'], [0.86, 'Ready to harvest']],
  showcase: 0.62,
})

const pigeonPea = pulse({
  height: 2.0,
  rowGap: 1.2,
  plantGap: 0.45,
  jitter: 0.12,
  habit: {
    stems: 1, length: [1.7, 2.1], lean: [0, 0.06], radius: 0.012, tipRadius: 0.35, radial: 5, tubular: 5, nodes: [16, 20], zone: [0.3, 1], stemShade: shade(0.55, 0.9),
    branches: { count: [10, 13], zone: [0.12, 0.8], length: [0.4, 0.55], lean: [0.45, 0.8], arch: [0.1, 0.3], nodes: [16, 20], radius: 0.4, cone: 0.5 },
  },
  leaf: trifoliate({ length: 0.08, width: 0.03, shape: 'lance', fold: 0.3, droop: 0.4 }, { petiole: 0.03, rachis: 0.012, side: 1.15, rise: [0.4, 0.8], droop: [0.3, 0.6] }),
  leafShrink: 0.15,
  pod: { place: 'tip', tipLevel: 1, chance: 1, count: [5, 8], dir: [0.6, 0.4], fan: 2.2, jitter: 0.3, shape: { length: 0.07, width: 0.013, thick: 0.007, seeds: 4, bump: 0.18, rows: 5, radial: 4, curve: 0.08, base: 0.75, tip: 1, streak: '#a86a6a' } },
  flower: { size: 0.017, streak: '#c4502e', color: '#f2c22e', count: [3, 5], scatter: 0.02, lift: 0.01, glow: '#2a1c00' },
  colors: {
    stem: [[0, '#6a8a40'], [0.5, '#6a7a44'], [0.85, '#7a6a48'], [1, '#6e5e44']],
    leaf: [[0, '#5a8a3a'], [0.6, '#527f36'], [0.82, '#6c7e3c'], [0.92, '#8a8a4c'], [1, '#8a7a4c']],
    pod: [[0.55, '#7f9e4a'], [0.76, '#86904a'], [0.88, '#9a7a4c'], [1, '#86683f']],
  },
  t: { grow: 0.55, flower: [0.45, 0.7], pod: [0.55, 0.75], drop: [0.88, 1, 0.35] },
  wind: 0.18,
  flutter: 0.016,
  stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.25, 'Branching'], [0.46, 'Flowering'], [0.62, 'Pod filling'], [0.9, 'Ready to harvest']],
  showcase: 0.64,
})

const lentil = pulse({
  height: 0.35,
  rowGap: 0.3,
  plantGap: 0.12,
  habit: { stems: [3, 4], length: [0.28, 0.38], lean: [0.2, 0.65], arch: [0.1, 0.35], radius: 0.0016, nodes: [7, 8], zone: [0.15, 1], branches: { count: [1, 2], zone: [0.25, 0.6], length: [0.4, 0.6], lean: [0.55, 0.9], nodes: [3, 4] } },
  leaf: pinnate({ length: 0.022, width: 0.009, shape: 'lance' }, { pairs: 4, terminal: false, petiole: 0.004, rachis: 0.035, side: 0.95, stalkRadius: 0.0005, rise: [0.5, 0.9], droop: [0.4, 0.8] }),
  pod: { place: 'axil', zone: [0.3, 1], chance: 0.55, count: [1, 2], dir: [1, 0.1], fan: 0.8, shape: { length: 0.017, width: 0.012, thick: 0.005, puffy: true, rows: 3, radial: 4, beak: 0.2, base: 0.8, tip: 1 } },
  flower: { size: 0.009, color: '#dcdcf4', count: 1 },
  colors: {
    leaf: [[0, '#6f9a4a'], [0.6, '#6a9446'], [0.76, '#8e9a4e'], [0.86, '#b5a35c'], [1, '#a38a58']],
    pod: [[0.48, '#8db058'], [0.74, '#94a85a'], [0.86, '#c0aa6a'], [1, '#a88c5c']],
  },
  t: { grow: 0.5, flower: [0.38, 0.62], pod: [0.5, 0.7], drop: [0.88, 1, 0.3] },
  wind: 0.14,
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.38, 'Flowering'], [0.56, 'Pod filling'], [0.8, 'Maturity'], [0.92, 'Ready to harvest']],
  showcase: 0.6,
})

const gramColors = (green, dark) => ({
  leaf: [[0, green], [0.6, dark], [0.8, '#6e8e3c'], [0.92, '#8f9446'], [1, '#9a8a4c']],
  pod: [[0.48, '#86ad52'], [0.66, '#7d9a48'], [0.76, '#4e4a32'], [0.86, '#2c2822'], [1, '#26221e']],
})

const greenGram = pulse({
  height: 0.5,
  rowGap: 0.3,
  plantGap: 0.15,
  habit: { stems: 1, length: [0.42, 0.52], lean: [0, 0.1], radius: 0.0035, nodes: [6, 8], zone: [0.15, 0.9], branches: { count: [2, 3], zone: [0.1, 0.4], length: [0.5, 0.7], lean: [0.4, 0.7], arch: 0.2, nodes: [3, 4] } },
  leaf: trifoliate({ length: 0.075, width: 0.052 }, { petiole: 0.07, stalk: 'tube', rise: [0.7, 1.0], droop: [0.6, 1.0] }),
  pod: { place: 'above', zone: [0.4, 1], chance: 0.5, peduncle: [0.08, 0.14], pedOut: 0.3, count: [3, 5], dir: [1, 0.35], fan: 2.4, shape: { length: 0.075, width: 0.0055, thick: 0.0055, rows: 4, radial: 4, curve: 0.05, beak: 0.1, base: 0.8, tip: 1 } },
  flower: { size: 0.013, color: '#ecd03a', count: [2, 3], up: 1, glow: '#2a2200' },
  colors: gramColors('#5e9a3a', '#56913a'),
  t: { grow: 0.48, flower: [0.38, 0.6], pod: [0.48, 0.66], drop: [0.9, 1, 0.25] },
  stages: [[0, 'Sowing'], [0.12, 'Vegetative'], [0.38, 'Flowering'], [0.52, 'Pod filling'], [0.74, 'Pods turning black'], [0.9, 'Ready to pick']],
  showcase: 0.74,
})

const blackGram = pulse({
  height: 0.45,
  rowGap: 0.3,
  plantGap: 0.15,
  roughness: 0.9,
  habit: { stems: 1, length: [0.36, 0.46], lean: [0, 0.1], radius: 0.0038, nodes: [5, 7], zone: [0.15, 0.9], branches: { count: [3, 4], zone: [0.08, 0.4], length: [0.55, 0.75], lean: [0.6, 0.9], arch: 0.3, nodes: [3, 4] } },
  leaf: trifoliate({ length: 0.07, width: 0.05, base: 0.58, tip: 1.0 }, { petiole: 0.06, stalk: 'tube', rise: [0.7, 1.0], droop: [0.6, 1.0] }),
  pod: { place: 'above', zone: [0.3, 1], chance: 0.5, peduncle: [0.03, 0.06], pedOut: 0.2, count: [3, 5], dir: [0.35, 1], fan: 1.6, jitter: 0.2, shape: { length: 0.048, width: 0.0068, thick: 0.0068, rows: 4, radial: 4, curve: 0.04, beak: 0.12, base: 0.8, tip: 1 } },
  podRoughness: 0.95,
  flower: { size: 0.011, color: '#e8cc36', count: [1, 2], up: 1, glow: '#2a2200' },
  colors: gramColors('#4f8a34', '#4a8030'),
  t: { grow: 0.5, flower: [0.38, 0.6], pod: [0.48, 0.68], drop: [0.9, 1, 0.25] },
  stages: [[0, 'Sowing'], [0.12, 'Vegetative'], [0.38, 'Flowering'], [0.52, 'Pod filling'], [0.74, 'Pods turning black'], [0.9, 'Ready to harvest']],
  showcase: 0.74,
})

const fieldPea = pulse({
  height: 0.88,
  rowGap: 0.45,
  plantGap: 0.12,
  jitter: 0.15,
  habit: { stems: [2, 3], length: [0.75, 0.95], lean: [0.15, 0.35], arch: [-0.1, 0.05], radius: 0.0028, radial: 3, tubular: 5, steps: 4, zigzag: 0.014, nodes: [12, 15], zone: [0.1, 1], branches: { count: [0, 1], zone: [0.1, 0.3], length: [0.6, 0.8], lean: [0.15, 0.3], nodes: [8, 10] } },
  leaf: pinnate({ length: 0.042, width: 0.027, shape: 'oval', rows: 1, fold: 0.15 }, { pairs: 2, terminal: false, tendrilLength: 0.05, petiole: 0.02, rachis: 0.035, side: 1.0, stalkRadius: 0.0009, stipule: 0.032, taper: 0, rise: [0.3, 0.7], droop: [0.3, 0.6] }),
  leafShrink: 0.15,
  pod: { place: 'axil', zone: [0.35, 0.92], chance: 0.45, count: [1, 2], dir: [0.4, -1], fan: 0.6, shape: { length: 0.075, width: 0.016, thick: 0.013, rows: 5, radial: 5, seeds: 6, bump: 0.12, curve: 0.12, base: 0.82, tip: 1 } },
  flower: { size: 0.021, color: '#f6f6f0', count: [1, 2], up: 0.4 },
  colors: {
    leaf: [[0, '#7aa278'], [0.6, '#74a074'], [0.78, '#94a46a'], [0.9, '#a8a066'], [1, '#a8915e']],
    pod: [[0.48, '#8cb860'], [0.72, '#92b25e'], [0.86, '#b8b07a'], [1, '#c4b27a']],
  },
  t: { grow: 0.5, flower: [0.38, 0.6], pod: [0.48, 0.66], drop: [0.9, 1, 0.3] },
  wind: 0.12,
  extras: peaSticks,
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.38, 'Flowering'], [0.52, 'Green pods'], [0.78, 'Pods drying'], [0.92, 'Ready to harvest']],
  showcase: 0.6,
})

const kidneyBean = pulse({
  height: 0.5,
  rowGap: 0.4,
  plantGap: 0.15,
  habit: { stems: 1, length: [0.42, 0.52], lean: [0, 0.08], radius: 0.004, nodes: [5, 7], zone: [0.2, 0.95], branches: { count: [2, 4], zone: [0.1, 0.45], length: [0.5, 0.7], lean: [0.4, 0.75], arch: 0.2, nodes: [3, 4] } },
  leaf: trifoliate({ length: 0.09, width: 0.065, rows: 2, droop: 0.55 }, { petiole: 0.08, rachis: 0.02, stalk: 'tube', stalkRadius: 0.0014, rise: [0.6, 0.9], droop: [0.6, 0.9] }),
  pod: { place: 'axil', zone: [0.2, 0.9], chance: 0.5, count: [2, 3], dir: [0.5, -1], fan: 0.9, shape: { length: 0.11, width: 0.013, thick: 0.008, rows: 5, radial: 4, curve: 0.12, seeds: 5, bump: 0.1, base: 0.82, tip: 1, streak: '#ff8a8a' } },
  flower: { size: 0.016, color: '#e8bcd8', count: [2, 3] },
  colors: {
    leaf: [[0, '#5f9038'], [0.6, '#5a8a36'], [0.78, '#8a9a46'], [0.88, '#a8a050'], [1, '#b09a5e']],
    pod: [[0.48, '#8db55a'], [0.7, '#9ab55c'], [0.8, '#d2c48a'], [0.9, '#dcc4a2'], [1, '#cfa88c']],
  },
  t: { grow: 0.5, flower: [0.38, 0.6], pod: [0.48, 0.68], drop: [0.82, 0.98, 0.55] },
  stages: [[0, 'Sowing'], [0.12, 'Vegetative'], [0.38, 'Flowering'], [0.52, 'Pod filling'], [0.78, 'Pods drying'], [0.92, 'Ready to harvest']],
  showcase: 0.7,
})

const cowpea = pulse({
  height: 0.5,
  rowGap: 0.45,
  plantGap: 0.25,
  habit: { stems: [3, 4], length: [0.45, 0.6], lean: [0.5, 0.85], arch: [0.3, 0.6], radius: 0.0035, nodes: [6, 8], zone: [0.15, 1], branches: { count: [0, 1], zone: [0.3, 0.5], length: [0.5, 0.7], lean: [0.8, 1.1], nodes: [3, 4] } },
  leaf: trifoliate({ length: 0.1, width: 0.058, rows: 1, shape: 'lance', droop: 0.5 }, { petiole: 0.08, rachis: 0.02, stalkRadius: 0.0012, rise: [0.7, 1.0], droop: [0.6, 1.0] }),
  pod: { place: 'hanging', zone: [0.3, 1], chance: 0.32, peduncle: [0.18, 0.28], pedOut: 0.3, count: 2, dir: [0.6, -1], fan: 1.2, jitter: 0.1, shape: { length: 0.24, width: 0.009, thick: 0.008, rows: 6, radial: 4, curve: 0.22, beak: 0.08, base: 0.8, tip: 1 } },
  flower: { size: 0.02, color: '#c8a8e2', count: [1, 2] },
  colors: {
    leaf: [[0, '#4f8a32'], [0.6, '#4c8530'], [0.8, '#76903c'], [0.92, '#98924a'], [1, '#9a8a4c']],
    pod: [[0.48, '#86b050'], [0.72, '#8fb055'], [0.84, '#c2b070'], [1, '#b29a68']],
  },
  t: { grow: 0.5, flower: [0.38, 0.6], pod: [0.48, 0.7], drop: [0.88, 1, 0.35] },
  stages: [[0, 'Sowing'], [0.12, 'Vegetative'], [0.38, 'Flowering'], [0.52, 'Pod development'], [0.8, 'Pods drying'], [0.92, 'Ready to harvest']],
  showcase: 0.7,
})

const horseGram = pulse({
  height: 0.35,
  rowGap: 0.4,
  plantGap: 0.18,
  habit: { stems: [4, 6], length: [0.35, 0.45], lean: [0.65, 1.0], arch: [0.3, 0.6], radius: 0.002, nodes: [5, 7], zone: [0.15, 1], zigzag: 0.008, branches: { count: [0, 1], zone: [0.3, 0.5], length: [0.5, 0.7], lean: [0.9, 1.1], nodes: [2, 3] } },
  leaf: trifoliate({ length: 0.036, width: 0.026 }, { petiole: 0.03, rachis: 0.008, rise: [0.6, 0.9], droop: [0.5, 0.8] }),
  pod: { place: 'axil', zone: [0.25, 1], chance: 0.35, count: [2, 3], dir: [1, 0.3], fan: 1.0, shape: { length: 0.042, width: 0.007, thick: 0.004, rows: 4, radial: 4, curve: 0.25, beak: 0.15, base: 0.8, tip: 1 } },
  flower: { size: 0.01, color: '#e8d878', count: 1 },
  colors: {
    leaf: [[0, '#6d8f45'], [0.6, '#688a42'], [0.8, '#8a904a'], [0.92, '#a49456'], [1, '#9a8654']],
    pod: [[0.5, '#86a050'], [0.72, '#8c9a50'], [0.84, '#a08a5c'], [1, '#8a7354']],
  },
  t: { grow: 0.55, flower: [0.42, 0.62], pod: [0.52, 0.72], drop: [0.88, 1, 0.3] },
  wind: 0.12,
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.42, 'Flowering'], [0.58, 'Pod filling'], [0.82, 'Maturity'], [0.92, 'Ready to harvest']],
  showcase: 0.64,
})

const mothBean = pulse({
  height: 0.2,
  rowGap: 0.45,
  plantGap: 0.25,
  habit: { stems: [6, 8], length: [0.4, 0.55], lean: [1.05, 1.3], arch: [0.15, 0.35], radius: 0.0022, nodes: [11, 14], zone: [0.06, 1], minY: 0.012, outward: 0.2, zigzag: 0.012, wander: 0.15 },
  leaf: pinnate({ length: 0.046, width: 0.014, shape: 'lance', rows: 0, fold: 0.3 }, { pairs: 2, terminal: true, petiole: 0.04, rachis: 0.008, side: 0.75, stalkRadius: 0.0008, taper: 0, rise: [1.0, 1.3], droop: [0.7, 1.1] }),
  leafShrink: 0.1,
  pod: { place: 'axil', zone: [0.2, 1], chance: 0.4, count: [1, 3], dir: [1, 0.45], fan: 1.4, shape: { length: 0.035, width: 0.0048, thick: 0.0048, rows: 3, radial: 4, curve: 0.1, base: 0.8, tip: 1 } },
  flower: { size: 0.009, color: '#ecd03a', count: 1, up: 1, glow: '#2a2200' },
  colors: {
    leaf: [[0, '#6a9a3e'], [0.6, '#64943a'], [0.8, '#8c9a44'], [0.92, '#a29a58'], [1, '#9a8a54']],
    pod: [[0.5, '#86a650'], [0.7, '#8a9e50'], [0.84, '#9a8050'], [1, '#7e6646']],
  },
  t: { grow: 0.55, flower: [0.4, 0.62], pod: [0.5, 0.7] },
  wind: 0.1,
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.4, 'Flowering'], [0.55, 'Pod filling'], [0.85, 'Ready to harvest']],
  showcase: 0.56,
})

const lathyrus = pulse({
  height: 0.38,
  rowGap: 0.25,
  plantGap: 0.15,
  jitter: 0.5,
  habit: { stems: [4, 6], length: [0.4, 0.55], lean: [0.5, 0.95], arch: [0.3, 0.55], radius: 0.0022, nodes: [9, 11], zone: [0.1, 1], zigzag: 0.01, wander: 0.15 },
  leaf: pinnate({ length: 0.07, width: 0.009, shape: 'linear', rows: 1, fold: 0.3, rise: 0.3, droop: 0.5 }, { pairs: 1, terminal: false, tendrilLength: 0.035, petiole: 0.012, rachis: 0.006, side: 0.35, stalkRadius: 0.0008, taper: 0, rise: [0.4, 0.8], droop: [0.3, 0.6] }),
  pod: { place: 'axil', zone: [0.25, 1], chance: 0.5, count: 1, dir: [1, 0.2], shape: { length: 0.036, width: 0.013, thick: 0.005, rows: 3, radial: 4, beak: 0.2, base: 0.8, tip: 1 } },
  flower: { size: 0.015, color: '#6f68d8', count: 1, glow: '#0a0828' },
  colors: {
    leaf: [[0, '#6e9a56'], [0.6, '#6a9652'], [0.8, '#8e9a52'], [0.9, '#a8a060'], [1, '#a08a58']],
    pod: [[0.48, '#88ac5c'], [0.72, '#92a85a'], [0.86, '#b8a268'], [1, '#a48a5c']],
  },
  t: { grow: 0.5, flower: [0.36, 0.6], pod: [0.48, 0.68] },
  wind: 0.12,
  extras: paddyStubble,
  budget: 2.15e6,
  stages: [[0, 'Sown into paddy'], [0.15, 'Vegetative'], [0.36, 'Flowering'], [0.54, 'Pod filling'], [0.85, 'Ready to harvest']],
  showcase: 0.5,
})

const clusterBean = pulse({
  height: 0.9,
  rowGap: 0.45,
  plantGap: 0.2,
  habit: { stems: 1, length: [0.8, 1.0], lean: [0, 0.06], radius: 0.005, radial: 4, tubular: 5, nodes: [16, 20], zone: [0.1, 0.95], branches: { count: [2, 3], zone: [0.15, 0.5], length: [0.35, 0.5], lean: [0.25, 0.45], nodes: [6, 8] } },
  leaf: trifoliate({ length: 0.075, width: 0.045, wave: 0.2 }, { petiole: 0.05, rachis: 0.014, rise: [0.5, 0.9], droop: [0.5, 0.8] }),
  pod: { place: 'axil', zone: [0.15, 0.9], minLevel: 1, chance: 0.55, count: [5, 7], dir: [0.5, 1], fan: 1.5, jitter: 0.1, shape: { length: 0.088, width: 0.012, thick: 0.008, rows: 4, radial: 4, curve: 0.06, base: 0.8, tip: 1 } },
  flower: { size: 0.009, color: '#dcc2e4', count: [2, 3], scatter: 0.008 },
  colors: {
    leaf: [[0, '#5f8f3c'], [0.62, '#5a8a38'], [0.8, '#8c9a46'], [0.92, '#a8a058'], [1, '#a4925a']],
    pod: [[0.48, '#9cc262'], [0.72, '#a0c064'], [0.84, '#c8b878'], [1, '#b09468']],
  },
  t: { grow: 0.55, flower: [0.38, 0.6], pod: [0.48, 0.68], drop: [0.82, 0.98, 0.6] },
  wind: 0.16,
  stages: [[0, 'Sowing'], [0.12, 'Vegetative'], [0.38, 'Flowering'], [0.52, 'Pod formation'], [0.78, 'Pods drying'], [0.92, 'Ready to harvest']],
  showcase: 0.66,
})

/* ------------------------------------------------------------------ groundnut and soybean */
function groundnutSites(random, sk, out) {
  sk.nodes.forEach((node) => {
    if (node.t > 0.55 || random() > 0.6) return
    const outDir = flat(node.az)
    const flower = peaFlower({ size: 0.015 })
    aim(flower, node.p.clone().addScaledVector(outDir, 0.008).add(V(0, 0.008, 0)), heading(random, node.az, 0.8, 0.6))
    out.add('flowers', flower, node.p)
    const end = V(node.p.x + outDir.x * random.range(0.02, 0.05), -0.03, node.p.z + outDir.z * random.range(0.02, 0.05))
    const mid = node.p.clone().lerp(end, 0.5).addScaledVector(outDir, 0.012)
    out.add('pegs', tube([node.p.clone(), mid, end], 0.0012, 0.0009, { radial: 3, tubular: 3, color: '#ffffff' }), node.p)
  })
}

const groundnut = pulse({
  height: 0.3,
  rowGap: 0.3,
  plantGap: 0.15,
  habit: { stems: [5, 7], length: [0.24, 0.32], lean: [0.3, 0.9], arch: [0.2, 0.45], radius: 0.0028, nodes: [5, 7], zone: [0.15, 1] },
  leaf: pinnate({ length: 0.04, width: 0.025, shape: 'obovate', rows: 1, fold: 0.15, droop: 0.3 }, { pairs: 2, terminal: false, petiole: 0.04, rachis: 0.022, side: 1.0, stalkRadius: 0.001, taper: 0, rise: [0.6, 1.0], droop: [0.4, 0.7] }),
  leafShrink: 0.15,
  pod: { shape: { length: 0.02, width: 0.01 } },
  sites: groundnutSites,
  flower: { size: 0.015, color: '#ffc81a', glow: '#3a2600' },
  colors: {
    leaf: [[0, '#5d9a3a'], [0.62, '#5a963a'], [0.76, '#7c9a3c'], [0.86, '#b4ac52'], [1, '#a89a56']],
    pod: [[0, '#d8c8a0']],
  },
  parts: [{ key: 'pegs', scale: (g) => smooth(0.4, 0.52, g), color: rampFn([[0.4, '#b89aa8'], [0.6, '#c8b8a0']]) }],
  t: { grow: 0.45, flower: [0.28, 0.6], pod: [0.4, 0.6], drop: [0.9, 1, 0.2] },
  wind: 0.12,
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.28, 'Flowering'], [0.44, 'Pegging'], [0.6, 'Pod development'], [0.88, 'Ready to dig']],
  showcase: 0.42,
})

const soybean = pulse({
  height: 0.8,
  rowGap: 0.45,
  plantGap: 0.1,
  habit: { stems: 1, length: [0.7, 0.85], lean: [0, 0.06], radius: 0.0045, radial: 4, tubular: 5, nodes: [10, 12], zone: [0.12, 0.95], branches: { count: [3, 4], zone: [0.1, 0.45], length: [0.45, 0.65], lean: [0.35, 0.6], arch: 0.15, nodes: [5, 7] } },
  leaf: trifoliate({ length: 0.095, width: 0.065, droop: 0.5 }, { petiole: 0.1, rachis: 0.02, stalk: 'tube', stalkRadius: 0.0014, rise: [0.7, 1.0], droop: [0.6, 1.0] }),
  pod: { place: 'axil', zone: [0.1, 0.95], chance: 0.65, count: [2, 3], dir: [0.6, 0.6], fan: 1.6, shape: { length: 0.045, width: 0.011, thick: 0.007, rows: 3, radial: 4, seeds: 3, bump: 0.15, curve: 0.12, base: 0.8, tip: 1 } },
  podRoughness: 0.95,
  flower: { size: 0.009, color: '#b89ad8', count: [2, 3] },
  colors: {
    stem: [[0, '#6a9a3e'], [0.7, '#6a9040'], [0.8, '#b8a448'], [0.9, '#a88a4c'], [1, '#8f7048']],
    leaf: [[0, '#5f9a3a'], [0.6, '#4f8a32'], [0.72, '#7a9a3a'], [0.8, '#c8b440'], [0.88, '#c9a548'], [1, '#a07a48']],
    pod: [[0.46, '#86a854'], [0.7, '#8aa652'], [0.8, '#b9a856'], [0.9, '#a88a52'], [1, '#8a6a42']],
  },
  t: { grow: 0.5, flower: [0.36, 0.56], pod: [0.46, 0.66], drop: [0.82, 0.97, 0.85] },
  stages: [[0, 'Sowing'], [0.12, 'Vegetative'], [0.36, 'Flowering'], [0.5, 'Pod filling'], [0.76, 'Leaves yellowing'], [0.92, 'Ready to harvest']],
  showcase: 0.8,
})

export const models = {
  chickpea,
  'pigeon-pea': pigeonPea,
  lentil,
  'green-gram': greenGram,
  'black-gram': blackGram,
  'field-pea': fieldPea,
  'kidney-bean': kidneyBean,
  cowpea,
  'horse-gram': horseGram,
  'moth-bean': mothBean,
  lathyrus,
  'cluster-bean': clusterBean,
  groundnut,
  soybean,
  sunflower,
  sesame,
  linseed,
  castor,
  safflower,
  niger,
  cotton,
  jute,
  mesta,
  'sunn-hemp': sunnHemp,
  tobacco,
}
