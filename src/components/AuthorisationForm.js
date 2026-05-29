import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Typography, Grid, IconButton, Chip, Paper, Divider,
  Autocomplete, FormHelperText, Tooltip,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
import EmojiEventsIcon    from '@mui/icons-material/EmojiEvents';
import LinkOffIcon        from '@mui/icons-material/LinkOff';
import BadgeIcon          from '@mui/icons-material/Badge';
import InfoOutlinedIcon   from '@mui/icons-material/InfoOutlined';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import athletes from '../data/athletes.json';
import epreuves from '../data/epreuves.json';

const clubs = [
  '-', 'CA Belvaux', 'CA Dudelange', 'CAE Grevenmacher', 'CA FOLA',
  'CAPA Ettelbruck', 'CA Schifflange', 'CELTIC Diekirch', 'CS Luxembourg',
  'CS du Nord', 'LIAL Luxembourg', 'RBUAP', 'TRILUX', 'TRISPEED Mamer', 'X3M', 'FLA-IND',
];

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

// ── dd/mm/yyyy date field (stores ISO YYYY-MM-DD internally) ──────────────────
function DateField({ value, onChange, label, required, sx }) {
  const toDisplay = iso => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return (d && m && y) ? `${d}/${m}/${y}` : iso;
  };
  const toISO = str => {
    const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  };

  const [raw, setRaw] = useState(() => toDisplay(value));
  useEffect(() => { setRaw(toDisplay(value)); }, [value]); // eslint-disable-line

  const handleChange = e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setRaw(formatted);
    const iso = toISO(formatted);
    if (iso || formatted === '') onChange(iso);
  };

  return (
    <TextField
      size="small" label={label} required={required}
      value={raw} onChange={handleChange}
      placeholder="jj/mm/aaaa"
      inputProps={{ maxLength: 10 }}
      sx={sx}
    />
  );
}

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
function AthleteBlock({ ath, ci, ai, club, onUpdate, onRemove, removeDisabled, errors = {} }) {
  const options = club && club !== '-'
    ? athletes.filter(a => normalizeClub(a.club) === club)
    : athletes;

  const handleFlaSelect = val => {
    if (val) {
      onUpdate({
        firstName:     val.firstName,
        lastName:      val.lastName,
        licenceNumber: val.licenceNumber || '',
        bib:           val.bib          || '',
        category:      val.category     || '-',
        sex:           val.sex          || '',
        _flaAthlete:   val,
      });
    } else {
      onUpdate({ _flaAthlete: null, licenceNumber: '', bib: '' });
    }
  };

  const sexErr      = errors[`${ci}_${ai}_sex`];
  const categoryErr = errors[`${ci}_${ai}_category`];
  const eventsErr   = errors[`${ci}_${ai}_events`];

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#E2E8F0' }}>
      <SectionHeader
        icon={<PersonAddIcon sx={{ fontSize: 16, color: '#4B6AC4' }} />}
        title={`Athlète ${ai + 1}${ath.firstName || ath.lastName ? ` — ${ath.firstName} ${ath.lastName}` : ''}`}
        onRemove={onRemove}
        removeDisabled={removeDisabled}
      />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

        {/* ── Row 1 : Prénom · Nom · Dossard ── */}
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
                const q = inputValue.trim().toLowerCase();
                if (q.length < 2) return [];
                return opts.filter(a =>
                  `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
                  a.lastName.toLowerCase().startsWith(q) ||
                  a.firstName.toLowerCase().startsWith(q) ||
                  String(a.bib || '').includes(q)
                ).slice(0, 30);
              }}
              noOptionsText="Tapez au moins 2 lettres…"
              renderOption={(props, a) => (
                <Box component="li" {...props} key={a.licenceNumber}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{a.firstName} {a.lastName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Dossard #{a.bib} · {a.category} · {a.club}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={params => (
                <TextField {...params} size="small" label="Dossard"
                  placeholder="Rechercher par nom…"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Tooltip title="Vous pouvez rechercher le dossard par nom dans cette case" placement="top">
                          <InfoOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8', mr: 0.5, cursor: 'help', flexShrink: 0 }} />
                        </Tooltip>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* ── Row 2 : Catégorie · Sexe ── */}
        <Grid container spacing={1.5} alignItems="flex-start">
          <Grid item xs={6} sm={5}>
            <FormControl fullWidth required size="small"
              error={Boolean(categoryErr)}
              sx={{ minWidth: 150 }}>
              <InputLabel>Catégorie</InputLabel>
              <Select value={ath.category} label="Catégorie"
                onChange={e => onUpdate({ category: e.target.value })}>
                {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
              {categoryErr && <FormHelperText>{categoryErr}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={7}>
            <Typography variant="caption" sx={{
              display: 'block', mb: 0.75, fontSize: '0.78rem',
              color: sexErr ? 'error.main' : 'text.secondary',
            }}>
              Sexe *
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['F', 'M'].map(s => (
                <Button key={s} type="button" size="small"
                  variant={ath.sex === s ? 'contained' : 'outlined'}
                  color={sexErr ? 'error' : 'primary'}
                  onClick={() => onUpdate({ sex: s })}
                  sx={{ minWidth: 52 }}>
                  {s}
                </Button>
              ))}
            </Box>
            {sexErr && <FormHelperText error sx={{ ml: 0, mt: 0.5 }}>{sexErr}</FormHelperText>}
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
            <IconButton size="small" onClick={() => handleFlaSelect(null)}
              sx={{ color: 'text.disabled', p: 0.25 }}>
              <LinkOffIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}

        {/* Events */}
        <Box>
          <Typography variant="caption"
            sx={{
              display: 'block', mb: 0.75, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.68rem',
              color: eventsErr ? 'error.main' : 'text.secondary',
            }}>
            Épreuves *
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {ath.events.map((ev, ei) => (
              <Box key={ei} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Autocomplete freeSolo fullWidth
                  options={epreuves.map(e => e.discipline)}
                  value={ev}
                  onChange={(_, v) => onUpdate({ events: ath.events.map((x, i) => i === ei ? (v || '') : x) })}
                  onInputChange={(_, v) => onUpdate({ events: ath.events.map((x, i) => i === ei ? v : x) })}
                  ListboxProps={{ sx: { maxHeight: 400 } }}
                  renderInput={params => (
                    <TextField {...params} size="small" fullWidth
                      error={Boolean(eventsErr && ei === 0)}
                      placeholder="ex: 100m, Saut en hauteur…" />
                  )}
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
            {eventsErr && (
              <FormHelperText error sx={{ ml: 0, mt: 0 }}>{eventsErr}</FormHelperText>
            )}
            <Button type="button" size="small" variant="outlined" startIcon={<AddIcon />}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onUpdate({ events: [...ath.events, ''] }); }}
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
  firstName: '', lastName: '', licenceNumber: '', bib: '',
  category: '-', sex: '',
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
  const [emailsCc, setEmailsCc]   = useState([]);
  const [ccInput, setCcInput]     = useState('');
  const [remarks, setRemarks]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [athErrors, setAthErrors] = useState({});
  const [competitions, setCompetitions] = useState([blankCompetition()]);

  const isValidEmail = v => /\S+@\S+\.\S+/.test(v);

  // Competition helpers — all use .map() so updaters are pure (no mutation of original refs)
  const updComp    = (ci, f, v)  => setCompetitions(u => u.map((c, i) => i === ci ? { ...c, [f]: v } : c));
  const updDate    = (ci, di, v) => setCompetitions(u => u.map((c, i) => i !== ci ? c : { ...c, dates: c.dates.map((d, j) => j === di ? v : d) }));
  const addDate    = ci          => setCompetitions(u => u.map((c, i) => i !== ci ? c : { ...c, dates: [...c.dates, ''] }));
  const removeDate = (ci, di)    => setCompetitions(u => u.map((c, i) => {
    if (i !== ci) return c;
    const next = c.dates.filter((_, j) => j !== di);
    return { ...c, dates: next.length ? next : [''] };
  }));
  const addCompetition    = () => setCompetitions(u => [...u, blankCompetition()]);
  const removeCompetition = ci  => setCompetitions(u => u.filter((_, i) => i !== ci));

  // Athlete helpers
  const updAthlete    = (ci, ai, patch) => setCompetitions(u => u.map((c, i) => i !== ci ? c : {
    ...c, athletes: c.athletes.map((a, j) => j === ai ? { ...a, ...patch } : a),
  }));
  const addAthlete    = ci       => setCompetitions(u => u.map((c, i) => i !== ci ? c : { ...c, athletes: [...c.athletes, blankAthlete()] }));
  const removeAthlete = (ci, ai) => setCompetitions(u => u.map((c, i) => i !== ci ? c : { ...c, athletes: c.athletes.filter((_, j) => j !== ai) }));

  // CC chip helpers
  const addCcEmail = val => {
    const v = (val || ccInput).trim();
    if (v && isValidEmail(v) && !emailsCc.includes(v)) {
      setEmailsCc(prev => [...prev, v]);
    }
    setCcInput('');
  };
  const removeCcEmail = idx => setEmailsCc(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate sex + category + events for every athlete
    const newAthErrors = {};
    competitions.forEach((comp, ci) => {
      comp.athletes.forEach((a, ai) => {
        if (!a.sex)                                        newAthErrors[`${ci}_${ai}_sex`]      = 'Sexe obligatoire';
        if (!a.category || a.category === '-')             newAthErrors[`${ci}_${ai}_category`]  = 'Catégorie obligatoire';
        if (!a.events || !a.events.some(ev => ev.trim())) newAthErrors[`${ci}_${ai}_events`]    = 'Au moins une épreuve obligatoire';
      });
    });
    if (Object.keys(newAthErrors).length > 0) {
      setAthErrors(newAthErrors);
      setLoading(false);
      return;
    }
    setAthErrors({});

    const competitionsPayload = competitions.map(comp => ({
      name: comp.name, place: comp.place, country: comp.country,
      dates: comp.dates, site: comp.site, organiser: comp.organiser,
      athletes: comp.athletes.map(a => ({
        firstName:     a.firstName,
        lastName:      a.lastName,
        licenceNumber: a.licenceNumber || '',
        bib:           a.bib          || '',
        category:      a.category     || (a._flaAthlete?.category || ''),
        sex:           a.sex          || '',
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
            sex: a.sex || '', category: a.category || '-',
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

      if (process.env.NODE_ENV !== 'development') {
        await fetch('https://sendauthorisationemail-t2aq3fohza-uc.a.run.app', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(err => console.warn('Email failed:', err));
      }

      if (onSubmitSuccess) onSubmitSuccess();
      setClub(prefillClub); setEmail(''); setFirstName(''); setLastName('');
      setEmailsCc([]); setCcInput(''); setRemarks('');
      setCompetitions([blankCompetition()]);
    } catch (err) {
      console.error(err);
      alert('Échec de l\'envoi de la demande.');
    }
    setLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      <Typography variant="h6" fontWeight={700}>Nouvelle demande d'autorisation</Typography>

      {/* ── Requester info ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#E2E8F0' }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle2">Informations du demandeur</Typography>
        </Box>
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* ── Row 1 : Club · Prénom · Nom ── separate Grid so it never merges with row 2 */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required size="small">
                <InputLabel>Club</InputLabel>
                <Select value={club} label="Club" onChange={e => setClub(e.target.value)}>
                  {clubs.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth required size="small" label="Prénom du demandeur"
                value={firstName} onChange={e => setFirstName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth required size="small" label="Nom du demandeur"
                value={lastName} onChange={e => setLastName(e.target.value)} />
            </Grid>
          </Grid>

          {/* ── Row 2 : Email · CC ── */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={5}>
              <TextField fullWidth required size="small" type="email" label="Email du demandeur"
                value={email} onChange={e => setEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={7}>
              {/* Simple text input: type one or more emails separated by comma, press Enter or blur to add */}
              <TextField
                fullWidth size="small"
                label="Emails en copie (CC)"
                placeholder="ex: coach@club.lu, autre@mail.com"
                value={ccInput}
                onChange={e => setCcInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addCcEmail(ccInput); }
                }}
                onBlur={() => addCcEmail(ccInput)}
                helperText="Appuyez sur Entrée pour valider chaque adresse"
              />
              {emailsCc.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                  {emailsCc.map((addr, i) => (
                    <Chip key={i} label={addr} size="small" variant="outlined"
                      onDelete={() => removeCcEmail(i)}
                      sx={{ fontSize: '0.78rem', height: 24 }} />
                  ))}
                </Box>
              )}
            </Grid>
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
                    <DateField
                      label={`Jour ${di + 1}`}
                      value={d}
                      onChange={v => updDate(ci, di, v)}
                      sx={{ width: 160 }}
                    />
                    <IconButton size="small" onClick={() => removeDate(ci, di)}
                      disabled={comp.dates.length === 1}
                      sx={{ color: 'error.light', opacity: comp.dates.length === 1 ? 0.3 : 1 }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button type="button" variant="outlined" size="small" startIcon={<AddIcon />}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); addDate(ci); }}>
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
                    errors={athErrors}
                  />
                ))}
              </Box>
              <Button type="button" variant="outlined" size="small" startIcon={<PersonAddIcon />}
                onClick={e => { e.preventDefault(); addAthlete(ci); }} sx={{ mt: 1.5 }}>
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
