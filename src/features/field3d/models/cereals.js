// 3D models for the "field" group of crops. See MODELS_BRIEF.md.
// Three shared families from ./field/kit.js:
//   grain   tillered grasses with a mounted head per tiller (barley, oats, sorghum, the millets,
//           black rice, napier); head shapes come from ./field/heads.js
//   herb    broad-leaved grain crops with heads at stem and branch tips (buckwheat, amaranth, quinoa)
//   clover  trifoliate fodder with flower heads, cut and regrown (berseem, lucerne)
import * as THREE from 'three'
import { lerp, smooth } from '../engine/geometry.js'
import { ramp, rowSpots, tone, V } from '../engine/plantKit.js'
import { cloverPlant, herbPlant, sow, tillerPlant } from './cereals/kit.js'
import { antherSpecks, awnedEar, cloverHead, flowerCluster, openPanicle, plumeHead, racemeHead, seedCluster, sorghumHead, spikeHead } from './cereals/heads.js'

const cameras = {
  carpet: () => ({ position: V(5.0, 1.75, 9.4), target: V(-0.4, 0.25, 1.8) }),
  low: () => ({ position: V(5.6, 2.1, 10.8), target: V(-0.4, 0.55, 2.4) }),
  mid: () => ({ position: V(5.9, 2.5, 11.2), target: V(-0.5, 0.8, 2.4) }),
  tall: () => ({ position: V(6.4, 3.0, 11.6), target: V(-0.6, 1.1, 2.4) }),
  giant: () => ({ position: V(7.2, 3.6, 12.6), target: V(-0.4, 1.7, 2.4) }),
}

// Young plants are short and narrow; height catches up by `heightBy`.
const growth = (heightBy = 0.6, widthBy = 0.4, low = 0.08) => (g) => {
  const w = lerp(0.4, 1, smooth(0, widthBy, g))
  return [w, lerp(low, 1, smooth(0, heightBy, g)), w]
}
const tint = new THREE.Color()
const paint = (stops) => (c, g, entry) => tone(ramp(c, g, stops), entry)
// Some plants in a field carry another colour form (red or cream sorghum, golden amaranth).
const paintMix = (share, main, other) => (c, g, entry) => tone(ramp(c, g, entry.hue < share ? other : main), entry)
const emerge = (from, to) => (g) => smooth(from, to, g)

function rowField(ctx, { width = 12, depth = 16, rowGap, plantGap, jitter = 0.25, skip = 0.02 }) {
  return rowSpots({ width, depth, rowGap, plantGap: plantGap / Math.sqrt(ctx.quality), random: ctx.random, jitter, skip })
}

/* ------------------------------------------------------------ grain family */
// spec: { field: {width, depth, rowGap, plantGap}, plant: tillerPlant options, head: (random, index, far) => geometry,
//         heads: number of head variants, headScale, headColor, nod, nodAngle, plantColor, wind, camera, ... }
// spec.lod = { radius, plant: overrides } gives plants further than `radius` from the camera
// lighter leaves and heads, so the near rows can be planted densely.
// spec.linked = { build(random, index, far), scale, color } adds a part that sits exactly on each head.
const lodFor = (spec, camera, makePlant, random) => (spec.lod
  ? { isFar: (x, z) => Math.hypot(x - camera.position.x, z - camera.position.z) > spec.lod.radius, variants: [0, 1, 2].map(() => makePlant(random, { ...spec.plant, ...spec.lod.plant })) }
  : null)

function grainCrop(spec) {
  return (ctx) => {
    const { random } = ctx
    const field = { width: 12, depth: 16, ...spec.field }
    const camera = spec.camera()
    const spots = rowField(ctx, field)
    const variants = [0, 1, 2].map(() => tillerPlant(random, spec.plant))
    const lod = lodFor(spec, camera, tillerPlant, random)
    const count = spec.heads || 2
    const build = (maker) => ({
      geometries: Array.from({ length: count }, (_, index) => maker(random, index, false)),
      farGeometries: lod ? Array.from({ length: count }, (_, index) => maker(random, index, true)) : null,
    })
    const heads = spec.head ? [{
      key: 'head',
      ...build(spec.head),
      scale: spec.headScale,
      color: spec.headColor,
      nod: spec.nod,
      nodAngle: spec.nodAngle,
      keep: spec.keepHead,
      spread: spec.headSpread,
      materialOptions: spec.headMaterial,
    }] : []
    if (spec.linked) heads.push({ key: 'head', linkTo: 0, ...build(spec.linked.build), scale: spec.linked.scale, color: spec.linked.color, nod: spec.nod, castShadow: false, materialOptions: spec.linked.materialOptions })
    sow(ctx, {
      variants, spots, heads, lod,
      baseY: spec.baseY ?? 0.035,
      wind: spec.wind,
      offset: spec.offset ? (x, z, r) => spec.offset(x, z, r, field) : null,
      plant: { scale: spec.grow || growth(), color: spec.plantColor },
      parts: spec.parts || [],
    })
    spec.extra?.(ctx)
    return { plot: { width: field.width, depth: field.depth, rowGap: field.rowGap }, soil: spec.soil || 'furrow', camera, ...(spec.config || {}) }
  }
}

