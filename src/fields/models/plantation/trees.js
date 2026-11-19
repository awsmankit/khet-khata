// Shade tree + understorey families: tea, coffee, rubber, cocoa, clove, nutmeg, cinnamon,
// black pepper on standards, small and large cardamom.
import * as THREE from 'three'
import { merge, prep } from '../../geometry.js'
import { ramp, treeSkeleton } from '../../crops.js'
import {
  TAU, V, barkFn, bead, canvasTexture, floor, grove, leaderTree, leaf, leafAt, leafCluster, lerp, litterTexture,
  mats, part, plantAt, rigid, rod, shapedTube, smooth, solid, star, terrain, tone,
} from './kit.js'
import { coconutPalms } from './palms.js'

const Q = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize())
const UPV = V(0, 1, 0)
const treeWind = { strength: 0.1, flutter: 0.02, refHeight: 8 }

/* ------------------------------------------------------------------ shade trees */
// Silver oak (Grevillea): tall, slender, narrow airy crown of fern-like leaves.
function silverOak(random, origin, { ground = 0, size = 1 } = {}) {
  const tree = leaderTree(random, { origin, height: random.range(14, 18) * size, radius: 0.2 * size, crownBase: random.range(5, 7) * size, spread: random.range(2.2, 2.9) * size, branches: 16, bark: '#4d433a', sweep: 0.75, shape: 'spindle', lean: 0.25 })
  return { ...tree, ground, size }
}

const fernProfile = (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9) * (0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 4.5)))
function fernCluster(random) {
  const parts = []
  for (let index = 0; index < 3; index += 1) {
    const g = leaf({ length: random.range(0.28, 0.36), width: 0.17, rise: random.range(0.1, 0.6), droop: random.range(0.5, 0.9), segments: 9, fold: 0.15, shape: fernProfile, base: '#8f8f8f', tip: '#c4c4c4', rib: '#e0e0e0' })
    parts.push(leafAt(g, V(0, random() * 0.05, 0), (index / 3) * TAU + random.gauss() * 0.3))
  }
  return merge(parts)
}

// A big spreading forest tree (coffee / cardamom shade).
function forestTree(random, origin, { ground = 0, size = 1 } = {}) {
  const ry = random.range(3, 3.8) * size
  const center = origin.clone().add(V(0, random.range(12.5, 15) * size, 0))
  const rx = random.range(5, 6.5) * size
  const skeleton = treeSkeleton(random, { origin, trunkHeight: random.range(8, 10) * size, trunkRadius: 0.38 * size, center, rx, ry, limbs: 5, barkColor: '#5a5046' })
  return { wood: skeleton.branches, crown: { base: center.clone().add(V(0, -ry, 0)), top: center.clone().add(V(0, ry, 0)), radius: rx, shape: 'ellipsoid', shell: 0.35 }, ground, size }
}

const broadCluster = (random, size = 1) => leafCluster(random, { leaves: 5, length: 0.3 * size, width: 0.12 * size, shape: 'elliptic', rise: [0.1, 0.5], droop: [0.5, 0.9], segments: 3 })

function shadeCanopy(ctx, trees, { wind = treeWind, color = '#30522a', clusters = 800, core = '#1c3016' } = {}) {
  const { random } = ctx
  const oaks = trees.filter((tree) => tree.kind === 'oak')
  const broad = trees.filter((tree) => tree.kind !== 'oak')
  if (oaks.length) grove(ctx, oaks, { wind, leafGeometries: [fernCluster(random), fernCluster(random)], clusters: 230, leafColor: '#3f5c30', bark: { roughness: 0.95 }, up: 0.8, leafMaterial: { roughness: 0.6 } })
  if (broad.length) grove(ctx, broad, { wind, leafGeometries: [broadCluster(random), broadCluster(random, 1.1)], clusters, leafColor: color, core })
}

// Places shade trees on a loose grid, returns trunk positions to keep crops away from.
function scatter(random, count, { x0, x1, z0, z1, gap, keep = () => true }) {
  const spots = []
  let guard = 0
  while (spots.length < count && guard < count * 200) {
    guard += 1
    const p = V(random.range(x0, x1), 0, random.range(z0, z1))
    if (!keep(p.x, p.z)) continue
    if (spots.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < gap)) continue
    spots.push(p)
  }
  return spots
}

/* ------------------------------------------------------------------ hill */
// A slope rising away from the camera (towards -z, and a little towards +x), with contour
// coordinate s so rows can follow the contours.
function makeHill({ front, height = 26, scale = 45, tilt = 0.22, wobble = 1, bumps = 0.3 }) {
  const wob = (x) => wobble * (1.6 * Math.sin(x * 0.11 + 0.6) + 0.7 * Math.sin(x * 0.27 + 2.1))
  const wobD = (x) => wobble * (1.6 * 0.11 * Math.cos(x * 0.11 + 0.6) + 0.7 * 0.27 * Math.cos(x * 0.27 + 2.1))
  const slopeS = (x, z) => front - z + tilt * x + wob(x)
  const rampS = (s) => (Math.sqrt(s * s + 36) + s) / 2
  const hillY = (x, z) => {
    const s = slopeS(x, z)
    const h = height * (1 - Math.exp(-rampS(s) / scale)) + bumps * Math.sin(x * 0.31) * Math.sin(s * 0.23) * smooth(-4, 6, s)
    return h * (1 - smooth(46, 60, Math.abs(x)))
  }
  // contour z for a given s, and its slope dz/dx
  const zOf = (x, s) => front + tilt * x + wob(x) - s
  const dzdx = (x) => tilt + wobD(x)
  return { slopeS, hillY, zOf, dzdx }
}

/* ------------------------------------------------------------------ tea */
function teaBush(random, q) {
  const H = random.range(0.86, 0.94)
  const RX = random.range(0.58, 0.66)
  const RZ = random.range(0.44, 0.5)
  const plant = []
  const flush = []
  for (let index = 0; index < 4; index += 1) {
    const a = (index / 4) * TAU + random.gauss() * 0.4
    const base = V(random.gauss() * 0.04, -0.05, random.gauss() * 0.04)
    const top = V(Math.cos(a) * RX * 0.45, 0.32, Math.sin(a) * RZ * 0.45)
    plant.push(shapedTube([base, base.clone().lerp(top, 0.5).add(V(random.gauss() * 0.04, 0, random.gauss() * 0.04)), top], (t) => lerp(0.03, 0.016, t), { radial: 4, tubular: 2, color: '#4f473c' }))
  }
  // the bush body: a boxy, flat-topped mass (plucking table)
  const core = new THREE.SphereGeometry(1, 14, 9)
  const position = core.attributes.position
  const seed = random() * 10
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const r = Math.hypot(x, z)
    const k = r > 1e-5 ? Math.pow(r, 0.55) / r : 0
    const yy = y >= 0 ? Math.pow(y, 0.35) : -Math.pow(-y, 0.8)
    const py = y >= 0 ? lerp(0.5, H - 0.035, yy) : lerp(0.5, 0.08, -yy)
    const bump = 1 + 0.06 * Math.sin(x * 9 + seed) * Math.sin(z * 8 + y * 5)
    position.setXYZ(index, x * k * RX * bump, py + (y > 0.6 ? 0.012 * Math.sin(x * 23 + seed) * Math.sin(z * 19) : 0), z * k * RZ * bump)
  }
  core.computeVertexNormals()
  plant.push(prep(core, '#ffffff', (c, x, y) => c.setScalar(lerp(0.3, 0.92, smooth(0.2, H, y)))))
  // mature leaves lying on the table and on the sides
  for (let index = 0; index < Math.round(30 * q); index += 1) {
    const a = random() * TAU
    const r = Math.sqrt(random()) * 0.92
    const at = V(Math.cos(a) * r * RX, H - 0.03 + random() * 0.025, Math.sin(a) * r * RZ)
    plant.push(leafAt(leaf({ length: random.range(0.09, 0.12), width: 0.046, rise: random.range(0.1, 0.45), droop: 0.45, segments: 2, fold: 0.3, base: '#b8b8b8', tip: '#e0e0e0' }), at, random() * TAU))
  }
  for (let index = 0; index < Math.round(32 * q); index += 1) {
    const a = random() * TAU
    const at = V(Math.cos(a) * RX * 0.93, random.range(0.22, H - 0.06), Math.sin(a) * RZ * 0.93)
    plant.push(leafAt(leaf({ length: random.range(0.09, 0.12), width: 0.046, rise: random.range(-0.2, 0.35), droop: 0.6, segments: 2, fold: 0.3, base: '#888888', tip: '#bababa' }), at, Math.atan2(Math.cos(a) * RX, Math.sin(a) * RZ)))
  }
  // flush: two leaves and a bud standing up from the table
  for (let index = 0; index < Math.round(24 * q); index += 1) {
    const a = random() * TAU
    const r = Math.sqrt(random()) * 0.9
    const at = V(Math.cos(a) * r * RX, H - 0.012, Math.sin(a) * r * RZ)
    const yaw = random() * TAU
    flush.push(leafAt(leaf({ length: random.range(0.05, 0.07), width: 0.03, rise: random.range(0.9, 1.3), droop: random.range(0.5, 0.9), segments: 2, fold: 0.35, base: '#cfcfcf', tip: '#ffffff', rib: null }), at.clone(), yaw))
    flush.push(leafAt(leaf({ length: random.range(0.045, 0.06), width: 0.026, rise: random.range(1.0, 1.35), droop: 0.6, segments: 2, fold: 0.35, base: '#d8d8d8', tip: '#ffffff', rib: null }), at.clone().add(V(0, 0.025, 0)), yaw + Math.PI))
    const bud = prep(new THREE.ConeGeometry(0.006, 0.04, 3), '#ffffff')
    bud.translate(at.x, at.y + 0.055, at.z)
    flush.push(bud)
  }
  return { plant: merge(plant), flush: merge(flush), pivots: { flush: V(0, H, 0) } }
}

// Flush comes in waves (first, second, monsoon, autumn) and is plucked back between them.
const flushWave = (g) => 0.5 + 0.5 * Math.cos(((g - 0.22) / 0.2) * TAU)
const flushSeason = (g) => smooth(0.12, 0.2, g) * (1 - smooth(0.88, 0.95, g))

