// Shared toolkit for the vine group: broad lobed leaves, flowers, fruit bodies of revolution,
// plant placement with "sockets" (world-space flowers and fruit), sand ground and a river.
import * as THREE from 'three'
import { GrowingPart, item, lerp, prep, smooth } from '../../geometry.js'
import { V, UP, windMaterials } from '../../crops.js'
import { soilTexture } from '../../scenery.js'

export const TAU = Math.PI * 2
const tmpColor = new THREE.Color()
const tmpColor2 = new THREE.Color()
const IDENTITY = new THREE.Quaternion()

export const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}
export const noise = (x, z) => {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), ux), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), ux), uz)
}

// Quaternion that turns +Y towards `direction`, then spins about it.
export function aim(direction, spin = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize())
  return q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin))
}

// Quaternion for a leaf or flower lying in the XZ plane: yaw about Y, then tip lifted by `pitch`
// (positive lifts the +Z tip), then rolled a little.
export function yawPitch(yaw, pitch = 0, roll = 0) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, yaw, roll, 'YXZ'))
}

/* ---------------------------------------------------------------- leaves and petals */

// A broad leaf (or a flower corolla) lying in the XZ plane, face up (+Y).
// Cordate leaves have the petiole at the origin and the tip along +Z; `centered` puts the
// middle at the origin (flowers, peltate shapes). Odd `lobes` give a basal sinus.
export function leafDisc(random, {
  size = 0.2, lobes = 5, depth = 0.2, sharp = 1, basal = 0.15, notch = 0.25, cup = 0.08, droop = 0.12,
  fold = 0.05, wave = 0.03, serrate = 0, detail = 24, rings = 2, centered = false, vein = 0.2,
  dark = 0.72, light = 0.95, centerShade = null, rimShade = null, stretch = 1,
}) {
  const R = size / 2
  const sides = Math.max(2 * lobes, Math.round(detail / (2 * lobes)) * 2 * lobes)
  const radius = (phi) => {
    const lobe = Math.pow(Math.abs(Math.cos((lobes * phi) / 2)), sharp)
    let r = R * (1 - depth * (1 - lobe)) * (1 - basal * (phi / Math.PI) ** 2)
    if (notch) r *= 1 - notch * Math.exp(-(((Math.abs(phi) - Math.PI) / 0.45) ** 2))
    return r
  }
  const cz = centered ? 0 : radius(Math.PI) * stretch * 0.9
  const phase = random() * TAU
  const positions = []
  const colors = []
  const indices = []
  const push = (x, z, f, phi, isCenter) => {
    const u = x / R
    const v = (z - cz) / R
    let y = cup * R * f * f - droop * R * Math.max(0, v) ** 2 + fold * R * Math.abs(u) * (1 - f * 0.3)
    y += wave * R * Math.sin(phi * (lobes * 2 + 3) + phase) * f * f
    positions.push(x, y, z)
    let value = lerp(light, dark, f * 0.85) + (random() - 0.5) * 0.05
    if (!isCenter) value += vein * Math.pow(Math.abs(Math.cos((lobes * phi) / 2)), 30) * (1 - f * 0.6)
    tmpColor.setScalar(Math.min(1.1, value))
    if (isCenter && centerShade) tmpColor.set(centerShade)
    if (!isCenter && rimShade && f > 0.99) tmpColor.set(rimShade).multiplyScalar(0.9 + random() * 0.15)
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
  }
  push(0, cz, 0, 0, true)
  for (let ring = 1; ring <= rings; ring += 1) {
    const f = ring / rings
    for (let side = 0; side < sides; side += 1) {
      const phi = (side / sides) * TAU - Math.PI
      let r = radius(phi) * f
      if (ring === rings && serrate) r *= 1 + serrate * (side % 2 ? 0.6 : -0.6)
      push(Math.sin(phi) * r, cz + Math.cos(phi) * r * stretch, f, phi, false)
    }
  }
  const at = (ring, side) => (ring === 0 ? 0 : 1 + (ring - 1) * sides + (((side % sides) + sides) % sides))
  for (let side = 0; side < sides; side += 1) indices.push(0, at(1, side), at(1, side + 1))
  for (let ring = 1; ring < rings; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const a = at(ring, side)
      const b = at(ring, side + 1)
      const c = at(ring + 1, side)
      const d = at(ring + 1, side + 1)
      indices.push(a, c, d, a, d, b)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return prep(geometry)
}

// A strap or comb leaf along +Z (like geometry.blade) with a custom width profile(t, row).
export function strip({ length = 0.2, width = 0.04, profile = (t) => Math.sin(Math.PI * t), rise = 0.6, droop = 0.6, fold = 0.2, segments = 6, base = '#bdbdbd', tip = '#f0f0f0', rib = null }) {
  const positions = []
  const colors = []
  const indices = []
  const point = V()
  const step = length / segments
  const colorBase = new THREE.Color(base)
  const colorTip = new THREE.Color(tip)
  const colorRib = rib ? new THREE.Color(rib) : null
  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments
    const theta = rise - droop * Math.pow(t, 1.5)
    const half = (width * Math.max(0.0005, profile(t, row))) / 2
    const normal = V(0, Math.cos(theta), -Math.sin(theta))
    const left = point.clone().add(V(-half, 0, 0)).addScaledVector(normal, -half * fold)
    const middle = point.clone().addScaledVector(normal, half * fold * 0.4)
    const right = point.clone().add(V(half, 0, 0)).addScaledVector(normal, -half * fold)
    for (const [vertex, isRib] of [[left, false], [middle, true], [right, false]]) {
      positions.push(vertex.x, vertex.y, vertex.z)
      tmpColor.copy(colorBase).lerp(colorTip, t)
      if (isRib && colorRib) tmpColor.lerp(colorRib, 0.55)
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
    }
    point.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar(step))
  }
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const a = row * 3 + column
      const b = a + 3
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return prep(geometry)
}

