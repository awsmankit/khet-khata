import * as THREE from 'three'
import { applyWind, blade, ellipsoid, item, lerp, merge, plantMaterial, prep, smooth, transform, tube, windDepthMaterial, GrowingPart } from './geometry.js'

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const tmp = new THREE.Color()
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const noise = (x, z) => {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), ux), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), ux), uz)
}
const fbm = (x, z) => noise(x, z) * 0.55 + noise(x * 2.1, z * 2.1) * 0.3 + noise(x * 4.3, z * 4.3) * 0.15

export const lightSettings = {
  morning: { elevation: 13, azimuth: 108, turbidity: 4.5, rayleigh: 2.2, mie: 0.006, mieG: 0.86, exposure: 0.44, sun: '#ffd6a0', sunIntensity: 2.7, hemiSky: '#c8d8f0', hemiGround: '#5f5034', hemi: 0.75, fog: '#cfc6b0', fogDensity: 0.0068, env: 0.75, clouds: 0.22 },
  afternoon: { elevation: 50, azimuth: 205, turbidity: 3.2, rayleigh: 1.4, mie: 0.004, mieG: 0.8, exposure: 0.4, sun: '#fff1db', sunIntensity: 3.6, hemiSky: '#c9dcff', hemiGround: '#5d5236', hemi: 0.55, fog: '#b9cad6', fogDensity: 0.0048, env: 0.6, clouds: 0.2 },
  evening: { elevation: 7, azimuth: 252, turbidity: 7, rayleigh: 2.6, mie: 0.008, mieG: 0.9, exposure: 0.62, sun: '#ffb070', sunIntensity: 2.6, hemiSky: '#ecd0b8', hemiGround: '#5a4630', hemi: 0.95, fog: '#d9ad86', fogDensity: 0.0065, env: 0.65, clouds: 0.3 },
  night: { elevation: -7, azimuth: 250, turbidity: 2, rayleigh: 0.5, mie: 0.002, mieG: 0.7, exposure: 0.95, moon: { elevation: 42, azimuth: 150 }, moonSprite: { elevation: 15, azimuth: 214 }, sun: '#b4c6ee', sunIntensity: 1.5, hemiSky: '#4d6190', hemiGround: '#1a2218', hemi: 1.05, fog: '#16213a', fogDensity: 0.0075, env: 0.25, clouds: 0.25 },
}

export function sunDirection(elevationDeg, azimuthDeg) {
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg)
  const theta = THREE.MathUtils.degToRad(azimuthDeg)
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
}

/* ------------------------------------------------------------- ground */
const patchPalette = ['#5e8a37', '#6f973e', '#c9b33a', '#86754f', '#8f9455', '#4f7a31', '#a8a04a', '#6c8c3a']

export function buildGround() {
  const size = 280
  const segments = 140
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const patch = new THREE.Color()
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const n = fbm(x * 0.12, z * 0.12)
    tmp.set('#5a7631').lerp(patch.set('#8a8048'), smooth(0.45, 0.85, n) * 0.55).multiplyScalar(1.12)
    const d = Math.max(Math.abs(x), Math.abs(z))
    if (d > 24) {
      const cx = Math.floor((x + 7) / 24)
      const cz = Math.floor((z + 3) / 17)
      patch.set(patchPalette[Math.floor(hash(cx, cz) * patchPalette.length)]).multiplyScalar(0.9 + n * 0.2)
      const onBund = ((x + 7) % 24 + 24) % 24 < 1.8 || ((z + 3) % 17 + 17) % 17 < 1.8
      if (onBund) patch.set('#8f8458')
      tmp.lerp(patch, smooth(24, 32, d))
    }
    colors[index * 3] = tmp.r
    colors[index * 3 + 1] = tmp.g
    colors[index * 3 + 2] = tmp.b
    position.setY(index, -0.03 + (d > 30 ? (n - 0.5) * 0.25 : 0))
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const near = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: grassTexture() }))
  near.receiveShadow = true
  const far = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: '#647b3e', roughness: 1 }))
  far.rotation.x = -Math.PI / 2
  far.position.y = -0.2
  const group = new THREE.Group()
  group.add(near, far)
  return group
}

function grassTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  context.fillStyle = '#b9b9b9'
  context.fillRect(0, 0, 256, 256)
  let state = 99
  const rand = () => { state = (state * 16807) % 2147483647; return state / 2147483647 }
  for (let index = 0; index < 5200; index += 1) {
    const x = rand() * 256
    const y = rand() * 256
    const a = rand() * Math.PI
    const light = rand()
    context.globalAlpha = 0.35
    context.strokeStyle = light < 0.45 ? '#7a7a7a' : light < 0.85 ? '#e4e4e4' : '#c9b48a'
    context.lineWidth = 1 + rand()
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4)
    context.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(90, 90)
  texture.anisotropy = 8
  return texture
}

export function soilTexture(base, seed, { wet = false } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  context.fillStyle = base
  context.fillRect(0, 0, 256, 256)
  let state = seed
  const rand = () => { state = (state * 16807) % 2147483647; return state / 2147483647 }
  for (let index = 0; index < 1600; index += 1) {
    const x = rand() * 256
    const y = rand() * 256
    const r = rand() * (wet ? 3 : 4.5) + 0.6
    const light = rand() < 0.5
    context.globalAlpha = 0.08 + rand() * 0.18
    context.fillStyle = light ? '#d8c3a0' : '#2b2015'
    context.beginPath()
    context.ellipse(x, y, r, r * (0.6 + rand() * 0.5), rand() * 3, 0, Math.PI * 2)
    context.fill()
  }
  // straw stubble from the last harvest
  context.globalAlpha = wet ? 0.12 : 0.35
  context.strokeStyle = '#cdb27a'
  context.lineWidth = 1
  for (let index = 0; index < (wet ? 30 : 90); index += 1) {
    const x = rand() * 256
    const y = rand() * 256
    const a = rand() * Math.PI
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7)
    context.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

export function buildSoil(plot, kind, disposables) {
  const group = new THREE.Group()
  if (kind === 'orchard') return { group, update: () => {} }
  const { width, depth, rowGap = 0.4 } = plot
  const wet = kind === 'paddy'
  const columns = kind === 'furrow' ? Math.min(360, Math.round((width / rowGap) * 6)) : 40
  const geometry = new THREE.PlaneGeometry(width, depth, columns, 24)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const ridge = kind === 'furrow' ? 0.034 * (Math.cos(2 * Math.PI * ((x + width / 2) / rowGap - 0.5)) * 0.5 + 0.5) : 0
    position.setY(index, ridge + (noise(x * 1.7, z * 1.7) - 0.5) * 0.02)
  }
  geometry.computeVertexNormals()
  const texture = soilTexture(wet ? '#5a4632' : '#8a6644', wet ? 7 : 13, { wet })
  texture.repeat.set(width / 2.2, depth / 2.2)
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: wet ? 0.6 : 1, color: wet ? '#8c7a62' : '#ffffff' })
  const soil = new THREE.Mesh(geometry, material)
  soil.receiveShadow = true
  group.add(soil)
  disposables.push(texture, material)
  let water = null
  if (wet) {
    const waterMaterial = new THREE.MeshStandardMaterial({ color: '#6c7a64', roughness: 0.04, metalness: 0.25, transparent: true, opacity: 0.82, depthWrite: false })
    water = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), waterMaterial)
    water.rotation.x = -Math.PI / 2
    water.position.y = 0.06
    water.receiveShadow = true
    water.renderOrder = 2
    group.add(water)
    disposables.push(waterMaterial)
  }
  return {
    group,
    update: (g) => {
      if (!water) return
      const level = 1 - smooth(0.7, 0.84, g)
      water.material.opacity = 0.82 * level
      water.visible = level > 0.02
      material.color.set('#8c7a62').lerp(tmp.set('#c3ab88'), smooth(0.76, 0.95, g))
      material.roughness = lerp(0.55, 1, smooth(0.72, 0.9, g))
    },
  }
}

