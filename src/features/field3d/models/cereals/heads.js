// Grain heads, plumes and flower clusters for the field group. Every head is built along
// +Y with its base at the origin (the stem top it is mounted on), in real metres.
// Arched heads bend towards +X; the mount turns +X outward from the clump.
import * as THREE from 'three'
import { lerp, merge, orient, prep, transform, tube } from '../../engine/geometry.js'
import { V } from '../../engine/plantKit.js'
import { achene, archPoints, awn, grain, shapedTube } from './kit.js'

const UPV = V(0, 1, 0)

// Barley: two or three rows of spikelets on each side, each with a long stiff awn.
export function awnedEar(random, { length = 0.075, nodes = 10, awnLength = 0.14, neck = 0.025, perNode = 2 } = {}) {
  const parts = [tube([V(), V(0, neck * 0.5, 0), V(0, neck, 0)], 0.0022, 0.0019, { radial: 3, tubular: 1, color: '#e4e4e4' })]
  const euler = new THREE.Euler()
  for (let node = 0; node < nodes; node += 1) {
    const y = neck + (node / (nodes - 1)) * length
    const side = node % 2 ? 1 : -1
    const taper = 1 - (node / nodes) * 0.3
    for (let k = 0; k < perNode; k += 1) {
      const lateral = perNode === 1 ? 0 : (k === 0 ? 0 : (node + k) % 2 ? 1 : -1)
      const rotation = [lateral * 0.42 + random.gauss() * 0.05, 0, -side * (0.34 + random.gauss() * 0.05)]
      const ry = 0.0085 * taper
      const center = V(side * 0.0042, y, lateral * 0.0034)
      parts.push(transform(grain(random, 0.0034 * taper, ry, 0.0028 * taper), { position: center.toArray(), rotation }))
      const tip = V(0, ry, 0).applyEuler(euler.set(...rotation)).add(center)
      const spike = awn(awnLength * random.range(0.82, 1.1) * lerp(1, 0.85, node / nodes), 0.0014, '#f2f2f2')
      parts.push(transform(spike, { position: tip.toArray(), rotation: [lateral * 0.14 + random.gauss() * 0.04, random() * 3, -side * (0.12 + random.gauss() * 0.04)] }))
    }
  }
  return merge(parts)
}

// Open panicle (oats, little millet, proso, rice): whorls of thin branches off an axis
// that can arch over; spikelets dangle at the branch ends or sit along them.
export function openPanicle(random, {
  length = 0.22, arch = 0.2, neck = 0.03, whorls = 4, branches = 3, branchLength = 0.09, spread = 0.7, droop = 0.4,
  spikelets = 2, along = false, size = [0.006, 0.012, 0.003], dangle = 0.8, oneSided = 0, axisRadius = 0.0018, branchRadius = 0.0009,
  branchRadial = 2, tiny = false,
} = {}) {
  const parts = []
  const axisPoints = archPoints(length, arch, neck)
  axisPoints.unshift(V())
  const axis = new THREE.CatmullRomCurve3(axisPoints)
  parts.push(tube(axisPoints, axisRadius, axisRadius * 0.45, { radial: 3, tubular: 4, color: '#e8e8e8' }))
  const start = neck / (neck + length)
  for (let whorl = 0; whorl < whorls; whorl += 1) {
    const t = lerp(start + 0.08, 0.96, whorl / Math.max(1, whorls - 1))
    const at = axis.getPointAt(t)
    const tangent = axis.getTangentAt(t)
    const reach = branchLength * lerp(1, 0.4, (t - start) / (1 - start)) * random.range(0.8, 1.15)
    const count = whorl === whorls - 1 ? Math.max(1, branches - 1) : branches
    for (let index = 0; index < count; index += 1) {
      const azimuth = oneSided ? random.gauss() * (1.6 - oneSided) : (index / count) * Math.PI * 2 + whorl * 1.3 + random.gauss() * 0.35
      const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
      out.addScaledVector(tangent, -out.dot(tangent)).normalize()
      const angle = spread * random.range(0.8, 1.2)
      const dir = tangent.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out, Math.sin(angle))
      const mid = at.clone().addScaledVector(dir, reach * 0.5).add(V(0, -droop * reach * 0.15, 0))
      const end = at.clone().addScaledVector(dir, reach).add(V(0, -droop * reach * 0.7, 0))
      parts.push(tube([at, mid, end], branchRadius, branchRadius * 0.6, { radial: branchRadial, tubular: 2, color: '#e0e0e0' }))
      const branch = new THREE.CatmullRomCurve3([at, mid, end])
      for (let spikelet = 0; spikelet < spikelets; spikelet += 1) {
        const u = along ? lerp(0.3, 1, spikelets > 1 ? spikelet / (spikelets - 1) : 1) : lerp(0.82, 1, spikelets > 1 ? spikelet / (spikelets - 1) : 1)
        const p = branch.getPointAt(u)
        const hang = branch.getTangentAt(u).lerp(V(0, -1, 0), dangle).add(V(random.gauss() * 0.25, 0, random.gauss() * 0.25)).normalize()
        // tiny grains use a four-faced seed: they are only a few pixels on screen
        const body = tiny ? achene(random, size[0]) : grain(random, size[0] * random.range(0.85, 1.1), size[1] * random.range(0.85, 1.1), size[2])
        transform(body, { rotation: [0, random() * Math.PI, 0] })
        parts.push(orient(body, p.clone().addScaledVector(hang, size[1] * 0.9), hang))
      }
    }
  }
  return merge(parts)
}

