// Low-poly botanical parts for the legume group: leaflets, compound and palmate leaves,
// pea flowers, cup flowers, trumpets, daisies, pods, capsules and cotton bolls.
// Every part is built at the origin pointing along +Z (use `aim` to place it) and is
// prepped (non-indexed, position/normal/uv/color) so it can be merged.
import * as THREE from 'three'
import { ellipsoid, lerp, merge, prep, transform, tube } from '../../geometry.js'

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const toColor = (value) => (typeof value === 'number' ? new THREE.Color(value, value, value) : new THREE.Color(value))
const tmpColor = new THREE.Color()

const profiles = {
  oval: (t) => Math.pow(Math.sin(Math.PI * t), 0.65),
  round: (t) => Math.pow(Math.sin(Math.PI * t), 0.42),
  lance: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9),
  obovate: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 1.4)), 0.7),
  heart: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.5),
  linear: (t) => Math.min(1, t * 7, (1 - t) * 3.5),
}
const peaks = { oval: 0.45, round: 0.5, lance: 0.36, obovate: 0.62, heart: 0.3, linear: 0.5 }

// Points a +Z-built part along `dir` from `origin`, keeping its local +Y as close to world up as possible.
const basisX = V()
const basisY = V()
const basisZ = V()
const basisMatrix = new THREE.Matrix4()
export function aim(geometry, origin, dir, roll = 0) {
  basisZ.copy(dir).normalize()
  const ref = Math.abs(basisZ.y) > 0.97 ? V(1, 0, 0) : V(0, 1, 0)
  basisX.crossVectors(ref, basisZ).normalize()
  basisY.crossVectors(basisZ, basisX)
  if (roll) geometry.rotateZ(roll)
  geometry.applyMatrix4(basisMatrix.makeBasis(basisX, basisY, basisZ).setPosition(origin))
  return geometry
}

// A single leaflet or petal lying flat (normal +Y), base at the origin, running along +Z.
// rows = 0 gives a 2-triangle folded diamond; otherwise 4 triangles per row.
export function leaflet({ length, width, rows = 1, fold = 0.2, rise = 0.15, droop = 0.35, shape = 'oval', base = 0.62, tip = 0.95, rib = null, colorPow = 1, wave = 0 }) {
  const profile = profiles[shape] || profiles.oval
  const ts = rows === 0 ? [0, peaks[shape] ?? 0.45, 1] : Array.from({ length: rows + 2 }, (_, k) => k / (rows + 1))
  const positions = []
  const colors = []
  const indices = []
  const cBase = toColor(base)
  const cTip = toColor(tip)
  const cRib = rib === null ? null : toColor(rib)
  const point = V()
  const rowIndex = []
  let prevT = 0
  const pushVertex = (vertex, t, isRib) => {
    positions.push(vertex.x, vertex.y, vertex.z)
    tmpColor.copy(cBase).lerp(cTip, Math.pow(t, colorPow))
    if (isRib && cRib) tmpColor.lerp(cRib, 0.6)
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
    return positions.length / 3 - 1
  }
  ts.forEach((t, k) => {
    if (k > 0) {
      const mid = (prevT + t) / 2
      const theta = rise - droop * Math.pow(mid, 1.5)
      point.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar((t - prevT) * length))
    }
    prevT = t
    if (k === 0 || k === ts.length - 1) { rowIndex.push([pushVertex(point, t, true)]); return }
    const theta = rise - droop * Math.pow(t, 1.5)
    const normal = V(0, Math.cos(theta), -Math.sin(theta))
    const half = (width / 2) * profile(t)
    const waveOffset = wave ? Math.sin(k * 2.3) * wave * half : 0
    const left = point.clone().add(V(-half, 0, 0)).addScaledVector(normal, -half * fold + waveOffset)
    const right = point.clone().add(V(half, 0, 0)).addScaledVector(normal, -half * fold - waveOffset)
    if (rows === 0) rowIndex.push([pushVertex(left, t, false), pushVertex(right, t, false)])
    else rowIndex.push([pushVertex(left, t, false), pushVertex(point.clone().addScaledVector(normal, half * fold * 0.3), t, true), pushVertex(right, t, false)])
  })
  if (rows === 0) {
    const [b] = rowIndex[0]
    const [l, r] = rowIndex[1]
    const [t] = rowIndex[2]
    indices.push(b, l, t, b, t, r)
  } else {
    const b = rowIndex[0][0]
    const first = rowIndex[1]
    indices.push(b, first[0], first[1], b, first[1], first[2])
    for (let k = 1; k < rowIndex.length - 2; k += 1) {
      const [la, ma, ra] = rowIndex[k]
      const [lb, mb, rb] = rowIndex[k + 1]
      indices.push(la, lb, ma, ma, lb, mb, ma, mb, ra, ra, mb, rb)
    }
    const [l, m, r] = rowIndex[rowIndex.length - 2]
    const t = rowIndex[rowIndex.length - 1][0]
    indices.push(l, t, m, m, t, r)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return prep(geometry)
}

