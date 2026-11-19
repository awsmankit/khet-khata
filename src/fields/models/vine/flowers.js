// Flower fields: bushes in rows (marigold, rose, jasmine, chrysanthemum) and spike flowers
// (tuberose, gladiolus). Shoots radiate to a bush-shaped shell; flower heads sit at the shoot
// tips as world-space sockets so each can carry its own colour and timing.
import * as THREE from 'three'
import { blade, ellipsoid, merge, prep, tube } from '../../geometry.js'
import { ramp, rowSpots, tone } from '../../crops.js'
import { TAU, V, addItemsPart, addVariantParts, aim, bloom, leafDisc, lerp, placeFlat, plantEntries, smooth, socketItems, strip, windMaterials } from './kit.js'
import { bud, chrysanthemumHead, gladiolusFloret, marigoldHead, roseBloom, starFlower } from './parts.js'

const tmp = new THREE.Color()

/* ---------------------------------------------------------------- leaf templates */
function marigoldLeaf(random) {
  return strip({ length: random.range(0.085, 0.11), width: 0.05, profile: (t, row) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)), 0.6) * (row % 2 ? 1 : 0.22), segments: 10, rise: random.range(0.2, 0.5), droop: 0.5, fold: 0.15, base: '#9aa092', tip: '#d8dcd0', rib: '#ffffff' })
}

function chrysanthemumLeaf(random) {
  return strip({ length: random.range(0.075, 0.095), width: 0.05, profile: (t, row) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02 + 0.05)), 0.7) * (row % 3 === 0 ? 0.45 : 1), segments: 9, rise: random.range(0.2, 0.45), droop: 0.45, fold: 0.2, base: '#a8aca4', tip: '#d2d6cc', rib: '#ffffff' })
}

function jasmineLeaf(random) {
  return leafDisc(random, { size: random.range(0.05, 0.062), lobes: 1, depth: 0.2, sharp: 1, basal: 0.35, notch: 0, cup: 0.12, droop: 0.15, fold: 0.15, wave: 0.03, detail: 12, rings: 1, vein: 0.12, stretch: 1.45, light: 1.0, dark: 0.82 })
}

function roseLeaf(random) {
  const parts = [tube([V(0, 0, 0), V(0, 0.01, 0.05), V(0, 0.005, 0.1)], 0.0018, 0.0012, { radial: 3, tubular: 3, color: '#c8c8b0' })]
  const leaflet = (at, yaw, size) => {
    const geometry = leafDisc(random, { size, lobes: 1, depth: 0.25, sharp: 1, basal: 0.3, notch: 0, cup: 0.1, droop: 0.1, fold: 0.18, wave: 0.02, serrate: 0.08, detail: 12, rings: 1, vein: 0.1, stretch: 1.35, light: 1.0, dark: 0.8 })
    return placeFlat(geometry, at, yaw, 0.1, 0)
  }
  parts.push(leaflet(V(0, 0.005, 0.1), 0, 0.05))
  for (const [z, size] of [[0.035, 0.04], [0.068, 0.045]]) {
    for (const side of [-1, 1]) parts.push(leaflet(V(0, 0.008, z), side * 1.15, size))
  }
  return merge(parts)
}