const racemeRadius = (radius) => (t) => radius * Math.pow(Math.sin(Math.PI * (0.16 + 0.84 * t)), 0.55)
const grainTint = (random, low = 0.78) => (c, t, ring) => c.setScalar((ring % 2 ? 1 : low) * random.range(0.94, 1))

// Racemes: 'digitate' radiates curved fingers from one point (ragi); 'along' sets short
// spikes up an axis (kodo, barnyard millet).
export function racemeHead(random, {
  mode = 'along', count = 5, length = 0.06, radius = 0.0045, angle = 0.5, curl = 0.4, neck = 0.04, axis = 0.08,
  radial = 4, tubular = 6, beads = 0.35, bump = 0.12, spiral = false,
} = {}) {
  const parts = []
  if (mode === 'digitate') {
    parts.push(tube([V(), V(0, neck * 0.5, 0), V(0, neck, 0)], 0.0024, 0.002, { radial: 3, tubular: 2, color: '#e8e8e8' }))
    const hub = V(0, neck, 0)
    for (let index = 0; index < count; index += 1) {
      const azimuth = (index / count) * Math.PI * 2 + random.gauss() * 0.3
      const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
      const a = angle * random.range(0.75, 1.25)
      const len = length * random.range(0.85, 1.15)
      const dir = UPV.clone().multiplyScalar(Math.cos(a)).addScaledVector(out, Math.sin(a))
      // fingers curve back in towards the axis like a half-closed hand
      const p1 = hub.clone().addScaledVector(dir, len * 0.4)
      const p2 = hub.clone().addScaledVector(dir, len * 0.78).addScaledVector(out, -curl * len * 0.12).add(V(0, curl * len * 0.06, 0))
      const p3 = hub.clone().addScaledVector(dir, len * 0.95).addScaledVector(out, -curl * len * 0.32).add(V(0, curl * len * 0.1, 0))
      parts.push(shapedTube(random, [hub.clone(), p1, p2, p3], racemeRadius(radius), { radial, tubular, beads, bump, tint: grainTint(random) }))
    }
    return merge(parts)
  }
  const axisPoints = [V(), V(random.gauss() * 0.004, (neck + axis) * 0.5, random.gauss() * 0.004), V(random.gauss() * 0.008, neck + axis, random.gauss() * 0.008)]
  const curve = new THREE.CatmullRomCurve3(axisPoints)
  parts.push(tube(axisPoints, 0.0022, 0.0012, { radial: 3, tubular: 3, color: '#e8e8e8' }))
  const startT = neck / (neck + axis)
  for (let index = 0; index < count; index += 1) {
    const t = lerp(startT, 1, count > 1 ? index / (count - 1) : 1)
    const at = curve.getPointAt(Math.min(t, 0.98))
    const azimuth = spiral ? index * 2.4 : index * Math.PI + random.gauss() * 0.35
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const a = angle * random.range(0.75, 1.2)
    const len = length * lerp(1, 0.65, t) * random.range(0.85, 1.15)
    const dir = UPV.clone().multiplyScalar(Math.cos(a)).addScaledVector(out, Math.sin(a))
    const end = at.clone().addScaledVector(dir, len).addScaledVector(out, -curl * len * 0.15)
    parts.push(shapedTube(random, [at.clone(), at.clone().addScaledVector(dir, len * 0.5), end], racemeRadius(radius), { radial, tubular, beads, bump, tint: grainTint(random) }))
  }
  return merge(parts)
}

