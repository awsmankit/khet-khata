import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Seeded random so every visit grows the same field.
export function makeRandom(seed = 1) {
  let state = seed >>> 0 || 1
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (min, max) => min + next() * (max - min)
  next.pick = (list) => list[Math.floor(next() * list.length)]
  next.gauss = () => (next() + next() + next() - 1.5) / 1.5
  return next
}

export const clamp01 = (value) => Math.min(1, Math.max(0, value))
export const smooth = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}
export const lerp = (a, b, t) => a + (b - a) * t

const tmpColor = new THREE.Color()

// Normalises a geometry so it can be merged: non-indexed, position/normal/uv/color only.
export function prep(geometry, color = '#ffffff', colorFn = null) {
  if (!geometry.attributes.normal) geometry.computeVertexNormals()
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name)
  const count = g.attributes.position.count
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2))
  if (!g.attributes.color || colorFn) {
    const colors = new Float32Array(count * 3)
    const position = g.attributes.position
    for (let index = 0; index < count; index += 1) {
      if (colorFn) colorFn(tmpColor, position.getX(index), position.getY(index), position.getZ(index), index)
      else tmpColor.set(color)
      colors[index * 3] = tmpColor.r
      colors[index * 3 + 1] = tmpColor.g
      colors[index * 3 + 2] = tmpColor.b
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  }
  g.morphAttributes = {}
  return g
}

export function merge(list) {
  const valid = list.filter(Boolean)
  if (!valid.length) return new THREE.BufferGeometry()
  const merged = mergeGeometries(valid, false)
  valid.forEach((geometry) => geometry.dispose())
  return merged
}

export function transform(geometry, { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], order = 'XYZ' } = {}) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], order)),
    new THREE.Vector3(...(Array.isArray(scale) ? scale : [scale, scale, scale])),
  )
  geometry.applyMatrix4(matrix)
  return geometry
}

// Points a geometry built along +Y so that it follows `direction`, starting at `origin`.
export function orient(geometry, origin, direction) {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
  geometry.applyMatrix4(new THREE.Matrix4().compose(origin, quaternion, new THREE.Vector3(1, 1, 1)))
  return geometry
}

const profiles = {
  grass: (t) => Math.pow(1 - t, 0.7) * Math.min(1, 0.55 + t * 5),
  strap: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)), 0.55),
  lance: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9),
  oval: (t) => Math.pow(Math.sin(Math.PI * t), 0.6),
  paddle: (t) => Math.min(1, t * 9) * Math.pow(Math.max(0, 1 - Math.pow(t, 5)), 0.5),
}

// A leaf blade that rises from the origin along +Z/+Y and droops under its own weight.
// Edges can be torn (banana) by giving each segment its own edge drop.
export function blade({ length = 1, width = 0.05, rise = 1.2, droop = 1, segments = 6, fold = 0.25, shape = 'grass', base = '#ffffff', tip = '#ffffff', rib = null, tear = 0, random = Math.random, curlSide = 0 }) {
  const profile = profiles[shape] || profiles.grass
  const positions = []
  const colors = []
  const indices = []
  const colorBase = new THREE.Color(base)
  const colorTip = new THREE.Color(tip)
  const colorRib = rib ? new THREE.Color(rib) : null
  const point = new THREE.Vector3()
  const step = length / segments
  const edgeDrops = Array.from({ length: segments + 1 }, () => (tear > 0 && random() < tear ? random() * 0.9 : 0))
  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments
    const theta = rise - droop * Math.pow(t, 1.5)
    const halfWidth = (width * profile(t)) / 2
    const normal = new THREE.Vector3(0, Math.cos(theta), -Math.sin(theta))
    const drop = edgeDrops[row] * halfWidth
    const left = point.clone().add(new THREE.Vector3(-halfWidth, 0, 0)).addScaledVector(normal, -halfWidth * fold - drop + curlSide * halfWidth)
    const middle = point.clone().addScaledVector(normal, halfWidth * fold * 0.4)
    const right = point.clone().add(new THREE.Vector3(halfWidth, 0, 0)).addScaledVector(normal, -halfWidth * fold - drop * 0.7 - curlSide * halfWidth)
    for (const [vertex, isRib] of [[left, false], [middle, true], [right, false]]) {
      positions.push(vertex.x, vertex.y, vertex.z)
      tmpColor.copy(colorBase).lerp(colorTip, t)
      if (isRib && colorRib) tmpColor.lerp(colorRib, 0.55)
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
    }
    point.add(new THREE.Vector3(0, Math.sin(theta), Math.cos(theta)).multiplyScalar(step))
  }
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const a = row * 3 + column
      const b = a + 3
      if (tear > 0 && edgeDrops[row + 1] > 0.45 && column === (row % 2)) {
        // leave a gap: a torn strip
        indices.push(a, b, a + 1)
      } else {
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return prep(geometry)
}

