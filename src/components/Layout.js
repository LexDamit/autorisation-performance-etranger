import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Container } from '@mui/material';

function Layout({ children, user, userProfile, currentPage, onPageChange, onLogout }) {
  const isAdmin = userProfile?.role === 'admin';

  return (
    <>
      <AppBar position="sticky" elevation={1} sx={{ backgroundColor: 'white', color: 'black' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              component="img"
              src="/federation_logo.png"
              alt="Federation Logo"
              sx={{ height: 100, width: 100, objectFit: 'contain', mr: 3 }}
            />
            <Typography variant="h6" fontWeight="bold">
              Performances à l'étranger
            </Typography>
          </Box>

          {user && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant={currentPage === 'authorisation' ? 'contained' : 'outlined'}
                onClick={() => onPageChange('authorisation')}
              >
                Demande d'Autorisation
              </Button>

              <Button
                variant={currentPage === 'performance' ? 'contained' : 'outlined'}
                onClick={() => onPageChange('performance')}
              >
                Remonter des performances
              </Button>

              {isAdmin && (
                <Button
                  variant={currentPage === 'dashboard' ? 'contained' : 'outlined'}
                  onClick={() => onPageChange('dashboard')}
                >
                  Admin Dashboard
                </Button>
              )}

              <Button variant="contained" color="error" onClick={onLogout}>
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        {children}
      </Container>

      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 2,
          backgroundColor: '#f5f5f5',
          borderTop: '1px solid #ddd',
          mt: 4
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Fédération Luxembourgeoise d'Athlétisme. Tous droits réservés.
        </Typography>
      </Box>
    </>
  );
}

export default Layout;