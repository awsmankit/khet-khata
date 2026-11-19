import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Crosshair, Download, ExternalLink, FileUp, List, LocateFixed, Map, NotebookPen, Pause, Play, Plus, RotateCcw, Search, ShieldCheck, Sprout, Square, Trash2, Upload, UserRound } from 'lucide-react'
import { readKmlFiles } from './kml.js'
import { describeLandUse, landUseOf, landUses, pondUses, pondWater } from './landUse.js'
import { downloadBackup, KEYS, readBackupFile, readLocal, storageStatus, writeAll, writeLocal } from './storage.js'
import { cropCatalog } from './fields/catalog.js'
import LandMap from './LandMap.jsx'
import './App.css'

const CropStage = lazy(() => import('./fields/CropStage.jsx'))

const views = [
  { id: 'fields', label: 'Fields', short: 'Fields', icon: Sprout },
  { id: 'map', label: 'Land map', short: 'Map', icon: Map },
  { id: 'records', label: 'Plot list', short: 'Plots', icon: List },
  { id: 'crops', label: 'Crop register', short: 'Crops', icon: NotebookPen },
  { id: 'register', label: 'Farm profile', short: 'Profile', icon: UserRound },
]

const extraCrops = [['Makhana', 'मखाना'], ['Potato', 'आलू'], ['Lentil', 'मसूर'], ['Chickpea', 'चना'], ['Moong', 'मूँग'], ['Onion', 'प्याज़'], ['Cauliflower', 'गोभी'], ['Okra', 'भिंडी'], ['Pointed gourd', 'परवल'], ['Jute', 'पाट'], ['Bamboo', 'बाँस'], ['Guava', 'अमरूद'], ['Fish (rohu, katla)', 'मछली'], ['Singhara', 'सिंघाड़ा']]
const cropSuggestions = [...cropCatalog.map((crop) => [crop.name, crop.local]), ...extraCrops]

const demoCropRecords = [
  { id: 'demo-maize', crop: 'Maize', plotName: 'Demo plot A', stage: 'Growing' },
  { id: 'demo-rice', crop: 'Paddy', plotName: 'Demo plot B', stage: 'Planned' },
  { id: 'demo-mustard', crop: 'Mustard', plotName: 'Demo plot C', stage: 'Ready to harvest' },
]

function getDayPeriod(date) {
  const hour = date.getHours()
  if (hour < 5 || hour >= 20) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 16) return 'afternoon'
  return 'evening'
}

function formatLandNote(plot, areaUnit, squareFeetPerKatha) {
  if (!plot.areaValues?.length) return plot.noteText || 'No area note provided.'
  const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
  if (areaUnit !== 'katha' && !(squareFeetPerKatha > 0)) {
    return ['Set the local katha size in Farm profile to convert.', plot.noteText].filter(Boolean).join(' ')
  }
  const amounts = plot.areaValues.map((value) => {
    if (areaUnit === 'katha') return `${number.format(value)} katha`
    const squareFeet = value * squareFeetPerKatha
    if (areaUnit === 'acre') return `${number.format(squareFeet / 43_560)} acre${squareFeet / 43_560 === 1 ? '' : 's'}`
    if (areaUnit === 'hectare') return `${number.format(squareFeet / 107_639.104)} ha`
    return `${number.format(squareFeet / 9)} gaj`
  })
  const areaText = amounts.length > 1 || !plot.areaTotalConfirmed
    ? `${amounts.join(' + ')}${plot.areaTotalConfirmed ? '' : ' (total not confirmed)'}`
    : `${amounts[0]}${plot.areaTotalConfirmed ? ' total' : ''}`
  return [areaText, plot.noteText].filter(Boolean).join('. ')
}

