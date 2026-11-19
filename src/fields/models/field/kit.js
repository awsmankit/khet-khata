// Shared kit for the field group: an assembler whose heads are mounted per tiller (so ears
// emerge from their own stem top and can nod as they ripen), shaped tubes for spikes and
// fingers, broad leaf shapes, and three plant families (tillered grasses, herbs, clovers).
import * as THREE from 'three'
import { blade, clamp01, GrowingPart, item, lerp, merge, prep, transform, tube } from '../../geometry.js'
import { V, UP, windMaterials } from '../../crops.js'

const tmpPos = V()
const tmpScale = V()
const tmpQ = new THREE.Quaternion()
const tmpQ2 = new THREE.Quaternion()
const tmpC = new THREE.Color()

/* ------------------------------------------------------------ mounted heads */
// One instance per head. The plant's growth scale only moves the mount point, so heads
// stay round instead of being squashed with the young plant, and each head grows out of
// its own stem top. `nod(g)` blends from the upright to the nodding orientation.
export class MountedPart extends GrowingPart {
  constructor(options) {
    super(options)
    this.nod = options.nod || null
  }

  update(growth) {
    const { items, mesh, matrix, colorTemp } = this
    for (let index = 0; index < items.length; index += 1) {
      const entry = items[index]
      const g = clamp01(growth + entry.offset)
      const ps = this.parent ? this.parent(clamp01(growth + entry.plantOffset), entry.plant) : 1
      const sx = Array.isArray(ps) ? ps[0] : ps
      const sy = Array.isArray(ps) ? ps[1] : ps
      const sz = Array.isArray(ps) ? ps[2] : ps
      tmpPos.set(entry.at.x * sx, entry.at.y * sy, entry.at.z * sz).multiplyScalar(entry.s).applyQuaternion(entry.q).add(entry.p)
      tmpQ.copy(entry.up)
      if (this.nod && entry.down) tmpQ.slerp(entry.down, this.nod(g, entry))
      tmpQ2.copy(entry.q).multiply(tmpQ)
      tmpScale.setScalar(Math.max(0, this.scale(g, entry)) * entry.s * entry.hs)
      matrix.compose(tmpPos, tmpQ2, tmpScale)
      mesh.setMatrixAt(index, matrix)
      if (this.color) {
        this.color(colorTemp, g, entry)
        mesh.setColorAt(index, colorTemp)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
}

function mountItem(random, plantItem, mount, head) {
  const dir = mount.dir.clone().normalize()
  const out = (mount.out || V(1, 0, 0)).clone()
  // local +X of the head (the way arched heads bend) faces outward from the clump
  const twist = Math.atan2(-out.z, out.x) + random.gauss() * (head.twistJitter ?? 0.35)
  const up = new THREE.Quaternion().setFromUnitVectors(UP, dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, twist))
  let down = null
  if (head.nodAngle) {
    const angle = random.range(head.nodAngle[0], head.nodAngle[1])
    const perp = out.clone().addScaledVector(dir, -out.dot(dir))
    if (perp.lengthSq() < 1e-6) perp.set(1, 0, 0)
    perp.normalize()
    const bent = dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(perp, Math.sin(angle)).normalize()
    down = new THREE.Quaternion().setFromUnitVectors(dir, bent).multiply(up)
  }
  return {
    p: plantItem.p, q: plantItem.q, s: plantItem.s,
    hs: random.range(0.9, 1.1) * (mount.scale || 1),
    offset: plantItem.offset + random.gauss() * (head.spread ?? 0.012) + (mount.lag || 0),
    plantOffset: plantItem.offset,
    tone: plantItem.tone + random.gauss() * 0.04,
    hue: plantItem.hue,
    pick: random(),
    kind: mount.kind || 'main',
    plant: plantItem,
    at: mount.at,
    up,
    down,
  }
}

// Places plant variants on spots. `parts` are extra geometries that follow the plant
// (stems in another colour, canes, dry leaves); `heads` are mounted per tiller/branch tip.
export function sow(ctx, { variants, spots, lod = null, baseY = 0.035, wind, plant, parts = [], heads = [], offset = null, size = [0.86, 1.12], tilt = 0.05, decorate = null }) {
  const { random } = ctx
  const plantMats = windMaterials(ctx, wind, plant.materialOptions)
  const partMats = parts.map((part) => windMaterials(ctx, part.wind || wind, part.materialOptions || plant.materialOptions))
  const headMats = heads.map((head) => windMaterials(ctx, head.wind || wind, head.materialOptions || plant.materialOptions))
  // far-field detail: plants beyond lod.isFar use lighter plant and head geometry
  const pools = heads.map((head) => [...head.geometries, ...(head.farGeometries || [])])
  const headItems = pools.map((pool) => pool.map(() => []))
  const groups = lod
    ? [{ list: variants, spots: spots.filter((spot) => !lod.isFar(spot[0], spot[1])), far: false }, { list: lod.variants, spots: spots.filter((spot) => lod.isFar(spot[0], spot[1])), far: true }]
    : [{ list: variants, spots, far: false }]
  groups.forEach(({ list, spots: groupSpots, far }) => list.forEach((variant, variantIndex) => {
    const items = []
    groupSpots.forEach((spot, index) => {
      if (index % list.length !== variantIndex) return
      const shift = offset ? offset(spot[0], spot[1], random) : random.gauss() * 0.035
      const entry = item(V(spot[0], baseY, spot[1]), random() * Math.PI * 2, random.range(size[0], size[1]), shift, [random.gauss() * tilt, random.gauss() * tilt])
      entry.tone = random.gauss() * 0.07
      entry.hue = random()
      entry.far = far
      decorate?.(entry, spot)
      items.push(entry)
    })
    if (!items.length) return
    ctx.addPart(new GrowingPart({ geometry: variant.plant, material: plantMats.material, depthMaterial: plantMats.depth, items, scale: plant.scale, color: plant.color }))
    parts.forEach((part, partIndex) => {
      const geometry = variant[part.key]
      if (!geometry) return
      ctx.addPart(new GrowingPart({ geometry, material: partMats[partIndex].material, depthMaterial: partMats[partIndex].depth, items, parent: plant.scale, pivot: variant.pivots?.[part.key] || V(0, 0.5, 0), scale: part.scale || (() => 1), color: part.color, castShadow: part.castShadow !== false }))
    })
    items.forEach((entry) => {
      // a head with `linkTo` copies another head's placement and variant index exactly
      // (pearl millet anthers sit on their own spike)
      const made = heads.map(() => new Map())
      heads.forEach((head, headIndex) => {
        const mounts = variant.mounts?.[head.key] || []
        const useFar = far && head.farGeometries?.length
        const first = useFar ? head.geometries.length : 0
        const count = useFar ? head.farGeometries.length : head.geometries.length
        mounts.forEach((mount) => {
          if (head.linkTo !== undefined) {
            const base = made[head.linkTo].get(mount)
            if (base) headItems[headIndex][base.index].push({ ...base.item })
            return
          }
          if (head.keep && !head.keep(entry, mount, random, far)) return
          const index = first + Math.floor(random() * count)
          const created = mountItem(random, entry, mount, head)
          headItems[headIndex][index].push(created)
          made[headIndex].set(mount, { item: created, index })
        })
      })
    })
  }))
  heads.forEach((head, headIndex) => pools[headIndex].forEach((geometry, geometryIndex) => {
    ctx.addPart(new MountedPart({ geometry, material: headMats[headIndex].material, depthMaterial: headMats[headIndex].depth, items: headItems[headIndex][geometryIndex], parent: plant.scale, scale: head.scale, color: head.color, nod: head.nod, castShadow: head.castShadow !== false }))
  }))
}

/* ------------------------------------------------------------ primitives */
// A small pointed grain or spikelet (8 triangles), built along +Y around the origin.
export function grain(random, rx, ry, rz, low = 0.84) {
  const geometry = new THREE.OctahedronGeometry(1, 0)
  geometry.scale(rx, ry, rz)
  return prep(geometry, '#ffffff', (c) => c.setScalar(random.range(low, 1)))
}

// A tiny four-faced seed (buckwheat achene).
export function achene(random, size) {
  const geometry = new THREE.TetrahedronGeometry(size, 0)
  geometry.scale(1, 1.35, 1)
  return prep(geometry, '#ffffff', (c) => c.setScalar(random.range(0.8, 1)))
}

// An awn: two crossed slivers, so it reads from every side (2 triangles).
export function awn(length, width, color = '#ffffff') {
  const h = width / 2
  const positions = [-h, 0, 0, h, 0, 0, 0, length, 0, 0, 0, -h, 0, 0, h, 0, length, 0]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return prep(geometry, color)
}

// A tube whose radius follows `radius(t)` and whose surface can be lumpy (`bump`), beaded
// along its length (`beads`) or star-shaped in section (`star`, for bristly spikes).
// `tint(color, t, ring, side)` sets vertex colours. Seams stay closed.
export function shapedTube(random, points, radius, { radial = 6, tubular = 8, bump = 0, beads = 0, star = 0, tint = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const center = V()
  const vertex = V()
  const jitter = Array.from({ length: (tubular + 1) * radial }, () => random() * 2 - 1)
  for (let ring = 0; ring <= tubular; ring += 1) {
    const t = ring / tubular
    curve.getPointAt(t, center)
    const r = Math.max(0.0002, radius(t))
    for (let side = 0; side <= radial; side += 1) {
      const index = ring * (radial + 1) + side
      const wrapped = side % radial
      const factor = 1 + bump * jitter[ring * radial + wrapped] + beads * (ring % 2 ? 0.6 : -0.4) + star * (wrapped % 2 ? 0.7 : -0.3)
      vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(r * factor).add(center)
      position.setXYZ(index, vertex.x, vertex.y, vertex.z)
      if (tint) tint(tmpC, t, ring, wrapped)
      else tmpC.setScalar(1)
      colors.set([tmpC.r, tmpC.g, tmpC.b], index * 3)
    }
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return prep(geometry)
}

// A curve that rises along +Y and, with `arch` > 0, bends over towards +X (nodding heads).
export function archPoints(length, arch, start = 0) {
  return [
    V(0, start, 0),
    V(arch * 0.12 * length, start + 0.35 * length, 0),
    V(arch * 0.42 * length, start + (0.68 - arch * 0.1) * length, 0),
    V(arch * 0.72 * length, start + (0.95 - arch * 0.55) * length, 0),
  ]
}

// Broad leaf shapes, widths 0..1 along the leaf (t = 0 at the stalk).
export const leafShapes = {
  heart: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.24 + t * 0.76)), 0.75),
  goosefoot: (t) => (t < 0.3 ? 0.62 + (t / 0.3) * 0.38 : Math.pow(1 - (t - 0.3) / 0.7, 0.85)),
  ovate: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.7),
  oblong: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.92)), 0.45),
  obovate: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 1.35)), 0.55),
}

