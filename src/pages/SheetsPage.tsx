import { Link, useParams } from 'react-router-dom';
import { LESSONS, LESSON_BY_ID, lessonsOfModule } from '../content/lessons';
import { MODULES } from '../content/skills';
import { analyse } from '../exercises/generate';
import { useAppState } from '../state/store';
import { BlockView } from './LessonPage';
import { MoleculeView } from '../ui/MoleculeView';
import { Button, Card, PageTitle, Pill, Rich } from '../ui/kit';

export function SheetsPage() {
  const { id } = useParams();
  const st = useAppState();
  if (id && LESSON_BY_ID[id]) {
    const l = LESSON_BY_ID[id];
    return (
      <div className="max-w-3xl">
        <Link to="/fiches" className="text-sm font-bold text-brand">
          ← Toutes les fiches
        </Link>
        <Card className="mt-3 space-y-4 print:shadow-none">
          <div>
            <div className="text-xs font-bold uppercase text-ink-3">Fiche de cours</div>
            <h1 className="text-2xl font-extrabold">{l.title}</h1>
            <p className="text-ink-2">{l.objective}</p>
          </div>
          <section className="space-y-3">
            <h2 className="font-extrabold text-lg">📌 À retenir</h2>
            {l.rule.map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
            <ul className="list-disc pl-6">
              {l.summary.map((s, i) => (
                <li key={i}>
                  <Rich text={s} />
                </li>
              ))}
            </ul>
            {l.mnemonic && <BlockView b={{ t: 'mnemo', title: 'Moyen mnémotechnique', text: l.mnemonic }} />}
          </section>
          <section>
            <h2 className="font-extrabold text-lg mb-1">⚠️ Piège</h2>
            <p>
              <span className="line-through text-bad">{l.mistake.wrong}</span> → <strong className="text-ok">{l.mistake.right}</strong>. {l.mistake.why}
            </p>
          </section>
          <section>
            <h2 className="font-extrabold text-lg mb-2">Exemples</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              {l.examples.map((e) => (
                <figure key={e.smiles} className="rounded-xl border border-line p-2">
                  <MoleculeView smiles={e.smiles} size="sm" show={analyse(e.smiles).naming ? ['numbers'] : []} />
                  <figcaption className="text-center text-sm font-bold">{analyse(e.smiles).naming?.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
          <div className="flex gap-2 flex-wrap">
            <Button to={`/lecon/${l.id}`}>Ouvrir la leçon complète</Button>
            <Button variant="soft" onClick={() => window.print()}>
              Imprimer la fiche
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div>
      <PageTitle emoji="📖" sub="Toutes les leçons, et leur fiche de synthèse à relire avant un examen.">
        Leçons et fiches de cours
      </PageTitle>
      <div className="space-y-4">
        {MODULES.map((m) => (
          <Card key={m.id}>
            <h2 className="font-extrabold mb-2">{m.title}</h2>
            <ul className="divide-y divide-line">
              {lessonsOfModule(m.id).map((l) => (
                <li key={l.id} className="py-2 flex flex-wrap items-center gap-2">
                  <span className="flex-1 font-semibold">
                    {LESSONS.indexOf(l) + 1}. {l.title} {l.advanced && <Pill tone="warn">avancé</Pill>} {st.lessons[l.id]?.status === 'completed' && <Pill tone="ok">validée</Pill>}
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
        ))}
      </div>
    </div>
  );
}
