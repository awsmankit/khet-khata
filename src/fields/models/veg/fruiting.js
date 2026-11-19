// Fruiting family: branching bushes (brinjal, chillies, capsicum), staked tomato, okra,
// zucchini, polyhouse cherry tomato and pole beans.
import * as THREE from 'three'
import { lerp, merge, smooth, transform, tube } from '../../geometry.js'
import { V, ramp, shade, tone } from '../../crops.js'
import { TAU, bamboo, bedRows, beds, cornerCamera, flower, grow, lathe, leaf, noise2, out, palmLeaf, pinnate, put, quatDir, ribs, ridgeField, rigid, rod, shapedSoil, slot, spotsAlong, stem } from './kit.js'
import { polyhouse } from './structures.js'

const bushScale = (g) => {
  const w = lerp(0.2, 1, smooth(0, 0.5, g))
  return [w, lerp(0.1, 1, smooth(0, 0.58, g)), w]
}
const flowerLife = (from, to) => (g) => smooth(from, from + 0.05, g) * (1 - smooth(to - 0.05, to, g))

/* ---------------------------------------------------------------- shared bush */
// A short main stem forking into primary and secondary branches with alternate leaves;
// nodes along the branches carry fruit and flower slots.
export function bushVariant(random, { height, spread, trunk = 0.3, primaries = 3, secondaries = 2, stemRadius = 0.008, leafEvery = 0.06, makeLeaf, fruitChance = 0.4, flowerChance = 0.3, fruitDrop = 0.006, tipLeaves = 3 }) {
  const stems = []
  const leaves = []
  const fruit = []
  const flowers = []
  const trunkTop = V(random.gauss() * 0.015, height * trunk, random.gauss() * 0.015)
  stems.push(stem([V(), trunkTop.clone().multiplyScalar(0.5), trunkTop], (t) => lerp(stemRadius, stemRadius * 0.85, t), { radial: 6, tubular: 3, colorFn: shade(0.7, 1) }))
  const branches = []
  const baseAz = random() * TAU
  for (let index = 0; index < primaries; index += 1) {
    const az = baseAz + (index / primaries) * TAU + random.gauss() * 0.3
    const end = out(az, spread * random.range(0.6, 0.95)).add(V(0, height * random.range(0.82, 1.0), 0))
    const mid = trunkTop.clone().lerp(end, 0.45).add(out(az, spread * 0.16)).add(V(0, -height * 0.04, 0))
    branches.push({ points: [trunkTop, mid, end], r: stemRadius * 0.72, az })
    const curve = new THREE.CatmullRomCurve3([trunkTop, mid, end])
    for (let child = 0; child < secondaries; child += 1) {
      const from = curve.getPointAt(random.range(0.3, 0.6))
      const az2 = az + (child % 2 ? 1 : -1) * random.range(0.5, 1.0)
      const end2 = from.clone().add(out(az2, spread * random.range(0.35, 0.6))).add(V(0, height * random.range(0.2, 0.4), 0))
      end2.y = Math.min(end2.y, height * 1.02)
      const mid2 = from.clone().lerp(end2, 0.5).add(V(0, -0.02, 0))
      branches.push({ points: [from, mid2, end2], r: stemRadius * 0.5, az: az2 })
    }
  }
  for (const branch of branches) {
    stems.push(stem(branch.points, (t) => lerp(branch.r, branch.r * 0.4, t), { radial: 5, tubular: 5, colorFn: shade(0.7, 1) }))
    const curve = new THREE.CatmullRomCurve3(branch.points)
    const count = Math.max(2, Math.round(curve.getLength() / leafEvery))
    for (let k = 0; k < count; k += 1) {
      const t = (k + 0.6) / (count + 0.4)
      const at = curve.getPointAt(t)
      leaves.push(put(makeLeaf(random, t, false), at, branch.az + (k % 2 ? 1 : -1) * random.range(0.6, 1.5)))
      const h = at.y / height
      if (random() < fruitChance) fruit.push(slot(at.clone().add(V(0, -fruitDrop, 0)), quatDir(V(random.gauss() * 0.25, 1, random.gauss() * 0.25), random() * TAU), { h, offset: 0.08 * (0.5 - h) }))
      if (random() < flowerChance) flowers.push(slot(at, quatDir(out(branch.az + random.gauss(), 1).add(V(0, -random.range(0.2, 1.2), 0)), random() * TAU), { h, offset: 0.1 * (0.5 - h) }))
    }
    const end = branch.points[2]
    for (let k = 0; k < tipLeaves; k += 1) leaves.push(put(makeLeaf(random, 1, true), end, branch.az + (k / tipLeaves) * TAU))
  }
  return { stems: merge(stems), leaves: merge(leaves), slots: { fruit, flower: flowers } }
}

/* ---------------------------------------------------------------- tomato */
function tomatoFruit(random, radius, detail = 1) {
  return lathe((t) => radius * Math.pow(Math.sin(Math.PI * Math.min(t, 0.999)), 0.5), radius * 1.65, {
    radial: Math.round(8 * detail), rows: Math.round(6 * detail), warp: ribs(6, 0.07, (t) => Math.sin(Math.PI * t) * (1 - t)),
    colorFn: (c, x, y) => c.setScalar(0.86 + 0.14 * Math.min(1, -y / radius)).multiplyScalar(0.96 + random() * 0.04),
  })
}

// A truss of fruit hanging from a peduncle: returns fruit and stalk geometries that line up.
function truss(random, { count, radius, reach = 0.05, spacing = 1.6, calyx = true, detail = 1 }) {
  const fruits = []
  const stalks = []
  const rachis = [V(), V(0, 0.012, reach * 0.5), V(0, -0.005, reach)]
  let tip = rachis[2].clone()
  for (let k = 1; k < count; k += 1) {
    const next = tip.clone().add(V(random.gauss() * radius * 0.5, -radius * 0.55, radius * spacing * 0.6))
    rachis.push(next)
    tip = next
  }
  stalks.push(tube(rachis, 0.0028, 0.0016, { radial: 4, tubular: rachis.length * 2, color: '#cfcfcf' }))
  const curve = new THREE.CatmullRomCurve3(rachis)
  for (let k = 0; k < count; k += 1) {
    const at = curve.getPointAt(0.12 + (k / Math.max(1, count - 1)) * 0.86)
    const side = (k % 2 ? 1 : -1) * radius * random.range(0.7, 1.1)
    const top = at.clone().add(V(side, -radius * 0.5, random.gauss() * radius * 0.3))
    stalks.push(tube([at, at.clone().lerp(top, 0.5).add(V(0, 0.004, 0)), top], 0.0014, 0.0011, { radial: 3, tubular: 2, color: '#cfcfcf' }))
    const r = radius * random.range(0.85, 1.1)
    const body = tomatoFruit(random, r, detail)
    body.translate(top.x, top.y + r * 0.08, top.z)
    fruits.push(body)
    if (calyx) {
      for (let s = 0; s < 5; s += 1) {
        const sepal = leaf({ length: r * 0.75, width: r * 0.28, shape: 'lance', rise: 0.25, droop: 0.9, segments: 2, across: 1, cup: 0, rib: null, base: '#bdbdbd', tip: '#d8d8d8', random })
        put(sepal, top.clone().add(V(0, r * 0.04, 0)), (s / 5) * TAU)
        stalks.push(sepal)
      }
    }
  }
  return { fruit: merge(fruits), stalk: merge(stalks) }
}

