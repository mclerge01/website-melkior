import { marked } from "marked";

function resolve(obj, keyPath) {
  return keyPath.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

function hasHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value));
}

function inlineMarkdown(text) {
  if (typeof text !== "string" || !text) return text;
  if (/^(\/|#|https?:|tel:|mailto:)/i.test(text)) return text;
  if (!/[*~`\[]/.test(text)) return text;
  return marked.parseInline(text);
}

function instagramEmbedUrl(url) {
  const clean = String(url || "").split("?")[0].replace(/\/$/, "");
  const match = clean.match(/^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([^/#?]+)/i);
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : "";
}

export function markdownToHtml(text) {
  if (typeof text !== "string" || !text.trim()) return "";
  return marked.parse(text);
}

function sanitizeTheme(theme) {
  if (!theme || typeof theme !== "object") return {};
  const clean = {};
  for (const [key, value] of Object.entries(theme)) {
    if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value)) clean[key] = value;
  }
  return clean;
}

export function processMarkdown(data) {
  const next = structuredClone(data);
  next.theme = sanitizeTheme(next.theme);

  const localeObjects = next.locales ? Object.values(next.locales) : [next];
  for (const locale of localeObjects) {
    if (locale.about?.body) locale.about.body = markdownToHtml(locale.about.body);
    if (locale.popup?.message) locale.popup.message = markdownToHtml(locale.popup.message);
    if (locale.privacy_page?.body) locale.privacy_page.body = markdownToHtml(locale.privacy_page.body);
    if (locale.legal_page?.body) locale.legal_page.body = markdownToHtml(locale.legal_page.body);
    for (const item of locale.guide?.items || []) {
      if (item.description) item.description = markdownToHtml(item.description);
    }
    for (const item of locale.services?.items || []) {
      if (item.description) item.description = markdownToHtml(item.description);
    }
    for (const item of locale.about?.timeline || []) {
      if (item.description) item.description = markdownToHtml(item.description);
    }
    for (const item of locale.media?.items || []) {
      item.embed_url = item.embed_url || instagramEmbedUrl(item.url);
    }
  }

  return next;
}

function renderValue(value) {
  if (value == null || typeof value === "object") return "";
  const str = String(value);
  if (hasHtml(str)) return str;
  return inlineMarkdown(str.replace(/\n/g, "<br>"));
}

export function render(template, data) {
  let out = template;

  while (/\{\{#if\s+/.test(out)) {
    out = out.replace(/\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/g, (_, key, body) => {
      return resolve(data, key) ? body : "";
    });
  }

  out = out.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, body) => {
    const arr = resolve(data, key);
    if (!Array.isArray(arr)) return "";
    return arr.map((item, index) => {
      let chunk = body.replace(/\{\{@index\}\}/g, String(index));
      chunk = chunk.replace(/\{\{(\w+)\}\}/g, (match, field) => {
        if (item[field] == null) return "";
        return renderValue(item[field]);
      });
      return chunk;
    }).join("");
  });

  out = out.replace(/\{\{currentYear\}\}/g, String(new Date().getFullYear()));
  out = out.replace(/\{\{([\w.]+)\}\}/g, (_, keyPath) => renderValue(resolve(data, keyPath)));

  return out;
}
