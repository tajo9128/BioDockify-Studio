import { clsx } from 'clsx'

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const sizes = {
    sm: 'h-1.5',
    md: 'h-3',
    lg: 'h-5',
  }

  return (
    <div className={clsx('w-full', className)}>
      <div className={clsx('w-full bg-surface-secondary rounded-full overflow-hidden', sizes[size])}>
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-right text-xs text-text-secondary mt-1 font-mono">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  )
}
