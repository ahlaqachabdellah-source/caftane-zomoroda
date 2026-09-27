# Rapport de préparation à la production — Caftan Zomoroda

> **Phase 17 (finale)** — Date : 2026-09-27.
> Ce rapport sépare strictement ce qui est **TERMINÉ ET VÉRIFIÉ** de ce qui
> **RESTE À CONFIGURER MANUELLEMENT**. Aucune configuration externe n'est
> déclarée réussie sans avoir été réellement effectuée. **Le site n'est
> pas encore en ligne** : aucun déploiement public n'a été effectué depuis
> cet environnement.

---

## A. TERMINÉ ET VÉRIFIÉ (preuves à l'appui)

### A.1 Build & qualité du code

| Contrôle | Résultat |
|---|---|
| Build de production (`tsc -b` + `vite build`) | ✅ vert |
| TypeScript (`tsc -b`, vérification réelle de projet) | ✅ 0 erreur |
| ESLint | ✅ 0 erreur, 1 avertissement documenté (`react-hooks/incompatible-library` sur `watch()` de react-hook-form dans BookingPage — pattern de bibliothèque, non corrigeable sans contourner la librairie) |
| Tests unitaires/composants | ✅ **331/331** (52 fichiers) |
| Suites SQL embarquées (phases 1+6+7+9+10+11+12+13+14) | ✅ toutes vertes |
| Vérification des migrations sur base vierge | ✅ **35/35** (`npm run test:migrations`) |
| Exercice de restauration (drill) | ✅ **14/14** (`npm run test:drill`) — sauvegarde logique JSONB → base vierge → restauration → comptages, arabe intact, triggers et RLS fonctionnels sur la base restaurée |

### A.2 Bundle de production

- 64 chunks JS avec code-splitting par route ; entrée ~272 Ko (non
  compressé) + vendeurs (react, supabase, i18n) en chunks séparés mis en
  cache.
- **Sentry absent du bundle par défaut** (0 octet — éliminé à la
  compilation sans DSN ; avec DSN : chunk séparé ~444 Ko chargé à la
  demande, hors chemin critique). Vérifié par inspection du build.
- Source maps **cachées** quand `VITE_SENTRY_DSN` est défini (65 fichiers
  `.map` sans commentaire `sourceMappingURL` — vérifié).

### A.3 Tests E2E navigateur (build de production, Chromium réel)

**45/45** contrôles (`npm run test:e2e`, contre l'émulation Supabase
stateful fidèle aux migrations : RLS, triggers, transitions de cycle de
vie, gardes admin) :

- **Fumée (12)** : 3 locales — titre localisé, `dir` correct (rtl ar),
  catalogue alimenté par la base, zéro erreur console.
- **Parcours critique FR (9)** : inscription → catalogue → fiche →
  réservation (estimation 3 j × 800 MAD = 2 400 MAD) → numéro
  `CF-AAAA-NNNN` → « En attente » → connexion admin → confirmation →
  la cliente voit « Confirmée » (liste + chronologie du détail).
- **Parcours critique AR/RTL (5)** : même parcours en arabe, RTL vérifié
  à chaque étape.
- **Erreurs (6)** : identifiants invalides, caftan inexistant, route 404,
  /admin anonyme → connexion, /admin cliente → « Accès réservé », conflit
  de dates → message localisé (23P01).
- **WhatsApp (3)** : flotteur `wa.me/212600000000` + message pré-rempli,
  aria-labels FR/AR.
- **Responsive (4)** : aucun débordement horizontal à 390 px (FR/AR,
  accueil + catalogue).
- **Sécurité API (6)** : RPC admin refusée à une cliente (42501),
  auto-promotion de rôle impossible, mise à jour de profil hors rôle OK,
  réservations anonymes refusées (401), réservations filtrées par appelant
  (RLS), transition de cycle de vie invalide rejetée (22023).

> Note honnête : les suites E2E navigateur des phases 10–16 ont été
> reconstruites et **consolidées** dans `tests/e2e/` (elles vivaient en
> `/tmp` et ont été perdues entre sessions) — elles sont désormais
> versionnées dans le dépôt et rejouables à tout moment.

### A.4 Performance (mesurée, pas estimée)

Mesures réelles via Chrome DevTools Protocol, profil mobile
(1,6 Mbit/s, 150 ms RTT, CPU ×4, 390 px), gzip activé comme en
hébergement réel, médiane de 2 passages :

| Route | TTFB | FCP | LCP | Transfert | Requêtes | Tâches longues |
|---|---|---|---|---|---|---|
| `/fr` | 47 ms | 2,13 s | 2,13 s | 714 Ko | 18 | 2 |
| `/fr/caftans` | 84 ms | 1,87 s | 2,36 s | 738 Ko | 32 | 3 |
| `/ar` | 48 ms | 2,20 s | 2,20 s | 851 Ko | 21 | 2 |

