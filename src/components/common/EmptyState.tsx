import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-5 py-10 text-center text-text-muted',
        className,
      )}
    >
      {icon && (
        <div className="mb-2.5 opacity-40 [&>svg]:h-8 [&>svg]:w-8">{icon}</div>
      )}
      <div className="mb-1 font-serif text-[17px] text-text">{title}</div>
      {description && <div className="text-[12.5px]">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
