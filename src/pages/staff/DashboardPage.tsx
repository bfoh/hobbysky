import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Building2, Calendar, Users, DollarSign, TrendingUp, Clock } from '@/components/icons'
import { blink } from '../../blink/client'
import { bookingEngine } from '../../services/booking-engine'
import { formatCurrencySync } from '../../lib/utils'
import { cn } from '../../lib/utils'
import { useCurrency } from '../../hooks/use-currency'

interface Stats {
  totalRooms: number
  totalProperties: number
  activeBookings: number
  totalGuests: number
  revenue: number
  occupancyRate: number
  avgNightlyRate: number
  todayCheckIns: number
  todayCheckOuts: number
  availableRooms: number
  availableDetails: { name: string; count: number }[]
}

export function DashboardPage() {
  const { currency } = useCurrency()
  const [stats, setStats] = useState<Stats>({
    totalRooms: 0,
    totalProperties: 0,
    activeBookings: 0,
    totalGuests: 0,
    revenue: 0,
    occupancyRate: 0,
    avgNightlyRate: 0,
    todayCheckIns: 0,
    todayCheckOuts: 0,
    availableRooms: 0,
    availableDetails: []
  })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()

    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      // Fetch data - load ALL properties (project-scoped, no user filtering needed)
      const [allBookings, properties, guests, roomTypes] = await Promise.all([
        bookingEngine.getAllBookings(),
        blink.db.properties.list(),
        blink.db.guests.list(),
        (blink.db as any).roomTypes.list()
      ])

      const todayIso = new Date().toISOString().split('T')[0]

      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
      const roomTypesData = roomTypes as any[]

      // 1. Group Total Rooms by Type
      const totalByType: Record<string, number> = {}
      // Map propertyId -> TypeName
      const propertyTypeMap: Record<string, string> = {}

      properties.forEach((p: any) => {
        // Resolve type name
        const matchingType = roomTypesData.find(rt => rt.id === p.propertyTypeId) ||
          roomTypesData.find(rt => normalize(rt.name) === normalize(p.propertyType))
        const typeName = matchingType ? matchingType.name : (p.propertyType || 'Other')

        // Count totals (excluding maintenance)
        if (p.status !== 'maintenance') {
          totalByType[typeName] = (totalByType[typeName] || 0) + 1
        }

        propertyTypeMap[p.roomNumber] = typeName
      })

      // 2. Count Occupied Rooms by Type (Today)
      const occupiedByType: Record<string, number> = {}

      const bookingsActiveToday = allBookings.filter((b: any) => {
        const checkIn = (b.dates.checkIn || b.checkIn || '').split('T')[0]
        const checkOut = (b.dates?.checkOut || b.checkOut || '').split('T')[0]
        const isActiveStatus = b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'reserved'

        if (isActiveStatus && checkIn <= todayIso && checkOut > todayIso) {
          // Find room type for this booking
          let typeName = 'Other'
          // Try to find via property map using roomNumber
          if (b.roomNumber && propertyTypeMap[b.roomNumber]) {
            typeName = propertyTypeMap[b.roomNumber]
          }
          // Fallback: use booking's roomType if valid
          else if (b.roomType) {
            const match = roomTypesData.find(rt => rt.id === b.roomType || normalize(rt.name) === normalize(b.roomType))
            typeName = match ? match.name : b.roomType
          }

          occupiedByType[typeName] = (occupiedByType[typeName] || 0) + 1
          return true
        }
        return false
      })

      // 3. Calculate Available by Type
      const availableDetails = Object.keys(totalByType).map(name => ({
        name,
        count: Math.max(0, totalByType[name] - (occupiedByType[name] || 0))
      })).filter(d => d.count > 0).sort((a, b) => a.name.localeCompare(b.name))


      // Calculate active bookings (current and future confirmed bookings)
      const activeBookings = allBookings.filter((b: any) =>
        b.dates.checkOut >= todayIso &&
        (b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'reserved')
      )

      // Calculate today's check-ins and check-outs
      const todayCheckIns = allBookings.filter((b: any) =>
        b.dates.checkIn === todayIso &&
        (b.status === 'confirmed' || b.status === 'reserved')
      )

      const todayCheckOuts = allBookings.filter((b: any) =>
        b.dates.checkOut === todayIso &&
        (b.status === 'confirmed' || b.status === 'checked-in')
      )

      // Calculate total revenue from all confirmed bookings
      const confirmedBookings = allBookings.filter((b: any) =>
        b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'checked-out'
      )
      const totalRevenue = confirmedBookings.reduce((sum: number, b: any) =>
        sum + (Number(b.totalPrice) || 0), 0
      )

      // Compute avg nightly rate by total revenue / total nights across all bookings
      const totalNights = confirmedBookings.reduce((sum: number, b: any) => {
        const inD = new Date(b.dates.checkIn)
        const outD = new Date(b.dates.checkOut)
        const ms = Math.max(0, outD.getTime() - inD.getTime())
        const nights = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
        return sum + nights
      }, 0)
      const avgRate = totalNights > 0 ? totalRevenue / totalNights : 0

      // Calculate total rooms using only Staff Rooms (properties)
      const propertyRoomNumbers = new Set(
        properties.map((p: any) => String(p.roomNumber || '').trim()).filter(Boolean)
      )
      const totalAvailableRooms = propertyRoomNumbers.size

      // Use bookingsActiveToday for current occupancy (rooms occupied specifically today)
      const occupiedRooms = bookingsActiveToday.length
      const occupancyRate = totalAvailableRooms > 0
        ? Math.round((occupiedRooms / totalAvailableRooms) * 100)
        : 0

      const availableRooms = availableDetails.reduce((sum, detail) => sum + detail.count, 0)

      // Map recent bookings with guest names and room details
      // Build maps for resolving actual room type names
      const roomTypeMap = new Map<string, string>(
        (roomTypes as any[]).map((rt: any) => [rt.id, rt.name])
      )
      // Prefer Rooms page (properties) as source of truth for room -> roomType
      const propertyTypeByRoomNumber = new Map<string, string>(
        (properties as any[])
          .filter((p: any) => !!p.roomNumber)
          .map((p: any) => [p.roomNumber, p.propertyTypeId])
      )

      const recent = (allBookings as any[])
        .sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5)
        .map((b: any) => {
          const typeIdFromProperty = propertyTypeByRoomNumber.get(b.roomNumber)
          let roomTypeName = ''
          if (typeIdFromProperty) {
            roomTypeName = roomTypeMap.get(typeIdFromProperty) || ''
          } else if (roomTypeMap.has(b.roomType)) {
            roomTypeName = roomTypeMap.get(b.roomType) || ''
          } else {
            roomTypeName = b.roomType || ''
          }

          return {
            ...b,
            id: b._id,
            guestName: b.guest.fullName,
            roomTypeName,
            checkIn: b.dates.checkIn,
            checkOut: b.dates.checkOut,
            totalPrice: b.amount
          }
        })

      setStats({
        totalRooms: totalAvailableRooms,
        totalProperties: properties.length,
        activeBookings: activeBookings.length,
        totalGuests: guests.length,
        revenue: totalRevenue,
        occupancyRate,
        avgNightlyRate: avgRate || 0,
        todayCheckIns: todayCheckIns.length,
        todayCheckOuts: todayCheckOuts.length,
        availableRooms,
        availableDetails
      })

      setRecentBookings(recent)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        <div className="h-[104px] rounded-2xl animate-shimmer" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[130px] rounded-xl animate-shimmer" />
          ))}
          <div className="md:col-span-2 h-[150px] rounded-xl animate-shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-10 w-48 rounded-lg animate-shimmer" />
          <div className="rounded-xl overflow-hidden">
            <div className="h-10 animate-shimmer" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[60px] animate-shimmer mt-px" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-card/60 backdrop-blur-xl shadow-2xl animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(41 68% 58% / 0.15) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-8 right-0 w-64 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, hsl(150 60% 38% / 0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-1.5">Overview</p>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight leading-tight">
              {getGreeting()},{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-300 to-primary/70">
                Admin
              </span>
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
              Here's your daily snapshot for Hobbysky Guest House.
            </p>
          </div>
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-sm self-start md:self-auto shrink-0">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap text-foreground/80">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        {/* Available Rooms */}
        <Card className="animate-card-enter stagger-1 relative overflow-hidden border-t-2 border-t-primary border-x border-b border-white/8 bg-card/70 backdrop-blur-xl hover:bg-card/90 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Available Rooms</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/15">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-[2.75rem] font-bold tabular-nums tracking-tight leading-none">{stats.availableRooms}</div>
            <div className="mt-3 pt-3 border-t border-white/6 space-y-1.5">
              {stats.availableDetails.length > 0 ? (
                stats.availableDetails.map((detail, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{detail.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md tabular-nums">{detail.count}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-orange-400 font-semibold tracking-wide">ALL ROOMS OCCUPIED</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Bookings */}
        <Card className="animate-card-enter stagger-2 relative overflow-hidden border-t-2 border-t-amber-400 border-x border-b border-white/8 bg-card/70 backdrop-blur-xl hover:bg-card/90 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active Bookings</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/15">
              <Calendar className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-[2.75rem] font-bold tabular-nums tracking-tight leading-none text-foreground">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Current &amp; upcoming stays
            </p>
          </CardContent>
        </Card>

        {/* Total Guests */}
        <Card className="animate-card-enter stagger-3 relative overflow-hidden border-t-2 border-t-sky-400 border-x border-b border-white/8 bg-card/70 backdrop-blur-xl hover:bg-card/90 hover:shadow-xl hover:shadow-sky-500/5 hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total Guests</CardTitle>
            <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/15">
              <Users className="h-4 w-4 text-sky-400" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-[2.75rem] font-bold tabular-nums tracking-tight leading-none">{stats.totalGuests}</div>
            <p className="text-xs text-muted-foreground mt-3">Registered guests total</p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="animate-card-enter stagger-4 relative overflow-hidden border-t-2 border-t-emerald-400 border-x border-b border-white/8 bg-card/70 backdrop-blur-xl hover:bg-card/90 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, hsl(150 60% 45% / 0.12) 0%, transparent 70%)' }} />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 relative z-10">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total Revenue</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/15">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 relative z-10">
            <div className="text-[2.1rem] font-bold tabular-nums tracking-tight leading-none text-emerald-400">
              {formatCurrencySync(stats.revenue, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-3">All-time confirmed revenue</p>
          </CardContent>
        </Card>

        {/* Avg Nightly Rate */}
        <Card className="animate-card-enter stagger-5 relative overflow-hidden border-t-2 border-t-violet-400 border-x border-b border-white/8 bg-card/70 backdrop-blur-xl hover:bg-card/90 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Avg Nightly Rate</CardTitle>
            <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/15">
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-[2.1rem] font-bold tabular-nums tracking-tight leading-none text-violet-300">
              {formatCurrencySync(stats.avgNightlyRate, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Average per night booked</p>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card className="animate-card-enter stagger-6 relative overflow-hidden border-t-2 border-t-rose-400 border-x border-b border-white/8 bg-card/70 backdrop-blur-xl hover:bg-card/90 hover:shadow-xl hover:shadow-rose-500/5 hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Occupancy Rate</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/15">
              <Clock className="h-4 w-4 text-rose-400" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[2.75rem] font-bold tabular-nums tracking-tight leading-none text-rose-300">{stats.occupancyRate}</span>
              <span className="text-lg font-semibold text-rose-400/60">%</span>
            </div>
            <div className="w-full h-1.5 bg-white/6 rounded-full mt-3.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-1000 ease-out"
                style={{ width: `${stats.occupancyRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">0%</span>
              <span className="text-[10px] text-muted-foreground">100%</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Front Desk */}
        <Card className="animate-card-enter stagger-7 col-span-1 md:col-span-2 relative overflow-hidden border-t-2 border-t-primary/60 border-x border-b border-white/8 bg-card/70 backdrop-blur-xl hover:bg-card/90 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Today's Front Desk</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/15">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-400/70 mb-2">Check-ins</p>
                <div className="text-[3rem] font-bold tabular-nums leading-none text-emerald-400">{stats.todayCheckIns}</div>
                <p className="text-[10px] text-muted-foreground mt-1.5">arriving today</p>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-orange-400/70 mb-2">Check-outs</p>
                <div className="text-[3rem] font-bold tabular-nums leading-none text-orange-400">{stats.todayCheckOuts}</div>
                <p className="text-[10px] text-muted-foreground mt-1.5">departing today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings Section */}
      <div className="animate-card-enter stagger-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-primary/60" />
            <h2 className="text-lg font-semibold tracking-tight">Recent Bookings</h2>
          </div>
          <button className="text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors uppercase tracking-[0.12em]">
            View All →
          </button>
        </div>

        {recentBookings.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-card/50 backdrop-blur-sm border-dashed">
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-4 bg-white/5 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-base font-semibold text-foreground">No recent bookings</p>
              <p className="text-sm mt-1">When guests book a room, it will appear right here.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 overflow-hidden bg-card/60 backdrop-blur-xl">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-white/[0.03] border-b border-white/6">
              <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">Guest</span>
              <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground hidden sm:block">Dates</span>
              <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground hidden sm:block text-right">Amount</span>
              <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground text-right">Status</span>
            </div>
            {/* Rows */}
            {recentBookings.map((booking: any, idx: number) => (
              <div
                key={booking.id}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.03] transition-colors',
                  idx < recentBookings.length - 1 && 'border-b border-white/5'
                )}
              >
                {/* Guest + room */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary font-serif">
                      {booking.guestName ? booking.guestName.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{booking.guestName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {booking.roomTypeName ? `${booking.roomTypeName} · ` : ''}Room {booking.roomNumber}
                    </p>
                  </div>
                </div>
                {/* Dates */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  {new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {/* Amount */}
                <div className="hidden sm:block text-right">
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {formatCurrencySync(Number(booking.totalPrice), currency)}
                  </span>
                </div>
                {/* Status badge */}
                <div className="flex justify-end">
                  <span className={cn(
                    'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider',
                    booking.status === 'confirmed' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                    booking.status === 'checked-in' && 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
                    booking.status === 'pending' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                    !['confirmed', 'checked-in', 'pending'].includes(booking.status) && 'bg-white/5 text-muted-foreground border border-white/10'
                  )}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
