// ─── Time Utilities ───────────────────────────────────────────────────────────

/**
 * Get current time in WIB (GMT+7)
 */
export const getNowWIB = () => {
  const now = new Date()
  // Ensure we're using WIB offset
  const wibOffset = 7 * 60 // minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + wibOffset * 60000)
}

/**
 * Get today's date string: YYYY-MM-DD
 */
export const getTodayString = () => {
  const now = getNowWIB()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Get tomorrow's date string: YYYY-MM-DD
 */
export const getTomorrowString = () => {
  const tomorrow = getNowWIB()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const y = tomorrow.getFullYear()
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const d = String(tomorrow.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Get current time string: HH:MM:SS
 */
export const getTimeString = (date) => {
  const d = date || getNowWIB()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/**
 * Format date to Indonesian locale
 * e.g. "Kamis, 12 Juni 2026"
 */
export const formatDateID = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format short date to Indonesian locale
 * e.g. "12 Jun 2026"
 */
export const formatDateShortID = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Check if the given time string (HH:MM:SS) is late (after 08:00)
 * DEMO mode: pass demoMode=true to always return false (always "on time")
 */
export const isLate = (timeStr, targetTimeStr = '08:00') => {
  if (!timeStr) return false
  const [h, m, s = 0] = timeStr.split(':').map(Number)
  const [th, tm, ts = 0] = targetTimeStr.split(':').map(Number)
  return (h * 3600 + m * 60 + s) > (th * 3600 + tm * 60 + ts)
}

/**
 * Check if current time allows pulang (>= targetTimeStr)
 * In demo mode this always returns true
 */
export const isPulangTime = (isDemoMode = false, targetTimeStr = '16:00') => {
  if (isDemoMode) return true
  const now = getNowWIB()
  const [th, tm = 0] = targetTimeStr.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const targetMinutes = th * 60 + tm
  return nowMinutes >= targetMinutes
}

/**
 * Get countdown to a target time
 * returns { hours, minutes, seconds } or null if already past
 */
export const getCountdownTo16 = (targetTimeStr = '16:00') => {
  const now = getNowWIB()
  const target = new Date(now)
  const [th, tm = 0] = targetTimeStr.split(':').map(Number)
  target.setHours(th, tm, 0, 0)
  const diff = target - now
  if (diff <= 0) return null
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { hours, minutes, seconds }
}

/**
 * Generate a unique filename for selfie uploads
 */
export const generateSelfieFilename = (nis, type) => {
  const date = getTodayString()
  const time = getTimeString().replace(/:/g, '-')
  return `${date}/${nis}_${type}_${time}.jpg`
}

/**
 * Format time string for display (HH:MM)
 */
export const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '-'
  return timeStr.substring(0, 5)
}
