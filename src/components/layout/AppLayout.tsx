import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../ui/sheet'
import { activityLogService } from '@/services/activity-log-service'
import {
  LayoutDashboard,
  Calendar,
  Building2,
  BookOpen,
  Users,
  Network,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  Bell,
  List,
  History,
  Tag,
  Sparkles,
  ChevronDown,
  UserCheck,
  ReceiptText,
  TrendingUp,
  FileText,
  Star,
  Megaphone
} from '@/components/icons'
import { blink } from '../../blink/client'
import { cn } from '../../lib/utils'
import { useStaffRole } from '../../hooks/use-staff-role'

const navigation = [
  { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
  { name: 'Calendar', href: '/staff/calendar', icon: Calendar },
  { name: 'Rooms', href: '/staff/properties', icon: Building2 },
  { name: 'Bookings', href: '/staff/bookings', icon: BookOpen },
  { name: 'Guests', href: '/staff/guests', icon: Users },
  { name: 'Housekeeping', href: '/staff/housekeeping', icon: Sparkles },
  { name: 'Channels', href: '/staff/channels', icon: Network },
  { name: 'Reviews', href: '/staff/reviews', icon: Star },
  { name: 'Marketing', href: '/staff/marketing', icon: Megaphone },
  { name: 'Guest Requests', href: '/staff/requests', icon: Bell }
]

export function AppLayout() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [reservationsOpen, setReservationsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Use the same hook that's working in EmployeesPage
  const { role, canManageEmployees, loading: isLoadingStaff } = useStaffRole()

  // Remember last known admin state to prevent flicker
  const lastKnownAdminStateRef = React.useRef<boolean>(false)

  // Fallback: Get current user directly as backup
  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await blink.auth.me()
        setCurrentUser(user)
        console.log('🎨 [AppLayout] Current user:', user?.email)

        // If admin email, remember it
        if (user?.email === import.meta.env.VITE_ADMIN_EMAIL) {
          lastKnownAdminStateRef.current = true
        }
      } catch (error) {
        console.error('🎨 [AppLayout] Error getting user:', error)
      }
    }
    getUser()
  }, [])

  // Update last known admin state when role loads
  useEffect(() => {
    if (!isLoadingStaff && (role === 'admin' || role === 'owner' || canManageEmployees)) {
      lastKnownAdminStateRef.current = true
    }
  }, [isLoadingStaff, role, canManageEmployees])

  // Determine if user is admin - STABLE during loading to prevent flicker
  const isAdmin = React.useMemo(() => {
    // 1. User email is admin (highest priority)
    if (currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL) {
      return true
    }

    // 2. While loading, use last known state to prevent flicker
    if (isLoadingStaff && lastKnownAdminStateRef.current) {
      return true
    }

    // 3. After loading, check actual permissions
    if (!isLoadingStaff && role && (role === 'admin' || role === 'owner' || canManageEmployees)) {
      return true
    }

    // 4. Default to false only if we're sure (not loading and no admin indicators)
    if (!isLoadingStaff && !role && !canManageEmployees) {
      return false
    }

    // 5. During loading with no previous admin state, default to false
    return false
  }, [currentUser?.email, isLoadingStaff, canManageEmployees, role])

  console.log('🎨 [AppLayout] Admin section state:', {
    role,
    canManageEmployees,
    isLoadingStaff,
    currentUserEmail: currentUser?.email,
    isAdmin,
    lastKnownAdminState: lastKnownAdminStateRef.current,
    timestamp: new Date().toISOString()
  })

  const handleLogout = async () => {
    try {
      // Log the logout activity before signing out
      const user = await blink.auth.me()
      if (user) {
        await activityLogService.logUserLogout(user.id, { email: user.email }).catch(err =>
          console.error('Failed to log logout activity:', err)
        )
      }
    } catch (error) {
      console.error('Failed to get current user for logout logging:', error)
    }

    await blink.auth.logout()
  }

  // Functions to preserve scroll position when dropdowns open
  const saveScrollPosition = () => {
    if (scrollAreaRef.current) {
      const currentScrollTop = scrollAreaRef.current.scrollTop
      setScrollPosition(currentScrollTop)
      console.log('📍 [AppLayout] Saved scroll position:', currentScrollTop, 'scrollAreaRef exists:', !!scrollAreaRef.current)
    } else {
      console.log('📍 [AppLayout] Cannot save scroll position - scrollAreaRef is null')
    }
  }

  const restoreScrollPosition = () => {
    console.log('📍 [AppLayout] Attempting to restore scroll position:', scrollPosition, 'scrollAreaRef exists:', !!scrollAreaRef.current)
    if (scrollAreaRef.current && scrollPosition > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollPosition
          console.log('📍 [AppLayout] Restored scroll position to:', scrollPosition, 'actual scrollTop:', scrollAreaRef.current.scrollTop)
        }
      })
    }
  }

  const handleReservationsToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('📍 [AppLayout] Reservations toggle clicked, current scrollTop:', scrollAreaRef.current?.scrollTop)

    // Store current scroll position before state change
    const currentScroll = scrollAreaRef.current?.scrollTop || 0
    setScrollPosition(currentScroll)

    setReservationsOpen((v) => !v)

    // Immediately restore scroll position
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = currentScroll
        console.log('📍 [AppLayout] Immediate scroll restoration to:', currentScroll)
      }
    }, 0)
  }

  const handlePriceToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('📍 [AppLayout] Price toggle clicked, current scrollTop:', scrollAreaRef.current?.scrollTop)

    // Store current scroll position before state change
    const currentScroll = scrollAreaRef.current?.scrollTop || 0
    setScrollPosition(currentScroll)

    setPriceOpen((v) => !v)

    // Immediately restore scroll position
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = currentScroll
        console.log('📍 [AppLayout] Immediate scroll restoration to:', currentScroll)
      }
    }, 0)
  }

  // Restore scroll position after dropdown state changes
  useLayoutEffect(() => {
    console.log('📍 [AppLayout] useLayoutEffect triggered, reservationsOpen:', reservationsOpen, 'priceOpen:', priceOpen, 'scrollPosition:', scrollPosition)
    restoreScrollPosition()
  }, [reservationsOpen, priceOpen])

  // Multiple restoration attempts with different timings
  useEffect(() => {
    if (scrollPosition > 0) {
      // First attempt - immediate
      const immediateId = setTimeout(() => {
        if (scrollAreaRef.current && scrollPosition > 0) {
          scrollAreaRef.current.scrollTop = scrollPosition
          console.log('📍 [AppLayout] Immediate backup restoration to:', scrollPosition)
        }
      }, 0)

      // Second attempt - after 10ms
      const shortId = setTimeout(() => {
        if (scrollAreaRef.current && scrollPosition > 0) {
          scrollAreaRef.current.scrollTop = scrollPosition
          console.log('📍 [AppLayout] Short delay backup restoration to:', scrollPosition)
        }
      }, 10)

      // Third attempt - after 50ms
      const longId = setTimeout(() => {
        if (scrollAreaRef.current && scrollPosition > 0) {
          scrollAreaRef.current.scrollTop = scrollPosition
          console.log('📍 [AppLayout] Long delay backup restoration to:', scrollPosition)
        }
      }, 50)

      return () => {
        clearTimeout(immediateId)
        clearTimeout(shortId)
        clearTimeout(longId)
      }
    }
  }, [reservationsOpen, priceOpen, scrollPosition])

  const currentTitle = (() => {
    const nav = navigation.find((item) => item.href === location.pathname)?.name
    if (nav) return nav
    if (location.pathname.startsWith('/staff/reservations/history')) return 'History'
    if (location.pathname.startsWith('/staff/reservations')) return 'Reservations'
    if (location.pathname === '/staff/set-prices') return 'Set prices'
    if (location.pathname === '/staff/analytics') return 'Analytics'
    if (location.pathname === '/staff/reviews') return 'Guest Reviews'
    if (location.pathname === '/staff/marketing') return 'Marketing Center'
    if (location.pathname === '/staff/requests') return 'Service Requests'
    return 'Dashboard'
  })()

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-5 border-b border-white/5 h-[64px] bg-sidebar/90 backdrop-blur-md relative z-10 shrink-0">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/50 shadow-inner flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-white/5">
          <img src="/logohobbyskydarkmode.png" alt="Hobbysky Guest House" className="w-[130%] h-[130%] object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif font-bold text-[17px] tracking-tight text-foreground leading-none truncate">Hobbysky</h2>
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70 font-semibold truncate leading-none mt-1">Guest House</p>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-6">
        <nav className="space-y-1.5">
          <p className="px-3 mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 font-bold">Main Menu</p>
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out border border-transparent relative overflow-hidden',
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] translate-x-1'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_10px_currentColor] rounded-r-full" />
                )}
                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-300 z-10 relative", isActive ? "scale-110 drop-shadow-md text-primary" : "group-hover:text-foreground")} />
                <span className="z-10 relative tracking-wide">{item.name}</span>
              </Link>
            )
          })}

          {/* Reservations collapsible */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleReservationsToggle}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out group border border-transparent relative',
                reservationsOpen
                  ? 'bg-primary/5 text-primary border-primary/10'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
              )}
            >
              <List className={cn("w-5 h-5 transition-transform duration-300", reservationsOpen && "scale-110 text-primary")} />
              <span className="flex-1 text-left tracking-wide">Reservations</span>
              <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', reservationsOpen ? 'rotate-180 text-primary' : 'rotate-0')} />
            </button>
            {reservationsOpen && (
              <div className="mt-2 space-y-1 pl-1">
                <Link
                  to="/staff/reservations"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-4 border-l-2 pl-4',
                    location.pathname === '/staff/reservations'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-white/5 text-muted-foreground hover:text-foreground hover:border-primary/50'
                  )}
                >
                  <span className="text-[13px] tracking-wide">Reservation list</span>
                </Link>
                <Link
                  to="/staff/reservations/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-4 border-l-2 pl-4',
                    location.pathname.startsWith('/staff/reservations/history')
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-white/5 text-muted-foreground hover:text-foreground hover:border-primary/50'
                  )}
                >
                  <span className="text-[13px] tracking-wide">History</span>
                </Link>
              </div>
            )}
          </div>

          {/* Admin Section - Show for admin users */}
          {isAdmin && (
            <div className="mt-8 pt-6 relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <p className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-primary/70 font-bold mb-2">Administration</p>

              <div className="space-y-1.5">
                <Link
                  to="/staff/employees"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out border border-transparent relative overflow-hidden',
                    location.pathname === '/staff/employees'
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] translate-x-1'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                  )}
                >
                  {location.pathname === '/staff/employees' && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_10px_currentColor] rounded-r-full" />
                  )}
                  <UserCheck className={cn("w-5 h-5 flex-shrink-0 transition-transform z-10 relative", location.pathname === '/staff/employees' ? "scale-110 drop-shadow-md text-primary" : "group-hover:text-foreground")} />
                  <span className="z-10 relative tracking-wide">Employees</span>
                </Link>

                {/* Price list collapsible - Admin only */}
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={handlePriceToggle}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out group border border-transparent relative',
                      priceOpen
                        ? 'bg-primary/5 text-primary border-primary/10'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                    )}
                  >
                    <Tag className={cn("w-5 h-5 transition-transform duration-300", priceOpen && "scale-110 text-primary")} />
                    <span className="flex-1 text-left tracking-wide">Price list</span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', priceOpen ? 'rotate-180 text-primary' : 'rotate-0')} />
                  </button>
                  {priceOpen && (
                    <div className="mt-2 space-y-1 pl-1">
                      <Link
                        to="/staff/set-prices"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-4 border-l-2 pl-4',
                          location.pathname === '/staff/set-prices'
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-white/5 text-muted-foreground hover:text-foreground hover:border-primary/50'
                        )}
                      >
                        <span className="text-[13px] tracking-wide">Set prices</span>
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  to="/staff/invoices"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out border border-transparent relative overflow-hidden',
                    location.pathname === '/staff/invoices'
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] translate-x-1'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                  )}
                >
                  {location.pathname === '/staff/invoices' && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_10px_currentColor] rounded-r-full" />
                  )}
                  <ReceiptText className={cn("w-5 h-5 flex-shrink-0 transition-transform z-10 relative", location.pathname === '/staff/invoices' ? "scale-110 drop-shadow-md text-primary" : "group-hover:text-foreground")} />
                  <span className="z-10 relative tracking-wide">Invoices</span>
                </Link>
                <Link
                  to="/staff/activity-logs"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out border border-transparent relative overflow-hidden',
                    location.pathname === '/staff/activity-logs'
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] translate-x-1'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                  )}
                >
                  {location.pathname === '/staff/activity-logs' && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_10px_currentColor] rounded-r-full" />
                  )}
                  <FileText className={cn("w-5 h-5 flex-shrink-0 transition-transform z-10 relative", location.pathname === '/staff/activity-logs' ? "scale-110 drop-shadow-md text-primary" : "group-hover:text-foreground")} />
                  <span className="z-10 relative tracking-wide">Activity Logs</span>
                </Link>
                <Link
                  to="/staff/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out border border-transparent relative overflow-hidden',
                    location.pathname === '/staff/analytics'
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] translate-x-1'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                  )}
                >
                  {location.pathname === '/staff/analytics' && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_10px_currentColor] rounded-r-full" />
                  )}
                  <TrendingUp className={cn("w-5 h-5 flex-shrink-0 transition-transform z-10 relative", location.pathname === '/staff/analytics' ? "scale-110 drop-shadow-md text-primary" : "group-hover:text-foreground")} />
                  <span className="z-10 relative tracking-wide">Analytics</span>
                </Link>
                <Link
                  to="/staff/email-diagnostics"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out border border-transparent relative overflow-hidden',
                    location.pathname === '/staff/email-diagnostics'
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] translate-x-1'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                  )}
                >
                  {location.pathname === '/staff/email-diagnostics' && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_10px_currentColor] rounded-r-full" />
                  )}
                  <Network className={cn("w-5 h-5 flex-shrink-0 transition-transform z-10 relative", location.pathname === '/staff/email-diagnostics' ? "scale-110 drop-shadow-md text-primary" : "group-hover:text-foreground")} />
                  <span className="z-10 relative tracking-wide">Email Diagnostics</span>
                </Link>
                <Link
                  to="/staff/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out border border-transparent relative overflow-hidden',
                    location.pathname === '/staff/settings'
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] translate-x-1'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10'
                  )}
                >
                  {location.pathname === '/staff/settings' && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_10px_currentColor] rounded-r-full" />
                  )}
                  <Settings className={cn("w-5 h-5 flex-shrink-0 transition-transform z-10 relative", location.pathname === '/staff/settings' ? "scale-110 drop-shadow-md text-primary" : "group-hover:text-foreground")} />
                  <span className="z-10 relative tracking-wide">Settings</span>
                </Link>
              </div>
            </div>
          )}
        </nav>
      </ScrollArea>

      <div className="border-t border-white/5 p-3 bg-black/20 backdrop-blur-md relative z-10 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary font-serif">
              {currentUser?.email?.charAt(0).toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate leading-none">
              {currentUser?.email?.split('@')[0] ?? 'Admin'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5 capitalize">
              {role ?? 'Staff'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 flex-shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Global Ambient Mesh for Premium Aesthetic */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[900px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, hsl(41 68% 58% / 0.07) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-[15%] -left-[10%] w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, hsl(150 60% 38% / 0.06) 0%, transparent 65%)' }} />
        <div className="absolute top-[30%] left-[20%] w-[500px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, hsl(150 30% 18% / 0.2) 0%, transparent 70%)' }} />
        <div className="absolute -top-[5%] -left-[5%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, hsl(41 68% 58% / 0.035) 0%, transparent 60%)' }} />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-white/5 bg-sidebar/60 backdrop-blur-xl shadow-2xl z-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col h-full">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold">{currentTitle}</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="hidden lg:flex items-center justify-between px-6 border-b border-white/5 h-[64px] bg-background/40 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-primary/60" />
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground/90">{currentTitle}</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
            <Bell className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="px-4 lg:px-6 py-4 lg:py-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
