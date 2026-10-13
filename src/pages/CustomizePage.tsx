import { useState } from 'react';
import { LOVE, MESSAGES, SECRET_LETTER, WELCOME_LETTER } from '../config/love';
import { setCustomLove, useAppState } from '../state/store';
import { Button, Card, PageTitle } from '../ui/kit';
import { LoveLetter } from '../ui/love';

export function CustomizePage() {
  const st = useAppState();
  const [letter, setLetter] = useState(st.love.custom.letter ?? WELCOME_LETTER);
  const [secret, setSecret] = useState(st.love.custom.secretLetter ?? SECRET_LETTER);
  const [newMsg, setNewMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = () => {
    setCustomLove({ letter: letter === WELCOME_LETTER ? undefined : letter, secretLetter: secret === SECRET_LETTER ? undefined : secret });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="max-w-3xl">
      <PageTitle emoji="💌" sub={`Les textes par défaut sont dans src/config/love.ts. Ici, tu peux les modifier directement dans le site (enregistré avec la progression). Prénom actuel : ${LOVE.firstName}.`}>
        Personnaliser les messages
      </PageTitle>
      <Card className="space-y-3 mb-4">
        <h2 className="font-extrabold">Lettre d’accueil</h2>
        <textarea value={letter} onChange={(e) => setLetter(e.target.value)} rows={10} className="w-full rounded-2xl border border-line bg-surface p-3 font-hand text-xl" aria-label="Lettre d’accueil" />
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => setPreview(letter)}>
            Aperçu
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLetter(WELCOME_LETTER)}>
            Revenir au texte d’origine
          </Button>
        </div>
        <h2 className="font-extrabold pt-2">Lettre secrète</h2>
        <textarea value={secret} onChange={(e) => setSecret(e.target.value)} rows={10} className="w-full rounded-2xl border border-line bg-surface p-3 font-hand text-xl" aria-label="Lettre secrète" />
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => setPreview(secret)}>
            Aperçu
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSecret(SECRET_LETTER)}>
            Revenir au texte d’origine
          </Button>
          <Button size="sm" onClick={save}>
            {saved ? 'Enregistré ✓' : 'Enregistrer les lettres'}
          </Button>
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-extrabold">Mots doux supplémentaires</h2>
        <p className="text-sm text-ink-2">Ils s’ajoutent aux {MESSAGES.loveBox.length} mots de la boîte à mots doux et aux messages de motivation.</p>
        <div className="flex gap-2">
          <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Écris un nouveau mot doux…" className="flex-1 rounded-xl border border-line bg-surface px-3 py-2" aria-label="Nouveau mot doux" />
          <Button
            onClick={() => {
              if (!newMsg.trim()) return;
              setCustomLove({ messages: [...st.love.custom.messages, newMsg.trim()] });
              setNewMsg('');
            }}
          >
            Ajouter
          </Button>
        </div>
        <ul className="space-y-1">
          {st.love.custom.messages.map((m, i) => (
            <li key={i} className="flex gap-2 items-center rounded-xl bg-surface-2 px-3 py-2">
              <span className="flex-1 font-hand text-xl">{m}</span>
              <Button variant="ghost" size="sm" onClick={() => setCustomLove({ messages: st.love.custom.messages.filter((_, k) => k !== i) })}>
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <LoveLetter open={!!preview} onClose={() => setPreview(null)} text={preview ?? ''} title="Aperçu 💌" />
    </div>
  );
}
