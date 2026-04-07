import { blink } from '@/blink/client'
import { format, subDays } from 'date-fns'

const db = blink.db as any

// ─── Constants ────────────────────────────────────────────────────────────────
const WINDOW_MINUTES = 10
// Hotel coordinates – update if the hotel moves
const HOTEL_LAT = 6.7127   // Hobbysky Guest House, Abuakwa-Manhyia, Kumasi
const HOTEL_LNG = -1.6250
const MAX_RADIUS_METRES = 300

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string
  staffId: string
  staffName: string
  date: string          // YYYY-MM-DD — shift START date (used as primary key date)
  clockIn: string       // HH:MM:SS or ''
  clockOut: string      // HH:MM:SS or ''
  clockInDate?: string  // YYYY-MM-DD actual calendar date of clock-in
  clockOutDate?: string // YYYY-MM-DD actual calendar date of clock-out (may differ for overnight)
  clockInLat?: number
  clockInLng?: number
  clockInAccuracy?: number  // metres
  clockOutLat?: number
  clockOutLng?: number
  hoursWorked: number
  isOvernightShift?: boolean
  status: 'present' | 'absent' | 'late' | 'init'
  notes: string
  createdAt: string
}

export interface GpsResult {
  lat: number
  lng: number
  accuracy: number  // metres
}

export interface ParsedGps {
  coords?: string
  rawLat?: number
  rawLng?: number
  accuracy?: number
  distance?: number
  withinHotel?: boolean
  denied?: boolean
  unavailable?: boolean
}

// ─── Token helpers ─────────────────────────────────────────────────────────────
export function generateToken(): string {
  const w = Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000))
  return btoa(w.toString())
}

export function generateClockUrl(): string {
  // Permanent QR code URL without short-lived tokens
  return `${window.location.origin}/staff/clock`
}

export function isValidToken(_token: string): boolean {
  // Always valid to support permanent QR flow
  return true
}

export function secondsUntilNextToken(): number {
  const now = Date.now()
  const windowMs = WINDOW_MINUTES * 60 * 1000
  return Math.ceil((windowMs - (now % windowMs)) / 1000)
}

// ─── GPS helpers ──────────────────────────────────────────────────────────────
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function distanceFromHotel(lat: number, lng: number): number {
  return Math.round(haversineMetres(lat, lng, HOTEL_LAT, HOTEL_LNG))
}

export function isWithinHotel(lat: number, lng: number): boolean {
  return haversineMetres(lat, lng, HOTEL_LAT, HOTEL_LNG) <= MAX_RADIUS_METRES
}

/**
 * Acquire the device's GPS position.
 * Uses high-accuracy mode and zero cache age to get the freshest, most precise reading.
 */
export async function getCurrentLocation(): Promise<GpsResult | 'denied' | null> {
  if (!navigator.geolocation) return null
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
      }),
      (err) => resolve(err.code === 1 ? 'denied' : null),
      { timeout: 12000, maximumAge: 0, enableHighAccuracy: true }
    )
  })
}

/** Build a structured GPS note stored in the record — human-readable AND machine-parseable. */
function buildGpsNote(loc: GpsResult, prefix = 'GPS'): string {
  const dist = distanceFromHotel(loc.lat, loc.lng)
  const within = dist <= MAX_RADIUS_METRES
  const lat = loc.lat.toFixed(6)
  const lng = loc.lng.toFixed(6)
  const label = within ? 'within hotel' : 'outside hotel'
  return `${prefix}: ${label} (${lat},${lng}, ±${loc.accuracy}m, ~${dist}m from entrance)`
}

/** Parse GPS info back out of a notes string for display in the admin table. */
export function parseGpsFromNotes(notes: string): ParsedGps | null {
  if (!notes) return null
  // Legacy formats from previous version
  if (notes.includes('location access denied') || notes.includes('permission denied')) return { denied: true }
  if (notes.includes('GPS: unavailable')) return { unavailable: true }

  // Current format: "GPS: within hotel (6.712700,-1.625000, ±12m, ~45m from entrance)"
  // or "GPS out: outside hotel (...)"
  const match = notes.match(/GPS(?:\s+out)?:\s*(within hotel|outside hotel)\s*\(([^)]+)\)/)
  if (!match) return null

  const withinHotel = match[1] === 'within hotel'
  const details = match[2]
  const coordsM = details.match(/([-\d.]+),([-\d.]+)/)
  const accM = details.match(/±(\d+)m/)
  const distM = details.match(/~(\d+)m from/)

  return {
    coords: coordsM ? `${coordsM[1]}, ${coordsM[2]}` : undefined,
    rawLat: coordsM ? parseFloat(coordsM[1]) : undefined,
    rawLng: coordsM ? parseFloat(coordsM[2]) : undefined,
    accuracy: accM ? parseInt(accM[1]) : undefined,
    distance: distM ? parseInt(distM[1]) : undefined,
    withinHotel,
  }
}

