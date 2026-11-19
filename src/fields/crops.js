import * as THREE from 'three'
import { applyWind, blade, ellipsoid, GrowingPart, item, lerp, merge, orient, plantMaterial, prep, smooth, transform, tube, windDepthMaterial } from './geometry.js'

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)
const tmpB = new THREE.Color()

function ramp(target, g, stops) {
  if (g <= stops[0][0]) return target.set(stops[0][1])
  for (let index = 1; index < stops.length; index += 1) {
    if (g <= stops[index][0]) {
      const t = (g - stops[index - 1][0]) / (stops[index][0] - stops[index - 1][0])
      return target.set(stops[index - 1][1]).lerp(tmpB.set(stops[index][1]), t)
    }
  }
  return target.set(stops[stops.length - 1][1])
}

const tone = (target, item) => target.multiplyScalar(1 + item.tone)

// Grey-scale shading: vertex colours carry light and dark, instance colours carry the hue.
const shade = (low, high) => (color, x, y) => color.setScalar(lerp(low, high, Math.min(1, Math.max(0, y))))

function rowSpots({ width, depth, rowGap, plantGap, random, jitter = 0.25, skip = 0.02 }) {
  const spots = []
  const rowCount = Math.floor(width / rowGap)
  for (let row = 0; row < rowCount; row += 1) {
    const x = -width / 2 + rowGap * (row + 0.5)
    for (let z = -depth / 2 + plantGap * 0.5; z < depth / 2; z += plantGap) {
      if (random() < skip) continue
      spots.push([x + random.gauss() * rowGap * jitter * 0.35, z + random.gauss() * plantGap * jitter])
    }
  }
  return spots
}

function windMaterials(ctx, options, materialOptions = {}) {
  const material = applyWind(plantMaterial(materialOptions), ctx.wind, options)
  const depth = windDepthMaterial(ctx.wind, options)
  ctx.disposables.push(material, depth)
  return { material, depth }
}

// Places plant variants on spots and wires up any attached parts (ears, cobs, flowers).
function assembleField(ctx, { variants, spots, baseY = 0, plant, attachments = [], wind, materialOptions }) {
  const { random } = ctx
  const plantMats = windMaterials(ctx, wind, materialOptions)
  const attachMats = attachments.map((attachment) => windMaterials(ctx, wind, attachment.materialOptions || materialOptions))
  variants.forEach((variant, variantIndex) => {
    const items = []
    spots.forEach((spot, index) => {
      if (index % variants.length !== variantIndex) return
      const entry = item(V(spot[0], baseY, spot[1]), random() * Math.PI * 2, random.range(0.86, 1.12), random.gauss() * 0.035, [random.gauss() * 0.05, random.gauss() * 0.05])
      entry.tone = random.gauss() * 0.07
      items.push(entry)
    })
    const plantPart = new GrowingPart({ geometry: variant.plant, material: plantMats.material, depthMaterial: plantMats.depth, items, scale: plant.scale, color: plant.color })
    ctx.addPart(plantPart)
    attachments.forEach((attachment, attachmentIndex) => {
      const geometry = variant[attachment.key]
      if (!geometry) return
      ctx.addPart(new GrowingPart({ geometry, material: attachMats[attachmentIndex].material, depthMaterial: attachMats[attachmentIndex].depth, items, parent: plant.scale, pivot: variant.pivots?.[attachment.key] || V(0, 1, 0), scale: attachment.scale, color: attachment.color, castShadow: attachment.castShadow !== false }))
    })
  })
}

/* ---------------------------------------------------------------- wheat */
function wheatEar(random, length = 0.085) {
  const parts = []
  const spikelets = 9
  for (let index = 0; index < spikelets; index += 1) {
    const y = (index / (spikelets - 1)) * length
    const side = index % 2 ? 1 : -1
    const taper = 1 - (index / spikelets) * 0.35
    parts.push(transform(ellipsoid(0.0062 * taper, 0.0105, 0.0052, { detail: 0, colorFn: (c) => c.setScalar(random.range(0.86, 1)) }), { position: [side * 0.0042, y, 0], rotation: [0, 0, side * 0.32] }))
    if (index > 0) {
      const awn = prep(new THREE.CylinderGeometry(0.0004, 0.0011, 0.06, 3, 1, true), '#e8e2c8')
      awn.translate(0, 0.03, 0)
      parts.push(transform(awn, { position: [side * 0.006, y + 0.004, 0], rotation: [random.gauss() * 0.1, 0, -side * 0.28] }))
    }
  }
  return merge(parts)
}

function wheatVariant(random) {
  const plant = []
  const ears = []
  const tillers = 4 + (random() < 0.45 ? 1 : 0)
  const pivot = V()
  for (let index = 0; index < tillers; index += 1) {
    const azimuth = random() * Math.PI * 2
    const lean = random.range(0.03, 0.17)
    const height = random.range(0.8, 0.98)
    const direction = V(Math.sin(lean) * Math.cos(azimuth), Math.cos(lean), Math.sin(lean) * Math.sin(azimuth))
    const top = direction.clone().multiplyScalar(height)
    pivot.add(top)
    plant.push(tube([V(), direction.clone().multiplyScalar(height * 0.5).add(V(random.gauss() * 0.02, 0, random.gauss() * 0.02)), top], 0.0055, 0.0036, { radial: 4, tubular: 4, colorFn: shade(0.72, 1) }))
    for (let leaf = 0; leaf < 2; leaf += 1) {
      const geometry = blade({ length: random.range(0.2, 0.3), width: 0.017, rise: random.range(0.75, 1.15), droop: random.range(0.9, 1.6), segments: 4, fold: 0.3, base: '#b9b9b9', tip: '#f2f2f2' })
      const y = height * (0.1 + leaf * 0.2)
      transform(geometry, { rotation: [0, azimuth + leaf * 2.4 + random.gauss() * 0.4, 0] })
      geometry.translate(direction.x * y, direction.y * y, direction.z * y)
      plant.push(geometry)
    }
    ears.push(orient(transform(wheatEar(random), { scale: 1.25 }), top.clone(), direction))
  }
  pivot.divideScalar(tillers)
  return { plant: merge(plant), ears: merge(ears), pivots: { ears: pivot } }
}