// Moves a flat leaf (built in the XZ plane at the origin) to `at`, yawed and tipped.
export function placeFlat(geometry, at, yaw, pitch = 0, roll = 0) {
  geometry.applyMatrix4(new THREE.Matrix4().compose(at, yawPitch(yaw, pitch, roll), new THREE.Vector3(1, 1, 1)))
  return geometry
}

/* ---------------------------------------------------------------- fruit bodies */

// Surface of revolution along +Y (or hanging along -Y) with radius(t, angle); t runs 0..1 from the
// origin end. `bend(t)` shifts the axis sideways in X. Has uvs so a texture can wrap it.
export function revolve({ length = 0.2, rings = 12, sides = 16, radius, bend = null, hang = false, colorFn = null }) {
  const positions = []
  const colors = []
  const uvs = []
  const indices = []
  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    for (let side = 0; side <= sides; side += 1) {
      const angle = side === sides ? 0 : (side / sides) * TAU
      const r = radius(t, angle)
      const x = Math.cos(angle) * r + (bend ? bend(t) : 0)
      const y = (hang ? -t : t) * length
      const z = Math.sin(angle) * r
      positions.push(x, y, z)
      uvs.push(side / sides, t)
      if (colorFn) colorFn(tmpColor.setRGB(1, 1, 1), t, angle, x, y, z)
      else tmpColor.setRGB(1, 1, 1)
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const a = ring * (sides + 1) + side
      const b = a + sides + 1
      if (hang) indices.push(a, a + 1, b, b, a + 1, b + 1)
      else indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return prep(geometry)
}

// Rounded end caps for revolve profiles: 0 at both ends, ~1 in the middle.
export const capped = (t, blunt = 0.4) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t)))), blunt)

/* ---------------------------------------------------------------- placement */

// Plants on spots: one entry per spot, carrying the variant index, a yaw, tilt, scale and tone.
export function plantEntries(random, spots, { variants = 3, baseY = 0, height = null, tilt = 0.05, scale = [0.86, 1.12], spread = 0.035 } = {}) {
  return spots.map((spot) => {
    const y = height ? height(spot[0], spot[1]) : baseY
    const entry = item(V(spot[0], y, spot[1]), random() * TAU, random.range(scale[0], scale[1]), random.gauss() * spread, [random.gauss() * tilt, random.gauss() * tilt])
    entry.tone = random.gauss() * 0.07
    entry.variant = Math.floor(random() * variants)
    entry.pick = random()
    return entry
  })
}

// Adds one GrowingPart per variant for the geometry stored under `key`.
export function addVariantParts(ctx, { entries, variants, key, mats, scale, color, castShadow = true, parent = null, pivot = null }) {
  variants.forEach((variant, index) => {
    const geometry = variant[key]
    if (!geometry) return
    const items = entries.filter((entry) => entry.variant === index)
    if (!items.length) return
    ctx.addPart(new GrowingPart({ geometry, material: mats.material, depthMaterial: mats.depth, items, scale, color, castShadow, parent, pivot: pivot || variant.pivots?.[key] }))
  })
}

