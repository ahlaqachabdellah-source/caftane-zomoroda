# Audit final complet — Caftan Zomoroda

> Date : 2026-09-27. Portée : l'intégralité du projet (code, migrations,
> RLS, routes, composants, tests, configuration, déploiement), comparée
> aux exigences d'origine et aux 17 phases. Méthode : inspection réelle
> du code + exécution de toutes les suites — aucune phase n'a été
> considérée correcte « parce que marquée terminée ».

## 1. Statut par phase

| Phase | Statut | Preuves / notes |
|---|---|---|
| 0 — Scaffolding & tooling | **FIXED** | React 19 + TS + Vite 7 + Tailwind + shadcn/ui + ESLint vérifiés. **Prettier manquait → installé** (config, `.prettierignore`, scripts `format`/`format:check`, code formaté, vérifié vert). Singleton client Supabase, pattern env, build/lint/tsc OK. |
| 1 — Base de données | **PASS** | 8 tables, contraintes (dont exclusion anti-chevauchement GiST), 12 index, triggers, bucket + 4 politiques Storage, 23+ politiques RLS — rejoués sur base vierge : 43/43. |
| 2 — Authentification & rôles | **PASS** | Signup/login/logout/reset/confirmation email, routes protégées, rôles via `profiles.role`, trigger `prevent_role_escalation`, auto-promotion impossible (prouvé E2E niveau API). |
| 3 — i18n & routing | **PASS** | /ar /fr /en, i18next paresseux, RTL arabe (E2E), dates/nombres/MAD via Intl, aucun libellé en dur trouvé au scan. |
| 4 — Design system & layout | **PASS** | Logo officiel intact (`src/assets/brand/logo.png`), header/footer/nav/menu mobile, états chargement/vide/erreur, toasts, contrastes AA (Phase 16). |
| 5 — Catalogue public | **FIXED** | **Manquaient : filtres taille/couleur/prix, tri utilisateur, filtre de disponibilité par dates, pagination → tous implémentés** (filtre de dates via nouveau RPC `available_caftan_ids`, pagination 9/page, tests unitaires + E2E). Accueil, hero, à la une, catégories, fiches, galerie, image principale, prix, caution, CTA réservation + WhatsApp : présents. |
| 6 — Location & réservation | **FIXED** | **Les dates occupées n'étaient signalées qu'après envoi → nouveau RPC public `booked_periods` + avertissement inline et bouton désactivé avant envoi** (la contrainte d'exclusion reste l'enforcement, prouvée 23P01). Total calculé serveur (trigger), client ne peut pas le manipuler (politique insert + trigger protect), numéro `CF-AAAA-NNNN` serveur, cycle de vie serveur. **Déviation documentée : pas d'Edge Functions** — leurs fonctions de sécurité sont assurées au niveau Postgres (RLS + triggers + contrainte), enforcement strictement supérieur car indépendant du chemin d'accès. E-mails de réservation : absents (notifications WhatsApp + statuts in-app) — voir §5. |
| 7 — Compte cliente | **PASS** | Tableau de bord, réservations, détail, chronologie, édition profil (nom/téléphone/WhatsApp), annulation en attente, RLS ownership (suites SQL + E2E : A ne voit jamais B). |
| 8 — WhatsApp | **PASS** | Utilitaire réutilisable, wa.me uniquement, numéro lu depuis `site_settings` (jamais en dur), normalisation marocaine, encodage URL, messages FR/AR/EN, flotteur (E2E FR+AR). Pas de Cloud API. |
| 9 — Dashboard admin | **PASS** | Accès admin-only, sidebar/header, KPIs réels via RPCs (`admin_dashboard_kpis`, `admin_recent_activity`) — aucune donnée fictive, RTL vérifié. |
| 10 — Gestion caftans | **PASS** | CRUD complet, champs trilingues, statuts, à la une, slug, multi-upload Storage, suppression/réordonnancement/principale/alt, écriture admin-only (politiques Storage vérifiées). |
| 11 — Réservations & clientes (admin) | **PASS** | Table + filtres, détail, confirmer/refuser/terminer/annuler avec transitions validées serveur (22023), notes internes (table dédiée admin-only), historique audité (trigger), calendrier d'occupation, liste + historique clientes. |
| 12 — Validation & erreurs | **PASS** | Zod partagé (`src/lib/validation/`), ErrorBoundary (+reportError), 404 localisée, retry contrôlé (transient-only, backoff, déduplication du retry PostgREST), mapping d'erreurs SQL→clés i18n, aucune erreur brute affichée. **Déviation documentée : TanStack Query non utilisé** — hooks + `withRetry` maison équivalents (voir §9). |
| 13 — Sécurité | **PASS** | Voir §3. `npm audit` (registre officiel) : **0 vulnérabilité**. Scan de secrets : propre. |
| 14 — Performance | **PASS** | Mesures réelles §9. Transforms d'images Supabase + srcset + lazy, code-splitting (64 chunks), index, polices unicode-range, squelettes. |
| 15 — SEO | **FIXED** | **L'audit a fourni les vraies informations (adresse, horaires, Plus Code) → migration colonnes `opening_hours`/`plus_code`, seed réel, affichage pied de page, JSON-LD LocalBusiness enrichi** (PostalAddress + OpeningHoursSpecification + hasMap). Titres/meta/canonical/hreflang/OG/Twitter/Product+Offer JSON-LD, sitemap, robots, instantanés pré-rendus : vérifiés. |
| 16 — Suite de tests | **PASS** | Tout exécuté, tout vert — §11. Parcours critique client↔admin vérifié en FR et AR/RTL. |
| 17 — Déploiement | **PASS** (préparation) | Build prod, `_redirects`/`vercel.json`, Sentry préparé sans identifiants, drill de restauration réel, docs d'exploitation. Externe : §12. |

