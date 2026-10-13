import { useMemo, useState } from 'react';
import { MOLECULES } from '../content/molecules';
import { interpretName } from '../chem/nomenclature/grading';
import { toSmiles } from '../chem/smiles';
import { MoleculeExplorer } from '../ui/MoleculeCard';
import { MoleculeView } from '../ui/MoleculeView';
import { Button, Card, PageTitle } from '../ui/kit';
import { stripAccents } from '../chem/nomenclature/assemble';

export function LabPage() {
  const [smiles, setSmiles] = useState('CC(Cl)C=CC(C)O');
  const [nameInput, setNameInput] = useState('');
  const [nameResult, setNameResult] = useState<{ ok: boolean; text: string; smiles?: string[] } | null>(null);
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const q = stripAccents(search.toLowerCase());
    return MOLECULES.filter((m) => stripAccents(m.name.toLowerCase()).includes(q)).slice(0, 40);
  }, [search]);
  const fromName = () => {
    const it = interpretName(nameInput);
    if (it.status === 'ok') {
      const s = toSmiles(it.molecules[0]);
      setNameResult({ ok: true, text: it.usualLabel ? `« ${it.usualLabel} » est un nom usuel.` : 'Voici la structure décrite par ce nom :', smiles: [s] });
      setSmiles(s);
    } else if (it.status === 'ambiguous') setNameResult({ ok: false, text: 'Ce nom est ambigu (indice manquant). Il peut désigner :', smiles: it.molecules.map(toSmiles) });
    else if (it.status === 'none') setNameResult({ ok: false, text: 'Ce nom n’est pas conforme ; il pourrait désigner :', smiles: it.molecules.slice(0, 4).map(toSmiles) });
    else setNameResult({ ok: false, text: it.error?.message ?? 'Nom non reconnu.' });
  };
  return (
    <div>
      <PageTitle emoji="🔬" sub="Du nom vers la structure, et de la structure vers le nom, en dévoilant chaque étape : chaîne principale, numérotation, ramifications, insaturations, fonctions, nom final.">
        Comprendre une molécule
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="font-extrabold mb-2">Du nom à la structure</h2>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fromName()} placeholder="ex. : 3-éthyl-2-méthylpentane" className="w-full rounded-xl border-2 border-line bg-surface px-3 py-2" aria-label="Nom à dessiner" />
            <Button className="mt-2" size="sm" onClick={fromName} disabled={!nameInput.trim()}>
              Dessiner
            </Button>
            {nameResult && (
              <div className="mt-2 text-sm">
                <p className={nameResult.ok ? 'text-ok' : 'text-warn'}>{nameResult.text}</p>
                {!nameResult.ok && nameResult.smiles && (
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {nameResult.smiles.map((s) => (
                      <button key={s} type="button" onClick={() => setSmiles(s)} className="rounded-xl border border-line p-1 hover:border-brand-2">
                        <MoleculeView smiles={s} size="sm" naming={null} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="font-extrabold mb-2">Choisir dans la banque ({MOLECULES.length} molécules vérifiées)</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrer…" className="w-full rounded-xl border border-line bg-surface px-3 py-2 mb-2" aria-label="Filtrer les molécules" />
            <ul className="max-h-80 overflow-auto thin-scroll text-sm">
              {list.map((m) => (
                <li key={m.smiles}>
                  <button type="button" onClick={() => setSmiles(m.smiles)} className="w-full text-left rounded-lg px-2 py-1 hover:bg-surface-2">
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card>
          <MoleculeExplorer key={smiles} smiles={smiles} />
        </Card>
      </div>
    </div>
  );
}
