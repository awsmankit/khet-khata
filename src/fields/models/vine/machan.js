// Machan (pandal) family: gourds trained over a bamboo frame about 2 m high with a jute string
// lattice on top. Vines spiral up the poles, spread into a leafy roof, and fruit hang beneath.
import * as THREE from 'three'
import { GrowingPart, merge, prep, tube } from '../../geometry.js'
import { ramp, tone } from '../../crops.js'
import { TAU, V, addItemsPart, bloom, leafDisc, lerp, noise, rigidMaterial, smooth, staticMesh, windMaterials, yawPitch, aim } from './kit.js'
import { cucurbitFlower } from './parts.js'

const tmp = new THREE.Color()

function bambooColor(c, x, y, z) {
  const node = ((y + x * 3.1 + z * 1.7) % 0.42 + 0.42) % 0.42 < 0.035
  c.set('#bba26c').lerp(tmp.set('#86775a'), Math.max(0, 0.5 - y) * 0.9)
  if (node) c.multiplyScalar(0.72)
}

// Leaf on a short petiole, petiole base at the origin.
function petioledLeaf(random, shape, { petiole = 0.08 } = {}) {
  const blade = leafDisc(random, shape)
  const stem = tube([V(0, -petiole * 0.5, -petiole), V(0, -petiole * 0.1, -petiole * 0.45), V(0, 0, 0.01)], 0.0045, 0.0035, { radial: 4, tubular: 2, color: '#8faa5a' })
  return merge([blade, stem])
}

