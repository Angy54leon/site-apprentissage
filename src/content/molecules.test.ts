import { MOLECULES, EZ_MOLECULES, RS_MOLECULES } from './molecules';
import { parseSmiles } from '../chem/smiles';
import { nameMolecule } from '../chem/nomenclature/namer';
import { interpretName, gradeName } from '../chem/nomenclature/grading';
import { isSameMolecule } from '../chem/isomorphism';
import { layoutSkeletal, hasOverlaps } from '../chem/layout';
import { doubleBondStereo, stereocenters } from '../chem/stereo';

describe('banque de molécules', () => {
  test('pas de doublon', () => {
    const seen = new Set<string>();
    for (const e of MOLECULES) {
      expect(seen.has(e.smiles), e.smiles).toBe(false);
      seen.add(e.smiles);
    }
    const names = MOLECULES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });
  for (const e of MOLECULES) {
    test(`${e.smiles} → ${e.name}`, () => {
      const mol = parseSmiles(e.smiles);
      const r = nameMolecule(mol);
      expect(r.name).toBe(e.name);
      // aucune égalité non tranchée
      expect(r.notes.filter((n) => n.includes('égalité'))).toEqual([]);
      // le nom relu redonne la même molécule
      const it = interpretName(e.name);
      expect(it.status).toBe('ok');
      expect(isSameMolecule(it.molecules[0], mol)).toBe(true);
      // le nom attendu est jugé correct, ainsi que ses variantes
      expect(gradeName(e.name, mol, r).status).toBe('correct');
      for (const v of r.variants) expect(gradeName(v, mol, r).status, v).toBe('correct');
      // dessin sans chevauchement
      const pos = layoutSkeletal(mol, r.parentAtoms, r.isRing);
      expect(hasOverlaps(mol, pos, 0.5)).toBe(false);
    });
  }
});

describe('stéréochimie', () => {
  test('Z/E : SMILES et dessin concordent', () => {
    for (const e of EZ_MOLECULES) {
      const mol = parseSmiles(e.smiles);
      const pos = layoutSkeletal(mol);
      const a = doubleBondStereo(mol).map((x) => x.config);
      const b = doubleBondStereo(mol, pos).map((x) => x.config);
      expect(b, e.smiles).toEqual(a);
    }
  });
  test('Z/E connus', () => {
    const cfg = (s: string) => doubleBondStereo(parseSmiles(s))[0].config;
    expect(cfg('C/C=C/C')).toBe('E');
    expect(cfg('C/C=C\\C')).toBe('Z');
    expect(cfg('C/C=C(/C)CC')).toBe('Z');
    expect(cfg('C/C=C(\\C)CC')).toBe('E');
    expect(cfg('CC(C)=CC')).toBe(null);
  });
  test('chaque molécule R/S a exactement un carbone asymétrique', () => {
    for (const e of RS_MOLECULES) expect(stereocenters(parseSmiles(e.smiles)).length, e.smiles).toBe(1);
  });
});
