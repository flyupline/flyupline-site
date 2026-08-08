// Theme handling. Dark is the brand default; the choice is remembered per
// device and falls back to the OS preference on first visit.
const KEY = 'flyupline.theme'

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t === 'light' ? '#f6f6f7' : '#0a0a0b')
  return t
}

export function setTheme(theme) {
  const t = applyTheme(theme)
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* ignore */
  }
  return t
}

// Called once at boot, before React renders, to avoid a flash of the wrong theme.
export function initTheme() {
  return applyTheme(getStoredTheme() || systemTheme())
}
