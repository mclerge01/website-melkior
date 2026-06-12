/* ==========================================================================
   Admin editor - vanilla JS, schema-driven CMS
   ========================================================================== */

const API = {
  session: "/api/admin/session",
  content: "/api/admin/content",
  images: "/api/admin/images",
  image: "/api/admin/image",
  preview: "/api/preview",
  logout: "/api/auth/logout",
};

const RESPONSIVE_IMAGE_WIDTHS = Object.freeze([480, 960, 1440, 1920, 2560, 3840]);
const STANDARD_IMAGE_WIDTHS = Object.freeze([480, 960, 1440, 1920]);
const BACKGROUND_IMAGE_WIDTHS = Object.freeze([960, 1440, 1920, 2560, 3840]);
const OG_IMAGE_WIDTHS = Object.freeze([480, 960, 1200]);
const WEBP_IMAGE_QUALITY = 0.82;

const LOCALES = [
  { key: "fr-CA", label: "Français", sitePath: "/fr/" },
  { key: "en-CA", label: "English", sitePath: "/en/" },
];

const ADMIN_VIEWS = [
  { key: "content", label: "Contenu du site" },
  { key: "colors", label: "Couleurs" },
  { key: "images", label: "Images" },
  { key: "seo", label: "SEO" },
];

const COLOR_FIELDS = [
  ["primary", "Couleur principale"],
  ["primary_dark", "Couleur principale foncée"],
  ["primary_light", "Couleur principale claire"],
  ["secondary", "Couleur secondaire"],
  ["accent", "Accent"],
  ["accent_dark", "Accent foncé"],
  ["text", "Texte principal"],
  ["text_light", "Texte secondaire"],
  ["bg", "Arrière-plan"],
  ["bg_light", "Arrière-plan alternatif"],
  ["bg_dark", "Arrière-plan foncé"],
  ["border", "Bordures"],
].map(([key, label]) => ({ key, label, type: "color" }));

const SYNCED_LOCALE_FIELD_PATTERNS = [
  /^locales\.[^.]+\.popup\.enabled$/,
  /^locales\.[^.]+\.popup\.image$/,
];

const SHARED_FIELDS = [
  { key: "phone", label: "Téléphone affiché", type: "text" },
  { key: "phone_href", label: "Téléphone technique (lien tel:)", type: "text", hint: "Format recommandé : +15148366736." },
  { key: "email", label: "Courriel", type: "text" },
  { key: "booking_url", label: "Lien de réservation en ligne", type: "text", full: true },
  { key: "office_address", label: "Adresse du bureau", type: "text", full: true },
  { key: "regions", label: "Régions desservies", type: "text", full: true },
  { key: "profile_url", label: "Profil Multi-Prêts", type: "text", full: true },
  { key: "social.linkedin", label: "Profil LinkedIn", type: "text", full: true },
  { key: "social.instagram", label: "Profil Instagram", type: "text", full: true },
  { key: "social.facebook", label: "Profil Facebook", type: "text", full: true },
  { key: "social.tiktok", label: "Profil TikTok", type: "text", full: true },
  { key: "social.instagram_embed_url", label: "Widget Instagram Fouita (URL iframe)", type: "text", full: true, hint: "Utilisez l'URL d'iframe emb.fouita.com, par exemple https://emb.fouita.com/widget/..." },
  { key: "social.instagram_embed_title", label: "Titre accessible du widget Instagram", type: "text", full: true },
];

const SHARED_IMAGE_FIELDS = [
  { key: "hero_background", label: "Image de fond de la bannière", type: "image" },
  { key: "hero", label: "Portrait principal", type: "image" },
  { key: "portrait", label: "Portrait À propos", type: "image" },
  { key: "og", label: "Image de partage par défaut", type: "image" },
  { key: "multi_prets_logo", label: "Logo Multi-Prêts", type: "image" },
];

const CONTENT_SECTIONS = [
  {
    key: "header",
    label: "En-tête",
    fields: [
      { key: "site_name", label: "Nom affiché" },
      { key: "credential", label: "Profession / réseau" },
      { key: "cta_text", label: "Bouton principal" },
      { key: "cta_link", label: "Lien du bouton" },
    ],
  },
  {
    key: "nav",
    label: "Navigation",
    description: "Ces liens alimentent à la fois la barre de navigation et le pied de page.",
    lists: [
      {
        key: "items",
        label: "Liens principaux",
        fields: [
          { key: "label", label: "Libellé" },
          { key: "href", label: "Lien" },
        ],
      },
    ],
  },
  {
    key: "popup",
    label: "Fenêtre d’annonce",
    fields: [
      { key: "enabled", label: "Afficher à la première visite", type: "toggle" },
      { key: "title", label: "Titre" },
      { key: "message", label: "Message", type: "markdown", full: true },
      { key: "image", label: "Image optionnelle", type: "image", full: true },
      { key: "dismiss_label", label: "Bouton fermer" },
    ],
  },
  {
    key: "hero",
    label: "Bannière principale",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "title", label: "Grand titre", type: "markdown", full: true, hint: "Markdown court accepté pour gras/italique." },
      { key: "subtitle", label: "Texte d’introduction", type: "textarea", full: true },
      { key: "primary_cta", label: "Bouton consultation" },
      { key: "image_alt", label: "Texte alternatif de l’image", full: true },
    ],
  },
  {
    key: "stats",
    label: "Statistiques",
    lists: [
      {
        key: "items",
        label: "Statistiques",
        fields: [
          { key: "value", label: "Valeur" },
          { key: "label", label: "Libellé" },
        ],
      },
    ],
  },
  {
    key: "services",
    label: "Services hypothécaires",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre de section", type: "markdown", full: true },
    ],
    lists: [
      {
        key: "items",
        label: "Cartes de services",
        fields: [
          { key: "title", label: "Titre" },
          { key: "description", label: "Description", type: "markdown", full: true },
          { key: "icon_path", label: "Icône MDI - chemin SVG", type: "textarea", full: true, hint: "Collez seulement la valeur du path d’une icône MDI." },
        ],
      },
    ],
  },
  {
    key: "guide",
    label: "Guide",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre", type: "markdown", full: true },
      { key: "intro", label: "Introduction", type: "markdown", full: true },
    ],
    lists: [
      {
        key: "items",
        label: "Points du guide",
        fields: [
          { key: "title", label: "Titre" },
          { key: "description", label: "Description", type: "markdown", full: true },
        ],
      },
    ],
  },
  {
    key: "about",
    label: "À propos",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "title", label: "Titre", type: "markdown", full: true },
      { key: "body", label: "Texte biographique", type: "markdown", full: true },
      { key: "image_alt", label: "Texte alternatif de l’image", full: true },
    ],
    lists: [
      {
        key: "timeline",
        label: "Chronologie",
        fields: [
          { key: "year", label: "Année" },
          { key: "title", label: "Titre" },
          { key: "description", label: "Description", type: "markdown", full: true },
        ],
      },
    ],
  },
  {
    key: "testimonials",
    label: "Témoignages",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre", type: "markdown", full: true },
      { key: "prev_label", label: "Libellé bouton précédent" },
      { key: "next_label", label: "Libellé bouton suivant" },
    ],
    lists: [
      {
        key: "items",
        label: "Avis",
        fields: [
          { key: "quote", label: "Texte", type: "textarea", full: true },
          { key: "image", label: "Image optionnelle", type: "image", full: true },
          { key: "image_alt", label: "Texte alternatif optionnel", full: true },
          { key: "name", label: "Nom" },
          { key: "context", label: "Contexte" },
          { key: "translation_note", label: "Badge de traduction", required: false },
        ],
      },
    ],
  },
  {
    key: "media",
    label: "Médias",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre", type: "markdown", full: true },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "loading_label", label: "Message de chargement", full: true },
    ],
  },
  {
    key: "final_cta",
    label: "Appel à l’action",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre", type: "markdown", full: true },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "booking_cta", label: "Réservation - bouton" },
      { key: "booking_text", label: "Réservation - description", type: "textarea", full: true },
      { key: "email_cta", label: "Formulaire - bouton" },
      { key: "email_text", label: "Formulaire - description", type: "textarea", full: true },
      { key: "phone_cta", label: "Téléphone - bouton" },
      { key: "phone_text", label: "Téléphone - description", type: "textarea", full: true },
    ],
  },
  {
    key: "calculator",
    label: "Calculatrice",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre", type: "markdown", full: true },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "rate_note_title", label: "Encart taux - titre" },
      { key: "rate_note", label: "Encart taux - texte", type: "textarea", full: true },
      { key: "rate_link_label", label: "Encart taux - lien" },
      { key: "rate_link_url", label: "Encart taux - URL" },
      { key: "amount_label", label: "Champ montant" },
      { key: "rate_label", label: "Champ taux" },
      { key: "amortization_label", label: "Champ amortissement" },
      { key: "frequency_label", label: "Champ fréquence" },
      { key: "monthly_label", label: "Option mensuelle" },
      { key: "biweekly_label", label: "Option aux deux semaines" },
      { key: "result_label", label: "Résultat" },
      { key: "cta_text", label: "Bouton" },
      { key: "default_amount", label: "Montant par défaut" },
      { key: "default_rate", label: "Taux par défaut" },
      { key: "default_years", label: "Amortissement par défaut" },
    ],
    lists: [
      {
        key: "details",
        label: "Encarts d’aide",
        fields: [
          { key: "title", label: "Titre" },
          { key: "description", label: "Description", type: "textarea", full: true },
        ],
      },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre" },
      { key: "subtitle", label: "Introduction", type: "textarea", full: true },
      { key: "info_heading", label: "Titre des coordonnées" },
      { key: "phone_label", label: "Libellé téléphone" },
      { key: "email_label", label: "Libellé courriel" },
      { key: "address_label", label: "Libellé bureau" },
      { key: "regions_label", label: "Libellé régions" },
      { key: "form_name_label", label: "Formulaire - nom" },
      { key: "form_name_placeholder", label: "Placeholder nom" },
      { key: "form_email_label", label: "Formulaire - courriel" },
      { key: "form_email_placeholder", label: "Placeholder courriel" },
      { key: "form_phone_label", label: "Formulaire - téléphone" },
      { key: "form_phone_placeholder", label: "Placeholder téléphone" },
      { key: "form_subject_label", label: "Formulaire - sujet" },
      { key: "form_subject_placeholder", label: "Placeholder sujet" },
      { key: "form_message_label", label: "Formulaire - message" },
      { key: "form_message_placeholder", label: "Placeholder message" },
      { key: "form_referral_label", label: "Formulaire - référence" },
      { key: "form_referral_placeholder", label: "Placeholder référence" },
      { key: "form_submit", label: "Bouton envoyer" },
      { key: "form_sending", label: "Texte d’envoi" },
      { key: "form_success", label: "Message succès", type: "textarea", full: true },
      { key: "form_error", label: "Message erreur" },
      { key: "form_network_error", label: "Message erreur réseau" },
      { key: "form_close", label: "Bouton fermer" },
    ],
    lists: [
      {
        key: "subjects",
        label: "Sujets du formulaire",
        fields: [{ key: "title", label: "Sujet" }],
      },
      {
        key: "referrals",
        label: "Sources de référence",
        fields: [{ key: "title", label: "Source" }],
      },
    ],
  },
  {
    key: "footer",
    label: "Pied de page",
    fields: [
      { key: "business_name", label: "Nom légal / commercial" },
      { key: "description", label: "Résumé SEO du pied de page", type: "textarea", full: true },
      { key: "description_heading", label: "Titre résumé" },
      { key: "pages_heading", label: "Titre navigation" },
      { key: "legal_heading", label: "Titre légal" },
      { key: "language_heading", label: "Titre langue" },
      { key: "privacy_label", label: "Politique de confidentialité" },
      { key: "legal_label", label: "Mentions légales" },
      { key: "admin_label", label: "Administration" },
      { key: "copyright", label: "Droits d’auteur", full: true },
    ],
  },
  {
    key: "privacy_page",
    label: "Politique de confidentialité",
    fields: [
      { key: "title", label: "Titre" },
      { key: "updated", label: "Date affichée" },
      { key: "body", label: "Contenu", type: "markdown", full: true },
    ],
  },
  {
    key: "legal_page",
    label: "Mentions légales",
    fields: [
      { key: "title", label: "Titre" },
      { key: "updated", label: "Date affichée" },
      { key: "body", label: "Contenu", type: "markdown", full: true },
    ],
  },
];

