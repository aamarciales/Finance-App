const DESKTOP_MODE_KEY = 'patrimonio.desktop'
const NATIVE_PLATFORM_KEY = 'patrimonio.nativePlatform'
const DESKTOP_APP_CLASS = 'is-desktop-app'
const ANDROID_APP_CLASS = 'is-android-app'

function isTauriAndroidWebView(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI__' in window &&
    /Android/i.test(navigator.userAgent)
  )
}

export function rememberDesktopMode() {
  const params = new URLSearchParams(window.location.search)

  if (params.get('native') === 'android') {
    window.localStorage.setItem(NATIVE_PLATFORM_KEY, 'android')
  }
  if (params.get('desktop') === '1') {
    window.localStorage.setItem(DESKTOP_MODE_KEY, '1')
  }
  if (isTauriAndroidWebView()) {
    window.localStorage.setItem(NATIVE_PLATFORM_KEY, 'android')
  }

  document.documentElement.classList.toggle(ANDROID_APP_CLASS, isAndroidMode())
  document.documentElement.classList.toggle(DESKTOP_APP_CLASS, isDesktopMode())
}

export function isAndroidMode() {
  return (
    window.localStorage.getItem(NATIVE_PLATFORM_KEY) === 'android' ||
    isTauriAndroidWebView()
  )
}

export function isDesktopMode() {
  return window.localStorage.getItem(DESKTOP_MODE_KEY) === '1'
}

export function isNativeMode() {
  return isDesktopMode() || isAndroidMode()
}

/** Legacy WebView camera preview — fallback when native camera plugin is unavailable. */
export function shouldUseWebCameraFallback() {
  return isAndroidMode()
}

/** Append native shell query params for same-window suite navigation. */
export function withNativeParam(rawUrl: string): string {
  const url = new URL(rawUrl)
  if (isAndroidMode()) {
    url.searchParams.set('native', 'android')
  } else if (isDesktopMode()) {
    url.searchParams.set('desktop', '1')
  }
  return url.toString()
}

export function homePathWithNativeParams(): string {
  if (isAndroidMode()) return '/?native=android'
  if (isDesktopMode()) return '/?desktop=1'
  return '/'
}

export function trakllSuiteLinkProps(rawUrl: string) {
  if (isNativeMode()) {
    return { href: withNativeParam(rawUrl) }
  }
  return {
    href: rawUrl,
    target: '_blank' as const,
    rel: 'noopener noreferrer',
  }
}

/** Issue a Clerk sign-in ticket and open trakll with the same session. */
export async function buildTrakllSuiteUrl(
  rawUrl: string,
  bearerToken: string | null,
): Promise<string> {
  const url = new URL(withNativeParam(rawUrl))

  if (!isNativeMode()) {
    return url.toString()
  }

  const response = await fetch('/api/suite-auth/sign-in-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
  })
  if (!response.ok) {
    throw new Error('Failed to create suite sign-in token')
  }
  const body = (await response.json()) as { token: string }
  url.searchParams.set('ticket', body.token)
  return url.toString()
}
