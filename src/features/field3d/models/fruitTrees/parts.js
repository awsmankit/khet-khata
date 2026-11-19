// Geometry pieces for the tree group: leaf clusters, blossoms, fruit, pods, bunches and shaped stems.
// Leaves and fruit carry grey light/dark detail in vertex colours; hue comes from instance colours.
import * as THREE from 'three'
import { blade, lerp, merge, prep, smooth, transform, tube } from '../../engine/geometry.js'
import { V } from '../../engine/plantKit.js'

const tmpA = new THREE.Color()
const tmpB = new THREE.Color()
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
export const hash = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}

// Builds a BufferGeometry from flat triangle lists and normalises it for merging.
function finish(positions, colors) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return prep(geometry)
}

function pushTri(out, a, b, c, ga, gb, gc) {
  out.positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  for (const g of [ga, gb, gc]) {
    if (typeof g === 'number') out.colors.push(g, g, g)
    else out.colors.push(g.r, g.g, g.b)
  }
}

// One-sided area of a non-indexed geometry, used to turn a coverage target into a cluster count.
export function leafArea(geometry) {
  const position = geometry.attributes.position
  const a = V()
  const b = V()
  const c = V()
  let sum = 0
  for (let index = 0; index + 2 < position.count; index += 3) {
    a.fromBufferAttribute(position, index)
    b.fromBufferAttribute(position, index + 1).sub(a)
    c.fromBufferAttribute(position, index + 2).sub(a)
    sum += b.cross(c).length() / 2
  }
  return sum
}

/* ------------------------------------------------------------ leaves */

// A rosette of leaves at a shoot tip (mango, sapota, jamun, citrus).
export function whorl(random, { leaves = 7, length = 0.28, width = 0.07, shape = 'lance', rise = [0.15, 0.65], droop = [0.6, 1], segments = 4, fold = 0.3, base = '#9a9a9a', tip = '#c9c9c9', rib = '#ffffff', stack = 0 } = {}) {
  const parts = []
  for (let index = 0; index < leaves; index += 1) {
    const geometry = blade({ length: length * random.range(0.82, 1.12), width: width * random.range(0.9, 1.1), rise: random.range(rise[0], rise[1]), droop: random.range(droop[0], droop[1]), segments, fold, shape, base, tip, rib })
    transform(geometry, { position: [0, stack * (index / leaves), 0], rotation: [0, (index / leaves) * Math.PI * 2 + random.gauss() * 0.25, 0] })
    parts.push(geometry)
  }
  return merge(parts)
}

// A short twig along +Y with leaves at its nodes (guava, apple, pomegranate, ber).
export function twigCluster(random, { length = 0.3, nodes = 5, opposite = false, leaf = {}, twigColor = '#8a7a66', twigRadius = 0.004, terminal = 2, zigzag = 0 } = {}) {
  const parts = []
  const lean = V(random.gauss() * 0.06, 0, random.gauss() * 0.06)
  const top = V(0, length, 0).add(lean)
  parts.push(tube([V(), V(0, length * 0.5, 0).addScaledVector(lean, 0.4), top], twigRadius, twigRadius * 0.5, { radial: 3, tubular: 2, color: twigColor }))
  const options = { length: 0.1, width: 0.04, shape: 'oval', rise: [0.2, 0.6], droop: [0.4, 0.9], segments: 3, fold: 0.3, base: '#9a9a9a', tip: '#cacaca', rib: '#ffffff', ...leaf }
  const makeLeaf = (size, rise) => blade({ ...options, length: options.length * size * random.range(0.88, 1.1), width: options.width * size, rise: rise ?? random.range(options.rise[0], options.rise[1]), droop: random.range(options.droop[0], options.droop[1]) })
  for (let node = 0; node < nodes; node += 1) {
    const t = 0.15 + 0.8 * (node / Math.max(1, nodes - 1))
    const at = top.clone().multiplyScalar(t)
    if (zigzag) at.x += (node % 2 ? 1 : -1) * zigzag
    const size = 1 - 0.25 * t
    const azimuth = opposite ? (node % 2) * Math.PI * 0.5 : node * 2.4
    for (const turn of opposite ? [0, Math.PI] : [0]) {
      const geometry = makeLeaf(size)
      transform(geometry, { rotation: [0, azimuth + turn + random.gauss() * 0.2, 0] })
      geometry.translate(at.x, at.y, at.z)
      parts.push(geometry)
    }
  }
  for (let index = 0; index < terminal; index += 1) {
    const geometry = makeLeaf(0.75, random.range(0.9, 1.25))
    transform(geometry, { rotation: [0, index * 2.6 + random() * 6.28, 0] })
    geometry.translate(top.x, top.y, top.z)
    parts.push(geometry)
  }
  return merge(parts)
}