function flowerCluster(random, { count = 3, petals = 5, length = 0.014, color = '#f2d23b', reach = 0.04, petalWidth = 0.006, centerColor = '#e0b52a', cone = 0.008, coneColor = '#e8c43a' }) {
  const parts = [tube([V(), V(0, 0.006, reach * 0.5), V(0, -0.004, reach)], 0.0018, 0.0012, { radial: 3, tubular: 3, color: '#7e9a4a' })]
  for (let k = 0; k < count; k += 1) {
    const at = V(random.gauss() * 0.012, -0.004 - k * 0.006, reach * (0.5 + 0.5 * (k / count)) + random.gauss() * 0.006)
    const f = flower({ petals, length, width: petalWidth, rise: -0.2, droop: 0.6, cup: 0.1, segments: 2, center: 0.0025, centerColor, cone, coneColor, petal: [color, color], random })
    transform(f, { rotation: [Math.PI * random.range(0.55, 0.9), random() * TAU, 0], order: 'YXZ' })
    f.translate(at.x, at.y, at.z)
    parts.push(f)
  }
  return merge(parts)
}

function tomatoLeaf(random, size = 1, { length = 0.3, pairs = 3, leafletLength = 0.07, leafletWidth = 0.036 } = {}) {
  return pinnate({
    length: length * size, rise: random.range(0.45, 0.85), droop: random.range(0.9, 1.4), pairs, start: 0.22, rachis: 0.0028,
    leaflet: { length: leafletLength, width: leafletWidth, shape: 'ovate', rise: 0.2, droop: 0.5, segments: 3, across: 2, cup: -0.08, wave: 0.18, waves: 3 },
    leafletAngle: 1.05, shrink: 0.35, terminal: 1.05, small: 0.4, random,
  })
}

function tomatoVariant(random) {
  const height = random.range(0.95, 1.12)
  const stems = []
  const leaves = []
  const trussSlots = []
  const flowerSlots = []
  const mainPoints = [V(0.01, 0, 0), V(0.035 + random.gauss() * 0.01, height * 0.35, random.gauss() * 0.02), V(0.04, height * 0.7, random.gauss() * 0.02), V(0.045 + random.gauss() * 0.02, height, random.gauss() * 0.03)]
  const stemsList = [{ points: mainPoints, r: 0.009, from: 0 }]
  for (let k = 0; k < 2; k += 1) {
    const az = random() * TAU
    const start = new THREE.CatmullRomCurve3(mainPoints).getPointAt(random.range(0.15, 0.3))
    const end = start.clone().add(out(az, random.range(0.28, 0.38))).add(V(0, random.range(0.2, 0.35), 0))
    stemsList.push({ points: [start, start.clone().lerp(end, 0.5).add(V(0, 0.08, 0)), end], r: 0.006 })
  }
  let leafAz = random() * TAU
  stemsList.forEach((entry, stemIndex) => {
    stems.push(stem(entry.points, (t) => lerp(entry.r, entry.r * 0.45, t), { radial: 5, tubular: 8, colorFn: shade(0.72, 1) }))
    const curve = new THREE.CatmullRomCurve3(entry.points)
    const nodes = Math.max(3, Math.round(curve.getLength() / 0.14))
    for (let k = 0; k < nodes; k += 1) {
      const t = (k + 0.5) / nodes
      const at = curve.getPointAt(t)
      leafAz += 2.4 + random.gauss() * 0.2
      leaves.push(put(tomatoLeaf(random, lerp(1, 0.6, t)), at, leafAz))
      if (k % 3 === 1 && at.y > 0.18) {
        const h = at.y / height
        const q = quatDir(V(random.gauss() * 0.15, 1, random.gauss() * 0.15), leafAz + Math.PI + random.gauss() * 0.5)
        trussSlots.push(slot(at, q, { h, offset: 0.1 * (0.45 - h), kind: Math.floor(random() * 3) }))
        flowerSlots.push(slot(at, q, { h, offset: 0.1 * (0.45 - h) }))
      }
    }
    if (stemIndex === 0) for (let k = 0; k < 3; k += 1) leaves.push(put(tomatoLeaf(random, 0.45), entry.points[3], leafAz + k * 2.1, -0.3))
  })
  return { stems: merge(stems), leaves: merge(leaves), slots: { truss: trussSlots, stalk: trussSlots, flower: flowerSlots } }
}

