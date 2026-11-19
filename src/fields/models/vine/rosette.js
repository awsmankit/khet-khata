// Rosette family: strawberries on black-mulched raised beds, and pineapple sword-leaf rosettes.
import * as THREE from 'three'
import { blade, ellipsoid, merge, prep, transform, tube } from '../../geometry.js'
import { ramp, tone } from '../../crops.js'
import { TAU, V, addItemsPart, addVariantParts, aim, bloom, leafDisc, lerp, placeFlat, plantEntries, rigidMaterial, smooth, socketItems, staticMesh, windMaterials } from './kit.js'
import { pineappleFruit, strawberry, strawberryFlower } from './parts.js'

const tmp = new THREE.Color()

/* ---------------------------------------------------------------- strawberry */
const BED_TOP = 0.22

function strawberryVariant(random, leaflets) {
  const plant = []
  const flowers = []
  const berries = []
  plant.push(ellipsoid(0.025, 0.02, 0.025, { widthSegments: 6, heightSegments: 3, color: '#8a7a50' }))
  const leaves = 10 + Math.floor(random() * 4)
  for (let index = 0; index < leaves; index += 1) {
    const a = index * 2.4 + random.gauss() * 0.2
    const out = V(Math.cos(a), 0, Math.sin(a))
    const reach = random.range(0.05, 0.13)
    const h = random.range(0.09, 0.17)
    const top = out.clone().multiplyScalar(reach).add(V(0, h, 0))
    plant.push(tube([V(0, 0.01, 0), out.clone().multiplyScalar(reach * 0.3).add(V(0, h * 0.7, 0)), top], 0.0028, 0.0022, { radial: 3, tubular: 4, color: '#c8d0a0' }))
    const yaw = Math.atan2(out.x, out.z)
    for (let leaflet = -1; leaflet <= 1; leaflet += 1) {
      const geometry = leaflets[(index + leaflet + 3) % leaflets.length].clone()
      const s = leaflet === 0 ? 1.05 : 0.92
      geometry.scale(s, s, s)
      plant.push(placeFlat(geometry, top, yaw + leaflet * 0.85, random.range(-0.05, 0.3) + (1 - reach / 0.13) * 0.25, leaflet * 0.25))
    }
  }
  // flower trusses stand among the leaves
  const trusses = 2 + Math.floor(random() * 2)
  for (let index = 0; index < trusses; index += 1) {
    const a = random() * TAU
    const out = V(Math.cos(a), 0, Math.sin(a))
    const top = out.clone().multiplyScalar(random.range(0.07, 0.12)).add(V(0, random.range(0.12, 0.17), 0))
    plant.push(tube([V(0, 0.01, 0), out.clone().multiplyScalar(0.03).add(V(0, top.y * 0.75, 0)), top], 0.0022, 0.0018, { radial: 3, tubular: 3, color: '#c8d0a0' }))
    for (let f = 0; f < 2; f += 1) {
      const p = top.clone().add(V(random.gauss() * 0.02, 0.005 * f, random.gauss() * 0.02))
      flowers.push({ p, q: aim(out.clone().multiplyScalar(0.6).add(V(0, 1, 0)), random() * TAU), s: 1, offset: random.gauss() * 0.04 })
    }
  }
  // berries on arching pedicels that rest them on the mulch around the crown
  const count = 4 + Math.floor(random() * 4)
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * TAU + random.gauss() * 0.3
    const out = V(Math.cos(a), 0, Math.sin(a))
    const reach = random.range(0.13, 0.2)
    const hang = V(0, 0.058, 0).addScaledVector(out, reach)
    plant.push(tube([V(0, 0.02, 0), out.clone().multiplyScalar(reach * 0.45).add(V(0, 0.11, 0)), hang.clone().add(V(0, 0.012, 0))], 0.0018, 0.0015, { radial: 3, tubular: 5, color: '#c8d0a0' }))
    berries.push({ p: hang, q: aim(out.clone().multiplyScalar(-0.5).add(V(0, 1, 0)), random() * TAU), s: 1, offset: random.gauss() * 0.06 })
  }
  return { plant: merge(plant), flowers, berries }
}

