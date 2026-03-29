import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  QrCode,
  Clock,
  Users,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  User,
} from '@/components/icons'
import { useStaffRole } from '@/hooks/use-staff-role'
import { blink } from '@/blink/client'
import { format, startOfDay } from 'date-fns'

// Generate a time-based token that rotates every 10 minutes
function generateToken(): string {
  const window10min = Math.floor(Date.now() / (10 * 60 * 1000))
  return btoa(window10min.toString())
}

// Seconds remaining in current 10-minute window
function secondsUntilNextToken(): number {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  return Math.ceil((windowMs - (now % windowMs)) / 1000)
}

const CLOCK_IN_BASE_URL = 'https://hobbyskyguesthouse.com/staff/clock-in'

interface AttendanceRecord {
  id: string
  entityId: string
  entityType: string
  action: string
  description: string
  userId: string
  createdAt: string
  metadata?: string
}

interface StaffMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
}

export function HRPage() {
  const { role, staffRecord } = useStaffRole()
  const isAdminOrOwner = role === 'admin' || role === 'owner'

  // QR state
  const [token, setToken] = useState(generateToken)
  const [countdown, setCountdown] = useState(secondsUntilNextToken)

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  // Countdown + token rotation
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = secondsUntilNextToken()
      setCountdown(secs)
      if (secs === 600 || secs === 599) {
        // Window just rolled over — regenerate token
        setToken(generateToken())
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const qrValue = `${CLOCK_IN_BASE_URL}?t=${token}`

  // Load today's attendance records
  const loadAttendance = useCallback(async () => {
    setLoadingAttendance(true)
    try {
      const db = blink.db as any
      const todayStart = startOfDay(new Date()).toISOString()

      const [records, staff] = await Promise.all([
        db.activityLogs.list({
          where: { entityType: 'attendance' },
          orderBy: { createdAt: 'desc' },
          limit: 200,
        }),
        db.staff.list({ limit: 100 }),
      ])

      // Filter to today
      const todayRecords = (records as AttendanceRecord[]).filter(
        (r) => r.createdAt >= todayStart
      )

      setAttendanceRecords(todayRecords)
      setStaffList(staff as StaffMember[])
    } catch (err) {
      console.error('[HRPage] Failed to load attendance:', err)
    } finally {
      setLoadingAttendance(false)
    }
  }, [])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  // Derive stats
  const clockedInUserIds = new Set(
    attendanceRecords
      .filter((r) => r.action === 'clock_in')
      .map((r) => r.userId)
  )
  const clockedOutUserIds = new Set(
    attendanceRecords
      .filter((r) => r.action === 'clock_out')
      .map((r) => r.userId)
  )
  // Present = clocked in and not yet clocked out
  const presentUserIds = new Set(
    [...clockedInUserIds].filter((id) => !clockedOutUserIds.has(id))
  )
  const presentToday = clockedInUserIds.size
  const currentlyIn = presentUserIds.size
  const absentToday = Math.max(0, staffList.length - presentToday)

  // Map userId → staff name
  const staffById = new Map(staffList.map((s) => [s.userId, s]))

  // Live now: staff currently clocked in
  const liveStaff = [...presentUserIds]
    .map((uid) => staffById.get(uid))
    .filter(Boolean) as StaffMember[]

  // Print QR handler
  const handlePrint = () => {
    const printContent = document.getElementById('hr-qr-printable')
    if (!printContent) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Staff Clock-In QR Code – Hobbysky Guest House</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
            .wrapper { text-align: center; padding: 32px; border: 2px solid #eee; border-radius: 16px; max-width: 400px; }
            h2 { margin: 0 0 4px; font-size: 20px; color: #1E3D22; }
            p { margin: 0 0 20px; color: #5A7060; font-size: 14px; }
            img, svg { display: block; margin: 0 auto 20px; }
            .note { font-size: 12px; color: #888; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <h2>Staff Clock-In</h2>
            <p>Hobbysky Guest House — Post at Entrance</p>
            ${printContent.innerHTML}
            <p class="note">Scan to record your attendance. QR code rotates every 10 minutes.</p>
          </div>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isUrgent = countdown <= 60

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HR Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Attendance tracking, leave management, and payroll
        </p>
      </div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="h-10 bg-muted/50">
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        {/* ─── ATTENDANCE TAB ─────────────────────────────────────── */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Present Today</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{presentToday}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Currently In</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{currentlyIn}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Absent Today</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{absentToday}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Code Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    Staff Clock-In QR Code
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 h-8">
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-4">
                  <div
                    id="hr-qr-printable"
                    className="bg-white p-5 rounded-2xl border shadow-sm"
                  >
                    <QRCodeSVG
                      value={qrValue}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  {/* Countdown */}
                  <div className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">QR refreshes in</p>
                    <p className={`text-2xl font-mono font-bold tabular-nums ${isUrgent ? 'text-rose-500' : 'text-primary'}`}>
                      {formatCountdown(countdown)}
                    </p>
                    {isUrgent && (
                      <p className="text-xs text-rose-500">Refreshing soon…</p>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Instructions</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Print this QR code and post it at the hotel entrance. Staff scan it each day to record their attendance. The code rotates every 10 minutes to prevent screenshot-based check-ins.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Live Now Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Live Now
                    {liveStaff.length > 0 && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-xs">
                        {liveStaff.length} in
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadAttendance}
                    disabled={loadingAttendance}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAttendance ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAttendance ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                    Loading…
                  </div>
                ) : liveStaff.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No staff currently clocked in</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {liveStaff.map((s) => (
                      <div
                        key={s.userId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.role}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Today's Log Table */}
          {attendanceRecords.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Today's Attendance Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((r) => {
                      const staff = staffById.get(r.userId)
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {staff?.name || r.userId.slice(0, 8) + '…'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                r.action === 'clock_in'
                                  ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                  : 'border-rose-500/30 text-rose-600 bg-rose-500/10'
                              }
                            >
                              {r.action === 'clock_in' ? 'Clocked In' : 'Clocked Out'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(r.createdAt), 'h:mm a')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── COMING SOON TABS ────────────────────────────────────── */}
        {(['leave', 'payroll', 'performance', 'applications'] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold capitalize">{tab} Management</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  This module is coming soon. We're building it out — check back shortly.
                </p>
                <Badge variant="outline" className="mt-2">Coming Soon</Badge>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