// Compound leaves: a rachis with leaflet pairs (litchi, walnut, bael).
export function pinnate(random, { fronds = 2, rachis = 0.3, pairs = 3, leafletLength = 0.17, leafletWidth = 0.058, terminal = false, segments = 3, rachisColor = '#8a8a7a', lift = 0.05, angle = 1.1 } = {}) {
  const parts = []
  for (let frond = 0; frond < fronds; frond += 1) {
    const azimuth = (frond / fronds) * Math.PI * 2 + random.gauss() * 0.4
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const end = out.clone().multiplyScalar(rachis).add(V(0, lift, 0))
    parts.push(tube([V(), out.clone().multiplyScalar(rachis * 0.4).add(V(0, lift * 0.8, 0)), end], 0.003, 0.002, { radial: 3, tubular: 2, color: rachisColor }))
    const leaflet = (rotation, at, scale) => {
      const geometry = blade({ length: leafletLength * scale, width: leafletWidth * scale, rise: random.range(0.15, 0.4), droop: random.range(0.4, 0.7), segments, fold: 0.3, shape: 'lance', base: '#9a9a9a', tip: '#c8c8c8', rib: '#ffffff' })
      transform(geometry, { rotation: [0, rotation, 0] })
      geometry.translate(at.x, at.y, at.z)
      parts.push(geometry)
    }
    for (let pair = 0; pair < pairs; pair += 1) {
      const at = V().lerp(end, 0.3 + (pair / Math.max(1, pairs)) * 0.65)
      const scale = 0.8 + 0.25 * (pair / Math.max(1, pairs))
      for (const side of [-1, 1]) leaflet(-azimuth + Math.PI / 2 + side * angle, at, scale)
    }
    if (terminal) leaflet(-azimuth + Math.PI / 2, end, 1.05)
  }
  return merge(parts)
}

