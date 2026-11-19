// Shared building blocks for crop models: placement on rows, wind-swayed materials,
// colour ramps and tree skeletons. Used by every model group.
import * as THREE from 'three'
import { applyWind, GrowingPart, item, plantMaterial, prep, tube, windDepthMaterial, lerp, merge, ellipsoid } from './geometry.js'

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
export const UP = V(0, 1, 0)
const tmpB = new THREE.Color()

export function ramp(target, g, stops) {
  if (g <= stops[0][0]) return target.set(stops[0][1])
  for (let index = 1; index < stops.length; index += 1) {
    if (g <= stops[index][0]) {
      const t = (g - stops[index - 1][0]) / (stops[index][0] - stops[index - 1][0])
      return target.set(stops[index - 1][1]).lerp(tmpB.set(stops[index][1]), t)
    }
  }
  return target.set(stops[stops.length - 1][1])
}

export const tone = (target, item) => target.multiplyScalar(1 + item.tone)

// Grey-scale shading: vertex colours carry light and dark, instance colours carry the hue.
export const shade = (low, high) => (color, x, y) => color.setScalar(lerp(low, high, Math.min(1, Math.max(0, y))))

export function rowSpots({ width, depth, rowGap, plantGap, random, jitter = 0.25, skip = 0.02 }) {
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

export function windMaterials(ctx, options, materialOptions = {}) {
  const material = applyWind(plantMaterial(materialOptions), ctx.wind, options)
  const depth = windDepthMaterial(ctx.wind, options)
  ctx.disposables.push(material, depth)
  return { material, depth }
}

// Places plant variants on spots and wires up any attached parts (ears, cobs, flowers).
export function assembleField(ctx, { variants, spots, baseY = 0, plant, attachments = [], wind, materialOptions }) {
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

export function shellPoint(center, rx, ry, azimuth, elevation, scale = 1) {
  return V(center.x + Math.cos(elevation) * Math.cos(azimuth) * rx * scale, center.y + Math.sin(elevation) * ry * scale, center.z + Math.cos(elevation) * Math.sin(azimuth) * rx * scale)
}

export function treeSkeleton(random, { origin, trunkHeight, trunkRadius, center, rx, ry, limbs = 4, barkColor = '#5a4636' }) {
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

export function canopyCore(random, center, rx, ry, color) {
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

export function leafClusterItems(random, tree, count) {
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

export function panicle(random, { height = 0.3, radius = 0.09, florets = 26, axis = '#b37b52', floret = '#f3e7b6', floretSize = 0.012 }) {
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
