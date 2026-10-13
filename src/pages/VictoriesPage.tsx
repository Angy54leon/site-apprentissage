import { useState } from 'react';
import { BADGES, MESSAGES, SECRET_LETTER, UNLOCK } from '../config/love';
import { LESSONS } from '../content/lessons';
import { MODULES } from '../content/skills';
import { openSecretLetter, updatePrefs, useAppState } from '../state/store';
import { mimiStage, secretLetterUnlocked, unlockedStickers, unlockedThemes } from '../state/rewards';
import { moduleCompleted, moduleProgress } from '../state/stats';
import { formatDate } from '../state/dates';
import { Button, Card, PageTitle, Pill, ProgressBar, cx } from '../ui/kit';
import { LoveLetter, Mimi } from '../ui/love';

export function VictoriesPage() {
  const st = useAppState();
  const [letter, setLetter] = useState(false);
  const [note, setNote] = useState<number | null>(null);
  const stage = mimiStage(st);
  const unlocked = secretLetterUnlocked(st);
  const doneLessons = LESSONS.filter((l) => st.lessons[l.id]?.status === 'completed');
  return (
    <div>
      <PageTitle emoji="🏅" sub="Les récompenses sont décoratives : elles ne bloquent jamais l’accès aux cours ni aux révisions.">
        Mes petites victoires
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-extrabold mb-3">Chapitres</h2>
          <ul className="space-y-2">
            {MODULES.filter((m) => m.id !== 'm6').map((m) => {
              const p = moduleProgress(st, m.id);
              const ok = moduleCompleted(st, m.id);
              return (
                <li key={m.id} className={cx('rounded-2xl border p-3', ok ? 'border-ok/40 bg-ok-soft' : 'border-line')}>
                  <div className="flex justify-between gap-2 font-bold">
                    <span>{ok ? '🏆 ' : ''}{m.title}</span>
                    <span className="text-sm">{p.done}/{p.total}</span>
                  </div>
                  <ProgressBar value={p.total ? p.done / p.total : 0} className="mt-1.5" />
                  {ok && <p className="text-xs text-ok font-bold mt-1">Chapitre validé ! (les notions avancées restent facultatives)</p>}
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-ink-2 mt-3">{doneLessons.length} leçon(s) validée(s){doneLessons.length ? ` — la dernière : « ${doneLessons[doneLessons.length - 1].title} »` : ''}.</p>
        </Card>
        <Card className="text-center">
          <h2 className="font-extrabold">Mimi grandit avec toi</h2>
          <div className="anim-bob my-2">
            <Mimi size={130} stage={stage} mood="cheer" className="mx-auto" />
          </div>
          <p className="text-sm text-ink-2">
            Stade {stage + 1}/4.{' '}
            {stage < UNLOCK.mimiStages.length ? `Prochaine évolution après ${UNLOCK.mimiStages[stage]} leçons validées.` : 'Évolution maximale, comme toi. ✨'}
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-extrabold mb-3">Badges ({Object.keys(st.love.badges).length}/{BADGES.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {BADGES.map((b) => {
            const got = st.love.badges[b.id];
            return (
              <div key={b.id} className={cx('rounded-2xl border p-3 text-center', got ? 'border-brand-2 bg-brand-soft/25' : 'border-dashed border-line opacity-60')}>
                <div className={cx('text-3xl', !got && 'grayscale')}>{got ? b.emoji : '🔒'}</div>
                <div className="font-bold text-sm mt-1">{b.title}</div>
                <div className="text-[11px] text-ink-2">{b.description}</div>
                {got && <div className="text-[11px] text-ink-3 mt-0.5">{formatDate(got, false)}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <Card>
          <h2 className="font-extrabold mb-2">Ma collection d’autocollants</h2>
          <div className="flex flex-wrap gap-2">
            {unlockedStickers(st).map((s) => (
              <div key={s.label} title={s.unlocked ? s.label : `Après ${s.lessons} leçon(s) validée(s)`} className={cx('w-14 h-14 rounded-2xl grid place-items-center text-3xl border', s.unlocked ? 'bg-surface-2 border-line' : 'border-dashed border-line opacity-40')}>
                {s.unlocked ? s.emoji : '?'}
              </div>
            ))}
          </div>
          <h2 className="font-extrabold mt-5 mb-2">Thèmes pastel</h2>
          <div className="flex flex-wrap gap-2">
            {unlockedThemes(st).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!t.unlocked}
                onClick={() => updatePrefs({ theme: t.id })}
                className={cx('rounded-2xl border-2 px-3 py-2 text-sm font-bold flex items-center gap-2', st.prefs.theme === t.id ? 'border-ink' : 'border-line', !t.unlocked && 'opacity-50')}
                title={t.unlocked ? 'Choisir ce thème' : `Débloqué après ${t.unlockLessons} leçons validées`}
              >
                <span className="w-5 h-5 rounded-full" style={{ background: t.brand }} />
                {t.label} {!t.unlocked && `(${t.unlockLessons} leçons)`}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-extrabold mb-1">Le calendrier des petits mots 💌</h2>
          <p className="text-sm text-ink-2 mb-3">Un nouveau mot se découvre à chaque jour de visite. Tous les mots découverts restent ici.</p>
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
            {st.love.calendar.map((c, i) => (
              <button key={c.date} type="button" onClick={() => setNote(i)} className="aspect-square rounded-xl bg-surface-2 border border-line hover:border-brand-2 text-[11px] font-bold flex flex-col items-center justify-center">
                <span className="text-lg">💌</span>
                {Number(c.date.slice(8))}/{c.date.slice(5, 7)}
              </button>
            ))}
            {Array.from({ length: Math.max(0, 7 - st.love.calendar.length) }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl border border-dashed border-line grid place-items-center text-ink-3 text-lg">?</div>
            ))}
          </div>
          {note !== null && <p className="mt-3 rounded-2xl bg-brand-soft/30 p-3 font-hand text-2xl text-brand leading-snug">{MESSAGES.calendar[st.love.calendar[note].index]}</p>}
          <h2 className="font-extrabold mt-5 mb-1">La lettre secrète</h2>
          {unlocked ? (
            <Button onClick={() => { openSecretLetter(); setLetter(true); }}>💌 {st.love.secretLetterOpened ? 'Relire ma lettre secrète' : 'Ouvrir la lettre secrète'}</Button>
          ) : (
            <p className="text-sm text-ink-2">
              Une enveloppe se cache quelque part… Elle apparaîtra après {UNLOCK.secretLetterSessions} séances du jour terminées ({st.sessionsCompleted}/{UNLOCK.secretLetterSessions}).
            </p>
          )}
          {st.love.effortShown.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold text-sm mb-1">Messages de régularité reçus</h3>
              {st.love.effortShown.map((n) => (
                <p key={n} className="text-sm text-ink-2">
                  <Pill tone="brand">{n} jours</Pill> {MESSAGES.effort[n]}
                </p>
              ))}
            </div>
          )}
        </Card>
      </div>
      <LoveLetter open={letter} onClose={() => setLetter(false)} text={st.love.custom.secretLetter || SECRET_LETTER} title="Ma lettre secrète 💌" />
    </div>
  );
}