/* ---------------------------------------------------------------- bushes */
const BUSHES = {
  marigold: {
    plot: { width: 9, depth: 12, rowGap: 0.6 }, plantGap: 0.58,
    height: 0.8, rx: 0.3, ry: 0.32, shoots: 14, leaves: 5, shellLeaves: 0, stem: 0.008, leafScale: 1, extraHeads: 0.15,
    leaf: marigoldLeaf, wood: false,
    leafRamp: [[0, '#6c9a48'], [0.3, '#4f8638'], [0.8, '#4a7e34'], [1, '#6c7a3a']],
    heads: (random) => [marigoldHead(random), marigoldHead(random, { radius: 0.036 })],
    buds: () => ellipsoid(0.014, 0.022, 0.014, { widthSegments: 6, heightSegments: 4, color: '#ffffff' }),
    budWindow: [0.3, 0.46], headWindow: [0.42, 0.97],
    palette: ['#f07c10', '#f8bf18', '#e8650e'], byRow: true,
    headRamp: (c, g, color) => c.set(color).lerp(tmp.set('#9a5a2a'), smooth(0.9, 1, g) * 0.5),
    wind: { strength: 0.12, flutter: 0.012, refHeight: 0.8, ground: 0 },
    camera: { position: V(5.2, 1.9, 9.6), target: V(-0.5, 0.55, 2.2) },
  },
  chrysanthemum: {
    plot: { width: 9, depth: 11, rowGap: 0.6 }, plantGap: 0.6,
    height: 0.7, rx: 0.3, ry: 0.28, shoots: 12, leaves: 4, shellLeaves: 34, coreColor: '#3c6a30', stem: 0.007, leafScale: 1, extraHeads: 0.3,
    leaf: chrysanthemumLeaf, wood: false,
    leafRamp: [[0, '#6f9a52'], [0.3, '#55844a'], [0.8, '#507e44'], [1, '#6a7840']],
    heads: (random) => [chrysanthemumHead(random), chrysanthemumHead(random, { size: 0.065, pompon: true })],
    buds: () => ellipsoid(0.013, 0.012, 0.013, { widthSegments: 6, heightSegments: 4, color: '#ffffff' }),
    budWindow: [0.5, 0.64], headWindow: [0.6, 0.97],
    palette: ['#f7c51e', '#f5f1e4', '#f2b21a'], byRow: true,
    headRamp: (c, g, color) => c.set(color).lerp(tmp.set('#b08850'), smooth(0.9, 1, g) * 0.4),
    wind: { strength: 0.1, flutter: 0.012, refHeight: 0.7, ground: 0 },
    camera: { position: V(5.2, 1.85, 9.0), target: V(-0.5, 0.45, 2.0) },
  },
  rose: {
    plot: { width: 10, depth: 14, rowGap: 1.4 }, plantGap: 0.8,
    height: 1.0, rx: 0.42, ry: 0.4, shoots: 10, leaves: 6, shellLeaves: 24, coreColor: '#34602c', stem: 0.009, leafScale: 1, extraHeads: 0.0,
    leaf: roseLeaf, wood: true,
    leafRamp: [[0, '#7a5a3a'], [0.12, '#6a7a3e'], [0.3, '#3f6e2c'], [1, '#3c6a2c']],
    heads: (random) => [roseBloom(random), roseBloom(random, { size: 0.075 })],
    buds: () => bud({ length: 0.04, radius: 0.012, sides: 7, tip: 0.7 }),
    budWindow: [0.34, 0.9], headWindow: [0.48, 0.97], budsAlways: 0.4,
    palette: ['#b30f28', '#c81a3c', '#e2577e', '#d02a4a'], byRow: false,
    headRamp: (c, g, color) => c.set(color),
    wind: { strength: 0.1, flutter: 0.012, refHeight: 1.0, ground: 0 },
    camera: { position: V(6.0, 1.9, 10.6), target: V(-0.6, 0.6, 2.6) },
  },
  jasmine: {
    plot: { width: 10, depth: 12, rowGap: 1.25 }, plantGap: 1.0,
    height: 0.75, rx: 0.42, ry: 0.32, shoots: 16, leaves: 8, shellLeaves: 110, coreColor: '#3a6830', stem: 0.006, leafScale: 1, extraHeads: 1.0,
    leaf: jasmineLeaf, wood: true,
    leafRamp: [[0, '#5f8a3e'], [0.15, '#4f8236'], [0.35, '#3e6e2e'], [1, '#3c6a2c']],
    heads: (random) => [starFlower(random, { size: 0.05, petals: 7, layers: 2, cup: 0.05, sharp: 1.2 }), starFlower(random, { size: 0.045, petals: 6, layers: 1, cup: 0.1, sharp: 1.3 })],
    buds: () => bud({ length: 0.026, radius: 0.0065, sides: 5, tip: 0.5 }),
    budWindow: [0.36, 0.95], headWindow: [0.46, 0.93], budsAlways: 1,
    palette: ['#fbfaf4', '#f8f6ee'], byRow: false,
    headRamp: (c, g, color) => c.set(color),
    wind: { strength: 0.08, flutter: 0.012, refHeight: 0.75, ground: 0 },
    camera: { position: V(5.8, 1.8, 9.6), target: V(-0.6, 0.4, 2.4) },
  },
}

