import { CONFIG } from "./config.js";
const content = document.getElementById("pageContent");
const toast = document.getElementById("toast");
let toastTimer;
let articles = [];
let articlesLoading = false;
let articlesLoadError = "";
let featuredArticles = [];
let featuredIndex = 0;
let featuredCarouselTimer = null;

const INTELLIGENXIA_URL = CONFIG.copilot.chatUrl;

function getLatestFeaturedArticles() {
    return [...articles]
        .sort((a, b) => {
            const dateA = new Date(a.rawDate || a.collectDate || 0).getTime() || 0;
            const dateB = new Date(b.rawDate || b.collectDate || 0).getTime() || 0;
            return dateB - dateA;
        })
        .slice(0, 3);
}

function showFeaturedSlide(index) {
    if (!featuredArticles.length) return;

    featuredIndex = (index + featuredArticles.length) % featuredArticles.length;

    const article = featuredArticles[featuredIndex];

    const category = document.getElementById("featuredCategory");
    const date = document.getElementById("featuredDate");
    const title = document.getElementById("featuredTitle");
    const summary = document.getElementById("featuredSummary");
    const button = document.getElementById("featuredButton");
    const image = document.getElementById("featuredImage");

    if (category) category.textContent = article.category || "Actualité";
    if (date) date.textContent = article.date || "";
    if (title) title.textContent = article.title;
    if (summary) summary.textContent = article.summary || "Résumé non renseigné.";

    if (button) button.dataset.openArticle = article.id;

    if (image) {
        if (article.image) {
            image.src = article.image;
            image.hidden = false;
        } else {
            image.removeAttribute("src");
            image.hidden = true;
        }
    }

    document.querySelectorAll(".featured-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === featuredIndex);
    });
}

const types = [
 ["Veille concurrentielle","Actualités des concurrents, produits et offres d’assurance, expérience client, distribution et partenariats.","À alimenter","♧"],
 ["Veille réglementaire et fiscalité","Actualités juridiques, réglementation du secteur, fiscalité, normes et obligations de conformité.","À alimenter","§"],
 ["Veille stratégique","Risques et évolutions du secteur de l’assurance, fusions-acquisitions, expansion géographique et environnement économique.","À alimenter","◎"],
 ["Veille technologique","Innovation, digitalisation, assurtech, fintech et nouvelles technologies appliquées à l’assurance.","À alimenter","✧"]
];
const competitors = [
 ["SUNU Assurances","Groupe panafricain d’assurance","Vie · Non Vie"],
 ["AXA","Groupe international d’assurance","Vie · Non Vie"],
 ["Allianz","Groupe international de services financiers","Vie · Non Vie"],
 ["SanlamAllianz","Acteur panafricain de l’assurance","Vie · Non Vie"],
 ["Groupe Atlantique","Banque et assurance en Afrique de l’Ouest","Assurance"],
 ["Génération Nouvelle","Acteur du marché local","Assurance"]
];
function showToast(message){toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2600)}
function priorityScore(a){if(!a.priorityFactors)return null;const weights=[.25,.25,.20,.20,.10];return a.priorityFactors.reduce((sum,value,i)=>sum+value*weights[i],0)}
function priorityLabel(score){return score>=4.5?"Critique":score>=4?"Élevé":score>=3?"Modéré":score>=2?"Faible":"Très faible"}
function scoreTag(a){const score=priorityScore(a);return score===null?"":`<span class="tag priority-score-tag">${score.toFixed(1).replace(".",",")}/5 · ${priorityLabel(score).toUpperCase()}</span>`}
function pageHeader(kicker,title,subtitle){return `<div class="eyebrow">${kicker}</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p><div class="title-underline"></div>`}
function articleCard(a) {
    return `
    <article class="article-row">
        <div class="article-placeholder" aria-hidden="true">▤</div>

        <div>
            <div class="article-meta">
                <span class="tag tag-blue">${escapeHtml(a.category || "Catégorie non renseignée")}</span>
                <span>${escapeHtml(a.date || "Date non renseignée")}</span>
                ${a.priority ? '<span class="tag tag-green">PRIORITAIRE</span>' : ''}
            </div>

            <h3>${escapeHtml(a.title)}</h3>
            <p>${escapeHtml(a.summary || "Aucun résumé renseigné.")}</p>

            <small>${escapeHtml(a.source || "")}${a.country ? " · " + escapeHtml(a.country) : ""}</small>

            <div class="article-voting">
                <span>Cet article vous semble-t-il pertinent ?</span>
                <button class="vote-button" data-vote="positif" data-article-id="${a.id}">
                    👍 <span>Pertinent</span> <strong>0</strong>
                </button>
                <button class="vote-button" data-vote="negatif" data-article-id="${a.id}">
                    👎 <span>Peu pertinent</span> <strong>0</strong>
                </button>
            </div>
        </div>

        <button class="outline-button" data-open-article="${a.id}">
            Voir l'analyse →
        </button>
    </article>`;
}
function home(){
    featuredArticles = getLatestFeaturedArticles();
    featuredIndex = 0;

    return `<section class="welcome-row"><div>${pageHeader("INTELLIGENCE & ANTICIPATION",'Bienvenue sur <span>INTELLIGENXIA</span>',"Votre intelligence stratégique au service de la performance du Groupe NSIA.")}</div><div class="welcome-tools"><div class="date-chip">▦ <strong id="currentDate"></strong></div><label class="search-box">⌕ <input id="homeSearch" placeholder="Rechercher un article ou un thème..."></label></div></section>
<section class="kpi-grid"><article class="kpi-card kpi-blue"><div class="kpi-icon">▤</div><div class="kpi-data"><strong>${articles.length}</strong><span>Articles SharePoint</span></div></article><article class="kpi-card kpi-gold"><div class="kpi-icon">☆</div><div class="kpi-data"><strong>${articles.filter(a=>a.priority).length}</strong><span>Articles prioritaires</span></div></article><article class="kpi-card kpi-purple"><div class="kpi-icon">♧</div><div class="kpi-data"><strong>${new Set(articles.map(a=>a.competitor).filter(Boolean)).size}</strong><span>Acteurs identifiés</span></div></article>
<article class="kpi-card kpi-green">
    <div class="kpi-icon">◎</div>
    <div class="kpi-data">
        <strong id="visiteurs-uniques">—</strong>
        <span>Visiteurs uniques</span>
        <small>
            <strong id="total-visites">—</strong>
            visites au total
        </small>
    </div>
</article>
</section>
<section class="feature-layout">

    <article class="featured-card">

        <div class="featured-image">
            <img
                id="featuredImage"
                src="${featuredArticles[0]?.image || ""}"
                alt="Actualité à la une"
                ${featuredArticles[0]?.image ? "" : "hidden"}
            >
            <span class="featured-label">À LA UNE</span>
        </div>

        <div class="featured-copy">

            <div class="article-meta">
                <span class="tag tag-gold" id="featuredCategory">
                    ${escapeHtml(featuredArticles[0]?.category || "Actualité")}
                </span>

                <span id="featuredDate">
                    ${escapeHtml(featuredArticles[0]?.date || "")}
                </span>
            </div>

            <h2 id="featuredTitle">
                ${escapeHtml(featuredArticles[0]?.title || "Aucune actualité disponible")}
            </h2>

            <div class="small-underline"></div>

            <p id="featuredSummary">
                ${escapeHtml(featuredArticles[0]?.summary || "Les actualités SharePoint apparaîtront ici après chargement.")}
            </p>

            <button
                class="primary-button"
                id="featuredButton"
                data-open-article="${featuredArticles[0]?.id || ""}"
                ${featuredArticles.length ? "" : "disabled"}
            >
                Découvrir l’analyse →
            </button>

            <div class="featured-controls">
                <button type="button" id="featuredPrev" aria-label="Actualité précédente">←</button>

                <div class="featured-dots">
                    ${featuredArticles.map((a, i) => `
                        <button
                            type="button"
                            class="featured-dot ${i === 0 ? "active" : ""}"
                            data-slide="${i}"
                            aria-label="Afficher l'actualité ${i + 1}"
                        ></button>
                    `).join("")}
                </div>

                <button type="button" id="featuredNext" aria-label="Actualité suivante">→</button>
            </div>

        </div>
    </article>

    <aside class="synthesis-card">
        <div class="synthesis-heading">
            <span>▥</span>
            <h2>Synthèse stratégique</h2>
        </div>

        <div class="synthesis-content">
            <div class="synthesis-item">
                <span class="synthesis-icon">◎</span>
                <p><strong>Synthèse</strong> : les éléments de synthèse seront alimentés à partir des analyses SharePoint.</p>
            </div>

            <div class="synthesis-item">
                <span class="synthesis-icon">⚠</span>
                <p><strong>Source</strong> : liste SharePoint NSIA_Veille_Concurrentielle_CI.</p>
            </div>

            <div class="synthesis-item">
                <span class="synthesis-icon">✧</span>
                <p><strong>Actualisation</strong> : données récupérées en direct à chaque connexion.</p>
            </div>
        </div>

        <div class="ai-signature">● Synthèse préparée par INTELLIGENXIA</div>
    </aside>

</section>
<div class="section-heading"><div><span class="section-symbol">ϟ</span><h2>Actualités prioritaires</h2><div class="small-underline"></div></div><button class="text-link" data-go="Actualités prioritaires">Voir toutes les actualités →</button></div><section class="news-grid">
    ${articles
        .filter(a => a.priority)
        .sort((a, b) =>
            new Date(b.rawDate || b.collectDate || 0) -
            new Date(a.rawDate || a.collectDate || 0)
        )
        .slice(0, 3)
        .map(a => `
            <article class="news-card">
                <div class="news-copy">
                    <span class="tag tag-blue">
                        ${escapeHtml(a.category || "Actualité")}
                    </span>

                    <h3>${escapeHtml(a.title)}</h3>

                    <small>${escapeHtml(a.date || "")}</small>

                    <button
                        class="priority-view-button"
                        data-open-article="${a.id}">
                        Voir l'analyse →
                    </button>
                </div>
            </article>
        `).join("")
        || '<p class="empty-state">Aucun article prioritaire renseigné dans SharePoint.</p>'
    }
</section></section>`}

