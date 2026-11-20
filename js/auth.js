import { CONFIG } from "./config.js";
import { PublicClientApplication } from "@azure/msal-browser";

// Configuration Microsoft Entra ID / MSAL
const msalConfig = {
    auth: {
        clientId: CONFIG.clientId,
        authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
        redirectUri: CONFIG.redirectUri,
        postLogoutRedirectUri: CONFIG.logoutUri
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    }
};

const msalInstance = new PublicClientApplication(msalConfig);
let authReady = false;
async function withAuthTimeout(operation, milliseconds = 15000) {
    let timer;
    try {
        return await Promise.race([
            operation,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(Object.assign(new Error("Microsoft ne répond pas."), { errorCode: "auth_timeout" })), milliseconds);
            })
        ]);
    } finally {
        clearTimeout(timer);
    }
}
function authErrorMessage(error) {
    const code = String(error?.errorCode || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    return code ? ` Code : ${code}.` : "";
}
function setLoginState(message, busy = false) {
    const status = document.getElementById("loginStatus");
    if (status) status.textContent = message;
    for (const id of ["loginScreenButton", "loginButton"]) {
        const button = document.getElementById(id);
        if (button) button.disabled = busy || !authReady;
    }
}
// Mise à disposition de MSAL pour les modules JavaScript
window.msalInstance = msalInstance;
window.getCurrentUser = getCurrentUser;

// Initialise MSAL et restaure la session éventuelle.

async function initAuth() {
    try {
        setLoginState("Vérification de votre session Microsoft…", true);
        await withAuthTimeout(msalInstance.initialize());

        const response = await withAuthTimeout(msalInstance.handleRedirectPromise());

        if (response && response.account) {
            msalInstance.setActiveAccount(response.account);
        }

        const accounts = msalInstance.getAllAccounts();
        const activeAccount = msalInstance.getActiveAccount();

        if (!activeAccount && accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
        }

        authReady = true;
        setLoginState("Connectez-vous avec votre compte professionnel Microsoft.");
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
        setLoginState("Impossible de vérifier la connexion. Actualisez la page et réessayez." + authErrorMessage(error));
        document.getElementById("retryLoginButton").hidden = false;
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
    const account = msalInstance.getActiveAccount()
        || msalInstance.getAllAccounts()[0]
        || null;
    return account?.tenantId?.toLowerCase() === CONFIG.tenantId.toLowerCase() ? account : null;
}
function getCurrentUserEmail() {
    const account = getCurrentUser();
    return account?.username?.toLowerCase() || "";
}

// Connexion Microsoft : les deux autorisations sont nécessaires
// pour le profil et la future lecture de la liste SharePoint.
async function loginMicrosoft() {
    if (!authReady) return;
    try {
        setLoginState("Redirection vers Microsoft…", true);
        await withAuthTimeout(msalInstance.loginRedirect({
            scopes: ["User.Read"],
            prompt: "select_account"
        }), 30000);
    } catch (error) {
        console.error("Erreur de connexion Microsoft :", error);
        setLoginState("La connexion a échoué ou a été annulée. Vous pouvez réessayer." + authErrorMessage(error));
        document.getElementById("retryLoginButton").hidden = false;
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
            postLogoutRedirectUri: CONFIG.logoutUri
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

    const siteId = CONFIG.sharepoint.siteId;
    const listId = CONFIG.sharepoint.articlesListId;
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

    const siteId = CONFIG.sharepoint.siteId;
    const listId = CONFIG.sharepoint.visitsListId;

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

    const siteId = CONFIG.sharepoint.siteId;
    const listId = CONFIG.sharepoint.visitsListId;

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

    const siteId = CONFIG.sharepoint.siteId;
    const listId = CONFIG.sharepoint.articlesListId;

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

    const driveId = CONFIG.sharepoint.documentsDriveId;

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