let csrfToken = "";
let contentSha = "";
let content = null;
let currentUser = "";
let activeView = "content";
let activeLocale = "fr-CA";
let activeSeoLocale = "fr-CA";
let activeListEditor = null;
let toastTimer = null;
let pendingImages = [];
let hasUnpublishedChanges = false;
const pendingImagePreviews = new Map();

const loginScreen = document.getElementById("login-screen");
const editorScreen = document.getElementById("editor-screen");
const loginError = document.getElementById("login-error");
const sessionStatus = document.getElementById("session-status");
const sidebar = document.getElementById("admin-sidebar");
const mobileTabs = document.getElementById("admin-mobile-tabs");
const contentEl = document.getElementById("admin-content");
const completionStatus = document.getElementById("admin-completion-status");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const statusDetail = document.getElementById("status-detail");
const toast = document.getElementById("toast");
const publishModal = document.getElementById("publish-modal");

function showLogin(error = "") {
  loginScreen.classList.remove("hidden");
  editorScreen.classList.add("hidden");
  const code = error || "login_required";
  const isDefault = code === "login_required";
  loginError.textContent = loginErrorMessage(code);
  loginError.classList.toggle("text-error", !isDefault);
  loginError.classList.toggle("text-light", isDefault);
}

function showEditor() {
  loginScreen.classList.add("hidden");
  editorScreen.classList.remove("hidden");
}

function loginErrorMessage(error) {
  const messages = {
    invalid_state: "La session de connexion a expiré. Réessayez.",
    oauth_not_configured: "L'application GitHub OAuth n'est pas configurée.",
    token_exchange_failed: "GitHub n'a pas retourné de jeton valide.",
    token_code_invalid: "Le code GitHub a expiré ou a déjà été utilisé. Réessayez.",
    oauth_redirect_mismatch: "L'URL de rappel GitHub ne correspond pas à la configuration OAuth.",
    not_contributor: "Ce compte GitHub n'a pas accès en écriture au dépôt.",
    login_failed: "La connexion a échoué.",
  };
  return messages[error] || "Connexion requise.";
}

function apiHeaders(includeCsrf = false) {
  const headers = { "Content-Type": "application/json" };
  if (includeCsrf) headers["X-CSRF-Token"] = csrfToken;
  return headers;
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: apiHeaders(options.csrf),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

async function apiHtml(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "POST",
    headers: apiHeaders(options.csrf),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return response.text();
}

function getPath(path) {
  if (!path) return content;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), content);
}

function setPath(path, value, options = {}) {
  const syncedPaths = syncedLocalePathsFor(path);
  if (syncedPaths.length) {
    for (const syncedPath of syncedPaths) setPathValue(syncedPath, value);
  } else {
    setPathValue(path, value);
  }
  syncAdminStateForPath(path);
  if (!options.silent) {
    hasUnpublishedChanges = true;
    setStatus("saving", "Modifications non publiées", "Cliquez sur Publier pour les mettre en ligne.");
  }
}

function syncedLocalePathsFor(path) {
  const value = String(path || "");
  if (!SYNCED_LOCALE_FIELD_PATTERNS.some((pattern) => pattern.test(value))) return [];
  const match = value.match(/^locales\.[^.]+\.(.+)$/);
  if (!match) return [];
  return LOCALES.map((locale) => `locales.${locale.key}.${match[1]}`);
}

function setPathValue(path, value) {
  const parts = path.split(".");
  let cursor = content;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (cursor[key] == null || typeof cursor[key] !== "object") cursor[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function syncAdminStateForPath(path = "") {
  if (!path) {
    refreshAdminState();
    return;
  }
  syncFieldByPath(path);
  syncListItemByPath(path);
  updateTranslationSummary();
}

function syncFieldByPath(path) {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`[data-admin-field-path="${cssEscape(path)}"]`).forEach(syncFieldMissingState);
}

function syncListItemByPath(path) {
  if (typeof document === "undefined") return;
  const match = String(path).match(/^(locales\.[^.]+\.[^.]+\.[^.]+)\.(\d+)(?:\.|$)/);
  if (!match) return;
  const selector = `[data-admin-list-path="${cssEscape(match[1])}"][data-admin-list-index="${cssEscape(match[2])}"]`;
  document.querySelectorAll(selector).forEach(syncListItemMissingState);
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}

function markDirty() {
  hasUnpublishedChanges = true;
  refreshAdminState();
  setStatus("saving", "Modifications non publiées", "Cliquez sur Publier pour les mettre en ligne.");
}

function markClean(type = "connected", text = "Prêt", detail = "Aucune modification non publiée.") {
  hasUnpublishedChanges = false;
  refreshAdminState();
  setStatus(type, text, detail);
}

function hasPendingChanges() {
  return hasUnpublishedChanges || pendingImages.length > 0;
}

function discardPendingChanges() {
  hasUnpublishedChanges = false;
  pendingImages = [];
  pendingImagePreviews.clear();
}

function refreshAdminState(root = document) {
  syncRequiredFieldUi(root);
  updateTranslationSummary();
}

function syncRequiredFieldUi(root = document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("[data-admin-field-path]").forEach(syncFieldMissingState);
  root.querySelectorAll("[data-admin-list-path][data-admin-list-index]").forEach(syncListItemMissingState);
}

function updateTranslationSummary() {
  renderCompletionStatus();
}

function renderCompletionStatus() {
  if (!completionStatus) return;
  completionStatus.replaceChildren(renderTranslationStatus());
}

function setStatus(type, text, detail = "") {
  statusDot.className = `status-dot ${type}`;
  statusText.textContent = text;
  statusDetail.textContent = detail;
}

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `admin-toast ${type === "error" ? "error" : "success"}`;
  void toast.offsetWidth;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4500);
}

function labelFromKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveImageSrc(path) {
  if (!path) return "/favicon.svg";
  const pendingPreview = pendingImagePreviews.get(path) || pendingImagePreviews.get(String(path).replace(/^\/+/, ""));
  if (pendingPreview) return pendingPreview;
  if (/^(https?:|data:|\/)/i.test(path)) return path;
  return `/${path}`;
}

function isValidColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}

function applyColorTheme() {
  const theme = content?.theme || {};
  for (const [key, value] of Object.entries(theme)) {
    if (isValidColor(value)) document.documentElement.style.setProperty(`--color-${key.replace(/_/g, "-")}`, value);
  }
}

function renderChrome() {
  sidebar.replaceChildren();
  mobileTabs.replaceChildren();

  const title = document.createElement("p");
  title.className = "admin-sidebar-title";
  title.textContent = "Édition";
  sidebar.appendChild(title);

  for (const view of ADMIN_VIEWS) {
    const desktop = createNavButton(view);
    const mobile = createNavButton(view);
    sidebar.appendChild(desktop);
    mobileTabs.appendChild(mobile);
  }
}

function createNavButton(view) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `admin-nav-item${view.key === activeView ? " active" : ""}`;
  button.textContent = view.label;
  button.addEventListener("click", () => {
    activeView = view.key;
    renderChrome();
    renderActiveView();
  });
  return button;
}

function renderPageHeader(title, description = "") {
  const header = document.createElement("header");
  header.className = "admin-page-header";
  const copy = document.createElement("div");
  const heading = document.createElement("h1");
  heading.textContent = title;
  copy.appendChild(heading);
  if (description) {
    const p = document.createElement("p");
    p.className = "admin-status";
    p.textContent = description;
    copy.appendChild(p);
  }
  header.appendChild(copy);
  return header;
}

function renderTranslationStatus() {
  const requiredItems = getRequiredMissingFieldItems();
  const optionalItems = getOptionalEmptyFieldItems();
  const requiredCount = requiredItems.length;
  const optionalCount = optionalItems.length;
  const statusKind = requiredCount ? "warning" : optionalCount ? "optional" : "complete";
  const wrapper = document.createElement(requiredCount || optionalCount ? "details" : "div");
  wrapper.className = `admin-translation-status ${statusKind}`;

  const summary = document.createElement(requiredCount || optionalCount ? "summary" : "p");
  summary.className = `btn btn-outline admin-translation-summary ${statusKind}`;
  summary.textContent = formatCompletionSummary(requiredCount, optionalCount);
  wrapper.appendChild(summary);

  if (requiredCount || optionalCount) {
    const groups = document.createElement("div");
    groups.className = "admin-empty-groups";
    if (requiredCount) groups.appendChild(renderEmptyFieldGroup("Champs obligatoires", requiredItems, "required"));
    if (optionalCount) groups.appendChild(renderEmptyFieldGroup("Champs optionnels vides", optionalItems, "optional"));
    wrapper.appendChild(groups);
  }

  return wrapper;
}

function formatCompletionSummary(requiredCount, optionalCount) {
  const requiredLabel = `${requiredCount} champ${requiredCount > 1 ? "s" : ""} obligatoire${requiredCount > 1 ? "s" : ""} à remplir`;
  const optionalLabel = `${optionalCount} champ${optionalCount > 1 ? "s" : ""} optionnel${optionalCount > 1 ? "s" : ""} vide${optionalCount > 1 ? "s" : ""}`;
  if (requiredCount && optionalCount) return `${requiredLabel} • ${optionalLabel}`;
  if (requiredCount) return requiredLabel;
  if (optionalCount) return optionalLabel;
  return "Tous les champs obligatoires sont remplis.";
}

function renderEmptyFieldGroup(title, items, kind) {
  const group = document.createElement("div");
  group.className = `admin-empty-group ${kind}`;
  const heading = document.createElement("p");
  heading.className = "admin-empty-group-title";
  heading.textContent = `${title} (${items.length})`;
  group.appendChild(heading);

  for (const item of items) {
    const label = formatFieldCompletionLabel(item);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-empty-link";
    button.textContent = label;
    button.title = label;
    button.addEventListener("click", () => scrollToFieldCompletionItem(item));
    group.appendChild(button);
  }

  return group;
}

function renderActiveView() {
  contentEl.replaceChildren();
  if (!content) return;

  if (activeView === "content") renderContentView();
  else if (activeView === "colors") renderColorView();
  else if (activeView === "images") renderImagesView();
  else if (activeView === "seo") renderSeoView();

  renderCompletionStatus();
}