export function buildMachan(ctx, spec) {
  const { random, quality } = ctx
  const poleX = [-3.75, -1.25, 1.25, 3.75]
  const poleZ = [-5, -2.5, 0, 2.5, 5]
  const roof = { x: 4.45, z: 5.7, y: 2.0 }
  const plot = { width: 10, depth: 13, rowGap: 2.5 }
  const poles = []
  poleX.forEach((x) => poleZ.forEach((z) => poles.push(V(x + random.gauss() * 0.04, 0.035, z + random.gauss() * 0.04))))
  const nearestPole = (x, z) => poles.reduce((best, pole) => Math.min(best, Math.hypot(pole.x - x, pole.z - z)), Infinity)

  /* ---------- the bamboo machan (rigid, no wind) */
  const bamboo = []
  for (const pole of poles) {
    const top = V(pole.x + random.gauss() * 0.012, roof.y + 0.1, pole.z + random.gauss() * 0.012)
    bamboo.push(tube([V(pole.x, -0.15, pole.z), V(pole.x, 1.0, pole.z), top], 0.042, 0.032, { radial: 7, tubular: 12, colorFn: bambooColor }))
  }
  for (const z of poleZ) {
    const points = []
    for (let x = -roof.x - 0.15; x <= roof.x + 0.16; x += 0.6) points.push(V(x, roof.y + 0.01 - 0.018 * Math.abs(Math.sin((Math.PI * (x + 3.75)) / 2.5)), z + random.gauss() * 0.01))
    bamboo.push(tube(points, 0.024, 0.022, { radial: 6, tubular: points.length * 2, colorFn: bambooColor }))
  }
  for (const x of poleX) {
    const points = []
    for (let z = -roof.z - 0.15; z <= roof.z + 0.16; z += 0.6) points.push(V(x + random.gauss() * 0.01, roof.y + 0.045 - 0.015 * Math.abs(Math.sin((Math.PI * z) / 2.5)), z))
    bamboo.push(tube(points, 0.021, 0.019, { radial: 6, tubular: points.length * 2, colorFn: bambooColor }))
  }
  staticMesh(ctx, merge(bamboo), rigidMaterial(ctx, { roughness: 0.75 }))

  // jute string lattice on top, sagging a little between the bamboo
  const strings = []
  const stringColor = (c, x, y, z) => c.set('#a08a5e').multiplyScalar(0.85 + 0.2 * Math.sin(x * 13 + z * 7))
  const gap = 0.34
  for (let z = -roof.z; z <= roof.z + 0.01; z += gap) {
    const points = []
    for (let x = -roof.x; x <= roof.x + 0.01; x += roof.x / 8) points.push(V(x, roof.y + 0.05 - 0.035 * Math.abs(Math.sin((Math.PI * (x + 3.75)) / 2.5)) * Math.abs(Math.sin((Math.PI * z) / 2.5)), z))
    strings.push(tube(points, 0.005, 0.005, { radial: 3, tubular: 16, colorFn: stringColor }))
  }
  for (let x = -roof.x; x <= roof.x + 0.01; x += gap) {
    const points = []
    for (let z = -roof.z; z <= roof.z + 0.01; z += roof.z / 9) points.push(V(x, roof.y + 0.055 - 0.035 * Math.abs(Math.sin((Math.PI * (x + 3.75)) / 2.5)) * Math.abs(Math.sin((Math.PI * z) / 2.5)), z))
    strings.push(tube(points, 0.005, 0.005, { radial: 3, tubular: 18, colorFn: stringColor }))
  }
  // guy ropes from the corner poles to pegs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const top = V(sx * 3.75, roof.y + 0.05, sz * 5)
      const peg = V(sx * (3.75 + 1.3), 0.02, sz * (5 + 1.3))
      strings.push(tube([top, top.clone().lerp(peg, 0.5).add(V(0, -0.06, 0)), peg], 0.006, 0.006, { radial: 3, tubular: 8, colorFn: stringColor }))
      strings.push(tube([peg.clone().add(V(0, -0.1, 0)), peg.clone().add(V(0, 0.08, 0))], 0.02, 0.016, { radial: 5, tubular: 1, color: '#8a7350' }))
    }
  }
  staticMesh(ctx, merge(strings), rigidMaterial(ctx, { roughness: 1 }), { castShadow: false })

  /* ---------- vines */
  const wind = { strength: 0.05, flutter: 0.014, refHeight: 2.1, ground: 0 }
  const leafMats = windMaterials(ctx, wind, { roughness: spec.leafRoughness ?? 0.78 })
  const stemMats = windMaterials(ctx, wind, { roughness: 0.85 })
  const leafColor = (c, g, entry) => {
    ramp(c, g, spec.leafRamp)
    if (entry.pick < 0.07) c.lerp(tmp.set('#b4a446'), smooth(0.7, 0.95, g))
    return tone(c, entry)
  }
  const stemColor = (c, g, entry) => tone(ramp(c, g, [[0, '#7fa44a'], [0.6, '#6d9440'], [1, '#8a8c48']]), entry)

  // stems spiralling up each pole (two plants per pole)
  const climbVariants = [0, 1].map((variant) => {
    const points = []
    const phase = variant * Math.PI + random() * 0.5
    for (let k = 0; k <= 16; k += 1) {
      const a = phase + k * 0.85
      points.push(V(Math.cos(a) * 0.055, (k / 16) * (roof.y + 0.08), Math.sin(a) * 0.055))
    }
    return tube(points, 0.009, 0.006, { radial: 4, tubular: 40, color: '#ffffff' })
  })
  const poleItems = poles.map((pole) => ({ p: pole.clone(), q: new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), random() * TAU), s: 1, offset: random.gauss() * 0.015, tone: random.gauss() * 0.06, pick: random() }))
  climbVariants.forEach((geometry) => ctx.addPart(new GrowingPart({
    geometry, material: stemMats.material, depthMaterial: stemMats.depth, items: poleItems,
    scale: (g) => [1, lerp(0.02, 1, smooth(0.03, 0.3, g)), 1],
    color: stemColor,
  })))

  // runners fanning out over the lattice from each pole top, kept inside the frame
  for (const pole of poles) {
    const runners = []
    const count = 7
    for (let index = 0; index < count; index += 1) {
      let heading = (index / count) * TAU + random.gauss() * 0.3
      const length = random.range(1.2, 1.75)
      const p = V(0, roof.y + 0.06, 0)
      const points = [p.clone()]
      for (let step = 0; step < 6; step += 1) {
        heading += random.gauss() * 0.3
        const next = p.clone().add(V(Math.cos(heading) * length / 6, 0, Math.sin(heading) * length / 6))
        if (Math.abs(next.x + pole.x) > roof.x - 0.05 || Math.abs(next.z + pole.z) > roof.z - 0.05) break
        p.copy(next)
        p.y = roof.y + 0.065 + random() * 0.03
        points.push(p.clone())
      }
      if (points.length > 1) runners.push(tube(points, 0.007, 0.004, { radial: 4, tubular: 2 * points.length, color: '#ffffff' }))
    }
    const poleItem = { p: V(pole.x, 0, pole.z), q: new THREE.Quaternion(), s: 1, offset: random.gauss() * 0.015, tone: random.gauss() * 0.06, pick: 1 }
    ctx.addPart(new GrowingPart({
      geometry: merge(runners), material: stemMats.material, depthMaterial: stemMats.depth, items: [poleItem],
      scale: (g) => { const s = Math.max(0.001, smooth(0.22, 0.48, g)); return [s, 1, s] },
      color: stemColor,
    }))
    // a matted layer of vine and leaf around each pole top; the patches meet into one ceiling
    const x0 = Math.max(-1.32, -roof.x - pole.x + 0.02)
    const x1 = Math.min(1.32, roof.x - pole.x - 0.02)
    const z0 = Math.max(-1.32, -roof.z - pole.z + 0.02)
    const z1 = Math.min(1.32, roof.z - pole.z - 0.02)
    const patch = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 9, 9)
    patch.rotateX(-Math.PI / 2)
    patch.translate((x0 + x1) / 2, 0, (z0 + z1) / 2)
    const position = patch.attributes.position
    const lift = roof.y + 0.08 + random.gauss() * 0.008
    const seed = random() * 40
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const z = position.getZ(index)
      const edge = Math.min(x - x0, x1 - x, z - z0, z1 - z)
      position.setY(index, lift + (noise(x * 3 + seed, z * 3) - 0.5) * 0.07 - (edge < 0.05 ? 0.03 : 0))
    }
    patch.computeVertexNormals()
    const patchGeometry = prep(patch, '#ffffff', (c, x, y, z) => c.setScalar(0.7 + noise(x * 5 + seed, z * 5 - seed) * 0.25))
    ctx.addPart(new GrowingPart({
      geometry: patchGeometry, material: leafMats.material, depthMaterial: leafMats.depth, items: [poleItem],
      scale: (g) => { const s = Math.max(0.001, smooth(0.25, 0.56, g)); return [s, 1, s] },
      color: (c, g, entry) => tone(ramp(c, g, spec.leafRamp), entry),
    }))
  }

  const leafGeometries = [0, 1, 2].map(() => petioledLeaf(random, { ...spec.leaf, size: spec.leaf.size * random.range(0.9, 1.1) }))
  const leafItems = []
  const leafScale = (g, entry) => smooth(entry.g0, entry.g0 + 0.07, g) * lerp(0.55, 1, smooth(entry.g0, entry.g0 + 0.22, g))

  // leaves along the climbing stems
  for (const pole of poles) {
    for (let k = 0; k < 9; k += 1) {
      const h = 0.12 + k * 0.22 + random() * 0.08
      const a = random() * TAU
      const out = V(Math.cos(a), 0, Math.sin(a))
      leafItems.push({ p: pole.clone().addScaledVector(out, 0.06).add(V(0, h, 0)), q: yawPitch(Math.atan2(out.x, out.z), random.range(0.25, 0.7), random.gauss() * 0.3), s: random.range(0.75, 1.0), g0: 0.03 + 0.25 * (h / roof.y) + random.gauss() * 0.01, offset: 0, tone: random.gauss() * 0.07, pick: random() })
    }
  }
  // the leafy roof: an even jittered grid of leaves on top, and a looser layer under the strings
  const area = roof.x * 2 * roof.z * 2
  const step = (spec.leaf.size * spec.leafStep) / Math.sqrt(quality)
  for (let x = -roof.x + step / 2; x < roof.x; x += step) {
    for (let z = -roof.z + step / 2; z < roof.z; z += step) {
      const layers = random() < spec.underShare ? 2 : 1
      for (let layer = 0; layer < layers; layer += 1) {
        const under = layer === 1
        const px = Math.min(roof.x, Math.max(-roof.x, x + random.gauss() * step * 0.35))
        const pz = Math.min(roof.z, Math.max(-roof.z, z + random.gauss() * step * 0.35))
        const d = nearestPole(px, pz)
        const y = under ? roof.y - random.range(0.0, 0.08) : roof.y + 0.1 + random() * 0.08
        leafItems.push({ p: V(px, y, pz), q: yawPitch(random() * TAU, under ? random.range(-0.7, -0.1) : random.range(0.0, 0.45), random.gauss() * 0.25), s: random.range(0.85, 1.15), g0: 0.26 + 0.2 * Math.min(1, d / 1.8) + random.gauss() * 0.02, offset: 0, tone: random.gauss() * 0.08 + (under ? 0.08 : 0), pick: random() })
      }
    }
  }
  // vine tips draped over the roof edges
  const drapes = []
  const perimeter = [[-roof.x, -roof.z, roof.x, -roof.z], [roof.x, -roof.z, roof.x, roof.z], [roof.x, roof.z, -roof.x, roof.z], [-roof.x, roof.z, -roof.x, -roof.z]]
  for (const [x0, z0, x1, z1] of perimeter) {
    const length = Math.hypot(x1 - x0, z1 - z0)
    const out = V(z1 - z0, 0, -(x1 - x0)).normalize()
    for (let d = random() * 0.5; d < length; d += random.range(0.35, 0.75)) {
      const base = V(lerp(x0, x1, d / length), roof.y + 0.06, lerp(z0, z1, d / length))
      drapes.push({ base, out })
    }
  }
  const drapeStems = []
  for (const { base, out } of drapes) {
    const drop = random.range(0.25, 0.75)
    const end = base.clone().addScaledVector(out, 0.12).add(V(random.gauss() * 0.05, -drop, random.gauss() * 0.05))
    drapeStems.push(tube([base, base.clone().addScaledVector(out, 0.1).add(V(0, -0.05, 0)), end], 0.005, 0.003, { radial: 3, tubular: 6, color: '#ffffff' }))
    const g0 = 0.44 + random() * 0.12
    for (let k = 0; k < 3; k += 1) {
      const t = 0.3 + k * 0.3
      const p = base.clone().lerp(end, t).addScaledVector(out, 0.02)
      leafItems.push({ p, q: yawPitch(Math.atan2(out.x, out.z) + random.gauss() * 0.5, random.range(-1.3, -0.6), random.gauss() * 0.3), s: random.range(0.6, 0.9), g0: g0 + t * 0.05, offset: 0, tone: random.gauss() * 0.07, pick: random() })
    }
  }
  // drape stems shrink up towards the roof while they are young
  const drapeGeometry = merge(drapeStems)
  drapeGeometry.translate(0, -(roof.y + 0.06), 0)
  ctx.addPart(new GrowingPart({
    geometry: drapeGeometry, material: stemMats.material, depthMaterial: stemMats.depth,
    items: [{ p: V(0, roof.y + 0.06, 0), q: new THREE.Quaternion(), s: 1, offset: 0, tone: 0, pick: 1 }],
    scale: (g) => [1, Math.max(0.001, smooth(0.44, 0.6, g)), 1],
    color: stemColor,
  }))
  addItemsPart(ctx, { geometries: leafGeometries, items: leafItems, mats: leafMats, scale: leafScale, color: leafColor })

  /* ---------- flowers: above the roof and peeping out beneath it */
  const flowerItems = []
  const flowerCount = Math.round(area * spec.flowers * quality)
  for (let index = 0; index < flowerCount; index += 1) {
    const x = random.range(-roof.x, roof.x)
    const z = random.range(-roof.z, roof.z)
    const under = random() < 0.4
    const direction = under ? V(random.gauss() * 0.6, -1, random.gauss() * 0.6) : V(random.gauss() * 0.4, 1, random.gauss() * 0.4)
    flowerItems.push({ p: V(x, under ? roof.y - 0.04 - random() * 0.06 : roof.y + 0.17 + random() * 0.06, z), q: aim(direction, random() * TAU), s: random.range(0.85, 1.15), offset: random.gauss() * 0.05, tone: random.gauss() * 0.05 })
  }
  const flowerMats = windMaterials(ctx, wind, { roughness: 0.7, emissive: spec.flowerEmissive || '#000000' })
  addItemsPart(ctx, {
    geometries: [cucurbitFlower(random, { size: spec.flowerSize }), cucurbitFlower(random, { size: spec.flowerSize, cup: 0.4 })],
    items: flowerItems, mats: flowerMats,
    scale: (g) => bloom(g, 0.34, 0.84, 0.06),
    color: (c, g, entry) => tone(c.set(spec.flowerColor), entry),
  })

  /* ---------- fruit hanging beneath the roof */
  const fruitItems = []
  const fruitCount = Math.round(area * spec.fruitDensity * Math.max(quality, 0.7))
  for (let index = 0; index < fruitCount; index += 1) {
    const x = random.range(-roof.x + 0.15, roof.x - 0.15)
    const z = random.range(-roof.z + 0.15, roof.z - 0.15)
    if (nearestPole(x, z) < 0.22) continue
    fruitItems.push({ p: V(x, roof.y + 0.01, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(random.gauss() * 0.07, random() * TAU, random.gauss() * 0.07, 'YXZ')), s: random.range(0.85, 1.15) * (spec.fruitScale ?? 1), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06, pick: random() })
  }
  // fruit sit in the shade of the roof: light colours and a faint glow keep them readable
  const fruitMats = windMaterials(ctx, { ...wind, flutter: 0.004 }, { roughness: spec.fruitRoughness ?? 0.55, emissive: spec.fruitGlow ?? '#1e2614' })
  const ripe = (entry) => entry.pick < (spec.ripeShare ?? 0)
  const groups = spec.ripeFruit
    ? [[fruitItems.filter((entry) => !ripe(entry)), [0, 1, 2].map(() => spec.fruit(random)), spec.fruitRamp], [fruitItems.filter(ripe), [0, 1].map(() => spec.ripeFruit(random)), spec.ripeRamp]]
    : [[fruitItems, [0, 1, 2].map(() => spec.fruit(random)), null]]
  for (const [items, geometries, stops] of groups) {
    addItemsPart(ctx, {
      geometries, items, mats: fruitMats,
      scale: (g) => lerp(0.2, 1, smooth(0.48, 0.7, g)) * smooth(0.44, 0.5, g),
      color: (c, g, entry) => tone(ramp(c, g, stops || (ripe(entry) ? spec.ripeRamp : spec.fruitRamp)), entry),
    })
  }

  // weeds and grass under the machan so bare soil does not dominate
  ctx.groundCover = 'orchard'
  return {
    plot, soil: 'furrow', scarecrow: false,
    // standing at the front edge of the roof, between two pole rows, looking down the aisle
    camera: { position: V(2.5, 1.3, 5.95), target: V(1.7, 1.45, -3.5) },
  }
}
