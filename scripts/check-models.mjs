// Builds every 3D crop model in Node (no browser), steps it through the season and
// reports problems. Usage: node scripts/check-models.mjs [group-or-crop-id ...]
// Exit code 1 if any model throws, produces NaN, breaks the stage rules or blows the budget.
import * as THREE from 'three'

// Minimal DOM shim for canvas textures.
const fakeContext = new Proxy({}, { get: (target, key) => (key in target ? target[key] : () => fakeContext), set: (target, key, value) => { target[key] = value; return true } })
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext }) }

const { models } = await import('../src/fields/models/index.js')
const { moreCrops } = await import('../src/fields/allCrops.js')
const { cropCatalog } = await import('../src/fields/catalog.js')
const { createWindUniforms, makeRandom } = await import('../src/fields/geometry.js')

const filters = process.argv.slice(2)
const everyCrop = [...cropCatalog.map((crop) => ({ ...crop, group: 'core' })), ...moreCrops]
const selected = everyCrop.filter((crop) => !filters.length || filters.includes(crop.group) || filters.includes(crop.id))
const BUDGET = 3_200_000
const SOILS = ['furrow', 'paddy', 'orchard', 'none']

function triangles(geometry) {
  if (!geometry) return 0
  return (geometry.index ? geometry.index.count : geometry.attributes.position?.count || 0) / 3
}

let failures = 0
const lines = []
for (const crop of selected) {
  const model = models[crop.id]
  if (!model) { lines.push(`MISSING  ${crop.id}`); failures += 1; continue }
  const problems = []
  let tris = 0
  try {
    const parts = []
    const meshes = []
    const ctx = {
      random: makeRandom(42), quality: 1, wind: createWindUniforms(), disposables: [], groundCover: 'field',
      addPart: (part) => parts.push(part), addMesh: (mesh) => meshes.push(mesh), basin: () => {}, egrets: () => {},
    }
    const config = model.build(ctx)
    if (!config?.plot?.width || !config?.plot?.depth) problems.push('config.plot needs width and depth')
    if (!(config?.camera?.position instanceof THREE.Vector3) || !(config?.camera?.target instanceof THREE.Vector3)) problems.push('config.camera needs Vector3 position and target')
    if (!SOILS.includes(config?.soil)) problems.push(`config.soil must be one of ${SOILS.join(', ')}`)
    for (const g of [0, 0.15, 0.35, 0.5, 0.65, 0.8, 1]) {
      parts.forEach((part) => part.update(g))
      config.update?.(g)
      for (const part of parts) {
        const array = part.mesh.instanceMatrix.array
        for (let index = 0; index < part.mesh.count * 16; index += 1) if (!Number.isFinite(array[index])) { problems.push(`NaN in instance matrix at growth ${g}`); break }
      }
    }
    config.tick?.(1.5, 0.016)
    for (const part of parts) tris += triangles(part.mesh.geometry) * part.mesh.count
    for (const mesh of meshes) mesh.traverse((object) => { if (object.isInstancedMesh) tris += triangles(object.geometry) * object.count; else if (object.isMesh) tris += triangles(object.geometry) })
    if (tris > BUDGET) problems.push(`${Math.round(tris / 1000)}k triangles is over the ${BUDGET / 1000}k budget`)
    if (tris < 2000) problems.push('suspiciously few triangles; is anything visible?')
    const stages = model.stages
    if (!Array.isArray(stages) || stages.length < 3) problems.push('stages needs at least 3 entries')
    else {
      if (stages[0][0] !== 0) problems.push('first stage must start at 0')
      stages.forEach((stage, index) => { if (index && stage[0] <= stages[index - 1][0]) problems.push('stages must be in increasing order') })
      if (stages.some((stage) => typeof stage[1] !== 'string')) problems.push('stage names must be strings')
    }
    if (model.showcase !== undefined && !(model.showcase >= 0 && model.showcase <= 1)) problems.push('showcase must be between 0 and 1')
  } catch (error) {
    problems.push(`threw: ${error.stack?.split('\n').slice(0, 3).join(' | ')}`)
  }
  if (problems.length) failures += 1
  lines.push(`${problems.length ? 'FAIL' : 'ok  '}  ${crop.id.padEnd(20)} ${String(Math.round(tris / 1000)).padStart(5)}k tris  ${problems.join('; ')}`)
}
console.log(lines.join('\n'))
console.log(`\n${selected.length - failures}/${selected.length} models passed`)
process.exit(failures ? 1 : 0)