function buildWheat(ctx) {
  const { random, quality } = ctx
  const spots = rowSpots({ width: 12, depth: 16, rowGap: 0.24, plantGap: 0.24 / Math.sqrt(quality), random })
  const variants = [0, 1, 2].map(() => wheatVariant(random))
  assembleField(ctx, {
    variants,
    spots,
    baseY: 0.035,
    wind: { strength: 0.16, flutter: 0.008, refHeight: 0.95, ground: 0 },
    plant: {
      scale: (g) => [lerp(0.4, 1, smooth(0, 0.4, g)), lerp(0.08, 1, smooth(0, 0.6, g)), lerp(0.4, 1, smooth(0, 0.4, g))],
      color: (c, g, item) => tone(ramp(c, g, [[0, '#6fa046'], [0.45, '#5d9038'], [0.66, '#86a044'], [0.82, '#c4a656'], [1, '#caa65e']]), item),
    },
    attachments: [{
      key: 'ears',
      scale: (g) => smooth(0.44, 0.58, g),
      color: (c, g, item) => tone(ramp(c, g, [[0.4, '#8db354'], [0.64, '#a3ad55'], [0.8, '#d9b766'], [1, '#c99d55']]), item),
    }],
  })
  return { plot: { width: 12, depth: 16, rowGap: 0.3 }, soil: 'furrow', camera: { position: V(5.6, 2.1, 10.8), target: V(-0.4, 0.55, 2.4) } }
}

/* ---------------------------------------------------------------- paddy */
function paddyVariant(random) {
  const plant = []
  const panicles = []
  const pivot = V()
  const stems = 5
  for (let index = 0; index < 11; index += 1) {
    const geometry = blade({ length: random.range(0.5, 0.78), width: 0.013, rise: random.range(1.05, 1.45), droop: random.range(0.7, 1.5), segments: 6, fold: 0.25, base: '#bdbdbd', tip: '#f4f4f4' })
    transform(geometry, { rotation: [0, random() * Math.PI * 2, 0] })
    plant.push(geometry)
  }
  for (let index = 0; index < stems; index += 1) {
    const azimuth = (index / stems) * Math.PI * 2 + random.gauss() * 0.4
    const lean = random.range(0.06, 0.22)
    const height = random.range(0.78, 0.95)
    const direction = V(Math.sin(lean) * Math.cos(azimuth), Math.cos(lean), Math.sin(lean) * Math.sin(azimuth))
    const top = direction.clone().multiplyScalar(height)
    pivot.add(top)
    plant.push(tube([V(), direction.clone().multiplyScalar(height * 0.55), top], 0.0042, 0.0028, { radial: 4, tubular: 3, colorFn: shade(0.75, 1) }))
    // drooping panicle
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const rachis = [top, top.clone().addScaledVector(out, 0.07).add(V(0, 0.07, 0)), top.clone().addScaledVector(out, 0.16).add(V(0, 0.02, 0)), top.clone().addScaledVector(out, 0.21).add(V(0, -0.12, 0))]
    panicles.push(tube(rachis, 0.0022, 0.0012, { radial: 3, tubular: 5, color: '#dddddd' }))
    const curve = new THREE.CatmullRomCurve3(rachis)
    for (let branch = 0; branch < 5; branch += 1) {
      const t = 0.3 + branch * 0.14
      const start = curve.getPointAt(t)
      const side = V(-out.z, 0, out.x).multiplyScalar((branch % 2 ? 1 : -1) * 0.025)
      const end = start.clone().add(side).add(V(0, -0.07, 0)).addScaledVector(out, 0.02)
      for (let grain = 0; grain < 5; grain += 1) {
        const p = start.clone().lerp(end, 0.2 + grain * 0.2)
        const g = transform(ellipsoid(0.0034, 0.0078, 0.0026, { detail: 0, colorFn: (c) => c.setScalar(random.range(0.85, 1)) }), { rotation: [random.gauss() * 0.4, random() * 3, random.gauss() * 0.4] })
        g.translate(p.x, p.y, p.z)
        panicles.push(g)
      }
    }
  }
  pivot.divideScalar(stems)
  return { plant: merge(plant), panicles: merge(panicles), pivots: { panicles: pivot } }
}

function buildPaddy(ctx) {
  const { random, quality } = ctx
  const spots = rowSpots({ width: 12, depth: 16, rowGap: 0.42, plantGap: 0.36 / Math.sqrt(quality), random, jitter: 0.12, skip: 0.01 })
  const variants = [0, 1, 2].map(() => paddyVariant(random))
  assembleField(ctx, {
    variants,
    spots,
    baseY: -0.02,
    wind: { strength: 0.13, flutter: 0.01, refHeight: 0.9, ground: 0 },
    plant: {
      scale: (g) => [lerp(0.45, 1, smooth(0, 0.35, g)), lerp(0.28, 1, smooth(0, 0.5, g)), lerp(0.45, 1, smooth(0, 0.35, g))],
      color: (c, g, item) => tone(ramp(c, g, [[0, '#7fae4a'], [0.4, '#5f9a3b'], [0.68, '#7c9c3f'], [0.84, '#b9a552'], [1, '#c4a257']]), item),
    },
    attachments: [{
      key: 'panicles',
      scale: (g) => smooth(0.4, 0.55, g),
      color: (c, g, item) => tone(ramp(c, g, [[0.4, '#a7bd5c'], [0.62, '#b8bb5e'], [0.8, '#dcb963'], [1, '#d3a64f']]), item),
    }],
  })
  // cattle egrets standing in the paddy
  ctx.egrets([V(-1.65, 0.03, 4.6), V(1.3, 0.03, 1.2), V(-3.4, 0.03, -2.8), V(3.8, 0.03, 5.4)], { appear: (g) => g < 0.76 })
  return { plot: { width: 12, depth: 16, rowGap: 0.42 }, soil: 'paddy', camera: { position: V(5.4, 2.0, 10.6), target: V(-0.4, 0.45, 2.4) } }
}