// Raised earthen bund (mend) around the plot.
export function buildBund(plot) {
  const halfW = plot.width / 2 + 0.45
  const halfD = plot.depth / 2 + 0.45
  const pathPoints = []
  const corners = [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]]
  corners.forEach(([x, z], index) => {
    const [nx, nz] = corners[(index + 1) % 4]
    for (let step = 0; step < 8; step += 1) pathPoints.push(V(lerp(x, nx, step / 8), 0, lerp(z, nz, step / 8)))
  })
  const curve = new THREE.CatmullRomCurve3(pathPoints, true, 'catmullrom', 0.05)
  const geometry = new THREE.TubeGeometry(curve, 200, 0.32, 8, true)
  geometry.scale(1, 0.42, 1)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index)
    const n = fbm(position.getX(index) * 0.9, position.getZ(index) * 0.9)
    tmp.set('#7c6748').lerp(new THREE.Color('#6c7f3a'), smooth(0.02, 0.12, y) * (0.5 + n * 0.6))
    colors.set([tmp.r, tmp.g, tmp.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
  mesh.receiveShadow = true
  mesh.castShadow = true
  return { mesh, halfW, halfD, curve }
}

export function grassClump(random) {
  const parts = []
  for (let index = 0; index < 7; index += 1) {
    const geometry = blade({ length: random.range(0.16, 0.34), width: 0.012, rise: random.range(1.0, 1.45), droop: random.range(0.4, 1.1), segments: 3, fold: 0.2, base: '#6a6a6a', tip: '#d8d8d8' })
    transform(geometry, { rotation: [0, random() * Math.PI * 2, 0], position: [random.gauss() * 0.05, 0, random.gauss() * 0.05] })
    parts.push(geometry)
  }
  return merge(parts)
}

export function buildGrass(ctx, plot, bund, { orchardTrunks = [] } = {}) {
  const { random, quality } = ctx
  const items = []
  const inside = (x, z) => Math.abs(x) < plot.width / 2 + 0.1 && Math.abs(z) < plot.depth / 2 + 0.1
  const target = Math.round(5200 * quality)
  let guard = 0
  while (items.length < target && guard < target * 6) {
    guard += 1
    const x = random.range(-plot.width / 2 - 14, plot.width / 2 + 14)
    const z = random.range(-plot.depth / 2 - 14, plot.depth / 2 + 14)
    if (ctx.groundCover !== 'orchard' && inside(x, z)) continue
    if (orchardTrunks.some((trunk) => Math.hypot(trunk.x - x, trunk.z - z) < 1.7)) continue
    if (random() > 1 - smooth(4, 16, Math.max(Math.abs(x) - plot.width / 2, Math.abs(z) - plot.depth / 2)) * 0.75) continue
    const entry = item(V(x, -0.02, z), random() * 6.28, random.range(0.7, 1.5))
    entry.tone = random.gauss() * 0.12
    entry.dry = random() < 0.25
    items.push(entry)
  }
  // grass along the bund top
  const bundCount = Math.round(700 * quality)
  for (let index = 0; index < bundCount; index += 1) {
    const p = bund.curve.getPointAt(index / bundCount)
    const entry = item(V(p.x + random.gauss() * 0.12, 0.1, p.z + random.gauss() * 0.12), random() * 6.28, random.range(0.8, 1.4))
    entry.tone = random.gauss() * 0.12
    entry.dry = random() < 0.35
    items.push(entry)
  }
  const options = { strength: 0.08, flutter: 0.01, refHeight: 0.4, ground: -0.03 }
  const material = applyWind(plantMaterial({ roughness: 0.9 }), ctx.wind, options)
  ctx.disposables.push(material)
  const geometry = grassClump(random)
  const part = new GrowingPart({ geometry, material, items, scale: () => 1, color: (c, g, entry) => c.set(entry.dry ? '#a39a5c' : '#6c8b3b').multiplyScalar(1 + entry.tone), castShadow: false })
  part.update(0)
  return part.mesh
}

/* ------------------------------------------------------------- horizon */
function lumpySphere(random, radius, squash = 0.78) {
  const geometry = new THREE.SphereGeometry(1, 14, 10)
  const position = geometry.attributes.position
  const vertex = V()
  const seed = random() * 10
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const bump = 1 + 0.13 * Math.sin(vertex.x * 5 + seed) * Math.sin(vertex.z * 4.6 + vertex.y * 3 + seed) + 0.06 * Math.sin(vertex.y * 11 + vertex.x * 9)
    position.setXYZ(index, vertex.x * bump * radius, vertex.y * bump * radius * squash, vertex.z * bump * radius)
  }
  geometry.computeVertexNormals()
  return geometry
}

