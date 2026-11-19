// Registry of every 3D crop model. Each group file exports { models } keyed by crop id:
//   [id]: { build(ctx) => config, stages: [[growth 0..1, 'Stage name', 'optional when'], ...], showcase: 0..1 }
import { cropBuilders } from './core.js'
import { coreCrops } from '../../crops/data/coreCrops.js'
import { models as cereals } from './cereals.js'
import { models as legumes } from './legumes.js'
import { models as vegetables } from './vegetables.js'
import { models as vinesFlowers } from './vinesFlowers.js'
import { models as fruitTrees } from './fruitTrees.js'
import { models as plantations } from './plantations.js'
import { models as herbsPonds } from './herbsPonds.js'

const showcase = { wheat: 0.86, rice: 0.62, maize: 0.66, mustard: 0.58, sugarcane: 0.8, banana: 0.84, mango: 0.86, litchi: 0.86 }
const core = Object.fromEntries(coreCrops.map((crop) => [crop.id, { build: cropBuilders[crop.id], stages: crop.stages, showcase: showcase[crop.id] }]))

export const models = { ...cereals, ...legumes, ...vegetables, ...vinesFlowers, ...fruitTrees, ...plantations, ...herbsPonds, ...core }
