import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Collapse, IconButton, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Alert, TextField, Grid,
} from '@mui/material';
import KeyboardArrowDownIcon  from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon    from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon     from '@mui/icons-material/CancelOutlined';
import HourglassEmptyIcon     from '@mui/icons-material/HourglassEmpty';
import EmojiEventsIcon        from '@mui/icons-material/EmojiEvents';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import StatusChip from './StatusChip';

// ── Expand row ────────────────────────────────────────────────────────────────
function Row({ row, onAction }) {
  const [open, setOpen] = useState(false);
  const isPending = row.status === 'pending';

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
        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
          <Typography variant="body2" fontWeight={500}>{row.club}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>{row.firstName} {row.lastName}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{row.email}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {(row.competitions || []).map(c => c.name).filter(Boolean).join(', ') || '—'}
          </Typography>
        </TableCell>
        <TableCell><StatusChip status={row.status} /></TableCell>
        <TableCell onClick={e => e.stopPropagation()}>
          {isPending && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small" variant="contained" color="success"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => onAction(row, 'accepted')}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Accepter
              </Button>
              <Button
                size="small" variant="outlined" color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => onAction(row, 'rejected')}
              >
                Refuser
              </Button>
            </Box>
          )}
        </TableCell>
      </TableRow>

      {/* Detail panel */}
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>

              {/* ── One block per competition ── */}
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
                      <Typography variant="caption" sx={{ display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.06em', mb: 0.25 }}>Date(s)</Typography>
                      <Typography variant="body2">
                        {comp.dates?.filter(Boolean).join(', ') || comp.date || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm="auto" sx={{ minWidth: 100 }}>
                      <Typography variant="caption" sx={{ display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.06em', mb: 0.25 }}>Lieu</Typography>
                      <Typography variant="body2">{comp.place || '—'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm="auto" sx={{ minWidth: 80 }}>
                      <Typography variant="caption" sx={{ display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.06em', mb: 0.25 }}>Pays</Typography>
                      <Typography variant="body2">{comp.country || '—'}</Typography>
                    </Grid>
                    {comp.site && (
                      <Grid item xs={12} sm="auto">
                        <Typography variant="caption" sx={{ display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.06em', mb: 0.25 }}>Site internet</Typography>
                        <Typography variant="body2">
                          <a href={comp.site} target="_blank" rel="noopener noreferrer" style={{ color: '#1B3A8F' }}>{comp.site}</a>
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
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75 }}>Athlète</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>Catégorie</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>Sexe</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 0.75 }}>Épreuve(s)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {comp.athletes.map((ath, ai) => (
                            <TableRow key={ai} sx={{ '&:last-child td': { borderBottom: 'none' }, bgcolor: 'white' }}>
                              <TableCell sx={{ py: 0.75 }}>
                                <Typography variant="body2" fontWeight={500}>{ath.firstName} {ath.lastName}</Typography>
                                {ath.licenceNumber && (
                                  <Typography variant="caption" color="text.secondary">N° {ath.licenceNumber}</Typography>
                                )}
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

              {/* ── Footer: remarks, comment, status ── */}
              {(row.remarks || row.comment || row.acceptedAt) && (
                <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #E2E8F0', bgcolor: 'white', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {row.remarks && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      <strong>Remarques du demandeur :</strong> {row.remarks}
                    </Typography>
                  )}
                  {row.comment && (
                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: row.status === 'accepted' ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${row.status === 'accepted' ? '#BBF7D0' : '#FECACA'}` }}>
                      <Typography variant="caption" fontWeight={700} color={row.status === 'accepted' ? 'success.main' : 'error.main'} display="block" sx={{ mb: 0.25 }}>
                        Commentaire de la fédération :
                      </Typography>
                      <Typography variant="caption" color="text.primary">{row.comment}</Typography>
                    </Box>
                  )}
                  {row.acceptedAt && (
                    <Typography variant="caption" color={row.status === 'accepted' ? 'success.main' : 'error.main'}>
                      {row.status === 'accepted' ? '✓ Acceptée' : '✗ Refusée'} le {row.acceptedAt.toDate().toLocaleDateString('fr-LU')}
                    </Typography>
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
export default function FedStaffAutorisations() {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [confirm, setConfirm]         = useState(null);   // { row, action }
  const [confirmComment, setConfirmComment] = useState('');
  const [processing, setProcessing]   = useState(false);
  const [filter, setFilter]         = useState('pending');

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'authorisationRequests'), orderBy('createdAt', 'desc'))
      );
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async () => {
    if (!confirm) return;
    const { row, action } = confirm;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'authorisationRequests', row.id), {
        status: action,
        acceptedBy: auth.currentUser?.uid || null,
        acceptedAt: serverTimestamp(),
        ...(confirmComment.trim() ? { comment: confirmComment.trim() } : {}),
      });
      if (action === 'accepted' && process.env.NODE_ENV !== 'development') {
        await fetch('https://sendacceptanceemail-t2aq3fohza-uc.a.run.app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: row.email, emailsCc: row.emailsCc || [],
            club: row.club, firstName: row.firstName, lastName: row.lastName,
            competitions: row.competitions,
            comment: confirmComment.trim() || '',
          }),
        }).catch(err => console.warn('Email acceptance failed:', err));
      }
      setConfirm(null);
      setConfirmComment('');
      await load();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour.');
    }
    setProcessing(false);
  };

  const filtered     = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const FILTERS = [
    { key: 'pending',  label: 'En attente', count: requests.filter(r=>r.status==='pending').length  },
    { key: 'accepted', label: 'Acceptées',  count: requests.filter(r=>r.status==='accepted').length },
    { key: 'rejected', label: 'Refusées',   count: requests.filter(r=>r.status==='rejected').length },
    { key: 'all',      label: 'Toutes',     count: requests.length },
  ];

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Valider les autorisations</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {pendingCount > 0
            ? `${pendingCount} demande${pendingCount !== 1 ? 's' : ''} en attente de validation`
            : 'Aucune demande en attente'}
        </Typography>
      </Box>

      {pendingCount > 0 && (
        <Alert
          severity="warning"
          icon={<HourglassEmptyIcon />}
          sx={{ mb: 3 }}
        >
          <strong>{pendingCount} demande{pendingCount !== 1 ? 's' : ''}</strong> en attente de votre validation.
        </Alert>
      )}

      {/* Filter chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <Chip
            key={f.key}
            label={`${f.label} (${f.count})`}
            clickable
            variant={filter === f.key ? 'filled' : 'outlined'}
            color={filter === f.key ? 'primary' : 'default'}
            onClick={() => setFilter(f.key)}
          />
        ))}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">Aucune demande dans cette catégorie.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Date</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Club</TableCell>
                <TableCell>Demandeur</TableCell>
                <TableCell>Compétitions</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(r => (
                <Row key={r.id} row={r} onAction={(row, action) => setConfirm({ row, action })} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirm dialog */}
      <Dialog
        open={Boolean(confirm)}
        onClose={() => { if (!processing) { setConfirm(null); setConfirmComment(''); } }}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 420 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          {confirm?.action === 'accepted' ? 'Accepter la demande' : 'Refuser la demande'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {confirm?.action === 'accepted'
              ? `Confirmer l'autorisation de ${confirm?.row?.firstName} ${confirm?.row?.lastName} (${confirm?.row?.club}) ? Un email de confirmation sera envoyé automatiquement.`
              : `Refuser la demande de ${confirm?.row?.firstName} ${confirm?.row?.lastName} (${confirm?.row?.club}) ?`}
          </DialogContentText>
          <TextField
            fullWidth
            size="small"
            label="Commentaire (optionnel)"
            placeholder={confirm?.action === 'accepted'
              ? 'ex: Bien reçu, bonne chance !'
              : 'ex: Compétition non agréée pour cette catégorie'}
            value={confirmComment}
            onChange={e => setConfirmComment(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => { setConfirm(null); setConfirmComment(''); }} disabled={processing} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={handleAction} disabled={processing}
            variant="contained" color={confirm?.action === 'accepted' ? 'success' : 'error'}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
