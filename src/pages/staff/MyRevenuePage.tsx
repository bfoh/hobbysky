import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DollarSign,
  TrendingUp,
  BookOpen,
  RefreshCw,
  CreditCard,
  Loader2,
  CheckCircle2,
  User,
} from '@/components/icons'
import { useStaffRole } from '@/hooks/use-staff-role'
import { blink } from '@/blink/client'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  format,
  isWithinInterval,
  parseISO,
} from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────

type Period = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'all_time'

interface RawBooking {
  id: string
  guestId?: string
  roomId?: string
  checkIn: string
  checkOut: string
  totalPrice?: number
  status: string
  paymentMethod?: string
  payment_method?: string
  createdBy?: string
  created_by?: string
  createdByName?: string
  created_by_name?: string
  createdAt?: string
  specialRequests?: string
  special_requests?: string
}

interface GuestRecord {
  id: string
  name: string
  email: string
}

interface RoomRecord {
  id: string
  roomNumber: string
  roomTypeId?: string
}

interface RevenueRow {
  bookingId: string
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodInterval(period: Period): { start: Date; end: Date } | null {
  const now = new Date()
  switch (period) {
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'last_week': {
      const prev = subWeeks(now, 1)
      return { start: startOfWeek(prev, { weekStartsOn: 1 }), end: endOfWeek(prev, { weekStartsOn: 1 }) }
    }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'last_month': {
      const prev = subMonths(now, 1)
      return { start: startOfMonth(prev), end: endOfMonth(prev) }
    }
    case 'all_time':
      return null
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  all_time: 'All Time',
}

function fmtGHS(amount: number) {
  return `GH₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseAdditionalCharges(specialRequests: string): number {
  const match = specialRequests?.match(/<!-- PAYMENT_DATA:(.*?) -->/)
  if (!match) return 0
  try {
    const data = JSON.parse(match[1])
    return Number(data.additionalCharges || 0)
  } catch {
    return 0
  }
}

function normaliseMethod(raw?: string): string {
  if (!raw) return 'Not recorded'
  const map: Record<string, string> = {
    cash: 'Cash',
    mobile_money: 'Mobile Money',
    momo: 'Mobile Money',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    not_paid: 'Not Paid',
  }
  return map[raw.toLowerCase()] || raw
}

const METHOD_COLORS: Record<string, string> = {
  Cash: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
  'Mobile Money': 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10',
  Card: 'border-blue-500/30 text-blue-600 bg-blue-500/10',
  'Bank Transfer': 'border-purple-500/30 text-purple-600 bg-purple-500/10',
  'Not Paid': 'border-rose-500/30 text-rose-600 bg-rose-500/10',
  'Not recorded': 'border-border text-muted-foreground bg-muted',
}

const STATUS_COLORS: Record<string, string> = {
  'checked-out': 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
  'checked-in': 'border-blue-500/30 text-blue-600 bg-blue-500/10',
  confirmed: 'border-primary/30 text-primary bg-primary/10',
  reserved: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10',
  cancelled: 'border-rose-500/30 text-rose-600 bg-rose-500/10',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MyRevenuePage() {
  const { userId, staffRecord } = useStaffRole()

  const [period, setPeriod] = useState<Period>('this_week')
  const [rows, setRows] = useState<RevenueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewedByAdmin, setReviewedByAdmin] = useState(false)

  const loadRevenue = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const db = blink.db as any

      const [rawBookings, guests, rooms] = await Promise.all([
        db.bookings.list({ limit: 1000 }),
        db.guests.list({ limit: 500 }),
        db.rooms.list({ limit: 200 }),
      ])

      const guestMap = new Map<string, GuestRecord>(
        (guests as GuestRecord[]).map((g) => [g.id, g])
      )
      const roomMap = new Map<string, RoomRecord>(
        (rooms as RoomRecord[]).map((r) => [r.id, r])
      )

      // Filter: created by this user
      const myBookings = (rawBookings as RawBooking[]).filter((b) => {
        const createdBy = b.createdBy || b.created_by
        return createdBy === userId
      })

      // Filter by period
      const interval = getPeriodInterval(period)
      const periodBookings = interval
        ? myBookings.filter((b) => {
            try {
              const date = parseISO(b.createdAt || b.checkIn)
              return isWithinInterval(date, interval)
            } catch {
              return false
            }
          })
        : myBookings

      // Map to revenue rows
      const mappedRows: RevenueRow[] = periodBookings.map((b) => {
        const guest = guestMap.get(b.guestId || '')
        const room = roomMap.get(b.roomId || '')
        const rawMethod = b.paymentMethod || b.payment_method
        const specialReq = b.specialRequests || b.special_requests || ''
        const additionalCharges = parseAdditionalCharges(specialReq)
        const roomRate = Number(b.totalPrice || 0) - additionalCharges
        return {
          bookingId: b.id.slice(0, 8).toUpperCase(),
          guestName: guest?.name || 'Unknown Guest',
          roomNumber: room?.roomNumber || '—',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          roomRate: Math.max(0, roomRate),
          additionalCharges,
          grandTotal: Number(b.totalPrice || 0),
          paymentMethod: normaliseMethod(rawMethod),
          status: b.status,
        }
      })

      setRows(mappedRows)
    } catch (err) {
      console.error('[MyRevenuePage] Failed to load revenue:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, period])

  useEffect(() => {
    loadRevenue()
  }, [loadRevenue])

  // Aggregate stats
  const totalRoomRevenue = rows.reduce((sum, r) => sum + r.roomRate, 0)
  const totalAdditional = rows.reduce((sum, r) => sum + r.additionalCharges, 0)
  const totalStandalone = 0 // placeholder — no standalone sales yet
  const grandTotal = rows.reduce((sum, r) => sum + r.grandTotal, 0)
  const bookingsCreated = rows.length

  // Payment method breakdown
  const methodBreakdown = rows.reduce<Record<string, { count: number; amount: number }>>(
    (acc, r) => {
      if (!acc[r.paymentMethod]) acc[r.paymentMethod] = { count: 0, amount: 0 }
      acc[r.paymentMethod].count += 1
      acc[r.paymentMethod].amount += r.grandTotal
      return acc
    },
    {}
  )

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Revenue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {staffRecord?.name ? `Revenue generated by ${staffRecord.name}` : 'Your personal revenue summary'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRevenue}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin-reviewed banner */}
      {reviewedByAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Reviewed by admin</span>
          <span className="text-emerald-600">This period's revenue has been verified.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Room Revenue</p>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{fmtGHS(totalRoomRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Add. Charges</p>
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{fmtGHS(totalAdditional)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bookings</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{bookingsCreated}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-primary/70 uppercase tracking-wide">Grand Total</p>
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{fmtGHS(grandTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(methodBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Payment Method Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(methodBreakdown).map(([method, { count, amount }]) => (
                <div
                  key={method}
                  className="flex flex-col gap-1 p-3 rounded-xl border bg-muted/20"
                >
                  <Badge
                    variant="outline"
                    className={`w-fit text-xs ${METHOD_COLORS[method] || 'border-border text-muted-foreground'}`}
                  >
                    {method}
                  </Badge>
                  <p className="text-lg font-semibold mt-1">{fmtGHS(amount)}</p>
                  <p className="text-xs text-muted-foreground">{count} booking{count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Booking Breakdown
            {loading && <Loader2 className="inline-block w-4 h-4 ml-2 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!loading && rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No bookings found for this period</p>
              <p className="text-xs text-muted-foreground/70">Try selecting a different time range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Booking ID</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="whitespace-nowrap">Check-in</TableHead>
                    <TableHead className="whitespace-nowrap">Check-out</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Room Rate</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Charges</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{row.bookingId}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {row.guestName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.roomNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(row.checkIn), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(row.checkOut), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtGHS(row.roomRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.additionalCharges > 0 ? fmtGHS(row.additionalCharges) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtGHS(row.grandTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap ${METHOD_COLORS[row.paymentMethod] || ''}`}
                        >
                          {row.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize whitespace-nowrap ${STATUS_COLORS[row.status] || 'border-border'}`}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border text-sm">
          <span className="text-muted-foreground">{rows.length} booking{rows.length !== 1 ? 's' : ''} — {PERIOD_LABELS[period]}</span>
          <span className="font-semibold">{fmtGHS(grandTotal)} total</span>
        </div>
      )}
    </div>
  )
}
