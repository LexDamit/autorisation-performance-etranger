import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Collapse, IconButton, CircularProgress,
  Chip, Divider, Alert, Tooltip, TextField, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon   from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon            from '@mui/icons-material/Search';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import ManageSearchIcon      from '@mui/icons-material/ManageSearch';
import SaveOutlinedIcon      from '@mui/icons-material/SaveOutlined';
import CancelOutlinedIcon    from '@mui/icons-material/CancelOutlined';
import BlockIcon             from '@mui/icons-material/Block';
import LinkIcon              from '@mui/icons-material/Link';
import LinkOffIcon           from '@mui/icons-material/LinkOff';
import ReplayIcon            from '@mui/icons-material/Replay';
import {
  collection, query, orderBy, getDocs, getDoc, doc,
  updateDoc, deleteField, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import StatusChip from './StatusChip';
import athletes from '../data/athletes.json';

const SELTEC_API     = 'https://flabl.laportal.net/api/external';
const SELTEC_HEADERS = { ApiKey: '23011293-d527-4bcf-88a5-bca83efd7791' };
const NO_RESULT_CODES = ['DNS', 'DNF', 'NM', 'AB', 'DQ'];

// ── SELTEC shortcode → human-readable label ───────────────────────────────────
const SELTEC_LABEL = {
  '60':'60 m','100':'100 m','200':'200 m','400':'400 m','800':'800 m',
  '1K':'1000 m','1K5':'1500 m','Mile':'Mile (1609 m)',
  '2K':'2000 m','2KSC':'2000 m Steeple','3K':'3000 m','3KSC':'3000 m Steeple',
  '5K':'5000 m','10K':'10 000 m','HMar':'Semi-Marathon','Mar':'Marathon',
  '60H':'60 m haies','80H':'80 m haies','100H':'100 m haies',
  '110H':'110 m haies','400H':'400 m haies',
  'HJ':'Hauteur','PV':'Perche','LJ':'Longueur','TJ':'Triple Saut',
  'SP':'Poids','DT':'Disque','HT':'Marteau','JT':'Javelot',
  'Hep':'Heptathlon','Dec':'Décathlon','Pen':'Pentathlon',
  '1S':'1 km route','2S':'2 km route','3S':'3 km route','4S':'4 km route',
  '5S':'5 km route','6S':'6 km route','8S':'8 km route',
  '10S':'10 km route','15S':'15 km route','20S':'20 km route',
};

const DISCIPLINE_CODE = {
  '60 m':'60','100 m':'100','200 m':'200','400 m':'400','800 m':'800',
  '1000m':'1K','1500 m':'1K5','Mile (1609m)':'Mile',
  '2000m':'2K','3000 m':'3K','5000 m':'5K','10 000 m':'10K',
  'Semi-Marathon':'HMar','Marathon':'Mar','Trail':'Trail',
  'Hauteur':'HJ','Perche':'PV','Longueur':'LJ','Triple Saut':'TJ',
  'Poids':'SP','Disque':'DT','Marteau':'HT','Javelot':'JT',
  'Heptathlon':'Hep','Décathlon':'Dec','Pentathlon':'Pen',
};

function toShortcode(discipline) {
  if (!discipline) return null;
  const d = discipline.trim();
  if (DISCIPLINE_CODE[d]) return DISCIPLINE_CODE[d];
  for (const [key, code] of Object.entries(DISCIPLINE_CODE)) {
    if (d.toLowerCase().startsWith(key.toLowerCase())) return code;
  }
  const hm = d.match(/^(\d+)mH/i);
  if (hm) return `${hm[1]}H`;
  return null;
}

function eventsMatch(submittedEvent, seltecShortcode) {
  if (!submittedEvent || !seltecShortcode) return false;
  const code = toShortcode(submittedEvent);
  if (code) return code.toUpperCase() === seltecShortcode.toUpperCase();
  const a = submittedEvent.replace(/\s/g,'').toUpperCase();
  const b = seltecShortcode.replace(/\s/g,'').toUpperCase();
  return a.includes(b) || b.includes(a);
}

async function fetchSeltecProfile(id) {
  const res = await fetch(`${SELTEC_API}/fullathleteprofile/lux/${id}`, { headers: SELTEC_HEADERS });
  if (!res.ok) throw new Error(`SELTEC ${res.status}`);
  return res.json();
}

async function syncDocStatus(docRef, data) {
  const allKeys = (data.competitions || []).flatMap((c, ci) =>
    (c.athletes || []).map((_, ai) => `${ci}_${ai}`)
  );
  const statuses  = data.athleteStatuses || {};
  const allDone   = allKeys.every(k => ['green','red'].includes(statuses[k]));
  const allGreen  = allKeys.every(k => statuses[k] === 'green');
  const anyRed    = allKeys.some(k => statuses[k] === 'red');
  const newStatus = allDone ? (allGreen ? 'green' : anyRed ? 'red' : 'orange') : 'orange';
  await updateDoc(docRef, { seltecStatus: newStatus });
}

function deduplicatePerfs(perfs) {
  return [...perfs]
    .sort((a, b) => new Date(b.performanceDateTime || 0) - new Date(a.performanceDateTime || 0))
    .filter((p, idx, arr) => {
      const key = `${p.eventShortcode}|${p.performance?.formattedPerformance}|${p.performanceDateTime?.split('T')[0]}`;
      return arr.findIndex(x =>
        `${x.eventShortcode}|${x.performance?.formattedPerformance}|${x.performanceDateTime?.split('T')[0]}` === key
      ) === idx;
    });
}

// Check if all real perfs are "processed" (linked or not_found) and return new athlete status
function computeAthleteStatus(athPerfs, perfLinks, ci, ai) {
  const realPerfs = athPerfs.filter(sp => !NO_RESULT_CODES.includes((sp.result || '').toUpperCase()));
  if (realPerfs.length === 0) return null;
  const allDone   = realPerfs.every((_, i) => {
    const s = perfLinks?.[`${ci}_${ai}_${i}`]?.status;
    return s === 'linked' || s === 'not_found';
  });
  if (!allDone) return null;
  const allLinked = realPerfs.every((_, i) => perfLinks?.[`${ci}_${ai}_${i}`]?.status === 'linked');
  return allLinked ? 'green' : 'orange';
}

// ── SELTEC verification panel ────────────────────────────────────────────────
function SeltecPanel({
  bib, licenceNumber, submittedPerfs, compDate, storedPerfLinks,
  docId, ci, ai, athleteStatus, onRefresh, athleteName,
}) {
  const [bibInput, setBibInput]         = useState(bib || '');
  const [savingBib, setSavingBib]       = useState(false);
  const [bibSaved, setBibSaved]         = useState(false);
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [deduped, setDeduped]           = useState([]);
  const [autoMatches, setAutoMatches]   = useState({});   // si → pi (suggestion)
  const [browsingPerf, setBrowsingPerf] = useState(null); // si currently browsed
  const [busy, setBusy]                 = useState(null); // si currently saving
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting]       = useState(false);
  const [selectedAthOpt, setSelectedAthOpt] = useState(null);

  const seltecId = bibInput.trim() || licenceNumber;
  const athKey   = `${ci}_${ai}`;
  const perfKey  = (si) => `${ci}_${ai}_${si}`;

  const search = useCallback(async () => {
    if (!seltecId) { setError('Pas de dossard ni de numéro de licence.'); return; }
    setLoading(true); setError('');
    try {
      const profile = await fetchSeltecProfile(seltecId);
      setData(profile?.competitors?.[0] || null);
    } catch (e) { setError(`Erreur SELTEC : ${e.message}`); }
    setLoading(false);
  }, [seltecId]);

  // When SELTEC data loads: deduplicate, auto-match, fill name field
  useEffect(() => {
    if (!data) { setDeduped([]); setAutoMatches({}); return; }
    const perfs = deduplicatePerfs(data.bestPerformances || []);
    setDeduped(perfs);

    const used = new Set();
    const newMatches = {};
    submittedPerfs.forEach((sp, si) => {
      if (NO_RESULT_CODES.includes((sp.result || '').toUpperCase())) return;
      if (storedPerfLinks[perfKey(si)]?.status) return; // already has a status
      const candidates = perfs
        .map((p, pi) => ({ p, pi }))
        .filter(({ pi }) => !used.has(pi))
        .filter(({ p }) => eventsMatch(sp.event, p.eventShortcode))
        .map(({ p, pi }) => {
          const pDate = p.performanceDateTime?.split('T')[0];
          let dateScore = 999;
          if (compDate && pDate) {
            try {
              const d1 = new Date(pDate), d2 = new Date(compDate);
              if (!isNaN(d1) && !isNaN(d2)) dateScore = Math.abs(d1 - d2) / 86400000;
            } catch { /* ignore */ }
          }
          return { pi, dateScore };
        })
        .sort((a, b) => a.dateScore - b.dateScore);
      if (candidates.length > 0) { newMatches[si] = candidates[0].pi; used.add(candidates[0].pi); }
    });
    setAutoMatches(newMatches);

    // Fill name search from athletes.json (by bib first, then by name)
    const byBib = athletes.find(a => a && String(a.bib) === bibInput.trim());
    if (byBib) { setSelectedAthOpt(byBib); return; }
    const fn = (data.firstname || '').toLowerCase().trim();
    const ln = (data.name || '').toLowerCase().trim();
    if (fn && ln) {
      const byName = athletes.find(a =>
        (a.firstName || '').toLowerCase().trim() === fn &&
        (a.lastName  || '').toLowerCase().trim() === ln
      );
      if (byName) setSelectedAthOpt(byName);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBib = async () => {
    const newBib = bibInput.trim();
    if (!newBib) return;
    setSavingBib(true);
    try {
      const docRef = doc(db, 'performanceDeclarations', docId);
      const snap   = await getDoc(docRef);
      if (snap.exists()) {
        const comps = [...(snap.data().competitions || [])];
        if (comps[ci]?.athletes?.[ai] !== undefined) {
          comps[ci] = {
            ...comps[ci],
            athletes: comps[ci].athletes.map((a, i) => i === ai ? { ...a, bib: newBib } : a),
          };
          await updateDoc(docRef, { competitions: comps });
          setBibSaved(true); setTimeout(() => setBibSaved(false), 2500);
        }
      }
    } catch (e) { console.error(e); }
    setSavingBib(false);
  };

  // Save a perfLink and auto-validate athlete if all perfs are processed
  const savePerfLink = async (si, value) => {
    setBusy(si);
    try {
      const docRef = doc(db, 'performanceDeclarations', docId);
      await updateDoc(docRef, {
        [`perfLinks.${perfKey(si)}`]: value,
        lastSeltecCheck: serverTimestamp(),
      });
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        const athPerfs = d.competitions?.[ci]?.athletes?.[ai]?.performances || [];
        const newAthStatus = computeAthleteStatus(athPerfs, d.perfLinks, ci, ai);
        if (newAthStatus && d.athleteStatuses?.[athKey] !== newAthStatus) {
          await updateDoc(docRef, { [`athleteStatuses.${athKey}`]: newAthStatus });
          const snap2 = await getDoc(docRef);
          if (snap2.exists()) await syncDocStatus(docRef, snap2.data());
        } else {
          await syncDocStatus(docRef, d);
        }
      }
      setBrowsingPerf(null);
      onRefresh();
    } catch (e) { console.error(e); }
    setBusy(null);
  };

  const linkPerf = (si, seltecPerf) => savePerfLink(si, {
    status:               'linked',
    shortcode:            seltecPerf.eventShortcode,
    label:                SELTEC_LABEL[seltecPerf.eventShortcode] || seltecPerf.eventShortcode,
    formattedPerformance: seltecPerf.performance?.formattedPerformance || '',
    competitionName:      seltecPerf.competitionName || '',
    competitionNation:    seltecPerf.competitionNation || '',
    date:                 seltecPerf.performanceDateTime?.split('T')[0] || '',
    environment:          seltecPerf.environment || '',
  });

  const markNotFound = (si) => savePerfLink(si, { status: 'not_found' });

  const resetPerfLink = async (si) => {
    setBusy(si);
    try {
      const docRef = doc(db, 'performanceDeclarations', docId);
      await updateDoc(docRef, {
        [`perfLinks.${perfKey(si)}`]: deleteField(),
        lastSeltecCheck: serverTimestamp(),
      });
      // If athlete was auto-validated green from all perfs being done, revert to orange
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        if (d.athleteStatuses?.[athKey] === 'green' || d.athleteStatuses?.[athKey] === 'orange') {
          await updateDoc(docRef, { [`athleteStatuses.${athKey}`]: 'orange' });
          const snap2 = await getDoc(docRef);
          if (snap2.exists()) await syncDocStatus(docRef, snap2.data());
        } else {
          await syncDocStatus(docRef, d);
        }
      }
      onRefresh();
    } catch (e) { console.error(e); }
    setBusy(null);
  };

  const markAthlete = async (status) => {
    const docRef = doc(db, 'performanceDeclarations', docId);
    await updateDoc(docRef, { [`athleteStatuses.${athKey}`]: status, lastSeltecCheck: serverTimestamp() });
    const snap = await getDoc(docRef);
    if (snap.exists()) await syncDocStatus(docRef, snap.data());
    onRefresh();
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const docRef = doc(db, 'performanceDeclarations', docId);
      await updateDoc(docRef, {
        [`athleteStatuses.${athKey}`]: 'red',
        [`athleteRejectionReasons.${athKey}`]: rejectReason.trim() || 'Aucune preuve',
        lastSeltecCheck: serverTimestamp(),
      });
      const snap = await getDoc(docRef);
      if (snap.exists()) await syncDocStatus(docRef, snap.data());
      setRejectDialog(false); setRejectReason('');
      onRefresh();
    } catch (e) { console.error(e); }
    setRejecting(false);
  };

  const realPerfCount  = submittedPerfs.filter(sp => !NO_RESULT_CODES.includes((sp.result || '').toUpperCase())).length;
  const linkedCount    = submittedPerfs.filter((sp, si) => !NO_RESULT_CODES.includes((sp.result || '').toUpperCase()) && storedPerfLinks[perfKey(si)]?.status === 'linked').length;
  const notFoundCount  = submittedPerfs.filter((sp, si) => !NO_RESULT_CODES.includes((sp.result || '').toUpperCase()) && storedPerfLinks[perfKey(si)]?.status === 'not_found').length;
  const processedCount = linkedCount + notFoundCount;
  const allDone        = processedCount === realPerfCount && realPerfCount > 0;

  return (
    <Box>
      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Autocomplete
          value={selectedAthOpt}
          options={athletes.filter(a => a && a.bib)}
          getOptionLabel={a => `${a.firstName} ${a.lastName}`}
          isOptionEqualToValue={(o, v) => o.bib === v.bib}
          filterOptions={(opts, { inputValue }) => {
            const q = inputValue.toLowerCase();
            return opts.filter(a =>
              (a.firstName || '').toLowerCase().includes(q) || (a.lastName || '').toLowerCase().includes(q)
            ).slice(0, 40);
          }}
          onChange={(_, val) => { setSelectedAthOpt(val); if (val?.bib) setBibInput(String(val.bib)); }}
          renderOption={(props, a) => (
            <Box component="li" {...props} key={a.bib}>
              <Box>
                <Typography variant="body2" fontWeight={500}>{a.firstName} {a.lastName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Dossard #{a.bib} · {a.club}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={params => (
            <TextField {...params} size="small" label="Rechercher par nom" placeholder="Nom…"
              InputProps={{ ...params.InputProps, sx: { fontSize: '0.82rem' } }} />
          )}
          sx={{ width: 220 }}
        />
        <TextField size="small" label="Dossard" value={bibInput}
          onChange={e => setBibInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(); }}
          placeholder="ex: 2839" sx={{ width: 110 }}
          InputProps={{ sx: { fontSize: '0.82rem' } }} />
        {bibInput.trim() && bibInput.trim() !== (bib || '') && (
          <Tooltip title="Enregistrer le dossard">
            <Button size="small" variant="outlined" color="warning"
              startIcon={savingBib ? <CircularProgress size={13} color="inherit" /> : <SaveOutlinedIcon />}
              onClick={saveBib} disabled={savingBib} sx={{ px: 1.5 }}>
              {bibSaved ? 'Enregistré ✓' : 'Enregistrer'}
            </Button>
          </Tooltip>
        )}
        {licenceNumber && (
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            Licence : <strong>{licenceNumber}</strong>
          </Typography>
        )}
        <Button size="small" variant="outlined"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
          onClick={search} disabled={loading || !seltecId}>
          Rechercher dans SELTEC
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>{error}</Alert>}

      {data && (
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
          {data.firstname} {data.name}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {data.gender}, né(e) en {data.yoB}
          </Typography>
        </Typography>
      )}

      {/* ── Per-performance rows ─────────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        {/* Header */}
        <Typography variant="caption" fontWeight={700}
          sx={{
            display: 'block', mb: 1, fontSize: '0.67rem', textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: allDone ? 'success.main' : 'text.secondary',
          }}>
          Résultats à vérifier
          {realPerfCount > 0 && (
            <> — {processedCount}/{realPerfCount} traité{realPerfCount !== 1 ? 's' : ''}
              {linkedCount > 0    && <> · <span style={{ color: '#166534' }}>{linkedCount} lié{linkedCount > 1 ? 's' : ''}</span></>}
              {notFoundCount > 0  && <> · <span style={{ color: '#b91c1c' }}>{notFoundCount} non trouvé{notFoundCount > 1 ? 's' : ''}</span></>}
            </>
          )}
        </Typography>

        {submittedPerfs.map((sp, si) => {
          const isNoResult  = NO_RESULT_CODES.includes((sp.result || '').toUpperCase());
          const stored      = storedPerfLinks[perfKey(si)];
          const isLinked    = stored?.status === 'linked';
          const isNotFound  = stored?.status === 'not_found';
          const matchIdx    = (!isLinked && !isNotFound && autoMatches[si] !== undefined) ? autoMatches[si] : undefined;
          const match       = matchIdx !== undefined ? deduped[matchIdx] : null;
          const isExpanded  = browsingPerf === si;
          const isBusy      = busy === si;

          const rowBg = isNoResult ? '#F8FAFC'
            : isLinked   ? '#F0FDF4'
            : isNotFound ? '#FEF2F2'
            : match      ? '#FFFBEB'
            : '#F8FAFC';
          const rowBorder = isNoResult ? '#E2E8F0'
            : isLinked   ? '#BBF7D0'
            : isNotFound ? '#FECACA'
            : match      ? '#FDE68A'
            : '#E2E8F0';

          return (
            <Box key={si}>
              <Box sx={{ mb: isExpanded ? 0 : 1, p: 1.5, borderRadius: isExpanded ? '8px 8px 0 0' : 1.5, bgcolor: rowBg, border: `1px solid ${rowBorder}`, borderBottom: isExpanded ? 'none' : undefined }}>
                {/* ── Single non-wrapping row ── */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>

                  {/* Submitted — fixed width */}
                  <Box sx={{ width: 130, flexShrink: 0 }}>
                    <Typography variant="caption"
                      sx={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary', display: 'block' }}>
                      Soumis
                    </Typography>
                    <Typography variant="body2" fontWeight={700} noWrap>{sp.event || '—'}</Typography>
                    {isNoResult
                      ? <Chip label={sp.result} size="small" color="warning" sx={{ height: 16, fontSize: '0.65rem', mt: 0.25 }} />
                      : sp.result && <Typography variant="caption" color="primary.main" fontWeight={700} noWrap>{sp.result}</Typography>
                    }
                    {sp.wind && sp.wind !== '/' && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>vent {sp.wind}</Typography>
                    )}
                  </Box>

                  <Typography sx={{ color: 'text.disabled', fontSize: '1rem', flexShrink: 0, userSelect: 'none' }}>→</Typography>

                  {/* SELTEC result — flex, min-width 0 so it can shrink */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption"
                      sx={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary', display: 'block' }}>
                      SELTEC
                    </Typography>
                    {isNoResult ? (
                      <Typography variant="body2" color="text.disabled" fontStyle="italic">Non applicable</Typography>
                    ) : isLinked ? (
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="success.dark" noWrap>
                          {stored.label} — {stored.formattedPerformance}
                          <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>[{stored.shortcode}]</Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {stored.competitionName}{stored.competitionNation ? ` · ${stored.competitionNation}` : ''} · {stored.date}
                          {stored.environment === 'Indoor' && ' · Indoor'}
                        </Typography>
                      </Box>
                    ) : isNotFound ? (
                      <Typography variant="body2" color="error.main" fontWeight={600}>
                        ✗ Non trouvé dans SELTEC
                      </Typography>
                    ) : match ? (
                      <Box>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {SELTEC_LABEL[match.eventShortcode] || match.eventShortcode} — {match.performance?.formattedPerformance}
                          <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>[{match.eventShortcode}]</Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {match.competitionName}{match.competitionNation ? ` · ${match.competitionNation}` : ''} · {match.performanceDateTime?.split('T')[0]}
                          {match.environment === 'Indoor' && ' · Indoor'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        {data ? 'Aucune correspondance' : 'Recherche SELTEC requise'}
                      </Typography>
                    )}
                  </Box>

                  {/* ── Per-perf action buttons — always right, never wraps ── */}
                  {!isNoResult && (
                    <Box sx={{ flexShrink: 0, display: 'flex', gap: 0.5, alignItems: 'center', ml: 0.5 }}>
                      {isLinked ? (
                        /* Linked: Délier + browse */
                        <>
                          <Tooltip title="Délier cette performance">
                            <Button size="small" variant="text" color="error"
                              startIcon={isBusy ? <CircularProgress size={12} color="inherit" /> : <LinkOffIcon fontSize="small" />}
                              onClick={() => resetPerfLink(si)} disabled={isBusy}
                              sx={{ fontSize: '0.72rem', px: 1, minWidth: 0 }}>
                              Délier
                            </Button>
                          </Tooltip>
                          {data && (
                            <Tooltip title="Choisir une autre correspondance">
                              <IconButton size="small" onClick={() => setBrowsingPerf(isExpanded ? null : si)}
                                sx={{ color: 'text.secondary' }}>
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      ) : isNotFound ? (
                        /* Not found: Reset */
                        <Tooltip title="Remettre en vérification">
                          <Button size="small" variant="text" color="inherit"
                            startIcon={isBusy ? <CircularProgress size={12} color="inherit" /> : <ReplayIcon fontSize="small" />}
                            onClick={() => resetPerfLink(si)} disabled={isBusy}
                            sx={{ fontSize: '0.72rem', px: 1, color: 'text.secondary', minWidth: 0 }}>
                            Reset
                          </Button>
                        </Tooltip>
                      ) : (
                        /* Unverified: Lier (if match) + browse + non-trouvé */
                        <>
                          {match && (
                            <Tooltip title="Associer cette performance SELTEC">
                              <Button size="small" variant="contained" color="success"
                                startIcon={isBusy ? <CircularProgress size={12} color="inherit" /> : <LinkIcon fontSize="small" />}
                                onClick={() => linkPerf(si, deduped[matchIdx])} disabled={isBusy}
                                sx={{ fontSize: '0.72rem' }}>
                                Lier
                              </Button>
                            </Tooltip>
                          )}
                          {data && (
                            <Tooltip title={match ? 'Choisir une autre correspondance' : 'Choisir manuellement'}>
                              <IconButton size="small" onClick={() => setBrowsingPerf(isExpanded ? null : si)}
                                sx={{ color: 'text.secondary' }}>
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Non trouvé dans SELTEC pour cette épreuve">
                            <IconButton size="small" onClick={() => markNotFound(si)} disabled={isBusy}
                              sx={{ color: 'error.light', '&:hover': { color: 'error.main' } }}>
                              {isBusy ? <CircularProgress size={14} color="inherit" /> : <CancelOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* ── Browse SELTEC for this perf ── */}
              {isExpanded && (
                <Box sx={{
                  mb: 1, p: 1.5, bgcolor: '#F8FAFC',
                  border: `1px solid ${rowBorder}`, borderTop: 'none', borderRadius: '0 0 8px 8px',
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.72rem' }}>
                    Choisir une correspondance SELTEC pour <strong>{sp.event}</strong> :
                  </Typography>
                  <Box sx={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {deduped.map((p, pi) => {
                      const isEventMatch = eventsMatch(sp.event, p.eventShortcode);
                      const isCurrentLink = isLinked &&
                        stored.shortcode === p.eventShortcode &&
                        stored.formattedPerformance === p.performance?.formattedPerformance &&
                        stored.date === p.performanceDateTime?.split('T')[0];
                      return (
                        <Box key={pi} sx={{
                          display: 'flex', gap: 1, alignItems: 'center',
                          py: 0.75, px: 1, borderRadius: 1,
                          bgcolor: isCurrentLink ? '#DCFCE7' : isEventMatch ? '#F0FDF4' : 'white',
                          border: `1px solid ${isCurrentLink ? '#86EFAC' : isEventMatch ? '#BBF7D0' : '#E2E8F0'}`,
                        }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={isEventMatch ? 700 : 400} noWrap>
                              {SELTEC_LABEL[p.eventShortcode] || p.eventShortcode} — {p.performance?.formattedPerformance}
                              <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                                [{p.eventShortcode}]
                              </Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {p.competitionName}{p.competitionNation ? ` · ${p.competitionNation}` : ''} · {p.performanceDateTime?.split('T')[0]}
                            </Typography>
                          </Box>
                          {isEventMatch && (
                            <Chip label="✓ épreuve" size="small" color="success"
                              sx={{ height: 16, fontSize: '0.62rem', '& .MuiChip-label': { px: 0.75 }, flexShrink: 0 }} />
                          )}
                          <Button size="small"
                            variant={isEventMatch ? 'contained' : 'outlined'}
                            color={isEventMatch ? 'success' : 'inherit'}
                            startIcon={busy === si ? <CircularProgress size={12} color="inherit" /> : <LinkIcon fontSize="small" />}
                            onClick={() => linkPerf(si, p)} disabled={busy === si}
                            sx={{ fontSize: '0.72rem', flexShrink: 0 }}>
                            Lier
                          </Button>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Athlete-level overrides ──────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {athleteStatus !== 'green' && (
          <Tooltip title="Valider manuellement l'athlète en ignorant les épreuves manquantes">
            <Button size="small" variant="outlined" color="success"
              startIcon={<CheckCircleIcon fontSize="small" />}
              onClick={() => markAthlete('green')}>
              Valider tout
            </Button>
          </Tooltip>
        )}
        {athleteStatus !== 'red' && (
          <Tooltip title="Aucune correspondance SELTEC trouvée pour cet athlète">
            <Button size="small" variant="outlined" color="error"
              startIcon={<CancelOutlinedIcon fontSize="small" />}
              onClick={() => markAthlete('red')}>
              Non trouvé SELTEC
            </Button>
          </Tooltip>
        )}
        <Tooltip title="Rejeter avec motif — aucune preuve de cette performance">
          <Button size="small" variant="outlined" color="error"
            startIcon={<BlockIcon fontSize="small" />}
            onClick={() => setRejectDialog(true)}
            sx={{ borderStyle: 'dashed' }}>
            Rejeter — Aucune preuve
          </Button>
        </Tooltip>
        {(athleteStatus === 'green' || athleteStatus === 'red') && (
          <Button size="small" variant="outlined" color="inherit"
            onClick={() => markAthlete('orange')}
            sx={{ color: 'text.secondary' }}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* ── Reject dialog ───────────────────────────────────────────────────── */}
      <Dialog open={rejectDialog} onClose={() => !rejecting && setRejectDialog(false)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 380 } }}>
        <DialogTitle sx={{ pb: 1 }}>Rejeter — Aucune preuve</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Confirmer le rejet de la performance de <strong>{athleteName}</strong> ?
          </DialogContentText>
          <TextField fullWidth size="small"
            label="Motif (optionnel)"
            placeholder="ex: introuvable dans SELTEC ni en ligne"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRejectDialog(false)} disabled={rejecting} variant="outlined">Annuler</Button>
          <Button onClick={handleReject} color="error" variant="contained" disabled={rejecting}
            startIcon={rejecting ? <CircularProgress size={14} color="inherit" /> : <BlockIcon fontSize="small" />}>
            Confirmer le rejet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── One row per athlete ───────────────────────────────────────────────────────
function AthRow({ row, comp, ath, ci, ai, onRefresh }) {
  const [open, setOpen] = useState(false);

  const athKey     = `${ci}_${ai}`;
  const athStatus  = row.athleteStatuses?.[athKey] || row.seltecStatus || 'orange';
  const rejReason  = row.athleteRejectionReasons?.[athKey];
  const perfLinks  = row.perfLinks || {};
  const rowBgColor = athStatus === 'green' ? '#F0FDF4' : athStatus === 'red' ? '#FFF5F5' : 'inherit';

  const perfSummary = (ath.performances || []).map((p, pi) => {
    const s = perfLinks[`${ci}_${ai}_${pi}`]?.status;
    const mark = s === 'linked' ? ' ✓' : s === 'not_found' ? ' ✗' : '';
    return `${p.event}${p.result ? ` ${p.result}` : ''}${mark}`;
  }).join(' · ');

  return (
    <>
      <TableRow
        sx={{ cursor: 'pointer', bgcolor: rowBgColor, '& > *': { borderBottom: 'unset' } }}
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
          <Typography variant="body2" fontWeight={500}>{row.club}</Typography>
        </TableCell>
        <TableCell sx={{ minWidth: 160 }}>
          <Typography variant="body2" fontWeight={600}>{comp.name}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {[comp.place, comp.country].filter(Boolean).join(', ')}
            {comp.date ? ` · ${comp.date}` : ''}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>{ath.firstName} {ath.lastName}</Typography>
          <Typography variant="caption" color="text.secondary">{perfSummary}</Typography>
        </TableCell>
        <TableCell>
          <StatusChip status={athStatus} />
          {athStatus === 'red' && rejReason && (
            <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.25, fontSize: '0.68rem' }}>
              {rejReason}
            </Typography>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {ath.firstName} {ath.lastName}
                {ath.licenceNumber && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    N° {ath.licenceNumber}
                  </Typography>
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {(ath.performances || []).map(p =>
                  `${p.event} ${p.result || ''}${p.wind ? ` vent:${p.wind}` : ''}${p.rank ? ` (${p.rank}e)` : ''}`
                ).join('  ·  ')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <SeltecPanel
                bib={ath.bib}
                licenceNumber={ath.licenceNumber}
                submittedPerfs={ath.performances || []}
                compDate={comp.date}
                storedPerfLinks={perfLinks}
                docId={row.id}
                ci={ci} ai={ai}
                athleteStatus={athStatus}
                onRefresh={onRefresh}
                athleteName={`${ath.firstName} ${ath.lastName}`}
              />
              {row.lastSeltecCheck && (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 1.5, display: 'block' }}>
                  Dernière vérif. : {row.lastSeltecCheck.toDate().toLocaleString('fr-LU')}
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
export default function FedStaffPerformances() {
  const [perfs, setPerfs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('orange');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'performanceDeclarations'), orderBy('createdAt', 'desc'))
      );
      setPerfs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  // Refresh a single document in-place — keeps rows expanded, no spinner
  const refreshDoc = useCallback(async (docId) => {
    try {
      const snap = await getDoc(doc(db, 'performanceDeclarations', docId));
      if (snap.exists()) {
        setPerfs(prev => prev.map(p => p.id === docId ? { id: snap.id, ...snap.data() } : p));
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const athRows = perfs.flatMap(row =>
    (row.competitions || []).flatMap((comp, ci) =>
      (comp.athletes || []).map((ath, ai) => {
        const key    = `${ci}_${ai}`;
        const status = row.athleteStatuses?.[key] || row.seltecStatus || 'orange';
        return { row, comp, ath, ci, ai, status };
      })
    )
  );

  const counts = {
    orange: athRows.filter(r => r.status === 'orange').length,
    red:    athRows.filter(r => r.status === 'red').length,
    green:  athRows.filter(r => r.status === 'green').length,
    all:    athRows.length,
  };

  const filtered = filter === 'all' ? athRows : athRows.filter(r => r.status === filter);

  const FILTERS = [
    { key: 'orange', label: 'En vérification', count: counts.orange, color: 'warning' },
    { key: 'red',    label: 'Non trouvées',    count: counts.red,    color: 'error'   },
    { key: 'green',  label: 'Trouvées',        count: counts.green,  color: 'success' },
    { key: 'all',    label: 'Toutes',          count: counts.all,    color: 'default' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Vérification SELTEC</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Un athlète par ligne — liez ou marquez chaque épreuve individuellement
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Développez une ligne, cliquez <strong>Rechercher dans SELTEC</strong>, puis pour chaque épreuve :
        {' '}<strong>Lier</strong> pour confirmer la correspondance, ou <strong>✗</strong> si non trouvée.
        L'athlète passe automatiquement au vert quand toutes les épreuves sont traitées.
      </Alert>

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <Chip key={f.key} label={`${f.label} (${f.count})`} clickable
            color={filter === f.key ? f.color : 'default'}
            variant={filter === f.key ? 'filled' : 'outlined'}
            onClick={() => setFilter(f.key)} />
        ))}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 3 }}>
          <ManageSearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="text.secondary">Aucun athlète dans cette catégorie.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Date soumission</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Compétition</TableCell>
                <TableCell>Athlète &amp; résultats</TableCell>
                <TableCell>Statut SELTEC</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(({ row, comp, ath, ci, ai }) => (
                <AthRow key={`${row.id}-${ci}-${ai}`}
                  row={row} comp={comp} ath={ath}
                  ci={ci} ai={ai} onRefresh={() => refreshDoc(row.id)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
