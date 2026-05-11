/* ══════════════════════════════════════════
   STORAGE HELPERS
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

(function () {
  var api = typeof browser !== "undefined" ? browser : null;
  em.hasApi = !!api;
  em.hasStorageApi = !!(api && api.storage && api.storage.local);
  em.hasRuntimeApi = !!(api && api.runtime);
})();

em.storageGet = async function (keys) {
  if (!em.hasStorageApi) {
    return {};
  }
  return browser.storage.local.get(keys);
};

em.storageSet = async function (payload) {
  if (!em.hasStorageApi) {
    return;
  }
  return browser.storage.local.set(payload);
};