function buildTea(ctx) {
  const { random, quality } = ctx
  const W = 34
  const D = 40
  const gap = 1.35
  const hill = makeHill({ front: D / 2 })
  const { hillY, slopeS, zOf, dzdx } = hill
  const s0 = -6

  // shade trees first so bushes can leave room for them
  const inside = scatter(random, 10, { x0: -15, x1: 15, z0: -18, z1: 16, gap: 7, keep: (x, z) => !(z > 2 && x < 6) && !(z > 10) })
  const hedgeZone = (x, z) => z < 20 && z > -70 && !(Math.abs(x) < W / 2 + 2.5 && z > -D / 2 - 2.5) && !(x > 0 && z > 12)
  const outside = scatter(random, 10, { x0: -44, x1: 44, z0: -60, z1: 8, gap: 9, keep: hedgeZone })
  const trees = [...inside, ...outside].map((p) => {
    const y = hillY(p.x, p.z)
    const tree = silverOak(random, V(p.x, y, p.z), { ground: y })
    tree.kind = 'oak'
    return tree
  })
  shadeCanopy(ctx, trees, { wind: { ...treeWind, slope: true } })

  // contour rows of bushes
  const spots = []
  const plantGap = 0.82
  for (let s = s0; s < 50; s += gap) {
    for (let x = -W / 2 + 0.4; x < W / 2 - 0.3;) {
      const slope = dzdx(x)
      const z = zOf(x, s) + random.gauss() * 0.03
      if (Math.abs(z) < D / 2 - 0.4 && random() > 0.015 && !inside.some((t) => Math.hypot(t.x - x, t.z - z) < 0.85)) {
        const y = hillY(x, z)
        spots.push({ x, y: y - 0.02, z, ground: y, yaw: -Math.atan2(slope, 1) + random.gauss() * 0.12 + (random() < 0.5 ? Math.PI : 0) })
      }
      x += (plantGap * random.range(0.92, 1.08)) / Math.sqrt(1 + slope * slope)
    }
  }
  const variants = [0, 1, 2].map(() => teaBush(random, Math.max(0.6, quality)))
  const wind = { strength: 0.05, flutter: 0.006, refHeight: 1, slope: true }
  plantAt(ctx, {
    variants, spots, wind, sizes: [0.94, 1.06], tilt: 0.03, jitter: 0.02,
    materialOptions: { roughness: 0.5 },
    plant: { color: (c, g, e) => tone(ramp(c, g, [[0, '#3b5a2c'], [0.18, '#34592a'], [0.3, '#2e5a27'], [0.9, '#2f5a26'], [1, '#3a592b']]), e) },
    attachments: [{
      key: 'flush', wind: { flutter: 0.012 }, materialOptions: { roughness: 0.45 },
      scale: (g) => flushSeason(g) * lerp(0.45, 1, flushWave(g)),
      color: (c, g, e) => tone(c.set('#86ad3a').lerp(new THREE.Color('#b4d455'), flushWave(g)), e),
    }],
  })

  // terrain: rows texture on the hill, grass/road apron in front and round the section
  const rowsTexture = canvasTexture(ctx, 64, 128, (context, rand) => {
    context.fillStyle = '#3e3a27'
    context.fillRect(0, 0, 64, 128)
    for (let index = 0; index < 320; index += 1) {
      context.globalAlpha = 0.3 + rand() * 0.4
      context.fillStyle = ['#5a4a30', '#4a5a2c', '#2e2a1c', '#6a5636'][Math.floor(rand() * 4)]
      context.fillRect(rand() * 64, rand() * 128, 2 + rand() * 3, 1 + rand() * 2)
    }
    context.globalAlpha = 1
    context.fillStyle = '#7d6142'
    context.fillRect(0, 45, 64, 38)
    for (let index = 0; index < 260; index += 1) {
      context.globalAlpha = 0.25 + rand() * 0.35
      context.fillStyle = rand() < 0.5 ? '#a88a62' : '#5a4630'
      context.fillRect(rand() * 64, 45 + rand() * 38, 1 + rand() * 3, 1 + rand() * 2)
    }
    context.globalAlpha = 0.6
    context.fillStyle = '#4e4230'
    context.fillRect(0, 41, 64, 5)
    context.fillRect(0, 82, 64, 5)
  })
  const apronTexture = canvasTexture(ctx, 128, 128, (context, rand) => {
    context.fillStyle = '#5c7434'
    context.fillRect(0, 0, 128, 128)
    for (let index = 0; index < 900; index += 1) {
      context.globalAlpha = 0.25 + rand() * 0.4
      context.fillStyle = ['#7a9444', '#45602a', '#8a7a4a', '#6c8a3a', '#a09050'][Math.floor(rand() * 5)]
      context.fillRect(rand() * 128, rand() * 128, 1, 2 + rand() * 4)
    }
  })
  const rowsMat = new THREE.MeshStandardMaterial({ map: rowsTexture, vertexColors: true, roughness: 1 })
  const apronMat = new THREE.MeshStandardMaterial({ map: apronTexture, vertexColors: true, roughness: 1 })
  ctx.disposables.push(rowsMat, apronMat)
  const inPlot = (x, z) => Math.abs(x) < W / 2 && Math.abs(z) < D / 2
  const road = (x, z) => !inPlot(x, z) && Math.abs(x) < W / 2 + 2.5 && z > -D / 2 - 2.5 && z < D / 2
  terrain(ctx, {
    x0: -60, x1: 60, z0: -72, z1: 42, step: 0.6,
    height: (x, z) => hillY(x, z) + (road(x, z) ? -0.04 : 0),
    region: (x, z) => (inPlot(x, z) || hedgeZone(x, z) ? 0 : 1),
    uv: (x, z) => [x / 3, (slopeS(x, z) - s0) / gap + 0.0],
    color: (c, x, z) => {
      c.setRGB(1, 1, 1).multiplyScalar(0.92 + 0.12 * Math.sin(x * 0.7 + z * 0.3) * Math.sin(z * 0.5))
      if (road(x, z)) c.multiply(new THREE.Color('#c9a77c'))
    },
    materials: [rowsMat, apronMat],
  })

  // far sections of the estate: low-poly hedgerows on the same contours
  const hedgePositions = []
  const hedgeColors = []
  const hedgeIndex = []
  const profile = [[-0.5, 0], [-0.48, 0.45], [-0.4, 0.85], [-0.2, 1], [0.2, 1], [0.4, 0.85], [0.48, 0.45], [0.5, 0]]
  const shadeAt = [new THREE.Color('#22351b'), new THREE.Color('#2c4f24'), new THREE.Color('#3f6a2a'), new THREE.Color('#6a9434'), new THREE.Color('#6a9434'), new THREE.Color('#3f6a2a'), new THREE.Color('#2c4f24'), new THREE.Color('#22351b')]
  const color = new THREE.Color()
  const buildRun = (run) => {
    if (run.length < 2) return
    const start = hedgePositions.length / 3
    run.forEach((p, i) => {
      const prev = run[Math.max(0, i - 1)]
      const next = run[Math.min(run.length - 1, i + 1)]
      const tx = next.x - prev.x
      const tz = next.z - prev.z
      const len = Math.hypot(tx, tz) || 1
      const nx = -tz / len
      const nz = tx / len
      const yc = hillY(p.x, p.z)
      const bump = 0.9 + 0.12 * Math.sin(p.x * 2.3 + p.z) * Math.sin(p.x * 0.9)
      const n = 0.9 + 0.2 * Math.sin(p.x * 1.7 + p.z * 2.1)
      profile.forEach(([u, v], j) => {
        const x = p.x + nx * u * 1.05
        const z = p.z + nz * u * 1.05
        const y = v === 0 ? hillY(x, z) - 0.08 : yc + v * 0.9 * bump
        hedgePositions.push(x, y, z)
        color.copy(shadeAt[j]).multiplyScalar(n)
        hedgeColors.push(color.r, color.g, color.b)
      })
    })
    for (let i = 0; i < run.length - 1; i += 1) {
      for (let j = 0; j < profile.length - 1; j += 1) {
        const a = start + i * profile.length + j
        const b = a + profile.length
        hedgeIndex.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  for (let s = s0; s < 96; s += gap) {
    let run = []
    for (let x = -58; x <= 58; x += 1.2) {
      const z = zOf(x, s)
      if (hedgeZone(x, z)) run.push({ x, z })
      else { buildRun(run); run = [] }
    }
    buildRun(run)
  }
  const hedgeGeometry = new THREE.BufferGeometry()
  hedgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(hedgePositions, 3))
  hedgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(hedgeColors, 3))
  hedgeGeometry.setIndex(hedgeIndex)
  hedgeGeometry.computeVertexNormals()
  const hedgeMat = rigid(ctx, { roughness: 0.85, side: THREE.DoubleSide })
  const hedges = new THREE.Mesh(hedgeGeometry, hedgeMat.material)
  hedges.castShadow = true
  hedges.receiveShadow = true
  ctx.addMesh(hedges)

  const camera = V(12.5, 0, 26)
  camera.y = hillY(camera.x, camera.z) + 3.0
  const target = V(-4, 0, -2)
  target.y = hillY(target.x, target.z) + 0.4
  return {
    plot: { width: W, depth: D }, soil: 'none', bund: false, grass: false, scarecrow: false,
    camera: { position: camera, target },
    update: (g) => { hedgeMat.material.color.setRGB(1, 1, 1).lerp(color.set('#d6e8a8'), flushSeason(g) * flushWave(g) * 0.25).multiplyScalar(lerp(0.92, 1.05, flushSeason(g))) },
  }
}

/* ------------------------------------------------------------------ coffee */
function coffeeBush(random, q) {
  // An upright stem with tiers of near-horizontal, drooping laterals (gaps between tiers);
  // leaf pairs held flat along each lateral, cherries clustered at the older nodes.
  const leaves = []
  const wood = []
  const flowers = []
  const cherries = [[], []]
  const H = random.range(1.5, 1.85)
  const stems = random() < 0.35 ? 2 : 1
  const nodes = []
  for (let s = 0; s < stems; s += 1) {
    const a0 = random() * TAU
    const lean = stems > 1 ? 0.12 : 0.04
    const base = V(random.gauss() * 0.04, 0, random.gauss() * 0.04)
    const top = base.clone().add(V(Math.cos(a0) * H * lean, H, Math.sin(a0) * H * lean))
    const stemPoints = [base, base.clone().lerp(top, 0.5).add(V(random.gauss() * 0.03, 0, random.gauss() * 0.03)), top]
    wood.push(shapedTube(stemPoints, (t) => lerp(0.024, 0.008, t), { radial: 5, tubular: 4, colorFn: barkFn('#6b5d4a', 0.3) }))
    const stem = new THREE.CatmullRomCurve3(stemPoints)
    let azimuth = random() * TAU
    for (let y = random.range(0.2, 0.28); y < H - 0.1; y += random.range(0.09, 0.13) * (stems > 1 ? 1.3 : 1) / Math.sqrt(q)) {
      azimuth += Math.PI / 2 + random.gauss() * 0.25
      const at = stem.getPointAt(y / H)
      const f = y / H
      for (const side of [0, Math.PI]) {
        if (random() < 0.08) continue
        const a = azimuth + side + random.gauss() * 0.2
        const out = V(Math.cos(a), 0, Math.sin(a))
        const L = lerp(0.85, 0.25, Math.pow(f, 1.1)) * random.range(0.7, 1.15)
        const curvePoints = [at, at.clone().addScaledVector(out, L * 0.4).add(V(0, 0.03, 0)), at.clone().addScaledVector(out, L * 0.75).add(V(0, -0.03 - 0.06 * L, 0)), at.clone().addScaledVector(out, L).add(V(0, -0.06 - 0.2 * L, 0))]
        wood.push(shapedTube(curvePoints, (t) => lerp(0.009, 0.004, t), { radial: 3, tubular: 4, colorFn: barkFn('#6f6250', 0.2) }))
        const curve = new THREE.CatmullRomCurve3(curvePoints)
        const pairs = Math.max(3, Math.round(L / 0.04))
        for (let k = 1; k <= pairs; k += 1) {
          const u = k / pairs
          const p = curve.getPointAt(u)
          const tangent = curve.getTangentAt(u)
          const yawT = Math.atan2(tangent.x, tangent.z)
          const young = u > 0.8
          const size = young ? 0.65 : 1
          for (const sign of [-1, 1]) {
            const g = leaf({ length: 0.21 * size * random.range(0.85, 1.12), width: 0.085 * size, rise: random.range(-0.05, 0.3), droop: random.range(0.35, 0.7), segments: 2, fold: 0.35, base: '#a8a8a8', tip: young ? '#f2f2f2' : '#d4d4d4', rib: '#f4f4f4', curl: 0.15 })
            leaves.push(leafAt(g, p, yawT + sign * random.range(1.0, 1.35)))
          }
          if (u > 0.2 && u < 0.75 && k % 5 === 0) nodes.push({ p: p.clone(), axis: tangent.clone() })
        }
      }
    }
    for (let k = 0; k < 3; k += 1) leaves.push(leafAt(leaf({ length: 0.1, width: 0.04, rise: 0.9, droop: 0.6, segments: 3, fold: 0.3, base: '#c8c8c8', tip: '#f4f4f4' }), top.clone().add(V(0, -k * 0.04, 0)), random() * TAU))
  }
  nodes.forEach(({ p, axis }, index) => {
    const ref = Math.abs(axis.y) < 0.9 ? UPV : V(1, 0, 0)
    const u = axis.clone().cross(ref).normalize()
    const w = axis.clone().cross(u).normalize()
    const berries = 5 + (index % 2)
    for (let i = 0; i < berries; i += 1) {
      const a = (i / berries) * TAU + random.gauss() * 0.3
      const dir = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a))
      const at = p.clone().addScaledVector(dir, 0.016).addScaledVector(axis, random.gauss() * 0.012)
      const berry = bead(0.0135, 0.0155, 0.0135, { detail: 0, colorFn: (c) => c.setScalar(random.range(0.84, 1.04)) })
      berry.applyQuaternion(Q(UPV, dir))
      berry.translate(at.x, at.y, at.z)
      cherries[index % 2].push(berry)
      if (i < 5) {
        const flower = star({ radius: 0.016, petals: 5, cup: 0.3, color: '#ffffff', eye: '#efe8cc' })
        flower.applyQuaternion(Q(UPV, dir.clone().add(V(0, 0.6, 0))))
        flower.translate(at.x + dir.x * 0.008, at.y + dir.y * 0.008 + 0.004, at.z + dir.z * 0.008)
        flowers.push(flower)
      }
    }
  })
  const pivot = V(0, H * 0.5, 0)
  return { plant: merge(leaves), wood: merge(wood), flowers: merge(flowers), cherries: merge(cherries[0]), late: merge(cherries[1]), pivots: { wood: V(0, 0, 0), flowers: pivot, cherries: pivot, late: pivot } }
}

