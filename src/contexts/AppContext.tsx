import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getActiveLocale, setActiveLocale, translate, type Locale } from '../lib/i18n'

interface AppContextType {
  darkMode: boolean
  toggleDarkMode: () => void
  direction: 'rtl' | 'ltr'
  locale: Locale
  toggleDirection: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebarCollapsed: () => void
}

const AppContext = createContext<AppContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
  direction: 'rtl',
  locale: 'fa',
  toggleDirection: () => {},
  t: (key) => key,
  sidebarOpen: false,
  setSidebarOpen: () => {},
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => {},
})

export const useApp = () => useContext(AppContext)

function readLocale(): Locale {
  const saved = localStorage.getItem('finopal.locale')
  return saved === 'en' ? 'en' : 'fa'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('finopal.theme') === 'dark')
  const [locale, setLocale] = useState<Locale>(readLocale)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const direction: 'rtl' | 'ltr' = locale === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = darkMode ? 'dark' : 'light'
    root.classList.toggle('dark', darkMode)
    root.classList.toggle('light', !darkMode)
    root.style.colorScheme = darkMode ? 'dark' : 'light'
    localStorage.setItem('finopal.theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    setActiveLocale(locale)
    document.documentElement.dir = direction
    document.documentElement.lang = locale
    localStorage.setItem('finopal.locale', locale)
  }, [locale, direction])

  const t = useMemo(() => (key: string, vars?: Record<string, string | number>) => translate(key, vars, locale), [locale])

  return (
    <AppContext.Provider value={{
      darkMode,
      toggleDarkMode: () => setDarkMode((v) => !v),
      direction,
      locale,
      toggleDirection: () => setLocale((v) => (v === 'fa' ? 'en' : 'fa')),
      t,
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      toggleSidebarCollapsed: () => setSidebarCollapsed((v) => !v),
    }}>
      {children}
    </AppContext.Provider>
  )
}

