import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full px-3 py-2 bg-surface-secondary border border-border-light rounded-lg text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'placeholder:text-text-tertiary transition-all duration-200',
          error && 'border-error focus:ring-error',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-text-tertiary mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-error mt-1">{error}</p>
      )}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'w-full px-3 py-2 bg-surface-secondary border border-border-light rounded-lg text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'transition-all duration-200 cursor-pointer',
          error && 'border-error focus:ring-error',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-error mt-1">{error}</p>
      )}
    </div>
  )
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')

  return (
    <label htmlFor={inputId} className={clsx('flex items-center gap-2 cursor-pointer', className)}>
      <input
        type="checkbox"
        id={inputId}
        className="w-4 h-4 text-primary rounded border-border-light focus:ring-primary cursor-pointer"
        {...props}
      />
      <span className="text-sm text-text-primary">{label}</span>
    </label>
  )
}
