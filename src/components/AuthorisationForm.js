import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Typography,
  Grid,
  IconButton,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const clubs = [
  '-', 'CA Belvaux', 'CA Dudelange', 'CAE Grevenmacher', 'CA FOLA',
  'CAPA Ettelbruck', 'CA Schifflange', 'CELTIC Diekirch', 'CS Luxembourg',
  'CS du Nord', 'LIAL Luxembourg', 'RBUAP', 'TRILUX', 'TRISPEED Mamer', 'X3M', 'FLA-IND'
];

const AuthorisationForm = () => {
  const [club, setClub] = useState('-');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [emailsCc, setEmailsCc] = useState([]);
  const [remarks, setRemarks] = useState('');

  const [competitions, setCompetitions] = useState([
    {
      name: '',
      place: '',
      country: '',
      dates: [''],
      site: '',
      organiser: '',
      athletes: [{ firstName: '', lastName: '', events: [''] }]
    }
  ]);

  const [loading, setLoading] = useState(false);

  const isValidEmail = (val) => /\S+@\S+\.\S+/.test(val);

  const addCcEmail = () => {
    const candidate = (ccInput || '').trim();
    if (!candidate) return;

    if (!isValidEmail(candidate)) {
      alert('Adresse email invalide !');
      return;
    }

    if (emailsCc.includes(candidate)) {
      setCcInput('');
      return;
    }

    setEmailsCc((prev) => [...prev, candidate]);
    setCcInput('');
  };

  const handleCcKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCcEmail();
    }
  };

  const removeCcEmail = (index) => {
    setEmailsCc((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompetitionChange = (index, field, value) => {
    const updated = [...competitions];
    updated[index][field] = value;
    setCompetitions(updated);
  };

  const handleDateChange = (compIndex, dateIndex, value) => {
    const updated = [...competitions];
    updated[compIndex].dates[dateIndex] = value;
    setCompetitions(updated);
  };

  const addDate = (compIndex) => {
    const updated = [...competitions];
    updated[compIndex].dates.push('');
    setCompetitions(updated);
  };

  const handleAthleteChange = (compIndex, athleteIndex, field, value) => {
    const updated = [...competitions];
    updated[compIndex].athletes[athleteIndex][field] = value;
    setCompetitions(updated);
  };

  const handleAthleteEventChange = (compIndex, athleteIndex, eventIndex, value) => {
    const updated = [...competitions];
    updated[compIndex].athletes[athleteIndex].events[eventIndex] = value;
    setCompetitions(updated);
  };

  const addAthleteEvent = (compIndex, athleteIndex) => {
    const updated = [...competitions];
    updated[compIndex].athletes[athleteIndex].events.push('');
    setCompetitions(updated);
  };

  const removeAthleteEvent = (compIndex, athleteIndex, eventIndex) => {
    const updated = [...competitions];
    const evts = updated[compIndex].athletes[athleteIndex].events;
    updated[compIndex].athletes[athleteIndex].events = evts.filter((_, i) => i !== eventIndex);

    if (updated[compIndex].athletes[athleteIndex].events.length === 0) {
      updated[compIndex].athletes[athleteIndex].events = [''];
    }
    setCompetitions(updated);
  };

  const addCompetition = () => {
    setCompetitions([
      ...competitions,
      {
        name: '',
        place: '',
        country: '',
        dates: [''],
        site: '',
        organiser: '',
        athletes: [{ firstName: '', lastName: '', events: [''] }]
      }
    ]);
  };

  const removeCompetition = (index) => {
    setCompetitions(competitions.filter((_, i) => i !== index));
  };

  const addAthlete = (compIndex) => {
    const updated = [...competitions];
    updated[compIndex].athletes.push({ firstName: '', lastName: '', events: [''] });
    setCompetitions(updated);
  };

  const removeAthlete = (compIndex, athleteIndex) => {
    const updated = [...competitions];
    updated[compIndex].athletes = updated[compIndex].athletes.filter((_, i) => i !== athleteIndex);
    setCompetitions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate: every athlete must have at least one non-empty event
    for (const [ci, comp] of competitions.entries()) {
      for (const ath of comp.athletes || []) {
        const hasEvent = (ath.events || []).some(ev => ev.trim() !== '');
        if (!hasEvent) {
          alert(
            `Veuillez renseigner au moins une épreuve pour ${ath.firstName || 'l\'athlète'} ${ath.lastName || ''} ` +
            `dans la compétition « ${comp.name || `n°${ci + 1}`} ».`
          );
          return;
        }
      }
    }

    setLoading(true);

    const payload = {
      email,
      club,
      firstName,
      lastName,
      emailsCc,
      competitions,
      remarks
    };

    try {
      await addDoc(collection(db, 'authorisationRequests'), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        type: 'authorisation',
      });

      const response = await fetch('https://sendauthorisationemail-t2aq3fohza-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Demande envoyée avec succès !');

        setClub('-');
        setEmail('');
        setFirstName('');
        setLastName('');
        setCcInput('');
        setEmailsCc([]);
        setRemarks('');
        setCompetitions([
          {
            name: '',
            place: '',
            country: '',
            dates: [''],
            site: '',
            organiser: '',
            athletes: [{ firstName: '', lastName: '', events: [''] }]
          }
        ]);
      } else {
        const errorText = await response.text();
        alert(`Erreur: ${errorText}`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      alert('Échec de l’envoi de la demande.');
    }

    setLoading(false);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      <Typography variant="h5" fontWeight="bold">
        Demande d'autorisation pour compétition à l'étranger
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required sx={{ minWidth: 280 }}>
            <InputLabel>Club</InputLabel>
            <Select value={club} label="Club" onChange={(e) => setClub(e.target.value)}>
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
            type="email"
            label="Email du demandeur"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={9}>
          <TextField
            fullWidth
            label="Ajouter un email en copie"
            value={ccInput}
            onChange={(e) => setCcInput(e.target.value)}
            onKeyDown={handleCcKeyDown}
          />
        </Grid>
        <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={addCcEmail}
            sx={{ height: '56px' }}
          >
            + Ajouter Email
          </Button>
        </Grid>

        <Grid item xs={12}>
          {emailsCc.map((mail, idx) => (
            <Chip
              key={idx}
              label={mail}
              onDelete={() => removeCcEmail(idx)}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Prénom du demandeur"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Nom du demandeur"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Grid>
      </Grid>

      {competitions.map((comp, compIndex) => (
        <Box key={compIndex} sx={{ p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Compétition {compIndex + 1}
          </Typography>

          <TextField
            fullWidth
            required
            label="Nom de la compétition"
            value={comp.name}
            onChange={(e) => handleCompetitionChange(compIndex, 'name', e.target.value)}
            sx={{ my: 1 }}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Lieu"
                value={comp.place}
                onChange={(e) => handleCompetitionChange(compIndex, 'place', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Pays"
                value={comp.country}
                onChange={(e) => handleCompetitionChange(compIndex, 'country', e.target.value)}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 2, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ minWidth: 150, pt: 2 }}>
              Dates de la compétition
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {comp.dates.map((date, dateIndex) => (
                <TextField
                  key={dateIndex}
                  type="date"
                  label={`Jour ${dateIndex + 1}`}
                  InputLabelProps={{ shrink: true }}
                  value={date}
                  onChange={(e) => handleDateChange(compIndex, dateIndex, e.target.value)}
                  sx={{ minWidth: 160 }}
                />
              ))}

              <Button variant="outlined" onClick={() => addDate(compIndex)} sx={{ height: '56px' }}>
                + Ajouter un jour
              </Button>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Club organisateur"
            value={comp.organiser}
            onChange={(e) => handleCompetitionChange(compIndex, 'organiser', e.target.value)}
            sx={{ my: 1 }}
          />

          <TextField
            fullWidth
            required
            label="Site internet"
            value={comp.site}
            onChange={(e) => handleCompetitionChange(compIndex, 'site', e.target.value)}
            sx={{ my: 1 }}
          />

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Athlètes
          </Typography>

          {comp.athletes.map((ath, athIndex) => (
            <Grid
              container
              spacing={2}
              key={athIndex}
              alignItems="flex-start"
              sx={{ mb: 2 }}
            >
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  required
                  label="Prénom"
                  value={ath.firstName}
                  onChange={(e) => handleAthleteChange(compIndex, athIndex, 'firstName', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  required
                  label="Nom"
                  value={ath.lastName}
                  onChange={(e) => handleAthleteChange(compIndex, athIndex, 'lastName', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={5}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                  Épreuves
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(ath.events ?? ['']).map((evt, evtIndex) => (
                    <Box key={evtIndex} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        placeholder="ex: 100m"
                        value={evt}
                        onChange={(e) =>
                          handleAthleteEventChange(compIndex, athIndex, evtIndex, e.target.value)
                        }
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeAthleteEvent(compIndex, athIndex, evtIndex)}
                        disabled={(ath.events?.length ?? 1) === 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => addAthleteEvent(compIndex, athIndex)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    + Ajouter une épreuve
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
                <IconButton onClick={() => removeAthlete(compIndex, athIndex)}>
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button variant="outlined" onClick={() => addAthlete(compIndex)} sx={{ mt: 1 }}>
            Ajouter Athlète
          </Button>

          <Button
            variant="outlined"
            color="error"
            onClick={() => removeCompetition(compIndex)}
            sx={{ mt: 1, ml: 2 }}
          >
            Supprimer Compétition
          </Button>
        </Box>
      ))}

      <Button variant="contained" onClick={addCompetition}>
        Ajouter Compétition
      </Button>

      <TextField
        fullWidth
        label="Remarques générales (facultatif)"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        multiline
        minRows={4}
        sx={{ mt: 3 }}
      />

      <Box sx={{ position: 'relative', display: 'inline-flex', mt: 2 }}>
        <Button type="submit" variant="contained" color="success" disabled={loading}>
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

export default AuthorisationForm;