function renderLocaleTabs(activeKey, onChange) {
  const tabs = document.createElement("div");
  tabs.className = "admin-locale-tabs";
  for (const locale of LOCALES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-locale-tab${locale.key === activeKey ? " active" : ""}`;
    const label = document.createElement("span");
    label.textContent = locale.label;
    button.appendChild(label);
    const missingCount = getMissingLocaleFieldCount(locale.key);
    if (missingCount) {
      const badge = document.createElement("span");
      badge.className = "admin-tab-count";
      badge.textContent = String(missingCount);
      button.appendChild(badge);
    }
    button.addEventListener("click", () => onChange(locale.key));
    tabs.appendChild(button);
  }
  return tabs;
}

function renderContentView() {
  contentEl.appendChild(renderPageHeader("Contenu du site", "Modifiez d’abord la page en français ou en anglais. Les coordonnées communes se trouvent après les sections de contenu."));
  contentEl.appendChild(renderLocaleTabs(activeLocale, (locale) => {
    activeLocale = locale;
    renderActiveView();
  }));

  const rootPath = `locales.${activeLocale}`;
  for (const section of CONTENT_SECTIONS) {
    contentEl.appendChild(renderSectionCard(rootPath, section));
  }

  const sharedCard = renderSectionCard("shared", {
    key: "",
    label: "Coordonnées communes",
    description: "Ces valeurs sont utilisées dans les deux langues.",
    fields: SHARED_FIELDS,
  });
  contentEl.appendChild(sharedCard);
}

function renderColorView() {
  contentEl.appendChild(renderPageHeader("Couleurs", "Les couleurs sont appliquées en direct dans le panneau pour faciliter les ajustements."));
  contentEl.appendChild(renderSectionCard("theme", {
    key: "",
    label: "Palette du site",
    fields: COLOR_FIELDS,
  }));
}

function renderImagesView() {
  contentEl.appendChild(renderPageHeader("Images", "Modifiez les images communes, téléversez de nouveaux fichiers et supprimez les fichiers inutiles."));
  contentEl.appendChild(renderSectionCard("shared.images", {
    key: "",
    label: "Images utilisées par le site",
    fields: SHARED_IMAGE_FIELDS,
  }));

  const gallery = document.createElement("section");
  gallery.className = "admin-section-card";
  const header = document.createElement("header");
  const h2 = document.createElement("h2");
  h2.textContent = "Bibliothèque d’images";
  const actions = document.createElement("div");
  actions.className = "admin-actions";
  const cleanupButton = document.createElement("button");
  cleanupButton.className = "btn btn-outline";
  cleanupButton.type = "button";
  cleanupButton.disabled = true;
  cleanupButton.textContent = "Supprimer les images inutilis\u00e9es";
  actions.appendChild(cleanupButton);
  header.append(h2, actions);
  gallery.appendChild(header);
  const body = document.createElement("div");
  const loading = document.createElement("p");
  loading.className = "admin-status";
  loading.textContent = "Chargement des images...";
  body.appendChild(loading);
  gallery.appendChild(body);
  contentEl.appendChild(gallery);
  renderImageGallery(body, cleanupButton);
}

function renderSeoView() {
  contentEl.appendChild(renderPageHeader("SEO", "Titres, descriptions et images de partage. Cette section reste volontairement à la fin."));
  contentEl.appendChild(renderLocaleTabs(activeSeoLocale, (locale) => {
    activeSeoLocale = locale;
    renderActiveView();
  }));
  contentEl.appendChild(renderSectionCard(`locales.${activeSeoLocale}`, {
    key: "seo",
    label: `Référencement - ${LOCALES.find((item) => item.key === activeSeoLocale)?.label || activeSeoLocale}`,
    fields: [
      { key: "title", label: "Titre Google / onglet", full: true },
      { key: "description", label: "Méta description", type: "textarea", full: true, hint: "Visez environ 150 à 160 caractères, avec les recherches importantes." },
      { key: "og_image", label: "Image de partage", type: "image", full: true },
      { key: "favicon", label: "Favicon", type: "image", full: true },
    ],
  }));
  contentEl.appendChild(renderSectionCard("site", {
    key: "",
    label: "Configuration générale",
    fields: [
      { key: "domain", label: "Domaine canonique", full: true },
      { key: "default_locale", label: "Langue par défaut", type: "select", options: getAvailableLocaleOptions },
    ],
  }));
}

function renderSectionCard(rootPath, section) {
  const card = document.createElement("section");
  card.className = "admin-section-card";
  const pathPrefix = section.key ? `${rootPath}.${section.key}` : rootPath;

  const header = document.createElement("header");
  const copy = document.createElement("div");
  const heading = document.createElement("h2");
  heading.textContent = section.label;
  copy.appendChild(heading);
  if (section.description) {
    const p = document.createElement("p");
    p.className = "admin-status";
    p.textContent = section.description;
    copy.appendChild(p);
  }
  header.appendChild(copy);
  const requiredCount = getFieldCompletionSectionItems(pathPrefix, section, "required").length;
  const optionalCount = getFieldCompletionSectionItems(pathPrefix, section, "optional").length;
  if (requiredCount || optionalCount) {
    const badges = document.createElement("div");
    badges.className = "admin-section-badges";
    if (requiredCount) badges.appendChild(createCompletionBadge(`${requiredCount} obligatoire${requiredCount > 1 ? "s" : ""}`, "required"));
    if (optionalCount) badges.appendChild(createCompletionBadge(`${optionalCount} optionnel${optionalCount > 1 ? "s" : ""}`, "optional"));
    header.appendChild(badges);
  }
  card.appendChild(header);

  if (section.fields?.length) {
    const grid = document.createElement("div");
    grid.className = "admin-field-grid";
    for (const field of section.fields) {
      grid.appendChild(renderField(`${pathPrefix}.${field.key}`, field));
    }
    card.appendChild(grid);
  }

  for (const list of section.lists || []) {
    card.appendChild(renderList(`${pathPrefix}.${list.key}`, list));
  }

  return card;
}

function renderField(path, field) {
  const group = document.createElement("div");
  group.className = `admin-field${field.full || field.type === "markdown" || field.type === "image" ? " admin-field-full" : ""}`;
  group.dataset.adminFieldPath = path;
  group.dataset.adminFieldRequired = isRequiredField(field) ? "true" : "false";
  const labelRow = document.createElement("span");
  labelRow.className = "admin-field-heading";
  const label = document.createElement("span");
  label.className = "admin-label";
  label.textContent = field.label || labelFromKey(field.key);
  const missingBadge = document.createElement("span");
  missingBadge.className = "admin-missing-badge";
  missingBadge.textContent = "À remplir";
  missingBadge.hidden = true;
  labelRow.append(label, missingBadge);
  group.appendChild(labelRow);
  if (field.hint) {
    const hint = document.createElement("span");
    hint.className = "admin-hint";
    hint.textContent = field.hint;
    group.appendChild(hint);
  }
  const missingHint = document.createElement("span");
  missingHint.className = "admin-field-warning";
  missingHint.textContent = getMissingFieldWarning(path);
  group.appendChild(missingHint);

  const value = getPath(path);
  const type = field.type || inferFieldType(path, value);

  if (type === "toggle") renderToggle(group, path, Boolean(value));
  else if (type === "color") renderColorInput(group, path, value);
  else if (type === "image") renderImageInput(group, path, value);
  else if (type === "markdown") renderTextarea(group, path, value, true);
  else if (type === "textarea") renderTextarea(group, path, value, false);
  else if (type === "select") renderSelect(group, path, value, field.options);
  else if (typeof value === "number") renderTextInput(group, path, value, "number");
  else renderTextInput(group, path, value, "text");

  syncFieldMissingState(group);

  return group;
}

function syncFieldMissingState(group) {
  const path = group?.dataset?.adminFieldPath;
  const required = group?.dataset?.adminFieldRequired === "true";
  const missing = isPathMissing(path, required);
  group.classList.toggle("admin-field-missing", missing);
  const badge = group.querySelector(".admin-missing-badge");
  if (badge) badge.hidden = !missing;
  const warning = group.querySelector(".admin-field-warning");
  if (warning) {
    warning.textContent = getMissingFieldWarning(path);
    warning.hidden = !missing;
  }
  group.querySelectorAll(".input, .textarea, select").forEach((control) => {
    if (missing) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  });
}

function getAvailableLocaleOptions() {
  const configuredLocales = Array.isArray(content?.site?.locales) ? content.site.locales : [];
  const localeKeys = configuredLocales.length ? configuredLocales : LOCALES.map((locale) => locale.key);
  return localeKeys.map((key) => ({
    value: key,
    label: LOCALES.find((locale) => locale.key === key)?.label || key,
  }));
}

function inferFieldType(path, value) {
  if (typeof value === "boolean") return "toggle";
  if (/(\.|_)(image|photo|favicon|og)$/i.test(path)) return "image";
  if (isCompactFieldPath(path)) return "text";
  if (String(value || "").length > 140 || /body|description|subtitle|message|intro|text|caption|quote/i.test(path)) return "textarea";
  return "text";
}

function isCompactFieldPath(path) {
  const key = String(path || "").split(".").pop() || "";
  return /(^|_)(button|cta|link)_(label|text)$/i.test(key)
    || /(^|_)(alt|button|cta|email|eyebrow|handle|href|label|link|name|phone|title|url)$/i.test(key);
}

function renderTextInput(group, path, value, type) {
  const input = document.createElement("input");
  input.className = "input";
  input.type = type;
  input.value = value ?? "";
  input.addEventListener("input", () => setPath(path, type === "number" ? Number(input.value) : input.value));
  group.appendChild(input);
}

function renderSelect(group, path, value, options) {
  const select = document.createElement("select");
  select.className = "input";
  const resolvedOptions = typeof options === "function" ? options() : options || [];
  for (const option of resolvedOptions) {
    const item = document.createElement("option");
    item.value = option.value ?? option.key ?? "";
    item.textContent = option.label ?? item.value;
    select.appendChild(item);
  }
  select.value = value ?? "";
  select.addEventListener("change", () => setPath(path, select.value));
  group.appendChild(select);
}

function renderTextarea(group, path, value, markdown) {
  const textarea = document.createElement("textarea");
  textarea.className = "textarea";
  textarea.rows = markdown ? 8 : 4;
  textarea.value = value ?? "";
  textarea.addEventListener("input", () => setPath(path, textarea.value));
  group.appendChild(textarea);
  if (markdown) {
    requestAnimationFrame(() => initMarkdownEditor(group, path));
  }
}

function renderToggle(group, path, value) {
  const row = document.createElement("span");
  row.className = "admin-toggle-row";
  const toggle = document.createElement("label");
  toggle.className = "admin-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = value;
  input.setAttribute("aria-label", group.querySelector(".admin-label")?.textContent || "Activer");
  const slider = document.createElement("span");
  input.addEventListener("change", () => setPath(path, input.checked));
  toggle.append(input, slider);
  const state = document.createElement("span");
  state.className = "admin-status";
  state.textContent = value ? "Activé" : "Désactivé";
  input.addEventListener("change", () => {
    state.textContent = input.checked ? "Activé" : "Désactivé";
  });
  row.append(toggle, state);
  group.appendChild(row);
}

function renderColorInput(group, path, value) {
  const row = document.createElement("span");
  row.className = "admin-color-row";
  const color = document.createElement("input");
  color.className = "admin-color-picker";
  color.type = "color";
  color.value = isValidColor(value) ? value : "#000000";
  const text = document.createElement("input");
  text.className = "input";
  text.value = value || "";

  function update(nextValue) {
    text.value = nextValue;
    if (isValidColor(nextValue)) color.value = nextValue;
    setPath(path, nextValue);
    applyColorTheme();
  }

  color.addEventListener("input", () => update(color.value));
  text.addEventListener("input", () => update(text.value));
  row.append(color, text);
  group.appendChild(row);
}

function renderImageInput(group, path, value) {
  const wrapper = document.createElement("span");
  wrapper.className = "admin-image-field";

  const preview = document.createElement("img");
  preview.className = "admin-image-preview";
  preview.alt = "";
  preview.src = resolveImageSrc(value);

  const controls = document.createElement("span");
  controls.className = "admin-field";
  const input = document.createElement("input");
  input.className = "input";
  input.value = value || "";
  input.placeholder = "/assets/images/image.webp ou https://...";
  input.addEventListener("input", () => {
    setPath(path, input.value);
    preview.src = resolveImageSrc(input.value);
  });

  const upload = document.createElement("label");
  upload.className = "admin-upload-label";
  upload.textContent = "Choisir une image";
  const file = document.createElement("input");
  file.className = "admin-file-input";
  file.type = "file";
  file.accept = "image/*,.ico";
  file.addEventListener("change", async () => {
    if (!file.files?.[0]) return;
    try {
      setStatus("saving", "Preparation de l'image...", file.files[0].name);
      const upload = await prepareImageUpload(file.files[0], path);
      const nextPath = `/${upload.path}`;
      pendingImages = pendingImages.filter((item) => item.fieldPath !== path);
      pendingImages.push(...upload.uploads);
      if (upload.previewUrl) {
        pendingImagePreviews.set(nextPath, upload.previewUrl);
        pendingImagePreviews.set(upload.path, upload.previewUrl);
      }
      setPath(path, nextPath);
      input.value = nextPath;
      preview.src = upload.previewUrl || nextPath;
      setStatus("saving", "Modifications non publiees", "L'image sera envoyee sur GitHub au moment de publier.");
      showToast(`${upload.variantCount} fichier${upload.variantCount > 1 ? "s" : ""} image prepare${upload.variantCount > 1 ? "s" : ""}. Cliquez sur Publier pour l'envoyer sur GitHub.`);
    } catch (error) {
      showToast(error.message, "error");
      setStatus("error", "Erreur d’image", error.message);
    } finally {
      file.value = "";
    }
  });
  upload.appendChild(file);
  const hint = document.createElement("p");
  hint.className = "admin-hint";
  hint.textContent = "JPG, PNG et autres images raster sont convertis en fichiers WebP responsives. SVG et ICO sont conserves apres validation. L'envoi se fait avec Publier.";
  controls.append(input, upload, hint);
  wrapper.append(preview, controls);
  group.appendChild(wrapper);
}

