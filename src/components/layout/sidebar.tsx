"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Users, 
  UsersRound, 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  Sliders,
  UserCog
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ROUTES } from '@/lib/routes'

const menuItems = [
  { icon: Home, label: 'Home', href: ROUTES.ADMIN.HOME },
  { icon: UserCog, label: 'User Management', href: ROUTES.ADMIN.USERS },
  { icon: Users, label: 'Staff', href: ROUTES.ADMIN.STAFF },
  { icon: UsersRound, label: 'Staff Groups', href: ROUTES.ADMIN.STAFF_GROUPS },
  { icon: Calendar, label: 'Roster Management', href: ROUTES.ADMIN.ROSTER_MANAGEMENT },
  { icon: Sliders, label: 'System Config', href: ROUTES.ADMIN.CONFIG },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen border-r bg-card transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Orto AI"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="font-bold text-lg">Orto AI</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8", collapsed && "mx-auto")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

      </div>
    </aside>
  )
}
