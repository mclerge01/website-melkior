import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../admin/admin.js", import.meta.url), "utf8");

test("admin brand discard flow snapshots href before awaiting confirmation", () => {
  const listenerMatch = source.match(
    /document\.querySelector\("\.admin-brand-link"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n  \}\);/
  );

  assert.ok(listenerMatch, "admin brand link click listener should exist");
  const listenerBody = listenerMatch[1];
  const awaitIndex = listenerBody.indexOf("await showDiscardConfirmation()");
  const hrefSnapshotIndex = listenerBody.indexOf("const href = event.currentTarget.href");

  assert.notEqual(awaitIndex, -1, "listener should await the discard confirmation");
  assert.notEqual(hrefSnapshotIndex, -1, "listener should snapshot href before awaiting");
  assert.ok(hrefSnapshotIndex < awaitIndex, "href must be read while event.currentTarget is still available");
  assert.equal(listenerBody.includes("window.location.href = event.currentTarget.href"), false);
});

test("admin brand discard flow clears pending changes before navigating", () => {
  const listenerMatch = source.match(
    /document\.querySelector\("\.admin-brand-link"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n  \}\);/
  );

  assert.ok(listenerMatch, "admin brand link click listener should exist");
  const listenerBody = listenerMatch[1];
  const discardIndex = listenerBody.indexOf("discardPendingChanges();");
  const navigateIndex = listenerBody.indexOf("window.location.href = href");

  assert.notEqual(discardIndex, -1, "listener should clear local dirty state after discard confirmation");
  assert.notEqual(navigateIndex, -1, "listener should navigate to the saved href");
  assert.ok(discardIndex < navigateIndex, "dirty state must be cleared before navigation triggers beforeunload");
});
