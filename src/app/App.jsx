import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { BookOpen, FileUp, List, Map, NotebookPen, Plus, Search, Sprout, Upload, UserRound } from 'lucide-react'
import { downloadBackup, KEYS, readBackupFile, readLocal, writeAll, writeLocal } from '../lib/storage.js'
import { everyCrop } from '../features/crops/cropIndex.js'
import CropGuide from '../features/crops/CropGuide.jsx'
import AddPlot from '../features/land/AddPlot.jsx'
import BoundaryWalk from '../features/land/BoundaryWalk.jsx'
import LandMap from '../features/land/LandMap.jsx'
import PlotDetail from '../features/land/PlotDetail.jsx'
import PlotList from '../features/land/PlotList.jsx'
import { readKmlFiles } from '../features/land/kml.js'
import { hasLocation } from '../features/land/landMath.js'
import { describeLandUse, landUses } from '../features/land/landUse.js'
import { useBoundaryWalk } from '../features/land/useBoundaryWalk.js'
import BackupPanel from '../features/farm/BackupPanel.jsx'
import CropRegister from '../features/farm/CropRegister.jsx'
import DemoFarm from '../features/farm/DemoFarm.jsx'
import { demoCropRecords } from '../features/farm/demoData.js'
import FarmProfileForm from '../features/farm/FarmProfileForm.jsx'
import './App.css'

const CropStage = lazy(() => import('../features/field3d/CropStage.jsx'))

const views = [
  { id: 'fields', label: 'Fields', short: 'Fields', icon: Sprout },
  { id: 'guide', label: 'Crop guide', short: 'Guide', icon: BookOpen },
  { id: 'map', label: 'Land map', short: 'Map', icon: Map },
  { id: 'plots', label: 'Plot list', short: 'Plots', icon: List },
  { id: 'crops', label: 'Crop register', short: 'Crops', icon: NotebookPen },
  { id: 'profile', label: 'Farm profile', short: 'Profile', icon: UserRound },
]
// Links saved from version 1.0 used these names.
const oldViewNames = { records: 'plots', register: 'profile' }

function viewFromHash() {
  const id = typeof location === 'undefined' ? '' : location.hash.slice(1)
  const resolved = oldViewNames[id] || id
  return views.some((entry) => entry.id === resolved) ? resolved : null
}

function getDayPeriod(date) {
  const hour = date.getHours()
  if (hour < 5 || hour >= 20) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 16) return 'afternoon'
  return 'evening'
}

