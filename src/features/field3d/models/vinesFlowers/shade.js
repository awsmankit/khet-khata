// Shade structure family: a GI-pipe shade-net house with benches of potted Dendrobium orchids.
// The front and right side curtains are rolled up so the camera can look in.
import * as THREE from 'three'
import { blade, merge, prep, tube } from '../../engine/geometry.js'
import { ramp, tone } from '../../engine/plantKit.js'
import { TAU, V, addItemsPart, addVariantParts, aim, floor, lerp, plantEntries, rigidMaterial, smooth, socketItems, staticMesh, windMaterials } from './kit.js'
import { bud, orchidFlower } from './parts.js'

const tmp = new THREE.Color()
const HOUSE = { x: 5, z: 7, h: 3.2, curtain: 2.4 }
const BENCH = { y: 0.75, width: 1.2, z: 6.2, x: [-3.45, -1.15, 1.15, 3.45] }
const POT = { h: 0.12, top: 0.065, bottom: 0.048 }

function pipe(a, b, radius = 0.026) {
  return tube([a, a.clone().lerp(b, 0.5), b], radius, radius, { radial: 6, tubular: 1, color: '#ffffff' })
}

function orchidVariant(random) {
  const plant = []
  const spray = []
  const flowers = []
  const canes = 3 + Math.floor(random() * 2)
  let sprayStart = null
  for (let index = 0; index < canes; index += 1) {
    const a = (index / canes) * TAU + random.gauss() * 0.4
    const height = random.range(0.28, 0.42) * (index === 0 ? 1.1 : 1)
    const base = V(Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02)
    const top = base.clone().add(V(Math.cos(a) * 0.05 + random.gauss() * 0.02, height, Math.sin(a) * 0.05 + random.gauss() * 0.02))
    const points = [base, base.clone().lerp(top, 0.5).add(V(0, 0, 0)), top]
    plant.push(tube(points, 0.009, 0.005, { radial: 5, tubular: 5, colorFn: (c, x, y) => c.setScalar(((y * 30) % 1) > 0.92 ? 0.7 : 1) }))
    const curve = new THREE.CatmullRomCurve3(points)
    const leaves = 5 + Math.floor(random() * 3)
    for (let leaf = 0; leaf < leaves; leaf += 1) {
      const t = 0.35 + (leaf / leaves) * 0.62
      const at = curve.getPointAt(t)
      const geometry = blade({ length: random.range(0.09, 0.13), width: 0.032, rise: random.range(0.5, 0.9), droop: random.range(0.3, 0.7), segments: 4, fold: 0.3, shape: 'lance', base: '#c0c0b0', tip: '#f0f0e0', rib: '#ffffff' })
      geometry.rotateY(a + leaf * 2.6)
      geometry.translate(at.x, at.y, at.z)
      plant.push(geometry)
    }
    if (index < 2) {
      // arching flower spray from near the cane top
      const start = curve.getPointAt(0.85)
      sprayStart = sprayStart || start.clone()
      const out = V(Math.cos(a + random.gauss() * 0.4), 0, Math.sin(a + random.gauss() * 0.4))
      const length = random.range(0.3, 0.42)
      const sprayPoints = [start, start.clone().addScaledVector(out, length * 0.3).add(V(0, length * 0.55, 0)), start.clone().addScaledVector(out, length * 0.75).add(V(0, length * 0.6, 0)), start.clone().addScaledVector(out, length).add(V(0, length * 0.42, 0))]
      spray.push(tube(sprayPoints, 0.003, 0.002, { radial: 3, tubular: 8, color: '#ffffff' }))
      const sprayCurve = new THREE.CatmullRomCurve3(sprayPoints)
      const count = 5 + Math.floor(random() * 3)
      for (let k = 0; k < count; k += 1) {
        const t = 0.35 + (k / count) * 0.62
        const at = sprayCurve.getPointAt(t)
        const side = k % 2 ? 1 : -1
        const facing = out.clone().multiplyScalar(0.6).add(V(-out.z * side, 0.15, out.x * side))
        flowers.push({ p: at.clone().add(V(0, -0.012, 0)), q: aim(facing, random.gauss() * 0.3), s: lerp(1, 0.8, k / count), offset: 0, open: 0.5 + (k / count) * 0.1 })
      }
    }
  }
  return { plant: merge(plant), spray: merge(spray), flowers, pivots: { spray: sprayStart || V(0, 0.3, 0) } }
}