function buildCoffee(ctx) {
  const { random, quality } = ctx
  const W = 22
  const D = 26
  const treeSpots = [V(-7.2, 0, -8.5), V(8.6, 0, -4), V(-6.2, 0, 7.5), V(9.6, 0, 6.5), V(-10.2, 0, -1), V(2.4, 0, -11.5)]
  const trees = treeSpots.map((p, index) => {
    const origin = p.clone().add(V(random.gauss() * 0.3, 0, random.gauss() * 0.3))
    if (index % 3 === 1) { const t = silverOak(random, origin, { size: 1.05 }); t.kind = 'oak'; return t }
    return forestTree(random, origin, { size: random.range(0.9, 1.05) })
  })
  shadeCanopy(ctx, trees, { clusters: 750 })
  const spots = []
  for (let x = -W / 2 + 1.2; x < W / 2; x += 2.4) {
    for (let z = -D / 2 + 0.8; z < D / 2; z += 1.45 / Math.sqrt(Math.max(quality, 0.7))) {
      const px = x + random.gauss() * 0.1
      const pz = z + random.gauss() * 0.15
      if (treeSpots.some((t) => Math.hypot(t.x - px, t.z - pz) < 1.3)) continue
      spots.push({ x: px, y: 0, z: pz })
    }
  }
  const variants = [0, 1, 2].map(() => coffeeBush(random, Math.max(0.65, quality)))
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.1, flutter: 0.012, refHeight: 1.7 },
    materialOptions: { roughness: 0.62, metalness: 0, envMapIntensity: 0.5 },
    plant: { color: (c, g, e) => tone(c.set('#4a7a2c'), e) },
    attachments: [
      { key: 'wood', materialOptions: { roughness: 0.9 } },
      { key: 'flowers', scale: (g) => smooth(-0.05, 0.0, g) * (1 - smooth(0.07, 0.14, g)), color: (c, g, e) => tone(c.set('#fbfaf2'), e), materialOptions: { roughness: 0.7, emissive: '#2a2a26' } },
      { key: 'cherries', scale: (g) => lerp(0.35, 1, smooth(0.1, 0.55, g)) * smooth(0.06, 0.14, g) * (1 - smooth(0.95, 1, g)), color: (c, g, e) => tone(ramp(c, g, [[0.1, '#7aa23e'], [0.55, '#4f8a2c'], [0.7, '#8aa035'], [0.78, '#d04a2a'], [0.88, '#b2202a'], [1, '#7a1a22']]), e), materialOptions: { roughness: 0.3, side: THREE.FrontSide } },
      { key: 'late', scale: (g) => lerp(0.35, 1, smooth(0.1, 0.55, g)) * smooth(0.06, 0.14, g) * (1 - smooth(0.95, 1, g)), color: (c, g, e) => tone(ramp(c, g, [[0.1, '#7aa23e'], [0.6, '#4f8a2c'], [0.8, '#6f9a32'], [0.9, '#c0522a'], [1, '#a8202a']]), e), materialOptions: { roughness: 0.3, side: THREE.FrontSide } },
    ],
  })
  floor(ctx, { width: W + 6, depth: D + 6, texture: litterTexture(ctx), tint: '#ffffff', edge: '#7e8f4c', fade: 3 })
  return { plot: { width: W, depth: D }, soil: 'none', bund: false, camera: { position: V(12.6, 1.6, 16.2), target: V(2.5, 1.65, 3.5) } }
}

/* ------------------------------------------------------------------ rubber */
function trifoliate(random) {
  const parts = []
  for (let leafIndex = 0; leafIndex < 2; leafIndex += 1) {
    const yaw = leafIndex * Math.PI + random.gauss() * 0.4
    const dir = V(Math.sin(yaw), 0.35, Math.cos(yaw)).normalize()
    const end = dir.clone().multiplyScalar(0.12)
    parts.push(rod(V(), end, 0.004, { color: '#8a8a6a' }))
    for (let k = -1; k <= 1; k += 1) {
      const g = leaf({ length: random.range(0.16, 0.2), width: 0.065, rise: random.range(0.05, 0.35), droop: random.range(0.4, 0.8), segments: 3, fold: 0.25, base: '#9a9a9a', tip: '#cfcfcf' })
      parts.push(leafAt(g, end, yaw + k * 0.75))
    }
  }
  return merge(parts)
}

