# Nomenclature organique

Plateforme web pour apprendre la **nomenclature IUPAC en chimie organique**, des bases absolues jusqu’au niveau examen.

- **Parcours de 12 chapitres** progressifs (structure des atomes → valence → formules → topologique → chaînes → alcanes → alkyles et numérotation → alcènes/alcynes → cycles → fonctions → molécules polyfonctionnelles → synthèse et examens), avec niveau de difficulté, prérequis conseillés, objectifs et compétences travaillées. Aucun contenu n’est verrouillé.
- **38 leçons** en 8 étapes : explications, règle à retenir, exemple résolu pas à pas, erreurs fréquentes, exercices guidés (avec indices), exercices autonomes, quiz final, fiche récapitulative.
- **16 types d’exercices**, corrigés avec une vérification **chimique** (voir plus bas) : après chaque réponse, le raisonnement pas à pas, la règle non respectée et un nouvel exercice ciblé sur cette règle.
- **Révisions** espacées (Leitner) avec priorités du jour justifiées, planning quotidien et hebdomadaire adapté à la date d’examen, suivi des compétences.
- **Examens blancs** chronométrés avec barème, **carnet d’erreurs**, **statistiques** et indicateur de préparation calculés uniquement à partir des résultats réels, **glossaire**, analyseur de molécules.
- Interface sobre (bleu marine, bleu scientifique, gris clair), barre latérale compacte sur ordinateur, navigation adaptée au mobile, **mode concentration** pour les exercices, thème sombre.

## Installer et lancer

