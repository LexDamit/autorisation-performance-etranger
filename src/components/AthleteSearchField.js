import React from 'react';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';
import athletes from '../data/athletes.json';

/**
 * Searchable athlete picker backed by the licensed athletes list.
 * Returns the full athlete object via onChange(athlete).
 *
 * Props:
 *   value        – current athlete object (or null)
 *   onChange     – (athlete | null) => void
 *   clubFilter   – if provided, only show athletes from that club
 *   label        – field label (default "Athlète")
 *   required     – bool
 *   error        – bool
 *   helperText   – string
 */
export default function AthleteSearchField({
  value,
  onChange,
  clubFilter,
  label = 'Athlète',
  required = false,
  error = false,
  helperText = '',
}) {
  const options = clubFilter
    ? athletes.filter(a => a.club === clubFilter)
    : athletes;

  return (
    <Autocomplete
      options={options}
      value={value || null}
      onChange={(_, newVal) => onChange(newVal)}
      getOptionLabel={(a) =>
        a ? `${a.firstName} ${a.lastName} (${a.licenceNumber})` : ''
      }
      isOptionEqualToValue={(a, b) => a.licenceNumber === b.licenceNumber}
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.toLowerCase();
        return opts
          .filter(
            (a) =>
              a.firstName.toLowerCase().includes(q) ||
              a.lastName.toLowerCase().includes(q) ||
              a.licenceNumber.includes(q)
          )
          .slice(0, 50);
      }}
      renderOption={(props, a) => (
        <Box component="li" {...props} key={a.licenceNumber}>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {a.firstName} {a.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {a.category} · {a.club} · N° {a.licenceNumber}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          fullWidth
        />
      )}
    />
  );
}