function initMarkdownEditor(group, path) {
  if (typeof EasyMDE === "undefined") return null;
  const textarea = group.querySelector("textarea");
  if (!textarea || textarea.dataset.easyMdeReady === "true") return null;

  textarea.dataset.easyMdeReady = "true";
  const editor = new EasyMDE({
    element: textarea,
    spellChecker: false,
    autoDownloadFontAwesome: false,
    forceSync: true,
    status: false,
    minHeight: "10rem",
    toolbar: [
      "bold",
      "italic",
      "strikethrough",
      "code",
      "|",
      "heading-1",
      "heading-2",
      "heading-3",
      "|",
      "unordered-list",
      "ordered-list",
      "quote",
      "|",
      "link",
      "|",
      "preview",
      "|",
      "guide",
    ],
  });

  editor.codemirror.on("change", () => {
    setPath(path, editor.value());
  });
  return editor;
}

function renderList(path, list) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-list-editor admin-field-full";
  wrapper.dataset.listPath = path;

  const header = document.createElement("div");
  header.className = "admin-list-header admin-list-toolbar";
  const copy = document.createElement("div");
  const title = document.createElement("h3");
  const items = Array.isArray(getPath(path)) ? getPath(path) : [];
  title.textContent = list.label;
  const count = document.createElement("p");
  count.className = "admin-status";
  count.textContent = `${items.length} élément${items.length > 1 ? "s" : ""}`;
  copy.append(title, count);
  header.appendChild(copy);
  wrapper.appendChild(header);

  const listEl = document.createElement("div");
  listEl.className = "admin-list-items";
  items.forEach((item, index) => listEl.appendChild(renderListItem(path, list, item, index, items.length)));
  wrapper.appendChild(listEl);

  const add = document.createElement("button");
  add.type = "button";
  add.className = "admin-add-btn";
  const addLabel = document.createElement("span");
  addLabel.textContent = "Ajouter une entrée";
  add.append(createAdminIcon("plus"), addLabel);
  add.addEventListener("click", () => {
    const nextIndex = items.length;
    items.push(emptyItemForList(list));
    setPath(path, items);
    activeListEditor = { path, index: nextIndex };
    renderActiveView();
  });
  wrapper.appendChild(add);

  return wrapper;
}

function renderListItem(path, list, item, index, total) {
  const itemEl = document.createElement("article");
  itemEl.className = "admin-list-item";
  itemEl.dataset.index = String(index);
  itemEl.dataset.adminListPath = path;
  itemEl.dataset.adminListIndex = String(index);
  const editing = isListItemEditing(path, index);
  itemEl.draggable = !editing;
  if (!editing) initListDragReorder(itemEl, path, index);

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "admin-drag-handle";
  handle.title = "Glisser ou utiliser les flèches pour réordonner";
  handle.setAttribute("aria-label", "Réordonner cet élément");
  handle.appendChild(createAdminIcon("drag"));
  handle.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      moveListItem(path, index, index - 1);
    }
    if (event.key === "ArrowDown" && index < total - 1) {
      event.preventDefault();
      moveListItem(path, index, index + 1);
    }
  });

  const summary = listItemSummary(item, index);
  const missingCount = getMissingListItemFieldCount(path, index, list);
  itemEl.classList.toggle("admin-list-item-missing", Boolean(missingCount));
  const body = document.createElement("div");
  body.className = "admin-list-item-body";
  const titleRow = document.createElement("span");
  titleRow.className = "admin-list-title-row";
  const title = document.createElement("p");
  title.className = "admin-list-item-title";
  title.textContent = summary.title;
  titleRow.appendChild(title);
  if (missingCount) {
    const badge = document.createElement("span");
    badge.className = "admin-missing-badge";
    badge.textContent = `${missingCount} à remplir`;
    titleRow.appendChild(badge);
  }
  body.appendChild(titleRow);
  if (summary.description) {
    const description = document.createElement("p");
    description.className = "admin-list-item-desc";
    description.textContent = summary.description;
    body.appendChild(description);
  }

  const actions = document.createElement("div");
  actions.className = "admin-list-actions";
  actions.append(
    listAction("edit", editing ? "Fermer" : "Modifier", false, () => toggleListEditor(path, index)),
    listAction("trash", "Supprimer", false, () => removeListItem(path, index), "danger")
  );
  itemEl.append(handle, body, actions);

  if (editing) {
    const panel = document.createElement("div");
    panel.className = "admin-edit-panel admin-list-edit-panel";
    const grid = document.createElement("div");
    grid.className = "admin-field-grid";
    for (const field of list.fields || []) {
      grid.appendChild(renderField(`${path}.${index}.${field.key}`, field));
    }
    panel.appendChild(grid);
    itemEl.appendChild(panel);
  }

  return itemEl;
}

function syncListItemMissingState(itemEl) {
  const path = itemEl?.dataset?.adminListPath;
  const index = Number(itemEl?.dataset?.adminListIndex);
  const missingCount = getMissingListItemFieldCount(path, index);
  itemEl.classList.toggle("admin-list-item-missing", missingCount > 0);
  const titleRow = itemEl.querySelector(".admin-list-title-row");
  if (!titleRow) return;
  let badge = titleRow.querySelector(".admin-missing-badge");
  if (!missingCount) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "admin-missing-badge";
    titleRow.appendChild(badge);
  }
  badge.textContent = `${missingCount} à remplir`;
  badge.hidden = false;
}

function listAction(icon, label, disabled, handler, variant = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `admin-btn-icon${variant ? ` ${variant}` : ""}`;
  button.appendChild(createAdminIcon(icon));
  button.title = label;
  button.setAttribute("aria-label", label);
  button.disabled = disabled;
  button.addEventListener("click", handler);
  return button;
}

function toggleListEditor(path, index) {
  activeListEditor = isListItemEditing(path, index) ? null : { path, index };
  renderActiveView();
}

function isListItemEditing(path, index) {
  return activeListEditor?.path === path && activeListEditor.index === index;
}

function listItemSummary(item, index) {
  if (!item || typeof item !== "object") {
    return { title: `Élément ${index + 1}`, description: "" };
  }
  const titleKeys = ["title", "question", "name", "value", "label"];
  const descriptionKeys = ["description", "answer", "quote", "subtitle", "message", "text", "label", "context"];
  const titleKey = titleKeys.find((key) => String(item[key] || "").trim());
  const title = titleKey ? String(item[titleKey]).trim() : `Élément ${index + 1}`;
  const descriptionKey = descriptionKeys.find((key) => key !== titleKey && String(item[key] || "").trim());
  return {
    title,
    description: descriptionKey ? String(item[descriptionKey]).trim() : "",
  };
}

function listItemTitle(item, index) {
  return listItemSummary(item, index).title;
}

function emptyItemForList(list) {
  const next = {};
  for (const field of list.fields || []) {
    next[field.key] = field.type === "toggle" ? false : "";
  }
  return next;
}

function moveListItem(path, from, to) {
  const items = getPath(path);
  if (!Array.isArray(items) || to < 0 || to >= items.length) return;
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  setPath(path, items);
  if (activeListEditor?.path === path) {
    activeListEditor = activeListEditor.index === from ? { path, index: to } : null;
  }
  renderActiveView();
}

function removeListItem(path, index) {
  const items = getPath(path);
  if (!Array.isArray(items)) return;
  if (!confirm("Supprimer cet élément?")) return;
  items.splice(index, 1);
  setPath(path, items);
  if (activeListEditor?.path === path) activeListEditor = null;
  renderActiveView();
}

