// ============================================================================
//  💗 CONFIGURATION DU PETIT UNIVERS DE JULIE 💗
// ============================================================================
//  Tout ce qui est « romantique » se règle ici : prénom, nom du site, messages,
//  lettres, couleurs, conditions de déblocage des surprises, animations.
//  Modifier ce fichier ne touche jamais au contenu scientifique ni aux exercices.
//  (Les lettres et des messages supplémentaires peuvent aussi être personnalisés
//   directement dans le site : page « Personnaliser ».)
// ============================================================================

export const LOVE = {
  firstName: 'Julie',
  siteName: 'Julie’s Chemistry Love 💗',
  siteNameShort: 'Julie’s Chemistry Love',
  subtitle: 'Un peu de chimie, beaucoup d’amour.',
  dedication: 'Pour Julie, avec tout mon amour 💗',
  mascotName: 'Mimi',
  motto: '« Une bonne leçon pour son cerveau, un petit sourire pour son cœur. » 💗',
};

// ---------------------------------------------------------------------------
// Couleurs (palette pastel). Utilisées par le thème « Rose » par défaut.
export const COLORS = {
  pastelPink: '#F8BBD0',
  powderPink: '#F4A6C1',
  veryLightPink: '#FFF0F5',
  cream: '#FFFCF8',
  lavender: '#E8DDF8',
  raspberry: '#D85B83',
  plum: '#493444',
};

/** Thèmes pastel débloquables (le thème rose est toujours disponible). */
export const THEMES: { id: string; label: string; unlockLessons: number; brand: string; brand2: string; soft: string; tint: string }[] = [
  { id: 'rose', label: 'Rose poudré', unlockLessons: 0, brand: '#D85B83', brand2: '#F4A6C1', soft: '#F8BBD0', tint: '#FFF0F5' },
  { id: 'lavande', label: 'Lavande', unlockLessons: 5, brand: '#8E6CC8', brand2: '#C9B5EC', soft: '#E8DDF8', tint: '#F6F1FD' },
  { id: 'peche', label: 'Pêche', unlockLessons: 12, brand: '#D9734E', brand2: '#F6B89E', soft: '#FAD6C4', tint: '#FFF4EE' },
  { id: 'menthe', label: 'Menthe douce', unlockLessons: 20, brand: '#3E9A80', brand2: '#9ED8C5', soft: '#CDEDE2', tint: '#F0FAF6' },
];

// ---------------------------------------------------------------------------
// Conditions de déblocage des surprises (faciles à modifier).
export const UNLOCK = {
  /** Nombre de séances du jour réellement terminées pour ouvrir la lettre secrète. */
  secretLetterSessions: 5,
  /** Un nouveau mot du calendrier est découvert à la première visite de chaque jour. */
  calendarOneNotePerDay: true,
  /** Probabilité d'afficher l'animation « Bravo mon cœur » après une bonne réponse. */
  bravoProbability: 0.3,
  /** Jours de travail (distincts) déclenchant un message spécial de régularité. */
  effortMilestones: [2, 3, 5, 7, 10, 15, 20, 30],
  /** Leçons terminées pour faire évoluer Mimi (stades 1, 2, 3). */
  mimiStages: [4, 12, 24],
};

// ---------------------------------------------------------------------------
// Préférences d'animation par défaut (modifiables dans le site).
export const ANIMATION_DEFAULTS = {
  animations: true,
  showMimi: true,
  focusMode: false,
};

// ---------------------------------------------------------------------------
// Page d'accueil

