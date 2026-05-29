/**
 * Returns the FLA age-group category for a given birth year.
 * Categories change on 1 January each year (age = currentYear - birthYear).
 *
 * FLA table (relative to current season):
 *   age ≤ 7   →  U8 Ludiques
 *   age 8-9   →  U10 Benjamin(e)s
 *   age 10-11 →  U12 Débutant(e)
 *   age 12-13 →  U14 Scolaires
 *   age 14-15 →  U16 Minimes
 *   age 16-17 →  U18 Cadet(te)s
 *   age 18-19 →  U20 Juniors
 *   age 20-22 →  U23 Espoirs
 *   age ≥ 23  →  Seniors
 */
export function categoryFromBirthYear(birthYear) {
  if (!birthYear) return '-';
  const age = new Date().getFullYear() - Number(birthYear);
  if (age <= 7)  return 'U8 Ludiques';
  if (age <= 9)  return 'U10 Benjamin(e)s';
  if (age <= 11) return 'U12 Débutant(e)';
  if (age <= 13) return 'U14 Scolaires';
  if (age <= 15) return 'U16 Minimes';
  if (age <= 17) return 'U18 Cadet(te)s';
  if (age <= 19) return 'U20 Juniors';
  if (age <= 22) return 'U23 Espoirs';
  return 'Seniors';
}

/** All FLA categories in order (youngest to oldest), for dropdowns. */
export const FLA_CATEGORIES = [
  '-',
  'U8 Ludiques',
  'U10 Benjamin(e)s',
  'U12 Débutant(e)',
  'U14 Scolaires',
  'U16 Minimes',
  'U18 Cadet(te)s',
  'U20 Juniors',
  'U23 Espoirs',
  'Seniors',
  'Masters',
];
