import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Box, IconButton,
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useMediaQuery, useTheme, Avatar, Chip, Divider,
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

const DRAWER_WIDTH = 252;

const ROLE_STYLES = {
  athlete:          { bg: '#EEF2FF', color: '#3730A3', label: 'Athlète' },
  shared_account:   { bg: '#FFF7ED', color: '#C2410C', label: 'Compte partagé' },
  club:             { bg: '#F0FDF4', color: '#166534', label: 'Club' },
  federation_staff: { bg: '#FFF7ED', color: '#9A3412', label: 'Fédération Staff' },
  admin:            { bg: '#FDF2F8', color: '#86198F', label: 'Administrateur' },
};

const PREVIEW_ROLES = [
  { value: 'athlete',          label: 'Athlète',          color: '#EEF2FF', textColor: '#3730A3' },
  { value: 'shared_account',   label: 'Compte partagé',   color: '#FFF7ED', textColor: '#C2410C' },
  { value: 'club',             label: 'Club',             color: '#F0FDF4', textColor: '#166534' },
  { value: 'federation_staff', label: 'Staff Fédération', color: '#FFF7ED', textColor: '#9A3412' },
];

function buildNavSections(role) {
  const sections = [];

  const base = [{ key: 'home', label: 'Accueil', icon: <HomeIcon fontSize="small" /> }];
  if (role === 'athlete' || role === 'shared_account' || role === 'club' || role === 'admin') {
    base.push(
      { key: 'authorisation', label: 'Autorisations', icon: <AssignmentIcon fontSize="small" /> },
      { key: 'performance',   label: 'Performances',  icon: <SpeedIcon fontSize="small" /> },
    );
  }
  sections.push({ label: 'Navigation', items: base });

  if (role === 'federation_staff' || role === 'admin') {
    sections.push({
      label: 'Fédération',
      items: [
        { key: 'fed_autorisations', label: 'Valider autorisations', icon: <CheckCircleIcon fontSize="small" /> },
        { key: 'fed_performances',  label: 'Vérification SELTEC',  icon: <ManageSearchIcon fontSize="small" /> },
      ],
    });
  }

  if (role === 'admin') {
    sections.push({
      label: 'Administration',
      items: [
        { key: 'admin_users', label: 'Utilisateurs', icon: <PeopleIcon fontSize="small" /> },
      ],
    });
  }

  return sections;
}

