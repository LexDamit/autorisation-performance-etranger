import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress,
  List, ListItem, ListItemText, ListItemAvatar, Avatar,
  Divider, LinearProgress,
} from '@mui/material';
import AssignmentIcon      from '@mui/icons-material/Assignment';
import SpeedIcon           from '@mui/icons-material/Speed';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon  from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import InfoOutlinedIcon    from '@mui/icons-material/InfoOutlined';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import StatusChip from './StatusChip';

// ── Gradient stat card ───────────────────────────────────────────────────────
function MetricCard({ icon, label, value, gradient, iconBg }) {
  return (
    <Paper sx={{
      p: 3, borderRadius: 3, border: 'none', overflow: 'hidden', position: 'relative',
      background: gradient,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      {/* Decorative circle */}
      <Box sx={{
        position: 'absolute', right: -20, top: -20,
        width: 100, height: 100, borderRadius: '50%',
        bgcolor: 'rgba(255,255,255,0.1)',
      }} />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5,
          bgcolor: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 2, color: 'white', fontSize: 22,
        }}>
          {icon}
        </Box>
        <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, lineHeight: 1, mb: 0.5 }}>
          {value ?? <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.6)' }} />}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

// ── Activity item ────────────────────────────────────────────────────────────
function ActivityItem({ doc, type, isLast }) {
  const date = doc.createdAt?.toDate().toLocaleDateString('fr-LU') || '—';
  const name = (doc.competitions || []).map(c => c.name).filter(Boolean)[0] || '—';
  const isAuth = type === 'autorisation';
  return (
    <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.25 }}>
      <ListItemAvatar sx={{ minWidth: 40 }}>
        <Avatar sx={{
          width: 32, height: 32,
          bgcolor: isAuth ? '#EEF2FF' : '#F0FDF4',
          color: isAuth ? '#3730A3' : '#166534',
        }}>
          {isAuth
            ? <AssignmentIcon sx={{ fontSize: 16 }} />
            : <SpeedIcon sx={{ fontSize: 16 }} />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 180 }}>{name}</Typography>
            <StatusChip status={doc.status} size="small" />
          </Box>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {isAuth ? 'Autorisation' : 'Performance'} · {doc.club} · {date}
          </Typography>
        }
      />
      {!isLast && <Divider component="div" sx={{ position: 'absolute', bottom: 0, left: 40, right: 0 }} />}
    </ListItem>
  );
}

// ── SELTEC progress bar ──────────────────────────────────────────────────────
function SeltecBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FiberManualRecordIcon sx={{ fontSize: 10, color }} />
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
        <Typography variant="body2" fontWeight={700} sx={{ color }}>{value}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{
          height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }} />
    </Box>
  );
}

// ── Status guide pill ────────────────────────────────────────────────────────
const STATUS_GUIDE = [
  { status: 'pending',     label: 'En attente de validation' },
  { status: 'accepted',    label: 'Autorisation accordée' },
  { status: 'to_complete', label: 'Performance à compléter' },
  { status: 'submitted',   label: 'Soumise, en vérification' },
  { status: 'orange',      label: 'Vérification SELTEC (< 2 sem.)' },
  { status: 'green',       label: 'Confirmée dans SELTEC' },
  { status: 'red',         label: 'Non trouvée après 2 sem.' },
];

