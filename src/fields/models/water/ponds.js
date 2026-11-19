// Pond crops: makhana, singhara, lotus and the village fish pond, all built on the shared pond.
import * as THREE from 'three'
import { blade, ellipsoid, item, lerp, merge, prep, smooth, transform, tube } from '../../geometry.js'
import { V, ramp, tone, windMaterials } from '../../crops.js'
import { buildPond, noise, pondMesh, pondPart, waterSpots } from './pond.js'

const tmp = new THREE.Color()
const TAU = Math.PI * 2
const pondCamera = () => ({ position: V(10.0, 2.7, 13.0), target: V(0.2, -0.6, 1.2) })

// A flat disc built as a polar grid; heightFn(rr, phi) gives y, colorFn colours vertices.
// Returns the inner surface and the outer rim band as separate geometries (split at rimFrom).
function polarLeaf({ radius, segA, segR, heightFn, shadeFn, edgeFn = () => 1, rimFrom = 2 }) {
  const positions = [0, heightFn(0, 0), 0]
  const c0 = shadeFn(0, 0)
  const colors = [c0, c0, c0]
  const ringStart = (ring) => 1 + (ring - 1) * segA
  let rimRing = segR + 1
  for (let ring = 1; ring <= segR; ring += 1) {
    const rr = ring / segR
    if (rr >= rimFrom - 1e-6 && rimRing > segR) rimRing = ring
    for (let a = 0; a < segA; a += 1) {
      const phi = (a / segA) * TAU
      const r = radius * rr * edgeFn(phi)
      const shadeValue = shadeFn(rr, phi)
      positions.push(Math.cos(phi) * r, heightFn(rr, phi), Math.sin(phi) * r)
      colors.push(shadeValue, shadeValue, shadeValue)
    }
  }
  const quads = (list, ring) => {
    for (let a = 0; a < segA; a += 1) {
      const i0 = ringStart(ring) + a
      const i1 = ringStart(ring) + ((a + 1) % segA)
      const o0 = ringStart(ring + 1) + a
      const o1 = ringStart(ring + 1) + ((a + 1) % segA)
      list.push(i0, i1, o0, i1, o1, o0)
    }
  }
  const surface = []
  const rim = []
  for (let a = 0; a < segA; a += 1) surface.push(0, ringStart(1) + ((a + 1) % segA), ringStart(1) + a)
  for (let ring = 1; ring < segR; ring += 1) quads(ring + 1 <= rimRing ? surface : rim, ring)
  const make = (indices) => {
    if (!indices.length) return null
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return prep(geometry)
  }
  return { surface: make(surface), rim: make(rim) }
}

/* ================================================================ makhana */
function makhanaLeaf(random, quality) {
  const radius = 0.62
  const veins = 16
  const seed = random() * 10
  const pucker = (rr, phi) => {
    const r = rr * radius
    const vp = ((phi * veins) / TAU) % 1
    const rp = ((r + 0.02) / 0.092) % 1
    return Math.sin(Math.PI * vp) * Math.sin(Math.PI * rp)
  }
  return polarLeaf({
    radius,
    segA: quality < 0.8 ? 48 : 64,
    segR: quality < 0.8 ? 16 : 22,
    rimFrom: 0.88,
    edgeFn: (phi) => 1 + 0.022 * Math.sin(phi * 4 + seed) + 0.01 * Math.sin(phi * 9 + seed * 2),
    heightFn: (rr, phi) => {
      const quilt = 0.017 * pucker(rr, phi) * smooth(0.05, 0.2, rr) * (1 - 0.5 * smooth(0.88, 1, rr))
      const lip = Math.pow(smooth(0.86, 1, rr), 1.6) * 0.045 * (0.55 + 0.45 * Math.sin(phi * 3 + seed))
      return 0.004 + quilt + lip
    },
    shadeFn: (rr, phi) => {
      const p = pucker(rr, phi)
      return (0.66 + 0.36 * p) * (0.94 + 0.08 * Math.sin(phi * 2 + seed + rr * 5)) * (rr < 0.04 ? 0.85 : 1)
    },
  })
}

function makhanaBud(random) {
  const parts = []
  const lean = V(random.gauss() * 0.03, 0, random.gauss() * 0.03)
  const top = V(lean.x, 0.11, lean.z)
  parts.push(tube([V(0, -0.2, 0), V(lean.x * 0.4, 0.0, lean.z * 0.4), top], 0.0075, 0.0065, { radial: 5, tubular: 4, color: '#6f6a48' }))
  // prickly calyx
  parts.push(transform(ellipsoid(0.021, 0.028, 0.021, { widthSegments: 8, heightSegments: 6, colorFn: (c, x, y) => c.set('#5e7a3a').lerp(tmp.set('#6a4a52'), Math.max(0, y / 0.028) * 0.35) }), { position: [top.x, top.y + 0.018, top.z] }))
  for (let index = 0; index < 16; index += 1) {
    const a = random() * TAU
    const el = random.range(-0.9, 0.9)
    const dir = V(Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a))
    const spine = prep(new THREE.ConeGeometry(0.0022, 0.012, 3), '#c9c2a0')
    spine.translate(0, 0.006, 0)
    const base = V(top.x + dir.x * 0.02, top.y + 0.018 + dir.y * 0.026, top.z + dir.z * 0.02)
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir)
    spine.applyMatrix4(new THREE.Matrix4().compose(base, q, V(1, 1, 1)))
    parts.push(spine)
  }
  return { geometry: merge(parts), pivot: V(top.x, top.y + 0.04, top.z) }
}

function makhanaFlower(random, pivot) {
  const parts = []
  for (let index = 0; index < 4; index += 1) {
    const geometry = blade({ length: 0.042, width: 0.034, rise: 0.55, droop: 0.35, segments: 3, fold: -0.35, shape: 'oval', base: '#6f8a44', tip: '#7c5a78' })
    transform(geometry, { rotation: [0, (index / 4) * TAU + 0.4, 0] })
    parts.push(geometry)
  }
  const petals = 18
  for (let index = 0; index < petals; index += 1) {
    const inner = index >= 10
    const geometry = blade({ length: inner ? 0.03 : 0.038, width: inner ? 0.013 : 0.017, rise: inner ? 1.25 : 0.95, droop: -0.3, segments: 3, fold: -0.3, shape: 'oval', base: '#e2c6ee', tip: inner ? '#9a52c2' : '#8a3fb4' })
    transform(geometry, { rotation: [0, index * 2.4 + random.gauss() * 0.1, 0], position: [0, 0.004, 0] })
    parts.push(geometry)
  }
  parts.push(transform(ellipsoid(0.01, 0.006, 0.01, { widthSegments: 6, heightSegments: 3, color: '#d9b84a' }), { position: [0, 0.008, 0] }))
  const geometry = merge(parts)
  geometry.translate(pivot.x, pivot.y - 0.012, pivot.z)
  return geometry
}