function bushVariant(random, spec, templates) {
  const plant = []
  const wood = []
  const heads = []
  const buds = []
  const center = V(0, spec.height - spec.ry, 0)
  // a small green inner mass so the bush does not look see-through; leaves cover it
  const core = new THREE.SphereGeometry(1, 10, 7)
  const position = core.attributes.position
  const vertex = V()
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const bump = 1 + 0.15 * Math.sin(vertex.x * 5.3 + vertex.y * 3.1) * Math.sin(vertex.z * 4.7)
    position.setXYZ(index, vertex.x * spec.rx * 0.46 * bump, center.y + vertex.y * spec.ry * 0.42 * bump, vertex.z * spec.rx * 0.46 * bump)
  }
  core.computeVertexNormals()
  const coreGeometry = prep(core, '#ffffff', (c, x, y) => c.setScalar(lerp(0.82, 1.05, (y - center.y) / spec.ry * 0.5 + 0.5)))
  if (spec.wood) {
    for (let index = 0; index < 5; index += 1) {
      const a = (index / 5) * TAU + random.gauss() * 0.3
      const top = V(Math.cos(a) * spec.rx * 0.3, spec.height * 0.32, Math.sin(a) * spec.rx * 0.3)
      wood.push(tube([V(0, -0.02, 0), V(top.x * 0.4, top.y * 0.5, top.z * 0.4), top], spec.stem * 2.2, spec.stem * 1.5, { radial: 5, tubular: 3, color: '#6a5a42' }))
    }
  }
  for (let shoot = 0; shoot < spec.shoots; shoot += 1) {
    const azimuth = (shoot / spec.shoots) * TAU + random.gauss() * 0.3
    const elevation = Math.asin(random.range(0.05, 0.98))
    const reach = random.range(0.85, 1.05)
    const tip = V(Math.cos(elevation) * Math.cos(azimuth) * spec.rx * reach, center.y + Math.sin(elevation) * spec.ry * reach, Math.cos(elevation) * Math.sin(azimuth) * spec.rx * reach)
    const base = spec.wood ? V(Math.cos(azimuth) * spec.rx * 0.25, spec.height * 0.3, Math.sin(azimuth) * spec.rx * 0.25) : V(random.gauss() * 0.02, 0.01, random.gauss() * 0.02)
    const mid = base.clone().lerp(tip, 0.5).add(V(random.gauss() * 0.04, 0.04, random.gauss() * 0.04))
    plant.push(tube([base, mid, tip], spec.stem, spec.stem * 0.55, { radial: 4, tubular: 5, color: '#d8dcc0' }))
    const curve = new THREE.CatmullRomCurve3([base, mid, tip])
    for (let leaf = 0; leaf < spec.leaves; leaf += 1) {
      const t = 0.25 + (leaf / spec.leaves) * 0.72
      const at = curve.getPointAt(t)
      const side = leaf % 2 ? 1 : -1
      const geometry = templates[(shoot + leaf) % templates.length].clone()
      const s = spec.leafScale * random.range(0.8, 1.1) * lerp(1, 0.75, t)
      geometry.scale(s, s, s)
      plant.push(placeFlat(geometry, at, -azimuth + Math.PI / 2 + side * random.range(0.6, 1.3), random.range(0.1, 0.5), side * 0.3))
    }
    const direction = tip.clone().sub(mid).normalize().add(V(0, 1.2, 0))
    heads.push({ p: tip.clone(), q: aim(direction, random() * TAU), s: 1, offset: random.gauss() * 0.02 })
    if (random() < spec.extraHeads) {
      const at = curve.getPointAt(random.range(0.65, 0.85))
      const out = V(Math.cos(azimuth + random.gauss()), 0, Math.sin(azimuth + random.gauss()))
      const p = at.clone().addScaledVector(out, 0.05).add(V(0, 0.03, 0))
      plant.push(tube([at, p], spec.stem * 0.5, spec.stem * 0.4, { radial: 3, tubular: 1, color: '#d8dcc0' }))
      heads.push({ p, q: aim(out.clone().add(V(0, 1.4, 0)), random() * TAU), s: 0.9, offset: random.gauss() * 0.03 })
    }
    if (spec.budsAlways) {
      const count = Math.round(spec.budsAlways * 2 + random() * 2 * spec.budsAlways)
      for (let index = 0; index < count; index += 1) {
        const at = curve.getPointAt(random.range(0.75, 0.98))
        const out = V(random.gauss(), 0.4, random.gauss()).normalize()
        buds.push({ p: at.clone().addScaledVector(out, 0.025), q: aim(out.clone().add(V(0, 1, 0)), random() * TAU), s: 1, offset: random.gauss() * 0.04 })
      }
    }
  }
  // an outer skin of leaves over the shell of the bush
  for (let index = 0; index < (spec.shellLeaves || 0); index += 1) {
    const azimuth = random() * TAU
    const elevation = Math.asin(random.range(-0.25, 0.95))
    const reach = random.range(0.8, 1.0)
    const at = V(Math.cos(elevation) * Math.cos(azimuth) * spec.rx * reach, center.y + Math.sin(elevation) * spec.ry * reach, Math.cos(elevation) * Math.sin(azimuth) * spec.rx * reach)
    if (at.y < 0.06) continue
    const geometry = templates[index % templates.length].clone()
    const s = spec.leafScale * random.range(0.8, 1.1)
    geometry.scale(s, s, s)
    plant.push(placeFlat(geometry, at, -azimuth + Math.PI / 2 + random.gauss() * 0.6, random.range(0.05, 0.6) + Math.max(0, Math.sin(elevation)) * 0.5, random.gauss() * 0.3))
  }
  return { plant: merge(plant), core: coreGeometry, wood: wood.length ? merge(wood) : null, heads, buds: spec.budsAlways ? buds : heads }
}

