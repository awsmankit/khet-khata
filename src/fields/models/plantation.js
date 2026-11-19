// 3D models for the "plantation" group of crops. See MODELS_BRIEF.md.
// Families live in ./plantation/: palms, shade trees + understorey, umbel herbs,
// ginger-type clumps and vines on supports, all built on ./plantation/kit.js.
import { palmModels } from './plantation/palms.js'
import { treeModels } from './plantation/trees.js'
import { herbModels } from './plantation/herbs.js'

export const models = { ...treeModels, ...palmModels, ...herbModels }
