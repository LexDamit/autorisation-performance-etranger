import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Container } from '@mui/material';

function Layout({ children, onPageChange, onLogout, currentPage }) {
  return (
    <>
      <AppBar position="sticky" elevation={1} sx={{ backgroundColor: 'white', color: 'black' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Left: logo + title */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              component="img"
              src="/federation_logo.png"
              alt="Federation Logo"
              sx={{
                height: 100,        // Bigger logo
                width: 100,
                objectFit: 'contain',
                mr: 3              // Increased space between logo and text
              }}
            />
            <Typography variant="h6" fontWeight="bold">
              Performances à l'étranger
            </Typography>
          </Box>


      
        </Toolbar>
      </AppBar>
      
      <Container sx={{ mt: 4 }}>
        {children}
      </Container>
    </>
  );
}

export default Layout;