/* ---------------------------------------------------------------- maize */
function maizeVariant(random) {
  const plant = []
  const height = random.range(1.9, 2.25)
  const bend = V(random.gauss() * 0.06, 0, random.gauss() * 0.06)
  const stalkPoints = [V(), V(0, height * 0.5, 0).add(bend.clone().multiplyScalar(0.4)), V(0, height, 0).add(bend)]
  plant.push(tube(stalkPoints, 0.017, 0.007, { radial: 6, tubular: 6, colorFn: shade(0.7, 1) }))
  const stalk = new THREE.CatmullRomCurve3(stalkPoints)
  const baseAzimuth = random() * Math.PI * 2
  const leaves = 12
  for (let index = 0; index < leaves; index += 1) {
    const t = 0.06 + index * 0.068
    const at = stalk.getPointAt(Math.min(t, 0.86))
    const length = 0.5 + 0.42 * Math.sin(Math.PI * (index + 1) / (leaves + 2))
    const geometry = blade({ length, width: 0.08, rise: random.range(0.75, 1.05), droop: random.range(1.3, 1.9), segments: 7, fold: 0.16, shape: 'strap', base: '#b5b5b5', tip: '#f0f0f0', rib: '#ffffff' })
    transform(geometry, { rotation: [0, baseAzimuth + (index % 2) * Math.PI + random.gauss() * 0.35, 0] })
    geometry.translate(at.x, at.y, at.z)
    plant.push(geometry)
  }
  // tassel
  const top = stalk.getPointAt(1)
  const tassel = [tube([top, top.clone().add(V(0, 0.18, 0)), top.clone().add(V(0.01, 0.32, 0))], 0.004, 0.0015, { radial: 3, tubular: 3, color: '#ffffff' })]
  for (let branch = 0; branch < 9; branch += 1) {
    const azimuth = (branch / 9) * Math.PI * 2
    const start = top.clone().add(V(0, 0.08 + (branch % 3) * 0.03, 0))
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    tassel.push(tube([start, start.clone().addScaledVector(out, 0.08).add(V(0, 0.06, 0)), start.clone().addScaledVector(out, 0.18).add(V(0, -0.03, 0))], 0.0022, 0.0012, { radial: 3, tubular: 3, color: '#f4f4f4' }))
  }
  // cob in husk with silk
  const cobAt = stalk.getPointAt(0.52)
  const cobAzimuth = baseAzimuth + Math.PI * 0.5
  const cobDir = V(Math.cos(cobAzimuth) * 0.45, 1, Math.sin(cobAzimuth) * 0.45).normalize()
  const cobParts = [
    orient(ellipsoid(0.03, 0.12, 0.03, { widthSegments: 7, heightSegments: 6, colorFn: (c, x, y) => c.setScalar(lerp(0.82, 1, y / 0.12 * 0.5 + 0.5)) }), cobAt.clone().addScaledVector(cobDir, 0.11), cobDir),
    orient(prep(new THREE.ConeGeometry(0.012, 0.07, 5, 1, true), '#c99b6a'), cobAt.clone().addScaledVector(cobDir, 0.25), cobDir),
  ]
  for (let husk = 0; husk < 2; husk += 1) {
    const geometry = blade({ length: 0.16, width: 0.035, rise: 1.3, droop: 0.5, segments: 3, fold: 0.4, base: '#d6d6d6', tip: '#ffffff' })
    transform(geometry, { rotation: [0, husk * Math.PI, 0] })
    orient(geometry, cobAt.clone().addScaledVector(cobDir, 0.15), cobDir)
    cobParts.push(geometry)
  }
  return { plant: merge(plant), tassel: merge(tassel), cob: merge(cobParts), pivots: { tassel: top, cob: cobAt } }
}

function buildMaize(ctx) {
  const { random, quality } = ctx
  const spots = rowSpots({ width: 12, depth: 16, rowGap: 0.68, plantGap: 0.34 / Math.sqrt(quality), random, jitter: 0.15 })
  const variants = [0, 1, 2].map(() => maizeVariant(random))
  const dry = (c, g, item, green) => tone(ramp(c, g, [[0, green], [0.7, green], [0.86, '#a9a066'], [1, '#c2aa78']]), item)
  assembleField(ctx, {
    variants,
    spots,
    baseY: 0.035,
    wind: { strength: 0.22, flutter: 0.018, refHeight: 2.1, ground: 0 },
    plant: {
      scale: (g) => [lerp(0.25, 1, smooth(0, 0.35, g)), lerp(0.06, 1, smooth(0, 0.5, g)), lerp(0.25, 1, smooth(0, 0.35, g))],
      color: (c, g, item) => dry(c, g, item, '#4f8a33'),
    },
    attachments: [
      { key: 'tassel', scale: (g) => smooth(0.42, 0.52, g), color: (c, g, item) => tone(ramp(c, g, [[0.4, '#9fae5a'], [0.6, '#c8b46c'], [1, '#a98f5e']]), item) },
      { key: 'cob', scale: (g) => smooth(0.54, 0.7, g), color: (c, g, item) => tone(ramp(c, g, [[0.5, '#7fb24c'], [0.72, '#86ad4c'], [0.9, '#cdb77d'], [1, '#d2bb84']]), item) },
    ],
  })
  return { plot: { width: 12, depth: 16, rowGap: 0.68 }, soil: 'furrow', camera: { position: V(6.4, 3.0, 11.6), target: V(-0.6, 1.1, 2.4) } }
}

