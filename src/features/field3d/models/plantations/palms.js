// Palm family: coconut, arecanut, oil palm, date palm (and the coconut overstorey for cocoa).
import * as THREE from 'three'
import { merge, prep, transform } from '../../engine/geometry.js'
import { ramp } from '../../engine/plantKit.js'
import { TAU, V, bead, canvasTexture, floor, lerp, plantAt, rod, shapedTube, smooth, tone } from './kit.js'

const tmp = new THREE.Color()
const tmp2 = new THREE.Color()
const DOWN = V(0, -1, 0)

/* ------------------------------------------------------------------ frond */
// A pinnate frond in local space: rachis leaves the origin along +Z rising at `rise`
// and arching down by `arch`. Leaflets on both sides; real colours in the vertices.
export function frond(random, {
  length = 5, rise = 0.9, arch = 1.4, petiole = 0.2, pairs = 40, leaflet = 0.9, leafletWidth = 0.045,
  alpha = 1.1, vee = 0.1, hang = 0.5, fold = 0.3, ranks = 0, color = '#557f2e', tipColor = '#6a8f38',
  rachis = '#a7a46a', dry = 0, rachisRadius = 0.05, spines = 0, ragged = 0,
}) {
  const steps = 12
  const thetaAt = (t) => rise - arch * Math.pow(t, 1.6)
  const points = [V()]
  const p = V()
  for (let index = 1; index <= steps; index += 1) {
    const theta = thetaAt((index - 0.5) / steps)
    p.add(V(0, Math.sin(theta), Math.cos(theta)).multiplyScalar(length / steps))
    points.push(p.clone())
  }
  const pointAt = (t) => {
    const f = t * steps
    const i = Math.min(steps - 1, Math.floor(f))
    return points[i].clone().lerp(points[i + 1], f - i)
  }
  const dryColor = new THREE.Color('#a08a52')
  const rachisColor = new THREE.Color(rachis).lerp(dryColor, dry * 0.7)
  const parts = [shapedTube([points[0], points[3], points[6], points[9], points[12]], (t) => rachisRadius * lerp(1, 0.2, t), { radial: 4, tubular: 8, colorFn: (c) => c.copy(rachisColor) })]

  const positions = []
  const colors = []
  const indices = []
  const side = V(1, 0, 0)
  const cBase = new THREE.Color(color)
  const cTip = new THREE.Color(tipColor)
  for (let k = 0; k < pairs; k += 1) {
    const u = (k + 0.5) / pairs
    const t = petiole + (1 - petiole) * u
    const theta = thetaAt(t)
    const tangent = V(0, Math.sin(theta), Math.cos(theta))
    const normal = V(0, Math.cos(theta), -Math.sin(theta))
    const base = pointAt(t)
    const spine = k < spines
    let length0 = leaflet * Math.pow(Math.sin(Math.PI * (0.12 + 0.8 * u)), 0.7)
    let width0 = leafletWidth * (0.8 + 0.4 * Math.sin(Math.PI * u))
    if (spine) { length0 = leaflet * 0.22; width0 = leafletWidth * 0.25 }
    for (const sign of [-1, 1]) {
      if (ragged && random() < ragged) continue
      let v = vee
      if (ranks) v += (k + (sign > 0 ? 1 : 0)) % 2 ? ranks : -ranks * 0.7
      v += random.gauss() * 0.08
      const a = alpha + random.gauss() * 0.06
      const d = tangent.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, sign * Math.sin(a)).addScaledVector(normal, v).normalize()
      const w = d.clone().cross(normal).normalize()
      const n = w.clone().cross(d).normalize()
      const len = length0 * random.range(0.88, 1.08)
      const hw = width0 / 2
      const bright = random.range(0.86, 1.06)
      const start = positions.length / 3
      const rowsS = [0, 0.5, 1]
      const widths = [0.4, 1, 0.05]
      rowsS.forEach((s, row) => {
        const c = base.clone().addScaledVector(d, len * s).addScaledVector(DOWN, hang * len * s * s * 0.5)
        const half = hw * widths[row]
        const left = c.clone().addScaledVector(w, -half).addScaledVector(n, -half * fold)
        const mid = c.clone().addScaledVector(n, half * fold * 0.5)
        const right = c.clone().addScaledVector(w, half).addScaledVector(n, -half * fold)
        tmp.copy(cBase).lerp(cTip, u * 0.7 + s * 0.3).lerp(dryColor, dry).multiplyScalar(bright)
        for (const [vertex, rib] of [[left, 0], [mid, 1], [right, 0]]) {
          positions.push(vertex.x, vertex.y, vertex.z)
          tmp2.copy(tmp)
          if (rib) tmp2.lerp(rachisColor, 0.35)
          colors.push(tmp2.r, tmp2.g, tmp2.b)
        }
      })
      for (let row = 0; row < 2; row += 1) {
        for (let column = 0; column < 2; column += 1) {
          const i0 = start + row * 3 + column
          const i1 = i0 + 3
          indices.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1)
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  parts.push(prep(geometry))
  return merge(parts)
}

/* ------------------------------------------------------------------ trunk textures */
// Canvas x runs along the trunk, y around it. Tiles are 1 m x 1 m unless noted.
function ringTexture(ctx, { base, ring, light, rings = 9, fissures = 60 }) {
  return canvasTexture(ctx, 256, 128, (context, rand) => {
    context.fillStyle = base
    context.fillRect(0, 0, 256, 128)
    for (let index = 0; index < 700; index += 1) {
      context.globalAlpha = 0.08 + rand() * 0.14
      context.fillStyle = rand() < 0.5 ? light : ring
      context.fillRect(rand() * 256, rand() * 128, 2 + rand() * 10, 1 + rand() * 2)
    }
    context.globalAlpha = 0.35
    context.strokeStyle = ring
    for (let index = 0; index < fissures; index += 1) {
      const x = rand() * 256
      const y = rand() * 128
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + 8 + rand() * 24, y + rand() * 2 - 1)
      context.stroke()
    }
    for (let index = 0; index < rings; index += 1) {
      const x = ((index + 0.5) / rings) * 256 + (rand() - 0.5) * 8
      context.globalAlpha = 0.35
      context.fillStyle = light
      context.fillRect(x + 2, 0, 5 + rand() * 4, 128)
      context.globalAlpha = 0.85
      context.strokeStyle = ring
      context.lineWidth = 1.5 + rand() * 1.5
      context.beginPath()
      context.moveTo(x, 0)
      for (let y = 0; y <= 128; y += 16) context.lineTo(x + Math.sin(y * 0.09 + index) * 1.5, y)
      context.stroke()
    }
  })
}

function diamondTexture(ctx) {
  // Date palm: the cut bases of old fronds make a scaly diamond pattern. Tile 0.6 m x 0.6 m.
  return canvasTexture(ctx, 128, 128, (context, rand) => {
    context.fillStyle = '#3e3125'
    context.fillRect(0, 0, 128, 128)
    for (let row = -1; row < 6; row += 1) {
      for (let column = -1; column < 6; column += 1) {
        const cx = column * 25.6 + (row % 2 ? 12.8 : 0)
        const cy = row * 25.6
        context.globalAlpha = 1
        context.fillStyle = ['#6b5d4c', '#5e5040', '#7d6c58', '#54463a'][Math.floor(rand() * 4)]
        context.beginPath()
        context.moveTo(cx - 11, cy)
        context.lineTo(cx + 4, cy - 12)
        context.lineTo(cx + 12, cy)
        context.lineTo(cx + 4, cy + 12)
        context.closePath()
        context.fill()
        context.globalAlpha = 0.5
        context.strokeStyle = '#2a2018'
        context.lineWidth = 1.5
        context.stroke()
        context.globalAlpha = 0.3
        context.fillStyle = '#a08a68'
        context.fillRect(cx + 2, cy - 6, 6, 3)
      }
    }
    for (let index = 0; index < 300; index += 1) {
      context.globalAlpha = 0.15
      context.fillStyle = rand() < 0.5 ? '#b09670' : '#1e1812'
      context.fillRect(rand() * 128, rand() * 128, 3, 1)
    }
  })
}

// Rescales tube uv (0..1 along, 0..1 around) to metres / tile size.
function trunkUV(geometry, length, circumference, tileAlong, tileAround) {
  const uv = geometry.attributes.uv
  for (let index = 0; index < uv.count; index += 1) uv.setXY(index, (uv.getX(index) * length) / tileAlong, (uv.getY(index) * circumference) / tileAround)
  return geometry
}
const flatUV = (geometry) => {
  const uv = geometry.attributes.uv
  for (let index = 0; index < uv.count; index += 1) uv.setXY(index, 0.02, 0.02)
  return geometry
}

/* ------------------------------------------------------------------ bunches */
// Local frame for all bunch makers: origin at the attachment, +X points away from the trunk.
function nut(random, rx, ry, segments = [8, 6]) {
  const geometry = new THREE.SphereGeometry(1, segments[0], segments[1])
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const a = Math.atan2(z, x)
    const k = 1 + 0.06 * Math.cos(3 * a)
    position.setXYZ(index, x * rx * k, position.getY(index) * ry, z * rx * k)
  }
  geometry.computeVertexNormals()
  const shadeValue = random.range(0.84, 1.02)
  return prep(geometry, '#ffffff', (c, x, y) => c.setScalar(y > ry * 0.72 ? 0.5 : shadeValue))
}

