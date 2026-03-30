import { blink } from '@/blink/client'
import { format } from 'date-fns'

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
  date: string       // YYYY-MM-DD
  clockIn: string    // HH:MM:SS or ''
  clockOut: string   // HH:MM:SS or ''
  hoursWorked: number
  status: 'present' | 'absent' | 'late' | 'init'
  notes: string
  createdAt: string
}

// ─── Token helpers ─────────────────────────────────────────────────────────────
export function generateToken(): string {
  const window = Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000))
  return btoa(window.toString())
}

export function generateClockUrl(): string {
  return `${window.location.origin}/staff/clock?t=${generateToken()}`
}

export function isValidToken(token: string): boolean {
  try {
    const current = Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000))
    const tokenWindow = parseInt(atob(token), 10)
    // Accept current window and the previous one (20-min grace for slow scanners)
    return tokenWindow === current || tokenWindow === current - 1
  } catch {
    return false
  }
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

export function isWithinHotel(lat: number, lng: number): boolean {
  return haversineMetres(lat, lng, HOTEL_LAT, HOTEL_LNG) <= MAX_RADIUS_METRES
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | 'denied' | null> {
  if (!navigator.geolocation) return null
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => resolve(err.code === 1 ? 'denied' : null),
      { timeout: 8000, maximumAge: 60000 }
    )
  })
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

export async function clockIn(
  staffId: string,
  staffName: string,
  opts: { notes?: string } = {}
): Promise<AttendanceRecord> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const now = format(new Date(), 'HH:mm:ss')
  const hour = parseInt(now.split(':')[0], 10)
  const status: AttendanceRecord['status'] = hour >= 9 ? 'late' : 'present'

  // GPS check (soft – never blocks)
  let gpsNote = ''
  const loc = await getCurrentLocation()
  if (loc === 'denied') {
    gpsNote = 'GPS: location access denied'
  } else if (loc === null) {
    gpsNote = 'GPS: unavailable'
  } else if (!isWithinHotel(loc.lat, loc.lng)) {
    gpsNote = 'GPS: clocked in outside hotel premises'
  }

  const notes = [opts.notes, gpsNote].filter(Boolean).join(' | ')

  // Upsert: remove any existing init record for today
  const existing = await getTodayRecord(staffId)
  if (existing) {
    const updated = await db.hr_attendance.update(existing.id, {
      clockIn: now,
      status,
      notes,
    })
    return updated
  }

  const record = await db.hr_attendance.create({
    staffId,
    staffName,
    date: today,
    clockIn: now,
    clockOut: '',
    hoursWorked: 0,
    status,
    notes,
    createdAt: new Date().toISOString(),
  })
  return record
}

export async function clockOut(
  staffId: string,
  opts: { notes?: string } = {}
): Promise<AttendanceRecord | null> {
  const record = await getTodayRecord(staffId)
  if (!record || !record.clockIn) return null

  const now = format(new Date(), 'HH:mm:ss')

  // Calculate hours worked
  const [ih, im, is_] = record.clockIn.split(':').map(Number)
  const [oh, om, os] = now.split(':').map(Number)
  const inSec = ih * 3600 + im * 60 + is_
  const outSec = oh * 3600 + om * 60 + os
  const hoursWorked = Math.max(0, (outSec - inSec) / 3600)

  const extraNotes = [record.notes, opts.notes].filter(Boolean).join(' | ')

  const updated = await db.hr_attendance.update(record.id, {
    clockOut: now,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    notes: extraNotes,
  })
  return updated
}

export async function getLiveAttendance(): Promise<AttendanceRecord[]> {
  const today = format(new Date(), 'yyyy-MM-dd')
  return db.hr_attendance.list({
    where: { date: today },
    orderBy: { createdAt: 'desc' },
    limit: 100,
  })
}

export async function getRecentAttendance(days = 30): Promise<AttendanceRecord[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = format(since, 'yyyy-MM-dd')

  const all: AttendanceRecord[] = await db.hr_attendance.list({
    orderBy: { createdAt: 'desc' },
    limit: 1000,
  })
  return all.filter((r) => r.date >= sinceStr)
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportAttendanceToCsv(records: AttendanceRecord[]): string {
  const headers = ['Date', 'Staff Name', 'Clock In', 'Clock Out', 'Hours Worked', 'Status', 'Notes']
  const rows = records.map((r) => [
    r.date,
    r.staffName,
    r.clockIn || '—',
    r.clockOut || '—',
    r.hoursWorked?.toFixed(2) || '0.00',
    r.status,
    (r.notes || '').replace(/,/g, ';'),
  ])
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
