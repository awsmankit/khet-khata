// Shared toolkit for the vegetable models: leaves, fruit, flowers, organ parts that grow in
// place, shaped soil (ridges and raised beds), bamboo and rigid structures.
import * as THREE from 'three'
import { GrowingPart, clamp01, ellipsoid, item, lerp, merge, orient, prep, smooth, transform, tube } from '../../geometry.js'
import { V, windMaterials } from '../../crops.js'
import { soilTexture } from '../../scenery.js'

export const TAU = Math.PI * 2
export const UPV = V(0, 1, 0)
const IDQ = new THREE.Quaternion()
const tmpColor = new THREE.Color()

// Horizontal unit direction for an azimuth, matching rotation about +Y of a blade that rises along +Z.
export const out = (az, r = 1) => V(Math.sin(az) * r, 0, Math.cos(az) * r)
export const quatTo = (direction) => new THREE.Quaternion().setFromUnitVectors(UPV, direction.clone().normalize())
export const quatYaw = (yaw) => new THREE.Quaternion().setFromAxisAngle(UPV, yaw)
// Points +Y along `direction`, after spinning about the own axis by `spin`.
export const quatDir = (direction, spin = 0) => quatTo(direction).multiply(quatYaw(spin))

const hash2 = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return s - Math.floor(s)
}
export function noise2(x, z) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  return lerp(lerp(hash2(ix, iz), hash2(ix + 1, iz), ux), lerp(hash2(ix, iz + 1), hash2(ix + 1, iz + 1), ux), uz)
}
export const noise3 = (x, y, z) => (noise2(x + z * 0.71, y - z * 0.37) + noise2(y * 1.13 + 7.1, z * 0.93 - x * 0.41)) * 0.5

/* --------------------------------------------------------------- leaves */
export const PROFILES = {
  oval: (t) => Math.pow(Math.sin(Math.PI * t), 0.6),
  lance: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9),
  ovate: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.75),
  obovate: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 1.45)), 0.7),
  round: (t) => Math.pow(Math.sin(Math.PI * t), 0.42),
  heart: (t) => Math.pow(Math.sin(Math.PI * (0.16 + 0.84 * Math.pow(t, 0.85))), 0.7),
  strap: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)), 0.55),
  linear: (t) => Math.min(1, (1 - t) * 3.5) * Math.min(1, 0.7 + t * 3),
}

