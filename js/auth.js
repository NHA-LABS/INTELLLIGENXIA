import { CONFIG } from "./config.js";

// Configuration Microsoft Entra ID / MSAL
const msalConfig = {
    auth: {
        clientId: CONFIG.clientId,
        authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
        redirectUri: CONFIG.redirectUri,
        postLogoutRedirectUri: CONFIG.redirectUri
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);
// Mise à disposition de MSAL pour les modules JavaScript
window.msalInstance = msalInstance;
window.getCurrentUser = getCurrentUser;

// Initialise MSAL et restaure la session éventuelle.

async function initAuth() {
    try {
        await msalInstance.initialize?.();

        const response = await msalInstance.handleRedirectPromise();

        if (response && response.account) {
            msalInstance.setActiveAccount(response.account);
        }

        const accounts = msalInstance.getAllAccounts();
        const activeAccount = msalInstance.getActiveAccount();

        if (!activeAccount && accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
        }

        const account = getCurrentUser();

        if (!account) {
            showSignedOutProfile();
            return;
        }

        updateUserProfile();
        // Enregistrer une visite après l'identification du collaborateur
if (window.registerVisit) {
    try {
        await window.registerVisit();
        console.log("Visite : traitement terminé");
    } catch (error) {
        console.error("Erreur registerVisit :", error);
    }
}

if (window.loadArticlesFromSharePoint) {
    try {
        await window.loadArticlesFromSharePoint();
        console.log("Actualités : chargement terminé");
    } catch (error) {
        console.error("Erreur loadArticlesFromSharePoint :", error);
    }
}

if (window.updateVisitCounters) {
    try {
        await window.updateVisitCounters();
        console.log("Statistiques : chargement terminé");
    } catch (error) {
        console.error("Erreur updateVisitCounters :", error);
    }
}

    } catch (error) {
        console.error("Erreur d'initialisation Microsoft :", error);
        showSignedOutProfile();
    }
}

// Affiche le profil Microsoft ou l'état déconnecté.
function updateUserProfile() {
    const user = getCurrentUser();

    if (!user) {
        showSignedOutProfile();
        return;
    }

    const fullName = user.name || user.username || "Utilisateur Microsoft";
    const email = user.username || "";

    const initials = fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join("");

    document.getElementById("appShell").hidden = false;
    document.getElementById("loginScreen").hidden = true;

    const nameElement = document.getElementById("userName");
    const emailElement = document.getElementById("userEmail");
    const avatarElement = document.getElementById("userAvatar");
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");

    if (nameElement) nameElement.textContent = fullName;
    if (emailElement) emailElement.textContent = email;
    if (avatarElement) avatarElement.textContent = initials || "NS";
    if (loginButton) loginButton.hidden = true;
    if (logoutButton) logoutButton.hidden = false;
}

function showSignedOutProfile() {
    document.getElementById("appShell").hidden = true;
    document.getElementById("loginScreen").hidden = false;

    const nameElement = document.getElementById("userName");
    const emailElement = document.getElementById("userEmail");
    const avatarElement = document.getElementById("userAvatar");
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");

    if (nameElement) nameElement.textContent = "Utilisateur non connecté";
    if (emailElement) emailElement.textContent = "Connectez-vous avec Microsoft 365";
    if (avatarElement) avatarElement.textContent = "NS";
    if (loginButton) loginButton.hidden = false;
    if (logoutButton) logoutButton.hidden = true;
}

function getCurrentUser() {
    return msalInstance.getActiveAccount()
        || msalInstance.getAllAccounts()[0]
        || null;
}
function getCurrentUserEmail() {
    const account = getCurrentUser();
    return account?.username?.toLowerCase() || "";
}

// Connexion Microsoft : les deux autorisations sont nécessaires
// pour le profil et la future lecture de la liste SharePoint.
async function loginMicrosoft() {
    try {
        await msalInstance.loginRedirect({
            scopes: ["User.Read", "Sites.Read.All"]
        });
    } catch (error) {
        console.error("Erreur de connexion Microsoft :", error);
        alert("La connexion Microsoft a échoué. Consultez la console du navigateur pour plus de détails.");
    }
}

// Déconnexion du compte Microsoft actuellement utilisé.
async function logoutMicrosoft() {
    const account = getCurrentUser();

    if (!account) {
        showSignedOutProfile();
        return;
    }

    try {
        await msalInstance.logoutRedirect({
            account,
            postLogoutRedirectUri: CONFIG.redirectUri
        });
    } catch (error) {
        console.error("Erreur de déconnexion Microsoft :", error);
        alert("La déconnexion Microsoft a échoué. Consultez la console du navigateur pour plus de détails.");
    }
}

// Les scripts sont chargés en bas de index.html : les boutons existent déjà.
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginScreenButton = document.getElementById("loginScreenButton");

if (loginScreenButton) {
    loginScreenButton.addEventListener("click", loginMicrosoft);
}

if (loginButton) {
    loginButton.addEventListener("click", loginMicrosoft);
}
if (logoutButton) {
    logoutButton.addEventListener("click", logoutMicrosoft);
}


// Récupère toutes les actualités de la liste SharePoint, en suivant la pagination Graph.
async function fetchSharePointArticles() {
    const account = getCurrentUser();
    if (!account) throw new Error("Connectez-vous avec votre compte Microsoft NSIA.");

    const siteId = "assurancesnsia.sharepoint.com,35765e6b-5df0-4cde-8ef9-47fe5fafb4c3,5eced96b-88c1-4917-8510-a05551d4f426";
    const listId = "29a2ac9d-98ff-4731-b8b3-d151e8b7bb00";
    const tokenResult = await msalInstance.acquireTokenSilent({ scopes: ["Sites.Read.All"], account });
    let nextUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=100`;
    const allItems = [];

    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${tokenResult.accessToken}`, Accept: "application/json" }
        });
        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Lecture SharePoint impossible (${response.status}). ${details.slice(0, 500)}`);
        }
        const data = await response.json();
        allItems.push(...(data.value || []));
        nextUrl = data["@odata.nextLink"] || null;
    }
    return allItems;
}
window.fetchSharePointArticles = fetchSharePointArticles;

async function registerVisit() {
    const account = getCurrentUser();

    if (!account) {
        console.warn("Visite non enregistrée : aucun utilisateur connecté.");
        return;
    }

    const email = getCurrentUserEmail();
    if (!email) return;

    const siteId = "assurancesnsia.sharepoint.com,35765e6b-5df0-4cde-8ef9-47fe5fafb4c3,5eced96b-88c1-4917-8510-a05551d4f426";
    const listId = "45901f50-8e8b-4bd1-92c8-d412ad20d850";

    console.info("Compteur de visites prêt pour :", email);

    // L'enregistrement SharePoint sera activé après
    // l'autorisation d'écriture de l'administrateur.
}

window.registerVisit = registerVisit;

async function getVisitStats() {
    const account = getCurrentUser();

    if (!account) {
        throw new Error("Aucun utilisateur Microsoft connecté.");
    }

    const siteId = "assurancesnsia.sharepoint.com,35765e6b-5df0-4cde-8ef9-47fe5fafb4c3,5eced96b-88c1-4917-8510-a05551d4f426";
    const listId = "45901f50-8e8b-4bd1-92c8-d412ad20d850";

    const tokenResult = await msalInstance.acquireTokenSilent({
        scopes: ["Sites.Read.All"],
        account
    });

    let nextUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=100`;

    const allItems = [];

    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: {
                Authorization: `Bearer ${tokenResult.accessToken}`,
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Lecture des visites impossible : ${response.status}`);
        }

        const data = await response.json();
        allItems.push(...(data.value || []));
        nextUrl = data["@odata.nextLink"] || null;
    }

    return {
        visiteursUniques: allItems.length,
        totalVisites: allItems.reduce(
            (total, item) => total + (Number(item.fields?.NombreVisites) || 0),
            0
        )
    };
}

window.getVisitStats = getVisitStats;



// Teste réel de lecture de la liste SharePoint via Microsoft Graph.
// À lancer depuis la console du navigateur avec : testSharePointConnection()
async function testSharePointConnection() {
    const account = getCurrentUser();

    if (!account) {
        throw new Error("Aucun compte Microsoft connecté. Connectez-vous d'abord.");
    }

    const siteId = "assurancesnsia.sharepoint.com,35765e6b-5df0-4cde-8ef9-47fe5fafb4c3,5eced96b-88c1-4917-8510-a05551d4f426";
    const listId = "29a2ac9d-98ff-4731-b8b3-d151e8b7bb00";

    try {
        const tokenResult = await msalInstance.acquireTokenSilent({
            scopes: ["Sites.Read.All"],
            account
        });

        const endpoint =
            `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=5`;

        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${tokenResult.accessToken}`,
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Microsoft Graph a répondu ${response.status} : ${details}`);
        }

        const data = await response.json();
        const articles = (data.value || []).map(item => {
            const fields = item.fields || {};
            return {
                id: item.id,
                titre: fields.Title || "(Sans titre)",
                resume: fields.R_x00e9_sum_x00e9_ || "",
                source: fields.Nom_Source || "",
                datePublication: fields.Date_Publication || "",
                famille: fields.Famille_Veille || "",
                categorie: fields.AjouterCategorie || "",
                pays: fields.AjouterPays || "",
                prioritaire: fields.AjouterPrioritaire || false
            };
        });

        console.table(articles);
        console.info(`Connexion SharePoint réussie : ${articles.length} article(s) récupéré(s) sur cette première page.`);
        return articles;
    } catch (error) {
        console.error("Échec du test SharePoint :", error);
        throw error;
    }
}
// Enregistrement d'un document dans SharePoint
async function uploadDocumentToSharePoint(file) {
    const account = getCurrentUser();

    if (!account) {
        throw new Error("Connectez-vous avec votre compte Microsoft NSIA.");
    }

    if (!file) {
        throw new Error("Aucun document sélectionné.");
    }

    const driveId = "b!a152NfBd3kyO-Uf-X6-0w2vZzl7BiBdJhRCgVVHU9CZfrqr0z_RWRI0zc4xmUX2M";

    const tokenResult = await msalInstance.acquireTokenSilent({
        scopes: ["Sites.ReadWrite.All"],
        account
    });

    const endpoint =
        `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURIComponent(file.name)}:/content`;

    const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${tokenResult.accessToken}`,
            "Content-Type": file.type || "application/octet-stream"
        },
        body: file
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Échec de l'enregistrement (${response.status}) : ${details}`);
    }

    return await response.json();
}

window.uploadDocumentToSharePoint = uploadDocumentToSharePoint;

window.testSharePointConnection = testSharePointConnection;

export { initAuth };