Prérequis : [Node.js](https://nodejs.org) 18 ou plus récent.

```bash
npm install        # une seule fois
npm run dev        # puis ouvrir l’adresse affichée (http://localhost:5173)
```

Version de production (fichiers statiques dans `dist/`, utilisables sans serveur particulier grâce aux URL en `#`) :

```bash
npm run build
npm run preview    # pour la tester localement
```

Aucun compte, aucune clé d’API : tout fonctionne hors ligne. La progression est enregistrée dans le navigateur (localStorage) ; **Réglages → Exporter ma progression** permet d’en garder une copie et de la réimporter.

## Lancer les tests

```bash
npm test           # ≈ 680 tests (Vitest)
npm run typecheck  # vérification TypeScript
```

Les tests vérifient notamment :

- **chaque molécule de la banque** (294 structures) : le nom écrit à la main est exactement celui produit par le moteur de nomenclature ; le nom relu par l’analyseur redonne la même molécule ; les variantes acceptées sont jugées correctes ; le dessin ne présente pas de chevauchement ;
- la correction des noms : indices sous-entendus, mauvaise numérotation, chaîne trop courte, ordre alphabétique, multiplicateurs, élision, « a » euphonique, ancienne notation, nom usuel, autre molécule, structure impossible, réponse illisible ;
- la stéréochimie (Z/E à partir du SMILES et du dessin, R/S sur des cas de référence) ;
- chaque exercice généré est bien jugé correct avec la bonne réponse, les distracteurs sont des molécules différentes et valides ;
- le contenu des leçons (toutes les références existent, tous les exemples sont nommables) ;
- la répétition espacée, le planning, la sauvegarde/restauration et la reprise des anciennes sauvegardes ;
- l’organisation du parcours (chaque leçon appartient à exactement un chapitre, les prérequis existent).

## Personnaliser

| Quoi | Où |
|---|---|
| Nom du site, sous-titre, conseils de méthode | `src/config/app.ts` |
| Couleurs, rayons, typographie (variables de design, thème clair et sombre) | `src/index.css` (bloc `:root` / `.dark`, exposé à Tailwind via `@theme inline`) |
| Chapitres du parcours (ordre, difficulté, prérequis, objectifs) | `src/content/chapters.ts` |
| Leçons, molécules, questions, glossaire | `src/content/` |

## Sauvegarde des données

La progression est enregistrée dans le navigateur sous la clé `nomenclature-organique:v1`. Les sauvegardes de l’ancienne version du site (clé `julies-chemistry-love:v1`) sont reprises automatiquement au premier chargement : leçons validées, exercices, révisions, erreurs, examens et objectifs sont conservés ; seuls les anciens éléments décoratifs sont ignorés. Les fichiers exportés avec l’ancienne version restent importables.

## Publier sur Vercel

Le dépôt est prêt pour Vercel (`vercel.json` : préréglage Vite, `npm run build`, dossier `dist`). Les URL en `#` évitent toute règle de réécriture côté serveur, et aucune variable d’environnement n’est nécessaire.

1. Pousser la branche sur GitHub (Vercel crée automatiquement un déploiement de prévisualisation pour chaque branche poussée).
2. Vérifier l’URL de prévisualisation affichée par Vercel (onglet *Deployments* du projet).
3. Fusionner la branche dans la branche de production du projet (souvent `main`) : Vercel redéploie automatiquement la version de production.

## Architecture

```
src/
  chem/                     moteur chimique (sans React)
    molecule.ts, smiles.ts    graphe moléculaire, analyseur SMILES, formules brutes
    isomorphism.ts            « même molécule ? » (comparaison de graphes)
    layout.ts                 coordonnées 2D (topologique, grilles semi-développée/développée)
    stereo.ts                 priorités CIP, Z/E, R/S
    nomenclature/
      namer.ts                structure → nom + explications pas à pas
      assemble.ts             assemblage du nom (élisions, tirets, multiplicateurs…)
      parser.ts               nom → structure (tolérant, pour diagnostiquer les erreurs)
      grading.ts              correction des noms et des formules brutes
  content/                  contenu pédagogique (leçons, banque de molécules, questions, glossaire)
  exercises/                génération et correction des exercices, séries (révisions, examens…)
  content/chapters.ts       les 12 chapitres du parcours
  state/                    sauvegarde (Repository), Leitner, planning, statistiques
  config/app.ts             nom du site, textes généraux
  index.css                 variables de design centralisées (couleurs, thème sombre)
  ui/, pages/               composants React et pages
```

Choix techniques : **React + TypeScript + Vite + Tailwind CSS**, tests **Vitest**, police embarquée (Inter) pour fonctionner hors ligne. Le stockage passe par une interface `Repository` (`src/state/storage.ts`) : on pourra ajouter un compte et une base de données sans toucher au reste.

**Pourquoi un moteur de dessin maison plutôt que SmilesDrawer ou RDKit ?** Les exercices ont besoin de numéroter les carbones selon la numérotation IUPAC, de surligner la chaîne principale choisie par les règles, de colorer chaque substituant, de rendre les atomes cliquables et d’afficher des formules semi-développées et développées. Ces informations viennent du moteur de nomenclature : un rendu maison en SVG, piloté par la même structure, garantit que le dessin correspond exactement à la molécule de l’exercice, sans dépendance lourde (RDKit pèse plusieurs Mo).

## Comment fonctionne la correction

Pour une question « donne le nom », la réponse n’est pas comparée bêtement à une chaîne de caractères :

1. normalisation (majuscules, espaces, tirets, apostrophes ; accents tolérés avec remarque) ;
2. comparaison avec le nom attendu **et ses variantes valides** (indices explicites, `isopropyl` / `1-méthyléthyl` / `propan-2-yl`, règle IUPAC 2013…) ;
3. sinon, le nom saisi est **analysé et transformé en molécule** :
   - même molécule mais nom non conforme → *partiellement correct*, avec l’erreur précise (numérotation, chaîne, ordre alphabétique, fonction prioritaire, élision…) ;
   - indice omis mais sans ambiguïté (« méthylpropane », « butanone ») → accepté ;
   - autre molécule → *incorrect*, et la molécule décrite par la réponse est dessinée ;
   - nom impossible (carbone à 5 liaisons) → expliqué ;
4. si le nom ne peut pas être analysé, le site l’indique (« non évaluable ») et propose une auto-évaluation plutôt que d’affirmer que c’est faux.

## Ce qui reste à développer / limites connues

- **Périmètre du moteur** : chaînes et cycles carbonés isolés, benzène, alcanes, alcènes, alcynes, halogènes, alcools (et phénols), éthers, aldéhydes, cétones, acides, esters, amines, amides, nitriles et leurs combinaisons. Hors périmètre (signalé comme tel) : hétérocycles, cycles accolés ou pontés, suffixes `-carboxylique` / `-carbaldéhyde` (acide benzoïque…), aniline, composés soufrés, substituants insaturés (vinyle, allyle), diesters/diamides, anhydrides, halogénures d’acyle.
- **Conventions** : pour la chaîne principale des molécules insaturées, le site applique la règle classique enseignée dans la plupart des cours (chaîne contenant le maximum de liaisons multiples) et accepte aussi la règle IUPAC 2013 (« 3-méthylidènepentane »). Le cycle est prioritaire sur une chaîne sans fonction (règle 2013) ; les rares molécules où les conventions divergent sont signalées et évitées dans les exercices.
- Les noms avec descripteurs stéréochimiques (Z/E, R/S) ne sont pas saisis librement : ces notions sont travaillées par QCM (configuration à déterminer sur le dessin).
- Pas de dessin libre de molécule : pour « retrouver la structure », on choisit parmi 4 structures (distracteurs générés automatiquement et vérifiés).
- Le temps d’apprentissage affiché est le **temps actif mesuré** (page visible et activité dans les 90 dernières secondes) : c’est une estimation honnête, pas un chronomètre parfait.
- Données uniquement locales (pas de synchronisation entre appareils) : utiliser l’export/import.
- Pistes : compte utilisateur et synchronisation, éditeur de molécules, plus de molécules (une ligne dans `src/content/molecules.ts` + `npm test` suffit à en ajouter une vérifiée), nomenclature des hétérocycles.
