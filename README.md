# INTELLIGENXIA — préparation de production

## Compiler

Utiliser Node.js 24 et npm :

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Le développement écoute sur http://localhost:5500. La prévisualisation locale écoute sur http://localhost:4173. Publier uniquement le contenu du dossier `dist/` sur un hébergement statique HTTPS, à la racine du domaine. Aucun serveur Node.js n'est nécessaire en production. L'ouverture directe de index.html depuis le disque ne fonctionne pas avec les modules.

## Configuration Microsoft avant ouverture

1. Dans Microsoft Entra ID, ouvrir l'inscription d'application `9e4f1be0-438e-415e-a5db-eebea0a04bc9`, puis **Authentification > Application monopage (SPA)**.
2. Inscrire l'URI exacte `https://votre-domaine/redirect.html`. Le code calcule cette URI à partir de l'adresse du site. Conserver `http://localhost:5500/redirect.html` pour le développement ; ajouter `http://localhost:4173/redirect.html` pour tester la compilation locale.
3. Faire valider les permissions Graph déléguées utilisées : `User.Read`, `Sites.Read.All` et, pour le dépôt documentaire, `Sites.ReadWrite.All`. Vérifier aussi les droits des collaborateurs sur les listes et la bibliothèque SharePoint. La lecture n'autorise pas automatiquement les dépôts.
4. Vérifier l'accès des collaborateurs à l'agent Copilot Studio et au lien Microsoft 365 défini dans `js/app.js`, ainsi que les consentements nécessaires à l'agent.

Les identifiants de configuration dans `js/config.js` sont publics. Aucun secret client n'est requis pour cette application monopage. Ne jamais ajouter de secret, mot de passe ou jeton au code ou aux variables `VITE_*`. Microsoft doit contrôler les droits sur les données indépendamment de l'affichage de l'écran de connexion.

## Hébergement

La configuration Netlify fournie compile avec `npm run build` et publie `dist` avec Node 24. Pour un autre hébergeur, reprendre ces paramètres. Les en-têtes dans `public/_headers` sont appliqués par les hébergeurs compatibles ; ailleurs, les configurer côté serveur. Le HTML doit être revalidé et les ressources `/assets/` peuvent être mises en cache longtemps. Ne publier ni les sources complètes ni `node_modules`.

Le navigateur doit pouvoir joindre Microsoft Entra, Microsoft Graph, Copilot Studio, Microsoft 365, Google Fonts. Les règles de non-indexation fournies ne constituent pas un contrôle d'accès.

## Recette sur le domaine définitif

- Ouvrir `/` et `/index.html` : écran de connexion visible, styles et logos présents, aucune erreur JavaScript.
- Se connecter avec un compte autorisé : retour sur le domaine HTTPS, profil et actualités SharePoint affichés.
- Actualiser la page et vérifier la restauration de session.
- Vérifier les filtres, les analyses, l'impression et la navigation sur mobile.
- Ouvrir VIRA et vérifier une réponse de l'agent.
- Déposer un document de test et vérifier sa présence dans SharePoint. Utiliser un nom unique : le dépôt à la racine peut remplacer un fichier portant le même nom.
- Se déconnecter et vérifier le retour à l'écran de connexion. Tester également un compte sans droits SharePoint.

## Limites à valider

L'enregistrement des visites reste désactivé dans `registerVisit` ; les compteurs lisent les données déjà présentes. Certaines rubriques conservent des contenus de démonstration à valider avant ouverture. La compilation ne valide pas les accès Microsoft : la recette nécessite un compte autorisé et le domaine final.

La procédure détaillée Microsoft Entra ID se trouve dans [ENTRA-ID.md](ENTRA-ID.md). La bibliothèque MSAL est intégrée à la compilation ; la page redirect.html doit être publiée avec le site.
