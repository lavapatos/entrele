import cartonBack from '../../assets/fries-mascot/carton-back.svg'
import cartonFront from '../../assets/fries-mascot/carton-front.svg'
import cartonInk from '../../assets/fries-mascot/carton-ink.svg'
import eyes from '../../assets/fries-mascot/eyes.svg'
import friesFill from '../../assets/fries-mascot/fries-fill.svg'
import friesInk from '../../assets/fries-mascot/fries-ink.svg'
import limbs from '../../assets/fries-mascot/limbs.svg'

const FULL_CANVAS_WIDTH = 1200
const FULL_CANVAS_HEIGHT = 1800

export default function FriesMascot() {
  return (
    <span className="fries-mascot" aria-hidden="true">
      <MascotLayer className="fries-mascot-limbs" src={limbs} />
      <MascotLayer src={cartonBack} />
      <MascotLayer src={cartonInk} />
      <MascotLayer src={friesFill} />
      <MascotLayer src={friesInk} />
      <MascotLayer src={cartonFront} />
      <MascotLayer className="fries-mascot-front-ink" src={cartonInk} />

      <svg
        className="fries-mascot-layer"
        viewBox={`0 0 ${FULL_CANVAS_WIDTH} ${FULL_CANVAS_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <ellipse cx="608" cy="958" rx="35" ry="44" fill="#080808" />
        <ellipse cx="823" cy="929" rx="34" ry="42" fill="#080808" />
      </svg>

      <MascotLayer src={eyes} />
      <svg
        className="fries-mascot-layer"
        viewBox={`0 0 ${FULL_CANVAS_WIDTH} ${FULL_CANVAS_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <path d="M684 947 C701 969 731 972 751 944 C733 979 700 977 684 947 Z" fill="#080808" />
      </svg>
    </span>
  )
}

function MascotLayer({
  src,
  className = '',
}: Readonly<{
  src: string
  className?: string
}>) {
  return (
    <img
      className={`fries-mascot-layer ${className}`}
      src={src}
      width={FULL_CANVAS_WIDTH}
      height={FULL_CANVAS_HEIGHT}
      alt=""
      draggable={false}
    />
  )
}
