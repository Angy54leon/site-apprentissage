import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LESSON_BY_ID, LESSONS } from '../content/lessons';
import { CHAPTERS, chapterOfLesson } from '../content/chapters';
import { analyse } from '../exercises/generate';
import { useAppState } from '../state/store';
import { stripAccents } from '../chem/nomenclature/assemble';
import { BlockView } from './LessonPage';
import { MoleculeView } from '../ui/MoleculeView';
import { Button, Callout, Card, PageTitle, Pill, Rich, SectionTitle } from '../ui/kit';
import { Icon } from '../ui/icons';

export function SheetsPage() {
  const { id } = useParams();
  const st = useAppState();
  const [q, setQ] = useState('');
  if (id && LESSON_BY_ID[id]) {
    const l = LESSON_BY_ID[id];
    const ch = chapterOfLesson(l.id);
    return (
      <div className="max-w-3xl">
        <Link to="/cours" className="text-sm font-medium text-brand hover:underline inline-flex items-center gap-1 no-print">
          <Icon name="arrowLeft" size={15} /> Tous les cours
        </Link>
        <Card className="mt-3 space-y-5 print:shadow-none print:border-0">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-2">Fiche récapitulative{ch ? ` · Chapitre ${ch.number}` : ''}</div>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{l.title}</h1>
            <p className="text-ink-2 mt-1">{l.objective}</p>
          </div>
          <section className="space-y-3">
            <h2 className="font-semibold">Règles à retenir</h2>
            {l.rule.map((b, i) => (
              <Callout key={i} kind="rule">
                {b.t === 'info' ? <Rich text={b.text} /> : <BlockView b={b} />}
              </Callout>
            ))}
            <ul className="list-disc pl-6 space-y-0.5">
              {l.summary.map((s, i) => (
                <li key={i}>
                  <Rich text={s} />
                </li>
              ))}
            </ul>
            {l.mnemonic && (
              <Callout kind="tip" title="Moyen mnémotechnique">
                {l.mnemonic}
              </Callout>
            )}
          </section>
          <section>
            <h2 className="font-semibold mb-2">Erreur fréquente</h2>
            <Callout kind="warning">
              <span className="line-through text-bad">{l.mistake.wrong}</span> → <strong className="text-ok">{l.mistake.right}</strong>. {l.mistake.why}
            </Callout>
          </section>
          <section>
            <h2 className="font-semibold mb-2">Exemples</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              {l.examples.map((e) => (
                <figure key={e.smiles} className="rounded-lg border border-line p-2">
                  <MoleculeView smiles={e.smiles} size="sm" show={analyse(e.smiles).naming ? ['numbers'] : []} />
                  <figcaption className="text-center text-sm font-medium">{analyse(e.smiles).naming?.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
          <div className="flex gap-2 flex-wrap no-print">
            <Button to={`/lecon/${l.id}`}>Ouvrir la leçon complète</Button>
            <Button variant="soft" onClick={() => window.print()}>
              Imprimer la fiche
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  const norm = (s: string) => stripAccents(s.toLowerCase());
  return (
    <div>
      <PageTitle sub="Les leçons complètes et leur fiche récapitulative, classées par chapitre. Idéal pour réviser une notion précise avant un examen.">Cours</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une leçon (ex. : esters, numérotation, cycles…)"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:border-brand outline-none"
            aria-label="Rechercher une leçon"
          />
          {CHAPTERS.map((c) => {
            const lessons = c.lessons.map((x) => LESSON_BY_ID[x]).filter((l) => !q || norm(l.title + ' ' + l.objective).includes(norm(q)));
            if (!lessons.length) return null;
            return (
              <Card key={c.id} className="!p-4">
                <SectionTitle>
                  {c.number}. {c.title}
                </SectionTitle>
                <ul className="divide-y divide-line">
                  {lessons.map((l) => (
                    <li key={l.id} className="py-2 flex flex-wrap items-center gap-2">
                      <span className="flex-1 min-w-[14rem]">
                        <span className="font-medium">
                          {LESSONS.indexOf(l) + 1}. {l.title}
                        </span>{' '}
                        {l.advanced && <Pill tone="warn">Option</Pill>} {st.lessons[l.id]?.status === 'completed' && <Pill tone="ok">Validée</Pill>}
                        <span className="block text-xs text-ink-2">{l.objective}</span>
                      </span>
                      <Button to={`/fiches/${l.id}`} variant="soft" size="sm">
                        Fiche
                      </Button>
                      <Button to={`/lecon/${l.id}`} variant="outline" size="sm">
                        Leçon
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
        <div className="space-y-4">
          <Card className="!p-4">
            <SectionTitle>Analyseur de molécules</SectionTitle>
            <p className="text-sm text-ink-2">Passe d’un nom à une structure (et inversement) en dévoilant chaque étape : chaîne principale, numérotation, ramifications, insaturations, fonctions.</p>
            <Button to="/molecules" size="sm" className="mt-3">
              Ouvrir l’analyseur
            </Button>
          </Card>
          <Card className="!p-4">
            <SectionTitle>Glossaire</SectionTitle>
            <p className="text-sm text-ink-2">Définitions des termes clés, avec un lien vers la leçon correspondante.</p>
            <Button to="/glossaire" size="sm" variant="soft" className="mt-3">
              Consulter le glossaire
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
