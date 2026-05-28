import React, { useEffect, useState } from 'react';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Chip, Collapse, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tooltip,
  IconButton,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import RemoveIcon        from '@mui/icons-material/Remove';
import EditNoteIcon      from '@mui/icons-material/EditNote';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import LinkOffIcon       from '@mui/icons-material/LinkOff';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../firebase';
import PerformanceForm from './PerformanceForm';
import StatusChip from './StatusChip';

// ── One visual row per competition within a declaration ──────────────────────
function PerfRow({ doc, comp, onComplete, onUnlink }) {
  const submittedDate = doc.createdAt?.toDate().toLocaleDateString('fr-LU') || '—';
  const seltec        = doc.seltecStatus;
  const isToComplete  = doc.status === 'to_complete';

  return (
    <TableRow sx={{ verticalAlign: 'top', bgcolor: isToComplete ? '#FFFBEB' : 'inherit' }}>

      {/* Date */}
      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.82rem', pt: 2 }}>
        {submittedDate}
      </TableCell>

      {/* Club */}
      <TableCell sx={{ pt: 2, display: { xs: 'none', sm: 'table-cell' } }}>
        <Typography variant="body2" fontWeight={500}>{doc.club}</Typography>
      </TableCell>

      {/* Competition */}
      <TableCell sx={{ pt: 2, minWidth: 180 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
          {comp.name || '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {[comp.place, comp.country].filter(Boolean).join(', ')}
        </Typography>
        {comp.date && (
          <Typography variant="caption" color="text.secondary">{comp.date}</Typography>
        )}
      </TableCell>

      {/* Athletes + performances */}
      <TableCell sx={{ pt: 2 }}>
        {(comp.athletes || []).map((ath, ai) => (
          <Box key={ai} sx={{
            mb: ai < (comp.athletes.length - 1) ? 1.5 : 0,
            pb: ai < (comp.athletes.length - 1) ? 1.5 : 0,
            borderBottom: ai < (comp.athletes.length - 1) ? '1px dashed #E2E8F0' : 'none',
          }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 0.25 }}>
              {ath.firstName} {ath.lastName}
              {ath.licenceNumber && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                  N° {ath.licenceNumber}
                </Typography>
              )}
            </Typography>
            {(ath.performances || []).map((p, pi) => (
              <Box key={pi} sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', ml: 1, mb: 0.25, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', minWidth: 80 }}>
                  {p.event || '—'}
                </Typography>
                {p.result ? (
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {p.result}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: 'warning.main', fontStyle: 'italic' }}>
                    résultat manquant
                  </Typography>
                )}
                {p.wind && p.wind !== '/' && (
                  <Typography variant="caption" color="text.secondary">vent {p.wind}</Typography>
                )}
                {p.rank && (
                  <Typography variant="caption" color="text.secondary">{p.rank}e</Typography>
                )}
              </Box>
            ))}
          </Box>
        ))}
      </TableCell>

      {/* Status + action */}
      <TableCell sx={{ pt: 2, whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-start' }}>
          <StatusChip status={doc.status} />
          {seltec && <StatusChip status={seltec} />}
          {doc.linkedAuthorisationId && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label="Liée autorisat." variant="outlined" size="small"
                sx={{ fontSize: '0.65rem', height: 20, borderColor: '#E2E8F0', color: 'text.secondary' }} />
              <Tooltip title="Délier de l'autorisation">
                <IconButton size="small" onClick={e => { e.stopPropagation(); onUnlink(doc); }}
                  sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                  <LinkOffIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          {isToComplete && (
            <Button size="small" variant="contained" color="warning"
              startIcon={<EditNoteIcon fontSize="small" />}
              onClick={() => onComplete(doc)}
              sx={{ mt: 0.5, fontSize: '0.75rem' }}>
              Compléter
            </Button>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PerformancePage({ userProfile }) {
  const [showForm, setShowForm]     = useState(false);
  const [editingDoc, setEditingDoc] = useState(null); // declaration being completed
  const [unlinkDoc, setUnlinkDoc]   = useState(null); // declaration to unlink
  const [unlinking, setUnlinking]   = useState(false);
  const [perfs, setPerfs]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const role = userProfile?.role;
  const uid  = auth.currentUser?.uid;

  const load = async () => {
    setLoading(true);
    try {
      let docs;
      if (role === 'federation_staff' || role === 'admin') {
        const snap = await getDocs(query(collection(db, 'performanceDeclarations'), orderBy('createdAt', 'desc')));
        docs = snap.docs;
      } else if (role === 'club') {
        // Merge two queries: by clubId (new data) + by createdBy (old data / same account)
        const [s1, s2] = await Promise.all([
          getDocs(query(collection(db, 'performanceDeclarations'),
            where('clubId', '==', userProfile.club), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'performanceDeclarations'),
            where('createdBy', '==', uid), orderBy('createdAt', 'desc'))),
        ]);
        const seen = new Set();
        docs = [...s1.docs, ...s2.docs].filter(d => seen.has(d.id) ? false : seen.add(d.id));
        docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));
      } else {
        const snap = await getDocs(query(collection(db, 'performanceDeclarations'),
          where('createdBy', '==', uid), orderBy('createdAt', 'desc')));
        docs = snap.docs;
      }
      setPerfs(docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const rows = perfs.flatMap(doc =>
    (doc.competitions?.length ? doc.competitions : [{}]).map(comp => ({ doc, comp }))
  );

  const subtitle = role === 'federation_staff' || role === 'admin'
    ? 'Toutes les performances soumises'
    : role === 'club'
    ? `Club : ${userProfile?.club}`
    : 'Mes performances';

  const handleComplete = (doc) => {
    setEditingDoc(doc);
    setShowForm(false);
    // Scroll to top of panel
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleEditSuccess = () => {
    setEditingDoc(null);
    load();
  };

  const handleUnlinkConfirm = async () => {
    if (!unlinkDoc) return;
    setUnlinking(true);
    try {
      await updateDoc(doc(db, 'performanceDeclarations', unlinkDoc.id), {
        linkedAuthorisationId: deleteField(),
      });
      setUnlinkDoc(null);
      load();
    } catch (err) { console.error(err); }
    setUnlinking(false);
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Performances à l'étranger</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{subtitle}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={showForm ? <RemoveIcon /> : <AddIcon />}
          onClick={() => { setShowForm(s => !s); setEditingDoc(null); }}
        >
          {showForm ? 'Masquer le formulaire' : 'Nouvelle fiche'}
        </Button>
      </Box>

      {/* New form panel */}
      <Collapse in={showForm && !editingDoc}>
        <Paper sx={{ p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: 3 }}>
          <PerformanceForm
            userProfile={userProfile}
            onSubmitSuccess={() => { setShowForm(false); load(); }}
          />
        </Paper>
      </Collapse>

      {/* Complete existing declaration panel */}
      <Collapse in={Boolean(editingDoc)}>
        {editingDoc && (
          <Paper sx={{ p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: 3, border: '2px solid #F59E0B' }}>
            <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setEditingDoc(null)}>
              Complétion des résultats pour <strong>{(editingDoc.competitions || [])[0]?.name || 'cette compétition'}</strong>.
              Les champs sont pré-remplis depuis votre demande d'autorisation.
            </Alert>
            <PerformanceForm
              userProfile={userProfile}
              prefill={editingDoc}
              docId={editingDoc.id}
              onSubmitSuccess={handleEditSuccess}
              onCancel={() => setEditingDoc(null)}
            />
          </Paper>
        )}
      </Collapse>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 3 }}>
          <SpeedOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Aucune performance enregistrée
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Cliquez sur « Nouvelle fiche » pour soumettre vos résultats.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Soumis le</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Club</TableCell>
                <TableCell>Compétition</TableCell>
                <TableCell>Athlètes &amp; Résultats</TableCell>
                <TableCell>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ doc, comp }, i) => (
                <PerfRow
                  key={`${doc.id}-${i}`}
                  doc={doc} comp={comp}
                  onComplete={handleComplete}
                  onUnlink={setUnlinkDoc}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Unlink confirmation dialog */}
      <Dialog
        open={Boolean(unlinkDoc)}
        onClose={() => !unlinking && setUnlinkDoc(null)}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 380 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>Délier de l'autorisation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Supprimer le lien entre cette déclaration de performance et son autorisation associée ?
            La fiche restera visible mais ne sera plus rattachée à une autorisation.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setUnlinkDoc(null)} disabled={unlinking} variant="outlined">
            Annuler
          </Button>
          <Button onClick={handleUnlinkConfirm} disabled={unlinking} variant="contained" color="warning"
            startIcon={unlinking ? <CircularProgress size={16} color="inherit" /> : <LinkOffIcon />}>
            Délier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
