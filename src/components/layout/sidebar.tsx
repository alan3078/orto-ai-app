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
  ChevronDown,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'

const menuItems = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Users, label: 'Staff', href: '/staff' },
  { icon: UsersRound, label: 'Staff Groups', href: '/staff-groups' },
  { icon: Calendar, label: 'Roster Management', href: '/roster-management' },
  { icon: Sliders, label: 'System Config', href: '/config' },
]

interface SystemPolicy {
  id: number
  label: string
  scope: 'GLOBAL' | 'ROSTER'
  value: unknown
}

async function fetchActivePolicies(): Promise<SystemPolicy[]> {
  try {
    const response = await fetch('/api/system-policies')
    if (!response.ok) return []
    const data = await response.json()
    return data.policies || []
  } catch {
    return []
  }
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [policiesOpen, setPoliciesOpen] = useState(false)
  const [policies, setPolicies] = useState<SystemPolicy[]>([])

  useEffect(() => {
    if (!collapsed) {
      fetchActivePolicies().then(setPolicies)
    }
  }, [collapsed])

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
              <Calendar className="h-6 w-6 text-primary" />
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

          {/* Active Policies Section */}
          {!collapsed && policies.length > 0 && (
            <Collapsible open={policiesOpen} onOpenChange={setPoliciesOpen} className="mt-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Active Policies</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    policiesOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 px-3">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="rounded-md border bg-card p-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">{policy.label}</span>
                      <Badge variant={policy.scope === 'GLOBAL' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                        {policy.scope === 'GLOBAL' ? 'G' : 'R'}
                      </Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground truncate font-mono">
                      {JSON.stringify(policy.value).slice(0, 40)}...
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              A
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-muted-foreground truncate">admin@orto.ai</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
