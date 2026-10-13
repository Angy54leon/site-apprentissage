import { parseSmiles, toSmiles } from './smiles';
import { formulaOf, molecularFormula, unsaturationDegree } from './molecule';
import { isSameMolecule } from './isomorphism';
import { nameMolecule } from './nomenclature/namer';
import { gradeName, gradeFormula, interpretName } from './nomenclature/grading';
import { cipRanking, rsFromDrawing } from './stereo';
import { layoutGrid, layoutDeveloped } from './layout';

describe('SMILES et formules', () => {
  test('formule brute', () => {
    expect(formulaOf(parseSmiles('CCO'), false)).toBe('C2H6O');
    expect(formulaOf(parseSmiles('CC(C)C'), false)).toBe('C4H10');
    expect(formulaOf(parseSmiles('C1=CC=CC=C1'), false)).toBe('C6H6');
    expect(formulaOf(parseSmiles('ClC(Cl)Cl'), false)).toBe('CHCl3');
  });
  test('insaturations', () => {
    expect(unsaturationDegree(molecularFormula(parseSmiles('C1CCCCC1')))).toBe(1);
    expect(unsaturationDegree(molecularFormula(parseSmiles('C1=CC=CC=C1')))).toBe(4);
  });
  test('valence impossible refusée', () => {
    expect(() => parseSmiles('CC(C)(C)(C)C')).toThrow();
  });
  test('aller-retour SMILES', () => {
    for (const s of ['CC(C)CC(=O)O', 'C1CCCCC1C', 'CC#CC', 'OC1=CC=CC=C1']) {
      expect(isSameMolecule(parseSmiles(toSmiles(parseSmiles(s))), parseSmiles(s))).toBe(true);
    }
  });
  test('isomères distingués', () => {
    expect(isSameMolecule(parseSmiles('CCCC'), parseSmiles('CC(C)C'))).toBe(false);
    expect(isSameMolecule(parseSmiles('CC(C)CC'), parseSmiles('CCC(C)C'))).toBe(true);
  });
});

describe('moteur de nomenclature : conventions signalées', () => {
  test('2-éthylbut-1-ène signale la règle IUPAC 2013', () => {
    const r = nameMolecule(parseSmiles('CCC(=C)CC'));
    expect(r.name).toBe('2-éthylbut-1-ène');
    expect(r.notes.join(' ')).toMatch(/2013/);
  });
  test('variantes isopropyle', () => {
    const r = nameMolecule(parseSmiles('CCCC(C(C)C)CCC'));
    expect(r.variants).toContain('4-isopropylheptane');
    expect(r.variants).toContain('4-(propan-2-yl)heptane');
  });
  test('molécule hors périmètre : erreur explicite', () => {
    expect(() => nameMolecule(parseSmiles('OC(=O)C1CCCCC1'))).toThrow(/hors périmètre/);
  });
});