export function buildBush(ctx, kind) {
  const spec = BUSHES[kind]
  const { random, quality } = ctx
  const { plot } = spec
  const spots = rowSpots({ width: plot.width, depth: plot.depth - 0.6, rowGap: plot.rowGap, plantGap: spec.plantGap / Math.sqrt(quality), random, jitter: 0.12, skip: 0.02 })
  const templates = [0, 1, 2].map(() => spec.leaf(random))
  const variants = [0, 1, 2].map(() => bushVariant(random, spec, templates))
  const entries = plantEntries(random, spots, { variants: 3, baseY: 0.035, tilt: 0.05 })
  entries.forEach((entry) => {
    const row = Math.round((entry.p.x + plot.width / 2) / plot.rowGap - 0.5)
    entry.color = spec.byRow ? spec.palette[Math.floor(row / 2) % spec.palette.length] : spec.palette[Math.floor(entry.pick * spec.palette.length)]
  })
  const mats = windMaterials(ctx, spec.wind, { roughness: kind === 'jasmine' ? 0.5 : 0.75 })
  const growth = (g) => lerp(spec.wood ? 0.3 : 0.18, 1, smooth(0, 0.42, g))
  addVariantParts(ctx, {
    entries, variants, key: 'plant', mats, scale: growth,
    color: (c, g, entry) => tone(ramp(c, g, spec.leafRamp), entry),
  })
  addVariantParts(ctx, { entries, variants, key: 'core', mats, scale: growth, color: (c, g, entry) => tone(c.set(spec.coreColor || '#36622e'), entry) })
  if (spec.wood) addVariantParts(ctx, { entries, variants, key: 'wood', mats, scale: () => 1, color: (c, g, entry) => tone(c.set('#ffffff'), entry) })

  const headMats = windMaterials(ctx, spec.wind, { roughness: 0.7 })
  const [h0, h1] = spec.headWindow
  addItemsPart(ctx, {
    geometries: spec.heads(random),
    items: socketItems(random, entries, variants, 'heads', { jitter: 0.03 }), mats: headMats,
    scale: (g) => bloom(g, h0, h1, 0.07),
    color: (c, g, entry) => tone(spec.headRamp(c, g, entry.entry.color), entry),
  })
  const [b0, b1] = spec.budWindow
  addItemsPart(ctx, {
    geometries: spec.buds(random),
    items: socketItems(random, entries, variants, 'buds', { jitter: 0.03 }), mats: headMats,
    scale: (g) => bloom(g, b0, b1, 0.05),
    color: (c, g, entry) => tone(kind === 'jasmine' ? c.set('#f4f2e6') : ramp(c, g, [[b0, '#5f8a3a'], [b0 + 0.1, '#6a8a3a'], [b1, entry.entry.color]]), entry),
  })
  return { plot, soil: 'furrow', scarecrow: false, camera: spec.camera }
}

