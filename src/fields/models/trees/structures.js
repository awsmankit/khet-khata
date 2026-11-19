// Tree-group crops that are not round-crowned trees: papaya rows, vines on overhead bowers,
// T-bars and wall trellises (grapes, kiwi, passion fruit), and dragon fruit on ring posts.
import * as THREE from 'three'
import { blade, GrowingPart, item, lerp, merge, orient, prep, smooth, transform, tube } from '../../geometry.js'
import { V, UP, rowSpots, tone, windMaterials } from '../../crops.js'
import { bellFlower, blossom, clamp, hash, latheFruit, leafArea, shapedTube } from './parts.js'
import { paint, windowScale } from './orchard.js'

const tmpB = new THREE.Color()
const triangleCount = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3

function plantEntry(random, position, { yaw = true, scale = [0.88, 1.1], tilt = 0.04 } = {}) {
  const entry = item(position, yaw ? random() * Math.PI * 2 : 0, random.range(scale[0], scale[1]), random.gauss() * 0.03, [random.gauss() * tilt, random.gauss() * tilt])
  entry.tone = random.gauss() * 0.06
  return entry
}

// World-space item for a spot defined in a plant's local frame.
function attachTo(plant, spot) {
  return {
    p: spot.p.clone().multiplyScalar(plant.s).applyQuaternion(plant.q).add(plant.p),
    q: plant.q.clone().multiply(spot.q),
    s: plant.s * (spot.s ?? 1),
    offset: plant.offset + (spot.offset ?? 0),
    tone: plant.tone + (spot.tone ?? 0),
  }
}

function rigidMesh(ctx, geometries, options = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, ...options })
  ctx.disposables.push(material)
  const mesh = new THREE.Mesh(merge(geometries), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  ctx.addMesh(mesh)
  return mesh
}

const concrete = (base) => (c, x, y, z) => c.set(base).multiplyScalar(0.86 + 0.18 * hash(Math.floor(x * 9), Math.floor(y * 9), Math.floor(z * 9)))

function box(w, h, d, x, y, z, colorFn) {
  const geometry = prep(new THREE.BoxGeometry(w, h, d), '#ffffff', colorFn)
  geometry.translate(x, y, z)
  return geometry
}

function wire(a, b, radius = 0.005, color = '#8a8a8a') {
  const direction = b.clone().sub(a)
  const geometry = prep(new THREE.CylinderGeometry(radius, radius, direction.length(), 3, 1, true), color)
  geometry.translate(0, direction.length() / 2, 0)
  return orient(geometry, a, direction)
}

