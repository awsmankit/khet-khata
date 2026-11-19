import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Search, Wind, X } from 'lucide-react'
import { lightModes } from './catalog.js'
import { categories, everyCrop, findCrop, stageAtList, stagesFor } from './cropIndex.js'
import './CropStage.css'
const SEASON_SECONDS = 14

function detectQuality() {
  if (typeof window === 'undefined') return 1
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 8
  if (small || cores <= 4 || memory <= 4) return 0.55
  return 1
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function CropStage({ initialLight = 'afternoon', initialCrop = 'wheat', requestedCrop = null, compact = false, onOpenRegister, onOpenGuide }) {
  const hostRef = useRef(null)
  const engineRef = useRef(null)
  const playRef = useRef(null)
  const [cropId, setCropId] = useState(initialCrop)
  const [growth, setGrowth] = useState(0.04)
  const [wind, setWind] = useState(45)
  const [light, setLight] = useState(initialLight)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState(() => (hasWebGL() ? 'loading' : 'unsupported'))
  const [hintVisible, setHintVisible] = useState(true)
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [modelInfo, setModelInfo] = useState(null)
  const [category, setCategory] = useState(() => findCrop(initialCrop)?.category || 'cereal')
  const [query, setQuery] = useState('')
  const crop = findCrop(cropId) || everyCrop[0]
  const stages = stagesFor(crop, modelInfo?.stages)
  const stage = stageAtList(stages, growth)
  const shelfCrops = query.trim()
    ? everyCrop.filter((entry) => `${entry.name} ${entry.local} ${entry.localLatin}`.toLowerCase().includes(query.trim().toLowerCase()))
    : everyCrop.filter((entry) => entry.category === category)

  // create the engine once
  useEffect(() => {
    if (status === 'unsupported') return undefined
    let cancelled = false
    let engine
    import('./FieldEngine.js').then(({ FieldEngine }) => {
      if (cancelled || !hostRef.current) return
      engine = new FieldEngine(hostRef.current, { quality: detectQuality(), reducedMotion })
      engineRef.current = engine
      if (import.meta.env.DEV) window.__fieldEngine = engine
      engine.setWind(0.45)
      engine.setLight(initialLight)
      setTimeout(() => {
        if (cancelled) return
        const info = engine.modelInfo(initialCrop) || engine.modelInfo('wheat')
        const first = engine.modelInfo(initialCrop) ? initialCrop : 'wheat'
        engine.setCrop(first)
        engine.start()
        setCropId(first)
        setModelInfo(info)
        setStatus('ready')
        // the one orchestrated moment: the opening field grows from sowing to its showcase stage
        if (reducedMotion) setGrowth(info.showcase)
        else animateGrowth(0.04, info.showcase, 5200)
      }, 30)
    }).catch(() => setStatus('unsupported'))
    return () => {
      cancelled = true
      cancelAnimationFrame(playRef.current)
      engine?.dispose()
      engineRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { engineRef.current?.setGrowth(growth) }, [growth])
  useEffect(() => { engineRef.current?.setWind(wind / 100) }, [wind])
  useEffect(() => { if (status === 'ready') engineRef.current?.setLight(light) }, [light, status])

  function animateGrowth(from, to, duration) {
    cancelAnimationFrame(playRef.current)
    const start = performance.now()
    setPlaying(true)
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setGrowth(from + (to - from) * eased)
      if (t < 1) playRef.current = requestAnimationFrame(step)
      else setPlaying(false)
    }
    playRef.current = requestAnimationFrame(step)
  }

  function togglePlay() {
    if (playing) { cancelAnimationFrame(playRef.current); setPlaying(false); return }
    const from = growth >= 0.98 ? 0 : growth
    animateGrowth(from, 1, SEASON_SECONDS * 1000 * (1 - from))
  }

  function chooseCrop(id) {
    const engine = engineRef.current
    if (id === cropId || !engine || (status !== 'ready' && status !== 'missing')) return
    cancelAnimationFrame(playRef.current)
    setPlaying(false)
    setCropId(id)
    const info = engine.modelInfo(id)
    if (!info) { setModelInfo(null); setStatus('missing'); return }
    setModelInfo(info)
    setStatus('building')
    // let the "planting" message paint before the heavy build
    requestAnimationFrame(() => setTimeout(() => {
      engine.setCrop(id)
      setGrowth(info.showcase)
      engine.setGrowth(info.showcase)
      setStatus('ready')
    }, 20))
  }

  // opening a crop from the crop guide
  useEffect(() => {
    if (!requestedCrop || (status !== 'ready' && status !== 'missing')) return
    const entry = findCrop(requestedCrop)
    if (entry) { setCategory(entry.category); setQuery('') }
    chooseCrop(requestedCrop)
  }, [requestedCrop, status === 'ready' || status === 'missing']) // eslint-disable-line react-hooks/exhaustive-deps

  const windLabel = wind < 15 ? 'Still' : wind < 45 ? 'Light breeze' : wind < 75 ? 'Breezy' : 'Gusty'

  return <section className={`field-stage light-${light} ${compact ? 'is-compact' : ''}`} aria-label="Live 3D crop field">
    <div className="stage-viewport">
      <div ref={hostRef} className="stage-canvas" onPointerDown={() => setHintVisible(false)} />
      <div className="stage-heading">
        <span className={`stage-local ${crop.local.length > 5 ? 'is-long' : ''} ${crop.local.length > 9 ? 'is-longer' : ''}`} lang="hi" aria-hidden="true">{crop.local}</span>
        <h1 className="stage-name">{crop.name} <span>{crop.localLatin}</span></h1>
        <p className="stage-season">{crop.season}, {crop.window}</p>
      </div>
      <div className="stage-readout" aria-live="polite">
        <span className="readout-when">{stage.when}</span>
        <strong>{stage.name}</strong>
      </div>
      {status === 'building' && <div className="stage-veil"><span>Planting {crop.name.toLowerCase()}…</span></div>}
      {status === 'missing' && <div className="stage-veil"><span>The 3D model of {crop.name.toLowerCase()} is still being made. Its details are below.</span></div>}
      {status === 'loading' && <div className="stage-veil is-solid"><span>Preparing the field…</span></div>}
      {status === 'unsupported' && <div className="stage-veil is-solid"><span>This browser cannot show 3D graphics. Crop records and the land map still work.</span></div>}
      {status === 'ready' && hintVisible && <p className="stage-hint">Drag to walk around the field. Pinch or scroll to zoom.</p>}
    </div>

    <div className="stage-controls">
      <div className="season-row">
        <button className="play-button" onClick={togglePlay} disabled={status !== 'ready'} aria-label={playing ? 'Pause season' : growth >= 0.98 ? 'Replay season' : 'Play season'}>
          {playing ? <Pause size={18} /> : growth >= 0.98 ? <RotateCcw size={18} /> : <Play size={18} />}
        </button>
        <div className="season-track">
          <input type="range" min="0" max="1000" value={Math.round(growth * 1000)} onChange={(event) => { cancelAnimationFrame(playRef.current); setPlaying(false); setGrowth(Number(event.target.value) / 1000) }} aria-label={`Season progress for ${crop.name}`} aria-valuetext={`${stage.name}, ${stage.when}`} style={{ '--progress': `${growth * 100}%` }} />
          <ol className="season-ticks" aria-hidden="true">
            {stages.map(([at, name, when]) => <li key={`${at}-${name}`} style={{ left: `${at * 100}%` }} className={growth >= at ? 'is-past' : ''}><span>{when}</span></li>)}
          </ol>
        </div>
      </div>

      <div className="shelf">
        <div className="shelf-top">
          <div className="shelf-tabs" role="tablist" aria-label="Crop groups">
            {categories.map((entry) => <button key={entry.id} role="tab" aria-selected={!query && category === entry.id} className={!query && category === entry.id ? 'is-active' : ''} onClick={() => { setCategory(entry.id); setQuery('') }}>{entry.label}</button>)}
          </div>
          <label className="shelf-search"><Search size={15} /><span className="visually-hidden">Find a crop</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a crop" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</label>
        </div>
        <div className="shelf-items" role="group" aria-label={query ? `Crops matching ${query}` : `${categories.find((entry) => entry.id === category)?.label}`}>
          {shelfCrops.map((entry) => <button key={entry.id} className={`crop-chip ${entry.id === cropId ? 'is-active' : ''}`} onClick={() => chooseCrop(entry.id)} aria-pressed={entry.id === cropId}>
            <span lang="hi">{entry.local}</span>
            <small>{entry.name}</small>
          </button>)}
          {!shelfCrops.length && <p className="shelf-empty">No crop called “{query}” yet.</p>}
        </div>
        {onOpenGuide && <button className="text-link shelf-guide" onClick={onOpenGuide}>Browse all {everyCrop.length} crops by region and season</button>}
      </div>

      <div className="stage-tools">
        <label className="wind-tool"><span><Wind size={15} /> Wind: {windLabel}</span><input type="range" min="0" max="100" value={wind} onChange={(event) => setWind(Number(event.target.value))} /></label>
        <div className="light-tool" role="group" aria-label="Time of day">
          {lightModes.map((mode) => <button key={mode.id} className={light === mode.id ? 'is-active' : ''} aria-pressed={light === mode.id} onClick={() => setLight(mode.id)}>{mode.label}</button>)}
        </div>
      </div>

      <p className="stage-about">{crop.about} <span className="stage-regions">Grown widely in {crop.regions}.</span><span className="stage-caveat">Illustrative model. Months shown are typical for north India and vary by state, variety and year; check with your nearest Krishi Vigyan Kendra.</span>{onOpenRegister && <> <button className="text-link" onClick={onOpenRegister}>Record a crop on your plots</button></>}</p>
    </div>
  </section>
}