// Arc along +Z that rises at `rise` (radians above horizontal) and bends down by `droop`.
function arc(length, rise, droop, steps = 6) {
  const points = [V()]
  const angles = [rise]
  const point = V()
  for (let k = 1; k <= steps; k += 1) {
    const theta = rise - droop * Math.pow((k - 0.5) / steps, 1.3)
    point.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar(length / steps))
    points.push(point.clone())
    angles.push(rise - droop * Math.pow(k / steps, 1.3))
  }
  const at = (s) => {
    const f = Math.min(steps, Math.max(0, (s / length) * steps))
    const k = Math.min(steps - 1, Math.floor(f))
    return { p: points[k].clone().lerp(points[k + 1], f - k), angle: lerp(angles[k], angles[k + 1], f - k) }
  }
  return { points, at }
}

function ribbon(points, width, shadeValue = 0.8) {
  const positions = []
  for (let k = 0; k < points.length - 1; k += 1) {
    const a = points[k]
    const b = points[k + 1]
    positions.push(a.x - width, a.y, a.z, b.x - width, b.y, b.z, b.x + width, b.y, b.z, a.x - width, a.y, a.z, b.x + width, b.y, b.z, a.x + width, a.y, a.z)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return prep(geometry, '#ffffff', (c) => c.setScalar(shadeValue))
}

// A curling pea tendril continuing from `start` in direction `dir` (in the YZ plane).
function tendril(start, angle, length, radius = 0.0007) {
  const points = [start.clone()]
  const point = start.clone()
  let theta = angle + 0.3
  for (let k = 0; k < 6; k += 1) {
    theta -= 0.9 + k * 0.25
    point.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar(length / 6 * (1 - k * 0.1)))
    points.push(point.clone())
  }
  return tube(points, radius, radius * 0.6, { radial: 2, tubular: 4, color: '#d8d8d8' })
}

// Compound leaf: petiole + rachis with `pairs` of leaflets, optional terminal leaflet,
// tendril and stipules. Trifoliate = pairs 1 + terminal. Groundnut = pairs 2, no terminal.
export function compoundLeaf(random, { petiole = 0.02, rachis = 0.04, pairs = 3, terminal = true, tendrilLength = 0, side = 1.1, rise = 0.5, droop = 0.6, stalk = 'ribbon', stalkRadius = 0.0012, leaflet: lf, taper = 0.15, stipule = null, terminalScale = 1.1 }) {
  const parts = []
  const total = petiole + rachis
  const path = arc(total, rise, droop, 2)
  if (stalk === 'tube') parts.push(tube(path.points, stalkRadius, stalkRadius * 0.6, { radial: 3, tubular: 2, color: '#cfcfcf' }))
  else if (stalk === 'ribbon') parts.push(ribbon(path.points, stalkRadius))
  const place = (s, yaw, scale) => {
    const { p, angle } = path.at(s)
    const geometry = leaflet({ ...lf, length: lf.length * scale * random.range(0.9, 1.08), width: lf.width * scale })
    transform(geometry, { rotation: [-angle * 0.5, yaw + random.gauss() * 0.12, 0] })
    geometry.translate(p.x, p.y, p.z)
    parts.push(geometry)
  }
  for (let k = 0; k < pairs; k += 1) {
    const s = pairs === 1 ? petiole : petiole + rachis * (terminal || tendrilLength ? k / pairs : k / (pairs - 1))
    const scale = 1 - taper * Math.abs(k / Math.max(1, pairs - 1) - 0.45)
    place(s, side, scale)
    place(s, -side, scale)
  }
  if (terminal) place(total, 0, terminalScale)
  if (tendrilLength) {
    const { p, angle } = path.at(total)
    parts.push(tendril(p, angle, tendrilLength))
  }
  if (stipule) {
    for (const sign of [-1, 1]) {
      const geometry = leaflet({ length: stipule, width: stipule * 0.8, rows: 0, shape: 'heart', rise: 0.4, droop: 0.4, base: lf.base ?? 0.62, tip: lf.tip ?? 0.95 })
      transform(geometry, { rotation: [0, sign * 1.2, 0] })
      parts.push(geometry)
    }
  }
  return merge(parts)
}

