import { useMemo, useState } from 'react'
import { Search, Sprout } from 'lucide-react'
import { categories, everyCrop, regions, regionsOf, seasons } from './cropIndex.js'
import './CropGuide.css'

function Chips({ label, options, value, onChange }) {
  return <div className="guide-chips" role="group" aria-label={label}>
    <button className={value === 'all' ? 'is-active' : ''} aria-pressed={value === 'all'} onClick={() => onChange('all')}>All</button>
    {options.map((option) => <button key={option.id} className={value === option.id ? 'is-active' : ''} aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>)}
  </div>
}

export default function CropGuide({ onOpen }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [region, setRegion] = useState('all')
  const [season, setSeason] = useState('all')
  const results = useMemo(() => {
    const text = query.trim().toLowerCase()
    const seasonTest = seasons.find((entry) => entry.id === season)?.test
    return everyCrop.filter((crop) => (category === 'all' || crop.category === category)
      && (region === 'all' || regionsOf(crop).includes(region))
      && (!seasonTest || seasonTest(crop))
      && (!text || `${crop.name} ${crop.local} ${crop.localLatin} ${crop.regions} ${crop.about}`.toLowerCase().includes(text)))
  }, [query, category, region, season])
  const grouped = categories.map((entry) => ({ ...entry, crops: results.filter((crop) => crop.category === entry.id) })).filter((entry) => entry.crops.length)

  return <div className="guide">
    <div className="guide-filters">
      <label className="search guide-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name in English or Hindi, or by state" aria-label="Search crops" /></label>
      <Chips label="Crop group" options={categories} value={category} onChange={setCategory} />
      <Chips label="Region" options={regions} value={region} onChange={setRegion} />
      <Chips label="Season" options={seasons} value={season} onChange={setSeason} />
      <p className="guide-count" role="status">{results.length === everyCrop.length ? `All ${results.length} crops` : `${results.length} of ${everyCrop.length} crops`}</p>
    </div>
    {grouped.length ? grouped.map((group) => <section key={group.id} className="guide-group" aria-labelledby={`guide-${group.id}`}>
      <h2 id={`guide-${group.id}`}>{group.label} <span lang="hi">{group.local}</span></h2>
      <ul className="guide-list">
        {group.crops.map((crop) => <li key={crop.id}>
          <span className="guide-local" lang="hi">{crop.local}</span>
          <div className="guide-body">
            <h3>{crop.name} <small>{crop.localLatin}</small></h3>
            <p className="guide-season">{crop.season}{crop.window && crop.window !== crop.season ? `, ${crop.window.toLowerCase()}` : ''}</p>
            <p>{crop.about}</p>
            <p className="guide-states">{crop.regions}</p>
          </div>
          <button className="button button-quiet guide-open" onClick={() => onOpen(crop.id)}><Sprout size={16} /> See it grow</button>
        </li>)}
      </ul>
    </section>) : <div className="empty"><strong>No crop matches these filters</strong><span>Try another region or season, or clear the search.</span></div>}
  </div>
}
