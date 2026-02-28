import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from '@/components/icons'
import { toast } from 'sonner'
import { formatCurrencySync } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import { BookingCharge } from '@/types'
import { bookingChargesService, CHARGE_CATEGORIES } from '@/services/booking-charges-service'
import { calculateNights } from '@/lib/display'

interface CheckOutDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    booking: any
    room: any
    guest: any
    onConfirm: () => Promise<void>
    processing?: boolean
}

export function CheckOutDialog({
    open,
    onOpenChange,
    booking,
    room,
    guest,
    onConfirm,
    processing = false
}: CheckOutDialogProps) {
    const { currency } = useCurrency()
    const [charges, setCharges] = useState<BookingCharge[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch charges when dialog opens
    useEffect(() => {
        if (open && booking) {
            setLoading(true)
            const bookingId = booking.remoteId || booking.id || booking._id
            bookingChargesService.getChargesForBooking(bookingId)
                .then(data => setCharges(data))
                .catch(err => {
                    console.error('Failed to fetch checkout charges:', err)
                    setCharges([])
                })
                .finally(() => setLoading(false))
        } else {
            setCharges([])
        }
    }, [open, booking])

    if (!booking) return null

    // Extract discount applied at check-in (persisted in specialRequests or direct field)
    const discountAtCheckIn = (() => {
        if (booking.discountAmount && booking.discountAmount > 0) return booking.discountAmount
        const sr = booking.special_requests || booking.specialRequests || ''
        const dm = sr.match?.(/<!-- DISCOUNT_DATA:(.*?) -->/)
        if (dm) {
            try { return JSON.parse(dm[1]).discountAmount || 0 } catch { return 0 }
        }
        return 0
    })()
    const discountReasonAtCheckIn = (() => {
        const sr = booking.special_requests || booking.specialRequests || ''
        const dm = sr.match?.(/<!-- DISCOUNT_DATA:(.*?) -->/)
        if (dm) {
            try { return JSON.parse(dm[1]).discountReason || null } catch { return null }
        }
        return null
    })()

    // Calculate totals
    const roomCost = booking.totalPrice || 0
    const chargesTotal = charges.reduce((sum, c) => sum + (c.amount || 0), 0)
    const priorAmountPaid = (() => {
        if (booking.amountPaid) return booking.amountPaid
        const sr = booking.special_requests || booking.specialRequests || ''
        const pm = sr.match?.(/<!-- PAYMENT_DATA:(.*?) -->/)
        if (pm) {
            try { return JSON.parse(pm[1]).amountPaid || 0 } catch { return 0 }
        }
        return 0
    })()
    const priorPaymentStatus = (() => {
        if (booking.paymentStatus) return booking.paymentStatus
        const sr = booking.special_requests || booking.specialRequests || ''
        const pm = sr.match?.(/<!-- PAYMENT_DATA:(.*?) -->/)
        if (pm) {
            try { return JSON.parse(pm[1]).paymentStatus || 'pending' } catch { return 'pending' }
        }
        return 'pending'
    })()
    const totalBeforePayment = Math.max(0, roomCost - discountAtCheckIn) + chargesTotal
    const remainingBalance = Math.max(0, totalBeforePayment - priorAmountPaid)

    // Get values from booking (handle different data shapes)
    const guestName = guest?.name || booking.guestName || 'Guest'
    const roomNumber = room?.roomNumber || booking.roomNumber || 'N/A'
    const checkIn = booking.checkIn || booking.dates?.checkIn
    const checkOut = booking.checkOut || booking.dates?.checkOut
    const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 1

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm Guest Check-Out</DialogTitle>
                    <DialogDescription>
                        Complete the checkout process and create cleaning task
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Guest & Room Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Guest Name</p>
                            <p className="text-base font-semibold">{guestName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Room Number</p>
                            <p className="text-base font-semibold">{roomNumber}</p>
                        </div>
                    </div>

                    {/* Dates Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Stay Duration</p>
                            <p className="text-base">{nights} nights</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Room Cost</p>
                            <p className="text-base font-semibold">
                                {formatCurrencySync(roomCost, currency)}
                            </p>
                        </div>
                    </div>

                    {/* Discount Applied at Check-In */}
                    {discountAtCheckIn > 0 && (
                        <div className="rounded-lg border border-violet-500/25 bg-violet-500/8 p-3 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-violet-400">🏷 Discount Applied at Check-In</span>
                                {discountReasonAtCheckIn && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 capitalize">
                                        {discountReasonAtCheckIn}
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-violet-400/80">Discount Amount:</span>
                                <span className="font-bold text-violet-400">-{formatCurrencySync(discountAtCheckIn, currency)}</span>
                            </div>
                        </div>
                    )}

                    {/* Prior Payment Info */}
                    {priorAmountPaid > 0 && (
                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 p-3 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-emerald-400">💰 Prior Payment</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorPaymentStatus === 'full' ? 'bg-emerald-500/15 text-emerald-400' :
                                    priorPaymentStatus === 'part' ? 'bg-amber-500/15 text-amber-400' :
                                        'bg-red-500/15 text-red-400'
                                    }`}>
                                    {priorPaymentStatus === 'full' ? 'Paid in Full' :
                                        priorPaymentStatus === 'part' ? 'Part Payment' : 'Pending'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-400/80">Amount Already Paid:</span>
                                <span className="font-bold text-emerald-400">{formatCurrencySync(priorAmountPaid, currency)}</span>
                            </div>
                        </div>
                    )}

                    {/* Charges Summary */}
                    {loading ? (
                        <div className="flex items-center gap-2 py-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading charges...
                        </div>
                    ) : charges.length > 0 && (
                        <div className="rounded-lg border p-4 space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">Additional Charges</p>
                            <div className="space-y-2">
                                {charges.map(charge => (
                                    <div key={charge.id} className="flex justify-between text-sm">
                                        <span>{charge.description} ({charge.quantity}×)</span>
                                        <span className="font-medium">{formatCurrencySync(charge.amount, currency)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-2 flex justify-between font-medium">
                                <span>Additional Charges Total</span>
                                <span className="text-primary">
                                    {formatCurrencySync(chargesTotal, currency)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Grand Total / Remaining Balance */}
                    {!loading && (
                        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Room Cost:</span>
                                <span>{formatCurrencySync(roomCost, currency)}</span>
                            </div>
                            {discountAtCheckIn > 0 && (
                                <div className="flex justify-between text-sm text-violet-400">
                                    <span>Discount Applied:</span>
                                    <span>-{formatCurrencySync(discountAtCheckIn, currency)}</span>
                                </div>
                            )}
                            {chargesTotal > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Additional Charges:</span>
                                    <span>+{formatCurrencySync(chargesTotal, currency)}</span>
                                </div>
                            )}
                            {priorAmountPaid > 0 && (
                                <div className="flex justify-between text-sm text-emerald-400">
                                    <span>Already Paid:</span>
                                    <span>-{formatCurrencySync(priorAmountPaid, currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center border-t pt-2">
                                <span className="font-medium">
                                    {priorAmountPaid > 0 ? 'Remaining Balance' : 'Grand Total'}
                                </span>
                                <span className={`text-xl font-bold ${remainingBalance > 0 ? 'text-amber-500' : 'text-emerald-400'}`}>
                                    {formatCurrencySync(remainingBalance, currency)}
                                </span>
                            </div>
                            {remainingBalance === 0 && (priorAmountPaid > 0 || discountAtCheckIn > 0) && (
                                <p className="text-xs text-emerald-400 font-medium">✓ Fully settled — no balance to collect</p>
                            )}
                        </div>
                    )}

                    {/* What happens next */}
                    <div className="rounded-lg bg-sky-500/8 p-4 border border-sky-500/25">
                        <p className="text-sm font-medium text-sky-300">What happens next?</p>
                        <ul className="mt-2 text-sm text-sky-400/80 space-y-1">
                            <li>✓ Booking status updated to "Checked-Out"</li>
                            <li>✓ Room status set to "Cleaning"</li>
                            <li>✓ Housekeeping task automatically created</li>
                            <li>✓ Invoice generated with all charges</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={processing}>
                        {processing ? 'Processing...' : 'Confirm Check-Out'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
