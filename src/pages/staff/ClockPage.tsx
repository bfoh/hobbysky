/**
 * ClockPage — Staff clock-in/out via QR code scan.
 * Mobile-first, full-screen, no sidebar.
 * Route: /staff/clock?t=TOKEN
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Loader2, LogIn, LogOut, CheckCircle2, AlertTriangle,
  MapPin, Clock, Home, Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useStaffRole } from '@/hooks/use-staff-role'
import {
  isValidToken,
  getCurrentLocation,
  isWithinHotel,
  distanceFromHotel,
  getTodayRecord,
  getOpenShiftRecord,
  clockIn,
  clockOut,
  parseGpsFromNotes,
  type AttendanceRecord,
  type GpsResult,
} from '@/services/attendance-service'

type GpsStatus = 'checking' | 'within' | 'outside' | 'denied' | 'unavailable'

export function ClockPage() {
  const { userId, staffRecord, loading: roleLoading } = useStaffRole()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t')

  // openShift = any unclosed shift (could be from today or yesterday for overnight workers)
  const [openShift, setOpenShift] = useState<AttendanceRecord | null>(null)
  // todayRecord = today's record (may be completed)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [now, setNow] = useState(new Date())
  const [done, setDone] = useState<'in' | 'out' | null>(null)

  // GPS pre-check — runs on mount so user sees location status before tapping
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('checking')
  const [gpsCoords, setGpsCoords] = useState<GpsResult | null>(null)
  const [actionGpsWarning, setActionGpsWarning] = useState<'outside' | 'denied' | false>(false)

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Pre-check GPS on mount
  useEffect(() => {
    let cancelled = false
    getCurrentLocation().then((loc) => {
      if (cancelled) return
      if (loc === 'denied') {
        setGpsStatus('denied')
      } else if (loc === null) {
        setGpsStatus('unavailable')
      } else {
        setGpsCoords(loc)
        setGpsStatus(isWithinHotel(loc.lat, loc.lng) ? 'within' : 'outside')
      }
    })
    return () => { cancelled = true }
  }, [])


  // Load shift records once auth is ready
  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const [open, today_] = await Promise.all([
        getOpenShiftRecord(uid),
        getTodayRecord(uid),
      ])
      setOpenShift(open)
      setTodayRecord(today_)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!roleLoading && userId) load(userId)
  }, [roleLoading, userId, load])

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleClockIn = async () => {
    if (!userId || !staffRecord) return
    setActing(true)
    try {
      // Re-acquire GPS at the moment of clock-in (freshest reading)
      const location = await getCurrentLocation()
      let clockNotes: string | undefined
      if (location === 'denied') {
        clockNotes = 'GPS: permission denied'
        setActionGpsWarning('denied')
      } else if (location && !isWithinHotel(location.lat, location.lng)) {
        setActionGpsWarning('outside')
      }
      const rec = await clockIn(userId, staffRecord.name, clockNotes ? { notes: clockNotes } : undefined)
      setTodayRecord(rec)
      setOpenShift(rec)
      setDone('in')
      toast.success('Clocked in! Have a great shift.')
    } catch {
      toast.error('Failed to clock in. Please try again.')
    } finally {
      setActing(false)
    }
  }

  const handleClockOut = async () => {
    if (!userId) return
    setActing(true)
    try {
      const updated = await clockOut(userId)
      if (updated) {
        setOpenShift(null)
        setTodayRecord(updated)
        setDone('out')
        toast.success(`Clocked out. ${updated.hoursWorked}h worked. Have a good rest!`)
      } else {
        toast.error('No open shift found. Please contact an admin.')
      }
    } catch {
      toast.error('Failed to clock out. Please try again.')
    } finally {
      setActing(false)
    }
  }

  // ─── Derived state ─────────────────────────────────────────────────────────

  const today = format(now, 'yyyy-MM-dd')
  const hasOpenShift = Boolean(openShift?.clockIn)
  const isOvernightShift = hasOpenShift && openShift!.date !== today
  const shiftDoneToday = Boolean(todayRecord?.clockIn && todayRecord?.clockOut)

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // GPS indicator config
  const gpsIndicator = {
    checking: { color: 'text-muted-foreground', label: 'Checking location…', icon: Navigation },
    within: { color: 'text-green-600', label: `Within hotel · ±${gpsCoords?.accuracy ?? '?'}m`, icon: MapPin },
    outside: { color: 'text-amber-600', label: `Outside hotel${gpsCoords ? ` · ~${distanceFromHotel(gpsCoords.lat, gpsCoords.lng)}m away` : ''}`, icon: MapPin },
    denied: { color: 'text-red-500', label: 'Location access denied', icon: MapPin },
    unavailable: { color: 'text-muted-foreground', label: 'GPS unavailable', icon: MapPin },
  }[gpsStatus]

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top bar */}
      <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center gap-3 shadow-md">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <span className="font-bold text-base flex-1">Hobbysky Guest House</span>
        <Link
          to="/staff/dashboard"
          className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </div>

      {/* Warning banners */}
      {actionGpsWarning === 'outside' && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start gap-2 text-sm text-amber-800">
          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>You appear to be outside the hotel. Your clock-in has been logged and flagged for admin review.</span>
        </div>
      )}
      {actionGpsWarning === 'denied' && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-2 text-sm text-red-800">
          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Location access was denied. Your clock-in has been logged and flagged for admin review.</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-8">

          {/* Greeting + live clock */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{greeting()},</p>
            <h1 className="text-2xl font-bold mt-0.5 mb-5">
              {staffRecord?.name || 'Staff'}
            </h1>
            <p className="text-5xl font-mono font-bold text-primary tracking-tight">
              {format(now, 'HH:mm:ss')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {format(now, 'EEEE, d MMMM yyyy')}
            </p>
          </div>

          {/* GPS status indicator */}
          <div className={`flex items-center justify-center gap-1.5 text-xs ${gpsIndicator.color}`}>
            <gpsIndicator.icon className="w-3.5 h-3.5" />
            <span>{gpsIndicator.label}</span>
          </div>

          {/* Overnight shift notice */}
          {isOvernightShift && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                You started your shift on <strong>{openShift!.date}</strong> at <strong>{openShift!.clockIn}</strong>.
                Tap Clock Out to end your overnight shift.
              </span>
            </div>
          )}

          {/* Shift record summary */}
          {(openShift || todayRecord) && (() => {
            const displayRec = openShift || todayRecord!
            const gps = parseGpsFromNotes(displayRec.notes || '')
            return (
              <div className="bg-muted/40 rounded-xl px-5 py-4 text-sm space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shift started</span>
                  <span className="font-semibold">
                    {isOvernightShift ? `${displayRec.date} ` : ''}{displayRec.clockIn}
                  </span>
                </div>
                {displayRec.clockOut && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clocked out</span>
                    <span className="font-semibold">{displayRec.clockOut}</span>
                  </div>
                )}
                {displayRec.hoursWorked > 0 && (
                  <div className="flex justify-between border-t pt-2 mt-1">
                    <span className="text-muted-foreground">Hours worked</span>
                    <span className="font-semibold text-primary">{displayRec.hoursWorked}h</span>
                  </div>
                )}
                {gps && !gps.denied && !gps.unavailable && gps.coords && (
                  <div className="flex justify-between border-t pt-2 mt-1">
                    <span className="text-muted-foreground">Clock-in location</span>
                    <span className={`text-xs font-medium ${gps.withinHotel ? 'text-green-600' : 'text-amber-600'}`}>
                      {gps.withinHotel ? '✓ Within hotel' : `⚠ ${gps.distance}m away`}
                      {gps.accuracy ? ` · ±${gps.accuracy}m` : ''}
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Action area */}
          {(shiftDoneToday && !hasOpenShift) ? (
            <div className="text-center space-y-2 py-4">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-lg font-semibold">Shift complete!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You worked {todayRecord?.hoursWorked ?? 0}h. Have a good rest!
              </p>
            </div>
          ) : hasOpenShift ? (
            <div className="space-y-3">
              <Button
                size="lg"
                variant="destructive"
                className="w-full h-16 text-lg font-semibold gap-3 rounded-xl shadow-lg"
                onClick={handleClockOut}
                disabled={acting}
              >
                {acting
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <LogOut className="w-5 h-5" />}
                Clock Out
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {isOvernightShift
                  ? `Overnight shift · started ${openShift!.date} at ${openShift!.clockIn}`
                  : `Clocked in at ${openShift!.clockIn} · tap to end your shift`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full h-16 text-lg font-semibold gap-3 rounded-xl shadow-lg"
                onClick={handleClockIn}
                disabled={acting}
              >
                {acting
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <LogIn className="w-5 h-5" />}
                Clock In
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Tap to start your shift
              </p>
            </div>
          )}

          {done === 'in' && !shiftDoneToday && (
            <p className="text-center text-sm text-muted-foreground">
              ✓ Clocked in at {todayRecord?.clockIn}. Have a productive shift!
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