// One feathery frond (pinnate, optionally bipinnate) built from flat leaflet quads, written into `out`.
function frond(random, options, out, matrix) {
  const { length = 0.25, pairs = 12, leafletLength = 0.04, leafletWidth = 0.014, rise = 0.5, droop = 0.9, forward = 0.45, rachisWidth = 0.004, terminal = true, sub = null, taper = 0.4, grey = [0.72, 0.95], segments = 6 } = options
  const points = []
  const tangents = []
  const normals = []
  const cursor = V()
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const theta = rise - droop * Math.pow(t, 1.5)
    const tangent = V(0, Math.sin(theta), Math.cos(theta))
    points.push(cursor.clone())
    tangents.push(tangent)
    normals.push(V(0, Math.cos(theta), -Math.sin(theta)))
    cursor.addScaledVector(tangent, length / segments)
  }
  const at = (t) => {
    const f = clamp(t, 0, 1) * segments
    const index = Math.min(segments - 1, Math.floor(f))
    const u = f - index
    return { p: points[index].clone().lerp(points[index + 1], u), t: tangents[index].clone().lerp(tangents[index + 1], u).normalize(), n: normals[index].clone().lerp(normals[index + 1], u).normalize() }
  }
  const side = V(1, 0, 0)
  const world = (v) => v.applyMatrix4(matrix)
  // rachis ribbon
  for (let index = 0; index < segments; index += 1) {
    const w0 = rachisWidth * (1 - (index / segments) * 0.6) * 0.5
    const w1 = rachisWidth * (1 - ((index + 1) / segments) * 0.6) * 0.5
    const a = world(points[index].clone().addScaledVector(side, -w0))
    const b = world(points[index].clone().addScaledVector(side, w0))
    const c = world(points[index + 1].clone().addScaledVector(side, w1))
    const d = world(points[index + 1].clone().addScaledVector(side, -w1))
    pushTri(out, a, b, c, 0.55, 0.55, 0.6)
    pushTri(out, a, c, d, 0.55, 0.6, 0.6)
  }
  const leaflet = (P, d, N, L, W) => {
    const wdir = N.clone().cross(d).normalize()
    const g = random.range(grey[0], grey[1])
    const v0 = world(P.clone().addScaledVector(d, L * 0.04))
    const v1 = world(P.clone().addScaledVector(d, L * 0.42).addScaledVector(wdir, W / 2).addScaledVector(N, W * 0.12))
    const v2 = world(P.clone().addScaledVector(d, L))
    const v3 = world(P.clone().addScaledVector(d, L * 0.42).addScaledVector(wdir, -W / 2).addScaledVector(N, W * 0.12))
    pushTri(out, v0, v1, v2, g * 0.82, g, g * 1.04)
    pushTri(out, v0, v2, v3, g * 0.82, g * 1.04, g)
  }
  for (let pair = 0; pair < pairs; pair += 1) {
    const t = 0.08 + 0.88 * ((pair + 0.5) / pairs)
    const { p: P, t: T, n: N } = at(t)
    const L = leafletLength * (1 - taper * t * t) * random.range(0.9, 1.1)
    for (const s of [-1, 1]) {
      const d = side.clone().multiplyScalar(s).addScaledVector(T, forward).addScaledVector(N, -0.15).normalize()
      if (sub) {
        const y = N.clone().addScaledVector(d, -N.dot(d)).normalize()
        const x = y.clone().cross(d).normalize()
        const local = new THREE.Matrix4().makeBasis(x, y, d).setPosition(P)
        frond(random, { ...sub, length: sub.length * (1 - taper * t * t), rise: 0.05, droop: sub.droop ?? 0.4 }, out, matrix.clone().multiply(local))
      } else {
        leaflet(P, d, N, L, leafletWidth * (L / leafletLength))
      }
    }
  }
  if (terminal) {
    const { p: P, t: T, n: N } = at(1)
    if (sub) {
      const local = new THREE.Matrix4().makeBasis(V(1, 0, 0), N, T).setPosition(P)
      frond(random, { ...sub, length: sub.length * (1 - taper), rise: 0.05, droop: sub.droop ?? 0.4 }, out, matrix.clone().multiply(local))
    } else {
      leaflet(P, T, N, leafletLength * (1 - taper) * 1.1, leafletWidth)
    }
  }
}

// Feathery foliage: several fronds from one point (tamarind, aonla, drumstick).
export function featherCluster(random, { fronds = 3, rise = [0.3, 0.8], droop = [0.6, 1.1], ...options } = {}) {
  const out = { positions: [], colors: [] }
  for (let index = 0; index < fronds; index += 1) {
    const matrix = new THREE.Matrix4().makeRotationY((index / fronds) * Math.PI * 2 + random.gauss() * 0.35)
    frond(random, { ...options, rise: random.range(rise[0], rise[1]), droop: random.range(droop[0], droop[1]), length: (options.length ?? 0.25) * random.range(0.85, 1.12) }, out, matrix)
  }
  return finish(out.positions, out.colors)
}

