import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

const LoadingSpinner = ({ 
  size = 'md', 
  className,
  text,
  center = false 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  return (
    <div className={clsx(
      'flex items-center',
      center && 'justify-center',
      text && 'space-x-2',
      className
    )}>
      <Loader2 className={clsx(
        'animate-spin text-primary-600',
        sizeClasses[size]
      )} />
      {text && (
        <span className={clsx(
          'text-neutral-600',
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  )
}

export default LoadingSpinner