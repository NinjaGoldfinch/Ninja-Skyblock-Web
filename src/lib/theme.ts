import { getSettings } from './settings'

export function applyTheme(theme?: 'dark' | 'light') {
  const t = theme ?? getSettings().theme
  if (t === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
}
