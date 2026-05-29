import React, { useEffect, useState } from 'react';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Chip, Collapse, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tooltip,
  IconButton,
} from '@mui/material';
import AddIcon                from '@mui/icons-material/Add';
import RemoveIcon             from '@mui/icons-material/Remove';
import EditNoteIcon           from '@mui/icons-material/EditNote';
import SpeedOutlinedIcon      from '@mui/icons-material/SpeedOutlined';
import EmojiEventsIcon        from '@mui/icons-material/EmojiEvents';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LinkOffIcon            from '@mui/icons-material/LinkOff';
import InfoOutlinedIcon       from '@mui/icons-material/InfoOutlined';
import { collection, query, where, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../firebase';
import PerformanceForm from './PerformanceForm';
import StatusChip from './StatusChip';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtISO = iso => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return (d && m && y) ? `${d}/${m}/${y}` : iso;
};
const fmtDates = dates => {
  const d = (dates || []).filter(Boolean).map(fmtISO).filter(Boolean);
  return d.length ? d.join(', ') : null;
};

// ── Card: one to_complete declaration ────────────────────────────────────────
function ToCompleteCard({ decl, onComplete }) {
  const compNames = (decl.competitions || []).map(c => c.name).filter(Boolean);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #FDE68A' }}>
      {/* Card header */}
      <Box sx={{
        px: 2, py: 0.9, bgcolor: '#FFFBEB', borderBottom: '1px solid #FDE68A',
        display: 'flex', alignItems: 'center', gap: 1,
      }}>
        <EmojiEventsIcon sx={{ fontSize: 14, color: '#D97706', flexShrink: 0 }} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#92400E', flex: 1, fontSize: '0.85rem' }}>
          {compNames.join(' · ') || '—'}
        </Typography>
        <Button variant="contained" size="small"
          startIcon={<EditNoteIcon sx={{ fontSize: 14 }} />}
          onClick={() => onComplete(decl)}
          sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, boxShadow: 'none', fontSize: '0.75rem', py: 0.4, px: 1.25, flexShrink: 0 }}>
          Compléter
        </Button>
      </Box>

      {/* One row per competition */}
      {(decl.competitions || []).map((comp, ci) => (
        <Box key={ci} sx={{
          px: 2, py: 0.9,
          borderBottom: ci < decl.competitions.length - 1 ? '1px dashed #FDE68A' : 'none',
          display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap',
        }}>
          {/* Date · Lieu · Pays inline */}
          <Typography variant="caption" sx={{ color: '#78716C', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fmtDates(comp.dates) || fmtISO(comp.date) || '—'}
            {comp.place   ? ` · ${comp.place}`   : ''}
            {comp.country ? ` · ${comp.country}` : ''}
          </Typography>
          {/* Athletes inline */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(comp.athletes || []).map((ath, ai) => {
              const events = (ath.performances || []).map(p => p.event).filter(Boolean).join(', ');
              return (
                <Typography key={ai} variant="caption" sx={{ color: '#1C1917' }}>
                  {ai > 0 && <span style={{ color: '#CBD5E1', marginRight: 4 }}>·</span>}
                  <strong>{ath.firstName} {ath.lastName}</strong>
                  {events && <span style={{ color: '#78716C' }}> — {events}</span>}
                </Typography>
              );
            })}
          </Box>
        </Box>
      ))}
    </Paper>
  );
}

