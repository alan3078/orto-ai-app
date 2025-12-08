export function NotFoundIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 400 300' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
      <defs>
        <linearGradient
          id='bg-gradient'
          x1='200'
          y1='0'
          x2='200'
          y2='300'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='var(--muted)' stopOpacity='0.2' />
          <stop offset='1' stopColor='var(--muted)' stopOpacity='0.05' />
        </linearGradient>
        <filter id='shadow' x='-20' y='-20' width='440' height='340' filterUnits='userSpaceOnUse'>
          <feDropShadow
            dx='0'
            dy='4'
            stdDeviation='8'
            floodColor='currentColor'
            floodOpacity='0.1'
          />
        </filter>
      </defs>

      {/* Background Elements */}
      <circle cx='50' cy='50' r='20' fill='var(--primary)' fillOpacity='0.1' />
      <circle cx='350' cy='250' r='30' fill='var(--primary)' fillOpacity='0.05' />
      <rect
        x='20'
        y='200'
        width='40'
        height='40'
        rx='8'
        fill='var(--muted)'
        fillOpacity='0.2'
        transform='rotate(-15 40 220)'
      />

      {/* Main Calendar/Board */}
      <g filter='url(#shadow)'>
        <rect
          x='80'
          y='60'
          width='240'
          height='180'
          rx='12'
          fill='var(--card)'
          stroke='var(--border)'
          strokeWidth='2'
        />
        {/* Header */}
        <rect x='80' y='60' width='240' height='40' rx='12' fill='var(--muted)' fillOpacity='0.3' />
        <rect x='80' y='90' width='240' height='10' fill='var(--card)' />{' '}
        {/* Mask bottom rounded corners of header */}
        <line x1='80' y1='100' x2='320' y2='100' stroke='var(--border)' strokeWidth='2' />
        {/* Header Dots */}
        <circle cx='100' cy='80' r='4' fill='var(--destructive)' fillOpacity='0.6' />
        <circle cx='115' cy='80' r='4' fill='var(--primary)' fillOpacity='0.6' />
        <circle cx='130' cy='80' r='4' fill='var(--primary)' fillOpacity='0.3' />
        {/* Grid Lines */}
        <line
          x1='140'
          y1='100'
          x2='140'
          y2='240'
          stroke='var(--border)'
          strokeWidth='1'
          strokeDasharray='4 4'
        />
        <line
          x1='200'
          y1='100'
          x2='200'
          y2='240'
          stroke='var(--border)'
          strokeWidth='1'
          strokeDasharray='4 4'
        />
        <line
          x1='260'
          y1='100'
          x2='260'
          y2='240'
          stroke='var(--border)'
          strokeWidth='1'
          strokeDasharray='4 4'
        />
        {/* Shift Blocks - Some are "broken" or missing */}
        <rect
          x='90'
          y='120'
          width='40'
          height='20'
          rx='4'
          fill='var(--primary)'
          fillOpacity='0.2'
        />
        <rect
          x='150'
          y='150'
          width='40'
          height='20'
          rx='4'
          fill='var(--primary)'
          fillOpacity='0.1'
        />
        {/* The "Missing" Block - 404 representation */}
        <g transform='translate(210, 130)'>
          <rect
            x='0'
            y='0'
            width='40'
            height='20'
            rx='4'
            fill='none'
            stroke='var(--destructive)'
            strokeWidth='2'
            strokeDasharray='4 2'
          />
          <text
            x='20'
            y='14'
            textAnchor='middle'
            fontSize='10'
            fill='var(--destructive)'
            fontFamily='monospace'
            fontWeight='bold'
          >
            404
          </text>
        </g>
        <rect
          x='270'
          y='180'
          width='40'
          height='20'
          rx='4'
          fill='var(--primary)'
          fillOpacity='0.2'
        />
        <rect x='90' y='190' width='40' height='20' rx='4' fill='var(--muted)' fillOpacity='0.3' />
      </g>

      {/* Floating Elements representing confusion/search */}
      <g transform='translate(280, 110) rotate(15)'>
        <circle
          cx='0'
          cy='0'
          r='15'
          fill='var(--background)'
          stroke='var(--primary)'
          strokeWidth='2'
        />
        <path
          d='M-4 4 L4 -4 M-4 -4 L4 4'
          stroke='var(--primary)'
          strokeWidth='2'
          strokeLinecap='round'
        />
      </g>

      <g transform='translate(120, 220) rotate(-10)'>
        <rect
          x='0'
          y='0'
          width='20'
          height='20'
          rx='4'
          fill='var(--background)'
          stroke='var(--muted-foreground)'
          strokeWidth='2'
        />
        <text x='10' y='14' textAnchor='middle' fontSize='12' fill='var(--muted-foreground)'>
          ?
        </text>
      </g>
    </svg>
  );
}
