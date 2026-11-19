// Shared village pond (pokhar): an earthen pond dug into the ground, with muddy sloping
// banks, a grassy rim, reeds at the waterline and a murky, reflective water surface with
// cheap shader ripples.
//
// The scene's ground is one big plane at y = -0.03, so a hole cannot be cut in it. Instead
// everything inside the pond is drawn first (renderOrder -3), then an invisible "lid" at
// y = 0 over the pond writes depth only (renderOrder -2). The ground plane, drawn later,
// fails the depth test inside the pond, so the basin shows through as if dug. Because of
// this, every mesh in or near the pond must be opaque and use POND_ORDER.
import * as THREE from 'three'
import { GrowingPart, blade, item, lerp, makeRandom, merge, prep, smooth, transform } from '../../geometry.js'
import { V, windMaterials } from '../../crops.js'
import { grassClump, soilTexture } from '../../scenery.js'

export const POND_ORDER = -3
const LID_ORDER = -2
const tmp = new THREE.Color()
const tmp2 = new THREE.Color()

const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}
export const noise = (x, z) => {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), ux), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), ux), uz)
}

// Bank profile: s is metres inward from the rim (where the bank crosses y = 0).
const BANK = [[-1.15, -0.05], [-0.8, 0.02], [-0.45, 0.07], [-0.15, 0.05], [0, 0], [0.3, -0.1], [0.62, -0.2], [0.92, -0.29], [1.25, -0.38], [1.8, -0.58], [2.8, -1.0]]
export function bankHeight(s) {
  if (s <= BANK[0][0]) return BANK[0][1]
  for (let index = 1; index < BANK.length; index += 1) {
    if (s <= BANK[index][0]) {
      const [s0, y0] = BANK[index - 1]
      const [s1, y1] = BANK[index]
      const t = (s - s0) / (s1 - s0)
      return lerp(y0, y1, t * t * (3 - 2 * t))
    }
  }
  return BANK[BANK.length - 1][1]
}

export function pondShape(random, halfW, halfD, power = 4) {
  const phases = [random() * 6.28, random() * 6.28, random() * 6.28]
  const radius = (theta) => {
    const c = Math.abs(Math.cos(theta))
    const s = Math.abs(Math.sin(theta))
    const base = Math.pow(Math.pow(c / halfW, power) + Math.pow(s / halfD, power), -1 / power)
    return base * (1 + 0.028 * Math.sin(3 * theta + phases[0]) + 0.016 * Math.sin(5 * theta + phases[1]) + 0.008 * Math.sin(9 * theta + phases[2]))
  }
  // metres inward from the rim; negative outside the pond
  const inward = (x, z) => radius(Math.atan2(z, x)) - Math.hypot(x, z)
  return { radius, inward, halfW, halfD }
}

