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
                    icon={<BellRing className="w-6 h-6 text-blue-600" />}
                    label="Housekeeping"
                    subtitle="Clean, towels, supplies"
                    active={type === 'housekeeping'}
                    onClick={() => setType('housekeeping')}
                    activeColor="blue"
                />
                <ServiceCard
                    icon={<Car className="w-6 h-6 text-emerald-600" />}
                    label="Transport"
                    subtitle="Taxi, shuttle, pickup"
                    active={type === 'transport'}
                    onClick={() => setType('transport')}
                    activeColor="emerald"
                />
                <ServiceCard
                    icon={<Utensils className="w-6 h-6 text-orange-600" />}
                    label="In-Room Dining"
                    subtitle="Food & drinks to room"
                    active={type === 'food'}
                    onClick={() => setType('food')}
                    activeColor="orange"
                />
                <ServiceCard
                    icon={<Hammer className="w-6 h-6 text-red-600" />}
                    label="Report Issue"
                    subtitle="Maintenance & repairs"
                    active={type === 'problem'}
                    onClick={() => setType('problem')}
                    activeColor="red"
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

function ServiceCard({ icon, label, subtitle, active, onClick, activeColor }: any) {
    const colorMap: Record<string, string> = {
        blue: 'border-blue-400 bg-blue-50 shadow-blue-100',
        emerald: 'border-emerald-400 bg-emerald-50 shadow-emerald-100',
        orange: 'border-orange-400 bg-orange-50 shadow-orange-100',
        red: 'border-red-400 bg-red-50 shadow-red-100',
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 group
                ${active
                    ? `${colorMap[activeColor] || 'border-primary bg-primary/5'} shadow-lg scale-[1.03]`
                    : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:scale-[1.02]'
                }
            `}
        >
            <div className={`p-3 rounded-full mb-2 transition-colors duration-200 ${active ? `bg-${activeColor}-100` : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                {icon}
            </div>
            <span className={`text-sm font-bold ${active ? `text-${activeColor}-700` : 'text-gray-900 group-hover:text-gray-900'}`}>
                {label}
            </span>
            <span className={`text-xs mt-0.5 ${active ? `text-${activeColor}-600` : 'text-gray-500 group-hover:text-gray-700'} font-medium`}>
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