function buildMakhana(ctx) {
  const { random, quality } = ctx
  const pond = buildPond(ctx, { waterColor: '#434d2e', wave: 0.007, rippleRate: 1.8 })
  const { shape, waterY } = pond

  // pack the giant leaves with little overlap
  // big leaves first, then smaller (younger) leaves filling the gaps
  const leaves = []
  for (const [attempts, low, high] of [[9000, 0.95, 1.22], [6000, 0.6, 0.95], [5000, 0.32, 0.6]]) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const x = random.range(-shape.halfW, shape.halfW)
      const z = random.range(-shape.halfD, shape.halfD)
      const s = random.range(low, high)
      const r = 0.62 * s
      if (shape.inward(x, z) < 0.95 + r * 0.5) continue
      if (leaves.some((leaf) => Math.hypot(leaf.x - x, leaf.z - z) < (leaf.r + r) * 0.9)) continue
      leaves.push({ x, z, r, s })
    }
  }
  const leafItems = leaves.map((leaf, index) => {
    const entry = item(V(leaf.x, waterY + 0.002 + (index % 7) * 0.0022, leaf.z), random() * TAU, leaf.s, 0, [random.gauss() * 0.01, random.gauss() * 0.01])
    entry.tone = random.gauss() * 0.06
    entry.birth = random() < 0.3 ? random.range(-0.08, 0.02) : random.range(0.02, 0.3)
    entry.death = random.range(0.76, 0.94)
    entry.sinks = random() < 0.7 ? 1 : 0.4
    return entry
  })
  const leafScale = (g, entry) => {
    const grow = smooth(entry.birth, entry.birth + 0.04, g) * lerp(0.2, 1, smooth(entry.birth, entry.birth + 0.3, g))
    const die = 1 - 0.18 * smooth(entry.death, entry.death + 0.08, g) - 0.8 * smooth(entry.death + 0.07, entry.death + 0.16, g) * entry.sinks
    return Math.max(0, grow * die)
  }
  const ageing = (c, g, entry, young, mature) => {
    c.set(young).lerp(tmp.set(mature), smooth(entry.birth + 0.04, entry.birth + 0.2, g))
    c.lerp(tmp.set('#9c8c3c'), smooth(entry.death, entry.death + 0.07, g)).lerp(tmp.set('#5e4a2c'), smooth(entry.death + 0.06, entry.death + 0.14, g))
    return tone(c, entry)
  }
  const leafMats = windMaterials(ctx, { strength: 0.01, flutter: 0, refHeight: 1, ground: waterY }, { roughness: 0.42, metalness: 0.02 })
  const variants = [0, 1, 2].map(() => makhanaLeaf(random, quality))
  variants.forEach((variant, variantIndex) => {
    const items = leafItems.filter((_, index) => index % 3 === variantIndex)
    pondPart(ctx, { geometry: variant.surface, material: leafMats.material, depthMaterial: leafMats.depth, items, scale: leafScale, color: (c, g, entry) => ageing(c, g, entry, '#6a5a3a', '#3f6a2a') })
    pondPart(ctx, { geometry: variant.rim, material: leafMats.material, depthMaterial: leafMats.depth, items, scale: leafScale, color: (c, g, entry) => ageing(c, g, entry, '#7a3a50', '#6e2f55') })
  })

  // purple flowers poking up between and through the leaves
  const flowerCount = Math.round(150 * quality)
  const flowerItems = []
  let guard = 0
  while (flowerItems.length < flowerCount && guard < flowerCount * 40) {
    guard += 1
    const x = random.range(-shape.halfW, shape.halfW)
    const z = random.range(-shape.halfD, shape.halfD)
    if (shape.inward(x, z) < 1.4) continue
    const nearest = leaves.reduce((best, leaf) => Math.min(best, Math.hypot(leaf.x - x, leaf.z - z) / leaf.r), 9)
    if (nearest < 0.75 && random() < 0.75) continue
    const entry = item(V(x, waterY, z), random() * TAU, random.range(0.85, 1.15))
    entry.tone = random.gauss() * 0.06
    entry.t0 = random.range(0.44, 0.74)
    flowerItems.push(entry)
  }
  const budScale = (g, entry) => smooth(entry.t0 - 0.09, entry.t0 - 0.03, g) * (1 - smooth(entry.t0 + 0.15, entry.t0 + 0.22, g))
  const budMats = windMaterials(ctx, { strength: 0.04, flutter: 0.003, refHeight: 0.3, ground: waterY }, { roughness: 0.6 })
  const flowerMats = windMaterials(ctx, { strength: 0.04, flutter: 0.004, refHeight: 0.3, ground: waterY }, { roughness: 0.55 })
  ;[0, 1].forEach((variantIndex) => {
    const bud = makhanaBud(random)
    const items = flowerItems.filter((_, index) => index % 2 === variantIndex)
    pondPart(ctx, { geometry: bud.geometry, material: budMats.material, depthMaterial: budMats.depth, items, scale: budScale, color: (c, g, entry) => tone(c.set('#ffffff').lerp(tmp.set('#b0a080'), smooth(entry.t0 + 0.1, entry.t0 + 0.18, g)), entry) })
    pondPart(ctx, {
      geometry: makhanaFlower(random, bud.pivot), material: flowerMats.material, depthMaterial: flowerMats.depth, items, parent: budScale, pivot: bud.pivot,
      scale: (g, entry) => smooth(entry.t0 - 0.006, entry.t0 + 0.025, g) * (1 - smooth(entry.t0 + 0.09, entry.t0 + 0.12, g)),
      color: (c, g, entry) => tone(c.set('#ffffff'), entry),
    })
  })

  return pond.config({
    camera: pondCamera(),
    update: (g) => pond.setWaterColor(ramp(tmp, g, [[0, '#46502f'], [0.5, '#414c2d'], [0.9, '#464a2e'], [1, '#4a4a30']])),
    tick: (elapsed) => pond.tick(elapsed),
  })
}