// A palmately lobed leaf on a petiole, lying roughly flat (fig, grape, papaya, passion fruit, kiwi).
function lobedLeaf(random, { size = 0.2, lobes = 5, spread = 1.2, petiole = 0.08, lobeWidth = 0.45, shape = 'oval', rise = 0.25, droop = 0.6, segments = 3, fold = 0.15, base = '#9a9a9a', tip = '#c8c8c8', rib = '#ffffff', petioleColor = '#8a8a7a', petioleRadius = 0.003, petioleRise = 0.6 } = {}) {
  const parts = []
  const dir = V(0, Math.sin(petioleRise), Math.cos(petioleRise))
  const end = dir.clone().multiplyScalar(petiole)
  if (petiole > 0.01) parts.push(tube([V(), dir.clone().multiplyScalar(petiole * 0.5).add(V(0, petiole * 0.08, 0)), end], petioleRadius, petioleRadius * 0.7, { radial: 3, tubular: 2, color: petioleColor }))
  for (let lobe = 0; lobe < lobes; lobe += 1) {
    const rel = lobes === 1 ? 0 : (lobe / (lobes - 1)) * 2 - 1
    const length = size * (1 - 0.38 * Math.pow(Math.abs(rel), 1.4)) * random.range(0.92, 1.06)
    const geometry = blade({ length, width: size * lobeWidth, rise: rise - Math.abs(rel) * 0.12, droop: droop * random.range(0.85, 1.15), segments, fold, shape, base, tip, rib })
    transform(geometry, { rotation: [0, rel * spread, 0] })
    geometry.translate(end.x, end.y, end.z)
    parts.push(geometry)
  }
  return merge(parts)
}

export function lobedCluster(random, { leaves = 3, leaf = {}, stem = 0.12, stemColor = '#8a8a6a' } = {}) {
  const parts = [tube([V(), V(0.01, stem * 0.5, 0), V(0, stem, 0)], 0.004, 0.003, { radial: 3, tubular: 2, color: stemColor })]
  for (let index = 0; index < leaves; index += 1) {
    const geometry = lobedLeaf(random, { ...leaf, size: (leaf.size ?? 0.2) * random.range(0.85, 1.1), petioleRise: random.range(0.3, 0.9) })
    transform(geometry, { rotation: [random.gauss() * 0.15, index * 2.4 + random.gauss() * 0.3, 0] })
    geometry.translate(0, stem * (0.3 + 0.7 * (index / Math.max(1, leaves - 1))), 0)
    parts.push(geometry)
  }
  return merge(parts)
}

/* ------------------------------------------------------------ flowers */

// An open flower facing +Y: flat petal fans with a raised stamen tuft.
export function blossom(random, { petals = 5, radius = 0.018, cup = 0.5, petalWidth = 0.9, centre = '#e8c860', petal = '#ffffff', centreSize = 0.3, out = null } = {}) {
  const target = out || { positions: [], colors: [] }
  const petalColor = new THREE.Color(petal)
  const baseColor = petalColor.clone().multiplyScalar(0.82)
  const centreColor = new THREE.Color(centre)
  for (let index = 0; index < petals; index += 1) {
    const azimuth = (index / petals) * Math.PI * 2 + random.gauss() * 0.12
    const half = (Math.PI / petals) * petalWidth
    const r = radius * random.range(0.9, 1.08)
    const left = V(Math.cos(azimuth - half) * r * 0.62, r * cup * 0.45, Math.sin(azimuth - half) * r * 0.62)
    const right = V(Math.cos(azimuth + half) * r * 0.62, r * cup * 0.45, Math.sin(azimuth + half) * r * 0.62)
    const tip = V(Math.cos(azimuth) * r, r * cup, Math.sin(azimuth) * r)
    pushTri(target, V(), left, tip, baseColor, petalColor, petalColor)
    pushTri(target, V(), tip, right, baseColor, petalColor, petalColor)
  }
  const s = radius * centreSize
  const apex = V(0, s * 1.2, 0)
  for (let index = 0; index < 3; index += 1) {
    const a = (index / 3) * Math.PI * 2
    const b = ((index + 1) / 3) * Math.PI * 2
    pushTri(target, V(Math.cos(a) * s, 0, Math.sin(a) * s), apex, V(Math.cos(b) * s, 0, Math.sin(b) * s), centreColor, centreColor, centreColor)
  }
  return out ? null : finish(target.positions, target.colors)
}

