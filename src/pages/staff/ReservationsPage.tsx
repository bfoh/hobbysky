import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { blink } from '@/blink/client'
import type { Booking, Room, Guest } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Loader2 } from '@/components/icons'
import { format, parseISO, isBefore, isAfter } from 'date-fns'
import { formatCurrencySync } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import { toast } from 'sonner'
import { createInvoiceData, downloadInvoicePDF, generateInvoicePDF, sendInvoiceEmail, createGroupInvoiceData, downloadGroupInvoicePDF, createGroupPreInvoiceData, downloadGroupPreInvoicePDF } from '@/services/invoice-service'
import { activityLogService } from '@/services/activity-log-service'
import { housekeepingService } from '@/services/housekeeping-service'
import { bookingChargesService, CHARGE_CATEGORIES } from '@/services/booking-charges-service'
import { BookingCharge } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LogIn, LogOut, CheckCircle2 } from '@/components/icons'
import { calculateNights } from '@/lib/display'
import { CheckInDialog } from '@/components/dialogs/CheckInDialog'
import { GuestChargesDialog } from '@/components/dialogs/GuestChargesDialog'
import { ExtendStayDialog } from '@/components/dialogs/ExtendStayDialog'
import { GroupManageDialog } from '@/components/dialogs/GroupManageDialog'
import { Settings } from '@/components/icons'
import { Receipt, CalendarPlus, MoreHorizontal, CreditCard, User, Users, Mail, Ban } from '@/components/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-emerald-500/10',
    'checked-in': 'bg-sky-500/15 text-sky-300 border-sky-500/30 ring-sky-500/10',
    'checked-out': 'bg-slate-500/15 text-slate-300 border-slate-500/30 ring-slate-500/10',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30 ring-red-500/10',
    reserved: 'bg-amber-500/15 text-amber-400 border-amber-500/30 ring-amber-500/10',
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30 ring-amber-500/10',
  }

  const defaultStyle = 'bg-white/8 text-muted-foreground border-white/10 ring-white/5'
  const style = styles[status] || defaultStyle

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ring-inset ${style} capitalize`}>
      {status.replace('-', ' ')}
    </span>
  )
}

export function ReservationsPage() {
  const db = (blink.db as any)
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [guests, setGuests] = useState<Guest[]>([])

  // Filters
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | Booking['status']>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Check-in/out dialogs
  const [checkInDialog, setCheckInDialog] = useState<Booking | null>(null)
  const [checkOutDialog, setCheckOutDialog] = useState<Booking | null>(null)
  const [chargesDialog, setChargesDialog] = useState<Booking | null>(null)
  const [extendStayDialog, setExtendStayDialog] = useState<Booking | null>(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null)
  const [manageGroupDialog, setManageGroupDialog] = useState<{ groupId: string; groupReference: string } | null>(null)
  const [groupCheckoutDialog, setGroupCheckoutDialog] = useState<Booking[] | null>(null)

  // Checkout charges summary
  const [checkoutCharges, setCheckoutCharges] = useState<BookingCharge[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // All booking charges for displaying totals
  const [allCharges, setAllCharges] = useState<BookingCharge[]>([])

  useEffect(() => {
    const unsub = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (!state.user && !state.isLoading) navigate('/staff')
    })
    return unsub
  }, [navigate])

  // Fetch charges when checkout dialog opens
  useEffect(() => {
    if (checkOutDialog) {
      setCheckoutLoading(true)
      bookingChargesService.getChargesForBooking(checkOutDialog.id)
        .then(charges => setCheckoutCharges(charges))
        .catch(err => {
          console.error('Failed to fetch checkout charges:', err)
          setCheckoutCharges([])
        })
        .finally(() => setCheckoutLoading(false))
    } else {
      setCheckoutCharges([])
    }
  }, [checkOutDialog])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [b, r, g, rt, charges] = await Promise.all([
          db.bookings.list({ orderBy: { createdAt: 'desc' }, limit: 500 }),
          db.rooms.list({ limit: 500 }),
          db.guests.list({ limit: 500 }),
          db.roomTypes.list({ limit: 100 }),
          db.bookingCharges?.list({ limit: 1000 }) || Promise.resolve([])
        ])

        // Store charges for calculating totals
        setAllCharges(charges || [])

        // Create temporary maps for lookup during deduplication
        const tempRoomMap = new Map(r.map((rm: Room) => [rm.id, rm]))
        const tempGuestMap = new Map(g.map((gm: Guest) => [gm.id, gm]))

        // Deduplicate bookings based on guest details, room, and normalized dates
        // When duplicates with different statuses exist, keep the one with more advanced status
        const statusPriority: Record<string, number> = {
          'checked-out': 5,
          'checked-in': 4,
          'confirmed': 3,
          'reserved': 2,
          'cancelled': 1
        }


        const hydratedBookings = (b as Booking[]).map(booking => {
          // Preserve the raw special_requests field for invoice generation
          // Note: Supabase returns snake_case, our interface uses camelCase
          const rawSpecialRequests = (booking as any).special_requests || booking.specialRequests || ''

          if (!rawSpecialRequests) return { ...booking, _rawSpecialRequests: '' };

          const match = rawSpecialRequests.match(/<!-- GROUP_DATA:(.*?) -->/)
          if (match && match[1]) {
            try {
              const groupData = JSON.parse(match[1]);
              return {
                ...booking,
                ...groupData,
                // Preserve raw special requests for invoice generation
                _rawSpecialRequests: rawSpecialRequests,
                special_requests: rawSpecialRequests, // Keep snake_case for DB compatibility
                // Clean the specialRequests for UI display (so user doesn't see technical data)
                specialRequests: rawSpecialRequests.replace(/<!-- GROUP_DATA:.*? -->/g, '').trim()
              };
            } catch (e) {
              console.warn('Failed to parse group data for booking', booking.id, e);
            }
          }
          return { ...booking, _rawSpecialRequests: rawSpecialRequests, special_requests: rawSpecialRequests };
        });

        const uniqueBookings = hydratedBookings.reduce((acc: Booking[], current) => {
          // Helper to normalize date (strip time)
          const normalizeDate = (d: string) => d ? format(parseISO(d), 'yyyy-MM-dd') : ''

          // Get resolved details for current booking
          const currentGuest = tempGuestMap.get(current.guestId)
          const currentRoom = tempRoomMap.get(current.roomId)

          const currentGuestName = (currentGuest?.name || '').trim().toLowerCase()
          const currentRoomNumber = (currentRoom?.roomNumber || '').trim()
          const currentCheckIn = normalizeDate(current.checkIn)
          const currentCheckOut = normalizeDate(current.checkOut)

          // Check if this is a duplicate by ID first
          const duplicateByIdIndex = acc.findIndex(item => item.id === current.id)
          if (duplicateByIdIndex >= 0) {
            console.warn(`[ReservationsPage] Skipping duplicate booking (same ID): ${current.id}`)
            return acc
          }

          // Check for logical duplicate (same guest, room, dates)
          const duplicateByDetailsIndex = acc.findIndex(item => {
            const itemGuest = tempGuestMap.get(item.guestId)
            const itemRoom = tempRoomMap.get(item.roomId)

            const itemGuestName = (itemGuest?.name || '').trim().toLowerCase()
            const itemRoomNumber = (itemRoom?.roomNumber || '').trim()
            const itemCheckIn = normalizeDate(item.checkIn)
            const itemCheckOut = normalizeDate(item.checkOut)

            return (
              itemGuestName === currentGuestName &&
              itemRoomNumber === currentRoomNumber &&
              itemCheckIn === currentCheckIn &&
              itemCheckOut === currentCheckOut
            )
          })

          if (duplicateByDetailsIndex >= 0) {
            const existing = acc[duplicateByDetailsIndex]
            const existingPriority = statusPriority[existing.status] || 0
            const currentPriority = statusPriority[current.status] || 0

            // Keep the one with higher priority status (more advanced in the booking lifecycle)
            if (currentPriority > existingPriority) {
              console.warn(`[ReservationsPage] Replacing duplicate booking ${existing.id} (status: ${existing.status}) with ${current.id} (status: ${current.status})`)
              acc[duplicateByDetailsIndex] = current
            } else {
              console.warn(`[ReservationsPage] Hidden duplicate booking: ${current.id} (status: ${current.status}) - keeping ${existing.id} (status: ${existing.status})`)
            }
            return acc
          }

          acc.push(current)
          return acc
        }, [])

        setBookings(uniqueBookings)
        setRooms(r)
        setGuests(g)
        setRoomTypes(rt)
      } catch (e) {
        console.error('Failed to load reservations', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms])
  const guestMap = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests])
  const roomTypeMap = useMemo(() => new Map(roomTypes.map(rt => [rt.id, rt])), [roomTypes])

  // Calculate total charges per booking
  const chargesMap = useMemo(() => {
    const map = new Map<string, number>()
    allCharges.forEach((charge: BookingCharge) => {
      const current = map.get(charge.bookingId) || 0
      map.set(charge.bookingId, current + charge.amount)
    })
    return map
  }, [allCharges])

  // Helper to get room price from roomType
  const getRoomPrice = (room: Room | undefined): number => {
    if (!room) return 0
    // Try to get basePrice from roomType
    const roomType = roomTypeMap.get(room.roomTypeId)
    if (roomType?.basePrice && roomType.basePrice > 0) {
      return roomType.basePrice
    }
    // Fallback to room's price field
    return room.price || 0
  }

  // Helper to get total amount (room cost after any discount + additional charges)
  const getBookingTotal = (booking: Booking): number => {
    const totalPrice = booking.totalPrice ?? 0
    // 1. Prefer finalAmount DB column (if migration has been run)
    // 2. Otherwise parse DISCOUNT_DATA from specialRequests (our embedded fallback)
    let roomCost: number
    if ((booking as any).finalAmount != null) {
      roomCost = Number((booking as any).finalAmount)
    } else {
      const sr = (booking as any).specialRequests || (booking as any).special_requests || ''
      const dm = sr.match?.(/<!-- DISCOUNT_DATA:(.*?) -->/)
      if (dm) {
        try {
          const parsed = JSON.parse(dm[1])
          const discountAmt = parsed.discountAmount || 0
          roomCost = Math.max(0, totalPrice - discountAmt)
        } catch { roomCost = totalPrice }
      } else {
        roomCost = totalPrice
      }
    }
    const additionalCharges = chargesMap.get(booking.id) || 0
    return roomCost + additionalCharges
  }

  const resolveRoomStatus = (booking: Booking, room?: Room) => {
    if (booking.status === 'checked-in') return 'occupied'
    // For checked-out bookings, use actual room status from database
    // Room can be 'cleaning' or 'available' depending on housekeeping task completion
    if (booking.status === 'checked-out') return room?.status || 'cleaning'
    if (booking.status === 'cancelled') return room?.status || 'cancelled'
    if (booking.status === 'confirmed' || booking.status === 'reserved') {
      if (room?.status && ['maintenance', 'cleaning'].includes(room.status)) {
        return room.status
      }
      return 'available'
    }
    return room?.status || 'available'
  }

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (status !== 'all' && b.status !== status) return false
      if (from && isBefore(parseISO(b.checkOut), parseISO(from))) return false
      if (to && isAfter(parseISO(b.checkIn), parseISO(to))) return false
      if (query) {
        const guest = guestMap.get(b.guestId)
        const room = roomMap.get(b.roomId)
        const hay = `${guest?.name || ''} ${guest?.email || ''} ${room?.roomNumber || ''} ${b.id}`.toLowerCase()
        if (!hay.includes(query.toLowerCase().trim())) return false
      }
      return true
    })
  }, [bookings, status, from, to, query, guestMap, roomMap])

  // Build grouped display items: group bookings appear as a single block, individuals are flat
  type GroupDisplayItem = {
    type: 'group'
    groupId: string
    groupReference: string
    billingContact: any
    bookings: Booking[]
  }
  type IndividualDisplayItem = { type: 'individual'; booking: Booking }
  type DisplayItem = GroupDisplayItem | IndividualDisplayItem

  const displayItems = useMemo<DisplayItem[]>(() => {
    // Build a map of groupId → all bookings in that group (from the full filtered list)
    const groupMap = new Map<string, Booking[]>()
    filtered.forEach(b => {
      if ((b as any).groupId) {
        const existing = groupMap.get((b as any).groupId) || []
        groupMap.set((b as any).groupId, [...existing, b])
      }
    })
    // Single pass — emit group block at the position of the FIRST member seen
    const emittedGroups = new Set<string>()
    const items: DisplayItem[] = []
    filtered.forEach(b => {
      const gId = (b as any).groupId
      if (gId) {
        if (!emittedGroups.has(gId)) {
          emittedGroups.add(gId)
          items.push({
            type: 'group',
            groupId: gId,
            groupReference: (b as any).groupReference || 'Group',
            billingContact: (b as any).billingContact || null,
            bookings: groupMap.get(gId) || [b]
          })
        }
      } else {
        items.push({ type: 'individual', booking: b })
      }
    })
    return items
  }, [filtered])

  const cancelBooking = async (id: string) => {
    const original = bookings
    setUpdatingId(id)
    // Optimistic update
    setBookings(prev => prev.map(b => (b.id === id ? { ...b, status: 'cancelled' } : b)))
    try {
      await db.bookings.update(id, { status: 'cancelled' })
      toast.success('Booking cancelled')
    } catch (e) {
      console.error('Cancel failed', e)
      setBookings(original)
      toast.error('Failed to cancel booking')
    } finally {
      setUpdatingId(null)
    }
  }

  // Check-out handler

  // Check-out handler
  const handleDownloadInvoice = async (booking: Booking) => {
    const guest = guestMap.get(booking.guestId)
    const room = roomMap.get(booking.roomId)

    if (!guest || !room) {
      toast.error('Guest or room information not available')
      return
    }

    setDownloadingInvoice(booking.id)
    try {
      console.log('📄 [ReservationsPage] Generating invoice for staff download...', {
        bookingId: booking.id,
        existingInvoiceNumber: booking.invoiceNumber,
        guestEmail: guest.email,
        roomNumber: room.roomNumber
      })

      // Create booking with details for invoice
      const bookingWithDetails = {
        ...booking,
        // CRITICAL: specific invoice data (discounts/charges) is in the raw specialRequests
        // The 'specialRequests' field on the booking object is cleaned for UI display
        // We must use _rawSpecialRequests or special_requests to get the metadata
        specialRequests: (booking as any)._rawSpecialRequests || (booking as any).special_requests || booking.specialRequests,
        guest: guest,
        room: {
          roomNumber: room.roomNumber,
          roomType: roomTypeMap.get(room.roomTypeId)?.name || 'Standard Room'
        }
      }

      // Generate invoice data
      const invoiceData = await createInvoiceData(bookingWithDetails, room)

      // IMPORTANT: Use existing invoice number if available for consistency
      if (booking.invoiceNumber) {
        invoiceData.invoiceNumber = booking.invoiceNumber
        console.log('✅ [ReservationsPage] Using existing invoice number:', booking.invoiceNumber)
      } else {
        // Save the new invoice number to booking for future consistency
        await db.bookings.update(booking.id, { invoiceNumber: invoiceData.invoiceNumber }).catch(() => { })
        console.log('✅ [ReservationsPage] Saved new invoice number:', invoiceData.invoiceNumber)
      }

      // Download PDF using service function
      await downloadInvoicePDF(invoiceData)

      toast.success(`Invoice downloaded for ${guest.name}`)
      console.log('✅ [ReservationsPage] Invoice downloaded successfully')
    } catch (error: any) {
      console.error('❌ [ReservationsPage] Invoice download failed:', error)
      toast.error('Failed to download invoice')
    } finally {
      setDownloadingInvoice(null)
    }
  }

  // Helper: resolve full booking details for invoice generation (restores raw specialRequests)
  const resolveGroupBookingDetails = (groupBookings: Booking[], includeCheckout = false) =>
    groupBookings.map(b => {
      const guest = guestMap.get(b.guestId)
      const room = roomMap.get(b.roomId)
      return {
        ...b,
        ...(includeCheckout ? { actualCheckOut: new Date().toISOString() } : {}),
        specialRequests: (b as any)._rawSpecialRequests || (b as any).special_requests || b.specialRequests,
        guest,
        room: {
          roomNumber: room?.roomNumber || 'N/A',
          roomType: roomTypeMap.get(room?.roomTypeId)?.name || 'Standard Room'
        }
      }
    })

  // Helper: normalise GROUP_DATA billingContact (fullName → name) and fall back to guest record
  const resolveGroupBillingContact = (primaryBooking: Booking) => {
    const raw = (primaryBooking as any).billingContact
    if (raw) return { ...raw, name: raw.fullName || raw.name || guestMap.get(primaryBooking.guestId)?.name || 'Guest' }
    const guest = guestMap.get(primaryBooking.guestId)
    return { name: guest?.name || 'Guest', email: guest?.email || '' }
  }

  // Group Invoice Download (full / post-checkout)
  const handleGroupInvoiceDownload = async (primaryBooking: Booking, groupBookings?: Booking[]) => {
    const gId = (primaryBooking as any).groupId
    if (!gId) return
    setDownloadingInvoice(primaryBooking.id)
    try {
      const all = groupBookings || bookings.filter(b => (b as any).groupId === gId)
      if (all.length === 0) throw new Error('No bookings found for this group')
      const fullDetails = resolveGroupBookingDetails(all)
      const billingContact = resolveGroupBillingContact(primaryBooking)
      const groupInvoiceData = await createGroupInvoiceData(fullDetails as any, billingContact)
      await downloadGroupInvoicePDF(groupInvoiceData)
      toast.success('Group invoice downloaded')
    } catch (error: any) {
      console.error('Group invoice failed', error)
      toast.error('Failed to generate group invoice')
    } finally {
      setDownloadingInvoice(null)
    }
  }

  // Group Pre-Invoice (confirmed / checked-in — shows part payment if applicable)
  const handleGroupPreInvoice = async (primaryBooking: Booking, groupBookings: Booking[]) => {
    setDownloadingInvoice(primaryBooking.id)
    try {
      const fullDetails = resolveGroupBookingDetails(groupBookings)
      const billingContact = resolveGroupBillingContact(primaryBooking)
      const preInvoiceData = await createGroupPreInvoiceData(fullDetails as any, billingContact)
      await downloadGroupPreInvoicePDF(preInvoiceData)
      toast.success('Group pre-invoice downloaded')
    } catch (error: any) {
      console.error('Group pre-invoice failed', error)
      toast.error('Failed to generate group pre-invoice')
    } finally {
      setDownloadingInvoice(null)
    }
  }

  // Group Check-Out: check out ALL rooms, then emit ONE group invoice
  const handleGroupCheckOut = async (groupBookings: Booking[]) => {
    setGroupCheckoutDialog(null)
    setProcessing(true)
    try {
      for (const booking of groupBookings) {
        const checkOutUpdate = { status: 'checked-out', actualCheckOut: new Date().toISOString() }
        try {
          await db.bookings.update(booking.id, checkOutUpdate)
        } catch (statusErr: any) {
          if (statusErr.message?.includes('bookings_status_check') || statusErr.message?.includes('violates check constraint')) {
            await db.bookings.update(booking.id, { ...checkOutUpdate, status: 'checked_out' })
          } else throw statusErr
        }

        const room = roomMap.get(booking.roomId)
        if (room) {
          await db.rooms.update(room.id, { status: 'cleaning' })
          setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: 'cleaning' } : r))
          try {
            const guestName = guestMap.get(booking.guestId)?.name || 'Guest'
            await housekeepingService.createCheckoutTask(booking, room, guestName, user)
          } catch (taskError) {
            console.error('Housekeeping task failed for booking', booking.id, taskError)
          }
        }
      }

      // Optimistic UI
      setBookings(prev => prev.map(b =>
        groupBookings.some(gb => gb.id === b.id) ? { ...b, status: 'checked-out' as const } : b
      ))

      // Generate ONE group invoice for the whole group
      const primaryBooking = groupBookings.find(b => (b as any).isPrimaryBooking) || groupBookings[0]
      const fullDetails = resolveGroupBookingDetails(groupBookings, true)
      const billingContact = resolveGroupBillingContact(primaryBooking)
      const groupInvoiceData = await createGroupInvoiceData(fullDetails as any, billingContact)
      await downloadGroupInvoicePDF(groupInvoiceData)

      // Log activity
      for (const booking of groupBookings) {
        activityLogService.log({
          action: 'checked_out', entityType: 'booking', entityId: booking.id,
          details: { guestName: guestMap.get(booking.guestId)?.name || 'Unknown', roomNumber: roomMap.get(booking.roomId)?.roomNumber || 'Unknown', groupCheckout: true },
          userId: user?.id || 'system'
        }).catch(() => { })
      }

      toast.success(`Group checked out (${groupBookings.length} room${groupBookings.length > 1 ? 's' : ''}). Invoice downloaded.`)
    } catch (error: any) {
      console.error('Group check-out failed:', error)
      toast.error('Group check-out failed: ' + (error.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  // Check-out handler
  const handleCheckOut = async (booking: Booking) => {
    setProcessing(true)
    setCheckOutDialog(null) // Close dialog immediately
    try {
      let housekeepingTaskCreated = false

      // Update booking status to checked-out (with constraint retry for legacy DBs)
      const checkOutUpdate = { status: 'checked-out', actualCheckOut: new Date().toISOString() }
      try {
        await db.bookings.update(booking.id, checkOutUpdate)
      } catch (statusErr: any) {
        if (statusErr.message?.includes('bookings_status_check') || statusErr.message?.includes('violates check constraint')) {
          await db.bookings.update(booking.id, { ...checkOutUpdate, status: 'checked_out' })
        } else {
          throw statusErr
        }
      }

      // Update room status to cleaning
      const room = roomMap.get(booking.roomId)
      if (room) {
        await db.rooms.update(room.id, { status: 'cleaning' })
        // Optimistically reflect in UI immediately
        setRooms(prev => prev.map(r => (r.id === room.id ? { ...r, status: 'cleaning' } : r)))

        // Log room status change
        try {
          await activityLogService.log({
            action: 'updated',
            entityType: 'room',
            entityId: room.id,
            details: {
              roomNumber: room.roomNumber,
              previousStatus: 'occupied',
              newStatus: 'cleaning',
              reason: 'guest_check_out',
              guestName: guestMap.get(booking.guestId)?.name || 'Unknown Guest',
              bookingId: booking.id
            },
            userId: user?.id || 'system'
          })
        } catch (logError) {
          console.error('Failed to log room status change:', logError)
        }

        // Update properties table if a matching property exists (best-effort)
        try {
          const props = await db.properties.list({ limit: 500 })
          const prop = props.find((p: any) => p.id === room.id)
          if (prop) {
            await db.properties.update(prop.id, { status: 'cleaning' })
          }
        } catch (e) {
          console.warn('Properties update skipped:', e)
        }

        // Create housekeeping task using the new service
        try {
          const guestName = guestMap.get(booking.guestId)?.name || 'Guest'
          const newTask = await housekeepingService.createCheckoutTask(booking, room, guestName, user)

          if (newTask) {
            housekeepingTaskCreated = true
          }
        } catch (taskError) {
          console.error('❌ [Checkout] Failed to create housekeeping task via service:', taskError)
        }
      }

      // Optimistic UI update
      setBookings(prev => prev.map(b =>
        b.id === booking.id ? { ...b, status: 'checked-out' as const } : b
      ))

      // Get guest and room data for notifications
      const guest = guestMap.get(booking.guestId)

      // Generate invoice and send notifications (invoice data contains correct total including additional charges)
      if (guest && room) {
        try {
          console.log('🚀 [ReservationsPage] Starting invoice generation...', {
            bookingId: booking.id,
            guestEmail: guest.email,
            roomNumber: room.roomNumber,
            guestName: guest.name
          })

          // Create booking with details for invoice
          const bookingWithDetails = {
            ...booking,
            actualCheckOut: new Date().toISOString(),
            guest: guest,
            room: {
              roomNumber: room.roomNumber,
              roomType: roomTypeMap.get(room.roomTypeId)?.name || 'Standard Room'
            }
          }

          console.log('📊 [ReservationsPage] Creating invoice data...')
          // Generate invoice data (this includes additional charges in the total!)
          const invoiceData = await createInvoiceData(bookingWithDetails, room)
          console.log('✅ [ReservationsPage] Invoice data created:', {
            invoiceNumber: invoiceData.invoiceNumber,
            roomTotal: booking.totalPrice,
            additionalChargesTotal: invoiceData.charges.additionalChargesTotal,
            grandTotal: invoiceData.charges.total
          })

          // IMPORTANT: Save the invoice number to the booking record for consistency
          try {
            await db.bookings.update(booking.id, { invoiceNumber: invoiceData.invoiceNumber })
            console.log('✅ [ReservationsPage] Invoice number saved to booking:', invoiceData.invoiceNumber)
          } catch (saveError) {
            console.error('⚠️ [ReservationsPage] Failed to save invoice number to booking:', saveError)
          }

          console.log('📄 [ReservationsPage] Generating invoice PDF...')
          // Generate invoice PDF
          const invoicePdf = await generateInvoicePDF(invoiceData)
          console.log('✅ [ReservationsPage] Invoice PDF generated')

          // Send check-out notification with CORRECT total (room + additional charges)
          try {
            const { sendCheckOutNotification } = await import('@/services/notifications')

            // Create booking object with the structure expected by notifications
            const bookingForNotification = {
              id: booking.id,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              actualCheckIn: booking.actualCheckIn,
              actualCheckOut: new Date().toISOString()
            }

            // Use invoiceData.charges.total which includes room + additional charges
            const notificationInvoiceData = {
              invoiceNumber: invoiceData.invoiceNumber,
              totalAmount: invoiceData.charges.total, // CORRECT: includes additional charges
              downloadUrl: `${window.location.origin}/invoice/${invoiceData.invoiceNumber}?bookingId=${booking.id}`
            }

            console.log('📧 [ReservationsPage] Sending check-out notification with total (room + charges):', {
              roomCost: booking.totalPrice,
              additionalCharges: invoiceData.charges.additionalChargesTotal,
              grandTotal: invoiceData.charges.total
            })

            await sendCheckOutNotification(guest, room, bookingForNotification, notificationInvoiceData)
            console.log('✅ [ReservationsPage] Check-out notification sent successfully!')
          } catch (notificationError) {
            console.error('❌ [ReservationsPage] Check-out notification error:', notificationError)
          }

          console.log('📧 [ReservationsPage] Sending invoice email...')
          // Send invoice email
          const emailResult = await sendInvoiceEmail(invoiceData, invoicePdf)
          console.log('📧 [ReservationsPage] Email result:', emailResult)

          if (emailResult.success) {
            console.log('✅ [ReservationsPage] Invoice sent successfully')
            toast.success(`✅ Invoice sent to ${guest.email}`)
          } else {
            console.warn('⚠️ [ReservationsPage] Invoice email failed:', emailResult.error)
            toast.error(`❌ Invoice email failed: ${emailResult.error}`)
          }
        } catch (invoiceError: any) {
          console.error('❌ [ReservationsPage] Invoice generation failed:', invoiceError)
          console.error('❌ [ReservationsPage] Error details:', {
            message: invoiceError.message,
            stack: invoiceError.stack,
            name: invoiceError.name
          })
          toast.error(`❌ Invoice generation failed: ${invoiceError.message}`)
        }
      } else {
        console.warn('⚠️ [ReservationsPage] Missing guest or room data for invoice generation:', {
          hasGuest: !!guest,
          hasRoom: !!room,
          guestId: booking.guestId,
          roomId: booking.roomId
        })
        toast.error('❌ Cannot generate invoice: Missing guest or room data')
      }

      // Log check-out activity
      try {
        const guest = guestMap.get(booking.guestId)
        const room = roomMap.get(booking.roomId)
        await activityLogService.log({
          action: 'checked_out',
          entityType: 'booking',
          entityId: booking.id,
          details: {
            guestName: guest?.name || 'Unknown Guest',
            roomNumber: room?.roomNumber || 'Unknown Room',
            checkOutDate: booking.checkOut,
            actualCheckOut: new Date().toISOString(),
            bookingId: booking.id
          },
          userId: user?.id || 'system'
        })
        console.log('✅ [ReservationsPage] Check-out activity logged successfully!')
      } catch (logError) {
        console.error('❌ [ReservationsPage] Failed to log check-out activity:', logError)
      }

      const taskMessage = housekeepingTaskCreated ? ' Cleaning task created.' : ' (Cleaning task creation failed - please check console)'
      toast.success(`Guest ${guestMap.get(booking.guestId)?.name || 'Guest'} checked out successfully!${taskMessage}`)
    } catch (error) {
      console.error('Check-out failed:', error)
      toast.error('Failed to check out guest')
      // Reload data to restore correct state
      const [b] = await Promise.all([db.bookings.list({ orderBy: { createdAt: 'desc' }, limit: 500 })])
      setBookings(b)
    } finally {
      setProcessing(false)
    }
  }

  // Determine if check-in is allowed
  const canCheckIn = (booking: Booking) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkInDate = new Date(booking.checkIn)
    checkInDate.setHours(0, 0, 0, 0)
    return booking.status === 'confirmed' && checkInDate <= today
  }

  // Determine if check-out is allowed
  const canCheckOut = (booking: Booking) => {
    return booking.status === 'checked-in'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reservations…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Check-In Dialog */}
      <CheckInDialog
        open={!!checkInDialog}
        onOpenChange={(open) => !open && setCheckInDialog(null)}
        booking={checkInDialog}
        room={checkInDialog ? roomMap.get(checkInDialog.roomId) : null}
        guest={checkInDialog ? guestMap.get(checkInDialog.guestId) : null}
        user={user}
        onSuccess={async () => {
          // Optimistic UI update or reload
          if (checkInDialog) {
            // Reload data to ensure everything is synced
            const [b] = await Promise.all([db.bookings.list({ orderBy: { createdAt: 'desc' }, limit: 500 })])
            setBookings(b)
            // Also reload rooms to update status
            const [r] = await Promise.all([db.rooms.list({ limit: 500 })])
            setRooms(r)
          }
        }}
      />

      {/* Guest Charges Dialog */}
      <GuestChargesDialog
        open={!!chargesDialog}
        onOpenChange={(open) => !open && setChargesDialog(null)}
        booking={chargesDialog}
        guest={chargesDialog ? guestMap.get(chargesDialog.guestId) : null}
        onChargesUpdated={async () => {
          // Refresh charges data when charges are updated
          const charges = await db.bookingCharges?.list({ limit: 1000 }) || []
          setAllCharges(charges)
        }}
      />

      {/* Extend Stay Dialog */}
      {extendStayDialog && (() => {
        const extendRoom = roomMap.get(extendStayDialog.roomId)
        return (
          <ExtendStayDialog
            open={!!extendStayDialog}
            onOpenChange={(open) => !open && setExtendStayDialog(null)}
            booking={extendStayDialog}
            guest={guestMap.get(extendStayDialog.guestId) || { id: '', name: 'Guest', email: '' }}
            room={{
              id: extendRoom?.id || '',
              roomNumber: extendRoom?.roomNumber || 'N/A',
              roomType: roomTypeMap.get(extendRoom?.roomTypeId)?.name,
              price: getRoomPrice(extendRoom)
            }}
            onExtensionComplete={async () => {
              // Refresh bookings and charges data after extension
              const [b, charges] = await Promise.all([
                db.bookings.list({ orderBy: { createdAt: 'desc' }, limit: 500 }),
                db.bookingCharges?.list({ limit: 1000 }) || Promise.resolve([])
              ])
              setBookings(b)
              setAllCharges(charges || [])
            }}
          />
        )
      })()}

      {/* Group Checkout Dialog */}
      {groupCheckoutDialog && (
        <Dialog open={!!groupCheckoutDialog} onOpenChange={(open) => !open && setGroupCheckoutDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Confirm Group Check-Out
              </DialogTitle>
              <DialogDescription>
                This will check out all {groupCheckoutDialog.length} rooms simultaneously and generate a single group invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                {groupCheckoutDialog.map(b => {
                  const guest = guestMap.get(b.guestId)
                  const room = roomMap.get(b.roomId)
                  return (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{guest?.name || 'Guest'}</span>
                      <span className="text-muted-foreground">Room {room?.roomNumber || 'N/A'}</span>
                      <span className="font-semibold text-primary">{formatCurrencySync(getBookingTotal(b), currency)}</span>
                    </div>
                  )
                })}
                <div className="border-t border-amber-500/20 pt-2 flex justify-between font-bold">
                  <span>Group Total</span>
                  <span className="text-primary">
                    {formatCurrencySync(groupCheckoutDialog.reduce((sum, b) => sum + getBookingTotal(b), 0), currency)}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-sky-500/8 p-3 border border-sky-500/20 text-sm text-sky-400/80 space-y-1">
                <p className="font-medium text-sky-300">What happens next?</p>
                <p>✓ All {groupCheckoutDialog.length} rooms set to "Checked-Out" &amp; "Cleaning"</p>
                <p>✓ Housekeeping tasks created for each room</p>
                <p>✓ Single group invoice downloaded automatically</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGroupCheckoutDialog(null)} disabled={processing}>Cancel</Button>
              <Button onClick={() => handleGroupCheckOut(groupCheckoutDialog)} disabled={processing}>
                {processing ? 'Processing...' : `Check Out ${groupCheckoutDialog.length} Rooms`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Group Manage Dialog */}
      {manageGroupDialog && (
        <GroupManageDialog
          open={!!manageGroupDialog}
          onOpenChange={(open) => !open && setManageGroupDialog(null)}
          groupId={manageGroupDialog.groupId}
          groupReference={manageGroupDialog.groupReference}
          onUpdate={async () => {
            // Refresh bookings data
            const [b, charges] = await Promise.all([
              db.bookings.list({ orderBy: { createdAt: 'desc' }, limit: 500 }),
              db.bookingCharges?.list({ limit: 1000 }) || Promise.resolve([])
            ])
            setBookings(b)
            setAllCharges(charges || [])
          }}
        />
      )}

      {/* Check-Out Dialog */}
      <Dialog open={!!checkOutDialog} onOpenChange={(open) => !open && setCheckOutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Guest Check-Out</DialogTitle>
            <DialogDescription>
              Complete the checkout process and create cleaning task
            </DialogDescription>
          </DialogHeader>
          {checkOutDialog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Guest Name</p>
                  <p className="text-base font-semibold">{guestMap.get(checkOutDialog.guestId)?.name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Room Number</p>
                  <p className="text-base font-semibold">
                    {roomMap.get(checkOutDialog.roomId)?.roomNumber || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stay Duration</p>
                  <p className="text-base">
                    {calculateNights(checkOutDialog.checkIn, checkOutDialog.checkOut)} nights
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Room Cost (Paid)</p>
                  <p className="text-base font-semibold">
                    {formatCurrencySync(checkOutDialog.finalAmount ?? checkOutDialog.totalPrice, currency)}
                  </p>
                  {checkOutDialog.discountAmount && checkOutDialog.discountAmount > 0 && (
                    <p className="text-xs text-green-600">
                      Discount applied: -{formatCurrencySync(checkOutDialog.discountAmount, currency)}
                    </p>
                  )}
                </div>
              </div>

              {/* Charges Summary */}
              {checkoutLoading ? (
                <div className="flex items-center gap-2 py-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading charges...
                </div>
              ) : checkoutCharges.length > 0 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Additional Charges</p>
                  <div className="space-y-2">
                    {checkoutCharges.map(charge => (
                      <div key={charge.id} className="flex justify-between text-sm">
                        <span>{charge.description} ({charge.quantity}×)</span>
                        <span className="font-medium">{formatCurrencySync(charge.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Additional Charges Total</span>
                    <span className="text-primary">
                      {formatCurrencySync(checkoutCharges.reduce((sum, c) => sum + c.amount, 0), currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Grand Total */}
              {!checkoutLoading && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Grand Total</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrencySync(
                        (checkOutDialog.finalAmount ?? checkOutDialog.totalPrice) + checkoutCharges.reduce((sum, c) => sum + c.amount, 0),
                        currency
                      )}
                    </span>
                  </div>
                  {checkoutCharges.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Room: {formatCurrencySync(checkOutDialog.finalAmount ?? checkOutDialog.totalPrice, currency)} +
                      Charges: {formatCurrencySync(checkoutCharges.reduce((sum, c) => sum + c.amount, 0), currency)}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-900">What happens next?</p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>✓ Booking status updated to "Checked-Out"</li>
                  <li>✓ Room status set to "Cleaning"</li>
                  <li>✓ Housekeeping task automatically created</li>
                  <li>✓ Invoice generated with all charges</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutDialog(null)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={() => handleCheckOut(checkOutDialog!)} disabled={processing}>
              {processing ? 'Processing...' : 'Confirm Check-Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-background">
        <header className="bg-card/80 backdrop-blur-md border-b border-white/6 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-serif font-bold text-foreground">Reservations</h1>
                <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-semibold rounded-full bg-primary/15 text-primary border border-primary/25">
                  {displayItems.length}
                </span>
              </div>
              <span className="hidden lg:block text-muted-foreground/40">|</span>
              <p className="hidden lg:block text-sm text-muted-foreground">Search, filter and manage bookings</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all"
                onClick={() => navigate('/staff/onsite-booking')}
              >
                <span className="mr-1">+</span> New Booking
              </Button>
              <Button
                variant="outline"
                className="border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all"
                onClick={() => navigate('/staff/calendar')}
              >
                Calendar View
              </Button>
              <Button
                variant="outline"
                className="border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all"
                onClick={() => navigate('/staff/invoices')}
              >
                <Receipt className="w-4 h-4 mr-1.5" />
                Manage Invoices
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Filters Section */}
          <Card className="mb-6 border-white/8 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4">
                  <Input
                    placeholder="Search by guest, email, room or reference…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="bg-background border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="md:col-span-2">
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="checked-in">Checked-in</SelectItem>
                      <SelectItem value="checked-out">Checked-out</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">From:</span>
                    <Input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">To:</span>
                    <Input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reservations Table */}
          <Card className="border-white/8 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              {displayItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bookings found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/60">
                        <TableHead className="w-[140px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guest</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayItems.map((item) => {
                        // ── INDIVIDUAL BOOKING ROW ───────────────────────────
                        if (item.type === 'individual') {
                          const b = item.booking
                          const guest = guestMap.get(b.guestId)
                          const room = roomMap.get(b.roomId)
                          const canShowCheckIn = canCheckIn(b)
                          const canShowCheckOut = canCheckOut(b)
                          const isCheckedOut = b.status === 'checked-out'
                          const isCancelled = b.status === 'cancelled'
                          return (
                            <TableRow key={b.id} className="hover:bg-muted/30 transition-colors cursor-default group">
                              <TableCell>
                                <div className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">
                                  #{b.id.slice(-8)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm text-foreground">{guest?.name || 'Guest'}</span>
                                  {guest?.email && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{guest.email}</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">Room {room?.roomNumber || 'N/A'}</span>
                                  <span className="text-[10px] text-muted-foreground capitalize">{resolveRoomStatus(b, room).replace('-', ' ')}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col text-sm">
                                  <span className="font-medium">{format(parseISO(b.checkIn), 'MMM dd')} <span className="text-muted-foreground">-</span> {format(parseISO(b.checkOut), 'MMM dd')}</span>
                                  <span className="text-xs text-muted-foreground">{format(parseISO(b.checkOut), 'yyyy')}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium text-sm">{formatCurrencySync(getBookingTotal(b), currency)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <StatusBadge status={b.status} />
                                  {(b as any).source === 'online' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/25">Online</span>
                                  )}
                                  {((b as any).source === 'voice_agent' || (b.specialRequests || '').includes('[Voice Agent Booking]')) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25">Voice</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const method = b.paymentMethod || 'Not Paid'
                                  const isUnpaid = !method || method === 'Not Paid' || method === 'Not paid' || method === 'not_paid'
                                  return isUnpaid
                                    ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/12 text-red-400 text-[10px] font-semibold border border-red-500/20"><Ban className="w-3 h-3" />Unpaid</span>
                                    : <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100 ring-1 ring-emerald-600/10"><CheckCircle2 className="w-3 h-3" />{method === 'Credit/Debit Card' ? 'Card' : method === 'mobile_money' ? 'Momo' : method}</span>
                                })()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canShowCheckIn && <Button size="sm" onClick={() => setCheckInDialog(b)} className="h-8 shadow-sm"><LogIn className="w-3.5 h-3.5 mr-1.5" /> Check In</Button>}
                                  {canShowCheckOut && <Button size="sm" variant="outline" onClick={() => setCheckOutDialog(b)} className="h-8 border-primary/20 text-primary hover:bg-primary/5 shadow-sm text-xs"><LogOut className="w-3.5 h-3.5 mr-1.5" /> Check Out</Button>}
                                  {isCheckedOut && <Button size="sm" variant="ghost" onClick={() => handleDownloadInvoice(b)} disabled={downloadingInvoice === b.id} className="h-8 text-muted-foreground hover:text-foreground">{downloadingInvoice === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}</Button>}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[180px]">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      {canShowCheckOut && (<><DropdownMenuItem onClick={() => setChargesDialog(b)}><Receipt className="w-4 h-4 mr-2" /><span>Add Charges</span></DropdownMenuItem><DropdownMenuItem onClick={() => setExtendStayDialog(b)}><CalendarPlus className="w-4 h-4 mr-2" /><span>Extend Stay</span></DropdownMenuItem></>)}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDownloadInvoice(b)}><Download className="w-4 h-4 mr-2" /><span>Download Invoice</span></DropdownMenuItem>
                                      {!isCheckedOut && !isCancelled && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => cancelBooking(b.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><LogOut className="w-4 h-4 mr-2 rotate-180" /><span>Cancel Booking</span></DropdownMenuItem></>)}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        }

                        // ── GROUP BOOKING BLOCK ──────────────────────────────
                        const { groupId, groupReference, billingContact, bookings: grpBookings } = item

                        // Derive aggregate status
                        const allStatuses = grpBookings.map(b => b.status)
                        const allCheckedOut = allStatuses.every(s => s === 'checked-out')
                        const allCheckedIn = allStatuses.every(s => s === 'checked-in')
                        const allConfirmed = allStatuses.every(s => s === 'confirmed')
                        const anyCheckedIn = allStatuses.some(s => s === 'checked-in')
                        const groupTotal = grpBookings.reduce((sum, b) => sum + getBookingTotal(b), 0)

                        // Date range across all bookings
                        const earliestCheckIn = grpBookings.map(b => b.checkIn).sort()[0]
                        const latestCheckOut = grpBookings.map(b => b.checkOut).sort().reverse()[0]

                        // Primary booking (has billing contact + group charges)
                        const primaryBooking = grpBookings.find(b => (b as any).isPrimaryBooking) || grpBookings[0]
                        const billingName = billingContact?.fullName || billingContact?.name || guestMap.get(primaryBooking.guestId)?.name || 'Group'

                        // Can check out group only if ALL rooms are checked-in
                        const canCheckOutGroup = allCheckedIn
                        // Can show pre-invoice if not all checked-out
                        const canShowPreInvoice = !allCheckedOut
                        const isGroupDownloading = grpBookings.some(b => downloadingInvoice === b.id)
                        const primaryRoomNumbers = grpBookings.map(b => `${roomMap.get(b.roomId)?.roomNumber || '?'}`).join(', ')

                        return [
                          // ── Group header row ──
                          <TableRow key={`grp-header-${groupId}`} className="bg-amber-500/8 border-l-[3px] border-l-amber-500/60 hover:bg-amber-500/12 transition-colors">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="font-bold text-xs text-amber-400 font-mono tracking-wide">{groupReference}</span>
                              </div>
                              <div className="text-[10px] text-amber-500/70 mt-0.5">{grpBookings.length} rooms</div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="font-semibold text-sm text-foreground">{billingName}</div>
                              <div className="text-[10px] text-muted-foreground">Group billing contact</div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="text-xs text-muted-foreground">Rooms:</div>
                              <div className="text-sm font-medium">{primaryRoomNumbers}</div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex flex-col text-sm">
                                <span className="font-medium">{format(parseISO(earliestCheckIn), 'MMM dd')} <span className="text-muted-foreground">–</span> {format(parseISO(latestCheckOut), 'MMM dd')}</span>
                                <span className="text-xs text-muted-foreground">{format(parseISO(latestCheckOut), 'yyyy')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <div className="font-bold text-sm text-amber-400">{formatCurrencySync(groupTotal, currency)}</div>
                              <div className="text-[10px] text-muted-foreground">group total</div>
                            </TableCell>
                            <TableCell className="py-3">
                              {allCheckedOut
                                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ring-inset bg-slate-500/15 text-slate-300 border-slate-500/30 ring-slate-500/10">Checked Out</span>
                                : allCheckedIn
                                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ring-inset bg-sky-500/15 text-sky-300 border-sky-500/30 ring-sky-500/10">Checked In</span>
                                : anyCheckedIn
                                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ring-inset bg-amber-500/15 text-amber-400 border-amber-500/30 ring-amber-500/10">Partial</span>
                                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ring-inset bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-emerald-500/10">Confirmed</span>
                              }
                            </TableCell>
                            <TableCell className="py-3 text-[10px] text-muted-foreground">
                              {grpBookings.map(b => {
                                const m = b.paymentMethod
                                return m && m !== 'Not Paid' ? m : null
                              }).filter(Boolean)[0] || '—'}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {canCheckOutGroup && (
                                  <Button size="sm" variant="outline" onClick={() => setGroupCheckoutDialog(grpBookings)} disabled={processing} className="h-8 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs">
                                    <LogOut className="w-3.5 h-3.5 mr-1" /> Check Out Group
                                  </Button>
                                )}
                                {allCheckedOut && (
                                  <Button size="sm" variant="ghost" onClick={() => handleGroupInvoiceDownload(primaryBooking, grpBookings)} disabled={isGroupDownloading} className="h-8 text-amber-400 hover:text-amber-300">
                                    {isGroupDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500/70 hover:text-amber-400"><MoreHorizontal className="w-4 h-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[200px]">
                                    <DropdownMenuLabel className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-amber-500" />{groupReference}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setManageGroupDialog({ groupId, groupReference })}>
                                      <Settings className="w-4 h-4 mr-2 text-blue-500" /><span>Manage Group</span>
                                    </DropdownMenuItem>
                                    {canShowPreInvoice && (
                                      <DropdownMenuItem onClick={() => handleGroupPreInvoice(primaryBooking, grpBookings)} disabled={isGroupDownloading}>
                                        <Receipt className="w-4 h-4 mr-2 text-amber-500" /><span>Download Pre-Invoice</span>
                                      </DropdownMenuItem>
                                    )}
                                    {allCheckedOut && (
                                      <DropdownMenuItem onClick={() => handleGroupInvoiceDownload(primaryBooking, grpBookings)} disabled={isGroupDownloading}>
                                        <Download className="w-4 h-4 mr-2 text-amber-500" /><span>Download Group Invoice</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canCheckOutGroup && (
                                      <DropdownMenuItem onClick={() => setGroupCheckoutDialog(grpBookings)}>
                                        <LogOut className="w-4 h-4 mr-2 text-rose-500" /><span>Check Out Group</span>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>,

                          // ── Sub-rows for each room in the group ──
                          ...grpBookings.map((b, idx) => {
                            const guest = guestMap.get(b.guestId)
                            const room = roomMap.get(b.roomId)
                            const canShowCheckIn = canCheckIn(b)
                            const canShowCheckOut = canCheckOut(b)
                            const isCheckedOut = b.status === 'checked-out'
                            const isLast = idx === grpBookings.length - 1
                            return (
                              <TableRow key={b.id} className={`bg-amber-500/3 border-l-[3px] border-l-amber-500/25 hover:bg-amber-500/8 transition-colors ${!isLast ? 'border-b border-amber-500/10' : 'border-b-2 border-b-amber-500/20'}`}>
                                <TableCell className="py-2 pl-6">
                                  <div className="font-mono text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded w-fit">
                                    #{b.id.slice(-8)}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm text-foreground">{guest?.name || 'Guest'}</span>
                                    {guest?.email && <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{guest.email}</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">Room {room?.roomNumber || 'N/A'}</span>
                                    <span className="text-[10px] text-muted-foreground capitalize">{roomTypeMap.get(room?.roomTypeId)?.name || ''}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col text-xs text-muted-foreground">
                                    <span>{format(parseISO(b.checkIn), 'MMM dd')} – {format(parseISO(b.checkOut), 'MMM dd')}</span>
                                    <span>{calculateNights(b.checkIn, b.checkOut)} nights</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-2 text-sm font-medium">{formatCurrencySync(getBookingTotal(b), currency)}</TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <StatusBadge status={b.status} />
                                    {(b as any).source === 'online' && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/25">Online</span>
                                    )}
                                    {((b as any).source === 'voice_agent' || (b.specialRequests || '').includes('[Voice Agent Booking]')) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25">Voice</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  {(() => {
                                    const method = b.paymentMethod || 'Not Paid'
                                    const isUnpaid = !method || method === 'Not Paid' || method === 'Not paid' || method === 'not_paid'
                                    return isUnpaid
                                      ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-semibold border border-red-500/15"><Ban className="w-2.5 h-2.5" />Unpaid</span>
                                      : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100"><CheckCircle2 className="w-2.5 h-2.5" />{method === 'Credit/Debit Card' ? 'Card' : method === 'mobile_money' ? 'Momo' : method}</span>
                                  })()}
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {canShowCheckIn && <Button size="sm" onClick={() => setCheckInDialog(b)} className="h-7 text-xs shadow-sm"><LogIn className="w-3 h-3 mr-1" /> Check In</Button>}
                                    {canShowCheckOut && <Button size="sm" variant="outline" onClick={() => setCheckOutDialog(b)} className="h-7 border-primary/20 text-primary hover:bg-primary/5 text-xs"><LogOut className="w-3 h-3 mr-1" /> Check Out</Button>}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-[180px]">
                                        <DropdownMenuLabel className="text-xs">Room {room?.roomNumber}</DropdownMenuLabel>
                                        {canShowCheckOut && (<><DropdownMenuItem onClick={() => setChargesDialog(b)}><Receipt className="w-3.5 h-3.5 mr-2" /><span>Add Charges</span></DropdownMenuItem><DropdownMenuItem onClick={() => setExtendStayDialog(b)}><CalendarPlus className="w-3.5 h-3.5 mr-2" /><span>Extend Stay</span></DropdownMenuItem><DropdownMenuSeparator /></>)}
                                        {isCheckedOut && <DropdownMenuItem onClick={() => handleGroupInvoiceDownload(primaryBooking, grpBookings)}><Download className="w-3.5 h-3.5 mr-2 text-amber-500" /><span>Group Invoice</span></DropdownMenuItem>}
                                        {!isCheckedOut && <DropdownMenuItem onClick={() => cancelBooking(b.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><LogOut className="w-3.5 h-3.5 mr-2 rotate-180" /><span>Cancel Room</span></DropdownMenuItem>}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ]
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div >
    </>
  )
}

export default ReservationsPage
