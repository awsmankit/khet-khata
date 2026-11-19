// A parameterised fruit-tree orchard, generalised from buildOrchard (mango/litchi) in crops.js.
// The crown is a union of ellipsoid "blobs" whose arrangement gives the canopy shape
// (dome, round, spreading, open-centre vase, conical, bush, loose clumps). Limbs grow from the
// trunk to each blob, leaf clusters cover the blob shells, a dark core stops the crown looking
// see-through, and flowers and fruit are placed on the shell, along twigs or on the trunk.
import * as THREE from 'three'
import { GrowingPart, lerp, prep, smooth, tube, merge } from '../../engine/geometry.js'
import { V, UP, ramp, shellPoint, tone, windMaterials } from '../../engine/plantKit.js'
import { barkPainter, clamp, leafArea } from './parts.js'


// [appear start, appear full, fade start, fade end] -> 0..1
export const windowScale = ([a0, a1, b0 = 2, b1 = 3]) => (g) => smooth(a0, a1, g) * (1 - smooth(b0, b1, g))

// Colour helper: a hex string, a ramp of [g, hex] stops, or a function (c, g, item).
export function paint(spec) {
  if (typeof spec === 'function') return spec
  if (Array.isArray(spec)) return (c, g, item) => tone(ramp(c, g, spec), item)
  return (c, g, item) => tone(c.set(spec), item)
}

const triangleCount = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3

// Stand outside the front corner tree, far enough to frame it, looking diagonally into the orchard.
function defaultCamera(corner, height, crownWidth) {
  const dir = V(0.546, 0, 0.838)
  const d = Math.max(4.5, 0.9 * height + 0.8 * crownWidth)
  return {
    position: corner.clone().addScaledVector(dir, d).setY(Math.max(1.6, height * 0.5)),
    target: corner.clone().addScaledVector(dir, -0.32 * d).setY(Math.max(1.2, height * 0.46)),
  }
}

/* ------------------------------------------------------------ crown */
function crownBlobs(random, shape, c, rx, ry) {
  const blobs = []
  const add = (center, bx, by, main = false) => blobs.push({ c: center, rx: bx, ry: by, main })
  if (shape === 'round' || shape === 'dome' || shape === 'bush') {
    const dome = shape === 'dome'
    add(c.clone().add(V(0, dome ? -ry * 0.06 : 0, 0)), rx * 0.86, ry * (dome ? 0.8 : 0.86), true)
    const count = 7
    for (let index = 0; index < count; index += 1) {
      const azimuth = (index / count) * Math.PI * 2 + random.gauss() * 0.3
      const elevation = dome ? random.range(0.05, 0.85) : shape === 'bush' ? random.range(-0.55, 0.8) : random.range(-0.35, 0.9)
      add(shellPoint(c, rx * 0.5, ry * 0.5, azimuth, elevation), rx * random.range(0.4, 0.5), ry * random.range(0.42, 0.52))
    }
    add(c.clone().add(V(random.gauss() * rx * 0.1, ry * 0.45, random.gauss() * rx * 0.1)), rx * 0.42, ry * 0.45)
  } else if (shape === 'spreading') {
    add(c.clone(), rx * 0.64, ry * 0.8, true)
    const count = 8
    for (let index = 0; index < count; index += 1) {
      const azimuth = (index / count) * Math.PI * 2 + random.gauss() * 0.25
      const d = rx * random.range(0.5, 0.62)
      add(V(c.x + Math.cos(azimuth) * d, c.y + ry * random.range(-0.28, 0.12), c.z + Math.sin(azimuth) * d), rx * random.range(0.34, 0.42), ry * random.range(0.42, 0.55))
    }
  } else if (shape === 'oval') {
    // upright oval / rounded pyramid: lumps get smaller towards a rounded top (kokum)
    add(c.clone(), rx * 0.8, ry * 0.84, true)
    const count = 10
    for (let index = 0; index < count; index += 1) {
      const azimuth = (index / count) * Math.PI * 2 + random.gauss() * 0.35
      const elevation = random.range(-0.55, 0.75)
      const taper = 1 - 0.32 * ((elevation + 0.55) / 1.3)
      add(shellPoint(c, rx * 0.48 * taper, ry * 0.55, azimuth, elevation), rx * random.range(0.36, 0.48) * taper, ry * random.range(0.3, 0.4))
    }
    add(c.clone().add(V(random.gauss() * rx * 0.08, ry * 0.6, random.gauss() * rx * 0.08)), rx * 0.36, ry * 0.36)
  } else if (shape === 'open') {
    const count = 4 + (random() < 0.5 ? 1 : 0)
    const turn = random() * Math.PI * 2
    for (let index = 0; index < count; index += 1) {
      const azimuth = turn + (index / count) * Math.PI * 2 + random.gauss() * 0.2
      const d = rx * random.range(0.48, 0.56)
      add(V(c.x + Math.cos(azimuth) * d, c.y + ry * random.range(-0.05, 0.12), c.z + Math.sin(azimuth) * d), rx * random.range(0.42, 0.5), ry * random.range(0.72, 0.84))
    }
  } else if (shape === 'conical') {
    const tiers = 7
    for (let tier = 0; tier < tiers; tier += 1) {
      const f = tier / (tiers - 1)
      add(V(c.x + random.gauss() * rx * 0.05, c.y - ry * 0.66 + f * ry * 1.34, c.z + random.gauss() * rx * 0.05), rx * (1 - f * 0.8) * random.range(0.92, 1.06), ry * 0.36, tier === 0)
    }
  } else {
    // loose clumps (drumstick)
    const count = 8
    for (let index = 0; index < count; index += 1) {
      const azimuth = (index / count) * Math.PI * 2 + random.gauss() * 0.4
      add(shellPoint(c, rx * 0.58, ry * 0.58, azimuth, random.range(-0.35, 1.1)), rx * random.range(0.28, 0.38), ry * random.range(0.3, 0.4))
    }
  }
  return blobs
}

