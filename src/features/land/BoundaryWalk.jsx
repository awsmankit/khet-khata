import { Check, Crosshair, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react'
import './land.css'

export default function BoundaryWalk({ walk }) {
  const { status, error, points, currentLocation, distanceMeters, areaText, boundaries, start: onStart, pause: onPause, undo: onUndo, finish: onFinish, clear: onClear, remove: onDeleteBoundary } = walk
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
