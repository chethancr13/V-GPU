/**
 * Global API Cache & Request Deduplication
 * 
 * Prevents redundant HTTP calls when switching between tabs
 * (e.g. Dashboard, ControlCenter, SpeedComparison, AIDataCenter
 * all requesting /api/datasets, /api/scripts, /api/vgpu/list).
 */

const CACHE_TTL_MS = 15000 // 15 seconds TTL for static lists
const VGPU_TTL_MS = 5000   // 5 seconds TTL for vGPU list

let datasetsCache = null
let datasetsPromise = null
let datasetsTime = 0

let scriptsCache = null
let scriptsPromise = null
let scriptsTime = 0

let vgpuCache = null
let vgpuPromise = null
let vgpuTime = 0

export async function getCachedDatasets(force = false) {
  const now = Date.now()
  if (!force && datasetsCache && (now - datasetsTime < CACHE_TTL_MS)) {
    return datasetsCache
  }
  if (datasetsPromise) return datasetsPromise

  datasetsPromise = fetch('http://localhost:8000/api/datasets')
    .then(r => r.json())
    .then(data => {
      datasetsCache = data
      datasetsTime = Date.now()
      datasetsPromise = null
      return data
    })
    .catch(err => {
      datasetsPromise = null
      return datasetsCache || { datasets: [] }
    })

  return datasetsPromise
}

export function invalidateDatasetsCache() {
  datasetsCache = null
  datasetsTime = 0
}

export async function getCachedScripts(force = false) {
  const now = Date.now()
  if (!force && scriptsCache && (now - scriptsTime < CACHE_TTL_MS)) {
    return scriptsCache
  }
  if (scriptsPromise) return scriptsPromise

  scriptsPromise = fetch('http://localhost:8000/api/scripts')
    .then(r => r.json())
    .then(data => {
      scriptsCache = data
      scriptsTime = Date.now()
      scriptsPromise = null
      return data
    })
    .catch(err => {
      scriptsPromise = null
      return scriptsCache || { scripts: [] }
    })

  return scriptsPromise
}

export function invalidateScriptsCache() {
  scriptsCache = null
  scriptsTime = 0
}

export async function getCachedVgpuList(force = false) {
  const now = Date.now()
  if (!force && vgpuCache && (now - vgpuTime < VGPU_TTL_MS)) {
    return vgpuCache
  }
  if (vgpuPromise) return vgpuPromise

  vgpuPromise = fetch('http://localhost:8000/api/vgpu/list')
    .then(r => r.json())
    .then(data => {
      vgpuCache = data
      vgpuTime = Date.now()
      vgpuPromise = null
      return data
    })
    .catch(err => {
      vgpuPromise = null
      return vgpuCache || []
    })

  return vgpuPromise
}

export function invalidateVgpuListCache() {
  vgpuCache = null
  vgpuTime = 0
}
