function cloneJsonValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function applyDefaults(saved, defaults) {
  if (saved === undefined) {
    return { value: cloneJsonValue(defaults), defaultsApplied: defaults !== undefined };
  }

  if (!isPlainObject(saved) || !isPlainObject(defaults)) {
    return { value: cloneJsonValue(saved), defaultsApplied: false };
  }

  const value = cloneJsonValue(saved);
  let defaultsApplied = false;

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(saved, key)) {
      value[key] = cloneJsonValue(defaultValue);
      defaultsApplied = true;
      continue;
    }

    const nested = applyDefaults(saved[key], defaultValue);
    value[key] = nested.value;
    defaultsApplied ||= nested.defaultsApplied;
  }

  return { value, defaultsApplied };
}

/**
 * Populate newly introduced content keys without replacing saved admin values.
 *
 * @param {Record<string, unknown>} savedContent - Content currently stored in GitHub.
 * @param {Record<string, unknown>} defaultContent - Content bundled with the current build.
 * @returns {{content: Record<string, unknown>, defaultsApplied: boolean}}
 */
export function applyMissingContentDefaults(savedContent, defaultContent) {
  const result = applyDefaults(savedContent, defaultContent);
  return {
    content: isPlainObject(result.value) ? result.value : {},
    defaultsApplied: result.defaultsApplied,
  };
}