// A cylindrical or tapering spike on an exposed peduncle: bajra candle, foxtail brush,
// napier plume. `star` makes the section bristly.
export function spikeHead(random, {
  length = 0.25, radius = 0.013, arch = 0, neck = 0.05, radial = 8, tubular = 12, bump = 0.12, star = 0, beads = 0,
  taper = 0.85, roundness = 0.25, neckRadius = 0.0028,
} = {}) {
  const parts = []
  const points = archPoints(length + neck, arch)
  const curve = new THREE.CatmullRomCurve3(points)
  const startT = neck / (length + neck)
  const neckPoints = [0, 0.5, 1].map((u) => curve.getPointAt(u * startT))
  parts.push(tube(neckPoints, neckRadius, neckRadius * 0.85, { radial: 4, tubular: 3, color: '#e6e6e6' }))
  const body = [0, 0.33, 0.66, 1].map((u) => curve.getPointAt(lerp(startT, 1, u)))
  const profile = (t) => radius * Math.pow(Math.sin(Math.PI * t), roundness) * lerp(1, taper, t)
  parts.push(shapedTube(random, body, profile, { radial, tubular, bump, star, beads, tint: (c, t, ring, side) => c.setScalar(random.range(0.82, 1) * (side % 2 ? 1 : 0.92)) }))
  return merge(parts)
}

// Sorghum: a compact oval head of round grains on a long, exposed peduncle.
export function sorghumHead(random, { length = 0.22, radius = 0.042, neck = 0.14, grains = 30, open = 0 } = {}) {
  const neckPoints = [V(), V(random.gauss() * 0.01, neck * 0.5, random.gauss() * 0.01), V(random.gauss() * 0.015, neck, random.gauss() * 0.015)]
  const parts = [tube(neckPoints, 0.0055, 0.0045, { radial: 4, tubular: 3, color: '#e0e0e0' })]
  const base = neckPoints[2]
  const profile = (t) => radius * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.94 + 0.03)), 0.62) * lerp(1.06, 0.78, t) * (1 + open * 0.3)
  const axis = [0, 0.33, 0.66, 1].map((u) => base.clone().add(V(u * u * random.gauss() * 0.02, u * length, 0)))
  parts.push(shapedTube(random, axis, profile, { radial: 9, tubular: 9, bump: 0.2, tint: (c) => c.setScalar(random.range(0.72, 0.95)) }))
  for (let index = 0; index < grains; index += 1) {
    const t = 0.08 + random() * 0.86
    const a = random() * Math.PI * 2
    const r = profile(t) * random.range(0.92, 1.08)
    const p = base.clone().add(V(Math.cos(a) * r, t * length, Math.sin(a) * r))
    const seed = grain(random, 0.0048, 0.0052, 0.0046, 0.88)
    parts.push(orient(seed, p, V(Math.cos(a), 0.6, Math.sin(a))))
  }
  return merge(parts)
}

// Amaranth and quinoa: a thick lumpy plume with side spikes. Amaranth arches and tapers;
// quinoa is upright and clustered.
export function plumeHead(random, {
  length = 0.4, radius = 0.035, arch = 0.5, neck = 0.02, branches = 5, branchLength = 0.14, branchRadius = 0.6, branchAngle = 0.7,
  radial = 7, tubular = 12, bump = 0.3, beads = 0.12, fullness = 0.55,
} = {}) {
  const parts = []
  const points = archPoints(length, arch, neck)
  points.unshift(V())
  const curve = new THREE.CatmullRomCurve3(points)
  const startT = neck / (neck + length)
  const main = [0, 0.25, 0.5, 0.75, 1].map((u) => curve.getPointAt(lerp(startT * 0.5, 1, u)))
  const lump = (c, t, ring, side) => c.setScalar(random.range(0.78, 1) * ((ring + side) % 3 ? 1 : 0.86))
  parts.push(shapedTube(random, main, (t) => radius * Math.pow(Math.min(1, t * 6), 0.5) * Math.pow(1 - t, fullness), { radial, tubular, bump, beads, tint: lump }))
  for (let index = 0; index < branches; index += 1) {
    const t = lerp(startT + 0.05, 0.55, branches > 1 ? index / (branches - 1) : 0)
    const at = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)
    const azimuth = index * 2.4 + random.gauss() * 0.3
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    out.addScaledVector(tangent, -out.dot(tangent)).normalize()
    const angle = branchAngle * random.range(0.8, 1.2)
    const len = branchLength * lerp(1, 0.5, (t - startT) / 0.55) * random.range(0.8, 1.15)
    const dir = tangent.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out, Math.sin(angle))
    const mid = at.clone().addScaledVector(dir, len * 0.5)
    const end = at.clone().addScaledVector(dir, len).add(V(0, -arch * len * 0.35, 0))
    parts.push(shapedTube(random, [at, mid, end], (u) => radius * branchRadius * Math.pow(Math.min(1, u * 5), 0.5) * Math.pow(1 - u, 0.6), { radial: 5, tubular: 5, bump, tint: lump }))
  }
  return merge(parts)
}

