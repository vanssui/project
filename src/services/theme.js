import { THEME_KEY } from '../shared/config.js';

function isValidTheme(theme) {
  return theme === 'dark' || theme === 'light';
}

export function getSavedTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isValidTheme(value) ? value : '';
  } catch {
    return '';
  }
}

export function getPreferredTheme(systemThemeQuery) {
  const saved = getSavedTheme();
  return saved || (systemThemeQuery.matches ? 'light' : 'dark');
}

export function applyTheme(theme, { themeToggle, themeLabel, stateRef, persist = false }) {
  const next = isValidTheme(theme) ? theme : 'dark';
  document.body.setAttribute('data-theme', next);
  document.documentElement.style.colorScheme = next;
  themeToggle.checked = next === 'light';
  themeLabel.textContent = next === 'light' ? 'DAY MODE' : 'DARK MODE';
  stateRef.currentTheme = next;

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }
}