// Like geometry.blade() but with any width profile, a cordate notch at the base (`lobe`)
// and a midrib. Rises from the origin along +Z/+Y.
export function leafBlade({ length = 0.1, width = 0.05, profile = leafShapes.ovate, rise = 0.5, droop = 0.6, segments = 4, fold = 0.2, lobe = 0, base = '#a8a8a8', tip = '#e2e2e2', rib = '#ffffff' }) {
  const positions = []
  const colors = []
  const indices = []
  const colorBase = new THREE.Color(base)
  const colorTip = new THREE.Color(tip)
  const colorRib = new THREE.Color(rib)
  const point = V()
  const step = length / segments
  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments
    const theta = rise - droop * Math.pow(t, 1.5)
    const along = V(0, Math.sin(theta), Math.cos(theta))
    const normal = V(0, Math.cos(theta), -Math.sin(theta))
    const halfWidth = (width * profile(t)) / 2
    const back = lobe * width * (row === 0 ? 1 : row === 1 ? 0.35 : 0)
    const left = point.clone().add(V(-halfWidth, 0, 0)).addScaledVector(normal, -halfWidth * fold).addScaledVector(along, -back)
    const middle = point.clone().addScaledVector(normal, halfWidth * fold * 0.3)
    const right = point.clone().add(V(halfWidth, 0, 0)).addScaledVector(normal, -halfWidth * fold).addScaledVector(along, -back)
    for (const [vertex, isRib] of [[left, false], [middle, true], [right, false]]) {
      positions.push(vertex.x, vertex.y, vertex.z)
      tmpC.copy(colorBase).lerp(colorTip, t * 0.8 + (isRib ? 0 : 0.2))
      if (isRib) tmpC.lerp(colorRib, 0.35)
      colors.push(tmpC.r, tmpC.g, tmpC.b)
    }
    point.addScaledVector(along, step)
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

// A small leaflet in four triangles (base, two shoulder pairs, tip): clover leaflets are
// only a few centimetres, so a full stand can afford many of them.
export function tinyLeaf({ length = 0.03, width = 0.014, shoulders = [0.35, 0.85, 0.72, 0.95], rise = 0.4, droop = 0.4, fold = 0.15, base = '#a8a8a8', tip = '#e4e4e4' }) {
  const rows = [[0, 0], [shoulders[0], shoulders[1]], [shoulders[2], shoulders[3]], [1, 0]]
  const positions = []
  const colors = []
  const point = V()
  const colorBase = new THREE.Color(base)
  const colorTip = new THREE.Color(tip)
  let previous = 0
  rows.forEach(([t, w], row) => {
    const theta = rise - droop * Math.pow(previous, 1.5)
    point.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar((t - previous) * length))
    previous = t
    const half = (w * width) / 2
    tmpC.copy(colorBase).lerp(colorTip, t)
    const vertices = row === 0 || row === 3 ? [point.clone()] : [point.clone().add(V(-half, -half * fold, 0)), point.clone().add(V(half, -half * fold, 0))]
    vertices.forEach((vertex) => { positions.push(vertex.x, vertex.y, vertex.z); colors.push(tmpC.r, tmpC.g, tmpC.b) })
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4])
  geometry.computeVertexNormals()
  return prep(geometry)
}

