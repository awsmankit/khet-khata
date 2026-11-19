// Flower heads and fruit bodies for the vine group. Flowers face +Y from the origin;
// hanging fruit hang along -Y from the origin (stalk at the top); ground fruit lie with
// their lowest point at y = 0. Vertex colours carry light and dark (and small hue details);
// instance colours carry the main hue.
import * as THREE from 'three'
import { ellipsoid, merge, prep, smooth, transform, tube } from '../../geometry.js'
import { V } from '../../crops.js'
import { TAU, capped, leafDisc, lerp, noise, revolve, strip } from './kit.js'

const tmp = new THREE.Color()

/* ---------------------------------------------------------------- flowers */

// Cucurbit flower: a five-lobed bell with a stamen column, on a short green pedicel.
export function cucurbitFlower(random, { size = 0.09, cup = 0.55, wave = 0.08 } = {}) {
  const corolla = leafDisc(random, { size, lobes: 5, depth: 0.26, sharp: 0.65, basal: 0, notch: 0, cup, droop: 0, fold: 0, wave, detail: 20, rings: 2, centered: true, vein: 0.1, light: 0.72, dark: 1.0 })
  const stamen = ellipsoid(size * 0.07, size * 0.13, size * 0.07, { widthSegments: 5, heightSegments: 3, color: '#f0b040' })
  stamen.translate(0, size * 0.08, 0)
  const pedicel = tube([V(0, -size * 0.7, 0), V(size * 0.05, -size * 0.35, 0), V(0, 0, 0)], size * 0.04, size * 0.05, { radial: 4, tubular: 2, color: '#7c9a48' })
  return merge([corolla, stamen, pedicel])
}

// Small star flower (jasmine, tuberose): one or two layers of narrow petals over a short tube.
export function starFlower(random, { size = 0.05, petals = 5, layers = 2, cup = 0.15, tubeLength = 0.02, sharp = 1.8, rings = 1 } = {}) {
  const parts = []
  for (let layer = 0; layer < layers; layer += 1) {
    const disc = leafDisc(random, { size: size * (1 - layer * 0.25), lobes: petals, depth: 0.7, sharp, basal: 0, notch: 0, cup: cup + layer * 0.3, droop: 0, fold: 0, wave: 0.05, detail: petals * 4, rings, centered: true, vein: 0, light: 0.86, dark: 1.02 })
    transform(disc, { rotation: [0, (layer * Math.PI) / petals, 0], position: [0, layer * size * 0.05, 0] })
    parts.push(disc)
  }
  if (tubeLength) parts.push(tube([V(0, -tubeLength, 0), V(0, -tubeLength * 0.4, 0), V(0, 0.002, 0)], size * 0.05, size * 0.08, { radial: 5, tubular: 2, colorFn: (c, x, y) => c.setScalar(lerp(0.85, 1, (y + tubeLength) / tubeLength)) }))
  return merge(parts)
}

// Closed pointed bud along +Y (jasmine, tuberose, rose and gladiolus buds).
export function bud({ length = 0.025, radius = 0.006, sides = 6, tip = 0.6, base = 0.85 } = {}) {
  return revolve({ length, rings: 5, sides, radius: (t) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04))), tip) * (t < 0.5 ? 1 : 1 - (t - 0.5) * 0.5), colorFn: (c, t) => c.setScalar(lerp(base, 1, t)) })
}

// Rose bloom: three nested cups of petals around a tight centre, on a short receptacle.
export function roseBloom(random, { size = 0.085 } = {}) {
  const parts = []
  const layers = [[1, 0.75, 0], [0.74, 1.25, 0.6], [0.5, 1.9, 1.2]]
  layers.forEach(([scale, cup, spin], index) => {
    const disc = leafDisc(random, { size: size * scale, lobes: 5, depth: 0.12, sharp: 0.45, basal: 0, notch: 0, cup, droop: 0, fold: 0, wave: 0.12, detail: 20, rings: 3, centered: true, vein: 0, light: 0.55 + index * 0.08, dark: 1.0 - index * 0.05 })
    transform(disc, { rotation: [0, spin + random.gauss() * 0.2, 0], position: [0, index * size * 0.05, 0] })
    parts.push(disc)
  })
  const core = ellipsoid(size * 0.13, size * 0.2, size * 0.13, { widthSegments: 6, heightSegments: 4, colorFn: (c, x, y) => c.setScalar(lerp(0.55, 0.85, y / (size * 0.2) * 0.5 + 0.5)) })
  core.translate(0, size * 0.18, 0)
  parts.push(core)
  const receptacle = ellipsoid(size * 0.14, size * 0.12, size * 0.14, { widthSegments: 6, heightSegments: 3, color: '#4a5a2a' })
  receptacle.translate(0, -size * 0.04, 0)
  parts.push(receptacle)
  return merge(parts)
}

