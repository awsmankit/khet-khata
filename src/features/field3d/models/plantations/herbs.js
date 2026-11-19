// Umbel herbs (cumin, coriander, fennel, ajwain), ginger-type clumps (turmeric, ginger),
// saffron, and the betel-leaf barej (vine on support).
import * as THREE from 'three'
import { merge, prep } from '../../engine/geometry.js'
import { ramp } from '../../engine/plantKit.js'
import { TAU, V, bead, canvasTexture, dome, leaf, leafAt, lerp, plantAt, ridgeY, rigid, rod, rows, shapedTube, smooth, solid, tone } from './kit.js'
import { zingClump } from './trees.js'

/* ------------------------------------------------------------------ umbel herbs */
const lobed = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.6) * (0.45 + 0.55 * Math.abs(Math.sin(t * Math.PI * 2.5)))

function umbelPlant(random, { height, branches, rays, umbelRadius, umbelletSize, seeds, seedSize, threads, threadLength, threadWidth = 0.003, basal = 0, stemRadius = 0.004, flower = '#ffffff' }) {
  const plant = []
  const flowers = []
  const seedParts = []
  const H = height * random.range(0.9, 1.08)
  const mainTop = V(random.gauss() * 0.03, H, random.gauss() * 0.03)
  const mainPoints = [V(), V(mainTop.x * 0.3, H * 0.5, mainTop.z * 0.3), mainTop]
  plant.push(shapedTube(mainPoints, (t) => stemRadius * lerp(1, 0.5, t), { radial: 4, tubular: 3, colorFn: (c) => c.setScalar(0.85) }))
  const stems = [{ curve: new THREE.CatmullRomCurve3(mainPoints), top: mainTop, size: 1 }]
  const main = stems[0].curve
  for (let index = 0; index < branches; index += 1) {
    const from = main.getPointAt(random.range(0.3, 0.75))
    const a = random() * TAU
    const out = V(Math.cos(a), 0, Math.sin(a))
    const reach = H * random.range(0.15, 0.32)
    const end = from.clone().addScaledVector(out, reach)
    end.y = H * random.range(0.72, 0.95)
    const points = [from, from.clone().lerp(end, 0.5).addScaledVector(out, reach * 0.1), end]
    plant.push(shapedTube(points, (t) => stemRadius * 0.7 * lerp(1, 0.5, t), { radial: 3, tubular: 3, colorFn: (c) => c.setScalar(0.85) }))
    stems.push({ curve: new THREE.CatmullRomCurve3(points), top: end, size: random.range(0.7, 0.9) })
  }
  // feathery thread leaves at the nodes
  for (let index = 0; index < threads; index += 1) {
    const stem = stems[index % stems.length]
    const at = stem.curve.getPointAt(random.range(0.05, 0.8))
    const g = leaf({ length: threadLength * random.range(0.6, 1.1), width: threadWidth, rise: random.range(0.2, 1.1), droop: random.range(0.3, 1.0), segments: 2, fold: 0, shape: 'thread', base: '#b0b0b0', tip: '#dedede', rib: null })
    plant.push(leafAt(g, at, random() * TAU))
  }
  for (let index = 0; index < basal; index += 1) {
    const g = leaf({ length: random.range(0.07, 0.1), width: random.range(0.05, 0.065), rise: random.range(0.3, 0.7), droop: 0.8, segments: 4, fold: 0.2, shape: lobed, base: '#a0a0a0', tip: '#d0d0d0' })
    plant.push(leafAt(g, V(0, 0.01, 0), (index / basal) * TAU + random.gauss() * 0.3))
  }
  // compound umbels: rays fan out to a flat-topped dome of umbellets
  stems.forEach(({ top, size }) => {
    const R = umbelRadius * size
    for (let r = 0; r < rays; r += 1) {
      const a = (r / rays) * TAU + random.gauss() * 0.2
      const rl = R * Math.sqrt(random.range(0.06, 1))
      const end = top.clone().add(V(Math.cos(a) * rl, R * (0.55 - 0.2 * (rl / R) * (rl / R)), Math.sin(a) * rl))
      plant.push(rod(top, end, Math.max(0.0008, stemRadius * 0.3), { radial: 3, color: '#d0d0d0' }))
      const d = dome(umbelletSize * random.range(0.85, 1.1), umbelletSize * 0.45, { color: flower })
      d.translate(end.x, end.y, end.z)
      flowers.push(d)
      for (let s = 0; s < seeds; s += 1) {
        const g = bead(seedSize[0], seedSize[1], seedSize[0], { colorFn: (c) => c.setScalar(random.range(0.82, 1.02)) })
        g.rotateZ(random.gauss() * 0.4)
        g.translate(end.x + random.gauss() * umbelletSize * 0.35, end.y + seedSize[1] * 0.8, end.z + random.gauss() * umbelletSize * 0.35)
        seedParts.push(g)
      }
    }
  })
  return { plant: merge(plant), flowers: merge(flowers), seeds: merge(seedParts), pivots: { flowers: V(0, H * 0.85, 0), seeds: V(0, H * 0.85, 0) } }
}

