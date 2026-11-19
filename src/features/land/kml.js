// Reads plots from KML files exported by Google Earth, Google My Maps or GPS apps.
// Each Placemark becomes a plot at its point (or the centre of its polygon).
// Area is only read when the note states katha plainly; nothing else is guessed.

const KATHA_PATTERN = /(\d+(?:\.\d+)?)\s*(?:katha|kattha|kathha|कट्ठा|कठ्ठा)/gi

function text(element, tag) {
  return element.getElementsByTagName(tag)[0]?.textContent?.trim() || ''
}

function parseCoordinates(raw) {
  return raw.trim().split(/\s+/).map((pair) => pair.split(',').map(Number)).filter(([lon, lat]) => Number.isFinite(lat) && Number.isFinite(lon)).map(([longitude, latitude]) => ({ latitude, longitude }))
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plot'
}

export function parseKml(source, fileName) {
  const documentNode = new DOMParser().parseFromString(source, 'application/xml')
  if (documentNode.getElementsByTagName('parsererror').length) throw new Error(`${fileName} is not a readable KML file.`)
  const placemarks = [...documentNode.getElementsByTagName('Placemark')]
  return placemarks.map((placemark, index) => {
    const name = text(placemark, 'name') || `${fileName.replace(/\.kml$/i, '')} ${index + 1}`
    const description = text(placemark, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const pointNode = placemark.getElementsByTagName('Point')[0]
    const polygonNode = placemark.getElementsByTagName('Polygon')[0] || placemark.getElementsByTagName('LineString')[0]
    let points = []
    if (pointNode) points = parseCoordinates(text(pointNode, 'coordinates'))
    else if (polygonNode) points = parseCoordinates(text(polygonNode, 'coordinates'))
    if (!points.length) return null
    const latitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length
    const longitude = points.reduce((sum, point) => sum + point.longitude, 0) / points.length
    const areaValues = [...description.matchAll(KATHA_PATTERN)].map((match) => Number(match[1]))
    return {
      id: `kml-${slug(fileName)}-${slug(name)}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
      name,
      description,
      areaValues,
      areaTotalConfirmed: areaValues.length === 1,
      noteText: '',
      clarification: areaValues.length > 1 ? 'More than one katha figure in the note; check whether they add up.' : '',
      latitude,
      longitude,
      outline: polygonNode && points.length >= 3 ? points : null,
      // only explicit pond words; anything else is left for the farmer to set
      landUse: /pokh(a|e)?r|pokhra|tala+b|\bpond\b|पोखर|पोखरा|तालाब/i.test(`${name} ${description}`) ? 'pond' : undefined,
      source: fileName,
    }
  }).filter(Boolean)
}

export async function readKmlFiles(fileList) {
  const plots = []
  const problems = []
  for (const file of fileList) {
    if (!/\.kml$/i.test(file.name)) { problems.push(`${file.name}: only .kml files can be read. Export KML (not KMZ) from Google Earth or My Maps.`); continue }
    try {
      const found = parseKml(await file.text(), file.name)
      if (!found.length) problems.push(`${file.name}: no points or outlines found.`)
      plots.push(...found)
    } catch (error) {
      problems.push(error.message)
    }
  }
  return { plots, problems }
}
