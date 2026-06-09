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

const SHARED_FIELDS = [
  { key: "phone", label: "Téléphone affiché", type: "text" },
  { key: "phone_href", label: "Téléphone technique (lien tel:)", type: "text", hint: "Format recommandé : +15148366736." },
  { key: "email", label: "Courriel", type: "text" },
  { key: "office_address", label: "Adresse du bureau", type: "text", full: true },
  { key: "regions", label: "Régions desservies", type: "text", full: true },
  { key: "profile_url", label: "Profil Multi-Prêts", type: "text", full: true },
  { key: "social.linkedin", label: "Profil LinkedIn", type: "text", full: true },
  { key: "social.instagram", label: "Profil Instagram", type: "text", full: true },
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
    fields: [
      { key: "services", label: "Services" },
      { key: "guide", label: "Guide" },
      { key: "calculator", label: "Calculateur" },
      { key: "about", label: "À propos" },
      { key: "testimonials", label: "Témoignages" },
      { key: "media", label: "Médias" },
      { key: "contact", label: "Contact" },
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
      { key: "has_items", label: "Afficher la section", type: "toggle" },
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
          { key: "initials", label: "Initiales" },
          { key: "name", label: "Nom" },
          { key: "context", label: "Contexte" },
        ],
      },
    ],
  },
  {
    key: "media",
    label: "Médias",
    fields: [
      { key: "has_items", label: "Afficher la section", type: "toggle" },
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre", type: "markdown", full: true },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "account_label", label: "Libellé du compte" },
      { key: "account_handle", label: "Identifiant" },
      { key: "profile_url", label: "Lien du profil Instagram", full: true },
      { key: "max_items", label: "Nombre de publications", type: "number" },
      { key: "loading_label", label: "Message de chargement", full: true },
      { key: "empty_label", label: "Message vide", full: true },
      { key: "error_label", label: "Message d’erreur", full: true },
      { key: "link_label", label: "Libellé du lien" },
      { key: "prev_label", label: "Libellé bouton précédent" },
      { key: "next_label", label: "Libellé bouton suivant" },
    ],
  },
  {
    key: "final_cta",
    label: "Appel à l’action",
    fields: [
      { key: "eyebrow", label: "Surtitre" },
      { key: "heading", label: "Titre", type: "markdown", full: true },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "primary_cta", label: "Bouton principal" },
      { key: "secondary_cta", label: "Libellé téléphone" },
    ],
  },
  {
    key: "calculator",
    label: "Calculateur",
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
      { key: "heading", label: "Titre" },
      { key: "subtitle", label: "Introduction", type: "textarea", full: true },
      { key: "info_heading", label: "Titre des coordonnées" },
      { key: "phone_label", label: "Libellé téléphone" },
      { key: "email_label", label: "Libellé courriel" },
      { key: "address_label", label: "Libellé bureau" },
      { key: "regions_label", label: "Libellé régions" },
      { key: "consultation_heading", label: "Encart consultation - titre" },
      { key: "consultation_text", label: "Encart consultation - texte", type: "textarea", full: true },
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
      { key: "admin_heading", label: "Titre administration" },
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
let toastTimer = null;
let pendingImages = [];
const pendingImagePreviews = new Map();

const loginScreen = document.getElementById("login-screen");
const editorScreen = document.getElementById("editor-screen");
const loginError = document.getElementById("login-error");
const sessionStatus = document.getElementById("session-status");
const sidebar = document.getElementById("admin-sidebar");
const mobileTabs = document.getElementById("admin-mobile-tabs");
const contentEl = document.getElementById("admin-content");
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
  const parts = path.split(".");
  let cursor = content;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (cursor[key] == null || typeof cursor[key] !== "object") cursor[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
  if (!options.silent) setStatus("saving", "Modifications non publiées", "Cliquez sur Publier pour les mettre en ligne.");
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

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
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
  sidebar.innerHTML = "";
  mobileTabs.innerHTML = "";

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
  const status = document.createElement("p");
  status.className = "admin-status";
  status.textContent = getTranslationSummary();
  header.append(copy, status);
  return header;
}

function renderActiveView() {
  contentEl.innerHTML = "";
  if (!content) return;

  if (activeView === "content") renderContentView();
  else if (activeView === "colors") renderColorView();
  else if (activeView === "images") renderImagesView();
  else if (activeView === "seo") renderSeoView();
}

function renderLocaleTabs(activeKey, onChange) {
  const tabs = document.createElement("div");
  tabs.className = "admin-locale-tabs";
  for (const locale of LOCALES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-locale-tab${locale.key === activeKey ? " active" : ""}`;
    button.textContent = locale.label;
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
  header.appendChild(h2);
  gallery.appendChild(header);
  const body = document.createElement("div");
  body.innerHTML = '<p class="admin-status">Chargement des images...</p>';
  gallery.appendChild(body);
  contentEl.appendChild(gallery);
  renderImageGallery(body);
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
      { key: "default_locale", label: "Langue par défaut" },
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
  const label = document.createElement("span");
  label.className = "admin-label";
  label.textContent = field.label || labelFromKey(field.key);
  group.appendChild(label);
  if (field.hint) {
    const hint = document.createElement("span");
    hint.className = "admin-hint";
    hint.textContent = field.hint;
    group.appendChild(hint);
  }

  const value = getPath(path);
  const type = field.type || inferFieldType(path, value);

  if (type === "toggle") renderToggle(group, path, Boolean(value));
  else if (type === "color") renderColorInput(group, path, value);
  else if (type === "image") renderImageInput(group, path, value);
  else if (type === "markdown") renderTextarea(group, path, value, true);
  else if (type === "textarea") renderTextarea(group, path, value, false);
  else if (typeof value === "number") renderTextInput(group, path, value, "number");
  else renderTextInput(group, path, value, "text");

  return group;
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
  const toggle = document.createElement("span");
  toggle.className = "admin-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = value;
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
      const upload = await prepareImageUpload(file.files[0]);
      const nextPath = `/${upload.path}`;
      pendingImages = pendingImages.filter((item) => item.path !== upload.path);
      pendingImages.push(upload);
      if (upload.previewUrl) {
        pendingImagePreviews.set(nextPath, upload.previewUrl);
        pendingImagePreviews.set(upload.path, upload.previewUrl);
      }
      setPath(path, nextPath);
      input.value = nextPath;
      preview.src = upload.previewUrl || nextPath;
      setStatus("saving", "Modifications non publiees", "L'image sera envoyee sur GitHub au moment de publier.");
      showToast("Image preparee. Cliquez sur Publier pour l'envoyer sur GitHub.");
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
  hint.textContent = "JPG, PNG et autres images raster sont convertis en WebP. SVG et ICO sont conserves apres validation. L'envoi se fait avec Publier.";
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

  editor.codemirror.on("change", () => setPath(path, editor.value()));
  return editor;
}

function renderList(path, list) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-field-full";

  const header = document.createElement("div");
  header.className = "admin-list-header";
  const copy = document.createElement("div");
  const title = document.createElement("h3");
  const items = Array.isArray(getPath(path)) ? getPath(path) : [];
  title.textContent = list.label;
  const count = document.createElement("p");
  count.className = "admin-status";
  count.textContent = `${items.length} élément${items.length > 1 ? "s" : ""}`;
  copy.append(title, count);
  const add = document.createElement("button");
  add.type = "button";
  add.className = "btn btn-outline";
  add.textContent = "Ajouter";
  add.addEventListener("click", () => {
    items.push(emptyItemForList(list));
    setPath(path, items);
    renderActiveView();
  });
  header.append(copy, add);
  wrapper.appendChild(header);

  const listEl = document.createElement("div");
  items.forEach((item, index) => listEl.appendChild(renderListItem(path, list, item, index, items.length)));
  wrapper.appendChild(listEl);

  if (!items.length) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "admin-add-btn";
    empty.textContent = `Ajouter ${list.label.toLowerCase()}`;
    empty.addEventListener("click", () => {
      items.push(emptyItemForList(list));
      setPath(path, items);
      renderActiveView();
    });
    wrapper.appendChild(empty);
  }

  return wrapper;
}

function renderListItem(path, list, item, index, total) {
  const itemEl = document.createElement("article");
  itemEl.className = "admin-list-item";

  const header = document.createElement("div");
  header.className = "admin-list-header";
  const title = document.createElement("div");
  title.className = "admin-list-item-title";
  title.textContent = listItemTitle(item, index);

  const actions = document.createElement("div");
  actions.className = "admin-list-actions";
  actions.append(
    listAction("↑", "Monter", index === 0, () => moveListItem(path, index, index - 1)),
    listAction("↓", "Descendre", index === total - 1, () => moveListItem(path, index, index + 1)),
    listAction("Supprimer", "Supprimer", false, () => removeListItem(path, index))
  );
  header.append(title, actions);
  itemEl.appendChild(header);

  const panel = document.createElement("div");
  panel.className = "admin-edit-panel";
  const grid = document.createElement("div");
  grid.className = "admin-field-grid";
  for (const field of list.fields || []) {
    grid.appendChild(renderField(`${path}.${index}.${field.key}`, field));
  }
  panel.appendChild(grid);
  itemEl.appendChild(panel);

  return itemEl;
}

function listAction(text, label, disabled, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = text.length <= 2 ? "admin-btn-icon" : "btn btn-outline";
  button.textContent = text;
  button.title = label;
  button.disabled = disabled;
  button.addEventListener("click", handler);
  return button;
}

function listItemTitle(item, index) {
  if (!item || typeof item !== "object") return `Élément ${index + 1}`;
  return item.title || item.question || item.name || item.value || item.label || `Élément ${index + 1}`;
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
  renderActiveView();
}

function removeListItem(path, index) {
  const items = getPath(path);
  if (!Array.isArray(items)) return;
  if (!confirm("Supprimer cet élément?")) return;
  items.splice(index, 1);
  setPath(path, items);
  renderActiveView();
}

function getTranslationSummary() {
  if (!content?.locales?.["fr-CA"] || !content?.locales?.["en-CA"]) return "";
  let missing = 0;
  const walk = (source, target) => {
    if (typeof source === "string") {
      if (!String(target || "").trim()) missing += 1;
      return;
    }
    if (Array.isArray(source)) {
      source.forEach((item, index) => walk(item, Array.isArray(target) ? target[index] : undefined));
      return;
    }
    if (source && typeof source === "object") {
      Object.keys(source).forEach((key) => walk(source[key], target ? target[key] : undefined));
    }
  };
  walk(content.locales["fr-CA"], content.locales["en-CA"]);
  return missing ? `${missing} champ(s) anglais semblent vides.` : "Traductions principales complètes.";
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

function cleanFileName(name) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "jpg";
  const safe = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${safe || "image"}-${Date.now().toString(36)}.${ext}`;
}

async function commitImageUpload(upload) {
  return apiJson(API.image, {
    method: "PUT",
    csrf: true,
    body: { name: upload.name, contentBase64: upload.contentBase64 },
  });
}

async function prepareImageUpload(file) {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  const isIco = /(?:image\/x-icon|image\/vnd\.microsoft\.icon)/i.test(file.type) || /\.ico$/i.test(file.name);
  if (isSvg || isIco) {
    const name = cleanFileName(file.name);
    return {
      name,
      path: `assets/images/${name}`,
      contentBase64: await fileToBase64(file),
      previewUrl: URL.createObjectURL(file),
    };
  }

  const dot = file.name.lastIndexOf(".");
  const baseName = dot > 0 ? file.name.slice(0, dot) : file.name;
  const contentBase64 = await compressToWebP(file);
  const name = cleanFileName(`${baseName}.webp`);
  return {
    name,
    path: `assets/images/${name}`,
    contentBase64,
    previewUrl: `data:image/webp;base64,${contentBase64}`,
  };
}

function compressToWebP(file, maxDimension = 1920, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = image;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Impossible de préparer l’image."));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Impossible de convertir l’image en WebP."));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = () => reject(new Error("Impossible de lire l’image convertie."));
        reader.readAsDataURL(blob);
      }, "image/webp", quality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l’image."));
    };
    image.src = url;
  });
}