function farTree(random, color) {
  const lobes = []
  const count = 4
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * Math.PI * 2 + random() * 0.5
    const r = index === 0 ? 0 : random.range(0.35, 0.55)
    const g = prep(lumpySphere(random, index === 0 ? 0.8 : random.range(0.5, 0.65)), color, (c, x, y) => c.set(color).multiplyScalar(0.7 + Math.max(0, y) * 0.5))
    g.translate(Math.cos(a) * r, 1.05 + (index === 0 ? 0.15 : random.range(-0.1, 0.1)), Math.sin(a) * r)
    lobes.push(g)
  }
  const trunk = prep(new THREE.CylinderGeometry(0.05, 0.09, 1.0, 5), '#3e3226')
  trunk.translate(0, 0.35, 0)
  return merge([...lobes, trunk])
}

function palmyra(random) {
  const height = random.range(11, 15)
  const lean = V(random.gauss() * 0.5, 0, random.gauss() * 0.5)
  const crown = V(lean.x, height, lean.z)
  const parts = [tube([V(), V(lean.x * 0.3, height * 0.5, lean.z * 0.3), crown], 0.26, 0.17, { radial: 6, tubular: 6, colorFn: (c, x, y) => c.set('#4b4036').multiplyScalar(0.85 + 0.3 * (Math.sin(y * 9) * 0.5 + 0.5)) })]
  for (let index = 0; index < 24; index += 1) {
    const azimuth = index * 2.4
    const elevation = random.range(-0.5, 1.1)
    const dir = V(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth))
    const stemEnd = crown.clone().addScaledVector(dir, 1.4)
    parts.push(tube([crown, crown.clone().addScaledVector(dir, 0.6), stemEnd], 0.03, 0.02, { radial: 3, tubular: 2, color: '#56603a' }))
    const fan = new THREE.CircleGeometry(1.55, 16, -1.3, 2.6)
    const fp = fan.attributes.position
    for (let i = 0; i < fp.count; i += 1) {
      const a = Math.atan2(fp.getY(i), fp.getX(i))
      const r = Math.hypot(fp.getX(i), fp.getY(i))
      fp.setZ(i, Math.sin(a * 16) * 0.06 * r)
    }
    fan.computeVertexNormals()
    fan.rotateX(-Math.PI / 2 + 0.3)
    fan.rotateY(-azimuth)
    const g = prep(fan, elevation < -0.25 ? '#6f5e3c' : '#3c5528')
    g.translate(stemEnd.x, stemEnd.y, stemEnd.z)
    parts.push(g)
  }
  return merge(parts)
}

function bambooClump(random) {
  const parts = []
  for (let index = 0; index < 22; index += 1) {
    const a = random() * Math.PI * 2
    const base = V(Math.cos(a) * random.range(0, 0.9), 0, Math.sin(a) * random.range(0, 0.9))
    const out = V(Math.cos(a), 0, Math.sin(a))
    const height = random.range(8, 12)
    const top = base.clone().addScaledVector(out, random.range(2.2, 4.4)).add(V(0, height, 0))
    const points = [base, base.clone().addScaledVector(out, 0.4).add(V(0, height * 0.5, 0)), top]
    parts.push(tube(points, 0.07, 0.025, { radial: 4, tubular: 6, color: '#5f7434' }))
    const curve = new THREE.CatmullRomCurve3(points)
    for (let spray = 0; spray < 24; spray += 1) {
      const p = curve.getPointAt(0.4 + spray * 0.025)
      const g = blade({ length: random.range(0.8, 1.3), width: 0.3, rise: random.range(-0.2, 0.6), droop: 0.7, segments: 3, fold: 0.1, shape: 'lance', base: '#3f5a24', tip: '#5a7a32' })
      transform(g, { rotation: [0, random() * 6.28, 0] })
      g.translate(p.x, p.y, p.z)
      parts.push(g)
    }
  }
  return merge(parts)
}

function hut(random) {
  const width = random.range(4, 5.5)
  const depth = random.range(3, 3.8)
  const wallHeight = 2.1
  const walls = prep(new THREE.BoxGeometry(width, wallHeight, depth), '#a27a52', (c, x, y) => c.set('#a27a52').lerp(tmp.set('#7a5a3c'), y < -0.7 ? 0.6 : 0))
  walls.translate(0, wallHeight / 2, 0)
  const roofParts = [walls]
  for (const side of [-1, 1]) {
    const roof = prep(new THREE.BoxGeometry(width + 0.8, 0.22, depth / 2 + 0.9), '#b39a5f', (c, x, y) => c.set('#b39a5f').multiplyScalar(0.8 + 0.25 * (Math.sin(x * 14) * 0.5 + 0.5)))
    roof.rotateX(side * 0.62)
    roof.translate(0, wallHeight + 0.85, side * (depth / 4 + 0.1))
    roofParts.push(roof)
  }
  const door = prep(new THREE.BoxGeometry(0.9, 1.6, 0.05), '#3b2b1d')
  door.translate(width * 0.18, 0.8, depth / 2 + 0.02)
  roofParts.push(door)
  return merge(roofParts)
}

