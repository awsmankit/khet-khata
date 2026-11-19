// Shared toolkit for the plantation group: ground-aware wind (for hill slopes), placement,
// leaf shapes, tree crowns, groves, terrain and small flower/fruit primitives.
import * as THREE from 'three'
import { GrowingPart, item, lerp, merge, orient, plantMaterial, prep, smooth } from '../../engine/geometry.js'
import { V, UP, shade, tone, windMaterials } from '../../engine/plantKit.js'

export const TAU = Math.PI * 2
const tmpA = new THREE.Color()
const tmpB = new THREE.Color()

/* ------------------------------------------------------------------ materials */
// Same wind as geometry.js, but the ground height comes from a per-vertex / per-instance
// `aGround` attribute so plants on a hillside bend from their own base, not from y = 0.
const groundWindChunk = /* glsl */`
    vec4 kkLocal = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      kkLocal = instanceMatrix * kkLocal;
    #endif
    vec4 kkWorld = modelMatrix * kkLocal;
    float kkH = max( kkWorld.y - aGround, 0.0 ) / uRefHeight;
    float kkWave = sin( uTime * 1.15 - kkWorld.x * 0.32 + kkWorld.z * 0.11 ) * 0.5 + 0.5;
    float kkWave2 = sin( uTime * 0.53 - kkWorld.x * 0.11 - kkWorld.z * 0.07 + 1.7 ) * 0.5 + 0.5;
    float kkGust = kkWave * kkWave * 0.7 + kkWave2 * 0.3;
    float kkBend = ( 0.25 + 0.75 * kkGust ) * uWind * uStrength * kkH * kkH;
    float kkFlutter = sin( uTime * ( 5.0 + uWind * 4.0 ) + kkWorld.x * 3.7 + kkWorld.z * 2.9 + kkWorld.y * 4.3 ) * uFlutter * ( 0.3 + uWind ) * min( kkH, 1.5 );
    kkWorld.x += kkBend + kkFlutter;
    kkWorld.z += kkBend * 0.22 + kkFlutter * 0.6;
    kkWorld.y -= kkBend * kkBend * 0.35 / max( uRefHeight, 0.3 );
    vec4 mvPosition = viewMatrix * kkWorld;
    gl_Position = projectionMatrix * mvPosition;
`

function groundWind(material, uniforms, { strength = 0.25, flutter = 0.01, refHeight = 1 }) {
  const local = { uStrength: { value: strength }, uFlutter: { value: flutter }, uRefHeight: { value: refHeight } }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, local)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nuniform float uStrength;\nuniform float uFlutter;\nuniform float uRefHeight;\nattribute float aGround;')
      .replace('#include <project_vertex>', groundWindChunk)
  }
  material.customProgramCacheKey = () => 'kk-wind-ground'
  material.userData.wind = local
  return material
}

// Wind materials; `wind.slope` switches to the ground-aware variant.
export function mats(ctx, wind, options = {}) {
  if (!wind.slope) return { ...windMaterials(ctx, wind, options), slope: false }
  const material = groundWind(plantMaterial(options), ctx.wind, wind)
  const depth = groundWind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), ctx.wind, wind)
  ctx.disposables.push(material, depth)
  return { material, depth, slope: true }
}

// Rigid things (posts, sheds, hedgerows far away): no wind.
export function rigid(ctx, options = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, ...options })
  ctx.disposables.push(material)
  return { material, depth: null, slope: false }
}

function grounded(geometry, y) {
  geometry.setAttribute('aGround', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(y), 1))
  return geometry
}

// An instanced growing part. Adds the per-instance ground attribute for slope materials.
export function part(ctx, m, geometry, items, { scale = () => 1, color = null, parent = null, pivot = null, castShadow = true } = {}) {
  let g = geometry
  if (m.slope) {
    if (g.attributes.aGround) g = g.clone()
    const data = new Float32Array(Math.max(items.length, 1))
    items.forEach((entry, index) => { data[index] = entry.ground || 0 })
    g.setAttribute('aGround', new THREE.InstancedBufferAttribute(data, 1))
  }
  const growing = new GrowingPart({ geometry: g, material: m.material, depthMaterial: m.depth, items, scale, color, parent, pivot, castShadow })
  ctx.addPart(growing)
  return growing
}

