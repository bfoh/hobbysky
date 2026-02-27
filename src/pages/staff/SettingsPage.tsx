import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { User, Mail, Moon, Sun, Monitor } from '@/components/icons'
import { blink } from '../../blink/client'
import { toast } from 'sonner'
import { hotelSettingsService } from '@/services/hotel-settings'

export function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState<string>('GHS')
  const [dateFormat, setDateFormat] = useState<string>('MM/DD/YYYY')
  const [saving, setSaving] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    loadUser()
    loadSettings()
  }, [])

  const loadUser = async () => {
    try {
      const userData = await blink.auth.me()
      setUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const settings = await hotelSettingsService.getHotelSettings()
      setCurrency(settings.currency || 'GHS')
      // Date format could be stored in settings in the future
      // For now, we'll use localStorage or default
      const savedDateFormat = localStorage.getItem('dateFormat') || 'MM/DD/YYYY'
      setDateFormat(savedDateFormat)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency)
    setSaving(true)
    try {
      await hotelSettingsService.updateHotelSettings({ currency: newCurrency })
      // Refresh settings cache so all components pick up the change immediately
      await hotelSettingsService.refreshSettings()
      toast.success('Currency preference saved. Changes will appear across the app shortly.')
    } catch (error: any) {
      console.error('Failed to save currency:', error)
      toast.error('Failed to save currency preference')
      // Revert on error
      const settings = await hotelSettingsService.getHotelSettings()
      setCurrency(settings.currency || 'GHS')
    } finally {
      setSaving(false)
    }
  }

  const handleDateFormatChange = (newFormat: string) => {
    setDateFormat(newFormat)
    localStorage.setItem('dateFormat', newFormat)
    toast.success('Date format preference saved')
  }

  const handleLogout = async () => {
    await blink.auth.logout()
    toast.success('Logged out successfully')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Input
                id="userId"
                value={user?.id || ''}
                disabled
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme Appearance</p>
              <p className="text-sm text-muted-foreground">Toggle between Light and Dark mode</p>
            </div>
            <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-white/5">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${theme === 'light'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${theme === 'dark'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${theme === 'system'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Monitor className="h-4 w-4" />
                System
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Currency</p>
              <p className="text-sm text-muted-foreground">Set your preferred currency</p>
            </div>
            <select
              className="px-3 py-2 border rounded-md bg-background"
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={saving}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="GHS">GHS (₵)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Date Format</p>
              <p className="text-sm text-muted-foreground">Choose date display format</p>
            </div>
            <select
              className="px-3 py-2 border rounded-md bg-background"
              value={dateFormat}
              onChange={(e) => handleDateFormatChange(e.target.value)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
