// Mushroom shed: an open-sided bamboo and thatch shed. Oyster mushrooms fruit from hanging
// paddy-straw bags on one side; button mushrooms grow on compost trays in bamboo racks on
// the other.
import * as THREE from 'three'
import { GrowingPart, item, lerp, merge, prep, smooth } from '../../engine/geometry.js'
import { V, ramp, windMaterials } from '../../engine/plantKit.js'
import { TAU, bamboo, lathe, leaf, noise2, out, put, quatYaw, rigid, rod, shapedSoil, stem } from './kit.js'

const c1 = new THREE.Color()
const STILL = { strength: 0.004, flutter: 0.001, refHeight: 2, ground: 0 }

function box(w, h, d, at, color, grain = 0) {
  const geometry = new THREE.BoxGeometry(w, h, d, 1, 1, Math.max(1, Math.round(d / 0.5)))
  geometry.translate(at.x, at.y, at.z)
  const base = new THREE.Color(color)
  return prep(geometry, '#ffffff', (c, x, y, z) => c.copy(base).multiplyScalar(0.85 + 0.2 * noise2(x * 13 + z * grain, y * 40 + z * 2)))
}

function thatchRoof(width, depth, eave, ridge, overhang) {
  const half = width / 2
  const slope = (ridge - eave) / half
  const parts = []
  const straw = new THREE.Color('#b59b63')
  const old = new THREE.Color('#7e6c4c')
  for (const side of [-1, 1]) {
    for (const [lift, shadeK] of [[0, 1], [-0.1, 0.7]]) {
      const plane = new THREE.PlaneGeometry(1, 1, 10, 26)
      const position = plane.attributes.position
      for (let index = 0; index < position.count; index += 1) {
        const u = position.getX(index) + 0.5
        const v = position.getY(index) + 0.5
        const run = u * (half + overhang)
        const z = (v - 0.5) * (depth + 1.0)
        const ragged = u > 0.97 ? (noise2(z * 9, side * 3) - 0.3) * 0.09 : 0
        position.setXYZ(index, side * run, ridge + 0.12 - run * slope + lift - ragged + (noise2(z * 3, u * 5) - 0.5) * 0.04, z)
      }
      plane.computeVertexNormals()
      parts.push(prep(plane, '#ffffff', (c, x, y, z) => {
        const streak = noise2(z * 38, Math.abs(x) * 2.5)
        c.copy(straw).lerp(old, smooth(half * 0.6, half + overhang, Math.abs(x)) * 0.6 + (noise2(z * 1.3, x * 1.3) - 0.5) * 0.5).multiplyScalar((0.78 + 0.3 * streak) * shadeK)
      }))
    }
  }
  // ridge cap bundle
  const cap = stem([V(0, ridge + 0.14, -depth / 2 - 0.5), V(0, ridge + 0.16, 0), V(0, ridge + 0.14, depth / 2 + 0.5)], () => 0.11, { radial: 7, tubular: 12, colorFn: (c, x, y, z) => c.copy(old).multiplyScalar(0.85 + 0.3 * noise2(z * 30, x * 30)) })
  parts.push(cap)
  return merge(parts)
}

function strawBag(random) {
  const length = 0.5
  return lathe((t) => (t < 0.1 ? lerp(0.012, 0.03, t / 0.1) : t < 0.2 ? lerp(0.03, 0.125, smooth(0.1, 0.2, t)) : 0.13 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.5 + (t - 0.2) * 0.625))), 0.3) * (1 + 0.03 * Math.sin(t * 20))), length, {
    radial: 12, rows: 12,
    colorFn: (c, x, y, z) => c.setScalar(0.78 + 0.26 * noise2(Math.atan2(z, x) * 7 + y * 4, y * 30 + x * 9) + (random() - 0.5) * 0.05),
  })
}

function oysterCluster(random) {
  const parts = []
  const caps = 6
  for (let k = 0; k < caps; k += 1) {
    const y = (k / caps - 0.4) * 0.07 + random.gauss() * 0.008
    const yaw = random.gauss() * 0.5
    const size = random.range(0.75, 1.15) * (1 - Math.abs(k / caps - 0.5) * 0.4)
    const base = V(Math.sin(yaw) * 0.006, y, 0.004)
    parts.push(stem([V(0, y * 0.6, 0), base], () => 0.004, { radial: 4, tubular: 1, color: '#dedad0' }))
    const cap = leaf({ length: 0.055 * size, width: 0.07 * size, shape: 'round', rise: random.range(0.05, 0.3), droop: 0.35, segments: 4, across: 3, cup: -0.2, wave: 0.3, waves: 2, rib: null, base: '#c8c8c8', tip: '#f0f0f0', edge: 0.92, random })
    parts.push(put(cap, base, yaw))
  }
  return merge(parts)
}

