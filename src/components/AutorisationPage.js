import React, { useEffect, useState } from 'react';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Collapse, IconButton,
  CircularProgress, Divider,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import RemoveIcon           from '@mui/icons-material/Remove';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon   from '@mui/icons-material/KeyboardArrowUp';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import {
  collection, query, where, orderBy, getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import AuthorisationForm from './AuthorisationForm';
import StatusChip from './StatusChip';

// ── Expand row ───────────────────────────────────────────────────────────────
function Row({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
        onClick={() => setOpen(o => !o)}
      >
        <TableCell padding="checkbox">
          <IconButton size="small" color={open ? 'primary' : 'default'}>
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
          {row.createdAt?.toDate().toLocaleDateString('fr-LU') || '—'}
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>{row.club || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {row.firstName} {row.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">{row.email}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {(row.competitions || []).map(c => c.name).filter(Boolean).join(', ') || '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <StatusChip status={row.status} />
        </TableCell>
      </TableRow>

      {/* Detail panel */}
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
              {(row.competitions || []).map((comp, i) => (
                <Box key={i} sx={{ mb: i < (row.competitions.length - 1) ? 2.5 : 0 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {comp.name || '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                    {[comp.place, comp.country].filter(Boolean).join(', ')}
                    {comp.dates?.length ? ` — ${comp.dates.filter(Boolean).join(', ')}` : ''}
                  </Typography>
                  {comp.site && (
                    <Typography variant="caption" display="block" sx={{ mb: 0.75 }}>
                      Site : <a href={comp.site} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#1B3A8F' }}>{comp.site}</a>
                    </Typography>
                  )}
                  {(comp.athletes || []).map((a, j) => (
                    <Box key={j} sx={{ ml: 1, display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                      <Typography variant="body2">
                        {a.firstName} {a.lastName}
                        {a.licenceNumber ? ` (N° ${a.licenceNumber})` : ''}
                        {a.events?.length ? ` — ${a.events.filter(Boolean).join(', ')}` : ''}
                      </Typography>
                    </Box>
                  ))}
                  {i < (row.competitions.length - 1) && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
              {row.remarks && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontStyle: 'italic' }}>
                  Remarques : {row.remarks}
                </Typography>
              )}
              {row.acceptedAt && (
                <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                  ✓ Acceptée le {row.acceptedAt.toDate().toLocaleDateString('fr-LU')}
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AutorisationPage({ userProfile }) {
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const role = userProfile?.role;
  const uid  = auth.currentUser?.uid;

  const load = async () => {
    setLoading(true);
    try {
      let q;
      if (role === 'federation_staff' || role === 'admin') {
        q = query(collection(db, 'authorisationRequests'), orderBy('createdAt', 'desc'));
      } else if (role === 'club') {
        q = query(collection(db, 'authorisationRequests'),
          where('clubId', '==', userProfile.club), orderBy('createdAt', 'desc'));
      } else {
        q = query(collection(db, 'authorisationRequests'),
          where('createdBy', '==', uid), orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const subtitle = role === 'federation_staff' || role === 'admin'
    ? 'Toutes les demandes'
    : role === 'club'
    ? `Club : ${userProfile?.club}`
    : 'Mes demandes';

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Demandes d'autorisation</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{subtitle}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={showForm ? <RemoveIcon /> : <AddIcon />}
          onClick={() => setShowForm(s => !s)}
        >
          {showForm ? 'Masquer le formulaire' : 'Nouvelle demande'}
        </Button>
      </Box>

      {/* Form panel */}
      <Collapse in={showForm}>
        <Paper sx={{ p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: 3 }}>
          <AuthorisationForm
            userProfile={userProfile}
            onSubmitSuccess={() => { setShowForm(false); load(); }}
          />
        </Paper>
      </Collapse>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 3 }}>
          <AssignmentOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Aucune demande pour le moment
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Cliquez sur « Nouvelle demande » pour commencer.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Date</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Demandeur</TableCell>
                <TableCell>Compétitions</TableCell>
                <TableCell>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map(r => <Row key={r.id} row={r} />)}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