function coconutBunch(random) {
  const end = V(0.62, -0.55, 0)
  const stalk = [shapedTube([V(), V(0.3, 0.02, 0), V(0.55, -0.25, 0), end], (t) => lerp(0.04, 0.025, t), { radial: 5, tubular: 6, color: '#a39456' })]
  const fruit = []
  const nuts = 9 + Math.floor(random() * 6)
  for (let index = 0; index < nuts; index += 1) {
    const a = random() * TAU
    const dir = V(Math.cos(a) * 0.9 + 0.5, random.range(-1, 0.2), Math.sin(a) * 0.9).normalize()
    const at = end.clone().addScaledVector(dir, random.range(0.14, 0.24))
    stalk.push(rod(end, at, 0.009, { color: '#9a8a50' }))
    const geometry = nut(random, 0.115, 0.14)
    // cap (attachment end, +Y) towards the bunch centre
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), end.clone().sub(at).normalize())
    geometry.applyQuaternion(q)
    geometry.translate(at.x + dir.x * 0.1, at.y + dir.y * 0.1, at.z + dir.z * 0.1)
    fruit.push(geometry)
  }
  return { stalk: merge(stalk), fruit: merge(fruit) }
}

function spadix(random, { length = 0.7, strands = 16, color = '#e9dca4', spathe = '#8c7a4c', droop = 0.45 }) {
  const parts = []
  const axisEnd = V(length * 0.6, -0.08, 0)
  parts.push(shapedTube([V(), V(length * 0.3, 0.02, 0), axisEnd], (t) => lerp(0.03, 0.015, t), { radial: 4, tubular: 3, color }))
  // boat-shaped spathe splitting open beneath
  const shell = new THREE.CylinderGeometry(0.07, 0.025, length * 0.9, 7, 3, true, Math.PI * 0.15, Math.PI * 1.1)
  shell.rotateZ(-Math.PI / 2 + 0.25)
  shell.translate(length * 0.42, -0.1, 0)
  parts.push(prep(shell, spathe))
  for (let index = 0; index < strands; index += 1) {
    const from = V().lerp(axisEnd, random.range(0.35, 1))
    const a = random.range(-1.2, 1.2)
    const tip = from.clone().add(V(Math.cos(a) * length * 0.35, -length * droop * random.range(0.6, 1), Math.sin(a) * length * 0.35))
    parts.push(shapedTube([from, from.clone().lerp(tip, 0.5).add(V(0, 0.06, 0)), tip], (t) => lerp(0.008, 0.004, t), { radial: 3, tubular: 3, colorFn: (c) => c.set(color).multiplyScalar(random.range(0.88, 1.04)) }))
  }
  return merge(parts)
}