function buildRubber(ctx) {
  const { random } = ctx
  const trees = []
  const tapping = []
  const latex = []
  const guards = []
  for (let x = -12.5; x <= 12.6; x += 5) {
    for (let z = -12.6; z <= 12.7; z += 3.6) {
      const origin = V(x + random.gauss() * 0.12, 0, z + random.gauss() * 0.12)
      const height = random.range(15, 18)
      const radius = random.range(0.15, 0.19)
      const tree = leaderTree(random, { origin, height, radius, crownBase: random.range(6.5, 8), spread: random.range(2.8, 3.4), branches: 9, bark: '#6e665a', sweep: 0.9, shape: 'ellipsoid', lean: 0.08, twigs: 2 })
      tree.offset = random.gauss() * 0.015
      trees.push(tree)
      // tapping panel: half spiral, sloping down left to right, renewed bark above the cut
      const face = Math.PI / 4 + random.gauss() * 0.5
      const at = (y) => tree.trunk.getPointAt(Math.min(1, (y + 0.15) / (height + 0.15)))
      const rAt = (y) => radius * lerp(1, 0.1, Math.pow((y + 0.15) / (height + 0.15), 0.9)) + 0.004
      const cutY = (u) => 1.45 - u * 0.34
      const point = (u, y, extra = 0) => {
        const phi = face - Math.PI / 2 + u * Math.PI
        const c = at(y)
        const r = rAt(y) + extra
        return V(c.x + Math.cos(phi) * r, y, c.z + Math.sin(phi) * r)
      }
      const panel = []
      const panelColor = []
      const panelIndex = []
      const steps = 10
      const bandRows = [[0, '#efe9da'], [0.014, '#efe9da'], [0.02, '#c9b18a'], [0.36, '#9c8566']]
      for (let i = 0; i <= steps; i += 1) {
        const u = i / steps
        bandRows.forEach(([dy, hex]) => {
          const p = point(u, cutY(u) + dy, 0.002)
          panel.push(p.x, p.y, p.z)
          const c = new THREE.Color(hex)
          panelColor.push(c.r, c.g, c.b)
        })
      }
      for (let i = 0; i < steps; i += 1) {
        for (let j = 0; j < bandRows.length - 1; j += 1) {
          const a = i * bandRows.length + j
          const b = a + bandRows.length
          panelIndex.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
      const panelGeometry = new THREE.BufferGeometry()
      panelGeometry.setAttribute('position', new THREE.Float32BufferAttribute(panel, 3))
      panelGeometry.setAttribute('color', new THREE.Float32BufferAttribute(panelColor, 3))
      panelGeometry.setIndex(panelIndex)
      panelGeometry.computeVertexNormals()
      tapping.push(prep(panelGeometry))
      // channel, spout, cup and wire at the low end of the cut
      const low = point(1, cutY(1))
      const cupY = cutY(1) - 0.24
      const phiEnd = face + Math.PI / 2
      const outDir = V(Math.cos(phiEnd), 0, Math.sin(phiEnd))
      tapping.push(rod(low, point(1, cupY + 0.1, 0.003), 0.004, { radial: 3, color: '#ece6d4' }))
      tapping.push(rod(point(1, cupY + 0.1, 0.003), point(1, cupY + 0.08, 0.05), 0.006, { radial: 3, color: '#9aa0a4' }))
      const cupCenter = at(cupY).addScaledVector(outDir, rAt(cupY) + 0.06)
      const cup = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.035, 0.005), new THREE.Vector2(0.052, 0.035), new THREE.Vector2(0.058, 0.065)], 9)
      cup.translate(cupCenter.x, cupY, cupCenter.z)
      tapping.push(prep(cup, '#5a3c24', (c, x, y) => c.set('#5a3c24').multiplyScalar(0.8 + (y - cupY) * 4)))
      const wire = new THREE.TorusGeometry(rAt(cupY + 0.06) + 0.004, 0.0025, 3, 16)
      wire.rotateX(Math.PI / 2)
      const wc = at(cupY + 0.06)
      wire.translate(wc.x, cupY + 0.06, wc.z)
      tapping.push(prep(wire, '#7a7a72'))
      const milk = new THREE.CircleGeometry(0.048, 9)
      milk.rotateX(-Math.PI / 2)
      milk.translate(cupCenter.x, cupY + 0.045, cupCenter.z)
      latex.push(prep(milk, '#f6f3ea'))
      const guardY = cutY(0) + 0.48
      const guard = new THREE.CylinderGeometry(rAt(guardY) + 0.01, rAt(guardY) + 0.13, 0.13, 12, 1, true)
      const gc = at(guardY)
      guard.translate(gc.x, guardY - 0.06, gc.z)
      guards.push(prep(guard, '#9fb2c2'))
    }
  }
  const leafColor = (c, g, e) => tone(ramp(c, g, [[0, '#a8622a'], [0.06, '#b27a2c'], [0.1, '#8a6a30'], [0.13, '#a39a48'], [0.2, '#78a23c'], [0.32, '#3a6a2a'], [0.42, '#2f5a24'], [0.86, '#2f5a24'], [0.95, '#6a6a2a'], [1, '#9a6a2a']]), e)
  const leafScale = (g) => 1 - smooth(0.06, 0.105, g) + smooth(0.115, 0.2, g)
  const items = grove(ctx, trees, { wind: treeWind, leafGeometries: [trifoliate(random), trifoliate(random)], clusters: 430, leafColor, leafScale, bark: { roughness: 0.9, envMapIntensity: 0.4 }, core: null, up: 0.6 })
  items.forEach((entry) => { entry.offset = entry.tree.offset })
  const tapMesh = solid(ctx, tapping, rigid(ctx, { roughness: 0.75 }))
  const latexMesh = solid(ctx, latex, rigid(ctx, { roughness: 0.4 }), { castShadow: false })
  const guardMesh = solid(ctx, guards, rigid(ctx, { roughness: 0.35, transparent: true, opacity: 0.8 }))
  ctx.groundCover = 'orchard'
  return {
    plot: { width: 30, depth: 30 }, soil: 'orchard', bund: false,
    camera: { position: V(18, 1.8, 23), target: V(1, 3.4, 1) },
    update: (g) => {
      latexMesh.visible = g > 0.2 && g < 0.97
      guardMesh.visible = g > 0.42 && g < 0.7
      tapMesh.visible = true
    },
  }
}

/* ------------------------------------------------------------------ cocoa */
function cocoaPod() {
  const profile = []
  const length = 0.2
  for (let index = 0; index <= 9; index += 1) {
    const t = index / 9
    const r = 0.048 * Math.pow(Math.sin(Math.PI * Math.min(0.995, t * 0.97 + 0.015)), 0.65) * (1 + 0.18 * (0.5 - t))
    profile.push(new THREE.Vector2(Math.max(r, 0.002), -t * length))
  }
  const geometry = new THREE.LatheGeometry(profile, 10)
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const a = Math.atan2(z, x)
    const k = 1 + 0.09 * Math.cos(a * 10)
    const y = position.getY(index)
    position.setXYZ(index, x * k + 0.012 * Math.pow(-y / length, 2), y, z * k)
  }
  geometry.computeVertexNormals()
  const body = prep(geometry, '#ffffff', (c, x, y, z) => c.setScalar(0.82 + 0.18 * (Math.cos(Math.atan2(z, x) * 10) * 0.5 + 0.5)))
  const stalk = prep(new THREE.CylinderGeometry(0.006, 0.008, 0.04, 4, 1, true), '#5a5a3a')
  stalk.translate(0, 0.012, 0)
  return merge([body, stalk])
}

function cocoaTree(random, origin) {
  const wood = []
  const bark = barkFn('#5e5044', 0.3)
  const jorquette = origin.clone().add(V(random.gauss() * 0.05, random.range(1.1, 1.35), random.gauss() * 0.05))
  wood.push(shapedTube([origin.clone().add(V(0, -0.1, 0)), origin.clone().lerp(jorquette, 0.5), jorquette], (t) => lerp(0.1, 0.08, t), { radial: 7, tubular: 3, colorFn: bark }))
  const limbs = []
  const fan = 4 + (random() < 0.5 ? 1 : 0)
  for (let index = 0; index < fan; index += 1) {
    const a = (index / fan) * TAU + random.gauss() * 0.3
    const out = V(Math.cos(a), 0, Math.sin(a))
    const p1 = jorquette.clone().addScaledVector(out, 0.7).add(V(0, 0.6, 0))
    const p2 = jorquette.clone().addScaledVector(out, 1.6).add(V(0, 1.4, 0))
    wood.push(shapedTube([jorquette, p1, p2], (t) => lerp(0.06, 0.025, t), { radial: 5, tubular: 4, colorFn: bark }))
    limbs.push([jorquette, p1, p2])
    for (let k = 0; k < 2; k += 1) {
      const a2 = a + (k ? 0.5 : -0.5)
      const from = p1.clone().lerp(p2, 0.6)
      const end = from.clone().add(V(Math.cos(a2) * 0.9, random.range(0.4, 0.9), Math.sin(a2) * 0.9))
      wood.push(shapedTube([from, from.clone().lerp(end, 0.5).add(V(0, 0.1, 0)), end], (t) => lerp(0.025, 0.01, t), { radial: 4, tubular: 2, colorFn: bark }))
    }
  }
  const center = jorquette.clone().add(V(0, 1.75, 0))
  return { wood, limbs, jorquette, origin, crown: { base: center.clone().add(V(0, -1.4, 0)), top: center.clone().add(V(0, 1.2, 0)), radius: random.range(2.0, 2.4), shape: (f) => Math.sqrt(Math.max(0, 1 - f * f)) * Math.min(1, (f + 0.2) * 2.2) * (1 + 0.12 * Math.sin(f * 9)), shell: 0.5 } }
}