/* ------------------------------------------------------------ papaya */
function papayaVariant(random) {
  const H = random.range(2.3, 3.0)
  const lean = V(random.gauss() * 0.08, 0, random.gauss() * 0.08)
  const stemAt = (y) => V(0, y, 0).addScaledVector(lean, (y / H) ** 2)
  const stemR = (y) => lerp(0.11, 0.06, y / H)
  const top = stemAt(H)
  const plant = []
  plant.push(tube([V(0, -0.05, 0), stemAt(H * 0.5), top], 0.11, 0.06, {
    radial: 9, tubular: 9,
    colorFn: (c, x, y, z) => {
      const scar = Math.pow(Math.abs(Math.sin(y * 24 + Math.atan2(z, x) * 0.5)), 8)
      c.set('#6c7160').lerp(tmpB.set('#5c644c'), scar * 0.6).lerp(tmpB.set('#6f8a48'), smooth(H - 1.0, H, y) * 0.6)
    },
  }))
  const leaves = 17 + Math.floor(random() * 4)
  for (let index = 0; index < leaves; index += 1) {
    const age = index / (leaves - 1)
    const azimuth = index * 2.4 + random.gauss() * 0.15
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const y0 = H - 0.04 - age * 0.45
    const start = stemAt(y0).addScaledVector(out, stemR(y0) * 0.8)
    const length = lerp(0.4, 0.85, Math.min(1, age * 1.3)) * random.range(0.9, 1.1)
    const elevation = lerp(1.05, -0.08, age) + random.gauss() * 0.08
    const dir = out.clone().multiplyScalar(Math.cos(elevation)).add(V(0, Math.sin(elevation), 0))
    const end = start.clone().addScaledVector(dir, length)
    const mid = start.clone().addScaledVector(dir, length * 0.5).add(V(0, length * 0.06, 0))
    plant.push(tube([start, mid, end], 0.012, 0.007, { radial: 4, tubular: 3, color: age > 0.85 ? '#b8b47a' : '#a9b98a' }))
    const size = lerp(0.24, 0.42, Math.min(1, age * 1.5)) * random.range(0.9, 1.08)
    const old = age > 0.92
    for (let lobe = 0; lobe < 9; lobe += 1) {
      const rel = (lobe / 8) * 2 - 1
      const geometry = blade({ length: size * (1 - 0.32 * Math.pow(Math.abs(rel), 1.3)), width: size * 0.5, rise: lerp(0.45, 0.02, age), droop: lerp(0.5, 1.05, age), segments: 4, fold: -0.12, shape: 'lance', base: old ? '#8a8a3a' : '#3b6a28', tip: old ? '#a49a44' : '#4d8432', rib: '#a6c07a' })
      transform(geometry, { rotation: [0, Math.PI / 2 - azimuth + rel * 2.5, 0] })
      geometry.translate(end.x, end.y, end.z)
      plant.push(geometry)
    }
  }
  const fruitSpots = []
  const fruits = 10 + Math.floor(random() * 6)
  for (let index = 0; index < fruits; index += 1) {
    const y = H - 0.28 - random() * 0.75
    const azimuth = index * 2.4 + random.gauss() * 0.3
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    fruitSpots.push({ p: stemAt(y).addScaledVector(out, stemR(y) * 0.95), q: new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-out.z, out.x)), s: random.range(0.8, 1.1), offset: (H - y) * 0.07 })
  }
  const flowerSpots = []
  for (let index = 0; index < 6; index += 1) {
    const y = H - 0.08 - random() * 0.3
    const azimuth = random() * Math.PI * 2
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    flowerSpots.push({ p: stemAt(y).addScaledVector(out, stemR(y)), q: new THREE.Quaternion().setFromUnitVectors(UP, out.clone().add(V(0, 0.8, 0)).normalize()), s: random.range(0.85, 1.1) })
  }
  return { plant: merge(plant), fruitSpots, flowerSpots }
}

export function buildPapaya(ctx) {
  const { random, quality } = ctx
  const width = 20
  const depth = 24
  const spacing = 2.0 / Math.sqrt(Math.max(quality, 0.6))
  const spots = rowSpots({ width, depth, rowGap: spacing, plantGap: spacing, random, jitter: 0.06, skip: 0.03 })
  const variants = [0, 1, 2].map(() => papayaVariant(random))
  const wind = { strength: 0.1, flutter: 0.03, refHeight: 3, ground: 0 }
  const plantMats = windMaterials(ctx, wind, { roughness: 0.82, envMapIntensity: 0.4 })
  const fruitItems = []
  const flowerItems = []
  variants.forEach((variant, variantIndex) => {
    const items = spots.filter((_, index) => index % variants.length === variantIndex).map((spot) => plantEntry(random, V(spot[0], 0, spot[1])))
    ctx.addPart(new GrowingPart({ geometry: variant.plant, material: plantMats.material, depthMaterial: plantMats.depth, items, scale: (g) => lerp(0.12, 1, smooth(0, 0.42, g)), color: (c, g, entry) => tone(c.set('#ffffff'), entry) }))
    items.forEach((plant) => {
      variant.fruitSpots.forEach((spot) => fruitItems.push(attachTo(plant, spot)))
      variant.flowerSpots.forEach((spot) => flowerItems.push(attachTo(plant, spot)))
    })
  })
  const fruitMats = windMaterials(ctx, { ...wind, flutter: 0.003 }, { roughness: 0.38, side: THREE.FrontSide })
  const fruitGeometries = [0, 1].map(() => latheFruit(random, { length: random.range(0.22, 0.26), radius: 0.082, profile: 'teardrop', radial: 9, rings: 8, stalk: 0.03, stalkRadius: 0.008, offsetX: 0.078, speckle: 0.05, stalkColor: '#8a9a5a' }))
  fruitGeometries.forEach((geometry, variantIndex) => ctx.addPart(new GrowingPart({
    geometry, material: fruitMats.material, depthMaterial: fruitMats.depth, items: fruitItems.filter((_, index) => index % 2 === variantIndex),
    scale: (g) => smooth(0.48, 0.72, g),
    color: paint([[0.48, '#5f8f35'], [0.76, '#5a8a32'], [0.86, '#a7ad3a'], [0.95, '#e0a52e'], [1, '#e89a2a']]),
  })))
  const flowerMats = windMaterials(ctx, wind, { roughness: 0.6 })
  ctx.addPart(new GrowingPart({
    geometry: blossom(random, { petals: 5, radius: 0.028, cup: 0.35, petalWidth: 0.75, centre: '#e8d890' }), material: flowerMats.material, depthMaterial: flowerMats.depth, items: flowerItems,
    scale: windowScale([0.33, 0.38, 0.56, 0.62]), color: paint('#f6f0d6'),
  }))
  return { plot: { width, depth }, soil: 'orchard', camera: { position: V(12.6, 3.0, 18.4), target: V(2.2, 1.9, 5.8) } }
}