function arecaBunch(random) {
  const stalk = []
  const fruit = []
  const hub = V(0.28, -0.22, 0)
  stalk.push(shapedTube([V(), V(0.16, -0.04, 0), hub], (t) => lerp(0.035, 0.022, t), { radial: 5, tubular: 4, color: '#b4a85a' }))
  const strands = 9
  for (let s = 0; s < strands; s += 1) {
    const a = (s / strands) * Math.PI * 1.6 - Math.PI * 0.8
    const tip = hub.clone().add(V(0.18 + Math.cos(a) * 0.12, -random.range(0.32, 0.5), Math.sin(a) * 0.2))
    stalk.push(shapedTube([hub, hub.clone().lerp(tip, 0.5).add(V(0.03, 0.03, 0)), tip], (t) => lerp(0.008, 0.004, t), { radial: 3, tubular: 3, color: '#c2b264' }))
    const curve = new THREE.CatmullRomCurve3([hub, hub.clone().lerp(tip, 0.5).add(V(0.03, 0.03, 0)), tip])
    const count = 4 + Math.floor(random() * 3)
    for (let k = 0; k < count; k += 1) {
      const at = curve.getPointAt(0.3 + (k / count) * 0.7)
      const out = V(random.gauss(), random.gauss() * 0.5, random.gauss()).normalize().multiplyScalar(0.03)
      const g = bead(0.03, 0.042, 0.03, { detail: 0, colorFn: (c, x, y) => c.setScalar(y > 0.03 ? 0.55 : random.range(0.85, 1.02)) })
      g.rotateZ(random.gauss() * 0.4)
      g.translate(at.x + out.x, at.y + out.y - 0.03, at.z + out.z)
      fruit.push(g)
    }
  }
  return { stalk: merge(stalk), fruit: merge(fruit) }
}