function buildTomato(ctx) {
  const { random } = ctx
  const plot = { width: 10, depth: 13 }
  const { layout, spots } = ridgeField(ctx, plot, { pitch: 0.9, gap: 0.55, skip: 0.01 })
  spots.forEach((spot) => { spot.yaw = random() < 0.5 ? 0 : Math.PI; spot.tilt = [0, 0] })
  const variants = [0, 1, 2].map(() => tomatoVariant(random))
  const trusses = [0, 1, 2].map((k) => truss(random, { count: 3 + k, radius: 0.033, reach: 0.05 }))
  const green = (c, g, entry) => tone(ramp(c, g, [[0, '#6ea044'], [0.5, '#4f8a35'], [0.8, '#56883a'], [1, '#7a8a3c']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.14, flutter: 0.012, refHeight: 1.1, ground: 0 }, scale: bushScale,
    layers: { stems: { color: green }, leaves: { color: green, materialOptions: { roughness: 0.72 } } },
    organs: {
      truss: { geometries: trusses.map((t) => t.fruit), scale: (g) => smooth(0.42, 0.66, g), materialOptions: { roughness: 0.32, metalness: 0.02 }, color: (c, g, o) => tone(ramp(c, g, [[0.42, '#7aa640'], [0.68, '#8fb04a'], [0.74, '#c2b04a'], [0.8, '#e2802e'], [0.87, '#d8402a'], [1, '#b6231c']]), o) },
      stalk: { geometries: trusses.map((t) => t.stalk), scale: (g) => smooth(0.38, 0.5, g), color: (c, g, o) => tone(c.set('#5f8f3a'), o) },
      flower: { geometries: [flowerCluster(random, {}), flowerCluster(random, { count: 5 })], scale: flowerLife(0.28, 0.62), color: (c, g, o) => tone(c.set('#ffffff'), o) },
    },
  })
  // a bamboo stake for every plant, row posts and two lines of string
  const poles = []
  spots.forEach((spot) => {
    const sx = spot.x + 0.07 * Math.cos(spot.yaw)
    poles.push(bamboo(V(sx, spot.y - 0.05, spot.z), V(sx + random.gauss() * 0.03, 1.32 + random.gauss() * 0.04, spot.z + random.gauss() * 0.03), 0.008, { color: '#a89064', radial: 4 }))
  })
  layout.centers.forEach((x) => {
    for (let z = -plot.depth / 2 + 0.25; z <= plot.depth / 2 - 0.2; z += 3.3) poles.push(bamboo(V(x + 0.07, 0, z), V(x + 0.07, 1.45, z), 0.022))
    for (const y of [0.55, 1.05]) poles.push(rod(V(x + 0.07, y, -plot.depth / 2 + 0.25), V(x + 0.07, y, plot.depth / 2 - 0.25), 0.0018, '#e6dcc0'))
  })
  rigid(ctx, poles, { roughness: 0.85 })
  return { plot: { ...plot, rowGap: 0.9 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.85, back: 2.0, targetY: 0.55 }) }
}

/* ---------------------------------------------------------------- cherry tomato (polyhouse) */
function cherryVariant(random, wireY) {
  const height = random.range(2.05, 2.25)
  const stems = []
  const leaves = []
  const trussSlots = []
  const flowerSlots = []
  const turns = random.range(2.5, 3.5)
  const points = Array.from({ length: 12 }, (_, k) => {
    const t = k / 11
    return V(Math.cos(t * turns * TAU) * 0.012, t * height, Math.sin(t * turns * TAU) * 0.012)
  })
  stems.push(stem(points, (t) => lerp(0.009, 0.005, t), { radial: 5, tubular: 22, colorFn: shade(0.72, 1) }))
  const curve = new THREE.CatmullRomCurve3(points)
  let az = random() * TAU
  for (let y = 0.42; y < height - 0.05; y += 0.2) {
    const t = y / height
    const at = curve.getPointAt(t)
    az += 2.6 + random.gauss() * 0.2
    leaves.push(put(tomatoLeaf(random, lerp(1.05, 0.65, smooth(0.7, 1, t)), { length: 0.34, pairs: 3 }), at, az))
    if (y > 0.5 && y < height - 0.15 && Math.round(y / 0.2) % 2 === 0) {
      const h = y / wireY
      const q = quatDir(V(random.gauss() * 0.1, 1, random.gauss() * 0.1), az + Math.PI + random.gauss() * 0.4)
      trussSlots.push(slot(at, q, { h, offset: 0.34 * (0.42 - h), kind: Math.floor(random() * 3) }))
      flowerSlots.push(slot(at, q, { h, offset: 0.34 * (0.42 - h) }))
    }
  }
  const top = points[11]
  for (let k = 0; k < 3; k += 1) leaves.push(put(tomatoLeaf(random, 0.4), top, az + k * 2.1, -0.4))
  // the vine keeps flowering at its growing tip
  for (const [y, offset] of [[height - 0.12, -0.5], [height - 0.28, -0.32]]) flowerSlots.push(slot(curve.getPointAt(y / height), quatDir(V(0, 1, 0), random() * TAU), { h: 1, offset }))
  return { stems: merge(stems), leaves: merge(leaves), slots: { truss: trussSlots, stalk: trussSlots, flower: flowerSlots } }
}

function buildCherryTomato(ctx) {
  const { random, quality } = ctx
  const plot = { width: 9.6, depth: 16 }
  const bedHeight = 0.22
  const layout = beds(plot.width, { pitch: 1.6, top: 0.85, height: bedHeight, slope: 0.14 })
  polyhouse(ctx, { ...plot, layout, mulch: { centers: layout.centers, width: 1.05, color: '#2b2b2a' } })
  const xs = bedRows(layout, [-0.24, 0.24])
  const spots = spotsAlong(xs, plot.depth - 1.0, 0.48 / Math.sqrt(quality), random, { y: bedHeight + 0.01, jitterX: 0.01, jitterZ: 0.05, skip: 0.01 })
  spots.forEach((spot) => { spot.tilt = [0, 0]; spot.s = random.range(0.95, 1.03) })
  const wireY = 2.75
  const variants = [0, 1, 2].map(() => cherryVariant(random, wireY))
  const trusses = [0, 1, 2].map((k) => truss(random, { count: 8 + k * 2, radius: 0.016, reach: 0.06, spacing: 1.9, calyx: false, detail: 0.8 }))
  const green = (c, g, entry) => tone(ramp(c, g, [[0, '#6ea044'], [0.5, '#4a8834'], [1, '#538a38']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.03, flutter: 0.006, refHeight: 2.2, ground: 0 },
    scale: (g) => lerp(0.1, 1, smooth(0, 0.62, g)),
    layers: { stems: { color: green }, leaves: { color: green, materialOptions: { roughness: 0.7 } } },
    organs: {
      truss: { geometries: trusses.map((t) => t.fruit), scale: (g) => smooth(0.36, 0.56, g), materialOptions: { roughness: 0.28, metalness: 0.02 }, color: (c, g, o) => tone(ramp(c, g, [[0.36, '#7aa640'], [0.62, '#8cb04a'], [0.7, '#d0a640'], [0.77, '#e0562c'], [0.84, '#cf2a1e'], [1, '#b81f1a']]), o) },
      stalk: { geometries: trusses.map((t) => t.stalk), scale: (g) => smooth(0.3, 0.42, g), color: (c, g, o) => tone(c.set('#5f8f3a'), o) },
      flower: { geometries: [flowerCluster(random, { count: 4, reach: 0.06 }), flowerCluster(random, { count: 5, reach: 0.07 })], scale: flowerLife(0.24, 0.5), color: (c, g, o) => tone(c.set('#ffffff'), o) },
    },
  })
  // overhead crop wires and a twine down to every plant
  const lines = xs.map((x) => rod(V(x, wireY, -plot.depth / 2), V(x, wireY, plot.depth / 2), 0.003, '#bfc3c6', 4))
  spots.forEach((spot) => lines.push(rod(V(spot.x, spot.y, spot.z), V(spot.x, wireY, spot.z), 0.0013, '#e9e3cf', 3)))
  rigid(ctx, lines, { roughness: 0.7 })
  return {
    plot, soil: 'none', bund: false, scarecrow: false,
    camera: { position: V(1.3, 1.75, plot.depth / 2 + 0.6), target: V(-1.1, 1.15, 1.0) },
  }
}