const insideBlob = (blob, p, k) => ((p.x - blob.c.x) / blob.rx) ** 2 + ((p.y - blob.c.y) / blob.ry) ** 2 + ((p.z - blob.c.z) / blob.rx) ** 2 < k * k

// Points on the visible outer shell of the crown, with outward normals.
function sampleCrown(random, tree, count, { under = tree.under, depth = 0.28 } = {}) {
  const { blobs } = tree
  const weights = blobs.map((blob) => blob.rx * (blob.rx + blob.ry))
  const total = weights.reduce((sum, w) => sum + w, 0)
  const points = []
  let guard = 0
  while (points.length < count && guard < count * 6) {
    guard += 1
    let pick = random() * total
    let blob = blobs[0]
    for (let index = 0; index < blobs.length; index += 1) {
      pick -= weights[index]
      if (pick <= 0) { blob = blobs[index]; break }
    }
    const azimuth = random() * Math.PI * 2
    const elevation = Math.asin(random.range(under, 1))
    const radius = Math.pow(random(), 0.35) * depth + (1.02 - depth)
    const rel = V(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth))
    rel.multiplyScalar(radius * (1 + 0.07 * Math.sin(azimuth * 5 + elevation * 4)))
    const p = V(blob.c.x + rel.x * blob.rx, blob.c.y + rel.y * blob.ry, blob.c.z + rel.z * blob.rx)
    if (p.y < tree.minLeafY) continue
    if (blobs.some((other) => other !== blob && insideBlob(other, p, 0.86))) continue
    const normal = V(rel.x / blob.rx, rel.y / blob.ry, rel.z / blob.rx).normalize()
    const radial = Math.hypot(p.x - tree.center.x, p.z - tree.center.z) / tree.rx
    points.push({ p, normal, height: (p.y - tree.center.y) / tree.ry, radial })
  }
  return points
}

/* ------------------------------------------------------------ skeleton */
const pointOnSeg = (seg, t) => (t < 0.5 ? seg.a.clone().lerp(seg.m, t * 2) : seg.m.clone().lerp(seg.b, t * 2 - 1))
const tangentOnSeg = (seg, t) => (t < 0.5 ? seg.m.clone().sub(seg.a) : seg.b.clone().sub(seg.m)).normalize()