function buildCocoa(ctx) {
  const { random } = ctx
  const palmSpots = []
  for (const x of [-7.5, 0, 7.5]) for (const z of [-7.5, 0, 7.5]) palmSpots.push({ x: x + random.gauss() * 0.3, y: 0, z: z + random.gauss() * 0.3 })
  coconutPalms(ctx, palmSpots, { heights: [13, 15, 16.5] })
  const trees = []
  for (const x of [-11.25, -3.75, 3.75, 11.25]) for (const z of [-11.25, -3.75, 3.75, 11.25]) trees.push(cocoaTree(random, V(x + random.gauss() * 0.3, 0, z + random.gauss() * 0.3)))
  const leaves = (big) => leafCluster(random, { leaves: 5, length: big ? 0.3 : 0.24, width: 0.1, shape: 'elliptic', rise: [-0.3, 0.2], droop: [0.8, 1.3], segments: 4, fold: 0.2, lift: 0.08 })
  const items = grove(ctx, trees, { wind: { ...treeWind, refHeight: 4 }, leafGeometries: [leaves(true), leaves(false)], clusters: 480, core: '#1d3417', coreFill: 0.55, up: 0.3, leafColor: (c, g, e) => tone(e.flush ? c.set('#94503a').lerp(new THREE.Color('#5a7a30'), smooth(0.15, 0.6, (g + e.flush) % 1)) : c.set('#2d5226'), e) })
  items.forEach((entry) => { entry.flush = random() < 0.1 ? random() : 0 })
  // pods hang straight from the trunk and main limbs; tiny flower cushions too
  const pods = []
  const blooms = []
  trees.forEach((tree) => {
    const addPod = (p, out) => {
      const q = Q(V(0, -1, 0), V(out.x * 0.35, -1, out.z * 0.35))
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(UPV, random() * TAU))
      const entry = { p: p.clone().addScaledVector(out, 0.03), q, s: random.range(0.85, 1.15), offset: random.gauss() * 0.05, tone: random.gauss() * 0.06, kind: random() < 0.6 ? 0 : 1 }
      pods.push(entry)
    }
    for (let index = 0; index < 8; index += 1) {
      const a = random() * TAU
      const out = V(Math.cos(a), 0, Math.sin(a))
      const y = random.range(0.35, 1.1)
      const c = tree.origin.clone().lerp(tree.jorquette, y / tree.jorquette.y)
      addPod(c.addScaledVector(out, 0.1).setY(y), out)
      if (index < 6) blooms.push({ p: c.clone().addScaledVector(out, 0.02).setY(y + random.range(-0.2, 0.2)), q: Q(UPV, out.clone().add(V(0, 0.4, 0))), s: random.range(0.8, 1.2), offset: 0, tone: 0 })
    }
    tree.limbs.forEach((limb) => {
      const curve = new THREE.CatmullRomCurve3(limb)
      const t = random.range(0.15, 0.45)
      const p = curve.getPointAt(t)
      const a = random() * TAU
      const out = V(Math.cos(a), 0, Math.sin(a))
      addPod(p.addScaledVector(out, 0.04), out)
    })
  })
  const podMats = mats(ctx, { ...treeWind, refHeight: 4, flutter: 0.004 }, { roughness: 0.55, side: THREE.FrontSide })
  const podGeometry = [cocoaPod(), cocoaPod()]
  podGeometry.forEach((geometry, variant) => part(ctx, podMats, geometry, pods.filter((_, index) => index % 2 === variant), {
    scale: (g) => lerp(0.2, 1, smooth(0.15, 0.62, g)) * smooth(0.1, 0.18, g) * (1 - smooth(0.95, 1, g)),
    color: (c, g, e) => tone(e.kind ? ramp(c, g, [[0.15, '#7a2f3c'], [0.6, '#6e2a3a'], [0.75, '#a2402e'], [0.88, '#d0632a'], [1, '#c0522a']]) : ramp(c, g, [[0.15, '#8ab04a'], [0.6, '#5f9234'], [0.74, '#a6ae38'], [0.86, '#e2b72e'], [1, '#d8a02a']]), e),
  }))
  const cushion = merge(Array.from({ length: 6 }, (_, index) => {
    const g = star({ radius: 0.009, petals: 5, cup: 0.4, color: '#f4e6e0', eye: '#c88a9a' })
    g.applyQuaternion(Q(UPV, V(random.gauss() * 0.5, 1, random.gauss() * 0.5)))
    g.translate(Math.cos(index) * 0.015, index * 0.006, Math.sin(index) * 0.015)
    return g
  }))
  part(ctx, mats(ctx, treeWind, { roughness: 0.8 }), cushion, blooms, { scale: (g) => smooth(-0.05, 0.0, g) * (1 - smooth(0.16, 0.24, g)), color: (c, g, e) => tone(c.set('#ffffff'), e) })
  floor(ctx, { width: 30, depth: 30, texture: litterTexture(ctx), edge: '#7e8f4c', fade: 3 })
  return { plot: { width: 24, depth: 24 }, soil: 'none', bund: false, camera: { position: V(18.5, 2.1, 20), target: V(6.5, 1.9, 7) } }
}

/* ------------------------------------------------------------------ clove & nutmeg */
const glossyCluster = (random, size = 1) => leafCluster(random, { leaves: 7, length: 0.13 * size, width: 0.05 * size, shape: 'elliptic', rise: [0.1, 0.6], droop: [0.4, 0.8], segments: 3, fold: 0.3 })

const cloveShape = (f) => Math.min(1, (f + 0.1) * 3.5) * Math.pow(Math.max(0, 1 - Math.pow(f, 1.3)), 0.75) * (1 + 0.1 * Math.sin(f * 14) + 0.06 * Math.sin(f * 31))

function cloveBuds(random) {
  const parts = []
  const hub = V(0, 0.02, 0)
  parts.push(rod(V(), hub, 0.003, { color: '#8a9a5a' }))
  for (let index = 0; index < 13; index += 1) {
    const a = random() * TAU
    const r = Math.sqrt(random()) * 0.045
    const tip = V(Math.cos(a) * r, 0.05 + (0.045 - r) * 0.4 + random() * 0.01, Math.sin(a) * r)
    parts.push(rod(hub, tip, 0.0035, { radial: 4, taper: 1.4, color: '#ffffff' }))
    const head = bead(0.0045, 0.0045, 0.0045, { detail: 0, colorFn: (c) => c.setScalar(0.9) })
    head.translate(tip.x, tip.y + 0.004, tip.z)
    parts.push(head)
  }
  return merge(parts)
}

function cloveBloom(random) {
  const parts = []
  for (let index = 0; index < 8; index += 1) {
    const a = random() * TAU
    const r = Math.sqrt(random()) * 0.04
    const g = star({ radius: 0.012, petals: 8, cup: 0.6, width: 0.6, color: '#fbf6e6', eye: '#e6d79a' })
    g.translate(Math.cos(a) * r, 0.065 + random() * 0.01, Math.sin(a) * r)
    parts.push(g)
  }
  return merge(parts)
}

function buildClove(ctx) {
  const { random } = ctx
  const trees = []
  for (const x of [-7, 0, 7]) {
    for (const z of [-7, 0, 7]) {
      const origin = V(x + random.gauss() * 0.3, 0, z + random.gauss() * 0.3)
      const size = random.range(0.9, 1.1)
      trees.push(leaderTree(random, { origin, height: 10 * size, radius: 0.16 * size, crownBase: 0.9, spread: 2.8 * size, branches: 24, bark: '#6a5a48', sweep: 0.55, shape: cloveShape, lean: 0.12, reachScale: 0.72, twigs: 0 }))
      ctx.basin(origin, 1.2)
    }
  }
  const items = grove(ctx, trees, { wind: treeWind, leafGeometries: [glossyCluster(random, 1.3), glossyCluster(random, 1.45)], clusters: 1300, core: '#2a4a22', coreFill: 0.4, shell: 0.55, leafColor: (c, g, e) => tone(c.set(e.flushy ? '#9a5a42' : '#3f6f2c'), e), leafMaterial: { roughness: 0.4, metalness: 0.02 }, up: 0.6 })
  items.forEach((entry) => { entry.flushy = random() < 0.06 })
  const tips = items.filter((entry) => entry.depth > 0.86 && entry.height > 0.08 && random() < 0.2).map((entry) => ({ p: entry.p.clone().addScaledVector(entry.normal, 0.06), q: Q(UPV, entry.normal.clone().add(V(0, 1.2, 0))), s: random.range(1.2, 1.6), offset: random.gauss() * 0.03, tone: random.gauss() * 0.06, bloom: random() < 0.45 }))
  const budMats = mats(ctx, treeWind, { roughness: 0.6 })
  const budScale = (g) => lerp(0.3, 1, smooth(0.02, 0.4, g))
  const budsA = tips.filter((_, index) => index % 2 === 0)
  const budsB = tips.filter((_, index) => index % 2 === 1)
  const budColor = (c, g, e) => tone(ramp(c, g, [[0, '#8aa048'], [0.45, '#9ca444'], [0.6, '#c8906a'], [0.72, '#d86a5e'], [0.82, '#c4463a'], [1, '#a03a30']]), e)
  part(ctx, budMats, cloveBuds(random), budsA, { scale: (g, e) => budScale(g) * (e.bloom ? 1 - smooth(0.86, 0.92, g) : 1), color: budColor })
  part(ctx, budMats, cloveBuds(random), budsB, { scale: (g, e) => budScale(g) * (e.bloom ? 1 - smooth(0.86, 0.92, g) : 1), color: budColor })
  part(ctx, mats(ctx, treeWind, { roughness: 0.8, emissive: '#2a2618' }), cloveBloom(random), tips.filter((entry) => entry.bloom), { scale: (g) => smooth(0.86, 0.93, g), color: (c, g, e) => tone(c.set('#ffffff'), e) })
  ctx.groundCover = 'orchard'
  return { plot: { width: 21, depth: 21 }, soil: 'orchard', camera: { position: V(15.5, 3.2, 18.5), target: V(1, 4.4, 2) } }
}

function nutmegWhole(random) {
  const profile = []
  for (let index = 0; index <= 8; index += 1) {
    const t = index / 8
    const r = 0.042 * Math.pow(Math.sin(Math.PI * Math.min(0.995, t * 0.98 + 0.01)), 0.6) * (1 + 0.08 * (t - 0.5))
    profile.push(new THREE.Vector2(Math.max(r, 0.002), -0.03 - t * 0.085))
  }
  const fruit = new THREE.LatheGeometry(profile, 10)
  const body = prep(fruit, '#ffffff', (c, x, y, z) => c.setScalar(Math.abs(x) < 0.004 && z > 0 ? 0.7 : random.range(0.92, 1.02)))
  const stalk = prep(new THREE.CylinderGeometry(0.003, 0.004, 0.035, 4, 1, true), '#5a5a3a')
  stalk.translate(0, -0.015, 0)
  return merge([body, stalk])
}

function nutmegSplit() {
  // pericarp split in two halves gaping open: brown seed wrapped in red, lacy mace
  const parts = []
  const center = V(0, -0.072, 0)
  for (const side of [-1, 1]) {
    const shell = new THREE.SphereGeometry(0.042, 10, 7, side > 0 ? 0 : Math.PI, Math.PI)
    shell.scale(1, 1.05, 1)
    shell.rotateZ(side * 0.45)
    shell.translate(center.x + side * 0.012, center.y, center.z)
    parts.push(prep(shell, '#e8cf6a', (c, x) => c.set(x * side > 0.03 ? '#d9bc58' : '#efe2a8')))
  }
  const seed = new THREE.SphereGeometry(0.024, 8, 6)
  seed.scale(1, 1.2, 1)
  seed.translate(center.x, center.y, center.z)
  parts.push(prep(seed, '#4a2a1a'))
  for (let index = 0; index < 7; index += 1) {
    const a = (index / 7) * TAU
    const points = [-1, -0.5, 0, 0.5, 1].map((t) => {
      const r = 0.026 * Math.sqrt(1 - t * t * 0.8) + 0.002
      return V(Math.cos(a + t * 0.6) * r, center.y + t * 0.03, Math.sin(a + t * 0.6) * r)
    })
    parts.push(shapedTube(points, () => 0.0035, { radial: 3, tubular: 4, color: '#c4141e' }))
  }
  const stalk = prep(new THREE.CylinderGeometry(0.003, 0.004, 0.035, 4, 1, true), '#5a5a3a')
  stalk.translate(0, -0.015, 0)
  parts.push(stalk)
  return merge(parts)
}

