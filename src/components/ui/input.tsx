import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, onSelect, ...props }: React.ComponentProps<"input">) {
  const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (type === "number") {
      e.target.select()
    }
    props.onFocus?.(e)
  }, [type, props.onFocus])

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-black/[0.05] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/25",
        className
      )}
      {...props}
      onFocus={handleFocus}
    />
  )
}

export { Input }