async function renderImageGallery(target) {
  try {
    const data = await apiJson(API.images);
    if (!data.images.length) {
      target.innerHTML = '<p class="admin-status">Aucune image téléversée pour le moment.</p>';
      return;
    }
    const grid = document.createElement("div");
    grid.className = "admin-gallery-grid";
    for (const image of data.images) {
      const card = document.createElement("article");
      card.className = "admin-gallery-card";
      const img = document.createElement("img");
      img.src = `/${image.path}`;
      img.alt = image.name;
      const name = document.createElement("strong");
      name.textContent = image.name;
      const path = document.createElement("code");
      path.textContent = `/${image.path}`;
      const remove = document.createElement("button");
      remove.className = "btn btn-outline";
      remove.type = "button";
      remove.textContent = "Supprimer";
      remove.addEventListener("click", async () => {
        if (!confirm(`Supprimer ${image.name}?`)) return;
        await apiJson(API.image, { method: "DELETE", csrf: true, body: { name: image.name, sha: image.sha } });
        showToast("Image supprimée.");
        renderActiveView();
      });
      card.append(img, name, path, remove);
      grid.appendChild(card);
    }
    target.innerHTML = "";
    target.appendChild(grid);
  } catch (error) {
    target.innerHTML = `<p class="admin-status text-error">${escapeHtml(error.message)}</p>`;
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
  pendingImages = [];
  pendingImagePreviews.clear();
  applyColorTheme();
}

function showPublishConfirmation() {
  return new Promise((resolve) => {
    const cancel = document.getElementById("publish-cancel");
    const confirm = document.getElementById("publish-confirm");
    publishModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    function done(result) {
      publishModal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
      cancel.removeEventListener("click", onCancel);
      confirm.removeEventListener("click", onConfirm);
      publishModal.removeEventListener("click", onBackdrop);
      resolve(result);
    }
    function onCancel() { done(false); }
    function onConfirm() { done(true); }
    function onBackdrop(event) {
      if (event.target === publishModal) done(false);
    }

    cancel.addEventListener("click", onCancel);
    confirm.addEventListener("click", onConfirm);
    publishModal.addEventListener("click", onBackdrop);
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
    setStatus("connected", "Publié", "Cloudflare Pages redéploiera le site.");
    showToast("Publié. Le site sera redéployé automatiquement.");
  } catch (error) {
    setStatus("error", "Erreur de publication", error.message);
    showToast(error.message, "error");
  }
}

async function preview() {
  const locale = content.site?.default_locale || "fr-CA";
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    showToast("Impossible d’ouvrir l’aperçu. Autorisez les fenêtres pop-up.", "error");
    return;
  }

  previewWindow.opener = null;
  previewWindow.document.open();
  previewWindow.document.write("<!doctype html><html><head><title>Aperçu</title></head><body>Chargement...</body></html>");
  previewWindow.document.close();

  try {
    setStatus("saving", "Préparation de l’aperçu...", LOCALES.find((item) => item.key === locale)?.label || locale);
    const html = await apiHtml(API.preview, {
      method: "POST",
      csrf: true,
      body: { content, locale },
    });
    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
    setStatus("saving", "Modifications non publiées", "L’aperçu utilise la langue par défaut.");
  } catch (error) {
    previewWindow.close();
    showToast(error.message, "error");
    setStatus("error", "Erreur d’aperçu", error.message);
  }
}

async function logout() {
  await fetch(API.logout, { method: "POST" });
  csrfToken = "";
  content = null;
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
    setStatus("connected", "Prêt", "Aucune modification non publiée.");
  } catch {
    showLogin(error || "login_required");
  }

  document.getElementById("publish").addEventListener("click", publish);
  document.getElementById("preview").addEventListener("click", preview);
  document.getElementById("logout").addEventListener("click", logout);
}

init();