function buildNutmeg(ctx) {
  const { random } = ctx
  const trees = []
  for (const x of [-8, 0, 8]) {
    for (const z of [-8, 0, 8]) {
      const origin = V(x + random.gauss() * 0.3, 0, z + random.gauss() * 0.3)
      const size = random.range(0.9, 1.1)
      const tree = leaderTree(random, { origin, height: 9 * size, radius: 0.19 * size, crownBase: 0.9, spread: 3.7 * size, branches: 22, bark: '#4e4438', sweep: 0.35, reachScale: 0.72, twigs: 0, shape: (f) => Math.pow(Math.max(0, 1 - Math.pow(2 * f - 0.8, 2) / 1.8), 0.6) * Math.min(1, (f + 0.12) * 3) * (1 + 0.08 * Math.sin(f * 17)), lean: 0.12 })
      trees.push(tree)
      ctx.basin(origin, 1.3)
    }
  }
  const items = grove(ctx, trees, { wind: treeWind, leafGeometries: [glossyCluster(random, 1.1), glossyCluster(random, 1.2)], clusters: 1750, core: null, shell: 0.65, leafColor: '#3f6f2c', leafMaterial: { roughness: 0.4, metalness: 0.03 }, up: 0.5 })
  const fruitItems = items.filter((entry) => entry.height < 0.65 && entry.height > 0.06 && entry.depth > 0.8 && random() < 0.12).map((entry) => ({
    p: entry.p.clone().addScaledVector(entry.normal, 0.12).add(V(0, -0.02, 0)), q: new THREE.Quaternion().setFromAxisAngle(UPV, random() * TAU),
    s: random.range(0.85, 1.12), offset: random.gauss() * 0.04, tone: random.gauss() * 0.06, split: random() < 0.35,
  }))
  const grow = (g) => lerp(0.25, 1, smooth(0.15, 0.6, g)) * smooth(0.12, 0.2, g)
  const fruitMats = mats(ctx, { ...treeWind, flutter: 0.006 }, { roughness: 0.45, side: THREE.FrontSide })
  part(ctx, fruitMats, nutmegWhole(random), fruitItems, {
    scale: (g, e) => grow(g) * (e.split ? 1 - smooth(0.8, 0.84, g) : 1),
    color: (c, g, e) => tone(ramp(c, g, [[0.15, '#86a63e'], [0.55, '#9aac44'], [0.7, '#d4c052'], [0.82, '#e8cc5a'], [1, '#e0b84a']]), e),
  })
  part(ctx, mats(ctx, { ...treeWind, flutter: 0.006 }, { roughness: 0.5 }), nutmegSplit(), fruitItems.filter((entry) => entry.split), { scale: (g) => grow(g) * smooth(0.8, 0.84, g), color: (c, g, e) => tone(c.set('#ffffff'), e) })
  // a few white bell flowers early in the year
  const flowerItems = items.filter((entry) => entry.depth > 0.85 && random() < 0.05).map((entry) => ({ p: entry.p.clone().addScaledVector(entry.normal, 0.04), q: Q(UPV, V(0, -1, 0)), s: 1, offset: 0, tone: 0 }))
  const bell = merge([0, 1, 2].map((index) => { const g = star({ radius: 0.012, petals: 3, cup: 1.6, width: 0.9, color: '#f2ecc8' }); g.translate(index * 0.02 - 0.02, 0, (index % 2) * 0.015); return g }))
  part(ctx, mats(ctx, treeWind, { roughness: 0.7 }), bell, flowerItems, { scale: (g) => smooth(-0.05, 0, g) * (1 - smooth(0.12, 0.2, g)), color: (c, g, e) => tone(c.set('#ffffff'), e) })
  ctx.groundCover = 'orchard'
  return { plot: { width: 24, depth: 24 }, soil: 'orchard', camera: { position: V(16, 2.6, 19), target: V(2, 3.6, 3) } }
}

/* ------------------------------------------------------------------ cinnamon */
function cinnamonClump(random, q) {
  const stump = []
  const shoots = []
  const flush = []
  const stumpGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.18, 9, 2)
  const sp = stumpGeometry.attributes.position
  for (let index = 0; index < sp.count; index += 1) sp.setX(index, sp.getX(index) * (1 + 0.15 * Math.sin(sp.getZ(index) * 40)))
  stumpGeometry.translate(0, 0.06, 0)
  stump.push(prep(stumpGeometry, '#5a4634', barkFn('#5a4634', 0.4)))
  const count = Math.round(12 * q)
  const H = random.range(1.7, 2.2)
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * TAU + random.gauss() * 0.3
    const base = V(Math.cos(a) * 0.07, 0.12, Math.sin(a) * 0.07)
    const lean = random.range(0.15, 0.42)
    const height = H * random.range(0.75, 1.05)
    const flushing = random() < 0.55
    const top = base.clone().add(V(Math.cos(a) * Math.sin(lean) * height, Math.cos(lean) * height, Math.sin(a) * Math.sin(lean) * height))
    const points = [base, base.clone().lerp(top, 0.5).add(V(random.gauss() * 0.04, 0, random.gauss() * 0.04)), top]
    shoots.push(shapedTube(points, (t) => lerp(0.012, 0.004, t), { radial: 4, tubular: 4, colorFn: (c, x, y) => c.setRGB(0.95, 0.7, 0.6).multiplyScalar(lerp(0.75, 1, Math.min(1, y / 2))) }))
    const curve = new THREE.CatmullRomCurve3(points)
    let yaw = random() * TAU
    const pairs = 9
    for (let k = 0; k < pairs; k += 1) {
      const u = 0.2 + (k / (pairs - 1)) * 0.8
      const p = curve.getPointAt(u)
      yaw += Math.PI / 2 + random.gauss() * 0.15
      const young = flushing && k >= pairs - 2
      for (const sign of [0, Math.PI]) {
        const g = leaf({ length: (young ? 0.13 : 0.19) * random.range(0.85, 1.1), width: young ? 0.05 : 0.08, rise: random.range(0.15, 0.55), droop: random.range(0.4, 0.8), segments: 3, fold: 0.25, shape: 'ovate', base: '#9a9a9a', tip: '#cfcfcf' })
        ;(young ? flush : shoots).push(leafAt(g, p, yaw + sign))
      }
    }
  }
  return { plant: merge(stump), shoots: merge(shoots), flush: merge(flush), pivots: { shoots: V(0, 0.12, 0), flush: V(0, 0.12, 0) } }
}

function buildCinnamon(ctx) {
  const { random, quality } = ctx
  const spots = []
  for (let x = -7; x <= 7.01; x += 2) for (let z = -9 + 0.8; z < 9; z += 1.6 / Math.sqrt(Math.max(quality, 0.6))) spots.push({ x: x + random.gauss() * 0.1, y: 0, z: z + random.gauss() * 0.12 })
  const variants = [0, 1, 2].map(() => cinnamonClump(random, Math.max(0.65, quality)))
  const grow = (g) => lerp(0.12, 1, smooth(0.02, 0.7, g))
  // two red flushes a year: new leaves open coppery-red and harden to glossy green
  const red = (g) => Math.max(1 - smooth(0.25, 0.42, g), smooth(0.52, 0.58, g) * (1 - smooth(0.68, 0.82, g)))
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.16, flutter: 0.014, refHeight: 2 },
    materialOptions: { roughness: 0.9 },
    plant: { color: (c, g, e) => tone(c.set('#ffffff'), e) },
    attachments: [
      { key: 'shoots', scale: grow, materialOptions: { roughness: 0.4 }, color: (c, g, e) => tone(ramp(c, g, [[0, '#9a4a32'], [0.25, '#6a5a2e'], [0.45, '#2f5a26'], [1, '#2c5524']]), e) },
      { key: 'flush', scale: grow, materialOptions: { roughness: 0.45 }, color: (c, g, e) => tone(c.set('#3a6a2a').lerp(new THREE.Color('#b8443a'), red(g)), e) },
    ],
  })
  ctx.groundCover = 'orchard'
  return { plot: { width: 16, depth: 18 }, soil: 'orchard', camera: { position: V(8.6, 2.2, 11.2), target: V(0, 1.1, 3) } }
}

/* ------------------------------------------------------------------ black pepper */
function pepperVine(random, q) {
  const leaves = []
  const wood = []
  const spikes = []
  const H = random.range(4.6, 5.2)
  for (let s = 0; s < 3; s += 1) {
    const points = []
    for (let k = 0; k <= 10; k += 1) {
      const a = (s / 3) * TAU + k * 0.5
      points.push(V(Math.cos(a) * 0.16, (k / 10) * H, Math.sin(a) * 0.16))
    }
    wood.push(shapedTube(points, (t) => lerp(0.014, 0.006, t), { radial: 3, tubular: 18, color: '#5a6a3a' }))
  }
  const coreRadii = [0.12, 0.24, 0.3, 0.3, 0.24, 0.08]
  const core = new THREE.LatheGeometry([0, 0.08, 0.3, 0.7, 0.92, 1].map((t, index) => new THREE.Vector2(coreRadii[index], t * H * 0.98)), 10)
  wood.push(prep(core, '#1f3a18'))
  const step = 0.12 / Math.sqrt(q)
  let azimuth = random() * TAU
  for (let y = 0.25; y < H; y += step) {
    for (let k = 0; k < 4; k += 1) {
      azimuth += 2.39996
      const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
      const top = y / H
      const L = random.range(0.22, 0.42) * (top > 0.85 ? 0.6 : 1)
      const start = out.clone().multiplyScalar(0.16).add(V(0, y, 0))
      const end = start.clone().addScaledVector(out, L).add(V(0, -0.06 - L * 0.2, 0))
      const mid = start.clone().lerp(end, 0.5).add(V(0, 0.04, 0))
      wood.push(shapedTube([start, mid, end], (t) => lerp(0.005, 0.003, t), { radial: 3, tubular: 2, color: '#5f6e3a' }))
      const curve = new THREE.CatmullRomCurve3([start, mid, end])
      for (let n = 0; n < 5; n += 1) {
        const u = 0.25 + n * 0.19
        const p = curve.getPointAt(Math.min(1, u))
        const yaw = Math.atan2(out.x, out.z) + (n % 2 ? 0.7 : -0.7) + random.gauss() * 0.25
        const g = leaf({ length: random.range(0.13, 0.17), width: random.range(0.09, 0.11), rise: random.range(-0.35, 0.15), droop: random.range(0.3, 0.6), segments: 4, fold: 0.2, shape: 'heart', notch: 0.06, base: '#9c9c9c', tip: '#cdcdcd' })
        leaves.push(leafAt(g, p, yaw))
        if ((n === 1 || n === 3) && random() < 0.75) {
          const len = random.range(0.11, 0.16)
          const a = p.clone().add(V(0, -0.005, 0))
          const b = a.clone().addScaledVector(out, 0.015).add(V(0, -0.03, 0))
          const c = a.clone().addScaledVector(out, 0.03).add(V(random.gauss() * 0.01, -len, random.gauss() * 0.01))
          spikes.push(shapedTube([a, b, c], (t) => (t < 0.15 ? 0.0025 : 0.0085 * (0.72 + 0.28 * Math.abs(Math.sin(t * Math.PI * 8))) * (1 - 0.3 * t)), { radial: 5, tubular: 9, colorFn: (cc) => cc.setScalar(random.range(0.85, 1)) }))
        }
      }
    }
  }
  return { plant: merge(leaves), wood: merge(wood), spikes: merge(spikes), pivots: { wood: V(), spikes: V(0, H * 0.5, 0) } }
}

