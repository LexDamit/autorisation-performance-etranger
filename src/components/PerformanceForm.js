import React, { useState } from 'react';
import {
  Box, TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Typography, Grid, IconButton, Chip, FormHelperText, Tooltip, InputAdornment, CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import epreuves from '../data/epreuves.json';

const clubs = [
  '-', 'CA Belvaux', 'CA Dudelange', 'CAE Grevenmacher', 'CA FOLA',
  'CAPA Ettelbruck', 'CA Schifflange', 'CELTIC Diekirch', 'CS Luxembourg',
  'CS du Nord', 'LIAL Luxembourg', 'RBUAP', 'TRILUX', 'TRISPEED Mamer', 'X3M', 'FLA-IND'
];

const categories = [
  '-', 'U12 Débutant(e)', 'U14 Scolaire', 'U16 Minime', 'U18 Cadet(te)', 'U20 Junior', 'U23 Espoir', 'Senior', 'Masters'
];

const PerformanceForm = () => {
  const [club, setClub] = useState('-');
  const [email, setEmail] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [emailsCc, setEmailsCc] = useState([]);
  const [loading, setLoading] = useState(false);

  const [competitions, setCompetitions] = useState([
    {
      name: '', place: '', country: '', date: '', site: '',
      type: 'outdoor',
      athletes: [
        {
          firstName: '', lastName: '', sex: '', category: '-',
          performances: [{ event: '', result: '', wind: '', rank: '' }]
        }
      ]
    }
  ]);

  const [errors, setErrors] = useState({});
  const hasError = (key) => Boolean(errors[key]);
  const getError = (key) => errors[key] || '';

  const requiredMsg = 'Obligatoire';
  const isValidEmail = (val) => /\S+@\S+\.\S+/.test(val);

  const addCcEmail = () => {
    if (!ccInput) return;
    if (isValidEmail(ccInput)) {
      if (!emailsCc.includes(ccInput)) {
        setEmailsCc([...emailsCc, ccInput]);
      }
      setCcInput('');
    } else {
      alert('Adresse email invalide !');
    }
  };

  const removeCcEmail = (index) => setEmailsCc(emailsCc.filter((_, i) => i !== index));

  const handleCompetitionChange = (index, field, value) => {
    const updated = [...competitions];
    updated[index][field] = value;
    setCompetitions(updated);
  };

  const handleAthleteChange = (compIndex, athleteIndex, field, value) => {
    const updated = [...competitions];
    updated[compIndex].athletes[athleteIndex][field] = value;
    setCompetitions(updated);
  };

  const handlePerformanceChange = (compIndex, athleteIndex, perfIndex, field, value) => {
    const updated = [...competitions];
    updated[compIndex].athletes[athleteIndex].performances[perfIndex][field] = value;
    setCompetitions(updated);
  };

  const addCompetition = () => {
    setCompetitions([
      ...competitions,
      {
        name: '', place: '', country: '', date: '', site: '',
        type: 'outdoor',
        athletes: [
          {
            firstName: '', lastName: '', sex: '', category: '-',
            performances: [{ event: '', result: '', wind: '', rank: '' }]
          }
        ]
      }
    ]);
  };

  const removeCompetition = (index) => setCompetitions(competitions.filter((_, i) => i !== index));

  const addAthlete = (compIndex) => {
    const updated = [...competitions];
    updated[compIndex].athletes.push({
      firstName: '', lastName: '', sex: '', category: '-',
      performances: [{ event: '', result: '', wind: '', rank: '' }]
    });
    setCompetitions(updated);
  };

  const removeAthlete = (compIndex, athleteIndex) => {
    const updated = [...competitions];
    updated[compIndex].athletes = updated[compIndex].athletes.filter((_, i) => i !== athleteIndex);
    setCompetitions(updated);
  };

  const addPerformance = (compIndex, athleteIndex) => {
    const updated = [...competitions];
    updated[compIndex].athletes[athleteIndex].performances.push({ event: '', result: '', wind: '', rank: '' });
    setCompetitions(updated);
  };

  const removePerformance = (compIndex, athleteIndex, perfIndex) => {
    const updated = [...competitions];
    updated[compIndex].athletes[athleteIndex].performances =
      updated[compIndex].athletes[athleteIndex].performances.filter((_, i) => i !== perfIndex);
    setCompetitions(updated);
  };

  const validate = () => {
    const next = {};

    if (!email || !isValidEmail(email)) next['email'] = 'Adresse email invalide';
    if (!club || club === '-') next['club'] = requiredMsg;

    competitions.forEach((c, i) => {
      const b = (k) => `competitions[${i}].${k}`;
      if (!c.name?.trim()) next[b('name')] = requiredMsg;
      if (!c.place?.trim()) next[b('place')] = requiredMsg;
      if (!c.country?.trim()) next[b('country')] = requiredMsg;
      if (!c.date) next[b('date')] = requiredMsg;
      if (!c.type) next[b('type')] = requiredMsg;
      if (!c.site?.trim()) next[b('site')] = requiredMsg;

      c.athletes.forEach((a, j) => {
        const ab = (k) => `competitions[${i}].athletes[${j}].${k}`;
        if (!a.firstName?.trim()) next[ab('firstName')] = requiredMsg;
        if (!a.lastName?.trim()) next[ab('lastName')] = requiredMsg;
        if (!a.sex) next[ab('sex')] = requiredMsg;
        if (!a.category || a.category === '-') next[ab('category')] = requiredMsg;

        a.performances.forEach((p, k) => {
          const pb = (k2) => `competitions[${i}].athletes[${j}].performances[${k}].${k2}`;
          if (!p.event?.trim()) next[pb('event')] = requiredMsg;
          if (!p.result?.trim()) next[pb('result')] = requiredMsg;
          const typeComp = c.type ?? 'outdoor';
          const epreuve = epreuves.find((e) => e.discipline === p.event);
          const requiresWind = typeComp === 'outdoor' && epreuve?.ventObligatoire;
          if (requiresWind && !p.wind?.trim()) next[pb('wind')] = requiredMsg;
        });
      });
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validate()) {
      alert('Veuillez corriger les champs obligatoires.');
      setLoading(false);
      return;
    }

    const payload = { email, club, emailsCc, competitions };

    try {
      await addDoc(collection(db, 'performanceDeclarations'), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        type: 'performance',
      });

      const response = await fetch('https://sendperformanceemail-t2aq3fohza-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Email envoyé avec succès !');

        setClub('-');
        setEmail('');
        setCcInput('');
        setEmailsCc([]);
        setCompetitions([
          {
            name: '', place: '', country: '', date: '', site: '',
            type: 'outdoor',
            athletes: [
              {
                firstName: '', lastName: '', sex: '', category: '-',
                performances: [{ event: '', result: '', wind: '', rank: '' }]
              }
            ]
          }
        ]);
        setErrors({});
      } else {
        const errorText = await response.text();
        alert(`Erreur: ${errorText}`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      alert('Échec de l’envoi de l’email.');
    }

    setLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}
      sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" fontWeight="bold">Fiche performances à l'étranger</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required error={hasError('club')} sx={{ minWidth: 280 }}>
            <InputLabel id="club-label">Club</InputLabel>
            <Select
              labelId="club-label"
              id="club"
              value={club}
              label="Club"
              onChange={(e) => setClub(e.target.value)}
            >
              {clubs.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={hasError('email')}
            helperText={getError('email')}
          />
        </Grid>

        <Grid item xs={12} md={9}>
          <TextField
            fullWidth
            label="Ajouter un email en copie"
            value={ccInput}
            onChange={(e) => setCcInput(e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <Button fullWidth variant="outlined" onClick={addCcEmail}>+ Ajouter Email</Button>
        </Grid>

        <Grid item xs={12}>
          {emailsCc.map((mail, idx) => (
            <Chip key={idx} label={mail} onDelete={() => removeCcEmail(idx)} sx={{ mr: 1, mb: 1 }} />
          ))}
        </Grid>
      </Grid>

      {competitions.map((comp, compIndex) => (
        <Box key={compIndex} sx={{ p: 2, border: '1px solid #ddd', borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {`Compétition ${compIndex + 1} : ${comp.name || ''}`}
          </Typography>

          <TextField
            fullWidth required
            label="Nom de la compétition"
            value={comp.name}
            onChange={(e) => handleCompetitionChange(compIndex, 'name', e.target.value)}
            error={hasError(`competitions[${compIndex}].name`)}
            helperText={getError(`competitions[${compIndex}].name`)}
            sx={{ my: 1 }}
          />

          <TextField
            fullWidth required
            label="Lieu de la compétition"
            value={comp.place}
            onChange={(e) => handleCompetitionChange(compIndex, 'place', e.target.value)}
            error={hasError(`competitions[${compIndex}].place`)}
            helperText={getError(`competitions[${compIndex}].place`)}
            sx={{ my: 1 }}
          />

          <TextField
            fullWidth required
            label="Pays"
            value={comp.country}
            onChange={(e) => handleCompetitionChange(compIndex, 'country', e.target.value)}
            error={hasError(`competitions[${compIndex}].country`)}
            helperText={getError(`competitions[${compIndex}].country`)}
            sx={{ my: 2 }}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth required
                label="Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={comp.date}
                onChange={(e) => handleCompetitionChange(compIndex, 'date', e.target.value)}
                error={hasError(`competitions[${compIndex}].date`)}
                helperText={getError(`competitions[${compIndex}].date`)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required error={hasError(`competitions[${compIndex}].type`)}>
                <InputLabel id={`type-label-${compIndex}`}>Type</InputLabel>
                <Select
                  labelId={`type-label-${compIndex}`}
                  id={`type-${compIndex}`}
                  value={comp.type ?? 'outdoor'}
                  label="Type"
                  onChange={(e) => handleCompetitionChange(compIndex, 'type', e.target.value)}
                >
                  <MenuItem value="outdoor">Outdoor</MenuItem>
                  <MenuItem value="indoor">Indoor</MenuItem>
                </Select>
                <FormHelperText>{getError(`competitions[${compIndex}].type`)}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="Site internet"
                value={comp.site}
                onChange={(e) => handleCompetitionChange(compIndex, 'site', e.target.value)}
                error={hasError(`competitions[${compIndex}].site`)}
                helperText={getError(`competitions[${compIndex}].site`)}
              />
            </Grid>
          </Grid>

          {comp.athletes.map((ath, athIndex) => (
            <Box
              key={athIndex}
              sx={{ mt: 2, p: 2, mb: 2, border: '1px solid #eee', borderRadius: 2, backgroundColor: '#f9f9f9' }}
            >
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth required
                    label="Prénom"
                    value={ath.firstName}
                    onChange={(e) => handleAthleteChange(compIndex, athIndex, 'firstName', e.target.value)}
                    error={hasError(`competitions[${compIndex}].athletes[${athIndex}].firstName`)}
                    helperText={getError(`competitions[${compIndex}].athletes[${athIndex}].firstName`)}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth required
                    label="Nom"
                    value={ath.lastName}
                    onChange={(e) => handleAthleteChange(compIndex, athIndex, 'lastName', e.target.value)}
                    error={hasError(`competitions[${compIndex}].athletes[${athIndex}].lastName`)}
                    helperText={getError(`competitions[${compIndex}].athletes[${athIndex}].lastName`)}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                <Grid item>
                  <Button
                    variant={ath.sex === 'F' ? 'contained' : 'outlined'}
                    color={hasError(`competitions[${compIndex}].athletes[${athIndex}].sex`) ? 'error' : 'primary'}
                    onClick={() => handleAthleteChange(compIndex, athIndex, 'sex', 'F')}
                  >
                    F
                  </Button>
                </Grid>

                <Grid item>
                  <Button
                    variant={ath.sex === 'M' ? 'contained' : 'outlined'}
                    color={hasError(`competitions[${compIndex}].athletes[${athIndex}].sex`) ? 'error' : 'primary'}
                    onClick={() => handleAthleteChange(compIndex, athIndex, 'sex', 'M')}
                  >
                    M
                  </Button>
                </Grid>

                <Grid item xs={12} md={8}>
                  <FormControl
                    fullWidth
                    required
                    error={hasError(`competitions[${compIndex}].athletes[${athIndex}].category`)}
                    sx={{ minWidth: 250 }}
                  >
                    <InputLabel id={`cat-label-${compIndex}-${athIndex}`}>Catégorie</InputLabel>
                    <Select
                      labelId={`cat-label-${compIndex}-${athIndex}`}
                      label="Catégorie"
                      value={ath.category}
                      onChange={(e) => handleAthleteChange(compIndex, athIndex, 'category', e.target.value)}
                    >
                      {categories.map((c) => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {getError(`competitions[${compIndex}].athletes[${athIndex}].category`)}
                    </FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>

              {hasError(`competitions[${compIndex}].athletes[${athIndex}].sex`) && (
                <FormHelperText error>Sexe obligatoire</FormHelperText>
              )}

              {ath.performances.map((perf, perfIndex) => (
                <Box
                  key={perfIndex}
                  sx={{ p: 2, mb: 1, border: '1px solid #ddd', borderRadius: 1, backgroundColor: '#f5f5f5' }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12}>
                      <Autocomplete
                        freeSolo
                        options={epreuves.map((e) => e.discipline)}
                        value={perf.event ?? ''}
                        onChange={(event, v) =>
                          handlePerformanceChange(compIndex, athIndex, perfIndex, 'event', v)
                        }
                        onInputChange={(event, v) =>
                          handlePerformanceChange(compIndex, athIndex, perfIndex, 'event', v)
                        }
                        ListboxProps={{ sx: { maxHeight: 400 } }}
                        fullWidth
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Épreuve"
                            required
                            error={hasError(`competitions[${compIndex}].athletes[${athIndex}].performances[${perfIndex}].event`)}
                            helperText={getError(`competitions[${compIndex}].athletes[${athIndex}].performances[${perfIndex}].event`)}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth required
                        label="Performance"
                        value={perf.result}
                        onChange={(e) =>
                          handlePerformanceChange(compIndex, athIndex, perfIndex, 'result', e.target.value)
                        }
                        error={hasError(`competitions[${compIndex}].athletes[${athIndex}].performances[${perfIndex}].result`)}
                        helperText={getError(`competitions[${compIndex}].athletes[${athIndex}].performances[${perfIndex}].result`)}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      {(() => {
                        const typeComp = comp.type ?? 'outdoor';
                        const options = epreuves.map((e) => e.discipline);
                        const epreuve = epreuves.find((e) => e.discipline === perf.event);
                        const isCustomEvent = perf.event && !options.includes(perf.event);

                        const showWindField = typeComp === 'outdoor' && (epreuve?.ventObligatoire || isCustomEvent);
                        const windRequired = typeComp === 'outdoor' && Boolean(epreuve?.ventObligatoire);
                        const path = `competitions[${compIndex}].athletes[${athIndex}].performances[${perfIndex}].wind`;

                        return showWindField ? (
                          <TextField
                            fullWidth
                            required={windRequired}
                            label="Vent"
                            value={perf.wind}
                            onChange={(e) =>
                              handlePerformanceChange(compIndex, athIndex, perfIndex, 'wind', e.target.value)
                            }
                            error={hasError(path)}
                            helperText={
                              getError(path) ||
                              'S’il n’y avait pas de mesure du vent, indiquez « NA » (épreuves combinées : moyenne des vents).'
                            }
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Tooltip
                                    arrow
                                    title={
                                      'S’il n’y avait pas de mesure du vent, indiquez « NA ». ' +
                                      'Pour les épreuves combinées, la moyenne des vents est utilisée.'
                                    }
                                  >
                                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                  </Tooltip>
                                </InputAdornment>
                              )
                            }}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            label="Vent"
                            value="/"
                            disabled
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Tooltip arrow title="Le vent n’est pas requis ici (Indoor ou épreuve sans vent).">
                                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                  </Tooltip>
                                </InputAdornment>
                              )
                            }}
                          />
                        );
                      })()}
                    </Grid>

                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Classement"
                        value={perf.rank}
                        onChange={(e) =>
                          handlePerformanceChange(compIndex, athIndex, perfIndex, 'rank', e.target.value)
                        }
                      />
                    </Grid>

                    <Grid item xs={12} md={2}>
                      <IconButton onClick={() => removePerformance(compIndex, athIndex, perfIndex)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Box sx={{ mt: 1 }}>
                <Button variant="outlined" onClick={() => addPerformance(compIndex, athIndex)}>
                  Ajouter Épreuve
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  sx={{ ml: 1 }}
                  onClick={() => removeAthlete(compIndex, athIndex)}
                >
                  Supprimer Athlète
                </Button>
              </Box>
            </Box>
          ))}

          <Box sx={{ mt: 1 }}>
            <Button variant="contained" onClick={() => addAthlete(compIndex)}>
              Ajouter Athlète
            </Button>
            <Button
              variant="outlined"
              color="error"
              sx={{ ml: 1 }}
              onClick={() => removeCompetition(compIndex)}
            >
              Supprimer Compétition
            </Button>
          </Box>
        </Box>
      ))}

      <Button variant="contained" onClick={addCompetition}>Ajouter Compétition</Button>

      <Box sx={{ position: 'relative', display: 'inline-flex', mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="success"
          disabled={loading}
        >
          Envoyer
        </Button>

        {loading && (
          <CircularProgress
            size={24}
            sx={{
              color: 'success.main',
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginTop: '-12px',
              marginLeft: '-12px',
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default PerformanceForm;