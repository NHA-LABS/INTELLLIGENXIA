# Inscription Microsoft Entra ID

## Paramètres à préparer

Nom : INTELLIGENXIA. Type de comptes : comptes de cet annuaire uniquement (organisation NSIA).

Annuaire actuellement configuré : `467092d2-790b-4de1-9b3e-38b384eb2a21`.
Application actuellement configurée : `9e4f1be0-438e-415e-a5db-eebea0a04bc9`.
Ces identifiants proviennent du projet ; leur existence et leur configuration doivent être vérifiées dans le portail.

## Créer ou configurer l'inscription

1. Ouvrir https://entra.microsoft.com, sélectionner l'annuaire NSIA puis **Identité > Applications > Inscriptions d'applications**.
2. Rechercher l'ID d'application ci-dessus. Si elle existe, modifier cette inscription. Sinon, créer une inscription nommée INTELLIGENXIA avec les comptes de cet annuaire uniquement.
3. Dans **Authentification**, ajouter une plateforme **Application monopage (SPA)** avec les URI suivantes :

| Usage | URI de redirection |
| --- | --- |
| Développement | `http://localhost:5500/redirect.html` |
| Prévisualisation | `http://localhost:4173/redirect.html` |
| VPS | `https://VOTRE-DOMAINE/redirect.html` |

Remplacer VOTRE-DOMAINE par le domaine définitif. Le chemin, le protocole et le port doivent correspondre exactement. Les anciennes instructions utilisant `index.html` comme URI de connexion sont remplacées par `redirect.html`. Le retour après déconnexion est `https://VOTRE-DOMAINE/index.html` ; ajouter aussi cette URI dans la plateforme SPA si nécessaire pour la validation du retour de déconnexion.

4. Ne pas activer les flux implicites ni créer de secret client. La connexion utilise le flux code d'autorisation avec PKCE.
5. Dans **Autorisations API**, configurer les permissions **déléguées** Microsoft Graph : `User.Read` pour la connexion ; `Sites.Read.All` pour la lecture SharePoint ; `Sites.ReadWrite.All` seulement si le dépôt documentaire est utilisé. Faire accorder le consentement administrateur selon la politique de l'organisation. Les droits SharePoint de chaque collaborateur continuent de s'appliquer.
6. Dans **Applications d'entreprise > INTELLIGENXIA > Propriétés**, activer **Affectation requise**, puis affecter les utilisateurs ou groupes autorisés. Cela permet de restreindre réellement la connexion aux collaborateurs désignés.
7. Pour Copilot Studio, vérifier séparément la publication de l'agent, son accès par les collaborateurs et le consentement à la portée calculée par le SDK. Ne pas inventer de portée ou de permission Graph pour l'agent.

## Configurer le VPS

Si une nouvelle inscription a été créée, copier ses identifiants publics :

```sh
cp .env.example .env.local
nano .env.local
npm ci
npm run build
```

Renseigner `VITE_ENTRA_CLIENT_ID` et `VITE_ENTRA_TENANT_ID`. Les valeurs sont intégrées au JavaScript lors de la compilation ; reconstruire après chaque modification. Aucun secret ne doit figurer dans ces variables.

Publier `dist/`, y compris `redirect.html`. Ne pas appliquer d'en-tête `Cross-Origin-Opener-Policy` à cette page de retour, nécessaire à MSAL v5. Conserver HTTPS sur le domaine final.

## Validation administrateur

- Connexion d'un collaborateur affecté, retour sur la plateforme et restauration après actualisation.
- Refus d'un utilisateur non affecté lorsque l'affectation est obligatoire.
- Refus d'un compte d'un autre annuaire.
- Annulation de la connexion, puis nouvelle tentative.
- Déconnexion, puis reconnexion avec un autre compte.
- Lecture SharePoint, dépôt documentaire autorisé et accès à VIRA.

Cette préparation ne crée pas l'inscription dans votre annuaire et ne confirme pas les consentements. Le domaine final et un accès administrateur Entra sont nécessaires pour finaliser la configuration.

Références : [inscription SPA Microsoft](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-app-registration), [page de retour MSAL v5](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge).
