import { Badge } from '@/components/ui/badge';
import { ShiftType } from '@/types/enums';

interface StateBadgeProps {
  state: number;
  shiftType?: ShiftType;
}

const APN_STATE_CONFIG = {
  0: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Off', icon: 'O' },
  1: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'A', icon: 'A' },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'P', icon: 'P' },
  3: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'N', icon: 'N' },
} as const;

const SEVEN_E_STATE_CONFIG = {
  0: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    label: 'Day Off',
    icon: 'O',
  },
  1: { bg: 'bg-blue-100', text: 'text-blue-700', label: '7 Shift', icon: '7' },
  2: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'E Shift',
    icon: 'E',
  },
} as const;

export function StateBadge({ state, shiftType = ShiftType.SEVEN_E }: StateBadgeProps) {
  const stateConfig = shiftType === ShiftType.APN ? APN_STATE_CONFIG : SEVEN_E_STATE_CONFIG;
  const config = stateConfig[state as keyof typeof stateConfig] || stateConfig[0];

  return (
    <Badge className={`${config.bg} ${config.text} border-0 font-bold`} variant='secondary'>
      <span className='text-sm'>{config.icon}</span>
    </Badge>
  );
}

export { APN_STATE_CONFIG, SEVEN_E_STATE_CONFIG };
