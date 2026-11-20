const retry = document.getElementById("retryLoginButton");
retry.addEventListener("click", () => window.location.reload());
const watchdog = setTimeout(() => {
    document.getElementById("loginStatus").textContent = "Le démarrage prend trop de temps. Vérifiez votre connexion puis actualisez la page.";
    retry.hidden = false;
}, 35000);
try {
    // Charger l'interface avant de restaurer la session, et signaler les erreurs de modules.
    await import("./app.js");
    const { initAuth } = await import("./auth.js");
    await initAuth();
    import("./copilot.js").catch(error => console.error("Chargement Copilot impossible.", error));
} catch (error) {
    console.error("Démarrage de l'application impossible.", error);
    document.getElementById("loginStatus").textContent = "Impossible de démarrer la connexion. Actualisez la page. Si le problème persiste, consultez la console du navigateur (F12).";
    retry.hidden = false;
} finally {
    clearTimeout(watchdog);
}