## 2. Problèmes critiques restants

**Aucun problème critique non résolu dans le code ou la base.**
Les éléments restants sont des configurations externes manuelles (§12),
dont deux **bloquantes pour le lancement** : vrai numéro WhatsApp et
projet Supabase hébergé.

## 3. Sécurité (protections vérifiées)

- RLS sur les 8 tables publiques ; chaque table a ≥ 1 politique (rejeu vierge).
- Clientes : lecture/écriture strictement limitées à leurs données (prouvé SQL + E2E API).
- Escalade de rôle bloquée par trigger `prevent_role_escalation` + politique profils ; auto-promotion testée : rejetée.
- RPCs admin `security definer` avec garde `is_admin()`, exécution révoquée aux anonymes ; cliente → 42501 (prouvé).
- Anti-double-réservation : contrainte d'exclusion GiST (23P01 prouvé côté serveur même en contournant le client).
- Total réservation : trigger serveur, client ne peut pas le modifier (politique insert force pending/unpaid ; trigger `protect_booking_fields` ; annulation = seul changement cliente autorisé).
- Notes admin : table dédiée, RLS admin-only (séparation physique).
- Rate limiting : trigger `throttle_booking_creation`.
- Storage : bucket public en lecture, écriture admin-only, MIME allowlist, 10 Mo max.
- En-têtes : CSP stricte (scripts 'self'), frame-ancestors 'none', HSTS, nosniff, Referrer/Permissions-Policy (`public/_headers`).
- Secrets : aucun dans le dépôt ni le bundle ; `service_role` jamais côté client ; `npm audit` = 0 vulnérabilité.
- PII monitoring : Sentry v11 sans PII par défaut + masquage email/téléphone dans beforeSend.

## 4. Base de données

13 migrations (12 + `20260927150000_audit_fixes.sql`), rejouées sur base
vierge : **43/43 contrôles**. 8 tables, exclusion GiST, triggers
(numérotation, total, historique, protection champs, rôle, throttle),
11 fonctions dont 2 nouvelles publiques en lecture seule
(`booked_periods`, `available_caftan_ids` — sans données clientes,
exécutables par anon, vérifiées fonctionnellement). Bucket
`caftan-images` + 4 politiques. Seed : catalogue démo + **vraies**
adresse/horaires/Plus Code ; coordonnées téléphoniques = espaces réservés.

## 5. Réservation

Disponibilité : serveur (contrainte) + lisibilité client (RPC périodes
occupées → avertissement avant envoi). Prix : jours × prix/jour calculé
par trigger (jamais le client). Cycle de vie : pending → confirmed/
rejected/cancelled → completed/cancelled, transitions invalides rejetées
(22023), chaque transition auditée dans `booking_status_history`
(immutable, trigger). Confirmation : écran de succès avec numéro réel
uniquement après création en base. **Notifications e-mail de réservation
: inexistantes** (par conception actuelle : suivi in-app + WhatsApp) —
à ajouter uniquement si l'exploitation le demande (nécessite SMTP +
fonction serveur).

## 6. Admin

Dashboard KPIs réels (mois, en attente, revenu confirmé+terminé, top
caftans, activité récente). CRUD caftans complet + images (upload,
ordre, principale, alt). Gestion réservations (filtres, actions de
statut avec motif, notes internes, historique). Calendrier d'occupation.
Clientes (liste, agrégats, historique). Tout passe par des RPCs
autorisées — aucune lecture directe des données d'autrui.

## 7. i18n

FR/AR/EN complets (25 nouvelles clés × 3 pour les correctifs), RTL arabe
vérifié de bout en bout (E2E : inscription → réservation → compte),
dates/nombres/devises via Intl (MAD : « 2.400,00 MAD » fr-MA), bascule
de langue, aucun libellé en dur détecté.

## 8. WhatsApp

Liens `wa.me` uniquement ; numéro normalisé lu depuis `site_settings`
(jamais codé en dur) ; messages pré-remplis localisés (accueil, fiche,
suivi de réservation avec numéro, notification admin) ; flotteur avec
aria-labels FR/AR ; masqué si numéro absent/invalide. Cloud API non
introduite (non requise).

## 9. Performance (mesurée, non estimée)