function growSkeleton(random, tree, spec) {
  const { origin, trunkHeight, trunkRadius, blobs, center, rx, ry } = tree
  const { stems = 1, limbs = 4, branches = 3, twigs = 3, spurs = 0, thorns = 0, leader = false, droop = 0 } = spec
  const paintBark = barkPainter(spec.bark || '#5a4636', spec.barkOptions)
  const geometries = []
  const segs = []
  const addSeg = (a, m, b, r0, r1, level) => {
    geometries.push(tube([a, m, b], r0, r1, { radial: level === 0 ? 10 : level === 1 ? 7 : level === 2 ? 5 : 3, tubular: level <= 1 ? 5 : level === 4 ? 2 : 3, colorFn: paintBark }))
    const seg = { a, m, b, r0, r1, level }
    segs.push(seg)
    return seg
  }
  let forks = []
  let trunkTop = null
  if (stems <= 1) {
    const top = leader ? center.clone().add(V(random.gauss() * 0.1, ry * 0.55, random.gauss() * 0.1)) : origin.clone().add(V(random.gauss() * 0.12 * trunkHeight, trunkHeight, random.gauss() * 0.12 * trunkHeight))
    addSeg(origin.clone().add(V(0, -0.1, 0)), origin.clone().lerp(top, 0.5).add(V(random.gauss() * 0.06, 0, random.gauss() * 0.06)), top, trunkRadius, leader ? trunkRadius * 0.25 : trunkRadius * 0.78, 0)
    const flare = prep(new THREE.CylinderGeometry(trunkRadius * 0.95, trunkRadius * 1.5, Math.min(0.35, trunkHeight * 0.4), 10, 1, true), '#ffffff', paintBark)
    flare.translate(origin.x, origin.y + Math.min(0.35, trunkHeight * 0.4) / 2 - 0.05, origin.z)
    geometries.push(flare)
    forks.push(top)
    trunkTop = top
  } else {
    for (let stem = 0; stem < stems; stem += 1) {
      const azimuth = (stem / stems) * Math.PI * 2 + random.gauss() * 0.3
      const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
      const base = origin.clone().addScaledVector(out, trunkRadius * 0.8)
      const top = origin.clone().addScaledVector(out, rx * 0.32).add(V(0, Math.max(trunkHeight, (center.y - origin.y) * 0.55), 0))
      addSeg(base.clone().add(V(0, -0.08, 0)), base.clone().lerp(top, 0.5).addScaledVector(out, -rx * 0.05), top, trunkRadius, trunkRadius * 0.7, 0)
      forks.push(top)
    }
  }
  // a few scaffold limbs split from the trunk top; crown limbs then grow from their ends
  if (stems <= 1 && !leader) {
    const fork = forks[0]
    const count = spec.scaffolds ?? 3 + (random() < 0.5 ? 1 : 0)
    const turn = random() * Math.PI * 2
    forks = []
    for (let index = 0; index < count; index += 1) {
      const azimuth = turn + (index / count) * Math.PI * 2 + random.gauss() * 0.25
      const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
      const end = V(center.x, lerp(fork.y, center.y, 0.5) + random.gauss() * 0.1 * ry, center.z).addScaledVector(out, rx * random.range(0.26, 0.36))
      const mid = fork.clone().lerp(end, 0.5).addScaledVector(out, -rx * 0.04).add(V(0, 0.08, 0))
      addSeg(fork, mid, end, trunkRadius * 0.72, trunkRadius * 0.55, 1)
      forks.push(end)
    }
  }
  const anchors = []
  blobs.forEach((blob) => {
    if (blob.main && !leader) {
      for (let limb = 0; limb < limbs; limb += 1) anchors.push({ p: shellPoint(blob.c, blob.rx * 0.5, blob.ry * 0.5, (limb / limbs) * Math.PI * 2 + random.gauss() * 0.3, random.range(-0.15, 0.55)), blob })
    } else if (leader) {
      const count = blob.main ? limbs : Math.max(2, Math.round(limbs * (blob.rx / rx)))
      for (let limb = 0; limb < count; limb += 1) anchors.push({ p: shellPoint(blob.c, blob.rx * 0.55, blob.ry * 0.3, (limb / count) * Math.PI * 2 + random() * 1.5, random.range(-0.4, 0.1)), blob })
    } else {
      anchors.push({ p: blob.c.clone().add(V(random.gauss() * blob.rx * 0.1, random.gauss() * blob.ry * 0.1, random.gauss() * blob.rx * 0.1)), blob })
    }
  })
  const limbRadius = trunkRadius * (stems > 1 ? 0.62 : leader ? 0.45 : 0.5)
  anchors.forEach((anchor) => {
    const { blob } = anchor
    let start
    if (leader && trunkTop) {
      const y = clamp(anchor.p.y - blob.rx * 0.25, origin.y + trunkHeight, trunkTop.y - 0.2)
      start = origin.clone().lerp(trunkTop, (y - origin.y) / (trunkTop.y - origin.y))
    } else {
      start = forks.reduce((best, fork) => (fork.distanceTo(anchor.p) < best.distanceTo(anchor.p) ? fork : best), forks[0])
    }
    const size = Math.sqrt(blob.rx / rx)
    const r1 = limbRadius * clamp(size * 1.15, 0.55, 1)
    const mid = start.clone().lerp(anchor.p, 0.5).add(V(random.gauss() * 0.15, random.gauss() * 0.1 + 0.1 - droop * 0.3, random.gauss() * 0.15))
    addSeg(start, mid, anchor.p, r1, r1 * 0.7, 1)
    const outward = Math.atan2(anchor.p.z - center.z, anchor.p.x - center.x)
    for (let branch = 0; branch < branches; branch += 1) {
      const azimuth = (blob.main ? random() * Math.PI * 2 : outward + (branch - (branches - 1) / 2) * 0.9) + random.gauss() * 0.3
      const elevation = random.range(-0.35, 0.95) - droop * 0.4
      const end = shellPoint(blob.c, blob.rx * 0.72, blob.ry * 0.72, azimuth, elevation)
      const branchMid = anchor.p.clone().lerp(end, 0.5).add(V(random.gauss() * 0.08, 0.06 - droop * 0.12, random.gauss() * 0.08))
      const r2 = r1 * 0.55
      const branchSeg = addSeg(anchor.p, branchMid, end, r2, r2 * 0.6, 2)
      // short fruiting spurs along the branch (temperate trees blossom on these)
      for (let spur = 0; spur < spurs; spur += 1) {
        const t = random.range(0.25, 1)
        const from = pointOnSeg(branchSeg, t)
        const out = from.clone().sub(blob.c).normalize().add(V(random.gauss() * 0.5, 0.5, random.gauss() * 0.5)).normalize()
        const to = from.clone().addScaledVector(out, blob.rx * random.range(0.18, 0.32))
        addSeg(from, from.clone().lerp(to, 0.5).add(V(0, 0.02, 0)), to, Math.max(0.006, r2 * 0.25), 0.004, 4)
      }
      for (let twig = 0; twig < twigs; twig += 1) {
        const tipEnd = shellPoint(blob.c, blob.rx * random.range(0.9, 0.98), blob.ry * random.range(0.9, 0.98), azimuth + random.gauss() * 0.45, elevation + random.gauss() * 0.35 - droop * 0.3)
        if (tipEnd.y < tree.minLeafY * 0.6) tipEnd.y = tree.minLeafY * 0.6
        const twigMid = end.clone().lerp(tipEnd, 0.5).add(V(random.gauss() * 0.05, 0.04 - droop * 0.15, random.gauss() * 0.05))
        addSeg(end, twigMid, tipEnd, r2 * 0.5, Math.max(0.004, r2 * 0.22), 3)
      }
    }
  })
  // thorns on the outer wood (lemon, ber, bael)
  const thornSegs = segs.filter((seg) => seg.level >= 2)
  for (let index = 0; index < thorns && thornSegs.length; index += 1) {
    const seg = thornSegs[Math.floor(random() * thornSegs.length)]
    const t = random.range(0.15, 0.95)
    const p = pointOnSeg(seg, t)
    const dir = tangentOnSeg(seg, t)
    const side = V(random.gauss(), random.gauss(), random.gauss()).cross(dir).normalize()
    const thorn = prep(new THREE.ConeGeometry(0.004, 0.03, 3, 1, true), '#ffffff', paintBark)
    thorn.translate(0, 0.015, 0)
    thorn.applyMatrix4(new THREE.Matrix4().compose(p.clone().addScaledVector(side, lerp(seg.r0, seg.r1, t)), new THREE.Quaternion().setFromUnitVectors(UP, side.clone().addScaledVector(dir, 0.4).normalize()), V(1, 1, 1)))
    geometries.push(thorn)
  }
  return { geometries, segs }
}