// A spur of several blossoms around a point, tilted outwards (apple, peach, almond, citrus).
export function blossomSpur(random, { flowers = 4, spread = 0.045, lift = 0.03, ...options } = {}) {
  const parts = []
  for (let index = 0; index < flowers; index += 1) {
    const flower = blossom(random, options)
    const azimuth = (index / flowers) * Math.PI * 2 + random.gauss() * 0.4
    const r = index === 0 ? 0 : spread * random.range(0.5, 1)
    transform(flower, { position: [Math.cos(azimuth) * r, lift * random.range(0.2, 1), Math.sin(azimuth) * r], rotation: [random.gauss() * 0.45 + (index ? Math.sin(azimuth) * 0.5 : 0), 0, random.gauss() * 0.45 - (index ? Math.cos(azimuth) * 0.5 : 0)] })
    parts.push(flower)
  }
  return merge(parts)
}

// Small florets on a branching axis (mango-style panicle, drumstick, jamun, cashew), cheap octahedra.
export function floretCluster(random, { florets = 20, height = 0.2, radius = 0.07, size = 0.01, axis = '#9a9a7a', color = '#ffffff', droop = 0 } = {}) {
  const tipPoint = V(random.gauss() * 0.02 + droop, height, 0)
  const parts = [tube([V(), V(droop * 0.3, height * 0.5, 0), tipPoint], 0.003, 0.0013, { radial: 3, tubular: 2, color: axis })]
  for (let index = 0; index < florets; index += 1) {
    const t = Math.sqrt(random())
    const y = (1 - t) * height * 0.95 + 0.015
    const r = radius * t * random.range(0.4, 1)
    const a = random() * Math.PI * 2
    const geometry = prep(new THREE.OctahedronGeometry(size * random.range(0.8, 1.2), 0), color)
    const shadeValue = random.range(0.85, 1.05)
    const colors = geometry.attributes.color
    for (let i = 0; i < colors.count; i += 1) colors.setXYZ(i, colors.getX(i) * shadeValue, colors.getY(i) * shadeValue, colors.getZ(i) * shadeValue)
    geometry.translate(Math.cos(a) * r + droop * (1 - t), y, Math.sin(a) * r)
    parts.push(geometry)
  }
  return merge(parts)
}

// Pomegranate flower: fleshy flared calyx tube with crumpled petals.
export function pomegranateFlower(random, { size = 1 } = {}) {
  const calyx = new THREE.CylinderGeometry(0.013 * size, 0.006 * size, 0.032 * size, 6, 1, true)
  const position = calyx.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    if (position.getY(index) > 0 && index % 2 === 0) position.setY(index, position.getY(index) + 0.006 * size)
  }
  calyx.translate(0, 0.016 * size, 0)
  const parts = [prep(calyx, '#c8c8c8')]
  const petals = blossom(random, { petals: 6, radius: 0.024 * size, cup: 0.9, petalWidth: 1.1, centre: '#f0d070', centreSize: 0.25 })
  petals.translate(0, 0.03 * size, 0)
  parts.push(petals)
  return merge(parts)
}

// Large bell-shaped flower opening upward (dragon fruit, passion flower base).
export function bellFlower(random, { length = 0.2, radius = 0.09, petals = 12, tubeColor = '#c8d0a0', petal = '#ffffff', centre = '#f0e6a0' } = {}) {
  const profile = []
  for (let index = 0; index <= 5; index += 1) {
    const t = index / 5
    profile.push(new THREE.Vector2(lerp(0.012, radius * 0.45, Math.pow(t, 1.8)), t * length * 0.7))
  }
  const cup = prep(new THREE.LatheGeometry(profile, 7), tubeColor)
  const top = blossom(random, { petals, radius, cup: 0.55, petalWidth: 1.25, petal, centre, centreSize: 0.25 })
  top.translate(0, length * 0.62, 0)
  return merge([cup, top])
}

// Passion flower: flat white petals, a purple-banded filament corona.
export function passionFlower(random, { radius = 0.045 } = {}) {
  const out = { positions: [], colors: [] }
  blossom(random, { petals: 10, radius, cup: 0.15, petalWidth: 0.95, petal: '#f4f0f4', centre: '#e8e0b0', centreSize: 0.18, out })
  const purple = new THREE.Color('#5a2a7a')
  const white = new THREE.Color('#f0e8f4')
  for (let index = 0; index < 24; index += 1) {
    const a = (index / 24) * Math.PI * 2
    const inner = V(Math.cos(a) * radius * 0.12, radius * 0.08, Math.sin(a) * radius * 0.12)
    const outer = V(Math.cos(a) * radius * 0.85, radius * 0.18, Math.sin(a) * radius * 0.85)
    const side = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(radius * 0.04)
    pushTri(out, inner, outer.clone().add(side), outer, purple, white, white)
  }
  return finish(out.positions, out.colors)
}