export default function Layout({
  children, user, userProfile, effectiveRole,
  currentPage, onPageChange, onLogout,
  previewRole, onPreviewRoleChange,
}) {
  const actualRole   = userProfile?.role || 'athlete';
  const displayRole  = effectiveRole || actualRole;
  const isAdmin      = actualRole === 'admin';

  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections    = buildNavSections(displayRole);
  const actualStyle = ROLE_STYLES[actualRole] || ROLE_STYLES.athlete;

  const initials = user
    ? (userProfile?.firstName?.[0] || user.email?.[0] || '?').toUpperCase()
    : '?';

  const drawerContent = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%',
      bgcolor: 'white',
    }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box component="img" src="/fla_etranger.png" alt="FLA Étranger"
          sx={{ height: 40, width: 'auto', maxWidth: 180, objectFit: 'contain' }} />
      </Box>

      <Divider sx={{ borderColor: '#F1F5F9' }} />

      {/* User info */}
      {user && (
        <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            p: 1.25, borderRadius: 2, bgcolor: '#F8FAFC',
          }}>
            <Avatar sx={{
              width: 32, height: 32,
              bgcolor: actualStyle.bg, color: actualStyle.color,
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" noWrap display="block"
                sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#0F172A', lineHeight: 1.3 }}>
                {userProfile?.firstName
                  ? `${userProfile.firstName} ${userProfile.lastName || ''}`
                  : user.email}
              </Typography>
              <Box sx={{ display: 'inline-flex', px: 0.75, py: 0.1, borderRadius: 0.75, bgcolor: actualStyle.bg, mt: 0.25 }}>
                <Typography variant="caption" sx={{ color: actualStyle.color, fontWeight: 700, fontSize: '0.62rem' }}>
                  {actualStyle.label}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: '#F1F5F9' }} />

      {/* Nav sections */}
      {user && (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
          {sections.map((section, si) => (
            <Box key={section.label} sx={{ mb: si < sections.length - 1 ? 2 : 0 }}>
              <Typography variant="caption" sx={{
                px: 1, mb: 0.5, display: 'block',
                fontSize: '0.62rem', fontWeight: 700,
                color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {section.label}
              </Typography>
              <List disablePadding>
                {section.items.map(item => {
                  const isActive = currentPage === item.key;
                  return (
                    <ListItem key={item.key} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemButton
                        selected={isActive}
                        onClick={() => { onPageChange(item.key); setMobileOpen(false); }}
                        sx={{
                          borderRadius: 1.5, py: 0.85, px: 1.25,
                          color: isActive ? '#1B3A8F' : '#475569',
                          bgcolor: isActive ? '#EEF2FF !important' : 'transparent',
                          '&:hover': { bgcolor: '#F8FAFC !important', color: '#1B3A8F' },
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, color: isActive ? '#1B3A8F' : '#94A3B8' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.855rem',
                            fontWeight: isActive ? 600 : 400,
                            color: 'inherit',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      )}

      {/* Admin "View as" role picker */}
      {user && isAdmin && (
        <>
          <Divider sx={{ borderColor: '#F1F5F9' }} />
          <Box sx={{ mx: 1.5, my: 1.5, p: 1.25, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <VisibilityIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
              <Typography variant="caption" sx={{
                color: '#94A3B8', fontSize: '0.62rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
              }}>
                Aperçu
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip label="Admin" size="small" clickable
                onClick={() => onPreviewRoleChange(null)}
                sx={{
                  fontSize: '0.68rem', height: 22,
                  bgcolor: !previewRole ? '#1B3A8F' : 'white',
                  color: !previewRole ? 'white' : '#475569',
                  border: '1px solid #E2E8F0',
                  '&:hover': { bgcolor: !previewRole ? '#1E3A8A' : '#F1F5F9' },
                }}
              />
              {PREVIEW_ROLES.map(r => (
                <Chip key={r.value} label={r.label} size="small" clickable
                  onClick={() => onPreviewRoleChange(r.value)}
                  sx={{
                    fontSize: '0.68rem', height: 22,
                    bgcolor: previewRole === r.value ? r.color : 'white',
                    color: previewRole === r.value ? r.textColor : '#475569',
                    border: '1px solid #E2E8F0',
                    '&:hover': { bgcolor: r.color },
                  }}
                />
              ))}
            </Box>
          </Box>
        </>
      )}

      <Divider sx={{ borderColor: '#F1F5F9' }} />

      {/* Logout */}
      {user && (
        <Box sx={{ px: 1.5, py: 1 }}>
          <ListItemButton onClick={onLogout} sx={{
            borderRadius: 1.5, py: 0.85, px: 1.25,
            color: '#94A3B8',
            '&:hover': { bgcolor: '#FEF2F2 !important', color: '#EF4444' },
          }}>
            <ListItemIcon sx={{ minWidth: 30, color: 'inherit' }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Déconnexion"
              primaryTypographyProps={{ fontSize: '0.855rem', fontWeight: 400, color: 'inherit' }} />
          </ListItemButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Mobile top bar */}
      {isMobile && (
        <AppBar position="fixed" elevation={0}
          sx={{ bgcolor: 'white', borderBottom: '1px solid #E2E8F0', zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar variant="dense">
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1, color: '#475569' }}>
              <MenuIcon />
            </IconButton>
            <Box component="img" src="/fla_etranger.png" alt="FLA Étranger"
              sx={{ height: 28, width: 'auto', maxWidth: 120, objectFit: 'contain' }} />
            {previewRole && (
              <Chip label={`Vue : ${ROLE_STYLES[previewRole]?.label}`} size="small"
                sx={{ ml: 'auto', bgcolor: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B', fontSize: '0.65rem' }}
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
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', boxShadow: '1px 0 0 #E2E8F0' },
          }}>
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{
        flexGrow: 1,
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        minHeight: '100vh',
        bgcolor: '#F8FAFC',
        overflow: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Preview banner */}
        {previewRole && (
          <Box sx={{
            px: 3, py: 0.875,
            bgcolor: '#FFFBEB',
            borderBottom: '1px solid #FDE68A',
            display: 'flex', alignItems: 'center', gap: 1.5,
            position: 'sticky', top: isMobile ? 48 : 0, zIndex: 10,
          }}>
            <VisibilityIcon sx={{ fontSize: 16, color: '#92400E' }} />
            <Typography variant="body2" sx={{ color: '#92400E', fontWeight: 600, fontSize: '0.82rem' }}>
              Mode prévisualisation — Vue {ROLE_STYLES[previewRole]?.label}
            </Typography>
            <Chip
              label="Quitter"
              size="small"
              icon={<VisibilityOffIcon style={{ fontSize: 13 }} />}
              onClick={() => onPreviewRoleChange(null)}
              sx={{ ml: 'auto', cursor: 'pointer', bgcolor: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B', fontSize: '0.72rem' }}
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