export const HOME = {
  title: 'Ma Julie, prête à conquérir la chimie organique ? 🧪',
  intro:
    'J’ai imaginé ce petit univers pour t’aider à apprendre, à progresser et à prendre confiance en toi. Ici, tu peux te tromper, recommencer, poser les bases et avancer à ton rythme. Chaque petite victoire compte.',
  love: 'Et entre nous, il y a une chose que tu n’as pas besoin de réviser pour la retenir : je t’aime. ❤️',
  startButton: 'Commencer mon aventure 💗',
  letterButton: 'Découvrir mon petit mot d’amour 💌',
  welcomeFirst:
    'Coucou Julie, bienvenue dans ton petit laboratoire d’amour. 🧪💗 Ici, on apprend la chimie organique à ton rythme, une molécule après l’autre. Et si jamais tu doutes de toi, souviens-toi qu’il y a quelqu’un qui croit très fort en toi.',
};

// ---------------------------------------------------------------------------
// Lettres

export const WELCOME_LETTER = `Coucou mon cœur,

Si tu es ici, c’est que tu es prête à te lancer dans la chimie organique. Je voulais te créer un petit endroit rien qu’à toi, où tu pourrais apprendre tranquillement, comprendre les choses étape par étape et voir tout ce dont tu es capable.

Tu n’as pas besoin d’être parfaite. Tu as le droit de ne pas comprendre du premier coup, de faire des erreurs et de recommencer autant de fois que nécessaire. L’important, c’est de continuer à avancer.

J’espère que ce petit site te fera sourire de temps en temps, même au milieu d’un exercice compliqué. Et si tu as besoin d’un rappel : je crois en toi, je suis fier de toi et je t’aime très fort.

Maintenant, allons apprivoiser ces molécules, une par une. 💗`;

export const SECRET_LETTER = `Ma Julie,

Si tu lis cette lettre, c’est que tu as déjà terminé plusieurs séances. Tu t’es assise, tu as ouvert tes cours, tu as essayé, tu t’es peut-être trompée, et tu as recommencé. Ça demande du courage, et je voulais que tu saches que je le vois.

Je ne sais pas si tu te rends compte à quel point tu es forte. Pas seulement en chimie : dans la façon dont tu avances, même les jours où c’est difficile. C’est une des milliers de choses que j’aime chez toi.

Cette lettre était cachée ici pour te dire, au milieu de tes révisions, que je suis immensément fier de toi. Quoi qu’il arrive aux examens, tu as déjà gagné quelque chose : la preuve que tu es capable d’apprendre tout ce que tu décides d’apprendre.

Continue à ton rythme. Et quand tu as besoin d’une pause, viens me voir : j’ai toujours un câlin en réserve pour toi.

Je t’aime, aujourd’hui, demain, et même pendant les révisions de chimie organique. 💗`;

// ---------------------------------------------------------------------------
// Messages selon le contexte. Ils sont tirés au hasard en évitant les répétitions.