/* ================================================================ singhara */
function rhombLeaf(random, length, width) {
  const corner = [-width / 2, length * 0.56]
  const tip = [0, length]
  const points = [[0, 0], [-width * 0.22, length * 0.26], corner]
  const teeth = 5
  const dx = tip[0] - corner[0]
  const dz = tip[1] - corner[1]
  const edge = Math.hypot(dx, dz)
  const nx = -dz / edge
  const nz = dx / edge
  for (let k = 1; k < teeth * 2; k += 1) {
    const t = k / (teeth * 2)
    const out = k % 2 ? 0.0042 : 0
    points.push([corner[0] + dx * t + nx * out + (dx / edge) * out * 0.6, corner[1] + dz * t + nz * out + (dz / edge) * out * 0.6])
  }
  points.push(tip)
  const right = points.slice(1, -1).reverse().map(([x, z]) => [-x, z])
  const outline = [...points, ...right].map(([x, z]) => new THREE.Vector2(x, -z))
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    position.setY(index, 0.012 * Math.pow((2 * x) / width, 2) + 0.004 * (z / length))
  }
  geometry.computeVertexNormals()
  const shadeBase = random.range(0.82, 0.95)
  return prep(geometry, '#ffffff', (c, x, y, z) => c.setScalar(shadeBase * (0.88 + 0.22 * Math.min(1, z / length)) * (Math.abs(x) < 0.003 ? 1.12 : 1)))
}

function singharaRosette(random) {
  const parts = []
  const count = 16
  for (let k = 0; k < count; k += 1) {
    const t = k / (count - 1)
    const az = k * 2.39996 + random.gauss() * 0.1
    const out = V(Math.cos(az), 0, Math.sin(az))
    const reach = lerp(0.012, 0.115, t) * random.range(0.9, 1.1)
    const length = lerp(0.045, 0.078, t) * random.range(0.92, 1.08)
    const leaf = rhombLeaf(random, length, length * 1.18)
    const lift = 0.004 + (1 - t) * 0.014
    transform(leaf, { rotation: [0, Math.PI / 2 - az, 0] })
    leaf.translate(out.x * reach, lift, out.z * reach)
    parts.push(leaf)
    if (t > 0.2) {
      parts.push(tube([V(0, -0.004, 0), out.clone().multiplyScalar(reach * 0.5).add(V(0, -0.002, 0)), out.clone().multiplyScalar(reach).add(V(0, lift - 0.002, 0))], 0.0028, 0.0022, { radial: 3, tubular: 2, color: '#7a6a5a' }))
    }
    if (t > 0.35) {
      // swollen spongy float on the petiole
      const float = ellipsoid(0.0105, 0.008, 0.022, { widthSegments: 5, heightSegments: 3, colorFn: (c, x, y) => c.setScalar(0.72 + Math.max(0, y) * 18) })
      transform(float, { rotation: [0, Math.PI / 2 - az, 0] })
      const at = out.clone().multiplyScalar(reach * 0.55)
      float.translate(at.x, 0.002, at.z)
      parts.push(float)
    }
  }
  return merge(parts)
}

function singharaFlower() {
  const parts = []
  for (let index = 0; index < 4; index += 1) {
    const a = (index / 4) * TAU
    parts.push(transform(ellipsoid(0.011, 0.0025, 0.008, { widthSegments: 6, heightSegments: 3, color: '#f6f4ec' }), { position: [Math.cos(a) * 0.009, 0.026, Math.sin(a) * 0.009], rotation: [0, -a, 0] }))
  }
  parts.push(transform(ellipsoid(0.004, 0.004, 0.004, { widthSegments: 5, heightSegments: 3, color: '#e0c860' }), { position: [0, 0.028, 0] }))
  parts.push(tube([V(0, 0.005, 0), V(0.002, 0.015, 0), V(0, 0.025, 0)], 0.0018, 0.0015, { radial: 3, tubular: 2, color: '#7f9a5a' }))
  return merge(parts)
}

function buildSinghara(ctx) {
  const { random, quality } = ctx
  const pond = buildPond(ctx, { waterColor: '#45502f', wave: 0.008 })
  const { shape, waterY } = pond
  const spots = waterSpots(random, shape, 0.5 / Math.sqrt(quality), 0.95)
  const patches = Array.from({ length: 6 }, () => [random.range(-shape.halfW, shape.halfW) * 0.7, random.range(-shape.halfD, shape.halfD) * 0.7])
  const rosetteItems = spots.map(([x, z], index) => {
    const entry = item(V(x, waterY + 0.003 + (index % 5) * 0.0018, z), random() * TAU, random.range(0.9, 1.25), 0, [random.gauss() * 0.02, random.gauss() * 0.02])
    const distance = patches.reduce((best, [px, pz]) => Math.min(best, Math.hypot(px - x, pz - z)), 99)
    entry.birth = Math.min(0.42, (distance / 9) * 0.36 + random.range(-0.06, 0.05))
    entry.tone = random.gauss() * 0.08
    entry.red = random() * 0.5
    return entry
  })
  const rosetteMats = windMaterials(ctx, { strength: 0.01, flutter: 0, refHeight: 1, ground: waterY }, { roughness: 0.38, metalness: 0.03 })
  const variants = [0, 1, 2].map(() => singharaRosette(random))
  const rosetteScale = (g, entry) => smooth(entry.birth, entry.birth + 0.04, g) * lerp(0.35, 1, smooth(entry.birth, entry.birth + 0.22, g)) * (1 - 0.15 * smooth(0.9, 1, g))
  variants.forEach((geometry, variantIndex) => pondPart(ctx, {
    geometry, material: rosetteMats.material, depthMaterial: rosetteMats.depth,
    items: rosetteItems.filter((_, index) => index % 3 === variantIndex),
    scale: rosetteScale,
    color: (c, g, entry) => {
      ramp(c, g, [[0, '#6c9a3c'], [0.3, '#4f7f30'], [0.6, '#3d6a2a'], [0.76, '#4d5f2a'], [0.9, '#6a5028'], [1, '#6e4a2c']])
      c.lerp(tmp.set('#7fae46'), (1 - smooth(entry.birth, entry.birth + 0.15, g)) * 0.6)
      c.lerp(tmp.set('#7a3a28'), entry.red * smooth(0.6, 0.9, g))
      return tone(c, entry)
    },
  }))

  const flowerItems = rosetteItems.filter(() => random() < 0.45).map((entry) => {
    const flower = item(entry.p.clone(), random() * TAU, entry.s)
    flower.t0 = random.range(0.44, 0.74)
    flower.birth = entry.birth
    flower.tone = random.gauss() * 0.05
    return flower
  })
  const flowerMats = windMaterials(ctx, { strength: 0.01, flutter: 0.002, refHeight: 0.3, ground: waterY }, { roughness: 0.6 })
  pondPart(ctx, {
    geometry: singharaFlower(), material: flowerMats.material, depthMaterial: flowerMats.depth, items: flowerItems, castShadow: false,
    scale: (g, entry) => 1.6 * smooth(entry.t0, entry.t0 + 0.03, g) * (1 - smooth(entry.t0 + 0.08, entry.t0 + 0.11, g)) * smooth(entry.birth + 0.1, entry.birth + 0.15, g),
    color: (c, g, entry) => tone(c.set('#ffffff'), entry),
  })

  return pond.config({
    camera: pondCamera(),
    update: (g) => pond.setWaterColor(ramp(tmp, g, [[0, '#4b5634'], [0.5, '#434f2f'], [1, '#4a4c31']])),
    tick: (elapsed) => pond.tick(elapsed),
  })
}