export function tube(points, radiusStart, radiusEnd, { radial = 5, tubular = 6, color = '#ffffff', colorFn = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false)
  // taper the radius along the tube
  const position = geometry.attributes.position
  const center = new THREE.Vector3()
  const vertex = new THREE.Vector3()
  for (let ring = 0; ring <= tubular; ring += 1) {
    const t = ring / tubular
    curve.getPointAt(t, center)
    const radius = lerp(radiusStart, radiusEnd, t)
    for (let side = 0; side <= radial; side += 1) {
      const index = ring * (radial + 1) + side
      vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(radius).add(center)
      position.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }
  }
  geometry.computeVertexNormals()
  return prep(geometry, color, colorFn)
}

export function ellipsoid(rx, ry, rz, { widthSegments = 6, heightSegments = 4, color = '#ffffff', colorFn = null, detail = null } = {}) {
  const geometry = detail === null ? new THREE.SphereGeometry(1, widthSegments, heightSegments) : new THREE.IcosahedronGeometry(1, detail)
  geometry.scale(rx, ry, rz)
  return prep(geometry, color, colorFn)
}

// Wind: plants bend downwind with height, gusts roll across the field as visible waves,
// and leaves flutter. Patched into standard materials so lighting and shadows still work.
export function createWindUniforms() {
  return { uTime: { value: 0 }, uWind: { value: 0.5 } }
}

function windChunk() {
  return /* glsl */`
    vec4 kkLocal = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      kkLocal = instanceMatrix * kkLocal;
    #endif
    vec4 kkWorld = modelMatrix * kkLocal;
    float kkH = max( kkWorld.y - uGround, 0.0 ) / uRefHeight;
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
}

export function applyWind(material, uniforms, { strength = 0.25, flutter = 0.01, refHeight = 1, ground = 0 } = {}) {
  const local = { uStrength: { value: strength }, uFlutter: { value: flutter }, uRefHeight: { value: refHeight }, uGround: { value: ground } }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, local)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nuniform float uStrength;\nuniform float uFlutter;\nuniform float uRefHeight;\nuniform float uGround;')
      .replace('#include <project_vertex>', windChunk())
  }
  material.customProgramCacheKey = () => 'kk-wind'
  material.userData.wind = local
  return material
}

export function windDepthMaterial(uniforms, options) {
  return applyWind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uniforms, options)
}

// An InstancedMesh whose instances grow, shrink and change colour with the season.
export class GrowingPart {
  constructor({ geometry, material, items, scale = () => 1, color = null, pivot = null, parent = null, castShadow = true, receiveShadow = true, depthMaterial = null }) {
    this.items = items
    this.scale = scale
    this.color = color
    this.pivot = pivot
    this.parent = parent
    this.mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1))
    this.mesh.count = items.length
    this.mesh.castShadow = castShadow
    this.mesh.receiveShadow = receiveShadow
    this.mesh.frustumCulled = false
    if (depthMaterial) this.mesh.customDepthMaterial = depthMaterial
    if (color) this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(items.length, 1) * 3).fill(1), 3)
    this.matrix = new THREE.Matrix4()
    this.local = new THREE.Matrix4()
    this.vector = new THREE.Vector3()
    this.colorTemp = new THREE.Color()
  }

  update(growth) {
    const { items, mesh, matrix, local, vector, colorTemp } = this
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const g = clamp01(growth + (item.offset || 0))
      if (this.parent) {
        const parentScale = this.parent(g, item)
        const own = this.scale(g, item)
        if (Array.isArray(parentScale)) vector.set(parentScale[0] * item.s, parentScale[1] * item.s, parentScale[2] * item.s)
        else vector.setScalar(parentScale * item.s)
        matrix.compose(item.p, item.q, vector)
        const pivot = item.pivot || this.pivot
        local.makeScale(own, own, own)
        local.setPosition(pivot.x * (1 - own), pivot.y * (1 - own), pivot.z * (1 - own))
        matrix.multiply(local)
      } else {
        const own = this.scale(g, item)
        if (Array.isArray(own)) vector.set(own[0] * item.s, own[1] * item.s, own[2] * item.s)
        else vector.setScalar(own * item.s)
        matrix.compose(item.p, item.q, vector)
      }
      mesh.setMatrixAt(index, matrix)
      if (this.color) {
        this.color(colorTemp, g, item)
        mesh.setColorAt(index, colorTemp)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.dispose?.()
  }
}

export function item(position, yaw = 0, scale = 1, offset = 0, tilt = [0, 0]) {
  return {
    p: position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position),
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt[0], yaw, tilt[1], 'YXZ')),
    s: scale,
    offset,
  }
}

export function plantMaterial({ roughness = 0.78, metalness = 0, side = THREE.DoubleSide, color = '#ffffff', ...rest } = {}) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness, side, color, ...rest })
}