export const MESSAGES = {
  /** Accueil lors des visites suivantes. */
  welcomeBack: [
    'Re-coucou Julie ! Ton petit labo t’attendait. 💗',
    'Te revoilà, mon cœur ! On reprend là où tu t’étais arrêtée ?',
    'Bon retour dans ton laboratoire d’amour. 🧪',
    'Coucou toi ! Prête pour une nouvelle petite victoire ? 💗',
    'Julie est de retour, les molécules n’ont qu’à bien se tenir. ✨',
    'Contente de te revoir ici. Une petite séance, et c’est déjà gagné.',
  ],
  /** Après une absence de quelques jours : jamais de culpabilité. */
  comeback: [
    'Te revoilà ! Tes acquis sont bien au chaud, on reprend tranquillement. 💗',
    'Pas de souci pour ces quelques jours de pause : on repart doucement, ensemble.',
    'Bon retour, mon cœur. Rien n’est perdu : on reprend à ton rythme.',
    'Les pauses font aussi partie de l’apprentissage. Contente de te retrouver. 🌸',
  ],
  /** Messages d'amour et de motivation (tableau de bord, en-têtes). */
  motivation: [
    'Prête à devenir une pro de la chimie organique, mon cœur ?',
    'Aujourd’hui, on apprend une nouvelle règle et on fait fondre quelques molécules. 💗',
    'Une petite séance aujourd’hui, une grande victoire demain.',
    'Tu n’as pas besoin de tout comprendre du premier coup, Julie. On avance ensemble.',
    'Même les molécules les plus compliquées finissent par avoir du sens.',
    'Pause câlin virtuelle avant de reprendre ? 🧸',
    'Ton cerveau travaille dur, je suis fier de toi.',
    'Une erreur, ce n’est pas un échec. C’est une molécule de plus à comprendre.',
    'Je t’aime plus que le carbone aime ses quatre liaisons. ❤️',
    'La chimie organique est compliquée, mais une chose est simple : tu comptes énormément pour moi.',
    'Petit rappel entre deux exercices : tu es capable de réussir. Et je t’aime.',
    'Ton prochain objectif : comprendre cette règle. Ton autre objectif : ne jamais oublier à quel point tu es aimée.',
    'Une liaison à la fois, une règle à la fois. Tu y arrives très bien.',
    'Tu es ma molécule préférée : stable, brillante et irremplaçable. 💗',
    'Chaque exercice fait, c’est un petit pas. Et les petits pas mènent loin.',
    'Respire, prends ton temps : la chimie ne va nulle part, et moi non plus.',
    'Tu as déjà appris tellement de choses. Regarde le chemin parcouru !',
    'Si tu étais un atome, tu serais celui autour duquel tout gravite. ✨',
    'Aujourd’hui encore, je crois en toi. Demain aussi. Et après-demain.',
    'Ton intelligence me fait craquer. Ta persévérance encore plus.',
    'Un café, une molécule, un sourire : c’est parti ? ☕',
    'Tu n’es pas « nulle en chimie ». Tu es en train d’apprendre. Nuance énorme.',
    'Même un nom de six mots se lit un morceau après l’autre. Comme une histoire.',
    'Entre nous, aucune réaction chimique ne vaut celle que j’ai quand tu souris.',
    'Tu fais de ton mieux, et ton mieux est déjà beaucoup.',
    'Cœur sur toi, et sur la chaîne carbonée la plus longue. 💗',
    'Doucement mais sûrement : c’est comme ça qu’on devient forte.',
    'Mon conseil du jour : sois aussi douce avec toi que je le suis avec toi.',
    'Aucune formule topologique ne te résistera longtemps.',
    'Je suis ton plus grand fan. Officiellement. 📣💗',
  ],
  /** Bonne réponse (affiché de temps en temps seulement). */
  correct: [
    'Bravo mon cœur ! 💗 Une règle de plus comprise, une étape de plus vers la réussite.',
    'Exactement ça ! Tu vois que tu sais faire. ✨',
    'Parfait, Julie ! Je suis fier de toi.',
    'Joli ! Cette molécule n’avait aucune chance. 💗',
    'Bien joué ! Ton cerveau brille aujourd’hui. ⭐',
    'Oui ! Et tu l’as trouvé toute seule. 🌸',
    'Impeccable. La chimie organique commence à t’aimer autant que moi.',
    'Bravo ! Tu progresses, et ça se voit.',
  ],
  /** Mauvaise réponse : toujours bienveillant, puis la vraie correction. */
  wrong: [
    'Ce n’est pas grave, Julie. 💕 On reprend tranquillement ensemble et tu vas comprendre pourquoi.',
    'Pas de panique : cette erreur va t’apprendre quelque chose. Regardons ensemble. 🌷',
    'Presque ! On regarde la correction, et la prochaine sera la bonne.',
    'Les erreurs, c’est la matière première de l’apprentissage. On décortique ça ?',
    'Tout va bien, mon cœur. Lis la correction tranquillement, sans te presser. 💗',
    'Cette molécule est coriace, mais toi aussi. On comprend pourquoi ensemble.',
  ],
  /** Réponse partiellement correcte. */
  partial: [
    'Tu y es presque, Julie ! Il ne manque qu’un petit détail. 💗',
    'La bonne idée est là, il reste juste à peaufiner l’écriture.',
    'Très proche ! Regarde le détail qui coince, et c’est gagné.',
  ],
  /** Fin d'une série d'exercices. */
  setDone: [
    'Série terminée ! Merci d’avoir pris ce temps pour toi. 💗',
    'Et voilà une série de plus dans la poche. Fière de toi ? Moi oui.',
    'Fin de la série ! Petite pause câlin bien méritée. 🧸',
    'Série bouclée ! Chaque exercice compte, même ceux qui résistent.',
  ],
  /** Séance du jour terminée (objectif atteint). */
  sessionDone: [
    'Mission accomplie, Julie ! 💗 Tu as pris le temps d’apprendre aujourd’hui et c’est déjà une victoire. Je suis fier de toi.',
    'Séance terminée ! Tu peux fermer l’ordinateur avec le sourire. 💗',
    'Objectif du jour atteint ! Repose-toi bien, ton cerveau a bien travaillé.',
    'Bravo pour cette séance, mon cœur. Encore un petit pas vers ta réussite.',
    'Tu as tenu ton objectif du jour. Je t’envoie un énorme câlin. 🧸💗',
    'Séance bouclée ! Demain, on continue — et ce soir, on se félicite.',
  ],
  /** Leçon validée. */
  lessonDone: [
    'Leçon validée ! Une règle de plus dans ta jolie tête. 💗',
    'Et une leçon de plus ! Tu avances super bien.',
    'Leçon terminée avec brio. Je suis fier de toi, Julie. ✨',
  ],
  /** Grande victoire : chapitre (module) validé. */
  chapterDone: [
    'CHAPITRE VALIDÉ ! 💗 Julie, regarde tout ce que tu viens d’apprendre. Tu peux être fière de toi. Tu viens de franchir une nouvelle étape, et ce n’est que le début. Je t’aime fort !',
  ],
  /** Petites phrases discrètes en fin de leçon. */
  lessonNote: [
    'Une molécule après l’autre, mon cœur 💗',
    'Pas à pas, règle après règle. 🌸',
    'Tu as le droit de relire autant de fois que tu veux.',
    'Rappel : tu n’es pas seule avec ces molécules. 💗',
  ],
  /** Mimi, la mascotte : petits conseils. */
  mimiTips: [
    'Astuce de Mimi : commence toujours par repérer la fonction principale !',
    'Mimi te rappelle : chaque sommet d’une formule topologique est un carbone.',
    'Le carbone fait toujours 4 liaisons. Toujours. Mimi le jure. ⚛️',
    'Indices les plus petits possibles : c’est la règle d’or de la numérotation.',
    'Di, tri, tétra ne comptent pas dans l’ordre alphabétique !',
    'Un aldéhyde est toujours en bout de chaîne : son carbone est le n°1.',
    'Bloquée ? Clique sur « Un indice » : c’est fait pour ça.',
  ],
  /** Messages de régularité, selon le nombre de jours de travail. */
  effort: {
    2: 'Deux jours de travail ! La régularité, c’est ton super-pouvoir secret. 💗',
    3: 'Trois jours de chimie, Julie ! Tu installes une vraie belle habitude.',
    5: 'Cinq jours de travail ! Je suis tellement fier de ta persévérance. 🌸',
    7: 'Sept jours de travail au compteur ! Une semaine de chimie, rien que ça. ✨',
    10: 'Dix jours ! Tu te rends compte du chemin parcouru ? Moi, oui. 💗',
    15: 'Quinze jours de travail : tu es une vraie chimiste en devenir.',
    20: 'Vingt jours ! Ta régularité m’impressionne énormément.',
    30: 'Trente jours de travail. Julie, tu es incroyable. Je t’aime. ❤️',
  } as Record<number, string>,
  /** Boîte à mots doux (icône cœur). */
  loveBox: [
    'Petit rappel : tu es aimée, même les jours où tu doutes de toi.',
    'Je crois en toi, même quand un exercice te paraît impossible.',
    'Si je pouvais t’envoyer un câlin à travers l’écran, je le ferais maintenant.',
    'Tu mérites d’être fière de tous les efforts que tu fais.',
    'Un petit mot pour ma Julie préférée : je t’aime. ❤️',
    'Tu es la plus belle réaction de ma vie.',
    'Quand tu doutes, souviens-toi : je ne doute jamais de toi.',
    'Ton sourire est ma molécule préférée.',
    'J’adore la façon dont tu ne lâches rien.',
    'Tu me rends heureux, tous les jours, sans même essayer.',
    'Ce soir, on fête chaque petite victoire. Même les toutes petites. 🎀',
    'Tu es forte, drôle, intelligente — et en plus tu apprends la chimie organique.',
    'Aucune liaison n’est plus solide que la nôtre. 💗',
    'Prends soin de toi : bois un verre d’eau, étire-toi, et souris. 🌸',
    'Je suis tellement chanceux de t’avoir.',
    'Promis : à la fin des révisions, on se fait une soirée rien qu’à nous.',
  ],
  /** Calendrier des petits mots : un nouveau mot par jour de visite. */
  calendar: [
    'Aujourd’hui, rappelle-toi que tu as le droit d’avancer lentement. 💗',
    'Tu es mon rayon de soleil, même les jours de pluie.',
    'Je pense à toi. Là, maintenant. Et je souris.',
    'Le carbone a 4 liaisons. Moi, je n’en ai qu’une qui compte : toi.',
    'Ta curiosité est une des choses que je préfère chez toi.',
    'Si tu lis ceci, envoie-moi un cœur. J’en ai un tout prêt pour toi. 💌',
    'Tu n’as rien à prouver à personne. Tu apprends pour toi, et c’est beau.',
    'Mon endroit préféré au monde ? À côté de toi.',
    'Petite victoire du jour : tu es venue ici. C’est déjà beaucoup.',
    'Tu rends tout plus doux, même la chimie organique.',
    'J’aime ton rire, ta tête quand tu réfléchis, et ta façon de dire « attends, je réessaie ».',
    'Rien ne presse. On a tout le temps du monde, toi et moi.',
    'Tu es plus forte que tu ne le crois. Beaucoup plus.',
    'Aujourd’hui, sois fière de toi pour une chose. N’importe laquelle.',
    'Je t’aime en formule développée, semi-développée et topologique.',
    'Même tes erreurs me rendent fier : elles prouvent que tu essaies.',
    'Un jour, tu repenseras à ces révisions en souriant. Promis.',
    'Tu es ma réaction préférée : spontanée, lumineuse, irréversible. 💗',
    'Je garde une place au chaud pour toi dans mes bras.',
    'Tu mérites tout le bonheur du monde. Et un 20/20.',
    'Merci d’être exactement toi.',
    'Petit défi du jour : un exercice, un verre d’eau, un sourire.',
    'Je crois en toi comme je crois que le benzène a 6 carbones.',
    'Chaque jour avec toi est mon jour préféré.',
    'Tu illumines tout. Même les tableaux de priorité des fonctions.',
    'Ne compare pas ton chapitre 1 au chapitre 20 de quelqu’un d’autre.',
    'Ma Julie, tu es une merveille. Voilà, c’est dit. 🌷',
    'Si la chimie est l’étude des liaisons, alors je suis expert en toi.',
    'Courage pour aujourd’hui. Et câlin pour ce soir. 🧸',
    'Tu es ma personne préférée dans tout l’univers (et ses molécules).',
  ],
  /** Messages pour les badges (affichés au déblocage). */
  badgeUnlocked: [
    'Nouveau badge débloqué ! Tu le mérites tellement. 🏅💗',
    'Un badge de plus dans ta collection, Julie ! ✨',
  ],
};