/* ================================================================ lotus */
function lotusLeaf(random, { radius, cup, wave, segA = 32, segR = 8 }) {
  const seed = random() * 10
  const waves = 5 + Math.floor(random() * 3)
  return polarLeaf({
    radius,
    segA,
    segR,
    rimFrom: 2,
    edgeFn: (phi) => 1 + 0.03 * Math.sin(phi * 3 + seed),
    heightFn: (rr, phi) => cup * radius * Math.pow(rr, 1.7) + wave * radius * Math.pow(rr, 3) * Math.sin(phi * waves + seed) - 0.006 * (1 - smooth(0, 0.15, rr)),
    shadeFn: (rr, phi) => {
      const vein = Math.pow(Math.abs(Math.cos(phi * 10.5)), 24) * smooth(0.08, 0.3, rr) * (1 - rr * 0.5)
      return rr < 0.07 ? 1.08 : (0.8 + 0.08 * rr + vein * 0.2) * (0.96 + 0.06 * Math.sin(phi * 2 + seed))
    },
  }).surface
}

function lotusRaisedLeaf(random) {
  const height = random.range(0.35, 1.05)
  const lean = V(random.gauss() * 0.12, 0, random.gauss() * 0.12)
  const top = V(lean.x, height, lean.z)
  const stalk = tube([V(0, -0.45, 0), V(lean.x * 0.3, height * 0.5, lean.z * 0.3), top], 0.009, 0.007, { radial: 5, tubular: 6, color: '#9a9a80' })
  const leaf = lotusLeaf(random, { radius: random.range(0.26, 0.34), cup: random.range(0.18, 0.32), wave: random.range(0.04, 0.08) })
  transform(leaf, { rotation: [random.range(0.15, 0.5), random() * TAU, 0], order: 'YXZ' })
  leaf.translate(top.x, top.y, top.z)
  return merge([stalk, leaf])
}

function lotusBud() {
  const profile = []
  for (let index = 0; index <= 10; index += 1) {
    const t = index / 10
    profile.push(new THREE.Vector2(Math.max(0.0008, 0.04 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9) * (1 - t * 0.25)), t * 0.12))
  }
  const bud = new THREE.LatheGeometry(profile, 10)
  return prep(bud, '#ffffff', (c, x, y) => c.set('#9cae6a').lerp(tmp.set('#e88aa8'), smooth(0.0, 0.04, y)).lerp(tmp.set('#d2407a'), smooth(0.06, 0.12, y)))
}

function lotusFlower(random) {
  const parts = []
  const whorls = [
    { count: 6, length: 0.12, width: 0.066, rise: 0.62, droop: -0.45, phase: 0 },
    { count: 6, length: 0.11, width: 0.062, rise: 0.95, droop: -0.4, phase: 0.52 },
    { count: 5, length: 0.095, width: 0.056, rise: 1.22, droop: -0.3, phase: 0.2 },
  ]
  whorls.forEach((whorl, whorlIndex) => {
    for (let index = 0; index < whorl.count; index += 1) {
      const geometry = blade({ length: whorl.length * random.range(0.92, 1.06), width: whorl.width, rise: whorl.rise + random.gauss() * 0.06, droop: whorl.droop, segments: 5, fold: -0.45, shape: 'oval', base: '#fbeff0', tip: whorlIndex === 2 ? '#e86a96' : '#df4f84' })
      transform(geometry, { rotation: [0, (index / whorl.count) * TAU + whorl.phase, 0], position: [0, whorlIndex * 0.006, 0] })
      parts.push(geometry)
    }
  })
  const receptacle = prep(new THREE.CylinderGeometry(0.022, 0.013, 0.026, 12), '#d6c24a')
  receptacle.translate(0, 0.02, 0)
  const stamens = prep(new THREE.TorusGeometry(0.026, 0.008, 4, 16), '#f2c437')
  stamens.rotateX(Math.PI / 2)
  stamens.translate(0, 0.022, 0)
  parts.push(receptacle, stamens)
  return merge(parts)
}

function lotusPod(random) {
  const parts = []
  const cone = prep(new THREE.CylinderGeometry(0.05, 0.014, 0.065, 14), '#ffffff', (c, x, y) => c.setScalar(y > 0.03 ? 1 : 0.85))
  cone.translate(0, 0.0325, 0)
  parts.push(cone)
  const rings = [[0, 1], [0.019, 6], [0.036, 11]]
  rings.forEach(([r, n]) => {
    for (let index = 0; index < n; index += 1) {
      const a = (index / n) * TAU + random.gauss() * 0.1
      parts.push(transform(ellipsoid(0.0062, 0.004, 0.0062, { widthSegments: 5, heightSegments: 3, color: '#6c6c5c' }), { position: [Math.cos(a) * r, 0.065, Math.sin(a) * r] }))
    }
  })
  const geometry = merge(parts)
  geometry.rotateX(random.range(0.15, 0.4))
  return geometry
}

