import { useEffect, useState } from 'react'
import { Download, ShieldCheck, Upload } from 'lucide-react'
import { storageStatus } from '../../lib/storage.js'
import './farm.css'

export default function BackupPanel({ counts, onDownload, onRestore, restoreMessage }) {
  const [persisted, setPersisted] = useState(null)
  useEffect(() => { storageStatus().then((status) => setPersisted(status.persisted)) }, [])
  return <section className="sheet data-panel">
    <header className="sheet-head"><h2>Your data stays on this device</h2><p>There is no account and nothing is sent to a server. That also means nobody can recover your records for you, so keep a backup.</p></header>
    <div className="data-body">
      <p className="data-status"><ShieldCheck size={18} />{persisted ? 'This browser has agreed to keep your data.' : 'This browser may clear the data if the phone runs low on space or the site is not used for a while. Adding the app to your home screen and keeping a backup both help.'}</p>
      <p className="data-counts">On this device: {counts.plots} plots, {counts.crops} crop records, {counts.boundaries} walked boundaries.</p>
      <div className="data-actions">
        <button className="button button-primary" onClick={onDownload}><Download size={17} /> Download backup</button>
        <label className="button button-quiet file-button"><Upload size={17} /> Restore from backup<input type="file" accept=".json,application/json" onChange={onRestore} /></label>
      </div>
      <p className="quiet-note">The backup is one small file. Save it to WhatsApp, Google Drive or email it to yourself; restore it on a new phone to carry on.</p>
      {restoreMessage && <p className="import-message" role="status">{restoreMessage}</p>}
    </div>
  </section>
}