/* ---------------------------------------------------------------- brinjal */
function brinjalFruit(random, long) {
  const length = long ? random.range(0.16, 0.19) : 0.1
  const radius = long ? 0.03 : 0.045
  const bend = random.gauss() * 0.04
  const body = lathe((t) => radius * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(t, 0.999), long ? 1.25 : 0.9)), long ? 0.65 : 0.5), length, {
    radial: 10, rows: 9,
    warp: (v, t) => { v.x += bend * length * t * t },
    colorFn: (c, x, y) => c.setScalar(0.85 + 0.15 * Math.min(1, -y / length * 2)),
  })
  body.translate(0, -0.03, 0)
  const cap = [tube([V(), V(0.004, -0.015, 0), V(0, -0.032, 0)], 0.0045, 0.006, { radial: 5, tubular: 3, color: '#d0d0d0' })]
  const calyx = lathe((t) => (radius * 0.6 + 0.004) * Math.pow(Math.sin(Math.PI * Math.min(0.5, t * 0.5 + 0.05)), 0.6), 0.035, { radial: 9, rows: 3 })
  calyx.translate(0, -0.028, 0)
  cap.push(calyx)
  for (let s = 0; s < 5; s += 1) {
    const sepal = leaf({ length: 0.045, width: 0.022, shape: 'lance', rise: -0.9, droop: 0.4, segments: 3, across: 1, cup: 0.3, rib: null, base: '#cfcfcf', tip: '#e4e4e4', random })
    put(sepal, V(0, -0.032, 0).add(out((s / 5) * TAU, radius * 0.55)), (s / 5) * TAU)
    cap.push(sepal)
  }
  return { fruit: body, cap: merge(cap) }
}

function brinjalLeaf(random, t, tip) {
  const s = tip ? 0.5 : lerp(1, 0.7, t) * random.range(0.85, 1.1)
  return leaf({ length: 0.22 * s, width: 0.13 * s, shape: 'ovate', rise: tip ? 1.0 : random.range(0.35, 0.6), droop: random.range(0.6, 0.9), segments: 5, across: 2, cup: 0.12, wave: 0.28, waves: 2.2, petiole: 0.18, random })
}

function buildBrinjal(ctx) {
  const { random } = ctx
  const plot = { width: 10, depth: 14 }
  const { spots } = ridgeField(ctx, plot, { pitch: 0.9, gap: 0.65 })
  const variants = [0, 1, 2].map(() => {
    const v = bushVariant(random, { height: random.range(0.8, 0.98), spread: 0.42, trunk: 0.28, primaries: 3, secondaries: 2, stemRadius: 0.011, leafEvery: 0.1, makeLeaf: brinjalLeaf, fruitChance: 0.3, flowerChance: 0.3, fruitDrop: 0.01 })
    v.slots.fruit.forEach((s) => { s.kind = Math.floor(random() * 3) })
    v.slots.cap = v.slots.fruit
    return v
  })
  const fruits = [brinjalFruit(random, true), brinjalFruit(random, true), brinjalFruit(random, false)]
  const violet = flower({ petals: 6, length: 0.022, width: 0.018, rise: 0.15, droop: 0.5, cup: 0.25, center: 0.0035, centerColor: '#f0c838', cone: 0.012, coneColor: '#f2cc3a', petal: ['#ffffff', '#ffffff'], random })
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#628f45'], [0.5, '#4d7c3a'], [1, '#5a7d3c']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.12, flutter: 0.012, refHeight: 0.9, ground: 0 }, scale: bushScale,
    layers: { stems: { color: (c, g, entry) => tone(ramp(c, g, [[0, '#5f7044'], [0.4, '#5e4a5a'], [1, '#574455']]), entry) }, leaves: { color: leafColor, materialOptions: { roughness: 0.82 } } },
    organs: {
      fruit: { geometries: fruits.map((f) => f.fruit), scale: (g) => smooth(0.44, 0.7, g), materialOptions: { roughness: 0.22, metalness: 0.04 }, color: (c, g, o) => tone(ramp(c, g, [[0.44, '#7a4c88'], [0.6, '#4d2457'], [1, '#3a1740']]), o) },
      cap: { geometries: fruits.map((f) => f.cap), scale: (g) => smooth(0.4, 0.55, g), color: (c, g, o) => tone(c.set('#6a8a44'), o) },
      flower: { geometries: [violet], scale: flowerLife(0.3, 0.88), color: (c, g, o) => tone(c.set('#a37fd0'), o) },
    },
  })
  return { plot: { ...plot, rowGap: 0.9 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.8, back: 2.1, targetY: 0.45 }) }
}

/* ---------------------------------------------------------------- chillies and capsicum */
function chilliPod(random, { length = 0.085, radius = 0.0075, curl = 0.25 }) {
  const bend = random.gauss() * curl
  const points = [V(), V(0.002, -0.012, 0)]
  for (let k = 1; k <= 4; k += 1) {
    const t = k / 4
    points.push(V(0.003 + bend * length * t * t, -0.012 - length * t, bend * 0.3 * length * t))
  }
  const pod = stem(points, (t) => (t < 0.18 ? lerp(0.0016, radius, smooth(0.08, 0.18, t)) : radius * Math.pow(1 - (t - 0.18) / 0.82, 0.7) + 0.0008), { radial: 6, tubular: 9, colorFn: (c, x, y) => c.setScalar(y > -0.014 ? 0.6 : 0.92) })
  return pod
}

function kingChilliPod(random) {
  const length = random.range(0.065, 0.08)
  const radius = 0.017
  const pod = lathe((t) => radius * (t < 0.1 ? smooth(0, 0.1, t) * 0.8 + 0.2 : Math.pow(1 - (t - 0.1) / 0.9, 0.75)) + 0.001, length, {
    radial: 9, rows: 9,
    warp: (v, t, phi) => {
      const k = 1 + 0.16 * Math.sin(phi * 5 + t * 9) * Math.sin(t * 14) + 0.08 * Math.cos(phi * 3)
      v.x *= k
      v.z *= k
      v.x += 0.01 * t * t
    },
    colorFn: (c, x, y) => c.setScalar(y > -0.006 ? 0.55 : 0.88 + 0.12 * noise2(x * 400, y * 300)),
  })
  pod.translate(0, -0.012, 0)
  return merge([pod, tube([V(), V(0.002, -0.007, 0), V(0, -0.014, 0)], 0.0022, 0.003, { radial: 4, tubular: 2, color: '#6a6a6a' })])
}

