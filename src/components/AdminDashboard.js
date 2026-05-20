import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';

function formatDate(value) {
  if (!value) return '-';

  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleString('fr-LU');
  }

  try {
    return new Date(value).toLocaleString('fr-LU');
  } catch {
    return '-';
  }
}

function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ mt: 3 }}>
      {value === index && children}
    </Box>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  const [authorisations, setAuthorisations] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [users, setUsers] = useState([]);

  const [error, setError] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    setError('');

    try {
      const authQuery = query(
        collection(db, 'authorisationRequests'),
        orderBy('createdAt', 'desc')
      );

      const perfQuery = query(
        collection(db, 'performanceDeclarations'),
        orderBy('createdAt', 'desc')
      );

      const usersQuery = query(
        collection(db, 'users'),
        orderBy('email', 'asc')
      );

      const [authSnap, perfSnap, usersSnap] = await Promise.all([
        getDocs(authQuery),
        getDocs(perfQuery),
        getDocs(usersQuery),
      ]);

      const authData = authSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const perfData = perfSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const usersData = usersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setAuthorisations(authData);
      setPerformances(perfData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les données de l'admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const grantAdmin = async (userId) => {
    setUsersLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'admin',
      });
      await fetchAllData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'attribution des droits admin.");
    } finally {
      setUsersLoading(false);
    }
  };

  const removeAdmin = async (userId) => {
    setUsersLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'user',
      });
      await fetchAllData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors du retrait des droits admin.");
    } finally {
      setUsersLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      authorisations: authorisations.length,
      performances: performances.length,
      users: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
    };
  }, [authorisations, performances, users]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Admin Dashboard
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Gérez les utilisateurs et consultez toutes les demandes d’autorisation
        ainsi que toutes les déclarations de performances.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">Demandes d’autorisation</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.authorisations}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">Déclarations de performances</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.performances}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">Utilisateurs</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.users}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">Admins</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.admins}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Utilisateurs" />
          <Tab label="Autorisations" />
          <Tab label="Performances" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Gestion des utilisateurs</Typography>
            <Button variant="outlined" onClick={fetchAllData} disabled={usersLoading}>
              Rafraîchir
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Club</TableCell>
                  <TableCell>Athlete Name</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Date création</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email || '-'}</TableCell>
                    <TableCell>{u.club || '-'}</TableCell>
                    <TableCell>{u.athleteName || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role === 'admin' ? 'Admin' : 'User'}
                        color={u.role === 'admin' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                    <TableCell align="right">
                      {u.role === 'admin' ? (
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => removeAdmin(u.id)}
                          disabled={usersLoading}
                        >
                          Retirer Admin
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          onClick={() => grantAdmin(u.id)}
                          disabled={usersLoading}
                        >
                          Donner Admin
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Aucun utilisateur trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Demandes d’autorisation</Typography>
            <Button variant="outlined" onClick={fetchAllData}>
              Rafraîchir
            </Button>
          </Stack>

          {authorisations.length === 0 ? (
            <Typography>Aucune demande d’autorisation enregistrée.</Typography>
          ) : (
            authorisations.map((item) => (
              <Accordion key={item.id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ width: '100%' }}>
                    <Typography fontWeight="bold">
                      {item.club || '-'} — {item.firstName || ''} {item.lastName || ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.email || '-'} • {formatDate(item.createdAt)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography><strong>Club :</strong> {item.club || '-'}</Typography>
                  <Typography><strong>Demandeur :</strong> {item.firstName || '-'} {item.lastName || '-'}</Typography>
                  <Typography><strong>Email :</strong> {item.email || '-'}</Typography>
                  <Typography><strong>Emails CC :</strong> {(item.emailsCc || []).join(', ') || '-'}</Typography>

                  <Divider sx={{ my: 2 }} />

                  {(item.competitions || []).map((comp, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Compétition {idx + 1}: {comp.name || '-'}
                      </Typography>
                      <Typography><strong>Lieu :</strong> {comp.place || '-'}, {comp.country || '-'}</Typography>
                      <Typography><strong>Organisateur :</strong> {comp.organiser || '-'}</Typography>
                      <Typography><strong>Site :</strong> {comp.site || '-'}</Typography>
                      <Typography><strong>Dates :</strong> {(comp.dates || []).join(', ') || '-'}</Typography>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">Athlètes</Typography>
                        {(comp.athletes || []).map((ath, aIdx) => (
                          <Paper key={aIdx} sx={{ p: 1.5, mt: 1, backgroundColor: '#fafafa' }}>
                            <Typography>
                              <strong>{ath.firstName || '-'} {ath.lastName || '-'}</strong>
                            </Typography>
                            <Typography>
                              <strong>Épreuves :</strong> {(ath.events || []).join(', ') || '-'}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    </Paper>
                  ))}

                  <Divider sx={{ my: 2 }} />

                  <Typography>
                    <strong>Remarques :</strong> {item.remarks || '-'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Déclarations de performances</Typography>
            <Button variant="outlined" onClick={fetchAllData}>
              Rafraîchir
            </Button>
          </Stack>

          {performances.length === 0 ? (
            <Typography>Aucune déclaration de performance enregistrée.</Typography>
          ) : (
            performances.map((item) => (
              <Accordion key={item.id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ width: '100%' }}>
                    <Typography fontWeight="bold">
                      {item.club || '-'} — {item.email || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(item.createdAt)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography><strong>Club :</strong> {item.club || '-'}</Typography>
                  <Typography><strong>Email :</strong> {item.email || '-'}</Typography>
                  <Typography><strong>Emails CC :</strong> {(item.emailsCc || []).join(', ') || '-'}</Typography>

                  <Divider sx={{ my: 2 }} />

                  {(item.competitions || []).map((comp, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Compétition {idx + 1}: {comp.name || '-'}
                      </Typography>
                      <Typography><strong>Lieu :</strong> {comp.place || '-'}, {comp.country || '-'}</Typography>
                      <Typography><strong>Date :</strong> {comp.date || '-'}</Typography>
                      <Typography><strong>Type :</strong> {comp.type || '-'}</Typography>
                      <Typography><strong>Site :</strong> {comp.site || '-'}</Typography>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Athlètes et performances
                        </Typography>

                        {(comp.athletes || []).map((ath, aIdx) => (
                          <Paper key={aIdx} sx={{ p: 1.5, mt: 1, backgroundColor: '#fafafa' }}>
                            <Typography>
                              <strong>{ath.firstName || '-'} {ath.lastName || '-'}</strong> — {ath.sex || '-'} — {ath.category || '-'}
                            </Typography>

                            {(ath.performances || []).map((perf, pIdx) => (
                              <Box key={pIdx} sx={{ ml: 2, mt: 1 }}>
                                <Typography variant="body2">
                                  • {perf.event || '-'} | Résultat: {perf.result || '-'} | Vent: {perf.wind || '-'} | Rang: {perf.rank || '-'}
                                </Typography>
                              </Box>
                            ))}
                          </Paper>
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default AdminDashboard;