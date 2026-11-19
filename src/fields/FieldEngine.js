import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { models } from './models/index.js'
import { createWindUniforms, makeRandom, plantMaterial, applyWind, windDepthMaterial } from './geometry.js'
import { animateFlock, buildBund, buildFireflies, buildFlock, buildGrass, buildGround, buildHorizon, buildMoon, buildScarecrow, buildSoil, buildStars, egretGeometry, lightSettings, sunDirection } from './scenery.js'

const easeOut = (t) => 1 - Math.pow(1 - t, 3)

export class FieldEngine {
  constructor(host, { quality = 1, reducedMotion = false } = {}) {
    this.host = host
    this.quality = quality
    this.reducedMotion = reducedMotion
    this.growth = 0.6
    this.parts = []
    this.cropUpdaters = []
    this.cropDisposables = []
    this.cropTickers = []
    this.visible = true
    this.dirty = true
    this.lastTick = performance.now()
    this.elapsed = 0

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality >= 1 ? 1.75 : 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    host.appendChild(renderer.domElement)
    this.renderer = renderer

    const scene = new THREE.Scene()
    this.scene = scene
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 5000)
    this.controls = new OrbitControls(this.camera, renderer.domElement)
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.07, enablePan: false, maxPolarAngle: Math.PI * 0.495, rotateSpeed: 0.6, zoomSpeed: 0.7 })
    this.controls.addEventListener('start', () => { this.intro = null })
    this.controls.addEventListener('change', () => { this.dirty = true })

    this.wind = createWindUniforms()
    this.sky = new Sky()
    this.sky.scale.setScalar(4000)
    scene.add(this.sky)
    this.envScene = new THREE.Scene()
    this.envSky = new Sky()
    this.envSky.scale.setScalar(50)
    this.envSky.material.uniforms.showSunDisc.value = 0
    this.envScene.add(this.envSky)
    this.pmrem = new THREE.PMREMGenerator(renderer)

    this.hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1)
    scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight('#ffffff', 3)
    this.sun.castShadow = true
    const mapSize = quality >= 1 ? 2048 : 1024
    this.sun.shadow.mapSize.set(mapSize, mapSize)
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.03
    this.sun.shadow.radius = 3
    scene.add(this.sun, this.sun.target)

    const random = makeRandom(20261119)
    this.random = random
    scene.add(buildGround())
    scene.add(buildHorizon(random, quality))
    this.stars = buildStars(random)
    this.moon = buildMoon()
    this.fireflies = buildFireflies(random)
    this.flock = buildFlock()
    scene.add(this.stars, this.moon, this.fireflies, this.flock)
    this.cropGroup = new THREE.Group()
    scene.add(this.cropGroup)

    this.egretGeo = egretGeometry()
    this.egretMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 })
    this.scarecrowGeo = buildScarecrow()

    this.resize = this.resize.bind(this)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(host)
    this.resize()

    this.intersection = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; if (this.visible) this.loop() }, { threshold: 0.01 })
    this.intersection.observe(host)
    this.onVisibility = () => { if (!document.hidden) this.loop() }
    document.addEventListener('visibilitychange', this.onVisibility)

    this.frame = 0
    this.loop = this.loop.bind(this)
  }

  resize() {
    const width = Math.max(this.host.clientWidth, 1)
    const height = Math.max(this.host.clientHeight, 1)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.fov = width < height ? 52 : 40
    this.camera.updateProjectionMatrix()
    this.dirty = true
    this.renderOnce()
  }

  setLight(id) {
    const settings = lightSettings[id] || lightSettings.afternoon
    this.lightId = id
    const night = Boolean(settings.moon)
    const sunDir = sunDirection(settings.elevation, settings.azimuth)
    for (const sky of [this.sky, this.envSky]) {
      const u = sky.material.uniforms
      u.turbidity.value = settings.turbidity
      u.rayleigh.value = settings.rayleigh
      u.mieCoefficient.value = settings.mie
      u.mieDirectionalG.value = settings.mieG
      u.sunPosition.value.copy(sunDir)
      if (u.cloudCoverage) u.cloudCoverage.value = settings.clouds
    }
    const lightDir = night ? sunDirection(settings.moon.elevation, settings.moon.azimuth) : sunDir
    this.lightDir = lightDir
    this.sun.color.set(settings.sun)
    this.sun.intensity = settings.sunIntensity
    this.hemi.color.set(settings.hemiSky)
    this.hemi.groundColor.set(settings.hemiGround)
    this.hemi.intensity = settings.hemi
    this.scene.fog = new THREE.FogExp2(settings.fog, settings.fogDensity)
    this.renderer.toneMappingExposure = settings.exposure
    this.stars.visible = night
    this.moon.visible = night
    this.moon.position.copy(night ? sunDirection(settings.moonSprite.elevation, settings.moonSprite.azimuth) : lightDir).multiplyScalar(1400)
    this.fireflies.visible = night
    this.flock.visible = !night
    this.scene.background = night ? new THREE.Color('#070b14') : null
    this.sky.visible = !night
    this.envTarget?.dispose()
    this.envTarget = this.pmrem.fromScene(this.envScene, 0, 0.1, 200)
    this.scene.environment = this.envTarget.texture
    this.scene.environmentIntensity = settings.env
    this.placeSun()
    this.dirty = true
    this.renderOnce()
  }

  placeSun() {
    if (!this.lightDir || !this.plot) return
    const half = Math.max(this.plot.width, this.plot.depth) / 2 + (this.plot.width > 20 ? 9 : 4)
    const shadowCam = this.sun.shadow.camera
    Object.assign(shadowCam, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 260 })
    shadowCam.updateProjectionMatrix()
    const target = new THREE.Vector3(0, 0, 0)
    this.sun.target.position.copy(target)
    this.sun.position.copy(target).addScaledVector(this.lightDir, 120)
  }

  clearCrop() {
    this.parts.forEach((part) => part.dispose())
    this.parts = []
    this.cropUpdaters = []
    this.cropTickers = []
    this.cropGroup.traverse((object) => {
      if (object.isMesh || object.isInstancedMesh) {
        if (object.geometry !== this.egretGeo && object.geometry !== this.scarecrowGeo) object.geometry?.dispose?.()
      }
    })
    this.cropGroup.clear()
    this.cropDisposables.forEach((disposable) => disposable.dispose?.())
    this.cropDisposables = []
  }

  modelInfo(id) {
    const model = models[id]
    return model ? { stages: model.stages, showcase: model.showcase ?? 0.75 } : null
  }

  setCrop(id, { animateCamera = true } = {}) {
    const model = models[id]
    if (!model) return false
    const builder = model.build
    this.clearCrop()
    this.cropId = id
    const random = makeRandom(id.split('').reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7))
    const trunks = []
    const ctx = {
      random,
      quality: this.quality,
      wind: this.wind,
      disposables: this.cropDisposables,
      groundCover: 'field',
      addPart: (part) => { this.parts.push(part); this.cropGroup.add(part.mesh) },
      addMesh: (mesh) => this.cropGroup.add(mesh),
      basin: (origin, radius) => {
        trunks.push(origin)
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.16, 6, 28), new THREE.MeshStandardMaterial({ color: '#6e5638', roughness: 1 }))
        ring.rotation.x = -Math.PI / 2
        ring.scale.z = 0.5
        ring.position.set(origin.x, -0.02, origin.z)
        ring.receiveShadow = true
        const floor = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), new THREE.MeshStandardMaterial({ color: '#5f4a32', roughness: 1 }))
        floor.rotation.x = -Math.PI / 2
        floor.position.set(origin.x, -0.012, origin.z)
        floor.receiveShadow = true
        this.cropDisposables.push(ring.material, floor.material)
        this.cropGroup.add(ring, floor)
      },
      egrets: (positions, { appear }) => {
        positions.forEach((position, index) => {
          const egret = new THREE.Mesh(this.egretGeo, this.egretMat)
          egret.position.copy(position)
          egret.rotation.y = index * 2.1
          egret.castShadow = true
          egret.userData.bob = index * 1.7
          this.cropGroup.add(egret)
          this.cropUpdaters.push((g) => { egret.visible = appear(g) })
          this.egrets = [...(this.egrets || []), egret]
        })
      },
    }
    this.egrets = []
    const config = builder(ctx)
    this.plot = config.plot
    if (config.update) this.cropUpdaters.push(config.update)
    if (config.tick) this.cropTickers.push(config.tick)
    const soil = buildSoil(config.plot, config.soil, this.cropDisposables)
    this.cropGroup.add(soil.group)
    this.cropUpdaters.push(soil.update)
    const bund = buildBund(config.plot)
    if (config.bund !== false) {
      this.cropGroup.add(bund.mesh)
      this.cropDisposables.push(bund.mesh.material)
    }
    if (config.grass !== false) this.cropGroup.add(buildGrass(ctx, config.plot, bund, { orchardTrunks: trunks }))
    if (config.scarecrow ?? (config.soil === 'furrow' || config.soil === 'paddy')) {
      const scarecrowMaterial = applyWind(plantMaterial({ roughness: 0.9 }), this.wind, { strength: 0.02, flutter: 0.004, refHeight: 1.8 })
      const scarecrow = new THREE.Mesh(this.scarecrowGeo, scarecrowMaterial)
      scarecrow.customDepthMaterial = windDepthMaterial(this.wind, { strength: 0.02, flutter: 0.004, refHeight: 1.8 })
      scarecrow.position.set(-config.plot.width / 2 + 2.2, 0.03, config.plot.depth / 2 - 3.2)
      scarecrow.rotation.y = 0.5
      scarecrow.castShadow = true
      this.cropDisposables.push(scarecrowMaterial, scarecrow.customDepthMaterial)
      this.cropGroup.add(scarecrow)
    }

    const { position, target } = config.camera
    const distance = position.distanceTo(target)
    this.controls.minDistance = Math.max(1.2, distance * 0.25)
    this.controls.maxDistance = distance * 2.4
    if (animateCamera && !this.reducedMotion) {
      const from = position.clone().sub(target).multiplyScalar(1.45).add(target).add(new THREE.Vector3(0, distance * 0.28, 0))
      this.intro = { from, to: position.clone(), fromTarget: target.clone().add(new THREE.Vector3(0, distance * 0.08, 0)), toTarget: target.clone(), start: performance.now(), duration: 2200 }
      this.camera.position.copy(from)
      this.controls.target.copy(this.intro.fromTarget)
    } else {
      this.intro = null
      this.camera.position.copy(position)
      this.controls.target.copy(target)
    }
    this.controls.update()
    this.placeSun()
    this.setGrowth(this.growth)
    return true
  }

  setGrowth(growth) {
    this.growth = growth
    this.parts.forEach((part) => part.update(growth))
    this.cropUpdaters.forEach((update) => update(growth))
    this.dirty = true
    this.renderOnce()
  }

  setWind(value) {
    this.wind.uWind.value = value
    this.dirty = true
    this.renderOnce()
  }

  renderOnce() {
    if (!this.running || this.reducedMotion) {
      this.controls?.update()
      this.renderer.render(this.scene, this.camera)
      this.dirty = false
    }
  }

  start() {
    this.running = true
    this.loop()
  }

  loop() {
    if (!this.running || this.reducedMotion || this.frame) return
    const tick = () => {
      this.frame = 0
      if (!this.running || !this.visible || document.hidden) return
      const now = performance.now()
      const delta = Math.min((now - this.lastTick) / 1000, 0.1)
      this.lastTick = now
      this.elapsed += delta
      this.wind.uTime.value = this.elapsed
      this.sky.material.uniforms.time.value = this.elapsed * 0.6
      this.fireflies.material.uniforms.uTime.value = this.elapsed
      this.fireflies.material.uniforms.uScale.value = this.renderer.getPixelRatio()
      if (this.flock.visible) animateFlock(this.flock, this.elapsed)
      this.cropTickers?.forEach((tick) => tick(this.elapsed, delta))
      this.egrets?.forEach((egret) => { egret.rotation.y += Math.sin(this.elapsed * 0.3 + egret.userData.bob) * 0.002 })
      if (this.intro) {
        const t = easeOut(Math.min(1, (performance.now() - this.intro.start) / this.intro.duration))
        this.camera.position.lerpVectors(this.intro.from, this.intro.to, t)
        this.controls.target.lerpVectors(this.intro.fromTarget, this.intro.toTarget, t)
        if (t >= 1) this.intro = null
      }
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.frame = requestAnimationFrame(tick)
    }
    this.lastTick = performance.now()
    this.frame = requestAnimationFrame(tick)
  }

  dispose() {
    this.running = false
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.intersection.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.clearCrop()
    this.controls.dispose()
    this.scene.traverse((object) => {
      object.geometry?.dispose?.()
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
      else object.material?.dispose?.()
    })
    this.egretGeo.dispose()
    this.scarecrowGeo.dispose()
    this.envTarget?.dispose()
    this.pmrem.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