function buildUmbel(ctx, spec) {
  const { random, quality } = ctx
  const { plot, rowGap, plantGap, plant, green, flower, seed = '#b09a62' } = spec
  const spots = rows(random, { width: plot.width, depth: plot.depth, rowGap, plantGap: plantGap / Math.sqrt(quality), jitter: 0.3, height: (x) => ridgeY(x, plot.width, rowGap) })
  const variants = [0, 1, 2].map(() => umbelPlant(random, plant))
  plantAt(ctx, {
    variants, spots, wind: { strength: spec.strength ?? 0.2, flutter: 0.012, refHeight: plant.height },
    materialOptions: { roughness: 0.8 },
    plant: {
      scale: (g) => [lerp(0.35, 1, smooth(0, 0.35, g)), lerp(0.08, 1, smooth(0.04, 0.48, g)), lerp(0.35, 1, smooth(0, 0.35, g))],
      color: (c, g, e) => tone(ramp(c, g, [[0, green], [0.6, green], [0.78, '#8a9a4a'], [0.92, '#b09a5e'], [1, '#a68e5a']]), e),
    },
    attachments: [
      { key: 'flowers', scale: (g) => smooth(0.38, 0.47, g) * (1 - smooth(0.66, 0.74, g)), color: (c, g, e) => tone(typeof flower === 'function' ? flower(c, e) : c.set(flower), e), materialOptions: { roughness: 0.85, emissive: spec.glow || '#000000' } },
      { key: 'seeds', scale: (g) => lerp(0.4, 1, smooth(0.6, 0.78, g)) * smooth(0.56, 0.64, g), color: (c, g, e) => tone(ramp(c, g, [[0.56, '#8aa850'], [0.74, '#7a9a48'], [0.86, '#9a9a56'], [0.95, seed], [1, seed]]), e), materialOptions: { roughness: 0.75 } },
    ],
  })
  return { plot: { width: plot.width, depth: plot.depth, rowGap }, soil: 'furrow', camera: spec.camera }
}

const umbelStages = [[0, 'Sowing'], [0.15, 'Seedlings'], [0.32, 'Branching'], [0.45, 'Flowering'], [0.62, 'Seed filling'], [0.86, 'Ready to harvest']]

