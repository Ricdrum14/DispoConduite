# Cahier des charges — Bot de veille & réservation de créneaux de conduite
### Nom de projet provisoire : "Dispo Conduite" (à renommer — suggestions en fin de doc)

---

## 1. Résumé exécutif

Je veux créer une application qui surveille en continu les créneaux de conduite disponibles chez mon auto-école (**Stych, à Strasbourg**), selon mes préférences (jours, horaires, moniteur), et qui réserve automatiquement la leçon dès qu'un créneau correspondant apparaît — puis me notifie. Je suis moi-même élève chez Stych à Strasbourg, donc le projet démarre avec mon propre compte et mon propre usage, avant d'envisager de l'élargir à d'autres élèves.

**Problème que je vis :** Stych, comme beaucoup d'auto-écoles en ligne, souffre d'une pénurie de moniteurs qui rend les créneaux de conduite rares et imprévisibles. Il faut surveiller manuellement l'app/le site en permanence pour espérer en attraper un avant qu'il ne parte. C'est un problème très répandu chez les élèves Stych (plusieurs témoignages évoquent plusieurs mois d'attente pour obtenir un créneau).

---

## 2. Objectifs

- Ne plus perdre de temps à rafraîchir manuellement le site/l'app Stych pour chercher un créneau.
- Être alerté et pouvoir réserver dès qu'un créneau correspondant à mes préférences se libère, même si je ne suis pas devant mon téléphone au bon moment.
- Avoir une expérience de préférences fluide, inspirée d'apps comme Karos (préférences récurrentes, alertes en temps réel, validation en un tap).
- Valider le concept sur mon propre usage avant d'envisager de le proposer à d'autres élèves.

---

## 3. Utilisateurs cibles

| Persona | Besoin |
|---|---|
| **Moi (usage V0)** | Élève chez Stych à Strasbourg, je teste le bot sur mon propre compte pour trouver mes créneaux plus vite |
| **Autres élèves Stych (cible V1)** | Le même besoin que moi, à Strasbourg puis dans d'autres villes couvertes par Stych |
| **Élèves d'autres auto-écoles en ligne (cible V2)** | Même logique, à adapter au système propriétaire de chaque auto-école |

