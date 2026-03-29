import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Clock, LogIn, LogOut, Loader2 } from '@/components/icons'
import { useStaffRole } from '@/hooks/use-staff-role'
import { blink } from '@/blink/client'
import {
  isValidToken,
  getTodayRecord,
  clockIn,
  clockOut,
  secondsUntilNextToken,
} from '@/services/attendance-service'
import { format } from 'date-fns'

type PageState = 'loading' | 'invalid_token' | 'ready' | 'success' | 'error' | 'auth'

export function ClockPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { staffRecord, userId, loading: roleLoading } = useStaffRole()

  const token = params.get('t') || ''

  const [pageState, setPageState] = useState<PageState>('loading')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [countdown, setCountdown] = useState(secondsUntilNextToken())

  // Live clock
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(new Date())
      setCountdown(secondsUntilNextToken())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Auth check
  useEffect(() => {
    blink.auth.me().then((user) => {
      if (!user) setPageState('auth')
    }).catch(() => setPageState('auth'))
  }, [])

  // Validate token + load today's record
  const init = useCallback(async () => {
    if (roleLoading) return
    if (!userId) { setPageState('auth'); return }

    if (!token || !isValidToken(token)) {
      setPageState('invalid_token')
      return
    }

    try {
      const record = await getTodayRecord(userId)
      setTodayRecord(record)
      setPageState('ready')
    } catch {
      setPageState('ready')
    }
  }, [token, userId, roleLoading])

  useEffect(() => { init() }, [init])

  const handleClockIn = async () => {
    if (!userId || !staffRecord) return
    setActionLoading(true)
    try {
      const record = await clockIn(userId, staffRecord.name)
      setTodayRecord(record)
      setSuccessMessage(`Clocked in at ${format(new Date(), 'h:mm a')}. Have a great shift!`)
      setPageState('success')
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to clock in. Please try again.')
      setPageState('error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!userId) return
    setActionLoading(true)
    try {
      const record = await clockOut(userId)
      setTodayRecord(record)
      setSuccessMessage(
        `Clocked out at ${format(new Date(), 'h:mm a')}. ` +
        (record?.hoursWorked ? `${record.hoursWorked.toFixed(1)} hours worked today.` : '')
      )
      setPageState('success')
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to clock out. Please try again.')
      setPageState('error')
    } finally {
      setActionLoading(false)
    }
  }

  const isAlreadyClockedIn = todayRecord?.clockIn && !todayRecord?.clockOut
  const isAlreadyClockedOut = todayRecord?.clockIn && todayRecord?.clockOut

  // ── AUTH ────────────────────────────────────────────────────────────────────
  if (pageState === 'auth') {
    return (
      <FullScreen>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold">Sign In Required</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            You need to be signed in to record your attendance.
          </p>
          <Button onClick={() => navigate('/staff/login')} className="w-full max-w-xs">
            Go to Login
          </Button>
        </div>
      </FullScreen>
    )
  }

  // ── INVALID TOKEN ───────────────────────────────────────────────────────────
  if (pageState === 'invalid_token') {
    const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    return (
      <FullScreen>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold">QR Code Expired</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            This QR code has expired. Please ask the front desk to display the current QR code and scan again.
          </p>
          <p className="text-xs text-muted-foreground">
            QR codes refresh every 10 minutes to prevent misuse.
          </p>
        </div>
      </FullScreen>
    )
  }

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <FullScreen>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </FullScreen>
    )
  }

  // ── SUCCESS ─────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <FullScreen>
        <div className="text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-500">Attendance Recorded</h2>
            <p className="text-muted-foreground text-sm mt-1">{successMessage}</p>
          </div>
          <p className="text-xs text-muted-foreground">You can close this page.</p>
          <Button variant="outline" onClick={() => navigate('/staff/dashboard')} className="w-full max-w-xs">
            Go to Dashboard
          </Button>
        </div>
      </FullScreen>
    )
  }

  // ── ERROR ───────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <FullScreen>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold">Something Went Wrong</h2>
          <p className="text-muted-foreground text-sm max-w-xs">{errorMessage}</p>
          <Button onClick={() => setPageState('ready')} variant="outline" className="w-full max-w-xs">
            Try Again
          </Button>
        </div>
      </FullScreen>
    )
  }

  // ── READY ───────────────────────────────────────────────────────────────────
  return (
    <FullScreen>
      <div className="w-full max-w-sm space-y-6">
        {/* Hotel logo + name */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Hobbysky Guest House</h1>
          <p className="text-muted-foreground text-sm">Staff Attendance</p>
        </div>

        {/* Live time */}
        <div className="text-center">
          <p className="text-4xl font-mono font-bold tabular-nums text-primary">
            {format(currentTime, 'hh:mm:ss a')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {format(currentTime, 'EEEE, MMMM d yyyy')}
          </p>
        </div>

        {/* Staff name */}
        {staffRecord && (
          <div className="bg-muted/40 rounded-xl p-4 text-center border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Signed in as</p>
            <p className="font-semibold">{staffRecord.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{staffRecord.role}</p>
          </div>
        )}

        {/* Today's status */}
        {isAlreadyClockedOut && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-medium text-emerald-600">Attendance complete for today</p>
            <p className="text-xs text-muted-foreground">
              {todayRecord.clockIn} → {todayRecord.clockOut}
              {todayRecord.hoursWorked > 0 && ` · ${todayRecord.hoursWorked.toFixed(1)} hrs`}
            </p>
          </div>
        )}

        {isAlreadyClockedIn && !isAlreadyClockedOut && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-sm font-medium text-blue-600">Currently clocked in</p>
            <p className="text-xs text-muted-foreground">Since {todayRecord.clockIn}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {!isAlreadyClockedIn && !isAlreadyClockedOut && (
            <Button
              className="w-full h-14 text-base gap-2"
              onClick={handleClockIn}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Clock In
            </Button>
          )}

          {isAlreadyClockedIn && !isAlreadyClockedOut && (
            <Button
              variant="outline"
              className="w-full h-14 text-base gap-2 border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
              onClick={handleClockOut}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
              Clock Out
            </Button>
          )}

          {isAlreadyClockedOut && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/staff/dashboard')}
            >
              Go to Dashboard
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          QR token refreshes in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
        </p>
      </div>
    </FullScreen>
  )
}

// ─── Layout wrapper (no sidebar) ─────────────────────────────────────────────
function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {children}
    </div>
  )
}
