# Domaine, DNS et Google Search Console

> Phase 17 — **Aucune de ces étapes n'a été effectuée** (aucun domaine réel
> n'est encore disponible). Le site est prêt à recevoir n'importe quel
> domaine : l'URL canonique est paramétrable via `VITE_SITE_URL` et aucun
> domaine n'est codé en dur dans l'application.

## 1. Domaine

1. Enregistrer le domaine définitif (ex. `.ma` ou `.com`) chez un
   registrar.
2. Une fois le domaine connu, définir `VITE_SITE_URL=https://votre-domaine.ma`
   dans les variables d'environnement de l'hébergeur et **redéployer** :
   canonical, hreflang, Open Graph et `sitemap.xml` sont générés à partir
   de cette variable au build.

## 2. DNS (selon l'hébergeur choisi)

### Netlify
- Domaine → ajouter le domaine dans Site settings → Domain management.
- DNS recommandé : `ALIAS`/`ANAME` vers `apex-loadbalancer.netlify.com`
  (ou `A` vers `75.2.60.5`) pour l'apex, `CNAME` vers
  `<site>.netlify.app` pour `www`.
- HTTPS : certificat Let's Encrypt automatique une fois le DNS propagé.

### Vercel
- Projet → Settings → Domains → ajouter le domaine.
- `A` vers `76.76.21.21` pour l'apex, `CNAME` vers `cname.vercel-dns.com`
  pour `www`.
- HTTPS automatique après vérification.

Le fichier `public/_redirects` (Netlify) et `vercel.json` (Vercel) sont
déjà en place : les routes SPA et les routes localisées `/fr`, `/ar`,
`/en` (instantanés pré-rendus servis en priorité) fonctionnent en accès
direct et au rechargement.

## 3. Google Search Console

À faire **après** la mise en ligne sur le domaine définitif :

1. https://search.google.com/search-console → **Ajouter une propriété**
   (type « Domaine » recommandé, validation par enregistrement TXT DNS ;
   sinon type « Préfixe d'URL » avec la balise meta fournie à insérer).
2. Soumettre le sitemap : `https://votre-domaine.ma/sitemap.xml`.
3. Vérifier l'indexation des pages `/fr`, `/ar`, `/en` (Inspection d'URL)
   et les balises hreflang réciproques (Rapport international).
4. Surveiller Couverture/Indexation les premières semaines.

> Ne pas cocher ces points dans la checklist tant que la propriété n'est
> pas réellement validée et le sitemap réellement accepté par Google.