/* ------------------------------------------------------------ fruit */

const PROFILES = {
  round: (t) => Math.pow(Math.sin(Math.PI * t), 0.55),
  apple: (t) => Math.pow(Math.sin(Math.PI * t), 0.5) * (1 - 0.1 * t),
  oval: (t) => Math.pow(Math.sin(Math.PI * t), 0.62),
  lemon: (t) => Math.pow(Math.sin(Math.PI * t), 0.85),
  pear: (t) => Math.pow(Math.sin(Math.PI * t), 0.6) * lerp(0.52, 1, smooth(0.08, 0.72, t)),
  avocado: (t) => Math.pow(Math.sin(Math.PI * t), 0.6) * lerp(0.42, 1, smooth(0.02, 0.8, t)),
  teardrop: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 1.35)), 0.6),
  heart: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.62),
  bell: (t) => lerp(0.62, 1, t) * Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.04 + t * 0.94)), 0.38),
}

// A fruit of revolution hanging below its stalk from the origin (or standing up with `upright`).
export function latheFruit(random, { length = 0.08, radius = 0.04, profile = 'round', radial = 8, rings = 7, stalk = 0.03, stalkRadius = 0.0025, stalkColor = '#6a6a4a', lean = 0, flatten = 1, bumps = 0, bumpFreq = 6, blush = null, blushAmount = 0.6, speckle = 0.08, stripes = 0, stripeCount = 11, shadeFn = null, crown = 0, upright = false, offsetX = 0 } = {}) {
  const fn = typeof profile === 'function' ? profile : PROFILES[profile] || PROFILES.round
  const points = []
  for (let index = 0; index <= rings; index += 1) {
    const t = index / rings
    points.push(new THREE.Vector2(Math.max(radius * fn(t), 0.0006), -t * length))
  }
  const body = new THREE.LatheGeometry(points, radial)
  const position = body.attributes.position
  const colors = new Float32Array(position.count * 3)
  const blushColor = blush ? new THREE.Color(blush) : null
  const v = V()
  for (let index = 0; index < position.count; index += 1) {
    v.fromBufferAttribute(position, index)
    const t = clamp(-v.y / length, 0, 1)
    const angle = Math.atan2(v.z, v.x)
    let k = 1
    if (bumps) k += bumps * Math.abs(Math.sin(angle * bumpFreq) * Math.sin(t * Math.PI * bumpFreq * 0.8))
    v.x *= k
    v.z *= k * flatten
    v.x += lean * t * t * length
    position.setXYZ(index, v.x, v.y, v.z)
    tmpA.setScalar(1 - speckle * hash(v.x * 300, v.y * 300, v.z * 300))
    if (stripes) tmpA.multiplyScalar(1 - stripes * Math.pow(Math.abs(Math.sin(angle * stripeCount * 0.5 + t * 2)), 3))
    if (blushColor) tmpA.lerp(tmpB.copy(blushColor), blushAmount * clamp(0.5 - v.x / radius * 0.7, 0, 1) * Math.sin(Math.PI * t))
    if (shadeFn) shadeFn(tmpA, t, angle, v)
    colors[index * 3] = tmpA.r
    colors[index * 3 + 1] = tmpA.g
    colors[index * 3 + 2] = tmpA.b
  }
  body.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  body.computeVertexNormals()
  const parts = [prep(body)]
  if (crown) {
    const crownGeometry = new THREE.CylinderGeometry(radius * 0.22 * crown, radius * 0.38 * crown, radius * 0.4 * crown, 6, 1, true)
    const crownPosition = crownGeometry.attributes.position
    for (let index = 0; index < crownPosition.count; index += 1) {
      const y = crownPosition.getY(index)
      if (y < 0 && index % 2 === 0) crownPosition.setY(index, y - radius * 0.14 * crown)
    }
    crownGeometry.translate(0, -length - radius * 0.12 * crown, 0)
    parts.push(prep(crownGeometry, '#b8b8b0'))
  }
  const merged = merge(parts)
  merged.translate(offsetX, -stalk, 0)
  const result = [merged]
  if (stalk > 0.004) {
    const stalkGeometry = offsetX
      ? tube([V(0, 0.01, 0), V(offsetX * 0.6, 0.004, 0), V(offsetX, -stalk - 0.004, 0)], stalkRadius * 1.3, stalkRadius, { radial: 4, tubular: 3, color: stalkColor })
      : prep(new THREE.CylinderGeometry(stalkRadius * 0.8, stalkRadius, stalk + 0.004, 4, 1, true), stalkColor).translate(0, -stalk / 2, 0)
    result.push(stalkGeometry)
  }
  const geometry = merge(result)
  if (upright) geometry.rotateX(Math.PI)
  return geometry
}