function listing(priorityOnly = false) {
  let list = priorityOnly
    ? articles.filter(a => a.priority)
    : [...articles];

  // Afficher les articles les plus récemment collectés en premier
  list.sort((a, b) => {
  const dateA = new Date(a.collectDate || a.rawDate || 0).getTime();
  const dateB = new Date(b.collectDate || b.rawDate || 0).getTime();
  return dateB - dateA;
});

  const categories = [...new Set(
    articles.map(a => a.subcategory || a.category).filter(Boolean)
  )];

  const status = articlesLoading
    ? "Chargement des articles SharePoint…"
    : articlesLoadError
      ? `Erreur de chargement : ${escapeHtml(articlesLoadError)}`
      : `${list.length} article(s) provenant de SharePoint`;

  return `${pageHeader(
    priorityOnly ? "SURVEILLANCE RENFORCÉE" : "FLUX DE VEILLE",
    priorityOnly ? "Actualités prioritaires" : "Toutes les actualités",
    priorityOnly
      ? "Les informations identifiées comme prioritaires pour le Groupe et ses filiales."
      : "Retrouvez les informations collectées et analysées par INTELLIGENXIA."
  )}
  <div class="toolbar">
    <span class="page-subtitle">${status}</span>
    <select class="filter-select" id="categoryFilter">
      <option value="">Toutes les sous-catégories</option>
      ${categories.map(c => `<option>${escapeHtml(c)}</option>`).join("")}
    </select>
  </div>
  <div class="article-list" id="articleList">
    ${list.length
      ? list.map(articleCard).join("")
      : articlesLoading
        ? '<div class="empty-state">Récupération des articles en cours…</div>'
        : '<div class="empty-state">Aucun article SharePoint à afficher.</div>'}
  </div>`;
}


function typePage() {
    return `
        ${pageHeader(
            "CLASSIFICATION DE L’INFORMATION",
            "Types de veille",
            "Explorez les grands domaines couverts par le dispositif de veille du Groupe NSIA."
        )}

        <div class="type-grid">
            ${types.map(t => {
                const count = articles.filter(a =>
                    (a.family || "").trim().toLowerCase() ===
                    t[0].trim().toLowerCase()
                ).length;

                return `
                    <article class="type-card">
                        <div class="type-icon">${t[3]}</div>
                        <h3>${t[0]}</h3>
                        <p>${t[1]}</p>
                        <span class="count">${count} actualité(s)</span>
                    </article>
                `;
            }).join("")}
        </div>
    `;
}