const barley = {
  build: grainCrop({
    field: { rowGap: 0.22, plantGap: 0.32 },
    plant: { tillers: [3, 5], height: [0.78, 0.95], lean: [0.03, 0.16], spread: 0.015, stem: [0.0045, 0.003], stemRadial: 3, stemSegments: 3, leaves: 2, leafZone: [0.12, 0.42], leafLength: [0.15, 0.23], leafWidth: 0.017, leafRise: [0.7, 1.1], leafDroop: [1.0, 1.7], basal: 1, basalLength: [0.14, 0.22] },
    head: (random) => awnedEar(random, { nodes: 8, length: random.range(0.065, 0.08), awnLength: random.range(0.12, 0.15) }),
    heads: 3,
    headScale: emerge(0.44, 0.56),
    // ears stand up while green and bow over as the grain hardens
    nod: emerge(0.66, 0.86),
    nodAngle: [0.8, 1.7],
    plantColor: paint([[0, '#6fa046'], [0.45, '#5f9440'], [0.62, '#87a24a'], [0.78, '#cbb56c'], [1, '#dcc890']]),
    headColor: paint([[0.44, '#93b85a'], [0.6, '#a7b65c'], [0.74, '#d3c27a'], [0.88, '#e6d59c'], [1, '#dfcc92']]),
    wind: { strength: 0.16, flutter: 0.008, refHeight: 0.9, ground: 0 },
    camera: cameras.low,
  }),
  stages: [[0, 'Sowing'], [0.14, 'Tillering'], [0.34, 'Jointing'], [0.48, 'Heading'], [0.64, 'Grain filling'], [0.86, 'Ready to harvest']],
  showcase: 0.84,
}

const oats = {
  build: grainCrop({
    field: { rowGap: 0.25, plantGap: 0.32 },
    plant: { tillers: [3, 4], height: [0.95, 1.15], lean: [0.03, 0.14], spread: 0.015, stem: [0.005, 0.0032], stemRadial: 3, stemSegments: 3, leaves: 2, leafZone: [0.1, 0.55], leafLength: [0.2, 0.3], leafWidth: 0.021, leafRise: [0.8, 1.2], leafDroop: [1.0, 1.7], basal: 2, basalLength: [0.2, 0.3] },
    head: (random) => openPanicle(random, { length: random.range(0.19, 0.24), arch: random.range(0.15, 0.35), neck: 0.05, whorls: 3, branches: 3, branchLength: 0.09, spread: 0.75, droop: 0.6, spikelets: 2, size: [0.0055, 0.013, 0.0025], dangle: 0.9 }),
    heads: 3,
    headScale: emerge(0.46, 0.6),
    nod: emerge(0.62, 0.86),
    nodAngle: [0.15, 0.45],
    // part of the field was sown later for green fodder: front rows still green, back rows ripe
    offset: (x, z, random, field) => -0.11 * ((x / field.width) * 0.8 + (z / field.depth) * 1.2) + random.gauss() * 0.02,
    plantColor: paint([[0, '#6aa04a'], [0.5, '#5c9440'], [0.68, '#8daa52'], [0.84, '#cbb874'], [1, '#d2bd80']]),
    headColor: paint([[0.46, '#a8c47a'], [0.64, '#b6c280'], [0.8, '#ded1a0'], [1, '#d6c693']]),
    wind: { strength: 0.18, flutter: 0.012, refHeight: 1.05, ground: 0 },
    camera: cameras.low,
  }),
  stages: [[0, 'Sowing'], [0.15, 'Tillering'], [0.36, 'Green fodder cut'], [0.52, 'Panicles emerge'], [0.7, 'Grain filling'], [0.88, 'Ready to harvest']],
  showcase: 0.7,
}

const sorghum = {
  build: grainCrop({
    field: { rowGap: 0.45, plantGap: 0.18, jitter: 0.15 },
    plant: { tillers: [1, 1], mainUpright: true, height: [1.9, 2.4], lean: [0, 0.05], stem: [0.016, 0.008], stemRadial: 6, stemSegments: 6, leaves: 10, leafZone: [0.06, 0.84], leafLength: [0.62, 0.85], leafTaper: 0.35, leafWidth: 0.075, leafShape: 'strap', leafRise: [0.7, 1.05], leafDroop: [1.3, 1.9], leafSegments: 6, fold: 0.16, rib: '#ffffff' },
    head: (random) => sorghumHead(random, { length: random.range(0.19, 0.25), radius: random.range(0.038, 0.046), neck: random.range(0.12, 0.17), grains: 28 }),
    heads: 3,
    headScale: emerge(0.46, 0.58),
    nod: emerge(0.72, 0.9),
    nodAngle: [0, 0.22],
    plantColor: paint([[0, '#4f8a33'], [0.7, '#4f8a33'], [0.86, '#8e9a58'], [1, '#b2a26c']]),
    // most heads ripen red-brown; a share of plants are a cream-grained type
    headColor: paintMix(0.25,
      [[0.46, '#9fb86a'], [0.58, '#cfd2a0'], [0.68, '#e2d6a0'], [0.8, '#bb7a42'], [0.9, '#9c4c2e'], [1, '#8e452c']],
      [[0.46, '#9fb86a'], [0.58, '#cfd2a0'], [0.72, '#e8dcae'], [1, '#d4bd88']]),
    wind: { strength: 0.22, flutter: 0.018, refHeight: 2.2, ground: 0 },
    grow: growth(0.55, 0.35, 0.06),
    camera: cameras.tall,
  }),
  stages: [[0, 'Sowing'], [0.16, 'Vegetative'], [0.48, 'Heading'], [0.6, 'Flowering'], [0.74, 'Grain filling'], [0.9, 'Ready to harvest']],
  showcase: 0.84,
}

