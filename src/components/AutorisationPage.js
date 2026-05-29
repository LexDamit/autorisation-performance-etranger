import React, { useEffect, useState } from 'react';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Collapse, IconButton,
  CircularProgress, Grid, Chip,
} from '@mui/material';
import AddIcon               from '@mui/icons-material/Add';
import RemoveIcon            from '@mui/icons-material/Remove';
import KeyboardArrowDownIcon  from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon    from '@mui/icons-material/KeyboardArrowUp';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EmojiEventsIcon        from '@mui/icons-material/EmojiEvents';
import {
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import AuthorisationForm from './AuthorisationForm';
import StatusChip from './StatusChip';

// ── Label used in info grid ───────────────────────────────────────────────────
function InfoLabel({ children }) {
  return (
    <Typography variant="caption" sx={{
      display: 'block', color: '#94A3B8', fontWeight: 700,
      textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.06em', mb: 0.25,
    }}>
      {children}
    </Typography>
  );
}

// ── Expand row ───────────────────────────────────────────────────────────────
function Row({ row }) {
  const [open, setOpen] = useState(false);
  const compNames = (row.competitions || []).map(c => c.name).filter(Boolean);

  return (
    <>
      {/* ── Summary row ── */}
      <TableRow
        sx={{ cursor: 'pointer', '& > *': { borderBottom: open ? 'none' : undefined } }}
        onClick={() => setOpen(o => !o)}
      >
        <TableCell padding="checkbox">
          <IconButton size="small" color={open ? 'primary' : 'default'}>
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'text.secondary' }}>
          {row.createdAt?.toDate().toLocaleDateString('fr-LU') || '—'}
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
          <Typography variant="body2" fontWeight={500}>{row.club || '—'}</Typography>
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
          <Typography variant="body2" fontWeight={500}>{row.firstName} {row.lastName}</Typography>
          <Typography variant="caption" color="text.secondary">{row.email}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {compNames.length ? compNames.join(' · ') : '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <StatusChip status={row.status} />
        </TableCell>
      </TableRow>

      {/* ── Expanded detail ── */}
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>

              {/* One block per competition */}
              {(row.competitions || []).map((comp, ci) => (
                <Box key={ci} sx={{
                  p: 2.5,
                  borderBottom: ci < (row.competitions.length - 1) ? '1px dashed #CBD5E1' : 'none',
                }}>
                  {/* Competition header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <EmojiEventsIcon sx={{ fontSize: 16, color: '#1B3A8F' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1B3A8F' }}>
                      {comp.name || '—'}
                    </Typography>
                    {comp.type && (
                      <Chip label={comp.type === 'indoor' ? 'Indoor' : 'Outdoor'} size="small" sx={{
                        fontSize: '0.68rem', height: 20,
                        bgcolor: comp.type === 'indoor' ? '#EEF2FF' : '#F0FDF4',
                        color:   comp.type === 'indoor' ? '#3730A3' : '#166534',
                      }} />
                    )}
                  </Box>

                  {/* Info columns */}
                  <Grid container spacing={2} sx={{ mb: 1.5 }}>
                    <Grid item xs={12} sm="auto" sx={{ minWidth: 140 }}>
                      <InfoLabel>Date(s)</InfoLabel>
                      <Typography variant="body2">
                        {comp.dates?.filter(Boolean).join(', ') || comp.date || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm="auto" sx={{ minWidth: 100 }}>
                      <InfoLabel>Lieu</InfoLabel>
                      <Typography variant="body2">{comp.place || '—'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm="auto" sx={{ minWidth: 80 }}>
                      <InfoLabel>Pays</InfoLabel>
                      <Typography variant="body2">{comp.country || '—'}</Typography>
                    </Grid>
                    {comp.site && (
                      <Grid item xs={12} sm="auto">
                        <InfoLabel>Site internet</InfoLabel>
                        <Typography variant="body2">
                          <a href={comp.site} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#1B3A8F' }}>{comp.site}</a>
                        </Typography>
                      </Grid>
                    )}
                  </Grid>

                  {/* Athletes sub-table */}
                  {(comp.athletes?.length > 0) && (
                    <Box sx={{ borderRadius: 1.5, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75 }}>
                              Athlète
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>
                              Catégorie
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>
                              Sexe
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75 }}>
                              Épreuve(s)
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {comp.athletes.map((ath, ai) => (
                            <TableRow key={ai} sx={{ '&:last-child td': { borderBottom: 'none' }, bgcolor: 'white' }}>
                              <TableCell sx={{ py: 0.75 }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {ath.firstName} {ath.lastName}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.75, color: 'text.secondary', fontSize: '0.82rem', display: { xs: 'none', sm: 'table-cell' } }}>
                                {ath.category && ath.category !== '-' ? ath.category : '—'}
                              </TableCell>
                              <TableCell sx={{ py: 0.75, color: 'text.secondary', fontSize: '0.82rem', display: { xs: 'none', sm: 'table-cell' } }}>
                                {ath.sex || '—'}
                              </TableCell>
                              <TableCell sx={{ py: 0.75, fontSize: '0.82rem' }}>
                                {ath.events?.filter(Boolean).join(', ') || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </Box>
              ))}

              {/* Remarks + accepted */}
              {(row.remarks || row.acceptedAt) && (
                <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 4, flexWrap: 'wrap', bgcolor: 'white' }}>
                  {row.remarks && (
                    <Box>
                      <InfoLabel>Remarques</InfoLabel>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        {row.remarks}
                      </Typography>
                    </Box>
                  )}
                  {row.acceptedAt && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        ✓ Acceptée le {row.acceptedAt.toDate().toLocaleDateString('fr-LU')}
                      </Typography>
                    </Box>
                  )}
                </Box>
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

  const sortByDate = docs =>
    [...docs].sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

  const load = async () => {
    setLoading(true);
    try {
      let docs;
      if (role === 'federation_staff' || role === 'admin') {
        const snap = await getDocs(collection(db, 'authorisationRequests'));
        docs = sortByDate(snap.docs);
      } else if (role === 'club') {
        // Merge two queries: by clubId (new data) + by createdBy (old data / same account)
        const [s1, s2] = await Promise.all([
          getDocs(query(collection(db, 'authorisationRequests'), where('clubId', '==', userProfile.club))),
          getDocs(query(collection(db, 'authorisationRequests'), where('createdBy', '==', uid))),
        ]);
        const seen = new Set();
        docs = sortByDate([...s1.docs, ...s2.docs].filter(d => seen.has(d.id) ? false : seen.add(d.id)));
      } else if (role === 'shared_account') {
        docs = []; // shared accounts submit but cannot view history
      } else {
        const snap = await getDocs(query(collection(db, 'authorisationRequests'), where('createdBy', '==', uid)));
        docs = sortByDate(snap.docs);
      }
      setRequests(docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const subtitle = role === 'federation_staff' || role === 'admin'
    ? 'Toutes les demandes'
    : role === 'club'
    ? `Club : ${userProfile?.club}`
    : role === 'shared_account'
    ? 'Compte partagé'
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
        <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 3, px: 3 }}>
          <AssignmentOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          {role === 'shared_account' ? (
            <>
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Historique non disponible pour ce compte
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, maxWidth: 440, mx: 'auto' }}>
                Ce compte partagé peut soumettre des demandes, mais ne peut pas consulter l'historique.
                Le club sélectionné lors de chaque demande peut voir toutes les soumissions.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Aucune demande pour le moment
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                Cliquez sur « Nouvelle demande » pour commencer.
              </Typography>
            </>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Date soumis</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Club</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Demandeur</TableCell>
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
