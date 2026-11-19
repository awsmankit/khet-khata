// 3D models for the "veg" group of crops. See MODELS_BRIEF.md.
// Families live in ./veg/: fruiting bushes and climbers, rosettes and heads, root crops,
// alliums and tubers, tall aroids and tapioca, and the mushroom shed.
import { aroids } from './veg/aroids.js'
import { fruiting } from './veg/fruiting.js'
import { heads } from './veg/heads.js'
import { buildMushroom } from './veg/mushroom.js'
import { tubers } from './veg/tubers.js'

export const models = {
  tomato: {
    build: fruiting.tomato,
    stages: [[0, 'Transplanting'], [0.15, 'Vegetative'], [0.32, 'Flowering'], [0.5, 'Fruit set'], [0.72, 'Ripening'], [0.88, 'Harvest']],
    showcase: 0.84,
  },
  'cherry-tomato': {
    build: fruiting['cherry-tomato'],
    stages: [[0, 'Transplanting'], [0.14, 'Training up strings'], [0.3, 'Flowering'], [0.5, 'Fruit set'], [0.7, 'Ripening'], [0.85, 'Picking']],
    showcase: 0.86,
  },
  brinjal: {
    build: fruiting.brinjal,
    stages: [[0, 'Transplanting'], [0.18, 'Vegetative'], [0.34, 'Flowering'], [0.5, 'Fruit set'], [0.68, 'Picking'], [0.9, 'Late picking']],
    showcase: 0.76,
  },
  chilli: {
    build: fruiting.chilli,
    stages: [[0, 'Transplanting'], [0.15, 'Vegetative'], [0.32, 'Flowering'], [0.5, 'Green chillies'], [0.74, 'Turning red'], [0.9, 'Red chilli harvest']],
    showcase: 0.84,
  },
  'king-chilli': {
    build: fruiting['king-chilli'],
    stages: [[0, 'Transplanting'], [0.16, 'Vegetative'], [0.32, 'Flowering'], [0.5, 'Fruit set'], [0.74, 'Ripening'], [0.88, 'Harvest']],
    showcase: 0.86,
  },
  capsicum: {
    build: fruiting.capsicum,
    stages: [[0, 'Transplanting'], [0.15, 'Vegetative'], [0.32, 'Flowering'], [0.5, 'Green fruit'], [0.74, 'Colouring'], [0.88, 'Harvest']],
    showcase: 0.86,
  },
  okra: {
    build: fruiting.okra,
    stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.28, 'Vegetative'], [0.38, 'Flowering'], [0.5, 'Pod picking'], [0.85, 'Late picking']],
    showcase: 0.62,
  },
  zucchini: {
    build: fruiting.zucchini,
    stages: [[0, 'Sowing'], [0.15, 'Seedling'], [0.32, 'Vegetative'], [0.45, 'Flowering'], [0.62, 'Fruiting'], [0.82, 'Harvest']],
    showcase: 0.76,
  },
  'french-bean': {
    build: fruiting['french-bean'],
    stages: [[0, 'Sowing'], [0.15, 'Climbing'], [0.36, 'Flowering'], [0.52, 'Pod set'], [0.72, 'Picking']],
    showcase: 0.74,
  },
  potato: {
    build: tubers.potato,
    stages: [[0, 'Planting'], [0.14, 'Emergence'], [0.34, 'Flowering'], [0.55, 'Tuber bulking'], [0.84, 'Haulms dying'], [0.96, 'Digging']],
    showcase: 0.42,
  },
  onion: {
    build: tubers.onion,
    stages: [[0, 'Transplanting'], [0.15, 'Establishment'], [0.35, 'Leaf growth'], [0.58, 'Bulbing'], [0.84, 'Tops fall over'], [0.94, 'Lifting']],
    showcase: 0.78,
  },
  garlic: {
    build: tubers.garlic,
    stages: [[0, 'Planting cloves'], [0.15, 'Sprouting'], [0.35, 'Leaf growth'], [0.6, 'Bulb forming'], [0.88, 'Leaves yellowing']],
    showcase: 0.6,
  },
  'sweet-potato': {
    build: tubers['sweet-potato'],
    stages: [[0, 'Vine planting'], [0.15, 'Establishment'], [0.35, 'Vines spread'], [0.6, 'Root bulking'], [0.9, 'Digging']],
    showcase: 0.72,
  },
  cauliflower: {
    build: heads.cauliflower,
    stages: [[0, 'Transplanting'], [0.15, 'Establishment'], [0.32, 'Leaf growth'], [0.5, 'Curd forming'], [0.75, 'Curd ready'], [0.92, 'Harvest']],
    showcase: 0.82,
  },
  cabbage: {
    build: heads.cabbage,
    stages: [[0, 'Transplanting'], [0.15, 'Establishment'], [0.3, 'Leaf growth'], [0.5, 'Head forming'], [0.75, 'Head firming'], [0.9, 'Harvest']],
    showcase: 0.84,
  },
  broccoli: {
    build: heads.broccoli,
    stages: [[0, 'Transplanting'], [0.15, 'Establishment'], [0.32, 'Leaf growth'], [0.52, 'Head forming'], [0.8, 'Head ready'], [0.94, 'Harvest']],
    showcase: 0.84,
  },
  lettuce: {
    build: heads.lettuce,
    stages: [[0, 'Transplanting'], [0.2, 'Establishment'], [0.45, 'Leaf growth'], [0.75, 'Full rosette'], [0.9, 'Harvest']],
    showcase: 0.85,
  },
  spinach: {
    build: heads.spinach,
    stages: [[0, 'Sowing'], [0.15, 'Seedling'], [0.35, 'Leaf growth'], [0.5, 'First cutting'], [0.8, 'Regrowth and cutting']],
    showcase: 0.46,
  },
  radish: {
    build: heads.radish,
    stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.3, 'Leaf growth'], [0.55, 'Root swelling'], [0.85, 'Harvest']],
    showcase: 0.86,
  },
  turnip: {
    build: heads.turnip,
    stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.3, 'Leaf growth'], [0.55, 'Root swelling'], [0.85, 'Harvest']],
    showcase: 0.86,
  },
  beetroot: {
    build: heads.beetroot,
    stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.3, 'Leaf growth'], [0.55, 'Root swelling'], [0.86, 'Harvest']],
    showcase: 0.86,
  },
  carrot: {
    build: heads.carrot,
    stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.3, 'Leaf growth'], [0.55, 'Root swelling'], [0.86, 'Harvest']],
    showcase: 0.86,
  },
  fenugreek: {
    build: heads.fenugreek,
    stages: [[0, 'Sowing'], [0.12, 'Seedling'], [0.25, 'Leaf picking'], [0.4, 'Flowering'], [0.56, 'Pod filling'], [0.88, 'Seed harvest']],
    showcase: 0.46,
  },
  'amaranth-leaves': {
    build: heads['amaranth-leaves'],
    stages: [[0, 'Sowing'], [0.15, 'Seedling'], [0.4, 'Leaf growth'], [0.7, 'Ready to cut'], [0.88, 'Harvest']],
    showcase: 0.8,
  },
  colocasia: {
    build: aroids.colocasia,
    stages: [[0, 'Planting corms'], [0.1, 'Sprouting'], [0.3, 'Leaf growth'], [0.6, 'Corm bulking'], [0.86, 'Leaves yellowing'], [0.95, 'Digging']],
    showcase: 0.62,
  },
  'elephant-foot-yam': {
    build: aroids['elephant-foot-yam'],
    stages: [[0, 'Planting corms'], [0.1, 'Stalk emerges'], [0.28, 'Canopy opens'], [0.55, 'Corm bulking'], [0.88, 'Leaves dry'], [0.96, 'Digging']],
    showcase: 0.55,
  },
  tapioca: {
    build: aroids.tapioca,
    stages: [[0, 'Planting stem cuttings'], [0.1, 'Sprouting'], [0.3, 'Canopy growth'], [0.55, 'Root bulking'], [0.9, 'Harvest']],
    showcase: 0.75,
  },
  mushroom: {
    build: buildMushroom,
    stages: [[0, 'Spawning'], [0.1, 'Spawn run'], [0.35, 'Casing and pinning'], [0.5, 'First flush'], [0.76, 'Second flush']],
    showcase: 0.62,
  },
}