// Marigold pom-pom: a frilly ball of petals with a green calyx.
export function marigoldHead(random, { radius = 0.042 } = {}) {
  const geometry = new THREE.SphereGeometry(1, 10, 7)
  const position = geometry.attributes.position
  const colors = []
  const vertex = V()
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const frill = 1 + 0.11 * Math.sin(vertex.x * 23 + vertex.y * 11) * Math.sin(vertex.z * 19 - vertex.y * 17)
    const flat = vertex.y < 0 ? 0.7 : 0.88
    vertex.set(vertex.x * radius * frill, vertex.y * radius * flat * frill, vertex.z * radius * frill)
    position.setXYZ(index, vertex.x, vertex.y, vertex.z)
    const calyx = smooth(-0.3, -0.75, vertex.y / radius)
    tmp.setScalar(0.78 + (frill - 1) * 1.6 + 0.1 * (vertex.y / radius)).lerp(new THREE.Color('#5a7034'), calyx)
    colors.push(tmp.r, tmp.g, tmp.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const head = prep(geometry)
  head.translate(0, radius * 0.7, 0)
  return head
}

// Chrysanthemum: two rings of narrow rays around a domed centre.
export function chrysanthemumHead(random, { size = 0.075, pompon = false } = {}) {
  const parts = []
  const outer = leafDisc(random, { size, lobes: 15, depth: 0.78, sharp: 1.5, basal: 0, notch: 0, cup: pompon ? 0.9 : 0.35, droop: 0, fold: 0, wave: 0.08, detail: 60, rings: 1, centered: true, vein: 0, light: 0.8, dark: 1.0 })
  const inner = leafDisc(random, { size: size * 0.7, lobes: 13, depth: 0.75, sharp: 1.4, basal: 0, notch: 0, cup: pompon ? 1.6 : 0.9, droop: 0, fold: 0, wave: 0.1, detail: 52, rings: 1, centered: true, vein: 0, light: 0.78, dark: 0.98 })
  transform(inner, { rotation: [0, 0.2, 0], position: [0, size * 0.04, 0] })
  parts.push(outer, inner)
  const center = ellipsoid(size * 0.16, size * 0.09, size * 0.16, { widthSegments: 8, heightSegments: 4, color: pompon ? '#f2f2f2' : '#e6d070' })
  center.translate(0, size * (pompon ? 0.14 : 0.06), 0)
  parts.push(center)
  return merge(parts)
}

// Gladiolus floret: a six-tepalled funnel with a darker throat, facing +Y.
export function gladiolusFloret(random, { size = 0.085 } = {}) {
  const funnel = leafDisc(random, { size, lobes: 6, depth: 0.32, sharp: 0.55, basal: 0, notch: 0, cup: 1.0, droop: 0, fold: 0, wave: 0.14, detail: 24, rings: 2, centered: true, vein: 0.1, light: 0.55, dark: 1.0 })
  const throat = tube([V(0, -size * 0.25, 0), V(0, -size * 0.1, 0), V(0, 0.002, 0)], size * 0.06, size * 0.13, { radial: 5, tubular: 2, colorFn: (c) => c.setScalar(0.7) })
  return merge([funnel, throat])
}

// Dendrobium orchid flower: five spreading tepals and a darker rolled lip.
export function orchidFlower(random, { size = 0.07 } = {}) {
  const tepals = leafDisc(random, { size, lobes: 5, depth: 0.55, sharp: 0.55, basal: 0, notch: 0, cup: -0.12, droop: 0, fold: 0, wave: 0.1, detail: 30, rings: 1, centered: true, vein: 0.1, light: 0.82, dark: 1.0 })
  const lip = leafDisc(random, { size: size * 0.42, lobes: 1, depth: 0.2, sharp: 1, basal: 0.1, notch: 0.15, cup: 0.9, droop: 0, fold: 0.4, wave: 0.15, detail: 10, rings: 2, vein: 0, light: 0.5, dark: 0.72 })
  transform(lip, { rotation: [0.35, Math.PI, 0], position: [0, size * 0.03, size * 0.04] })
  const column = ellipsoid(size * 0.05, size * 0.05, size * 0.08, { widthSegments: 5, heightSegments: 3, color: '#f4f0e0' })
  column.translate(0, size * 0.04, -size * 0.02)
  return merge([tepals, lip, column])
}

// Strawberry flower: five round white petals and a yellow centre.
export function strawberryFlower(random, { size = 0.045 } = {}) {
  const petals = leafDisc(random, { size, lobes: 5, depth: 0.2, sharp: 0.35, basal: 0, notch: 0, cup: 0.25, droop: 0, fold: 0, wave: 0.05, detail: 20, rings: 2, centered: true, vein: 0, light: 0.92, dark: 1.0 })
  const center = ellipsoid(size * 0.17, size * 0.08, size * 0.17, { widthSegments: 7, heightSegments: 3, color: '#e3c23a' })
  center.translate(0, size * 0.05, 0)
  return merge([petals, center])
}

/* ---------------------------------------------------------------- hanging gourds */

const stalk = (length, radius, color = '#6a7a3a') => tube([V(0, length, 0), V(0.006, length * 0.45, 0), V(0, -0.012, 0)], radius * 0.8, radius, { radial: 4, tubular: 3, color })

export function bottleGourd(random) {
  const length = random.range(0.42, 0.62)
  const club = random() < 0.4
  const curve = random.gauss() * 0.04
  const seed = random() * 50
  const body = revolve({
    length, rings: 16, sides: 14, hang: true,
    radius: (t) => (club ? 0.026 + 0.058 * smooth(0.25, 0.85, t) : 0.034 + 0.024 * smooth(0.1, 0.9, t)) * capped(t, 0.3),
    bend: (t) => curve * t * t,
    colorFn: (c, t, a) => c.setScalar(0.86 + 0.1 * t + (noise(t * 14 + seed, a * 3) - 0.5) * 0.1),
  })
  return merge([body, stalk(0.07, 0.006)])
}

// Karela: a slim, pointed spindle covered in ridges and warts. `split` gives an overripe
// orange fruit whose lower end has burst into three curled valves around red seeds.
export function bitterGourd(random, { split = false } = {}) {
  const length = random.range(0.16, 0.24)
  const radius = random.range(0.021, 0.027)
  const seed = random() * 50
  const warts = (t, a) => Math.pow(Math.abs(Math.cos(a * 5)), 4) * 0.16 + (noise(t * 46 + seed, a * 5 + seed) - 0.45) * 0.34
  const keep = split ? 0.62 : 1
  const body = revolve({
    length: length * keep, rings: split ? 13 : 20, sides: 20, hang: true,
    radius: (u, a) => {
      const t = u * keep
      const taper = split ? Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(Math.min(t, 0.5), 0.85))), 1.05) * (u > 0.97 ? 0.85 : 1) : Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.85))), 1.1)
      return radius * taper * (1 + warts(t, a))
    },
    bend: (u) => 0.01 * Math.sin(u * keep * Math.PI),
    colorFn: (c, u, a) => c.setScalar(0.7 + warts(u * keep, a) * 1.1),
  })
  const parts = [body, stalk(0.07, 0.0035)]
  if (split) {
    const end = V(0.01 * Math.sin(keep * Math.PI), -length * keep, 0)
    for (let valve = 0; valve < 3; valve += 1) {
      const yaw = (valve / 3) * TAU + random.gauss() * 0.2
      const geometry = strip({ length: length * 0.42, width: radius * 1.6, profile: (t) => Math.pow(Math.max(0, 1 - t), 0.6), rise: -1.35, droop: -2.6, fold: -0.4, segments: 5, base: '#ffffff', tip: '#f2f2f2' })
      geometry.rotateY(yaw)
      geometry.translate(end.x + Math.sin(yaw) * radius * 0.5, end.y + 0.004, end.z + Math.cos(yaw) * radius * 0.5)
      parts.push(geometry)
    }
    for (let index = 0; index < 7; index += 1) {
      const a = random() * TAU
      const seedBody = ellipsoid(0.006, 0.009, 0.006, { widthSegments: 5, heightSegments: 3, color: '#ff2a24' })
      seedBody.translate(end.x + Math.cos(a) * radius * 0.45, end.y - 0.006 - random() * 0.022, end.z + Math.sin(a) * radius * 0.45)
      parts.push(seedBody)
    }
  }
  return merge(parts)
}