// candle sizes are fixed per variant so the anther specks can be built to match
const bajraSpikes = [{ length: 0.24, radius: 0.0135 }, { length: 0.28, radius: 0.014 }, { length: 0.21, radius: 0.0125 }]
const bajraSpike = { neck: 0.08, roundness: 0.22, taper: 0.82 }
const pearlMillet = {
  build: grainCrop({
    field: { rowGap: 0.45, plantGap: 0.2, jitter: 0.18 },
    plant: { tillers: [3, 5], mainUpright: true, height: [1.6, 2.1], lean: [0.04, 0.13], spread: 0.035, stem: [0.009, 0.005], stemRadial: 5, stemSegments: 5, leaves: 5, leafZone: [0.08, 0.76], leafLength: [0.45, 0.68], leafTaper: 0.35, leafWidth: 0.036, leafShape: 'strap', leafRise: [0.75, 1.1], leafDroop: [1.3, 2.0], leafSegments: 5, fold: 0.2, rib: '#ffffff', tillerShort: 0.82 },
    lod: { radius: 10, plant: { leafSegments: 3, stemRadial: 4, stemSegments: 3 } },
    head: (random, index, far) => spikeHead(random, { ...bajraSpikes[index], ...bajraSpike, radial: far ? 5 : 7, tubular: far ? 6 : 10, bump: 0.14 }),
    heads: 3,
    headScale: emerge(0.44, 0.56),
    plantColor: paint([[0, '#5a9440'], [0.68, '#5d9242'], [0.84, '#98a060'], [1, '#b5a56a']]),
    // warm grey-green at emergence, creamy tan in flower, then dull brown-grey; no cool greys
    headColor: paint([[0.44, '#93ad62'], [0.52, '#a8af70'], [0.57, '#cdbf8a'], [0.64, '#c4b486'], [0.74, '#a99b76'], [0.88, '#988a6c'], [1, '#8e8166']]),
    // pale yellow anthers hang out of the candles for a few days
    linked: {
      build: (random, index, far) => antherSpecks(random, { ...bajraSpikes[index], ...bajraSpike, count: far ? 7 : 20 }),
      scale: (g) => smooth(0.52, 0.56, g) * (1 - smooth(0.64, 0.71, g)),
      color: paint([[0, '#f2e494'], [1, '#f2e494']]),
      materialOptions: { roughness: 0.9, emissive: '#2a2200' },
    },
    wind: { strength: 0.22, flutter: 0.016, refHeight: 1.9, ground: 0 },
    grow: growth(0.5, 0.35, 0.06),
    camera: cameras.tall,
  }),
  stages: [[0, 'Sowing'], [0.15, 'Tillering'], [0.44, 'Spikes emerge'], [0.54, 'Flowering'], [0.68, 'Grain filling'], [0.9, 'Ready to harvest']],
  showcase: 0.74,
}

// Small millets share one dense tufted plant; only the head differs. Plants further than
// 9 m from the camera get coarser leaves and lighter heads.
const tuft = (extra) => ({ tillers: [5, 8], height: [0.65, 0.9], lean: [0.08, 0.3], spread: 0.045, bow: 0.3, stem: [0.0038, 0.0026], stemRadial: 3, stemSegments: 3, leaves: 2, leafZone: [0.12, 0.45], leafLength: [0.2, 0.3], leafWidth: 0.013, leafRise: [0.7, 1.1], leafDroop: [1.1, 1.8], leafSegments: 3, basal: 5, basalLength: [0.28, 0.42], basalRise: [0.6, 1.1], basalDroop: [1.2, 2.0], basalSegments: 3, ...extra })
const tuftLod = { radius: 9, plant: { leafSegments: 2, basalSegments: 2, stemSegments: 2, basal: 4 } }
const tuftField = { rowGap: 0.25, plantGap: 0.26, jitter: 0.35 }
// far tufts show heads on most but not all tillers; at that distance it reads the same
const farThin = (entry, mount, random, far) => !far || random() < 0.6
const milletWind = (height) => ({ strength: 0.17, flutter: 0.01, refHeight: height, ground: 0 })
const milletStages = (heading) => [[0, 'Sowing'], [0.15, 'Tillering'], [heading, 'Heading'], [heading + 0.1, 'Flowering'], [0.72, 'Grain filling'], [0.9, 'Ready to harvest']]

const fingerMillet = {
  build: grainCrop({
    field: tuftField,
    plant: tuft({ height: [0.75, 0.95], stem: [0.004, 0.003], leafLength: [0.25, 0.38], leafWidth: 0.014 }),
    lod: tuftLod,
    keepHead: farThin,
    head: (random, index, far) => racemeHead(random, { mode: 'digitate', count: far ? 4 : 4 + index, length: random.range(0.085, 0.105), radius: 0.0062, angle: 0.55, curl: 0.65, neck: 0.03, radial: far ? 3 : 4, tubular: far ? 2 : 5, beads: 0.3, bump: 0.1 }),
    heads: 3,
    headScale: emerge(0.48, 0.6),
    plantColor: paint([[0, '#5f9a44'], [0.7, '#5b9242'], [0.86, '#8f9a58'], [1, '#a39a62']]),
    headColor: paint([[0.48, '#7fa84f'], [0.62, '#8a9c50'], [0.76, '#8b6c3e'], [0.9, '#6f4b2c'], [1, '#65442a']]),
    wind: milletWind(0.9),
    camera: cameras.low,
  }),
  stages: [[0, 'Sowing'], [0.15, 'Tillering'], [0.48, 'Ear emergence'], [0.6, 'Flowering'], [0.72, 'Grain filling'], [0.9, 'Ready to harvest']],
  showcase: 0.84,
}

