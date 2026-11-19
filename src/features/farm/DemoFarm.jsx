import { Fragment } from 'react'
import { demoCropRecords } from './demoData.js'
import './farm.css'


export default function DemoFarm({ view }) {
  return <section className="sheet demo-sheet">
    <header className="sheet-head"><h2>Demo farmer, sample farm</h2><p>Fictional entries that show how the register looks. This profile has no real land or location.</p></header>
    {view === 'register'
      ? <dl className="plot-facts"><div><dt>Farmer</dt><dd>Demo farmer</dd></div><div><dt>Farm</dt><dd>Sample farm</dd></div><div><dt>Location</dt><dd>Not specified</dd></div></dl>
      : <div className="demo-grid"><b>Plot</b><b>Crop</b><b>Stage</b>{demoCropRecords.map((record) => <Fragment key={record.id}><span>{record.plotName}</span><span>{record.crop}</span><span>{record.stage}</span></Fragment>)}</div>}
    <p className="quiet-note">Sample only. These crops are not advice for any real land.</p>
  </section>
}