function basinGeometry(shape, waterY) {
  const segments = 220
  const ringList = []
  for (let s = -1.2; s < 2.85; s += s < 1.3 ? 0.1 : 0.3) ringList.push(s)
  const positions = []
  const colors = []
  const uvs = []
  const indices = []
  for (const s of ringList) {
    for (let j = 0; j < segments; j += 1) {
      const theta = (j / segments) * Math.PI * 2
      const r = Math.max(0.5, shape.radius(theta) - s)
      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r
      const n = noise(x * 1.4 + 3.1, z * 1.4)
      const n2 = noise(x * 4.3, z * 4.3 + 7.7)
      const bumpiness = smooth(-1.15, -0.6, s) * (1 - smooth(1.2, 1.8, s))
      // keep the rim crossing close to y = 0 so it meets the depth lid cleanly
      const nearRim = 1 - 0.7 * (1 - smooth(0, 0.18, Math.abs(s)))
      const y = bankHeight(s) + ((n - 0.5) * 0.05 + (n2 - 0.5) * 0.018) * bumpiness * nearRim
      positions.push(x, y, z)
      uvs.push(x / 2.4, z / 2.4)
      // dark wet mud at the waterline, brown mud on the slope, grass on the rim
      const wet = smooth(waterY + 0.08, waterY + 0.01, y)
      const grassy = smooth(-0.06, 0.035, y) * smooth(0.25, 0.65, n * 0.8 + n2 * 0.4)
      tmp.set('#7d654a').lerp(tmp2.set('#5e4a36'), smooth(0.3, 0.8, n2) * 0.5)
      tmp.lerp(tmp2.set('#3a3127'), wet)
      tmp.lerp(tmp2.set('#66793a'), grassy * 0.9)
      if (s < -0.7) tmp.lerp(tmp2.set('#617636'), smooth(-0.7, -1.0, s) * 0.8)
      tmp.multiplyScalar(0.92 + n2 * 0.16)
      colors.push(tmp.r, tmp.g, tmp.b)
    }
  }
  for (let i = 0; i < ringList.length - 1; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * segments + j
      const b = (i + 1) * segments + j
      const c = i * segments + ((j + 1) % segments)
      const d = (i + 1) * segments + ((j + 1) % segments)
      indices.push(a, b, c, c, b, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function rimShapeGeometry(shape, y, inset = 0) {
  const points = []
  const segments = 220
  for (let j = 0; j < segments; j += 1) {
    const theta = (j / segments) * Math.PI * 2
    const r = shape.radius(theta) - inset
    points.push(new THREE.Vector2(Math.cos(theta) * r, -Math.sin(theta) * r))
  }
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(points))
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, y, 0)
  return geometry
}

// Reflective murky water with shader ripples: a few slow wind wavelets plus up to
// eight expanding ring ripples (fish rising, insects, splashes) and an optional foam patch.
function pondWaterMaterial(color) {
  const uniforms = {
    uKkTime: { value: 0 },
    uKkWave: { value: 0.01 },
    uKkRipples: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -100, 0)) },
    uKkFoam: { value: new THREE.Vector4(0, 0, 1, 0) },
  }
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0, envMapIntensity: 0.28 })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKkWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvKkWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vKkWorld;
uniform float uKkTime;
uniform float uKkWave;
uniform vec4 uKkRipples[ 8 ];
uniform vec4 uKkFoam;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
	float kkFoam = 0.0;
	if ( uKkFoam.w > 0.0 ) {
		float kkR = length( vKkWorld.xz - uKkFoam.xy ) / uKkFoam.z;
		float kkN = sin( vKkWorld.x * 21.0 + uKkTime * 2.7 ) * sin( vKkWorld.z * 17.0 - uKkTime * 2.1 ) * 0.5 + 0.5;
		kkFoam = uKkFoam.w * smoothstep( 1.0, 0.15, kkR ) * smoothstep( 0.25, 0.85, kkN * 0.6 + ( 1.0 - kkR ) * 0.7 );
	}
	diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.8, 0.83, 0.78 ), kkFoam );`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = mix( roughnessFactor, 0.75, kkFoam );')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n\tmetalnessFactor = mix( metalnessFactor, 0.0, kkFoam );')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
	{
		vec2 kp = vKkWorld.xz;
		float kt = uKkTime;
		vec2 kg = vec2( 0.0 );
		// soft, irregular wavelets: three crossing directions with warped phase and patchy amplitude
		float kw1 = 0.55 + 0.45 * sin( dot( kp, vec2( 0.31, -0.17 ) ) + kt * 0.21 );
		float kw2 = 0.55 + 0.45 * sin( dot( kp, vec2( -0.23, 0.29 ) ) + kt * 0.17 + 2.1 );
		vec2 kd1 = normalize( vec2( 0.83, 0.55 ) );
		vec2 kd2 = normalize( vec2( -0.47, 0.88 ) );
		vec2 kd3 = normalize( vec2( 0.12, -0.99 ) );
		kg += kd1 * cos( dot( kp, kd1 ) * 4.3 + kt * 1.4 + 2.3 * sin( dot( kp, kd2 ) * 0.61 + kt * 0.2 ) ) * uKkWave * kw1;
		kg += kd2 * cos( dot( kp, kd2 ) * 6.1 + kt * 1.9 + 2.0 * sin( dot( kp, kd3 ) * 0.53 - kt * 0.15 ) ) * uKkWave * 0.8 * kw2;
		kg += kd3 * cos( dot( kp, kd3 ) * 8.9 + kt * 2.5 + 1.8 * sin( dot( kp, kd1 ) * 0.73 ) ) * uKkWave * 0.5 * kw1 * kw2;
		for ( int i = 0; i < 8; i ++ ) {
			vec4 kr = uKkRipples[ i ];
			float age = kt - kr.z;
			if ( age > 0.0 && age < 4.0 ) {
				vec2 dp = kp - kr.xy;
				float d = length( dp );
				float x = d - age * 0.42;
				float env = exp( -x * x * 26.0 ) * ( 1.0 - age * 0.25 ) * kr.w / ( 1.0 + d * 2.0 );
				kg += dp / max( d, 0.0001 ) * sin( x * 40.0 ) * env;
			}
		}
		normal = normalize( mat3( viewMatrix ) * normalize( vec3( -kg.x, 1.0, -kg.y ) ) );
	}`)
  }
  material.customProgramCacheKey = () => 'kk-pond-water'
  return { material, uniforms }
}