function assistant() {
    return `
        ${pageHeader(
            "VOTRE ASSISTANT STRATÉGIQUE",
            "INTELLIGENXIA",
            "Interrogez votre assistant pour mieux comprendre les actualités et leurs enjeux pour vos filiales."
        )}

        <section class="chat-panel">
            <div class="chat-head">
                <div class="bot-avatar">✧</div>
                <div>
                    <strong>INTELLIGENXIA</strong>
                    <small>Assistant de veille stratégique</small>
                </div>
            </div>

            <div style="
                width: 100%;
                height: 650px;
                background: #ffffff;
                border-radius: 0 0 16px 16px;
                overflow: hidden;
            ">
                <iframe
                    src="https://copilotstudio.microsoft.com/environments/${encodeURIComponent(CONFIG.copilot.environmentId)}/bots/${encodeURIComponent(CONFIG.copilot.schemaName)}/webchat?__version__=2&enableFileAttachment=false&cliAgent=true"
                    title="Assistant INTELLIGENXIA"
                    style="width: 100%; height: 100%; border: 0;"
                    frameborder="0"
                    allow="microphone"
                ></iframe>
            </div>
        </section>
    `;
}



const ACTOR_CATEGORIES = {
    insurance: {
        label: "Compagnies d'assurance",
        icon: "♧"
    },
    finance: {
        label: "Acteurs financiers et partenaires",
        icon: "◇"
    },
    institution: {
        label: "Institutions et régulateurs",
        icon: "⚖"
    }
};


const ACTOR_ALIASES = {
    "Belife Insurance Côte d'Ivoire": [
        "Belife",
        "Belife Insurance",
        "Belife Insurance CI",
        "Belife CI",
        "Belife Côte d'Ivoire",
        "Belife Côte d’Ivoire",
        "Belife Insurance Côte d'Ivoire"
    ],

    "Leadway Assurance Côte d'Ivoire": [
        "Leadway",
        "Leadway Assurance",
        "Leadway Assurance CI",
        "Leadway CI",
        "Leadway Côte d'Ivoire",
        "Leadway Côte d’Ivoire",
        "Leadway Assurance Côte d'Ivoire"
    ],

    "Atlanta Assurance Côte d'Ivoire": [
        "Atlanta Assurance",
        "Atlanta Assurance CI",
        "Atlanta Assurance Côte d'Ivoire",
        "Atlanta Assurance Côte d’Ivoire",
        "Atlanta Assurances",
        "Atlanta Group"
    ],

    "GNA Assurances Côte d'Ivoire": [
        "GNA",
        "GNA-CI",
        "GNA CI",
        "GNA-CI Côte d'Ivoire",
        "GNA Assurances",
        "GNA Assurances CI",
        "GNA Assurances Côte d'Ivoire",
        "GNA Assurances Côte d’Ivoire"
    ],

    "SAAR Assurances Côte d'Ivoire": [
        "SAAR",
        "SAAR Assurances",
        "SAAR Assurance CI",
        "SAAR Assurances CI",
        "SAAR CI",
        "SAAR Côte d'Ivoire",
        "SAAR Assurances Côte d'Ivoire"
    ],

    "SanlamAllianz": [
        "Sanlam Allianz",
        "SanlamAllianz",
        "SanlamAllianz CI",
        "SanlamAllianz Assurances CI",
        "Sanlam Allianz Côte d'Ivoire"
    ],

    "Orange Money": [
        "Orange Money",
        "Orange Money CI",
        "Orange Money Côte d'Ivoire",
        "Orange Money Côte d’Ivoire"
    ],

    "FANAF": [
        "FANAF",
        "Fédération des sociétés d'assurances de droit national africaines",
        "Fédération des sociétés d'assurances de droit national africaines (FANAF)"
    ]
};

const ACTOR_TYPES = {
    insurance: [
        "Belife Insurance Côte d'Ivoire",
        "Leadway Assurance Côte d'Ivoire",
        "Atlanta Assurance Côte d'Ivoire",
        "GNA Assurances Côte d'Ivoire",
        "SAAR Assurances Côte d'Ivoire",
        "SanlamAllianz",
        "SUNU Assurances",
        "AFG Assurances",
        "Activa Assurances Côte d'Ivoire",
        "Wafa Assurance Côte d'Ivoire",
        "COMAR Assurances Côte d'Ivoire",
        "Schiba Assurances",
        "Kenya Re",
        "L'Africaine des Assurances"
    ],
    finance: [
        "Orange Money",
        "AFG Bank",
        "BGFI Bank Côte d'Ivoire",
        "Bridge Bank",
        "BCP",
        "BHCI",
        "Attijariwafa",
        "Witti Finances",
        "Yango Group",
        "Moov Africa",
        "Orange"
    ],
    institution: [
        "CIMA",
        "FANAF",
        "ASA-CI",
        "CNPS",
        "Direction des assurances du Trésor",
        "Le Trésor Public"
    ]
};

function normalizeActorKey(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}


function getCanonicalActor(name) {
    const originalName = String(name || "").trim();
    if (!originalName) return "";

    const key = normalizeActorKey(originalName);

    for (const [canonical, aliases] of Object.entries(ACTOR_ALIASES)) {
        if (
            normalizeActorKey(canonical) === key ||
            aliases.some(alias => normalizeActorKey(alias) === key)
        ) {
            return canonical;
        }
    }

    return originalName;
}

function getActorCategory(name) {
    const canonical = getCanonicalActor(name);
    const key = normalizeActorKey(canonical);

    for (const [category, names] of Object.entries(ACTOR_TYPES)) {
        if (names.some(item => normalizeActorKey(item) === key)) {
            return category;
        }
    }

    return "unclassified";
}