function buildLotus(ctx) {
  const { random, quality } = ctx
  const pond = buildPond(ctx, { waterColor: '#434f2f', wave: 0.008 })
  const { shape, waterY } = pond
  const seed = random() * 50
  const stand = (x, z) => noise(x * 0.22 + seed, z * 0.22) * 0.75 + noise(x * 0.6, z * 0.6 + seed) * 0.25

  const raisedItems = waterSpots(random, shape, 0.62 / Math.sqrt(quality), 1.05).filter(([x, z]) => stand(x, z) > 0.4).map(([x, z]) => {
    const entry = item(V(x, waterY, z), random() * TAU, random.range(0.82, 1.18), 0, [random.gauss() * 0.05, random.gauss() * 0.05])
    entry.birth = random.range(0.04, 0.42)
    entry.death = random.range(0.8, 0.95)
    entry.tone = random.gauss() * 0.07
    return entry
  })
  const floatItems = waterSpots(random, shape, 0.85 / Math.sqrt(quality), 1.1).filter(([x, z]) => stand(x, z) > 0.33).map(([x, z], index) => {
    const entry = item(V(x, waterY + 0.004 + (index % 4) * 0.002, z), random() * TAU, random.range(0.75, 1.15), 0, [random.gauss() * 0.02, random.gauss() * 0.02])
    entry.birth = random.range(-0.1, 0.18)
    entry.death = random.range(0.76, 0.92)
    entry.tone = random.gauss() * 0.07
    return entry
  })
  const leafScale = (g, entry) => smooth(entry.birth, entry.birth + 0.04, g) * lerp(0.3, 1, smooth(entry.birth, entry.birth + 0.2, g)) * (1 - 0.25 * smooth(entry.death, entry.death + 0.06, g) - 0.75 * smooth(entry.death + 0.06, entry.death + 0.14, g))
  const leafColor = (c, g, entry) => {
    c.set('#8fa452').lerp(tmp.set('#4f7e48'), smooth(entry.birth + 0.03, entry.birth + 0.15, g))
    c.lerp(tmp.set('#a39046'), smooth(entry.death - 0.04, entry.death + 0.04, g)).lerp(tmp.set('#6a4e2e'), smooth(entry.death + 0.03, entry.death + 0.11, g))
    return tone(c, entry)
  }
  const raisedMats = windMaterials(ctx, { strength: 0.18, flutter: 0.012, refHeight: 1.1, ground: waterY }, { roughness: 0.55 })
  ;[0, 1, 2].forEach((variantIndex) => pondPart(ctx, {
    geometry: lotusRaisedLeaf(random), material: raisedMats.material, depthMaterial: raisedMats.depth,
    items: raisedItems.filter((_, index) => index % 3 === variantIndex), scale: leafScale, color: leafColor,
  }))
  const floatMats = windMaterials(ctx, { strength: 0.01, flutter: 0, refHeight: 1, ground: waterY }, { roughness: 0.5 })
  ;[0, 1].forEach((variantIndex) => pondPart(ctx, {
    geometry: lotusLeaf(random, { radius: random.range(0.2, 0.26), cup: 0.03, wave: 0.02, segA: 28, segR: 6 }), material: floatMats.material, depthMaterial: floatMats.depth,
    items: floatItems.filter((_, index) => index % 2 === variantIndex), scale: leafScale, color: leafColor,
  }))

  // flowers on tall stalks, then seed pods
  const flowerItems = raisedItems.filter(() => random() < 0.26 * Math.min(1, 1 / quality)).slice(0, Math.round(140 * quality)).map((entry) => {
    const flower = item(entry.p.clone().add(V(random.gauss() * 0.15, 0, random.gauss() * 0.15)), random() * TAU, random.range(0.88, 1.12))
    flower.t0 = random.range(0.38, 0.62)
    flower.tone = random.gauss() * 0.05
    return flower
  })
  const stalkScale = (g, entry) => smooth(entry.t0 - 0.16, entry.t0 - 0.09, g) * lerp(0.5, 1, smooth(entry.t0 - 0.16, entry.t0 - 0.03, g))
  const stalkMats = windMaterials(ctx, { strength: 0.2, flutter: 0.008, refHeight: 1.2, ground: waterY }, { roughness: 0.6 })
  const headMats = windMaterials(ctx, { strength: 0.2, flutter: 0.008, refHeight: 1.2, ground: waterY }, { roughness: 0.55 })
  const budGeometry = lotusBud()
  const flowerGeometry = lotusFlower(random)
  ;[0, 1, 2].forEach((variantIndex) => {
    const height = 0.95 + variantIndex * 0.16
    const lean = V(random.gauss() * 0.08, 0, random.gauss() * 0.08)
    const top = V(lean.x, height, lean.z)
    const stalk = tube([V(0, -0.45, 0), V(lean.x * 0.25, height * 0.5, lean.z * 0.25), top], 0.0085, 0.007, { radial: 5, tubular: 6, color: '#ffffff' })
    const items = flowerItems.filter((_, index) => index % 3 === variantIndex)
    pondPart(ctx, { geometry: stalk, material: stalkMats.material, depthMaterial: stalkMats.depth, items, scale: stalkScale, color: (c, g, entry) => tone(ramp(c, g - entry.t0, [[0, '#6f8f45'], [0.25, '#6f8a45'], [0.4, '#8a7a4a']]), entry) })
    const attach = (geometry, scale, color) => {
      const placed = geometry.clone()
      placed.translate(top.x, top.y, top.z)
      pondPart(ctx, { geometry: placed, material: headMats.material, depthMaterial: headMats.depth, items, parent: stalkScale, pivot: top, scale, color })
    }
    attach(budGeometry, (g, entry) => smooth(entry.t0 - 0.12, entry.t0 - 0.06, g) * (1 - smooth(entry.t0 - 0.012, entry.t0 + 0.008, g)), (c, g, entry) => tone(c.set('#ffffff'), entry))
    attach(flowerGeometry, (g, entry) => smooth(entry.t0 - 0.01, entry.t0 + 0.025, g) * (1 - smooth(entry.t0 + 0.1, entry.t0 + 0.13, g)), (c, g, entry) => tone(c.set('#ffffff'), entry))
    attach(lotusPod(random), (g, entry) => smooth(entry.t0 + 0.09, entry.t0 + 0.18, g), (c, g, entry) => tone(ramp(c, g - entry.t0, [[0.1, '#a8b85a'], [0.22, '#7c9a44'], [0.32, '#7e7a40'], [0.42, '#5e4630'], [0.6, '#463424']]), entry))
  })

  const egretSpots = [0.6, 2.2, 4.1].map((theta) => {
    const r = shape.radius(theta) + 0.45
    return V(Math.cos(theta) * r, 0.06, Math.sin(theta) * r)
  })
  ctx.egrets(egretSpots.slice(0, 2), { appear: (g) => g > 0.15 && g < 0.85 })

  return pond.config({
    camera: pondCamera(),
    update: (g) => pond.setWaterColor(ramp(tmp, g, [[0, '#4a5433'], [0.5, '#424e2e'], [1, '#494b31']])),
    tick: (elapsed) => pond.tick(elapsed),
  })
}

