import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { toast } from 'sonner'
import { Loader2, LogIn } from '@/components/icons'

export function GuestLoginPage() {
    const navigate = useNavigate()
    const [roomNumber, setRoomNumber] = useState('')
    const [firstName, setFirstName] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!roomNumber || !firstName) {
            toast.error("Please fill in all fields")
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/guest-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomNumber, firstName })
            })

            const data = await response.json()
            console.log('[GuestLoginPage] Login response:', data)

            if (response.ok && data.success) {
                toast.success(`Welcome back, ${data.guestName}!`)
                navigate(`/guest/${data.token}`)
            } else {
                toast.error(data?.error || "No active booking found for this Room and Name combination.")
            }

        } catch (err) {
            console.error("Login Error Catch:", err)
            toast.error("An unexpected error occurred. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center space-y-3">
                    <img src="/logohobbyskydarkmode.png" alt="Hobbysky Guest House" className="h-20 w-auto mx-auto object-contain" />
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Guest Portal</h1>
                    <p className="text-base text-gray-600 font-medium">Enter your room details to access services</p>
                </div>

                <Card className="border-0 shadow-xl ring-1 ring-black/5 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-gray-900">Sign In</CardTitle>
                        <CardDescription className="text-sm text-gray-600 font-medium">
                            Enter your Room Number and First Name found on your booking.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="room" className="text-sm font-bold text-gray-800">Room Number</Label>
                                <Input
                                    id="room"
                                    placeholder="e.g. 101"
                                    value={roomNumber}
                                    onChange={(e) => setRoomNumber(e.target.value)}
                                    className="h-12 text-base font-medium border-gray-300 focus:border-primary focus:ring-primary/30"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="firstname" className="text-sm font-bold text-gray-800">First Name</Label>
                                <Input
                                    id="firstname"
                                    placeholder="e.g. John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="h-12 text-base font-medium border-gray-300 focus:border-primary focus:ring-primary/30"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg transition-all duration-200" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                                Access Portal
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-gray-500 font-medium">
                    Having trouble? Contact reception at{' '}
                    <a href="tel:+233555009697" className="text-primary font-bold hover:underline">+233 55 500 9697</a>
                </p>
            </div>
        </div>
    )
}
