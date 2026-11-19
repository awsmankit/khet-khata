// 3D models for the "water" group of crops: village ponds (makhana, singhara, lotus,
// fish pond) and medicinal / aromatic herb fields. See MODELS_BRIEF.md.
import { pondModels } from './herbsPonds/ponds.js'
import { herbModels } from './herbsPonds/herbs.js'

export const models = { ...pondModels, ...herbModels }