function oilBunch(random) {
  // A heavy, spiky fresh fruit bunch wedged in the frond axil.
  const parts = []
  const center = V(0.42, 0.02, 0)
  const axis = V(0.6, 0.8, 0).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis)
  const core = new THREE.SphereGeometry(1, 9, 7)
  core.scale(0.2, 0.27, 0.2)
  core.applyQuaternion(q)
  core.translate(center.x, center.y, center.z)
  parts.push(prep(core, '#2a2020'))
  for (let index = 0; index < 64; index += 1) {
    const u = random.range(-0.95, 0.95)
    const a = random() * TAU
    const r = Math.sqrt(1 - u * u)
    const local = V(Math.cos(a) * r * 0.2, u * 0.27, Math.sin(a) * r * 0.2)
    const normal = V(local.x / 0.04, local.y / 0.073, local.z / 0.04).normalize()
    const g = bead(0.03, 0.036, 0.03, { detail: 0, colorFn: (c, x, y) => c.setScalar(y > 0.012 ? 0.18 : random.range(0.75, 1)) })
    const qa = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), normal)
    g.applyQuaternion(qa)
    g.translate(local.x + normal.x * 0.012, local.y + normal.y * 0.012, local.z + normal.z * 0.012)
    g.applyQuaternion(q)
    g.translate(center.x, center.y, center.z)
    parts.push(g)
    if (index % 3 === 0) {
      const tip = local.clone().addScaledVector(normal, 0.09).applyQuaternion(q).add(center)
      const from = local.clone().applyQuaternion(q).add(center)
      parts.push(rod(from, tip, 0.006, { taper: 0.1, color: '#4a3a2a' }))
    }
  }
  return { fruit: merge(parts) }
}

function dateBunch(random) {
  const stalk = []
  const fruit = []
  const points = [V(), V(0.45, 0.12, 0), V(0.85, -0.25, 0), V(1.0, -0.85, 0)]
  stalk.push(shapedTube(points, (t) => lerp(0.035, 0.022, t), { radial: 5, tubular: 7, color: '#d79a3c' }))
  const curve = new THREE.CatmullRomCurve3(points)
  const strands = 22
  for (let s = 0; s < strands; s += 1) {
    const from = curve.getPointAt(random.range(0.62, 1))
    const a = random() * TAU
    const tip = from.clone().add(V(Math.cos(a) * 0.12, -random.range(0.35, 0.6), Math.sin(a) * 0.12))
    stalk.push(rod(from, tip, 0.005, { color: '#dfa848' }))
    const count = 5
    for (let k = 0; k < count; k += 1) {
      const at = from.clone().lerp(tip, 0.25 + (k / count) * 0.75).add(V(random.gauss() * 0.02, 0, random.gauss() * 0.02))
      const g = bead(0.019, 0.032, 0.019, { detail: 0, colorFn: (c, x, y) => c.setScalar(y > 0.02 ? 0.7 : random.range(0.86, 1.02)) })
      g.rotateZ(random.gauss() * 0.3)
      g.translate(at.x, at.y - 0.03, at.z)
      fruit.push(g)
    }
  }
  return { stalk: merge(stalk), fruit: merge(fruit) }
}