/* ------------------------------------------------------------------ turmeric */
function turmericClump(random, q) {
  const plant = []
  const spike = []
  const tillers = 3
  for (let index = 0; index < tillers; index += 1) {
    const a = (index / tillers) * TAU + random.gauss() * 0.4
    const base = V(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05)
    const top = base.clone().add(V(Math.cos(a) * 0.03, 0.28, Math.sin(a) * 0.03))
    plant.push(shapedTube([base, base.clone().lerp(top, 0.5), top], (t) => lerp(0.02, 0.014, t), { radial: 5, tubular: 2, colorFn: (c, x, y) => c.setScalar(lerp(0.7, 0.9, y / 0.28)) }))
    const plane = random() * TAU
    const count = Math.round(7 * q)
    for (let k = 0; k < count; k += 1) {
      const at = base.clone().lerp(top, 0.35 + (k / count) * 0.65)
      const g = leaf({ length: random.range(0.65, 0.85), width: random.range(0.14, 0.17), rise: random.range(1.15, 1.4) - k * 0.03, droop: random.range(0.9, 1.4), segments: 7, fold: 0.18, shape: 'petiolate', base: '#9c9c9c', tip: '#d2d2d2', rib: '#e8e8e8' })
      plant.push(leafAt(g, at, plane + (k % 2 ? Math.PI : 0) + random.gauss() * 0.35))
    }
  }
  // the pale inflorescence: a cone of green-white bracts with pink tips
  spike.push(rod(V(), V(0, 0.26, 0), 0.008, { color: '#c8d8a8' }))
  for (let k = 0; k < 12; k += 1) {
    const g = leaf({ length: 0.055, width: 0.045, rise: 0.95, droop: 0.4, segments: 2, fold: 0.5, shape: 'oval', base: '#dfe8c8', tip: k > 7 ? '#e89ac0' : '#eef2dc', rib: null })
    leafAt(g, V(0, 0.24 + k * 0.012, 0), k * 2.39996)
    spike.push(g)
  }
  return { plant: merge(plant), spike: merge(spike), pivots: { spike: V(0, 0.25, 0) } }
}

function buildTurmeric(ctx) {
  const { random, quality } = ctx
  const plot = { width: 12, depth: 16 }
  const bed = 1.2
  const xs = []
  for (let b = 0; b < Math.floor(plot.width / bed); b += 1) {
    const center = -plot.width / 2 + bed * (b + 0.5)
    xs.push(center - 0.25, center + 0.25)
  }
  const spots = rows(random, { width: plot.width, depth: plot.depth, rowGap: bed, plantGap: 0.3 / Math.sqrt(quality), xs, jitter: 0.25, height: (x) => ridgeY(x, plot.width, bed) })
  const variants = [0, 1, 2].map(() => turmericClump(random, Math.max(0.7, quality)))
  variants[2].spike = null
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.18, flutter: 0.016, refHeight: 1 },
    materialOptions: { roughness: 0.55 },
    plant: {
      scale: (g) => [lerp(0.3, 1, smooth(0.06, 0.4, g)), lerp(0.04, 1, smooth(0.06, 0.45, g)) * (1 - 0.25 * smooth(0.85, 1, g)), lerp(0.3, 1, smooth(0.06, 0.4, g))],
      color: (c, g, e) => tone(ramp(c, g, [[0, '#7aa84a'], [0.3, '#4a8432'], [0.72, '#4a8030'], [0.84, '#8a9a3a'], [0.94, '#b0a050'], [1, '#a08a52']]), e),
    },
    attachments: [{ key: 'spike', scale: (g) => smooth(0.42, 0.5, g) * (1 - smooth(0.64, 0.72, g)), materialOptions: { roughness: 0.7 } }],
  })
  return { plot: { ...plot, rowGap: bed }, soil: 'furrow', camera: { position: V(6.2, 2.1, 11.2), target: V(-0.6, 0.45, 3) } }
}