// A merged static mesh (trunks, frames, terrain props).
export function solid(ctx, geometries, m, { castShadow = true, receiveShadow = true } = {}) {
  const list = geometries.filter(Boolean)
  if (!list.length) return null
  if (m.slope) list.forEach((g) => { if (!g.attributes.aGround) grounded(g, 0) })
  else list.forEach((g) => { if (g.attributes.aGround) g.deleteAttribute('aGround') })
  const mesh = new THREE.Mesh(merge(list), m.material)
  if (m.depth) mesh.customDepthMaterial = m.depth
  mesh.castShadow = castShadow
  mesh.receiveShadow = receiveShadow
  ctx.addMesh(mesh)
  return mesh
}

// Places plant variants on spots (like assembleField) with per-spot height, yaw and ground.
// spots: [x, z] or { x, y, z, yaw?, scale?, ground?, kind? }
export function plantAt(ctx, { variants, spots, wind, materialOptions = {}, plant = {}, attachments = [], sizes = [0.86, 1.12], tilt = 0.05, jitter = 0.035 }) {
  const { random } = ctx
  const plantScale = plant.scale || (() => 1)
  const plantMats = mats(ctx, wind, materialOptions)
  const attachMats = attachments.map((a) => mats(ctx, { ...wind, ...(a.wind || {}) }, a.materialOptions || materialOptions))
  const all = []
  variants.forEach((variant, variantIndex) => {
    const items = []
    spots.forEach((spot, index) => {
      if (index % variants.length !== variantIndex) return
      const p = Array.isArray(spot) ? V(spot[0], 0, spot[1]) : V(spot.x, spot.y || 0, spot.z)
      const yaw = spot.yaw ?? random() * TAU
      const entry = item(p, yaw, random.range(sizes[0], sizes[1]) * (spot.scale || 1), random.gauss() * jitter, [random.gauss() * tilt, random.gauss() * tilt])
      entry.tone = random.gauss() * 0.07
      entry.ground = spot.ground ?? p.y
      entry.kind = spot.kind ?? (random() < 0.5 ? 0 : 1)
      items.push(entry)
    })
    if (!items.length) return
    part(ctx, plantMats, variant.plant, items, { scale: plantScale, color: plant.color || ((c, g, e) => tone(c.set('#ffffff'), e)) })
    attachments.forEach((a, index) => {
      const geometry = variant[a.key]
      if (!geometry) return
      part(ctx, attachMats[index], geometry, items, { parent: plantScale, pivot: variant.pivots?.[a.key] || V(0, 1, 0), scale: a.scale || (() => 1), color: a.color || ((c, g, e) => tone(c.set('#ffffff'), e)), castShadow: a.castShadow !== false })
    })
    all.push(...items)
  })
  return all
}

// Evenly spaced rows of spots, rows along z at fixed x (like rowSpots), with optional height.
export function rows(random, { width, depth, rowGap, plantGap, jitter = 0.2, skip = 0.02, xs = null, height = null }) {
  const spots = []
  const columns = xs || Array.from({ length: Math.floor(width / rowGap) }, (_, row) => -width / 2 + rowGap * (row + 0.5))
  columns.forEach((x) => {
    for (let z = -depth / 2 + plantGap * 0.5; z < depth / 2; z += plantGap) {
      if (random() < skip) continue
      const px = x + random.gauss() * rowGap * jitter * 0.3
      const pz = z + random.gauss() * plantGap * jitter
      spots.push({ x: px, y: height ? height(px, pz) : 0, z: pz })
    }
  })
  return spots
}

// Height of the furrow-soil ridge under x (matches scenery.buildSoil).
export const ridgeY = (x, width, rowGap) => 0.034 * (Math.cos(2 * Math.PI * ((x + width / 2) / rowGap - 0.5)) * 0.5 + 0.5)