/* ------------------------------------------------------------------ palm */
function palmVariant(random, spec) {
  const { height, radius, lean = 0.06, bend = 0.5, flare = 0.4, tile = [1, 1], fronds, crownShaft = null, boots = null, bunch = null, bunches = 3, flower = null, offshoots = 0, frondDrop = 0.5 } = spec
  const azimuth = random() * TAU
  const leanDir = V(Math.cos(azimuth), 0, Math.sin(azimuth))
  const offset = height * Math.sin(lean)
  const trunkPoints = [0, 0.2, 0.45, 0.7, 1].map((t) => V(0, height * t, 0).addScaledVector(leanDir, offset * lerp(t, t * (2 - t), bend)).add(t > 0 && t < 1 ? V(random.gauss() * 0.04, 0, random.gauss() * 0.04) : V()))
  trunkPoints[0].y = -0.1
  const radiusAt = (t) => lerp(radius[0], radius[1], t) * (1 + flare * Math.pow(1 - t, 10))
  const trunk = shapedTube(trunkPoints, radiusAt, { radial: 10, tubular: 18, colorFn: (c, x, y) => c.setScalar(lerp(0.78, 1.02, Math.min(1, y / height))) })
  trunkUV(trunk, height, TAU * (radius[0] + radius[1]) * 0.5, tile[0], tile[1])
  const plant = [trunk]
  const top = trunkPoints[4].clone()
  // tangent at the top, for crown shaft / frond placement
  const topDir = top.clone().sub(trunkPoints[3]).normalize()
  let crownTop = top.clone()
  const crown = []
  if (crownShaft) {
    const shaftEnd = top.clone().addScaledVector(topDir, crownShaft.length)
    crown.push(shapedTube([top.clone().addScaledVector(topDir, -0.05), top.clone().addScaledVector(topDir, crownShaft.length * 0.5), shaftEnd], (t) => crownShaft.radius * (1 + 0.15 * Math.sin(Math.PI * t)), { radial: 9, tubular: 5, colorFn: (c, x, y) => c.set(crownShaft.color).multiplyScalar(0.85 + 0.2 * ((y - top.y) / crownShaft.length)) }))
    crownTop = shaftEnd
  }
  if (boots) {
    // persistent frond bases spiralling up the trunk
    const curve = new THREE.CatmullRomCurve3(trunkPoints)
    for (let index = 0; index < boots.count; index += 1) {
      const t = lerp(boots.from, 0.995, index / boots.count)
      const at = curve.getPointAt(t)
      const a = index * 2.39996
      const out = V(Math.cos(a), boots.lift, Math.sin(a)).normalize()
      const r = radiusAt(t)
      const g = new THREE.ConeGeometry(boots.width, boots.length, 4, 1, true)
      g.scale(1, 1, 0.45)
      g.rotateY(Math.PI / 4)
      g.translate(0, -boots.length / 2, 0)
      g.rotateX(Math.PI)
      const geometry = flatUV(prep(g, boots.color, (c) => c.set(boots.color).multiplyScalar(random.range(0.75, 1.1))))
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), out)
      geometry.applyQuaternion(q)
      geometry.translate(at.x + Math.cos(a) * r * 0.6, at.y, at.z + Math.sin(a) * r * 0.6)
      plant.push(geometry)
    }
  }
  // crown: frond bases, spear leaf, fronds
  const cabbage = new THREE.SphereGeometry(1, 9, 6)
  cabbage.scale(radius[1] * 1.5, 0.45, radius[1] * 1.5)
  cabbage.translate(crownTop.x, crownTop.y - 0.12, crownTop.z)
  crown.push(prep(cabbage, '#ffffff', (c, x, y) => c.set(fronds.base || '#6b6a3c').multiplyScalar(y > crownTop.y ? 1 : 0.7)))
  const spear = prep(new THREE.ConeGeometry(0.06, fronds.length * 0.3, 4), fronds.color)
  spear.translate(crownTop.x, crownTop.y + fronds.length * 0.15, crownTop.z)
  crown.push(spear)
  const count = fronds.count
  for (let index = 0; index < count; index += 1) {
    const age = index / (count - 1)
    const a = index * 2.39996 + random.gauss() * 0.12
    const dry = age > 1 - (fronds.dead || 0) / count ? 1 : age > 0.86 ? (age - 0.86) * (fronds.yellow ?? 1.5) : 0
    const geometry = frond(random, {
      ...fronds,
      length: fronds.length * random.range(0.88, 1.06) * (age < 0.12 ? 0.78 : 1),
      rise: lerp(fronds.rise[0], fronds.rise[1], age) + random.gauss() * 0.06,
      arch: lerp(fronds.arch[0], fronds.arch[1], age) * random.range(0.9, 1.1),
      dry: Math.min(1, dry),
    })
    geometry.rotateY(a)
    const out = V(Math.sin(a), 0, Math.cos(a))
    geometry.translate(crownTop.x + out.x * radius[1] * 0.7, crownTop.y - age * frondDrop, crownTop.z + out.z * radius[1] * 0.7)
    crown.push(geometry)
  }
  // bunches and flowers at the axils (or under the crown shaft)
  const stalks = []
  const fruits = []
  const flowers = []
  const bunchAt = crownShaft ? top.clone().add(V(0, -0.05, 0)) : crownTop.clone().add(V(0, -0.2, 0))
  for (let index = 0; index < bunches; index += 1) {
    const a = (index / bunches) * TAU + random.gauss() * 0.3
    const out = V(Math.cos(a), 0, Math.sin(a))
    const at = bunchAt.clone().addScaledVector(out, radius[1] * (crownShaft ? 1.0 : 1.2)).add(V(0, -index * 0.15, 0))
    const place = (geometry) => { geometry.rotateY(-a); geometry.translate(at.x, at.y, at.z); return geometry }
    if (bunch) {
      const made = bunch(random)
      if (made.stalk) stalks.push(place(made.stalk))
      if (made.fruit) fruits.push(place(made.fruit))
    }
    if (flower && index < 2) flowers.push(place(flower(random)))
  }
  // offshoots (suckers) round the base of date palms
  for (let index = 0; index < offshoots; index += 1) {
    const a = random() * TAU
    const base = V(Math.cos(a) * radius[0] * 2.2, 0.05, Math.sin(a) * radius[0] * 2.2)
    for (let f = 0; f < 9; f += 1) {
      const geometry = frond(random, { ...fronds, length: fronds.length * 0.45, pairs: 18, rise: random.range(0.9, 1.4), arch: random.range(0.6, 1.4), dry: 0, rachisRadius: 0.02 })
      geometry.rotateY(f * 2.39996 + a)
      geometry.translate(base.x, base.y, base.z)
      crown.push(geometry)
    }
  }
  return {
    plant: merge(plant), crown: merge(crown),
    stalk: stalks.length ? merge(stalks) : null, fruit: fruits.length ? merge(fruits) : null, flower: flowers.length ? merge(flowers) : null,
    pivots: { crown: crownTop, stalk: bunchAt, fruit: bunchAt, flower: bunchAt },
  }
}

