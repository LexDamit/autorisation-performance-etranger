import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  Box, Paper, Typography, TextField, Button, Divider,
  Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import LockOutlinedIcon  from '@mui/icons-material/LockOutlined';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export default function LoginForm({ onLogin, onSwitchToSignUp }) {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
      background: 'linear-gradient(135deg, #0D1B4E 0%, #1B3A8F 50%, #4B6AC4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>

        {/* FLA branding above card */}
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box component="img" src="/federation_logo.png" alt="FLA"
            sx={{ height: 72, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }} />
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mt: 1.5, lineHeight: 1.2 }}>
            Fédération Luxembourgeoise
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
            d'Athlétisme
          </Typography>
        </Box>

        {/* Card */}
        <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, boxShadow: '0 24px 64px rgba(0,0,0,0.35)', border: 'none' }}>
          {/* Card header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '50%',
              bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 1.5,
            }}>
              <LockOutlinedIcon sx={{ color: '#3730A3', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Connexion</Typography>
            <Typography variant="caption" color="text.secondary">
              Gestion des performances à l'étranger
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth required label="Adresse email" type="email"
              autoComplete="email" autoFocus
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <TextField
              fullWidth required label="Mot de passe"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
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
              sx={{ mt: 0.5, py: 1.4, fontSize: '0.95rem' }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Se connecter'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary">ou</Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" component="span">
              Pas encore de compte ?{' '}
            </Typography>
            <Button
              size="small" onClick={onSwitchToSignUp}
              sx={{ fontWeight: 700, fontSize: '0.85rem', ml: 0.5, p: '2px 6px' }}
            >
              Créer un compte
            </Button>
          </Box>
        </Paper>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.4)' }}>
          © {new Date().getFullYear()} Fédération Luxembourgeoise d'Athlétisme
        </Typography>
      </Box>
    </Box>
  );
}
