import { LOVE } from '../config/love';
import { MOLECULES } from '../content/molecules';
import { LESSONS } from '../content/lessons';
import { QUESTIONS } from '../content/questions';
import { Card, PageTitle } from '../ui/kit';
import { Mimi } from '../ui/love';

export function AboutPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle emoji="🌸">À propos de ce petit univers</PageTitle>
      <Card className="flex gap-4 items-start">
        <Mimi size={80} mood="happy" />
        <div className="space-y-2">
          <p className="font-hand text-2xl text-brand">{LOVE.dedication}</p>
          <p>
            {LOVE.siteName} a été imaginé et construit spécialement pour {LOVE.firstName}, pour l’accompagner dans l’apprentissage de la nomenclature en chimie organique — une molécule après l’autre.
          </p>
          <p className="text-ink-2">{LOVE.motto}</p>
        </div>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-extrabold">Ce qu’il y a dedans</h2>
        <ul className="list-disc pl-5 text-ink-2 space-y-1">
          <li>{LESSONS.length} leçons en 7 modules, chacune avec explication, règle, exemple résolu, pièges, exercices guidés et autonomes, mini-test et résumé.</li>
          <li>Une banque de {MOLECULES.length} molécules dont chaque nom a été écrit à la main puis vérifié automatiquement par un moteur de nomenclature, et {QUESTIONS.length} questions de cours.</li>
          <li>Une correction « chimique » des noms : la réponse est transformée en molécule et comparée à la molécule attendue, pour expliquer l’erreur précise (numérotation, chaîne, ordre alphabétique…).</li>
          <li>Révisions espacées (méthode Leitner), planning recalculé, carnet d’erreurs, examens blancs et statistiques réelles.</li>
        </ul>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-extrabold">Conventions et limites (en toute honnêteté)</h2>
        <ul className="list-disc pl-5 text-ink-2 space-y-1 text-sm">
          <li>Nomenclature en français, conforme aux recommandations IUPAC enseignées en cours. Pour le choix de la chaîne principale des molécules insaturées, le site suit la règle classique (chaîne contenant les liaisons multiples) et accepte aussi la règle de 2013.</li>
          <li>Le moteur couvre : chaînes et cycles carbonés isolés, benzène, alcanes, alcènes, alcynes, halogènes, alcools, éthers, aldéhydes, cétones, acides, esters, amines, amides, nitriles et leurs combinaisons. Hors périmètre : hétérocycles, cycles accolés, suffixes -carboxylique/-carbaldéhyde, composés soufrés…</li>
          <li>Si une réponse ne peut pas être analysée avec certitude, le site le dit et te laisse t’auto-évaluer au lieu de la déclarer fausse.</li>
          <li>Tout fonctionne hors ligne, sans compte : la progression reste dans ton navigateur (pense à l’exporter).</li>
        </ul>
      </Card>
    </div>
  );
}