/* ---------------------------------------------------------------- mustard */
function mustardVariant(random) {
  const plant = []
  const flowers = []
  const pods = []
  const height = random.range(1.15, 1.45)
  const stemTop = V(random.gauss() * 0.04, height, random.gauss() * 0.04)
  plant.push(tube([V(), V(0, height * 0.5, 0), stemTop], 0.009, 0.004, { radial: 5, tubular: 5, colorFn: shade(0.7, 1) }))
  for (let index = 0; index < 6; index += 1) {
    const geometry = blade({ length: random.range(0.2, 0.3), width: random.range(0.09, 0.12), rise: random.range(0.45, 0.85), droop: random.range(0.6, 1.0), segments: 5, fold: 0.35, shape: 'oval', base: '#a8a8a8', tip: '#e6e6e6', rib: '#ffffff', tear: 0.25, random })
    transform(geometry, { rotation: [0, (index / 6) * Math.PI * 2 + random.gauss() * 0.3, 0] })
    geometry.translate(0, 0.03 + index * 0.025, 0)
    plant.push(geometry)
  }
  const raceme = (start, end) => {
    plant.push(tube([start, start.clone().lerp(end, 0.5).add(V(0, 0.04, 0)), end], 0.0035, 0.002, { radial: 3, tubular: 3, colorFn: shade(0.8, 1) }))
    const direction = end.clone().sub(start).normalize()
    // flower dome at the tip
    for (let flower = 0; flower < 18; flower += 1) {
      const a = random() * Math.PI * 2
      const r = Math.sqrt(random()) * 0.062
      const p = end.clone().add(V(Math.cos(a) * r, 0.01 + (0.062 - r) * 0.7 + random() * 0.015, Math.sin(a) * r))
      const petal = transform(ellipsoid(0.019, 0.008, 0.019, { detail: 0, colorFn: (c) => c.setScalar(random.range(0.9, 1)) }), { rotation: [random.gauss() * 0.4, random() * 3, random.gauss() * 0.4] })
      petal.translate(p.x, p.y, p.z)
      flowers.push(petal)
    }
    // pods (siliquae) along the lower raceme
    for (let pod = 0; pod < 7; pod += 1) {
      const p = start.clone().lerp(end, 0.35 + pod * 0.09)
      const angle = (pod % 2 ? 1 : -1) * 0.5
      const podDir = direction.clone().applyAxisAngle(V(-direction.z, 0, direction.x).normalize().lengthSq() > 0 ? V(-direction.z, 0, direction.x).normalize() : V(1, 0, 0), angle).applyAxisAngle(UP, random() * 6)
      const g = prep(new THREE.CylinderGeometry(0.0016, 0.0024, 0.055, 3, 1), '#ffffff')
      g.translate(0, 0.0275, 0)
      pods.push(orient(g, p, podDir.add(V(0, 0.6, 0))))
    }
  }
  raceme(stemTop.clone().multiplyScalar(0.86), stemTop.clone().add(V(0, 0.08, 0)))
  for (let branch = 0; branch < 5; branch += 1) {
    const azimuth = (branch / 5) * Math.PI * 2 + random.gauss() * 0.4
    const start = stemTop.clone().multiplyScalar(random.range(0.5, 0.78))
    const reach = random.range(0.16, 0.3)
    const end = V(start.x + Math.cos(azimuth) * reach, height * random.range(0.86, 1.0), start.z + Math.sin(azimuth) * reach)
    raceme(start, end)
  }
  return { plant: merge(plant), flowers: merge(flowers), pods: merge(pods), pivots: { flowers: V(0, height * 0.95, 0), pods: V(0, height * 0.85, 0) } }
}

function buildMustard(ctx) {
  const { random, quality } = ctx
  const spots = rowSpots({ width: 12, depth: 16, rowGap: 0.4, plantGap: 0.32 / Math.sqrt(quality), random, jitter: 0.3 })
  const variants = [0, 1, 2].map(() => mustardVariant(random))
  assembleField(ctx, {
    variants,
    spots,
    baseY: 0.035,
    wind: { strength: 0.16, flutter: 0.012, refHeight: 1.3, ground: 0 },
    plant: {
      scale: (g) => [lerp(0.5, 1, smooth(0, 0.3, g)), lerp(0.1, 1, smooth(0.08, 0.5, g)), lerp(0.5, 1, smooth(0, 0.3, g))],
      color: (c, g, item) => tone(ramp(c, g, [[0, '#5f9a44'], [0.6, '#5a8f3d'], [0.82, '#94954a'], [1, '#a7915a']]), item),
    },
    attachments: [
      { key: 'flowers', scale: (g) => smooth(0.36, 0.48, g) * (1 - smooth(0.74, 0.86, g)), color: (c, g, item) => tone(ramp(c, g, [[0.36, '#b9c23a'], [0.44, '#ffc400'], [0.7, '#ffbf00'], [0.8, '#e0a923']]), item), materialOptions: { roughness: 0.92, emissive: '#3a2a00' } },
      { key: 'pods', scale: (g) => smooth(0.58, 0.74, g), color: (c, g, item) => tone(ramp(c, g, [[0.58, '#8db150'], [0.78, '#8fa448'], [0.92, '#b08f55'], [1, '#9c7c4a']]), item) },
    ],
  })
  return { plot: { width: 12, depth: 16, rowGap: 0.4 }, soil: 'furrow', camera: { position: V(5.8, 2.3, 10.8), target: V(-0.4, 0.75, 2.4) } }
}

/* ---------------------------------------------------------------- sugarcane */
function sugarcaneVariant(random) {
  const parts = []
  const dry = []
  const canes = 5
  const purple = random() < 0.5
  for (let index = 0; index < canes; index += 1) {
    const azimuth = (index / canes) * Math.PI * 2 + random.gauss() * 0.5
    const lean = random.range(0.03, 0.14)
    const height = random.range(2.7, 3.2)
    const direction = V(Math.sin(lean) * Math.cos(azimuth), Math.cos(lean), Math.sin(lean) * Math.sin(azimuth))
    const base = V(Math.cos(azimuth) * 0.06, 0, Math.sin(azimuth) * 0.06)
    const top = base.clone().addScaledVector(direction, height)
    const caneColor = (c, x, y) => {
      const band = (y % 0.17) / 0.17
      if (band > 0.9) c.set(purple ? '#6b4a3e' : '#7c7a3a')
      else if (band > 0.8) c.set('#c8c6a8')
      else c.set(purple ? '#8a6a52' : '#a2a04e').lerp(tmpB.set('#5f8a3a'), Math.max(0, (y - height * 0.6) / (height * 0.4)))
    }
    parts.push(tube([base, base.clone().addScaledVector(direction, height * 0.5), top], 0.017, 0.011, { radial: 6, tubular: 12, colorFn: caneColor }))
    const caneCurve = new THREE.CatmullRomCurve3([base, base.clone().addScaledVector(direction, height * 0.5), top])
    for (let leaf = 0; leaf < 7; leaf += 1) {
      const at = caneCurve.getPointAt(0.62 + leaf * 0.055)
      const geometry = blade({ length: random.range(1.05, 1.45), width: 0.05, rise: random.range(1.1, 1.4), droop: random.range(1.7, 2.3), segments: 8, fold: 0.2, base: '#4e7f33', tip: '#7aa24a', rib: '#c9d7a0' })
      transform(geometry, { rotation: [0, azimuth + leaf * 2.1 + random.gauss() * 0.4, 0] })
      geometry.translate(at.x, at.y, at.z)
      parts.push(geometry)
    }
    for (let leaf = 0; leaf < 3; leaf += 1) {
      const at = caneCurve.getPointAt(0.18 + leaf * 0.12)
      const geometry = blade({ length: random.range(0.7, 1.0), width: 0.04, rise: random.range(-0.1, 0.3), droop: random.range(0.6, 1.1), segments: 5, fold: 0.1, base: '#9c8a5c', tip: '#c4b07c' })
      transform(geometry, { rotation: [0, azimuth + leaf * 2.4, 0] })
      geometry.translate(at.x, at.y, at.z)
      dry.push(geometry)
    }
  }
  return { plant: merge(parts), dry: merge(dry), pivots: { dry: V(0, 0.8, 0) } }
}

