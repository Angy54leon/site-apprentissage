// Configuration générale de la plateforme (nom, textes d'interface, design).
// Les couleurs elles-mêmes sont définies une seule fois, en variables CSS, dans src/index.css.

export const APP = {
  name: 'Nomenclature organique',
  tagline: 'Apprendre la nomenclature IUPAC, des bases au niveau examen',
};

/** Palette de référence (documentation ; la source de vérité est src/index.css). */
export const DESIGN_TOKENS = {
  navy: '#172B4D',
  blue: '#2563EB',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#64748B',
  success: '#15803D',
  error: '#B91C1C',
  review: '#C2410C',
};

/** Conseils méthodologiques affichés sur le tableau de bord (tirés selon le jour). */
export const STUDY_TIPS = [
  'Commence toujours par identifier la fonction principale : elle impose le suffixe, la chaîne principale et la numérotation.',
  'Dans une formule topologique, chaque sommet et chaque extrémité sans symbole est un atome de carbone.',
  'Pour comparer deux numérotations, applique la règle du premier point de différence : on ne fait jamais la somme des indices.',
  'Les multiplicateurs di-, tri-, tétra- ne comptent pas dans l’ordre alphabétique des préfixes.',
  'Vérifie chaque nom en redessinant la molécule à partir de ce nom.',
  'Les révisions courtes et régulières sont plus efficaces qu’une longue séance occasionnelle.',
  'Une erreur du carnet est considérée comme comprise après deux réussites : refais-la quelques jours plus tard.',
];