// Palm grove on given spots. kinds lets fruit colours differ per palm (date cultivars).
function palmGrove(ctx, { variants, spots, texture, wind, fruitColor, fruitScale, flowerScale, stalkScale, crownColor = null }) {
  return plantAt(ctx, {
    variants, spots, wind, sizes: [0.92, 1.08], tilt: 0.02, jitter: 0.03,
    materialOptions: { map: texture, roughness: 0.92, envMapIntensity: 0.4, color: '#d2cec8', side: THREE.FrontSide },
    attachments: [
      { key: 'crown', wind: { flutter: 0.035 }, materialOptions: { roughness: 0.8, envMapIntensity: 0.5 }, color: crownColor || ((c, g, e) => tone(c.set('#ffffff'), e)) },
      { key: 'stalk', scale: stalkScale || fruitScale, materialOptions: { roughness: 0.8 } },
      { key: 'fruit', scale: fruitScale, color: fruitColor, wind: { flutter: 0.006 }, materialOptions: { roughness: 0.5, side: THREE.FrontSide } },
      { key: 'flower', scale: flowerScale, materialOptions: { roughness: 0.85 } },
    ],
  })
}

/* ------------------------------------------------------------------ species */
function coconutVariant(random, height) {
  return palmVariant(random, {
    height, radius: [0.2, 0.15], lean: random.range(0.05, 0.13), bend: 0.75, flare: 0.5, tile: [1, 1],
    fronds: { count: 26, length: 5.0, rise: [1.25, -0.15], arch: [0.7, 1.35], petiole: 0.2, pairs: 38, leaflet: 0.95, leafletWidth: 0.045, alpha: 1.15, vee: -0.1, hang: 0.65, color: '#3f7a2e', tipColor: '#5a8f35', rachis: '#8e9a4e', rachisRadius: 0.05, dead: 1, yellow: 1.2, base: '#6f6a3e' },
    bunch: coconutBunch, bunches: 3, flower: (r) => spadix(r, { length: 0.8, strands: 16 }), frondDrop: 0.6,
  })
}

const coconutTexture = (ctx) => ringTexture(ctx, { base: '#75664f', ring: '#3a3026', light: '#8a7a62', rings: 8 })

const coconutStages = [[0, 'Spathe opens', 'Jan'], [0.15, 'Flowering', 'Feb'], [0.35, 'Buttons set', 'Apr'], [0.55, 'Tender nuts', 'Jul'], [0.8, 'Nuts mature', 'Oct'], [0.93, 'Harvest', 'Dec']]
const coconutFruit = (c, g, e) => tone(ramp(c, g, [[0.1, '#7e9a3a'], [0.5, '#5f8a2a'], [0.72, '#6f8f2e'], [0.86, '#a99a3a'], [1, '#9a7a3a']]), e)

export function coconutPalms(ctx, spots, { heights = [12, 14.5, 16.5] } = {}) {
  const { random } = ctx
  const variants = heights.map((h) => coconutVariant(random, h))
  return palmGrove(ctx, {
    variants, spots, texture: coconutTexture(ctx), wind: { strength: 0.07, flutter: 0, refHeight: 13 },
    fruitScale: (g) => lerp(0.25, 1, smooth(0.12, 0.6, g)) * (1 - smooth(0.95, 1, g) * 0.6),
    stalkScale: (g) => lerp(0.4, 1, smooth(0.05, 0.4, g)),
    flowerScale: (g) => smooth(-0.05, 0.02, g) * (1 - smooth(0.2, 0.32, g)),
    fruitColor: coconutFruit,
  })
}

function buildCoconut(ctx) {
  const spacing = 7.6
  const spots = []
  for (let gx = -2; gx <= 1; gx += 1) {
    for (let gz = -2; gz <= 1; gz += 1) {
      const x = (gx + 0.5) * spacing + ctx.random.gauss() * 0.4
      const z = (gz + 0.5) * spacing + ctx.random.gauss() * 0.4
      spots.push({ x, y: 0, z })
      ctx.basin(V(x, 0, z), 1.2)
    }
  }
  coconutPalms(ctx, spots)
  ctx.groundCover = 'orchard'
  return { plot: { width: 31, depth: 31 }, soil: 'orchard', camera: { position: V(28, 3.0, 34), target: V(0, 7, 0) } }
}