export function buildOrchidHouse(ctx) {
  const { random, quality } = ctx
  const plot = { width: 10, depth: 14 }
  floor(ctx, { width: plot.width + 0.4, depth: plot.depth + 0.4, color: '#8c7a62', tint: '#f2e6d4', seed: 23, y: 0.004 })

  /* ---------- GI pipe frame */
  const pipes = []
  const postX = [-HOUSE.x, -HOUSE.x / 3, HOUSE.x / 3, HOUSE.x]
  const postZ = [-HOUSE.z, -HOUSE.z / 2, 0, HOUSE.z / 2, HOUSE.z]
  for (const x of postX) for (const z of postZ) pipes.push(pipe(V(x, -0.1, z), V(x, HOUSE.h, z), 0.032))
  for (const z of postZ) pipes.push(pipe(V(-HOUSE.x, HOUSE.h, z), V(HOUSE.x, HOUSE.h, z)))
  for (const x of postX) pipes.push(pipe(V(x, HOUSE.h, -HOUSE.z), V(x, HOUSE.h, HOUSE.z)))
  for (const x of [-HOUSE.x, HOUSE.x]) pipes.push(pipe(V(x, HOUSE.curtain, -HOUSE.z), V(x, HOUSE.curtain, HOUSE.z), 0.02))
  for (const z of [-HOUSE.z, HOUSE.z]) pipes.push(pipe(V(-HOUSE.x, HOUSE.curtain, z), V(HOUSE.x, HOUSE.curtain, z), 0.02))

  /* ---------- benches with weld-mesh tops */
  const benchTops = []
  for (const bx of BENCH.x) {
    for (const side of [-1, 1]) pipes.push(pipe(V(bx + side * BENCH.width / 2, BENCH.y, -BENCH.z), V(bx + side * BENCH.width / 2, BENCH.y, BENCH.z), 0.02))
    for (let z = -BENCH.z; z <= BENCH.z + 0.01; z += BENCH.z / 4) {
      for (const side of [-1, 1]) pipes.push(pipe(V(bx + side * (BENCH.width / 2 - 0.05), 0, z), V(bx + side * (BENCH.width / 2 - 0.05), BENCH.y, z), 0.018))
      pipes.push(pipe(V(bx - BENCH.width / 2, BENCH.y - 0.02, z), V(bx + BENCH.width / 2, BENCH.y - 0.02, z), 0.016))
    }
    const top = new THREE.BoxGeometry(BENCH.width, 0.012, BENCH.z * 2)
    top.translate(bx, BENCH.y, 0)
    benchTops.push(prep(top, '#ffffff'))
  }
  staticMesh(ctx, merge(pipes), rigidMaterial(ctx, { vertexColors: false, color: '#a7adb0', roughness: 0.45, metalness: 0.6 }))
  staticMesh(ctx, merge(benchTops), rigidMaterial(ctx, { vertexColors: false, color: '#4f5456', roughness: 0.6, metalness: 0.4 }))

  /* ---------- shade net: roof, back and left walls; front and right curtains rolled up */
  const net = []
  const roof = new THREE.PlaneGeometry(HOUSE.x * 2, HOUSE.z * 2)
  roof.rotateX(-Math.PI / 2)
  roof.translate(0, HOUSE.h + 0.03, 0)
  net.push(prep(roof, '#ffffff'))
  const back = new THREE.PlaneGeometry(HOUSE.x * 2, HOUSE.h)
  back.translate(0, HOUSE.h / 2, -HOUSE.z - 0.03)
  net.push(prep(back, '#ffffff'))
  const left = new THREE.PlaneGeometry(HOUSE.z * 2, HOUSE.h)
  left.rotateY(Math.PI / 2)
  left.translate(-HOUSE.x - 0.03, HOUSE.h / 2, 0)
  net.push(prep(left, '#ffffff'))
  const skirtHeight = HOUSE.h - HOUSE.curtain
  const front = new THREE.PlaneGeometry(HOUSE.x * 2, skirtHeight)
  front.translate(0, HOUSE.curtain + skirtHeight / 2, HOUSE.z + 0.03)
  net.push(prep(front, '#ffffff'))
  const right = new THREE.PlaneGeometry(HOUSE.z * 2, skirtHeight)
  right.rotateY(Math.PI / 2)
  right.translate(HOUSE.x + 0.03, HOUSE.curtain + skirtHeight / 2, 0)
  net.push(prep(right, '#ffffff'))
  const netMaterial = rigidMaterial(ctx, { vertexColors: false, color: '#1f3a26', roughness: 1, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false })
  const netMesh = staticMesh(ctx, merge(net), netMaterial, { castShadow: false, receiveShadow: false })
  netMesh.renderOrder = 3
  // rolled curtains
  const rolls = [pipe(V(-HOUSE.x, HOUSE.curtain - 0.06, HOUSE.z + 0.05), V(HOUSE.x, HOUSE.curtain - 0.06, HOUSE.z + 0.05), 0.065), pipe(V(HOUSE.x + 0.05, HOUSE.curtain - 0.06, -HOUSE.z), V(HOUSE.x + 0.05, HOUSE.curtain - 0.06, HOUSE.z), 0.065)]
  staticMesh(ctx, merge(rolls), rigidMaterial(ctx, { vertexColors: false, color: '#2a4a30', roughness: 1 }))

  /* ---------- pots */
  const spots = []
  const gap = 0.3 / Math.sqrt(quality)
  for (const bx of BENCH.x) {
    for (const dx of [-0.45, -0.15, 0.15, 0.45]) {
      for (let z = -BENCH.z + 0.15 + (Math.abs(dx) < 0.3 ? gap / 2 : 0); z < BENCH.z - 0.1; z += gap) {
        if (random() < 0.03) continue
        spots.push([bx + dx + random.gauss() * 0.01, z + random.gauss() * 0.012])
      }
    }
  }
  const potTop = BENCH.y + 0.006 + POT.h
  const pots = spots.map(([x, z]) => {
    const pot = prep(new THREE.CylinderGeometry(POT.top, POT.bottom, POT.h, 10, 1, true), '#ffffff', (c, px, py) => c.setScalar(py > POT.h / 2 - 0.012 ? 0.85 : 1))
    pot.translate(x, BENCH.y + 0.006 + POT.h / 2, z)
    const fill = prep(new THREE.CircleGeometry(POT.top * 0.95, 10), '#ffffff', (c) => c.setScalar(0.32))
    fill.rotateX(-Math.PI / 2)
    fill.translate(x, potTop - 0.015, z)
    return [pot, fill]
  }).flat()
  staticMesh(ctx, merge(pots), rigidMaterial(ctx, { vertexColors: true, color: '#a3583a', roughness: 0.85, side: THREE.DoubleSide }))

  /* ---------- orchids */
  const variants = [0, 1, 2].map(() => orchidVariant(random))
  const entries = plantEntries(random, spots, { variants: 3, baseY: potTop - 0.015, tilt: 0.06 })
  const palette = ['#9a2a90', '#f4f0f2', '#e47ab8', '#b05cc0', '#f2eef0', '#c8327a']
  entries.forEach((entry) => {
    const bench = BENCH.x.reduce((best, bx, index) => (Math.abs(entry.p.x - bx) < Math.abs(entry.p.x - BENCH.x[best]) ? index : best), 0)
    const block = bench * 3 + Math.floor((entry.p.z + BENCH.z) / (BENCH.z * 2 / 3))
    entry.color = palette[(block + (entry.pick < 0.12 ? 1 : 0)) % palette.length]
  })
  const wind = { strength: 0.025, flutter: 0.006, refHeight: 1.3, ground: 0 }
  const plantMats = windMaterials(ctx, wind, { roughness: 0.55 })
  const plantScale = (g) => lerp(0.6, 1, smooth(0, 0.3, g))
  addVariantParts(ctx, {
    entries, variants, key: 'plant', mats: plantMats, scale: plantScale,
    color: (c, g, entry) => tone(ramp(c, g, [[0, '#7aa04a'], [0.3, '#5f8e3c'], [1, '#5a8a3a']]), entry),
  })
  addVariantParts(ctx, {
    entries, variants, key: 'spray', mats: plantMats, parent: plantScale,
    scale: (g) => smooth(0.4, 0.52, g) * (1 - smooth(0.9, 0.96, g)),
    color: (c, g, entry) => tone(c.set('#6a8a3a').lerp(tmp.set(entry.color), 0.25), entry),
  })
  const flowerItems = socketItems(random, entries, variants, 'flowers', { jitter: 0.01, scale: [0.9, 1.1] })
  const flowerMats = windMaterials(ctx, wind, { roughness: 0.5 })
  addItemsPart(ctx, {
    geometries: [orchidFlower(random), orchidFlower(random, { size: 0.064 })],
    items: flowerItems, mats: flowerMats,
    scale: (g, entry) => smooth(entry.socket.open, entry.socket.open + 0.05, g) * (1 - smooth(0.9, 0.96, g)),
    color: (c, g, entry) => tone(c.set(entry.entry.color), entry),
  })
  addItemsPart(ctx, {
    geometries: bud({ length: 0.03, radius: 0.008, sides: 5, tip: 0.6 }),
    items: flowerItems, mats: flowerMats,
    scale: (g, entry) => smooth(0.48, 0.52, g) * (1 - smooth(entry.socket.open, entry.socket.open + 0.03, g)),
    color: (c, g, entry) => tone(c.set('#7a9a48').lerp(tmp.set(entry.entry.color), 0.5), entry),
  })
  return {
    plot, soil: 'none', bund: false, scarecrow: false,
    camera: { position: V(7.2, 2.05, 10.8), target: V(-0.4, 0.95, 1.4) },
  }
}
