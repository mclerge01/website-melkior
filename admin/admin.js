/* ==========================================================================
   Admin editor - vanilla JS
   ========================================================================== */

const API = {
  session: "/api/admin/session",
  content: "/api/admin/content",
  images: "/api/admin/images",
  image: "/api/admin/image",
  preview: "/api/preview",
  logout: "/api/auth/logout",
};

const TABS = [
  { key: "shared", label: "Partagé", path: "shared" },
  { key: "theme", label: "Couleurs", path: "theme" },
  { key: "fr-CA", label: "Français", path: "locales.fr-CA" },
  { key: "en-CA", label: "English", path: "locales.en-CA" },
  { key: "images", label: "Images", path: "" },
];

let csrfToken = "";
let contentSha = "";
let content = null;
let activeTab = "shared";
let currentUser = "";

const loginScreen = document.getElementById("login-screen");
const editorScreen = document.getElementById("editor-screen");
const loginError = document.getElementById("login-error");
const sessionStatus = document.getElementById("session-status");
const tabsEl = document.getElementById("admin-tabs");
const editorEl = document.getElementById("editor");
const sectionTitle = document.getElementById("section-title");
const saveStatus = document.getElementById("save-status");
const translationStatus = document.getElementById("translation-status");

function showLogin(error = "") {
  loginScreen.classList.remove("hidden");
  editorScreen.classList.add("hidden");
  if (error) loginError.textContent = loginErrorMessage(error);
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

function setStatus(message, tone = "neutral") {
  saveStatus.textContent = message;
  saveStatus.classList.remove("text-error", "text-light", "text-success");
  saveStatus.classList.add(tone === "error" ? "text-error" : tone === "success" ? "text-success" : "text-light");
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

function setPath(path, value) {
  const parts = path.split(".");
  let cursor = content;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (cursor[part] == null || typeof cursor[part] !== "object") cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
  setStatus("Modifications non publiées");
  updateTranslationStatus();
}

function deletePath(path) {
  const parts = path.split(".");
  let cursor = content;
  for (let i = 0; i < parts.length - 1; i++) cursor = cursor[parts[i]];
  if (cursor) delete cursor[parts[parts.length - 1]];
  setStatus("Modifications non publiées");
}

function labelFromKey(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isLongText(path, value) {
  return (
    String(value).length > 90 ||
    String(value).includes("\n") ||
    /body|description|subtitle|message|intro|text|placeholder/i.test(path)
  );
}

function isImageField(path) {
  return /(^|\.)(image|images|hero|portrait|photo|og_image|favicon|og)$/i.test(path);
}

function renderTabs() {
  tabsEl.innerHTML = "";
  for (const tab of TABS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-tab${tab.key === activeTab ? " active" : ""}`;
    button.textContent = tab.label;
    button.addEventListener("click", () => {
      activeTab = tab.key;
      renderTabs();
      renderActiveTab();
    });
    tabsEl.appendChild(button);
  }
}

function renderActiveTab() {
  const tab = TABS.find((item) => item.key === activeTab);
  sectionTitle.textContent = tab.label;
  editorEl.innerHTML = "";

  if (activeTab === "images") {
    renderImages();
    return;
  }

  const value = getPath(tab.path);
  editorEl.appendChild(renderValueEditor(tab.path, value, tab.label));
  updateTranslationStatus();
}

function renderValueEditor(path, value, label) {
  if (Array.isArray(value)) return renderArrayEditor(path, value, label);
  if (value && typeof value === "object") return renderObjectEditor(path, value, label);
  return renderScalarEditor(path, value, label);
}

function renderObjectEditor(path, value, label) {
  const fieldset = document.createElement("div");
  fieldset.className = "admin-fieldset";
  const legend = document.createElement("p");
  legend.className = "admin-legend";
  legend.textContent = label;
  fieldset.appendChild(legend);

  for (const [key, child] of Object.entries(value || {})) {
    fieldset.appendChild(renderValueEditor(`${path}.${key}`, child, labelFromKey(key)));
  }
  return fieldset;
}

function emptyItemFromArray(array) {
  if (array.length && typeof array[0] === "object" && array[0] !== null) {
    const clone = {};
    for (const key of Object.keys(array[0])) clone[key] = typeof array[0][key] === "boolean" ? false : "";
    return clone;
  }
  return "";
}

function renderArrayEditor(path, value, label) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-fieldset";

  const header = document.createElement("div");
  header.className = "admin-actions justify-between";
  const legend = document.createElement("p");
  legend.className = "admin-legend";
  legend.textContent = `${label} (${value.length})`;
  const add = document.createElement("button");
  add.type = "button";
  add.className = "btn btn-outline";
  add.textContent = "Ajouter";
  add.addEventListener("click", () => {
    value.push(emptyItemFromArray(value));
    setPath(path, value);
    renderActiveTab();
  });
  header.append(legend, add);
  wrapper.appendChild(header);

  value.forEach((item, index) => {
    const itemBox = document.createElement("div");
    itemBox.className = "admin-array-item";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-outline mb-4";
    remove.textContent = "Retirer";
    remove.addEventListener("click", () => {
      value.splice(index, 1);
      setPath(path, value);
      renderActiveTab();
    });
    itemBox.appendChild(remove);
    itemBox.appendChild(renderValueEditor(`${path}.${index}`, item, `${label} ${index + 1}`));
    wrapper.appendChild(itemBox);
  });

  return wrapper;
}

function renderScalarEditor(path, value, label) {
  const group = document.createElement("div");
  group.className = "admin-field";

  const labelEl = document.createElement("label");
  labelEl.className = "admin-label";
  labelEl.textContent = label;
  group.appendChild(labelEl);

  if (typeof value === "boolean") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value;
    input.addEventListener("change", () => setPath(path, input.checked));
    group.appendChild(input);
    return group;
  }

  if (typeof value === "number") {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "input";
    input.value = value;
    input.addEventListener("input", () => setPath(path, Number(input.value)));
    group.appendChild(input);
    return group;
  }

  if (isLongText(path, value)) {
    const textarea = document.createElement("textarea");
    textarea.className = "textarea";
    textarea.rows = 5;
    textarea.value = value || "";
    textarea.addEventListener("input", () => setPath(path, textarea.value));
    group.appendChild(textarea);
  } else {
    const input = document.createElement("input");
    input.className = "input";
    input.type = path.endsWith(".color") || /theme\./.test(path) ? "text" : "text";
    input.value = value || "";
    input.addEventListener("input", () => setPath(path, input.value));
    group.appendChild(input);
  }

  if (isImageField(path)) {
    const preview = document.createElement("img");
    preview.className = "admin-image-preview";
    preview.alt = "";
    preview.src = value || "/favicon.svg";
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*,.ico";
    file.addEventListener("change", async () => {
      if (!file.files || !file.files[0]) return;
      try {
        setStatus("Téléversement de l'image...");
        const uploaded = await uploadImage(file.files[0]);
        setPath(path, `/${uploaded.path}`);
        renderActiveTab();
        setStatus("Image téléversée. Publiez le contenu pour enregistrer la référence.", "success");
      } catch (error) {
        setStatus(error.message, "error");
      }
    });
    group.append(preview, file);
  }

  return group;
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

async function uploadImage(file) {
  const contentBase64 = await fileToBase64(file);
  return apiJson(API.image, {
    method: "PUT",
    csrf: true,
    body: { name: cleanFileName(file.name), contentBase64 },
  });
}

async function renderImages() {
  sectionTitle.textContent = "Images";
  translationStatus.textContent = "";
  editorEl.innerHTML = "<p class=\"admin-status\">Chargement des images...</p>";
  try {
    const data = await apiJson(API.images);
    if (!data.images.length) {
      editorEl.innerHTML = "<p class=\"admin-status\">Aucune image téléversée pour le moment.</p>";
      return;
    }
    const grid = document.createElement("div");
    grid.className = "admin-image-grid";
    for (const image of data.images) {
      const card = document.createElement("article");
      card.className = "admin-image-card";
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
        renderImages();
      });
      card.append(img, name, path, remove);
      grid.appendChild(card);
    }
    editorEl.innerHTML = "";
    editorEl.appendChild(grid);
  } catch (error) {
    editorEl.innerHTML = "";
    setStatus(error.message, "error");
  }
}

function countMissingTranslations() {
  const fr = content?.locales?.["fr-CA"];
  const en = content?.locales?.["en-CA"];
  if (!fr || !en) return 0;
  let missing = 0;

  function walk(source, target) {
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
  }

  walk(fr, en);
  return missing;
}

function updateTranslationStatus() {
  if (!content) return;
  const missing = countMissingTranslations();
  translationStatus.textContent = missing ? `${missing} champ(s) anglais semblent vides.` : "Traductions principales complètes.";
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
}

async function publish() {
  try {
    setStatus("Publication en cours...");
    const data = await apiJson(API.content, {
      method: "PUT",
      csrf: true,
      body: { content, sha: contentSha },
    });
    contentSha = data.sha || contentSha;
    setStatus("Publié. Cloudflare Pages redéploiera le site.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function preview(locale) {
  try {
    setStatus("Préparation de l'aperçu...");
    const html = await apiHtml(API.preview, {
      method: "POST",
      csrf: true,
      body: { content, locale },
    });
    const win = window.open("", `_preview_${locale}`);
    if (!win) throw new Error("La fenêtre d'aperçu a été bloquée.");
    win.document.open();
    win.document.write(html);
    win.document.close();
    setStatus("Aperçu ouvert.", "success");
  } catch (error) {
    setStatus(error.message, "error");
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
    renderTabs();
    renderActiveTab();
    setStatus("Prêt.");
  } catch (err) {
    showLogin(error || "login_required");
  }

  document.getElementById("publish").addEventListener("click", publish);
  document.getElementById("preview-fr").addEventListener("click", () => preview("fr-CA"));
  document.getElementById("preview-en").addEventListener("click", () => preview("en-CA"));
  document.getElementById("logout").addEventListener("click", logout);
}

init();
