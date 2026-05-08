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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit2, DollarSign, X, Check, Loader2 } from '@/components/icons'
import { toast } from 'sonner'
import { formatCurrencySync } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import { BookingCharge, ChargeCategory } from '@/types'
import { bookingChargesService, CHARGE_CATEGORIES, CreateChargeData } from '@/services/booking-charges-service'
import { inventoryService, type InventoryItem } from '@/services/inventory-service'
import { blink } from '@/blink/client'

interface GuestChargesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    booking: any
    guest: any
    isCheckoutMode?: boolean // If true, charges are read-only
    onChargesUpdated?: () => void
}

export function GuestChargesDialog({
    open,
    onOpenChange,
    booking,
    guest,
    isCheckoutMode = false,
    onChargesUpdated
}: GuestChargesDialogProps) {
    const { currency } = useCurrency()
    const [charges, setCharges] = useState<BookingCharge[]>([])
    const [loading, setLoading] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingChargeId, setEditingChargeId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState<ChargeCategory>('food_beverage')
    const [quantity, setQuantity] = useState(1)
    const [unitPrice, setUnitPrice] = useState(0)
    const [notes, setNotes] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash')

    // Inventory linkage
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
    const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>('none')

    // Fetch charges + inventory when dialog opens
    useEffect(() => {
        if (open && booking) {
            fetchCharges()
            inventoryService.getItems().then(setInventoryItems).catch(() => setInventoryItems([]))
        }
    }, [open, booking])

    const fetchCharges = async () => {
        if (!booking) return
        setLoading(true)
        try {
            const bookingId = booking.remoteId || booking.id
            const data = await bookingChargesService.getChargesForBooking(bookingId)
            setCharges(data)
        } catch (error) {
            console.error('Failed to fetch charges:', error)
            toast.error('Failed to load charges')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setDescription('')
        setCategory('food_beverage')
        setQuantity(1)
        setUnitPrice(0)
        setNotes('')
        setPaymentMethod('cash')
        setEditingChargeId(null)
        setShowAddForm(false)
        setSelectedInventoryItemId('none')
    }

    const handleAddCharge = async () => {
        if (!description.trim()) {
            toast.error('Please enter a description')
            return
        }
        if (unitPrice <= 0) {
            toast.error('Please enter a valid price')
            return
        }

        setSubmitting(true)
        try {
            const bookingId = booking.remoteId || booking.id
            const chargeData: CreateChargeData = {
                bookingId,
                description: description.trim(),
                category,
                quantity,
                unitPrice,
                notes: notes.trim() || undefined,
                paymentMethod,
            }

            await bookingChargesService.addCharge(chargeData)

            // If a real inventory item was selected, decrement stock and
            // create an inventory_logs entry — that feed is what the recent-stock
            // panel reads from.
            if (selectedInventoryItemId && selectedInventoryItemId !== 'none') {
                const item = inventoryItems.find(i => i.id === selectedInventoryItemId)
                if (item) {
                    if (item.stockQuantity < quantity) {
                        toast.error(`Only ${item.stockQuantity} of ${item.name} in stock — charge created but stock not adjusted`)
                    } else {
                        try {
                            const user = await blink.auth.me().catch(() => null)
                            await inventoryService.adjustStock(
                                item.id,
                                -quantity,
                                'sale',
                                user?.id || 'system',
                                (user as any)?.email || 'Staff',
                                `Guest purchase — Booking ${bookingId} (${description.trim()})`
                            )
                            // Refresh local copy so the picker reflects new stock
                            const updated = await inventoryService.getItems()
                            setInventoryItems(updated)
                        } catch (stockErr: any) {
                            console.error('[GuestCharges] Stock adjust failed:', stockErr)
                            toast.error(`Stock adjustment failed: ${stockErr?.message || 'Unknown error'}`)
                        }
                    }
                }
            }

            toast.success('Charge added successfully')
            resetForm()
            fetchCharges()
            onChargesUpdated?.()
        } catch (error: any) {
            console.error('Failed to add charge:', error)
            toast.error(error.message || 'Failed to add charge')
        } finally {
            setSubmitting(false)
        }
    }

    const handleEditCharge = async (chargeId: string) => {
        setSubmitting(true)
        try {
            await bookingChargesService.updateCharge(chargeId, {
                description: description.trim(),
                category,
                quantity,
                unitPrice,
                notes: notes.trim() || undefined
            })
            toast.success('Charge updated successfully')
            resetForm()
            fetchCharges()
            onChargesUpdated?.()
        } catch (error: any) {
            console.error('Failed to update charge:', error)
            toast.error(error.message || 'Failed to update charge')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteCharge = async (chargeId: string) => {
        if (!confirm('Are you sure you want to delete this charge?')) return

        try {
            await bookingChargesService.deleteCharge(chargeId)
            toast.success('Charge deleted')
            fetchCharges()
            onChargesUpdated?.()
        } catch (error: any) {
            console.error('Failed to delete charge:', error)
            toast.error(error.message || 'Failed to delete charge')
        }
    }

    const startEditCharge = (charge: BookingCharge) => {
        setDescription(charge.description)
        setCategory(charge.category)
        setQuantity(charge.quantity)
        setUnitPrice(charge.unitPrice)
        setNotes(charge.notes || '')
        setPaymentMethod((charge as any).paymentMethod || 'cash')
        setEditingChargeId(charge.id)
        setShowAddForm(true)
    }

    const totalCharges = charges.reduce((sum, c) => sum + (c.amount || 0), 0)
    const roomCost = booking?.totalPrice || 0
    const grandTotal = roomCost + totalCharges
    const isCheckedOut = booking?.status === 'checked-out'
    const canEdit = !isCheckoutMode && !isCheckedOut

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Guest Charges - {guest?.name || 'Guest'}
                    </DialogTitle>
                    <DialogDescription>
                        Room {booking?.roomNumber || 'N/A'} •
                        {booking?.checkIn && ` ${format(new Date(booking.checkIn), 'MMM d')} - `}
                        {booking?.checkOut && format(new Date(booking.checkOut), 'MMM d, yyyy')}
                    </DialogDescription>
                </DialogHeader>

                {/* Summary Card */}
                <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Room Cost</p>
                                <p className="text-lg font-semibold">{formatCurrencySync(roomCost, currency)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Additional Charges</p>
                                <p className="text-lg font-semibold text-primary">{formatCurrencySync(totalCharges, currency)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Grand Total</p>
                                <p className="text-xl font-bold">{formatCurrencySync(grandTotal, currency)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Add/Edit Charge Form */}
                {canEdit && (
                    <>
                        {!showAddForm ? (
                            <Button
                                variant="outline"
                                onClick={() => setShowAddForm(true)}
                                className="w-full"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Charge
                            </Button>
                        ) : (
                            <Card>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">
                                            {editingChargeId ? 'Edit Charge' : 'Add New Charge'}
                                        </h4>
                                        <Button variant="ghost" size="sm" onClick={resetForm}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Inventory item picker — when chosen, auto-fills the
                                            description/price/category and decrements stock on save */}
                                        {!editingChargeId && inventoryItems.length > 0 && (
                                            <div className="col-span-2">
                                                <Label htmlFor="inventoryItem">Inventory Item (optional)</Label>
                                                <Select
                                                    value={selectedInventoryItemId}
                                                    onValueChange={(v) => {
                                                        setSelectedInventoryItemId(v)
                                                        if (v && v !== 'none') {
                                                            const item = inventoryItems.find(i => i.id === v)
                                                            if (item) {
                                                                setDescription(item.name)
                                                                setUnitPrice(Number(item.unitPrice) || 0)
                                                                if (item.category) {
                                                                    setCategory(item.category as ChargeCategory)
                                                                }
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger id="inventoryItem">
                                                        <SelectValue placeholder="None — manual entry" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None — manual entry</SelectItem>
                                                        {inventoryItems.map(item => (
                                                            <SelectItem key={item.id} value={item.id} disabled={item.stockQuantity <= 0}>
                                                                {item.name} — {item.stockQuantity} in stock
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="col-span-2">
                                            <Label htmlFor="description">Description</Label>
                                            <Input
                                                id="description"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="e.g., Room Service - Jollof Rice"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="category">Category</Label>
                                            <Select value={category} onValueChange={(v) => setCategory(v as ChargeCategory)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(CHARGE_CATEGORIES)
                                                        .filter(([key]) => key !== 'room_extension')
                                                        .map(([key, label]) => (
                                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label htmlFor="quantity">Quantity</Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                min={1}
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="unitPrice">Unit Price</Label>
                                            <Input
                                                id="unitPrice"
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                value={unitPrice}
                                                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div>
                                            <Label>Amount</Label>
                                            <p className="text-lg font-semibold mt-2">
                                                {formatCurrencySync(quantity * unitPrice, currency)}
                                            </p>
                                        </div>

                                        <div className="col-span-2">
                                            <Label htmlFor="paymentMethod">Payment Method</Label>
                                            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                                                <SelectTrigger id="paymentMethod">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                                    <SelectItem value="card">Card</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-2">
                                            <Label htmlFor="notes">Notes (Optional)</Label>
                                            <Textarea
                                                id="notes"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Any additional notes..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" onClick={resetForm}>
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => editingChargeId
                                                ? handleEditCharge(editingChargeId)
                                                : handleAddCharge()
                                            }
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4 mr-2" />
                                            )}
                                            {editingChargeId ? 'Update' : 'Add'} Charge
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* Charges List */}
                <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                        Charges ({charges.length})
                    </h4>

                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : charges.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground">
                            No additional charges recorded
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {charges.map((charge) => (
                                <div
                                    key={charge.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{charge.description}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {CHARGE_CATEGORIES[charge.category]}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {charge.quantity} × {formatCurrencySync(charge.unitPrice, currency)}
                                            {(charge as any).paymentMethod && ` • ${{ cash: 'Cash', mobile_money: 'MoMo', card: 'Card' }[(charge as any).paymentMethod] || (charge as any).paymentMethod}`}
                                            {charge.notes && ` • ${charge.notes}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">
                                            {formatCurrencySync(charge.amount, currency)}
                                        </span>
                                        {canEdit && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => startEditCharge(charge)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteCharge(charge.id)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