/* ------------------------------------------------------------ vines on bowers, T-bars and walls */
// spec: { kind: 'pandal'|'tbar'|'wall', width, depth, rowGap, plantGap, height, postGap, tbarWidth,
//   leaves: { cluster, cover, under, color, grow, roughness }, coreColor, fruit: { layers, perPlant, window, scale },
//   flowers: { geometry, perPlant, window, color, place }, camera, stages }
export function buildVineRoof(ctx, spec) {
  const { random, quality } = ctx
  const { kind, width, depth, rowGap, plantGap, height: h, postGap } = spec
  const rows = Math.round(width / rowGap)
  const rowXs = Array.from({ length: rows }, (_, index) => -width / 2 + rowGap * (index + 0.5))
  const halfW = width / 2
  const halfD = depth / 2
  const posts = []
  const wires = []
  const postColor = spec.postColor || '#a9a397'

  if (kind === 'pandal') {
    const nx = Math.round(width / postGap)
    const nz = Math.round(depth / postGap)
    for (let i = 0; i <= nx; i += 1) {
      for (let j = 0; j <= nz; j += 1) {
        const x = -halfW + (i / nx) * width
        const z = -halfD + (j / nz) * depth
        const edge = i === 0 || j === 0 || i === nx || j === nz
        posts.push(box(0.12, h + 0.08, 0.12, x, (h + 0.08) / 2, z, concrete(postColor)))
        if (edge) {
          const out = V(i === 0 ? -1 : i === nx ? 1 : 0, 0, j === 0 ? -1 : j === nz ? 1 : 0).normalize()
          const stake = V(x, 0, z).addScaledVector(out, 1.3)
          wires.push(wire(V(x, h + 0.04, z), stake, 0.007))
          posts.push(box(0.14, 0.1, 0.14, stake.x, 0.03, stake.z, concrete(postColor)))
        }
      }
    }
    for (let x = -halfW; x <= halfW + 0.01; x += 0.6) wires.push(wire(V(x, h, -halfD), V(x, h, halfD), 0.004))
    for (let z = -halfD; z <= halfD + 0.01; z += 0.6) wires.push(wire(V(-halfW, h, z), V(halfW, h, z), 0.004))
  } else {
    rowXs.forEach((x) => {
      for (let z = -halfD + 0.4; z <= halfD - 0.4 + 0.01; z += postGap) {
        posts.push(box(0.11, h + (kind === 'wall' ? 0.15 : 0), 0.11, x, (h + (kind === 'wall' ? 0.15 : 0)) / 2, z, concrete(postColor)))
        if (kind === 'tbar') posts.push(box(spec.tbarWidth, 0.08, 0.08, x, h - 0.04, z, concrete(postColor)))
      }
      const offsets = kind === 'tbar' ? [-0.5, -0.25, 0, 0.25, 0.5].map((f) => f * spec.tbarWidth) : [0]
      const heights = kind === 'wall' ? [h, h - 0.6] : [h]
      offsets.forEach((dx) => heights.forEach((y) => wires.push(wire(V(x + dx, y, -halfD + 0.4), V(x + dx, y, halfD - 0.4), 0.004))))
    })
  }
  rigidMesh(ctx, posts, { roughness: 0.95 })
  const wireMesh = rigidMesh(ctx, wires, { roughness: 0.45, metalness: 0.6 })
  wireMesh.castShadow = false

  /* vines: trunks and cordons; canopy tiles per plant */
  const wood = []
  const tiles = []
  const barkColor = spec.barkColor || '#6a5440'
  const barkFn = (c, x, y, z) => c.set(barkColor).multiplyScalar(0.8 + 0.3 * hash(Math.floor(x * 20), Math.floor(y * 20), Math.floor(z * 20)))
  const plantZs = []
  for (let z = -halfD + plantGap / 2; z < halfD; z += plantGap) plantZs.push(z)
  rowXs.forEach((x) => {
    plantZs.forEach((z, zIndex) => {
      const base = V(x + random.gauss() * 0.04, 0, z + random.gauss() * 0.04)
      const crownY = kind === 'wall' ? h : h + 0.02
      const top = V(x, crownY, z)
      wood.push(tube([base.clone().add(V(0, -0.05, 0)), base.clone().lerp(top, 0.5).add(V(random.gauss() * 0.05, 0, random.gauss() * 0.05)), top], 0.04, 0.028, { radial: 6, tubular: 4, colorFn: barkFn }))
      const arm = Math.min(plantGap / 2 - 0.05, kind === 'tbar' ? 2.4 : 1.6)
      for (const side of [-1, 1]) {
        const end = top.clone().add(V(random.gauss() * 0.03, 0.01, side * arm))
        wood.push(tube([top, top.clone().lerp(end, 0.5).add(V(0, 0.03, 0)), end], 0.026, 0.014, { radial: 5, tubular: 3, colorFn: barkFn }))
        const canes = Math.max(2, Math.round(arm / 0.45))
        for (let cane = 0; cane < canes; cane += 1) {
          const from = top.clone().lerp(end, (cane + 0.5) / canes)
          for (const across of [-1, 1]) {
            let reach
            if (kind === 'pandal') reach = [V(across * rowGap * 0.22, 0.04, 0), V(across * rowGap * 0.44, 0.06, random.gauss() * 0.1)]
            else if (kind === 'tbar') reach = [V(across * spec.tbarWidth * 0.3, 0.05, 0), V(across * (spec.tbarWidth * 0.55 + 0.25), -0.35, random.gauss() * 0.1)]
            else reach = [V(across * 0.12, -0.25, 0), V(across * 0.2, -0.8, random.gauss() * 0.1)]
            wood.push(tube([from, from.clone().add(reach[0]), from.clone().add(reach[1])], 0.009, 0.005, { radial: 3, tubular: 3, colorFn: barkFn }))
          }
        }
      }
      if (kind === 'pandal') tiles.push({ x0: Math.max(-halfW + 0.15, x - rowGap / 2), x1: Math.min(halfW - 0.15, x + rowGap / 2), y0: h - 0.1, y1: h + 0.38, z0: Math.max(-halfD + 0.15, z - plantGap / 2), z1: Math.min(halfD - 0.15, z + plantGap / 2) })
      else if (kind === 'tbar') tiles.push({ x0: x - spec.tbarWidth / 2 - 0.45, x1: x + spec.tbarWidth / 2 + 0.45, y0: h - 0.18, y1: h + 0.32, z0: Math.max(-halfD + 0.3, z - plantGap / 2), z1: Math.min(halfD - 0.3, z + plantGap / 2) })
      else tiles.push({ x0: x - 0.3, x1: x + 0.3, y0: h - 0.95, y1: h + 0.25, z0: Math.max(-halfD + 0.3, z - plantGap / 2), z1: Math.min(halfD - 0.3, z + plantGap / 2) })
      // the end plants of each row fill the canopy out to the end of the structure
      const tile = tiles[tiles.length - 1]
      const reach = kind === 'pandal' ? halfD - 0.15 : halfD - 0.4
      if (zIndex === 0) tile.z0 = -reach
      if (zIndex === plantZs.length - 1) tile.z1 = reach
    })
  })
  const woodMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, envMapIntensity: 0.4 })
  ctx.disposables.push(woodMaterial)
  const woodMesh = new THREE.Mesh(merge(wood), woodMaterial)
  woodMesh.castShadow = true
  woodMesh.receiveShadow = true
  ctx.addMesh(woodMesh)

  // exterior faces of each tile (inner faces between neighbours are hidden)
  // roofs get extra leaves on their outer edges, where shoots spill over and hang down
  const sideBoost = kind === 'wall' ? 1 : 3
  tiles.forEach((tile) => {
    const edge = 0.3
    tile.faces = [
      { n: V(0, 1, 0), w: (tile.x1 - tile.x0) * (tile.z1 - tile.z0) },
      { n: V(0, -1, 0), w: (tile.x1 - tile.x0) * (tile.z1 - tile.z0) * (spec.leaves.under ?? 0.55) },
      { n: V(1, 0, 0), w: kind === 'pandal' && tile.x1 < halfW - edge ? 0 : (tile.y1 - tile.y0) * (tile.z1 - tile.z0) * sideBoost },
      { n: V(-1, 0, 0), w: kind === 'pandal' && tile.x0 > -halfW + edge ? 0 : (tile.y1 - tile.y0) * (tile.z1 - tile.z0) * sideBoost },
      { n: V(0, 0, 1), w: tile.z1 < halfD - edge ? 0 : (tile.y1 - tile.y0) * (tile.x1 - tile.x0) * sideBoost },
      { n: V(0, 0, -1), w: tile.z0 > -halfD + edge ? 0 : (tile.y1 - tile.y0) * (tile.x1 - tile.x0) * sideBoost },
    ]
    tile.area = tile.faces.reduce((sum, face) => sum + face.w, 0)
  })
  const pointOnTile = (tile, face, jitter = 0.05) => {
    const { n } = face
    const x = n.x ? (n.x > 0 ? tile.x1 : tile.x0) + random.gauss() * jitter : random.range(tile.x0, tile.x1)
    const y = n.y ? (n.y > 0 ? tile.y1 : tile.y0) + random.gauss() * jitter : random.range(tile.y0, tile.y1)
    const z = n.z ? (n.z > 0 ? tile.z1 : tile.z0) + random.gauss() * jitter : random.range(tile.z0, tile.z1)
    return V(x, y, z)
  }
  const pickFace = (tile, filter = () => true) => {
    const faces = tile.faces.filter((face) => face.w > 0 && filter(face))
    const total = faces.reduce((sum, face) => sum + face.w, 0)
    let pick = random() * total
    for (const face of faces) { pick -= face.w; if (pick <= 0) return face }
    return faces[faces.length - 1]
  }

  const wind = { strength: 0.06, flutter: 0.02, refHeight: 3, ground: 0 }
  const leafSpec = spec.leaves
  const leafGrow = leafSpec.grow || (() => 1)

  /* core tiles */
  // flat bumpy slabs under roofs; a rounded hedge for wall trellises
  const coreTemplate = kind === 'wall'
    ? prep(new THREE.SphereGeometry(0.5, 10, 8), '#ffffff', (c, x, y) => c.setScalar(lerp(0.6, 1, y + 0.5)))
    : prep(new THREE.BoxGeometry(1, 1, 1, 5, 1, 5), '#ffffff', (c, x, y) => c.setScalar(y > 0 ? 1 : 0.6))
  const corePosition = coreTemplate.attributes.position
  for (let index = 0; index < corePosition.count; index += 1) {
    const x = corePosition.getX(index)
    const z = corePosition.getZ(index)
    corePosition.setY(index, corePosition.getY(index) + (kind === 'wall' ? 0.06 : 0.18) * Math.sin(x * 9 + z * 4) * Math.sin(z * 7 - x * 3))
  }
  coreTemplate.computeVertexNormals()
  const coreMats = windMaterials(ctx, { ...wind, flutter: 0 }, { roughness: 0.9, side: THREE.FrontSide })
  const coreItems = tiles.map((tile) => ({ p: V((tile.x0 + tile.x1) / 2, (tile.y0 + tile.y1) / 2 + (kind === 'wall' ? 0 : 0.02), (tile.z0 + tile.z1) / 2), q: new THREE.Quaternion(), s: 1, offset: random.gauss() * 0.02, tone: random.gauss() * 0.05, w: (tile.x1 - tile.x0) * (kind === 'pandal' ? 0.98 : kind === 'wall' ? 0.75 : 0.9), hgt: (tile.y1 - tile.y0) * (kind === 'wall' ? 0.75 : 0.55), d: (tile.z1 - tile.z0) * (kind === 'wall' ? 1.15 : 0.98) }))
  ctx.addPart(new GrowingPart({
    geometry: coreTemplate, material: coreMats.material, depthMaterial: coreMats.depth, items: coreItems,
    scale: (g, entry) => { const k = clamp((leafGrow(g) - 0.45) / 0.55, 0, 1); return [entry.w * k, entry.hgt * k, entry.d * k] },
    color: paint(spec.coreColor || '#1d3a16'),
  }))

  /* leaves */
  const leafVariants = [0, 1].map(() => leafSpec.cluster(random))
  const clusterTris = leafVariants.reduce((sum, geometry) => sum + triangleCount(geometry), 0) / 2
  const totalArea = tiles.reduce((sum, tile) => sum + tile.area, 0)
  // clusters per m2 of canopy face from a coverage target (one-sided leaf area per m2)
  const clusterArea = leafVariants.reduce((sum, geometry) => sum + leafArea(geometry), 0) / 2
  let density = ((leafSpec.cover ?? 0.8) * quality) / (clusterArea * 1.04)
  const budget = (spec.budget?.leaves ?? 1.1e6) * quality
  if (totalArea * density * clusterTris > budget) density = budget / (totalArea * clusterTris)
  const leafItems = []
  tiles.forEach((tile) => {
    const count = Math.round(tile.area * density)
    for (let index = 0; index < count; index += 1) {
      const face = pickFace(tile)
      const p = pointOnTile(tile, face, 0.06).addScaledVector(face.n, face.n.y === 0 ? 0.07 : 0)
      if (face.n.y === 0 && kind !== 'wall') p.y -= random() * 0.35
      const up = face.n.clone().add(V(random.gauss() * 0.35, face.n.y === 0 ? 0.5 : 0, random.gauss() * 0.35)).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(UP, up).multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28))
      leafItems.push({ p, q, s: random.range(0.85, 1.2), offset: random.gauss() * 0.025, tone: random.gauss() * 0.1 + (face.n.y < 0 ? -0.15 : 0.03) })
    }
  })
  const leafMats = windMaterials(ctx, wind, { roughness: leafSpec.roughness ?? 0.6, metalness: 0.02 })
  const leafColor = paint(leafSpec.color)
  leafVariants.forEach((geometry, variantIndex) => ctx.addPart(new GrowingPart({
    geometry, material: leafMats.material, depthMaterial: leafMats.depth, items: leafItems.filter((_, index) => index % 2 === variantIndex),
    scale: (g) => leafGrow(g), color: leafColor,
  })))

  /* fruit and flowers hang under the canopy (or from the sides of a wall) */
  const placeUnder = (perPlant, { hang }) => {
    const items = []
    tiles.forEach((tile) => {
      const count = Math.round(perPlant * quality)
      for (let index = 0; index < count; index += 1) {
        let p
        let normal = V(0, -1, 0)
        if (kind === 'wall') {
          const side = random() < 0.5 ? -1 : 1
          normal = V(side, 0, 0)
          p = V(side > 0 ? tile.x1 + 0.03 : tile.x0 - 0.03, random.range(tile.y0 + 0.1, tile.y1 - 0.35), random.range(tile.z0, tile.z1))
        } else {
          p = V(lerp(tile.x0, tile.x1, random.range(0.08, 0.92)), tile.y0 + 0.02, lerp(tile.z0, tile.z1, random.range(0.05, 0.95)))
        }
        const q = hang ? new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28) : new THREE.Quaternion().setFromUnitVectors(UP, normal.clone().add(V(random.gauss() * 0.3, kind === 'wall' ? 0.6 : 0, random.gauss() * 0.3)).normalize())
        items.push({ p, q, s: random.range(0.85, 1.15), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06 })
      }
    })
    return items
  }
  const addParts = (items, layer, variants, { scale, layerWind }) => {
    const geometries = Array.from({ length: variants }, () => layer.geometry(random))
    const mats = windMaterials(ctx, layerWind, { roughness: layer.roughness ?? 0.55, side: layer.side ?? THREE.FrontSide })
    geometries.forEach((geometry, variantIndex) => ctx.addPart(new GrowingPart({ geometry, material: mats.material, depthMaterial: mats.depth, items: items.filter((_, index) => index % variants === variantIndex), scale: layer.scale || scale, color: paint(layer.color) })))
  }
  if (spec.flowers) {
    const F = spec.flowers
    addParts(placeUnder(F.perPlant, { hang: false }), { ...F, side: THREE.DoubleSide }, 2, { scale: windowScale(F.window), layerWind: { ...wind, flutter: 0.01 } })
  }
  if (spec.fruit) {
    const F = spec.fruit
    const items = placeUnder(F.perPlant, { hang: true })
    const fruitScale = F.scale || ((g) => smooth(F.window[0], F.window[1], g))
    F.layers.forEach((layer) => addParts(items, layer, F.variants ?? 2, { scale: fruitScale, layerWind: { ...wind, flutter: 0.004 } }))
  }
  return { plot: { width, depth, rowGap }, soil: spec.soil || 'furrow', camera: spec.camera, scarecrow: false }
}