export function buildStrawberry(ctx) {
  const { random, quality } = ctx
  const plot = { width: 9, depth: 14, rowGap: 1.5 }
  const bedLength = plot.depth - 1.0
  const bedX = []
  for (let index = 0; index < 6; index += 1) bedX.push(-plot.width / 2 + 1.5 * (index + 0.5))

  // raised beds wrapped in black plastic mulch, tucked into soil at the base
  const shape = new THREE.Shape()
  shape.moveTo(-0.56, -0.02)
  shape.lineTo(-0.5, BED_TOP - 0.05)
  shape.quadraticCurveTo(-0.47, BED_TOP, -0.42, BED_TOP)
  shape.lineTo(0.42, BED_TOP)
  shape.quadraticCurveTo(0.47, BED_TOP, 0.5, BED_TOP - 0.05)
  shape.lineTo(0.56, -0.02)
  shape.lineTo(-0.56, -0.02)
  const tuck = new THREE.Shape()
  tuck.moveTo(-0.64, -0.01)
  tuck.quadraticCurveTo(-0.58, 0.07, -0.52, 0.05)
  tuck.lineTo(-0.5, 0.0)
  tuck.lineTo(-0.64, -0.01)
  const beds = []
  const tucks = []
  for (const x of bedX) {
    const bed = new THREE.ExtrudeGeometry(shape, { depth: bedLength, bevelEnabled: false, steps: 1, curveSegments: 3 })
    bed.translate(x, 0, -bedLength / 2)
    beds.push(prep(bed, '#ffffff'))
    for (const side of [-1, 1]) {
      const strip = new THREE.ExtrudeGeometry(tuck, { depth: bedLength + 0.1, bevelEnabled: false, steps: 1, curveSegments: 3 })
      strip.scale(side, 1, 1)
      strip.translate(x, 0, -bedLength / 2 - 0.05)
      tucks.push(prep(strip, '#ffffff'))
    }
  }
  staticMesh(ctx, merge(beds), rigidMaterial(ctx, { vertexColors: false, color: '#17181a', roughness: 0.34, metalness: 0.05 }))
  staticMesh(ctx, merge(tucks), rigidMaterial(ctx, { vertexColors: false, color: '#7a5a3e', roughness: 1, side: THREE.DoubleSide }), { castShadow: false })

  // planting holes, two staggered rows per bed
  const spots = []
  const gap = 0.3 / Math.sqrt(quality)
  for (const x of bedX) {
    for (const side of [-1, 1]) {
      for (let z = -bedLength / 2 + 0.25 + (side > 0 ? gap / 2 : 0); z < bedLength / 2 - 0.2; z += gap) {
        if (random() < 0.02) continue
        spots.push([x + side * 0.22 + random.gauss() * 0.01, z + random.gauss() * 0.015])
      }
    }
  }
  const holes = spots.map(([x, z]) => {
    const disc = prep(new THREE.CircleGeometry(0.055, 9), '#ffffff')
    disc.rotateX(-Math.PI / 2)
    disc.translate(x, BED_TOP + 0.003, z)
    return disc
  })
  staticMesh(ctx, merge(holes), rigidMaterial(ctx, { vertexColors: false, color: '#5e4430', roughness: 1 }), { castShadow: false })

  const leaflets = [0, 1, 2].map(() => leafDisc(random, { size: 0.072, lobes: 1, depth: 0.3, sharp: 1, basal: 0.45, notch: 0, cup: 0.12, droop: 0.05, fold: 0.18, wave: 0.03, serrate: 0.09, detail: 16, rings: 2, vein: 0.12, stretch: 1.25 }))
  const variants = [0, 1, 2].map(() => strawberryVariant(random, leaflets))
  const entries = plantEntries(random, spots, { variants: 3, baseY: BED_TOP, tilt: 0.04 })
  const wind = { strength: 0.05, flutter: 0.01, refHeight: 0.4, ground: 0 }
  const plantMats = windMaterials(ctx, wind, { roughness: 0.62 })
  addVariantParts(ctx, {
    entries, variants, key: 'plant', mats: plantMats,
    scale: (g) => lerp(0.35, 1, smooth(0, 0.35, g)),
    color: (c, g, entry) => {
      ramp(c, g, [[0, '#5f9440'], [0.3, '#3f7a30'], [0.8, '#3b742e'], [1, '#4a7630']])
      if (entry.pick < 0.12) c.lerp(tmp.set('#8a4a2e'), 0.55)
      return tone(c, entry)
    },
  })
  const flowerMats = windMaterials(ctx, wind, { roughness: 0.6 })
  addItemsPart(ctx, {
    geometries: [strawberryFlower(random), strawberryFlower(random, { size: 0.04 })],
    items: socketItems(random, entries, variants, 'flowers'), mats: flowerMats,
    scale: (g) => bloom(g, 0.36, 0.7, 0.06),
    color: (c, g, entry) => tone(c.set('#fbfaf2'), entry),
  })
  const berryMats = windMaterials(ctx, { ...wind, flutter: 0.003 }, { roughness: 0.32 })
  addItemsPart(ctx, {
    geometries: [strawberry(random), strawberry(random), strawberry(random)],
    items: socketItems(random, entries, variants, 'berries', { jitter: 0.07 }), mats: berryMats,
    scale: (g) => smooth(0.48, 0.53, g) * lerp(0.35, 1, smooth(0.5, 0.72, g)),
    color: (c, g, entry) => tone(ramp(c, g, [[0.48, '#c8d890'], [0.6, '#e6e8b8'], [0.67, '#f0a08a'], [0.74, '#de3a40'], [0.86, '#c41f30'], [1, '#a81a2a']]), entry),
  })
  return {
    plot, soil: 'furrow', scarecrow: false,
    camera: { position: V(5.4, 1.4, 9.2), target: V(-0.6, 0.2, 3.6) },
  }
}