/* ------------------------------------------------------------------ primitives */
const PROFILES = {
  grass: (t) => Math.pow(1 - t, 0.7) * Math.min(1, 0.55 + t * 5),
  strap: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)), 0.55),
  lance: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9),
  oval: (t) => Math.pow(Math.sin(Math.PI * t), 0.6),
  elliptic: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.05 + t * 0.95)), 0.7),
  ovate: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.07 + Math.pow(t, 0.7) * 0.93)), 0.7),
  heart: (t) => Math.pow(Math.sin(Math.PI * (0.24 + 0.76 * Math.pow(t, 0.85))), 0.75),
  petiolate: (t) => (t < 0.28 ? 0.08 : Math.pow(Math.sin(Math.PI * Math.min(1, ((t - 0.28) / 0.72) * 0.97 + 0.03)), 0.8)),
  thread: (t) => 1 - t * 0.7,
}

// A leaf blade like geometry.blade (rises along +Z/+Y, width along X) with more outlines:
// elliptic, ovate, heart (notch pulls the basal lobes back past the petiole), petiolate, thread.
export function leaf({ length = 0.1, width = 0.05, rise = 0.3, droop = 0.6, segments = 3, fold = 0.2, shape = 'elliptic', base = '#a8a8a8', tip = '#dadada', rib = '#ffffff', notch = 0, curl = 0 }) {
  const profile = typeof shape === 'function' ? shape : PROFILES[shape] || PROFILES.elliptic
  const positions = []
  const colors = []
  const indices = []
  const cBase = new THREE.Color(base)
  const cTip = new THREE.Color(tip)
  const cRib = rib ? new THREE.Color(rib) : null
  const point = V()
  const step = length / segments
  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments
    const theta = rise - droop * Math.pow(t, 1.5)
    const half = (width * profile(t)) / 2
    const normal = V(0, Math.cos(theta), -Math.sin(theta))
    const along = V(0, Math.sin(theta), Math.cos(theta))
    const back = row === 0 && notch ? along.clone().multiplyScalar(-notch * length) : V()
    const edge = -half * fold + curl * half
    const left = point.clone().add(V(-half, 0, 0)).addScaledVector(normal, edge).add(back)
    const middle = point.clone().addScaledVector(normal, half * fold * 0.4)
    const right = point.clone().add(V(half, 0, 0)).addScaledVector(normal, edge).add(back)
    for (const [vertex, isRib] of [[left, false], [middle, true], [right, false]]) {
      positions.push(vertex.x, vertex.y, vertex.z)
      tmpA.copy(cBase).lerp(cTip, t)
      if (isRib && cRib) tmpA.lerp(cRib, 0.5)
      colors.push(tmpA.r, tmpA.g, tmpA.b)
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

// Places a leaf so it starts at `at` and points along horizontal azimuth `yaw` (radians, 0 = +Z).
export function leafAt(geometry, at, yaw) {
  geometry.rotateY(yaw)
  geometry.translate(at.x, at.y, at.z)
  return geometry
}

// Yaw that turns +Z towards a direction.
// A small open flower facing +Y: `petals` triangles-pairs round a centre.
export function star({ radius = 0.01, petals = 5, cup = 0.25, width = 0.9, color = '#ffffff', eye = null }) {
  const positions = []
  const colors = []
  const c = new THREE.Color(color)
  const e = new THREE.Color(eye || color)
  for (let k = 0; k < petals; k += 1) {
    const a = (k / petals) * TAU
    const half = (Math.PI / petals) * width
    const l = [Math.cos(a - half) * radius * 0.45, cup * radius * 0.3, Math.sin(a - half) * radius * 0.45]
    const t = [Math.cos(a) * radius, cup * radius, Math.sin(a) * radius]
    const r = [Math.cos(a + half) * radius * 0.45, cup * radius * 0.3, Math.sin(a + half) * radius * 0.45]
    positions.push(0, 0, 0, ...t, ...l, 0, 0, 0, ...r, ...t)
    for (const color of [e, c, c, e, c, c]) colors.push(color.r, color.g, color.b)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return prep(geometry)
}

// A low dome (umbellet of tiny flowers): 6-sided fan.
export function dome(radius, height, { color = '#ffffff', rim = 0.8, sides = 6 } = {}) {
  const positions = []
  const colors = []
  const top = new THREE.Color(color)
  const low = new THREE.Color(color).multiplyScalar(rim)
  for (let k = 0; k < sides; k += 1) {
    const a = (k / sides) * TAU
    const b = ((k + 1) / sides) * TAU
    positions.push(0, height, 0, Math.cos(b) * radius, 0, Math.sin(b) * radius, Math.cos(a) * radius, 0, Math.sin(a) * radius)
    colors.push(top.r, top.g, top.b, low.r, low.g, low.b, low.r, low.g, low.b)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return prep(geometry)
}

// A cheap seed / berry: octahedron or icosahedron, scaled.
export function bead(rx, ry, rz, { color = '#ffffff', detail = -1, colorFn = null } = {}) {
  const geometry = detail < 0 ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, detail)
  geometry.scale(rx, ry, rz)
  return prep(geometry, color, colorFn)
}

// A thin straight stick from a to b (open 3- to 6-sided prism).
export function rod(a, b, radius, { radial = 3, taper = 0.8, color = '#ffffff', colorFn = null } = {}) {
  const direction = b.clone().sub(a)
  const length = direction.length()
  const geometry = new THREE.CylinderGeometry(radius * taper, radius, length, radial, 1, true)
  geometry.translate(0, length / 2, 0)
  return orient(prep(geometry, color, colorFn), a.clone(), direction)
}

// A tube whose radius follows radiusFn(t) (beaded pepper spikes, ribbed stems).
export function shapedTube(points, radiusFn, { radial = 5, tubular = 8, color = '#ffffff', colorFn = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false)
  const position = geometry.attributes.position
  const center = V()
  const vertex = V()
  for (let ring = 0; ring <= tubular; ring += 1) {
    const t = ring / tubular
    curve.getPointAt(t, center)
    const radius = radiusFn(t)
    for (let side = 0; side <= radial; side += 1) {
      const index = ring * (radial + 1) + side
      vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(radius).add(center)
      position.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }
  }
  geometry.computeVertexNormals()
  return prep(geometry, color, colorFn)
}

// Bark: mottled vertex colour.
export const barkFn = (color, amount = 0.35) => (c, x, y, z) => c.set(color).multiplyScalar(0.8 + amount * (Math.sin(x * 37 + y * 11) * Math.sin(z * 29 - y * 7) * 0.5 + 0.5))

// A canvas texture (works in Node through the check script's canvas shim).
export function canvasTexture(ctx, width, height, draw, { repeat = [1, 1] } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  let state = 1234567
  const rand = () => { state = (state * 16807) % 2147483647; return state / 2147483647 }
  draw(context, rand, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  texture.repeat.set(repeat[0], repeat[1])
  ctx.disposables.push(texture)
  return texture
}

/* ------------------------------------------------------------------ leaf clusters */
// A spray of leaves from one point (canopy element), facing up when unrotated.
export function leafCluster(random, { leaves = 6, length = 0.25, width = 0.07, shape = 'elliptic', rise = [0.15, 0.6], droop = [0.5, 1], segments = 3, fold = 0.25, notch = 0, base = '#9a9a9a', tip = '#cacaca', lift = 0.05 }) {
  const parts = []
  for (let index = 0; index < leaves; index += 1) {
    const geometry = leaf({ length: length * random.range(0.8, 1.15), width: width * random.range(0.85, 1.1), rise: random.range(rise[0], rise[1]), droop: random.range(droop[0], droop[1]), segments, fold, shape, notch, base, tip })
    leafAt(geometry, V(random.gauss() * 0.02, random() * lift, random.gauss() * 0.02), (index / leaves) * TAU + random.gauss() * 0.25)
    parts.push(geometry)
  }
  return merge(parts)
}

/* ------------------------------------------------------------------ crowns */
const crownShapes = {
  ellipsoid: (f) => Math.sqrt(Math.max(0, 1 - Math.pow(2 * f - 1, 2))),
  spindle: (f) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + f * 0.94)), 0.85),
  cone: (f) => Math.min(1, (f + 0.06) * 5) * Math.pow(1 - f, 0.9),
  dome: (f) => Math.sqrt(Math.max(0, 1 - f * f)) * Math.min(1, (f + 0.12) * 3.5),
}

// Leaf-cluster items over a crown of revolution: { base, top, radius, shape, shell }.
function crownItems(random, crown, count, { up = 0.55 } = {}) {
  const profile = typeof crown.shape === 'function' ? crown.shape : crownShapes[crown.shape || 'ellipsoid']
  const axis = crown.top.clone().sub(crown.base)
  const height = axis.length()
  const items = []
  let guard = 0
  while (items.length < count && guard < count * 10) {
    guard += 1
    const f = random()
    const w = profile(f)
    if (random() > w + 0.05) continue
    const a = random() * TAU
    const depth = 1 - (crown.shell ?? 0.3) * Math.pow(random(), 1.6)
    const out = V(Math.cos(a), 0, Math.sin(a))
    const p = crown.base.clone().addScaledVector(axis, f).addScaledVector(out, crown.radius * w * depth * (1 + 0.07 * Math.sin(a * 5 + f * 9)))
    if (p.y < 0.4) continue
    const slope = ((profile(Math.max(0, f - 0.03)) - profile(Math.min(1, f + 0.03))) / 0.06) * (crown.radius / height)
    const normal = out.clone().add(V(0, slope, 0)).normalize()
    const facing = normal.clone().add(V(0, up, 0)).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(UP, facing)
    q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * TAU))
    items.push({ p, q, s: random.range(0.85, 1.18), offset: 0, tone: random.gauss() * 0.09 + (f < 0.3 ? -0.1 : 0.03) - (1 - depth) * 0.3, height: f, normal, depth })
  }
  return items
}