const foxtailMillet = {
  build: grainCrop({
    field: tuftField,
    plant: tuft({ tillers: [4, 6], height: [0.85, 1.05], lean: [0.05, 0.2], spread: 0.03, stem: [0.0045, 0.003], leaves: 3, leafZone: [0.12, 0.6], leafLength: [0.24, 0.34], leafWidth: 0.02, basal: 3 }),
    lod: tuftLod,
    keepHead: farThin,
    head: (random, index, far) => spikeHead(random, { length: random.range(0.15, 0.2), radius: random.range(0.0115, 0.0135), arch: random.range(0.65, 0.85), neck: 0.06, radial: far ? 5 : 8, tubular: far ? 6 : 10, star: 0.35, bump: 0.15, roundness: 0.3, taper: 0.55, neckRadius: 0.0022 }),
    heads: 3,
    headScale: emerge(0.44, 0.58),
    nod: emerge(0.6, 0.86),
    nodAngle: [0.2, 0.6],
    plantColor: paint([[0, '#64a046'], [0.66, '#5f9843'], [0.84, '#aaa45e'], [1, '#c2ae6c']]),
    headColor: paint([[0.44, '#8db45a'], [0.6, '#a0b25e'], [0.76, '#c8b469'], [0.9, '#d4b46e'], [1, '#c9a664']]),
    wind: milletWind(1.0),
    camera: cameras.low,
  }),
  stages: milletStages(0.44),
  showcase: 0.8,
}

const kodoMillet = {
  build: grainCrop({
    field: tuftField,
    plant: tuft({ height: [0.6, 0.85] }),
    lod: tuftLod,
    keepHead: farThin,
    head: (random, index, far) => racemeHead(random, { mode: 'along', count: far ? 2 + (index % 2) : 2 + index, length: random.range(0.05, 0.065), radius: 0.0043, angle: 0.3, curl: 0.1, neck: 0.05, axis: 0.035 + index * 0.014, radial: far ? 3 : 4, tubular: far ? 2 : 5, beads: 0.35, bump: 0.1 }),
    heads: 3,
    headScale: emerge(0.46, 0.58),
    plantColor: paint([[0, '#5a9442'], [0.68, '#58903f'], [0.86, '#968f56'], [1, '#a89a5c']]),
    headColor: paint([[0.46, '#86a856'], [0.62, '#93a058'], [0.78, '#8e7446'], [1, '#7a5c38']]),
    wind: milletWind(0.8),
    camera: cameras.low,
  }),
  stages: milletStages(0.46),
  showcase: 0.8,
}

const littleMillet = {
  build: grainCrop({
    field: tuftField,
    plant: tuft({ height: [0.65, 0.95] }),
    lod: tuftLod,
    keepHead: farThin,
    head: (random, index, far) => openPanicle(random, { length: random.range(0.17, 0.21), arch: random.range(0.08, 0.22), neck: 0.04, whorls: far ? 3 : 4, branches: far ? 2 : 3, branchLength: 0.07, spread: 0.55, droop: 0.25, spikelets: far ? 1 : 2, along: true, tiny: true, size: [0.0038, 0.004, 0.002], dangle: 0.2, branchRadius: 0.0009 }),
    heads: 3,
    headScale: emerge(0.42, 0.56),
    nod: emerge(0.62, 0.86),
    nodAngle: [0.1, 0.35],
    plantColor: paint([[0, '#62a046'], [0.66, '#5c9842'], [0.84, '#a6a262'], [1, '#b8a868']]),
    headColor: paint([[0.42, '#94b65e'], [0.6, '#a6b462'], [0.78, '#c6b272'], [1, '#c4a96c']]),
    wind: milletWind(0.85),
    camera: cameras.low,
  }),
  stages: milletStages(0.42),
  showcase: 0.78,
}

const barnyardMillet = {
  build: grainCrop({
    field: tuftField,
    plant: tuft({ tillers: [5, 8], height: [0.8, 1.0], lean: [0.05, 0.22], leaves: 3, leafZone: [0.1, 0.55], leafLength: [0.24, 0.34], leafWidth: 0.017, basal: 4 }),
    lod: tuftLod,
    keepHead: farThin,
    head: (random, index, far) => racemeHead(random, { mode: 'along', count: far ? 4 : 6, length: random.range(0.03, 0.042), radius: 0.0056, angle: 0.35, curl: 0.1, neck: 0.04, axis: random.range(0.1, 0.13), spiral: true, radial: far ? 3 : 4, tubular: far ? 2 : 4, beads: 0.3, bump: 0.2 }),
    heads: 3,
    headScale: emerge(0.4, 0.54),
    nod: emerge(0.6, 0.86),
    nodAngle: [0.1, 0.35],
    plantColor: paint([[0, '#5c9a44'], [0.66, '#5a9442'], [0.84, '#9a9a5c'], [1, '#a8a060']]),
    // compact purplish-green heads
    headColor: paint([[0.4, '#7d9a52'], [0.54, '#706f52'], [0.66, '#6c5560'], [0.82, '#7e6458'], [1, '#9a805c']]),
    wind: milletWind(0.95),
    camera: cameras.low,
  }),
  stages: milletStages(0.4),
  showcase: 0.68,
}