function buildSugarcane(ctx) {
  const { random, quality } = ctx
  const spots = rowSpots({ width: 12, depth: 16, rowGap: 1.0, plantGap: 0.58 / Math.sqrt(quality), random, jitter: 0.15 })
  const variants = [0, 1, 2].map(() => sugarcaneVariant(random))
  assembleField(ctx, {
    variants,
    spots,
    baseY: 0.035,
    wind: { strength: 0.32, flutter: 0.02, refHeight: 3, ground: 0 },
    plant: {
      scale: (g) => lerp(0.12, 1, smooth(0, 0.78, g)),
      color: (c, g, item) => tone(ramp(c, g, [[0, '#ffffff'], [0.7, '#f4f7ea'], [1, '#f0e8c8']]), item),
    },
    attachments: [{ key: 'dry', scale: (g) => smooth(0.45, 0.8, g), color: (c, g, item) => tone(c.set('#ffffff'), item) }],
  })
  return { plot: { width: 12, depth: 16, rowGap: 1.0 }, soil: 'furrow', camera: { position: V(7.2, 3.6, 12.6), target: V(-0.4, 1.7, 2.4) } }
}

/* ---------------------------------------------------------------- banana */
function bananaVariant(random) {
  const plant = []
  const bunch = []
  const stemHeight = random.range(2.1, 2.5)
  const stemColor = (c, x, y, z) => {
    const streak = Math.sin(Math.atan2(z, x) * 9 + y * 3) * 0.5 + 0.5
    c.set('#57773a').lerp(tmpB.set('#6e5434'), streak > 0.78 ? 0.6 : 0).lerp(tmpB.set('#8a7a52'), Math.max(0, 0.35 - y * 0.25))
  }
  plant.push(tube([V(), V(0.02, stemHeight * 0.5, 0), V(0.03, stemHeight, 0.01)], 0.14, 0.085, { radial: 10, tubular: 6, colorFn: stemColor }))
  const crown = V(0.03, stemHeight, 0.01)
  const leaves = 9
  for (let index = 0; index < leaves; index += 1) {
    const azimuth = index * 2.4 + random.gauss() * 0.2
    const age = index / leaves // older leaves droop more
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const petioleEnd = crown.clone().add(V(0, lerp(0.35, 0.05, age), 0)).addScaledVector(out, lerp(0.25, 0.42, age))
    plant.push(tube([crown.clone().add(V(0, -0.1, 0)), crown.clone().addScaledVector(out, 0.1).add(V(0, 0.15, 0)), petioleEnd], 0.03, 0.016, { radial: 5, tubular: 3, color: '#557f34' }))
    const geometry = blade({ length: random.range(1.6, 2.1), width: random.range(0.5, 0.6), rise: lerp(1.1, 0.3, age), droop: lerp(1.2, 2.4, age), segments: 12, fold: -0.22, shape: 'paddle', base: '#2f6421', tip: '#3f7a2a', rib: '#b9c98a', tear: 0.18, random })
    transform(geometry, { rotation: [0, -azimuth + Math.PI / 2, 0] })
    geometry.translate(petioleEnd.x, petioleEnd.y, petioleEnd.z)
    plant.push(geometry)
  }
  for (let index = 0; index < 2; index += 1) {
    const azimuth = random() * Math.PI * 2
    const geometry = blade({ length: 1.3, width: 0.32, rise: -0.6, droop: 0.4, segments: 6, fold: 0.5, shape: 'paddle', base: '#7d6440', tip: '#a88c5c', tear: 0.5, random })
    transform(geometry, { rotation: [0, azimuth, 0] })
    geometry.translate(crown.x + Math.cos(azimuth) * 0.12, crown.y - 0.15, crown.z + Math.sin(azimuth) * 0.12)
    plant.push(geometry)
  }
  // bunch: peduncle arcs out of the crown and hangs down; fingers curve upward
  const side = random() * Math.PI * 2
  const out = V(Math.cos(side), 0, Math.sin(side))
  const rachisTop = crown.clone().addScaledVector(out, 0.34).add(V(0, -0.15, 0))
  bunch.push(tube([crown.clone().add(V(0, 0.1, 0)), crown.clone().addScaledVector(out, 0.22).add(V(0, 0.12, 0)), rachisTop], 0.03, 0.026, { radial: 5, tubular: 4, color: '#6e9440' }))
  const rachisBottom = rachisTop.clone().add(V(0.02, -0.95, 0))
  bunch.push(tube([rachisTop, rachisTop.clone().lerp(rachisBottom, 0.5), rachisBottom], 0.024, 0.012, { radial: 5, tubular: 4, color: '#6b8a3c' }))
  const bud = prep(new THREE.ConeGeometry(0.06, 0.2, 7), '#5e2236')
  bud.rotateX(Math.PI)
  bud.translate(rachisBottom.x, rachisBottom.y - 0.1, rachisBottom.z)
  bunch.push(bud)
  for (let hand = 0; hand < 7; hand += 1) {
    const center = rachisTop.clone().lerp(rachisBottom, 0.08 + hand * 0.1)
    const fingers = 11 - Math.floor(hand / 2)
    const handAngle = hand * 1.9
    for (let finger = 0; finger < fingers; finger += 1) {
      const a = handAngle + (finger / fingers - 0.5) * 2.4
      const dirOut = V(Math.cos(a), 0, Math.sin(a))
      const start = center.clone().addScaledVector(dirOut, 0.03)
      const tip = start.clone().addScaledVector(dirOut, 0.1).add(V(0, 0.12, 0))
      bunch.push(tube([start, start.clone().addScaledVector(dirOut, 0.08).add(V(0, 0.02, 0)), tip], 0.016, 0.009, { radial: 5, tubular: 3, colorFn: (c, x, y) => c.set('#5f8e34').lerp(tmpB.set('#4a3a2a'), Math.max(0, (y - tip.y + 0.012) / 0.012)) }))
    }
  }
  return { plant: merge(plant), bunch: merge(bunch), pivots: { bunch: crown } }
}

