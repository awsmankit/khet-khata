import { useState } from 'react'
import { Check } from 'lucide-react'
import './farm.css'

export default function FarmProfileForm({ profile, onSave, areaUnit, squareFeetPerKatha }) {
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
