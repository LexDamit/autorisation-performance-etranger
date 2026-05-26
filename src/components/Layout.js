import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Box, IconButton,
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useMediaQuery, useTheme, Avatar, Chip,
} from '@mui/material';
import MenuIcon          from '@mui/icons-material/Menu';
import HomeIcon          from '@mui/icons-material/Home';
import AssignmentIcon    from '@mui/icons-material/Assignment';
import SpeedIcon         from '@mui/icons-material/Speed';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import ManageSearchIcon  from '@mui/icons-material/ManageSearch';
import PeopleIcon        from '@mui/icons-material/People';
import LogoutIcon        from '@mui/icons-material/Logout';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const DRAWER_WIDTH = 260;

const ROLE_STYLES = {
  athlete:          { bg: '#EEF2FF', color: '#3730A3', label: 'Athlète' },
  club:             { bg: '#F0FDF4', color: '#166534', label: 'Club' },
  federation_staff: { bg: '#FFF7ED', color: '#9A3412', label: 'Fédération Staff' },
  admin:            { bg: '#FDF2F8', color: '#86198F', label: 'Administrateur' },
};

const PREVIEW_ROLES = [
  { value: 'athlete',          label: 'Athlète',          color: '#EEF2FF', textColor: '#3730A3' },
  { value: 'club',             label: 'Club',             color: '#F0FDF4', textColor: '#166534' },
  { value: 'federation_staff', label: 'Staff Fédération', color: '#FFF7ED', textColor: '#9A3412' },
];

function buildNavItems(role) {
  const items = [{ key: 'home', label: 'Accueil', icon: <HomeIcon fontSize="small" /> }];
  if (role === 'athlete' || role === 'club' || role === 'admin') {
    items.push(
      { key: 'authorisation', label: 'Autorisations',  icon: <AssignmentIcon fontSize="small" /> },
      { key: 'performance',   label: 'Performances',   icon: <SpeedIcon fontSize="small" /> },
    );
  }
  if (role === 'federation_staff' || role === 'admin') {
    items.push(
      { key: 'fed_autorisations', label: 'Valider autorisations', icon: <CheckCircleIcon fontSize="small" /> },
      { key: 'fed_performances',  label: 'Vérification SELTEC',  icon: <ManageSearchIcon fontSize="small" /> },
    );
  }
  if (role === 'admin') {
    items.push({ key: 'admin_users', label: 'Utilisateurs', icon: <PeopleIcon fontSize="small" /> });
  }
  return items;
}