Important : le bot fonctionne **avec mon propre compte élève Stych** (le même accès que j'utilise déjà manuellement pour vérifier mes créneaux), pas via un accord commercial ou une API officiellement fournie par Stych. Voir section 7 pour les implications techniques de ce choix.

---

## 4. Périmètre du MVP

- Auto-école ciblée : **Stych**, agence de **Strasbourg**.
- Un seul compte élève au départ : le mien.
- Un seul type de créneau : leçon de conduite (pas le code, pas les rendez-vous pédagogiques). Les dates d'examen restent en scope secondaire, voir section 6.
- Réservation : dans un premier temps **semi-automatique** (le bot détecte + me propose, je confirme en un tap), avec option auto-book activable une fois que j'ai validé que le comportement du système Stych est fiable et sûr.

---

## 5. Parcours utilisateur cible

1. **Onboarding** — je renseigne : mon compte Stych (identifiants), mon agence (Strasbourg).
2. **Mes préférences façon Karos** — écran type "swipe/toggle" pour définir :
   - jours de la semaine récurrents (ex : lundi, mercredi, samedi)
   - plages horaires préférées (matin / midi / soir / créneau précis)
   - fréquence souhaitée (1 leçon/semaine, dès que possible, etc.)
   - moniteur préféré (optionnel, si Stych permet de filtrer par moniteur)
3. **Veille automatique** — le bot interroge régulièrement le système Stych et compare avec mes préférences.
4. **Alerte temps réel** — notification push/SMS dès qu'un créneau matche : "Un créneau se libère mercredi 10h chez Stych — Réserver ?"
5. **Réservation** — un tap pour confirmer (ou auto-book si activé).
6. **Confirmation & rappel** — confirmation immédiate + rappel avant la leçon.
7. **Tableau de bord** — historique de mes leçons, heures effectuées, progression, temps moyen d'attente entre deux créneaux trouvés.

---

## 6. Fonctionnalités détaillées

### Recherche multi-critères
- Auto-école : Stych, agence Strasbourg (extensible plus tard à d'autres agences Stych ou d'autres villes)
- Moniteur (optionnel, si l'info est exposée par Stych)
- Jour(s) de la semaine
- Plage horaire (matin/après-midi/soir + horaires précis)
- **Type de créneau : "leçon de conduite" ou "place d'examen"** (toggle) — Stych gère en général lui-même la recherche de place d'examen une fois que je suis apte, donc ce n'est pas ma priorité, mais je garde le module prévu pour ne pas fermer la porte plus tard (le fonctionnement est proche : détection + alerte + réservation).

### Préférences type "Karos"
- Interface de sélection rapide de mes créneaux récurrents (grille semaine type calendrier avec tap pour activer/désactiver des cases)
- Sauvegarde de plusieurs "profils de recherche" (ex : "semaine normale" vs "vacances")
- Priorité/pondération : "je préfère le matin mais j'accepte l'après-midi si rien d'autre"

### Veille & matching
- Scan périodique de l'API/système Stych (voir section 7)
- Comparaison automatique avec mes critères, sans action de ma part

### Réservation
- Mode "proposition + confirmation manuelle" (MVP, recommandé)
- Mode "auto-book" (plus tard, une fois le système bien testé)
- Annulation / replanification simple

### Notifications
- Push app, email, SMS (à mon choix)
- Notification immédiate dès qu'un créneau matche mes préférences

### Tableau de bord
- Nombre d'heures effectuées / restantes
- Historique des créneaux trouvés et réservés
- Statistiques : délai moyen d'attente, taux de créneaux manqués

---

## 7. Contrainte technique majeure à anticiper

Stych n'est pas construit sur un logiciel de planning générique connu (type Ornikar Pro, Klaxo, SetTime) : c'est une plateforme propriétaire, avec son propre site (stych.fr) et sa propre application mobile ("Code et Conduite by Stych"). Je devrai donc identifier moi-même comment son système expose les créneaux disponibles.

Approche technique privilégiée :
- **Inspecter les requêtes réseau de stych.fr** (via les outils développeur du navigateur, onglet Réseau/Network) pendant que je consulte mes créneaux normalement — pour repérer l'appel API interne qui renvoie la liste des disponibilités en JSON, et comment il s'authentifie (cookie de session ou token).
- Si cette API est identifiable, le bot peut l'appeler directement avec mes identifiants, sans avoir besoin de piloter un vrai navigateur (plus léger et plus fiable qu'un scraper visuel).
- Si aucune API exploitable n'est trouvée, solution de repli : automatisation de navigateur (Playwright), qui se connecte avec mes identifiants et lit les créneaux affichés à l'écran — plus lourd et plus fragile (casse si Stych change son interface).
- **Interroger, pas déranger** : vérifier les créneaux à intervalle raisonnable (ex : toutes les 5-15 min plutôt qu'en boucle continue), pour rester discret et éviter tout blocage.
- **Pas de garantie de stabilité** : Stych peut faire évoluer son site/app sans prévenir — le bot pourra casser et nécessiter un ajustement.
- Si j'élargis plus tard à d'autres élèves Stych ou à d'autres auto-écoles, il faudra gérer plusieurs "connecteurs" différents un par un — mais ça reste une V2, pas une préoccupation du prototype.

---

## 8. Exigences non-fonctionnelles

- **RGPD** : mes données (coordonnées, heures de conduite) hébergées en UE, même si je suis pour l'instant le seul utilisateur.
- **Fiabilité** : la notification de créneau doit m'arriver en quelques secondes après publication (peu de valeur sinon, les créneaux partent vite chez Stych).
- **Sécurité** : stockage sécurisé de mes identifiants Stych (idéalement token de session plutôt que mot de passe en clair).
- **Scalabilité** : architecture pensée pour passer de mon usage perso à plusieurs élèves Stych sans refonte complète.

---

## 9. Direction design/UX (originale)

Objectif : éviter l'esthétique "logiciel de gestion d'auto-école" (souvent daté, formulaires gris). Inspiration à donner à Base44 :

- **Univers visuel "route/trajet"** façon Karos/BlaBlaCar : lignes de route stylisées, timeline horizontale pour représenter la semaine plutôt qu'un calendrier classique en grille.
- **Écran de préférences en swipe** : cartes façon "dating app" pour accepter/refuser rapidement des créneaux types (matin/soir, jours), au lieu de cases à cocher austères.
- **Notification créneau = carte animée** qui "arrive" comme une opportunité à saisir vite (sentiment d'urgence positive, sans être anxiogène).
- **Couleurs** : sortir du bleu/gris classique des logiciels d'auto-école — palette énergique (ex : un accent vif type orange/corail sur fond neutre) pour évoquer mouvement et disponibilité plutôt qu'administratif.
- **Micro-copywriting humain** : "Un créneau vient de se libérer 🚗" plutôt que "Nouvelle disponibilité détectée."

---

## 10. Modèle économique (vision à terme)

- Phase 1 : usage personnel gratuit, sur mon compte Stych.
- Phase 2 : élargissement à d'autres élèves Stych à Strasbourg, gratuit ou freemium.
- Phase 3 : approche B2B2C — proposer l'outil à d'autres auto-écoles en ligne comme solution de remplissage de créneaux, avec un angle "matching + alertes temps réel" côté élève.

---

## 11. Roadmap suggérée

1. **V0 (moi, Stych Strasbourg)** : j'identifie l'API/le système de Stych, je connecte le bot à mon compte → matching + notification pour moi-même.
2. **V1 (élèves Stych Strasbourg)** : interface complète (préférences façon Karos, notifications, réservation semi-auto), ouverte à d'autres élèves Stych.
3. **V2 (extension)** : d'autres villes/agences Stych, auto-book, puis éventuellement d'autres auto-écoles en ligne.

---

## 12. Points de vigilance

- J'utilise mon propre compte élève = accès légitime, mais l'automatisation d'un site tiers (même avec mes identifiants) peut être contraire aux conditions d'utilisation de Stych — à garder en tête, surtout avant d'élargir à d'autres élèves.
- Rester discret techniquement (fréquence de vérification raisonnable) pour ne pas me faire bloquer ni gêner le fonctionnement normal du système Stych.
- Avant d'élargir à d'autres élèves, il vaudra mieux envisager d'en parler ouvertement avec Stych plutôt que de rester dans un usage "caché" — plus simple à maintenir et à développer ensuite.
- Prévoir les CGU/consentement RGPD dès que des données d'élèves autres que moi sont utilisées.

---

## Suggestions de nom
DispoConduite · Créneau · PermiGo · RouteLibre · Volanty

---

## Annexe technique — API interne Stych identifiée

*Cette annexe documente les découvertes concrètes issues de l'inspection de stych.fr, à donner telle quelle à Base44 pour construire le connecteur.*

### Authentification
- Session utilisateur classique (cookie de session après connexion sur stych.fr).
- Un **jeton CSRF** (`token_csrf`) doit être joint à chaque requête. Il est injecté dans le HTML de chaque page côté serveur (probablement renouvelé à chaque chargement de page ou à chaque session) — le bot devra donc récupérer une page authentifiée d'abord pour en extraire ce token avant d'appeler l'API.

### Endpoint principal — détection des créneaux
```
POST https://www.stych.fr/elearning/planning-conduite/get-planning-proposition
```
**Paramètres envoyés (Form Data) :**
| Paramètre | Description |
|---|---|
| `token_csrf` | jeton de sécurité (obligatoire) |
| `calledFromFilter` | `0` = pas de filtre (renvoie tous les créneaux dispo), `1` = filtré |
| `ids_lac` *(optionnel)* | filtrer par lieu(x) de cours |
| `ids_ut_moniteur` *(optionnel)* | filtrer par moniteur(s) |
| `aryDuration` *(optionnel)* | filtrer par durée (45 ou 90 min) |
| `aryIdDay` *(optionnel)* | filtrer par jour (1=Lundi → 7=Dimanche) |
| `timesPref` *(optionnel)* | filtrer par tranche horaire (créneaux de 2h : 6-8h, 8-10h... jusqu'à 20-22h) |

**Recommandation :** appeler sans filtre (`calledFromFilter: 0`) pour récupérer tous les créneaux disponibles, puis laisser le bot faire le matching avec mes préférences — plus simple que de répliquer la logique de filtres de Stych.

**Réponse JSON :**
```json
{
  "statut": "OK",
  "rowsProposition": [ /* liste des créneaux — VIDE si rien de dispo */ ],
  "rowsMoniteur": [ /* liste des moniteurs */ ],
  "rowsPointDeCours": [ /* liste des lieux */ ],
  "nbCreditAvailable": 13,
  "nbCreditSelected": 0,
  "idTypeCoursSearched": 2,
  "typeCoursSearched": "Leçon de conduite",
  "planningTimer": 0,
  "readOnly": 0
}
```

**Signal de détection pour le bot :** `rowsProposition.length > 0` → un ou plusieurs créneaux sont disponibles, il faut notifier/agir.

**Structure d'un élément de `rowsProposition` (déduite du code de rendu) :**
```json
{
  "id_user": "...",        // id du moniteur
  "moniteur": "...",       // nom du moniteur affiché
  "id_lac": "...",         // id du lieu de cours
  "ids_lac_possible": [...],
  "info_date": "...",      // date du cours
  "id_jour": "...",        // jour de la semaine (1-7)
  "heure_debut": "17:30", "heure_fin": "19:00",     // format brut
  "heure_debut_fr": "...", "heure_fin_fr": "...",   // format affiché
  "nb_credit": "...",      // coût en crédits
  "nb_heure": "..."        // durée en heures (0.75 = 45min, 1.5 = 90min)
}
```

### Endpoint de vérification avant réservation
```
POST https://www.stych.fr/elearning/planning-conduite/is-cours-available
```
Paramètres : `id_type_cours_conduite`, `rowsPropositionSelected` (le créneau choisi). À appeler juste avant de réserver, pour confirmer que le créneau est toujours libre (anti-conflit avec d'autres élèves).

### Endpoint de réservation finale
```
POST https://www.stych.fr/elearning/planning-conduite/confirm-planning-proposition
```
Mêmes paramètres que ci-dessus. C'est l'appel qui valide réellement la réservation.

### Autres endpoints utiles (gestion des préférences côté Stych)
| Endpoint | Usage |
|---|---|
| `/elearning/planning-conduite/get-preference-planning` | lire mes préférences enregistrées |
| `/elearning/planning-conduite/record-preference-planning` | enregistrer des préférences |
| `/elearning/planning-conduite/get-point-de-cours-preference` | lire mes points de cours favoris |
| `/elearning/planning-conduite/add-point-de-cours` | ajouter un point de cours favori |
| `/elearning/planning-conduite/record-point-de-cours-preference` | enregistrer mes disponibilités par jour pour un point de cours |
| `/elearning/planning-conduite/find-point-de-cours` | chercher le point de cours le plus proche d'une adresse |

### Point de vigilance technique
Un mécanisme de "timer" (`planningTimer`) existe côté Stych : quand un lot de créneaux est proposé avec un compte à rebours actif, la page redirige automatiquement une fois le temps écoulé. Le comportement exact quand on rappelle l'API après expiration (nouveau lot de créneaux ou nécessité de relancer une "session" de recherche) reste à vérifier en conditions réelles, idéalement le jour où un créneau apparaît enfin.
