import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import AuthorisationForm from './components/AuthorisationForm';
import AdminDashboard from './components/AdminDashboard';
import Layout from './components/Layout';
import { Button, Box } from '@mui/material';
import PerformanceForm from './components/PerformanceForm';


function App() {
  const [user, setUser] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [page, setPage] = useState('authorisation');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  if (!user) {
    return showSignUp ? (
      <Layout>
        <SignUpForm onSignUp={() => setShowSignUp(false)} />
      </Layout>
    ) : (
      <Layout>
        <LoginForm 
          onLogin={() => {}} 
          onSwitchToSignUp={() => setShowSignUp(true)} 
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button 
          variant={page === 'authorisation' ? 'contained' : 'outlined'} 
          onClick={() => setPage('authorisation')}
        >
          Ask Authorisation
        </Button>
        <Button 
          variant={page === 'performance' ? 'contained' : 'outlined'} 
          onClick={() => setPage('performance')}
        >
          Log Performance
        </Button>
        {user.email === 'admin@example.com' && (
          <Button 
            variant={page === 'dashboard' ? 'contained' : 'outlined'} 
            onClick={() => setPage('dashboard')}
          >
            Admin Dashboard
          </Button>
        )}
        <Button 
          variant="contained" 
          color="error" 
          onClick={() => signOut(auth)}
        >
          Logout
        </Button>
      </Box>

      {page === 'authorisation' && <AuthorisationForm user={user} />}
      {page === 'performance' && <PerformanceForm user={user} />}
      {page === 'dashboard' && <AdminDashboard />}
    </Layout>
  );
}

export default App;

