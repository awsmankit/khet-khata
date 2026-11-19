import { landUses, pondUses, pondWater } from './landUse.js'
import './land.css'

export default function LandUseFields({ value, onChange, compact = false }) {
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