// A leaf blade that rises from the origin along +Z/+Y (like geometry.blade) but with any outline,
// several columns across (so it can cup and crinkle), heart-shaped back lobes and a petiole.
export function leaf({
  length = 0.2, width = 0.1, shape = 'oval', rise = 0.6, droop = 0.6, segments = 6, across = 2,
  cup = 0.15, fold = 0, lobe = 0, wave = 0, waves = 5, petiole = 0, twist = 0,
  base = '#b4b4b4', tip = '#e4e4e4', rib = '#f6f6f6', edge = 0.86, random = Math.random, colorFn = null,
}) {
  const profile = typeof shape === 'function' ? shape : PROFILES[shape] || PROFILES.oval
  const cols = across * 2 + 1
  const positions = []
  const colors = []
  const indices = []
  const point = V()
  const step = length / segments
  const cBase = new THREE.Color(base)
  const cTip = new THREE.Color(tip)
  const cRib = rib ? new THREE.Color(rib) : null
  const phase = random() * TAU
  const tangent = V()
  const normal = V()
  const side = V()
  const vertex = V()
  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments
    const theta = rise - droop * Math.pow(t, 1.5)
    tangent.set(0, Math.sin(theta), Math.cos(theta))
    normal.set(0, Math.cos(theta), -Math.sin(theta))
    const roll = twist * t
    side.set(Math.cos(roll), 0, 0).addScaledVector(normal, Math.sin(roll))
    const inBlade = t >= petiole
    const lt = petiole > 0 ? Math.max(0, (t - petiole) / (1 - petiole)) : t
    const hw = inBlade ? (width / 2) * Math.max(profile(lt), petiole > 0 ? 0.04 : 0) : width * 0.035
    for (let col = 0; col < cols; col += 1) {
      const u = (col - across) / across
      const au = Math.abs(u)
      const crinkle = wave ? Math.sin(lt * waves * TAU + phase + u * 1.7) * wave * hw * au * au : 0
      const lift = hw * (cup * u * u - fold * au) + crinkle
      const back = lobe && inBlade ? -lobe * length * Math.pow(1 - lt, 3) * Math.pow(au, 1.2) : 0
      vertex.copy(point).addScaledVector(side, u * hw).addScaledVector(normal, lift).addScaledVector(tangent, back)
      positions.push(vertex.x, vertex.y, vertex.z)
      if (colorFn) colorFn(tmpColor, t, u, inBlade)
      else {
        tmpColor.copy(cBase).lerp(cTip, t)
        if (cRib && col === across) tmpColor.lerp(cRib, 0.6)
        tmpColor.multiplyScalar(lerp(1, edge, au))
      }
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
    }
    point.addScaledVector(tangent, step)
  }
  for (let row = 0; row < segments; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const a = row * cols + col
      const b = a + cols
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

// Palmate / lobed leaf: lobes fan out from the petiole tip in the leaf plane (centre lobe along +Z).
export function palmLeaf({ lobes = 5, spread = 2.4, length = 0.2, width = 0.12, sideScale = 0.3, random = Math.random, ...rest }) {
  const parts = []
  for (let index = 0; index < lobes; index += 1) {
    const f = lobes === 1 ? 0 : index / (lobes - 1) - 0.5
    const k = 1 - sideScale * Math.abs(f) * 2
    const geometry = leaf({ length: length * k, width: width * lerp(1, k, 0.5), random, ...rest })
    transform(geometry, { rotation: [0, f * spread + random.gauss() * 0.05, 0] })
    parts.push(geometry)
  }
  return merge(parts)
}

// Spine point of a blade-like arc (same maths as leaf), used to put leaflets on a rachis.
export function arcPoints(length, rise, droop, samples = 5) {
  const points = [V()]
  const point = V()
  const step = length / samples
  for (let index = 0; index < samples; index += 1) {
    const t = (index + 0.5) / samples
    const theta = rise - droop * Math.pow(t, 1.5)
    point.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar(step))
    points.push(point.clone())
  }
  return points
}

// Pinnate compound leaf: rachis with pairs of leaflets and a terminal leaflet.
export function pinnate({
  length = 0.25, rise = 0.7, droop = 0.9, pairs = 3, start = 0.3, rachis = 0.002, rachisColor = '#c8c8c8',
  leaflet = {}, leafletAngle = 1.0, shrink = 0.25, terminal = 1, small = 0, random = Math.random,
}) {
  const points = arcPoints(length, rise, droop)
  const curve = new THREE.CatmullRomCurve3(points)
  const parts = [tube(points, rachis, rachis * 0.5, { radial: 3, tubular: 4, color: rachisColor })]
  const place = (t, yaw, size, cheap = false) => {
    const at = curve.getPointAt(t)
    const dir = curve.getTangentAt(t)
    const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z))
    const geometry = leaf({ ...leaflet, ...(cheap ? { across: 1, segments: 2 } : {}), length: (leaflet.length || 0.05) * size, width: (leaflet.width || 0.03) * size, random })
    transform(geometry, { rotation: [-pitch, yaw, 0], order: 'XYZ' })
    geometry.translate(at.x, at.y, at.z)
    parts.push(geometry)
  }
  for (let pair = 0; pair < pairs; pair += 1) {
    const t = start + (pair / Math.max(1, pairs)) * (0.92 - start)
    const size = 1 - shrink * (1 - pair / Math.max(1, pairs - 1))
    for (const sign of [-1, 1]) place(t, sign * (leafletAngle + random.gauss() * 0.12), size * random.range(0.9, 1.08))
    if (small && pair < pairs - 1) {
      const ts = t + (0.92 - start) / pairs * 0.5
      for (const sign of [-1, 1]) place(ts, sign * (leafletAngle + 0.3), small, true)
    }
  }
  if (terminal) place(1, random.gauss() * 0.1, terminal)
  return merge(parts)
}