function capsicumFruit(random) {
  const radius = random.range(0.038, 0.045)
  const length = radius * 2.1
  const body = lathe((t) => radius * Math.pow(Math.sin(Math.PI * Math.min(0.999, t)), 0.28) * (t > 0.85 ? lerp(1, 0.75, (t - 0.85) / 0.15) : 1), length, {
    radial: 16, rows: 10,
    warp: (v, t, phi) => {
      const k = 1 + (0.05 + 0.12 * t) * Math.cos(4 * phi)
      v.x *= k
      v.z *= k
      if (t > 0.88) v.y += 0.18 * radius * Math.pow((t - 0.88) / 0.12, 2) * (1 - Math.cos(4 * phi)) * 0.5
    },
    colorFn: (c, x, y) => c.setScalar(0.84 + 0.16 * Math.min(1, -y / radius)),
  })
  body.translate(0, -0.02, 0)
  const stalk = tube([V(), V(0.003, -0.01, 0), V(0, -0.024, 0)], 0.004, 0.0055, { radial: 5, tubular: 3, color: '#4a6b2c' })
  return merge([body, stalk])
}

function smallLeaf(size, { width = 0.36, shape = 'lance', rise = [0.5, 0.9], droop = [0.5, 0.9], petiole = 0.15, wave = 0 } = {}) {
  return (random, t, tip) => {
    const s = (tip ? 0.55 : lerp(1, 0.7, t)) * random.range(0.85, 1.12) * size
    return leaf({ length: s, width: s * width, shape, rise: tip ? 1.1 : random.range(rise[0], rise[1]), droop: random.range(droop[0], droop[1]), segments: 4, across: 1, cup: 0.25, petiole, wave, waves: 1.5, random })
  }
}

const whiteFlower = (random, size = 1) => flower({ petals: 5, length: 0.011 * size, width: 0.007 * size, rise: 0.25, droop: 0.4, cup: 0.15, center: 0.0022 * size, centerColor: '#cfc89a', cone: 0.004 * size, coneColor: '#b9a6d6', petal: ['#f2f2ea', '#ffffff'], random })

function buildChilli(ctx, king = false) {
  const { random } = ctx
  const plot = king ? { width: 10, depth: 13 } : { width: 9, depth: 12 }
  const height = king ? 1.1 : 0.62
  const { spots } = ridgeField(ctx, plot, { pitch: king ? 1.0 : 0.75, gap: king ? 0.7 : 0.45 })
  const variants = [0, 1, 2].map(() => {
    const v = bushVariant(random, {
      height: height * random.range(0.9, 1.08), spread: king ? 0.45 : 0.3, trunk: king ? 0.3 : 0.25, primaries: 3, secondaries: king ? 3 : 2,
      stemRadius: king ? 0.012 : 0.007, leafEvery: king ? 0.06 : 0.032,
      makeLeaf: smallLeaf(king ? 0.13 : 0.075, { width: king ? 0.46 : 0.34, shape: 'ovate' }), fruitChance: king ? 0.35 : 0.45, flowerChance: 0.16,
    })
    if (king) v.slots.fruit.forEach((s) => { s.offset += random.gauss() * 0.03 })
    return v
  })
  if (king) spots.forEach((spot) => { spot.kind = random() < 0.35 ? 1 : 0 })
  const pods = king ? [kingChilliPod(random), kingChilliPod(random), kingChilliPod(random)] : [chilliPod(random, {}), chilliPod(random, { length: 0.075 }), chilliPod(random, { length: 0.095, curl: 0.4 })]
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#5f9440'], [0.5, '#3f7a2f'], [0.88, '#4a7a33'], [1, '#6b7f38']]), entry)
  const podColor = king
    ? (c, g, o) => tone(ramp(c, g, o.kind ? [[0.45, '#6f9a3c'], [0.66, '#5e8a33'], [0.76, '#d38a2a'], [0.86, '#e2651f'], [1, '#d4541c']] : [[0.45, '#6f9a3c'], [0.66, '#5e8a33'], [0.76, '#c8502a'], [0.86, '#c42a1c'], [1, '#a8201a']]), o)
    : (c, g, o) => tone(ramp(c, g, [[0.45, '#6a9a3a'], [0.62, '#3f7d2c'], [0.74, '#3d7a2a'], [0.82, '#8c4a22'], [0.88, '#bf2a1c'], [1, '#a11d17']]), o)
  grow(ctx, {
    spots, variants, wind: { strength: 0.14, flutter: 0.014, refHeight: height, ground: 0 }, scale: bushScale,
    layers: { stems: { color: leafColor }, leaves: { color: leafColor, materialOptions: { roughness: 0.62 } } },
    organs: {
      fruit: { geometries: pods, jitter: 0.05, scale: (g) => smooth(0.42, 0.62, g), materialOptions: { roughness: 0.28, metalness: 0.03 }, color: podColor },
      flower: { geometries: [whiteFlower(random, king ? 1.6 : 1.4)], scale: flowerLife(0.3, 0.74), color: (c, g, o) => tone(c.set('#ffffff'), o) },
    },
  })
  return { plot: { ...plot, rowGap: king ? 1.0 : 0.75 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, king ? { height: 2.0, back: 2.2, targetY: 0.6 } : { height: 1.55, back: 1.8, targetY: 0.3 }) }
}