function App() {
  const [view, setView] = useState(() => viewFromHash() || 'fields')
  const [activeUser, setActiveUser] = useState('mine')
  const [dayPeriod] = useState(() => getDayPeriod(new Date()))
  const [stageCrop, setStageCrop] = useState(null)
  const [plots, setPlots] = useState(() => readLocal(KEYS.plots, []))
  const [selectedId, setSelectedId] = useState(() => readLocal(KEYS.plots, [])[0]?.id)
  const [query, setQuery] = useState('')
  const [useFilter, setUseFilter] = useState('all')
  const [importMessage, setImportMessage] = useState('')
  const [restoreMessage, setRestoreMessage] = useState('')
  const [profile, setProfile] = useState(() => readLocal(KEYS.profile, null))
  const [cropRecords, setCropRecords] = useState(() => readLocal(KEYS.crops, []))
  const [areaUnit, setAreaUnit] = useState(() => readLocal(KEYS.areaUnit, 'katha'))
  const [squareFeetPerKatha, setSquareFeetPerKatha] = useState(() => readLocal(KEYS.squareFeetPerKatha, null))
  const walk = useBoundaryWalk({ areaUnit, squareFeetPerKatha })

  useEffect(() => {
    const onHash = () => { const id = viewFromHash(); if (id) setView(id) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const filteredPlots = useMemo(() => plots.filter((plot) => (useFilter === 'all' || (plot.landUse || '') === useFilter) && `${plot.name} ${plot.description} ${plot.noteText || ''} ${plot.clarification || ''} ${plot.source} ${describeLandUse(plot)}`.toLowerCase().includes(query.toLowerCase())), [plots, query, useFilter])
  const usesPresent = useMemo(() => [...new Set(plots.map((plot) => plot.landUse || ''))], [plots])
  const visibleSelectedId = filteredPlots.some((plot) => plot.id === selectedId) ? selectedId : filteredPlots[0]?.id
  const selectedPlot = plots.find((plot) => plot.id === visibleSelectedId) || plots[0]
  const isDemo = activeUser === 'demo'
  const landName = profile?.farmName || 'My land'

  const changeView = (nextView) => {
    if (walk.isTracking && nextView !== 'map') walk.pause()
    setView(nextView)
    if (location.hash !== `#${nextView}`) history.replaceState(null, '', `#${nextView}`)
    window.scrollTo({ top: 0 })
  }
  const changeUser = (nextUser) => { if (walk.isTracking) walk.pause(); setActiveUser(nextUser) }

  const savePlots = (next) => { setPlots(next); writeLocal(KEYS.plots, next) }
  const addPlot = (plot) => { savePlots([...plots, plot]); setSelectedId(plot.id) }
  const updatePlot = (id, patch) => savePlots(plots.map((plot) => (plot.id === id ? { ...plot, ...patch } : plot)))
  const removePlot = (id) => {
    const plot = plots.find((entry) => entry.id === id)
    if (!plot || !window.confirm(`Remove ${plot.name}? Crop records that mention it are kept.`)) return
    savePlots(plots.filter((entry) => entry.id !== id))
  }
  const importKml = async (event) => {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    const { plots: found, problems } = await readKmlFiles(files)
    const known = new Set(plots.map((plot) => plot.id))
    const fresh = found.filter((plot) => !known.has(plot.id))
    if (fresh.length) { savePlots([...plots, ...fresh]); setSelectedId(fresh[0].id) }
    const added = fresh.length ? `Added ${fresh.length} plot${fresh.length === 1 ? '' : 's'}.` : found.length ? 'These plots are already on your list.' : ''
    setImportMessage([added, ...problems].filter(Boolean).join(' '))
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
      walk.replaceBoundaries(data.boundaries)
      setAreaUnit(data.areaUnit || 'katha')
      setSquareFeetPerKatha(data.squareFeetPerKatha)
      setSelectedId(data.plots[0]?.id)
      setRestoreMessage(`Restored ${data.plots.length} plots and ${data.crops.length} crop records.`)
    } catch (error) {
      setRestoreMessage(error.message)
    }
  }

  const headings = {
    guide: ['Crop guide', `${everyCrop.length} crops grown across India, from millets and pulses to tea, spices, fruit and pond crops.`],
    map: ['Land map', 'Your plots on the map. Walk a boundary to record its real shape.'],
    plots: ['Plot list', 'Every plot you have added, with its land note.'],
    crops: ['Crop register', 'What is sown where, plot by plot.'],
    profile: ['Farm profile', 'Your name, village, local katha size and backups.'],
  }
  const showLandTools = !isDemo && (view === 'map' || view === 'plots')

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
          <CropStage initialLight={dayPeriod} requestedCrop={stageCrop} onOpenRegister={() => changeView('crops')} onOpenGuide={() => changeView('guide')} />
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
            {plots.length || isDemo ? <>
              <button className="button button-primary" onClick={() => changeView('map')}><Map size={17} /> Open land map</button>
              <button className="button button-quiet" onClick={() => changeView('crops')}><Plus size={17} /> Add a crop</button>
            </> : <>
              <button className="button button-primary" onClick={() => changeView('plots')}><Plus size={17} /> Add your first plot</button>
              <button className="button button-quiet" onClick={() => changeView('profile')}><Upload size={17} /> Restore a backup</button>
            </>}
          </div>
        </section>
      </> : <div className="page">
        <div className="page-head">
          <div><h1>{isDemo && view !== 'guide' ? 'Demo farm' : headings[view][0]}</h1><p>{isDemo && view !== 'guide' ? 'Sample crops only. This profile has no real map locations.' : headings[view][1]}</p></div>
          {showLandTools && <div className="page-tools">
            <label className="field-inline"><span>Area in</span><select value={areaUnit} onChange={(event) => changeAreaUnit(event.target.value)}><option value="katha">Katha</option><option value="acre">Acres</option><option value="hectare">Hectares</option><option value="gaj">Gaj</option></select></label>
            <label className="search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plots or notes" aria-label="Search plots or notes" /></label>
          </div>}
        </div>
        {showLandTools && usesPresent.length > 1 && <div className="use-filter" role="group" aria-label="Show land of type">
          <button className={useFilter === 'all' ? 'is-active' : ''} aria-pressed={useFilter === 'all'} onClick={() => setUseFilter('all')}>All land <b>{plots.length}</b></button>
          {[...landUses, { id: '', label: 'Not set yet', color: '#6b6b6b' }].filter((use) => usesPresent.includes(use.id)).map((use) => <button key={use.id || 'unset'} style={{ '--use': use.color }} className={useFilter === use.id ? 'is-active' : ''} aria-pressed={useFilter === use.id} onClick={() => setUseFilter(use.id)}><i aria-hidden="true" />{use.label} <b>{plots.filter((plot) => (plot.landUse || '') === use.id).length}</b></button>)}
        </div>}
        {showLandTools && areaUnit !== 'katha' && !(squareFeetPerKatha > 0) && <p className="notice">To show {{ acre: 'acres', hectare: 'hectares', gaj: 'gaj' }[areaUnit]}, add the square feet in one local katha in <button className="text-link" onClick={() => changeView('profile')}>Farm profile</button>.</p>}

        {view === 'guide' ? <CropGuide onOpen={(id) => { setStageCrop(id); changeView('fields') }} />
          : isDemo ? <DemoFarm view={view} />
          : view === 'map' ? <div className="map-layout">
            <section className="map-panel">
              {filteredPlots.length || !query ? <LandMap plots={filteredPlots.filter(hasLocation)} selectedId={visibleSelectedId} onSelect={setSelectedId} dayPeriod={{ id: dayPeriod }} boundaries={walk.boundaries} walkPoints={walk.points} currentLocation={walk.currentLocation} followLocation={walk.isTracking} /> : <div className="empty">No plot matches “{query}”. Clear the search to see all plots.</div>}
              {!plots.some(hasLocation) && <p className="notice">No plots with a location yet. Walk your boundary below, or <button className="text-link" onClick={() => changeView('plots')}>add or import plots</button>.</p>}
              <div className="map-key">{landUses.filter((use) => usesPresent.includes(use.id)).map((use) => <span key={use.id}><i className="key-use" style={{ '--use': use.color, '--fill': use.fill }} /> {use.label}</span>)}<span><i className="key-square" /> Dashed square: guessed size</span><span><i className="key-walk" /> Walked outline</span></div>
              <BoundaryWalk walk={walk} />
            </section>
            {filteredPlots.length > 0 && <PlotDetail plot={selectedPlot} areaUnit={areaUnit} squareFeetPerKatha={squareFeetPerKatha} onRemove={removePlot} onUpdate={updatePlot} />}
          </div>
          : view === 'plots' ? <section className="sheet">
            <header className="sheet-head sheet-head-row"><h2>Your plots</h2><span className="count">{filteredPlots.length}</span></header>
            <div className="import-row">
              <label className="button button-quiet file-button"><FileUp size={17} /> Import KML files<input type="file" accept=".kml,application/vnd.google-earth.kml+xml" multiple onChange={importKml} /></label>
              <p>Have plots in Google Earth, Google My Maps or a GPS app? Export them as KML. Points and outlines are read; katha is read only when the note states it.</p>
              {importMessage && <p className="import-message" role="status">{importMessage}</p>}
            </div>
            <AddPlot onAdd={addPlot} />
            {filteredPlots.length ? <PlotList plots={filteredPlots} selectedId={visibleSelectedId} onSelect={(id) => { setSelectedId(id); changeView('map') }} onRemove={removePlot} areaUnit={areaUnit} squareFeetPerKatha={squareFeetPerKatha} /> : <div className="empty">{query ? `No plot matches “${query}”.` : 'No plots yet. Add one by hand, import a KML file, or restore a backup from Farm profile.'}</div>}
          </section>
          : view === 'profile' ? <div className="stack">
            <FarmProfileForm profile={profile} onSave={saveProfile} areaUnit={areaUnit} squareFeetPerKatha={squareFeetPerKatha} />
            <BackupPanel counts={{ plots: plots.length, crops: cropRecords.length, boundaries: walk.boundaries.length }} onDownload={() => downloadBackup({ profile, crops: cropRecords, plots, boundaries: walk.boundaries, areaUnit, squareFeetPerKatha })} onRestore={restoreBackup} restoreMessage={restoreMessage} />
          </div>
          : <CropRegister plots={plots} records={cropRecords} onAdd={addCrop} onDelete={deleteCrop} />}
        <footer className="page-foot">Everything you enter stays on this device. Download a backup from Farm profile to keep a copy. <span className="app-version">Khet Khata v{__APP_VERSION__}</span></footer>
      </div>}
    </main>

    <nav className="tabbar" aria-label="Main">
      {views.map(({ id, short, icon: Icon }) => <button key={id} className={view === id ? 'is-active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => changeView(id)}><Icon size={21} /><span>{short}</span></button>)}
    </nav>
  </div>
}

export default App