export default function Layout({
  children, user, userProfile, effectiveRole,
  currentPage, onPageChange, onLogout,
  previewRole, onPreviewRoleChange,
}) {
  const actualRole  = userProfile?.role || 'athlete';
  const displayRole = effectiveRole || actualRole;
  const isAdmin     = actualRole === 'admin';

  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems   = buildNavItems(displayRole);
  const roleStyle  = ROLE_STYLES[displayRole] || ROLE_STYLES.athlete;
  const actualStyle = ROLE_STYLES[actualRole] || ROLE_STYLES.athlete;

  const initials = user
    ? (userProfile?.firstName?.[0] || user.email?.[0] || '?').toUpperCase()
    : '?';

  const drawerContent = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #0D1B4E 0%, #1B3A8F 100%)',
      color: 'white',
    }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ bgcolor: 'white', borderRadius: 2, px: 1.5, py: 1, display: 'inline-flex', alignItems: 'center' }}>
          <Box component="img" src="/fla_etranger.png" alt="FLA Étranger"
            sx={{ height: 48, width: 'auto', maxWidth: 190, objectFit: 'contain' }} />
        </Box>
      </Box>

      {/* User info */}
      {user && (
        <Box sx={{ px: 2, py: 1.5, mx: 2, mt: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: actualStyle.bg, color: actualStyle.color, fontSize: '0.85rem', fontWeight: 700 }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" noWrap display="block"
                sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '0.78rem' }}>
                {userProfile?.firstName
                  ? `${userProfile.firstName} ${userProfile.lastName || ''}`
                  : user.email}
              </Typography>
              <Box sx={{ display: 'inline-flex', px: 1, py: 0.2, borderRadius: 1, bgcolor: actualStyle.bg, mt: 0.25 }}>
                <Typography variant="caption" sx={{ color: actualStyle.color, fontWeight: 700, fontSize: '0.66rem' }}>
                  {actualStyle.label}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Nav items */}
      {user && (
        <List sx={{ flexGrow: 1, px: 1, py: 1 }}>
          <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.5 }}>
            {previewRole ? `Navigation — ${roleStyle.label}` : 'Navigation'}
          </Typography>
          {navItems.map((item) => {
            const isActive = currentPage === item.key;
            return (
              <ListItem key={item.key} disablePadding sx={{ mb: 0.25 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => { onPageChange(item.key); setMobileOpen(false); }}
                  sx={{
                    borderRadius: 2, py: 1, px: 1.5,
                    color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                    bgcolor: isActive ? 'rgba(255,255,255,0.15) !important' : 'transparent',
                    backdropFilter: isActive ? 'blur(4px)' : 'none',
                    borderLeft: isActive ? '3px solid rgba(255,255,255,0.8)' : '3px solid transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08) !important', color: 'white' },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}

      {/* Admin "View as" role picker */}
      {user && isAdmin && (
        <Box sx={{ mx: 1, mb: 1, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <VisibilityIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Prévisualiser en tant que
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              label="Moi (Admin)"
              size="small"
              clickable
              onClick={() => onPreviewRoleChange(null)}
              sx={{
                fontSize: '0.7rem', height: 24,
                bgcolor: !previewRole ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                color: 'white',
                border: !previewRole ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2) !important' },
              }}
            />
            {PREVIEW_ROLES.map(r => (
              <Chip
                key={r.value}
                label={r.label}
                size="small"
                clickable
                onClick={() => onPreviewRoleChange(r.value)}
                sx={{
                  fontSize: '0.7rem', height: 24,
                  bgcolor: previewRole === r.value ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: previewRole === r.value ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2) !important' },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Logout */}
      {user && (
        <Box sx={{ p: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <ListItemButton onClick={onLogout} sx={{
            borderRadius: 2, py: 1, px: 1.5,
            color: 'rgba(255,255,255,0.5)',
            '&:hover': { bgcolor: 'rgba(239,68,68,0.15) !important', color: '#FCA5A5' },
          }}>
            <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Déconnexion" primaryTypographyProps={{ fontSize: '0.875rem' }} />
          </ListItemButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile top bar */}
      {isMobile && (
        <AppBar position="fixed" elevation={0}
          sx={{ bgcolor: '#0D1B4E', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar variant="dense">
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1, color: 'white' }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ bgcolor: 'white', borderRadius: 1.5, px: 1, py: 0.5, mr: 1, display: 'inline-flex' }}>
              <Box component="img" src="/fla_etranger.png" alt="FLA Étranger"
                sx={{ height: 26, width: 'auto', maxWidth: 110, objectFit: 'contain' }} />
            </Box>
            {previewRole && (
              <Chip label={`Vue : ${ROLE_STYLES[previewRole]?.label}`} size="small"
                sx={{ ml: 'auto', bgcolor: 'rgba(255,200,0,0.2)', color: '#FFD700', borderColor: '#FFD700', fontSize: '0.65rem' }}
                variant="outlined" />
            )}
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}>
          {drawerContent}
        </Drawer>
        <Drawer variant="permanent" open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' },
          }}>
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{
        flexGrow: 1,
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        minHeight: '100vh',
        bgcolor: 'background.default',
        overflow: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Preview banner */}
        {previewRole && (
          <Box sx={{
            px: 3, py: 1,
            bgcolor: '#FEFCE8',
            borderBottom: '2px solid #F59E0B',
            display: 'flex', alignItems: 'center', gap: 1.5,
            position: 'sticky', top: isMobile ? 48 : 0, zIndex: 10,
          }}>
            <VisibilityIcon sx={{ fontSize: 18, color: '#92400E' }} />
            <Typography variant="body2" sx={{ color: '#92400E', fontWeight: 600 }}>
              Mode prévisualisation — Vue {ROLE_STYLES[previewRole]?.label}
            </Typography>
            <Chip
              label="Quitter la prévisualisation"
              size="small"
              icon={<VisibilityOffIcon style={{ fontSize: 14 }} />}
              onClick={() => onPreviewRoleChange(null)}
              sx={{ ml: 'auto', cursor: 'pointer', bgcolor: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B', fontSize: '0.75rem' }}
              variant="outlined"
            />
          </Box>
        )}

        {/* Page content */}
        <Box sx={{
          p: { xs: 2, md: 3 },
          pt: { xs: previewRole ? 1.5 : '56px', md: previewRole ? 1.5 : 3 },
          flexGrow: 1,
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