const heightShade = (height, low = 0.66) => (c, x, y) => c.setScalar(lerp(low, 1, clamp01(y / height)))

/* ------------------------------------------------------------ plant families */
// Tillered grass: wheat, millets, sorghum, napier, rice. Returns the leafy plant and a
// head mount at every tiller top. Options are ranges [min, max] where noted.
export function tillerPlant(random, o) {
  const parts = []
  const canes = []
  const dry = []
  const mounts = []
  const count = Math.round(random.range(o.tillers[0], o.tillers[1]))
  const pivot = V()
  let tallest = 0
  for (let index = 0; index < count; index += 1) {
    const azimuth = (index / count) * Math.PI * 2 + random.gauss() * 0.5
    const lean = index === 0 && o.mainUpright ? random.range(0, 0.04) : random.range(o.lean[0], o.lean[1])
    const height = random.range(o.height[0], o.height[1]) * (index === 0 ? 1 : random.range(o.tillerShort ?? 0.86, 1))
    tallest = Math.max(tallest, height)
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const dir = V(Math.sin(lean) * out.x, Math.cos(lean), Math.sin(lean) * out.z)
    const base = out.clone().multiplyScalar((o.spread || 0) * (index === 0 && o.mainUpright ? 0 : random.range(0.35, 1)))
    const sway = V(random.gauss(), 0, random.gauss()).multiplyScalar(height * 0.015)
    // stems bow outward a little more at the top as they lean
    const top = base.clone().addScaledVector(dir, height).addScaledVector(out, height * lean * (o.bow ?? 0.2))
    const points = [base, base.clone().addScaledVector(dir, height * 0.5).add(sway), top]
    const curve = new THREE.CatmullRomCurve3(points)
    parts.push(tube(points, o.stem[0], o.stem[1], { radial: o.stemRadial || 4, tubular: o.stemSegments || 4, colorFn: heightShade(height) }))
    if (o.canes) canes.push(tube(points.map((p) => p.clone()), o.canes.radius[0], o.canes.radius[1], { radial: 6, tubular: Math.round(height / 0.09), colorFn: o.canes.colorFn }))
    const leaves = o.leaves
    for (let leaf = 0; leaf < leaves; leaf += 1) {
      const t = lerp(o.leafZone[0], o.leafZone[1], leaves > 1 ? leaf / (leaves - 1) : 0)
      const at = curve.getPointAt(t)
      const size = 1 - (o.leafTaper || 0) * t
      const geometry = blade({
        length: random.range(o.leafLength[0], o.leafLength[1]) * size, width: o.leafWidth * lerp(1, 0.82, t),
        rise: random.range(o.leafRise[0], o.leafRise[1]), droop: random.range(o.leafDroop[0], o.leafDroop[1]), segments: o.leafSegments || 4,
        fold: o.fold ?? 0.25, shape: o.leafShape || 'grass', base: o.leafBase || '#b4b4b4', tip: o.leafTip || '#f0f0f0', rib: o.rib || null,
      })
      transform(geometry, { rotation: [0, azimuth + leaf * Math.PI + random.gauss() * 0.45, 0] })
      geometry.translate(at.x, at.y, at.z)
      parts.push(geometry)
    }
    for (let leaf = 0; leaf < (o.dryLeaves || 0); leaf += 1) {
      const at = curve.getPointAt(0.08 + leaf * 0.1)
      const geometry = blade({ length: random.range(o.leafLength[0], o.leafLength[1]) * 0.7, width: o.leafWidth * 0.8, rise: random.range(-0.2, 0.3), droop: random.range(0.5, 1.0), segments: 4, fold: 0.1, base: '#9a9a9a', tip: '#d0d0d0' })
      transform(geometry, { rotation: [0, azimuth + leaf * 2.4, 0] })
      geometry.translate(at.x, at.y, at.z)
      dry.push(geometry)
    }
    pivot.add(top)
    mounts.push({ at: top, dir: curve.getTangentAt(1), out, kind: index === 0 ? 'main' : 'tiller' })
  }
  for (let leaf = 0; leaf < (o.basal || 0); leaf += 1) {
    const geometry = blade({
      length: random.range(o.basalLength[0], o.basalLength[1]), width: o.basalWidth || o.leafWidth, rise: random.range(o.basalRise?.[0] ?? 0.9, o.basalRise?.[1] ?? 1.4),
      droop: random.range(o.basalDroop?.[0] ?? 0.8, o.basalDroop?.[1] ?? 1.6), segments: o.basalSegments || o.leafSegments || 4, fold: o.fold ?? 0.25,
      shape: o.leafShape || 'grass', base: o.leafBase || '#b4b4b4', tip: o.leafTip || '#f0f0f0', rib: o.rib || null,
    })
    transform(geometry, { rotation: [0, random() * Math.PI * 2, 0] })
    geometry.translate(random.gauss() * (o.spread || 0.01) * 0.5, 0, random.gauss() * (o.spread || 0.01) * 0.5)
    parts.push(geometry)
  }
  pivot.divideScalar(count)
  const result = { plant: merge(parts), mounts: { head: mounts }, pivots: { canes: V(0, tallest * 0.5, 0), dry: V(0, tallest * 0.2, 0) }, height: tallest }
  if (canes.length) result.canes = merge(canes)
  if (dry.length) result.dry = merge(dry)
  return result
}