/* ---------------------------------------------------------------- pineapple */
function pineappleVariant(random) {
  const plant = []
  const crown = []
  const leaves = 34 + Math.floor(random() * 6)
  for (let index = 0; index < leaves; index += 1) {
    const young = index / leaves // later leaves are inner and more upright
    const a = index * 2.399 + random.gauss() * 0.08
    const length = lerp(0.95, 0.62, young) * random.range(0.9, 1.08)
    const geometry = blade({ length, width: random.range(0.045, 0.06), rise: lerp(0.55, 1.42, young) + random.gauss() * 0.06, droop: lerp(1.05, 0.35, young) * random.range(0.85, 1.15), segments: 6, fold: 0.45, shape: 'grass', base: '#a8aea0', tip: '#d6b8ae', rib: '#c8d0c0' })
    transform(geometry, { rotation: [0, -a + Math.PI / 2, 0] })
    geometry.translate(Math.cos(a) * 0.03, 0.02 + young * 0.14, Math.sin(a) * 0.03)
    plant.push(geometry)
  }
  // flower head / fruit on a short peduncle at the heart, with its leafy crown
  const heart = V(0, 0.16, 0)
  const fruitBase = V(0, 0.44, 0)
  crown.push(tube([heart, V(0.01, 0.3, 0), fruitBase.clone().add(V(0, 0.02, 0))], 0.016, 0.014, { radial: 6, tubular: 3, color: '#c4cca8' }))
  const fruitLength = 0.2
  for (let index = 0; index < 18; index += 1) {
    const a = index * 2.399
    const young = index / 18
    const geometry = blade({ length: lerp(0.17, 0.09, young), width: 0.03, rise: lerp(0.9, 1.45, young), droop: 0.35, segments: 3, fold: 0.4, shape: 'grass', base: '#b8c0b0', tip: '#e0e4d8' })
    transform(geometry, { rotation: [0, -a + Math.PI / 2, 0] })
    geometry.translate(Math.cos(a) * 0.012, fruitBase.y + fruitLength - 0.02 + young * 0.03, Math.sin(a) * 0.012)
    crown.push(geometry)
  }
  const fruit = pineappleFruit(random)
  fruit.translate(0, fruitBase.y, 0)
  // bracts under the fruit
  const bracts = []
  for (let index = 0; index < 5; index += 1) {
    const geometry = blade({ length: 0.07, width: 0.025, rise: 1.0, droop: 0.4, segments: 2, fold: 0.3, shape: 'lance', base: '#c0a8a0', tip: '#d8c0b8' })
    transform(geometry, { rotation: [0, index * 1.26, 0] })
    geometry.translate(0, fruitBase.y - 0.005, 0)
    bracts.push(geometry)
  }
  return { plant: merge(plant), crown: merge([...crown, ...bracts]), fruit, pivots: { crown: heart, fruit: heart } }
}