// Simple leaf on an optional petiole.
export function simpleLeaf(random, { petiole = 0, petioleRadius = 0.0015, petioleTube = true, rise = 0.5, droop = 0.5, ...lf }) {
  if (!petiole) return leaflet({ rise, droop, ...lf })
  const path = arc(petiole, rise + 0.25, 0.3, 2)
  const end = path.points[path.points.length - 1]
  const blade = leaflet({ rise: rise - 0.3, droop, ...lf })
  blade.translate(end.x, end.y, end.z)
  return merge([petioleTube ? tube(path.points, petioleRadius, petioleRadius * 0.7, { radial: 3, tubular: 2, color: '#c8c8c8' }) : ribbon(path.points, petioleRadius), blade])
}

// Palmate leaf: lobes radiating from the end of a petiole. spread = 2π for peltate (castor).
export function palmateLeaf(random, { lobes = 5, length = 0.1, width = 0.035, spread = 2.2, petiole = 0.06, petioleRadius = 0.0018, rise = 0.6, tilt = 0.15, cup = 0.12, lobeDroop = 0.3, rows = 2, shape = 'lance', base = 0.6, tip = 0.95, rib = 1, petioleColor = '#c8c8c8', wave = 0 }) {
  const parts = []
  const path = arc(petiole, rise, rise * 0.9, 2)
  const end = path.points[path.points.length - 1]
  parts.push(tube(path.points, petioleRadius, petioleRadius * 0.7, { radial: 3, tubular: 2, color: petioleColor }))
  const full = spread >= Math.PI * 1.9
  for (let k = 0; k < lobes; k += 1) {
    const a = full ? (k / lobes) * Math.PI * 2 + Math.PI / lobes : (lobes === 1 ? 0 : (k / (lobes - 1) - 0.5) * spread)
    const centrality = full ? 0.85 + 0.15 * Math.cos(a) : Math.cos(a * 0.7)
    const geometry = leaflet({ length: length * lerp(0.62, 1, centrality) * random.range(0.92, 1.06), width: width * lerp(0.75, 1, centrality), rows, fold: 0.18, rise: cup, droop: lobeDroop, shape, base, tip, rib, wave })
    transform(geometry, { rotation: [-tilt, a + random.gauss() * 0.05, 0], order: 'XYZ' })
    geometry.translate(end.x, end.y, end.z + (full ? 0 : -length * 0.04))
    parts.push(geometry)
  }
  return merge(parts)
}

// Pea-type flower: banner standing up and back, two wings/keel forward along +Z.
export function peaFlower({ size = 0.014, banner = 1, keel = 0.82, streak = null }) {
  const standard = leaflet({ length: size, width: size * 1.05, rows: 1, fold: -0.35, rise: 0, droop: 0.25, shape: 'round', base: 0.82, tip: banner, rib: streak, colorPow: 0.7 })
  transform(standard, { rotation: [-(Math.PI / 2 + 0.25), 0, 0] })
  const parts = [standard]
  for (const sign of [-1, 1]) {
    const wing = leaflet({ length: size * 0.85, width: size * 0.5, rows: 0, fold: 0.3, rise: 0.15, droop: 0.2, shape: 'oval', base: 0.8, tip: keel })
    transform(wing, { rotation: [0, sign * 0.22, sign * 0.5] })
    wing.translate(0, size * 0.05, 0)
    parts.push(wing)
  }
  return merge(parts)
}

// Open cup / saucer flower facing +Z: cotton, hibiscus (mesta), linseed.
export function cupFlower({ petals = 5, length = 0.04, width = 0.035, open = 0.7, rows = 1, centre = 0.5, petal = 1, colorPow = 0.6, droop = 0.25, shape = 'obovate', roll = 0.3, column = 0 }) {
  const parts = []
  for (let k = 0; k < petals; k += 1) {
    const a = (k / petals) * Math.PI * 2
    const geometry = leaflet({ length, width, rows, fold: -0.25, rise: 0, droop, shape, base: centre, tip: petal, colorPow })
    geometry.rotateZ(roll)
    transform(geometry, { rotation: [-open, 0, a], order: 'ZYX' })
    parts.push(geometry)
  }
  if (column) {
    const stamen = prep(new THREE.CylinderGeometry(column * 0.12, column * 0.16, column, 4, 1, true), '#ffffff', (c) => c.setScalar(0.95))
    stamen.rotateX(Math.PI / 2)
    stamen.translate(0, 0, column / 2)
    parts.push(stamen)
  }
  return merge(parts)
}