export function ridgeGourd(random) {
  const length = random.range(0.32, 0.44)
  const curve = random.gauss() * 0.05
  const ridge = (a) => Math.pow(Math.abs(Math.cos(a * 5)), 10)
  const body = revolve({
    length, rings: 14, sides: 50, hang: true,
    radius: (t, a) => (0.02 + 0.022 * smooth(0.05, 0.75, t)) * capped(t, 0.35) * (0.84 + 0.24 * ridge(a)),
    bend: (t) => curve * t * t,
    colorFn: (c, t, a) => c.setScalar(0.96 - 0.3 * ridge(a) + 0.06 * t),
  })
  // dried style at the blossom end
  const tip = ellipsoid(0.006, 0.01, 0.006, { widthSegments: 4, heightSegments: 3, color: '#7a6a3a' })
  tip.translate(curve, -length - 0.004, 0)
  return merge([body, stalk(0.08, 0.005), tip])
}

/* ---------------------------------------------------------------- ground fruit */

// Lays a revolve built along +Y onto its side along Z, lowest point at y = 0.
function lie(geometry, length, radius, sink = 0.08) {
  geometry.translate(0, -length / 2, 0)
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, radius * (1 - sink), 0)
  return geometry
}

export function pumpkin(random) {
  const radius = random.range(0.15, 0.21)
  const height = radius * random.range(1.15, 1.4)
  const seed = random() * 50
  const lobe = (a) => Math.pow(Math.abs(Math.cos(a * 5)), 0.35)
  const body = revolve({
    length: height, rings: 12, sides: 30,
    radius: (t, a) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.55) * (0.88 + 0.12 * lobe(a)) * (1 - 0.1 * smooth(0.75, 1, t)),
    colorFn: (c, t, a) => c.setScalar(0.66 + 0.3 * lobe(a) + (noise(t * 6 + seed, a * 2 + seed) - 0.5) * 0.25),
  })
  body.translate(0, -height * 0.04, 0)
  const stem = tube([V(0, height * 0.88, 0), V(0.01, height + 0.03, 0), V(0.04, height + 0.05, 0.01)], 0.016, 0.011, { radial: 5, tubular: 3, color: '#6c6a3c' })
  return merge([body, stem])
}

