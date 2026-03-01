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

    const getPlaceholderForType = (type: ServiceRequestType | null): string => {
        switch (type) {
            case 'housekeeping': return 'E.g. Please clean my room and replace the bed sheets.'
            case 'amenity': return 'E.g. I need 2 extra pillows and extra towels.'
            case 'food': return 'E.g. I would like a club sandwich and a cold drink delivered to my room.'
            case 'transport': return 'E.g. I need a taxi to the airport at 5:00 PM tomorrow.'
            case 'problem': return 'E.g. The air conditioning in my room is not working properly.'
            case 'other': return 'E.g. I would like to request a late checkout at 2:00 PM.'
            default: return 'Select a service above, then describe what you need...'
        }
    }

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
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <CalendarCheck className="w-5 h-5 text-primary" />
                        Request Service
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium">
                        Select the type of service you need and provide any additional details.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                        {REQUEST_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${selectedType === type.id
                                    ? 'border-primary bg-primary/10 text-primary scale-[1.03] shadow-md'
                                    : 'border-muted bg-card hover:bg-accent/50 hover:border-accent-foreground/30 hover:scale-[1.02] hover:shadow-sm cursor-pointer text-foreground'
                                    }`}
                            >
                                <span className="text-3xl mb-2">{type.icon}</span>
                                <span className="text-sm font-bold text-center">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2 mt-2">
                        <label className="text-sm font-bold text-foreground">Additional Details (Optional)</label>
                        <Textarea
                            placeholder={getPlaceholderForType(selectedType)}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="resize-none text-sm"
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
