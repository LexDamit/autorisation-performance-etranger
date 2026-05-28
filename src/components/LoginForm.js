import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  Box, Paper, Typography, TextField, Button,
  Alert, CircularProgress, InputAdornment, IconButton, Link,
} from '@mui/material';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export default function LoginForm({ onLogin, onSwitchToSignUp }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch {
      setError('Email ou mot de passe incorrect. Veuillez réessayer.');
    }
    setLoading(false);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #EAF1FB 0%, #D6E8F7 50%, #EDF4FB 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <Paper elevation={0} sx={{
          p: { xs: 3.5, sm: 4.5 },
          borderRadius: 4,
          boxShadow: '0 4px 40px rgba(0,0,0,0.10)',
          border: '1px solid rgba(255,255,255,0.8)',
        }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 3.5 }}>
            <Box component="img" src="/fla_etranger.png" alt="FLA Étranger"
              sx={{ height: 64, width: 'auto', maxWidth: 220, objectFit: 'contain' }} />
          </Box>

          {/* Title */}
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: '#0F172A' }}>
            Login
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Performances à l'étranger — FLA
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth required
              placeholder="Email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#F8FAFC' } }}
            />
            <TextField
              fullWidth required
              placeholder="Password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#F8FAFC' } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwd(s => !s)} edge="end" size="small" tabIndex={-1}>
                      {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading}
              sx={{
                mt: 0.5, py: 1.5, fontSize: '0.95rem', fontWeight: 600,
                borderRadius: 2.5,
                bgcolor: '#0F172A',
                '&:hover': { bgcolor: '#1E293B' },
                boxShadow: 'none',
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
            </Button>
          </Box>

          {/* Links */}
          <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            <Link onClick={onSwitchToSignUp} underline="hover"
              sx={{ fontSize: '0.82rem', color: '#1B3A8F', cursor: 'pointer' }}>
              Créer un compte
            </Link>
            <Link href="mailto:informatique@fla.lu" underline="hover"
              sx={{ fontSize: '0.82rem', color: '#1B3A8F' }}>
              Mot de passe oublié
            </Link>
          </Box>
        </Paper>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2.5, color: '#94A3B8' }}>
          © {new Date().getFullYear()} Fédération Luxembourgeoise d'Athlétisme
        </Typography>
      </Box>
    </Box>
  );
}
