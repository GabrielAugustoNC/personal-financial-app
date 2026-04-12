// ============================================================
// useTheme — hook para alternância entre tema dark e light.
// Persiste a preferência no localStorage e aplica o atributo
// data-theme no elemento <html> para ativar as CSS custom properties.
// ============================================================

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'financas_theme';
const DEFAULT_THEME: Theme = 'dark';

// Lê a preferência salva ou detecta a preferência do sistema operacional
function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  // Detecta preferência do SO: prefers-color-scheme: light
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return DEFAULT_THEME;
}

// Aplica o tema no elemento <html> via atributo data-theme
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

interface UseThemeReturn {
  theme    : Theme;
  isDark   : boolean;
  isLight  : boolean;
  toggle   : () => void;
  setTheme : (t: Theme) => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    return initial;
  });

  // Sincroniza o atributo data-theme e o localStorage ao mudar o tema
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const toggle = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, isDark: theme === 'dark', isLight: theme === 'light', toggle, setTheme };
}
