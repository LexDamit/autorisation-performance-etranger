import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Box, Paper, Typography, TextField, Button, Divider,
  Alert, CircularProgress, InputAdornment, IconButton,
  FormControl, InputLabel, Select, MenuItem, Grid,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import VisibilityIcon        from '@mui/icons-material/Visibility';
import VisibilityOffIcon     from '@mui/icons-material/VisibilityOff';

const CLUBS = [
  '-', 'CA Belvaux', 'CA Dudelange', 'CAE Grevenmacher', 'CA FOLA',
  'CAPA Ettelbruck', 'CA Schifflange', 'CELTIC Diekirch', 'CS Luxembourg',
  'CS du Nord', 'LIAL Luxembourg', 'RBUAP', 'TRILUX', 'TRISPEED Mamer', 'X3M', 'FLA-IND',
];

export default function SignUpForm({ onSignUp, onSwitchToLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [club, setClub]           = useState('-');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email,
        firstName,
        lastName,
        club: club === '-' ? '' : club,
        role: 'athlete',
        createdAt: serverTimestamp(),
      });
      onSignUp();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible.');
      } else {
        setError(err.message);
      }
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
      <Box sx={{ width: '100%', maxWidth: 480 }}>

        {/* FLA branding */}
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
              bgcolor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 1.5,
            }}>
              <PersonAddOutlinedIcon sx={{ color: '#166534', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Créer un compte</Typography>
            <Typography variant="caption" color="text.secondary">
              Accès réservé aux athlètes et clubs licenciés FLA
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSignUp} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Prénom" autoComplete="given-name"
                  value={firstName} onChange={e => setFirstName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Nom" autoComplete="family-name"
                  value={lastName} onChange={e => setLastName(e.target.value)} />
              </Grid>
            </Grid>

            <TextField
              fullWidth required label="Adresse email" type="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
            />

            <TextField
              fullWidth required label="Mot de passe"
              type={showPwd ? 'text' : 'password'} autoComplete="new-password"
              helperText="Au moins 6 caractères"
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

            <FormControl fullWidth>
              <InputLabel>Club</InputLabel>
              <Select value={club} label="Club" onChange={e => setClub(e.target.value)}>
                <MenuItem value="-"><em>— Aucun club —</em></MenuItem>
                {CLUBS.filter(c => c !== '-').map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              fullWidth type="submit" variant="contained" color="success" size="large"
              disabled={loading}
              sx={{ mt: 0.5, py: 1.4, fontSize: '0.95rem' }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Créer mon compte'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary">ou</Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" component="span">
              Déjà un compte ?{' '}
            </Typography>
            <Button
              size="small"
              onClick={onSwitchToLogin}
              sx={{ fontWeight: 700, fontSize: '0.85rem', ml: 0.5, p: '2px 6px' }}
            >
              Se connecter
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
