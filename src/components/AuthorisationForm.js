import React, { useState } from 'react';
import {
  Box, TextField, Button, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Typography, Grid, IconButton, Chip, Paper, Divider,
  Autocomplete,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddIcon     from '@mui/icons-material/PersonAdd';
import EmojiEventsIcon   from '@mui/icons-material/EmojiEvents';
import LinkIcon          from '@mui/icons-material/Link';
import LinkOffIcon       from '@mui/icons-material/LinkOff';
import BadgeIcon         from '@mui/icons-material/Badge';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
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

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, onRemove, removeDisabled }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 2.5, py: 1.5,
      bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="subtitle2" sx={{ color: '#1A202C', fontSize: '0.8rem' }}>
          {title}
        </Typography>
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

// ── Athlete entry block ───────────────────────────────────────────────────────
function AthleteBlock({ ath, ci, ai, club, onUpdate, onRemove, removeDisabled }) {
  const options = club && club !== '-'
    ? athletes.filter(a => normalizeClub(a.club) === club)
    : athletes;

  const handleFlaSelect = (val) => {
    if (val) {
      onUpdate({
        firstName:     val.firstName,
        lastName:      val.lastName,
        licenceNumber: val.licenceNumber || '',
        bib:           val.bib          || '',
        category:      val.category     || '',
        _flaAthlete:   val,
      });
    } else {
      onUpdate({ _flaAthlete: null, licenceNumber: '', bib: '' });
    }
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#E2E8F0' }}>
      <SectionHeader
        icon={<PersonAddIcon sx={{ fontSize: 16, color: '#4B6AC4' }} />}
        title={`Athlète ${ai + 1}${ath.firstName || ath.lastName ? ` — ${ath.firstName} ${ath.lastName}` : ''}`}
        onRemove={onRemove}
        removeDisabled={removeDisabled}
      />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Name + FLA search */}
        <Grid container spacing={1.5} alignItems="flex-start">
          <Grid item xs={12} sm={4}>
            <TextField size="small" fullWidth required label="Prénom"
              value={ath.firstName}
              onChange={e => onUpdate({ firstName: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField size="small" fullWidth required label="Nom"
              value={ath.lastName}
              onChange={e => onUpdate({ lastName: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={options}
              value={ath._flaAthlete || null}
              onChange={(_, val) => handleFlaSelect(val)}
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
                        <LinkIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* Dossard badge when FLA athlete linked */}
        {ath._flaAthlete && (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
              <BadgeIcon sx={{ fontSize: 14, color: '#3730A3' }} />
              <Typography variant="caption" sx={{ color: '#3730A3', fontWeight: 700 }}>
                Dossard #{ath._flaAthlete.bib}
              </Typography>
            </Box>
            {ath._flaAthlete.licenceNumber && (
              <Typography variant="caption" color="text.secondary">
                Licence : {ath._flaAthlete.licenceNumber}
              </Typography>
            )}
            {ath._flaAthlete.category && (
              <Chip label={ath._flaAthlete.category} size="small" variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }} />
            )}
            <IconButton size="small" onClick={() => handleFlaSelect(null)}
              sx={{ color: 'text.disabled', p: 0.25 }}>
              <LinkOffIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}

        {/* Events */}
        <Box>
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.68rem' }}>
            Épreuves
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {ath.events.map((ev, ei) => (
              <Box key={ei} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small" fullWidth placeholder="ex: 100m, Saut en hauteur…"
                  value={ev}
                  onChange={e => onUpdate({ events: ath.events.map((x, i) => i === ei ? e.target.value : x) })}
                />
                <IconButton size="small"
                  onClick={() => {
                    const next = ath.events.filter((_, i) => i !== ei);
                    onUpdate({ events: next.length ? next : [''] });
                  }}
                  disabled={ath.events.length === 1}
                  sx={{ color: 'error.light', flexShrink: 0, opacity: ath.events.length === 1 ? 0.3 : 1 }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" variant="outlined" startIcon={<AddIcon />}
              onClick={() => onUpdate({ events: [...ath.events, ''] })}
              sx={{ alignSelf: 'flex-start', mt: 0.25 }}>
              Épreuve
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
const blankAthlete = () => ({
  firstName: '', lastName: '', licenceNumber: '', bib: '', category: '',
  _flaAthlete: null, events: [''],
});

const blankCompetition = () => ({
  name: '', place: '', country: '', dates: [''], site: '', organiser: '',
  athletes: [blankAthlete()],
});

export default function AuthorisationForm({ userProfile, onSubmitSuccess }) {
  const prefillClub = userProfile?.club || '-';

  const [club, setClub]           = useState(prefillClub);
  const [email, setEmail]         = useState(userProfile?.email || '');
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName]   = useState(userProfile?.lastName  || '');
  const [ccInput, setCcInput]     = useState('');
  const [emailsCc, setEmailsCc]   = useState([]);
  const [remarks, setRemarks]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [competitions, setCompetitions] = useState([blankCompetition()]);

  const isValidEmail = v => /\S+@\S+\.\S+/.test(v);

  const addCcEmail = () => {
    const c = (ccInput || '').trim();
    if (!c) return;
    if (!isValidEmail(c)) { alert('Adresse email invalide !'); return; }
    if (!emailsCc.includes(c)) setEmailsCc(p => [...p, c]);
    setCcInput('');
  };

  // Competition helpers
  const updComp    = (ci, f, v)  => setCompetitions(u => { const x=[...u]; x[ci]={...x[ci],[f]:v}; return x; });
  const updDate    = (ci, di, v) => setCompetitions(u => { const x=[...u]; x[ci].dates=x[ci].dates.map((d,i)=>i===di?v:d); return x; });
  const addDate    = (ci)        => setCompetitions(u => { const x=[...u]; x[ci].dates=[...x[ci].dates,'']; return x; });
  const removeDate = (ci, di)    => setCompetitions(u => {
    const x=[...u]; const next=x[ci].dates.filter((_,i)=>i!==di); x[ci].dates=next.length?next:[''];return x;
  });
  const addCompetition    = () => setCompetitions(u => [...u, blankCompetition()]);
  const removeCompetition = ci  => setCompetitions(u => u.filter((_,i)=>i!==ci));

  // Athlete helpers
  const updAthlete = (ci, ai, patch) => setCompetitions(u => {
    const x=[...u];
    x[ci].athletes = x[ci].athletes.map((a,i) => i===ai ? {...a,...patch} : a);
    return x;
  });
  const addAthlete    = ci => setCompetitions(u => { const x=[...u]; x[ci].athletes=[...x[ci].athletes,blankAthlete()]; return x; });
  const removeAthlete = (ci,ai) => setCompetitions(u => {
    const x=[...u]; x[ci].athletes=x[ci].athletes.filter((_,i)=>i!==ai); return x;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const competitionsPayload = competitions.map(comp => ({
      name: comp.name, place: comp.place, country: comp.country,
      dates: comp.dates, site: comp.site, organiser: comp.organiser,
      athletes: comp.athletes.map(a => ({
        firstName:     a.firstName,
        lastName:      a.lastName,
        licenceNumber: a.licenceNumber || '',
        bib:           a.bib          || '',
        category:      a.category     || (a._flaAthlete?.category || ''),
        club:          a._flaAthlete?.club || club,
        events:        a.events,
      })),
    }));

    const payload = { email, club, firstName, lastName, emailsCc, competitions: competitionsPayload, remarks };

    try {
      const docRef = await addDoc(collection(db, 'authorisationRequests'), {
        ...payload,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        clubId: club,
        linkedPerformanceId: null,
        acceptedBy: null, acceptedAt: null,
        type: 'authorisation',
      });

      // Auto-create linked performance stub
      await addDoc(collection(db, 'performanceDeclarations'), {
        email, club, emailsCc,
        competitions: competitionsPayload.map(comp => ({
          name: comp.name, place: comp.place, country: comp.country,
          date: comp.dates[0] || '', site: comp.site, type: 'outdoor',
          athletes: comp.athletes.map(a => ({
            firstName: a.firstName, lastName: a.lastName,
            licenceNumber: a.licenceNumber, bib: a.bib,
            sex: '', category: a.category || '-',
            performances: [{ event: a.events[0] || '', result: '', wind: '', rank: '' }],
          })),
        })),
        status: 'to_complete',
        seltecStatus: null,
        linkedAuthorisationId: docRef.id,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        clubId: club,
        type: 'performance',
      });

      await fetch('https://sendauthorisationemail-t2aq3fohza-uc.a.run.app', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.warn('Email failed:', err));

      if (onSubmitSuccess) onSubmitSuccess();
      setClub(prefillClub); setEmail(''); setFirstName(''); setLastName('');
      setCcInput(''); setEmailsCc([]); setRemarks('');
      setCompetitions([blankCompetition()]);
    } catch (err) {
      console.error(err);
      alert('Échec de l\'envoi de la demande.');
    }
    setLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}
      sx={{ maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>

      <Typography variant="h6" fontWeight={700}>Nouvelle demande d'autorisation</Typography>

      {/* ── Requester info ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#E2E8F0' }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle2">Informations du demandeur</Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth required size="small">
                <InputLabel>Club</InputLabel>
                <Select value={club} label="Club" onChange={e => setClub(e.target.value)}>
                  {clubs.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth required size="small" label="Prénom du demandeur"
                value={firstName} onChange={e => setFirstName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth required size="small" label="Nom du demandeur"
                value={lastName} onChange={e => setLastName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth required size="small" type="email" label="Email du demandeur"
                value={email} onChange={e => setEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={8} md={5}>
              <TextField fullWidth size="small" label="Email en copie (CC)"
                value={ccInput} onChange={e => setCcInput(e.target.value)}
                placeholder="Tapez un email puis appuyez sur Entrée ou quittez le champ"
                onBlur={() => { if (ccInput.trim()) addCcEmail(); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCcEmail(); } }} />
            </Grid>
            <Grid item xs={12} sm={4} md={3} sx={{ display: 'flex' }}>
              <Button fullWidth variant="outlined" size="small" startIcon={<AddIcon />}
                onClick={addCcEmail} sx={{ alignSelf: 'center', mt: '8px', height: 40 }}>
                Ajouter CC
              </Button>
            </Grid>
            {emailsCc.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {emailsCc.map((m, i) => (
                    <Chip key={i} label={m} size="small"
                      onDelete={() => setEmailsCc(p => p.filter((_, j) => j !== i))} />
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
            {/* Competition info */}
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField fullWidth required size="small" label="Nom de la compétition"
                  value={comp.name} onChange={e => updComp(ci, 'name', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required size="small" label="Lieu"
                  value={comp.place} onChange={e => updComp(ci, 'place', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required size="small" label="Pays"
                  value={comp.country} onChange={e => updComp(ci, 'country', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required size="small" label="Site internet"
                  value={comp.site} onChange={e => updComp(ci, 'site', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Club organisateur"
                  value={comp.organiser} onChange={e => updComp(ci, 'organiser', e.target.value)} />
              </Grid>
            </Grid>

            {/* Dates */}
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary"
                sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem' }}>
                Dates
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {comp.dates.map((d, di) => (
                  <Box key={di} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField type="date" label={`Jour ${di + 1}`} size="small"
                      InputLabelProps={{ shrink: true }}
                      value={d} onChange={e => updDate(ci, di, e.target.value)}
                      sx={{ width: 160 }} />
                    <IconButton size="small" onClick={() => removeDate(ci, di)}
                      disabled={comp.dates.length === 1}
                      sx={{ color: 'error.light', opacity: comp.dates.length === 1 ? 0.3 : 1 }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button variant="outlined" size="small" startIcon={<AddIcon />}
                  onClick={() => addDate(ci)}>
                  Jour
                </Button>
              </Box>
            </Box>

            {/* Athletes */}
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary"
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem' }}>
                Athlètes
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {comp.athletes.map((ath, ai) => (
                  <AthleteBlock
                    key={ai}
                    ath={ath} ci={ci} ai={ai} club={club}
                    onUpdate={patch => updAthlete(ci, ai, patch)}
                    onRemove={() => removeAthlete(ci, ai)}
                    removeDisabled={comp.athletes.length === 1}
                  />
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

      <TextField fullWidth multiline minRows={2} size="small" label="Remarques (facultatif)"
        value={remarks} onChange={e => setRemarks(e.target.value)} />

      <Divider />

      <Button type="submit" variant="contained" color="success" size="large" disabled={loading}
        sx={{ alignSelf: 'flex-start', minWidth: 200 }}>
        {loading ? <CircularProgress size={22} color="inherit" /> : 'Envoyer la demande'}
      </Button>
    </Box>
  );
}
