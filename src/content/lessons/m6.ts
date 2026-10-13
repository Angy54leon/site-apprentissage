import type { Lesson } from './types';

export const M6: Lesson[] = [
  {
    id: 'm6-pieges',
    module: 'm6',
    title: 'Les pièges classiques de l’examen',
    duration: 15,
    skills: ['cx-synthese', 'alc-chaine', 'alc-numerotation', 'f-priorite'],
    objective: 'Repérer et éviter les erreurs qui coûtent le plus de points.',
    explanation: [
      { t: 'list', ordered: true, items: [
        '**Chaîne trop courte** : la chaîne la plus longue « tourne » souvent dans une ramification dessinée.',
        '**Somme des indices** : on compare au premier point de différence, on n’additionne jamais.',
        '**Oublier le carbone fonctionnel** : le C de –COOH, –CHO, –C≡N fait partie de la chaîne.',
        '**Mauvaise fonction prioritaire** : acide > ester > amide > nitrile > aldéhyde > cétone > alcool > amine.',
        '**di, tri dans l’ordre alphabétique** : ils ne comptent pas.',
        '**Élision** : propan-2-ol mais propane-1,2-diol.',
        '**Ester à l’envers** : la partie « oate » contient le C=O.',
        '**Nom usuel** au lieu du nom systématique.',
      ] },
      { t: 'tip', text: 'Garde 2 minutes à la fin pour redessiner chaque molécule à partir de ton nom : c’est la meilleure vérification.' },
    ],
    rule: [{ t: 'info', text: 'Méthode systématique + vérification par redessin.' }],
    worked: { smiles: 'CC(C)C(CC)C(C)C', intro: 'Un piège : plusieurs chaînes de même longueur.' },
    mistake: { wrong: '2-méthyl-3-(1-méthyléthyl)pentane', right: '3-éthyl-2,4-diméthylpentane', why: 'Deux chaînes de 5 C : on garde celle qui porte le plus de substituants (3 au lieu de 2).', smiles: 'CC(C)C(CC)C(C)C' },
    examples: [{ smiles: 'CC(CC)CCC' }, { smiles: 'CC(C)CC(C)(C)C' }, { smiles: 'CCC(=O)OC' }],
    guided: [{ kind: 'findError', smiles: 'CC(C)CC(C)(C)C' }, { kind: 'findError', smiles: 'CCC(CC)C(C)CC' }],
    autonomous: [{ kind: 'name', smiles: 'CC(CC)CCC' }, { kind: 'judge', smiles: 'CC(=O)CCO' }, { kind: 'name', smiles: 'CCC(=O)OC' }],
    quiz: [{ kind: 'name', smiles: 'CC(C)C(CC)C(C)C' }, { kind: 'name', smiles: 'CC(=O)CC(C)(C)O' }, { kind: 'name', smiles: 'CC(C)C(=O)OC' }, { kind: 'name', smiles: 'OC(=O)CCC(=O)O' }, { kind: 'name', smiles: 'CC(C)C(C)O' }],
    summary: ['Connais les pièges : chaîne, indices, carbone fonctionnel, priorité, ordre alphabétique, élision, esters.', 'Vérifie en redessinant.'],
  },
];
