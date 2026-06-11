import { marked } from "marked";

const TRUSTED_HTML_KEY = Symbol("trustedHtml");
const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function resolve(obj, keyPath) {
  return keyPath.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function escapeMarkdownInput(value) {
  return String(value).replace(/[&<>]/g, (char) => HTML_ESCAPE_MAP[char]);
}

function decodeHtmlCodePoint(value, radix) {
  const codePoint = Number.parseInt(value, radix);
  return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
}

function decodeHtmlAttribute(value) {
  let decoded = String(value);
  for (let index = 0; index < 4; index += 1) {
    const next = decoded
      .replace(/&amp;/gi, "&")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => decodeHtmlCodePoint(hex, 16))
      .replace(/&#(\d+);/g, (_, decimal) => decodeHtmlCodePoint(decimal, 10))
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function trustedHtml(value) {
  return { [TRUSTED_HTML_KEY]: value };
}

function isTrustedHtml(value) {
  return value && typeof value === "object" && typeof value[TRUSTED_HTML_KEY] === "string";
}

function markdownAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? decodeHtmlAttribute(match[1] ?? match[2] ?? match[3] ?? "").trim() : "";
}

function isSafeMarkdownImageSrc(src) {
  return (
    !!src &&
    !/[\u0000-\u001f\u007f]/.test(src) &&
    (/^https?:\/\//i.test(src) || (src.startsWith("/") && !src.startsWith("//")))
  );
}

function sanitizeMarkdownImage(tag) {
  const src = markdownAttribute(tag, "src");
  if (!isSafeMarkdownImageSrc(src)) return "";
  const attrs = [`src="${escapeHtml(src)}"`, `alt="${escapeHtml(markdownAttribute(tag, "alt"))}"`];
  const title = markdownAttribute(tag, "title");
  if (title) attrs.push(`title="${escapeHtml(title)}"`);
  attrs.push('loading="lazy"', 'decoding="async"');
  return `<img ${attrs.join(" ")}>`;
}

function sanitizeRenderedMarkdown(html) {
  return String(html)
    .replace(/<\/?(?:script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link)[^>]*>/gi, "")
    .replace(/<img\b[^>]*>/gi, sanitizeMarkdownImage)
    .replace(/\s(on\w+)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|')\s*(?!https?:|mailto:|tel:|\/|#)[^"']*\2/gi, "")
    .replace(/\s(href|src)\s*=\s*(?!["'])(?!https?:|mailto:|tel:|\/|#)[^\s>]*/gi, "");
}

function inlineMarkdown(text) {
  if (typeof text !== "string" || !text) return text;
  if (!/[*~`\[]/.test(text)) return escapeHtml(text).replace(/\n/g, "<br>");
  return sanitizeRenderedMarkdown(marked.parseInline(escapeMarkdownInput(text)));
}

export function markdownToHtml(text) {
  if (typeof text !== "string" || !text.trim()) return "";
  return sanitizeRenderedMarkdown(marked.parse(escapeMarkdownInput(text)));
}

export function normalizeInstagramEmbed(shared) {
  const social = shared?.social || {};
  const rawUrl = String(social.instagram_embed_url || "").trim();
  const isTrustedUrl = /^https:\/\/emb\.fouita\.com\/widget\/[a-z0-9]+\/[a-z0-9]+\/?$/i.test(rawUrl);
  const title = String(social.instagram_embed_title || "Carousel Instagram Feed")
    .replace(/[<>"']/g, "")
    .trim();

  return {
    url: isTrustedUrl ? rawUrl : "",
    title: title || "Carousel Instagram Feed",
  };
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
    if (locale.about?.body) locale.about.body = trustedHtml(markdownToHtml(locale.about.body));
    if (locale.popup?.message) locale.popup.message = trustedHtml(markdownToHtml(locale.popup.message));
    if (locale.privacy_page?.body) locale.privacy_page.body = trustedHtml(markdownToHtml(locale.privacy_page.body));
    if (locale.legal_page?.body) locale.legal_page.body = trustedHtml(markdownToHtml(locale.legal_page.body));
    for (const item of locale.guide?.items || []) {
      if (item.description) item.description = trustedHtml(markdownToHtml(item.description));
    }
    for (const item of locale.services?.items || []) {
      if (item.description) item.description = trustedHtml(markdownToHtml(item.description));
    }
    for (const item of locale.about?.timeline || []) {
      if (item.description) item.description = trustedHtml(markdownToHtml(item.description));
    }
  }

  return next;
}

function renderValue(value) {
  if (isTrustedHtml(value)) return value[TRUSTED_HTML_KEY];
  if (value == null || typeof value === "object") return "";
  const str = String(value);
  return inlineMarkdown(str);
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