/* ================================================================ fish pond */
function fishGeometry() {
  const body = ellipsoid(0.042, 0.058, 0.17, { widthSegments: 10, heightSegments: 8, colorFn: (c, x, y) => c.set('#d8dcd6').lerp(tmp.set('#4f5a52'), smooth(-0.01, 0.045, y)).lerp(tmp.set('#c98a7a'), Math.abs(x) > 0.03 && y < 0 ? 0.15 : 0) })
  const tail = new THREE.BufferGeometry()
  tail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.15, 0, 0.06, -0.26, 0, 0, -0.22, 0, 0, -0.15, 0, 0, -0.22, 0, -0.06, -0.26], 3))
  tail.computeVertexNormals()
  const dorsal = new THREE.BufferGeometry()
  dorsal.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.05, 0.04, 0, 0.09, -0.02, 0, 0.05, -0.06], 3))
  dorsal.computeVertexNormals()
  return merge([body, prep(tail, '#8a6a5a'), prep(dorsal, '#5a5a50')])
}

function dropletsGeometry(random, { count, spread, height, forward }) {
  const parts = []
  for (let index = 0; index < count; index += 1) {
    const t = random()
    const r = random.range(0.006, 0.022) * (1 - t * 0.5)
    const g = new THREE.IcosahedronGeometry(r, 0)
    g.scale(1, 1.4, 1)
    const x = forward ? t * forward + random.gauss() * 0.05 : random.gauss() * spread
    const z = forward ? random.gauss() * spread : random.gauss() * spread
    const y = forward ? Math.sin(Math.PI * Math.min(1, t * 1.1)) * height * random.range(0.5, 1.1) + 0.01 : random() * height
    g.translate(x, y, z)
    parts.push(prep(g, '#ffffff', (c) => c.setScalar(random.range(0.85, 1))))
  }
  return merge(parts)
}

function buildAerator(ctx, random) {
  const group = new THREE.Group()
  const plastic = new THREE.MeshStandardMaterial({ color: '#2f6ea6', roughness: 0.45 })
  const steel = new THREE.MeshStandardMaterial({ color: '#80868a', roughness: 0.5, metalness: 0.6 })
  const motorMat = new THREE.MeshStandardMaterial({ color: '#33506e', roughness: 0.5, metalness: 0.3 })
  const paddleMat = new THREE.MeshStandardMaterial({ color: '#d8d0ae', roughness: 0.55 })
  const spray = new THREE.MeshStandardMaterial({ vertexColors: true, color: '#eef3ee', roughness: 0.25 })
  ctx.disposables.push(plastic, steel, motorMat, paddleMat, spray)
  const add = (geometry, material, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  for (const z of [-0.55, 0.55]) {
    add(new THREE.CapsuleGeometry(0.14, 1.05, 4, 12), plastic, [0, 0.02, z], [0, 0, Math.PI / 2])
    for (const x of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.04, 0.22, 0.04), steel, [x, 0.22, z])
  }
  for (const x of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.045, 0.045, 1.25), steel, [x, 0.34, 0])
  add(new THREE.BoxGeometry(0.66, 0.035, 0.045), steel, [0, 0.34, 0.55])
  add(new THREE.BoxGeometry(0.66, 0.035, 0.045), steel, [0, 0.34, -0.55])
  add(new THREE.BoxGeometry(0.3, 0.24, 0.26), motorMat, [0, 0.5, 0.62])
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), steel, [0, 0.3, 0.6], [Math.PI / 2, 0, 0])
  add(new THREE.CylinderGeometry(0.018, 0.018, 1.2, 8), steel, [0, 0.24, 0], [Math.PI / 2, 0, 0])
  const wheel = new THREE.Group()
  wheel.position.set(0, 0.24, 0)
  group.add(wheel)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.78, 10), steel)
  hub.rotation.x = Math.PI / 2
  wheel.add(hub)
  const paddles = 8
  for (let index = 0; index < paddles; index += 1) {
    const a = (index / paddles) * TAU
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.7), paddleMat)
    paddle.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0)
    paddle.rotation.z = a - Math.PI / 2
    paddle.castShadow = true
    wheel.add(paddle)
  }
  const sprays = [0, 1, 2].map(() => {
    const mesh = new THREE.Mesh(dropletsGeometry(random, { count: 90, spread: 0.3, height: 0.42, forward: 1.1 }), spray)
    mesh.position.set(0.18, -0.02, 0)
    mesh.visible = false
    group.add(mesh)
    return mesh
  })
  const churn = new THREE.Mesh(dropletsGeometry(random, { count: 60, spread: 0.32, height: 0.07 }), spray)
  churn.position.set(0.35, -0.01, 0)
  group.add(churn)
  return { group, wheel, sprays, churn }
}

function bambooPole(height) {
  return tube([V(0, -0.4, 0), V(0.01, height * 0.5, 0), V(0.02, height, 0.01)], 0.03, 0.022, {
    radial: 6, tubular: 8,
    colorFn: (c, x, y) => c.set('#b59d66').multiplyScalar(((y + 0.4) % 0.38) < 0.025 ? 0.7 : 0.95 + 0.08 * Math.sin(y * 13)),
  })
}

