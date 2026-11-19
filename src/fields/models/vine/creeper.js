// Ground creeper family: pumpkins, melons and gourds sprawling over soil or riverbed sand.
// Runners radiate from each hill; big leaves stand up on petioles; flowers open at the nodes
// and fruit lie on the ground beside the runners.
import * as THREE from 'three'
import { merge, tube } from '../../geometry.js'
import { ramp, rowSpots, tone } from '../../crops.js'
import { TAU, V, addItemsPart, addVariantParts, aim, bloom, leafDisc, lerp, placeFlat, plantEntries, river, sandField, smooth, socketItems, windMaterials } from './kit.js'
import { cucurbitFlower } from './parts.js'

const tmp = new THREE.Color()

function tendril(random, at, direction) {
  const points = []
  const axis = direction.clone().normalize()
  const side = V(-axis.z, 0, axis.x)
  for (let k = 0; k <= 8; k += 1) {
    const t = k / 8
    const a = t * TAU * 1.6
    const r = 0.018 * (1 - t * 0.5)
    points.push(at.clone().addScaledVector(axis, 0.05 + t * 0.06).addScaledVector(side, Math.cos(a) * r).add(V(0, 0.03 + t * 0.05 + Math.sin(a) * r, 0)))
  }
  return tube([at, ...points], 0.0018, 0.001, { radial: 3, tubular: 10, color: '#ffffff' })
}

function creeperVariant(random, spec, templates) {
  const crown = []
  const runners = []
  const flowers = []
  const fruits = []
  const petiole = spec.petiole || [0.08, 0.26]
  // crown: the first leaves around the hill
  const crownLeaves = 4
  for (let k = 0; k < crownLeaves; k += 1) {
    const a = (k / crownLeaves) * TAU + random.gauss() * 0.4
    const out = V(Math.cos(a), 0, Math.sin(a))
    const h = petiole[1] * random.range(0.55, 0.8)
    const top = out.clone().multiplyScalar(0.05).add(V(0, h, 0))
    crown.push(tube([V(0, 0.005, 0), out.clone().multiplyScalar(0.02).add(V(0, h * 0.6, 0)), top], 0.005, 0.004, { radial: 3, tubular: 3, color: '#f0f4e0' }))
    const leaf = templates[k % templates.length].clone()
    const ls = 0.8 * random.range(0.85, 1.1)
    leaf.scale(ls, ls, ls)
    crown.push(placeFlat(leaf, top, Math.atan2(out.x, out.z) + random.gauss() * 0.3, random.range(0.2, 0.6), random.gauss() * 0.2))
  }
  const count = Math.round(random.range(spec.runners[0], spec.runners[1]))
  for (let r = 0; r < count; r += 1) {
    let heading = (r / count) * TAU + random.gauss() * 0.35
    const length = random.range(spec.runLength[0], spec.runLength[1])
    const p = V(0, 0.012, 0)
    const points = [p.clone()]
    for (let step = 0; step < 8; step += 1) {
      heading += random.gauss() * 0.22
      p.add(V(Math.cos(heading) * length / 8, 0, Math.sin(heading) * length / 8))
      p.y = 0.012 + random() * 0.01
      points.push(p.clone())
    }
    runners.push(tube(points, spec.stem || 0.008, 0.004, { radial: 4, tubular: 14, color: '#f0f4e0' }))
    const curve = new THREE.CatmullRomCurve3(points)
    let side = random() < 0.5 ? 1 : -1
    let nodeIndex = 0
    for (let d = spec.nodeGap * 0.7; d < length - 0.04; d += spec.nodeGap * random.range(0.8, 1.2)) {
      const t = d / length
      const at = curve.getPointAt(t)
      const tangent = curve.getTangentAt(t)
      tangent.y = 0
      tangent.normalize()
      const lateral = V(-tangent.z, 0, tangent.x).multiplyScalar(side)
      side *= -1
      nodeIndex += 1
      const ls = lerp(1, spec.tipLeaf ?? 0.5, Math.pow(t, 1.4)) * random.range(0.85, 1.1)
      const h = lerp(petiole[1], petiole[0], t) * random.range(0.8, 1.15)
      const top = at.clone().addScaledVector(lateral, 0.05 * ls).addScaledVector(tangent, 0.02).add(V(0, h, 0))
      runners.push(tube([at, at.clone().addScaledVector(lateral, 0.02).add(V(0, h * 0.65, 0)), top], 0.0045, 0.0032, { radial: 3, tubular: 3, color: '#f0f4e0' }))
      const facing = lateral.clone().multiplyScalar(0.8).addScaledVector(tangent, 0.6)
      const leaf = templates[nodeIndex % templates.length].clone()
      leaf.scale(ls, ls, ls)
      runners.push(placeFlat(leaf, top, Math.atan2(facing.x, facing.z) + random.gauss() * 0.3, random.range(0.12, 0.55), random.gauss() * 0.2))
      if (random() < 0.35) runners.push(tendril(random, at, tangent.clone().addScaledVector(lateral, -0.8)))
      if (random() < spec.flowerChance) {
        const lift = Math.min(h * 0.55, 0.14) + 0.03
        flowers.push({ p: at.clone().addScaledVector(lateral, -0.04).add(V(0, lift, 0)), q: aim(V(random.gauss() * 0.35, 1, random.gauss() * 0.35), random() * TAU), s: 1, offset: (0.4 - t) * 0.08 })
      }
      if (t > 0.18 && t < 0.8 && fruits.length < spec.fruitMax && random() < spec.fruitChance) {
        const spot = at.clone().addScaledVector(lateral, -(spec.fruitOffset ?? 0.12))
        const yaw = Math.atan2(tangent.x, tangent.z) + random.gauss() * 0.4
        fruits.push({ p: spot, q: new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), s: 1, onGround: true, lift: -0.008, offset: (0.5 - t) * 0.06 })
      }
    }
  }
  if (!fruits.length) {
    const a = random() * TAU
    fruits.push({ p: V(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5), q: new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), random() * TAU), s: 1, onGround: true, lift: -0.008, offset: 0 })
  }
  return { crown: merge(crown), runners: merge(runners), flowers, fruits }
}

