// Shared plant engine for the legume group: a stem skeleton (main stems, branches, leaf
// nodes and tips), a variant builder that hangs leaves and fruiting sites on it, and a
// field assembler that instances the variants on rows with growth and colour ramps.
import * as THREE from 'three'
import { GrowingPart, item, lerp, smooth, tube, merge } from '../../engine/geometry.js'
import { ramp, rowSpots, shade, tone, windMaterials } from '../../engine/plantKit.js'
import { V, aim } from './parts.js'

export const pick = (random, value) => (Array.isArray(value) ? random.range(value[0], value[1]) : value)
export const flat = (az) => V(Math.cos(az), 0, Math.sin(az))
const dirFrom = (az, phi) => V(Math.sin(phi) * Math.cos(az), Math.cos(phi), Math.sin(phi) * Math.sin(az))
const blendAz = (a, b, w) => Math.atan2(Math.sin(a) * (1 - w) + Math.sin(b) * w, Math.cos(a) * (1 - w) + Math.cos(b) * w)

// Direction leaning outward from a node: `out` horizontal weight, `up` vertical weight.
export function heading(random, az, out, up, jitter = 0.15) {
  return flat(az).multiplyScalar(out).add(V(random.gauss() * jitter, up + random.gauss() * jitter, random.gauss() * jitter)).normalize()
}

/*
 habit = {
   stems, length, lean, arch, radius, tipRadius, radial, tubular, nodes, zone,
   phyllo: 'spiral' | 'alternate' | 'opposite', outward, zigzag, minY, stemShade,
   branches: { count, zone, length, lean, arch, nodes, radius, cone, zone2 },
 }
 Ranges are [min, max]. Lean/arch are angles from vertical in radians.
*/
export function skeleton(random, habit) {
  const h = habit
  const geometry = []
  const nodes = []
  const tips = []
  const stems = Math.max(1, Math.round(pick(random, h.stems ?? 1)))
  const baseAz = random() * Math.PI * 2
  const minY = h.minY ?? 0.012
  const stemShade = h.stemShade || shade(0.66, 1)
  let top = 0
  const grow = (start, az, lean, arch, length, radius, level, nodeCount, zone) => {
    const steps = h.steps ?? 3
    const points = [start.clone()]
    const p = start.clone()
    for (let k = 0; k < steps; k += 1) {
      const phi = lean + arch * ((k + 0.5) / steps)
      p.addScaledVector(dirFrom(az + random.gauss() * (h.wander ?? 0.08), phi), length / steps)
      if (h.zigzag) { p.x += random.gauss() * h.zigzag; p.z += random.gauss() * h.zigzag }
      p.y = Math.max(p.y, minY)
      points.push(p.clone())
    }
    top = Math.max(top, p.y)
    geometry.push(tube(points, radius, radius * (h.tipRadius ?? 0.4), { radial: h.radial ?? 3, tubular: level === 1 ? h.tubular ?? 4 : h.branchTubular ?? 3, colorFn: stemShade }))
    const curve = new THREE.CatmullRomCurve3(points)
    const count = Math.max(0, Math.round(nodeCount))
    const phyllo = h.phyllo ?? 'spiral'
    const az0 = random() * Math.PI * 2
    const bias = (h.outward ?? 0.45) * smooth(0.15, 0.6, lean)
    for (let j = 0; j < count; j += 1) {
      const t = Math.min(1, Math.max(0.02, zone[0] + (zone[1] - zone[0]) * ((j + 0.5 + random.gauss() * 0.12) / count)))
      const position = curve.getPointAt(t)
      const tangent = curve.getTangentAt(t)
      const angles = phyllo === 'opposite' ? [az0 + j * Math.PI / 2, az0 + j * Math.PI / 2 + Math.PI] : phyllo === 'alternate' ? [az + (j % 2 ? 1 : -1) * 1.35] : [az0 + j * 2.4]
      angles.forEach((angle, side) => nodes.push({ p: position, tangent, az: blendAz(angle + random.gauss() * 0.25, az, bias), stemAz: az, t, level, j, side, count, length }))
    }
    tips.push({ p: points[points.length - 1].clone(), tangent: curve.getTangentAt(1), az, stemAz: az, t: 1, level, length })
    if (level === 1 && h.branches) {
      const b = h.branches
      const branchCount = Math.round(pick(random, b.count))
      for (let i = 0; i < branchCount; i += 1) {
        const bt = lerp(b.zone[0], b.zone[1], (i + random.range(0.2, 0.8)) / Math.max(1, branchCount))
        const from = curve.getPointAt(bt)
        const bAz = stems === 1 ? az0 + i * 2.4 + random.gauss() * 0.25 : az + (i % 2 ? 1 : -1) * random.range(0.35, 1.0)
        const cone = b.cone ? 1 - bt * b.cone : 1
        grow(from, bAz, pick(random, b.lean), pick(random, b.arch ?? 0.1), length * pick(random, b.length) * cone, radius * (b.radius ?? 0.6), 2, pick(random, b.nodes) * (b.cone ? lerp(1, cone, 0.6) : 1), b.zone2 ?? [0.15, 1])
      }
    }
  }
  for (let s = 0; s < stems; s += 1) {
    const az = baseAz + (s / stems) * Math.PI * 2 + random.gauss() * 0.35
    const start = V(Math.cos(az) * (h.baseSpread ?? 0.004), 0, Math.sin(az) * (h.baseSpread ?? 0.004))
    grow(start, az, pick(random, h.lean ?? [0, 0.08]), pick(random, h.arch ?? 0), pick(random, h.length), pick(random, h.radius ?? 0.003), 1, pick(random, h.nodes ?? 6), h.zone ?? [0.15, 1])
  }
  return { geometry, nodes, tips, top }
}