// Jittered grid of points on open water at least `margin` metres in from the rim.
export function waterSpots(random, shape, spacing, margin) {
  const spots = []
  for (let x = -shape.halfW; x < shape.halfW; x += spacing) {
    for (let z = -shape.halfD; z < shape.halfD; z += spacing * 0.87) {
      const px = x + ((Math.round(z / (spacing * 0.87)) % 2) ? spacing * 0.5 : 0) + random.gauss() * spacing * 0.25
      const pz = z + random.gauss() * spacing * 0.25
      if (shape.inward(px, pz) > margin) spots.push([px, pz])
    }
  }
  return spots
}

export function pondPart(ctx, options) {
  const part = new GrowingPart(options)
  part.mesh.renderOrder = POND_ORDER
  ctx.addPart(part)
  return part
}

export function pondMesh(ctx, object) {
  object.traverse((child) => { if (child.isMesh) child.renderOrder = POND_ORDER })
  ctx.addMesh(object)
  return object
}

function reedClump(random) {
  const parts = []
  const count = 11
  for (let index = 0; index < count; index += 1) {
    const geometry = blade({ length: random.range(0.45, 0.85), width: random.range(0.01, 0.016), rise: random.range(1.2, 1.5), droop: random.range(0.4, 1.1), segments: 5, fold: 0.3, base: '#7a7a6a', tip: '#e2e2d0' })
    transform(geometry, { rotation: [0, random() * Math.PI * 2, 0], position: [random.gauss() * 0.06, 0, random.gauss() * 0.06] })
    parts.push(geometry)
  }
  return merge(parts)
}