/* ------------------------------------------------------------------ ginger */
function buildGinger(ctx) {
  const { random, quality } = ctx
  const plot = { width: 10, depth: 14 }
  const bed = 1.25
  const xs = []
  for (let b = 0; b < Math.floor(plot.width / bed); b += 1) {
    const center = -plot.width / 2 + bed * (b + 0.5)
    xs.push(center - 0.3, center, center + 0.3)
  }
  const spots = rows(random, { width: plot.width, depth: plot.depth, rowGap: bed, plantGap: 0.3 / Math.sqrt(quality), xs, jitter: 0.2, height: (x) => ridgeY(x, plot.width, bed) + 0.01 })
  const variants = [0, 1, 2].map(() => ({ plant: zingClump(random, { shoots: Math.round(8 * Math.max(0.7, quality)), height: [0.55, 0.92], leaves: 9, leafLength: 0.2, leafWidth: 0.026, start: 0.3, spread: 0.07, stem: '#c4d0aa', rise: [0.55, 1.0], droop: [0.6, 1.0], lean: [0.05, 0.32], radius: 0.005, segments: 3 }) }))
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.2, flutter: 0.016, refHeight: 0.8 },
    materialOptions: { roughness: 0.55 },
    plant: {
      scale: (g) => [lerp(0.3, 1, smooth(0.08, 0.45, g)), lerp(0.04, 1, smooth(0.08, 0.5, g)) * (1 - 0.2 * smooth(0.86, 1, g)), lerp(0.3, 1, smooth(0.08, 0.45, g))],
      color: (c, g, e) => tone(ramp(c, g, [[0, '#7aa84a'], [0.3, '#4f8a34'], [0.74, '#4f8632'], [0.86, '#9aa040'], [0.95, '#b8a454'], [1, '#a89058']]), e),
    },
  })
  // straw mulch over the bed tops
  const straw = canvasTexture(ctx, 128, 128, (context, rand) => {
    context.fillStyle = '#a8905c'
    context.fillRect(0, 0, 128, 128)
    for (let index = 0; index < 700; index += 1) {
      const x = rand() * 128
      const y = rand() * 128
      const a = rand() * Math.PI
      const l = 6 + rand() * 18
      context.globalAlpha = 0.5 + rand() * 0.4
      context.strokeStyle = ['#d8c08a', '#c4a870', '#8a7448', '#e6d4a0', '#6e5c3a'][Math.floor(rand() * 5)]
      context.lineWidth = 0.8 + rand() * 1.2
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      context.stroke()
    }
  })
  const mulchMaterial = new THREE.MeshStandardMaterial({ map: straw, roughness: 1, side: THREE.DoubleSide })
  ctx.disposables.push(mulchMaterial)
  const beds = []
  xs.filter((_, index) => index % 3 === 1).forEach((center) => {
    const g = new THREE.PlaneGeometry(1.0, plot.depth, 8, Math.round(plot.depth * 2))
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    const uv = g.attributes.uv
    for (let index = 0; index < p.count; index += 1) {
      const x = center + p.getX(index)
      const z = p.getZ(index)
      p.setXYZ(index, x, ridgeY(x, plot.width, bed) + 0.008 + 0.006 * Math.sin(x * 37 + z * 11) * Math.sin(z * 23), z)
      uv.setXY(index, x / 0.8, z / 0.8)
    }
    g.computeVertexNormals()
    beds.push(g)
  })
  const mulch = new THREE.Mesh(merge(beds.map((g) => prep(g))), mulchMaterial)
  mulch.receiveShadow = true
  ctx.addMesh(mulch)
  return {
    plot: { ...plot, rowGap: bed }, soil: 'furrow',
    camera: { position: V(5.4, 1.7, 9.6), target: V(-0.5, 0.3, 2.6) },
    update: (g) => { mulchMaterial.color.set('#ffffff').lerp(new THREE.Color('#8a8070'), smooth(0.2, 0.9, g)) },
  }
}