// Dark inner mass so dense crowns don't look see-through.
function crownCore(random, crown, fill = 0.72) {
  const profile = typeof crown.shape === 'function' ? crown.shape : crownShapes[crown.shape || 'ellipsoid']
  const axis = crown.top.clone().sub(crown.base)
  const height = axis.length()
  const points = []
  for (let index = 0; index <= 10; index += 1) {
    const f = index / 10
    points.push(new THREE.Vector2(Math.max(0.001, crown.radius * profile(f) * fill), height * (0.04 + f * 0.92)))
  }
  const geometry = new THREE.LatheGeometry(points, 16)
  const position = geometry.attributes.position
  const vertex = V()
  const seed = random() * 10
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const bump = 1 + 0.12 * Math.sin(vertex.x * 2.3 + seed) * Math.sin(vertex.z * 2.1 + vertex.y * 1.3)
    position.setXYZ(index, vertex.x * bump, vertex.y, vertex.z * bump)
  }
  geometry.computeVertexNormals()
  const q = new THREE.Quaternion().setFromUnitVectors(UP, axis.clone().normalize())
  geometry.applyQuaternion(q)
  geometry.translate(crown.base.x, crown.base.y, crown.base.z)
  return prep(geometry, '#ffffff', (c, x, y) => c.setScalar(lerp(0.6, 1, smooth(crown.base.y, crown.top.y, y))))
}