// Sockets are plant-local spots ({ p, q, s, offset, ... }) where flowers or fruit sit.
// This turns them into world-space items for every plant.
export function socketItems(random, entries, variants, key, { jitter = 0.025, scale = [0.88, 1.12], ground = null, filter = null } = {}) {
  const items = []
  for (const entry of entries) {
    const sockets = variants[entry.variant][key] || []
    for (const socket of sockets) {
      if (filter && !filter(entry, socket)) continue
      const p = socket.p.clone().multiplyScalar(entry.s).applyQuaternion(entry.q).add(entry.p)
      if (ground && socket.onGround) p.y = ground(p.x, p.z) + (socket.lift || 0)
      const q = entry.q.clone().multiply(socket.q || IDENTITY)
      items.push({ p, q, s: entry.s * (socket.s || 1) * random.range(scale[0], scale[1]), offset: entry.offset + (socket.offset || 0) + random.gauss() * jitter, tone: entry.tone + random.gauss() * 0.05, entry, socket, pick: random() })
    }
  }
  return items
}

// One GrowingPart per geometry variant, items split between them.
export function addItemsPart(ctx, { geometries, items, mats, scale, color, castShadow = true }) {
  const list = Array.isArray(geometries) ? geometries : [geometries]
  list.forEach((geometry, index) => {
    const subset = items.filter((_, itemIndex) => itemIndex % list.length === index)
    if (!subset.length) return
    ctx.addPart(new GrowingPart({ geometry, material: mats.material, depthMaterial: mats.depth, items: subset, scale, color, castShadow }))
  })
}

export function rigidMaterial(ctx, options = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, ...options })
  ctx.disposables.push(material)
  return material
}

export function staticMesh(ctx, geometry, material, { castShadow = true, receiveShadow = true } = {}) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = castShadow
  mesh.receiveShadow = receiveShadow
  ctx.addMesh(mesh)
  return mesh
}

export { windMaterials }

/* ---------------------------------------------------------------- ground */

// Pale riverbed sand: gentle wind ripples inside the plot, sloping away beneath the
// surrounding ground (and under the river) at the margins.
export function sandField(ctx, { width, depth, margin = 8, sand = '#d9c7a0', seed = 11, ripple = 0.022 }) {
  const height = (x, z) => {
    const edge = Math.max(Math.abs(x) - width / 2, Math.abs(z) - depth / 2, 0) / margin
    const fade = smooth(0.25, 1, edge)
    const waves = (Math.sin(x * 1.3 + Math.sin(z * 0.6) * 1.8) * 0.5 + 0.5) * ripple + noise(x * 0.4 + 7, z * 0.4) * 0.03
    return lerp(0.012 + waves, -0.06, fade)
  }
  const W = width + margin * 2
  const D = depth + margin * 2
  const geometry = new THREE.PlaneGeometry(W, D, Math.round(W * 2.2), Math.round(D * 2.2))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const sandColor = new THREE.Color(sand)
  const grassy = new THREE.Color('#8a8458')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    position.setY(index, height(x, z))
    const edge = Math.max(Math.abs(x) - width / 2, Math.abs(z) - depth / 2, 0) / margin
    tmpColor.copy(sandColor).multiplyScalar(0.9 + noise(x * 0.8, z * 0.8) * 0.16)
    tmpColor.lerp(grassy, smooth(0.45, 1, edge) * 0.7)
    tmpColor2.set('#b8a27c')
    tmpColor.lerp(tmpColor2, smooth(0.6, 0.9, noise(x * 0.25 + 3, z * 0.25 - 2)) * 0.35)
    colors.set([tmpColor.r, tmpColor.g, tmpColor.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const texture = soilTexture('#e9e4da', seed)
  texture.repeat.set(W / 2.5, D / 2.5)
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, map: texture, roughness: 1 })
  ctx.disposables.push(texture, material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  ctx.addMesh(mesh)
  return height
}

// A slow river channel running along the left (-X) side of the plot.
export function river(ctx, { x0, x1, length = 140 }) {
  const geometry = new THREE.PlaneGeometry(Math.abs(x1 - x0), length, 1, 1)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate((x0 + x1) / 2, -0.005, 0)
  const material = new THREE.MeshStandardMaterial({ color: '#5f7f86', roughness: 0.08, metalness: 0.3 })
  ctx.disposables.push(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  ctx.addMesh(mesh)
  return mesh
}

// Plain soil patch (own ground for raised beds, shade-house floors, nurseries).
export function floor(ctx, { width, depth, color = '#8a6644', tint = '#ffffff', seed = 17, y = 0.001, roughness = 1 }) {
  const geometry = new THREE.PlaneGeometry(width, depth, 1, 1)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, y, 0)
  const texture = soilTexture(color, seed)
  texture.repeat.set(width / 2.2, depth / 2.2)
  const material = new THREE.MeshStandardMaterial({ map: texture, color: tint, roughness })
  ctx.disposables.push(texture, material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  ctx.addMesh(mesh)
  return mesh
}

// Window helpers for flowers and fruit.
export const bloom = (g, start, end, fade = 0.08) => smooth(start, start + fade, g) * (1 - smooth(end, end + fade, g))
export { lerp, smooth, V, UP }