export function buildCreeper(ctx, spec) {
  const { random, quality } = ctx
  const { width, depth } = spec.plot
  let ground
  if (spec.sand) {
    ground = sandField(ctx, { width, depth, sand: spec.sandColor || '#dcc9a2', margin: 9 })
    if (spec.river) river(ctx, { x0: -(width / 2 + 6.2), x1: -(width / 2 + 22) })
  } else {
    ground = (x) => 0.034 * (Math.cos(2 * Math.PI * ((x + width / 2) / spec.rowGap - 0.5)) * 0.5 + 0.5)
  }
  const spots = rowSpots({ width, depth: depth - (spec.margin ?? 1.2), rowGap: spec.rowGap, plantGap: spec.plantGap / Math.sqrt(quality), random, jitter: spec.jitter ?? 0.2, skip: 0.04 })
  if (spec.sand) spots.forEach((spot) => { spot[0] += random.gauss() * spec.rowGap * 0.12 })
  const templates = [0, 1, 2].map(() => leafDisc(random, { ...spec.leaf, size: spec.leaf.size * random.range(0.9, 1.1) }))
  const variants = [0, 1, 2].map(() => creeperVariant(random, spec, templates))
  const entries = plantEntries(random, spots, { variants: 3, height: (x, z) => ground(x, z) + 0.003, tilt: 0.02 })

  const wind = { strength: 0.07, flutter: 0.012, refHeight: 0.4, ground: 0 }
  const leafMats = windMaterials(ctx, wind, { roughness: spec.leafRoughness ?? 0.8 })
  const leafColor = (c, g, entry) => {
    ramp(c, g, spec.leafRamp)
    if (entry.pick < 0.12) c.lerp(tmp.set('#b0a24a'), smooth(0.72, 1, g) * 0.8)
    return tone(c, entry)
  }
  addVariantParts(ctx, { entries, variants, key: 'crown', mats: leafMats, scale: (g) => lerp(0.15, 1, smooth(0, 0.28, g)), color: leafColor })
  addVariantParts(ctx, { entries, variants, key: 'runners', mats: leafMats, scale: (g) => Math.max(0.001, smooth(0.07, 0.42, g)), color: leafColor })

  const flowerItems = socketItems(random, entries, variants, 'flowers', { jitter: 0.04 })
  const flowerMats = windMaterials(ctx, wind, { roughness: 0.7 })
  addItemsPart(ctx, {
    geometries: [cucurbitFlower(random, { size: spec.flowerSize }), cucurbitFlower(random, { size: spec.flowerSize, cup: 0.38 })],
    items: flowerItems, mats: flowerMats,
    scale: (g) => bloom(g, spec.flowerStart ?? 0.33, spec.flowerEnd ?? 0.74, 0.06),
    color: (c, g, entry) => tone(c.set(spec.flowerColor || '#f6c21c'), entry),
  })

  const camera = spec.camera || { position: V(6.6, 1.85, 10.2), target: V(-0.6, 0.15, 2.4) }
  const fruitSize = spec.fruitScale ?? 1
  const fruitItems = socketItems(random, entries, variants, 'fruits', { jitter: 0.03, scale: [0.82 * fruitSize, 1.15 * fruitSize], ground })
  // a few extra fruit on the plants nearest the camera, so the crop reads at a glance
  if (spec.nearFruit) {
    for (const entry of entries) {
      if (Math.hypot(entry.p.x - camera.position.x, entry.p.z - camera.position.z) > 8) continue
      for (let index = 0; index < spec.nearFruit; index += 1) {
        const a = random() * TAU
        const r = random.range(0.18, 0.5)
        const x = entry.p.x + Math.cos(a) * r
        const z = entry.p.z + Math.sin(a) * r
        fruitItems.push({ p: V(x, ground(x, z) - 0.008, z), q: new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), random() * TAU), s: random.range(0.85, 1.15) * fruitSize, offset: entry.offset + random.gauss() * 0.03, tone: entry.tone + random.gauss() * 0.05, pick: random() })
      }
    }
  }
  const fruitMats = windMaterials(ctx, { strength: 0, flutter: 0, refHeight: 1, ground: 0 }, { roughness: spec.fruitRoughness ?? 0.5, metalness: 0, emissive: '#000000', transparent: false, envMapIntensity: spec.fruitEnv ?? 1, ...(spec.fruitMap ? { map: spec.fruitMap(random) } : {}) })
  if (spec.fruitMap) ctx.disposables.push(fruitMats.material.map)
  const [f0, f1] = spec.fruitGrow || [0.46, 0.84]
  addItemsPart(ctx, {
    geometries: [0, 1, 2].map((index) => spec.fruit(random, index)),
    items: fruitItems, mats: fruitMats,
    scale: (g) => lerp(0.18, 1, smooth(f0, f1, g)) * smooth(f0 - 0.02, f0 + 0.03, g),
    color: (c, g, entry) => tone(ramp(c, g, spec.fruitRamp), entry),
  })

  return {
    plot: { width, depth, rowGap: spec.rowGap },
    soil: spec.sand ? 'none' : 'furrow',
    bund: !spec.sand,
    grass: !spec.sand,
    scarecrow: spec.scarecrow ?? !spec.sand,
    camera,
  }
}