const prosoMillet = {
  build: grainCrop({
    field: tuftField,
    plant: tuft({ tillers: [4, 6], height: [0.65, 0.95], lean: [0.05, 0.24], leaves: 3, leafZone: [0.1, 0.55], leafLength: [0.22, 0.32], leafWidth: 0.017, basal: 4 }),
    lod: tuftLod,
    keepHead: farThin,
    head: (random, index, far) => openPanicle(random, { length: random.range(0.2, 0.25), arch: random.range(0.6, 0.8), neck: 0.04, whorls: far ? 3 : 4, branches: far ? 2 : 3, branchLength: 0.095, spread: 0.45, droop: 0.55, spikelets: far ? 1 : 2, along: true, tiny: true, size: [0.004, 0.0038, 0.0026], dangle: 0.5, oneSided: 0.8 }),
    heads: 3,
    headScale: emerge(0.42, 0.56),
    nod: emerge(0.6, 0.85),
    nodAngle: [0.2, 0.5],
    plantColor: paint([[0, '#62a046'], [0.64, '#5e9a44'], [0.82, '#b0a864'], [1, '#c4b070']]),
    headColor: paint([[0.42, '#8fb35a'], [0.6, '#a8b45c'], [0.76, '#d4b452'], [0.9, '#dcaf4c'], [1, '#d2a448']]),
    wind: milletWind(0.85),
    camera: cameras.low,
  }),
  stages: milletStages(0.42),
  showcase: 0.84,
}

const blackRice = {
  build: grainCrop({
    field: { rowGap: 0.38, plantGap: 0.33, jitter: 0.12, skip: 0.01 },
    baseY: -0.02,
    soil: 'paddy',
    plant: { tillers: [3, 5], height: [0.95, 1.15], lean: [0.06, 0.22], spread: 0.02, stem: [0.0042, 0.0028], stemRadial: 4, stemSegments: 3, leaves: 1, leafZone: [0.72, 0.72], leafLength: [0.26, 0.36], leafWidth: 0.014, leafRise: [1.0, 1.35], leafDroop: [0.7, 1.2], basal: 8, basalLength: [0.5, 0.78], basalWidth: 0.013, basalRise: [1.05, 1.45], basalDroop: [0.7, 1.5], basalSegments: 6, leafBase: '#acacac', leafTip: '#f2def0' },
    head: (random) => openPanicle(random, { length: random.range(0.2, 0.25), arch: random.range(0.75, 0.95), neck: 0.06, whorls: 4, branches: 2, branchLength: 0.08, spread: 0.25, droop: 0.4, spikelets: 4, along: true, size: [0.0036, 0.008, 0.0028], dangle: 0.3, oneSided: 0.9 }),
    heads: 3,
    headScale: emerge(0.42, 0.56),
    nod: emerge(0.6, 0.85),
    nodAngle: [0.25, 0.6],
    // leaves carry a purple cast; panicles go from purple to near black
    plantColor: paint([[0, '#6c8a4c'], [0.3, '#4f6a3c'], [0.55, '#565c3e'], [0.72, '#665c42'], [0.86, '#8c7a50'], [1, '#988256']]),
    headColor: paint([[0.42, '#6a5a64'], [0.52, '#4e3652'], [0.66, '#3a2238'], [0.82, '#2c1a28'], [1, '#33242a']]),
    wind: { strength: 0.13, flutter: 0.01, refHeight: 1.0, ground: 0 },
    grow: growth(0.5, 0.35, 0.28),
    extra: (ctx) => ctx.egrets([V(-1.6, 0.03, 4.4), V(1.4, 0.03, 1.0), V(-3.3, 0.03, -2.6), V(3.6, 0.03, 5.2)], { appear: (g) => g < 0.76 }),
    camera: () => ({ position: V(5.4, 2.0, 10.6), target: V(-0.4, 0.45, 2.4) }),
  }),
  stages: [[0, 'Transplanting'], [0.16, 'Tillering'], [0.42, 'Panicles emerge'], [0.56, 'Flowering'], [0.7, 'Ripening, field drained'], [0.88, 'Ready to harvest']],
  showcase: 0.66,
}

const napier = {
  build: grainCrop({
    field: { rowGap: 0.9, plantGap: 0.7, jitter: 0.12, skip: 0.03 },
    plant: {
      tillers: [10, 15], height: [2.1, 2.7], lean: [0.05, 0.32], spread: 0.16, bow: 0.4, stem: [0.012, 0.007], stemRadial: 5, stemSegments: 6,
      leaves: 7, leafZone: [0.3, 0.97], leafLength: [0.8, 1.15], leafTaper: 0.25, leafWidth: 0.036, leafRise: [0.9, 1.3], leafDroop: [1.6, 2.3], leafSegments: 7, rib: '#ffffff',
      basal: 4, basalLength: [0.7, 1.0], basalWidth: 0.03, dryLeaves: 3, tillerShort: 0.8,
      canes: { radius: [0.016, 0.01], colorFn: (c, x, y) => c.setScalar(lerp(0.72, 1, Math.min(1, y / 2.5))) },
    },
    // a few tillers send up bristly golden-brown plumes if the clump is not cut
    head: (random) => spikeHead(random, { length: random.range(0.17, 0.23), radius: 0.008, arch: random.range(0.2, 0.45), neck: 0.16, radial: 6, tubular: 9, star: 0.5, bump: 0.18, roundness: 0.3, taper: 0.5, neckRadius: 0.003 }),
    heads: 2,
    keepHead: (entry, mount, random) => random() < 0.3,
    headScale: emerge(0.8, 0.92),
    plantColor: paint([[0, '#5d9a3c'], [0.5, '#4c8832'], [0.85, '#58893a'], [1, '#6a8c40']]),
    headColor: paint([[0.8, '#b8b070'], [0.9, '#c9a65e'], [1, '#b89058']]),
    parts: [
      // leaf sheaths hide the canes until the lower leaves dry and fall
      { key: 'canes', color: paint([[0, '#5d9a3c'], [0.6, '#5a9038'], [0.85, '#8e9a52'], [1, '#a4a05a']]) },
      { key: 'dry', scale: emerge(0.6, 0.85), color: paint([[0.6, '#9aa060'], [0.8, '#b5a274'], [1, '#bfa97c']]) },
    ],
    grow: (g) => {
      const w = lerp(0.55, 1, smooth(0, 0.35, g))
      return [w, lerp(0.1, 1, smooth(0, 0.68, g)), w]
    },
    wind: { strength: 0.3, flutter: 0.02, refHeight: 2.8, ground: 0 },
    config: { scarecrow: false },
    camera: cameras.giant,
  }),
  stages: [[0, 'Cut back', 'Day 0'], [0.2, 'New tillers', 'Day 12'], [0.45, 'Leafy growth', 'Day 30'], [0.66, 'Ready to cut', 'Day 45'], [0.86, 'Canes and plumes', 'Day 70']],
  showcase: 0.66,
}