function buildBanana(ctx) {
  const { random, quality } = ctx
  const spacing = 2.0 / Math.sqrt(Math.max(quality, 0.6))
  const spots = rowSpots({ width: 22, depth: 26, rowGap: spacing, plantGap: spacing, random, jitter: 0.08, skip: 0.03 })
  const variants = [0, 1, 2].map(() => bananaVariant(random))
  assembleField(ctx, {
    variants,
    spots,
    wind: { strength: 0.1, flutter: 0.045, refHeight: 3.2, ground: 0 },
    materialOptions: { roughness: 0.78 },
    plant: {
      scale: (g) => lerp(0.16, 1, smooth(0, 0.56, g)),
      color: (c, g, item) => tone(c.set('#ffffff'), item),
    },
    attachments: [{ key: 'bunch', scale: (g) => smooth(0.56, 0.8, g), color: (c, g, item) => tone(ramp(c, g, [[0.5, '#ffffff'], [0.85, '#ffffff'], [1, '#e9f0b0']]), item) }],
  })
  return { plot: { width: 22, depth: 26 }, soil: 'orchard', camera: { position: V(13.5, 4.2, 20.5), target: V(2.5, 2.0, 6.5) } }
}

/* ---------------------------------------------------------------- orchard trees */
function shellPoint(center, rx, ry, azimuth, elevation, scale = 1) {
  return V(center.x + Math.cos(elevation) * Math.cos(azimuth) * rx * scale, center.y + Math.sin(elevation) * ry * scale, center.z + Math.cos(elevation) * Math.sin(azimuth) * rx * scale)
}

function treeSkeleton(random, { origin, trunkHeight, trunkRadius, center, rx, ry, limbs = 4, barkColor = '#5a4636' }) {
  const branches = []
  const tips = []
  const bark = (c, x, y, z) => c.set(barkColor).multiplyScalar(0.8 + 0.35 * (Math.sin(x * 37 + y * 11) * Math.sin(z * 29 - y * 7) * 0.5 + 0.5))
  const trunkTop = origin.clone().add(V(random.gauss() * 0.15, trunkHeight, random.gauss() * 0.15))
  branches.push(tube([origin.clone().add(V(0, -0.1, 0)), origin.clone().add(V(random.gauss() * 0.08, trunkHeight * 0.5, random.gauss() * 0.08)), trunkTop], trunkRadius, trunkRadius * 0.78, { radial: 9, tubular: 5, colorFn: bark }))
  // root flare
  const flare = prep(new THREE.CylinderGeometry(trunkRadius * 0.95, trunkRadius * 1.5, 0.35, 9, 1, true), barkColor, bark)
  flare.translate(origin.x, origin.y + 0.12, origin.z)
  branches.push(flare)
  const grow = (from, azimuth, elevation, radius, level) => {
    const target = shellPoint(center, rx, ry, azimuth, elevation, level === 3 ? random.range(0.66, 0.8) : 0.85)
    const fraction = level === 1 ? 0.5 : level === 2 ? 0.62 : 1
    const end = from.clone().lerp(target, fraction)
    const mid = from.clone().lerp(end, 0.5).add(V(random.gauss() * 0.15, random.gauss() * 0.12 + 0.08, random.gauss() * 0.15))
    branches.push(tube([from, mid, end], radius, radius * 0.62, { radial: level === 1 ? 7 : 5, tubular: 4, colorFn: bark }))
    if (level === 3) { tips.push({ position: end, azimuth, elevation }); return }
    const children = level === 1 ? 3 : 3
    for (let child = 0; child < children; child += 1) {
      grow(end, azimuth + (child - 1) * random.range(0.35, 0.6) / level + random.gauss() * 0.15, Math.min(1.35, Math.max(-0.5, elevation + random.gauss() * 0.35 + (child === 1 ? 0.25 : -0.05))), radius * 0.6, level + 1)
    }
  }
  for (let limb = 0; limb < limbs; limb += 1) grow(trunkTop, (limb / limbs) * Math.PI * 2 + random.gauss() * 0.3, random.range(-0.05, 0.6), trunkRadius * 0.62, 1)
  grow(trunkTop, random() * Math.PI * 2, 1.2, trunkRadius * 0.5, 2)
  return { branches, tips }
}

function canopyCore(random, center, rx, ry, color) {
  const geometry = new THREE.SphereGeometry(1, 20, 14)
  const position = geometry.attributes.position
  const vertex = V()
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const bump = 1 + 0.12 * Math.sin(vertex.x * 5.1 + vertex.y * 3.3) * Math.sin(vertex.z * 4.7 - vertex.y * 2.1)
    position.setXYZ(index, vertex.x * rx * 0.7 * bump + center.x, vertex.y * ry * 0.66 * bump + center.y, vertex.z * rx * 0.7 * bump + center.z)
  }
  geometry.computeVertexNormals()
  return prep(geometry, color)
}

function leafClusterItems(random, tree, count) {
  const { center, rx, ry } = tree
  const items = []
  const normal = V()
  for (let index = 0; index < count; index += 1) {
    // even coverage over the crown, thinning towards the shaded underside
    const azimuth = random() * Math.PI * 2
    const elevation = Math.asin(random.range(-0.62, 1))
    const radius = Math.pow(random(), 0.35) * 0.3 + 0.72
    const rel = V(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth))
    rel.multiplyScalar(radius * (1 + 0.08 * Math.sin(azimuth * 5 + elevation * 4)))
    const p = V(center.x + rel.x * rx, center.y + rel.y * ry, center.z + rel.z * rx)
    if (p.y < 0.6) continue
    normal.set(rel.x / rx, rel.y / ry, rel.z / rx).normalize()
    const up = normal.clone().add(V(0, 0.55, 0)).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(UP, up)
    q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * Math.PI * 2))
    items.push({ p, q, s: random.range(0.85, 1.2), offset: 0, tone: random.gauss() * 0.1 + (rel.y < 0 ? -0.12 : 0.04), height: rel.y, normal: normal.clone() })
  }
  return items
}

