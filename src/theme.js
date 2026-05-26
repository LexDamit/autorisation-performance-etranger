import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary:    { main: '#1B3A8F', light: '#4B6AC4', dark: '#0D2260', contrastText: '#fff' },
    secondary:  { main: '#D32F2F', light: '#EF5350', dark: '#B71C1C', contrastText: '#fff' },
    success:    { main: '#2E7D32', light: '#4CAF50', dark: '#1B5E20' },
    warning:    { main: '#E65100', light: '#FF8A50', dark: '#BF360C' },
    error:      { main: '#C62828', light: '#EF5350', dark: '#8E0000' },
    info:       { main: '#0277BD', light: '#29B6F6', dark: '#01579B' },
    background: { default: '#F0F2F7', paper: '#FFFFFF' },
    text:       { primary: '#1A202C', secondary: '#64748B' },
    divider:    '#E2E8F0',
  },

  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700, letterSpacing: '-0.3px' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B' },
    body2:  { fontSize: '0.875rem' },
    caption: { fontSize: '0.78rem' },
  },

  shape: { borderRadius: 10 },

  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 3px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
    '0 6px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
    '0 10px 24px rgba(0,0,0,0.09), 0 4px 8px rgba(0,0,0,0.05)',
    '0 14px 32px rgba(0,0,0,0.10)',
    ...Array(19).fill('none'),
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F0F2F7', scrollbarWidth: 'thin' },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #E2E8F0' },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 18px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1B3A8F 0%, #2D55C8 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #0D2260 0%, #1B3A8F 100%)' },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600, fontSize: '0.75rem' },
        colorWarning:  { backgroundColor: '#FFF3E0', color: '#E65100', border: '1px solid #FFCCBC' },
        colorSuccess:  { backgroundColor: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9' },
        colorError:    { backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' },
        colorInfo:     { backgroundColor: '#E3F2FD', color: '#0277BD', border: '1px solid #BBDEFB' },
        colorDefault:  { backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: { '& .MuiTableCell-head': { fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' } },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: { '&:last-child td': { borderBottom: 0 }, '&:hover': { backgroundColor: '#F8FAFC' } },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#F1F5F9', padding: '12px 16px' },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, border: '1px solid' },
        standardInfo:    { borderColor: '#BBDEFB', backgroundColor: '#E3F2FD' },
        standardWarning: { borderColor: '#FFCCBC', backgroundColor: '#FFF3E0' },
        standardSuccess: { borderColor: '#C8E6C9', backgroundColor: '#E8F5E9' },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '8px 12px',
          transition: 'all 0.15s ease',
        },
      },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': { borderColor: '#E2E8F0' },
            '&:hover fieldset': { borderColor: '#94A3B8' },
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: '#F1F5F9' } },
    },
  },
});

export default theme;
