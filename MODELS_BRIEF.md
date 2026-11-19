# Brief: building 3D crop models for Khet Khata

Khet Khata (खेत खाता) is a phone-first web app for Indian farmers. Its home screen is a live Three.js field where a farmer picks a crop and scrubs a season slider from sowing to harvest. Plants grow, flower, fruit and ripen, wind gusts roll across the crop, and the light follows the time of day. The goal is **realistic, recognisable plants as an Indian farmer would see them in their own field.** Avoid cartoon or low-poly looks.

## Your job

Implement every crop id assigned to your group in **one file**, `src/fields/models/<group>.js`, which exports:

```js
export const models = {
  'crop-id': {
    build(ctx) { ...; return config },
    stages: [[0, 'Sowing'], [0.2, 'Vegetative'], [0.5, 'Flowering'], [0.75, 'Pod filling'], [0.92, 'Ready to harvest']],
    showcase: 0.7,
  },
}
```

- **`stages`**: names in plain English, starting at growth 0, strictly increasing, with 4 to 6 entries. For perennials you may add a third item for the month, such as `[0, 'Flowering', 'Feb']`. Annual crops get "Day N" labels automatically from the crop's duration, so leave the month out for them.
- **`showcase`**: the growth value (0 to 1) where the crop looks its most recognisable. That's the value shown when a farmer opens it.
- Look up each crop's English and Hindi names, states and note in `src/fields/allCrops.js` (the `rows` array; the 9th field is the group). **Do not edit that file.**

### Files you may touch

- **Create or edit:** only `src/fields/models/<group>.js`. Extra helper files go in `src/fields/models/<group>/` if you want them.
- **Read only:** everything else. Do not edit `crops.js`, `geometry.js`, `scenery.js`, `FieldEngine.js`, `catalog.js`, `allCrops.js`, other groups' files, or anything in `src/` outside your file.
- **Do not** run git commands, start or stop dev servers, use the browser, or install packages. Other agents are working in the same folder at the same time.

## The build contract

`build(ctx)` receives:

- `ctx.random`: a seeded random function. Use it, never `Math.random`. It also has `.range(a, b)`, `.gauss()` and `.pick(list)`.
- `ctx.quality`: 1 on desktop, about 0.55 on phones. Scale instance counts with it, typically spacing by `/ Math.sqrt(quality)` or counts by `* quality`.
- `ctx.wind`: wind uniforms, passed to the wind material helpers.
- `ctx.disposables`: push any materials or textures you create so they are disposed.
- `ctx.addPart(growingPart)`: adds an instanced, growing part (see `GrowingPart` in `geometry.js`).
- `ctx.addMesh(object3D)`: adds a plain mesh or group, such as tree trunks, trellises, ponds, terrain or sheds.
- `ctx.basin(origin, radius)`: adds a ring basin around a tree trunk (an orchard detail).
- `ctx.egrets([Vector3...], { appear: (g) => bool })`: adds standing egrets.
- `ctx.groundCover`: set it to `'orchard'` if grass clumps should grow inside the plot (orchards, plantations).

It must return:

```js
{
  plot: { width, depth, rowGap? },        // metres; the bund and shadows fit this
  soil: 'furrow' | 'paddy' | 'orchard' | 'none',
  // 'furrow' gives ploughed ridges every rowGap; 'paddy' gives flooded mud; 'orchard' gives grass;
  // 'none' means you build your own ground (pond, hill terraces, polyhouse floor, shed floor)
  camera: { position: Vector3, target: Vector3 },
  bund: true/false,        // optional, default true: the earthen bund (mend) around the plot
  grass: true/false,       // optional, default true: grass clumps around (and inside, for orchard cover)
  scarecrow: true/false,   // optional, default true for furrow/paddy fields
  update(g) {},            // optional: per-growth changes not covered by parts (water level, colours)
  tick(elapsed, delta) {}, // optional: per-frame animation (ripples, fish jumps); keep it cheap
}
```

