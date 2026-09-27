# Guide d'utilisation — Administration Caftan Zomoroda

> À remettre à la propriétaire. Aucune connaissance technique requise.
> L'interface d'administration est en français ; le site public existe en
> français, arabe et anglais.

## 1. Se connecter

1. Ouvrir le site → **Se connecter** (`/fr/login`).
2. Utiliser l'e-mail et le mot de passe du compte administrateur (créé au
   lancement — voir le document technique `admin-provisioning.md`).
3. Une fois connectée, cliquer sur **Administration** dans le menu : le
   tableau de bord s'ouvre sur **Vue d'ensemble**.

En cas d'oubli du mot de passe : **Mot de passe oublié** sur la page de
connexion, suivre le lien reçu par e-mail.

## 2. Le menu d'administration

| Rubrique | Contenu |
|---|---|
| **Vue d'ensemble** | Chiffres clés du mois : réservations, demandes en attente, estimation de revenus |
| **Caftans** | Le catalogue : ajouter, modifier, retirer des caftans |
| **Catégories** | Les familles de caftans (ex. Caftan, Takchita, Jellaba) |
| **Réservations** | Toutes les demandes de location et leur traitement |
| **Calendrier** | Vue mensuelle des périodes réservées |
| **Clientes** | La liste des clientes inscrites et leur historique |

## 3. Ajouter un caftan

1. **Caftans** → bouton **Nouveau caftan**.
2. Remplir la fiche :
   - **Nom** en français, arabe et anglais (les trois onglets de langue —
     le site affiche à chaque visiteuse sa langue).
   - **Description** dans les trois langues.
   - **Prix par jour** en MAD (ex. `800`).
   - **Taille** et **couleur**.
   - **Catégorie** (liste déroulante).
   - **Statut** : `Disponible` (visible et réservable), `En maintenance`
     (visible mais non réservable), `Retiré` (invisible sur le site).
   - **À la une** : affiche le caftan sur la page d'accueil.
3. **Enregistrer**.

## 4. Gérer les photos d'un caftan

Dans la fiche du caftan, bloc **Images** :

- **Ajouter** : sélectionner un fichier JPG/PNG/WebP (max 10 Mo). Conseil :
  photos nettes, fond clair, format portrait.
- **Photo principale** : cliquer **Définir comme principale** sur la photo
  qui représentera le caftan dans le catalogue (badge doré « Principale »).
- **Texte alternatif** : une courte description par langue (important pour
  l'accessibilité et Google).
- **Supprimer** : après confirmation. La photo principale supprimée est
  automatiquement remplacée par la suivante.

## 5. Catégories

**Catégories** → **Nouvelle catégorie** : nom dans les trois langues +
description facultative. Une catégorie utilisée par des caftans ne peut
pas être supprimée tant que ces caftans y sont rattachés.

## 6. Traiter une réservation

1. **Réservations** : la liste affiche numéro (`CF-AAAA-NNNN`), cliente,
   caftan, dates et statut. Filtres par statut disponibles.
2. Cliquer sur une réservation pour ouvrir le détail : coordonnées de la
   cliente, caftan, période, montant total, historique complet.
3. Actions possibles selon le statut actuel :
   - **Confirmer** une demande `En attente` → la cliente voit sa
     réservation confirmée.
   - **Refuser** une demande `En attente` (motif obligatoire).
   - **Marquer terminée** une location `Confirmée` une fois le caftan
     rendu.
   - **Annuler** si nécessaire (motif obligatoire).
4. **Notes internes** : champ de notes visible uniquement par
   l'administration (compte rendu d'essayage, état du caftan…).

> Le système empêche automatiquement les doubles réservations d'un même
> caftan sur des dates qui se chevauchent (statuts en attente/confirmée).

## 7. Clientes

**Clientes** : liste des comptes inscrits. Le détail montre le profil et
l'historique des réservations de la cliente — utile pour fidéliser et
retrouver rapidement une cliente habituée.

## 8. Coordonnées du site (WhatsApp, téléphone, adresse)

Le bouton WhatsApp flottant et les coordonnées du pied de page proviennent
de la base de données. Toute modification se fait côté technique
(table `site_settings`) — demander à l'équipe technique (procédure dans
`production-setup.md`, §3).

## 9. Bonnes pratiques

- Préparer les textes dans les **trois langues** avant de publier un
  caftan (un caftan sans traduction arabe s'affichera mal pour une
  visiteuse arabophone).
- Vérifier chaque semaine les demandes **En attente** — une réponse
  rapide fait la différence.
- Passer un caftan en **En maintenance** dès qu'il part au pressing ou en
  réparation pour éviter les demandes impossibles.
