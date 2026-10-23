import React, { createContext, useContext, useMemo, useState } from 'react';

export const darkColors = {
  mode: 'dark',
  background: '#0B0D0C',
  surface: '#141815',
  surfaceAlt: '#1B211C',
  surfaceStrong: '#232B24',
  border: '#2A342B',
  text: '#F3F7EF',
  textMuted: '#9DAA9A',
  textSubtle: '#6F7C6E',
  primary: '#C6FF3D',
  primaryDark: '#8FC51A',
  primaryText: '#101505',
  accent: '#4DE0A1',
  danger: '#FF6B6B',
  warning: '#FFC857',
  info: '#6CB8FF',
  water: '#58A6FF',
  protein: '#4DE0A1',
  carbs: '#FFC857',
  fat: '#FF8A65',
  overlay: 'rgba(0,0,0,0.65)',
  input: '#101412',
  successSoft: 'rgba(77,224,161,0.12)',
  dangerSoft: 'rgba(255,107,107,0.12)',
  warningSoft: 'rgba(255,200,87,0.12)',
  primarySoft: 'rgba(198,255,61,0.12)',
};

export const lightColors = {
  mode: 'light',
  background: '#F4F6F1',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1E8',
  surfaceStrong: '#E2E9DA',
  border: '#D5DDCE',
  text: '#121711',
  textMuted: '#5F6A5C',
  textSubtle: '#7C8878',
  primary: '#6E9B0F',
  primaryDark: '#557A08',
  primaryText: '#FFFFFF',
  accent: '#11855B',
  danger: '#C93A3A',
  warning: '#9A6B00',
  info: '#1F6FB2',
  water: '#2A7FD4',
  protein: '#11855B',
  carbs: '#9A6B00',
  fat: '#C25A36',
  overlay: 'rgba(0,0,0,0.35)',
  input: '#FFFFFF',
  successSoft: 'rgba(17,133,91,0.10)',
  dangerSoft: 'rgba(201,58,58,0.10)',
  warningSoft: 'rgba(154,107,0,0.10)',
  primarySoft: 'rgba(110,155,15,0.12)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  small: { fontSize: 13, fontWeight: '400' },
  tiny: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
};

const ThemeContext = createContext({
  mode: 'dark',
  colors: darkColors,
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children, initialMode = 'dark' }) {
  const [mode, setMode] = useState(initialMode === 'light' ? 'light' : 'dark');
  const value = useMemo(
    () => ({
      mode,
      colors: mode === 'light' ? lightColors : darkColors,
      setMode,
      toggleTheme: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [mode]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function createStyles(colors) {
  return {
    screen: { flex: 1, backgroundColor: colors.background },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    text: { color: colors.text },
    muted: { color: colors.textMuted },
  };
}
