import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { TextField, Button, Box, Typography } from '@mui/material';

function SignUpForm({ onSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [club, setClub] = useState('');
  const [athleteName, setAthleteName] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      // Save additional info
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email,
        club,
        athleteName
      });
      alert("Account created!");
      onSignUp();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h5" gutterBottom>Sign Up</Typography>
      <form onSubmit={handleSignUp}>
        <TextField fullWidth margin="normal" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField fullWidth margin="normal" type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <TextField fullWidth margin="normal" label="Club" value={club} onChange={(e) => setClub(e.target.value)} />
        <TextField fullWidth margin="normal" label="Athlete Name" value={athleteName} onChange={(e) => setAthleteName(e.target.value)} />
        <Button fullWidth variant="contained" type="submit">Sign Up</Button>
      </form>
    </Box>
  );
}

export default SignUpForm;
