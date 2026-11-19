import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Wind } from 'lucide-react'
import { cropCatalog, lightModes, stageAt } from './catalog.js'
import './CropStage.css'

const showcase = { wheat: 0.86, rice: 0.62, maize: 0.66, mustard: 0.58, sugarcane: 0.8, banana: 0.84, mango: 0.86, litchi: 0.86 }
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

export default function CropStage({ initialLight = 'afternoon', initialCrop = 'wheat', compact = false, onOpenRegister }) {
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
  const crop = cropCatalog.find((entry) => entry.id === cropId) || cropCatalog[0]
  const stage = stageAt(crop, growth)

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
        engine.setCrop(initialCrop)
        engine.start()
        setStatus('ready')
        // the one orchestrated moment: the opening field grows from sowing to its showcase stage
        if (reducedMotion) setGrowth(showcase[initialCrop])
        else animateGrowth(0.04, showcase[initialCrop], 5200)
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
    if (id === cropId || status !== 'ready') return
    cancelAnimationFrame(playRef.current)
    setPlaying(false)
    setCropId(id)
    setStatus('building')
    const next = showcase[id]
    // let the "planting" message paint before the heavy build
    requestAnimationFrame(() => setTimeout(() => {
      engineRef.current?.setCrop(id)
      setGrowth(next)
      engineRef.current?.setGrowth(next)
      setStatus('ready')
    }, 20))
  }

  const windLabel = wind < 15 ? 'Still' : wind < 45 ? 'Light breeze' : wind < 75 ? 'Breezy' : 'Gusty'
  const groups = [['field', 'Field crops'], ['orchard', 'Orchard and plantation']]

  return <section className={`field-stage light-${light} ${compact ? 'is-compact' : ''}`} aria-label="Live 3D crop field">
    <div className="stage-viewport">
      <div ref={hostRef} className="stage-canvas" onPointerDown={() => setHintVisible(false)} />
      <div className="stage-heading">
        <span className="stage-local" lang="hi" aria-hidden="true">{crop.local}</span>
        <h1 className="stage-name">{crop.name} <span>{crop.localLatin}</span></h1>
        <p className="stage-season">{crop.season}, {crop.window}</p>
      </div>
      <div className="stage-readout" aria-live="polite">
        <span className="readout-when">{stage.when}</span>
        <strong>{stage.name}</strong>
      </div>
      {status === 'building' && <div className="stage-veil"><span>Planting {crop.name.toLowerCase()}…</span></div>}
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
            {crop.stages.map(([at, name, when]) => <li key={name} style={{ left: `${at * 100}%` }} className={growth >= at ? 'is-past' : ''}><span>{when}</span></li>)}
          </ol>
        </div>
      </div>

      <div className="shelf" role="group" aria-label="Choose a crop">
        {groups.map(([group, label]) => <div className="shelf-group" key={group}>
          <span className="shelf-label">{label}</span>
          <div className="shelf-items">
            {cropCatalog.filter((entry) => entry.group === group).map((entry) => <button key={entry.id} className={`crop-chip ${entry.id === cropId ? 'is-active' : ''}`} onClick={() => chooseCrop(entry.id)} aria-pressed={entry.id === cropId}>
              <span lang="hi">{entry.local}</span>
              <small>{entry.name}</small>
            </button>)}
          </div>
        </div>)}
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
