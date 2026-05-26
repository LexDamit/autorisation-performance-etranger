import React, { useState } from 'react';
import {
  Box, TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Typography, Grid, IconButton, Chip, FormHelperText, Tooltip,
  InputAdornment, CircularProgress, Paper, Divider, Autocomplete,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddIcon     from '@mui/icons-material/PersonAdd';
import EmojiEventsIcon   from '@mui/icons-material/EmojiEvents';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import InfoOutlinedIcon  from '@mui/icons-material/InfoOutlined';
import LinkIcon          from '@mui/icons-material/Link';
import LinkOffIcon       from '@mui/icons-material/LinkOff';
import BadgeIcon         from '@mui/icons-material/Badge';
import { addDoc, doc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import epreuves from '../data/epreuves.json';
import athletes from '../data/athletes.json';

const clubs = [
  '-', 'CA Belvaux', 'CA Dudelange', 'CAE Grevenmacher', 'CA FOLA',
  'CAPA Ettelbruck', 'CA Schifflange', 'CELTIC Diekirch', 'CS Luxembourg',
  'CS du Nord', 'LIAL Luxembourg', 'RBUAP', 'TRILUX', 'TRISPEED Mamer', 'X3M', 'FLA-IND',
];

// Maps athletes.json club names → dropdown values
const CLUB_NORMALIZE = {
  'CSL':                                         'CS Luxembourg',
  'CA FOLA  Esch/Alzette':                       'CA FOLA',
  'CA FOLA Esch/Alzette':                        'CA FOLA',
  'TEAM X3M SNOOZE':                             'X3M',
  'Cercle Sportif du Nord Clervaux':             'CS du Nord',
  'Liichtathletik Club Lëtzebuerg':              'LIAL Luxembourg',
  'R.B.U.A.P.':                                  'RBUAP',
  "Fédération Luxembourgeoise d'Athlétisme":     'FLA-IND',
};
const normalizeClub = name => CLUB_NORMALIZE[name] || name;
const categories = [
  '-','U12 Débutant(e)','U14 Scolaire','U16 Minime','U18 Cadet(te)',
  'U20 Junior','U23 Espoir','Senior','Masters',
];

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, onRemove, removeDisabled }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="subtitle2" sx={{ color: '#1A202C', fontSize: '0.8rem' }}>{title}</Typography>
      </Box>
      {onRemove && (
        <IconButton size="small" onClick={onRemove} disabled={removeDisabled}
          sx={{ color: 'error.light', opacity: removeDisabled ? 0.3 : 1 }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────
const NO_RESULT_CODES = ['DNS', 'DNF', 'NM', 'AB', 'DQ'];
const blankPerf    = () => ({ event: '', result: '', wind: '', rank: '', noResult: '' });
const blankAthlete = () => ({
  firstName: '', lastName: '', licenceNumber: '', bib: '',
  category: '-', sex: '', _flaAthlete: null,
  performances: [blankPerf()],
});
const blankComp = () => ({
  name: '', place: '', country: '', date: '', site: '', type: 'outdoor',
  athletes: [blankAthlete()],
});

export default function PerformanceForm({ userProfile, prefill, docId, onSubmitSuccess, onCancel }) {
  const prefillClub = prefill?.club || userProfile?.club || '-';

  const [club, setClub]         = useState(prefillClub);
  const [email, setEmail]       = useState(userProfile?.email || '');
  const [ccInput, setCcInput]   = useState('');
  const [emailsCc, setEmailsCc] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const [competitions, setCompetitions] = useState(
    prefill?.competitions?.length
      ? prefill.competitions.map(c => ({
          name: c.name || '', place: c.place || '', country: c.country || '',
          date: c.date || '', site: c.site || '', type: c.type || 'outdoor',
          athletes: (c.athletes || []).map(a => ({
            firstName: a.firstName || '', lastName: a.lastName || '',
            licenceNumber: a.licenceNumber || '', bib: a.bib || '',
            category: a.category || '-', sex: a.sex || '',
            _flaAthlete: null,
            performances: a.performances?.length
          ? a.performances.map(p => ({ ...blankPerf(), ...p }))
          : [blankPerf()],
          })),
        }))
      : [blankComp()]
  );

  const hasError = k => Boolean(errors[k]);
  const getError = k => errors[k] || '';
  const isValidEmail = v => /\S+@\S+\.\S+/.test(v);

  const addCcEmail = () => {
    if (!ccInput) return;
    if (isValidEmail(ccInput)) {
      if (!emailsCc.includes(ccInput)) setEmailsCc([...emailsCc, ccInput]);
      setCcInput('');
    } else alert('Adresse email invalide !');
  };

  const updComp = (ci, f, v) => setCompetitions(u => {
    const x = [...u]; x[ci] = { ...x[ci], [f]: v }; return x;
  });
  const updAth = (ci, ai, patch) => setCompetitions(u => {
    const x = [...u];
    x[ci].athletes = x[ci].athletes.map((a, i) => i === ai ? { ...a, ...patch } : a);
    return x;
  });
  const updPerf = (ci, ai, pi, f, v) => setCompetitions(u => {
    const x = [...u];
    x[ci].athletes[ai].performances = x[ci].athletes[ai].performances.map((p, i) =>
      i === pi ? { ...p, [f]: v } : p
    );
    return x;
  });

  const addAthlete    = ci => setCompetitions(u => { const x=[...u]; x[ci].athletes=[...x[ci].athletes,blankAthlete()]; return x; });
  const removeAthlete = (ci,ai) => setCompetitions(u => { const x=[...u]; x[ci].athletes=x[ci].athletes.filter((_,i)=>i!==ai); return x; });
  const addPerf       = (ci,ai) => setCompetitions(u => { const x=[...u]; x[ci].athletes[ai].performances=[...x[ci].athletes[ai].performances,blankPerf()]; return x; });
  const removePerf    = (ci,ai,pi) => setCompetitions(u => { const x=[...u]; const next=x[ci].athletes[ai].performances.filter((_,i)=>i!==pi); x[ci].athletes[ai].performances=next.length?next:[blankPerf()]; return x; });
  const addCompetition    = () => setCompetitions(u => [...u, blankComp()]);
  const removeCompetition = ci => setCompetitions(u => u.filter((_,i) => i!==ci));

  const validate = () => {
    const next = {};
    const req = 'Obligatoire';
    if (!email || !isValidEmail(email)) next['email'] = 'Email invalide';
    if (!club || club === '-') next['club'] = req;
    competitions.forEach((c, i) => {
      const b = k => `comp[${i}].${k}`;
      if (!c.name?.trim())    next[b('name')]    = req;
      if (!c.place?.trim())   next[b('place')]   = req;
      if (!c.country?.trim()) next[b('country')] = req;
      if (!c.date)            next[b('date')]    = req;
      if (!c.site?.trim())    next[b('site')]    = req;
      c.athletes.forEach((a, j) => {
        const ab = k => `comp[${i}].ath[${j}].${k}`;
        if (!a.firstName?.trim()) next[ab('firstName')] = req;
        if (!a.lastName?.trim())  next[ab('lastName')]  = req;
        if (!a.sex)               next[ab('sex')]       = req;
        if (!a.category || a.category === '-') next[ab('category')] = req;
        a.performances.forEach((p, k) => {
          const pb = f => `comp[${i}].ath[${j}].perf[${k}].${f}`;
          if (!p.event?.trim()) next[pb('event')] = req;
          // result only required when no DNS/DNF/etc. is selected
          if (!p.noResult && !p.result?.trim()) next[pb('result')] = req;
          const epr = epreuves.find(e => e.discipline === p.event);
          if (!p.noResult && c.type === 'outdoor' && epr?.ventObligatoire && !p.wind?.trim()) next[pb('wind')] = req;
        });
      });
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!validate()) { alert('Veuillez corriger les champs obligatoires.'); setLoading(false); return; }

    const competitionsPayload = competitions.map(comp => ({
      name: comp.name, place: comp.place, country: comp.country,
      date: comp.date, site: comp.site, type: comp.type,
      athletes: comp.athletes.map(a => ({
        firstName: a.firstName, lastName: a.lastName,
        licenceNumber: a.licenceNumber || '', bib: a.bib || '',
        sex: a.sex, category: a.category,
        performances: a.performances.map(p => ({
          event:    p.event,
          result:   p.noResult ? p.noResult : p.result,
          wind:     p.noResult ? ''          : (p.wind || ''),
          rank:     p.noResult ? ''          : (p.rank || ''),
          noResult: p.noResult || '',
        })),
      })),
    }));

    const payload = { email, club, emailsCc, competitions: competitionsPayload };

    try {
      if (docId) {
        // ── Update existing declaration ──────────────────────────────────────
        await updateDoc(doc(db, 'performanceDeclarations', docId), {
          ...payload,
          status: 'submitted',
          seltecStatus: 'orange',
          lastSeltecCheck: null,
          updatedAt: serverTimestamp(),
        });
      } else {
        // ── Create new declaration ───────────────────────────────────────────
        await addDoc(collection(db, 'performanceDeclarations'), {
          ...payload,
          status: 'submitted', seltecStatus: 'orange',
          linkedAuthorisationId: prefill?.linkedAuthorisationId || null,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || null,
          clubId: club, lastSeltecCheck: null, type: 'performance',
        });
      }

      await fetch('https://sendperformanceemail-t2aq3fohza-uc.a.run.app', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.warn('Email failed:', err));

      if (onSubmitSuccess) onSubmitSuccess();
      if (!docId) {
        setClub(prefillClub); setEmail(''); setCcInput(''); setEmailsCc([]);
        setCompetitions([blankComp()]); setErrors({});
      }
    } catch (err) {
      console.error(err);
      alert('Échec de l\'envoi.');
    }
    setLoading(false);
  };

  const flaOptions = () => club && club !== '-'
    ? athletes.filter(a => normalizeClub(a.club) === club)
    : athletes;

  return (
    <Box component="form" onSubmit={handleSubmit}
      sx={{ maxWidth: 860, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>

      <Typography variant="h6" fontWeight={700}>
        {docId ? 'Compléter les résultats' : 'Nouvelle fiche de performances'}
      </Typography>

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#E2E8F0' }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle2">Informations de contact</Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small" error={hasError('club')}>
                <InputLabel>Club</InputLabel>
                <Select value={club} label="Club" onChange={e => setClub(e.target.value)}>
                  {clubs.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
                {hasError('club') && <FormHelperText>{getError('club')}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" label="E-mail" value={email}
                onChange={e => setEmail(e.target.value)}
                error={hasError('email')} helperText={getError('email')} />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth size="small" label="Email en copie (CC)" value={ccInput}
                onChange={e => setCcInput(e.target.value)}
                placeholder="Tapez un email puis appuyez sur Entrée ou quittez le champ"
                onBlur={() => { if (ccInput.trim()) addCcEmail(); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCcEmail(); } }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button fullWidth variant="outlined" size="small" startIcon={<AddIcon />}
                onClick={addCcEmail} sx={{ height: 40, mt: '8px' }}>
                Ajouter CC
              </Button>
            </Grid>
            {emailsCc.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {emailsCc.map((m, i) => (
                    <Chip key={i} label={m} size="small"
                      onDelete={() => setEmailsCc(emailsCc.filter((_, j) => j !== i))} />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>

      {/* ── Competitions ──────────────────────────────────────────────────── */}
      {competitions.map((comp, ci) => (
        <Paper key={ci} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#E2E8F0' }}>
          <SectionHeader
            icon={<EmojiEventsIcon sx={{ fontSize: 17, color: '#1B3A8F' }} />}
            title={`Compétition ${ci + 1}${comp.name ? ` — ${comp.name}` : ''}`}
            onRemove={() => removeCompetition(ci)}
            removeDisabled={competitions.length === 1}
          />
          <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField fullWidth required size="small" label="Nom de la compétition"
                  value={comp.name} onChange={e => updComp(ci, 'name', e.target.value)}
                  error={hasError(`comp[${ci}].name`)} helperText={getError(`comp[${ci}].name`)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth required size="small" label="Lieu" value={comp.place}
                  onChange={e => updComp(ci, 'place', e.target.value)}
                  error={hasError(`comp[${ci}].place`)} helperText={getError(`comp[${ci}].place`)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth required size="small" label="Pays" value={comp.country}
                  onChange={e => updComp(ci, 'country', e.target.value)}
                  error={hasError(`comp[${ci}].country`)} helperText={getError(`comp[${ci}].country`)} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField fullWidth required size="small" type="date" label="Date"
                  InputLabelProps={{ shrink: true }} value={comp.date}
                  onChange={e => updComp(ci, 'date', e.target.value)}
                  error={hasError(`comp[${ci}].date`)} helperText={getError(`comp[${ci}].date`)} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <FormControl fullWidth required size="small">
                  <InputLabel>Type</InputLabel>
                  <Select value={comp.type || 'outdoor'} label="Type"
                    onChange={e => updComp(ci, 'type', e.target.value)}>
                    <MenuItem value="outdoor">Outdoor</MenuItem>
                    <MenuItem value="indoor">Indoor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField fullWidth required size="small" label="Site internet" value={comp.site}
                  onChange={e => updComp(ci, 'site', e.target.value)}
                  error={hasError(`comp[${ci}].site`)} helperText={getError(`comp[${ci}].site`)} />
              </Grid>
            </Grid>

            {/* Athletes */}
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary"
                sx={{ display: 'block', mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem' }}>
                Athlètes
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {comp.athletes.map((ath, ai) => (
                  <Paper key={ai} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#E2E8F0' }}>
                    <SectionHeader
                      icon={<PersonAddIcon sx={{ fontSize: 16, color: '#4B6AC4' }} />}
                      title={`Athlète ${ai + 1}${ath.firstName || ath.lastName ? ` — ${ath.firstName} ${ath.lastName}` : ''}`}
                      onRemove={() => removeAthlete(ci, ai)}
                      removeDisabled={comp.athletes.length === 1}
                    />
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {/* Name row + FLA search */}
                      <Grid container spacing={1.5} alignItems="flex-start">
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth required size="small" label="Prénom"
                            value={ath.firstName} onChange={e => updAth(ci, ai, { firstName: e.target.value })}
                            error={hasError(`comp[${ci}].ath[${ai}].firstName`)}
                            helperText={getError(`comp[${ci}].ath[${ai}].firstName`)} />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth required size="small" label="Nom"
                            value={ath.lastName} onChange={e => updAth(ci, ai, { lastName: e.target.value })}
                            error={hasError(`comp[${ci}].ath[${ai}].lastName`)}
                            helperText={getError(`comp[${ci}].ath[${ai}].lastName`)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Autocomplete
                            options={flaOptions()}
                            value={ath._flaAthlete || null}
                            onChange={(_, val) => {
                              if (val) {
                                updAth(ci, ai, {
                                  firstName: val.firstName, lastName: val.lastName,
                                  licenceNumber: val.licenceNumber || '',
                                  bib: val.bib || '', category: val.category || '-',
                                  _flaAthlete: val,
                                });
                              } else {
                                updAth(ci, ai, { _flaAthlete: null, licenceNumber: '', bib: '' });
                              }
                            }}
                            getOptionLabel={a => a ? `${a.firstName} ${a.lastName}` : ''}
                            isOptionEqualToValue={(a, b) => a.licenceNumber === b.licenceNumber}
                            filterOptions={(opts, { inputValue }) => {
                              const q = inputValue.toLowerCase();
                              return opts.filter(a =>
                                a.firstName.toLowerCase().includes(q) ||
                                a.lastName.toLowerCase().includes(q) ||
                                String(a.bib || '').includes(q) ||
                                (a.licenceNumber || '').includes(q)
                              ).slice(0, 50);
                            }}
                            renderOption={(props, a) => (
                              <Box component="li" {...props} key={a.licenceNumber}>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {a.firstName} {a.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Dossard #{a.bib} · {a.category} · {a.club}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            renderInput={params => (
                              <TextField {...params} size="small" label="Lier à un athlète FLA"
                                placeholder="Nom ou dossard…"
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <LinkIcon sx={{ fontSize: 15, color: 'text.disabled', mr: 0.5 }} />
                                      {params.InputProps.startAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <FormControl fullWidth required size="small"
                            error={hasError(`comp[${ci}].ath[${ai}].category`)}>
                            <InputLabel>Catégorie</InputLabel>
                            <Select value={ath.category} label="Catégorie"
                              onChange={e => updAth(ci, ai, { category: e.target.value })}>
                              {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                            <FormHelperText>{getError(`comp[${ci}].ath[${ai}].category`)}</FormHelperText>
                          </FormControl>
                        </Grid>
                      </Grid>

                      {/* Dossard badge when FLA linked */}
                      {ath._flaAthlete && (
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                            <BadgeIcon sx={{ fontSize: 13, color: '#3730A3' }} />
                            <Typography variant="caption" sx={{ color: '#3730A3', fontWeight: 700 }}>
                              Dossard #{ath._flaAthlete.bib}
                            </Typography>
                          </Box>
                          {ath._flaAthlete.licenceNumber && (
                            <Typography variant="caption" color="text.secondary">
                              Licence : {ath._flaAthlete.licenceNumber}
                            </Typography>
                          )}
                          <IconButton size="small" onClick={() => updAth(ci, ai, { _flaAthlete: null, licenceNumber: '', bib: '' })}
                            sx={{ color: 'text.disabled', p: 0.25 }}>
                            <LinkOffIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      )}

                      {/* Sex */}
                      <Box>
                        <Typography variant="caption" color="text.secondary"
                          sx={{ display: 'block', mb: 0.75, fontSize: '0.78rem' }}>
                          Sexe *
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {['F', 'M'].map(s => (
                            <Button key={s} size="small"
                              variant={ath.sex === s ? 'contained' : 'outlined'}
                              color={hasError(`comp[${ci}].ath[${ai}].sex`) ? 'error' : 'primary'}
                              onClick={() => updAth(ci, ai, { sex: s })}
                              sx={{ minWidth: 52 }}>
                              {s}
                            </Button>
                          ))}
                        </Box>
                        {hasError(`comp[${ci}].ath[${ai}].sex`) && (
                          <FormHelperText error sx={{ ml: 0 }}>Sexe obligatoire</FormHelperText>
                        )}
                      </Box>

                      {/* Performances */}
                      <Box>
                        <Typography variant="caption" fontWeight={600} color="text.secondary"
                          sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem' }}>
                          Résultats
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {ath.performances.map((perf, pi) => {
                            const epr = epreuves.find(e => e.discipline === perf.event);
                            const showWind = comp.type === 'outdoor' && (
                              epr?.ventObligatoire || (!epreuves.find(e => e.discipline === perf.event) && perf.event)
                            );
                            const windReq = comp.type === 'outdoor' && Boolean(epr?.ventObligatoire);
                            return (
                              <Box key={pi} sx={{ p: 1.75, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <TimerOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                      Résultat {pi + 1}
                                    </Typography>
                                  </Box>
                                  <IconButton size="small" onClick={() => removePerf(ci, ai, pi)}
                                    disabled={ath.performances.length === 1}
                                    sx={{ color: 'error.light', p: 0.5, opacity: ath.performances.length === 1 ? 0.3 : 1 }}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                <Grid container spacing={1.5}>
                                  <Grid item xs={12}>
                                    <Autocomplete freeSolo fullWidth
                                      options={epreuves.map(e => e.discipline)}
                                      value={perf.event ?? ''}
                                      onChange={(_, v) => updPerf(ci, ai, pi, 'event', v)}
                                      onInputChange={(_, v) => updPerf(ci, ai, pi, 'event', v)}
                                      ListboxProps={{ sx: { maxHeight: 400 } }}
                                      renderInput={params => (
                                        <TextField {...params} size="small" label="Épreuve" required fullWidth
                                          error={hasError(`comp[${ci}].ath[${ai}].perf[${pi}].event`)}
                                          helperText={getError(`comp[${ci}].ath[${ai}].perf[${pi}].event`)} />
                                      )} />
                                  </Grid>
                                  {/* No-result toggle */}
                                  <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                      <Typography variant="caption" color="text.secondary">Sans résultat :</Typography>
                                      {NO_RESULT_CODES.map(code => (
                                        <Chip
                                          key={code} label={code} size="small" clickable
                                          color={perf.noResult === code ? 'error' : 'default'}
                                          variant={perf.noResult === code ? 'filled' : 'outlined'}
                                          onClick={() => updPerf(ci, ai, pi, 'noResult', perf.noResult === code ? '' : code)}
                                          sx={{ fontSize: '0.72rem', height: 22 }}
                                        />
                                      ))}
                                    </Box>
                                  </Grid>

                                  <Grid item xs={6} sm={4}>
                                    <TextField fullWidth required={!perf.noResult} size="small" label="Performance"
                                      value={perf.noResult ? perf.noResult : perf.result}
                                      disabled={Boolean(perf.noResult)}
                                      onChange={e => updPerf(ci, ai, pi, 'result', e.target.value)}
                                      error={hasError(`comp[${ci}].ath[${ai}].perf[${pi}].result`)}
                                      helperText={getError(`comp[${ci}].ath[${ai}].perf[${pi}].result`)}
                                      sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: perf.noResult ? '#EF4444' : undefined, fontWeight: perf.noResult ? 700 : undefined } }}
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={4}>
                                    {showWind ? (
                                      <TextField fullWidth required={windReq} size="small" label="Vent" value={perf.wind}
                                        onChange={e => updPerf(ci, ai, pi, 'wind', e.target.value)}
                                        error={hasError(`comp[${ci}].ath[${ai}].perf[${pi}].wind`)}
                                        helperText={getError(`comp[${ci}].ath[${ai}].perf[${pi}].wind`) || 'NA si pas de mesure'}
                                        InputProps={{
                                          endAdornment: (
                                            <InputAdornment position="end">
                                              <Tooltip arrow title="NA si pas de mesure du vent">
                                                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                              </Tooltip>
                                            </InputAdornment>
                                          ),
                                        }} />
                                    ) : (
                                      <TextField fullWidth size="small" label="Vent" value="/" disabled />
                                    )}
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <TextField fullWidth size="small" label="Classement" value={perf.rank}
                                      onChange={e => updPerf(ci, ai, pi, 'rank', e.target.value)} />
                                  </Grid>
                                </Grid>
                              </Box>
                            );
                          })}
                        </Box>
                        <Button variant="outlined" size="small" startIcon={<AddIcon />}
                          onClick={() => addPerf(ci, ai)} sx={{ mt: 1 }}>
                          + Épreuve
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
              <Button variant="outlined" size="small" startIcon={<PersonAddIcon />}
                onClick={() => addAthlete(ci)} sx={{ mt: 1.5 }}>
                + Athlète
              </Button>
            </Box>
          </Box>
        </Paper>
      ))}

      <Button variant="outlined" startIcon={<EmojiEventsIcon />} onClick={addCompetition}
        sx={{ alignSelf: 'flex-start' }}>
        + Compétition
      </Button>

      <Divider />

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button type="submit" variant="contained" color="success" size="large" disabled={loading}
          sx={{ minWidth: 200 }}>
          {loading ? <CircularProgress size={22} color="inherit" /> : (docId ? 'Soumettre les résultats' : 'Envoyer la fiche')}
        </Button>
        {onCancel && (
          <Button variant="outlined" size="large" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
        )}
      </Box>
    </Box>
  );
}
