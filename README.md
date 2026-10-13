# Julie’s Chemistry Love 💗

> *Un peu de chimie, beaucoup d’amour.*

Une application web pour apprendre la **nomenclature en chimie organique** depuis zéro jusqu’au niveau examen, enveloppée dans un petit univers romantique créé pour Julie.

- 38 leçons en 7 modules (bases → alcanes → alcènes/alcynes → cycles → fonctions → molécules complexes → examens), chacune en 8 étapes : comprendre, règle à retenir, exemple résolu pas à pas, pièges et exemples, exercices guidés (avec indices), exercices autonomes, mini-test de validation, résumé.
- 16 types d’exercices, corrigés automatiquement avec une correction **chimique** (voir plus bas).
- Révisions espacées (Leitner), planning recalculé, carnet d’erreurs, examens blancs chronométrés avec barème, statistiques réelles.
- Mimi (l’atome rose), lettre d’accueil dans une enveloppe, boîte à mots doux, lettre secrète, calendrier des petits mots, badges, autocollants, thèmes pastel, mode concentration, mode sombre doux, animations désactivables.

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
- la répétition espacée, le planning, la sauvegarde/restauration, les badges et la lettre secrète.

## Personnaliser le petit univers

Tout le romantique est centralisé dans **`src/config/love.ts`**, séparé du contenu scientifique :

| Quoi | Où |
|---|---|
| Prénom, nom du site, sous-titre, dédicace | `LOVE` |
| Textes de la page d’accueil | `HOME` |
| Lettre d’accueil / lettre secrète | `WELCOME_LETTER`, `SECRET_LETTER` |
| Messages (bonne réponse, erreur, fin de séance, chapitre validé, boîte à mots doux, calendrier, régularité, conseils de Mimi…) | `MESSAGES` |
| Couleurs et thèmes pastel débloquables | `COLORS`, `THEMES` |
| Conditions de déblocage (lettre secrète après 5 séances, paliers de Mimi, probabilité du « Bravo mon cœur », jalons de régularité) | `UNLOCK` |
| Badges et autocollants | `BADGES`, `STICKERS` |
| Animations par défaut | `ANIMATION_DEFAULTS` |

Les lettres et des mots doux supplémentaires peuvent aussi être modifiés **dans le site** (menu *Personnaliser*), sans toucher au code.

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
  state/                    sauvegarde (Repository), Leitner, planning, statistiques, récompenses
  config/love.ts            tout l’univers romantique
  ui/, pages/               composants React et pages
```

Choix techniques : **React + TypeScript + Vite + Tailwind CSS**, tests **Vitest**, polices embarquées (Nunito, Caveat) pour fonctionner hors ligne. Le stockage passe par une interface `Repository` (`src/state/storage.ts`) : on pourra ajouter un compte et une base de données sans toucher au reste.

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