function competitorPage() {
    const competitorMap = new Map();

    // Valeurs à ignorer
    const ignored = new Set([
        "À vérifier",
        "Non applicable",
        "Test interne NSIA",
        "AssurTest CI (acteur fictif — test interne)",
        "Ivoire Assurance Démo — acteur entièrement fictif"
    ].map(normalizeActorKey));

    // Parcourir les articles disponibles
    articles.forEach(article => {
        const names = Array.isArray(article.competitor)
            ? article.competitor
            : String(article.competitor || "").split(/[;,]/);

        // Éviter de compter deux fois le même acteur dans un article
        const actorsInArticle = new Set();

        names.forEach(name => {
            const originalName = String(name || "").trim();
            if (!originalName) return;

            if (ignored.has(normalizeActorKey(originalName))) return;

            const canonical = getCanonicalActor(originalName);
            const category = getActorCategory(canonical);

            // Garder uniquement les acteurs des trois catégories
            if (!Object.keys(ACTOR_CATEGORIES).includes(category)) return;

            const key = normalizeActorKey(canonical);

            // Éviter les doublons dans le même article
            if (actorsInArticle.has(key)) return;
            actorsInArticle.add(key);

            if (!competitorMap.has(key)) {
                competitorMap.set(key, {
                    name: canonical,
                    category,
                    count: 0
                });
            }

            competitorMap.get(key).count++;
        });
    });

    const dynamicCompetitors = Array.from(competitorMap.values());

    const recognizedActors = dynamicCompetitors.filter(actor =>
        Object.keys(ACTOR_CATEGORIES).includes(actor.category)
    );

    // Afficher chaque catégorie
    const sections = Object.entries(ACTOR_CATEGORIES).map(([key, config]) => {
        const actors = recognizedActors
            .filter(actor => actor.category === key)
            .sort((a, b) => a.name.localeCompare(b.name, "fr"));

        return `
            <section class="competitor-category-section">
                <div class="section-heading">
                    <div>
                        <span class="section-symbol">${config.icon}</span>
                        <h2>${config.label}</h2>
                    </div>
                    <span class="page-subtitle">
                        ${actors.length} acteur(s)
                    </span>
                </div>

                <div class="competitor-grid">
                    ${
                        actors.length
                            ? actors.map(actor => `
                                <article
                                    class="competitor-card competitor-clickable"
                                    role="button"
                                    tabindex="0"
                                    data-competitor-name="${actor.name.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"
                                >
                                    <div class="type-icon">${config.icon}</div>
                                    <h3>${actor.name}</h3>
                                    <p>${config.label}</p>
                                    <span class="count">
                                        ${actor.count} article(s)
                                    </span>
                                    <span class="competitor-open">
                                        Consulter les actualités →
                                    </span>
                                </article>
                            `).join("")
                            : `<div class="empty-state">
                                Aucun acteur identifié dans cette catégorie.
                            </div>`
                    }
                </div>
            </section>
        `;
    }).join("");

    return `
        ${pageHeader(
            "ENVIRONNEMENT CONCURRENTIEL",
            "Concurrents",
            "Explorez les compagnies d'assurance, les partenaires et les institutions suivis par INTELLIGENXIA."
        )}

        <div class="toolbar">
            <span class="page-subtitle">
                ${recognizedActors.length} acteurs classés
            </span>
        </div>

        ${sections}

        <p class="demo-note"></p>
    `;
}