export function buildHorizon(random, quality) {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })
  const treeVariants = [farTree(random, '#2f4d24'), farTree(random, '#3a5a2a'), farTree(random, '#2a4420')]
  const placements = treeVariants.map(() => [])
  const groves = Math.round(30 * Math.max(quality, 0.6))
  for (let grove = 0; grove < groves; grove += 1) {
    const angle = random() * Math.PI * 2
    const distance = random.range(55, 190)
    const cx = Math.cos(angle) * distance
    const cz = Math.sin(angle) * distance
    const count = 3 + Math.floor(random() * 7)
    for (let index = 0; index < count; index += 1) {
      const size = random.range(3.2, 6.5)
      placements[index % 3].push(item(V(cx + random.gauss() * 9, 0, cz + random.gauss() * 9), random() * 6.28, size))
    }
  }
  treeVariants.forEach((geometry, index) => {
    const part = new GrowingPart({ geometry, material, items: placements[index], scale: () => 1, castShadow: false, receiveShadow: false })
    part.update(0)
    group.add(part.mesh)
  })
  for (let index = 0; index < 11; index += 1) {
    const angle = random() * Math.PI * 2
    const distance = random.range(34, 120)
    const palm = new THREE.Mesh(palmyra(random), material)
    palm.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
    group.add(palm)
  }
  for (let index = 0; index < 4; index += 1) {
    const angle = random() * Math.PI * 2
    const distance = random.range(40, 90)
    const clump = new THREE.Mesh(bambooClump(random), material)
    clump.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
    group.add(clump)
  }
  for (let index = 0; index < 3; index += 1) {
    const angle = -0.6 + index * 0.5 + random.gauss() * 0.2
    const distance = random.range(48, 70)
    const mesh = new THREE.Mesh(hut(random), material)
    mesh.position.set(Math.cos(angle) * distance, 0, -Math.abs(Math.sin(angle) * distance) - 20)
    mesh.rotation.y = random() * 6.28
    mesh.castShadow = true
    group.add(mesh)
  }
  return group
}

/* ------------------------------------------------------------- creatures and details */
export function egretGeometry() {
  const body = transform(ellipsoid(0.07, 0.075, 0.17, { widthSegments: 8, heightSegments: 6, color: '#f6f4ea' }), { position: [0, 0.38, 0], rotation: [-0.25, 0, 0] })
  const neck = tube([V(0, 0.42, 0.12), V(0, 0.5, 0.12), V(0, 0.55, 0.17), V(0, 0.6, 0.15)], 0.022, 0.016, { radial: 5, tubular: 5, color: '#f6f4ea' })
  const head = transform(ellipsoid(0.028, 0.026, 0.04, { widthSegments: 6, heightSegments: 4, color: '#f6f4ea' }), { position: [0, 0.615, 0.16] })
  const beak = prep(new THREE.ConeGeometry(0.009, 0.07, 4), '#e0b23a')
  beak.rotateX(Math.PI / 2)
  beak.translate(0, 0.61, 0.215)
  const legs = [-0.03, 0.03].map((x) => {
    const leg = prep(new THREE.CylinderGeometry(0.0045, 0.0045, 0.34, 3), '#2d2a22')
    leg.translate(x, 0.17, 0)
    return leg
  })
  return merge([body, neck, head, beak, ...legs])
}