function metersBetween(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(second.latitude - first.latitude)
  const longitudeDelta = radians(second.longitude - first.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function polygonAreaSquareMeters(points) {
  if (points.length < 3) return 0
  const meanLatitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length * Math.PI / 180
  const projected = points.map((point) => ({
    x: 6_371_000 * point.longitude * Math.PI / 180 * Math.cos(meanLatitude),
    y: 6_371_000 * point.latitude * Math.PI / 180,
  }))
  let twiceArea = 0
  projected.forEach((point, index) => {
    const next = projected[(index + 1) % projected.length]
    twiceArea += point.x * next.y - next.x * point.y
  })
  return Math.abs(twiceArea) / 2
}

function formatWalkedArea(squareMeters, areaUnit, squareFeetPerKatha) {
  const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
  if (areaUnit === 'katha') {
    if (!(squareFeetPerKatha > 0)) return `${number.format(squareMeters)} m² (set katha size to convert)`
    return `${number.format(squareMeters * 10.7639104 / squareFeetPerKatha)} katha`
  }
  if (areaUnit === 'acre') return `${number.format(squareMeters / 4046.8564224)} acres`
  if (areaUnit === 'hectare') return `${number.format(squareMeters / 10_000)} ha`
  return `${number.format(squareMeters / 8.3612736)} gaj`
}

function LandUseFields({ value, onChange, compact = false }) {
  const pond = value.pond || {}
  const toggleUse = (id) => {
    const uses = pond.uses || []
    onChange({ pond: { ...pond, uses: uses.includes(id) ? uses.filter((entry) => entry !== id) : [...uses, id] } })
  }
  return <fieldset className={`land-use ${compact ? 'is-compact' : ''}`}>
    <legend>What is on this land?</legend>
    <div className="use-choices">
      {landUses.map((use) => <button type="button" key={use.id} className={value.landUse === use.id ? 'is-active' : ''} aria-pressed={value.landUse === use.id} style={{ '--use': use.color }} onClick={() => onChange({ landUse: use.id, pond: use.id === 'pond' ? { water: 'year-round', uses: [], ...pond } : value.pond })}>
        <i aria-hidden="true" /><span>{use.label}</span><small lang="hi">{use.local}</small>
      </button>)}
    </div>
    {value.landUse === 'pond' && <div className="pond-fields">
      <div className="pond-row"><span className="pond-label">Water</span><div className="segmented">{pondWater.map((entry) => <button type="button" key={entry.id} className={pond.water === entry.id ? 'is-active' : ''} aria-pressed={pond.water === entry.id} onClick={() => onChange({ pond: { ...pond, water: entry.id } })}>{entry.label}</button>)}</div></div>
      <div className="pond-row"><span className="pond-label">Used for</span><div className="checks">{pondUses.map((entry) => <label key={entry.id}><input type="checkbox" checked={(pond.uses || []).includes(entry.id)} onChange={() => toggleUse(entry.id)} />{entry.label}</label>)}</div></div>
    </div>}
    {value.landUse === 'fallow' && <p className="quiet-note">Empty land counts too. Add a note on why it is empty (waterlogged, resting, dispute) if that helps you plan.</p>}
  </fieldset>
}

const hasLocation = (plot) => Number.isFinite(plot.latitude) && Number.isFinite(plot.longitude)

function PlotDetail({ plot, areaUnit, squareFeetPerKatha, onRemove, onUpdate }) {
  const located = hasLocation(plot)
  const mapsUrl = `https://www.google.com/maps?q=${plot.latitude},${plot.longitude}`
  return <aside className="plot-detail" aria-label={`Details for ${plot.name}`}>
    <p className="use-tag" style={{ '--use': landUseOf(plot).color }}><i aria-hidden="true" />{describeLandUse(plot)}</p>
    <h2>{plot.name}</h2>
    <p className="plot-area">{formatLandNote(plot, areaUnit, squareFeetPerKatha)}</p>
    {plot.clarification && <p className="needs-check">Check this note: {plot.clarification}</p>}
    <LandUseFields compact value={plot} onChange={(patch) => onUpdate(plot.id, patch)} />
    <dl className="plot-facts">
      <div><dt>Latitude</dt><dd>{located ? `${plot.latitude.toFixed(6)}°` : 'Not set'}</dd></div>
      <div><dt>Longitude</dt><dd>{located ? `${plot.longitude.toFixed(6)}°` : 'Not set'}</dd></div>
      <div><dt>Added from</dt><dd>{plot.source || 'Entered by hand'}</dd></div>
    </dl>
    {located && !plot.outline && <p className="quiet-note">The square on the map is a guess centred on this GPS point, not a surveyed boundary.</p>}
    {plot.description && <details className="source-note"><summary>Original note</summary><p>{plot.description}</p></details>}
    <div className="detail-actions">
      {located && <a className="button button-quiet" href={mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps <ExternalLink size={15} /></a>}
      <button className="button button-quiet" onClick={() => onRemove(plot.id)}><Trash2 size={15} /> Remove plot</button>
    </div>
  </aside>
}

function PlotTable({ plots, selectedId, onSelect, onRemove, areaUnit, squareFeetPerKatha }) {
  return <div className="ledger">
    <ol className="ledger-rows">
      {plots.map((plot) => <li key={plot.id} className={selectedId === plot.id ? 'is-selected' : ''}>
        <button onClick={() => onSelect(plot.id)}>
          <span className="ledger-name">{plot.name}</span>
          <span className="ledger-note"><span className="use-tag" style={{ '--use': landUseOf(plot).color }}><i aria-hidden="true" />{describeLandUse(plot)}</span>{formatLandNote(plot, areaUnit, squareFeetPerKatha)}{plot.clarification && <em>Needs a quick check</em>}</span>
          <span className="ledger-coords">{hasLocation(plot) ? `${plot.latitude.toFixed(5)}, ${plot.longitude.toFixed(5)}` : 'No location yet'}</span>
        </button>
        <button className="icon-button ledger-remove" onClick={() => onRemove(plot.id)} aria-label={`Remove ${plot.name}`}><Trash2 size={15} /></button>
      </li>)}
    </ol>
  </div>
}

function FarmRegistration({ profile, onSave, areaUnit, squareFeetPerKatha }) {
  const [saved, setSaved] = useState(false)
  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nextProfile = Object.fromEntries(['farmerName', 'farmName', 'village', 'district', 'state', 'areaUnit'].map((key) => [key, String(form.get(key) || '').trim()]))
    const localKathaSize = Number(form.get('squareFeetPerKatha'))
    nextProfile.squareFeetPerKatha = localKathaSize > 0 ? localKathaSize : null
    onSave(nextProfile)
    setSaved(true)
  }
  return <section className="sheet">
    <header className="sheet-head"><h2>{profile ? 'Your farm profile' : 'Set up your farm'}</h2><p>Saved on this phone or computer only. No password, Aadhaar or phone number needed.</p></header>
    <form className="entry-form" onSubmit={submit} onChange={() => setSaved(false)}>
      <label>Farmer name<input name="farmerName" defaultValue={profile?.farmerName || ''} autoComplete="name" required /></label>
      <label>Farm or land name<input name="farmName" defaultValue={profile?.farmName || ''} placeholder="For example, Ramnagar family land" required /></label>
      <label>Village or town<input name="village" defaultValue={profile?.village || ''} /></label>
      <label>District<input name="district" defaultValue={profile?.district || ''} /></label>
      <label>State<input name="state" defaultValue={profile?.state || ''} /></label>
      <label>Show areas in<select name="areaUnit" defaultValue={profile?.areaUnit || areaUnit}><option value="katha">Katha</option><option value="acre">Acres</option><option value="hectare">Hectares</option><option value="gaj">Gaj (square yards)</option></select></label>
      <label className="wide-field">Square feet in one local katha<input name="squareFeetPerKatha" type="number" inputMode="decimal" min="1" step="0.01" defaultValue={profile?.squareFeetPerKatha || squareFeetPerKatha || ''} placeholder="From your land records" /><small>Katha size changes from place to place, so no default is assumed. Conversions to acres and gaj stay off until this is set.</small></label>
      <div className="form-actions wide-field"><button className="button button-primary" type="submit"><Check size={17} /> {profile ? 'Save changes' : 'Save farm profile'}</button>{saved && <span className="saved-flag" role="status"><Check size={15} /> Saved on this device</span>}</div>
    </form>
  </section>
}

function CropRecords({ plots, records, onAdd, onDelete }) {
  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const plotId = String(form.get('plotId'))
    const plot = plots.find((item) => item.id === plotId)
    onAdd({
      id: `${Date.now()}`,
      plotId,
      plotName: plot?.name || 'No plot',
      crop: String(form.get('crop')).trim(),
      plantedOn: String(form.get('plantedOn') || ''),
      stage: String(form.get('stage')),
      notes: String(form.get('notes') || '').trim(),
    })
    event.currentTarget.reset()
  }
  return <div className="split">
    <section className="sheet">
      <header className="sheet-head"><h2>Add a crop</h2><p>The KML notes do not list crops, so nothing has been filled in for you.</p></header>
      <form className="entry-form" onSubmit={submit}>
        <label>Plot<select name="plotId" defaultValue={plots[0]?.id || ''}>{plots.map((plot) => <option value={plot.id} key={plot.id}>{plot.name}</option>)}<option value="">Not linked to a plot</option></select></label>
        <label>Crop<input name="crop" list="crop-suggestions" placeholder="Type or pick a crop" required autoComplete="off" /></label>
        <datalist id="crop-suggestions">{cropSuggestions.map(([name, local]) => <option key={name} value={name}>{local}</option>)}</datalist>
        <label>Sowing or planting date<input name="plantedOn" type="date" /></label>
        <label>Stage<select name="stage" defaultValue="Planned"><option>Planned</option><option>Sown</option><option>Growing</option><option>Ready to harvest</option><option>Harvested</option></select></label>
        <label className="wide-field">Notes<textarea name="notes" rows="3" placeholder="Seed variety, labour, irrigation, anything worth remembering" /></label>
        <div className="form-actions wide-field"><button className="button button-primary" type="submit"><Plus size={17} /> Add crop</button></div>
      </form>
    </section>
    <section className="sheet">
      <header className="sheet-head sheet-head-row"><h2>Crops on record</h2><span className="count">{records.length}</span></header>
      {records.length ? <ul className="crop-list">{records.map((record) => <li key={record.id}>
        <div><strong>{record.crop}</strong><span>{record.plotName}, {record.stage.toLowerCase()}{record.plantedOn ? `, from ${new Date(record.plantedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</span>{record.notes && <small>{record.notes}</small>}</div>
        <button className="icon-button" onClick={() => onDelete(record.id)} aria-label={`Delete ${record.crop} on ${record.plotName}`}><Trash2 size={16} /></button>
      </li>)}</ul> : <div className="empty"><Sprout size={26} /><strong>No crops recorded yet</strong><span>Add the first crop with the form. Each record stays on this device.</span></div>}
    </section>
  </div>
}

function DemoUserView({ view }) {
  return <section className="sheet demo-sheet">
    <header className="sheet-head"><h2>Demo farmer, sample farm</h2><p>Fictional entries that show how the register looks. This profile has no real land or location.</p></header>
    {view === 'register'
      ? <dl className="plot-facts"><div><dt>Farmer</dt><dd>Demo farmer</dd></div><div><dt>Farm</dt><dd>Sample farm</dd></div><div><dt>Location</dt><dd>Not specified</dd></div></dl>
      : <div className="demo-grid"><b>Plot</b><b>Crop</b><b>Stage</b>{demoCropRecords.map((record) => <Fragment key={record.id}><span>{record.plotName}</span><span>{record.crop}</span><span>{record.stage}</span></Fragment>)}</div>}
    <p className="quiet-note">Sample only. These crops are not advice for any real land.</p>
  </section>
}

function LandWalkControls({ status, error, points, currentLocation, distanceMeters, areaText, boundaries, onStart, onPause, onUndo, onFinish, onClear, onDeleteBoundary }) {
  const isTracking = status === 'locating' || status === 'walking'
  const statusText = { walking: 'Recording your walk', locating: 'Waiting for a clear GPS fix', paused: 'Walk paused', saved: 'Boundary saved', error: 'GPS unavailable' }[status] || 'Ready to walk'
  return <section className="walk" aria-label="Walk and map a land boundary">
    <div className="walk-head">
      <span className="walk-icon"><Crosshair size={19} /></span>
      <div><h3>Walk your boundary</h3><p>Stand at a corner, press start and walk the edge with this page open. The outline is a phone-GPS estimate, not a survey.</p></div>
    </div>
    <div className="walk-status" aria-live="polite"><span className={`gps-dot is-${status}`} />{statusText}<span className="walk-accuracy">{currentLocation ? `±${Math.round(currentLocation.accuracy)} m` : 'Location not shared'}</span></div>
    <dl className="walk-stats"><div><dt>Points</dt><dd>{points.length}</dd></div><div><dt>Edge walked</dt><dd>{distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(2)} km`}</dd></div><div><dt>Area</dt><dd>{points.length >= 3 ? areaText : '—'}</dd></div></dl>
    {error && <p className="walk-error" role="alert">{error}</p>}
    <div className="walk-actions">
      {isTracking ? <button className="button button-secondary" onClick={onPause}><Pause size={16} /> Pause</button> : <button className="button button-primary" onClick={onStart}><Play size={16} /> {status === 'paused' ? 'Resume walk' : 'Start walking'}</button>}
      <button className="button button-quiet" onClick={onUndo} disabled={!points.length}><RotateCcw size={16} /> Undo point</button>
      <button className="button button-quiet" onClick={onFinish} disabled={points.length < 3}><Check size={16} /> Close and save</button>
      <button className="button button-quiet" onClick={onClear} disabled={!points.length && !error}><Square size={14} /> Clear</button>
    </div>
    {boundaries.length > 0 && <ul className="saved-walks">{boundaries.map((boundary) => <li key={boundary.id}><span><b>{boundary.name}</b><small>{boundary.points.length} points, ±{Math.round(boundary.maxAccuracy)} m, {boundary.areaText}</small></span><button className="icon-button" onClick={() => onDeleteBoundary(boundary.id)} aria-label={`Delete ${boundary.name}`}><Trash2 size={15} /></button></li>)}</ul>}
  </section>
}

function AddPlot({ onAdd }) {
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

function DataPanel({ counts, onDownload, onRestore, restoreMessage }) {
  const [persisted, setPersisted] = useState(null)
  useEffect(() => { storageStatus().then((status) => setPersisted(status.persisted)) }, [])
  return <section className="sheet data-panel">
    <header className="sheet-head"><h2>Your data stays on this device</h2><p>There is no account and nothing is sent to a server. That also means nobody can recover your records for you, so keep a backup.</p></header>
    <div className="data-body">
      <p className="data-status"><ShieldCheck size={18} />{persisted ? 'This browser has agreed to keep your data.' : 'This browser may clear the data if the phone runs low on space or the site is not used for a while. Adding the app to your home screen and keeping a backup both help.'}</p>
      <p className="data-counts">On this device: {counts.plots} plots, {counts.crops} crop records, {counts.boundaries} walked boundaries.</p>
      <div className="data-actions">
        <button className="button button-primary" onClick={onDownload}><Download size={17} /> Download backup</button>
        <label className="button button-quiet file-button"><Upload size={17} /> Restore from backup<input type="file" accept=".json,application/json" onChange={onRestore} /></label>
      </div>
      <p className="quiet-note">The backup is one small file. Save it to WhatsApp, Google Drive or email it to yourself; restore it on a new phone to carry on.</p>
      {restoreMessage && <p className="import-message" role="status">{restoreMessage}</p>}
    </div>
  </section>
}

function App() {
  const [plots, setPlots] = useState(() => readLocal(KEYS.plots, []))
  const [importMessage, setImportMessage] = useState('')
  const [restoreMessage, setRestoreMessage] = useState('')
  const [selectedId, setSelectedId] = useState(() => readLocal(KEYS.plots, [])[0]?.id)
  const [query, setQuery] = useState('')
  const [useFilter, setUseFilter] = useState('all')
  const [view, setView] = useState(() => (typeof location !== 'undefined' && views.some((entry) => `#${entry.id}` === location.hash) ? location.hash.slice(1) : 'fields'))
  const [activeUser, setActiveUser] = useState('mine')
  const [dayPeriod] = useState(() => getDayPeriod(new Date()))
  const [profile, setProfile] = useState(() => readLocal(KEYS.profile, null))
  const [cropRecords, setCropRecords] = useState(() => readLocal(KEYS.crops, []))
  const [areaUnit, setAreaUnit] = useState(() => readLocal(KEYS.areaUnit, 'katha'))
  const [squareFeetPerKatha, setSquareFeetPerKatha] = useState(() => readLocal(KEYS.squareFeetPerKatha, null))
  const [savedBoundaries, setSavedBoundaries] = useState(() => readLocal(KEYS.boundaries, []))
  const [walkPoints, setWalkPoints] = useState([])
  const [walkStatus, setWalkStatus] = useState('idle')
  const [walkError, setWalkError] = useState('')
  const [currentLocation, setCurrentLocation] = useState(null)
  const walkWatchRef = useRef(null)

  useEffect(() => () => {
    if (walkWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(walkWatchRef.current)
  }, [])
  useEffect(() => {
    const onHash = () => { const id = location.hash.slice(1); if (views.some((entry) => entry.id === id)) setView(id) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const filteredPlots = useMemo(() => plots.filter((plot) => (useFilter === 'all' || (plot.landUse || '') === useFilter) && `${plot.name} ${plot.description} ${plot.noteText || ''} ${plot.clarification || ''} ${plot.source} ${describeLandUse(plot)}`.toLowerCase().includes(query.toLowerCase())), [plots, query, useFilter])
  const usesPresent = useMemo(() => [...new Set(plots.map((plot) => plot.landUse || ''))], [plots])
  const selectedPlot = plots.find((plot) => plot.id === selectedId) || plots[0]
  const visibleSelectedId = filteredPlots.some((plot) => plot.id === selectedId) ? selectedId : filteredPlots[0]?.id
  const isDemo = activeUser === 'demo'
  const landName = profile?.farmName || 'My land'

  const importKml = async (event) => {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    const { plots: found, problems } = await readKmlFiles(files)
    const known = new Set(plots.map((plot) => plot.id))
    const fresh = found.filter((plot) => !known.has(plot.id))
    if (fresh.length) {
      savePlots([...plots, ...fresh])
      setSelectedId(fresh[0].id)
    }
    const added = fresh.length ? `Added ${fresh.length} plot${fresh.length === 1 ? '' : 's'}.` : found.length ? 'These plots are already on your list.' : ''
    setImportMessage([added, ...problems].filter(Boolean).join(' '))
  }
  const savePlots = (next) => { setPlots(next); writeLocal(KEYS.plots, next) }
  const addPlot = (plot) => { savePlots([...plots, plot]); setSelectedId(plot.id) }
  const updatePlot = (id, patch) => savePlots(plots.map((plot) => (plot.id === id ? { ...plot, ...patch } : plot)))
  const removePlot = (id) => {
    const plot = plots.find((entry) => entry.id === id)
    if (!plot || !window.confirm(`Remove ${plot.name}? Crop records that mention it are kept.`)) return
    savePlots(plots.filter((entry) => entry.id !== id))
  }
  const backupData = () => ({ profile, crops: cropRecords, plots, boundaries: savedBoundaries, areaUnit, squareFeetPerKatha })
  const restoreBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const data = await readBackupFile(file)
      if (!window.confirm(`Replace what is on this device with ${file.name}? It has ${data.plots.length} plots and ${data.crops.length} crop records.`)) return
      writeAll(data)
      setProfile(data.profile)
      setCropRecords(data.crops)
      setPlots(data.plots)
      setSavedBoundaries(data.boundaries)
      setAreaUnit(data.areaUnit || 'katha')
      setSquareFeetPerKatha(data.squareFeetPerKatha)
      setSelectedId(data.plots[0]?.id)
      setRestoreMessage(`Restored ${data.plots.length} plots and ${data.crops.length} crop records.`)
    } catch (error) {
      setRestoreMessage(error.message)
    }
  }

  const saveProfile = (nextProfile) => {
    setProfile(nextProfile)
    setAreaUnit(nextProfile.areaUnit || 'katha')
    setSquareFeetPerKatha(nextProfile.squareFeetPerKatha)
    writeLocal(KEYS.profile, nextProfile)
    writeLocal(KEYS.areaUnit, nextProfile.areaUnit || 'katha')
    writeLocal(KEYS.squareFeetPerKatha, nextProfile.squareFeetPerKatha)
  }
  const changeAreaUnit = (unit) => { setAreaUnit(unit); writeLocal(KEYS.areaUnit, unit) }
  const addCrop = (record) => setCropRecords((current) => { const next = [...current, record]; writeLocal(KEYS.crops, next); return next })
  const deleteCrop = (id) => setCropRecords((current) => { const next = current.filter((record) => record.id !== id); writeLocal(KEYS.crops, next); return next })
  const stopWalk = (nextStatus = 'paused') => {
    if (walkWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(walkWatchRef.current)
    walkWatchRef.current = null
    setWalkStatus(nextStatus)
  }
  const changeView = (nextView) => {
    if (walkWatchRef.current !== null && nextView !== 'map') stopWalk('paused')
    setView(nextView)
    if (location.hash !== `#${nextView}`) history.replaceState(null, '', `#${nextView}`)
    window.scrollTo({ top: 0 })
  }
  const changeUser = (nextUser) => { if (walkWatchRef.current !== null) stopWalk('paused'); setActiveUser(nextUser) }
  const startWalk = () => {
    if (!window.isSecureContext) { setWalkError('Phone GPS needs a secure (https) link. Open the site securely and try again.'); setWalkStatus('error'); return }
    if (!navigator.geolocation) { setWalkError('This browser cannot read GPS location.'); setWalkStatus('error'); return }
    if (walkStatus !== 'paused') setWalkPoints([])
    setWalkError('')
    setWalkStatus('locating')
    walkWatchRef.current = navigator.geolocation.watchPosition((position) => {
      const sample = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp }
      setCurrentLocation(sample)
      if (sample.accuracy > 30) {
        setWalkStatus('locating')
        setWalkError(`GPS accuracy is ±${Math.round(sample.accuracy)} m. Waiting for 30 m or better; open sky helps.`)
        return
      }
      setWalkError('')
      setWalkStatus('walking')
      setWalkPoints((current) => {
        const lastPoint = current[current.length - 1]
        if (lastPoint && metersBetween(lastPoint, sample) < 4) return current
        return [...current, sample]
      })
    }, (error) => {
      const messages = {
        1: 'Location permission is off. Allow location for this site in your browser settings.',
        2: 'Phone location is unavailable. Turn on GPS and try again outdoors.',
        3: 'GPS took too long. Keep this page open and try again.',
      }
      setWalkError(messages[error.code] || 'Could not read the phone location.')
      setWalkStatus('error')
      walkWatchRef.current = null
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 })
  }
  const undoWalkPoint = () => setWalkPoints((current) => current.slice(0, -1))
  const clearWalk = () => { stopWalk('idle'); setWalkPoints([]); setWalkError(''); setCurrentLocation(null) }
  const finishWalk = () => {
    if (walkPoints.length < 3) { setWalkError('Walk at least three corner points before saving.'); return }
    const areaSquareMeters = polygonAreaSquareMeters(walkPoints)
    const nextBoundary = {
      id: `walk-${Date.now()}`,
      name: `Walked boundary ${savedBoundaries.length + 1}`,
      points: walkPoints,
      areaSquareMeters,
      areaText: formatWalkedArea(areaSquareMeters, areaUnit, squareFeetPerKatha),
      maxAccuracy: Math.max(...walkPoints.map((point) => point.accuracy)),
      capturedAt: new Date().toISOString(),
    }
    const next = [...savedBoundaries, nextBoundary]
    setSavedBoundaries(next)
    writeLocal(KEYS.boundaries, next)
    stopWalk('saved')
    setWalkPoints([])
    setWalkError('')
  }
  const deleteBoundary = (id) => setSavedBoundaries((current) => {
    const next = current.filter((boundary) => boundary.id !== id)
    writeLocal(KEYS.boundaries, next)
    return next
  })
  const walkDistanceMeters = useMemo(() => walkPoints.slice(1).reduce((sum, point, index) => sum + metersBetween(walkPoints[index], point), 0), [walkPoints])
  const walkAreaText = walkPoints.length >= 3 ? formatWalkedArea(polygonAreaSquareMeters(walkPoints), areaUnit, squareFeetPerKatha) : 'Need 3 points'

  const headings = {
    map: ['Land map', 'Your plots on the map. Walk a boundary to record its real shape.'],
    records: ['Plot list', 'Every plot you have added, with its land note.'],
    crops: ['Crop register', 'What is sown where, plot by plot.'],
    register: ['Farm profile', 'Your name, village, local katha size and backups.'],
  }
  const showLandTools = !isDemo && (view === 'map' || view === 'records')

  return <div className={`kk-app view-${view}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar">
      <a className="brand" href="#fields" onClick={(event) => { event.preventDefault(); changeView('fields') }} aria-label="Khet Khata home">
        <span className="brand-mark" lang="hi" aria-hidden="true">खेत खाता</span>
        <span className="brand-name">Khet Khata</span>
      </a>
      <nav className="topnav" aria-label="Main">
        {views.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'is-active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => changeView(id)}><Icon size={17} />{label}</button>)}
      </nav>
      <label className="profile-switch"><span className="visually-hidden">Farm profile</span><select value={activeUser} onChange={(event) => changeUser(event.target.value)}><option value="mine">{landName}</option><option value="demo">Demo farmer</option></select></label>
    </header>

    <main id="main" className="main">
      {view === 'fields' ? <>
        <Suspense fallback={<div className="stage-fallback">Preparing the field…</div>}>
          <CropStage initialLight={dayPeriod} onOpenRegister={() => changeView('crops')} />
        </Suspense>
        <section className="land-strip" aria-label="Your land at a glance">
          <div className="land-strip-text">
            <h2>{isDemo ? 'Demo farm' : landName}</h2>
            <p>{isDemo ? 'A fictional profile with sample crops and no real map data.' : plots.length ? 'Your plots and crop notes, saved on this device only.' : 'Start your ledger: add a plot, import a KML file, or walk your boundary with the phone. No sign-up needed; it stays on this device.'}</p>
          </div>
          <dl className="tally">
            <div><dt>Plots</dt><dd>{isDemo ? 0 : plots.length}</dd></div>
            <div><dt>Ponds</dt><dd>{isDemo ? 0 : plots.filter((plot) => plot.landUse === 'pond').length}</dd></div>
            <div><dt>Crops recorded</dt><dd>{isDemo ? demoCropRecords.length : cropRecords.length}</dd></div>
          </dl>
          <div className="land-strip-actions">
            {plots.length || isDemo ? <><button className="button button-primary" onClick={() => changeView('map')}><Map size={17} /> Open land map</button>
            <button className="button button-quiet" onClick={() => changeView('crops')}><Plus size={17} /> Add a crop</button></> : <><button className="button button-primary" onClick={() => changeView('records')}><Plus size={17} /> Add your first plot</button>
            <button className="button button-quiet" onClick={() => changeView('register')}><Upload size={17} /> Restore a backup</button></>}
          </div>
        </section>
      </> : <div className="page">
        <div className="page-head">
          <div><h1>{isDemo ? 'Demo farm' : headings[view][0]}</h1><p>{isDemo ? 'Sample crops only. This profile has no real map locations.' : headings[view][1]}</p></div>
          {showLandTools && <div className="page-tools">
            <label className="field-inline"><span>Area in</span><select value={areaUnit} onChange={(event) => changeAreaUnit(event.target.value)}><option value="katha">Katha</option><option value="acre">Acres</option><option value="hectare">Hectares</option><option value="gaj">Gaj</option></select></label>
            <label className="search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plots or notes" aria-label="Search plots or notes" /></label>
          </div>}
        </div>
        {showLandTools && usesPresent.length > 1 && <div className="use-filter" role="group" aria-label="Show land of type">
          <button className={useFilter === 'all' ? 'is-active' : ''} aria-pressed={useFilter === 'all'} onClick={() => setUseFilter('all')}>All land <b>{plots.length}</b></button>
          {[...landUses, { id: '', label: 'Not set yet', color: '#6b6b6b' }].filter((use) => usesPresent.includes(use.id)).map((use) => <button key={use.id || 'unset'} style={{ '--use': use.color }} className={useFilter === use.id ? 'is-active' : ''} aria-pressed={useFilter === use.id} onClick={() => setUseFilter(use.id)}><i aria-hidden="true" />{use.label} <b>{plots.filter((plot) => (plot.landUse || '') === use.id).length}</b></button>)}
        </div>}
        {showLandTools && areaUnit !== 'katha' && !(squareFeetPerKatha > 0) && <p className="notice">To show {{ acre: 'acres', hectare: 'hectares', gaj: 'gaj' }[areaUnit]}, add the square feet in one local katha in <button className="text-link" onClick={() => changeView('register')}>Farm profile</button>.</p>}

        {isDemo ? <DemoUserView view={view} /> : view === 'map' ? <div className="map-layout">
          <section className="map-panel">
            {filteredPlots.length || !query ? <LandMap plots={filteredPlots.filter(hasLocation)} selectedId={visibleSelectedId} onSelect={setSelectedId} dayPeriod={{ id: dayPeriod }} boundaries={savedBoundaries} walkPoints={walkPoints} currentLocation={currentLocation} followLocation={walkStatus === 'locating' || walkStatus === 'walking'} /> : <div className="empty">No plot matches “{query}”. Clear the search to see all plots.</div>}
            {!plots.some(hasLocation) && <p className="notice">No plots with a location yet. Walk your boundary below, or <button className="text-link" onClick={() => changeView('records')}>add or import plots</button>.</p>}
            <div className="map-key">{landUses.filter((use) => usesPresent.includes(use.id)).map((use) => <span key={use.id}><i className="key-use" style={{ '--use': use.color, '--fill': use.fill }} /> {use.label}</span>)}<span><i className="key-square" /> Dashed square: guessed size</span><span><i className="key-walk" /> Walked outline</span></div>
            <LandWalkControls status={walkStatus} error={walkError} points={walkPoints} currentLocation={currentLocation} distanceMeters={walkDistanceMeters} areaText={walkAreaText} boundaries={savedBoundaries} onStart={startWalk} onPause={() => stopWalk('paused')} onUndo={undoWalkPoint} onFinish={finishWalk} onClear={clearWalk} onDeleteBoundary={deleteBoundary} />
          </section>
          {filteredPlots.length > 0 && <PlotDetail plot={plots.find((plot) => plot.id === visibleSelectedId) || selectedPlot} areaUnit={areaUnit} squareFeetPerKatha={squareFeetPerKatha} onRemove={removePlot} onUpdate={updatePlot} />}
        </div> : view === 'records' ? <section className="sheet">
          <header className="sheet-head sheet-head-row"><h2>Your plots</h2><span className="count">{filteredPlots.length}</span></header>
          <div className="import-row">
            <label className="button button-quiet file-button"><FileUp size={17} /> Import KML files<input type="file" accept=".kml,application/vnd.google-earth.kml+xml" multiple onChange={importKml} /></label>
            <p>Have plots in Google Earth, Google My Maps or a GPS app? Export them as KML. Points and outlines are read; katha is read only when the note states it.</p>
            {importMessage && <p className="import-message" role="status">{importMessage}</p>}
          </div>
          <AddPlot onAdd={addPlot} />
          {filteredPlots.length ? <PlotTable plots={filteredPlots} selectedId={visibleSelectedId} onSelect={(id) => { setSelectedId(id); changeView('map') }} onRemove={removePlot} areaUnit={areaUnit} squareFeetPerKatha={squareFeetPerKatha} /> : <div className="empty">{query ? `No plot matches “${query}”.` : 'No plots yet. Add one by hand, import a KML file, or restore a backup from Farm profile.'}</div>}
        </section> : view === 'register' ? <div className="stack"><FarmRegistration profile={profile} onSave={saveProfile} areaUnit={areaUnit} squareFeetPerKatha={squareFeetPerKatha} /><DataPanel counts={{ plots: plots.length, crops: cropRecords.length, boundaries: savedBoundaries.length }} onDownload={() => downloadBackup(backupData())} onRestore={restoreBackup} restoreMessage={restoreMessage} /></div> : <CropRecords plots={plots} records={cropRecords} onAdd={addCrop} onDelete={deleteCrop} />}
        <footer className="page-foot">Everything you enter stays on this device. Download a backup from Farm profile to keep a copy. <span className="app-version">Khet Khata v{__APP_VERSION__}</span></footer>
      </div>}
    </main>

    <nav className="tabbar" aria-label="Main">
      {views.map(({ id, short, icon: Icon }) => <button key={id} className={view === id ? 'is-active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => changeView(id)}><Icon size={21} /><span>{short}</span></button>)}
    </nav>
  </div>
}

export default App
