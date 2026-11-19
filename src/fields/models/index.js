// Registry of every 3D crop model. Each group file exports { models } keyed by crop id:
//   [id]: { build(ctx) => config, stages: [[growth 0..1, 'Stage name', 'optional when'], ...], showcase: 0..1 }
import { cropBuilders } from '../crops.js'
import { cropCatalog } from '../catalog.js'
import { models as field } from './field.js'
import { models as legume } from './legume.js'
import { models as veg } from './veg.js'
import { models as vine } from './vine.js'
import { models as trees } from './trees.js'
import { models as plantation } from './plantation.js'
import { models as water } from './water.js'

const showcase = { wheat: 0.86, rice: 0.62, maize: 0.66, mustard: 0.58, sugarcane: 0.8, banana: 0.84, mango: 0.86, litchi: 0.86 }
const core = Object.fromEntries(cropCatalog.map((crop) => [crop.id, { build: cropBuilders[crop.id], stages: crop.stages, showcase: showcase[crop.id] }]))

export const models = { ...field, ...legume, ...veg, ...vine, ...trees, ...plantation, ...water, ...core }
