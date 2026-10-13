import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportData, importData, resetAll, updatePrefs, updateProfile, useAppState } from '../state/store';
import { unlockedThemes } from '../state/rewards';
import { WEEKDAY_LABELS, today } from '../state/dates';
import { Button, Card, Modal, PageTitle, cx } from '../ui/kit';
import { Chip, GoalEditor } from './OnboardingPage';

export function SettingsPage() {
  const st = useAppState();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progression-chimie-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Sauvegarde téléchargée. Garde-la précieusement 💗');
  };
  const onImport = async (f: File) => {
    try {
      importData(await f.text());
      setMsg('Progression restaurée avec succès !');
    } catch (e) {
      setMsg(`Import impossible : ${(e as Error).message}`);
    }
  };
  const toggle = (on: boolean) => cx('rounded-2xl border-2 px-3 py-2 font-bold text-left', on ? 'border-brand bg-brand-soft/40' : 'border-line');
  return (
    <div className="max-w-4xl">
      <PageTitle emoji="⚙️">Réglages</PageTitle>
      {msg && <p className="mb-4 rounded-2xl bg-info-soft text-info px-4 py-3 font-semibold">{msg}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-extrabold">Mon programme</h2>
          <label className="block">
            <span className="font-bold">Date d’examen</span>
            <div className="flex gap-2 mt-1">
              <input type="date" value={st.profile.examDate ?? ''} onChange={(e) => updateProfile({ examDate: e.target.value || undefined })} className="rounded-xl border border-line bg-surface px-3 py-2" />
              {st.profile.examDate && (
                <Button variant="ghost" size="sm" onClick={() => updateProfile({ examDate: undefined })}>
                  Retirer
                </Button>
              )}
            </div>
          </label>
          <div>
            <div className="font-bold mb-1">Jours de travail</div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <Chip key={d} on={st.profile.studyDays.includes(d)} onClick={() => {
                  const days = st.profile.studyDays.includes(d) ? st.profile.studyDays.filter((x) => x !== d) : [...st.profile.studyDays, d];
                  if (days.length) updateProfile({ studyDays: days });
                }}>
                  {WEEKDAY_LABELS[d]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="font-bold mb-1">Notre petit objectif du jour</div>
            <GoalEditor goal={st.profile.goal} onChange={(g) => updateProfile({ goal: g })} />
          </div>
          <Button variant="soft" to="/bienvenue" size="sm">
            Refaire le questionnaire d’accueil / test de positionnement
          </Button>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-extrabold">Affichage</h2>
          <button type="button" className={toggle(st.prefs.animations)} onClick={() => updatePrefs({ animations: !st.prefs.animations })} aria-pressed={st.prefs.animations}>
            ✨ Animations {st.prefs.animations ? 'activées' : 'désactivées'}
            <span className="block text-xs font-normal text-ink-2">Les animations sont aussi coupées si ton système demande de réduire les mouvements.</span>
          </button>
          <button type="button" className={toggle(st.prefs.focusMode)} onClick={() => updatePrefs({ focusMode: !st.prefs.focusMode })} aria-pressed={st.prefs.focusMode}>
            🎧 Mode concentration {st.prefs.focusMode ? 'activé' : 'désactivé'}
            <span className="block text-xs font-normal text-ink-2">Masque les décorations et les petits mots pendant le travail.</span>
          </button>
          <button type="button" className={toggle(st.prefs.dark)} onClick={() => updatePrefs({ dark: !st.prefs.dark })} aria-pressed={st.prefs.dark}>
            🌙 Mode sombre doux {st.prefs.dark ? 'activé' : 'désactivé'}
          </button>
          <button type="button" className={toggle(st.prefs.showMimi)} onClick={() => updatePrefs({ showMimi: !st.prefs.showMimi })} aria-pressed={st.prefs.showMimi}>
            ⚛️ Afficher Mimi {st.prefs.showMimi ? '(oui)' : '(non)'}
          </button>
          <div>
            <div className="font-bold mb-1">Thème</div>
            <div className="flex flex-wrap gap-2">
              {unlockedThemes(st).map((t) => (
                <button key={t.id} type="button" disabled={!t.unlocked} onClick={() => updatePrefs({ theme: t.id })} className={cx('rounded-xl border-2 px-2.5 py-1.5 text-sm font-bold flex items-center gap-1.5', st.prefs.theme === t.id ? 'border-ink' : 'border-line', !t.unlocked && 'opacity-50')}>
                  <span className="w-4 h-4 rounded-full" style={{ background: t.brand }} /> {t.label}
                  {!t.unlocked && ` 🔒 ${t.unlockLessons} leçons`}
                </button>
              ))}
            </div>
          </div>
          <Link to="/personnaliser" className="block text-sm font-bold text-brand underline">
            Personnaliser les messages et les lettres
          </Link>
        </Card>
        <Card className="space-y-3 md:col-span-2">
          <h2 className="font-extrabold">Sauvegarde de la progression</h2>
          <p className="text-sm text-ink-2">
            Ta progression est enregistrée automatiquement dans ce navigateur (sans compte). Pour ne rien perdre (changement d’ordinateur, nettoyage du navigateur), exporte-la de temps en temps.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={download}>⬇️ Exporter ma progression</Button>
            <Button variant="soft" onClick={() => file.current?.click()}>
              ⬆️ Importer une sauvegarde
            </Button>
            <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              Tout réinitialiser
            </Button>
          </div>
        </Card>
      </div>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Tout réinitialiser ?">
        <p className="text-ink-2">Toute la progression, les erreurs, le planning et les récompenses seront effacés. Pense à exporter une sauvegarde avant.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="soft" onClick={() => setConfirmReset(false)}>
            Annuler
          </Button>
          <Button onClick={() => { resetAll(); setConfirmReset(false); setMsg('Progression réinitialisée.'); }}>Oui, tout effacer</Button>
        </div>
      </Modal>
    </div>
  );
}
