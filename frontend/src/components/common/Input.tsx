import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  error?: ReactNode
  helper?: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  ...props
}, ref) => {
  return (
    <div className={clsx(fullWidth && 'w-full')}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
          {props.required && (
            <span className="text-accent-600 ml-1">*</span>
          )}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-neutral-400">
              {leftIcon}
            </span>
          </div>
        )}
        
        <input
          ref={ref}
          className={clsx(
            'input',
            error && 'input-error',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            fullWidth && 'w-full',
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-neutral-400">
              {rightIcon}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-accent-600">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="mt-1 text-sm text-neutral-500">
          {helper}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