// One plant variant: { plant, leaves, <site keys>..., pivots }.
// keep < 1 builds a lighter far-field variant: fewer (larger) leaves and fewer fruiting sites.
function herbVariant(random, spec, keep = 1) {
  const sk = skeleton(random, spec.habit)
  const bins = { plant: [...sk.geometry] }
  const anchors = {}
  const siteKept = new Map()
  const leafScale = Math.min(1.35, 1 / Math.sqrt(keep))
  const out = {
    top: sk.top,
    add(key, geometry, anchor) {
      if (keep < 1 && anchor && key !== 'leaves' && key !== 'plant') {
        const id = `${anchor.x.toFixed(4)},${anchor.y.toFixed(4)},${anchor.z.toFixed(4)}`
        if (!siteKept.has(id)) siteKept.set(id, random() < keep)
        if (!siteKept.get(id)) { geometry.dispose(); return }
        geometry.translate(-anchor.x, -anchor.y, -anchor.z).scale(1.12, 1.12, 1.12).translate(anchor.x, anchor.y, anchor.z)
      }
      if (!bins[key]) bins[key] = []
      bins[key].push(geometry)
      if (anchor) {
        if (!anchors[key]) anchors[key] = []
        anchors[key].push(anchor.clone())
      }
    },
  }
  if (spec.leaf) {
    sk.nodes.forEach((node) => {
      if (keep < 1 && random() > keep) return
      const geometry = spec.leaf(random, node, sk)
      if (!geometry) return
      if (keep < 1) geometry.scale(leafScale, leafScale, leafScale)
      geometry.rotateY(Math.PI / 2 - node.az)
      geometry.translate(node.p.x, node.p.y, node.p.z)
      out.add(spec.leafKey ? spec.leafKey(node, random) : 'leaves', geometry, node.p)
    })
  }
  spec.sites?.(random, sk, out)
  const variant = { pivots: {} }
  for (const [key, list] of Object.entries(bins)) {
    if (!list.length) continue
    variant[key] = merge(list)
    const points = anchors[key]
    variant.pivots[key] = points?.length ? points.reduce((sum, p) => sum.add(p), V()).divideScalar(points.length) : V(0, sk.top * 0.6, 0)
  }
  return variant
}

const triangles = (geometry) => (geometry ? (geometry.index ? geometry.index.count : geometry.attributes.position?.count || 0) / 3 : 0)

// Camera framed like the core crops, scaled to crop height.
function camFor(height) {
  return {
    position: V(4.9 + 0.8 * height, 1.3 + 0.8 * height, 9.9 + 0.9 * height),
    target: V(-0.4, 0.55 * height, 2.4),
  }
}

