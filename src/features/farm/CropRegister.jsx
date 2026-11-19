import { Plus, Sprout, Trash2 } from 'lucide-react'
import { everyCrop } from '../../fields/cropIndex.js'
import './farm.css'

// Names offered while typing a crop: every crop in the guide plus a few common extras.
const extraCrops = [['Makhana', 'मखाना'], ['Potato', 'आलू'], ['Lentil', 'मसूर'], ['Chickpea', 'चना'], ['Moong', 'मूँग'], ['Onion', 'प्याज़'], ['Cauliflower', 'गोभी'], ['Okra', 'भिंडी'], ['Pointed gourd', 'परवल'], ['Jute', 'पाट'], ['Bamboo', 'बाँस'], ['Guava', 'अमरूद'], ['Fish (rohu, katla)', 'मछली'], ['Singhara', 'सिंघाड़ा']]
const cropSuggestions = [...everyCrop.map((crop) => [crop.name, crop.local]), ...extraCrops.filter(([name]) => !everyCrop.some((crop) => crop.name === name))]

export default function CropRegister({ plots, records, onAdd, onDelete }) {
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