function buildCapsicum(ctx) {
  const { random, quality } = ctx
  const plot = { width: 9.6, depth: 16 }
  const bedHeight = 0.2
  const layout = beds(plot.width, { pitch: 1.6, top: 0.9, height: bedHeight, slope: 0.14 })
  polyhouse(ctx, { ...plot, layout, mulch: { centers: layout.centers, width: 1.1, color: '#2a2a29' } })
  const xs = bedRows(layout, [-0.25, 0.25])
  const spots = spotsAlong(xs, plot.depth - 1.0, 0.4 / Math.sqrt(quality), random, { y: bedHeight + 0.01, jitterX: 0.015, jitterZ: 0.06, stagger: true })
  layout.centers.forEach((center, index) => spots.forEach((spot) => { if (Math.abs(spot.x - center) < 0.5) spot.kind = index % 3 === 1 ? 1 : 0 }))
  const variants = [0, 1, 2].map(() => bushVariant(random, {
    height: random.range(0.56, 0.68), spread: 0.32, trunk: 0.3, primaries: 2, secondaries: 2, stemRadius: 0.011, leafEvery: 0.065,
    makeLeaf: smallLeaf(0.12, { width: 0.5, shape: 'ovate', rise: [0.4, 0.7] }), fruitChance: 0.22, flowerChance: 0.25, fruitDrop: 0.012,
  }))
  const fruits = [capsicumFruit(random), capsicumFruit(random)]
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#5f9440'], [0.5, '#3e7a2e'], [1, '#447a30']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.03, flutter: 0.006, refHeight: 0.65, ground: 0 }, scale: bushScale,
    layers: { stems: { color: leafColor }, leaves: { color: leafColor, materialOptions: { roughness: 0.5 } } },
    organs: {
      fruit: {
        geometries: fruits, jitter: 0.03, scale: (g) => smooth(0.4, 0.66, g), materialOptions: { roughness: 0.2, metalness: 0.04 },
        color: (c, g, o) => tone(ramp(c, g, o.kind === 1
          ? [[0.4, '#5e8f34'], [0.66, '#3f7a2c'], [0.74, '#8a9a2c'], [0.82, '#e6b81e'], [1, '#f0c419']]
          : [[0.4, '#5e8f34'], [0.66, '#3f7a2c'], [0.74, '#6e5a26'], [0.82, '#c3231a'], [1, '#b01a16']]), o),
      },
      flower: { geometries: [whiteFlower(random, 1.9)], scale: flowerLife(0.3, 0.66), color: (c, g, o) => tone(c.set('#ffffff'), o) },
    },
  })
  return {
    plot, soil: 'none', bund: false, scarecrow: false,
    camera: { position: V(1.4, 1.65, plot.depth / 2 + 0.8), target: V(-1.4, 0.45, 2.0) },
  }
}

/* ---------------------------------------------------------------- okra */
function okraPod(random) {
  const length = random.range(0.12, 0.14)
  const radius = 0.0115
  const pod = lathe((t) => radius * Math.min(1, t * 7) * Math.pow(1 - t, 0.55) + 0.0006, length, {
    radial: 8, rows: 6, warp: ribs(5, 0.16, (t) => smooth(0.05, 0.2, t)),
    colorFn: (c, x, y) => c.setScalar(y > -0.012 ? 0.75 : 0.92 + 0.08 * Math.sin(y * 300)),
  })
  pod.rotateX(Math.PI)
  return pod
}

function okraFlower(random) {
  const f = flower({
    petals: 5, length: 0.05, width: 0.05, rise: 0.75, droop: 0.65, cup: 0.25, segments: 3, across: 1, center: 0.006, centerColor: '#6e1a2a', cone: 0.018, coneColor: '#f0e2a0',
    petalFn: (c, t) => c.set(t < 0.22 ? '#6a1626' : '#f6dc4c'), random,
  })
  return f
}

function okraVariant(random) {
  const height = random.range(1.1, 1.45)
  const stems = []
  const leaves = []
  const pods = []
  const flowers = []
  const points = [V(), V(random.gauss() * 0.02, height * 0.5, random.gauss() * 0.02), V(random.gauss() * 0.04, height, random.gauss() * 0.04)]
  stems.push(stem(points, (t) => lerp(0.014, 0.004, t), { radial: 6, tubular: 6, colorFn: shade(0.7, 1) }))
  const curve = new THREE.CatmullRomCurve3(points)
  const nodes = 15
  let az = random() * TAU
  for (let k = 0; k < nodes; k += 1) {
    const t = 0.06 + (k / nodes) * 0.9
    const at = curve.getPointAt(t)
    az += 2.5 + random.gauss() * 0.15
    const size = lerp(1.15, 0.5, t) * random.range(0.9, 1.1)
    const petiole = lerp(0.2, 0.07, t)
    const end = at.clone().add(out(az, petiole * 0.85)).add(V(0, petiole * lerp(0.35, 0.6, t), 0))
    stems.push(stem([at, at.clone().lerp(end, 0.5).add(V(0, 0.01, 0)), end], (s) => lerp(0.003, 0.0018, s), { radial: 3, tubular: 3, colorFn: shade(0.75, 1) }))
    leaves.push(put(palmLeaf({ lobes: 5, spread: 2.3, length: 0.15 * size, width: 0.09 * size, shape: 'ovate', rise: lerp(0.0, 0.35, t), droop: 0.55, segments: 3, across: 2, cup: -0.06, wave: 0.15, waves: 2, sideScale: 0.35, random }), end, az))
    if (t > 0.4 && t < 0.93) {
      // nodes open one after another up the stem: a flower, then a pod
      const h = at.y / height
      const dir = out(az + random.gauss() * 0.3, 0.35).add(V(0, 1, 0))
      pods.push(slot(at.clone().add(out(az, 0.008)), quatDir(dir, random() * TAU), { h, offset: 0.55 * (0.55 - h) }))
      flowers.push(slot(at.clone().add(out(az, 0.012)), quatDir(out(az, 0.8).add(V(0, 1, 0)), random() * TAU), { h, offset: 0.55 * (0.55 - h) }))
    }
  }
  const top = points[2]
  for (let k = 0; k < 3; k += 1) leaves.push(put(palmLeaf({ lobes: 3, spread: 1.6, length: 0.05, width: 0.03, shape: 'ovate', rise: 1.0, droop: 0.4, segments: 3, across: 1, random }), top, az + k * 2.1))
  return { stems: merge(stems), leaves: merge(leaves), slots: { pod: pods, flower: flowers } }
}