/* ------------------------------------------------------------ dragon fruit */
const wing = (a) => 0.38 + 0.62 * Math.pow((Math.cos(3 * a) + 1) / 2, 3)
const joint = (t, n) => 0.8 + 0.2 * smooth(0, 0.12, (t * n) % 1)
const cactusColor = (c, t, a) => {
  const edge = Math.pow((Math.cos(3 * a) + 1) / 2, 6)
  c.set('#6f9a52').lerp(tmpB.set('#a3ad7a'), edge * 0.55).multiplyScalar(0.88 + 0.14 * hash(t * 30, a, 3))
}

function dragonVariant(random, top) {
  const parts = []
  const climbers = 2 + (random() < 0.5 ? 1 : 0)
  for (let index = 0; index < climbers; index += 1) {
    const s = index * 2.1 + random() * 0.8
    const off = V(Math.cos(s) * 0.1, 0, Math.sin(s) * 0.1)
    parts.push(shapedTube([V(off.x, 0.02, off.z), V(off.x * 1.15, top * 0.35, off.z * 1.15), V(off.x * 0.9, top * 0.7, off.z * 0.9), V(off.x * 0.5, top + 0.06, off.z * 0.5)], (t) => 0.04 * joint(t, 3), { radial: 9, tubular: 10, section: wing, colorFn: cactusColor }))
  }
  const ring = 0.4
  const arms = 16 + Math.floor(random() * 6)
  const fruitSpots = []
  const flowerSpots = []
  for (let index = 0; index < arms; index += 1) {
    const azimuth = (index / arms) * Math.PI * 2 + random.gauss() * 0.2
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const overR = ring + random.range(0.18, 0.34)
    const points = [
      out.clone().multiplyScalar(random.range(0, 0.22)).add(V(0, top + 0.04, 0)),
      out.clone().multiplyScalar(ring + random.range(-0.05, 0.1)).add(V(0, top + random.range(0.14, 0.4), 0)),
      out.clone().multiplyScalar(overR).add(V(0, top + random.range(0.0, 0.18), 0)),
      out.clone().multiplyScalar(overR + random.range(0.05, 0.15)).add(V(random.gauss() * 0.05, top - random.range(0.35, 1.0), random.gauss() * 0.05)),
    ]
    const R = random.range(0.034, 0.044)
    parts.push(shapedTube(points, (t) => R * joint(t, 2.5) * (t > 0.92 ? lerp(1, 0.55, (t - 0.92) / 0.08) : 1), { radial: 9, tubular: 12, section: wing, colorFn: cactusColor }))
    const curve = new THREE.CatmullRomCurve3(points)
    const roll = random()
    if (roll < 0.6) {
      const t = random.range(0.42, 0.78)
      const p = curve.getPointAt(t).addScaledVector(out, R * 0.8)
      fruitSpots.push({ p, q: new THREE.Quaternion().setFromUnitVectors(UP, out.clone().multiplyScalar(0.8).add(V(0, 0.65, 0)).normalize()), s: random.range(0.85, 1.12), offset: random.gauss() * 0.03 })
    } else if (roll < 0.85) {
      const t = random.range(0.5, 0.85)
      const p = curve.getPointAt(t).addScaledVector(out, R * 0.8)
      flowerSpots.push({ p, q: new THREE.Quaternion().setFromUnitVectors(UP, out.clone().add(V(0, 0.5, 0)).normalize()), s: random.range(0.85, 1.1) })
    }
  }
  return { plant: merge(parts), fruitSpots, flowerSpots }
}