// Broad-leaved herb: buckwheat, amaranth, quinoa. Leaves on petioles in a spiral, a few
// branches, and head mounts at the main tip, branch tips and (optionally) upper axils.
export function herbPlant(random, o) {
  const stems = []
  const leaves = []
  const mounts = []
  const height = random.range(o.height[0], o.height[1])
  const lean = random.range(0, o.lean || 0.06)
  const leanAz = random() * Math.PI * 2
  const top = V(Math.sin(lean) * Math.cos(leanAz) * height, height, Math.sin(lean) * Math.sin(leanAz) * height)
  const mainPoints = [V(), V(random.gauss() * 0.015, height * 0.5, random.gauss() * 0.015), top]
  const main = new THREE.CatmullRomCurve3(mainPoints)
  stems.push(tube(mainPoints, o.stem[0], o.stem[1], { radial: o.stemRadial || 5, tubular: 5, colorFn: heightShade(height, 0.75) }))
  const addLeaf = (at, out, size, rise) => {
    const petiole = o.petiole * size
    const end = at.clone().addScaledVector(out, petiole).add(V(0, petiole * 0.45, 0))
    stems.push(tube([at, at.clone().lerp(end, 0.5), end], o.petioleRadius, o.petioleRadius * 0.7, { radial: 3, tubular: 1, color: '#ffffff' }))
    const geometry = leafBlade({
      length: o.leafLength * size * random.range(0.88, 1.12), width: o.leafWidth * size * random.range(0.9, 1.1), profile: o.profile, lobe: o.lobe || 0,
      rise, droop: random.range(o.leafDroop[0], o.leafDroop[1]), segments: o.leafSegments || 4, fold: o.fold ?? 0.22, base: '#9e9e9e', tip: '#dcdcdc', rib: '#ffffff',
    })
    transform(geometry, { rotation: [0, Math.atan2(out.x, out.z), 0] })
    geometry.translate(end.x, end.y, end.z)
    leaves.push(geometry)
  }
  for (let index = 0; index < o.leaves; index += 1) {
    const t = lerp(o.leafZone[0], o.leafZone[1], index / Math.max(1, o.leaves - 1))
    const at = main.getPointAt(t)
    const azimuth = index * 2.4 + random.gauss() * 0.25
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    addLeaf(at, out, lerp(1, o.leafTop ?? 0.5, t), lerp(o.leafRise[0], o.leafRise[1], t) + random.gauss() * 0.1)
    if (o.axilHeads && t > 1 - o.axilHeads) mounts.push({ at: at.clone().addScaledVector(out, 0.02), dir: out.clone().add(V(0, 1.6, 0)), out, kind: 'axil', scale: o.axilScale || 0.6, lag: 0.03 })
  }
  for (let index = 0; index < (o.branches || 0); index += 1) {
    const t = lerp(o.branchZone[0], o.branchZone[1], index / Math.max(1, o.branches - 1))
    const at = main.getPointAt(t)
    const azimuth = index * 2.4 + 1.2 + random.gauss() * 0.3
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const length = o.branchLength * random.range(0.75, 1.05) * (1 - t * 0.35)
    const angle = o.branchAngle * random.range(0.85, 1.15)
    const end = at.clone().addScaledVector(out, Math.sin(angle) * length).add(V(0, Math.cos(angle) * length, 0))
    const mid = at.clone().lerp(end, 0.5).addScaledVector(out, length * 0.08)
    stems.push(tube([at, mid, end], o.stem[1] * 1.2, o.stem[1] * 0.7, { radial: 4, tubular: 3, colorFn: heightShade(height, 0.8) }))
    const branch = new THREE.CatmullRomCurve3([at, mid, end])
    for (let leaf = 0; leaf < (o.branchLeaves || 0); leaf += 1) {
      const u = 0.35 + (leaf / Math.max(1, o.branchLeaves)) * 0.6
      const leafAz = azimuth + (leaf % 2 ? 1 : -1) * 1.1 + random.gauss() * 0.3
      addLeaf(branch.getPointAt(u), V(Math.cos(leafAz), 0, Math.sin(leafAz)), (o.branchLeafSize ?? 0.6) * (1 - u * 0.3), lerp(o.leafRise[0], o.leafRise[1], 0.7))
    }
    mounts.push({ at: end, dir: end.clone().sub(mid).normalize().add(V(0, 0.8, 0)), out, kind: 'side', scale: o.sideScale ?? 0.6, lag: 0.02 })
  }
  mounts.push({ at: top, dir: main.getTangentAt(1), out: V(Math.cos(leanAz), 0, Math.sin(leanAz)), kind: 'main', scale: 1 })
  return { plant: merge(leaves), stems: merge(stems), mounts: { head: mounts }, pivots: { stems: V(0, height * 0.5, 0) }, height }
}

