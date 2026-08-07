type LogoProps = {
  compact?: boolean
  className?: string
}

export function Logo({ compact = false, className = '' }: LogoProps) {
  return (
    <img
      alt="MÜV Vital"
      className={className}
      height={compact ? 56 : 86}
      src={compact ? '/muvvital-seal.jpg' : '/muvvital-logo.jpg'}
      width={compact ? 56 : 148}
    />
  )
}