function initListDragReorder(itemEl, path, index) {
  itemEl.addEventListener("dragstart", (event) => {
    itemEl.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  });

  itemEl.addEventListener("dragend", () => {
    itemEl.classList.remove("dragging");
    clearListDragState(itemEl);
  });

  itemEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    const rect = itemEl.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    clearListDragState(itemEl);
    itemEl.classList.add(before ? "drag-over" : "drag-over-below");
  });

  itemEl.addEventListener("dragleave", () => itemEl.classList.remove("drag-over", "drag-over-below"));

  itemEl.addEventListener("drop", (event) => {
    event.preventDefault();
    const from = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isInteger(from) || from === index) return;
    const before = itemEl.classList.contains("drag-over");
    itemEl.classList.remove("drag-over", "drag-over-below");
    let to = index;
    if (!before && from < index) to = index;
    else if (!before) to = index + 1;
    else if (from < index) to = index - 1;
    moveListItem(path, from, to);
  });
}

function clearListDragState(itemEl) {
  itemEl.closest(".admin-list-items")?.querySelectorAll(".admin-list-item").forEach((item) => {
    item.classList.remove("drag-over", "drag-over-below");
  });
}

function createAdminIcon(name) {
  const icons = {
    plus: { paths: ["M12 5v14M5 12h14"] },
    drag: {
      circles: [
        ["9", "6", "1.5"],
        ["15", "6", "1.5"],
        ["9", "12", "1.5"],
        ["15", "12", "1.5"],
        ["9", "18", "1.5"],
        ["15", "18", "1.5"],
      ],
    },
    edit: { paths: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"] },
    trash: { paths: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v5M14 11v5"] },
  };
  const spec = icons[name];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  if (!spec) return svg;
  for (const d of spec.paths || []) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  for (const [cx, cy, r] of spec.circles || []) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    svg.appendChild(circle);
  }
  return svg;
}

function getTranslationSummary(missing = getMissingFieldCount()) {
  if (!content?.locales?.["fr-CA"] || !content?.locales?.["en-CA"]) return "";
  return missing
    ? `${missing} champ${missing > 1 ? "s" : ""} à remplir.`
    : "Tous les champs sont remplis.";
}

function createCompletionBadge(text, kind) {
  const badge = document.createElement("span");
  badge.className = `admin-completion-badge ${kind}`;
  badge.textContent = text;
  return badge;
}

function getRequiredMissingFieldItems(localeKey = "") {
  return getFieldCompletionItems("required", localeKey);
}

function getOptionalEmptyFieldItems(localeKey = "") {
  return getFieldCompletionItems("optional", localeKey);
}

function getFieldCompletionItems(kind, localeKey = "") {
  const locales = localeKey ? LOCALES.filter((locale) => locale.key === localeKey) : LOCALES;
  return locales.flatMap((locale) =>
    CONTENT_SECTIONS.flatMap((section) => getFieldCompletionSectionItems(`locales.${locale.key}.${section.key}`, section, kind, locale))
  );
}

function getFieldCompletionSectionItems(basePath, section, kind, locale = getLocaleFromPath(basePath)) {
  if (!locale || !String(basePath || "").startsWith("locales.")) return [];
  const fieldItems = (section.fields || [])
    .filter((field) => shouldCollectFieldCompletionItem(`${basePath}.${field.key}`, field, kind))
    .map((field) => ({
      kind,
      path: `${basePath}.${field.key}`,
      localeKey: locale.key,
      localeLabel: locale.label,
      sectionLabel: section.label,
      fieldLabel: field.label || labelFromKey(field.key),
    }));

  const listItems = (section.lists || []).flatMap((list) =>
    getFieldCompletionListItems(`${basePath}.${list.key}`, section, list, kind, locale)
  );

  return [...fieldItems, ...listItems];
}

function getFieldCompletionListItems(path, section, list, kind, locale) {
  const items = getPath(path);
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, index) =>
    (list.fields || [])
      .filter((field) => shouldCollectFieldCompletionItem(`${path}.${index}.${field.key}`, field, kind))
      .map((field) => ({
        kind,
        path: `${path}.${index}.${field.key}`,
        localeKey: locale.key,
        localeLabel: locale.label,
        sectionLabel: section.label,
        listPath: path,
        listLabel: list.label,
        index,
        itemTitle: listItemSummary(item, index).title,
        fieldLabel: field.label || labelFromKey(field.key),
      }))
  );
}

function getLocaleFromPath(path) {
  const localeKey = String(path || "").split(".")[1];
  return LOCALES.find((locale) => locale.key === localeKey) || null;
}

function shouldCollectFieldCompletionItem(path, field, kind) {
  const required = isRequiredField(field);
  if (kind === "required") return isPathMissing(path, required);
  if (kind === "optional") return !required && isOptionalPathEmpty(path, field);
  return false;
}

function isOptionalPathEmpty(path, field = {}) {
  if (!path || !String(path).startsWith("locales.") || field.type === "toggle") return false;
  if (String(path).endsWith(".image_alt")) {
    const imagePath = String(path).replace(/\.image_alt$/, ".image");
    if (!hasMeaningfulValue(getPath(imagePath))) return false;
  }
  if (String(path).startsWith("locales.en-CA.")) {
    const source = getPath(getFrenchSourcePath(path));
    if (!hasMeaningfulValue(source)) return false;
  }
  return !hasMeaningfulValue(getPath(path));
}

function formatFieldCompletionLabel(item) {
  const parts = [item.localeLabel, item.sectionLabel];
  if (item.listLabel) parts.push(`${item.listLabel} ${item.index + 1}: ${item.itemTitle}`);
  parts.push(item.fieldLabel);
  return parts.filter(Boolean).join(" / ");
}

function scrollToFieldCompletionItem(item) {
  if (!item?.path) return;
  activeView = "content";
  activeLocale = item.localeKey || activeLocale;
  activeListEditor = item.listPath ? { path: item.listPath, index: item.index } : null;
  renderChrome();
  renderActiveView();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const field = document.querySelector(`[data-admin-field-path="${cssEscape(item.path)}"]`);
      const fallback = item.listPath
        ? document.querySelector(`[data-admin-list-path="${cssEscape(item.listPath)}"][data-admin-list-index="${cssEscape(item.index)}"]`)
        : null;
      const target = field || fallback;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("admin-locate-target");
      setTimeout(() => target.classList.remove("admin-locate-target"), 1800);
      const control = target.querySelector(".input, .textarea, select, button");
      if (control) control.focus({ preventScroll: true });
    });
  });
}

function getFrenchSourcePath(path) {
  if (!String(path || "").startsWith("locales.en-CA.")) return "";
  return path.replace(/^locales\.en-CA\./, "locales.fr-CA.");
}

function getMissingFieldCount() {
  return getRequiredMissingFieldItems().length;
}

function getMissingLocaleFieldCount(localeKey) {
  return getRequiredMissingFieldItems(localeKey).length;
}

function getMissingSectionFieldCount(basePath, section) {
  return getFieldCompletionSectionItems(basePath, section, "required").length;
}

function getMissingListFieldCount(path, list) {
  const parts = String(path || "").split(".");
  const section = CONTENT_SECTIONS.find((item) => item.key === parts[2]);
  const locale = getLocaleFromPath(path);
  return section && locale ? getFieldCompletionListItems(path, section, list, "required", locale).length : 0;
}

function getMissingListItemFieldCount(path, index, list = getListDefinitionForPath(path)) {
  if (!list?.fields || !Number.isInteger(index)) return 0;
  return list.fields.reduce(
    (count, field) => count + (isPathMissing(`${path}.${index}.${field.key}`, isRequiredField(field)) ? 1 : 0),
    0
  );
}

function getListDefinitionForPath(path) {
  const parts = String(path || "").split(".");
  if (parts[0] !== "locales" || parts.length < 4) return null;
  const section = CONTENT_SECTIONS.find((item) => item.key === parts[2]);
  return section?.lists?.find((item) => item.key === parts[3]) || null;
}

function isRequiredField(field = {}) {
  if (field.required === false || field.type === "toggle") return false;
  return !/optionnel|optional/i.test(field.label || "");
}

function isPathMissing(path, required = true) {
  if (!required || !path || !String(path).startsWith("locales.")) return false;
  const value = getPath(path);
  if (String(path).startsWith("locales.en-CA.")) {
    const source = getPath(getFrenchSourcePath(path));
    if (!hasMeaningfulValue(source)) return false;
  }
  return !hasMeaningfulValue(value);
}

function hasMeaningfulValue(value) {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined && value !== false;
}