/* ------------------------------------------------------------------ saffron */
function saffronPlant(random, blooms) {
  const leaves = []
  const flowers = []
  const sheath = prep(new THREE.ConeGeometry(0.008, 0.05, 4, 1, true), '#e8e2d0')
  sheath.translate(0, 0.02, 0)
  for (let index = 0; index < 8; index += 1) {
    const g = leaf({ length: random.range(0.2, 0.34), width: 0.0055, rise: 1.35, droop: random.range(0.8, 1.5), segments: 3, fold: 0.4, shape: 'grass', base: '#a0a0a0', tip: '#e0e0e0', rib: '#ffffff' })
    leaves.push(leafAt(g, V(random.gauss() * 0.006, 0, random.gauss() * 0.006), random() * TAU))
  }
  for (let f = 0; f < blooms; f += 1) {
    const base = V(random.gauss() * 0.015, 0, random.gauss() * 0.015)
    const height = random.range(0.035, 0.05)
    const top = base.clone().add(V(random.gauss() * 0.008, height, random.gauss() * 0.008))
    flowers.push(shapedTube([base, base.clone().lerp(top, 0.5), top], (t) => lerp(0.004, 0.005, t), { radial: 4, tubular: 2, color: '#eee6ee' }))
    const turn = random() * TAU
    for (let k = 0; k < 6; k += 1) {
      const outer = k % 2 === 0
      const g = leaf({ length: outer ? 0.062 : 0.055, width: outer ? 0.03 : 0.026, rise: outer ? random.range(0.9, 1.05) : random.range(1.1, 1.25), droop: 0.4, segments: 3, fold: 0.45, shape: 'oval', base: '#6e3e92', tip: '#a77cc8', rib: '#4e1f70' })
      flowers.push(leafAt(g, top, turn + (k * Math.PI) / 3))
    }
    // three long red stigmas spilling over the tepals, three yellow anthers
    for (let k = 0; k < 3; k += 1) {
      const a = turn + (k * TAU) / 3 + 0.4
      const out = V(Math.cos(a), 0, Math.sin(a))
      const points = [top.clone().add(V(0, 0.004, 0)), top.clone().addScaledVector(out, 0.008).add(V(0, 0.038, 0)), top.clone().addScaledVector(out, 0.03).add(V(0, 0.056, 0)), top.clone().addScaledVector(out, 0.05).add(V(0, 0.036, 0))]
      flowers.push(shapedTube(points, (t) => lerp(0.0011, 0.002, t), { radial: 3, tubular: 4, color: '#c81a14' }))
      const b = a + Math.PI / 3
      flowers.push(rod(top, top.clone().add(V(Math.cos(b) * 0.007, 0.03, Math.sin(b) * 0.007)), 0.0024, { radial: 3, taper: 1.2, color: '#f2c41e' }))
    }
  }
  return { plant: sheath, leaves: merge(leaves), flowers: merge(flowers), pivots: { leaves: V(), flowers: V() } }
}

function buildSaffron(ctx) {
  const { random, quality } = ctx
  const plot = { width: 10, depth: 14 }
  const bed = 1.4
  const xs = []
  for (let b = 0; b < Math.floor(plot.width / bed); b += 1) {
    const center = -plot.width / 2 + bed * (b + 0.5)
    for (let r = 0; r < 6; r += 1) xs.push(center + (r - 2.5) * 0.2)
  }
  const spots = rows(random, { width: plot.width, depth: plot.depth, rowGap: bed, plantGap: 0.15 / Math.sqrt(quality), xs, jitter: 0.35, height: (x) => ridgeY(x, plot.width, bed) })
  const variants = [1, 2, 2].map((blooms) => saffronPlant(random, blooms))
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.12, flutter: 0.008, refHeight: 0.25 }, tilt: 0.08,
    materialOptions: { roughness: 0.85 },
    plant: { scale: (g) => smooth(0.12, 0.2, g) * (1 - smooth(0.93, 1, g) * 0.6) },
    attachments: [
      { key: 'leaves', scale: (g) => lerp(0.3, 1, smooth(0.32, 0.7, g)) * (1 - 0.25 * smooth(0.85, 1, g)), materialOptions: { roughness: 0.6 }, color: (c, g, e) => tone(ramp(c, g, [[0.15, '#6a9a44'], [0.5, '#4f8a3a'], [0.78, '#4c8436'], [0.88, '#9a9a4a'], [1, '#b4a05e']]), e) },
      { key: 'flowers', scale: (g) => smooth(0.26, 0.33, g) * (1 - smooth(0.5, 0.58, g)), materialOptions: { roughness: 0.6, emissive: '#1a0a22' } },
    ],
  })
  return { plot: { ...plot, rowGap: bed }, soil: 'furrow', camera: { position: V(4.4, 1.05, 8.8), target: V(-0.6, 0.06, 3.2) } }
}

