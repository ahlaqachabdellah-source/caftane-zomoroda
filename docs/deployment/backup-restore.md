# Sauvegardes et restauration

> Phase 17 — Sépare clairement ce qui a été **réellement testé** de ce qui
> reste une **opération manuelle** sur l'hébergement.

## 1. Ce qui a été testé (exercice de restauration réel)

`npm run test:drill` (`supabase/tests/backup-restore-drill.mjs`) effectue un
exercice **réel** sur PostgreSQL local embarqué :

1. Base source : schéma complet (12 migrations) + données seed.
2. Export logique JSONB des tables de contenu (`site_settings`,
   `categories`, `caftans`, `caftan_images`) dans un ordre compatible avec
   les clés étrangères.
3. Base cible vierge : migrations seules.
4. Restauration via `jsonb_populate_recordset`.
5. Vérifications : comptages identiques, contenu arabe intact (pas de
   corruption d'encodage), triggers fonctionnels sur la base restaurée
   (numérotation `CF-AAAA-NNNN` et calcul du total d'une réservation),
   RLS toujours active.

Résultat : **14/14 contrôles réussis** — la procédure de restauration
logique du contenu est prouvée de bout en bout.

## 2. Ce qui N'A PAS été testé (opérations d'hébergement)

Les sauvegardes du projet Supabase **hébergé** sont des opérations du
tableau de bord, impossibles à réaliser depuis cet environnement :

- **Sauvegardes quotidiennes** : incluses selon l'offre Supabase
  (Dashboard → Settings → Backups). Vérifier leur présence après création
  du projet.
- **PITR (Point-in-Time Recovery)** : disponible en offre Pro et +
  (Settings → Backups → PITR). À activer explicitement si l'offre le
  permet.
- **Exercice de restauration hébergée** : recommandé avant le lancement —
  restaurer une sauvegarde dans un **projet séparé** et vérifier que
  l'application fonctionne contre celui-ci. **Cet exercice n'a pas été
  effectué** ; ne pas le cocher dans la checklist tant qu'il n'a pas eu
  lieu.

## 3. Sauvegarde logique autonome (complément recommandé)

Indépendamment de l'hébergement, programmer un export logique périodique
(hebdomadaire suffit pour du contenu éditorial) :

```bash
# Nécessite pg_dump ≥ 15 et la chaîne de connexion (Settings → Database)
pg_dump "$DATABASE_URL" \
  --format=custom --no-owner --no-privileges \
  --file="backup-$(date +%F).dump"
```

Conserver les exports chiffrés hors du compte principal (ex. stockage
objet séparé). Tester la restauration avec :

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL_CIBLE" backup-AAAA-MM-JJ.dump
```

## 4. Procédure de restauration (résumé opérationnel)

| Scénario | Procédure |
|---|---|
| Perte de données de contenu (caftans, catégories, réglages) | Restaurer l'export logique le plus récent (§3) ou rejouer le drill JSONB (§1) |
| Corruption large / retour dans le temps | PITR via le tableau de bord Supabase vers un nouveau projet, basculer `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, redéployer |
| Perte totale du projet | Nouveau projet → `supabase db push` (migrations) → restauration logique → re-seed si nécessaire → mise à jour des variables d'environnement |

Dans tous les cas : documenter l'incident, l'heure de la dernière
sauvegarde utilisée et la perte de données éventuelle (RPO).
