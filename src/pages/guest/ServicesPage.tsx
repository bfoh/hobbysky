import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { BellRing, Car, Utensils, Hammer, Loader2 } from '@/components/icons'
import { toast } from 'sonner'
import { RequestHistory, ServiceRequest } from '../../components/guest/RequestHistory'

export function ServicesPage() {
    const { token } = useParams<{ token: string }>()
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState<string>('')
    const [details, setDetails] = useState('')
    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [fetchingHistory, setFetchingHistory] = useState(true)

    const fetchHistory = async () => {
        if (!token) return
        try {
            const res = await fetch(`/.netlify/functions/get-guest-requests?token=${token}`)
            const data = await res.json()
            if (data.success) {
                setRequests(data.requests)
            }
        } catch (error) {
            console.error("Failed to fetch history", error)
        } finally {
            setFetchingHistory(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!token) {
            toast.error("Invalid session. Please scan QR code again.")
            return
        }

        if (!type) {
            toast.error("Please select a service type")
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/.netlify/functions/submit-guest-request', {
                method: 'POST',
                body: JSON.stringify({ token, type, details })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                toast.success("Request received! We'll be with you shortly.")
                setType('')
                setDetails('')
                fetchHistory()
            } else {
                toast.error(data.error || "Failed to submit request")
            }

        } catch (err) {
            console.error(err)
            toast.error("Network error. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            <div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Guest Services</h2>
                <p className="text-base text-neutral-300 font-medium mt-1">How can we make your stay better?</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <ServiceCard
                    icon={<BellRing className="w-8 h-8" />}
                    label="Housekeeping"
                    subtitle="Clean, towels, supplies"
                    active={type === 'housekeeping'}
                    onClick={() => setType('housekeeping')}
                />
                <ServiceCard
                    icon={<Car className="w-8 h-8" />}
                    label="Transport"
                    subtitle="Taxi, shuttle, pickup"
                    active={type === 'transport'}
                    onClick={() => setType('transport')}
                />
                <ServiceCard
                    icon={<Utensils className="w-8 h-8" />}
                    label="In-Room Dining"
                    subtitle="Food & drinks to room"
                    active={type === 'food'}
                    onClick={() => setType('food')}
                />
                <ServiceCard
                    icon={<Hammer className="w-8 h-8" />}
                    label="Report Issue"
                    subtitle="Maintenance & repairs"
                    active={type === 'problem'}
                    onClick={() => setType('problem')}
                />
            </div>

            <Card className="border border-[#2a3a2e] bg-[#162019] shadow-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500/60" />
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-white">
                        {type ? `${getTypeLabel(type)} Request` : 'Request Form'}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-neutral-300">
                        {type ? `Describe what you need for ${getTypeLabel(type).toLowerCase()}.` : 'Select a category above to get started.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!['housekeeping', 'transport', 'food', 'problem'].includes(type) && type !== '' && (
                            <div className="space-y-2">
                                <Label className="font-bold text-neutral-200">Service Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="bg-[#1e2e24] border-[#3a4f3e] text-white">
                                        <SelectValue placeholder="Select type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="amenity">Amenity Request</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="details" className="font-bold text-neutral-200">Details / Special Instructions</Label>
                            <Textarea
                                id="details"
                                placeholder={getPlaceholder(type)}
                                className="min-h-[100px] text-sm font-medium bg-[#1e2e24] border-[#3a4f3e] text-white placeholder:text-neutral-500 focus:border-amber-500 focus:ring-amber-500/30"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md hover:shadow-lg transition-all duration-200"
                            size="lg"
                            disabled={loading || !type}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            Submit Request
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <RequestHistory requests={requests} loading={fetchingHistory} />
        </div>
    )
}

function ServiceCard({ icon, label, subtitle, active, onClick }: any) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#0c1a12]
                ${active
                    ? 'border-amber-500/50 bg-[#1a3a2a] shadow-[0_10px_40px_-10px_rgba(26,58,42,0.6)] scale-[1.03]'
                    : 'border-[#2a3a2e] bg-[#162019] hover:border-amber-500/30 hover:shadow-lg hover:-translate-y-1'
                }
            `}
        >
            <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 flex-shrink-0 transition-all duration-300 ${active
                        ? 'scale-110 shadow-[0_0_0_3px_#d4a017,inset_0_2px_4px_rgba(0,0,0,0.35)]'
                        : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]'
                    }`}
                style={{ background: 'linear-gradient(145deg, #1E3D22, #152d18)' }}
            >
                <div className="text-amber-400 transition-colors duration-300">
                    {icon}
                </div>
            </div>
            <span className={`text-[15px] font-extrabold tracking-tight transition-colors duration-300 
                ${active ? 'text-white' : 'text-neutral-200'}
            `}>
                {label}
            </span>
            <span className={`text-[11px] uppercase tracking-wider mt-1.5 text-center font-bold transition-colors duration-300 
                ${active ? 'text-amber-400' : 'text-neutral-400'}
            `}>
                {subtitle}
            </span>
        </button>
    )
}

function getTypeLabel(type: string) {
    switch (type) {
        case 'housekeeping': return 'Housekeeping'
        case 'transport': return 'Transport'
        case 'food': return 'In-Room Dining'
        case 'problem': return 'Issue Report'
        default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
}

function getPlaceholder(type: string) {
    switch (type) {
        case 'housekeeping': return "E.g. Please clean my room and provide extra towels..."
        case 'transport': return "E.g. I need a taxi to the airport at 5:00 PM..."
        case 'food': return "E.g. I'd like a club sandwich and cold drink to Room 102..."
        case 'problem': return "E.g. The air conditioning is not working properly..."
        default: return "Select a category above, then describe what you need..."
    }
}