function buildBlackPepper(ctx) {
  const { random, quality } = ctx
  const trees = []
  const spots = []
  for (let x = -9; x <= 9.01; x += 3) {
    for (let z = -9; z <= 9.01; z += 3) {
      const origin = V(x + random.gauss() * 0.15, 0, z + random.gauss() * 0.15)
      trees.push(leaderTree(random, { origin, height: random.range(6.3, 7.2), radius: 0.13, crownBase: 5.4, spread: 1.3, branches: 7, bark: '#6a5e4c', sweep: 0.6, shape: 'ellipsoid', lean: 0.05 }))
      spots.push({ x: origin.x, y: 0, z: origin.z })
    }
  }
  grove(ctx, trees, { wind: treeWind, leafGeometries: [broadCluster(random, 0.8), broadCluster(random, 0.9)], clusters: 130, leafColor: '#3a6a2c' })
  const variants = [0, 1, 2].map(() => pepperVine(random, Math.max(0.6, quality)))
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.05, flutter: 0.012, refHeight: 5 }, sizes: [0.95, 1.05], tilt: 0.01, jitter: 0.03,
    materialOptions: { roughness: 0.32, metalness: 0.02 },
    plant: { color: (c, g, e) => tone(c.set('#2e5a24'), e) },
    attachments: [
      { key: 'wood', materialOptions: { roughness: 0.85 } },
      { key: 'spikes', scale: (g) => lerp(0.3, 1, smooth(0.0, 0.35, g)) * smooth(-0.04, 0.03, g) * (1 - smooth(0.95, 1, g)), materialOptions: { roughness: 0.35, side: THREE.FrontSide }, color: (c, g, e) => tone(ramp(c, g, [[0, '#cfd28c'], [0.2, '#a6b85a'], [0.35, '#6f9a36'], [0.65, '#4f7f2a'], [0.78, '#7e7a2a'], [0.88, '#b4362a'], [1, '#952a24']]), e) },
    ],
  })
  floor(ctx, { width: 26, depth: 26, texture: litterTexture(ctx, '#5b4631', { green: 0.4 }), edge: '#7e8f4c', fade: 3 })
  return { plot: { width: 21, depth: 21 }, soil: 'none', bund: false, camera: { position: V(14, 2.4, 15.5), target: V(1, 2.6, 1.5) } }
}

/* ------------------------------------------------------------------ ginger-type clumps */
// Leafy pseudostems with two-ranked lance leaves (cardamom, large cardamom, ginger).
export function zingClump(random, { shoots = 12, height = [2, 2.8], leaves = 12, leafLength = 0.5, leafWidth = 0.09, start = 0.25, spread = 0.25, stem = '#ffffff', rise = [0.5, 0.9], droop = [1.0, 1.5], lean = [0.04, 0.3], radius = 0.012, segments = 5 }) {
  const parts = []
  for (let index = 0; index < shoots; index += 1) {
    const a = random() * TAU
    const r = Math.sqrt(random()) * spread
    const base = V(Math.cos(a) * r, 0, Math.sin(a) * r)
    const tilt = random.range(lean[0], lean[1])
    const h = random.range(height[0], height[1])
    const top = base.clone().add(V(Math.cos(a) * Math.sin(tilt) * h, Math.cos(tilt) * h, Math.sin(a) * Math.sin(tilt) * h))
    const points = [base, base.clone().lerp(top, 0.5).add(V(random.gauss() * 0.02, 0, random.gauss() * 0.02)), top]
    parts.push(shapedTube(points, (t) => radius * lerp(1, 0.55, t), { radial: 4, tubular: 3, colorFn: (c, x, y) => c.set(stem).multiplyScalar(lerp(0.75, 1, Math.min(1, y / h))) }))
    const curve = new THREE.CatmullRomCurve3(points)
    const plane = random() * TAU
    for (let k = 0; k < leaves; k += 1) {
      const u = start + (1 - start) * (k / (leaves - 1)) * 0.97
      const p = curve.getPointAt(u)
      const size = 1 - Math.pow(Math.max(0, (u - 0.75) / 0.25), 1.5) * 0.5
      const g = leaf({ length: leafLength * size * random.range(0.85, 1.1), width: leafWidth * size, rise: random.range(rise[0], rise[1]), droop: random.range(droop[0], droop[1]), segments, fold: 0.25, shape: 'lance', base: '#9a9a9a', tip: '#d2d2d2' })
      parts.push(leafAt(g, p, plane + (k % 2 ? Math.PI : 0) + random.gauss() * 0.2))
    }
  }
  return merge(parts)
}

function cardamomPanicles(random, { count = 7 }) {
  const stalks = []
  const capsules = []
  const flowers = []
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * TAU + random.gauss() * 0.3
    const out = V(Math.cos(a), 0, Math.sin(a))
    const side = V(-out.z, 0, out.x)
    const length = random.range(0.7, 1.1)
    const points = [0, 0.33, 0.66, 1].map((t, k) => out.clone().multiplyScalar(0.2 + t * length).addScaledVector(side, k ? random.gauss() * 0.06 : 0).setY(0.025 + (k === 0 ? 0.04 : 0.01)))
    stalks.push(shapedTube(points, (t) => lerp(0.005, 0.003, t), { radial: 3, tubular: 4, color: '#8a9a5a' }))
    const curve = new THREE.CatmullRomCurve3(points)
    for (let node = 0; node < 5; node += 1) {
      const p = curve.getPointAt(0.2 + node * 0.18)
      for (let k = 0; k < 3; k += 1) {
        const g = bead(0.013, 0.02, 0.013, { detail: 0, colorFn: (c) => c.setScalar(random.range(0.85, 1.02)) })
        g.rotateZ(Math.PI / 2 + random.gauss() * 0.4)
        g.rotateY(random() * TAU)
        g.translate(p.x + random.gauss() * 0.012, p.y + 0.012, p.z + random.gauss() * 0.012)
        capsules.push(g)
      }
      const f = star({ radius: 0.014, petals: 5, cup: 0.5, color: '#f4f2ea', eye: '#8a4a9a' })
      f.translate(p.x, p.y + 0.018, p.z)
      flowers.push(f)
    }
  }
  return { stalks: merge(stalks), capsules: merge(capsules), flowers: merge(flowers) }
}

function largeCardamomHeads(random, { count = 6 }) {
  const stalks = []
  const capsules = []
  const flowers = []
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * TAU + random.gauss() * 0.4
    const out = V(Math.cos(a), 0, Math.sin(a))
    const head = out.clone().multiplyScalar(random.range(0.18, 0.32)).setY(0.07)
    stalks.push(rod(out.clone().multiplyScalar(0.12), head, 0.008, { color: '#7a4a32' }))
    for (let k = 0; k < 24; k += 1) {
      const u = random.range(-0.8, 1)
      const b = random() * TAU
      const r = Math.sqrt(1 - u * u)
      const dir = V(Math.cos(b) * r, u, Math.sin(b) * r)
      const g = bead(0.012, 0.019, 0.012, { detail: 0, colorFn: (c, x, y) => c.setScalar(y > 0.012 ? 0.6 : random.range(0.82, 1.02)) })
      g.applyQuaternion(Q(UPV, dir))
      g.translate(head.x + dir.x * 0.035, head.y + dir.y * 0.03 + 0.02, head.z + dir.z * 0.035)
      capsules.push(g)
    }
    for (let k = 0; k < 4; k += 1) {
      const f = star({ radius: 0.02, petals: 3, cup: 0.8, width: 0.8, color: '#f0dc7a', eye: '#d8a040' })
      f.translate(head.x + random.gauss() * 0.03, head.y + 0.06, head.z + random.gauss() * 0.03)
      flowers.push(f)
    }
  }
  return { stalks: merge(stalks), capsules: merge(capsules), flowers: merge(flowers) }
}

