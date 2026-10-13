// Notions (compétences) suivies par la répétition espacée et les statistiques.

export type ModuleId = 'm0' | 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6';

export interface Skill {
  id: string;
  label: string;
  module: ModuleId;
  advanced?: boolean;
}

export const SKILLS: Skill[] = [
  { id: 'b-intro', label: 'Molécules et formules brutes', module: 'm0' },
  { id: 'b-atomes', label: 'Symboles des atomes', module: 'm0' },
  { id: 'b-valence', label: 'Liaisons et valence', module: 'm0' },
  { id: 'b-formules', label: 'Formules développées et semi-développées', module: 'm0' },
  { id: 'b-topo', label: 'Lecture des formules topologiques', module: 'm0' },
  { id: 'b-chaines', label: 'Chaînes, ramifications, liaisons multiples', module: 'm0' },

  { id: 'alc-racines', label: 'Racines méth- à déc-', module: 'm1' },
  { id: 'alc-alkyles', label: 'Groupes alkyles', module: 'm1' },
  { id: 'alc-chaine', label: 'Chaîne principale', module: 'm1' },
  { id: 'alc-numerotation', label: 'Numérotation', module: 'm1' },
  { id: 'alc-multiplicateurs', label: 'Multiplicateurs, tirets et virgules', module: 'm1' },
  { id: 'alc-alpha', label: 'Ordre alphabétique', module: 'm1' },
  { id: 'alc-ramifies', label: 'Alcanes ramifiés', module: 'm1' },

  { id: 'ene', label: 'Alcènes', module: 'm2' },
  { id: 'yne', label: 'Alcynes', module: 'm2' },
  { id: 'insat-multiples', label: 'Plusieurs insaturations', module: 'm2' },
  { id: 'insat-ramifies', label: 'Insaturations et ramifications', module: 'm2' },
  { id: 'ez', label: 'Stéréoisomérie Z/E', module: 'm2' },

  { id: 'cyc-alcanes', label: 'Cycloalcanes', module: 'm3' },
  { id: 'cyc-substitues', label: 'Cycles substitués', module: 'm3' },
  { id: 'cyc-alcenes', label: 'Cycloalcènes', module: 'm3' },
  { id: 'benzene', label: 'Benzène et dérivés', module: 'm3' },

  { id: 'f-identifier', label: 'Reconnaître les fonctions', module: 'm4' },
  { id: 'f-halogeno', label: 'Dérivés halogénés', module: 'm4' },
  { id: 'f-alcools', label: 'Alcools', module: 'm4' },
  { id: 'f-ethers', label: 'Éthers-oxydes', module: 'm4' },
  { id: 'f-aldehydes', label: 'Aldéhydes', module: 'm4' },
  { id: 'f-cetones', label: 'Cétones', module: 'm4' },
  { id: 'f-acides', label: 'Acides carboxyliques', module: 'm4' },
  { id: 'f-esters', label: 'Esters', module: 'm4' },
  { id: 'f-amines', label: 'Amines', module: 'm4' },
  { id: 'f-amides', label: 'Amides', module: 'm4' },
  { id: 'f-nitriles', label: 'Nitriles', module: 'm4' },
  { id: 'f-priorite', label: 'Composés polyfonctionnels (priorité)', module: 'm4' },

  { id: 'cx-synthese', label: 'Molécules complexes', module: 'm5' },
  { id: 'cx-usuels', label: 'Noms usuels', module: 'm5' },
  { id: 'rs', label: 'Configuration R/S', module: 'm5', advanced: true },
];

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const MODULES: { id: ModuleId; title: string; short: string; description: string }[] = [
  {
    id: 'm0',
    title: 'Module 0 — Les bases indispensables',
    short: 'Les bases',
    description: 'Atomes, liaisons, valence et lecture des différentes formules, surtout la formule topologique.',
  },
  {
    id: 'm1',
    title: 'Module 1 — Les alcanes',
    short: 'Alcanes',
    description: 'Le cœur de la nomenclature : racines, chaîne principale, numérotation, substituants.',
  },
  {
    id: 'm2',
    title: 'Module 2 — Alcènes et alcynes',
    short: 'Alcènes, alcynes',
    description: 'Doubles et triples liaisons : terminaisons -ène et -yne, indices de position, Z/E.',
  },
  {
    id: 'm3',
    title: 'Module 3 — Les composés cycliques',
    short: 'Cycles',
    description: 'Cycloalcanes, cycles substitués, cycloalcènes et premiers pas avec le benzène.',
  },
  {
    id: 'm4',
    title: 'Module 4 — Les fonctions chimiques',
    short: 'Fonctions',
    description: 'Alcools, aldéhydes, cétones, acides, esters, amines, amides, nitriles… et leur priorité.',
  },
  {
    id: 'm5',
    title: 'Module 5 — Molécules plus complexes',
    short: 'Complexes',
    description: 'Tout combiner, noms usuels et introduction à la stéréochimie R/S.',
  },
  {
    id: 'm6',
    title: 'Module 6 — Préparation aux examens',
    short: 'Examens',
    description: 'Pièges classiques, entraînement chronométré et examens blancs corrigés.',
  },
];
