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
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Guest Services</h2>
                <p className="text-base text-gray-600 font-medium mt-1">How can we make your stay better?</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <ServiceCard
                    icon={<BellRing className="w-9 h-9 text-amber-500 drop-shadow-sm" />}
                    label="Housekeeping"
                    subtitle="Clean, towels, supplies"
                    active={type === 'housekeeping'}
                    onClick={() => setType('housekeeping')}
                    activeColor="gold"
                    iconBg="bg-amber-50/50"
                />
                <ServiceCard
                    icon={<Car className="w-9 h-9 text-amber-500 drop-shadow-sm" />}
                    label="Transport"
                    subtitle="Taxi, shuttle, pickup"
                    active={type === 'transport'}
                    onClick={() => setType('transport')}
                    activeColor="gold"
                    iconBg="bg-amber-50/50"
                />
                <ServiceCard
                    icon={<Utensils className="w-9 h-9 text-amber-500 drop-shadow-sm" />}
                    label="In-Room Dining"
                    subtitle="Food & drinks to room"
                    active={type === 'food'}
                    onClick={() => setType('food')}
                    activeColor="gold"
                    iconBg="bg-amber-50/50"
                />
                <ServiceCard
                    icon={<Hammer className="w-9 h-9 text-amber-500 drop-shadow-sm" />}
                    label="Report Issue"
                    subtitle="Maintenance & repairs"
                    active={type === 'problem'}
                    onClick={() => setType('problem')}
                    activeColor="gold"
                    iconBg="bg-amber-50/50"
                />
            </div>

            <Card className="border-0 shadow-lg ring-1 ring-black/5">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900">
                        {type ? `${getTypeLabel(type)} Request` : 'Request Form'}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-gray-600">
                        {type ? `Describe what you need for ${getTypeLabel(type).toLowerCase()}.` : 'Select a category above to get started.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!['housekeeping', 'transport', 'food', 'problem'].includes(type) && type !== '' && (
                            <div className="space-y-2">
                                <Label className="font-bold text-gray-800">Service Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
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
                            <Label htmlFor="details" className="font-bold text-gray-800">Details / Special Instructions</Label>
                            <Textarea
                                id="details"
                                placeholder={getPlaceholder(type)}
                                className="min-h-[100px] text-sm font-medium"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg transition-all duration-200" size="lg" disabled={loading || !type}>
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

function ServiceCard({ icon, label, subtitle, active, onClick, activeColor, iconBg }: any) {
    const colorMap: Record<string, string> = {
        gold: 'border-amber-400 bg-gradient-to-br from-amber-50/50 to-amber-100/30 shadow-[0_8px_30px_rgb(212,160,23,0.12)]',
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center justify-center py-5 px-3 rounded-2xl border transition-all duration-300 group
                ${active
                    ? `${colorMap[activeColor] || 'border-amber-400 bg-amber-50'} scale-[1.03] ring-1 ring-amber-400/50`
                    : 'border-gray-100 bg-white hover:bg-gray-50/50 hover:border-amber-200/60 hover:shadow-lg hover:scale-[1.02]'
                }
            `}
        >
            <div className={`p-4 rounded-2xl mb-3 transition-all duration-300 
                ${active ? 'bg-amber-100/80 scale-110 shadow-inner' : `${iconBg} group-hover:bg-amber-100/50 group-hover:scale-105 group-hover:shadow-sm`}
            `}>
                {icon}
            </div>
            <span className={`text-sm font-bold tracking-tight transition-colors duration-200 
                ${active ? 'text-amber-900' : 'text-gray-800 group-hover:text-amber-900'}
            `}>
                {label}
            </span>
            <span className={`text-xs mt-0.5 text-center transition-colors duration-200 font-medium 
                ${active ? 'text-amber-700/80' : 'text-gray-500'}
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
