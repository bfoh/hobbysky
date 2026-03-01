import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { submitGuestRequest } from '../../services/guest-services'
import { CalendarCheck, Loader2 } from '@/components/icons'

// Mirror the ENUM from the database
export type ServiceRequestType = 'housekeeping' | 'food' | 'transport' | 'problem' | 'amenity' | 'other'

interface SubmitRequestDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bookingToken: string
}

const REQUEST_TYPES: { id: ServiceRequestType; label: string; icon: string }[] = [
    { id: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
    { id: 'amenity', label: 'Extra Amenities', icon: '🧴' },
    { id: 'food', label: 'Food & Beverage', icon: '🍽️' },
    { id: 'transport', label: 'Transport', icon: '🚕' },
    { id: 'problem', label: 'Report Issue', icon: '⚠️' },
    { id: 'other', label: 'Other', icon: '🛎️' },
]

export function SubmitRequestDialog({ open, onOpenChange, bookingToken }: SubmitRequestDialogProps) {
    const [selectedType, setSelectedType] = useState<ServiceRequestType | null>(null)
    const [details, setDetails] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!selectedType) {
            toast.error('Please select a request type.')
            return
        }

        setIsSubmitting(true)
        try {
            const { success, error } = await submitGuestRequest(bookingToken, selectedType, details)

            if (success) {
                toast.success('Request sent successfully! Staff will attend to you shortly.')
                // Reset form
                setSelectedType(null)
                setDetails('')
                onOpenChange(false)
            } else {
                toast.error(error || 'Failed to submit request.')
            }
        } catch (err) {
            console.error('Submit request error:', err)
            toast.error('A network error occurred.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-primary" />
                        Request Service
                    </DialogTitle>
                    <DialogDescription>
                        Select the type of service you need and provide any additional details.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                        {REQUEST_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${selectedType === type.id
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-muted bg-card hover:bg-muted/50 cursor-pointer text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <span className="text-2xl mb-2">{type.icon}</span>
                                <span className="text-xs font-medium text-center">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2 mt-2">
                        <label className="text-sm font-medium">Additional Details (Optional)</label>
                        <Textarea
                            placeholder="E.g. I need 2 extra pillows, please."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-end">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!selectedType || isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