function mangoLeafCluster(random) {
  const leaves = []
  for (let index = 0; index < 7; index += 1) {
    const geometry = blade({ length: random.range(0.26, 0.34), width: 0.07, rise: random.range(0.15, 0.65), droop: random.range(0.6, 1.0), segments: 4, fold: 0.3, shape: 'lance', base: '#9a9a9a', tip: '#c9c9c9', rib: '#ffffff' })
    transform(geometry, { rotation: [0, (index / 7) * Math.PI * 2 + random.gauss() * 0.2, 0] })
    leaves.push(geometry)
  }
  return merge(leaves)
}

function litchiLeafCluster(random) {
  const parts = []
  for (let leaf = 0; leaf < 3; leaf += 1) {
    const azimuth = (leaf / 3) * Math.PI * 2 + random.gauss() * 0.3
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const end = out.clone().multiplyScalar(0.3).add(V(0, 0.05, 0))
    parts.push(tube([V(), out.clone().multiplyScalar(0.12).add(V(0, 0.04, 0)), end], 0.003, 0.002, { radial: 3, tubular: 2, color: '#8a8a7a' }))
    for (let pair = 0; pair < 3; pair += 1) {
      const p = V().lerp(end, 0.35 + pair * 0.25)
      for (const sideSign of [-1, 1]) {
        const geometry = blade({ length: 0.17, width: 0.058, rise: 0.3, droop: 0.55, segments: 3, fold: 0.3, shape: 'lance', base: '#9a9a9a', tip: '#c8c8c8', rib: '#ffffff' })
        transform(geometry, { rotation: [0, -azimuth + Math.PI / 2 + sideSign * 1.1, 0] })
        geometry.translate(p.x, p.y, p.z)
        parts.push(geometry)
      }
    }
  }
  return merge(parts)
}

function mangoFruit(random) {
  const profile = []
  const length = 0.15
  for (let index = 0; index <= 10; index += 1) {
    const t = index / 10
    const radius = 0.052 * Math.pow(Math.sin(Math.PI * Math.min(0.999, t * 0.96 + 0.02)), 0.62) * (1 + 0.12 * (0.5 - t))
    profile.push(new THREE.Vector2(Math.max(radius, 0.0008), -t * length))
  }
  const fruit = new THREE.LatheGeometry(profile, 9)
  const position = fruit.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index)
    const t = -y / length
    position.setX(index, position.getX(index) + 0.02 * t * t)
    position.setZ(index, position.getZ(index) * 0.86)
  }
  fruit.computeVertexNormals()
  const stalkLength = random.range(0.16, 0.3)
  fruit.translate(0, -stalkLength, 0)
  const body = prep(fruit, '#ffffff', (c, x, y) => {
    const shoulder = Math.max(0, 1 - Math.abs(y + stalkLength + 0.035) / 0.06)
    c.setRGB(1, 1, 1).lerp(tmpB.setRGB(1, 0.42, 0.32), x < -0.005 ? shoulder * 0.9 : 0)
  })
  const stalk = prep(new THREE.CylinderGeometry(0.0025, 0.0035, stalkLength, 4, 1, true), '#3c3a22')
  stalk.translate(0, -stalkLength / 2, 0)
  return merge([body, stalk])
}

function panicle(random, { height = 0.3, radius = 0.09, florets = 26, axis = '#b37b52', floret = '#f3e7b6', floretSize = 0.012 }) {
  const parts = [tube([V(), V(0, height * 0.5, 0), V(random.gauss() * 0.02, height, 0)], 0.004, 0.0015, { radial: 3, tubular: 3, color: axis })]
  for (let index = 0; index < florets; index += 1) {
    const t = Math.sqrt(random())
    const y = (1 - t) * height * 0.95 + 0.02
    const r = radius * t * random.range(0.5, 1)
    const a = random() * Math.PI * 2
    const g = ellipsoid(floretSize, floretSize * 0.8, floretSize, { detail: 0, colorFn: (c) => c.set(floret).multiplyScalar(random.range(0.85, 1.05)) })
    g.translate(Math.cos(a) * r, y, Math.sin(a) * r)
    parts.push(g)
  }
  return merge(parts)
}

function litchiBunch(random) {
  const parts = []
  const hub = V(0, -0.08, 0)
  parts.push(tube([V(), V(0.01, -0.04, 0), hub], 0.004, 0.003, { radial: 3, tubular: 2, color: '#4c4a2c' }))
  const fruits = 7
  for (let index = 0; index < fruits; index += 1) {
    const a = (index / fruits) * Math.PI * 2 + random.gauss() * 0.3
    const p = hub.clone().add(V(Math.cos(a) * random.range(0.03, 0.06), -random.range(0.03, 0.1), Math.sin(a) * random.range(0.03, 0.06)))
    parts.push(tube([hub, hub.clone().lerp(p, 0.5).add(V(0, 0.01, 0)), p], 0.0018, 0.0014, { radial: 3, tubular: 2, color: '#4c4a2c' }))
    const fruit = new THREE.IcosahedronGeometry(0.036, 1)
    const position = fruit.attributes.position
    const vertex = V()
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i)
      const bump = 1 + 0.07 * Math.sin(vertex.x * 220) * Math.sin(vertex.y * 210) * Math.sin(vertex.z * 230)
      vertex.multiplyScalar(bump)
      vertex.y *= 1.08
      position.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    fruit.computeVertexNormals()
    const g = prep(fruit, '#ffffff', (c) => c.setScalar(random.range(0.82, 1.02)))
    g.translate(p.x, p.y - 0.026, p.z)
    parts.push(g)
  }
  return merge(parts)
}

