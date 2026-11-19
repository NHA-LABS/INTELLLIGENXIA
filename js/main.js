import "./app.js";
import { initAuth } from "./auth.js";

// Les fonctions de chargement de l'interface doivent exister avant la restauration de session.
await initAuth();
import("./copilot.js").catch(error => {
    console.error("Le module Copilot n'a pas pu être chargé.", error);
});