function buttonMushroom() {
  const cap = lathe((t) => 0.024 * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, t)), 0.6) * (t > 0.85 ? lerp(1, 0.7, (t - 0.85) / 0.15) : 1), 0.02, { radial: 9, rows: 5, colorFn: (c, x, y) => c.setScalar(lerp(0.8, 1.02, smooth(-0.02, 0, y))) })
  cap.translate(0, 0.036, 0)
  const stalk = new THREE.CylinderGeometry(0.008, 0.009, 0.02, 6, 1, true)
  stalk.translate(0, 0.012, 0)
  return merge([cap, prep(stalk, '#dcd6c8')])
}

export function buildMushroom(ctx) {
  const { random, quality } = ctx
  const plot = { width: 7, depth: 10 }
  const eave = 2.35
  const ridge = 3.55
  const half = plot.width / 2
  shapedSoil(ctx, plot, { color: '#a07a54', seed: 41, emissive: '#2c1d10' })

  // bamboo frame and thatch
  const frame = []
  const postZ = [-5, -2.5, 0, 2.5, 5]
  for (const z of postZ) {
    for (const x of [-half, half]) frame.push(bamboo(V(x, 0, z), V(x + random.gauss() * 0.02, eave + 0.05, z), 0.05, { radial: 7 }))
    frame.push(bamboo(V(-half - 0.3, eave, z), V(half + 0.3, eave, z), 0.04, { radial: 6 }))
  }
  for (const z of [-5, 5]) frame.push(bamboo(V(0, 0, z), V(0, ridge + 0.05, z), 0.055, { radial: 7 }))
  frame.push(bamboo(V(0, ridge, -5.5), V(0, ridge, 5.5), 0.05))
  for (const x of [-half, half]) frame.push(bamboo(V(x, eave, -5.5), V(x, eave, 5.5), 0.045))
  for (let z = -5; z <= 5.01; z += 1.25) for (const side of [-1, 1]) frame.push(bamboo(V(0, ridge, z), V(side * (half + 0.6), eave - 0.6 * ((ridge - eave) / half), z), 0.03, { radial: 5 }))

  // oyster side: bamboo beams with ropes of hanging straw bags
  const ropes = []
  const bagItems = []
  const clusterItems = []
  const beamY = 2.28
  const bagCenters = [1.72, 1.17, 0.62]
  const rows = [-2.75, -2.0, -1.25]
  for (const x of rows) {
    frame.push(bamboo(V(x, beamY, -5), V(x, beamY, 5), 0.03))
    for (let z = -4.3; z <= 4.31; z += 0.62) {
      const zz = z + random.gauss() * 0.03
      ropes.push(rod(V(x, beamY, zz), V(x, 0.36, zz), 0.004, '#9a8a64', 3))
      for (const cy of bagCenters) {
        const bag = item(V(x + random.gauss() * 0.01, cy + 0.27, zz), random() * TAU, random.range(0.92, 1.06), random.gauss() * 0.02, [random.gauss() * 0.03, random.gauss() * 0.03])
        bag.tone = random.gauss() * 0.05
        bagItems.push(bag)
        const clusters = Math.round(lerp(3, 5, random()) * Math.min(1, quality + 0.2))
        for (let k = 0; k < clusters; k += 1) {
          const az = random() * TAU
          const p = V(x, cy + random.range(-0.17, 0.13), zz).add(out(az, 0.126))
          const entry = { p, q: quatYaw(az).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), random.gauss() * 0.15)), s: random.range(0.8, 1.2), offset: random.gauss() * 0.02, tone: random.gauss() * 0.06, flush: random() < 0.55 ? 0 : 1 }
          clusterItems.push(entry)
        }
      }
    }
  }

  // button side: bamboo racks of compost trays
  const wood = []
  const compost = []
  const buttonItems = []
  const racks = [1.25, 2.6]
  const tiers = [0.3, 0.95, 1.6]
  const length = 8.6
  for (const cx of racks) {
    for (let z = -length / 2; z <= length / 2 + 0.01; z += length / 4) for (const dx of [-0.5, 0.5]) frame.push(bamboo(V(cx + dx, 0, z), V(cx + dx, 2.05, z), 0.03, { radial: 5 }))
    for (const ty of tiers) {
      for (const dx of [-0.5, 0.5]) frame.push(bamboo(V(cx + dx, ty - 0.03, -length / 2), V(cx + dx, ty - 0.03, length / 2), 0.022, { radial: 5 }))
      wood.push(box(0.98, 0.025, length, V(cx, ty, 0), '#8a6a48', 3))
      for (const dx of [-0.48, 0.48]) wood.push(box(0.025, 0.17, length, V(cx + dx, ty + 0.085, 0), '#7c5c3e', 3))
      for (let z = -length / 2; z <= length / 2 + 0.01; z += length / 8) wood.push(box(0.94, 0.17, 0.025, V(cx, ty + 0.085, z), '#7c5c3e'))
      const top = ty + 0.13
      const surface = new THREE.PlaneGeometry(0.93, length - 0.03, 8, 60)
      surface.rotateX(-Math.PI / 2)
      const sp = surface.attributes.position
      for (let index = 0; index < sp.count; index += 1) sp.setY(index, (noise2(sp.getX(index) * 20, sp.getZ(index) * 20) - 0.5) * 0.012)
      surface.translate(cx, top, 0)
      surface.computeVertexNormals()
      compost.push(prep(surface, '#ffffff', (c, x, y, z) => c.setScalar(0.7 + 0.45 * noise2(x * 35 + 3, z * 35) * noise2(z * 9, x * 9 + 1))))
      const count = Math.round(0.93 * length * 52 * quality)
      for (let k = 0; k < count; k += 1) {
        // buttons come up in loose clumps
        const clump = Math.floor(random() * 40)
        const zc = -length / 2 + 0.1 + ((clump + 0.5) / 40) * (length - 0.2)
        const p = V(cx + random.range(-0.42, 0.42), top, zc + random.gauss() * 0.12)
        p.z = Math.max(-length / 2 + 0.05, Math.min(length / 2 - 0.05, p.z))
        const entry = item(p, random() * TAU, random.range(0.7, 1.3), random.gauss() * 0.035, [random.gauss() * 0.12, random.gauss() * 0.12])
        entry.tone = random.gauss() * 0.05
        entry.open = random() < 0.35
        buttonItems.push(entry)
      }
    }
  }
  rigid(ctx, frame, { roughness: 0.8 })
  rigid(ctx, [thatchRoof(plot.width, plot.depth, eave, ridge, 0.6)], { roughness: 1, side: THREE.DoubleSide })
  rigid(ctx, ropes, { roughness: 1, castShadow: false })
  rigid(ctx, wood, { roughness: 0.9 })
  const compostMesh = rigid(ctx, compost, { roughness: 1, color: '#6a5038', castShadow: false })
  compostMesh.material.emissive?.set('#4a311c')
  compostMesh.material.envMapIntensity = 0.2

  const bagMats = windMaterials(ctx, STILL, { roughness: 0.34, metalness: 0.02, side: THREE.FrontSide })
  ctx.addPart(new GrowingPart({
    geometry: strawBag(random), material: bagMats.material, depthMaterial: bagMats.depth, items: bagItems, scale: () => 1,
    color: (c, g, entry) => ramp(c, g, [[0, '#c4a862'], [0.12, '#cdb77a'], [0.28, '#e0dbc4'], [0.4, '#efeee6'], [0.85, '#e8e4d6'], [1, '#ddd4bc']]).multiplyScalar(1 + entry.tone),
  }))
  const oysterMats = windMaterials(ctx, STILL, { roughness: 0.62 })
  const flushStart = [0.4, 0.78]
  ctx.addPart(new GrowingPart({
    geometry: oysterCluster(random), material: oysterMats.material, depthMaterial: oysterMats.depth, items: clusterItems,
    scale: (g, entry) => {
      const start = flushStart[entry.flush]
      const picked = entry.flush === 0 ? 1 - smooth(0.72, 0.75, g) : 1
      return smooth(start, start + 0.04, g) * lerp(0.22, 1, smooth(start + 0.03, start + 0.17, g)) * picked
    },
    color: (c, g, entry) => {
      const start = flushStart[entry.flush]
      return c.set('#59606c').lerp(c1.set('#cfccc3'), smooth(start + 0.02, start + 0.16, g)).multiplyScalar(1 + entry.tone)
    },
  }))
  const buttonMats = windMaterials(ctx, STILL, { roughness: 0.55 })
  ctx.addPart(new GrowingPart({
    geometry: buttonMushroom(), material: buttonMats.material, depthMaterial: buttonMats.depth, items: buttonItems, castShadow: false,
    scale: (g, entry) => {
      const s = smooth(0.5, 0.56, g) * lerp(0.25, 1, smooth(0.54, 0.74, g))
      const open = entry.open ? smooth(0.82, 0.95, g) : 0
      return [s * lerp(1, 1.3, open), s * lerp(1, 0.78, open), s * lerp(1, 1.3, open)]
    },
    color: (c, g, entry) => c.set('#f3f0e8').lerp(c1.set('#e4dac4'), smooth(0.85, 1, g)).multiplyScalar(1 + entry.tone),
  }))

  const fresh = new THREE.Color('#6a5038')
  const spawned = new THREE.Color('#b8ae9c')
  const casing = new THREE.Color('#6e5440')
  return {
    plot, soil: 'none', bund: false, grass: false, scarecrow: false,
    camera: { position: V(5.0, 1.7, 7.6), target: V(-0.7, 1.05, 0.4) },
    update(g) {
      compostMesh.material.color.copy(fresh).lerp(spawned, smooth(0.08, 0.3, g)).lerp(casing, smooth(0.34, 0.4, g))
    },
  }
}
