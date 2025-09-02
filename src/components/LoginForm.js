import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { TextField, Button, Box, Typography } from '@mui/material';

function LoginForm({ onLogin, onSwitchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h5" gutterBottom>Login</Typography>
      <form onSubmit={handleLogin}>
        <TextField fullWidth margin="normal" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField fullWidth margin="normal" type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button fullWidth variant="contained" type="submit">Login</Button>
      </form>
      <Button fullWidth onClick={onSwitchToSignUp} sx={{ mt: 2 }}>Don't have an account? Sign Up</Button>
    </Box>
  );
}

export default LoginForm;
