# Changelog

All notable changes to Khet Khata are listed here. Versions follow [Semantic Versioning](https://semver.org/): a new major number means saved data or behaviour changes in a way that needs attention, a minor number adds features, and a patch number fixes problems.

## [1.1.1] - 2026-11-19

### Fixed
- In the plot list, the delete button stretched across each row and covered the plot name. It now sits at the right edge.

## [1.1.0] - 2026-11-19

### Added
- **161 crops from every part of India** in the 3D field, each with its Hindi name, season, main growing states and a season timeline:
  - Cereals and millets: barley, oats, jowar, bajra, ragi, foxtail, kodo, kutki, sanwa, cheena, buckwheat, rajgira, black rice, quinoa.
  - Pulses: chana, arhar, masoor, moong, urad, matar, rajma, lobia, kulthi, moth, khesari, guar.
  - Oilseeds: groundnut, soybean, sunflower, til, alsi, castor, safflower, niger.
  - Fibre and cash: cotton, jute, mesta, sunn hemp, tobacco.
  - Fodder: berseem, lucerne, napier.
  - Vegetables, including polyhouse capsicum and cherry tomato, and a mushroom shed.
  - Gourds on bamboo machans, melons on riverbank sand.
  - Flowers, from marigold and rose to an orchid net house.
  - Fruit trees, from guava and apple to jackfruit, cashew, grapes on a pandal, kiwi and dragon fruit.
  - Plantations: tea on a hill slope, coffee under shade, rubber, coconut, arecanut, oil palm, date palm, cocoa, black pepper, cardamom, the betel barej.
  - Spices: turmeric, ginger, cumin, coriander, fennel, ajwain, saffron.
  - Medicinal herbs.
  - Pond crops: makhana, singhara, lotus and a fish pond with an aerator.
- **Crop guide**: browse every crop by group, region (North, East, North-east, West, Central, South, Hills) and season, and open any one in 3D with "See it grow".
- **Crop shelf** in the 3D field with crop groups and search; the crop register suggests all crops.

### Changed
- The original eight crops were made lighter so phones stay smooth.
- Screen links renamed: `#records` is now `#plots` and `#register` is now `#profile`. Old links still work.
- Code reorganised by feature (`app`, `features/land`, `features/farm`, `features/crops`, `features/field3d`, `lib`), with consistent file naming, and unused code removed. See the README's project layout.



### Fixed
- The publish check that guards against bundled plot data no longer mistakes the backup file name for private data, so the site deploys.

## [1.0.0] - 2026-11-19

First public release.

### Added
- **Fields**: a live 3D field for wheat, paddy, maize, mustard, sugarcane, banana, mango and litchi. Play the season from sowing to harvest; change the wind and time of day (morning, noon, evening, night); drag to look around. Each crop lists its main growing states across India.
- **Land types**: mark each piece of land as farmland, empty or fallow, pond, orchard, bamboo, house and yard, or other. Ponds record whether water stays all year and what they are used for (fish, makhana, singhara, irrigation, cattle and washing).
- **Plots**: add land by hand with an optional phone-GPS pin, or import KML files from Google Earth, Google My Maps and GPS apps. Katha is read from notes only when stated plainly.
- **Land map** with colours by land type and a "walk your boundary" tool that records a phone-GPS outline (an estimate, not a survey).
- **Crop register** with suggestions for common Indian crops.
- **Farm profile** with area shown in katha, acres, hectares or gaj. Conversions need the local square feet per katha.
- **Backups**: download everything as one file and restore it on another phone. There is no account, so this is the way to keep records safe.
- **Phone web app**: installs to the home screen, works offline after the first visit, caches viewed map tiles, and uses a lighter 3D quality on phones.

### Privacy
- No sign-up, no server, no analytics. Records stay in the browser on the device. Fonts are bundled with the app.