// Several fruit hanging from one hub on short pedicels (jamun, orange spurs, ber, aonla, kokum).
export function fruitCluster(random, { count = 3, spread = 0.04, drop = 0.03, hub = 0.03, pedicel = 0.02, fruit = {}, stemColor = '#5a5a3a' } = {}) {
  const parts = []
  const hubPoint = V(0, -hub, 0)
  if (hub > 0.004) parts.push(tube([V(), V(0.004, -hub * 0.5, 0), hubPoint], 0.003, 0.0025, { radial: 3, tubular: 2, color: stemColor }))
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * Math.PI * 2 + random.gauss() * 0.4
    const r = count === 1 ? 0 : spread * random.range(0.6, 1)
    const at = hubPoint.clone().add(V(Math.cos(a) * r, -random.range(0, drop), Math.sin(a) * r))
    if (pedicel > 0.004) parts.push(tube([hubPoint, hubPoint.clone().lerp(at, 0.5).add(V(0, 0.004, 0)), at], 0.0018, 0.0015, { radial: 3, tubular: 2, color: stemColor }))
    const geometry = latheFruit(random, { stalk: 0, ...fruit, length: (fruit.length ?? 0.04) * random.range(0.88, 1.1) })
    transform(geometry, { rotation: [random.gauss() * 0.25, random() * 6.28, random.gauss() * 0.25] })
    geometry.translate(at.x, at.y, at.z)
    parts.push(geometry)
  }
  return merge(parts)
}

// A tube whose radius and cross-section follow functions of length t and angle a.
export function shapedTube(points, radiusFn, { radial = 6, tubular = 8, section = null, colorFn = null, color = '#ffffff' } = {}) {
  const curve = new THREE.CatmullRomCurve3(points)
  const frames = curve.computeFrenetFrames(tubular, false)
  const positions = []
  const colors = []
  const base = new THREE.Color(color)
  const center = V()
  for (let ring = 0; ring <= tubular; ring += 1) {
    const t = ring / tubular
    curve.getPointAt(t, center)
    const N = frames.normals[ring]
    const B = frames.binormals[ring]
    const r = radiusFn(t)
    for (let side = 0; side <= radial; side += 1) {
      const a = (side / radial) * Math.PI * 2
      const rr = r * (section ? section(a, t) : 1)
      const x = Math.cos(a) * rr
      const y = Math.sin(a) * rr
      positions.push(center.x + N.x * x + B.x * y, center.y + N.y * x + B.y * y, center.z + N.z * x + B.z * y)
      tmpA.copy(base)
      if (colorFn) colorFn(tmpA, t, a)
      colors.push(tmpA.r, tmpA.g, tmpA.b)
    }
  }
  const indices = []
  for (let ring = 0; ring < tubular; ring += 1) {
    for (let side = 0; side < radial; side += 1) {
      const a = (radial + 1) * ring + side
      const b = (radial + 1) * (ring + 1) + side
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

// Hanging pods from a hub: tamarind (curved, lumpy, flat) or drumstick (long, three-ridged).
export function podCluster(random, { count = 3, length = 0.15, radius = 0.011, curl = 0.6, lumps = 0, seeds = 6, flatten = 1, ridges = 0, spread = 0.5, radial = 6, tubular = 8, hub = 0.02, stem = true } = {}) {
  const parts = []
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * Math.PI * 2 + random.gauss() * 0.5
    const out = V(Math.cos(a), 0, Math.sin(a))
    const len = length * random.range(0.8, 1.15)
    const bend = curl * random.range(0.6, 1.2)
    const tilt = spread * random.range(0.3, 1)
    const points = []
    for (let step = 0; step <= 4; step += 1) {
      const s = step / 4
      const swing = Math.sin(bend * s) / Math.max(bend, 0.01)
      points.push(V(0, -hub, 0).addScaledVector(out, (tilt * s * 0.35 + swing * bend * s * 0.3) * len).add(V(0, -s * len, 0)))
    }
    const section = (angle) => (ridges ? 1 + ridges * Math.cos(angle * 3) : 1) * (flatten !== 1 && Math.abs(Math.sin(angle)) > 0.5 ? lerp(1, flatten, Math.abs(Math.sin(angle))) : 1)
    const radiusFn = (t) => radius * Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.06 + t * 0.94)), 0.35) * (lumps ? 1 - lumps * (0.5 - 0.5 * Math.cos(2 * Math.PI * t * seeds)) : 1)
    parts.push(shapedTube(points, radiusFn, { radial, tubular, section, colorFn: (c, t) => c.setScalar(0.85 + 0.15 * hash(t * 40, index, 1)) }))
  }
  if (stem && hub > 0.004) parts.push(tube([V(), V(0, -hub * 0.5, 0), V(0, -hub, 0)], 0.0025, 0.002, { radial: 3, tubular: 2, color: '#6a6a4a' }))
  return merge(parts)
}