describe('correction des noms', () => {
  const g = (smiles: string, answer: string) => gradeName(answer, parseSmiles(smiles));
  test('réponse exacte et accents', () => {
    expect(g('CCC(C)C', '2-méthylbutane').status).toBe('correct');
    expect(g('CCC(C)C', '2-methylbutane').status).toBe('correct');
    expect(g('CCC(C)C', '2-METHYLBUTANE').status).toBe('correct');
  });
  test('indice sous-entendu accepté seulement si non ambigu', () => {
    expect(g('CC(C)C', 'méthylpropane').status).toBe('correct');
    expect(g('CCC(C)=O', 'butanone').status).toBe('correct');
    expect(g('CCC(C)O', 'butanol').status).toBe('partial');
    expect(g('CCC(C)O', 'butanol').errorCodes).toContain('locant-missing');
  });
  test('mauvaise numérotation = bonne molécule, nom non conforme', () => {
    const r = g('CCC(C)C', '3-méthylbutane');
    expect(r.status).toBe('partial');
    expect(r.errorCodes).toContain('numbering');
  });
  test('chaîne trop courte', () => {
    expect(g('CCC(C)C', '2-éthylpropane').errorCodes).toContain('chain-length');
    expect(g('CC(C)(C)C', '2,2,2-triméthyléthane').errorCodes).toContain('chain-length');
  });
  test('ordre alphabétique et multiplicateurs', () => {
    expect(g('CCC(CC)C(C)CC', '4-méthyl-3-éthylhexane').errorCodes).toContain('alpha-order');
    expect(g('CCC(C)C(C)CC', '3-méthyl-4-méthylhexane').errorCodes).toContain('multiplier');
    expect(g('CC(Cl)C(C)C', '3-chloro-2-méthylbutane').errorCodes).toContain('numbering-alpha');
  });
  test('écriture : élision, tirets, a euphonique, ancienne notation', () => {
    expect(g('CCC(C)O', 'butane-2-ol').errorCodes).toContain('elision');
    expect(g('CCC(C)C', '2méthylbutane').errorCodes).toContain('hyphen');
    expect(g('C=CC=C', 'but-1,3-diène').errorCodes).toContain('euphony');
    expect(g('CCC(C)O', '2-butanol').errorCodes).toContain('old-notation');
  });
  test('autre molécule : incorrect, avec la molécule décrite', () => {
    const r = g('CCC(C)O', 'butan-1-ol');
    expect(r.status).toBe('incorrect');
    expect(r.userMolecule).toBeDefined();
    expect(g('CCC(C)C', '2-méthylpentane').errorCodes).toContain('carbon-count');
  });
  test('fonction prioritaire mal choisie', () => {
    expect(g('CC(=O)CCO', '3-oxobutan-1-ol').errorCodes).toContain('priority');
  });
  test('nom usuel', () => {
    const r = g('CC(C)=O', 'acétone');
    expect(r.status).toBe('partial');
    expect(r.errorCodes).toContain('usual-name');
  });
  test('structure impossible et nom illisible', () => {
    expect(g('CCC', '2,2,2-triméthylpropane').status).toBe('incorrect');
    expect(g('CCC', 'xyzzy').status).toBe('unknown');
  });
  test('règles IUPAC 2013 acceptées', () => {
    expect(g('CCC(=C)CC', '3-méthylidènepentane').status).toBe('correct');
  });
  test('ester : élision « d’ »', () => {
    expect(g('CCOC(C)=O', "éthanoate d'éthyle").status).toBe('correct');
    expect(g('CCOC(C)=O', 'propanoate de méthyle').status).toBe('incorrect');
  });
  test('interprétation ambiguë', () => {
    expect(interpretName('butène').status).toBe('ambiguous');
    expect(interpretName('propène').status).toBe('ok');
  });
});

describe('formule brute', () => {
  test('saisies variées', () => {
    const m = parseSmiles('CCCl');
    expect(gradeFormula('C2H5Cl', m).status).toBe('correct');
    expect(gradeFormula('c2h5cl', m).status).toBe('correct');
    expect(gradeFormula('C₂H₅Cl', m).status).toBe('correct');
    expect(gradeFormula('C2H6Cl', m).status).toBe('partial');
    expect(gradeFormula('C3H5Cl', m).status).toBe('incorrect');
  });
});

describe('stéréochimie : références', () => {
  test('priorités CIP', () => {
    const m = parseSmiles('CC(O)C(=O)O'); // C1, C2 (centre), O, C(=O)OH
    const r = cipRanking(m, 1)!;
    expect(m.atoms[r[0]].el).toBe('O');
    expect(r[1]).toBe(3); // COOH avant CH3
    expect(r[2]).toBe(0);
    expect(r[3]).toBe(-1); // H
  });
  test('butan-2-ol dessiné : OH en coin plein, éthyle à droite → R', () => {
    const m = parseSmiles('CC(O)CC');
    m.bonds.find((b) => b.a === 1 && b.b === 2)!.stereo = 'wedge';
    const coords: [number, number][] = [[-0.87, -0.5], [0, 0], [0, 1], [0.87, -0.5], [1.73, 0]];
    expect(rsFromDrawing(m, coords, 1)).toBe('R');
    m.bonds.find((b) => b.a === 1 && b.b === 2)!.stereo = 'hash';
    expect(rsFromDrawing(m, coords, 1)).toBe('S');
  });
  test('CHFClBr : Br en haut, Cl à droite, F à gauche en coin plein → R', () => {
    const m = parseSmiles('FC(Cl)Br'); // F0, C1, Cl2, Br3
    m.bonds.find((b) => b.a === 0 && b.b === 1)!.stereo = undefined;
    m.bonds.splice(0, 1, { a: 1, b: 0, order: 1, stereo: 'wedge' });
    const coords: [number, number][] = [[-0.87, -0.5], [0, 0], [0.87, -0.5], [0, 1]];
    expect(rsFromDrawing(m, coords, 1)).toBe('R');
  });
});

describe('formules développées et semi-développées', () => {
  test('grille disponible pour une molécule acyclique', () => {
    expect(layoutGrid(parseSmiles('CC(C)CC(=O)O'))).not.toBeNull();
    expect(layoutDeveloped(parseSmiles('CCO'))).not.toBeNull();
  });
  test('pas de grille pour un cycle', () => {
    expect(layoutGrid(parseSmiles('C1CCCCC1'))).toBeNull();
  });
});
