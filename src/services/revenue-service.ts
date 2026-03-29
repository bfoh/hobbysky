import { blink } from '@/blink/client'
import {
  startOfWeek,
  endOfWeek,
  format,
  subWeeks,
  parseISO,
  isWithinInterval,
} from 'date-fns'
import { standaloneSalesService, StandaloneSale } from './standalone-sales-service'

const db = blink.db as any

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WeekBounds {
  weekStart: string   // YYYY-MM-DD (Monday)
  weekEnd: string     // YYYY-MM-DD (Sunday)
  label: string       // e.g. "Mar 24 – Mar 30"
}

export interface BookingSummary {
  id: string
  guestName: string
  roomNumber: string
  checkIn: string
  checkOut: string
  roomRate: number
  additionalCharges: number
  grandTotal: number
  paymentMethod: string
  status: string
}

export interface StaffWeekResult {
  bookings: BookingSummary[]
  totalRevenue: number          // room prices only
  additionalRevenue: number     // booking charges
  standaloneSalesRevenue: number
  grandRevenue: number          // all combined
  bookingCount: number
  standaloneSales: StandaloneSale[]
  chargesByCategory: Record<string, number>
}

export interface WeeklyRevenueReport {
  id: string
  staffId: string
  staffName: string
  weekStart: string
  weekEnd: string
  totalRevenue: number
  bookingCount: number
  bookingIds: string    // JSON array
  status: 'draft' | 'submitted' | 'reviewed'
  notes: string
  adminNotes: string
  reviewedBy: string
  reviewedAt: string
  submittedAt: string
  createdAt: string
  updatedAt: string
}

// ─── Week helpers ─────────────────────────────────────────────────────────────
export function getWeekBounds(date: Date = new Date()): WeekBounds {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return {
    weekStart: format(start, 'yyyy-MM-dd'),
    weekEnd: format(end, 'yyyy-MM-dd'),
    label: `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`,
  }
}

export function getPastWeeksBounds(count: number): WeekBounds[] {
  return Array.from({ length: count }, (_, i) =>
    getWeekBounds(subWeeks(new Date(), i))
  )
}

// ─── Revenue calculation ──────────────────────────────────────────────────────
export async function fetchBookingsForStaffWeek(
  staffId: string,
  weekStart: string,
  weekEnd: string
): Promise<StaffWeekResult> {
  const [rawBookings, rooms, guests, allCharges, sales] = await Promise.all([
    db.bookings.list({ limit: 2000 }),
    db.rooms.list({ limit: 200 }),
    db.guests.list({ limit: 500 }),
    db.bookingCharges.list({ limit: 5000 }),
    standaloneSalesService.getSalesForStaff(staffId, weekStart, weekEnd),
  ])

  const roomMap = new Map((rooms as any[]).map((r: any) => [r.id, r]))
  const guestMap = new Map((guests as any[]).map((g: any) => [g.id, g]))
  const chargeMap = new Map<string, any[]>()
  ;(allCharges as any[]).forEach((c: any) => {
    if (!chargeMap.has(c.bookingId)) chargeMap.set(c.bookingId, [])
    chargeMap.get(c.bookingId)!.push(c)
  })

  // Filter: created by this staff, within the week
  const myBookings = (rawBookings as any[]).filter((b: any) => {
    const createdBy = b.createdBy || b.created_by
    if (createdBy !== staffId) return false
    const date = b.createdAt || b.checkIn
    if (!date) return false
    try {
      const d = format(parseISO(date), 'yyyy-MM-dd')
      return d >= weekStart && d <= weekEnd
    } catch {
      return false
    }
  })

  const bookings: BookingSummary[] = myBookings.map((b: any) => {
    const room = roomMap.get(b.roomId)
    const guest = guestMap.get(b.guestId)
    const charges = chargeMap.get(b.id) || []
    const additionalCharges = charges.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0)
    return {
      id: b.id,
      guestName: guest?.name || 'Unknown Guest',
      roomNumber: room?.roomNumber || '—',
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      roomRate: Number(b.totalPrice || 0),
      additionalCharges,
      grandTotal: Number(b.totalPrice || 0) + additionalCharges,
      paymentMethod: b.paymentMethod || b.payment_method || 'cash',
      status: b.status,
    }
  })

  const totalRevenue = bookings.reduce((s, b) => s + b.roomRate, 0)
  const additionalRevenue = bookings.reduce((s, b) => s + b.additionalCharges, 0)
  const standaloneSalesRevenue = sales.reduce((s: number, sale: StandaloneSale) => s + sale.amount, 0)
  const grandRevenue = totalRevenue + additionalRevenue + standaloneSalesRevenue

  // Charges by category
  const chargesByCategory: Record<string, number> = {}
  myBookings.forEach((b: any) => {
    const charges = chargeMap.get(b.id) || []
    charges.forEach((c: any) => {
      chargesByCategory[c.category] = (chargesByCategory[c.category] || 0) + Number(c.amount || 0)
    })
  })

  return {
    bookings,
    totalRevenue,
    additionalRevenue,
    standaloneSalesRevenue,
    grandRevenue,
    bookingCount: bookings.length,
    standaloneSales: sales,
    chargesByCategory,
  }
}

// ─── Weekly report CRUD ───────────────────────────────────────────────────────
export async function getOrCreateWeekReport(
  staffId: string,
  staffName: string,
  week: WeekBounds
): Promise<WeeklyRevenueReport> {
  const existing: WeeklyRevenueReport[] = await db.hrWeeklyRevenue.list({
    where: { staffId, weekStart: week.weekStart },
    limit: 1,
  })

  if (existing.length > 0) {
    const report = existing[0]
    // Only auto-refresh if still in draft
    if (report.status === 'draft') {
      const result = await fetchBookingsForStaffWeek(staffId, week.weekStart, week.weekEnd)
      const updated = await db.hrWeeklyRevenue.update(report.id, {
        totalRevenue: result.grandRevenue,
        bookingCount: result.bookingCount,
        bookingIds: JSON.stringify(result.bookings.map((b) => b.id)),
        updatedAt: new Date().toISOString(),
      })
      return updated
    }
    return report
  }

  // Create a fresh draft
  const result = await fetchBookingsForStaffWeek(staffId, week.weekStart, week.weekEnd)
  const report = await db.hrWeeklyRevenue.create({
    staffId,
    staffName,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    totalRevenue: result.grandRevenue,
    bookingCount: result.bookingCount,
    bookingIds: JSON.stringify(result.bookings.map((b) => b.id)),
    status: 'draft',
    notes: '',
    adminNotes: '',
    reviewedBy: '',
    reviewedAt: '',
    submittedAt: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return report
}

export async function submitWeekReport(reportId: string, notes: string): Promise<void> {
  await db.hrWeeklyRevenue.update(reportId, {
    status: 'submitted',
    notes,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function reviewWeekReport(
  reportId: string,
  adminNotes: string,
  reviewedByName: string
): Promise<void> {
  await db.hrWeeklyRevenue.update(reportId, {
    status: 'reviewed',
    adminNotes,
    reviewedBy: reviewedByName,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function getAllStaffReportsForWeek(weekStart: string): Promise<WeeklyRevenueReport[]> {
  return db.hrWeeklyRevenue.list({
    where: { weekStart },
    orderBy: { staffName: 'asc' },
    limit: 100,
  })
}

export async function getStaffAllReports(staffId: string): Promise<WeeklyRevenueReport[]> {
  return db.hrWeeklyRevenue.list({
    where: { staffId },
    orderBy: { weekStart: 'desc' },
    limit: 52,
  })
}