function getMissingFieldWarning(path) {
  return String(path || "").startsWith("locales.en-CA.")
    ? "Ce champ anglais est vide."
    : "Ce champ est requis.";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve(dataUrl.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function cleanFileBase(name) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanFileName(name) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "jpg";
  const safe = cleanFileBase(name);
  return `${safe || "image"}-${Date.now().toString(36)}.${ext}`;
}

function responsiveWidthsForPath(path) {
  const value = String(path || "");
  if (value === "shared.images.hero_background") return BACKGROUND_IMAGE_WIDTHS;
  if (value === "shared.images.og" || /\.seo\.og_image$/.test(value)) return OG_IMAGE_WIDTHS;
  return STANDARD_IMAGE_WIDTHS;
}

function uniqueResponsiveImageBase(fileName) {
  return `${cleanFileBase(fileName) || "image"}-${Date.now().toString(36)}`;
}

async function commitImageUpload(upload) {
  return apiJson(API.image, {
    method: "PUT",
    csrf: true,
    body: { name: upload.name, contentBase64: upload.contentBase64 },
  });
}

async function prepareImageUpload(file, fieldPath = "") {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  const isIco = /(?:image\/x-icon|image\/vnd\.microsoft\.icon)/i.test(file.type) || /\.ico$/i.test(file.name);
  if (isSvg || isIco) {
    const name = cleanFileName(file.name);
    const upload = {
      name,
      path: `assets/images/${name}`,
      contentBase64: await fileToBase64(file),
      previewUrl: URL.createObjectURL(file),
      fieldPath,
    };
    return { ...upload, uploads: [upload], variantCount: 1 };
  }

  const base = uniqueResponsiveImageBase(file.name);
  const variants = await compressToWebPVariants(file, responsiveWidthsForPath(fieldPath));
  const uploads = variants.map((variant) => {
    const name = `${base}-${variant.width}w.webp`;
    return {
      name,
      path: `assets/images/${name}`,
      contentBase64: variant.contentBase64,
      fieldPath,
    };
  });
  const defaultUpload = uploads[uploads.length - 1];
  const preview = variants.find((variant) => variant.width <= 960) || variants[0];
  return {
    ...defaultUpload,
    uploads,
    previewUrl: `data:image/webp;base64,${preview.contentBase64}`,
    variantCount: uploads.length,
  };
}

function normalizeLocalImagePath(value) {
  const path = String(value || "")
    .trim()
    .replace(/^https?:\/\/[^/]+\//i, "")
    .split(/[?#]/)[0]
    .replace(/^\/+/, "");
  return path.startsWith("assets/images/") ? path : "";
}

function responsiveImageSiblingPaths(path) {
  const match = String(path || "").match(/^(assets\/images\/.+)-(\d+)w\.webp$/i);
  if (!match) return [];
  const maxWidth = Number.parseInt(match[2], 10);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return [];
  const widths = RESPONSIVE_IMAGE_WIDTHS.filter((width) => width <= maxWidth);
  if (!widths.includes(maxWidth)) widths.push(maxWidth);
  return [...new Set(widths)].sort((a, b) => a - b).map((width) => `${match[1]}-${width}w.webp`);
}

function addLocalImagePath(paths, path) {
  if (!path) return;
  paths.add(path);
  for (const sibling of responsiveImageSiblingPaths(path)) paths.add(sibling);
}

function collectLocalImagePaths(source, paths = new Set(), seen = new Set()) {
  if (source == null) return paths;
  if (typeof source === "string") {
    const matches = source.match(/\/?assets\/images\/[^\s"'<>),]+/gi) || [];
    for (const match of matches) {
      const path = normalizeLocalImagePath(match);
      addLocalImagePath(paths, path);
    }
    const directPath = normalizeLocalImagePath(source);
    addLocalImagePath(paths, directPath);
    return paths;
  }
  if (typeof source !== "object" || seen.has(source)) return paths;

  seen.add(source);
  for (const value of Array.isArray(source) ? source : Object.values(source)) {
    collectLocalImagePaths(value, paths, seen);
  }
  return paths;
}

function getUnusedImages(images) {
  const usedPaths = collectLocalImagePaths(content);
  return images.filter((image) => !usedPaths.has(normalizeLocalImagePath(image.path)));
}

function getUnusedImagePathSet(images) {
  return new Set(getUnusedImages(images).map((image) => normalizeLocalImagePath(image.path)));
}

function configureUnusedImagesButton(button, images, target) {
  if (!button) return;
  const unusedImages = getUnusedImages(images);
  button.disabled = unusedImages.length === 0;
  button.textContent = unusedImages.length
    ? `Supprimer ${unusedImages.length} image${unusedImages.length > 1 ? "s" : ""} inutilis\u00e9e${unusedImages.length > 1 ? "s" : ""}`
    : "Aucune image inutilis\u00e9e";
  button.title = unusedImages.length
    ? "Afficher les fichiers inutilis\u00e9s avant suppression."
    : "Toutes les images locales sont utilis\u00e9es dans le contenu.";
  button.onclick = unusedImages.length ? () => showUnusedImagesDialog(unusedImages, target, button) : null;
}

async function deleteImageFile(image) {
  return apiJson(API.image, {
    method: "DELETE",
    csrf: true,
    body: { name: image.name, sha: image.sha },
  });
}

function showUnusedImagesDialog(images, target, cleanupButton) {
  if (!images.length) {
    showToast("Aucune image inutilis\u00e9e \u00e0 supprimer.");
    return;
  }

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-labelledby", "unused-images-title");

  const modal = document.createElement("div");
  modal.className = "modal admin-cleanup-modal";
  const title = document.createElement("h2");
  title.className = "text-2xl";
  title.id = "unused-images-title";
  title.textContent = "Supprimer les images inutilis\u00e9es?";
  const intro = document.createElement("p");
  intro.className = "admin-status";
  intro.textContent = images.length === 1
    ? "1 fichier local ne semble pas \u00eatre r\u00e9f\u00e9renc\u00e9 dans le contenu."
    : `${images.length} fichiers locaux ne semblent pas \u00eatre r\u00e9f\u00e9renc\u00e9s dans le contenu.`;

  const list = document.createElement("ul");
  list.className = "admin-cleanup-list";
  for (const image of images) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = image.name;
    const path = document.createElement("code");
    path.textContent = `/${image.path}`;
    item.append(name, path);
    list.appendChild(item);
  }

  const actions = document.createElement("div");
  actions.className = "admin-actions justify-center mt-6";
  const cancel = document.createElement("button");
  cancel.className = "btn btn-outline";
  cancel.type = "button";
  cancel.textContent = "Annuler";
  const confirmDelete = document.createElement("button");
  confirmDelete.className = "btn btn-primary";
  confirmDelete.type = "button";
  confirmDelete.textContent = "Supprimer tout";
  actions.append(cancel, confirmDelete);

  modal.append(title, intro, list, actions);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  document.body.classList.add("overflow-hidden");

  function close() {
    backdrop.remove();
    document.body.classList.remove("overflow-hidden");
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
  }

  cancel.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener("keydown", onKeydown);
  confirmDelete.addEventListener("click", async () => {
    confirmDelete.disabled = true;
    cancel.disabled = true;
    await deleteUnusedImages(images, target, cleanupButton);
    close();
  });
  cancel.focus();
}

async function deleteUnusedImages(images, target, cleanupButton) {
  setStatus("saving", "Suppression des images...", `${images.length} fichier${images.length > 1 ? "s" : ""} inutilis\u00e9${images.length > 1 ? "s" : ""}.`);
  if (cleanupButton) cleanupButton.disabled = true;
  const failures = [];
  let deletedCount = 0;

  for (const image of images) {
    try {
      await deleteImageFile(image);
      deletedCount += 1;
    } catch (error) {
      failures.push(`${image.name}: ${error.message}`);
    }
  }

  if (failures.length) {
    setStatus("error", "Suppression incompl\u00e8te", failures.join(" | "));
    showToast(`${deletedCount} image${deletedCount > 1 ? "s" : ""} supprim\u00e9e${deletedCount > 1 ? "s" : ""}, ${failures.length} erreur${failures.length > 1 ? "s" : ""}.`, "error");
  } else {
    if (hasPendingChanges()) {
      markDirty();
    } else {
      markClean();
    }
    showToast(`${deletedCount} image${deletedCount > 1 ? "s" : ""} inutilis\u00e9e${deletedCount > 1 ? "s" : ""} supprim\u00e9e${deletedCount > 1 ? "s" : ""}.`);
  }
  await renderImageGallery(target, cleanupButton);
}

function responsiveTargetWidths(sourceWidth, requestedWidths) {
  const source = Math.max(1, Math.round(sourceWidth));
  const maxRequested = Math.max(...requestedWidths);
  const widths = requestedWidths
    .map((width) => Math.min(width, source))
    .filter((width, index, list) => width > 0 && list.indexOf(width) === index)
    .sort((a, b) => a - b);
  if (!widths.includes(source) && source < maxRequested) widths.push(source);
  return widths;
}

function canvasToWebP(canvas, quality = WEBP_IMAGE_QUALITY) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Impossible de convertir l'image en WebP."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(new Error("Impossible de lire l'image convertie."));
      reader.readAsDataURL(blob);
    }, "image/webp", quality);
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image."));
    };
    image.src = url;
  });
}