// Tubular flower facing +Z: narrow base flaring to five short lobes (sesame, tobacco).
export function trumpet({ length = 0.03, mouth = 0.008, lobes = 5, lobeLength = 0.008, flare = 1.25, radial = 5, base = 0.85, tip = 1 }) {
  const parts = []
  const cone = prep(new THREE.CylinderGeometry(mouth, mouth * 0.28, length, radial, 1, true), '#ffffff', (c, x, y) => c.setScalar(lerp(base, tip, (y + length / 2) / length)))
  cone.rotateX(Math.PI / 2)
  cone.translate(0, 0, length / 2)
  parts.push(cone)
  for (let k = 0; k < lobes; k += 1) {
    const a = (k / lobes) * Math.PI * 2
    const lobe = leaflet({ length: lobeLength, width: lobeLength * 1.1, rows: 0, fold: 0, rise: 0, droop: 0.3, shape: 'round', base: tip, tip })
    transform(lobe, { rotation: [-flare, 0, a], order: 'ZYX' })
    lobe.translate(-Math.sin(a) * mouth, Math.cos(a) * mouth, length)
    parts.push(lobe)
  }
  return merge(parts)
}

// Composite head facing +Z: { disc, rays, back } so each can take its own colour.
export function daisy(random, { rays = 12, rayLength = 0.012, rayWidth = 0.004, disc = 0.005, depth = 0.004, rayRows = 0, segments = 8, rise = 0.05, droop = -0.2, bracts = 0, bractLength = 0, backSegments = 8, rings = 1 }) {
  const face = prep(new THREE.CircleGeometry(disc, segments), '#ffffff', (c, x, y) => c.setScalar(lerp(0.62, 1, Math.min(1, Math.hypot(x, y) / disc))))
  const position = face.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const radial = Math.hypot(position.getX(index), position.getY(index)) / disc
    position.setZ(index, depth * 0.25 * (1 - radial * radial))
  }
  face.computeVertexNormals()
  const rayList = []
  // rings > 1 adds staggered rows of rays behind the first, each a little shorter and flatter
  for (let ring = 0; ring < rings; ring += 1) {
    for (let k = 0; k < rays; k += 1) {
      const a = ((k + ring * 0.5) / rays) * Math.PI * 2 + random.gauss() * 0.04
      const ray = leaflet({ length: rayLength * (1 - ring * 0.1) * random.range(0.88, 1.08), width: rayWidth, rows: rayRows, fold: 0.15, rise: rise + ring * 0.12, droop, shape: 'oval', base: 0.85, tip: 1 })
      transform(ray, { rotation: [-Math.PI / 2, 0, a], order: 'ZYX' })
      ray.translate(-Math.sin(a) * disc * (0.92 - ring * 0.04), Math.cos(a) * disc * (0.92 - ring * 0.04), -ring * depth * 0.08)
      rayList.push(ray)
    }
  }
  const backList = []
  const back = prep(new THREE.ConeGeometry(disc * 1.04, depth, backSegments, 1, true), '#ffffff', (c, x, y) => c.setScalar(lerp(0.7, 0.95, y / depth + 0.5)))
  back.rotateX(-Math.PI / 2)
  back.translate(0, 0, -depth / 2)
  backList.push(back)
  for (let k = 0; k < bracts; k += 1) {
    const a = (k / bracts) * Math.PI * 2
    const bract = leaflet({ length: bractLength, width: bractLength * 0.45, rows: 0, fold: 0.2, rise: 0.6, droop: 0.2, shape: 'lance', base: 0.75, tip: 0.95 })
    transform(bract, { rotation: [-Math.PI / 2, 0, a], order: 'ZYX' })
    bract.translate(-Math.sin(a) * disc * 0.95, Math.cos(a) * disc * 0.95, -depth * 0.3)
    backList.push(bract)
  }
  return { disc: face, rays: merge(rayList), back: merge(backList) }
}