export function ashGourd(random) {
  const length = random.range(0.46, 0.54)
  const radius = random.range(0.12, 0.14)
  const seed = random() * 50
  // matte rind with a soft powdery bloom (only a gentle lightening, mottled)
  const powder = (t, a) => smooth(0.4, 0.85, noise(t * 7 + seed, a * 2.2 + seed))
  const body = revolve({
    length, rings: 14, sides: 20,
    radius: (t) => radius * capped(t, 0.25),
    colorFn: (c, t, a) => c.setScalar(0.88 + 0.12 * powder(t, a) + (noise(t * 20 + seed, a * 5) - 0.5) * 0.05),
  })
  return lie(body, length, radius)
}

export function roundGourd(random) {
  const radius = random.range(0.048, 0.06)
  const height = radius * 1.7
  const body = revolve({
    length: height, rings: 9, sides: 14,
    radius: (t, a) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.6) * (1 + 0.02 * Math.cos(a * 10)),
    colorFn: (c, t, a) => c.setScalar(0.88 + 0.1 * Math.cos(a * 10) * Math.sin(Math.PI * t)),
  })
  body.translate(0, -height * 0.05, 0)
  const stem = tube([V(0, height * 0.92, 0), V(0.006, height + 0.015, 0)], 0.005, 0.004, { radial: 4, tubular: 2, color: '#6c7a3c' })
  return merge([body, stem])
}

export function cucumber(random) {
  const length = random.range(0.22, 0.29)
  const radius = random.range(0.024, 0.03)
  const seed = random() * 50
  const body = revolve({
    length, rings: 14, sides: 12,
    radius: (t, a) => radius * capped(t, 0.28) * (1 + (noise(t * 30 + seed, a * 3 + seed) - 0.5) * 0.1),
    bend: (t) => 0.02 * Math.sin(Math.PI * t),
    colorFn: (c, t, a) => c.setScalar(0.78 + 0.22 * smooth(0.55, 1, t) * (0.5 + 0.5 * Math.cos(a * 6)) + (noise(t * 30 + seed, a * 3 + seed) - 0.5) * 0.1),
  })
  return lie(body, length, radius)
}

