# Provisionnement du compte administrateur

> Phase 17 — Règles de sécurité non négociables respectées par
> l'application et par cette procédure :
>
> - **Jamais** de création d'admin via un parcours d'inscription public.
> - **Jamais** d'auto-promotion : l'API et la base n'exposent aucun moyen
>   pour un utilisateur de modifier son propre rôle (la colonne
>   `profiles.role` n'est pas modifiable par l'utilisateur — vérifié par
>   les politiques RLS et la suite de tests Phase 13).
> - **Aucun** identifiant administrateur n'est codé en dur dans le dépôt.
> - Le rôle s'attribue uniquement via le mécanisme existant : la colonne
>   `public.profiles.role` (`'customer'` par défaut, `'admin'` pour
>   l'équipe), modifiable uniquement côté serveur (SQL du tableau de bord
>   ou clé `service_role` hors application).

## Procédure (à faire une fois, au lancement)

1. La propriétaire crée son compte via le **formulaire d'inscription
   normal** du site (`/fr/register`) avec sa vraie adresse e-mail, puis
   confirme l'e-mail.
2. Dans le tableau de bord Supabase → **SQL Editor**, exécuter :

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'PROPRIETAIRE@example.com');
   ```

   (Remplacer par l'adresse réelle utilisée à l'étape 1.)

3. Vérifier :

   ```sql
   select p.id, u.email, p.role
   from public.profiles p join auth.users u on u.id = p.id
   where p.role = 'admin';
   ```

4. La propriétaire se reconnecte : le menu affiche alors « Administration »
   et `/admin` devient accessible.

## Exploitation courante

- **Ajouter un autre admin** : même procédure SQL. Ne jamais partager le
  compte principal.
- **Retirer un admin** :
  ```sql
  update public.profiles set role = 'customer'
  where id = (select id from auth.users where email = 'ANCIEN@example.com');
  ```
- **Mot de passe oublié** : parcours public « Mot de passe oublié » —
  identique pour les admins (aucun canal privilégié).
- Lister régulièrement les admins (requête de l'étape 3) et révoquer les
  accès obsolètes.