function buildArecanut(ctx) {
  const { random } = ctx
  const variants = [11, 12.5, 13.5].map((height) => palmVariant(random, {
    height, radius: [0.11, 0.085], lean: random.range(0.01, 0.04), bend: 0, flare: 0.2, tile: [1, 0.6],
    crownShaft: { length: 1.1, radius: 0.1, color: '#5f8a36' },
    fronds: { count: 9, length: 1.9, rise: [1.35, 0.25], arch: [0.4, 1.5], petiole: 0.08, pairs: 22, leaflet: 0.6, leafletWidth: 0.06, alpha: 0.85, vee: -0.05, hang: 0.5, color: '#4f7f2c', tipColor: '#628d34', rachis: '#9aa456', rachisRadius: 0.03, dead: 0, yellow: 0.8, base: '#5f8a36' },
    bunch: arecaBunch, bunches: 2, flower: (r) => spadix(r, { length: 0.45, strands: 14, color: '#efe6bf', spathe: '#9aa060', droop: 0.6 }), frondDrop: 0.25,
  }))
  const spacing = 2.7
  const spots = []
  for (let x = -11 + spacing / 2; x < 11; x += spacing) for (let z = -11 + spacing / 2; z < 11; z += spacing) spots.push({ x: x + random.gauss() * 0.15, y: 0, z: z + random.gauss() * 0.15 })
  palmGrove(ctx, {
    variants, spots, texture: ringTexture(ctx, { base: '#7b8068', ring: '#474b3a', light: '#959a80', rings: 9, fissures: 20 }), wind: { strength: 0.12, flutter: 0, refHeight: 12 },
    fruitScale: (g) => lerp(0.3, 1, smooth(0.15, 0.55, g)) * (1 - smooth(0.96, 1, g) * 0.5),
    stalkScale: (g) => lerp(0.5, 1, smooth(0.1, 0.4, g)),
    flowerScale: (g) => smooth(-0.05, 0.02, g) * (1 - smooth(0.18, 0.28, g)),
    fruitColor: (c, g, e) => tone(ramp(c, g, [[0.15, '#7aa23a'], [0.5, '#5f9030'], [0.64, '#8fa030'], [0.74, '#e09a22'], [0.86, '#e2781c'], [1, '#c8601a']]), e),
  })
  ctx.groundCover = 'orchard'
  return { plot: { width: 22, depth: 22 }, soil: 'orchard', camera: { position: V(23, 2.8, 26), target: V(0, 6.2, 0) } }
}

function buildOilPalm(ctx) {
  const { random } = ctx
  const variants = [3.2, 4.2, 5].map((height) => palmVariant(random, {
    height, radius: [0.42, 0.36], lean: random.range(0.01, 0.05), bend: 0, flare: 0.3, tile: [1, 1],
    boots: { count: Math.round(height * 14), from: 0.12, length: 0.55, width: 0.12, lift: 0.9, color: '#5a4a32' },
    fronds: { count: 34, length: 6.2, rise: [1.2, -0.05], arch: [0.6, 1.3], petiole: 0.28, pairs: 40, leaflet: 0.95, leafletWidth: 0.04, alpha: 1.05, vee: 0.15, ranks: 0.55, hang: 0.25, color: '#3f6c26', tipColor: '#56813a', rachis: '#8a8a4a', rachisRadius: 0.09, spines: 4, dead: 1, yellow: 1.2, base: '#5d5a34' },
    bunch: oilBunch, bunches: 4, flower: (r) => spadix(r, { length: 0.35, strands: 12, color: '#d8c890', spathe: '#6a5a3a', droop: 0.15 }), frondDrop: 0.7,
  }))
  const spacing = 9
  const spots = []
  for (let row = -2; row <= 1; row += 1) {
    for (let column = -2; column <= 1; column += 1) {
      const x = (column + 0.5) * spacing + (row % 2 ? spacing / 4 : -spacing / 4)
      const z = (row + 0.5) * spacing * 0.866
      spots.push({ x, y: 0, z })
      ctx.basin(V(x, 0, z), 1.6)
    }
  }
  palmGrove(ctx, {
    variants, spots, texture: ringTexture(ctx, { base: '#4e4232', ring: '#2c241a', light: '#6e5e48', rings: 5, fissures: 120 }), wind: { strength: 0.06, flutter: 0, refHeight: 8 },
    fruitScale: (g) => lerp(0.3, 1, smooth(0.1, 0.55, g)) * (1 - smooth(0.95, 1, g) * 0.6),
    flowerScale: (g) => smooth(-0.05, 0.02, g) * (1 - smooth(0.16, 0.26, g)),
    fruitColor: (c, g, e) => tone(ramp(c, g, [[0.1, '#3a2a2a'], [0.55, '#2a1c20'], [0.7, '#4a201a'], [0.8, '#b0401c'], [0.9, '#d0521e'], [1, '#c2421a']]), e),
  })
  ctx.groundCover = 'orchard'
  return { plot: { width: 36, depth: 32 }, soil: 'orchard', camera: { position: V(25, 3.4, 26), target: V(2, 3.6, 2) } }
}