/* ------------------------------------------------------------ core */
function coreTemplate(random) {
  const geometry = new THREE.SphereGeometry(1, 14, 10)
  const position = geometry.attributes.position
  const vertex = V()
  const phase = random() * 6
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const bump = 1 + 0.12 * Math.sin(vertex.x * 5.1 + vertex.y * 3.3 + phase) * Math.sin(vertex.z * 4.7 - vertex.y * 2.1)
    position.setXYZ(index, vertex.x * bump, vertex.y * bump, vertex.z * bump)
  }
  geometry.computeVertexNormals()
  return prep(geometry, '#ffffff', (c, x, y) => c.setScalar(lerp(0.6, 1.05, y * 0.5 + 0.5)))
}

/* ------------------------------------------------------------ the orchard */
export function buildTreeOrchard(ctx, spec) {
  const { random, quality } = ctx
  const L = spec.layout
  const sx = L.spacing
  const sz = L.spacingZ || L.spacing
  const width = L.cols * sx
  const depth = L.rows * sz
  const T = spec.tree
  const camera = spec.camera || defaultCamera(V(((L.cols - 1) / 2) * sx, 0, ((L.rows - 1) / 2) * sz), T.height, T.width)
  const wind = { strength: 0.1, flutter: 0.018, refHeight: clamp(T.height * 1.1, 5, 10), ground: 0, ...spec.wind }

  /* trees and skeletons */
  const trees = []
  const branchGeometries = []
  for (let col = 0; col < L.cols; col += 1) {
    for (let row = 0; row < L.rows; row += 1) {
      const origin = V((col - (L.cols - 1) / 2) * sx + random.gauss() * (L.jitter ?? 0.25), 0, (row - (L.rows - 1) / 2) * sz + random.gauss() * (L.jitter ?? 0.25))
      const size = random.range(0.88, 1.08)
      const rx = (T.width / 2) * size
      const ry = (T.crownDepth / 2) * size
      const center = origin.clone().add(V(random.gauss() * 0.1, T.height * size - ry, random.gauss() * 0.1))
      const tree = { origin, center, rx, ry, size, under: T.under ?? -0.6, minLeafY: T.minLeafY ?? 0.5, trunkHeight: (T.trunk ?? 1) * size, trunkRadius: (T.trunkRadius ?? 0.15) * size }
      tree.blobs = crownBlobs(random, T.crown || 'round', center, rx, ry)
      const skeleton = growSkeleton(random, tree, T)
      tree.segs = skeleton.segs
      tree.twigs = skeleton.segs.filter((seg) => seg.level >= 3)
      tree.outerWood = skeleton.segs.filter((seg) => seg.level >= 2)
      tree.wood = skeleton.segs.filter((seg) => seg.level <= 1)
      branchGeometries.push(...skeleton.geometries)
      tree.distance = origin.distanceTo(camera.position)
      trees.push(tree)
      if (spec.basin !== false) ctx.basin(origin, clamp(rx * 0.38, 0.6, 1.7))
    }
  }
  const nearest = Math.min(...trees.map((tree) => tree.distance))
  trees.forEach((tree) => { tree.lod = clamp(Math.pow(nearest / tree.distance, 0.75), 0.45, 1) })

  const barkMats = windMaterials(ctx, wind, { roughness: 0.92, envMapIntensity: 0.4, side: THREE.FrontSide })
  const branches = new THREE.Mesh(merge(branchGeometries), barkMats.material)
  branches.customDepthMaterial = barkMats.depth
  branches.castShadow = true
  branches.receiveShadow = true
  ctx.addMesh(branches)

  /* dark core: one instanced blob template per crown blob, so deciduous crowns can thin out */
  const coreScale = (T.core ?? 1)
  if (coreScale > 0) {
    const coreItems = trees.flatMap((tree) => tree.blobs.map((blob) => ({ p: blob.c, q: new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28), s: 1, offset: 0, rx: blob.rx * 0.7 * coreScale, ry: blob.ry * 0.66 * coreScale, tone: random.gauss() * 0.05 })))
    const coreMats = windMaterials(ctx, { ...wind, flutter: 0 }, { roughness: 0.9, side: THREE.FrontSide })
    const coreGrow = spec.leaves.grow || (() => 1)
    ctx.addPart(new GrowingPart({
      geometry: coreTemplate(random), material: coreMats.material, depthMaterial: coreMats.depth, items: coreItems,
      scale: (g, item) => { const k = clamp((coreGrow(g) - 0.35) / 0.65, 0, 1); return [item.rx * k, item.ry * k, item.rx * k] },
      color: paint(T.coreColor || '#1c3315'),
    }))
  }

  /* leaves */
  const leafSpec = spec.leaves
  const leafVariants = [0, 1].map(() => leafSpec.cluster(random))
  const clusterTris = leafVariants.reduce((sum, geometry) => sum + triangleCount(geometry), 0) / leafVariants.length
  // leaf clusters per tree are set by a target coverage (one-sided leaf area per m2 of crown shell,
  // mango in crops.js is about 0.57); far trees get fewer but larger clusters, phones slightly larger ones
  const clusterArea = leafVariants.reduce((sum, geometry) => sum + leafArea(geometry), 0) / leafVariants.length
  const areaOf = (tree) => 4 * Math.PI * ((2 * tree.rx * tree.rx + tree.ry * tree.ry) / 3)
  const boostOf = (tree) => Math.min(1.35, 1 / Math.sqrt(tree.lod)) * (leafSpec.scale ?? 1) * Math.pow(quality, -0.2)
  let wanted = trees.map((tree) => (areaOf(tree) * (leafSpec.cover ?? 0.6) * quality * Math.pow(tree.lod, 0.3)) / (clusterArea * 1.04 * boostOf(tree) ** 2))
  const leafBudget = (spec.budget?.leaves ?? 1.35e6) * quality
  const leafTotal = wanted.reduce((sum, n) => sum + n, 0) * clusterTris
  if (leafTotal > leafBudget) wanted = wanted.map((n) => n * (leafBudget / leafTotal))
  const leafItems = []
  trees.forEach((tree, treeIndex) => {
    const sizeBoost = boostOf(tree)
    sampleCrown(random, tree, Math.round(wanted[treeIndex])).forEach((point) => {
      const up = point.normal.clone().add(V(0, leafSpec.lift ?? 0.55, 0)).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(UP, up)
      q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * Math.PI * 2))
      leafItems.push({ ...point, q, s: random.range(0.85, 1.2) * sizeBoost, offset: random.gauss() * 0.02, tone: random.gauss() * 0.1 + (point.height < 0 ? -0.12 : 0.04), tree, flush: random() < (leafSpec.flushShare ?? 0) })
    })
  })
  const leafMats = windMaterials(ctx, wind, { roughness: leafSpec.roughness ?? 0.5, metalness: 0.02 })
  const leafColor = paint(leafSpec.color)
  const flushColor = leafSpec.flushColor ? paint(leafSpec.flushColor) : null
  const leafGrow = leafSpec.grow || (() => 1)
  leafVariants.forEach((geometry, variantIndex) => ctx.addPart(new GrowingPart({
    geometry, material: leafMats.material, depthMaterial: leafMats.depth, items: leafItems.filter((_, index) => index % leafVariants.length === variantIndex),
    scale: (g) => leafGrow(g),
    color: (c, g, item) => (item.flush && flushColor ? flushColor(c, g, item) : leafColor(c, g, item)),
  })))

  /* flowers and fruit share a placement helper */
  const place = (options, perTree, { hang }) => {
    const items = []
    trees.forEach((tree) => {
      const count = Math.round(perTree * quality * (options.lod === false ? 1 : lerp(1, tree.lod, 0.6)))
      if (options.place === 'twig') {
        // a share of blossom can sit on the crown shell so the bloom reads as a cloud, not just twig tips
        const shellCount = Math.round(count * (options.shellShare ?? 0))
        sampleCrown(random, tree, shellCount, { depth: 0.45 }).forEach((point) => {
          const q = new THREE.Quaternion().setFromUnitVectors(UP, point.normal.clone().add(V(0, 1.2, 0)).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28))
          items.push({ p: point.p.clone().addScaledVector(point.normal, -0.05), q, s: random.range(0.85, 1.15), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06, tree })
        })
        const pool = options.allBranches ? tree.outerWood : tree.twigs
        for (let index = shellCount; index < count && pool.length; index += 1) {
          const seg = pool[Math.floor(random() * pool.length)]
          const p = pointOnSeg(seg, random.range(options.along?.[0] ?? 0.3, options.along?.[1] ?? 1))
          const normal = p.clone().sub(tree.center).normalize()
          const q = hang ? new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28) : new THREE.Quaternion().setFromUnitVectors(UP, normal.clone().add(V(0, 1.2, 0)).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28))
          items.push({ p, q, s: random.range(0.85, 1.15), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06, tree })
        }
      } else if (options.place === 'trunk') {
        for (let index = 0; index < count; index += 1) {
          const seg = tree.wood[Math.floor(random() * tree.wood.length)]
          const t = seg.level === 0 ? random.range(0.25, 0.92) : random.range(0.05, 0.6)
          const axis = pointOnSeg(seg, t)
          if (axis.y < 0.8) continue
          const dir = tangentOnSeg(seg, t)
          const azimuth = random() * Math.PI * 2
          const out = V(Math.cos(azimuth), 0, Math.sin(azimuth)).addScaledVector(dir, -V(Math.cos(azimuth), 0, Math.sin(azimuth)).dot(dir)).normalize()
          const p = axis.addScaledVector(out, lerp(seg.r0, seg.r1, t) * 0.9)
          const q = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-out.z, out.x))
          items.push({ p, q, s: random.range(0.8, 1.15), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06, tree })
        }
      } else {
        const heights = options.heights || [-0.75, 0.45]
        const points = sampleCrown(random, tree, count * 3, { depth: 0.18 }).filter((point) => point.height >= heights[0] && point.height <= heights[1])
        points.slice(0, count).forEach((point) => {
          const p = point.p.clone().addScaledVector(point.normal, options.outward ?? 0.03)
          const q = hang ? new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28) : new THREE.Quaternion().setFromUnitVectors(UP, point.normal.clone().add(V(0, 1.4, 0)).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * 6.28))
          items.push({ p, q, s: random.range(0.85, 1.15), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06, tree })
        })
      }
    })
    return items
  }

  const addLayer = (items, layer, variants, { budget, scale, wind: layerWind, parent = null }) => {
    const geometries = Array.from({ length: variants }, () => layer.geometry(random))
    const tris = geometries.reduce((sum, geometry) => sum + triangleCount(geometry), 0) / geometries.length
    let use = items
    if (budget && tris * items.length > budget) use = items.filter(() => random() < budget / (tris * items.length))
    const mats = windMaterials(ctx, layerWind, { roughness: layer.roughness ?? 0.55, side: layer.side ?? THREE.DoubleSide, metalness: layer.metalness ?? 0 })
    const color = paint(layer.color)
    geometries.forEach((geometry, variantIndex) => {
      const subset = use.filter((_, index) => index % variants === variantIndex)
      ctx.addPart(new GrowingPart({ geometry, material: mats.material, depthMaterial: mats.depth, items: subset, scale: layer.scale || scale, color, parent, pivot: layer.pivot, castShadow: layer.castShadow !== false }))
    })
    return use
  }

  if (spec.flowers) {
    const F = spec.flowers
    const items = place(F, F.perTree, { hang: F.hang ?? false })
    addLayer(items, { ...F, side: THREE.DoubleSide }, F.variants ?? 2, { budget: (spec.budget?.flowers ?? 3.5e5) * quality, scale: windowScale(F.window), wind: { ...wind, flutter: 0.012 } })
  }

  if (spec.fruit) {
    const F = spec.fruit
    const items = place(F, F.perTree, { hang: true })
    const fruitScale = F.scale || ((g) => smooth(F.window[0], F.window[1], g))
    let used = null
    F.layers.forEach((layer, layerIndex) => {
      const variants = F.variants ?? 2
      // later layers reuse the exact items (and variant split) of the first layer
      if (layerIndex === 0) used = addLayer(items, { side: THREE.FrontSide, ...layer }, variants, { budget: (spec.budget?.fruit ?? 4.2e5) * quality, scale: fruitScale, wind: { ...wind, flutter: 0.006 } })
      else addLayer(used, { side: THREE.FrontSide, ...layer }, variants, { scale: layer.scale || fruitScale, wind: { ...wind, flutter: 0.006 }, parent: layer.pivot ? fruitScale : null })
    })
  }

  ctx.groundCover = 'orchard'
  return { plot: { width, depth }, soil: 'orchard', camera, update: spec.update }
}

