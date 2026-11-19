// Polyhouse: soil floor with mulched raised beds, galvanised arched frame and translucent film.
import * as THREE from 'three'
import { merge, prep, tube } from '../../geometry.js'
import { V } from '../../crops.js'
import { rigid, rod, shapedSoil } from './kit.js'

export function polyhouse(ctx, { width, depth, wall = 2.5, ridge = 4.4, bay = 2.0, layout, mulch }) {
  shapedSoil(ctx, { width, depth }, { h: layout.h, color: '#86664a', seed: 21, mulch })
  const half = width / 2
  const rise = ridge - wall
  const archAt = (a, z) => V(-half * Math.cos(a), wall + rise * Math.sin(a), z)
  const steel = []
  const color = '#d4d8dc'
  const zs = []
  for (let z = -depth / 2; z <= depth / 2 + 0.01; z += bay) zs.push(z)
  zs.forEach((z, index) => {
    steel.push(rod(V(-half, 0, z), V(-half, wall, z), 0.026, color, 6), rod(V(half, 0, z), V(half, wall, z), 0.026, color, 6))
    const points = Array.from({ length: 13 }, (_, k) => archAt((k / 12) * Math.PI, z))
    steel.push(tube(points, 0.021, 0.021, { radial: 5, tubular: 18, color }))
    if (index % 2 === 0) steel.push(rod(V(-half, wall, z), V(half, wall, z), 0.014, color, 4))
  })
  // purlins along the house
  for (const a of [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75, Math.PI]) steel.push(rod(archAt(a, -depth / 2), archAt(a, depth / 2), 0.016, color, 4))
  for (const x of [-half, half]) steel.push(rod(V(x, 1.1, -depth / 2), V(x, 1.1, depth / 2), 0.014, color, 4))
  rigid(ctx, steel, { roughness: 0.38, metalness: 0.55 })

  // film over the roof and the back gable, insect net on the side walls; neither casts shadows
  const roof = new THREE.PlaneGeometry(1, 1, 20, 6)
  const position = roof.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const u = position.getX(index) + 0.5
    const v = position.getY(index) + 0.5
    const p = archAt(u * Math.PI, -depth / 2 + v * depth)
    // film sags slightly between arches
    const sag = Math.abs(Math.sin(((v * depth) / bay) * Math.PI)) * 0.04
    position.setXYZ(index, p.x * (1 - sag * 0.02), p.y - sag, p.z)
  }
  roof.computeVertexNormals()
  const shape = new THREE.Shape()
  shape.moveTo(-half, 0)
  for (let k = 0; k <= 16; k += 1) {
    const p = archAt((k / 16) * Math.PI, 0)
    shape.lineTo(p.x, p.y)
  }
  shape.lineTo(half, 0)
  const gable = new THREE.ShapeGeometry(shape, 4)
  gable.translate(0, 0, -depth / 2)
  const film = new THREE.Mesh(merge([prep(roof), prep(gable)]), new THREE.MeshStandardMaterial({ color: '#eef4f2', transparent: true, opacity: 0.17, roughness: 0.18, side: THREE.DoubleSide, depthWrite: false }))
  film.renderOrder = 3
  const walls = [-half, half].map((x) => {
    const g = new THREE.PlaneGeometry(depth, wall - 0.05, 1, 1)
    g.rotateY(Math.PI / 2)
    g.translate(x, wall / 2 + 0.02, 0)
    return prep(g)
  })
  const net = new THREE.Mesh(merge(walls), new THREE.MeshStandardMaterial({ color: '#e4ebe8', transparent: true, opacity: 0.28, roughness: 0.9, side: THREE.DoubleSide, depthWrite: false }))
  net.renderOrder = 3
  for (const mesh of [film, net]) {
    mesh.castShadow = false
    mesh.receiveShadow = false
    ctx.disposables.push(mesh.material)
    ctx.addMesh(mesh)
  }
  return { wall, ridge, half }
}