/* ------------------------------------------------------------------ betel-leaf barej */
function betelVine(random, q) {
  const H = random.range(1.8, 2.05)
  const stick = rod(V(0, -0.1, 0), V(random.gauss() * 0.03, 2.25, random.gauss() * 0.03), 0.008, { radial: 4, taper: 0.7, color: '#b8a070' })
  const parts = []
  const points = []
  for (let k = 0; k <= 8; k += 1) {
    const a = k * 0.9
    points.push(V(Math.cos(a) * 0.018, (k / 8) * H, Math.sin(a) * 0.018))
  }
  parts.push(shapedTube(points, (t) => lerp(0.006, 0.003, t), { radial: 3, tubular: 10, colorFn: (c) => c.setScalar(0.6) }))
  const count = Math.round(36 * q)
  for (let k = 0; k < count; k += 1) {
    const u = (k + 0.5) / count
    const a = k * 2.39996
    const at = V(Math.cos(a) * 0.02, u * H, Math.sin(a) * 0.02)
    const young = u > 0.88
    const g = leaf({ length: random.range(0.13, 0.17) * (young ? 0.7 : 1), width: random.range(0.1, 0.12) * (young ? 0.7 : 1), rise: random.range(-0.3, 0.25), droop: random.range(0.35, 0.6), segments: 4, fold: 0.25, shape: 'heart', notch: 0.06, base: '#9c9c9c', tip: young ? '#efefef' : '#cfcfcf' })
    parts.push(leafAt(g, at, Math.atan2(Math.cos(a), Math.sin(a))))
  }
  return { plant: stick, vine: merge(parts), pivots: { vine: V() } }
}