/* ------------------------------------------------------------ herb family */
function herbCrop(spec) {
  return (ctx) => {
    const { random } = ctx
    const field = { width: 12, depth: 16, ...spec.field }
    const camera = spec.camera()
    const spots = rowField(ctx, field)
    const variants = [0, 1, 2].map(() => herbPlant(random, spec.plant))
    const lod = lodFor(spec, camera, herbPlant, random)
    const allowed = (list, mount) => !list || list.includes(mount.kind || 'main')
    const heads = spec.heads.map((head) => ({
      key: 'head',
      geometries: Array.from({ length: head.variants || 2 }, (_, index) => head.build(random, index, false)),
      farGeometries: lod ? Array.from({ length: head.variants || 2 }, (_, index) => head.build(random, index, true)) : null,
      keep: (entry, mount, r, far) => allowed(head.kinds, mount) && (!far || allowed(head.farKinds, mount)),
      spread: 0.015,
      scale: head.scale,
      color: head.color,
      nod: head.nod,
      nodAngle: head.nodAngle,
      materialOptions: head.materialOptions,
    }))
    sow(ctx, {
      variants, spots, heads, lod,
      wind: spec.wind,
      plant: { scale: spec.grow, color: spec.leafColor },
      parts: [{ key: 'stems', color: spec.stemColor }],
    })
    return { plot: { width: field.width, depth: field.depth, rowGap: field.rowGap }, soil: 'furrow', camera }
  }
}

const buckwheat = {
  build: herbCrop({
    // broadcast thickly: a full leafy stand that flowers into a pink-white carpet
    field: { width: 10, depth: 14, rowGap: 0.25, plantGap: 0.19, jitter: 0.5 },
    plant: {
      height: [0.6, 0.9], lean: 0.1, stem: [0.0045, 0.0025], petiole: 0.045, petioleRadius: 0.0012,
      leaves: 8, leafZone: [0.06, 0.85], leafTop: 0.5, leafLength: 0.095, leafWidth: 0.085, profile: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.24 + t * 0.76)), 0.75), lobe: 0.18,
      leafRise: [0.25, 0.7], leafDroop: [0.4, 0.9], leafSegments: 4,
      branches: 3, branchZone: [0.3, 0.62], branchLength: 0.24, branchAngle: 0.65, branchLeaves: 2, branchLeafSize: 0.65, sideScale: 0.85,
      axilHeads: 0.45, axilScale: 0.65,
    },
    lod: { radius: 7, plant: { leafSegments: 2, stemRadial: 3 } },
    heads: [
      // pink-white flower clusters, then dark three-cornered seeds
      {
        farKinds: ['main', 'side'],
        build: (random, index, far) => flowerCluster(random, far ? { florets: 8, radius: 0.03, size: 0.0065, stalks: 1, stalkLength: 0.02 } : { florets: 11, radius: 0.032, size: 0.006, stalks: 3, stalkLength: 0.026 }),
        scale: (g) => smooth(0.26, 0.36, g) * (1 - smooth(0.74, 0.88, g)),
        color: (c, g, entry) => tone(c.set('#f7f3f0').lerp(tint.set('#eeaabd'), entry.pick * 0.8), entry),
        materialOptions: { roughness: 0.85, emissive: '#2a1c20' },
      },
      {
        kinds: ['main', 'side'], farKinds: ['main'],
        build: (random, index, far) => seedCluster(random, { seeds: far ? 5 : 8, radius: 0.017, size: 0.0045, stalkLength: 0.026 }),
        scale: emerge(0.5, 0.68),
        color: paint([[0.5, '#93a456'], [0.66, '#7a6a42'], [0.8, '#4a3628'], [1, '#2c211b']]),
      },
    ],
    grow: growth(0.5, 0.35, 0.1),
    leafColor: paint([[0, '#5d9c46'], [0.6, '#5a9442'], [0.82, '#7f8c46'], [1, '#8c8048']]),
    stemColor: paint([[0, '#a0604a'], [0.3, '#b8483a'], [0.8, '#a83c30'], [1, '#86402e']]),
    wind: { strength: 0.16, flutter: 0.014, refHeight: 0.8, ground: 0 },
    camera: () => ({ position: V(5.0, 2.0, 9.8), target: V(-0.3, 0.5, 2.0) }),
  }),
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.3, 'Flowering'], [0.56, 'Seed setting'], [0.86, 'Ready to harvest']],
  showcase: 0.5,
}