function dragonBracts(random) {
  const parts = []
  const length = 0.11
  const radius = 0.05
  for (let index = 0; index < 16; index += 1) {
    const t = 0.18 + (index / 16) * 0.75
    const azimuth = index * 2.4 + random.gauss() * 0.2
    const r = radius * Math.pow(Math.sin(Math.PI * t), 0.62) * 0.95
    const geometry = blade({ length: 0.04 * (1 - t * 0.3), width: 0.03, rise: 0.75 + t * 0.4, droop: 0.5, segments: 2, fold: 0.2, shape: 'lance', base: '#b0b0b0', tip: '#f0f0f0' })
    transform(geometry, { rotation: [0, Math.PI / 2 - azimuth, 0] })
    geometry.translate(Math.cos(azimuth) * r, t * length, Math.sin(azimuth) * r)
    parts.push(geometry)
  }
  return merge(parts)
}

export function buildDragonFruit(ctx) {
  const { random, quality } = ctx
  const width = 20
  const depth = 24
  const rowGap = 3
  const postGap = 2.4 / Math.sqrt(Math.max(quality, 0.7))
  const top = 1.55
  const rigid = []
  const plantSpots = []
  for (let x = -width / 2 + rowGap / 2; x < width / 2; x += rowGap) {
    for (let z = -depth / 2 + postGap / 2; z < depth / 2; z += postGap) {
      plantSpots.push(V(x, 0, z))
      rigid.push(box(0.12, top + 0.04, 0.12, x, (top + 0.04) / 2, z, concrete('#aaa59a')))
      rigid.push(box(0.86, 0.05, 0.05, x, top - 0.02, z, concrete('#9f998e')))
      rigid.push(box(0.05, 0.05, 0.86, x, top - 0.02, z, concrete('#9f998e')))
      const tyre = random() < 0.5
      const ring = prep(new THREE.TorusGeometry(tyre ? 0.33 : 0.38, tyre ? 0.08 : 0.045, 6, 20), tyre ? '#2a2a2a' : '#a8a296')
      ring.rotateX(Math.PI / 2)
      ring.translate(x, top + 0.02, z)
      rigid.push(ring)
    }
  }
  rigidMesh(ctx, rigid, { roughness: 0.95 })
  const variants = [0, 1, 2].map(() => dragonVariant(random, top))
  const wind = { strength: 0.03, flutter: 0.004, refHeight: 2.5, ground: 0 }
  const plantMats = windMaterials(ctx, wind, { roughness: 0.62, side: THREE.FrontSide })
  const fruitItems = []
  const flowerItems = []
  variants.forEach((variant, variantIndex) => {
    const items = plantSpots.filter((_, index) => index % 3 === variantIndex).map((spot) => plantEntry(random, spot, { scale: [0.98, 1.02], tilt: 0 }))
    ctx.addPart(new GrowingPart({ geometry: variant.plant, material: plantMats.material, depthMaterial: plantMats.depth, items, scale: () => 1, color: (c, g, entry) => tone(c.set('#ffffff'), entry) }))
    items.forEach((plant) => {
      variant.fruitSpots.forEach((spot) => fruitItems.push(attachTo(plant, spot)))
      variant.flowerSpots.forEach((spot) => flowerItems.push(attachTo(plant, spot)))
    })
  })
  const fruitScale = (g) => smooth(0.36, 0.7, g)
  const bodyMats = windMaterials(ctx, { ...wind, flutter: 0.002 }, { roughness: 0.45, side: THREE.FrontSide })
  const bractMats = windMaterials(ctx, { ...wind, flutter: 0.002 }, { roughness: 0.55 })
  ctx.addPart(new GrowingPart({ geometry: latheFruit(random, { length: 0.11, radius: 0.05, profile: 'oval', radial: 10, rings: 8, stalk: 0, upright: true, speckle: 0.04 }), material: bodyMats.material, depthMaterial: bodyMats.depth, items: fruitItems, scale: fruitScale, color: paint([[0.36, '#6a9a3a'], [0.62, '#7aa040'], [0.72, '#c64a6a'], [0.82, '#e02a78'], [1, '#d81e6e']]) }))
  ctx.addPart(new GrowingPart({ geometry: dragonBracts(random), material: bractMats.material, depthMaterial: bractMats.depth, items: fruitItems, scale: fruitScale, color: paint([[0.36, '#6a9a3a'], [0.7, '#78a83e'], [0.85, '#94b84a'], [1, '#a2b24a']]) }))
  const flowerMats = windMaterials(ctx, wind, { roughness: 0.6 })
  ctx.addPart(new GrowingPart({ geometry: bellFlower(random, { length: 0.22, radius: 0.1, petals: 14 }), material: flowerMats.material, depthMaterial: flowerMats.depth, items: flowerItems, scale: windowScale([0.16, 0.22, 0.36, 0.42]), color: paint('#fbf8ee') }))
  return { plot: { width, depth, rowGap }, soil: 'furrow', camera: { position: V(12.4, 2.4, 17.6), target: V(3.0, 1.15, 5.2) }, scarecrow: false }
}