function buildBetel(ctx) {
  const { random, quality } = ctx
  const L = 24
  const Wd = 7
  const wall = 2.2
  const ridge = 2.65
  const roofY = (x) => lerp(ridge, wall, Math.abs(x) / (Wd / 2))
  const xs = [-3, -2, -1, 0, 1, 2, 3]
  const spots = rows(random, { width: Wd, depth: L - 0.6, rowGap: 1, plantGap: 0.24 / Math.sqrt(quality), xs, jitter: 0.12, skip: 0.01, height: (x) => ridgeY(x, Wd, 1) })
  const variants = [0, 1, 2].map(() => betelVine(random, Math.max(0.65, quality)))
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.03, flutter: 0.006, refHeight: 2 }, sizes: [0.94, 1.06], tilt: 0.02,
    materialOptions: { roughness: 0.8 },
    attachments: [{ key: 'vine', scale: (g) => lerp(0.12, 1, smooth(0.0, 0.55, g)), materialOptions: { roughness: 0.3, metalness: 0.02 }, color: (c, g, e) => tone(ramp(c, g, [[0, '#86b04a'], [0.3, '#5a9a38'], [0.55, '#3f7f2c'], [1, '#3a7a2a']]), e) }],
  })

  // bamboo frame
  const bamboo = []
  const pole = (a, b, r) => bamboo.push(rod(a, b, r, { radial: 6, taper: 0.9, colorFn: (c, x, y, z) => c.set('#b59c66').multiplyScalar(0.8 + 0.25 * Math.abs(Math.sin(y * 9 + x * 3 + z * 2))) }))
  for (let z = -L / 2; z <= L / 2 + 0.01; z += 2) {
    for (const x of [-Wd / 2, 0, Wd / 2]) pole(V(x, -0.2, z), V(x, roofY(x) + 0.03, z), x === 0 ? 0.045 : 0.035)
    pole(V(-Wd / 2 - 0.05, wall, z), V(0, ridge + 0.05, z), 0.025)
    pole(V(Wd / 2 + 0.05, wall, z), V(0, ridge + 0.05, z), 0.025)
  }
  for (const x of [-Wd / 2, -Wd / 4, 0, Wd / 4, Wd / 2]) pole(V(x, roofY(x) + 0.04, -L / 2 - 0.1), V(x, roofY(x) + 0.04, L / 2 + 0.1), 0.022)
  for (const x of [-Wd / 2, Wd / 2]) pole(V(x, 1.1, -L / 2), V(x, 1.1, L / 2), 0.02)
  solid(ctx, bamboo, rigid(ctx, { roughness: 0.7 }))

  // walls of jute sticks and straw
  const wallTexture = canvasTexture(ctx, 128, 128, (context, rand) => {
    context.fillStyle = '#8a7a52'
    context.fillRect(0, 0, 128, 128)
    for (let x = 0; x < 128; x += 2 + rand() * 2) {
      context.globalAlpha = 0.6 + rand() * 0.4
      context.fillStyle = ['#c8b484', '#b09c6c', '#d6c494', '#9a8658'][Math.floor(rand() * 4)]
      context.fillRect(x, 0, 1.5 + rand() * 1.2, 128)
    }
    context.globalAlpha = 0.8
    context.fillStyle = '#6a5a3a'
    for (const y of [30, 94]) context.fillRect(0, y, 128, 3)
  })
  const thatchTexture = canvasTexture(ctx, 128, 128, (context, rand) => {
    context.fillStyle = '#b09a64'
    context.fillRect(0, 0, 128, 128)
    for (let index = 0; index < 600; index += 1) {
      const x = rand() * 128
      const y = rand() * 128
      context.globalAlpha = 0.5 + rand() * 0.5
      context.strokeStyle = ['#d8c48c', '#c2aa74', '#8e7a4e', '#e4d4a4'][Math.floor(rand() * 4)]
      context.lineWidth = 1 + rand()
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + rand() * 4 - 2, y + 14 + rand() * 18)
      context.stroke()
    }
  })
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, vertexColors: true, roughness: 1, side: THREE.DoubleSide })
  const thatchMaterial = new THREE.MeshStandardMaterial({ map: thatchTexture, vertexColors: true, roughness: 1, side: THREE.DoubleSide })
  ctx.disposables.push(wallMaterial, thatchMaterial)
  const panel = (width, height, segW, segH, place, tile = 1) => {
    const g = new THREE.PlaneGeometry(width, height, segW, segH)
    const p = g.attributes.position
    const uv = g.attributes.uv
    for (let index = 0; index < p.count; index += 1) {
      uv.setXY(index, (p.getX(index) + width / 2) / tile, (p.getY(index) + height / 2) / tile)
      const out = place(p.getX(index), p.getY(index))
      p.setXYZ(index, out.x, out.y, out.z)
    }
    g.computeVertexNormals()
    return prep(g, '#ffffff', (c, x, y) => c.setScalar(lerp(0.7, 1, Math.min(1, y / 2))))
  }
  const walls = []
  for (const side of [-1, 1]) walls.push(panel(L, wall, 48, 4, (u, v) => V(side * (Wd / 2 + 0.06) + 0.03 * Math.sin(u * 3.1 + v * 2), v + wall / 2, u)))
  walls.push(panel(Wd, ridge, 14, 4, (u, v) => V(u, Math.min(v + ridge / 2, roofY(u) + 0.02), -L / 2 - 0.06 + 0.03 * Math.sin(u * 2.7))))
  // the near end: short side flaps either side of the opening
  for (const side of [-1, 1]) walls.push(panel(1.2, wall, 3, 4, (u, v) => V(side * (Wd / 2 - 0.6) + u, v + wall / 2, L / 2 + 0.05)))
  const wallMesh = new THREE.Mesh(merge(walls), wallMaterial)
  wallMesh.castShadow = true
  wallMesh.receiveShadow = true
  ctx.addMesh(wallMesh)
  // light thatch roof: strips with gaps so dappled light reaches the vines
  const strips = []
  for (let z = -L / 2; z < L / 2 - 0.1; z += 0.6) {
    for (const side of [-1, 1]) {
      const sag = random.range(0.01, 0.04)
      strips.push(panel(0.56, Wd / 2 + 0.25, 2, 6, (u, v) => {
        const t = (v + (Wd / 2 + 0.25) / 2) / (Wd / 2 + 0.25)
        const x = side * t * (Wd / 2 + 0.25)
        return V(x, roofY(Math.min(Math.abs(x), Wd / 2)) + 0.06 - sag * Math.sin(Math.PI * t) - (Math.abs(x) > Wd / 2 ? (Math.abs(x) - Wd / 2) * 0.4 : 0), z + 0.28 + u)
      }, 0.8))
    }
  }
  const roof = new THREE.Mesh(merge(strips), thatchMaterial)
  roof.castShadow = true
  roof.receiveShadow = true
  ctx.addMesh(roof)
  return { plot: { width: Wd, depth: L, rowGap: 1 }, soil: 'furrow', bund: false, scarecrow: false, camera: { position: V(1.5, 1.7, 17.2), target: V(-0.4, 1.05, 1) } }
}

/* ------------------------------------------------------------------ registry */
const whitePink = (c, e) => c.set(e.kind ? '#f2d8e2' : '#fbf6f2')