// Places a leaf (built along +Z) at a point, turned to azimuth `yaw`.
export function put(geometry, at, yaw = 0, pitch = 0) {
  transform(geometry, { rotation: [pitch, yaw, 0], order: 'YXZ' })
  geometry.translate(at.x, at.y, at.z)
  return geometry
}

/* --------------------------------------------------------------- stems */
// Radius guard: pow() of a tiny negative at the tip gives NaN.
const safe = (r) => (Number.isFinite(r) ? Math.max(0, r) : 0)

// A tube whose radius follows radiusFn(t); `bulge(t)` lets stems have knobby nodes.
export function stem(points, radiusFn, { radial = 6, tubular = 8, color = '#ffffff', colorFn = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false)
  const position = geometry.attributes.position
  const center = V()
  const vertex = V()
  for (let ring = 0; ring <= tubular; ring += 1) {
    const t = ring / tubular
    curve.getPointAt(t, center)
    const radius = safe(radiusFn(t))
    for (let s = 0; s <= radial; s += 1) {
      const index = ring * (radial + 1) + s
      vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(radius).add(center)
      position.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }
  }
  geometry.computeVertexNormals()
  return prep(geometry, color, colorFn)
}

/* --------------------------------------------------------------- fruit */
// Solid of revolution hanging from the origin: t = 0 at the stalk end, body runs down -Y.
// warp(vertex, t, phi) may reshape it (ribs, lobes, wrinkles).
export function lathe(radius, length, { radial = 10, rows = 10, colorFn = null, warp = null } = {}) {
  const points = []
  for (let index = rows; index >= 0; index -= 1) {
    const t = index / rows
    points.push(new THREE.Vector2(Math.max(safe(radius(t)), 0.0003), -t * length))
  }
  const geometry = new THREE.LatheGeometry(points, radial)
  if (warp) {
    const position = geometry.attributes.position
    const vertex = V()
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index)
      warp(vertex, -vertex.y / length, Math.atan2(vertex.z, vertex.x))
      position.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }
  }
  geometry.computeVertexNormals()
  return prep(geometry, '#ffffff', colorFn)
}

// Ribbed radial scale used by tomatoes, bell peppers and okra.
export const ribs = (count, depth, along = () => 1) => (vertex, t, phi) => {
  const k = 1 + depth * along(t) * Math.cos(count * phi)
  vertex.x *= k
  vertex.z *= k
}

// Flat flower facing +Y: petals radiate from the centre, with an optional anther cone.
export function flower({
  petals = 5, length = 0.015, width = 0.01, rise = 0.4, droop = 0.25, cup = 0.25, shape = 'oval', segments = 3, across = 1,
  center = 0.003, centerColor = '#8c8c8c', cone = 0, coneColor = '#d0d0d0', petal = ['#e8e8e8', '#ffffff'], petalFn = null, random = Math.random, wave = 0,
}) {
  const parts = []
  for (let index = 0; index < petals; index += 1) {
    const geometry = leaf({ length, width, shape, rise, droop, segments, across, cup, wave, waves: 2, rib: null, edge: 0.95, base: petal[0], tip: petal[1], colorFn: petalFn, random })
    transform(geometry, { rotation: [0, (index / petals) * TAU + random.gauss() * 0.08, 0] })
    parts.push(geometry)
  }
  if (center) parts.push(ellipsoid(center, center * 0.7, center, { widthSegments: 6, heightSegments: 3, color: centerColor }))
  if (cone) {
    const geometry = prep(new THREE.ConeGeometry(Math.max(center, 0.002) * 1.1, cone, 5, 1, true), coneColor)
    geometry.translate(0, cone / 2, 0)
    parts.push(geometry)
  }
  return merge(parts)
}