function buildOkra(ctx) {
  const { random } = ctx
  const plot = { width: 10, depth: 13 }
  const { spots } = ridgeField(ctx, plot, { pitch: 0.6, gap: 0.4, height: 0.1 })
  const variants = [0, 1, 2].map(() => okraVariant(random))
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#6a9c45'], [0.5, '#4f8a38'], [0.9, '#5a8a3a'], [1, '#7a8a40']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.16, flutter: 0.016, refHeight: 1.3, ground: 0 },
    scale: (g) => {
      const w = lerp(0.25, 1, smooth(0, 0.45, g))
      return [w, lerp(0.08, 1, smooth(0, 0.62, g)), w]
    },
    layers: { stems: { color: (c, g, entry) => tone(ramp(c, g, [[0, '#6f9448'], [0.5, '#6a7a44'], [1, '#6f6a40']]), entry) }, leaves: { color: leafColor, materialOptions: { roughness: 0.8 } } },
    organs: {
      pod: { geometries: [okraPod(random), okraPod(random)], scale: (g) => smooth(0.43, 0.56, g), color: (c, g, o) => tone(ramp(c, g, [[0.44, '#8ab84e'], [0.6, '#6fa040'], [1, '#689a3c']]), o) },
      flower: { geometries: [okraFlower(random), okraFlower(random)], scale: (g) => smooth(0.34, 0.38, g) * (1 - smooth(0.44, 0.47, g)), color: (c, g, o) => tone(c.set('#ffffff'), o) },
    },
  })
  return { plot: { ...plot, rowGap: 0.6 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 2.05, back: 2.2, targetY: 0.7 }) }
}

/* ---------------------------------------------------------------- zucchini */
function zucchiniFruit(random) {
  const length = random.range(0.19, 0.23)
  const radius = 0.026
  const body = lathe((t) => (t > 0.99 ? 0 : radius * (t < 0.06 ? 0.45 + t * 6 : 1) * Math.pow(Math.sin(Math.PI * (0.5 + t * 0.5)), 0.22) * lerp(0.85, 1.05, t)), length, {
    radial: 10, rows: 10,
    colorFn: (c, x, y, z) => c.setScalar(0.82 + 0.22 * (noise2(x * 500 + y * 90, z * 500) > 0.78 ? 1 : 0) + 0.06 * Math.cos(Math.atan2(z, x) * 5)),
  })
  body.translate(0, -0.015, 0)
  return merge([body, tube([V(), V(0, -0.016, 0)], 0.008, 0.009, { radial: 6, tubular: 1, color: '#9aa070' })])
}

function zucchiniVariant(random) {
  const stems = []
  const leaves = []
  const fruit = []
  const flowers = []
  const crown = V(0, 0.04, 0)
  const count = 17
  for (let k = 0; k < count; k += 1) {
    const az = k * 2.4 + random.gauss() * 0.2
    const young = k / count
    const length = random.range(0.34, 0.46) * lerp(1, 0.7, young)
    const el = lerp(0.5, 1.05, young) + random.gauss() * 0.1
    const end = crown.clone().add(out(az, Math.cos(el) * length)).add(V(0, Math.sin(el) * length, 0))
    stems.push(stem([crown, crown.clone().lerp(end, 0.5).add(V(0, 0.03, 0)), end], (t) => lerp(0.0065, 0.0045, t), { radial: 5, tubular: 4, colorFn: shade(0.8, 1.05) }))
    const size = lerp(1, 0.75, young) * random.range(0.9, 1.1)
    leaves.push(put(palmLeaf({
      lobes: 5, spread: 2.5, length: 0.25 * size, width: 0.2 * size, shape: 'ovate', rise: random.range(-0.2, 0.15), droop: 0.35, segments: 5, across: 2, cup: 0.12, wave: 0.12, waves: 2.5, sideScale: 0.3,
      colorFn: (c, t, u) => c.setScalar(0.8 + 0.2 * t).multiplyScalar(Math.abs(u) < 0.2 || (t > 0.25 && t < 0.5 && Math.abs(u) < 0.6) ? 1.22 : 1), random,
    }), end, az))
  }
  for (let k = 0; k < 3; k += 1) {
    const az = random() * TAU
    fruit.push(slot(crown.clone().add(out(az, 0.03)), quatDir(out(az, 1).add(V(0, -0.18, 0)).negate(), random() * TAU), { h: 0.1, offset: k * 0.06 }))
  }
  for (let k = 0; k < 3; k += 1) {
    const az = random() * TAU
    flowers.push(slot(crown.clone().add(out(az, 0.06)).add(V(0, 0.08, 0)), quatDir(out(az, 0.7).add(V(0, 1, 0)), random() * TAU), { offset: k * 0.05 - 0.04 }))
  }
  return { stems: merge(stems), leaves: merge(leaves), slots: { fruit, flower: flowers } }
}

function buildZucchini(ctx) {
  const { random } = ctx
  const plot = { width: 10, depth: 13 }
  const { spots } = ridgeField(ctx, plot, { pitch: 0.95, gap: 0.55, height: 0.12 })
  const variants = [0, 1, 2].map(() => zucchiniVariant(random))
  const trumpet = flower({ petals: 5, length: 0.065, width: 0.05, rise: 1.05, droop: 0.9, cup: 0.35, segments: 4, across: 2, center: 0.007, centerColor: '#e8b21e', cone: 0.02, coneColor: '#f0c22a', petal: ['#f0b51c', '#ffd640'], random })
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#6c9c48'], [0.5, '#4c8038'], [0.9, '#557f3a'], [1, '#7c8a42']]), entry)
  grow(ctx, {
    spots, variants, wind: { strength: 0.1, flutter: 0.02, refHeight: 0.5, ground: 0 },
    scale: (g) => {
      const w = lerp(0.15, 1, smooth(0, 0.5, g))
      return [w, lerp(0.15, 1, smooth(0, 0.55, g)), w]
    },
    layers: { stems: { color: leafColor }, leaves: { color: leafColor, materialOptions: { roughness: 0.78 } } },
    organs: {
      fruit: { geometries: [zucchiniFruit(random), zucchiniFruit(random)], scale: (g) => smooth(0.5, 0.74, g), materialOptions: { roughness: 0.25, metalness: 0.04 }, color: (c, g, o) => tone(ramp(c, g, [[0.5, '#5f8a3a'], [0.62, '#34522a'], [1, '#2b4524']]), o) },
      flower: { geometries: [trumpet], scale: flowerLife(0.4, 0.84), color: (c, g, o) => tone(c.set('#ffffff'), o) },
    },
  })
  return { plot: { ...plot, rowGap: 0.95 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 1.7, back: 1.8, targetY: 0.2 }) }
}

/* ---------------------------------------------------------------- french bean (A-frame poles) */
function trifoliate(random, size) {
  const parts = [tube([V(), V(0, 0.02, 0.03), V(0, 0.01, 0.06 * size)], 0.0018, 0.0012, { radial: 3, tubular: 3, color: '#c8c8c8' })]
  const tip = V(0, 0.01, 0.06 * size)
  for (let k = -1; k <= 1; k += 1) {
    const geometry = leaf({ length: 0.085 * size, width: 0.065 * size, shape: 'ovate', rise: -0.1, droop: 0.6, segments: 4, across: 2, cup: 0.12, random })
    put(geometry, tip, k * 1.25 + random.gauss() * 0.1)
    parts.push(geometry)
  }
  return merge(parts)
}

