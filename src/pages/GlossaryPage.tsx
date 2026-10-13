import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GLOSSARY } from '../content/glossary';
import { LESSON_BY_ID } from '../content/lessons';
import { stripAccents } from '../chem/nomenclature/assemble';
import { Card, PageTitle, Empty } from '../ui/kit';

export function GlossaryPage() {
  const [q, setQ] = useState('');
  const norm = (s: string) => stripAccents(s.toLowerCase());
  const list = GLOSSARY.filter((g) => norm(g.term + ' ' + g.definition).includes(norm(q))).sort((a, b) => norm(a.term).localeCompare(norm(b.term)));
  return (
    <div className="max-w-3xl">
      <PageTitle sub={`${GLOSSARY.length} termes essentiels, avec un lien vers la leçon correspondante.`}>
        Glossaire de chimie organique
      </PageTitle>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un terme (ex. : chaîne, ester, élision…)" className="w-full rounded-lg border border-line bg-surface px-4 py-3 mb-4 focus:border-brand-2 outline-none" aria-label="Rechercher dans le glossaire" />
      {!list.length && <Empty>Aucun terme trouvé.</Empty>}
      <dl className="grid gap-2">
        {list.map((g) => (
          <Card key={g.term} className="!p-4">
            <dt className="font-semibold">{g.term}</dt>
            <dd className="text-ink-2">{g.definition}</dd>
            {g.lesson && LESSON_BY_ID[g.lesson] && (
              <dd className="mt-1 text-sm">
                <Link className="text-brand font-bold underline" to={`/lecon/${g.lesson}`}>
                  Leçon : {LESSON_BY_ID[g.lesson].title}
                </Link>
              </dd>
            )}
          </Card>
        ))}
      </dl>
    </div>
  );
}