CDP, profil mobile (1,6 Mbit/s, 150 ms, CPU ×4, 390 px), gzip, médiane
2 passages — build de production après correctifs :

| Route | TTFB | FCP | LCP | Transfert | Requêtes | Tâches longues |
|---|---|---|---|---|---|---|
| `/fr` | 83 ms | 1,86 s | 1,86 s | 716 Ko | 18 | 2 |
| `/fr/caftans` | 49 ms | 1,77 s | 2,22 s | 740 Ko | 32 | 3 |
| `/ar` | 6 ms | 1,98 s | 1,98 s | 853 Ko | 21 | 2 |

Aucun score Lighthouse revendiqué (outil indisponible). Images de
contenu = placeholders 1 px dans le mock : le transfert réel sera
supérieur (optimisations Phase 14 actives : transforms CDN, srcset,
lazy). **Déviation TanStack Query** : hooks + `withRetry` maison
(retry transient-only avec backoff, retry PostgREST interne désactivé
pour éviter la multiplication) — comportement équivalent, bundle plus
léger ; pas de refonte au stade d'audit (risque > bénéfice).

## 10. SEO

Titres/descriptions uniques par page et par locale, canonical, hreflang
fr/ar/en + x-default→fr, OG/Twitter, JSON-LD Product+Offer (données
réelles) et LocalBusiness (**enrichi** : adresse réelle, horaires
10:00–20:00, lien Maps Plus Code — aucun avis/note/coordonnée inventé),
robots.txt, sitemap généré au build (avec `VITE_SITE_URL`), instantanés
pré-rendus /fr /ar /en (1 titre + 1 description + JSON-LD chacun),
noindex sur routes privées. Vérifié par E2E dédié.

## 11. Tests

| Suite | Réussis | Échoués | Ignorés | Bloqués |
|---|---|---|---|---|
| Unitaires/composants (vitest, 53 fichiers) | **344** | 0 | 0 | 0 |
| SQL/RLS embarqués (phases 1+6+7+9+10+11+12+13+14) | tous | 0 | 0 | 0 |
| Vérification migrations base vierge | **43** | 0 | 0 | 0 |
| Drill sauvegarde/restauration | **14** | 0 | 0 | 0 |
| E2E navigateur (build prod, Chromium) | **60** | 0 | 0 | 0 |
| `tsc -b` / ESLint / Prettier | ✅ / 0 erreur (1 avertissement documenté) / ✅ | — | — | — |
| `npm audit` | 0 vulnérabilité | — | — | — |

E2E couvre : parcours critique complet FR + AR/RTL, erreurs, WhatsApp,
filtres catalogue, informations entreprise, responsive, sécurité API.
Honnêteté : l'E2E navigateur s'exécute contre une émulation Supabase
fidèle (RLS/triggers/RPCs) — la logique SQL réelle est prouvée
séparément par les suites PostgreSQL embarqué ; l'hébergé n'était pas
joignable depuis cet environnement.

## 12. Déploiement

### DONE (vérifié)
Build prod vert ; hébergement préparé (`_redirects`, `vercel.json`,
routes localisées) ; intégration Sentry prête (inerte sans DSN, 0 octet
par défaut) ; drill de restauration réel ; scan de secrets ; en-têtes de
sécurité ; docs complètes (`production-setup`, `backup-restore`,
`monitoring`, `admin-provisioning`, `runbook-client`,
`dns-search-console`, `launch-checklist`) ; scripts reproductibles
(`test:migrations`, `test:drill`, `test:e2e`, perf).

### REQUIRES MANUAL CONFIGURATION (jamais prétendu fait)
1. Projet Supabase hébergé + `db push` + seed — **bloquant**
2. Vrai numéro WhatsApp (+ téléphone/email/réseaux) dans `site_settings` — **bloquant**
3. Domaine réel → `VITE_SITE_URL`, DNS, HTTPS
4. Déploiement hébergeur + vérification en ligne des routes localisées
5. SMTP + test réel de délivrabilité (non effectué)
6. Sentry : DSN, source maps, événement de test
7. Moniteur uptime + alerte de test
8. Provisioning admin (SQL tableau de bord)
9. Sauvegardes hébergées/PITR + drill hébergé (non effectué)
10. Search Console + sitemap (après mise en ligne)
11. Contenu réel (caftans/photos) par la cliente

## 13. État final

Tous les correctifs de l'audit sont implémentés et vérifiés ; aucune
régression (344 unitaires, 43 migration, 14 drill, 60 E2E, tsc, lint,
prettier, audit npm — tout vert). **Le site n'est pas en ligne** : la
mise en production exige les configurations manuelles du §12.

**PRODUCTION-READY** — sous réserve d'exécuter les 11 configurations
manuelles du §12 (dont 2 bloquantes : Supabase hébergé et vrai numéro
WhatsApp). Ce statut porte sur le code, la base et la préparation ;
il ne prétend ni perfection ni sécurité absolue, et ne signifie pas
que le site est déployé.
