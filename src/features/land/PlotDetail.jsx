import { ExternalLink, Trash2 } from 'lucide-react'
import { describeLandUse, landUseOf } from './landUse.js'
import { formatLandNote, hasLocation } from './landMath.js'
import LandUseFields from './LandUseFields.jsx'
import './land.css'

export default function PlotDetail({ plot, areaUnit, squareFeetPerKatha, onRemove, onUpdate }) {
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