// ─── Hours calculation (handles overnight / cross-day shifts) ──────────────────
/**
 * Calculate hours between two HH:MM[:SS] strings.
 * Automatically handles midnight crossing: if outSec < inSec (or isOvernight=true), adds 24 h.
 */
/**
 * Calculate hours between two HH:MM[:SS] strings, optionally considering dates.
 * Uses full Date objects when possible for perfect accuracy across any number of days.
 */
export function calcHoursWorked(
  clockInTime: string,
  clockOutTime: string,
  clockInDate?: string,
  clockOutDate?: string,
  isOvernightLegacy = false
): number {
  if (!clockInTime || !clockOutTime) return 0

  // 1. Try modern path: full ISO date-time construction
  if (clockInDate && clockOutDate) {
    const start = new Date(`${clockInDate}T${clockInTime}`)
    const end = new Date(`${clockOutDate}T${clockOutTime}`)
    const diffMs = end.getTime() - start.getTime()
    if (diffMs > 0) {
      return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
    }
  }

  // 2. Fallback: Legacy time-only logic
  const [ih, im, is_ = 0] = clockInTime.split(':').map(Number)
  const [oh, om, os = 0] = clockOutTime.split(':').map(Number)
  const inSec = ih * 3600 + im * 60 + is_
  let outSec = oh * 3600 + om * 60 + os

  // Add 24 h if time goes "backwards" (crosses midnight) or flagged as overnight
  if (outSec <= inSec || isOvernightLegacy) outSec += 86400
  return Math.max(0, Math.round(((outSec - inSec) / 3600) * 100) / 100)
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function getTodayRecord(staffId: string): Promise<AttendanceRecord | null> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const records = await db.hr_attendance.list({
    where: { staffId, date: today },
    limit: 1,
    orderBy: { createdAt: 'desc' },
  })
  return records[0] || null
}

/**
 * Find the most recent open shift (clocked in, NOT yet clocked out) for a staff member.
 * Searches back up to 3 days to correctly handle overnight workers.
 */
export async function getOpenShiftRecord(staffId: string): Promise<AttendanceRecord | null> {
  const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd')
  const allRecent: AttendanceRecord[] = await db.hr_attendance.list({
    orderBy: { createdAt: 'desc' },
    limit: 100,
  })
  return (
    allRecent.find(
      (r) =>
        r.staffId === staffId &&
        r.clockIn &&
        !r.clockOut &&
        r.status !== 'init' &&
        r.date >= threeDaysAgo
    ) || null
  )
}

export async function clockIn(
  staffId: string,
  staffName: string,
  opts: { notes?: string } = {}
): Promise<AttendanceRecord> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const now = format(new Date(), 'HH:mm:ss')
  const hour = parseInt(now.split(':')[0], 10)
  // Late if arriving after 09:00
  const status: AttendanceRecord['status'] = hour >= 9 ? 'late' : 'present'

  // ── GPS — high-accuracy, no cached position ──────────────────────────────
  let gpsNote = ''
  let gpsLat: number | undefined
  let gpsLng: number | undefined
  let gpsAccuracy: number | undefined

  const loc = await getCurrentLocation()
  if (loc === 'denied') {
    gpsNote = 'GPS: permission denied'
  } else if (loc === null) {
    gpsNote = 'GPS: unavailable'
  } else {
    gpsLat = loc.lat
    gpsLng = loc.lng
    gpsAccuracy = loc.accuracy
    gpsNote = buildGpsNote(loc)
  }

  const notes = [opts.notes, gpsNote].filter(Boolean).join(' | ')

  // ── Upsert Record ────────────────────────────────────────────────────────
  const existing = await getTodayRecord(staffId)
  if (existing) {
    // We update the main record first. If this fails, the error bubbles up.
    const updated = await db.hr_attendance.update(existing.id, {
      clockIn: now,
      clockInDate: today,
      status,
      notes,
    })

    // GPS updates are secondary. We wrap them to ensure they NEVER block the main clock-in.
    if (gpsLat !== undefined) {
      db.hr_attendance.update(existing.id, {
        clockInLat: gpsLat,
        clockInLng: gpsLng,
        clockInAccuracy: gpsAccuracy,
      }).catch(e => console.error('[AttendanceService] GPS Lat/Lng update failed:', e))
    }

    return updated
  }

  // New record for today
  const record = await db.hr_attendance.create({
    staffId,
    staffName,
    date: today,
    clockIn: now,
    clockInDate: today,
    clockOut: '',
    hoursWorked: 0,
    status,
    notes,
    createdAt: new Date().toISOString(),

    // Include GPS if available, but these fields are handled gracefully by the Supabase migration
    clockInLat: gpsLat,
    clockInLng: gpsLng,
    clockInAccuracy: gpsAccuracy,
  })

  return record
}

