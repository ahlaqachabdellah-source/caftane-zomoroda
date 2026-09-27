# Checklist de lancement — Caftan Zomoroda

> Phase 17 — Légende :
> **[Fait]** = vérifié automatiquement dans l'environnement de développement
> (preuve disponible). **[À faire]** = configuration manuelle externe,
> **jamais** cochée sans avoir été réellement effectuée.

## 1. Domaine & hébergement

- [À faire] Enregistrer le domaine définitif.
- [À faire] Créer le site chez l'hébergeur (Netlify **ou** Vercel — les
  deux configurations sont prêtes : `public/_redirects` / `vercel.json`).
- [À faire] Définir les variables d'environnement chez l'hébergeur
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`,
  `VITE_APP_ENV=production`, `VITE_APP_VERSION`, `VITE_SENTRY_DSN` si Sentry).
- [À faire] Configurer le DNS et vérifier le certificat HTTPS
  (voir `dns-search-console.md`).
- [À faire] Vérifier en production : accès direct et rechargement de
  `/fr`, `/ar`, `/en`, `/fr/caftans`, `/fr/account` (fallback SPA) — les
  instantanés pré-rendus des locales doivent être servis en priorité.
- [Fait] Fallback SPA et exclusions d'assets configurés (`_redirects`,
  `vercel.json`) ; routes localisées `/ar` `/fr` `/en` vérifiées en E2E.
- [Fait] Aucun domaine codé en dur : canonical/hreflang/OG/sitemap
  dérivent de `VITE_SITE_URL` (repli : origine courante).

## 2. Base de données (Supabase hébergé)

- [À faire] Créer le projet de production et appliquer les 12 migrations
  (`supabase db push`) — voir `production-setup.md`.
- [À faire] Appliquer le seed, puis remplacer les coordonnées
  factices de `site_settings` (WhatsApp, téléphone, email, liens sociaux)
  — **bloquant pour le lancement** (le bouton WhatsApp lit ce numéro).
  L'adresse, les horaires et le Plus Code du seed sont déjà les vraies
  informations de l'entreprise.
- [À faire] Copier les modèles d'e-mail (`supabase/templates/`) dans
  Auth → Email Templates.
- [À faire] Configurer le SMTP personnalisé (Auth → Settings → SMTP).
- [À faire] **Test réel de délivrabilité** : inscription avec une adresse
  contrôlée + réinitialisation de mot de passe. (Non effectué ici :
  aucun envoi réel n'a été testé.)
- [À faire] Vérifier les sauvegardes quotidiennes ; activer PITR si
  l'offre le permet ; planifier l'exercice de restauration hébergée
  (voir `backup-restore.md` — non effectué sur l'hébergement).
- [Fait] Migrations rejouées sur base vierge : 35/35 contrôles
  (`npm run test:migrations`).
- [Fait] Exercice réel de sauvegarde/restauration logique : 14/14
  (`npm run test:drill`).
- [Fait] RLS sur chaque table publique, ≥ 23 politiques, contrainte
  anti-double-réservation, triggers de numérotation/total — vérifiés.

## 3. Application

- [Fait] Build de production vert (`tsc -b` + `vite build`), 0 erreur
  TypeScript, lint 0 erreur (1 avertissement documenté, pattern
  react-hook-form).
- [Fait] 331/331 tests unitaires/composants (52 fichiers).
- [Fait] Suites SQL embarquées phases 1+6+7+9+10+11+12+13+14 vertes.
- [Fait] E2E navigateur 45/45 sur le build de production : parcours
  critique inscription→réservation→confirmation admin→statut cliente
  (FR + AR/RTL), erreurs, WhatsApp, responsive 390px, sécurité API.
- [Fait] États de chargement/vide/succès/erreur présents (tests
  composants + E2E).
- [Fait] Aucune donnée fictive dans l'application : tout vient de la
  base ; sans configuration le site affiche un état explicite, pas du
  contenu inventé.

## 4. SEO

- [Fait] Titres/descriptions localisés uniques par page, canonical,
  hreflang (fr/ar/en + x-default), Open Graph, Twitter Cards.
- [Fait] JSON-LD Product+Offer et LocalBusiness — données réelles
  uniquement (aucun prix/avis/adresse inventé).
- [Fait] Instantanés pré-rendus `/fr` `/ar` `/en` : exactement 1 titre
  localisé + 1 description + JSON-LD par instantané (vérifié).
- [Fait] `robots.txt` ; `sitemap.xml` généré au build quand
  `VITE_SITE_URL` est défini (sinon ignoré proprement).
- [À faire] Après mise en ligne : valider la propriété Search Console et
  soumettre le sitemap (voir `dns-search-console.md`).

## 5. Supervision

- [Fait] Intégration Sentry préparée sans identifiants : chargement
  paresseux (0 octet dans le bundle par défaut), masquage PII, source
  maps cachées avec DSN — voir `monitoring.md`.
- [À faire] Créer le projet Sentry, définir `VITE_SENTRY_DSN`,
  téléverser les source maps, provoquer une erreur de test et confirmer
  sa réception.
- [À faire] Créer un moniteur de disponibilité (uptime) et recevoir une
  alerte de test réelle.

## 6. Administration & contenu

- [À faire] Provisionner le compte admin selon `admin-provisioning.md`
  (inscription normale + SQL `role='admin'` via le tableau de bord —
  jamais de parcours public, jamais d'identifiants codés en dur).
- [À faire] Saisie du contenu réel par la cliente selon
  `runbook-client.md` (caftans, photos, traductions, catégories).
- [Fait] Mécanisme de rôles vérifié : auto-promotion impossible (test
  E2E niveau API), colonne `role` non modifiable côté client.

## 7. WhatsApp & e-mail

- [Fait] WhatsApp en liens `wa.me` uniquement (numéro lu en base, message
  pré-rempli localisé) — vérifié E2E en FR et AR. Pas de Cloud API.
- [À faire] Renseigner le vrai numéro WhatsApp Business dans
  `site_settings` puis tester le flotteur sur le site en ligne.
- [À faire] Test réel d'envoi d'e-mails (voir §2) — **non vérifié** à ce
  stade.
