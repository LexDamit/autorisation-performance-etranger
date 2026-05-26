import React from 'react';
import { Chip } from '@mui/material';

const STATUS_CONFIG = {
  // Autorisation statuses
  pending:     { label: 'En attente',   color: 'warning' },
  accepted:    { label: 'Acceptée',     color: 'success' },
  rejected:    { label: 'Refusée',      color: 'error'   },
  cancelled:   { label: 'Annulée',      color: 'default' },
  // Performance statuses
  to_complete: { label: 'À compléter',  color: 'info'    },
  submitted:   { label: 'Soumise',      color: 'warning' },
  found:       { label: 'Validée ✓',    color: 'success' },
  not_found:   { label: 'Introuvable',  color: 'error'   },
  // SELTEC statuses
  orange:      { label: 'En vérification', color: 'warning' },
  green:       { label: 'Trouvée SELTEC',  color: 'success' },
  red:         { label: 'Non trouvée',     color: 'error'   },
};

export default function StatusChip({ status, size = 'small' }) {
  const cfg = STATUS_CONFIG[status] || { label: status || '—', color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size={size} />;
}
