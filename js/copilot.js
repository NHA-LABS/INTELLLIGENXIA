
import { CONFIG } from "./config.js";
import {
    ConnectionSettings,
    CopilotStudioClient,
    ScopeHelper
} from "@microsoft/agents-copilotstudio-client";

// Configuration de INTELLIGENXIA
const copilotSettings = new ConnectionSettings({
    environmentId: CONFIG.copilot.environmentId,
    schemaName: CONFIG.copilot.schemaName
});

let copilotClient = null;
let conversationId = null;

// Récupération du jeton Microsoft
async function getCopilotToken() {
    const account = window.getCurrentUser();

    if (!account) {
        throw new Error("Veuillez vous connecter avec votre compte Microsoft.");
    }

    const scope = ScopeHelper.getScopeFromSettings(copilotSettings);

    const result = await window.msalInstance.acquireTokenSilent({
        scopes: [scope],
        account
    });

    return result.accessToken;
}

// Initialisation du client et démarrage de la conversation
async function initializeCopilot() {
    if (copilotClient && conversationId) {
        return copilotClient;
    }

    const token = await getCopilotToken();

    copilotClient = new CopilotStudioClient(
        copilotSettings,
        token
    );

    const response = await copilotClient.startConversationWithResponse(true);

    conversationId = response.conversationId;

    console.log("Conversation INTELLIGENX initialisée :", conversationId);

    return copilotClient;
}

// Envoyer une question à l'agent
window.askIntelligenxia = async function (question) {
    if (!question || !question.trim()) {
        throw new Error("Veuillez saisir une question.");
    }

    const client = await initializeCopilot();

    const response = await client.askQuestionAsync(
        question.trim(),
        conversationId
    );

    return response
        .filter(activity => activity.text)
        .map(activity => activity.text);
};

console.info("Module INTELLIGENXIA chargé.");