// Pod along +Z: flat (thick < width) or round, optional seed bumps, beak and curve (towards local +Y).
export function pod({ length, width, thick = width, curve = 0, rows = 4, radial = 4, beak = 0.12, puffy = false, seeds = 0, bump = 0.1, base = 0.8, tip = 1, streak = null }) {
  const positions = []
  const colors = []
  const indices = []
  const streakColor = streak ? toColor(streak) : null
  const centre = (t) => V(0, curve * length * t * t, t * length)
  const push = (p, t, s) => {
    positions.push(p.x, p.y, p.z)
    tmpColor.setScalar(lerp(base, tip, t))
    if (streakColor && s) tmpColor.multiply(streakColor)
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
  }
  push(centre(0), 0, false)
  for (let i = 1; i < rows; i += 1) {
    const t = i / rows
    let r = puffy ? Math.pow(Math.sin(Math.PI * t), 0.45) : Math.min(1, t * 5, (1 - t) / Math.max(beak, 0.05))
    if (seeds) r *= 1 - bump + bump * Math.abs(Math.sin(Math.PI * seeds * t))
    const c = centre(t)
    for (let j = 0; j < radial; j += 1) {
      const a = (j / radial) * Math.PI * 2
      push(V(c.x + Math.cos(a) * r * width / 2, c.y + Math.sin(a) * r * thick / 2, c.z), t, j % 2 === 1 && Math.sin(t * 23) > 0.2)
    }
  }
  push(centre(1).add(V(0, curve * length * 0.15 + (puffy ? thick * 0.15 : 0), 0)), 1, false)
  const tipIndex = positions.length / 3 - 1
  const ring = (i, j) => 1 + (i - 1) * radial + (j % radial)
  for (let j = 0; j < radial; j += 1) indices.push(0, ring(1, j + 1), ring(1, j))
  for (let i = 1; i < rows - 1; i += 1) {
    for (let j = 0; j < radial; j += 1) indices.push(ring(i, j), ring(i, j + 1), ring(i + 1, j), ring(i, j + 1), ring(i + 1, j + 1), ring(i + 1, j))
  }
  for (let j = 0; j < radial; j += 1) indices.push(ring(rows - 1, j), ring(rows - 1, j + 1), tipIndex)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return prep(geometry)
}

// Four-sided sesame capsule along +Z.
export function squareCapsule(length = 0.028, radius = 0.0045) {
  const body = prep(new THREE.CylinderGeometry(radius * 0.9, radius, length, 4, 1, true), '#ffffff', (c, x, y) => c.setScalar(lerp(0.8, 1, y / length + 0.5)))
  body.translate(0, length / 2, 0)
  const cap = prep(new THREE.ConeGeometry(radius * 0.9, length * 0.22, 4, 1, true), '#ffffff', (c) => c.setScalar(0.95))
  cap.translate(0, length * 1.11, 0)
  const geometry = merge([body, cap])
  geometry.rotateX(Math.PI / 2)
  return geometry
}

// Displaces a geometry radially with a smooth position-based noise (shared vertices move together).
export function lumpy(geometry, amount, seed = 1) {
  const position = geometry.attributes.position
  const v = V()
  for (let index = 0; index < position.count; index += 1) {
    v.fromBufferAttribute(position, index)
    const n = Math.sin(v.x * 311 + seed) * Math.sin(v.y * 277 + seed * 2.1) * Math.sin(v.z * 293 + seed * 0.7)
    v.multiplyScalar(1 + n * amount)
    position.setXYZ(index, v.x, v.y, v.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

// Castor capsule: a small sphere with soft spines.
export function spinyCapsule(random, radius = 0.011, spines = 6) {
  const parts = [ellipsoid(radius, radius * 1.05, radius, { widthSegments: 5, heightSegments: 4, colorFn: (c, x, y) => c.setScalar(lerp(0.8, 1, y / radius * 0.5 + 0.5)) })]
  for (let k = 0; k < spines; k += 1) {
    const dir = V(random.gauss(), random.gauss() + 0.2, random.gauss()).normalize()
    const spine = prep(new THREE.ConeGeometry(radius * 0.16, radius * 0.75, 3, 1, true), '#ffffff', (c) => c.setRGB(1.1, 0.62, 0.55))
    spine.translate(0, radius * 0.95 + radius * 0.3, 0)
    spine.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir))
    parts.push(spine)
  }
  return merge(parts)
}

// Open cotton boll along +Z: four fluffy white locks of lint (kapas).
export function lint(random, size = 0.022) {
  const parts = []
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2 + random.gauss() * 0.2
    const lock = ellipsoid(size * 0.62, size * 0.55, size * 0.78, { widthSegments: 5, heightSegments: 3 })
    lumpy(lock, 0.16, k * 3.1 + random() * 10)
    lock.translate(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, size * 0.6 - k * 0.002)
    parts.push(lock)
  }
  const geometry = merge(parts)
  return prep(geometry, '#ffffff', (c, x, y, z) => c.setScalar(lerp(0.8, 1, Math.min(1, z / (size * 1.2)))))
}

// Dry bur (carpels) curled back behind the lint.
export function bur(random, size = 0.022) {
  const parts = []
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const carpel = leaflet({ length: size * 1.25, width: size * 0.9, rows: 0, fold: -0.3, rise: 0, droop: -0.8, shape: 'lance', base: 0.7, tip: 1 })
    transform(carpel, { rotation: [-1.25, 0, a], order: 'ZYX' })
    parts.push(carpel)
  }
  return merge(parts)
}