/*
 spec = {
   habit, leaf(random, node), sites(random, sk, out), leafKey?,
   rowGap, plantGap, plot?, jitter?, skip?, budget?, baseY?, variants?,
   yaw?, yawJitter?, sizeRange?, tilt?, stagger?,
   wind, height, plant: { scale, color, materialOptions }, parts: [{ key, scale, color, materialOptions, castShadow }],
   soil?, camera?, config?, extras(ctx, field)?
 }
*/
export function plantField(ctx, spec) {
  const { random, quality } = ctx
  const plot = { width: 12, depth: 16, ...spec.plot }
  const camera = spec.camera ?? camFor(spec.height)
  const count = spec.variants ?? 3
  const used = new Set(['plant', ...spec.parts.map((part) => part.key)])
  const makeVariants = (keep) => {
    const list = Array.from({ length: count }, () => herbVariant(random, spec, keep))
    list.forEach((variant) => Object.keys(variant).forEach((key) => {
      if (key !== 'pivots' && !used.has(key)) { variant[key].dispose(); delete variant[key] }
    }))
    return list
  }
  const cost = (list) => list.reduce((sum, variant) => sum + [...used].reduce((s, key) => s + triangles(variant[key]), 0), 0) / list.length
  const budget = spec.budget ?? 2.35e6
  const wanted = (plot.width / spec.rowGap) * (plot.depth / spec.plantGap)
  // Level of detail: plants further than `nearRadius` from the default camera use lighter variants
  // when the full plants would not fit the triangle budget at the intended spacing.
  const nearRadius = spec.nearRadius ?? 7
  const isNear = (x, z) => Math.hypot(x - camera.position.x, z - camera.position.z) < nearRadius
  const tiers = [makeVariants(1)]
  let perPlant = cost(tiers[0])
  if (spec.lod !== false && perPlant * wanted > budget) {
    let near = 0
    for (let i = 0; i < 24; i += 1) for (let j = 0; j < 32; j += 1) if (isNear(((i + 0.5) / 24 - 0.5) * plot.width, ((j + 0.5) / 32 - 0.5) * plot.depth)) near += 1
    const nearFraction = near / (24 * 32)
    const full = perPlant
    const stems = tiers[0].reduce((sum, variant) => sum + triangles(variant.plant), 0) / count
    const estimate = (keep) => nearFraction * full + (1 - nearFraction) * (stems + keep * (full - stems))
    const keep = spec.liteKeep ?? ([0.8, 0.65].find((k) => estimate(k) * wanted <= budget) || 0.5)
    tiers.push(makeVariants(keep))
    perPlant = nearFraction * full + (1 - nearFraction) * cost(tiers[1])
  }
  const minGap = (plot.width * plot.depth) / (spec.rowGap * (budget / perPlant))
  const gap = Math.max(spec.plantGap, minGap) / Math.sqrt(quality)
  const spots = rowSpots({ width: plot.width, depth: plot.depth, rowGap: spec.rowGap, plantGap: gap, random, jitter: spec.jitter ?? 0.25, skip: spec.skip ?? 0.02 })
  const baseY = spec.baseY ?? 0.035
  const materials = {}
  const materialFor = (key, options) => {
    if (!materials[key]) materials[key] = windMaterials(ctx, { ...spec.wind, ...(spec.partWind?.[key] || {}) }, options)
    return materials[key]
  }
  const sizeRange = spec.sizeRange ?? [0.86, 1.12]
  const tilt = spec.tilt ?? 0.05
  const groups = tiers.map((list) => list.map(() => []))
  spots.forEach((spot, index) => {
    const tier = tiers.length > 1 && !isNear(spot[0], spot[1]) ? 1 : 0
    groups[tier][index % count].push(spot)
  })
  tiers.flat().forEach((variant, flatIndex) => {
    const variantSpots = groups[Math.floor(flatIndex / count)][flatIndex % count]
    const items = []
    variantSpots.forEach((spot) => {
      const yaw = spec.yaw === undefined ? random() * Math.PI * 2 : spec.yaw + random.gauss() * (spec.yawJitter ?? 0.2)
      const entry = item(V(spot[0], baseY, spot[1]), yaw, random.range(sizeRange[0], sizeRange[1]), random.gauss() * (spec.stagger ?? 0.03), [random.gauss() * tilt, random.gauss() * tilt])
      entry.tone = random.gauss() * 0.07
      entry.r = random()
      items.push(entry)
    })
    const plantMats = materialFor('plant', spec.plant.materialOptions)
    ctx.addPart(new GrowingPart({ geometry: variant.plant, material: plantMats.material, depthMaterial: plantMats.depth, items, scale: spec.plant.scale, color: spec.plant.color }))
    spec.parts.forEach((part) => {
      const geometry = variant[part.key]
      if (!geometry) return
      const mats = materialFor(part.key, part.materialOptions)
      ctx.addPart(new GrowingPart({ geometry, material: mats.material, depthMaterial: mats.depth, items, parent: spec.plant.scale, pivot: variant.pivots[part.key], scale: part.scale, color: part.color, castShadow: part.castShadow !== false }))
    })
  })
  const extra = spec.extras ? spec.extras(ctx, { spots, plot, baseY, gap }) || {} : {}
  return {
    plot: { width: plot.width, depth: plot.depth, rowGap: spec.rowGap },
    soil: spec.soil ?? 'furrow',
    camera,
    ...spec.config,
    ...extra,
  }
}

// Colour helper: (c, g, item) => toned ramp.
export const rampFn = (stops, toneAmount = 1) => (c, g, entry) => (toneAmount ? tone(ramp(c, g, stops), entry) : ramp(c, g, stops))

