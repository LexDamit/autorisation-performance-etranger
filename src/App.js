import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import AuthorisationForm from './components/AuthorisationForm';
import AdminDashboard from './components/AdminDashboard';
import Layout from './components/Layout';
import PerformanceForm from './components/PerformanceForm';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [page, setPage] = useState('authorisation');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoadingUser(true);
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error('Erreur récupération profil utilisateur:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoadingUser(false);
    });

    return unsubscribe;
  }, []);

  if (loadingUser) {
    return (
      <Layout>
        <div style={{ padding: '2rem' }}>Chargement...</div>
      </Layout>
    );
  }

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

  const isAdmin = userProfile?.role === 'admin';

  return (
    <Layout
      user={user}
      userProfile={userProfile}
      currentPage={page}
      onPageChange={setPage}
      onLogout={() => signOut(auth)}
    >
      {page === 'authorisation' && <AuthorisationForm user={user} />}
      {page === 'performance' && <PerformanceForm user={user} />}
      {page === 'dashboard' && isAdmin && <AdminDashboard />}
    </Layout>
  );
}

export default App;