# Changelog

All notable changes to Khet Khata are listed here. Versions follow [Semantic Versioning](https://semver.org/): a new major number means saved data or behaviour changes in a way that needs attention, a minor number adds features, and a patch number fixes problems.

## [1.0.1] - 2026-11-19

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
