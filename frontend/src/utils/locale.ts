// Persisted language preference — mirrors sfx.ts's mute-preference pattern: a
// plain module-level variable seeded from localStorage, no context/provider.

const LANG_KEY = 'lang'

let locale = (() => {
  try {
    return localStorage.getItem(LANG_KEY) === 'de' ? 'de' : 'en'
  } catch {
    return 'en'
  }
})()

export function getLocale(): string {
  return locale
}

export function setLocale(v: string): void {
  locale = v
  try {
    localStorage.setItem(LANG_KEY, v)
  } catch {
    /* ignore */
  }
}

export function toggleLocale(): string {
  setLocale(locale === 'en' ? 'de' : 'en')
  return locale
}