// ── Row: one submitted performance (one competition per row) ─────────────────
function PerfRow({ doc, comp, onUnlink, role }) {
  const submittedDate = doc.createdAt?.toDate().toLocaleDateString('fr-LU') || '—';
  const seltec        = doc.seltecStatus;
  const isStaff       = role === 'federation_staff' || role === 'admin';

  return (
    <TableRow sx={{ verticalAlign: 'top' }}>
      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.82rem', pt: 2 }}>
        {submittedDate}
      </TableCell>
      <TableCell sx={{ pt: 2, display: { xs: 'none', sm: 'table-cell' } }}>
        <Typography variant="body2" fontWeight={500}>{doc.club}</Typography>
      </TableCell>
      <TableCell sx={{ pt: 2, minWidth: 180 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
          {comp.name || '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {[comp.place, comp.country].filter(Boolean).join(', ')}
        </Typography>
        {(comp.dates?.filter(Boolean).join(', ') || comp.date) && (
          <Typography variant="caption" color="text.secondary">
            {comp.dates?.filter(Boolean).join(', ') || comp.date}
          </Typography>
        )}
      </TableCell>
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
                ) : p.noResult ? (
                  <Chip label={p.noResult} size="small"
                    sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#F1F5F9' }} />
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
      <TableCell sx={{ pt: 2, whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-start' }}>
          <StatusChip status={doc.status} />
          {/* "En vérification" (orange) hidden from athletes/clubs — only show green/red results */}
          {seltec && (isStaff || seltec !== 'orange') && <StatusChip status={seltec} />}
          {/* Link chip + unlink button: staff only */}
          {isStaff && doc.linkedAuthorisationId && (
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
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PerformancePage({ userProfile }) {
  const [showForm, setShowForm]     = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [unlinkDoc, setUnlinkDoc]   = useState(null);
  const [unlinking, setUnlinking]   = useState(false);
  const [perfs, setPerfs]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const role = userProfile?.role;
  const uid  = auth.currentUser?.uid;

  const sortByDate = docs =>
    [...docs].sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

  const load = async () => {
    setLoading(true);
    try {
      let docs;
      if (role === 'federation_staff' || role === 'admin') {
        const snap = await getDocs(collection(db, 'performanceDeclarations'));
        docs = sortByDate(snap.docs);
      } else if (role === 'club') {
        const [s1, s2] = await Promise.all([
          getDocs(query(collection(db, 'performanceDeclarations'), where('clubId', '==', userProfile.club))),
          getDocs(query(collection(db, 'performanceDeclarations'), where('createdBy', '==', uid))),
        ]);
        const seen = new Set();
        docs = sortByDate([...s1.docs, ...s2.docs].filter(d => seen.has(d.id) ? false : seen.add(d.id)));
      } else {
        const snap = await getDocs(query(collection(db, 'performanceDeclarations'), where('createdBy', '==', uid)));
        docs = sortByDate(snap.docs);
      }
      setPerfs(docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  // Split: stubs awaiting results vs fully submitted
  const toCompletePerfs = perfs.filter(d => d.status === 'to_complete');
  const submittedPerfs  = perfs.filter(d => d.status !== 'to_complete');
  const submittedRows   = submittedPerfs.flatMap(d =>
    (d.competitions?.length ? d.competitions : [{}]).map(comp => ({ doc: d, comp }))
  );

  const subtitle = role === 'federation_staff' || role === 'admin'
    ? 'Toutes les performances soumises'
    : role === 'club'
    ? `Club : ${userProfile?.club}`
    : 'Mes performances';

  const handleComplete = (decl) => {
    setEditingDoc(decl);
    setShowForm(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
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
      {/* ── Page header ── */}
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

      {/* ── New performance form ── */}
      <Collapse in={showForm && !editingDoc}>
        <Paper sx={{ p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: 3 }}>
          <PerformanceForm
            userProfile={userProfile}
            onSubmitSuccess={() => { setShowForm(false); load(); }}
          />
        </Paper>
      </Collapse>

      {/* ── Edit / complete form ── */}
      <Collapse in={Boolean(editingDoc)}>
        {editingDoc && (
          <Paper sx={{ p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: 3, border: '2px solid #F59E0B' }}>
            <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setEditingDoc(null)}>
              Complétion des résultats pour{' '}
              <strong>{(editingDoc.competitions || [])[0]?.name || 'cette compétition'}</strong>.
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — À compléter (stubs from authorisation requests)
          ══════════════════════════════════════════════════════════════ */}
          {toCompletePerfs.length > 0 && (
            <Box sx={{ mb: 4 }}>
              {/* Section heading */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <EditNoteIcon sx={{ fontSize: 20, color: '#D97706' }} />
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', color: '#0F172A' }}>
                  Résultats à compléter
                </Typography>
                <Box sx={{ px: 1, py: 0.15, borderRadius: 1, bgcolor: '#FEF3C7' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#92400E' }}>
                    {toCompletePerfs.length}
                  </Typography>
                </Box>
              </Box>

              {/* Explanation banner */}
              <Box sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1.25,
                px: 2, py: 1.5, mb: 2,
                bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 2,
              }}>
                <InfoOutlinedIcon sx={{ fontSize: 17, color: '#3B82F6', flexShrink: 0, mt: '1px' }} />
                <Typography variant="body2" sx={{ color: '#1D4ED8', lineHeight: 1.55 }}>
                  Veuillez trouver ci-dessous les athlètes et compétitions pour lesquels vous avez
                  introduit une demande d'autorisation. Vous pouvez compléter la fiche directement
                  avec le résultat dès votre retour de compétition.
                </Typography>
              </Box>

              {/* Cards — full-width rows */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {toCompletePerfs.map(decl => (
                  <ToCompleteCard key={decl.id} decl={decl} onComplete={handleComplete} />
                ))}
              </Box>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2 — Submitted performance declarations
          ══════════════════════════════════════════════════════════════ */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <AssignmentTurnedInIcon sx={{ fontSize: 20, color: '#475569' }} />
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', color: '#0F172A' }}>
                Performances déclarées
              </Typography>
              {submittedRows.length > 0 && (
                <Box sx={{ px: 1, py: 0.15, borderRadius: 1, bgcolor: '#F1F5F9' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {submittedRows.length}
                  </Typography>
                </Box>
              )}
            </Box>

            {submittedRows.length === 0 ? (
              <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
                <SpeedOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  Aucune performance déclarée
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
                    {submittedRows.map(({ doc, comp }, i) => (
                      <PerfRow
                        key={`${doc.id}-${i}`}
                        doc={doc} comp={comp}
                        onUnlink={setUnlinkDoc}
                        role={role}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Empty state when there's nothing at all */}
          {toCompletePerfs.length === 0 && submittedRows.length === 0 && (
            <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 3, mt: 2 }}>
              <SpeedOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Aucune performance enregistrée
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                Cliquez sur « Nouvelle fiche » pour soumettre vos résultats.
              </Typography>
            </Paper>
          )}
        </>
      )}

      {/* ── Unlink confirmation dialog ── */}
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