// ────────────────────────────────────────────────────────────────────────────
export default function HomeDashboard({ userProfile }) {
  const [stats, setStats]   = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const role = userProfile?.role || 'athlete';
  const uid  = auth.currentUser?.uid;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const buildQ = (col) => {
          if (role === 'federation_staff' || role === 'admin')
            return query(collection(db, col), orderBy('createdAt', 'desc'));
          if (role === 'club')
            return query(collection(db, col), where('clubId', '==', userProfile.club), orderBy('createdAt', 'desc'));
          return query(collection(db, col), where('createdBy', '==', uid), orderBy('createdAt', 'desc'));
        };

        const [aSnap, pSnap] = await Promise.all([
          getDocs(buildQ('authorisationRequests')),
          getDocs(buildQ('performanceDeclarations')),
        ]);

        const auths = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const perfs = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setStats({
          authPending:    auths.filter(d => d.status === 'pending').length,
          authAccepted:   auths.filter(d => d.status === 'accepted').length,
          perfTotal:      perfs.length,
          perfRed:        perfs.filter(d => d.seltecStatus === 'red').length,
          perfOrange:     perfs.filter(d => d.seltecStatus === 'orange').length,
          perfGreen:      perfs.filter(d => d.seltecStatus === 'green').length,
          perfToComplete: perfs.filter(d => d.status === 'to_complete').length,
        });

        const combined = [
          ...auths.slice(0, 6).map(d => ({ ...d, _type: 'autorisation' })),
          ...perfs.slice(0, 6).map(d => ({ ...d, _type: 'performance' })),
        ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 7);

        setRecent(combined);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [role, uid, userProfile?.club]); // eslint-disable-line

  const isFed = role === 'federation_staff' || role === 'admin';
  const today = new Date().toLocaleDateString('fr-LU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Metric cards config
  const metrics = [
    {
      label: 'Autorisations en attente',
      value: stats?.authPending,
      icon: <HourglassEmptyIcon fontSize="inherit" />,
      gradient: 'linear-gradient(135deg, #E65100 0%, #FF8A50 100%)',
    },
    {
      label: 'Autorisations acceptées',
      value: stats?.authAccepted,
      icon: <CheckCircleIcon fontSize="inherit" />,
      gradient: 'linear-gradient(135deg, #1B5E20 0%, #43A047 100%)',
    },
    {
      label: 'Performances soumises',
      value: stats?.perfTotal,
      icon: <SpeedIcon fontSize="inherit" />,
      gradient: 'linear-gradient(135deg, #1B3A8F 0%, #4B6AC4 100%)',
    },
    {
      label: isFed ? 'Non trouvées SELTEC' : 'Performances à compléter',
      value: isFed ? stats?.perfRed : stats?.perfToComplete,
      icon: <WarningAmberIcon fontSize="inherit" />,
      gradient: 'linear-gradient(135deg, #7B1FA2 0%, #BA68C8 100%)',
    },
  ];

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Tableau de bord</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, textTransform: 'capitalize' }}>
          {today}
        </Typography>
      </Box>

      {/* Info notice */}
      <Paper sx={{
        p: 2.5, mb: 3, borderRadius: 3, border: 'none',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
        boxShadow: 'none',
        display: 'flex', gap: 2, alignItems: 'flex-start',
      }}>
        <Box sx={{ mt: 0.25, color: '#3730A3', flexShrink: 0 }}>
          <InfoOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#3730A3', mb: 0.25 }}>
            Nouvelles fonctionnalités
          </Typography>
          <Typography variant="body2" sx={{ color: '#4338CA' }}>
            Chaque demande d'autorisation crée automatiquement une fiche de performance pré-remplie à compléter après la compétition.
            {isFed && ' Le statut SELTEC est vérifié automatiquement deux fois par jour.'}
          </Typography>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Metric cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {metrics.map((m, i) => (
              <Grid key={i} item xs={12} sm={6} lg={3}>
                <MetricCard {...m} />
              </Grid>
            ))}
          </Grid>

          {/* Lower section */}
          <Grid container spacing={2.5}>

            {/* SELTEC bar — fed staff / admin */}
            {isFed && (
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2.5 }}>Statut SELTEC</Typography>
                  {(() => {
                    const total = (stats?.perfOrange || 0) + (stats?.perfGreen || 0) + (stats?.perfRed || 0);
                    return (
                      <>
                        <SeltecBar label="En vérification (< 2 sem.)" value={stats?.perfOrange || 0} total={total || 1} color="#E65100" />
                        <SeltecBar label="Trouvées dans SELTEC"       value={stats?.perfGreen  || 0} total={total || 1} color="#2E7D32" />
                        <SeltecBar label="Non trouvées (> 2 sem.)"    value={stats?.perfRed    || 0} total={total || 1} color="#C62828" />
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="caption" color="text.secondary">
                          Vérification automatique 2× / jour via l'API SELTEC.
                        </Typography>
                      </>
                    );
                  })()}
                </Paper>
              </Grid>
            )}

            {/* Recent activity */}
            <Grid item xs={12} md={isFed ? 4 : 6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Activité récente</Typography>
                {recent.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Aucune activité pour le moment.</Typography>
                  </Box>
                ) : (
                  <List dense disablePadding sx={{ position: 'relative' }}>
                    {recent.map((d, i) => (
                      <ActivityItem key={d.id} doc={d} type={d._type} isLast={i === recent.length - 1} />
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Status guide */}
            <Grid item xs={12} md={isFed ? 4 : 6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Guide des statuts</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {STATUS_GUIDE.filter(s =>
                    isFed ? true : !['orange','green','red'].includes(s.status)
                  ).map(({ status, label }) => (
                    <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <StatusChip status={status} />
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

          </Grid>
        </>
      )}
    </Box>
  );
}
