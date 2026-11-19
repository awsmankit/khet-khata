// 3D models for the "water" group of crops: village ponds (makhana, singhara, lotus,
// fish pond) and medicinal / aromatic herb fields. See MODELS_BRIEF.md.
import { pondModels } from './water/ponds.js'
import { herbModels } from './water/herbs.js'

export const models = { ...pondModels, ...herbModels }
