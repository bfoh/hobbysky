import { blink } from '@/blink/client'
import { bookingEngine } from './booking-engine'
import { standaloneSalesService } from './standalone-sales-service'
import { startOfWeek, endOfWeek, endOfMonth, endOfYear } from 'date-fns'
import type {
  RevenueAnalytics,
  OccupancyAnalytics,
  GuestAnalytics,
  PerformanceMetrics,
  FinancialAnalytics,
  PayMethodBreakdown,
} from '@/types/analytics'

/** Decode payment method stored in charge notes as <!-- CHARGE_PAY:method --> */
function decodeChargePaymentMethod(rawNotes: string | undefined | null): string {
  if (!rawNotes) return ''
  const match = (rawNotes as string).match(/<!-- CHARGE_PAY:(.*?) -->/)
  return match?.[1] || ''
}

class AnalyticsService {
  async getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<RevenueAnalytics> {
    try {
      const bookings = await bookingEngine.getAllBookings()
      const db = blink.db as any
      const [roomTypes, properties, allChargesRaw, allStandaloneSales] = await Promise.all([
        db.roomTypes.list(),
        db.properties.list(),
        (db.bookingCharges.list({ limit: 5000 }) as Promise<any[]>).catch(() => [] as any[]),
        standaloneSalesService.getAllSales().catch(() => [] as any[]),
      ])

      // Group booking charges by booking ID for O(1) lookup
      const chargesByBookingId = new Map<string, any[]>()
      for (const c of (allChargesRaw || [])) {
        const key = c.bookingId || c.booking_id || ''
        if (!key) continue
        if (!chargesByBookingId.has(key)) chargesByBookingId.set(key, [])
        chargesByBookingId.get(key)!.push(c)
      }

      const filteredBookings = startDate && endDate
        ? bookings.filter(b => {
          const checkIn = new Date(b.dates.checkIn)
          return checkIn >= startDate && checkIn <= endDate
        })
        : bookings

      // Revenue bookings: checked-in or checked-out only
      const revenueBookings = filteredBookings.filter(
        b => ['checked-in', 'checked-out'].includes(b.status)
      )

      const roomRevenueTotal = revenueBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)

      // Additional revenue from all booking charges
      const additionalRevenueByCategory: Record<string, number> = {}
      let additionalChargesTotal = 0
      for (const c of (allChargesRaw || [])) {
        const amt = Number(c.amount || 0)
        additionalChargesTotal += amt
        const cat = c.category || 'other'
        additionalRevenueByCategory[cat] = (additionalRevenueByCategory[cat] || 0) + amt
      }

      // Standalone sales
      const standaloneSalesTotal = (allStandaloneSales || []).reduce(
        (sum: number, s: any) => sum + Number(s.amount || 0), 0
      )
      for (const s of (allStandaloneSales || [])) {
        const cat = s.category || 'other'
        additionalRevenueByCategory[cat] = (additionalRevenueByCategory[cat] || 0) + Number(s.amount || 0)
      }

      const totalRevenue = roomRevenueTotal + additionalChargesTotal + standaloneSalesTotal

      // ── Period boundaries ──────────────────────────────────────────────────
      const today = new Date().toISOString().split('T')[0]
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      const thisWeekEnd   = endOfWeek(new Date(), { weekStartsOn: 1 })
      const thisMonthStart = new Date(); thisMonthStart.setDate(1)
      const thisMonthEnd   = endOfMonth(new Date())
      const lastMonthStart = new Date(); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1, 1)
      const lastMonthEnd   = new Date(); lastMonthEnd.setDate(0)
      const thisYearStart  = new Date(); thisYearStart.setMonth(0, 1)
      const thisYearEnd    = endOfYear(new Date())
      const lastYearStart  = new Date(); lastYearStart.setFullYear(lastYearStart.getFullYear() - 1, 0, 1)
      const lastYearEnd    = new Date(); lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1, 11, 31)

      const toStr = (d: Date) => d.toISOString().split('T')[0]
      const todayStr        = today
      const weekStartStr    = toStr(thisWeekStart)
      const weekEndStr      = toStr(thisWeekEnd)
      const monthStartStr   = toStr(thisMonthStart)
      const monthEndStr     = toStr(thisMonthEnd)
      const lastMoStartStr  = toStr(lastMonthStart)
      const lastMoEndStr    = toStr(lastMonthEnd)
      const yearStartStr    = toStr(thisYearStart)
      const yearEndStr      = toStr(thisYearEnd)
      const lastYrStartStr  = toStr(lastYearStart)
      const lastYrEndStr    = toStr(lastYearEnd)

      const bookingRoomRev = (bks: any[]) => bks.reduce((s, b) => s + Number(b.amount || 0), 0)
      const salesInRange = (from: string, to?: string) =>
        (allStandaloneSales || []).reduce((sum: number, s: any) => {
          const sd = s.saleDate || s.sale_date || ''
          if (sd < from) return sum
          if (to && sd > to) return sum
          return sum + Number(s.amount || 0)
        }, 0)
      const chargesInRange = (from: string, to?: string) =>
        (allChargesRaw || []).reduce((sum: number, c: any) => {
          const cd = c.createdAt || c.created_at || ''
          if (!cd) return sum
          const cdDate = cd.slice(0, 10)
          if (cdDate < from) return sum
          if (to && cdDate > to) return sum
          return sum + Number(c.amount || 0)
        }, 0)

      const inRange = (bk: any, from: Date, to: Date) => {
        const d = new Date(bk.dates.checkIn)
        return d >= from && d <= to
      }

      const revenueByPeriod = {
        today: bookingRoomRev(revenueBookings.filter(b => b.dates.checkIn === todayStr))
          + chargesInRange(todayStr, todayStr) + salesInRange(todayStr, todayStr),
        thisWeek: bookingRoomRev(revenueBookings.filter(b => inRange(b, thisWeekStart, thisWeekEnd)))
          + chargesInRange(weekStartStr, weekEndStr) + salesInRange(weekStartStr, weekEndStr),
        thisMonth: bookingRoomRev(revenueBookings.filter(b => inRange(b, thisMonthStart, thisMonthEnd)))
          + chargesInRange(monthStartStr, monthEndStr) + salesInRange(monthStartStr, monthEndStr),
        lastMonth: bookingRoomRev(revenueBookings.filter(b => inRange(b, lastMonthStart, lastMonthEnd)))
          + chargesInRange(lastMoStartStr, lastMoEndStr) + salesInRange(lastMoStartStr, lastMoEndStr),
        thisYear: bookingRoomRev(revenueBookings.filter(b => inRange(b, thisYearStart, thisYearEnd)))
          + chargesInRange(yearStartStr, yearEndStr) + salesInRange(yearStartStr, yearEndStr),
        lastYear: bookingRoomRev(revenueBookings.filter(b => inRange(b, lastYearStart, lastYearEnd)))
          + chargesInRange(lastYrStartStr, lastYrEndStr) + salesInRange(lastYrStartStr, lastYrEndStr),
      }

      // ── Revenue by room type ───────────────────────────────────────────────
      const roomTypeMap = new Map<string, string>()
      roomTypes.forEach((rt: any) => roomTypeMap.set(rt.id, rt.name))
      const propertyTypeByRoomNumber = new Map<string, string>()
      properties.forEach((p: any) => {
        if (p.roomNumber && p.propertyTypeId) propertyTypeByRoomNumber.set(p.roomNumber, p.propertyTypeId)
      })

      const revenueByType = new Map<string, { revenue: number; count: number }>()
      revenueBookings.forEach(b => {
        let typeId = b.roomType
        const fromProp = propertyTypeByRoomNumber.get(b.roomNumber)
        if (fromProp) typeId = fromProp
        const cur = revenueByType.get(typeId) || { revenue: 0, count: 0 }
        revenueByType.set(typeId, { revenue: cur.revenue + Number(b.amount || 0), count: cur.count + 1 })
      })
      const revenueByRoomType = Array.from(revenueByType.entries()).map(([typeId, data]) => ({
        roomTypeId: typeId,
        roomTypeName: roomTypeMap.get(typeId) || typeId,
        revenue: data.revenue,
        bookingCount: data.count,
        percentage: roomRevenueTotal > 0 ? (data.revenue / roomRevenueTotal) * 100 : 0,
      })).sort((a, b) => b.revenue - a.revenue)

      // ── Revenue by payment method (split-aware) ────────────────────────────
      const normalizePayMethod = (raw: string): string => {
        const s = (raw || '').trim().toLowerCase()
        if (s === 'cash') return 'cash'
        if (s === 'mobile_money' || s === 'mobile money' || s.includes('mobile') || s.includes('momo')) return 'mobile_money'
        if (s === 'card' || s.includes('card') || s.includes('credit') || s.includes('debit')) return 'card'
        return 'not_paid'
      }
      const getPaySplits = (b: any): Array<{ method: string; amount: number }> => {
        if (b.paymentSplits && b.paymentSplits.length > 0) {
          return b.paymentSplits
            .map((s: any) => ({ method: normalizePayMethod(s.method), amount: Number(s.amount) || 0 }))
            .filter((s: any) => s.method && s.method !== 'not_paid')
        }
        const m = normalizePayMethod(b.paymentMethod || b.payment?.method || (b as any).payment_method || '')
        return m && m !== 'not_paid' ? [{ method: m, amount: Number(b.amount || 0) }] : []
      }

      let _cash = 0, _cashCount = 0, _momo = 0, _momoCount = 0, _card = 0, _cardCount = 0
      let _notPaid = 0, _notPaidCount = 0
      for (const b of revenueBookings) {
        const splts = getPaySplits(b)
        const bCharges = chargesByBookingId.get(b.id) || []
        if (splts.length === 0) { _notPaid += Number(b.amount || 0); _notPaidCount++ }
        else {
          for (const s of splts) {
            if      (s.method === 'cash')         { _cash += s.amount; _cashCount++ }
            else if (s.method === 'mobile_money') { _momo += s.amount; _momoCount++ }
            else if (s.method === 'card')         { _card += s.amount; _cardCount++ }
          }
        }
        const splitsSum = splts.reduce((s: number, p: any) => s + p.amount, 0)
        for (const c of bCharges) {
          const amt = Number(c.amount || 0)
          const cPm = decodeChargePaymentMethod(c.notes).toLowerCase()
          if (cPm === 'cash' || cPm === 'mobile_money' || cPm === 'card') {
            if      (cPm === 'cash')         { _cash += amt; _cashCount++ }
            else if (cPm === 'mobile_money') { _momo += amt; _momoCount++ }
            else if (cPm === 'card')         { _card += amt; _cardCount++ }
          } else if (splts.length > 0) {
            for (const s of splts) {
              const proportion = splitsSum > 0 ? s.amount / splitsSum : 1 / splts.length
              const portionAmt = amt * proportion
              if      (s.method === 'cash')         { _cash += portionAmt; _cashCount++ }
              else if (s.method === 'mobile_money') { _momo += portionAmt; _momoCount++ }
              else if (s.method === 'card')         { _card += portionAmt; _cardCount++ }
            }
          } else {
            _notPaid += amt
          }
        }
      }
      for (const s of (allStandaloneSales || [])) {
        const amt = Number((s as any).amount || 0)
        const pm = ((s as any).paymentMethod || (s as any).payment_method || '').toLowerCase()
        if      (pm === 'cash')         { _cash += amt; _cashCount++ }
        else if (pm === 'mobile_money') { _momo += amt; _momoCount++ }
        else if (pm === 'card')         { _card += amt; _cardCount++ }
      }

      const revenueByPaymentMethod = {
        cash: _cash, cashCount: _cashCount,
        mobileMoney: _momo, mobileMonetyCount: _momoCount,
        card: _card, cardCount: _cardCount,
        notPaid: _notPaid, notPaidCount: _notPaidCount,
      }

      // Per-period payment method breakdown
      const payBreakdown = (bks: any[], salesFrom?: string, salesTo?: string): PayMethodBreakdown => {
        let c = 0, cN = 0, m = 0, mN = 0, k = 0, kN = 0
        for (const b of bks) {
          const splts = getPaySplits(b)
          const bCharges = chargesByBookingId.get(b.id) || []
          if (splts.length === 0) continue
          const splitsSum = splts.reduce((s: number, p: any) => s + p.amount, 0)
          for (const s of splts) {
            if      (s.method === 'cash')         { c += s.amount; cN++ }
            else if (s.method === 'mobile_money') { m += s.amount; mN++ }
            else if (s.method === 'card')         { k += s.amount; kN++ }
          }
          for (const cc of bCharges) {
            const amt = Number(cc.amount || 0)
            const cPm = decodeChargePaymentMethod(cc.notes).toLowerCase()
            if (cPm === 'cash' || cPm === 'mobile_money' || cPm === 'card') {
              if      (cPm === 'cash')         { c += amt; cN++ }
              else if (cPm === 'mobile_money') { m += amt; mN++ }
              else if (cPm === 'card')         { k += amt; kN++ }
            } else {
              for (const s of splts) {
                const proportion = splitsSum > 0 ? s.amount / splitsSum : 1 / splts.length
                const portionAmt = amt * proportion
                if      (s.method === 'cash')         { c += portionAmt; cN++ }
                else if (s.method === 'mobile_money') { m += portionAmt; mN++ }
                else if (s.method === 'card')         { k += portionAmt; kN++ }
              }
            }
          }
        }
        for (const s of (allStandaloneSales || [])) {
          const sd = (s as any).saleDate || (s as any).sale_date || ''
          if (salesFrom && sd < salesFrom) continue
          if (salesTo && sd > salesTo) continue
          const amt = Number((s as any).amount || 0)
          const pm = ((s as any).paymentMethod || '').toLowerCase()
          if      (pm === 'cash')         { c += amt; cN++ }
          else if (pm === 'mobile_money') { m += amt; mN++ }
          else if (pm === 'card')         { k += amt; kN++ }
        }
        return { cash: c, cashCount: cN, mobileMoney: m, mobileMonetyCount: mN, card: k, cardCount: kN }
      }

      const weekBks  = revenueBookings.filter(b => inRange(b, thisWeekStart, thisWeekEnd))
      const monthBks = revenueBookings.filter(b => inRange(b, thisMonthStart, thisMonthEnd))
      const yearBks  = revenueBookings.filter(b => inRange(b, thisYearStart, thisYearEnd))
      const revenueByPaymentMethodByPeriod = {
        thisWeek:  payBreakdown(weekBks,  weekStartStr,  weekEndStr),
        thisMonth: payBreakdown(monthBks, monthStartStr, monthEndStr),
        thisYear:  payBreakdown(yearBks,  yearStartStr,  yearEndStr),
      }

      // Revenue by source
      const revenueBySource = {
        online:    revenueBookings.filter(b => b.source === 'online').reduce((s, b) => s + Number(b.amount || 0), 0),
        reception: revenueBookings.filter(b => b.source === 'reception').reduce((s, b) => s + Number(b.amount || 0), 0),
      }

      // ADR and RevPAR
      const totalRooms = new Set(properties.map((p: any) => String(p.roomNumber || '').trim()).filter(Boolean)).size
      const totalNights = revenueBookings.reduce((sum, b) => {
        const nights = Math.max(1, Math.ceil((new Date(b.dates.checkOut).getTime() - new Date(b.dates.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
        return sum + nights
      }, 0)
      const averageDailyRate = totalNights > 0 ? totalRevenue / totalNights : 0
      const revenuePerAvailableRoom = totalRooms > 0 ? totalRevenue / totalRooms : 0

      // Daily revenue history (last 30 days)
      const dailyRevenueHistory = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(); date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const dayBookings = revenueBookings.filter(b => b.dates.checkIn === dateStr)
        const daySales = (allStandaloneSales || []).reduce((sum: number, s: any) => {
          const sd = s.saleDate || s.sale_date || ''
          return sd === dateStr ? sum + Number(s.amount || 0) : sum
        }, 0)
        dailyRevenueHistory.push({
          date: dateStr,
          revenue: dayBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)
            + chargesInRange(dateStr, dateStr) + daySales,
          bookingCount: dayBookings.length,
        })
      }

      return {
        totalRevenue, roomRevenueTotal, standaloneSalesTotal, additionalRevenueByCategory,
        revenueByPeriod, revenueByRoomType, revenueByPaymentMethod, revenueByPaymentMethodByPeriod,
        revenueBySource, averageDailyRate, revenuePerAvailableRoom, dailyRevenueHistory,
      }
    } catch (error) {
      console.error('Failed to calculate revenue analytics:', error)
      throw error
    }
  }

  async getOccupancyAnalytics(): Promise<OccupancyAnalytics> {
    try {
      const bookings = await bookingEngine.getAllBookings()
      const db = blink.db as any
      const [properties, roomTypes] = await Promise.all([db.properties.list(), db.roomTypes.list()])

      const totalRooms = new Set(properties.map((p: any) => String(p.roomNumber || '').trim()).filter(Boolean)).size
      const today = new Date().toISOString().split('T')[0]

      const currentOccupied = bookings.filter(b => {
        const isActive = ['confirmed', 'checked-in', 'reserved'].includes(b.status)
        return isActive && b.dates.checkIn <= today && b.dates.checkOut > today
      }).length
      const currentOccupancyRate = totalRooms > 0 ? (currentOccupied / totalRooms) * 100 : 0

      const roomTypeOccupancy = new Map<string, { occupied: number; total: number }>()
      properties.forEach((p: any) => {
        if (p.propertyTypeId) {
          const cur = roomTypeOccupancy.get(p.propertyTypeId) || { occupied: 0, total: 0 }
          roomTypeOccupancy.set(p.propertyTypeId, { ...cur, total: cur.total + 1 })
        }
      })

      const propertyTypeByRoomNumber = new Map<string, string>()
      properties.forEach((p: any) => { if (p.roomNumber && p.propertyTypeId) propertyTypeByRoomNumber.set(p.roomNumber, p.propertyTypeId) })

      bookings.filter(b => ['confirmed', 'checked-in', 'reserved'].includes(b.status) && b.dates.checkIn <= today && b.dates.checkOut > today)
        .forEach(b => {
          const typeId = propertyTypeByRoomNumber.get(b.roomNumber)
          if (typeId) {
            const cur = roomTypeOccupancy.get(typeId) || { occupied: 0, total: 0 }
            roomTypeOccupancy.set(typeId, { ...cur, occupied: cur.occupied + 1 })
          }
        })

      const roomTypeMap = new Map<string, string>()
      roomTypes.forEach((rt: any) => roomTypeMap.set(rt.id, rt.name))
      const occupancyByRoomType = Array.from(roomTypeOccupancy.entries()).map(([typeId, data]) => ({
        roomTypeId: typeId,
        roomTypeName: roomTypeMap.get(typeId) || typeId,
        occupancyRate: data.total > 0 ? (data.occupied / data.total) * 100 : 0,
        occupiedRooms: data.occupied,
        totalRooms: data.total,
      }))

      const occupancyTrend = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(); date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const occupied = bookings.filter(b => {
          const isActive = ['confirmed', 'checked-in', 'checked-out'].includes(b.status)
          return isActive && b.dates.checkIn <= dateStr && b.dates.checkOut > dateStr
        }).length
        occupancyTrend.push({ date: dateStr, rate: Math.round(totalRooms > 0 ? (occupied / totalRooms) * 100 : 0), occupiedRooms: occupied })
      }

      const completedBookings = bookings.filter(b => b.status === 'checked-out' || b.status === 'confirmed')
      const totalStayDays = completedBookings.reduce((sum, b) => {
        return sum + Math.max(1, Math.ceil((new Date(b.dates.checkOut).getTime() - new Date(b.dates.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      }, 0)
      const averageLengthOfStay = completedBookings.length > 0 ? totalStayDays / completedBookings.length : 0

      const bookingsWithLeadTime = bookings.filter(b => b.createdAt && b.dates.checkIn)
      const totalLeadTime = bookingsWithLeadTime.reduce((sum, b) => {
        return sum + Math.max(0, Math.ceil((new Date(b.dates.checkIn).getTime() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      }, 0)
      const bookingLeadTime = bookingsWithLeadTime.length > 0 ? totalLeadTime / bookingsWithLeadTime.length : 0

      const futureBookings = bookings.filter(b => ['confirmed', 'reserved'].includes(b.status) && new Date(b.dates.checkIn) > new Date())
      const n7 = new Date(); n7.setDate(n7.getDate() + 7)
      const n30 = new Date(); n30.setDate(n30.getDate() + 30)
      const n90 = new Date(); n90.setDate(n90.getDate() + 90)
      const forecast = {
        next7Days:  Math.round((futureBookings.filter(b => new Date(b.dates.checkIn) <= n7 ).length / Math.max(totalRooms, 1)) * 100),
        next30Days: Math.round((futureBookings.filter(b => new Date(b.dates.checkIn) <= n30).length / Math.max(totalRooms, 1)) * 100),
        next90Days: Math.round((futureBookings.filter(b => new Date(b.dates.checkIn) <= n90).length / Math.max(totalRooms, 1)) * 100),
      }

      return {
        currentOccupancyRate: Math.round(currentOccupancyRate),
        occupiedRooms: currentOccupied,
        availableRooms: totalRooms - currentOccupied,
        totalRooms,
        occupancyByRoomType,
        averageLengthOfStay: Math.round(averageLengthOfStay * 10) / 10,
        occupancyTrend,
        bookingLeadTime: Math.round(bookingLeadTime * 10) / 10,
        forecast,
      }
    } catch (error) {
      console.error('Failed to calculate occupancy analytics:', error)
      throw error
    }
  }

  async getGuestAnalytics(): Promise<GuestAnalytics> {
    try {
      const db = blink.db as any
      const [guests, bookings] = await Promise.all([db.guests.list(), bookingEngine.getAllBookings()])

      const totalGuests = guests.length
      const thisMonthStart = new Date(); thisMonthStart.setDate(1)
      const thisYearStart  = new Date(); thisYearStart.setMonth(0, 1)

      const newGuestsThisMonth = guests.filter((g: any) => new Date(g.createdAt) >= thisMonthStart).length
      const newGuestsThisYear  = guests.filter((g: any) => new Date(g.createdAt) >= thisYearStart).length

      const guestBookingCount = new Map<string, number>()
      bookings.forEach(b => {
        const email = b.guest.email.toLowerCase().trim()
        guestBookingCount.set(email, (guestBookingCount.get(email) || 0) + 1)
      })
      const repeatGuests = Array.from(guestBookingCount.values()).filter(c => c > 1).length
      const vipGuests    = Array.from(guestBookingCount.values()).filter(c => c >= 5).length
      const repeatGuestRate = totalGuests > 0 ? (repeatGuests / totalGuests) * 100 : 0

      const guestRevenueMap = new Map<string, { id: string; name: string; email: string; totalRevenue: number; bookingCount: number; lastVisit: string; totalNights: number }>()
      bookings.filter(b => ['checked-in', 'checked-out'].includes(b.status)).forEach(b => {
        const email = b.guest.email.toLowerCase().trim()
        const nights = Math.max(1, Math.ceil((new Date(b.dates.checkOut).getTime() - new Date(b.dates.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
        const existing = guestRevenueMap.get(email)
        if (existing) {
          existing.totalRevenue += Number(b.amount || 0)
          existing.bookingCount += 1
          existing.totalNights  += nights
          if (b.dates.checkIn > existing.lastVisit) existing.lastVisit = b.dates.checkIn
        } else {
          guestRevenueMap.set(email, { id: email, name: b.guest.fullName, email: b.guest.email, totalRevenue: Number(b.amount || 0), bookingCount: 1, lastVisit: b.dates.checkIn, totalNights: nights })
        }
      })

      const topGuests = Array.from(guestRevenueMap.values())
        .map(g => ({ ...g, averageStay: g.bookingCount > 0 ? g.totalNights / g.bookingCount : 0 }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)

      const allRevs = Array.from(guestRevenueMap.values()).map(g => g.totalRevenue).sort((a, b) => b - a)
      const average = allRevs.length > 0 ? allRevs.reduce((s, v) => s + v, 0) / allRevs.length : 0
      const median  = allRevs.length > 0 ? allRevs[Math.floor(allRevs.length / 2)] : 0
      const top10N  = Math.ceil(allRevs.length * 0.1)
      const top10Percent = top10N > 0 ? allRevs.slice(0, top10N).reduce((s, v) => s + v, 0) / top10N : 0

      const bookingWindows = bookings.filter(b => b.createdAt && b.dates.checkIn)
        .map(b => Math.max(0, Math.ceil((new Date(b.dates.checkIn).getTime() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24))))
      const averageBookingWindow = bookingWindows.length > 0 ? bookingWindows.reduce((s, v) => s + v, 0) / bookingWindows.length : 0

      const stayDurations = bookings.map(b => Math.max(1, Math.ceil((new Date(b.dates.checkOut).getTime() - new Date(b.dates.checkIn).getTime()) / (1000 * 60 * 60 * 24))))
      const averageStayDuration = stayDurations.length > 0 ? stayDurations.reduce((s, v) => s + v, 0) / stayDurations.length : 0

      const dayOfWeekCounts = new Map<string, number>()
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      bookings.forEach(b => { if (b.createdAt) { const d = daysOfWeek[new Date(b.createdAt).getDay()]; dayOfWeekCounts.set(d, (dayOfWeekCounts.get(d) || 0) + 1) } })
      const peakBookingDays = Array.from(dayOfWeekCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d)

      return {
        totalGuests, newGuestsThisMonth, newGuestsThisYear,
        repeatGuestRate: Math.round(repeatGuestRate),
        guestSegmentation: { new: totalGuests - repeatGuests, returning: repeatGuests, vip: vipGuests },
        topGuests,
        guestLifetimeValue: { average: Math.round(average * 100) / 100, median: Math.round(median * 100) / 100, top10Percent: Math.round(top10Percent * 100) / 100 },
        bookingPatterns: { averageBookingWindow: Math.round(averageBookingWindow * 10) / 10, averageStayDuration: Math.round(averageStayDuration * 10) / 10, peakBookingDays },
      }
    } catch (error) {
      console.error('Failed to calculate guest analytics:', error)
      throw error
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const [revenueAnalytics, occupancyAnalytics] = await Promise.all([this.getRevenueAnalytics(), this.getOccupancyAnalytics()])
      const bookings = await bookingEngine.getAllBookings()
      const db = blink.db as any

      const totalBookings = bookings.filter(b => ['checked-in', 'checked-out'].includes(b.status)).length
      const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
      const cancellationRate = (totalBookings + cancelledBookings) > 0 ? (cancelledBookings / (totalBookings + cancelledBookings)) * 100 : 0

      const revPOR = occupancyAnalytics.occupiedRooms > 0 ? revenueAnalytics.totalRevenue / occupancyAnalytics.occupiedRooms : 0

      const rooms = await db.rooms.list().catch(() => [])
      const roomStatusDistribution = {
        available:   (rooms as any[]).filter((r: any) => r.status === 'available').length,
        occupied:    occupancyAnalytics.occupiedRooms,
        maintenance: (rooms as any[]).filter((r: any) => r.status === 'maintenance').length,
        cleaning:    (rooms as any[]).filter((r: any) => r.status === 'cleaning').length,
      }

      return {
        adr: revenueAnalytics.averageDailyRate,
        revPAR: revenueAnalytics.revenuePerAvailableRoom,
        revPOR,
        occupancyRate: occupancyAnalytics.currentOccupancyRate,
        totalBookings,
        conversionMetrics: { bookingConversionRate: 100, cancellationRate: Math.round(cancellationRate * 10) / 10, noShowRate: 0 },
        operationalMetrics: { averageCheckInTime: '15:00', averageCheckOutTime: '12:00', roomStatusDistribution },
      }
    } catch (error) {
      console.error('Failed to calculate performance metrics:', error)
      throw error
    }
  }

  async getFinancialAnalytics(): Promise<FinancialAnalytics> {
    try {
      const db = blink.db as any
      const [invoices, revenueAnalytics] = await Promise.all([db.invoices.list().catch(() => []), this.getRevenueAnalytics()])

      const totalTaxes = (invoices as any[]).reduce((sum: number, inv: any) => sum + (Number(inv.taxAmount) || 0), 0)
      const paidInvoices   = (invoices as any[]).filter((inv: any) => inv.status === 'paid')
      const unpaidInvoices = (invoices as any[]).filter((inv: any) => inv.status === 'unpaid')
      const today = new Date()
      const overdueInvoices = unpaidInvoices.filter((inv: any) => new Date(inv.dueDate) < today)

      const totalInvoiced  = (invoices as any[]).reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0)
      const totalCollected = paidInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0)

      const outstandingByAge = unpaidInvoices.reduce((acc: any, inv: any) => {
        const daysOverdue = Math.ceil((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        const amount = Number(inv.total) || 0
        if      (daysOverdue <= 30) acc.current  += amount
        else if (daysOverdue <= 60) acc.late30   += amount
        else if (daysOverdue <= 90) acc.late60   += amount
        else                        acc.late90Plus += amount
        return acc
      }, { current: 0, late30: 0, late60: 0, late90Plus: 0 })

      const paidWithDates = paidInvoices.filter((inv: any) => inv.invoiceDate && inv.sentAt)
      const totalDays = paidWithDates.reduce((sum: number, inv: any) => {
        return sum + Math.max(0, Math.ceil((new Date(inv.sentAt).getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)))
      }, 0)

      const taxByPeriod = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
        const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        const monthTax = (invoices as any[]).filter((inv: any) => { const invDate = new Date(inv.invoiceDate); return invDate >= monthStart && invDate <= monthEnd })
          .reduce((sum: number, inv: any) => sum + (Number(inv.taxAmount) || 0), 0)
        taxByPeriod.push({ period: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }), amount: monthTax })
      }

      return {
        revenueBreakdown: { roomRevenue: revenueAnalytics.totalRevenue, taxes: totalTaxes, fees: 0 },
        outstandingPayments: { total: totalInvoiced - totalCollected, byAge: outstandingByAge },
        paymentCollection: { collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 1000) / 10 : 0, averageDaysToPayment: paidWithDates.length > 0 ? Math.round(totalDays / paidWithDates.length) : 0 },
        invoiceMetrics: { totalInvoices: (invoices as any[]).length, paidInvoices: paidInvoices.length, unpaidInvoices: unpaidInvoices.length, overdueInvoices: overdueInvoices.length, totalInvoiced, totalCollected },
        taxAnalytics: { totalTaxCollected: totalTaxes, taxByPeriod },
      }
    } catch (error) {
      console.error('Failed to calculate financial analytics:', error)
      throw error
    }
  }
}

export const analyticsService = new AnalyticsService()
