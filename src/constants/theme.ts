export const Colors = {
  primary: '#2857D6',
  primaryDark: '#1F45B2',
  primaryLight: '#EAF0FF',
  accent: '#168A72',
  accentLight: '#E7F6F1',
  success: '#138A68',
  successLight: '#E7F6F1',
  warning: '#B7791F',
  warningLight: '#FFF5D9',
  error: '#C44545',
  errorLight: '#FDECEC',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF2F7',
  textPrimary: '#182230',
  textSecondary: '#667085',
  textTertiary: '#98A2B3',
  textInverse: '#FFFFFF',
  border: '#E3E8EF',
  borderLight: '#EEF1F5',
  overlay: 'rgba(16, 24, 40, 0.48)',
  shadow: 'rgba(16, 24, 40, 0.08)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 26, fontWeight: '700' as const, lineHeight: 34 },
  h3: { fontSize: 21, fontWeight: '700' as const, lineHeight: 29 },
  h4: { fontSize: 17, fontWeight: '700' as const, lineHeight: 24 },
  body1: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body2: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
};
