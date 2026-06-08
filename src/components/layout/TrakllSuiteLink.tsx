import type { ComponentProps } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { buildTrakllSuiteUrl, isNativeMode, trakllSuiteLinkProps } from '@/lib/desktop-mode'

type TrakllSuiteLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href: string
}

/** Same-window suite link; passes a short-lived Clerk ticket in native shells. */
export function TrakllSuiteLink({ href, onClick, ...rest }: TrakllSuiteLinkProps) {
  const { getToken } = useAuth()
  const suiteProps = trakllSuiteLinkProps(href)

  if (!isNativeMode()) {
    return <a href={href} onClick={onClick} {...rest} />
  }

  return (
    <a
      {...suiteProps}
      {...rest}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        event.preventDefault()
        void (async () => {
          const bearer = await getToken()
          window.location.href = await buildTrakllSuiteUrl(href, bearer)
        })()
      }}
    />
  )
}