// Builds the pond and returns helpers plus a finish() that makes the crop config.
export function buildPond(ctx, { width = 20, depth = 24, waterY = -0.27, waterColor = '#45502f', wave = 0.01, reeds = 1, rippleRate = 1.4 } = {}) {
  const { random, quality } = ctx
  const shape = pondShape(random, width / 2 - 1.35, depth / 2 - 1.35)

  // banks
  const texture = soilTexture('#c4c4c4', 23, { wet: true })
  texture.repeat.set(1, 1)
  const bankMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: texture, roughness: 0.93 })
  const bank = new THREE.Mesh(prep(basinGeometry(shape, waterY)), bankMaterial)
  bank.receiveShadow = true
  bank.castShadow = false
  ctx.disposables.push(texture, bankMaterial)
  pondMesh(ctx, bank)

  // water
  const water = pondWaterMaterial(waterColor)
  water.uniforms.uKkWave.value = wave
  const waterMesh = new THREE.Mesh(rimShapeGeometry(shape, waterY, 0.2), water.material)
  waterMesh.receiveShadow = true
  ctx.disposables.push(water.material)
  pondMesh(ctx, waterMesh)

  // depth-only lid that hides the scene's ground plane over the pond
  const lidMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })
  const lid = new THREE.Mesh(rimShapeGeometry(shape, 0.0), lidMaterial)
  lid.renderOrder = LID_ORDER
  lid.castShadow = false
  lid.receiveShadow = false
  ctx.disposables.push(lidMaterial)
  ctx.addMesh(lid)

  // grass on the rim and the plot corners, sparser down the slope
  const grassItems = []
  const target = Math.round(1900 * quality)
  let guard = 0
  while (grassItems.length < target && guard < target * 8) {
    guard += 1
    const x = random.range(-width / 2, width / 2)
    const z = random.range(-depth / 2, depth / 2)
    const s = shape.inward(x, z)
    if (s > 0.62) continue
    if (s > 0.05 && random() > 0.35) continue
    const y = s < -1.15 ? -0.03 : bankHeight(s) - 0.015
    const entry = item(V(x, y, z), random() * 6.28, random.range(0.7, 1.45))
    entry.tone = random.gauss() * 0.12
    entry.dry = random() < 0.25
    grassItems.push(entry)
  }
  const grassMats = windMaterials(ctx, { strength: 0.08, flutter: 0.01, refHeight: 0.4, ground: -0.05 }, { roughness: 0.9 })
  pondPart(ctx, {
    geometry: grassClump(random), material: grassMats.material, depthMaterial: grassMats.depth, items: grassItems, castShadow: false,
    scale: () => 1,
    color: (c, g, entry) => c.set(entry.dry ? '#a39a5c' : '#6c8b3b').multiplyScalar(1 + entry.tone),
  })

  // reeds and sedges in patches at the waterline
  const reedItems = []
  const patches = Array.from({ length: 7 }, () => random() * Math.PI * 2)
  const reedTarget = Math.round(170 * quality * reeds)
  guard = 0
  while (reedItems.length < reedTarget && guard < reedTarget * 30) {
    guard += 1
    const theta = random() * Math.PI * 2
    const near = patches.some((p) => Math.abs(Math.atan2(Math.sin(theta - p), Math.cos(theta - p))) < 0.16)
    if (!near && random() > 0.08) continue
    const s = random.range(0.55, 1.05)
    const r = shape.radius(theta) - s
    const entry = item(V(Math.cos(theta) * r, Math.max(bankHeight(s), waterY) - 0.02, Math.sin(theta) * r), random() * 6.28, random.range(0.7, 1.25), 0, [random.gauss() * 0.08, random.gauss() * 0.08])
    entry.tone = random.gauss() * 0.1
    reedItems.push(entry)
  }
  const reedMats = windMaterials(ctx, { strength: 0.12, flutter: 0.012, refHeight: 0.8, ground: waterY }, { roughness: 0.8 })
  pondPart(ctx, {
    geometry: reedClump(random), material: reedMats.material, depthMaterial: reedMats.depth, items: reedItems,
    scale: () => 1,
    color: (c, g, entry) => c.set('#5d7c37').lerp(tmp2.set('#9c9358'), smooth(0.8, 1, g) * 0.6).multiplyScalar(1 + entry.tone),
  })

  // ripples: a ring buffer of 8 sources read by the water shader
  let rippleIndex = 0
  let clock = 0
  const ripple = (x, z, strength = 0.25, at = clock) => {
    water.uniforms.uKkRipples.value[rippleIndex].set(x, z, at, strength)
    rippleIndex = (rippleIndex + 1) % 8
  }
  const tickRandom = makeRandom(Math.floor(random() * 1e6))
  let nextRipple = 0.5
  const randomWaterPoint = (margin = 1.4) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const x = tickRandom.range(-shape.halfW, shape.halfW)
      const z = tickRandom.range(-shape.halfD, shape.halfD)
      if (shape.inward(x, z) > margin) return [x, z]
    }
    return [0, 0]
  }

  return {
    shape, waterY, water, ripple, random: tickRandom, randomWaterPoint,
    // spontaneous rings from insects and small fish
    tick(elapsed) {
      clock = elapsed
      water.uniforms.uKkTime.value = elapsed
      if (elapsed > nextRipple || elapsed < nextRipple - 30) {
        const [x, z] = randomWaterPoint()
        ripple(x, z, tickRandom.range(0.12, 0.3), elapsed)
        nextRipple = elapsed + tickRandom.range(0.4, 1.6) * rippleRate
      }
    },
    setWaterColor(color) { water.material.color.set(color) },
    config(extra) {
      return { plot: { width, depth }, soil: 'none', bund: false, grass: true, scarecrow: false, ...extra }
    },
  }
}