export function buildPineapple(ctx) {
  const { random, quality } = ctx
  const plot = { width: 12, depth: 16, rowGap: 1.2 }
  const spots = []
  const gap = 0.42 / Math.sqrt(quality)
  for (let ridge = 0; ridge < 10; ridge += 1) {
    const x = -plot.width / 2 + plot.rowGap * (ridge + 0.5)
    for (const side of [-1, 1]) {
      for (let z = -plot.depth / 2 + 0.4 + (side > 0 ? gap / 2 : 0); z < plot.depth / 2 - 0.3; z += gap) {
        if (random() < 0.025) continue
        spots.push([x + side * 0.22 + random.gauss() * 0.02, z + random.gauss() * 0.03])
      }
    }
  }
  const variants = [0, 1, 2].map(() => pineappleVariant(random))
  const entries = plantEntries(random, spots, { variants: 3, baseY: 0.03, tilt: 0.06, scale: [0.85, 1.1] })
  entries.forEach((entry) => { entry.offset = random.gauss() * 0.04 })
  const wind = { strength: 0.06, flutter: 0.008, refHeight: 1, ground: 0 }
  const plantScale = (g) => lerp(0.22, 1, smooth(0, 0.42, g))
  const leafMats = windMaterials(ctx, wind, { roughness: 0.5 })
  addVariantParts(ctx, {
    entries, variants, key: 'plant', mats: leafMats, scale: plantScale,
    color: (c, g, entry) => tone(ramp(c, g, [[0, '#6a8a4c'], [0.4, '#55794a'], [0.8, '#587a48'], [1, '#6a7a48']]), entry),
  })
  const emerge = (g) => smooth(0.4, 0.5, g) * lerp(0.45, 1, smooth(0.5, 0.82, g))
  const crownMats = windMaterials(ctx, wind, { roughness: 0.55 })
  addVariantParts(ctx, {
    entries, variants, key: 'crown', mats: crownMats, parent: plantScale, scale: emerge,
    color: (c, g, entry) => tone(ramp(c, g, [[0.4, '#9a5a5a'], [0.52, '#7a7050'], [0.7, '#5f8048'], [1, '#668044']]), entry),
  })
  const fruitMats = windMaterials(ctx, wind, { roughness: 0.6 })
  addVariantParts(ctx, {
    entries, variants, key: 'fruit', mats: fruitMats, parent: plantScale, scale: emerge,
    color: (c, g, entry) => tone(ramp(c, g, [[0.4, '#c23c5e'], [0.5, '#b04a6a'], [0.58, '#7c8648'], [0.72, '#62823e'], [0.84, '#b09c3c'], [0.92, '#d89a34'], [1, '#d08a2c']]), entry),
  })
  return {
    plot, soil: 'furrow',
    camera: { position: V(6.8, 2.2, 10.6), target: V(-0.6, 0.45, 2.6) },
  }
}
