import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { ThemeMode, ThemeTokens, ButtonTokens, themes, legacyPalettes, LegacyPalette } from '../theme';

// ---------------------------------------------------------------------------
// Backward-compatible "flat" color shape consumed by the shared component
// library (components.tsx) and App.tsx. It is entirely DERIVED from the
// `ThemeTokens` design tokens in theme.ts — never define colors here.
// ---------------------------------------------------------------------------
export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  border: string;
  softBorder: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  accent: string;
  secondaryAccent: string;
  buttonText: string;
  overlay: string;
}

function toThemeColors(t: ThemeTokens): ThemeColors {
  return {
    background: t.screenBackground,
    surface: t.boxBackground,
    card: t.cardBackground,
    border: t.border,
    softBorder: t.softBorder,
    primaryText: t.primaryText,
    secondaryText: t.secondaryText,
    mutedText: t.mutedText,
    accent: t.secondaryButton.background,
    secondaryAccent: t.secondaryButton.backgroundAlt,
    buttonText: t.secondaryButton.text,
    overlay: t.overlay,
  };
}

interface ThemeContextValue {
  /** The full, centralized design-token object for the active mode. */
  theme: ThemeTokens;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;

  // ---- Backward-compatible aliases (existing components/screens) --------
  /** @deprecated prefer `theme` — kept for components already using `colors`. */
  colors: ThemeColors;
  /** @deprecated prefer `theme` — kept for screens still using the flat legacy palette shape. */
  palette: LegacyPalette;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default state: DARK MODE on initial render.
  const [mode, setMode] = useState<ThemeMode>('dark');

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = themes[mode];
    return {
      theme,
      mode,
      isDark: mode === 'dark',
      toggleTheme,
      setThemeMode,
      colors: toThemeColors(theme),
      palette: legacyPalettes[mode],
    };
  }, [mode, toggleTheme, setThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Primary hook. Every themed component should call this — it re-renders
 * automatically whenever `toggleTheme` / `setThemeMode` changes the mode,
 * so colors always reflect the mode active on the CURRENT render (unlike
 * reading the old mutable `palette` singleton from theme.ts at import time).
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Convenience hook for screens that still use the flat legacy
 * `palette.text` / `palette.muted` / ... shape. Prefer `useTheme().theme`
 * in new code, but this keeps older screens both compiling AND reactive —
 * unlike `import { palette } from '../theme'`, which is a frozen snapshot.
 */
export function useThemePalette(): LegacyPalette {
  return useTheme().palette;
}

export type { ThemeTokens, ButtonTokens };
