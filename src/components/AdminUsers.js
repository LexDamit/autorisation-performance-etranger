import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Select, MenuItem, CircularProgress, Alert,
  TextField, InputAdornment, FormControl, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon   from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ROLES = [
  { value: 'athlete',          label: 'Athlète',           bg: '#EEF2FF', color: '#3730A3' },
  { value: 'club',             label: 'Club',              bg: '#F0FDF4', color: '#166534' },
  { value: 'federation_staff', label: 'Staff Fédération',  bg: '#FFF7ED', color: '#9A3412' },
  { value: 'admin',            label: 'Administrateur',    bg: '#FDF2F8', color: '#86198F' },
];

const CLUBS = [
  '-', 'CA Belvaux', 'CA Dudelange', 'CAE Grevenmacher', 'CA FOLA',
  'CAPA Ettelbruck', 'CA Schifflange', 'CELTIC Diekirch', 'CS Luxembourg',
  'CS du Nord', 'LIAL Luxembourg', 'RBUAP', 'TRILUX', 'TRISPEED Mamer', 'X3M', 'FLA-IND',
];

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role) || ROLES[0];
  return (
    <Box sx={{ px: 1.25, py: 0.35, borderRadius: 1, bgcolor: r.bg, display: 'inline-flex', whiteSpace: 'nowrap' }}>
      <Typography variant="caption" sx={{ color: r.color, fontWeight: 700, fontSize: '0.72rem' }}>
        {r.label}
      </Typography>
    </Box>
  );
}

export default function AdminUsers() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState({});
  const [message, setMessage] = useState('');
  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  const updateField = async (uid, field, value) => {
    setSaving(s => ({ ...s, [uid]: true }));
    try {
      await updateDoc(doc(db, 'users', uid), { [field]: value });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, [field]: value } : u));
      setMessage('Modifications enregistrées.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
    setSaving(s => ({ ...s, [uid]: false }));
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.email     || '').toLowerCase().includes(q) ||
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName  || '').toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Gestion des utilisateurs</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {users.length} utilisateur{users.length !== 1 ? 's' : ''} enregistré{users.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {message && (
        <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <TextField
        fullWidth
        placeholder="Rechercher par nom ou email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 3 }}>
          <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="text.secondary">
            {search ? 'Aucun résultat pour cette recherche.' : 'Aucun utilisateur enregistré.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(u => {
                const isSelf = u.id === myUid;
                const isSaving = Boolean(saving[u.id]);
                return (
                  <TableRow key={u.id} sx={{ opacity: isSaving ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {u.firstName || ''} {u.lastName || ''}
                          {!(u.firstName || u.lastName) && (
                            <Typography component="span" variant="body2" color="text.secondary">—</Typography>
                          )}
                        </Typography>
                        {isSelf && (
                          <Box sx={{ px: 0.75, py: 0.15, borderRadius: 1, bgcolor: '#FFF3E0', flexShrink: 0 }}>
                            <Typography variant="caption" sx={{ color: '#E65100', fontWeight: 700, fontSize: '0.65rem' }}>
                              Vous
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.email}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {isSelf ? (
                        <Tooltip title="Vous ne pouvez pas modifier votre propre rôle. Demandez à un autre administrateur.">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'help' }}>
                            <LockIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <RoleBadge role={u.role} />
                          </Box>
                        </Tooltip>
                      ) : (
                        <FormControl size="small" fullWidth disabled={isSaving}>
                          <Select
                            value={u.role || 'athlete'}
                            onChange={e => updateField(u.id, 'role', e.target.value)}
                          >
                            {ROLES.map(r => (
                              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>

                    <TableCell>
                      <FormControl size="small" fullWidth disabled={isSaving}>
                        <Select
                          value={u.club || '-'}
                          onChange={e => updateField(u.id, 'club', e.target.value)}
                        >
                          <MenuItem value="-">— Aucun —</MenuItem>
                          {CLUBS.filter(c => c !== '-').map(c => (
                            <MenuItem key={c} value={c}>{c}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RoleBadge role={u.role} />
                        {isSaving && <CircularProgress size={14} sx={{ flexShrink: 0 }} />}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