Lighthouse n'étant pas disponible dans cet environnement, **aucun score
Lighthouse n'est revendiqué** — uniquement ces valeurs mesurées. Les
images du catalogue étaient des placeholders 1 px dans le mock : le
transfert réel avec de vraies photos sera plus élevé (les optimisations
Phase 14 — redimensionnement CDN, srcset, lazy-loading — s'appliqueront).

### A.5 Sécurité

- Scan de secrets : **aucun** secret, clé `service_role` ou mot de passe
  en dur dans le dépôt ; pas de fichier `.env` ; `.env.example` ne
  contient que des espaces réservés. (Identifiants `AdminPass123!` etc. :
  comptes de test du mock E2E uniquement, jamais dans le bundle.)
- Aucune clé `service_role` dans le bundle (vérifié par recherche sur
  `dist/assets/*.js`).
- RLS vérifiée sur chaque table publique (suites SQL + E2E API).
- En-têtes/codes : RPC privilégiées `security definer` avec garde
  `is_admin()`, exécution révoquée aux anonymes (migrations).
- Audit des dépendances : voir CI (`npm ci` reproductible).

### A.6 SEO & accessibilité

- Métadonnées localisées uniques, canonical, hreflang (fr/ar/en +
  x-default→fr), OG/Twitter, JSON-LD Product+Offer (données réelles) et
  LocalBusiness (seules données réelles : nom, WhatsApp).
- Instantanés pré-rendus vérifiés : 1 titre localisé + 1 description +
  JSON-LD par locale, aucune duplication.
- `robots.txt` prêt ; `sitemap.xml` généré au build dès que
  `VITE_SITE_URL` est défini.
- Accessibilité : corrections AA Phase 16 (contrastes or 5,2:1 / 7,2:1),
  audit axe effectué en Phase 16.

### A.7 Préparations livrées (code + docs)

- `public/_redirects` (Netlify) et `vercel.json` (Vercel) : fallback SPA
  avec priorité aux fichiers réels (instantanés de locales servis
  directement).
- `src/lib/monitoring.ts` : intégration Sentry prête, inerte sans DSN,
  PII masquée, `ErrorBoundary` branché.
- Documentation d'exploitation (`docs/deployment/`) :
  `production-setup.md`, `backup-restore.md`, `monitoring.md`,
  `admin-provisioning.md`, `runbook-client.md` (guide cliente en
  français), `dns-search-console.md`, `launch-checklist.md`.
- Scripts reproductibles : `test:migrations`, `test:drill`, `test:e2e`,
  `tests/e2e/perf.mjs`.

---

## B. RESTE À CONFIGURER MANUELLEMENT (jamais prétendu fait)

| # | Élément | Document de référence |
|---|---|---|
| 1 | **Projet Supabase hébergé de production** : création, `supabase db push`, seed | `production-setup.md` |
| 2 | **Vraies coordonnées** dans `site_settings` (WhatsApp, téléphone, email, adresse) — bloquant | `production-setup.md` §3 |
| 3 | **Domaine réel** : enregistrement, `VITE_SITE_URL`, DNS, HTTPS | `dns-search-console.md` |
| 4 | **Déploiement hébergeur** (Netlify ou Vercel) + vérification des routes localisées en ligne | `launch-checklist.md` §1 |
| 5 | **SMTP personnalisé** + test réel de délivrabilité (confirmation + réinitialisation) — **non vérifié** | `production-setup.md` §4 |
| 6 | **Sentry** : compte, DSN, upload des source maps, événement de test reçu | `monitoring.md` |
| 7 | **Moniteur de disponibilité** : création + alerte de test réelle | `monitoring.md` |
| 8 | **Compte administrateur** : inscription + SQL `role='admin'` via tableau de bord | `admin-provisioning.md` |
| 9 | **Sauvegardes hébergées** : vérifier les backups quotidiens, activer PITR, exercice de restauration hébergée — **non effectué** | `backup-restore.md` |
| 10 | **Search Console** : validation de propriété + soumission du sitemap — après mise en ligne | `dns-search-console.md` |
| 11 | **Contenu réel** : saisie des caftans/photos/traductions par la cliente | `runbook-client.md` |

---

## C. Décisions et limites assumées

- **Pas de domaine codé en dur** : l'URL canonique vient de
  `VITE_SITE_URL` ; dans les instantanés actuels elle vaut l'origine de
  pré-rendu (localhost) et deviendra correcte au déploiement avec la
  variable définie.
- **WhatsApp** : liens `wa.me` uniquement ; la Cloud API n'a pas été
  introduite (inutile à ce stade).
- **E-mail** : modèles prêts et versionnés ; délivrabilité non testée
  (aucun envoi réel possible ici).
- **Monitoring** : intégration préparée sans identifiants inventés ;
  aucune fausse configuration ajoutée.
- **Admin** : uniquement via le mécanisme de rôle existant ; aucun
  parcours public d'élévation, aucun identifiant codé en dur.
- **Le site n'est pas déclaré en ligne** : il est prêt pour le
  déploiement ; la mise en ligne effective relève des étapes manuelles
  ci-dessus.