/* ------------------------------------------------------------------ trees */
// A tree with a central leader (silver oak, alder, rubber, clove, nutmeg): straight trunk
// running up through the crown with branches sweeping up and out.
export function leaderTree(random, { origin, height, radius, crownBase, spread, branches = 12, bark = '#5a4a3c', sweep = 0.45, shape = 'spindle', lean = 0.2, branchFrom = 0, twigs = 1, reachScale = 1 }) {
  const wood = []
  const colorFn = barkFn(bark)
  const drift = V(random.gauss() * lean, 0, random.gauss() * lean)
  const top = origin.clone().add(V(drift.x, height, drift.z))
  const trunkPoints = [
    origin.clone().add(V(0, -0.15, 0)),
    origin.clone().add(V(drift.x * 0.15 + random.gauss() * 0.04, height * 0.35, drift.z * 0.15 + random.gauss() * 0.04)),
    origin.clone().add(V(drift.x * 0.55, height * 0.7, drift.z * 0.55)),
    top,
  ]
  wood.push(shapedTube(trunkPoints, (t) => radius * lerp(1, 0.1, Math.pow(t, 0.9)), { radial: 8, tubular: 10, colorFn }))
  const flare = prep(new THREE.CylinderGeometry(radius * 1.05, radius * 1.6, 0.4, 8, 1, true), bark, colorFn)
  flare.translate(origin.x, origin.y + 0.12, origin.z)
  wood.push(flare)
  const trunk = new THREE.CatmullRomCurve3(trunkPoints)
  const profile = typeof shape === 'function' ? shape : crownShapes[shape] || crownShapes.spindle
  const start = Math.max(branchFrom, crownBase)
  const tips = []
  for (let index = 0; index < branches; index += 1) {
    const f = Math.min(0.95, (index + random.range(0.1, 0.9)) / branches)
    const y = lerp(start, height * 0.96, f)
    const at = trunk.getPointAt(Math.min(0.98, (y + 0.15) / (height + 0.15)))
    const cf = (y - crownBase) / (height - crownBase)
    const reach = (spread * profile(Math.min(0.98, Math.max(0.02, cf))) * random.range(0.75, 1.05) + 0.2) * reachScale
    const azimuth = index * 2.39996 + random.gauss() * 0.3
    const out = V(Math.cos(azimuth), 0, Math.sin(azimuth))
    const end = at.clone().addScaledVector(out, reach).add(V(0, reach * sweep, 0))
    const mid = at.clone().addScaledVector(out, reach * 0.5).add(V(0, reach * sweep * 0.25 + reach * 0.12, 0))
    const r = radius * lerp(0.42, 0.14, cf) * random.range(0.8, 1.1)
    wood.push(shapedTube([at, mid, end], (t) => r * lerp(1, 0.3, t), { radial: 5, tubular: 3, colorFn }))
    for (let twig = 0; twig < twigs; twig += 1) {
      const from = at.clone().lerp(end, random.range(0.45, 0.7))
      const a2 = azimuth + random.gauss() * 0.8
      const twigEnd = from.clone().add(V(Math.cos(a2) * reach * 0.35, reach * 0.2, Math.sin(a2) * reach * 0.35))
      wood.push(shapedTube([from, from.clone().lerp(twigEnd, 0.5).add(V(0, 0.05, 0)), twigEnd], (t) => r * 0.45 * lerp(1, 0.3, t), { radial: 4, tubular: 2, colorFn }))
    }
    tips.push(end)
  }
  const crown = { base: origin.clone().add(V(drift.x * 0.4, crownBase, drift.z * 0.4)), top: top.clone().add(V(0, 0.4, 0)), radius: spread, shape }
  return { wood, crown, top, trunk, tips }
}

