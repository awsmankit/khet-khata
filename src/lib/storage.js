// Everything a farmer enters stays in this browser. There is no account and no server.

export const KEYS = {
  profile: 'khet-khata-profile',
  crops: 'khet-khata-crops',
  plots: 'khet-khata-plots',
  boundaries: 'khet-khata-walked-boundaries',
  areaUnit: 'khet-khata-area-unit',
  squareFeetPerKatha: 'khet-khata-sqft-per-katha',
}

// Key names used by earlier builds, read once so records carry over.
const legacyKeys = {
  [KEYS.plots]: ['khet-khata-imported-plots'],
}

const fallbacks = { profile: null, crops: [], plots: [], boundaries: [], areaUnit: 'katha', squareFeetPerKatha: null }

export function readLocal(key, fallback) {
  try {
    let stored = localStorage.getItem(key)
    for (const legacy of legacyKeys[key] || []) if (stored === null) stored = localStorage.getItem(legacy)
    return stored === null ? fallback : JSON.parse(stored)
  } catch {
    return fallback
  }
}

let persistAsked = false
export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return false
  }
  // Ask the browser to keep this data even when space is low. Installed (home screen)
  // apps are usually granted this; ordinary tabs may be refused, which is why backups exist.
  if (!persistAsked && navigator.storage?.persist) {
    persistAsked = true
    navigator.storage.persisted().then((already) => already || navigator.storage.persist()).catch(() => {})
  }
  return true
}

export function readAll() {
  return Object.fromEntries(Object.entries(KEYS).map(([name, key]) => [name, readLocal(key, fallbacks[name])]))
}

export function writeAll(data) {
  Object.entries(KEYS).forEach(([name, key]) => writeLocal(key, data[name] ?? fallbacks[name]))
}

export function downloadBackup(data) {
  const payload = { app: 'khet-khata', version: 1, exportedAt: new Date().toISOString(), data }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `khet-khata-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readBackupFile(file) {
  let payload
  try {
    payload = JSON.parse(await file.text())
  } catch {
    throw new Error(`${file.name} is not a Khet Khata backup file.`)
  }
  if (payload?.app !== 'khet-khata' || typeof payload.data !== 'object') throw new Error(`${file.name} is not a Khet Khata backup file.`)
  const data = { ...fallbacks, ...payload.data }
  if (!Array.isArray(data.plots) || !Array.isArray(data.crops) || !Array.isArray(data.boundaries)) throw new Error(`${file.name} looks damaged; nothing was changed.`)
  return data
}

export async function storageStatus() {
  try {
    const persisted = await navigator.storage?.persisted?.()
    return { persisted: Boolean(persisted) }
  } catch {
    return { persisted: false }
  }
}
