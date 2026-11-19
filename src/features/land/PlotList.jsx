import { Trash2 } from 'lucide-react'
import { describeLandUse, landUseOf } from './landUse.js'
import { formatLandNote, hasLocation } from './landMath.js'
import './land.css'

export default function PlotList({ plots, selectedId, onSelect, onRemove, areaUnit, squareFeetPerKatha }) {
  return <div className="ledger">
    <ol className="ledger-rows">
      {plots.map((plot) => <li key={plot.id} className={selectedId === plot.id ? 'is-selected' : ''}>
        <button className="ledger-row-main" onClick={() => onSelect(plot.id)}>
          <span className="ledger-name">{plot.name}</span>
          <span className="ledger-note"><span className="use-tag" style={{ '--use': landUseOf(plot).color }}><i aria-hidden="true" />{describeLandUse(plot)}</span>{formatLandNote(plot, areaUnit, squareFeetPerKatha)}{plot.clarification && <em>Needs a quick check</em>}</span>
          <span className="ledger-coords">{hasLocation(plot) ? `${plot.latitude.toFixed(5)}, ${plot.longitude.toFixed(5)}` : 'No location yet'}</span>
        </button>
        <button className="icon-button ledger-remove" onClick={() => onRemove(plot.id)} aria-label={`Remove ${plot.name}`}><Trash2 size={15} /></button>
      </li>)}
    </ol>
  </div>
}
