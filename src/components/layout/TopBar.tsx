import { MobileNav } from './MobileNav'

/**
 * Top bar visible solo en mobile (<768px). En desktop, el "page-title" vive
 * dentro de cada página (en su propio `.topbar`), no aquí.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur md:hidden">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-[18px] font-medium italic tracking-[-0.01em]">
          Patrimonio
        </span>
      </div>
      <MobileNav />
    </header>
  )
}