- Units are metres and real plant sizes. Exaggerate small fruit or flowers by up to about 1.8 times so they read on a phone screen.
- The scene's ground is at y = 0. Furrow ridges top out at y ≈ 0.035, so plant bases sit at `baseY: 0.035` on furrow soil.
- **Camera:** frame it like the existing crops. Stand just outside a front corner of the plot at roughly eye or drone height, looking diagonally across the rows, with near plants large and the far edge fading into haze. Leave the top-left quarter of the frame mostly sky or distant background, because the big crop name sits there.
- **Triangle budget:** at most **2.5 million triangles at quality 1** (the check fails above 3.2M). Aim lower for trees.

## Toolkit (read these first)

- `src/fields/geometry.js`:
  - `blade()`: leaf blades in shapes grass, strap, lance, oval and paddle, with droop, fold and tears
  - `tube()`: tapered curved stems and branches
  - `ellipsoid()`, `prep()`, `merge()`, `transform()`, `orient()`
  - `GrowingPart`: an instanced part with per-instance `scale(g, item)` and `color(c, g, item)`, plus `parent` and `pivot` for attached parts
  - `item()`, `smooth()`, `lerp()`, `makeRandom()`
  - `applyWind()` and `windDepthMaterial()`
- `src/fields/crops.js` (exported helpers):
  - `rowSpots`, `assembleField` (plant variants on spots, with attached parts like ears and flowers), `windMaterials`, `ramp`, `tone`, `shade`
  - `treeSkeleton`, `canopyCore`, `leafClusterItems`, `shellPoint`, `mangoLeafCluster`, `litchiLeafCluster`, `panicle`, `wheatEar`, `V`, `UP`
  - Study `buildWheat`, `buildMustard`, `buildMaize`, `buildBanana` and `buildOrchard` as worked examples. You may copy and adapt their code into your file.
- `src/fields/scenery.js`: `soilTexture`, `grassClump`, and how ground, bund and grass are made.

### Conventions that make things look real

- **Colour:** vertex colours carry light and dark detail (greys from `shade(low, high)`, lighter midribs and tips), and **instance colours carry hue**, driven by growth through `ramp(c, g, [[g, '#hex'], ...])`. Ripening and drying become per-instance colour ramps, and a small per-instance `item.offset` and `item.tone` make the field uneven like a real one.
- **Growth:** scale the plant with `smooth()` curves. Flowers appear and then fade; fruit and pods appear, swell and change colour. Attach flowers, fruit and heads with `attachments` / `parent` + `pivot` so they emerge in place.
- **Several variants (2 or 3) of each plant geometry,** randomly rotated, scaled 0.85 to 1.15, and slightly tilted, so no two plants look the same.
- **Materials:** always use `windMaterials(ctx, windOptions, materialOptions)` (or `applyWind` + `windDepthMaterial`) so plants sway and shadows match. Wind options: `refHeight` is roughly the plant height. Field crops use `strength` 0.1 to 0.3 and `flutter` 0.005 to 0.02; trees use `strength` about 0.1, `refHeight` about 8 and `flutter` about 0.02. Rigid things (posts, trellis, sheds) use plain `MeshStandardMaterial` with no wind.
- **Rows and spacing as Indian farmers plant them:** ridges for potato, beds for onion, staked rows for tomato, bamboo machan for gourds, contour rows on slopes for tea, square planting for orchards, shade trees for coffee and cardamom.
- **Leaves need enough density** that the canopy doesn't look see-through. For trees, a dark `canopyCore` inside the leaf shell helps.

## Verify

```sh
node scripts/check-models.mjs <group>      # e.g. node scripts/check-models.mjs field
npx oxlint src/fields/models               # no errors
```

Every one of your crops must print `ok`. You cannot see the scene, so reason carefully about geometry:

- leaf orientation: blades rise along +Z/+Y from their origin
- what faces up
- that fruit hangs below branches
- that sizes are in metres
- that nothing floats or sinks below y = 0, unless it's underwater

The lead will review every model visually afterwards and send back fixes.

## Report back

When done, reply with:

1. A list of crop ids, each with a one-line description of what it looks like and which shared family it uses.
2. Triangle counts from the check script.
3. Anything you are unsure about visually and would like the lead to check first.