function buildNetLine(ctx, shape) {
  const group = new THREE.Group()
  const thetas = []
  for (let index = 0; index < 7; index += 1) thetas.push(Math.PI * 0.86 + index * 0.075)
  const poles = thetas.map((theta, index) => {
    const r = shape.radius(theta) + 0.35
    return { x: Math.cos(theta) * r, z: Math.sin(theta) * r, h: 1.85 + (index % 2) * 0.12 }
  })
  const poleGeometries = poles.map((pole) => {
    const geometry = bambooPole(pole.h)
    geometry.translate(pole.x, 0, pole.z)
    return geometry
  })
  // two extra bamboo poles standing in the water as markers
  ;[[Math.PI * 1.25, 2.2], [Math.PI * 0.35, 3.0]].forEach(([theta, s]) => {
    const r = shape.radius(theta) - s
    const geometry = bambooPole(1.4)
    geometry.translate(Math.cos(theta) * r, -0.5, Math.sin(theta) * r)
    poleGeometries.push(geometry)
  })
  const bambooMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })
  const poleMesh = new THREE.Mesh(merge(poleGeometries), bambooMat)
  poleMesh.castShadow = true
  poleMesh.receiveShadow = true
  group.add(poleMesh)
  // the drag net hung up to dry between the poles: a sagging head rope with floats and a
  // sparse mesh of thin dark nylon strands that stays mostly see-through
  const columns = []
  for (let span = 0; span < poles.length - 1; span += 1) {
    const a = poles[span]
    const b = poles[span + 1]
    const steps = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.14))
    for (let k = span === 0 ? 0 : 1; k <= steps; k += 1) {
      const t = k / steps
      columns.push({ x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), top: lerp(a.h, b.h, t) - 0.08 - Math.sin(Math.PI * t) * 0.24, phase: span * 1.7 + t * 3 })
    }
  }
  const rows = 8
  const knot = (column, row) => {
    const t = row / rows
    const drop = (column.top - 0.35) * t
    // the hanging net bellies out a little and gathers in folds
    const belly = Math.sin(Math.PI * t) * 0.06 + Math.sin(column.phase * 2.3) * 0.04 * t
    return [column.x * (1 + belly * 0.02), column.top - drop, column.z * (1 + belly * 0.02)]
  }
  const strands = []
  columns.forEach((column, index) => {
    for (let row = 0; row < rows; row += 1) {
      if (index % 2 === 0) strands.push(...knot(column, row), ...knot(column, row + 1))
      const next = columns[index + 1]
      if (next && row % 2 === 0) strands.push(...knot(column, row), ...knot(next, row))
    }
  })
  const strandGeometry = new THREE.BufferGeometry()
  strandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(strands, 3))
  const strandMat = new THREE.LineBasicMaterial({ color: '#2f3a30', transparent: true, opacity: 0.45, depthWrite: false })
  group.add(new THREE.LineSegments(strandGeometry, strandMat))
  const ropeGeometry = tube(columns.map((column) => V(column.x, column.top, column.z)), 0.005, 0.005, { radial: 3, tubular: columns.length * 2, color: '#3c4436' })
  const floats = [ropeGeometry]
  columns.forEach((column, index) => {
    if (index % 4) return
    floats.push(transform(ellipsoid(0.03, 0.022, 0.03, { widthSegments: 6, heightSegments: 4, color: '#e0d8c2' }), { position: [column.x, column.top, column.z] }))
  })
  const floatMesh = new THREE.Mesh(merge(floats), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }))
  floatMesh.castShadow = true
  group.add(floatMesh)
  ctx.disposables.push(bambooMat, strandMat, floatMesh.material)
  return group
}