// ---------------------------------------------------------------------------
// Badges et récompenses (les conditions sont évaluées dans src/state/rewards.ts)

export const BADGES: { id: string; title: string; emoji: string; description: string }[] = [
  { id: 'premiere-molecule', title: 'Première molécule', emoji: '🧪', description: 'Premier nom de molécule trouvé.' },
  { id: 'premiere-lecon', title: 'Première leçon', emoji: '📖', description: 'Une première leçon validée.' },
  { id: 'bases-solides', title: 'Bases solides', emoji: '🧱', description: 'Module « Les bases » validé.' },
  { id: 'reine-des-alcanes', title: 'Reine des alcanes', emoji: '👑', description: 'Module « Alcanes » validé.' },
  { id: 'experte-ramifications', title: 'Experte des ramifications', emoji: '🌿', description: 'Notion « Alcanes ramifiés » maîtrisée.' },
  { id: 'double-liaison', title: 'Cœur à double liaison', emoji: '💞', description: 'Module « Alcènes et alcynes » validé.' },
  { id: 'reine-des-cycles', title: 'Reine des cycles', emoji: '💍', description: 'Module « Cycles » validé.' },
  { id: 'fonctions', title: 'Princesse des fonctions', emoji: '🎀', description: 'Module « Fonctions » validé.' },
  { id: 'complexes', title: 'Molécules complexes, même pas peur', emoji: '🦋', description: 'Module « Molécules complexes » validé.' },
  { id: '50-exercices', title: '50 exercices', emoji: '⭐', description: '50 exercices réalisés.' },
  { id: '200-exercices', title: '200 exercices', emoji: '🌟', description: '200 exercices réalisés.' },
  { id: '500-exercices', title: '500 exercices', emoji: '💫', description: '500 exercices réalisés.' },
  { id: 'regularite-3', title: 'Petite habitude', emoji: '🌱', description: '3 jours de travail.' },
  { id: 'regularite-7', title: 'Belle régularité', emoji: '🌸', description: '7 jours de travail.' },
  { id: 'regularite-20', title: 'Persévérance en or', emoji: '🌻', description: '20 jours de travail.' },
  { id: 'erreur-vaincue', title: 'Erreur vaincue', emoji: '🛡️', description: 'Une erreur du carnet surmontée.' },
  { id: 'examen-blanc', title: 'Premier examen blanc', emoji: '📝', description: 'Un examen blanc terminé.' },
  { id: 'mention', title: 'Mention très bien', emoji: '🏆', description: 'Au moins 16/20 à un examen blanc.' },
  { id: 'chrono', title: 'Contre la montre', emoji: '⏱️', description: 'Une série chronométrée terminée.' },
  { id: 'lettre-secrete', title: 'Lettre secrète', emoji: '💌', description: 'La lettre secrète a été débloquée.' },
];

/** Autocollants gagnés au fil des leçons terminées (décoratifs uniquement). */
export const STICKERS: { emoji: string; label: string; lessons: number }[] = [
  { emoji: '💗', label: 'Petit cœur', lessons: 1 },
  { emoji: '🌸', label: 'Fleur de cerisier', lessons: 2 },
  { emoji: '🧪', label: 'Éprouvette mignonne', lessons: 3 },
  { emoji: '⭐', label: 'Étoile', lessons: 5 },
  { emoji: '🎀', label: 'Ruban', lessons: 7 },
  { emoji: '🧸', label: 'Nounours', lessons: 9 },
  { emoji: '🌷', label: 'Tulipe', lessons: 11 },
  { emoji: '☁️', label: 'Nuage pastel', lessons: 13 },
  { emoji: '🦄', label: 'Licorne', lessons: 16 },
  { emoji: '💌', label: 'Lettre d’amour', lessons: 19 },
  { emoji: '🌈', label: 'Arc-en-ciel', lessons: 22 },
  { emoji: '👑', label: 'Couronne', lessons: 26 },
  { emoji: '💍', label: 'Bague (on dit ça…)', lessons: 30 },
  { emoji: '🏆', label: 'Trophée', lessons: 35 },
];
