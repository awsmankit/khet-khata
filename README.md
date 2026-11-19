# Khet Khata (खेत खाता)

A field ledger for Indian farms, at **https://awsmankit.github.io/khet-khata/**.

- Record every piece of land: fields, ponds (pokhar), empty land, orchards, bamboo and more.
- Keep crop records plot by plot.
- Watch crops grow from sowing to harvest in a live 3D field.
- No account and no server: everything is saved on the user's own device, with a backup file to move to a new phone.

## Develop

```sh
npm install
npm run dev            # http://localhost:5173/khet-khata/
npm run check          # lint, check all 3D models, build
npm run check:models   # build every crop model in Node and report problems
npm run preview        # serve the build; the service worker runs here
```

## Project layout

```
src/
  main.jsx                 entry: mounts the app, registers the service worker
  app/                     app shell: top bar, tab bar, screen switching, global styles
  lib/storage.js           on-device storage and backup files
  features/
    land/                  plots, ponds, land types, KML import, map, GPS boundary walk
    farm/                  farm profile, crop register, backups panel, demo farm
    crops/                 crop guide and crop data (data/coreCrops.js, data/moreCrops.js)
    field3d/               the live 3D field
      CropStage.jsx        controls around the 3D view
      engine/              renderer, sky, ground, wind, shared plant-building kit
      models/              one file per crop group, helpers in a folder of the same name
tools/                     check-models.mjs and contact-sheet.html for reviewing 3D models
docs/3d-models.md          how crop models are built and reviewed
```

Naming: React components are `PascalCase.jsx` with their stylesheet beside them; other modules are `camelCase.js`; folders are lowercase.

Set `BASE_PATH=/` when building for a host that serves the site from the domain root.

## Release

1. Add the changes under a new version heading in [CHANGELOG.md](CHANGELOG.md).
2. Bump the version: `npm version minor` (or `patch` / `major`). This updates `package.json` and creates a `vX.Y.Z` git tag.
3. `git push --follow-tags`. Pushing to `main` deploys to GitHub Pages through [.github/workflows/deploy.yml](.github/workflows/deploy.yml).
4. Create the GitHub release from the tag with the changelog notes.

The version is shown at the bottom of the inner pages, and each release gets a fresh offline cache.

## Data and privacy

Nothing is sent to a server. Plot, crop and profile data live in the browser's storage on the device; the app asks the browser to keep it and offers a one-file backup. Map tiles come from OpenStreetMap, whose usage policy limits heavy traffic; switch to a tile provider if usage grows.

Do not commit personal plot files. Keep them outside this folder and load them in the app with **Restore from backup** or **Import KML files**.