// Small open flowers in a dome (buckwheat), on two or three short pedicels.
export function flowerCluster(random, { florets = 18, radius = 0.022, size = 0.0045, stalks = 3, stalkLength = 0.03 } = {}) {
  const parts = []
  const centers = []
  for (let index = 0; index < stalks; index += 1) {
    const azimuth = (index / stalks) * Math.PI * 2 + random.gauss() * 0.4
    const lean = stalks === 1 ? 0 : random.range(0.35, 0.7)
    const end = V(Math.sin(lean) * Math.cos(azimuth), Math.cos(lean), Math.sin(lean) * Math.sin(azimuth)).multiplyScalar(stalkLength * random.range(0.8, 1.2))
    parts.push(tube([V(), end.clone().multiplyScalar(0.5).add(V(0, 0.003, 0)), end], 0.0012, 0.001, { radial: 3, tubular: 2, color: '#ffffff' }))
    centers.push(end)
  }
  for (let index = 0; index < florets; index += 1) {
    const center = centers[index % centers.length]
    const a = random() * Math.PI * 2
    const r = Math.sqrt(random()) * radius * 0.6
    const p = center.clone().add(V(Math.cos(a) * r, (radius * 0.6 - r) * 0.6 + random() * 0.004, Math.sin(a) * r))
    const flower = grain(random, size, size * 0.4, size, 0.88)
    transform(flower, { rotation: [random.gauss() * 0.5, random() * 3, random.gauss() * 0.5] })
    flower.translate(p.x, p.y, p.z)
    parts.push(flower)
  }
  return merge(parts)
}

// Buckwheat seed set: dark three-cornered achenes clustered where the flowers were.
export function seedCluster(random, { seeds = 12, radius = 0.018, size = 0.0042, stalkLength = 0.03 } = {}) {
  const parts = [tube([V(), V(0, stalkLength * 0.5, 0), V(0, stalkLength, 0)], 0.0012, 0.001, { radial: 3, tubular: 2, color: '#d0d0d0' })]
  for (let index = 0; index < seeds; index += 1) {
    const a = random() * Math.PI * 2
    const r = Math.sqrt(random()) * radius
    const seed = achene(random, size)
    transform(seed, { rotation: [random() * 3, random() * 3, random() * 3] })
    seed.translate(Math.cos(a) * r, stalkLength + (radius - r) * 0.5 + random() * 0.006, Math.sin(a) * r)
    parts.push(seed)
  }
  return merge(parts)
}

// Clover heads: a round white ball (berseem) or a short purple raceme (lucerne).
export function cloverHead(random, { kind = 'ball', radius = 0.012, stalkLength = 0.04, florets = 12 } = {}) {
  const parts = [tube([V(), V(0.002, stalkLength * 0.5, 0), V(0, stalkLength, 0)], 0.0013, 0.0011, { radial: 3, tubular: 2, color: '#e0e0e0' })]
  if (kind === 'ball') {
    const ball = new THREE.IcosahedronGeometry(radius, 1)
    const position = ball.attributes.position
    const vertex = V()
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index)
      vertex.multiplyScalar(1 + 0.1 * Math.sin(vertex.x * 900) * Math.sin(vertex.z * 870 + vertex.y * 400))
      vertex.y *= 1.18
      position.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }
    ball.computeVertexNormals()
    // florets fade to green at the base of the head
    parts.push(prep(ball, '#ffffff', (c, x, y) => c.setRGB(1, 1, 1).lerp(new THREE.Color('#b9d29a'), Math.max(0, -y / radius) * 0.45).multiplyScalar(random.range(0.9, 1))))
    parts[1].translate(0, stalkLength + radius * 0.9, 0)
    return merge(parts)
  }
  for (let index = 0; index < florets; index += 1) {
    const t = index / florets
    const a = index * 2.4
    const r = radius * 0.55 * (1 - t * 0.4)
    const floret = grain(random, radius * 0.32, radius * 0.5, radius * 0.24, 0.85)
    orient(floret, V(Math.cos(a) * r, stalkLength + t * radius * 2.2, Math.sin(a) * r), V(Math.cos(a), 0.7, Math.sin(a)))
    parts.push(floret)
  }
  return merge(parts)
}

// Pale anthers hanging out of a straight spike at flowering; built to match spikeHead()
// called with the same length, radius, neck, roundness and taper.
export function antherSpecks(random, { length = 0.25, radius = 0.013, neck = 0.05, roundness = 0.25, taper = 0.85, count = 18, size = 0.0028 } = {}) {
  const parts = []
  for (let index = 0; index < count; index += 1) {
    const t = 0.06 + random() * 0.88
    const a = random() * Math.PI * 2
    const r = radius * Math.pow(Math.sin(Math.PI * t), roundness) * lerp(1, taper, t) * 1.12
    const speck = achene(random, size)
    transform(speck, { rotation: [random() * 3, random() * 3, random() * 3] })
    // spikeHead's straight axis ends at 0.95 of (length + neck)
    speck.translate(Math.cos(a) * r, neck + t * (0.95 * (length + neck) - neck), Math.sin(a) * r)
    parts.push(speck)
  }
  return merge(parts)
}
