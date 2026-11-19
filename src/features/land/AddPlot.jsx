import { useState } from 'react'
import { LocateFixed, Plus } from 'lucide-react'
import { landUseOf } from './landUse.js'
import LandUseFields from './LandUseFields.jsx'
import './land.css'

export default function AddPlot({ onAdd }) {
  const [use, setUse] = useState({ landUse: 'farm', pond: null })
  const [location, setLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [message, setMessage] = useState('')
  const locate = () => {
    if (!window.isSecureContext || !navigator.geolocation) { setMessage('Location needs a secure (https) link and a browser with GPS.'); return }
    setLocating(true)
    setMessage('')
    navigator.geolocation.getCurrentPosition((position) => {
      setLocating(false)
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy })
    }, (error) => {
      setLocating(false)
      setMessage(error.code === 1 ? 'Location permission is off. Allow it in browser settings, or add the plot without a location.' : 'Could not get a GPS fix. Try again outdoors.')
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 })
  }
  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const katha = Number(form.get('katha'))
    onAdd({
      id: `plot-${Date.now()}`,
      name: String(form.get('name')).trim(),
      description: '',
      areaValues: katha > 0 ? [katha] : [],
      areaTotalConfirmed: katha > 0,
      noteText: String(form.get('note') || '').trim(),
      clarification: '',
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      outline: null,
      landUse: use.landUse,
      pond: use.landUse === 'pond' ? use.pond : null,
      source: location ? `Phone GPS, ±${Math.round(location.accuracy)} m` : 'Entered by hand',
    })
    event.currentTarget.reset()
    setLocation(null)
    setUse({ landUse: 'farm', pond: null })
    setMessage(`${landUseOf({ landUse: use.landUse }).label} added.`)
  }
  return <details className="add-plot">
    <summary><Plus size={17} /> Add land by hand: field, pond or empty plot</summary>
    <form className="entry-form" onSubmit={submit}>
      <div className="wide-field"><LandUseFields value={use} onChange={(patch) => setUse((current) => ({ ...current, ...patch }))} /></div>
      <label>Name<input name="name" required placeholder={use.landUse === 'pond' ? 'For example, Bada pokhar' : 'For example, Purab wala khet'} /></label>
      <label>Area in katha<input name="katha" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Optional" /></label>
      <label className="wide-field">Note<input name="note" placeholder="Optional: owner, water, trees, anything useful" /></label>
      <div className="wide-field locate-row">
        <button type="button" className="button button-quiet" onClick={locate} disabled={locating}><LocateFixed size={16} /> {locating ? 'Finding you…' : location ? 'Update location' : 'Use my current location'}</button>
        <span>{location ? `Location set, ±${Math.round(location.accuracy)} m. Stand in the middle of the plot for the best result.` : 'Stand on the plot and tap to pin it on the map. You can skip this.'}</span>
      </div>
      <div className="form-actions wide-field"><button className="button button-primary" type="submit"><Plus size={17} /> Add {use.landUse === 'pond' ? 'pond' : 'plot'}</button>{message && <span className="saved-flag" role="status">{message}</span>}</div>
    </form>
  </details>
}