async function compressToWebPVariants(file, requestedWidths, quality = WEBP_IMAGE_QUALITY) {
  const image = await loadImageFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const widths = responsiveTargetWidths(sourceWidth, requestedWidths);
  const variants = [];
  for (const width of widths) {
    const ratio = width / sourceWidth;
    const height = Math.max(1, Math.round(sourceHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible de preparer l'image.");
    context.drawImage(image, 0, 0, width, height);
    variants.push({ width, contentBase64: await canvasToWebP(canvas, quality) });
  }
  return variants;
}

async function renderImageGallery(target, cleanupButton = null) {
  try {
    const data = await apiJson(API.images);
    const images = data.images || [];
    const unusedImagePaths = getUnusedImagePathSet(images);
    configureUnusedImagesButton(cleanupButton, images, target);
    if (!images.length) {
      const empty = document.createElement("p");
      empty.className = "admin-status";
      empty.textContent = "Aucune image téléversée pour le moment.";
      target.replaceChildren(empty);
      return;
    }
    const grid = document.createElement("div");
    grid.className = "admin-gallery-grid";
    for (const image of images) {
      const isUnused = unusedImagePaths.has(normalizeLocalImagePath(image.path));
      const card = document.createElement("article");
      card.className = `admin-gallery-card${isUnused ? " admin-gallery-card-unused" : ""}`;
      const img = document.createElement("img");
      img.src = `/${image.path}`;
      img.alt = image.name;
      const titleRow = document.createElement("div");
      titleRow.className = "admin-gallery-title";
      const name = document.createElement("strong");
      name.textContent = image.name;
      titleRow.appendChild(name);
      const metaRow = document.createElement("div");
      metaRow.className = "admin-gallery-meta";
      if (isUnused) {
        const unusedBadge = document.createElement("span");
        unusedBadge.className = "admin-unused-badge";
        unusedBadge.textContent = "Inutilisée";
        metaRow.appendChild(unusedBadge);
      }
      const path = document.createElement("code");
      path.textContent = `/${image.path}`;
      const remove = document.createElement("button");
      remove.className = "btn btn-outline";
      remove.type = "button";
      remove.textContent = "Supprimer";
      remove.addEventListener("click", async () => {
        if (!confirm(`Supprimer ${image.name}?`)) return;
        await deleteImageFile(image);
        showToast("Image supprimée.");
        renderActiveView();
      });
      card.append(img, titleRow);
      if (metaRow.childElementCount) card.appendChild(metaRow);
      card.append(path, remove);
      grid.appendChild(card);
    }
    target.replaceChildren(grid);
  } catch (error) {
    configureUnusedImagesButton(cleanupButton, [], target);
    const message = document.createElement("p");
    message.className = "admin-status text-error";
    message.textContent = error.message;
    target.replaceChildren(message);
  }
}

async function loadSession() {
  const session = await apiJson(API.session);
  csrfToken = session.csrfToken;
  currentUser = session.login;
  sessionStatus.textContent = `${currentUser} - ${session.permission}`;
}

async function loadContent() {
  const data = await apiJson(API.content);
  content = data.content;
  contentSha = data.sha;
  activeLocale = content.site?.default_locale || "fr-CA";
  activeSeoLocale = activeLocale;
  hasUnpublishedChanges = false;
  pendingImages = [];
  pendingImagePreviews.clear();
  applyColorTheme();
}

function showConfirmation({
  title,
  message,
  confirmText,
  cancelText = "Annuler",
  confirmClass = "",
}) {
  return new Promise((resolve) => {
    const cancel = document.getElementById("publish-cancel");
    const confirm = document.getElementById("publish-confirm");
    const heading = publishModal.querySelector("h2");
    const copy = publishModal.querySelector("p");
    const original = {
      title: heading?.textContent || "",
      message: copy?.textContent || "",
      cancelText: cancel.textContent,
      confirmText: confirm.textContent,
      confirmClass: confirm.className,
    };

    if (heading) heading.textContent = title;
    if (copy) copy.textContent = message;
    cancel.textContent = cancelText;
    confirm.textContent = confirmText;
    if (confirmClass) confirm.className = confirmClass;
    publishModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    function done(result) {
      publishModal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
      if (heading) heading.textContent = original.title;
      if (copy) copy.textContent = original.message;
      cancel.textContent = original.cancelText;
      confirm.textContent = original.confirmText;
      confirm.className = original.confirmClass;
      cancel.removeEventListener("click", onCancel);
      confirm.removeEventListener("click", onConfirm);
      publishModal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    }
    function onCancel() { done(false); }
    function onConfirm() { done(true); }
    function onBackdrop(event) {
      if (event.target === publishModal) done(false);
    }
    function onKeydown(event) {
      if (event.key === "Escape") done(false);
    }

    cancel.addEventListener("click", onCancel);
    confirm.addEventListener("click", onConfirm);
    publishModal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);
  });
}

function showPublishConfirmation() {
  return showConfirmation({
    title: "Publier les modifications?",
    message: "Les changements seront enregistrés dans GitHub. Cloudflare Pages redéploiera le site ensuite.",
    confirmText: "Publier",
  });
}

function showDiscardConfirmation() {
  if (!hasPendingChanges()) return Promise.resolve(true);
  return showConfirmation({
    title: "Abandonner les modifications?",
    message: "Des changements ne sont pas publiés. Ils seront perdus si vous quittez l'administration maintenant.",
    confirmText: "Abandonner",
  });
}

async function publish() {
  if (!(await showPublishConfirmation())) return;
  try {
    setStatus("saving", "Publication en cours...", "Écriture dans GitHub...");
    for (const image of pendingImages) {
      setStatus("saving", "Televersement de l'image...", image.name);
      await commitImageUpload(image);
    }
    pendingImages = [];
    pendingImagePreviews.clear();

    const data = await apiJson(API.content, {
      method: "PUT",
      csrf: true,
      body: { content, sha: contentSha },
    });
    contentSha = data.sha || contentSha;
    markClean("connected", "Publié", "Cloudflare Pages redéploiera le site.");
    showToast("Publié. Le site sera redéployé automatiquement.");
  } catch (error) {
    setStatus("error", "Erreur de publication", error.message);
    showToast(error.message, "error");
  }
}

async function preview() {
  const locale = content.site?.default_locale || "fr-CA";
  const previewWindow = window.open("about:blank", "_blank", "noopener");
  if (!previewWindow) {
    showToast("Impossible d’ouvrir l’aperçu. Autorisez les fenêtres pop-up.", "error");
    return;
  }

  try {
    setStatus("saving", "Préparation de l’aperçu...", LOCALES.find((item) => item.key === locale)?.label || locale);
    const html = await apiHtml(API.preview, {
      method: "POST",
      csrf: true,
      body: { content, locale },
    });
    const previewUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    previewWindow.location.replace(previewUrl);
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
    if (hasPendingChanges()) {
      markDirty();
    } else {
      markClean();
    }
  } catch (error) {
    previewWindow.close();
    showToast(error.message, "error");
    setStatus("error", "Erreur d’aperçu", error.message);
  }
}

async function logout() {
  if (!(await showDiscardConfirmation())) return;
  try {
    await apiJson(API.logout, { method: "POST", csrf: true });
  } catch (error) {
    console.warn("Logout request failed:", error);
  }
  csrfToken = "";
  content = null;
  hasUnpublishedChanges = false;
  pendingImages = [];
  pendingImagePreviews.clear();
  showLogin();
}

async function init() {
  const error = new URLSearchParams(window.location.search).get("error");
  if (error) showLogin(error);

  try {
    await loadSession();
    await loadContent();
    showEditor();
    renderChrome();
    renderActiveView();
    markClean();
  } catch {
    showLogin(error || "login_required");
  }

  document.getElementById("publish").addEventListener("click", publish);
  document.getElementById("preview").addEventListener("click", preview);
  document.getElementById("logout").addEventListener("click", logout);
  bindCompletionStatusDismissal();
  document.querySelector(".admin-brand-link")?.addEventListener("click", async (event) => {
    const href = event.currentTarget.href;
    if (!hasPendingChanges()) return;
    event.preventDefault();
    if (await showDiscardConfirmation()) {
      discardPendingChanges();
      window.location.href = href;
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (!hasPendingChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function bindCompletionStatusDismissal() {
  const closeIfOutside = (event) => {
    const details = completionStatus?.querySelector("details.admin-translation-status[open]");
    if (!details) return;
    if (event.target instanceof Node && details.contains(event.target)) return;
    details.open = false;
  };

  document.addEventListener("pointerdown", closeIfOutside, true);
  document.addEventListener("focusin", closeIfOutside);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const details = completionStatus?.querySelector("details.admin-translation-status[open]");
    if (!details) return;
    details.open = false;
    details.querySelector(".admin-translation-summary")?.focus();
  });
}

init();