/* ---------------------------------------------------------------- spike flowers */
const SPIKES = {
  tuberose: {
    plot: { width: 9, depth: 12, rowGap: 0.5 }, plantGap: 0.35,
    leaves: 15, leafLength: [0.3, 0.46], leafWidth: 0.016, rise: [0.9, 1.35], droop: [0.9, 1.5], leafShape: 'strap',
    spikeHeight: [0.9, 1.1], spikes: [1, 2], florets: 14, floretStart: 0.62, oneSided: false,
    floret: (random) => starFlower(random, { size: 0.042, petals: 6, layers: 1, cup: 0.35, tubeLength: 0.03, sharp: 0.9 }),
    floretBud: () => bud({ length: 0.035, radius: 0.0065, sides: 5, tip: 0.5, base: 0.8 }),
    palette: ['#f8f6ee'], budColor: '#e8e4cc',
    leafRamp: [[0, '#6a9a48'], [0.3, '#4f8a3a'], [0.8, '#4c8236'], [1, '#6a8038']],
    wind: { strength: 0.16, flutter: 0.012, refHeight: 1.0, ground: 0 },
    camera: { position: V(5.4, 2.0, 9.8), target: V(-0.5, 0.65, 2.2) },
  },
  gladiolus: {
    plot: { width: 8, depth: 10, rowGap: 0.5 }, plantGap: 0.25,
    leaves: 7, leafLength: [0.45, 0.72], leafWidth: 0.036, rise: [1.4, 1.52], droop: [0.15, 0.45], leafShape: 'lance', fan: true,
    spikeHeight: [1.05, 1.3], spikes: [1, 1], florets: 11, floretStart: 0.58, oneSided: true,
    floret: (random) => gladiolusFloret(random),
    floretBud: () => bud({ length: 0.045, radius: 0.009, sides: 5, tip: 0.6, base: 0.75 }),
    palette: ['#d8243a', '#f07a9a', '#f6d23a', '#f4f0e4', '#f0862a', '#8a4fb0', '#e8456a'], budColor: null,
    leafRamp: [[0, '#6a9a48'], [0.3, '#4f8a3a'], [0.85, '#4c8236'], [1, '#768a3c']],
    wind: { strength: 0.18, flutter: 0.01, refHeight: 1.2, ground: 0 },
    camera: { position: V(4.8, 2.0, 8.6), target: V(-0.4, 0.8, 1.8) },
  },
}

function spikeVariant(random, spec) {
  const plant = []
  const spikes = []
  const florets = []
  const fanYaw = random() * TAU
  for (let index = 0; index < spec.leaves; index += 1) {
    const yaw = spec.fan ? fanYaw + (index % 2 ? 0 : Math.PI) + random.gauss() * 0.15 : random() * TAU
    const geometry = blade({ length: random.range(spec.leafLength[0], spec.leafLength[1]), width: spec.leafWidth * random.range(0.85, 1.1), rise: random.range(spec.rise[0], spec.rise[1]), droop: random.range(spec.droop[0], spec.droop[1]), segments: 5, fold: 0.3, shape: spec.leafShape, base: '#a8a8a0', tip: '#e8e8e0', rib: '#ffffff' })
    geometry.rotateY(yaw)
    if (spec.fan) geometry.translate(Math.sin(fanYaw) * (index - spec.leaves / 2) * 0.006, 0, Math.cos(fanYaw) * (index - spec.leaves / 2) * 0.006)
    plant.push(geometry)
  }
  const count = Math.round(random.range(spec.spikes[0], spec.spikes[1]))
  for (let index = 0; index < count; index += 1) {
    const height = random.range(spec.spikeHeight[0], spec.spikeHeight[1]) * (index ? 0.85 : 1)
    const lean = V(random.gauss() * 0.05, 0, random.gauss() * 0.05)
    const top = V(lean.x * height, height, lean.z * height)
    const points = [V(0, 0, 0), V(lean.x * height * 0.3, height * 0.5, lean.z * height * 0.3), top]
    spikes.push(tube(points, 0.0075, 0.004, { radial: 5, tubular: 6, color: '#ffffff' }))
    const curve = new THREE.CatmullRomCurve3(points)
    const face = fanYaw + Math.PI / 2 + random.gauss() * 0.3
    for (let k = 0; k < spec.florets; k += 1) {
      const t = spec.floretStart + (k / spec.florets) * (0.98 - spec.floretStart)
      const at = curve.getPointAt(t)
      const around = spec.oneSided ? face + (k % 2 ? 0.45 : -0.45) : k * 2.4
      const out = V(Math.cos(around), 0, Math.sin(around))
      const open = (spec.oneSided ? 0.6 : 0.56) + (k / spec.florets) * 0.22
      florets.push({ p: at.clone().addScaledVector(out, 0.008), q: aim(out.clone().multiplyScalar(spec.oneSided ? 1.1 : 0.9).add(V(0, spec.oneSided ? 0.5 : 0.8, 0)), random() * TAU), s: lerp(1, 0.7, k / spec.florets), offset: 0, open })
    }
  }
  return { plant: merge(plant), spike: merge(spikes), florets }
}