// Leaves (instanced clusters), wood (merged) and an optional dark core for a set of trees.
// trees: [{ wood, crown, ground?, size? }]
export function grove(ctx, trees, { wind, bark = {}, leafGeometries, clusters = 800, leafColor = '#2f5a26', leafScale = null, core = null, leafMaterial = {}, up = 0.55, shell = null, coreFill = 0.72 }) {
  const { random, quality } = ctx
  const woodMats = mats(ctx, wind, { roughness: 0.92, envMapIntensity: 0.4, side: THREE.FrontSide, ...bark })
  const wood = []
  trees.forEach((tree) => tree.wood.forEach((g) => { if (woodMats.slope) grounded(g, tree.ground || 0); wood.push(g) }))
  solid(ctx, wood, woodMats)
  if (core) {
    const coreMats = mats(ctx, { ...wind, flutter: 0 }, { roughness: 0.92, side: THREE.FrontSide, color: core })
    const cores = trees.map((tree) => { const g = crownCore(random, tree.crown, coreFill); if (coreMats.slope) grounded(g, tree.ground || 0); return g })
    solid(ctx, cores, coreMats)
  }
  const leafItems = trees.flatMap((tree) => crownItems(random, shell === null ? tree.crown : { ...tree.crown, shell }, Math.round(clusters * (tree.size || 1) * quality), { up }).map((entry) => {
    entry.tree = tree
    entry.ground = tree.ground || 0
    return entry
  }))
  const leafMats = mats(ctx, wind, { roughness: 0.55, ...leafMaterial })
  const colorFn = typeof leafColor === 'function' ? leafColor : (c, g, e) => tone(c.set(leafColor), e)
  leafGeometries.forEach((geometry, variant) => {
    const items = leafItems.filter((_, index) => index % leafGeometries.length === variant)
    part(ctx, leafMats, geometry, items, { scale: leafScale || (() => 1), color: colorFn })
  })
  return leafItems
}

