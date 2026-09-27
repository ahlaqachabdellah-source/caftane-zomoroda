# Configuration du projet Supabase de production

> Phase 17 — Ce guide décrit la création et la préparation du projet Supabase
> **hébergé** de production. Toutes les étapes ci-dessous sont des opérations
> manuelles à réaliser par l'équipe d'exploitation : elles n'ont **pas** été
> exécutées depuis l'environnement de développement (aucun accès à un projet
> hébergé). Ce qui a été vérifié automatiquement est indiqué explicitement.

## 1. Créer le projet

1. Sur https://supabase.com/dashboard → **New project**.
2. Choisir l'organisation, le nom (ex. `caftan-zomoroda-prod`), la région la
   plus proche des clientes (Europe de l'Ouest recommandée pour le Maroc) et
   un **mot de passe de base de données fort** (le conserver dans un coffre).
3. Noter le **Project URL** (`https://<ref>.supabase.co`) et la clé
   **`anon` `public`** (Settings → API). La clé `service_role` ne doit
   **jamais** être utilisée côté client ni commitée — l'application n'en a
   pas besoin (toutes les opérations privilégiées passent par des fonctions
   RPC `security definer` définies dans les migrations).

## 2. Appliquer les migrations (jamais de modification manuelle des données)

Les 12 migrations du dossier `supabase/migrations/` (de
`20260926120000_*.sql` à `20260927140000_*.sql`) constituent l'unique source
de vérité du schéma.

```bash
# Depuis la racine du projet, avec la CLI Supabase installée :
supabase link --project-ref <ref-du-projet>
supabase db push
```

**Vérifié automatiquement** : `npm run test:migrations` rejoue les 12
migrations sur une base PostgreSQL vierge et vérifie tables, index,
contraintes (dont la contrainte d'exclusion anti-double-réservation),
triggers, fonctions RPC, RLS sur chaque table publique (≥ 23 politiques),
politiques Storage et le bucket `caftan-images` (public, types MIME
autorisés, limite 10 Mo). 35/35 contrôles au vert.

## 3. Données initiales

```bash
supabase db push --include-seed   # ou : psql ... -f supabase/seed.sql
```

Le seed crée 3 catégories, 10 caftans, 13 images et la ligne singleton
`site_settings` (id = 1).

> ⚠️ **Contenu de production** : l'adresse, les horaires (`10:00–20:00`) et
> le Plus Code (`9QVP+M8G`) du seed sont les **vraies informations de
> l'entreprise** (fournies par la propriétaire). En revanche le téléphone
> WhatsApp (`+212600000000`), le téléphone fixe, l'email
> (`contact@example.com`) et les liens sociaux sont des **espaces
> réservés**. Avant le lancement, les remplacer par les vraies coordonnées
> via le tableau de bord Supabase (Table Editor → `site_settings`) ou SQL :
>
> ```sql
> update public.site_settings
> set whatsapp_number = '+2126XXXXXXXX',   -- vrai numéro WhatsApp Business
>     phone           = '+2125XXXXXXXX',
>     email           = 'contact@votre-domaine.ma',
>     social_links    = '{"instagram": "https://instagram.com/VOTRE-COMPTE", "facebook": "", "tiktok": ""}'
> where id = 1;
> ```
>
> Le bouton/flotteur WhatsApp du site lit ce numéro en base : tant qu'il
> n'est pas réel, ne pas lancer. Les fiches caftans du seed sont du contenu
> de démonstration — la cliente les remplacera via l'admin (voir
> `runbook-client.md`).

## 4. Authentification (Auth → Settings)

- **Site URL** : `https://votre-domaine.ma` (l'URL canonique du site).
- **Redirect URLs** : ajouter
  - `https://votre-domaine.ma/**`
  - `https://votre-domaine.ma/reset-password` (lien de réinitialisation)
- **Email confirmations** : laisser activé (parcours d'inscription vérifié
  en Phase 16 avec confirmation par e-mail).
- **Modèles d'e-mail** : les modèles de marque (français) sont versionnés
  dans `supabase/templates/confirmation.html` et
  `supabase/templates/recovery.html`. Les copier dans
  Auth → Email Templates (Confirm signup / Reset password) en conservant
  les variables `{{ .ConfirmationURL }}` / `{{ .Token }}` etc.

### E-mail sortant (SMTP)

Le fournisseur d'e-mail intégré de Supabase est limité (faible quota,
délivrabilité non garantie) et convient uniquement aux tests. Pour la
production : configurer un SMTP personnalisé (Auth → Settings → SMTP) avec
un domaine expéditeur authentifié (SPF/DKIM/DMARC).

> **Statut honnête** : la délivrabilité des e-mails **n'a pas été testée**
> — aucun envoi réel n'a été effectué depuis cet environnement. Après
> configuration SMTP, effectuer un test réel : créer un compte avec une
> adresse e-mail contrôlée, vérifier la réception du mail de confirmation,
> puis demander une réinitialisation de mot de passe et vérifier sa
> réception. Cocher ce point dans `launch-checklist.md` uniquement après
> ce test.

## 5. Variables d'environnement de l'application

Séparation dev/prod : le fichier `.env` local (développement) n'est jamais
commité ; la production reçoit ses variables via l'hébergeur. Voir
`.env.example` :

| Variable | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` | Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Dashboard → Settings → API → `anon` `public` |
| `VITE_SITE_URL` | URL canonique finale (ex. `https://votre-domaine.ma`) — utilisée pour canonical/hreflang/OG/sitemap |
| `VITE_SENTRY_DSN` | (optionnel) voir `monitoring.md` |
| `VITE_APP_ENV` | `production` |
| `VITE_APP_VERSION` | identifiant de release (SHA git du déploiement) |

**Audit effectué** : aucun secret en dur dans le dépôt ; seules des clés
publiques `anon` (protégées par RLS) sont utilisées côté client ; aucune
clé `service_role` n'apparaît dans le code.

## 6. Compte administrateur

Voir `admin-provisioning.md`. Ne jamais créer d'admin via un parcours
public ni coder d'identifiants en dur.
