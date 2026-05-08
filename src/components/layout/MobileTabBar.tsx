import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Sparkles, ReceiptText } from '@/components/icons'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/staff/dashboard',    label: 'Home',     icon: LayoutDashboard },
  { to: '/staff/bookings',     label: 'Bookings', icon: BookOpen },
  { to: '/staff/housekeeping', label: 'Rooms',    icon: Sparkles },
  { to: '/staff/invoices',     label: 'Invoices', icon: ReceiptText },
]

/**
 * Fixed bottom tab bar for staff on mobile only.
 * Hidden on md+ (sidebar takes over).
 */
export function MobileTabBar() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      aria-label="Primary mobile navigation"
    >
      <ul className="grid grid-cols-4 h-16">
        {tabs.map(tab => (
          <li key={tab.to} className="flex">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-resort-gold-500' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