function buildOrchard(ctx, species) {
  const { random, quality } = ctx
  const mango = species === 'mango'
  const spacing = mango ? 10 : 8.5
  const grid = [-1, 0, 1]
  const trees = []
  const branchGeometries = []
  const cores = []
  grid.forEach((gx) => grid.forEach((gz) => {
    const origin = V(gx * spacing + random.gauss() * 0.5, 0, gz * spacing + random.gauss() * 0.5)
    const size = random.range(0.88, 1.08)
    const shape = mango
      ? { trunkHeight: 1.6 * size, trunkRadius: 0.36 * size, center: origin.clone().add(V(0, 4.3 * size, 0)), rx: 4.3 * size, ry: 3.1 * size, limbs: 4, barkColor: '#4f3e30' }
      : { trunkHeight: 0.9 * size, trunkRadius: 0.2 * size, center: origin.clone().add(V(0, 3.0 * size, 0)), rx: 3.7 * size, ry: 2.7 * size, limbs: 5, barkColor: '#5e5448' }
    const skeleton = treeSkeleton(random, { origin, ...shape })
    branchGeometries.push(...skeleton.branches)
    cores.push(canopyCore(random, shape.center, shape.rx, shape.ry, '#ffffff'))
    trees.push({ origin, ...shape, tips: skeleton.tips })
    ctx.basin(origin, mango ? 1.5 : 1.3)
  }))

  const treeWind = { strength: 0.1, flutter: 0.018, refHeight: 8, ground: 0 }
  const barkMat = windMaterials(ctx, treeWind, { roughness: 0.95, side: THREE.FrontSide })
  const branches = new THREE.Mesh(merge(branchGeometries), barkMat.material)
  branches.customDepthMaterial = barkMat.depth
  branches.castShadow = true
  branches.receiveShadow = true
  ctx.addMesh(branches)
  const coreMat = windMaterials(ctx, { ...treeWind, flutter: 0 }, { roughness: 0.9, side: THREE.FrontSide, color: mango ? '#1c3315' : '#18301a' })
  const core = new THREE.Mesh(merge(cores), coreMat.material)
  core.customDepthMaterial = coreMat.depth
  core.castShadow = true
  core.receiveShadow = true
  ctx.addMesh(core)

  const clustersPerTree = Math.round((mango ? 1500 : 1600) * quality)
  const leafItems = trees.flatMap((tree) => leafClusterItems(random, tree, clustersPerTree).map((entry) => ({ ...entry, tree })))
  const leafMats = windMaterials(ctx, treeWind, { roughness: 0.48, metalness: 0.02 })
  const leafVariants = [0, 1].map(() => (mango ? mangoLeafCluster(random) : litchiLeafCluster(random)))
  leafVariants.forEach((geometry, variantIndex) => {
    const items = leafItems.filter((_, index) => index % 2 === variantIndex)
    items.forEach((entry) => { entry.flush = random() < (mango ? 0.06 : 0.09) })
    ctx.addPart(new GrowingPart({
      geometry, material: leafMats.material, depthMaterial: leafMats.depth, items,
      scale: () => 1,
      color: (c, g, entry) => tone(entry.flush ? c.set(mango ? '#6f5a2a' : '#7a3e2c') : c.set(mango ? '#2f5626' : '#2d5424'), entry),
    }))
  })

  // flowers on the outer, upper canopy
  const flowerItems = leafItems.filter((entry) => entry.height > -0.1 && random() < (mango ? 0.2 : 0.22)).map((entry) => {
    const p = entry.p.clone().addScaledVector(entry.normal, 0.08)
    const q = new THREE.Quaternion().setFromUnitVectors(UP, entry.normal.clone().add(V(0, 1.4, 0)).normalize())
    return { p, q, s: random.range(0.8, 1.2), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06 }
  })
  const flowerMats = windMaterials(ctx, treeWind, { roughness: 0.7 })
  const flowerGeometry = mango
    ? panicle(random, { height: 0.42, radius: 0.15, florets: 40, axis: '#b0704a', floret: '#f0d98e', floretSize: 0.02 })
    : panicle(random, { height: 0.34, radius: 0.16, florets: 36, axis: '#9b9a6a', floret: '#ece6b4', floretSize: 0.017 })
  ctx.addPart(new GrowingPart({
    geometry: flowerGeometry, material: flowerMats.material, depthMaterial: flowerMats.depth, items: flowerItems,
    scale: (g) => 1 - smooth(0.14, 0.3, g),
    color: (c, g, entry) => tone(c.set('#ffffff'), entry),
  }))

  // fruit hangs from the lower and outer canopy
  const fruitItems = leafItems.filter((entry) => (mango ? entry.height < 0.35 && entry.height > -0.75 : entry.height > -0.85) && random() < (mango ? 0.09 : 0.1)).map((entry) => {
    const p = entry.p.clone().addScaledVector(entry.normal, mango ? 0.02 : 0.06)
    const q = new THREE.Quaternion().setFromAxisAngle(UP, random() * Math.PI * 2)
    return { p, q, s: random.range(0.85, 1.12), offset: random.gauss() * 0.05, tone: random.gauss() * 0.06 }
  })
  const fruitMats = windMaterials(ctx, { ...treeWind, flutter: 0.008 }, { roughness: mango ? 0.42 : 0.55, side: THREE.FrontSide })
  const fruitVariants = mango ? [mangoFruit(random), mangoFruit(random)] : [litchiBunch(random), litchiBunch(random)]
  fruitVariants.forEach((geometry, variantIndex) => ctx.addPart(new GrowingPart({
    geometry, material: fruitMats.material, depthMaterial: fruitMats.depth, items: fruitItems.filter((_, index) => index % 2 === variantIndex),
    scale: (g) => lerp(0, 1, smooth(0.2, 0.7, g)),
    color: mango
      ? (c, g, entry) => tone(ramp(c, g, [[0.2, '#6d9a35'], [0.6, '#5d8f2e'], [0.74, '#93a83a'], [0.88, '#e2b22e'], [1, '#eda22a']]), entry)
      : (c, g, entry) => tone(ramp(c, g, [[0.2, '#87a83a'], [0.56, '#86a63a'], [0.66, '#b9a03e'], [0.76, '#d65a48'], [0.88, '#c4283a'], [1, '#a91f33']]), entry),
  })))

  ctx.groundCover = 'orchard'
  return mango
    ? { plot: { width: 30, depth: 30 }, soil: 'orchard', camera: { position: V(17.5, 3.6, 21.5), target: V(6.5, 3.4, 7.5) } }
    : { plot: { width: 26, depth: 26 }, soil: 'orchard', camera: { position: V(15.2, 2.9, 18.6), target: V(5.4, 2.6, 6.4) } }
}

export const cropBuilders = {
  wheat: buildWheat,
  rice: buildPaddy,
  maize: buildMaize,
  mustard: buildMustard,
  sugarcane: buildSugarcane,
  banana: buildBanana,
  mango: (ctx) => buildOrchard(ctx, 'mango'),
  litchi: (ctx) => buildOrchard(ctx, 'litchi'),
}