function buildDatePalm(ctx) {
  const { random } = ctx
  const variants = [6.5, 8, 9].map((height, index) => palmVariant(random, {
    height, radius: [0.3, 0.24], lean: random.range(0.02, 0.07), bend: 0.3, flare: 0.25, tile: [0.6, 0.6],
    boots: { count: 30, from: 0.82, length: 0.3, width: 0.1, lift: 1.4, color: '#6f5a3e' },
    fronds: { count: 28, length: 3.6, rise: [1.35, 0.05], arch: [0.25, 1.1], petiole: 0.12, pairs: 36, leaflet: 0.45, leafletWidth: 0.022, alpha: 0.55, vee: 0.45, hang: 0.02, fold: 0.6, color: '#5f7a5c', tipColor: '#6f8a6a', rachis: '#9a9470', rachisRadius: 0.035, spines: 7, dead: 2, yellow: 1.2, base: '#8a7a56' },
    bunch: dateBunch, bunches: 5, flower: (r) => spadix(r, { length: 0.5, strands: 18, color: '#efe8c8', spathe: '#b5a272', droop: 0.5 }), offshoots: index === 1 ? 2 : 1, frondDrop: 0.5,
  }))
  const spacing = 8
  const spots = []
  for (let gx = -2; gx <= 1; gx += 1) {
    for (let gz = -2; gz <= 1; gz += 1) {
      const x = (gx + 0.5) * spacing + random.gauss() * 0.3
      const z = (gz + 0.5) * spacing + random.gauss() * 0.3
      spots.push({ x, y: 0, z, kind: random() < 0.6 ? 0 : 1 })
      ctx.basin(V(x, 0, z), 1.5)
    }
  }
  palmGrove(ctx, {
    variants, spots, texture: diamondTexture(ctx), wind: { strength: 0.06, flutter: 0, refHeight: 8 },
    fruitScale: (g) => lerp(0.3, 1, smooth(0.15, 0.55, g)) * (1 - smooth(0.96, 1, g) * 0.5),
    stalkScale: (g) => lerp(0.5, 1, smooth(0.05, 0.35, g)),
    flowerScale: (g) => smooth(-0.05, 0.02, g) * (1 - smooth(0.16, 0.26, g)),
    // kind 0: yellow doka (Barhee type), kind 1: red Kutch local
    fruitColor: (c, g, e) => tone(e.kind ? ramp(c, g, [[0.15, '#8fae48'], [0.55, '#7ca23a'], [0.66, '#c6a83a'], [0.76, '#d0582a'], [0.9, '#b52a22'], [1, '#7a2a1e']]) : ramp(c, g, [[0.15, '#8fae48'], [0.55, '#7ca23a'], [0.66, '#d2c03c'], [0.78, '#f0c42a'], [0.92, '#e0a62a'], [1, '#9a6a2a']]), e),
  })
  // Kutch sand
  const sand = canvasTexture(ctx, 256, 256, (context, rand) => {
    context.fillStyle = '#c9b48c'
    context.fillRect(0, 0, 256, 256)
    for (let index = 0; index < 2200; index += 1) {
      context.globalAlpha = 0.1 + rand() * 0.2
      context.fillStyle = ['#d6c29a', '#a88f66', '#bda27a', '#dccaa2'][Math.floor(rand() * 4)]
      context.fillRect(rand() * 256, rand() * 256, 1 + rand() * 3, 1 + rand() * 2)
    }
    context.globalAlpha = 0.12
    context.strokeStyle = '#9a8460'
    for (let index = 0; index < 40; index += 1) {
      const y = rand() * 256
      context.beginPath()
      context.moveTo(0, y)
      for (let x = 0; x <= 256; x += 16) context.lineTo(x, y + Math.sin(x * 0.05 + index) * 4)
      context.stroke()
    }
  })
  floor(ctx, { width: 120, depth: 120, texture: sand, tint: '#e2cfa8', edge: '#b29a70', fade: 30, bump: 0.05, y: 0.01, envMapIntensity: 0.25 })
  return { plot: { width: 32, depth: 32 }, soil: 'none', grass: false, camera: { position: V(25, 2.8, 28.5), target: V(0, 4.8, 0) } }
}

export const palmModels = {
  coconut: { build: buildCoconut, stages: coconutStages, showcase: 0.6 },
  arecanut: { build: buildArecanut, stages: [[0, 'Flowering', 'Mar'], [0.2, 'Nuts set', 'May'], [0.45, 'Green nuts', 'Aug'], [0.72, 'Nuts ripen orange', 'Nov'], [0.9, 'Harvest', 'Dec']], showcase: 0.82 },
  'oil-palm': { build: buildOilPalm, stages: [[0, 'Flowering', 'Jan'], [0.2, 'Fruit set', 'Mar'], [0.45, 'Bunches swell', 'Jun'], [0.75, 'Fruit turns red', 'Sep'], [0.9, 'Harvest', 'Oct']], showcase: 0.86 },
  'date-palm': { build: buildDatePalm, stages: [[0, 'Flowering', 'Feb'], [0.2, 'Pollinated', 'Mar'], [0.4, 'Green dates (kimri)', 'Apr'], [0.7, 'Doka: yellow or red', 'Jun'], [0.88, 'Harvest', 'Jul']], showcase: 0.78 },
}

export { transform }