/* --------------------------------------------------------------- growing parts */
// One instance per organ (fruit, flower, pod, head). Its position follows the plant's growth
// scale, so organs stay attached to the stem, and it swells about its own origin.
export class OrganPart extends GrowingPart {
  constructor({ plantScale, ...options }) {
    super(options)
    this.plantScale = plantScale
    this.world = V()
  }

  update(growth) {
    const { items, mesh, matrix, vector, colorTemp, world } = this
    for (let index = 0; index < items.length; index += 1) {
      const organ = items[index]
      const plant = organ.plant
      const ps = this.plantScale(clamp01(growth + (plant.offset || 0)), plant)
      if (Array.isArray(ps)) world.set(organ.local.x * ps[0] * plant.s, organ.local.y * ps[1] * plant.s, organ.local.z * ps[2] * plant.s)
      else world.copy(organ.local).multiplyScalar(ps * plant.s)
      world.applyQuaternion(plant.q).add(plant.p)
      const g = clamp01(growth + organ.offset)
      const own = this.scale(g, organ)
      if (Array.isArray(own)) vector.set(own[0] * organ.s, own[1] * organ.s, own[2] * organ.s)
      else vector.setScalar(Math.max(0, own) * organ.s)
      matrix.compose(world, organ.q, vector)
      mesh.setMatrixAt(index, matrix)
      if (this.color) {
        this.color(colorTemp, g, organ)
        mesh.setColorAt(index, colorTemp)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
}

// Organ slot inside a plant variant: local position, orientation and size.
export const slot = (p, q = IDQ, extra = {}) => ({ p: p.clone(), q: q.clone(), ...extra })

// Plants a field. Each variant supplies geometries per layer key (all sharing the plant's
// transform and growth scale) and organ slots per organ key.
export function grow(ctx, { spots, variants, baseY = 0, wind, scale, layers, organs = {}, tilt = 0.05 }) {
  const { random } = ctx
  const plants = []
  const byVariant = variants.map(() => [])
  for (const spot of spots) {
    const entry = item(V(spot.x, spot.y ?? baseY, spot.z), spot.yaw ?? random() * TAU, spot.s ?? random.range(0.86, 1.14), spot.offset ?? random.gauss() * 0.03, spot.tilt ?? [random.gauss() * tilt, random.gauss() * tilt])
    entry.tone = spot.tone ?? random.gauss() * 0.07
    entry.kind = spot.kind ?? 0
    entry.variant = spot.variant ?? Math.floor(random() * variants.length)
    byVariant[entry.variant].push(entry)
    plants.push(entry)
  }
  for (const [key, layer] of Object.entries(layers)) {
    const mats = windMaterials(ctx, layer.wind || wind, layer.materialOptions || {})
    variants.forEach((variant, index) => {
      if (!variant[key]) return
      if (!byVariant[index].length) { variant[key].dispose(); return }
      ctx.addPart(new GrowingPart({ geometry: variant[key], material: mats.material, depthMaterial: mats.depth, items: byVariant[index], scale: layer.scale || scale, color: layer.color, castShadow: layer.castShadow !== false }))
    })
  }
  for (const [key, organ] of Object.entries(organs)) {
    const geometries = organ.geometries
    const lists = geometries.map(() => [])
    for (const plant of plants) {
      const slots = variants[plant.variant].slots?.[key] || []
      for (const entry of slots) {
        const kind = (entry.kind ?? Math.floor(random() * geometries.length)) % geometries.length
        lists[kind].push({
          plant, local: entry.p, q: plant.q.clone().multiply(entry.q),
          s: (entry.s ?? 1) * plant.s * random.range(0.9, 1.1),
          offset: (plant.offset || 0) + (entry.offset ?? 0) + random.gauss() * (organ.jitter ?? 0.02),
          tone: plant.tone + random.gauss() * 0.05, h: entry.h ?? 0.5, kind: plant.kind, pick: random(),
        })
      }
    }
    const mats = windMaterials(ctx, organ.wind || wind, organ.materialOptions || {})
    geometries.forEach((geometry, index) => {
      if (!lists[index].length) { geometry.dispose(); return }
      ctx.addPart(new OrganPart({ geometry, material: mats.material, depthMaterial: mats.depth, items: lists[index], plantScale: organ.plantScale || scale, scale: organ.scale, color: organ.color, castShadow: organ.castShadow !== false }))
    })
  }
  return plants
}

/* --------------------------------------------------------------- soil and layout */
// Raised beds with flat tops and sloping sides, or rounded ridges, centred in the plot.
export function beds(width, { pitch, top, height, slope = 0.12, ridge = false }) {
  const count = Math.max(1, Math.floor(width / pitch))
  const start = (-count * pitch) / 2
  const centers = Array.from({ length: count }, (_, index) => start + pitch * (index + 0.5))
  const h = (x) => {
    const k = Math.floor((x - start) / pitch)
    if (k < 0 || k >= count) return 0
    const d = x - centers[k]
    if (ridge) return height * Math.pow(0.5 + 0.5 * Math.cos((TAU * d) / pitch), 0.85)
    return height * (1 - smooth(top / 2, top / 2 + slope, Math.abs(d)))
  }
  return { centers, h, height, pitch }
}

export function shapedSoil(ctx, plot, { h = () => 0, color = '#8a6644', seed = 13, step = 0.035, mulch = null, y = 0, emissive = '#000000' }) {
  const { width, depth } = plot
  const columns = Math.min(420, Math.ceil(width / step))
  const geometry = new THREE.PlaneGeometry(width, depth, columns, Math.ceil(depth / 0.5))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  let top = 0.001
  for (let index = 0; index < position.count; index += 1) top = Math.max(top, h(position.getX(index)))
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const height = h(x)
    const n = noise2(x * 1.9, z * 1.9)
    position.setY(index, y + height + (n - 0.5) * 0.014 + (noise2(x * 9, z * 9) - 0.5) * 0.006)
    // damp, darker furrows; drier, paler tops
    tmpColor.setScalar(top > 0.002 ? lerp(0.78, 1.04, height / top) * (0.94 + n * 0.12) : 0.96 + n * 0.08)
    colors.set([tmpColor.r, tmpColor.g, tmpColor.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const texture = soilTexture(color, seed)
  texture.repeat.set(width / 2.2, depth / 2.2)
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, vertexColors: true, emissive })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  ctx.disposables.push(texture, material)
  ctx.addMesh(mesh)
  if (mulch) {
    // plastic mulch film over the bed tops, tucked into the soil at the edges
    const strips = mulch.centers.map((cx) => {
      const strip = new THREE.PlaneGeometry(mulch.width, depth - 0.2, 6, 1)
      strip.rotateX(-Math.PI / 2)
      const p = strip.attributes.position
      for (let index = 0; index < p.count; index += 1) {
        const x = p.getX(index)
        const edge = smooth(mulch.width / 2 - 0.12, mulch.width / 2, Math.abs(x))
        p.setY(index, y + h(cx + x) + 0.012 - edge * 0.05)
      }
      strip.translate(cx, 0, 0)
      return prep(strip, '#ffffff', (c, px) => c.setScalar(0.92 + 0.08 * Math.sin(px * 40)))
    })
    const film = new THREE.Mesh(merge(strips), new THREE.MeshStandardMaterial({ color: mulch.color || '#2a2a2a', roughness: mulch.roughness ?? 0.42, metalness: mulch.metalness ?? 0.1, vertexColors: true }))
    film.receiveShadow = true
    ctx.disposables.push(film.material)
    ctx.addMesh(film)
  }
}

// Plant spots along rows (x positions) running the depth of the plot.
export function spotsAlong(xs, depth, gap, random, { jitterX = 0.02, jitterZ = 0.15, skip = 0.02, y = 0, margin = 0.15, stagger = false } = {}) {
  const spots = []
  xs.forEach((x, row) => {
    const shift = stagger && row % 2 ? gap / 2 : 0
    for (let z = -depth / 2 + margin + gap * 0.5 + shift; z < depth / 2 - margin; z += gap) {
      if (random() < skip) continue
      spots.push({ x: x + random.gauss() * jitterX, z: z + random.gauss() * gap * jitterZ, y })
    }
  })
  return spots
}

// Rows across beds: offsets are the row positions measured from each bed centre.
export const bedRows = (layout, offsets) => layout.centers.flatMap((c) => offsets.map((o) => c + o))

// Ridged field: plants on the ridge crests.
export function ridgeField(ctx, plot, { pitch, height = 0.12, gap, skip = 0.02, seed = 17, color }) {
  const layout = beds(plot.width, { pitch, height, ridge: true })
  shapedSoil(ctx, plot, { h: layout.h, seed, color })
  const spots = spotsAlong(layout.centers, plot.depth, gap / Math.sqrt(ctx.quality), ctx.random, { y: height - 0.008, skip })
  return { layout, spots }
}

// Raised beds with several rows on each bed top.
export function bedField(ctx, plot, { pitch, top, height = 0.12, rows, gap, skip = 0.02, stagger = true, jitterX = 0.02, jitterZ = 0.15, seed = 23, color }) {
  const layout = beds(plot.width, { pitch, top, height })
  shapedSoil(ctx, plot, { h: layout.h, seed, color })
  const spots = spotsAlong(bedRows(layout, rows), plot.depth, gap / Math.sqrt(ctx.quality), ctx.random, { y: height - 0.006, skip, stagger, jitterX, jitterZ })
  return { layout, spots }
}

export function cornerCamera(plot, { height = 1.9, back = 2.6, side = 0.47, targetY = 0.4, targetX = -0.04, targetZ = 0.14 } = {}) {
  return { position: V(plot.width * side, height, plot.depth / 2 + back), target: V(plot.width * targetX, targetY, plot.depth * targetZ) }
}

/* --------------------------------------------------------------- rigid bits */
export function bamboo(start, end, radius = 0.018, { node = 0.32, color = '#b39a63', radial = 6 } = {}) {
  const direction = end.clone().sub(start)
  const length = direction.length()
  const segments = Math.max(1, Math.round(length / node))
  const geometry = new THREE.CylinderGeometry(radius * 0.85, radius, length, radial, segments, true)
  geometry.translate(0, length / 2, 0)
  const base = new THREE.Color(color)
  const g = prep(geometry, '#ffffff', (c, x, y, z) => {
    const band = ((y / node) % 1 + 1) % 1
    c.copy(base).multiplyScalar((band < 0.05 || band > 0.97 ? 0.66 : 0.9) + 0.14 * noise2(y * 3 + x * 40, z * 40))
  })
  return orient(g, start, direction)
}

export function rod(start, end, radius = 0.002, color = '#e8e2cf', radial = 3) {
  const direction = end.clone().sub(start)
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), radial, 1, true)
  geometry.translate(0, direction.length() / 2, 0)
  return orient(prep(geometry, color), start, direction)
}

export function rigid(ctx, geometries, { roughness = 0.9, metalness = 0, castShadow = true, receiveShadow = true, side = THREE.FrontSide, ...rest } = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness, side, ...rest })
  const mesh = new THREE.Mesh(merge(geometries), material)
  mesh.castShadow = castShadow
  mesh.receiveShadow = receiveShadow
  ctx.disposables.push(material)
  ctx.addMesh(mesh)
  return mesh
}
