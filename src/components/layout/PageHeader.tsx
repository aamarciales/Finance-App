import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Replica del `.topbar` interno de cada página en el HTML reference. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-7 flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div>
        <h1 className="font-serif text-[28px] font-normal leading-[1.1] tracking-[-0.02em] md:text-[30px]">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-1.5 text-[13px] text-text-muted">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