export function watermelon(random, { round = false } = {}) {
  const radius = random.range(0.13, 0.16)
  const length = round ? radius * 2 : radius * random.range(2.3, 2.6)
  const wobble = random() * 6
  const body = revolve({
    length, rings: 14, sides: 28,
    radius: (t) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * t)), round ? 0.5 : 0.42),
    colorFn: (c, t, a) => {
      const stripe = smooth(-0.15, 0.35, Math.sin(a * 9 + Math.sin(t * 9 + wobble) * 0.7))
      c.setScalar(lerp(1.05, 0.38, stripe))
      // pale ground spot where it rests on the sand
      const spot = Math.exp(-(((a - Math.PI / 2) / 0.55) ** 2)) * Math.sin(Math.PI * t)
      c.lerp(tmp.set('#e8dc9a'), spot * 0.8)
    },
  })
  return lie(body, length, radius, 0.06)
}

// Muskmelon skin net (tiled canvas map): pale cork lines over a darker rind.
export function netTexture(random) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  context.fillStyle = '#8e8e86'
  context.fillRect(0, 0, 256, 256)
  context.strokeStyle = '#f4f0e2'
  context.lineCap = 'round'
  for (let index = 0; index < 420; index += 1) {
    let x = random() * 256
    let y = random() * 256
    let heading = random() * TAU
    context.lineWidth = random.range(1.2, 2.8)
    context.globalAlpha = random.range(0.6, 1)
    context.beginPath()
    context.moveTo(x, y)
    for (let step = 0; step < 4; step += 1) {
      heading += random.gauss() * 0.9
      x += Math.cos(heading) * 9
      y += Math.sin(heading) * 9
      context.lineTo(x, y)
    }
    context.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 2)
  return texture
}

export function muskmelon(random) {
  const radius = random.range(0.085, 0.105)
  const length = radius * random.range(2.05, 2.35)
  const suture = (a) => Math.pow(Math.abs(Math.sin(a * 5)), 14)
  const body = revolve({
    length, rings: 12, sides: 30,
    radius: (t, a) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.5) * (1 - 0.05 * suture(a)),
    colorFn: (c, t, a) => c.setScalar(1 - 0.3 * suture(a)),
  })
  return lie(body, length, radius, 0.06)
}

export function pointedGourd(random) {
  const length = random.range(0.11, 0.15)
  const radius = random.range(0.024, 0.03)
  const body = revolve({
    length, rings: 10, sides: 20,
    radius: (t) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.75),
    bend: (t) => 0.006 * Math.sin(Math.PI * t),
    colorFn: (c, t, a) => c.setScalar(lerp(0.74, 1.12, smooth(0.55, 0.85, Math.abs(Math.cos(a * 5))))),
  })
  return lie(body, length, radius, 0.05)
}

/* ---------------------------------------------------------------- berries and pineapple */

// Strawberry: a cone with seeds, hanging from its calyx at the origin.
export function strawberry(random) {
  const length = random.range(0.045, 0.058)
  const radius = length * random.range(0.42, 0.5)
  const body = revolve({
    length, rings: 7, sides: 10, hang: true,
    radius: (t) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95))), 0.7) * (1 - 0.5 * smooth(0.45, 1, t)),
    colorFn: (c, t, a) => c.setScalar(Math.sin(a * 9 + t * 23) * Math.sin(a * 7 - t * 31) > 0.72 ? 1.25 : 0.82 + 0.08 * (1 - t)),
  })
  const calyx = leafDisc(random, { size: radius * 2.6, lobes: 7, depth: 0.6, sharp: 1.4, basal: 0, notch: 0, cup: -0.3, droop: 0, fold: 0, wave: 0.1, detail: 21, rings: 1, centered: true, vein: 0, light: 0.6, dark: 0.6, centerShade: '#3f6a26', rimShade: '#4a7a2c' })
  calyx.rotateX(Math.PI)
  calyx.translate(0, 0.004, 0)
  return merge([body, calyx])
}

export function pineappleFruit(random) {
  const length = random.range(0.18, 0.22)
  const radius = random.range(0.06, 0.07)
  const eyes = (t, a) => Math.sin(a * 8 + t * 22) * Math.sin(a * 8 - t * 22)
  return revolve({
    length, rings: 16, sides: 24,
    radius: (t, a) => radius * Math.pow(Math.max(0, Math.sin(Math.PI * (0.06 + t * 0.9))), 0.5) * (1 + 0.05 * eyes(t, a)),
    colorFn: (c, t, a) => c.setScalar(0.8 + 0.25 * eyes(t, a) - 0.08 * t),
  })
}
