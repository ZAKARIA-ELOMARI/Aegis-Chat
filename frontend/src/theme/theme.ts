// src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

// Color palette
const colors = {
  seashell: '#f1f0f0',
  seashellLight: '#f8f7f7',
  seashellDark: '#e9e8e8',
  mondo: '#42332b',
  mondoLight: '#554237',
  mondoDark: '#332822',
  pottersClay: '#8e5239',
  pottersClayLight: '#a66347',
  pottersClayDark: '#7a472d',
  tussock: '#c68954',
  tussockLight: '#d49968',
  tussockDark: '#b87940',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.pottersClay,
      light: colors.pottersClayLight,
      dark: colors.pottersClayDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.tussock,
      light: colors.tussockLight,
      dark: colors.tussockDark,
      contrastText: '#ffffff',
    },
    background: {
      default: colors.seashell,
      paper: '#ffffff',
    },
    text: {
      primary: colors.mondo,
      secondary: colors.pottersClay,
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: colors.tussock,
      light: colors.tussockLight,
      dark: colors.tussockDark,
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    grey: {
      50: colors.seashellLight,
      100: colors.seashell,
      200: colors.seashellDark,
      300: '#d0d0d0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: colors.mondoLight,
      900: colors.mondo,
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: colors.mondo,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: colors.pottersClay,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none' as const,
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(66, 51, 43, 0.1)',
    '0 2px 6px rgba(66, 51, 43, 0.12)',
    '0 4px 12px rgba(66, 51, 43, 0.15)',
    '0 8px 24px rgba(66, 51, 43, 0.18)',
    '0 12px 36px rgba(66, 51, 43, 0.22)',
    '0 16px 48px rgba(66, 51, 43, 0.25)',
    '0 20px 60px rgba(66, 51, 43, 0.28)',
    '0 24px 72px rgba(66, 51, 43, 0.32)',
    '0 28px 84px rgba(66, 51, 43, 0.35)',
    '0 32px 96px rgba(66, 51, 43, 0.38)',
    '0 36px 108px rgba(66, 51, 43, 0.42)',
    '0 40px 120px rgba(66, 51, 43, 0.45)',
    '0 44px 132px rgba(66, 51, 43, 0.48)',
    '0 48px 144px rgba(66, 51, 43, 0.52)',
    '0 52px 156px rgba(66, 51, 43, 0.55)',
    '0 56px 168px rgba(66, 51, 43, 0.58)',
    '0 60px 180px rgba(66, 51, 43, 0.62)',
    '0 64px 192px rgba(66, 51, 43, 0.65)',
    '0 68px 204px rgba(66, 51, 43, 0.68)',
    '0 72px 216px rgba(66, 51, 43, 0.72)',
    '0 76px 228px rgba(66, 51, 43, 0.75)',
    '0 80px 240px rgba(66, 51, 43, 0.78)',
    '0 84px 252px rgba(66, 51, 43, 0.82)',
    '0 88px 264px rgba(66, 51, 43, 0.85)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: '0 2px 6px rgba(66, 51, 43, 0.12)',
          transition: 'all 0.3s ease-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(66, 51, 43, 0.15)',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${colors.pottersClay} 0%, ${colors.tussock} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${colors.pottersClayDark} 0%, ${colors.tussockDark} 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(66, 51, 43, 0.15)',
          transition: 'all 0.3s ease-out',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(66, 51, 43, 0.18)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 6px rgba(66, 51, 43, 0.12)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(66, 51, 43, 0.1)',
        },
        elevation2: {
          boxShadow: '0 2px 6px rgba(66, 51, 43, 0.12)',
        },
        elevation3: {
          boxShadow: '0 4px 12px rgba(66, 51, 43, 0.15)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: colors.seashellLight,
            transition: 'all 0.3s ease-out',
            '&:hover': {
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 6px rgba(66, 51, 43, 0.12)',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: `0 0 0 3px rgba(200, 137, 84, 0.1)`,
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${colors.seashellDark}`,
          boxShadow: '0 8px 24px rgba(66, 51, 43, 0.18)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${colors.mondo} 0%, ${colors.pottersClay} 100%)`,
          boxShadow: '0 8px 24px rgba(66, 51, 43, 0.18)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          transition: 'all 0.3s ease-out',
          '&:hover': {
            backgroundColor: colors.seashellDark,
            transform: 'translateX(4px)',
            boxShadow: '0 2px 6px rgba(66, 51, 43, 0.12)',
          },
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${colors.pottersClay} 0%, ${colors.tussock} 100%)`,
            color: '#ffffff',
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.pottersClayDark} 0%, ${colors.tussockDark} 100%)`,
            },
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${colors.pottersClay} 0%, ${colors.tussock} 100%)`,
          color: '#ffffff',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(66, 51, 43, 0.15)',
        },
      },
    },
  },
});

export default theme;