export async function clockOut(
  staffId: string,
  opts: { notes?: string } = {}
): Promise<AttendanceRecord | null> {
  // Find the most recent open shift — handles overnight workers (clocked in yesterday)
  const record = await getOpenShiftRecord(staffId)
  if (!record || !record.clockIn) return null

  const nowDate = format(new Date(), 'yyyy-MM-dd')
  const nowTime = format(new Date(), 'HH:mm:ss')

  // Detect overnight: clock-out date differs from shift start date
  const isOvernight = nowDate !== record.date
  const hoursWorked = calcHoursWorked(record.clockIn, nowTime, record.clockInDate || record.date, nowDate, isOvernight)

  // ── GPS at clock-out ─────────────────────────────────────────────────────
  let gpsNote = ''
  let gpsLat: number | undefined
  let gpsLng: number | undefined

  const loc = await getCurrentLocation()
  if (loc === 'denied') {
    gpsNote = 'GPS out: permission denied'
  } else if (loc === null) {
    gpsNote = 'GPS out: unavailable'
  } else {
    gpsLat = loc.lat
    gpsLng = loc.lng
    gpsNote = buildGpsNote(loc, 'GPS out')
  }

  const extraNotes = [record.notes, opts.notes, gpsNote].filter(Boolean).join(' | ')

  const updated = await db.hr_attendance.update(record.id, {
    clockOut: nowTime,
    clockOutDate: nowDate,
    hoursWorked,
    isOvernightShift: isOvernight,
    notes: extraNotes,
    // Include GPS in main update if available
    clockOutLat: gpsLat,
    clockOutLng: gpsLng,
  })

  if (gpsLat !== undefined) {
    db.hr_attendance.update(record.id, {
      clockOutLat: gpsLat,
      clockOutLng: gpsLng,
    }).catch(() => {})
  }

  return updated
}

/**
 * Live attendance: today's records + any overnight staff (yesterday, still open).
 */
export async function getLiveAttendance(): Promise<AttendanceRecord[]> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const all: AttendanceRecord[] = await db.hr_attendance.list({
    orderBy: { createdAt: 'desc' },
    limit: 200,
  })

  return all.filter((r) => {
    if (r.status === 'init' || !r.clockIn) return false
    if (r.date === today) return true
    // Include yesterday's records that are still open (overnight shift in progress)
    if (r.date === yesterday && !r.clockOut) return true
    return false
  })
}

export async function getRecentAttendance(days = 30): Promise<AttendanceRecord[]> {
  const sinceStr = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const all: AttendanceRecord[] = await db.hr_attendance.list({
    orderBy: { createdAt: 'desc' },
    limit: 1000,
  })
  return all.filter((r) => r.date >= sinceStr && r.status !== 'init')
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportAttendanceToCsv(records: AttendanceRecord[]): string {
  const headers = [
    'Date', 'Staff Name', 'Clock In', 'Clock Out', 'Hours Worked',
    'Overnight Shift', 'Status', 'GPS Coordinates', 'GPS Accuracy', 'Notes',
  ]
  const rows = records.map((r) => {
    const gps = parseGpsFromNotes(r.notes || '')
    const gpsCoords = gps?.coords ?? (gps?.denied ? 'Permission denied' : gps?.unavailable ? 'Unavailable' : '')
    const gpsAcc = gps?.accuracy ? `±${gps.accuracy}m` : ''
    return [
      r.date,
      r.staffName,
      r.clockIn || '—',
      r.clockOut || '—',
      r.hoursWorked?.toFixed(2) || '0.00',
      r.isOvernightShift ? 'Yes' : 'No',
      r.status,
      gpsCoords,
      gpsAcc,
      (r.notes || '').replace(/,/g, ';'),
    ]
  })
  return [headers, ...rows].map((row) => row.join(',')).join('\n')
}

export function downloadCsv(records: AttendanceRecord[], filename = 'attendance.csv') {
  return downloadAttendanceCsv(records, filename)
}

export function downloadAttendanceCsv(records: AttendanceRecord[], filename = 'attendance.csv') {
  const csv = exportAttendanceToCsv(records)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