const amaranthGrain = {
  build: herbCrop({
    field: { rowGap: 0.45, plantGap: 0.32, jitter: 0.2 },
    plant: {
      height: [1.3, 1.7], lean: 0.05, stem: [0.013, 0.006], stemRadial: 6, petiole: 0.07, petioleRadius: 0.0022,
      leaves: 12, leafZone: [0.06, 0.82], leafTop: 0.45, leafLength: 0.15, leafWidth: 0.085, profile: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.7),
      leafRise: [0.25, 0.75], leafDroop: [0.6, 1.1], leafSegments: 5,
      branches: 3, branchZone: [0.62, 0.8], branchLength: 0.18, branchAngle: 0.7, branchLeaves: 1, sideScale: 1,
    },
    heads: [
      { kinds: ['main'], variants: 3, build: (random, index) => plumeHead(random, { length: [0.42, 0.48, 0.36][index], radius: 0.036, arch: [0.55, 0.7, 0.4][index], branches: 5, branchLength: 0.14 }), scale: emerge(0.42, 0.62), nod: emerge(0.7, 0.9), nodAngle: [0.05, 0.35] },
      { kinds: ['side'], build: (random) => plumeHead(random, { length: 0.15, radius: 0.022, arch: 0.4, branches: 0, radial: 5, tubular: 7 }), scale: emerge(0.48, 0.66) },
    ].map((head) => ({ ...head, color: paintMix(0.25, [[0.42, '#7a9a4a'], [0.54, '#a33a4a'], [0.72, '#9c1f3c'], [0.88, '#7e2234'], [1, '#6e2a2e']], [[0.42, '#8aa64a'], [0.54, '#c8b24a'], [0.72, '#daa53a'], [1, '#b8863a']]) })),
    grow: growth(0.55, 0.35, 0.08),
    leafColor: paintMix(0.25, [[0, '#5d8a3e'], [0.4, '#5a7a3c'], [0.8, '#6a6a3a'], [1, '#8a7a48']], [[0, '#5d9a40'], [0.7, '#5a9440'], [0.86, '#8a9a48'], [1, '#a69a52']]),
    stemColor: paintMix(0.25, [[0, '#8a6a4a'], [0.4, '#a0443e'], [1, '#7e3a32']], [[0, '#8aa050'], [0.8, '#9aa252'], [1, '#b8a462']]),
    wind: { strength: 0.2, flutter: 0.014, refHeight: 1.7, ground: 0 },
    camera: cameras.tall,
  }),
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.44, 'Plumes emerge'], [0.6, 'Flowering'], [0.76, 'Seed filling'], [0.92, 'Ready to harvest']],
  showcase: 0.76,
}

// one variety per field: deep red-orange heads, with about one plant in ten a near shade
const quinoaRipe = (hue) => (hue < 0.05 ? '#bf9a52' : hue < 0.1 ? '#c9b48e' : '#a04a30')
const quinoa = {
  build: herbCrop({
    field: { rowGap: 0.45, plantGap: 0.3, jitter: 0.2 },
    plant: {
      height: [1.0, 1.4], lean: 0.06, stem: [0.01, 0.005], petiole: 0.045, petioleRadius: 0.0016,
      leaves: 12, leafZone: [0.06, 0.82], leafTop: 0.5, leafLength: 0.085, leafWidth: 0.078, profile: (t) => (t < 0.3 ? 0.62 + (t / 0.3) * 0.38 : Math.pow(1 - (t - 0.3) / 0.7, 0.85)), lobe: 0.05,
      leafRise: [0.3, 0.8], leafDroop: [0.4, 0.9], leafSegments: 4,
      branches: 4, branchZone: [0.45, 0.75], branchLength: 0.2, branchAngle: 0.55, branchLeaves: 2, branchLeafSize: 0.6, sideScale: 1,
    },
    heads: [
      { kinds: ['main'], variants: 3, build: (random, index) => plumeHead(random, { length: [0.3, 0.34, 0.26][index], radius: 0.05, arch: 0.08 + index * 0.05, branches: 6, branchLength: 0.08, branchAngle: 0.6, bump: 0.42, beads: 0.15, fullness: 0.4, radial: 7, tubular: 10 }), scale: emerge(0.4, 0.62) },
      { kinds: ['side'], build: (random) => plumeHead(random, { length: 0.12, radius: 0.03, arch: 0.1, branches: 0, radial: 5, tubular: 6, bump: 0.42, fullness: 0.4 }), scale: emerge(0.46, 0.66) },
    ].map((head) => ({
      ...head,
      color: (c, g, entry) => {
        c.set('#86a65a').lerp(tint.set(quinoaRipe(entry.hue)), smooth(0.52, 0.72, g)).multiplyScalar(lerp(1, 0.84, smooth(0.86, 1, g)))
        return tone(c, entry)
      },
    })),
    grow: growth(0.55, 0.35, 0.08),
    leafColor: paint([[0, '#62a04c'], [0.6, '#5c9646'], [0.8, '#8a9a4c'], [1, '#a89a52']]),
    stemColor: paint([[0, '#7aa050'], [0.6, '#8a9a50'], [1, '#b0965a']]),
    wind: { strength: 0.2, flutter: 0.014, refHeight: 1.25, ground: 0 },
    camera: cameras.mid,
  }),
  stages: [[0, 'Sowing'], [0.15, 'Vegetative'], [0.42, 'Panicle forming'], [0.56, 'Flowering'], [0.7, 'Grain filling'], [0.9, 'Ready to harvest']],
  showcase: 0.8,
}

