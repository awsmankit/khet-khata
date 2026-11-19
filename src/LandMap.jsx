import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { landUseOf } from './landUse.js'
import './LandMap.css'

const APPROXIMATE_SIDE_METERS = 90

function LandMap({ plots, selectedId, onSelect, dayPeriod, boundaries = [], walkPoints = [], boundaryClosed = false, currentLocation = null, followLocation = false }) {
  const elementRef = useRef(null)
  const mapRef = useRef(null)
  const geometryLayerRef = useRef(null)
  const walkLayerRef = useRef(null)
  const locationLayerRef = useRef(null)

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return undefined

    const map = L.map(elementRef.current, { zoomControl: true, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    map.setView([22.6, 79.0], 5)
    geometryLayerRef.current = L.featureGroup().addTo(map)
    walkLayerRef.current = L.featureGroup().addTo(map)
    locationLayerRef.current = L.featureGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      geometryLayerRef.current = null
      walkLayerRef.current = null
      locationLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = geometryLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    plots.forEach((plot) => {
      const latitudeOffset = (APPROXIMATE_SIDE_METERS / 2) / 111_320
      const longitudeOffset = (APPROXIMATE_SIDE_METERS / 2) / (111_320 * Math.cos(plot.latitude * Math.PI / 180))
      const selected = plot.id === selectedId
      const use = landUseOf(plot)
      if (plot.outline) {
        L.polygon(plot.outline.map((point) => [point.latitude, point.longitude]), { color: selected ? '#8C1D18' : use.color, weight: selected ? 3 : 2, dashArray: use.dashed ? '6 5' : null, fillColor: selected ? '#E2A11B' : use.fill, fillOpacity: selected ? 0.35 : use.id === 'pond' ? 0.5 : 0.25 })
          .bindTooltip(`${plot.name}, outline from KML`).on('click', () => onSelect(plot.id)).addTo(layer)
      } else L.rectangle([
        [plot.latitude - latitudeOffset, plot.longitude - longitudeOffset],
        [plot.latitude + latitudeOffset, plot.longitude + longitudeOffset],
      ], {
        color: selected ? '#8C1D18' : use.color,
        weight: selected ? 3 : 2,
        dashArray: '5 4',
        fillColor: selected ? '#E2A11B' : use.fill,
        fillOpacity: selected ? 0.35 : use.id === 'pond' ? 0.45 : 0.22,
      }).bindTooltip(`${plot.name}, ${use.label.toLowerCase()} (approximate square)`)
        .on('click', () => onSelect(plot.id))
        .addTo(layer)
      L.circleMarker([plot.latitude, plot.longitude], {
        radius: selected ? 6 : 4,
        color: '#fff',
        weight: 2,
        fillColor: selected ? '#8C1D18' : use.color,
        fillOpacity: 1,
      }).bindTooltip(plot.name, { direction: 'top', offset: [0, -4] })
        .on('click', () => onSelect(plot.id))
        .addTo(layer)
    })
    boundaries.forEach((boundary) => {
      L.polygon(boundary.points.map((point) => [point.latitude, point.longitude]), {
        color: '#8C1D18', weight: 3, fillColor: '#E2A11B', fillOpacity: 0.28,
      }).bindTooltip(`${boundary.name}, GPS estimate`).addTo(layer)
    })
  }, [plots, selectedId, onSelect, boundaries])

  useEffect(() => {
    const layer = walkLayerRef.current
    if (!layer) return
    layer.clearLayers()
    const coordinates = walkPoints.map((point) => [point.latitude, point.longitude])
    if (coordinates.length >= 3 && boundaryClosed) {
      L.polygon(coordinates, { color: '#e8664e', weight: 3, fillColor: '#80b84e', fillOpacity: 0.28, dashArray: '7 5' }).addTo(layer)
    } else if (coordinates.length >= 2) {
      L.polyline(coordinates, { color: '#e8664e', weight: 3, dashArray: '7 5' }).addTo(layer)
    }
    coordinates.forEach((coordinate, index) => {
      L.circleMarker(coordinate, { radius: index === 0 ? 6 : 4, color: '#fff', weight: 2, fillColor: index === 0 ? '#e8664e' : '#f2c94e', fillOpacity: 1 }).addTo(layer)
    })
  }, [walkPoints, boundaryClosed])

  useEffect(() => {
    const map = mapRef.current
    const layer = locationLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!currentLocation) return
    const point = [currentLocation.latitude, currentLocation.longitude]
    if (currentLocation.accuracy > 0) L.circle(point, { radius: currentLocation.accuracy, color: '#3278b2', weight: 1, fillColor: '#5eafe0', fillOpacity: 0.12 }).addTo(layer)
    L.circleMarker(point, { radius: 5, color: '#fff', weight: 2, fillColor: '#287fbc', fillOpacity: 1 }).bindTooltip(`You are here, ±${Math.round(currentLocation.accuracy)} m`).addTo(layer)
    if (map && followLocation) map.panTo(point, { animate: true, duration: 0.35 })
  }, [currentLocation, followLocation])

  useEffect(() => {
    const map = mapRef.current
    if (map && plots.length) map.fitBounds(L.latLngBounds(plots.map((plot) => [plot.latitude, plot.longitude])).pad(0.18), { maxZoom: 17 })
  }, [plots])

  return <div className={`land-map-shell phase-${dayPeriod.id}`}>
    <div ref={elementRef} className="land-leaflet-map" aria-label="Map with GPS plot locations and walked boundary outlines" />
    <div className="map-drawing-hint">Squares are guesses. Walked outlines are GPS estimates, not surveys.</div>
  </div>
}

export default LandMap