export function buildScarecrow() {
  const parts = []
  const pole = prep(new THREE.CylinderGeometry(0.025, 0.03, 1.9, 5), '#5c4630')
  pole.translate(0, 0.95, 0)
  const arms = prep(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5), '#5c4630')
  arms.rotateZ(Math.PI / 2)
  arms.translate(0, 1.38, 0)
  const kurta = prep(new THREE.CylinderGeometry(0.17, 0.26, 0.72, 8, 1, true), '#c2553a', (c, x, y) => c.set('#c2553a').multiplyScalar(0.8 + (Math.sin(x * 30) * 0.5 + 0.5) * 0.25))
  kurta.translate(0, 1.15, 0)
  const sleeves = prep(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 6, 1, true), '#b04a33')
  sleeves.rotateZ(Math.PI / 2)
  sleeves.translate(0, 1.38, 0)
  const pot = transform(ellipsoid(0.15, 0.14, 0.15, { widthSegments: 10, heightSegments: 8, colorFn: (c, x, y, z) => c.set(z > 0.06 && Math.abs(y) < 0.07 ? '#f2ede0' : '#a0532e') }), { position: [0, 1.7, 0] })
  const eyes = [-0.05, 0.05].map((x) => transform(ellipsoid(0.018, 0.022, 0.01, { color: '#1b1612' }), { position: [x, 1.73, 0.142] }))
  const hat = prep(new THREE.ConeGeometry(0.24, 0.1, 10), '#c9ad6e')
  hat.translate(0, 1.85, 0)
  parts.push(pole, arms, kurta, sleeves, pot, ...eyes, hat)
  return merge(parts)
}

export function buildStars(random) {
  const count = 1400
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const direction = V(random.gauss(), Math.abs(random.gauss()) * 0.9 + 0.05, random.gauss()).normalize().multiplyScalar(1500)
    positions.set([direction.x, direction.y, direction.z], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#e8eeff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false, depthWrite: false }))
  points.visible = false
  return points
}

export function buildMoon() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(64, 64, 10, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,250,235,1)')
  gradient.addColorStop(0.36, 'rgba(240,238,225,1)')
  gradient.addColorStop(0.42, 'rgba(200,210,240,0.25)')
  gradient.addColorStop(1, 'rgba(160,180,230,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, fog: false, depthWrite: false, transparent: true }))
  sprite.scale.setScalar(110)
  sprite.visible = false
  return sprite
}

// Fireflies (jugnu) blinking over the field on warm nights.
export function buildFireflies(random) {
  const count = 140
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  for (let index = 0; index < count; index += 1) {
    positions.set([random.range(-12, 12), random.range(0.3, 2.4), random.range(-12, 14)], index * 3)
    phases[index] = random() * 100
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float phase;
      uniform float uTime;
      uniform float uScale;
      varying float vGlow;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.4 + phase) * 0.6;
        p.y += sin(uTime * 0.7 + phase * 1.3) * 0.25;
        p.z += cos(uTime * 0.35 + phase * 0.7) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vGlow = pow(max(0.0, sin(uTime * 1.6 + phase * 3.1)), 3.0);
        gl_PointSize = uScale * (110.0 / -mv.z) * (0.25 + vGlow);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vGlow;
        gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * a * 1.6, a);
      }`,
  })
  const points = new THREE.Points(geometry, material)
  points.visible = false
  points.frustumCulled = false
  return points
}

// A loose line of egrets crossing the sky.
export function buildFlock() {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 0.8, side: THREE.DoubleSide })
  const birds = []
  for (let index = 0; index < 6; index += 1) {
    const bird = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.32, 3, 6), material)
    body.rotation.x = Math.PI / 2
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.18, 2, 5), material)
    neck.rotation.x = Math.PI / 2
    neck.position.z = 0.3
    bird.add(body, neck)
    const wings = []
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group()
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.26), material)
      wing.rotation.x = -Math.PI / 2
      wing.position.x = side * 0.38
      pivot.add(wing)
      bird.add(pivot)
      wings.push({ pivot, side })
    }
    bird.userData = { wings, offset: V(index * 1.4 - 3, Math.sin(index) * 0.8, -index * 1.1 + (index % 2) * 0.6), phase: index * 0.7 }
    group.add(bird)
    birds.push(bird)
  }
  group.userData.birds = birds
  return group
}

export function animateFlock(flock, time) {
  const loop = 46
  const t = (time % loop) / loop
  const base = V(lerp(-130, 130, t), 26 + Math.sin(t * 6) * 2, lerp(-70, -20, t))
  flock.userData.birds.forEach((bird) => {
    const { wings, offset, phase } = bird.userData
    bird.position.copy(base).add(offset)
    bird.rotation.y = Math.PI / 2 - 0.2
    const flap = Math.sin(time * 4.2 + phase) * 0.55
    wings.forEach(({ pivot, side }) => { pivot.rotation.z = side * flap })
  })
}

export { windDepthMaterial }