// Standard growth curves from a timeline { grow, flower: [start, end], pod: [start, full], drop: [start, end, amount] }.
export const growth = {
  plant: (t) => (g) => {
    const s = smooth(0, t.grow, g)
    const size = lerp(0.05, 1, s)
    return [size, size * lerp(0.55, 1, s), size]
  },
  leaves: (t) => (t.drop ? (g) => 1 - t.drop[2] * smooth(t.drop[0], t.drop[1], g) : () => 1),
  flowers: (t) => (g) => smooth(t.flower[0], t.flower[0] + 0.05, g) * (1 - smooth(t.flower[1] - 0.06, t.flower[1], g)),
  pods: (t) => (g) => smooth(t.pod[0], t.pod[1], g),
  stalks: (t) => (g) => smooth(t.flower[0] - 0.05, t.flower[0] + 0.03, g),
}

/* -------------------------------------------------------------- legume family */
// Places flowers, pods (and peduncles) on nodes or tips according to `P.pod.place`.
//  'axil'    pods straight from the leaf axil (dir weights [out, up], negative up hangs)
//  'above'   peduncle rises above the canopy; pods fan out from its top (moong, urad)
//  'hanging' peduncle rises, pods hang from its top (cowpea)
//  'tip'     clusters at branch ends (pigeon pea)
export function legumeSites(random, sk, out, P) {
  const pd = P.pod
  const fl = P.flower
  const zone = pd.zone ?? [0.25, 1]
  const candidates = pd.place === 'tip' ? sk.tips.filter((tip) => tip.level >= (pd.tipLevel ?? 1)) : sk.nodes.filter((node) => node.t >= zone[0] && node.t <= zone[1] && node.level >= (pd.minLevel ?? 1))
  candidates.forEach((node) => {
    if (random() > (pd.chance ?? 0.5)) return
    let apex = node.p.clone()
    const az = node.az
    if (pd.place === 'above' || pd.place === 'hanging') {
      const len = pick(random, pd.peduncle)
      const pedDir = heading(random, az, pd.pedOut ?? 0.35, 1, 0.08)
      const end = apex.clone().addScaledVector(pedDir, len)
      const mid = apex.clone().addScaledVector(pedDir, len * 0.5).addScaledVector(flat(az), len * 0.06)
      out.add('stalks', tube([apex, mid, end], pd.pedRadius ?? 0.0012, (pd.pedRadius ?? 0.0012) * 0.7, { radial: 3, tubular: 2, color: '#d0d0d0' }), node.p)
      apex = end
    } else if (pd.place === 'tip') {
      apex = node.p.clone().addScaledVector(node.tangent, 0.01)
    }
    const count = Math.round(pick(random, pd.count))
    const [outW, upW] = pd.dir ?? [1, 0]
    const fan = pd.fan ?? 1.2
    for (let i = 0; i < count; i += 1) {
      const a = az + (count === 1 ? 0 : (i / (count - 1) - 0.5) * fan) + random.gauss() * 0.25
      const dir = heading(random, a, outW, upW, pd.jitter ?? 0.15)
      const geometry = pd.make(random)
      const offset = pd.place === 'tip' ? V(random.gauss() * 0.02, random.gauss() * 0.015, random.gauss() * 0.02) : V()
      aim(geometry, apex.clone().add(offset), dir, random() * Math.PI)
      out.add('pods', geometry, node.p)
    }
    if (fl) {
      const flowers = Math.round(pick(random, fl.count ?? 1))
      for (let i = 0; i < flowers; i += 1) {
        const a = az + random.gauss() * 0.9
        const geometry = fl.make(random)
        const offset = V(random.gauss() * (fl.scatter ?? 0.006), random.gauss() * (fl.scatter ?? 0.006) + (fl.lift ?? 0.004), random.gauss() * (fl.scatter ?? 0.006))
        aim(geometry, apex.clone().add(offset), heading(random, a, fl.out ?? 0.7, fl.up ?? 0.6, 0.2))
        out.add('flowers', geometry, node.p)
      }
    }
  })
}

// A small instanced prop that does not sway (sticks, stubble); geometry built at origin.
export function propField(ctx, geometry, placements, materialOptions = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, ...materialOptions })
  ctx.disposables.push(material)
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length))
  mesh.count = placements.length
  mesh.frustumCulled = false
  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  placements.forEach(([position, yaw, scale, tiltX = 0, tiltZ = 0], index) => {
    quaternion.setFromEuler(new THREE.Euler(tiltX, yaw, tiltZ, 'YXZ'))
    mesh.setMatrixAt(index, matrix.compose(position, quaternion, V(scale, scale, scale)))
  })
  mesh.castShadow = true
  mesh.receiveShadow = true
  ctx.addMesh(mesh)
  return mesh
}