function beanPod(random) {
  const length = random.range(0.12, 0.15)
  const bend = random.gauss() * 0.05 + 0.05
  const points = Array.from({ length: 6 }, (_, k) => {
    const t = k / 5
    return V(bend * length * t * t, -length * t, 0)
  })
  return stem(points, (t) => (t < 0.08 ? 0.003 : 0.0052 * Math.pow(Math.sin(Math.PI * Math.min(0.97, t * 0.92 + 0.05)), 0.25)), { radial: 5, tubular: 8, colorFn: shade(0.82, 1) })
}

function beanCluster(random) {
  const parts = [tube([V(), V(0, -0.01, 0.02)], 0.0014, 0.0012, { radial: 3, tubular: 1, color: '#c0c0c0' })]
  for (let k = 0; k < 3; k += 1) {
    const pod = beanPod(random)
    transform(pod, { rotation: [random.gauss() * 0.25, random() * TAU, random.gauss() * 0.25] })
    pod.translate(random.gauss() * 0.01, -0.012, 0.02 + random.gauss() * 0.01)
    parts.push(pod)
  }
  return merge(parts)
}

function beanVariant(random, lean, stickHeight) {
  const stems = []
  const leaves = []
  const pods = []
  const flowers = []
  const height = stickHeight * random.range(0.88, 0.98)
  const turns = random.range(3.5, 4.5)
  const points = Array.from({ length: 28 }, (_, k) => {
    const t = k / 27
    const y = t * height
    return V(Math.tan(lean) * y + Math.cos(t * turns * TAU) * 0.014, y, Math.sin(t * turns * TAU) * 0.014)
  })
  stems.push(stem(points, (t) => lerp(0.0042, 0.0022, t), { radial: 4, tubular: 40, colorFn: shade(0.75, 1) }))
  const curve = new THREE.CatmullRomCurve3(points)
  for (let y = 0.15; y < height; y += 0.13) {
    const t = y / height
    const at = curve.getPointAt(t)
    const az = random() * TAU
    leaves.push(put(trifoliate(random, lerp(1.1, 0.7, t) * random.range(0.85, 1.1)), at, az))
    if (t > 0.25 && t < 0.92 && random() < 0.8) {
      const h = t
      pods.push(slot(at.clone().add(out(az + 1.5, 0.01)), quatDir(V(random.gauss() * 0.2, 1, random.gauss() * 0.2), az + Math.PI), { h, offset: 0.12 * (0.5 - h) }))
      flowers.push(slot(at.clone().add(out(az - 1.5, 0.012)), quatDir(out(az - 1.5, 1).add(V(0, 0.3, 0)), random() * TAU), { h, offset: 0.12 * (0.5 - h) }))
    }
  }
  return { stems: merge(stems), leaves: merge(leaves), slots: { pod: pods, flower: flowers } }
}

function buildFrenchBean(ctx) {
  const { random, quality } = ctx
  const plot = { width: 10, depth: 12 }
  const pairGap = 0.6
  const layout = beds(plot.width, { pitch: 1.5, top: 0.8, height: 0.1, slope: 0.15 })
  shapedSoil(ctx, plot, { h: layout.h, seed: 31 })
  const stickHeight = 1.95
  const lean = Math.atan2(pairGap / 2 + 0.03, stickHeight + 0.08)
  const left = [0, 1, 2].map(() => beanVariant(random, lean, stickHeight))
  const spots = []
  const sticks = []
  const gap = 0.3 / Math.sqrt(quality)
  layout.centers.forEach((center) => {
    for (const side of [-1, 1]) {
      for (let z = -plot.depth / 2 + 0.3; z < plot.depth / 2 - 0.25; z += gap) {
        if (random() < 0.02) continue
        const x = center + (side * pairGap) / 2
        const zz = z + random.gauss() * 0.02
        spots.push({ x, z: zz, y: 0.095, yaw: side < 0 ? 0 : Math.PI, tilt: [0, 0], variant: Math.floor(random() * 3), s: random.range(0.92, 1.06) })
        sticks.push(bamboo(V(x, 0.02, zz), V(center - side * 0.03, stickHeight + 0.1, zz), 0.007, { color: '#9c8459', radial: 4, node: 0.4 }))
      }
    }
    sticks.push(bamboo(V(center, stickHeight - 0.02, -plot.depth / 2 + 0.2), V(center, stickHeight - 0.02, plot.depth / 2 - 0.2), 0.016))
  })
  const leafColor = (c, g, entry) => tone(ramp(c, g, [[0, '#6aa046'], [0.5, '#4d8a37'], [0.9, '#548a3a'], [1, '#86904a']]), entry)
  grow(ctx, {
    spots, variants: left, wind: { strength: 0.06, flutter: 0.016, refHeight: 1.9, ground: 0 },
    scale: (g) => lerp(0.08, 1, smooth(0, 0.6, g)),
    layers: { stems: { color: leafColor }, leaves: { color: leafColor, materialOptions: { roughness: 0.75 } } },
    organs: {
      pod: { geometries: [beanCluster(random), beanCluster(random)], scale: (g) => smooth(0.5, 0.68, g), color: (c, g, o) => tone(ramp(c, g, [[0.5, '#8cc05a'], [0.66, '#74ad46'], [0.92, '#7aa84a'], [1, '#a0a656']]), o) },
      flower: { geometries: [flowerCluster(random, { count: 3, petals: 5, length: 0.012, petalWidth: 0.01, color: '#f6f4ec', reach: 0.025, centerColor: '#dfe6c8', cone: 0 })], scale: flowerLife(0.36, 0.7), color: (c, g, o) => tone(c.set('#ffffff'), o) },
    },
  })
  rigid(ctx, sticks, { roughness: 0.85 })
  return { plot: { ...plot, rowGap: 1.5 }, soil: 'none', scarecrow: true, camera: cornerCamera(plot, { height: 2.0, back: 2.3, targetY: 0.85 }) }
}

/* ---------------------------------------------------------------- exports */
export const fruiting = {
  tomato: buildTomato,
  'cherry-tomato': buildCherryTomato,
  brinjal: buildBrinjal,
  chilli: (ctx) => buildChilli(ctx, false),
  'king-chilli': (ctx) => buildChilli(ctx, true),
  capsicum: buildCapsicum,
  okra: buildOkra,
  zucchini: buildZucchini,
  'french-bean': buildFrenchBean,
}
