import { useEffect, useMemo, useRef, useState } from 'react'
import { KEYS, readLocal, writeLocal } from '../../lib/storage.js'
import { formatWalkedArea, metersBetween, polygonAreaSquareMeters } from './landMath.js'

const GPS_ERRORS = {
  1: 'Location permission is off. Allow location for this site in your browser settings.',
  2: 'Phone location is unavailable. Turn on GPS and try again outdoors.',
  3: 'GPS took too long. Keep this page open and try again.',
}

// Records a land boundary by walking its edge with the phone's GPS,
// and keeps the saved outlines on this device.
export function useBoundaryWalk({ areaUnit, squareFeetPerKatha }) {
  const [boundaries, setBoundaries] = useState(() => readLocal(KEYS.boundaries, []))
  const [points, setPoints] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [currentLocation, setCurrentLocation] = useState(null)
  const watchRef = useRef(null)

  useEffect(() => () => {
    if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current)
  }, [])

  const stop = (nextStatus = 'paused') => {
    if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
    setStatus(nextStatus)
  }

  const start = () => {
    if (!window.isSecureContext) { setError('Phone GPS needs a secure (https) link. Open the site securely and try again.'); setStatus('error'); return }
    if (!navigator.geolocation) { setError('This browser cannot read GPS location.'); setStatus('error'); return }
    if (status !== 'paused') setPoints([])
    setError('')
    setStatus('locating')
    watchRef.current = navigator.geolocation.watchPosition((position) => {
      const sample = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp }
      setCurrentLocation(sample)
      if (sample.accuracy > 30) {
        setStatus('locating')
        setError(`GPS accuracy is ±${Math.round(sample.accuracy)} m. Waiting for 30 m or better; open sky helps.`)
        return
      }
      setError('')
      setStatus('walking')
      setPoints((current) => {
        const last = current[current.length - 1]
        return last && metersBetween(last, sample) < 4 ? current : [...current, sample]
      })
    }, (gpsError) => {
      setError(GPS_ERRORS[gpsError.code] || 'Could not read the phone location.')
      setStatus('error')
      watchRef.current = null
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 })
  }

  const saveBoundaries = (next) => { setBoundaries(next); writeLocal(KEYS.boundaries, next) }

  const finish = () => {
    if (points.length < 3) { setError('Walk at least three corner points before saving.'); return }
    const areaSquareMeters = polygonAreaSquareMeters(points)
    saveBoundaries([...boundaries, {
      id: `walk-${Date.now()}`,
      name: `Walked boundary ${boundaries.length + 1}`,
      points,
      areaSquareMeters,
      areaText: formatWalkedArea(areaSquareMeters, areaUnit, squareFeetPerKatha),
      maxAccuracy: Math.max(...points.map((point) => point.accuracy)),
      capturedAt: new Date().toISOString(),
    }])
    stop('saved')
    setPoints([])
    setError('')
  }

  const distanceMeters = useMemo(() => points.slice(1).reduce((sum, point, index) => sum + metersBetween(points[index], point), 0), [points])

  return {
    boundaries,
    replaceBoundaries: setBoundaries,
    points,
    status,
    error,
    currentLocation,
    isTracking: status === 'locating' || status === 'walking',
    distanceMeters,
    areaText: points.length >= 3 ? formatWalkedArea(polygonAreaSquareMeters(points), areaUnit, squareFeetPerKatha) : 'Need 3 points',
    start,
    pause: () => stop('paused'),
    undo: () => setPoints((current) => current.slice(0, -1)),
    clear: () => { stop('idle'); setPoints([]); setError(''); setCurrentLocation(null) },
    finish,
    remove: (id) => saveBoundaries(boundaries.filter((boundary) => boundary.id !== id)),
  }
}