function buildFishPond(ctx) {
  const { random } = ctx
  const pond = buildPond(ctx, { waterColor: '#4b5634', wave: 0.011, reeds: 0.7, rippleRate: 1.1 })
  const { shape, waterY } = pond

  // paddle-wheel aerator
  const aerator = buildAerator(ctx, random)
  const aeratorAt = V(2.6, waterY, -1.8)
  aerator.group.position.copy(aeratorAt)
  aerator.group.rotation.y = 0.45
  pondMesh(ctx, aerator.group)
  const downstream = V(1, 0, 0).applyAxisAngle(V(0, 1, 0), 0.45)
  const foamAt = aeratorAt.clone().addScaledVector(downstream, 1.5)
  pond.water.uniforms.uKkFoam.value.set(foamAt.x, foamAt.z, 2.0, 0.9)
  // power cable floating to the bank, and a post with a starter box
  const cableTheta = Math.atan2(aeratorAt.z, aeratorAt.x) + 0.25
  const bankR = shape.radius(cableTheta)
  const bankPoint = V(Math.cos(cableTheta) * (bankR + 0.5), 0.05, Math.sin(cableTheta) * (bankR + 0.5))
  const startPoint = aeratorAt.clone().add(V(0, 0.45, 0)).addScaledVector(V(0, 0, 1).applyAxisAngle(V(0, 1, 0), 0.45), 0.62)
  const waterEdge = V(Math.cos(cableTheta) * (bankR - 0.9), waterY + 0.01, Math.sin(cableTheta) * (bankR - 0.9))
  const cable = tube([startPoint, startPoint.clone().lerp(waterEdge, 0.2).setY(waterY + 0.01), startPoint.clone().lerp(waterEdge, 0.6).setY(waterY + 0.005), waterEdge, bankPoint.clone().add(V(0, 0.02, 0)), bankPoint.clone().add(V(0, 1.1, 0))], 0.008, 0.008, { radial: 4, tubular: 24, color: '#1e1e1e' })
  const post = tube([bankPoint.clone().add(V(0.05, -0.1, 0)), bankPoint.clone().add(V(0.05, 0.7, 0)), bankPoint.clone().add(V(0.06, 1.5, 0))], 0.04, 0.035, { radial: 6, tubular: 3, color: '#7b6a50' })
  const box = transform(prep(new THREE.BoxGeometry(0.22, 0.3, 0.12), '#4a5a6a'), { position: [bankPoint.x + 0.05, 1.15, bankPoint.z + 0.07] })
  const fixtures = new THREE.Mesh(merge([cable, post, box]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }))
  fixtures.castShadow = true
  ctx.disposables.push(fixtures.material)
  pondMesh(ctx, fixtures)

  // bamboo poles with the drag net drying along the far-left bank
  pondMesh(ctx, buildNetLine(ctx, shape))

  // a jumping fish and its splash
  const fishMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35, side: THREE.DoubleSide })
  const fish = new THREE.Mesh(fishGeometry(), fishMat)
  fish.rotation.order = 'YXZ'
  fish.visible = false
  fish.castShadow = true
  const splashMat = new THREE.MeshStandardMaterial({ vertexColors: true, color: '#eef3ee', roughness: 0.25 })
  const splash = new THREE.Mesh(dropletsGeometry(random, { count: 40, spread: 0.12, height: 0.22 }), splashMat)
  splash.visible = false
  ctx.disposables.push(fishMat, splashMat)
  pondMesh(ctx, fish)
  pondMesh(ctx, splash)

  ctx.egrets([0.3, 1.9].map((theta) => {
    const r = shape.radius(theta) + 0.45
    return V(Math.cos(theta) * r, 0.06, Math.sin(theta) * r)
  }), { appear: () => true })

  let growth = 0.5
  let lastTime = 0
  let nextJump = 3
  let jump = null
  let splashAt = null
  let nextChurn = 0
  const tickRandom = pond.random
  return pond.config({
    camera: pondCamera(),
    update: (g) => {
      growth = g
      pond.setWaterColor(ramp(tmp, g, [[0, '#4b5032'], [0.12, '#4a5132'], [0.35, '#44532f'], [0.65, '#3f562d'], [0.85, '#3e542c'], [1, '#43532f']]))
    },
    tick: (elapsed, delta) => {
      pond.tick(elapsed)
      if (elapsed < lastTime) { nextJump = elapsed + 2; jump = null; nextChurn = elapsed }
      lastTime = elapsed
      // aerator: wheel turns, spray flickers, rings spread from the paddles
      aerator.wheel.rotation.z += Math.min(delta, 0.1) * 9
      const frame = Math.floor(elapsed * 14) % 3
      aerator.sprays.forEach((mesh, index) => { mesh.visible = index === frame })
      aerator.churn.rotation.y = Math.sin(elapsed * 7) * 0.2
      if (elapsed > nextChurn) {
        const p = aeratorAt.clone().addScaledVector(downstream, tickRandom.range(0.4, 0.9))
        pond.ripple(p.x + tickRandom.gauss() * 0.2, p.z + tickRandom.gauss() * 0.2, 0.55, elapsed)
        nextChurn = elapsed + 0.45
      }
      // fish jumps get more frequent (and the fish bigger) as the season goes on
      const stocked = growth > 0.07
      const size = lerp(0.7, 1.75, smooth(0.08, 0.9, growth))
      if (!jump && stocked && elapsed > nextJump) {
        const [x, z] = pond.randomWaterPoint(2.2)
        const yaw = tickRandom() * TAU
        jump = { x, z, yaw, start: elapsed, duration: 0.55 + size * 0.12, length: 0.35 + size * 0.32, height: 0.14 + size * 0.16 }
        pond.ripple(x, z, 0.6, elapsed)
        splashAt = { x, z, start: elapsed }
      }
      if (jump) {
        const t = (elapsed - jump.start) / jump.duration
        if (t >= 1) {
          const ex = jump.x + Math.sin(jump.yaw) * jump.length
          const ez = jump.z + Math.cos(jump.yaw) * jump.length
          pond.ripple(ex, ez, 0.75, elapsed)
          splashAt = { x: ex, z: ez, start: elapsed }
          jump = null
          fish.visible = false
          nextJump = elapsed + lerp(15, 3.2, smooth(0.08, 0.85, growth)) * tickRandom.range(0.55, 1.45)
        } else {
          fish.visible = true
          fish.scale.setScalar(size)
          fish.position.set(jump.x + Math.sin(jump.yaw) * jump.length * t, waterY - 0.06 + 4 * jump.height * t * (1 - t), jump.z + Math.cos(jump.yaw) * jump.length * t)
          const vy = (4 * jump.height * (1 - 2 * t)) / jump.duration
          const vh = jump.length / jump.duration
          fish.rotation.set(-Math.atan2(vy, vh), jump.yaw, Math.sin(t * 9) * 0.25)
        }
      }
      if (splashAt) {
        const age = elapsed - splashAt.start
        if (age > 0.5 || age < 0) { splash.visible = false; splashAt = null } else {
          splash.visible = true
          splash.position.set(splashAt.x, waterY, splashAt.z)
          const k = Math.sin((Math.PI * age) / 0.5)
          splash.scale.set(0.6 + age * 2 * size * 0.5, k * size * 0.8 + 0.01, 0.6 + age * 2 * size * 0.5)
        }
      }
    },
  })
}

export const pondModels = {
  makhana: {
    build: buildMakhana,
    stages: [[0, 'Seedlings planted'], [0.15, 'Leaves spread'], [0.36, 'Pond covered'], [0.46, 'Flowering'], [0.7, 'Seeds ripen underwater'], [0.86, 'Leaves die back']],
    showcase: 0.56,
  },
  singhara: {
    build: buildSinghara,
    stages: [[0, 'Seedlings planted'], [0.15, 'Rosettes spread'], [0.36, 'Pond covered'], [0.46, 'Flowering'], [0.66, 'Nuts forming'], [0.85, 'Nut picking']],
    showcase: 0.55,
  },
  lotus: {
    build: buildLotus,
    stages: [[0, 'New leaves', 'Mar'], [0.2, 'Leaves rise', 'May'], [0.36, 'Flowering', 'Jul'], [0.6, 'Seed pods', 'Sep'], [0.84, 'Leaves die back', 'Dec']],
    showcase: 0.5,
  },
  'fish-pond': {
    build: buildFishPond,
    stages: [[0, 'Pond filled and limed'], [0.08, 'Fingerlings stocked'], [0.3, 'Feeding and growing'], [0.65, 'Fish over 1 kg'], [0.9, 'Harvest netting']],
    showcase: 0.7,
  },
}
