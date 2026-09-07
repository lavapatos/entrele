type CowMascotProps = Readonly<{
  mood: 'neutral' | 'victory' | 'defeat'
}>

const MOOD_LABELS: Record<CowMascotProps['mood'], string> = {
  neutral: 'Vaquita',
  victory: 'Vaquita feliz',
  defeat: 'Vaquita frustrada',
}

export default function CowMascot({ mood }: CowMascotProps) {
  return (
    <div className="cow-mascot" data-mood={mood} role="img" aria-label={MOOD_LABELS[mood]}>
      <span className="cow-mascot-body" aria-hidden="true" />
      <svg
        className="cow-mascot-eyes"
        viewBox="0 0 527.149119 409.149623"
        aria-hidden="true"
        focusable="false"
      >
        <g className="cow-eyes-neutral-motion">
          <g
            transform="translate(-24.841196,433.438327) scale(0.100000,-0.100000)"
            fill="currentColor"
          >
            <path
              d="M3483 3009 c-18 -11 -43 -43 -57 -72 -21 -41 -26 -66 -26 -124 l0
-73 33 -36 c24 -26 43 -37 74 -41 23 -3 58 -2 78 1 50 10 110 66 129 123 20
59 21 145 1 183 -25 47 -52 60 -130 60 -53 0 -78 -5 -102 -21z"
            />
            <path
              d="M2025 2756 c-37 -16 -102 -87 -121 -132 -20 -48 -17 -141 6 -191 27
-61 68 -83 156 -83 57 0 78 4 105 23 20 12 46 45 62 77 25 49 28 63 24 125 -4
78 -31 141 -73 174 -19 15 -41 21 -78 21 -28 -1 -64 -7 -81 -14z"
            />
          </g>
        </g>

        {mood === 'neutral' ? null : mood === 'victory' ? (
          <g
            className="cow-eyes-expression"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          >
            <path d="M 165.2 192.4 C 165.2 149.4 199.2 149.4 199.2 192.4" />
            <path d="M 315.2 163.4 C 315.2 122.4 347.2 122.4 347.2 163.4" />
          </g>
        ) : (
          <g
            className="cow-eyes-expression"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 164.2 159.4 L 182.2 174.4 L 164.2 189.4" />
            <path d="M 349.2 128.4 L 331.2 149.4 L 349.2 170.4" />
          </g>
        )}
      </svg>
    </div>
  )
}
