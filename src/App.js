import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Box, CircularProgress } from '@mui/material';

import LoginForm             from './components/LoginForm';
import SignUpForm             from './components/SignUpForm';
import Layout                from './components/Layout';
import HomeDashboard         from './components/HomeDashboard';
import AutorisationPage      from './components/AutorisationPage';
import PerformancePage       from './components/PerformancePage';
import FedStaffAutorisations from './components/FedStaffAutorisations';
import FedStaffPerformances  from './components/FedStaffPerformances';
import AdminUsers            from './components/AdminUsers';

function App() {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showSignUp, setShowSignUp]   = useState(false);
  const [page, setPage]               = useState('home');
  const [loadingUser, setLoadingUser] = useState(true);
  const [previewRole, setPreviewRole] = useState(null); // Admin "view as" feature

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setLoadingUser(true);
      setUser(currentUser);
      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          setUserProfile(snap.exists() ? snap.data() : null);
        } catch { setUserProfile(null); }
      } else {
        setUserProfile(null);
        setPreviewRole(null);
      }
      setLoadingUser(false);
    });
    return unsub;
  }, []);

  /* ── Loading splash ─────────────────────────────────────────────────────── */
  if (loadingUser) return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0D1B4E 0%, #1B3A8F 100%)',
    }}>
      <CircularProgress sx={{ color: 'rgba(255,255,255,0.8)' }} size={48} thickness={3} />
    </Box>
  );

  /* ── Auth pages (no sidebar) ────────────────────────────────────────────── */
  if (!user) return showSignUp ? (
    <SignUpForm onSignUp={() => setShowSignUp(false)} onSwitchToLogin={() => setShowSignUp(false)} />
  ) : (
    <LoginForm onLogin={() => {}} onSwitchToSignUp={() => setShowSignUp(true)} />
  );

  const actualRole    = userProfile?.role || 'athlete';
  const effectiveRole = previewRole || actualRole;

  // Profile passed to pages — role is the preview role when active
  const effectiveProfile = previewRole
    ? { ...userProfile, role: previewRole }
    : userProfile;

  const handlePreviewRoleChange = (role) => {
    setPreviewRole(role);
    setPage('home');
  };

  const renderPage = () => {
    switch (page) {
      case 'home':           return <HomeDashboard userProfile={effectiveProfile} />;
      case 'authorisation':  return <AutorisationPage userProfile={effectiveProfile} />;
      case 'performance':    return <PerformancePage userProfile={effectiveProfile} />;
      case 'fed_autorisations':
        if (effectiveRole === 'federation_staff' || effectiveRole === 'admin')
          return <FedStaffAutorisations />;
        return <HomeDashboard userProfile={effectiveProfile} />;
      case 'fed_performances':
        if (effectiveRole === 'federation_staff' || effectiveRole === 'admin')
          return <FedStaffPerformances />;
        return <HomeDashboard userProfile={effectiveProfile} />;
      case 'admin_users':
        if (actualRole === 'admin') return <AdminUsers />;
        return <HomeDashboard userProfile={effectiveProfile} />;
      default:
        return <HomeDashboard userProfile={effectiveProfile} />;
    }
  };

  return (
    <Layout
      user={user}
      userProfile={userProfile}
      effectiveRole={effectiveRole}
      currentPage={page}
      onPageChange={setPage}
      onLogout={() => signOut(auth)}
      previewRole={previewRole}
      onPreviewRoleChange={handlePreviewRoleChange}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