function competitorDetail(name, filters = {}) {
    const competitorName = String(name || "").trim();

    if (!competitorName) return competitorPage();

    const isRelated = a => (
        Array.isArray(a.competitor)
            ? a.competitor
            : String(a.competitor || "").split(/[;,]/)
    ).some(company =>
    normalizeActorKey(getCanonicalActor(company)) ===
    normalizeActorKey(getCanonicalActor(competitorName))
);

    let related = articles.filter(isRelated);

    if (filters.category) {
        related = related.filter(a => a.category === filters.category);
    }

    if (filters.priority === "yes") {
        related = related.filter(a => a.priority);
    }

    if (filters.priority === "no") {
        related = related.filter(a => !a.priority);
    }

    if (filters.q) {
        related = related.filter(a =>
            (a.title + " " + a.summary + " " + a.category)
                .toLowerCase()
                .includes(filters.q.toLowerCase())
        );
    }

    const allRelated = articles.filter(isRelated);

    const categories = [
        ...new Set(allRelated.map(a => a.category).filter(Boolean))
    ];

    return `
        <button class="back-link" id="backToCompetitors">
            ← Retour aux concurrents
        </button>

        ${pageHeader(
            "ENVIRONNEMENT CONCURRENTIEL",
            competitorName,
            "Suivi des actualités associées à cet acteur."
        )}

        <section class="competitor-profile panel">
            <div>
                <small>DOMAINES D'ACTIVITÉ</small>
                <strong>Assurance</strong>
            </div>

            <div>
                <small>ARTICLES ASSOCIÉS</small>
                <strong>${allRelated.length}</strong>
            </div>

            <div>
                <small>ARTICLES PRIORITAIRES</small>
                <strong>${allRelated.filter(a => a.priority).length}</strong>
            </div>

            <div>
                <small>STATUT</small>
                <strong>Suivi actif</strong>
            </div>
        </section>

        <div class="section-heading">
            <div>
                <span class="section-symbol">▤</span>
                <h2>Actualités concernant ${competitorName}</h2>
            </div>
        </div>

        <div class="toolbar competitor-filters">

            <input
                class="filter-select"
                id="competitorSearch"
                placeholder="Rechercher dans les actualités..."
                value="${filters.q || ""}"
            >

            <select class="filter-select" id="competitorCategory">
                <option value="">Tous les types</option>
                ${categories.map(v => `
                    <option value="${v}" ${filters.category === v ? "selected" : ""}>
                        ${v}
                    </option>
                `).join("")}
            </select>

            <select class="filter-select" id="competitorPriority">
                <option value="">Toutes les priorités</option>
                <option value="yes" ${filters.priority === "yes" ? "selected" : ""}>
                    Prioritaires
                </option>
                <option value="no" ${filters.priority === "no" ? "selected" : ""}>
                    Non prioritaires
                </option>
            </select>

        </div>

        <p class="page-subtitle">
            ${related.length} article(s) associé(s)
        </p>

        <div class="article-list" id="competitorArticleList">
            ${
                related.length
                    ? related.map(articleCard).join("")
                    : `<div class="empty-state">
                        Aucune actualité ne correspond à ces filtres pour ce concurrent.
                    </div>`
            }
        </div>

        <p class="demo-note">
            Les associations concurrent–article sont issues des informations
            actuellement renseignées dans SharePoint.
        </p>
    `;
}
function documentAnalysisPage(){
    return `
        <section class="page-header">
            <div>
                <h1>Analyse documentaire</h1>
                <p>Déposez vos documents et laissez INTELLIGENXIA en extraire les informations stratégiques.</p>
            </div>
        </section>

       <section class="document-analysis-container">
    <div class="document-upload-card">
        <h2>Importer un document</h2>
        <p>Formats acceptés : PDF, Word et images.</p>

        <div class="document-upload-zone">
            <div class="upload-icon">📄</div>
            <h3>Sélectionnez votre document</h3>
            <p>Choisissez un fichier depuis votre ordinateur.</p>

            <input
                type="file"
                id="documentFile"
                accept=".pdf,.doc,.docx,image/*"
            >
            <div class="document-actions">
    <button type="button" id="saveDocumentBtn">
        Enregistrer le document
    </button>

    <button type="button" id="analyzeDocumentBtn" disabled>
        Analyser avec INTELLIGENXIA
    </button>
</div>
        </div>
    </div>
</section>
    `;
}
function stats(){
 const bars=(items)=>items.map(x=>`<div class="bar-line"><span>${x[0]}</span><div class="bar-track"><div class="bar-fill" style="width:${x[1]}%"></div></div><b>${x[1]}%</b></div>`).join("");
 const mini=(items)=>items.map(x=>`<div class="mini-bar-row"><span>${x[0]}</span><div class="mini-track"><i style="width:${x[1]}%"></i></div><b>${x[2]}</b></div>`).join("");
 // Répartition réelle des articles par famille de veille
const familles = [
    "Concurrentielle",
    "Stratégique",
    "Technologique",
    "Réglementaire"
];

const articlesClasses = articles.filter(a => a.family);

const repartitionFamilles = familles.map(famille => {
    const nombre = articlesClasses.filter(a =>
        (a.family || "").toLowerCase().includes(famille.toLowerCase())
    ).length;

    const pourcentage = articlesClasses.length
        ? Math.round(nombre / articlesClasses.length * 100)
        : 0;

    return [famille, pourcentage];
});
// Répartition réelle des articles par pays
// Répartition réelle des articles par pays
const paysMap = {};

articles.forEach(a => {
    const paysOriginal = (a.country || "").trim();

    if (paysOriginal) {
        const paysNormalise = paysOriginal
            .toLowerCase()
            .normalize("NFC")
            .replace(/[’‘`]/g, "'")
            .replace(/\s+/g, " ");

        if (!paysMap[paysNormalise]) {
            paysMap[paysNormalise] = {
                label: paysOriginal,
                count: 0
            };
        }

        paysMap[paysNormalise].count++;
    }
});

const paysTries = Object.values(paysMap)
    .sort((a, b) => b.count - a.count);

const maxArticlesPays = Math.max(
    1,
    ...paysTries.map(p => p.count)
);

const articlesParPays = paysTries.map(p => [
    p.label,
    Math.round(p.count / maxArticlesPays * 100),
    String(p.count)
]);
// Répartition réelle des articles par concurrent
const concurrentsMap = {};

articles.forEach(a => {
    const acteurs = (a.competitor || "")
        .split(/[;,]/)
        .map(nom => nom.trim())
        .filter(Boolean);

    const acteursArticle = new Set();
    const acteursExclus = [
    "À vérifier",
    "Non applicable",
    "Test interne NSIA",
    "AssurTest CI",
    "Ivoire Assurance Démo"
];

    acteurs.forEach(nom => {
        const acteur = typeof getCanonicalActor === "function"
            ? getCanonicalActor(nom)
            : nom;

        if (
    acteur &&
    !acteursExclus.some(nom =>
        nom.toLowerCase() === acteur.toLowerCase()
    ) &&
    (typeof getActorCategory !== "function" ||
     getActorCategory(acteur) === "insurance")
) {
    acteursArticle.add(acteur);
}
    });

    acteursArticle.forEach(acteur => {
        concurrentsMap[acteur] = (concurrentsMap[acteur] || 0) + 1;
    });
});

const concurrentsTries = Object.entries(concurrentsMap)
    .sort((a, b) => b[1] - a[1]);

const concurrentsTop = concurrentsTries.slice(0, 5);
const autresConcurrents = concurrentsTries
    .slice(5)
    .reduce((total, item) => total + item[1], 0);

if (autresConcurrents > 0) {
    concurrentsTop.push(["Autres acteurs", autresConcurrents]);
}

const maxArticlesConcurrent = Math.max(
    1,
    ...concurrentsTop.map(c => c[1])
);

const articlesParConcurrent = concurrentsTop.map(([nom, nombre]) => [
    nom,
    Math.round(nombre / maxArticlesConcurrent * 100),
    String(nombre)
]);
// Répartition réelle des niveaux de priorité
const niveauxPriorite = [
    { label: "Critique", min: 5, max: 5 },
    { label: "Élevé", min: 4, max: 4 },
    { label: "Modéré", min: 3, max: 3 },
    { label: "Faible", min: 1, max: 2 }
];

const totalScores = articles.filter(a =>
    a.score !== "" && a.score !== null && a.score !== undefined
).length;

const repartitionPriorites = niveauxPriorite.map(niveau => {
    const nombre = articles.filter(a => {
        const score = Number(a.score);
        return Number.isFinite(score) &&
            score >= niveau.min &&
            score <= niveau.max;
    }).length;

    const pourcentage = totalScores
        ? Math.round(nombre / totalScores * 100)
        : 0;

    return [niveau.label, pourcentage];
});
// Comptage réel des opportunités et menaces
const nombreOpportunites = articles.filter(a =>
    String(a.opportunities || "").trim() !== ""
).length;

const nombreMenaces = articles.filter(a =>
    String(a.threats || "").trim() !== ""
).length;

const repartitionEnseignements = [
    ["Opportunités", 0, String(nombreOpportunites)],
    ["Menaces", 0, String(nombreMenaces)],
    ["Risques", 0, "À classifier"],
    ["Signaux à surveiller", 0, "À classifier"]
];


console.table(
    articles.map(a => ({
        Article: a.title,
        Score: a.score
    }))
);
 // Préparation des données du graphique mensuel
const today = new Date();

const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);

    const count = articles.filter(a => {
        const articleDate = new Date(a.collectDate || a.rawDate);
        return !isNaN(articleDate.getTime()) &&
            articleDate.getMonth() === date.getMonth() &&
            articleDate.getFullYear() === date.getFullYear();
    }).length;

    return {
        label: date.toLocaleDateString("fr-FR", { month: "short" }),
        count
    };
});

const monthlyMax = Math.max(4, ...monthlyData.map(m => m.count));
const monthlyScale = Math.ceil(monthlyMax / 3) * 3;
 return `${pageHeader("PILOTAGE DE LA VEILLE","Statistiques","Une vision consolidée de l’activité de veille et de ses enseignements stratégiques.")}
 <div class="stats-toolbar"><div><strong>Vue d’ensemble</strong><small>Données de démonstration · Novembre 2026</small></div><div class="stats-filters"><select id="statsPeriod"><option value="">Toute la période</option><option>30 derniers jours</option><option>90 derniers jours</option><option>Année 2026</option></select><select id="statsCountry"><option value="">Tous les pays</option><option>Côte d’Ivoire</option><option>Cameroun</option><option>Gabon</option><option>Bénin</option><option>Togo</option></select><select id="statsSubsidiary"><option value="">Toutes les filiales</option><option>NSIA Vie</option><option>NSIA Non Vie</option><option>NSIA Participations</option></select></div></div>
 <section class="kpi-grid stats-kpis"><article class="kpi-card kpi-blue"><div class="kpi-icon">▤</div><div class="kpi-data"><strong>${articles.length}</strong><span>Articles SharePoint</span><small>+18 % sur la période</small></div></article><article class="kpi-card kpi-gold"><div class="kpi-icon">☆</div><div class="kpi-data"><strong>${articles.filter(a=>a.priority).length}</strong><span>Articles prioritaires</span><small>24 % des articles</small></div></article><article class="kpi-card kpi-purple"><div class="kpi-icon">✧</div><div class="kpi-data"><strong>18</strong><span>Recommandations générées</span><small>À suivre par les filiales</small></div></article><article class="kpi-card kpi-green"><div class="kpi-icon">◎</div><div class="kpi-data"><strong>09</strong><span>Filiales / marchés couverts</span><small>Couverture de démonstration</small></div></article></section>
 <div class="stats-section-title"><div><h2>Activité de veille</h2><p>Suivi de la collecte et de la répartition des informations</p></div></div>
 <div class="stat-grid stats-grid-wide"><section class="stat-panel"><div class="panel-heading"><h3>Évolution mensuelle des articles collectés</h3><span class="panel-unit">Nombre d’articles</span></div><div class="monthly-chart">
    <div class="chart-y-labels">
        <span>${monthlyScale}</span>
        <span>${Math.round(monthlyScale * 2 / 3)}</span>
        <span>${Math.round(monthlyScale / 3)}</span>
        <span>0</span>
    </div>

    <div class="monthly-bars">
        ${monthlyData.map(m => `
            <div class="month-column">
                <div class="month-bar-wrap">
                    <i style="height:${m.count / monthlyScale * 100}%"
                       title="${m.count} articles"></i>
                </div>
                <span>${m.label}</span>
                <b>${m.count}</b>
            </div>
        `).join("")}
    </div>
</div></div>
</section>

<section class="stat-panel">
    <h3>Répartition des articles par type de veille</h3>
    <div class="bar-list">
        ${bars(repartitionFamilles)}
    </div>
    <p class="chart-footnote">
        Pourcentage indicatif de répartition des articles classifiés.
    </p>
</section>
</div><div class="stat-grid stats-grid-wide stats-gap"><section class="stat-panel"><h3>Articles par pays surveillé</h3>${mini(articlesParPays)}</section><section class="stat-panel"><h3>Articles par concurrent</h3>${mini(articlesParConcurrent)}</section></div>
 <div class="stats-section-title stats-section-spaced"><div><h2>Analyse stratégique</h2><p>Lecture des risques, opportunités et actions à engager</p></div></div>
 <div class="stat-grid stats-grid-wide"><section class="stat-panel"><h3>Répartition des niveaux de priorité</h3><div class="bar-list">${bars(repartitionPriorites)}</div><p class="chart-footnote">Répartition calculée à partir des scores réels des articles SharePoint.</p></section><section class="stat-panel"><h3>Nature des enseignements détectés</h3>${mini(repartitionEnseignements)}</section></div>
 <section class="stat-panel recommendations-panel"><div class="panel-heading"><div><h3>Recommandations stratégiques générées</h3><p>Suivi des actions proposées à partir des analyses d’articles</p></div><span class="recommendation-total">18 recommandations</span></div><div class="recommendation-status-grid"><div><strong>07</strong><span>À examiner</span></div><div><strong>08</strong><span>À mettre en œuvre</span></div><div><strong>03</strong><span>En cours de suivi</span></div></div><div class="recommendation-progress"><span style="width:17%"></span><span style="width:44%"></span><span style="width:39%"></span></div><div class="recommendation-legend"><span><i class="legend-grey"></i>À examiner</span><span><i class="legend-gold"></i>À mettre en œuvre</span><span><i class="legend-green"></i>En cours</span></div></section>
 <p class="demo-disclaimer">Les chiffres et répartitions présentés sont fictifs et servent uniquement à illustrer le futur tableau de bord. Ils seront remplacés par les données réelles issues de SharePoint et de l’agent INTELLIGENXIA.</p>`
}
function articleDetail(id){
 const a=articles.find(x=>String(x.id)===String(id));
 if(!a)return `<button class="back-link" id="backToNews">← Retour aux actualités</button><div class="empty-state">Article introuvable.</div>`;

const blocks = [
  ["Résumé de l’article", a.summary],
  ["Enseignements clés", a.analysis],
  ["Impacts sur la filiale", a.impacts],
  ["Opportunités pour la filiale", a.opportunities],
  ["Menaces pour la filiale", a.threats],
  ["Recommandations pour la filiale", a.recommendation]
];

 return `<button class="back-link" id="backToNews">← Retour aux actualités</button><div class="detail-top">${pageHeader("FICHE D’ANALYSE STRATÉGIQUE", "Analyse de l’article", "Informations et analyse enregistrées dans SharePoint.")}</div><section class="detail-article panel"><div class="article-meta"><span class="tag tag-blue">${escapeHtml(a.category||"Catégorie non renseignée")}</span>${a.subcategory?`<span class="tag tag-blue">${escapeHtml(a.subcategory)}</span>`:""}<span>${escapeHtml(a.date||"Date non renseignée")}</span>${a.priority?'<span class="tag tag-green">PRIORITAIRE</span>':''}</div><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.summary||"Résumé non renseigné.")}</p><div class="detail-meta-grid"><div><small>SOURCE</small><strong>${escapeHtml(a.source||"Non renseignée")}</strong></div><div><small>PAYS CONCERNÉ</small><strong>${escapeHtml(a.country||"Non renseigné")}</strong></div><div><small>CONCURRENT / ACTEUR</small><strong>${escapeHtml(a.competitor||"Non renseigné")}</strong></div><div><small>SCORE D’IMPORTANCE</small><strong>${escapeHtml(a.score||"Non renseigné")}</strong></div>${a.url?`<div><small>ARTICLE ORIGINAL</small><strong><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">Consulter la source ↗</a></strong></div>`:""}</div></section><div class="analysis-heading"><div><span class="section-symbol">✧</span><h2>Analyse INTELLIGENXIA</h2><p>Contenu enregistré dans la liste SharePoint</p></div></div><section class="analysis-grid">${blocks.map((x,i)=>`<article class="analysis-card"><div class="analysis-card-head"><span class="analysis-number">0${i+1}</span><h3>${x[0]}</h3></div><p>${formatAnalysisText(x[1])}</p></article>`).join("")}</section><div class="detail-actions"><button class="outline-button" id="backToNewsBottom">← Retour à la liste</button><button class="primary-button" id="printAnalysis">Imprimer l’analyse ↗</button></div>`;
 
function formatAnalysisText(value) {
  const text = escapeHtml(value || "Non renseigné dans la fiche SharePoint.");

  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

}

async function loadArticlesFromSharePoint(silent = false) {
    if (articlesLoading) return;

    articlesLoading = true;

    const previousFeaturedIndex = featuredIndex;

    if (!silent) articlesLoadError = "";

    try {
        
        const rows = await window.fetchSharePointArticles();

        articles = rows.map(item => {
            const f = item.fields || {};

            const date = f.Date_Publication
                ? new Date(f.Date_Publication).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                })
                : "";

            return {
                id: String(item.id),
                title: f.Title || "(Sans titre)",
                summary: f.R_x00e9_sum_x00e9_ || "",
                source: f.Nom_Source || "",
                date,
                rawDate: f.Date_Publication || "",
                collectDate: f.Date_Collecte || "",
                family: f.Famille_Veille || "",
subcategory: f.AjouterCategorie || "",
category: f.AjouterCategorie || "",
                country: f.AjouterPays || "",
                competitor: f.Concurrent_Acteur || "",
                score: f.Score_Importance ?? "",
                priority: f.AjouterPrioritaire === true ||
                    String(f.AjouterPrioritaire).toLowerCase() === "true",
                analysis: f.Analyse_NSIA || "",
                impacts: f.Impacts_Filiale || "",
                opportunities: f.Opportunites_Filiale || "",
                threats: f.Menaces_Filiale || "",
                recommendation: f.Recommandation || "",
                url: safeExternalUrl(f.URL_Source_Texte || f.URL_Source),
                image: f.URL_Image || ""
            };
        });

    } catch (error) {
        articlesLoadError = error.message || String(error);
        console.error("Chargement SharePoint impossible", error);

    } finally {
        articlesLoading = false;

        const currentPage = window.currentPage || "Accueil";

        if (!silent || currentPage === "Accueil") {
            render(currentPage);

            if (silent && currentPage === "Accueil") {
                showFeaturedSlide(previousFeaturedIndex);
            }
        }
    }
}

window.loadArticlesFromSharePoint=loadArticlesFromSharePoint;

const renderers={"Accueil":home,"Actualités":()=>listing(false),"Actualités prioritaires":()=>listing(true),"Types de veille":typePage,"INTELLIGENXIA":assistant,"Concurrents":competitorPage,"Statistiques":stats,"Analyse documentaire":documentAnalysisPage};

function openCompetitor(name) {
    window.currentCompetitorName = name;

    content.innerHTML = competitorDetail(name);

    document.querySelectorAll(".nav-link").forEach(b =>
        b.classList.toggle("active", b.dataset.page === "Concurrents")
    );

    wireCompetitorDetail();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function wireCompetitorDetail(){document.getElementById("backToCompetitors")?.addEventListener("click",()=>render("Concurrents"));document.querySelectorAll("[data-open-article]").forEach(b=>b.addEventListener("click",()=>openArticle(b.dataset.openArticle)));}
function openArticle(id){content.innerHTML=articleDetail(id);document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page==="Actualités"));wireDetail();window.scrollTo({top:0,behavior:"smooth"});}
function wireDetail(){const back=()=>render("Actualités");document.getElementById("backToNews")?.addEventListener("click",back);document.getElementById("backToNewsBottom")?.addEventListener("click",back);document.getElementById("printAnalysis")?.addEventListener("click",()=>window.print());}
function wirePage(page){
    // Carrousel des actualités prioritaires
if (page === "Accueil") {

    const track = document.getElementById("priorityCarouselTrack");

    if (track) {
        const cards = [...track.querySelectorAll(".news-card")];
        const dotsContainer = document.getElementById("priorityDots");

        let currentIndex = 0;
        let carouselTimer = null;

        if (cards.length > 1) {

            dotsContainer.innerHTML = cards.map((_, i) => `
                <button class="news-carousel-dot ${i === 0 ? "active" : ""}"
                    data-index="${i}"
                    aria-label="Afficher l'actualité ${i + 1}">
                </button>
            `).join("");

            const dots = [...dotsContainer.querySelectorAll(".news-carousel-dot")];

            function showCard(index) {
                currentIndex = (index + cards.length) % cards.length;

                cards.forEach((card, i) => {
                    card.classList.toggle("active", i === currentIndex);
                });

                dots.forEach((dot, i) => {
                    dot.classList.toggle("active", i === currentIndex);
                });
            }

            document.getElementById("priorityNext")
                ?.addEventListener("click", () => showCard(currentIndex + 1));

            document.getElementById("priorityPrev")
                ?.addEventListener("click", () => showCard(currentIndex - 1));

            dots.forEach(dot => {
                dot.addEventListener("click", () => {
                    showCard(Number(dot.dataset.index));
                });
            });

            carouselTimer = setInterval(() => {
                showCard(currentIndex + 1);
            }, 5000);

            window.priorityCarouselTimer = carouselTimer;
        }
    }
}
        if (page === "Accueil" && featuredArticles.length > 1) {

        const next = () => showFeaturedSlide(featuredIndex + 1);
        const prev = () => showFeaturedSlide(featuredIndex - 1);

        document.getElementById("featuredNext")
            ?.addEventListener("click", next);

        document.getElementById("featuredPrev")
            ?.addEventListener("click", prev);

        document.querySelectorAll(".featured-dot").forEach(dot => {
            dot.addEventListener("click", () => {
                showFeaturedSlide(Number(dot.dataset.slide));
            });
        });

        featuredCarouselTimer = setInterval(next, 5000);
    }
 document.querySelectorAll("[data-go]").forEach(b => {
    b.addEventListener("click", () => {
        const page = b.dataset.go;
        console.log("Rubrique cliquée :", page);

        if (page === "INTELLIGENXIA") {
            window.open(INTELLIGENXIA_URL, "_blank", "noopener,noreferrer");
            return;
        }

        render(page);
    });
});
 document.querySelectorAll("[data-open-article]").forEach(b=>b.addEventListener("click",()=>{const a=articles.find(x=>x.id===b.dataset.openArticle);if(a)openArticle(a.id)}));
 const search=document.getElementById("homeSearch");if(search)search.addEventListener("input",()=>{const q=search.value.toLowerCase();document.querySelectorAll(".news-card").forEach(c=>c.hidden=!c.innerText.toLowerCase().includes(q))});
 const filter=document.getElementById("categoryFilter");if(filter)filter.addEventListener("change",()=>{document.querySelectorAll(".article-row").forEach(row=>row.hidden=!!filter.value&&!row.innerText.includes(filter.value))});
 document.querySelectorAll(".prompt-chip").forEach(b=>b.addEventListener("click",()=>{document.getElementById("chatInput").value=b.textContent}));
 const form=document.getElementById("chatForm");if(form)form.addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("chatInput");if(!input.value.trim())return;document.getElementById("chatMessages").innerHTML+=`<div class="bubble user-bubble" style="margin:14px 0 0 auto;background:#fff8e8;border-color:#f1dfb5">${escapeHtml(input.value)}</div><p class="chat-hint">Cette démonstration n'est pas encore reliée à l'agent IA. Son intégration sera faite dans une prochaine étape.</p>`;input.value=""});
 
document.querySelectorAll("[data-competitor-name]").forEach(card => {
    const go = () => openCompetitor(card.dataset.competitorName);

    card.addEventListener("click", go);

    card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
        }
    });
});

 const add=document.getElementById("addCompetitor");if(add)add.addEventListener("click",()=>showToast("Le formulaire d'ajout de concurrent sera ajouté ensuite."));
 const back=document.getElementById("backToCompetitors");if(back)back.addEventListener("click",()=>render("Concurrents"));
 const refreshCompetitor=()=>{if(window.currentCompetitorIndex!==undefined){const f={q:document.getElementById("competitorSearch")?.value||"",category:document.getElementById("competitorCategory")?.value||"",priority:document.getElementById("competitorPriority")?.value||""};content.innerHTML=competitorDetail(window.currentCompetitorIndex,f);wireCompetitorDetail()}};
 ["competitorSearch","competitorCategory","competitorPriority"].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener(id==="competitorSearch"?"input":"change",refreshCompetitor)});
// Gestion de la sélection d'un document
if (page === "Analyse documentaire") {

    const fileInput = document.getElementById("documentFile");
    const saveButton = document.getElementById("saveDocumentBtn");
    const analyzeButton = document.getElementById("analyzeDocumentBtn");

    if (fileInput) {
        fileInput.addEventListener("change", () => {

            let display = document.getElementById("documentFileName");

            if (!display) {
                display = document.createElement("p");
                display.id = "documentFileName";
                fileInput.insertAdjacentElement("afterend", display);
            }

            const file = fileInput.files[0];

            display.textContent = file
                ? "Document sélectionné : " + file.name
                : "Aucun document sélectionné";

            if (saveButton) saveButton.disabled = !file;
            if (analyzeButton) analyzeButton.disabled = !file;
        });
    }

    // Enregistrement dans SharePoint
    if (saveButton) {
        saveButton.addEventListener("click", async () => {

            const file = fileInput?.files[0];

            if (!file) {
                alert("Veuillez sélectionner un document.");
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = "Enregistrement en cours...";

            try {
                const result = await window.uploadDocumentToSharePoint(file);

                console.log("Document SharePoint :", result);

                alert("Document enregistré avec succès dans SharePoint !");
                saveButton.textContent = "Document enregistré";

            } catch (error) {
                console.error("Erreur d'enregistrement :", error);

                alert("Impossible d'enregistrer le document : " + error.message);

                saveButton.disabled = false;
                saveButton.textContent = "Enregistrer le document";
            }
        });
    }
}
// Enregistrement du document dans SharePoint
if (saveButton) {
    saveButton.addEventListener("click", async () => {

        const file = fileInput.files[0];

        if (!file) {
            alert("Veuillez sélectionner un document.");
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Enregistrement en cours...";

        try {
            const result = await window.uploadDocumentToSharePoint(file);

            alert("Document enregistré avec succès dans SharePoint !");
            console.log("Document SharePoint :", result);

            saveButton.textContent = "Document enregistré";

        } catch (error) {
            console.error("Erreur d'enregistrement :", error);

            alert("Impossible d'enregistrer le document : " + error.message);

            saveButton.disabled = false;
            saveButton.textContent = "Enregistrer le document";
        }
    });
}
}
function escapeHtml(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
document.querySelectorAll(".nav-link").forEach(b => {
    b.addEventListener("click", () => {
        const page = b.dataset.page;

        if (page === "INTELLIGENXIA") {
            window.open(INTELLIGENXIA_URL, "_blank", "noopener,noreferrer");
            return;
        }

        render(page);
    });
});
document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
function render(page = "Accueil") {

    if (featuredCarouselTimer) {
        clearInterval(featuredCarouselTimer);
        featuredCarouselTimer = null;
    }

    window.currentPage = page;

    content.innerHTML = renderers[page]();

    document.querySelectorAll(".nav-link").forEach(b =>
        b.classList.toggle(
            "active",
            b.dataset.page === page ||
            (page === "Détail de l’article" && b.dataset.page === "Actualités")
        )
    );

    document.getElementById("sidebar").classList.remove("open");

    wirePage(page);

    const date = document.getElementById("currentDate");

    if (date) {
        date.textContent = new Intl.DateTimeFormat("fr-FR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(new Date());
    }
}
// Actualisation automatique SharePoint toutes les 30 secondes
setInterval(() => {
    if (document.visibilityState === "visible") {
        loadArticlesFromSharePoint(true);
    }
}, 30000);
// Actualisation automatique des articles SharePoint toutes les 30 secondes

// Affichage initial du portail
render("Accueil");

async function updateVisitCounters() {
    const visitorsElement = document.getElementById("visiteurs-uniques");
    const visitsElement = document.getElementById("total-visites");

    if (!visitorsElement || !visitsElement) return;
    if (typeof window.getVisitStats !== "function") return;

    try {
        const stats = await window.getVisitStats();

        visitorsElement.textContent = stats.visiteursUniques;
        visitsElement.textContent = stats.totalVisites;

    } catch (error) {
        console.error("Chargement des statistiques de visites impossible :", error);
    }
}
// Chargement des statistiques de fréquentation
updateVisitCounters();

function safeExternalUrl(value) {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