export const herbModels = {
  turmeric: { build: buildTurmeric, stages: [[0, 'Planting'], [0.1, 'Sprouting'], [0.28, 'Leafy growth'], [0.45, 'Flowering'], [0.62, 'Rhizomes bulk up'], [0.86, 'Leaves dry, digging']], showcase: 0.5 },
  ginger: { build: buildGinger, stages: [[0, 'Planting, mulching'], [0.12, 'Sprouting'], [0.3, 'Tillering'], [0.6, 'Rhizomes grow'], [0.85, 'Leaves yellow, harvest']], showcase: 0.55 },
  cumin: {
    build: (ctx) => buildUmbel(ctx, {
      plot: { width: 10, depth: 14 }, rowGap: 0.3, plantGap: 0.2, green: '#6a9a4e', flower: whitePink, seed: '#a89068', strength: 0.14,
      plant: { height: 0.38, branches: 4, rays: 4, umbelRadius: 0.018, umbelletSize: 0.009, seeds: 2, seedSize: [0.0022, 0.0045], threads: 16, threadLength: 0.09, threadWidth: 0.0028, stemRadius: 0.0028 },
      camera: { position: V(4.6, 1.25, 8.8), target: V(-0.5, 0.18, 3) },
    }),
    stages: umbelStages, showcase: 0.55,
  },
  coriander: {
    build: (ctx) => buildUmbel(ctx, {
      plot: { width: 10, depth: 13 }, rowGap: 0.3, plantGap: 0.24, green: '#4f8c36', flower: whitePink, seed: '#b49a64', strength: 0.16,
      plant: { height: 0.55, branches: 4, rays: 5, umbelRadius: 0.026, umbelletSize: 0.011, seeds: 2, seedSize: [0.0032, 0.0032], threads: 12, threadLength: 0.08, threadWidth: 0.003, basal: 5, stemRadius: 0.0035 },
      camera: { position: V(4.8, 1.45, 8.6), target: V(-0.5, 0.25, 2.8) },
    }),
    stages: umbelStages, showcase: 0.55,
  },
  fennel: {
    build: (ctx) => buildUmbel(ctx, {
      plot: { width: 12, depth: 16 }, rowGap: 0.6, plantGap: 0.56, green: '#6f9a58', flower: '#e8c628', seed: '#9a9a62', strength: 0.22, glow: '#2a2200',
      plant: { height: 1.7, branches: 5, rays: 12, umbelRadius: 0.085, umbelletSize: 0.022, seeds: 2, seedSize: [0.0028, 0.006], threads: 90, threadLength: 0.26, threadWidth: 0.005, stemRadius: 0.009 },
      camera: { position: V(6.2, 2.5, 11.4), target: V(-0.5, 1.1, 2.6) },
    }),
    stages: umbelStages, showcase: 0.56,
  },
  ajwain: {
    build: (ctx) => buildUmbel(ctx, {
      plot: { width: 10, depth: 14 }, rowGap: 0.45, plantGap: 0.33, green: '#5a8c3c', flower: '#f8f6ee', seed: '#9a8a62', strength: 0.18,
      plant: { height: 0.78, branches: 6, rays: 8, umbelRadius: 0.032, umbelletSize: 0.01, seeds: 2, seedSize: [0.0022, 0.0035], threads: 28, threadLength: 0.11, threadWidth: 0.003, stemRadius: 0.0045 },
      camera: { position: V(5, 1.6, 9.2), target: V(-0.5, 0.4, 2.8) },
    }),
    stages: umbelStages, showcase: 0.55,
  },
  saffron: { build: buildSaffron, stages: [[0, 'Corms planted', 'Aug'], [0.18, 'Sprouting', 'Sep'], [0.32, 'Flowering', 'Oct–Nov'], [0.55, 'Leaf growth', 'Dec–Feb'], [0.85, 'Leaves dry, corms rest', 'Apr']], showcase: 0.42 },
  'betel-leaf': { build: buildBetel, stages: [[0, 'Cuttings planted', 'Feb'], [0.2, 'Vines climb the sticks', 'Apr'], [0.45, 'Leaves spread', 'Jun'], [0.7, 'Leaf plucking', 'Sep'], [0.9, 'Vines lowered', 'Dec']], showcase: 0.75 },
}