// A conical grape bunch on a short peduncle.
export function grapeBunch(random, { berries = 32, length = 0.2, width = 0.065, berry = 0.011, elongate = 1.15, peduncle = 0.04 } = {}) {
  const parts = [tube([V(), V(0.004, -peduncle * 0.5, 0), V(0, -peduncle, 0), V(0.006, -peduncle - length * 0.75, 0)], 0.003, 0.0015, { radial: 3, tubular: 3, color: '#7a7a52' })]
  for (let index = 0; index < berries; index += 1) {
    const t = Math.pow(random(), 0.85)
    const y = -peduncle - 0.008 - t * length
    const rMax = width * (1 - 0.72 * t) * (t < 0.22 ? 1.08 : 1)
    const a = random() * Math.PI * 2
    const r = rMax * Math.sqrt(random.range(0.3, 1))
    const geometry = prep(new THREE.SphereGeometry(1, 6, 4), '#ffffff')
    geometry.scale(berry, berry * elongate, berry)
    const shadeValue = random.range(0.82, 1.02)
    const colors = geometry.attributes.color
    for (let i = 0; i < colors.count; i += 1) colors.setXYZ(i, shadeValue, shadeValue, shadeValue)
    geometry.translate(Math.cos(a) * r, y, Math.sin(a) * r)
    parts.push(geometry)
  }
  return merge(parts)
}

// Bark: grain noise with optional peeling patches (guava) or lenticel bands.
export function barkPainter(color, { mottle = null, mottle2 = null, grain = 0.35, bands = 0 } = {}) {
  const base = new THREE.Color(color)
  const patchA = mottle ? new THREE.Color(mottle) : null
  const patchB = mottle2 ? new THREE.Color(mottle2) : null
  return (c, x, y, z) => {
    const n = Math.sin(x * 37 + y * 11) * Math.sin(z * 29 - y * 7) * 0.5 + 0.5
    c.copy(base).multiplyScalar(0.8 + grain * n)
    if (patchA) {
      const p = Math.sin(x * 9.1 + y * 5.3 + z * 7.7) * Math.sin(y * 4.1 - x * 6.3 + z * 3.1)
      if (p > 0.22) c.lerp(patchA, 0.75)
      else if (patchB && p < -0.3) c.lerp(patchB, 0.6)
    }
    if (bands) c.multiplyScalar(1 - bands * Math.pow(Math.abs(Math.sin(y * 31)), 12))
  }
}