/* ------------------------------------------------------------ clover family */
function cloverCrop(spec) {
  return (ctx) => {
    const { random } = ctx
    const field = { width: 10, depth: 14, ...spec.field }
    const camera = cameras.carpet()
    const spots = rowField(ctx, field)
    const variants = [0, 1, 2].map(() => cloverPlant(random, spec.plant))
    const lod = lodFor(spec, camera, cloverPlant, random)
    sow(ctx, {
      variants, spots, lod,
      wind: spec.wind,
      size: [0.85, 1.15],
      tilt: 0.08,
      // the sickle works across the field from one side, so cuts sweep over the plot
      decorate: (entry, spot) => { entry.sweep = (spot[0] + field.width / 2) / field.width },
      plant: { scale: spec.grow, color: spec.leafColor },
      heads: [{ key: 'head', geometries: [spec.head(random, false), spec.head(random, false)], farGeometries: lod ? [spec.head(random, true)] : null, keep: (entry, mount, r, far) => r() < (far ? spec.farHeadShare ?? spec.headShare : spec.headShare), scale: spec.headScale, color: spec.headColor, spread: 0.03, materialOptions: spec.headMaterial }],
    })
    return { plot: { width: field.width, depth: field.depth, rowGap: field.rowGap }, soil: 'furrow', camera }
  }
}

// Height after a run of cuts: grows to full, is cut to stubble, regrows.
function cutCycles(cuts, firstGrowth, regrowth) {
  return (g, entry) => {
    let last = -1
    for (const cut of cuts) if (g >= cut + (entry.sweep || 0) * 0.025) last = cut + (entry.sweep || 0) * 0.025
    const h = last < 0 ? lerp(0.06, 1, smooth(0.01, firstGrowth, g)) : lerp(0.14, 1, smooth(last, last + regrowth, g))
    const w = last < 0 ? lerp(0.35, 1, smooth(0, firstGrowth * 0.8, g)) : lerp(0.7, 1, smooth(last, last + regrowth * 0.7, g))
    return [w, h, w]
  }
}

const berseemCuts = [0.34, 0.55]
const berseem = {
  build: cloverCrop({
    field: { rowGap: 0.3, plantGap: 0.3, jitter: 0.6, skip: 0.01 },
    plant: { stems: [6, 9], height: [0.38, 0.55], lean: [0.15, 0.5], spread: 0.06, stem: 0.0024, leaves: 5, petiole: 0.025, leaflet: [0.044, 0.017] },
    head: (random) => cloverHead(random, { kind: 'ball', radius: 0.012, stalkLength: random.range(0.03, 0.05) }),
    headShare: 0.45,
    headScale: emerge(0.74, 0.82),
    headColor: paint([[0.74, '#e8ecd0'], [0.8, '#f8f6ec'], [0.9, '#efe8d4'], [1, '#bba47e']]),
    grow: cutCycles(berseemCuts, 0.3, 0.16),
    leafColor: paint([[0, '#5fa846'], [0.3, '#4f9a3a'], [0.8, '#4f9638'], [0.92, '#6a9440'], [1, '#86904a']]),
    wind: { strength: 0.12, flutter: 0.012, refHeight: 0.5, ground: 0 },
  }),
  stages: [[0, 'Sowing'], [0.2, 'Leafy growth'], [0.34, 'First cut'], [0.55, 'Second cut'], [0.74, 'Flowering'], [0.9, 'Seed ripening']],
  showcase: 0.8,
}

const lucerne = {
  build: cloverCrop({
    // drilled in close rows; a full, leafy stand
    field: { rowGap: 0.25, plantGap: 0.2, jitter: 0.35, skip: 0.01 },
    plant: { stems: [7, 10], height: [0.5, 0.7], lean: [0.08, 0.38], spread: 0.05, stem: 0.0022, leaves: 7, petiole: 0.016, leaflet: [0.034, 0.016], shoulders: [0.4, 0.8, 0.8, 1.0] },
    lod: { radius: 7, plant: { stems: [4, 6], leaves: 5, stemSegments: 2 } },
    head: (random, far) => cloverHead(random, { kind: 'raceme', radius: 0.013, florets: far ? 6 : 11, stalkLength: random.range(0.02, 0.035) }),
    headShare: 0.6,
    farHeadShare: 0.4,
    headScale: emerge(0.52, 0.66),
    headColor: (c, g, entry) => tone(ramp(c, g, [[0.52, '#8aa86a'], [0.6, '#8a6ab8'], [0.7, '#7a4fae'], [0.9, '#6e4a9e'], [1, '#7a5a8a']]).lerp(tint.set('#9a7ad0'), entry.pick * 0.35), entry),
    headMaterial: { roughness: 0.85, emissive: '#140a22' },
    grow: (g) => {
      const w = lerp(0.65, 1, smooth(0, 0.35, g))
      return [w, lerp(0.14, 1, smooth(0, 0.55, g)), w]
    },
    leafColor: paint([[0, '#5f9e4c'], [0.4, '#4e8f40'], [0.85, '#4f8c40'], [1, '#62883e']]),
    wind: { strength: 0.13, flutter: 0.012, refHeight: 0.7, ground: 0 },
  }),
  stages: [[0, 'Just cut', 'Day 0'], [0.2, 'Regrowth', 'Day 7'], [0.45, 'Bud stage', 'Day 18'], [0.6, 'Flowering, cut now', 'Day 25'], [0.84, 'Full bloom', 'Day 35']],
  showcase: 0.72,
}

export const models = {
  barley,
  oats,
  sorghum,
  'pearl-millet': pearlMillet,
  'finger-millet': fingerMillet,
  'foxtail-millet': foxtailMillet,
  'kodo-millet': kodoMillet,
  'little-millet': littleMillet,
  'barnyard-millet': barnyardMillet,
  'proso-millet': prosoMillet,
  buckwheat,
  'amaranth-grain': amaranthGrain,
  'black-rice': blackRice,
  quinoa,
  berseem,
  lucerne,
  napier,
}