function buildCardamom(ctx) {
  const { random, quality } = ctx
  const W = 20
  const D = 24
  const treeSpots = [V(-7.5, 0, -8), V(6.5, 0, -6), V(8.2, 0, 4.5), V(-1, 0, -1.5)]
  const trees = treeSpots.map((p) => forestTree(random, p.clone(), { size: random.range(1, 1.15) }))
  shadeCanopy(ctx, trees, { clusters: 900, color: '#2b4c24' })
  const spots = []
  for (let x = -W / 2 + 1.2; x < W / 2; x += 2.4) {
    for (let z = -D / 2 + 1.2; z < D / 2; z += 2.4 / Math.sqrt(Math.max(quality, 0.7))) {
      const p = { x: x + random.gauss() * 0.25, y: 0, z: z + random.gauss() * 0.25 }
      if (treeSpots.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 1.6)) continue
      spots.push(p)
    }
  }
  const variants = [0, 1, 2].map(() => {
    const panicles = cardamomPanicles(random, { count: 7 })
    return { plant: zingClump(random, { shoots: Math.round(18 * Math.max(0.7, quality)), height: [1.9, 2.8], leaves: 12, leafLength: 0.58, leafWidth: 0.11, start: 0.22, spread: 0.32, stem: '#b0b8a0', rise: [0.35, 0.75], droop: [0.6, 1.1], lean: [0.08, 0.42] }), ...panicles, pivots: { stalks: V(0, 0, 0), capsules: V(0, 0, 0), flowers: V(0, 0, 0) } }
  })
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.12, flutter: 0.016, refHeight: 2.5 }, sizes: [0.85, 1.1],
    materialOptions: { roughness: 0.5 },
    plant: { color: (c, g, e) => tone(c.set('#2f5a26'), e) },
    attachments: [
      { key: 'stalks', scale: (g) => lerp(0.5, 1, smooth(0, 0.25, g)), materialOptions: { roughness: 0.8 } },
      { key: 'flowers', scale: (g) => smooth(0.12, 0.18, g) * (1 - smooth(0.36, 0.44, g)), materialOptions: { roughness: 0.7 } },
      { key: 'capsules', scale: (g) => lerp(0.3, 1, smooth(0.36, 0.7, g)) * smooth(0.33, 0.4, g) * (1 - smooth(0.96, 1, g)), color: (c, g, e) => tone(ramp(c, g, [[0.35, '#a6c46a'], [0.7, '#94bc62'], [0.88, '#86ae56'], [1, '#9aa65a']]), e), materialOptions: { roughness: 0.55, side: THREE.FrontSide } },
    ],
  })
  floor(ctx, { width: W + 6, depth: D + 6, texture: litterTexture(ctx, '#4f3d2a'), edge: '#6e7f44', fade: 3 })
  return { plot: { width: W, depth: D }, soil: 'none', bund: false, camera: { position: V(13, 2.3, 16), target: V(1, 2.2, 3) } }
}

function buildLargeCardamom(ctx) {
  const { random, quality } = ctx
  const W = 22
  const D = 26
  const hill = makeHill({ front: D / 2, height: 18, scale: 40, tilt: 0.15, wobble: 0.8, bumps: 0.25 })
  const { hillY } = hill
  const outer = scatter(random, 14, { x0: -45, x1: 45, z0: -55, z1: 6, gap: 8, keep: (x, z) => !(Math.abs(x) < W / 2 + 3 && z > -D / 2 - 3) })
  const alders = [...scatter(random, 8, { x0: -10, x1: 10, z0: -12, z1: 11, gap: 6, keep: (x, z) => !(z > 1 && x < 5) }), ...outer].map((p) => {
    const y = hillY(p.x, p.z)
    const tree = leaderTree(random, { origin: V(p.x, y, p.z), height: random.range(14, 18), radius: 0.24, crownBase: random.range(6, 8), spread: random.range(3, 3.8), branches: 12, bark: '#8c8a80', sweep: 0.5, shape: 'ellipsoid', lean: 0.2 })
    tree.ground = y
    tree.p = p
    return tree
  })
  grove(ctx, alders, { wind: { ...treeWind, slope: true }, leafGeometries: [broadCluster(random, 0.75), broadCluster(random, 0.85)], clusters: 520, leafColor: '#3a6a2e', bark: { roughness: 0.85 } })
  const spots = []
  for (let x = -W / 2 + 0.8; x < W / 2; x += 1.6 / Math.sqrt(Math.max(quality, 0.7))) {
    for (let z = -D / 2 + 0.8; z < D / 2; z += 1.6) {
      const px = x + random.gauss() * 0.3
      const pz = z + random.gauss() * 0.3
      if (alders.some((t) => Math.hypot(t.p.x - px, t.p.z - pz) < 1.2) || random() < 0.06) continue
      const y = hillY(px, pz)
      spots.push({ x: px, y: y - 0.03, z: pz, ground: y })
    }
  }
  const variants = [0, 1, 2].map(() => {
    const heads = largeCardamomHeads(random, { count: 6 })
    return { plant: zingClump(random, { shoots: Math.round(11 * Math.max(0.7, quality)), height: [1.8, 2.6], leaves: 10, leafLength: 0.6, leafWidth: 0.12, start: 0.25, spread: 0.3, stem: '#c8a090', rise: [0.45, 0.85], droop: [1.0, 1.6] }), ...heads, pivots: { stalks: V(), capsules: V(0, 0.05, 0), flowers: V(0, 0.05, 0) } }
  })
  plantAt(ctx, {
    variants, spots, wind: { strength: 0.12, flutter: 0.016, refHeight: 2.4, slope: true }, sizes: [0.85, 1.1],
    materialOptions: { roughness: 0.5 },
    plant: { color: (c, g, e) => tone(c.set('#2f5c28'), e) },
    attachments: [
      { key: 'stalks', scale: (g) => smooth(0.1, 0.25, g) * (1 - smooth(0.95, 1, g)), materialOptions: { roughness: 0.8 } },
      { key: 'flowers', scale: (g) => smooth(0.16, 0.22, g) * (1 - smooth(0.38, 0.46, g)), materialOptions: { roughness: 0.7 } },
      { key: 'capsules', scale: (g) => lerp(0.3, 1, smooth(0.3, 0.7, g)) * smooth(0.12, 0.3, g) * (1 - smooth(0.96, 1, g)), color: (c, g, e) => tone(ramp(c, g, [[0.12, '#c88a4a'], [0.35, '#6a8a3a'], [0.6, '#7a6a30'], [0.72, '#a8382a'], [0.86, '#8a2620'], [1, '#5e1c18']]), e), materialOptions: { roughness: 0.6, side: THREE.FrontSide } },
    ],
  })
  const litter = litterTexture(ctx, '#4d3c2a', { green: 0.35 })
  const material = new THREE.MeshStandardMaterial({ map: litter, vertexColors: true, roughness: 1 })
  ctx.disposables.push(material)
  terrain(ctx, {
    x0: -60, x1: 60, z0: -70, z1: 40, step: 0.8, height: hillY, uv: (x, z) => [x / 2.4, z / 2.4],
    color: (c, x, z) => {
      const inside = Math.abs(x) < W / 2 + 1 && Math.abs(z) < D / 2 + 1
      c.set(inside ? '#ffffff' : '#9fbf6a').multiplyScalar(0.9 + 0.15 * Math.sin(x * 0.6 + z * 0.4) * Math.sin(z * 0.7))
    },
    materials: [material],
  })
  const camera = V(11, 0, 19)
  camera.y = hillY(camera.x, camera.z) + 2.6
  const target = V(-2, 0, 0)
  target.y = hillY(target.x, target.z) + 1.2
  return { plot: { width: W, depth: D }, soil: 'none', bund: false, grass: false, scarecrow: false, camera: { position: camera, target } }
}

export const treeModels = {
  tea: { build: buildTea, stages: [[0, 'Winter rest, pruning', 'Jan'], [0.2, 'First flush', 'Mar'], [0.38, 'Second flush', 'May'], [0.56, 'Monsoon flush', 'Jul'], [0.78, 'Autumn flush', 'Oct'], [0.93, 'Winter rest', 'Dec']], showcase: 0.42 },
  coffee: { build: buildCoffee, stages: [[0, 'Blossom showers', 'Mar'], [0.14, 'Pinheads set', 'Apr'], [0.35, 'Green berries', 'Jun'], [0.62, 'Berries fill', 'Sep'], [0.78, 'Cherries ripen red', 'Nov'], [0.9, 'Picking', 'Dec']], showcase: 0.85 },
  rubber: { build: buildRubber, stages: [[0, 'Wintering, old leaves fall', 'Jan'], [0.13, 'New leaves', 'Feb'], [0.25, 'Tapping resumes', 'Apr'], [0.45, 'Monsoon: rain guards', 'Jul'], [0.72, 'Peak tapping', 'Oct'], [0.92, 'Leaves turn', 'Dec']], showcase: 0.75 },
  cocoa: { build: buildCocoa, stages: [[0, 'Flowers on the trunk', 'Mar'], [0.2, 'Cherelles set', 'Apr'], [0.45, 'Pods grow', 'Jul'], [0.72, 'Pods ripen', 'Oct'], [0.9, 'Harvest', 'Dec']], showcase: 0.84 },
  clove: { build: buildClove, stages: [[0, 'Flower buds form', 'Sep'], [0.3, 'Buds green', 'Nov'], [0.6, 'Buds turn pink', 'Jan'], [0.76, 'Harvest pink buds', 'Feb'], [0.9, 'Missed buds flower', 'Mar']], showcase: 0.76 },
  nutmeg: { build: buildNutmeg, stages: [[0, 'Flowering', 'Jan'], [0.2, 'Fruit set', 'Mar'], [0.45, 'Fruit swells', 'May'], [0.7, 'Fruit turns yellow', 'Jul'], [0.84, 'Fruit splits, red mace', 'Aug']], showcase: 0.9 },
  cinnamon: { build: buildCinnamon, stages: [[0, 'Cut back to stumps', 'Jun'], [0.18, 'New red shoots', 'Jul'], [0.45, 'Shoots grow', 'Oct'], [0.55, 'Second red flush', 'Dec'], [0.88, 'Ready to cut and peel', 'May']], showcase: 0.62 },
  'black-pepper': { build: buildBlackPepper, stages: [[0, 'Monsoon flowering', 'Jun'], [0.2, 'Spikes set', 'Jul'], [0.5, 'Green berries', 'Oct'], [0.78, 'Berries turn red', 'Dec'], [0.92, 'Harvest', 'Jan']], showcase: 0.82 },
  cardamom: { build: buildCardamom, stages: [[0, 'Panicles grow', 'Apr'], [0.15, 'Flowering', 'Jun'], [0.4, 'Capsules set', 'Aug'], [0.68, 'Capsules fill', 'Oct'], [0.86, 'Picking', 'Nov']], showcase: 0.75 },
  'large-cardamom': { build: buildLargeCardamom, stages: [[0, 'New shoots', 'Feb'], [0.18, 'Flowering at the base', 'Apr'], [0.42, 'Capsules form', 'Jun'], [0.7, 'Capsules turn red', 'Aug'], [0.88, 'Harvest', 'Oct']], showcase: 0.78 },
}