/* ------------------------------------------------------------------ ground */
// A grid terrain split into material groups. height(x, z), region(x, z) -> material index.
export function terrain(ctx, { x0, x1, z0, z1, step, height, region = () => 0, uv = (x, z) => [x / 4, z / 4], color = null, materials }) {
  const nx = Math.round((x1 - x0) / step)
  const nz = Math.round((z1 - z0) / step)
  const count = (nx + 1) * (nz + 1)
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  const colors = new Float32Array(count * 3)
  for (let iz = 0; iz <= nz; iz += 1) {
    for (let ix = 0; ix <= nx; ix += 1) {
      const index = iz * (nx + 1) + ix
      const x = x0 + ix * step
      const z = z0 + iz * step
      const y = height(x, z)
      positions.set([x, y, z], index * 3)
      uvs.set(uv(x, z), index * 2)
      if (color) color(tmpA, x, z, y)
      else tmpA.setRGB(1, 1, 1)
      colors.set([tmpA.r, tmpA.g, tmpA.b], index * 3)
    }
  }
  const groups = materials.map(() => [])
  for (let iz = 0; iz < nz; iz += 1) {
    for (let ix = 0; ix < nx; ix += 1) {
      const a = iz * (nx + 1) + ix
      const b = a + 1
      const c = a + nx + 1
      const d = c + 1
      const region0 = region(x0 + (ix + 0.5) * step, z0 + (iz + 0.5) * step)
      groups[region0].push(a, c, b, b, c, d)
    }
  }
  const index = []
  const geometry = new THREE.BufferGeometry()
  groups.forEach((list, materialIndex) => {
    geometry.addGroup(index.length, list.length, materialIndex)
    for (const value of list) index.push(value)
  })
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, materials)
  mesh.receiveShadow = true
  ctx.addMesh(mesh)
  return mesh
}

// Flat floor (leaf litter, sand) slightly above the scene ground, fading at its edge.
export function floor(ctx, { width, depth, texture, tint = '#ffffff', edge = '#8a8f5a', fade = 3, bump = 0.02, y = 0.004, envMapIntensity = 0.5 }) {
  const material = new THREE.MeshStandardMaterial({ map: texture, vertexColors: true, roughness: 1, envMapIntensity })
  ctx.disposables.push(material)
  const inner = new THREE.Color(tint)
  const outer = new THREE.Color(edge)
  return terrain(ctx, {
    x0: -width / 2, x1: width / 2, z0: -depth / 2, z1: depth / 2, step: Math.max(0.5, Math.min(width, depth) / 60),
    height: (x, z) => y + bump * (Math.sin(x * 1.7 + z * 0.6) * Math.sin(z * 1.3 - x * 0.4)),
    uv: (x, z) => [x / 2.4, z / 2.4],
    color: (c, x, z) => {
      const d = Math.min(width / 2 - Math.abs(x), depth / 2 - Math.abs(z))
      const n = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(z * 0.7) * 2) * Math.sin(z * 0.8 - x * 0.3)
      c.copy(outer).lerp(inner, smooth(0, fade, d + (n - 0.5) * fade * 0.8)).multiplyScalar(0.92 + n * 0.16)
    },
    materials: [material],
  })
}

// Leaf-litter texture for shaded plantation floors.
export function litterTexture(ctx, base = '#5b4631', { green = 0.25 } = {}) {
  return canvasTexture(ctx, 256, 256, (context, rand) => {
    context.fillStyle = base
    context.fillRect(0, 0, 256, 256)
    const leaves = ['#7a5a36', '#8c6a3e', '#4a3826', '#6b5233', '#9a7a48', '#5f6a33']
    for (let index = 0; index < 900; index += 1) {
      const x = rand() * 256
      const y = rand() * 256
      context.globalAlpha = 0.35 + rand() * 0.45
      context.fillStyle = rand() < green ? '#4f6a2c' : leaves[Math.floor(rand() * leaves.length)]
      context.beginPath()
      context.ellipse(x, y, 2 + rand() * 5, 1 + rand() * 2.2, rand() * Math.PI, 0, TAU)
      context.fill()
    }
    for (let index = 0; index < 120; index += 1) {
      context.globalAlpha = 0.25
      context.strokeStyle = '#3a2a1c'
      context.beginPath()
      const x = rand() * 256
      const y = rand() * 256
      context.moveTo(x, y)
      context.lineTo(x + rand() * 18 - 9, y + rand() * 18 - 9)
      context.stroke()
    }
  })
}

export { V, UP, shade, tone, smooth, lerp, tmpB }
