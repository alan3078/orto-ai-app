import { Badge } from '@/components/ui/badge'

interface StateBadgeProps {
  state: number
  shiftType?: 'APN' | 'DAY_NIGHT'
}

const APN_STATE_CONFIG = {
   0: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Off', icon: '○' },
   1: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'A', icon: '☀' },
   2: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'P', icon: '☁' },
   3: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'N', icon: '☾' },
} as const

const DAY_NIGHT_STATE_CONFIG = {
   0: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Off', icon: '○' },
   1: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Day', icon: '●' },
   2: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Night', icon: '◐' },
} as const

export function StateBadge({ state, shiftType = 'DAY_NIGHT' }: StateBadgeProps) {
  const stateConfig = shiftType === 'APN' ? APN_STATE_CONFIG : DAY_NIGHT_STATE_CONFIG
  const config = stateConfig[state as keyof typeof stateConfig] || stateConfig[0]

  return (
    <Badge className={`${config.bg} ${config.text} border-0`} variant="secondary">
      <span className="text-xs">{config.icon}</span>
    </Badge>
  )
}

export { APN_STATE_CONFIG, DAY_NIGHT_STATE_CONFIG }