export function buildSpikes(ctx, kind) {
  const spec = SPIKES[kind]
  const { random, quality } = ctx
  const { plot } = spec
  const spots = rowSpots({ width: plot.width, depth: plot.depth - 0.5, rowGap: plot.rowGap, plantGap: spec.plantGap / Math.sqrt(quality), random, jitter: 0.12, skip: 0.03 })
  const variants = [0, 1, 2, 3].map(() => spikeVariant(random, spec))
  const entries = plantEntries(random, spots, { variants: 4, baseY: 0.035, tilt: 0.04 })
  entries.forEach((entry) => {
    const row = Math.round((entry.p.x + plot.width / 2) / plot.rowGap - 0.5)
    const block = Math.floor(row / 2) + (entry.p.z > 0 ? 3 : 0)
    entry.color = spec.palette[block % spec.palette.length]
  })
  const mats = windMaterials(ctx, spec.wind, { roughness: 0.7 })
  addVariantParts(ctx, {
    entries, variants, key: 'plant', mats,
    scale: (g) => [lerp(0.4, 1, smooth(0, 0.3, g)), lerp(0.12, 1, smooth(0, 0.4, g)), lerp(0.4, 1, smooth(0, 0.3, g))],
    color: (c, g, entry) => tone(ramp(c, g, spec.leafRamp), entry),
  })
  addVariantParts(ctx, {
    entries, variants, key: 'spike', mats,
    scale: (g) => [1, Math.max(0.001, smooth(0.36, 0.54, g)), 1],
    color: (c, g, entry) => tone(ramp(c, g, [[0.4, '#6a9a44'], [0.8, '#5f9040'], [1, '#7a8a40']]), entry),
  })
  const floretItems = socketItems(random, entries, variants, 'florets', { jitter: 0.015, scale: [0.9, 1.1] })
  const floretMats = windMaterials(ctx, spec.wind, { roughness: 0.6 })
  addItemsPart(ctx, {
    geometries: [spec.floret(random), spec.floret(random)],
    items: floretItems, mats: floretMats,
    scale: (g, entry) => smooth(entry.socket.open, entry.socket.open + 0.05, g) * (1 - 0.35 * smooth(0.9, 1, g)),
    color: (c, g, entry) => tone(c.set(entry.entry.color).lerp(tmp.set('#b09070'), smooth(0.9, 1, g) * 0.3), entry),
  })
  addItemsPart(ctx, {
    geometries: spec.floretBud(random),
    items: floretItems, mats: floretMats,
    scale: (g, entry) => smooth(0.5, 0.55, g) * (1 - smooth(entry.socket.open, entry.socket.open + 0.03, g)),
    color: (c, g, entry) => tone(c.set('#7aa048').lerp(tmp.set(spec.budColor || entry.entry.color), 0.55), entry),
  })
  return { plot, soil: 'furrow', scarecrow: false, camera: spec.camera }
}
