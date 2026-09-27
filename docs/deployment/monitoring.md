# Supervision : erreurs (Sentry) et disponibilité (uptime)

> Phase 17 — L'intégration est **préparée dans le code** mais **aucune
> configuration externe n'a été créée** (pas de compte, pas de DSN, pas de
> moniteur). Les étapes ci-dessous restent à faire manuellement.

## 1. Supervision des erreurs — Sentry (préparé, inactif sans DSN)

### Ce qui est déjà en place dans le code

- `src/lib/monitoring.ts` : initialisation paresseuse — `@sentry/react`
  n'est chargé (import dynamique) **que si** `VITE_SENTRY_DSN` est défini
  au moment du build. Sans DSN, le SDK est totalement éliminé du bundle
  (vérifié : 0 octet Sentry dans le build par défaut ; avec DSN, chunk
  séparé chargé à la demande, hors du chemin critique).
- Confidentialité : le SDK v11 n'envoie aucune PII par défaut ; de plus
  `beforeSend` masque e-mails et téléphones dans les messages et fils
  d'Ariane, et ne conserve que l'identifiant pseudonyme `user.id`.
  Les URL `/auth/v1/` sont exclues (`denyUrls`) — jamais de jetons.
- `ErrorBoundary` signale les erreurs React via `reportError`.
- Source maps : quand `VITE_SENTRY_DSN` est présent au build, Vite émet
  des source maps **cachées** (pas de commentaire `sourceMappingURL` —
  vérifié) à téléverser chez Sentry puis à ne pas servir publiquement.

### Étapes manuelles restantes

1. Créer un compte sur https://sentry.io et un projet **React**.
2. Copier le **DSN** (Project Settings → Client Keys).
3. Définir les variables d'environnement chez l'hébergeur :
   `VITE_SENTRY_DSN`, `VITE_APP_ENV=production`,
   `VITE_APP_VERSION=<sha-du-déploiement>`.
4. (Recommandé) Téléverser les source maps au déploiement :
   ```bash
   npx @sentry/cli sourcemaps upload \
     --org <org> --project <projet> --release "$VITE_APP_VERSION" \
     dist/assets
   # puis supprimer les .map avant la mise en ligne
   ```
5. Vérifier la réception d'un événement : provoquer une erreur de test
   contrôlée sur l'environnement de préproduction et confirmer qu'elle
   apparaît dans Sentry. **Cette vérification n'a pas été faite** (pas de
   DSN disponible).

## 2. Supervision de disponibilité (uptime)

Aucun moniteur n'a été configuré (pas de fausse configuration). Étapes
recommandées après le déploiement :

1. Choisir un service (ex. UptimeRobot, Better Stack, Checkly — offre
   gratuite suffisante au lancement).
2. Créer un moniteur HTTP(S) sur `https://votre-domaine.ma/fr` (réponse
   200 attendue), intervalle 5 min.
3. Ajouter une alerte (e-mail/SMS/Slack) vers l'équipe d'exploitation.
4. Optionnel : second moniteur sur `https://votre-domaine.ma/sitemap.xml`.

Ne cocher ce point de la checklist qu'après réception d'une alerte de
test réelle.