// Clover-type fodder: many weak stems from a crown, trifoliate leaves on short petioles,
// flower heads at the stem tips.
export function cloverPlant(random, o) {
  const parts = []
  const mounts = []
  const count = Math.round(random.range(o.stems[0], o.stems[1]))
  for (let index = 0; index < count; index += 1) {
    const azimuth = (index / count) * Math.PI * 2 + random.gauss() * 0.5
    const lean = random.range(o.lean[0], o.lean[1])
    const height = random.range(o.height[0], o.height[1])
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const base = out.clone().multiplyScalar(o.spread * random.range(0.2, 1))
    const top = base.clone().addScaledVector(out, Math.sin(lean) * height).add(V(0, Math.cos(lean) * height, 0))
    const points = [base, base.clone().addScaledVector(out, Math.sin(lean) * height * 0.25).add(V(random.gauss() * 0.01, height * 0.55, random.gauss() * 0.01)), top]
    const curve = new THREE.CatmullRomCurve3(points)
    parts.push(tube(points, o.stem, o.stem * 0.6, { radial: 3, tubular: o.stemSegments || 3, colorFn: heightShade(height, 0.7) }))
    for (let leaf = 0; leaf < o.leaves; leaf += 1) {
      const t = lerp(0.18, 0.96, leaf / Math.max(1, o.leaves - 1))
      const at = curve.getPointAt(t)
      const leafAz = azimuth + leaf * 2.4 + random.gauss() * 0.4
      const leafOut = V(Math.cos(leafAz), 0, Math.sin(leafAz))
      const end = at.clone().addScaledVector(leafOut, o.petiole).add(V(0, o.petiole * 0.7, 0))
      parts.push(tube([at, at.clone().lerp(end, 0.5).add(V(0, o.petiole * 0.15, 0)), end], o.stem * 0.45, o.stem * 0.35, { radial: 3, tubular: 1, color: '#d8d8d8' }))
      const heading = Math.atan2(leafOut.x, leafOut.z)
      const size = lerp(1, 0.75, t) * random.range(0.85, 1.15)
      for (const k of [-1, 0, 1]) {
        const geometry = tinyLeaf({ length: o.leaflet[0] * size, width: o.leaflet[1] * size, shoulders: o.shoulders, rise: random.range(0.15, 0.55) - Math.abs(k) * 0.1, droop: random.range(0.2, 0.6) })
        transform(geometry, { rotation: [0, heading + k * 1.0, 0] })
        geometry.translate(end.x, end.y, end.z)
        parts.push(geometry)
      }
    }
    mounts.push({ at: top, dir: curve.getTangentAt(1), out, kind: 'main' })
  }
  return { plant: merge(parts), mounts: { head: mounts } }
}
