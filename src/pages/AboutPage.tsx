import { APP } from '../config/app';
import { MOLECULES } from '../content/molecules';
import { LESSONS } from '../content/lessons';
import { CHAPTERS } from '../content/chapters';
import { QUESTIONS } from '../content/questions';
import { Card, PageTitle, SectionTitle } from '../ui/kit';

export function AboutPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <PageTitle sub={APP.tagline}>À propos</PageTitle>
      <Card>
        <SectionTitle>Contenu de la plateforme</SectionTitle>
        <ul className="list-disc pl-5 text-ink-2 space-y-1">
          <li>{CHAPTERS.length} chapitres et {LESSONS.length} leçons : explications progressives, règle, exemple résolu, erreurs fréquentes, exercices guidés et autonomes, quiz final, fiche récapitulative.</li>
          <li>Une banque de {MOLECULES.length} molécules dont chaque nom a été rédigé puis vérifié automatiquement par le moteur de nomenclature, et {QUESTIONS.length} questions de cours.</li>
          <li>Une correction chimique des noms : la réponse est convertie en molécule puis comparée à la molécule attendue, ce qui permet d’identifier la règle mal appliquée.</li>
          <li>Révisions espacées (méthode Leitner), planning adapté à la date d’examen, carnet d’erreurs, examens blancs et statistiques calculées sur les résultats réels.</li>
        </ul>
      </Card>
      <Card>
        <SectionTitle>Conventions et limites</SectionTitle>
        <ul className="list-disc pl-5 text-ink-2 space-y-1 text-sm">
          <li>Nomenclature française conforme aux recommandations IUPAC enseignées en cours. Pour la chaîne principale des composés insaturés, la règle classique (chaîne contenant le maximum de liaisons multiples) est appliquée ; la règle IUPAC 2013 est également acceptée.</li>
          <li>Périmètre du moteur : chaînes et cycles carbonés isolés, benzène, alcanes, alcènes, alcynes, halogènes, alcools, éthers, aldéhydes, cétones, acides, esters, amines, amides, nitriles et leurs combinaisons. Hors périmètre : hétérocycles, cycles accolés, suffixes -carboxylique/-carbaldéhyde, composés soufrés.</li>
          <li>Lorsqu’une réponse ne peut pas être analysée avec certitude, elle est signalée comme non évaluable plutôt que déclarée fausse.</li>
          <li>Fonctionnement hors ligne, sans compte : la progression est enregistrée dans le navigateur (export/import disponibles dans les réglages).</li>
        </ul>
      </Card>
    </div>
  );
}
