/* ══════════════════════════════════════════
   STORAGE HELPERS
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

(function () {
  var hasChrome = typeof chrome !== "undefined";
  em.hasChrome = hasChrome;
  em.hasStorageApi = hasChrome && !!((chrome || {}).storage || {}).local;
  em.hasSyncStorageApi = hasChrome && !!((chrome || {}).storage || {}).sync;
  em.hasRuntimeApi = hasChrome && !!chrome.runtime;
})();

em.storageGet = async function (keys) {
  if (!em.hasStorageApi) {
    return {};
  }
  return chrome.storage.local.get(keys);
};

em.storageSet = async function (payload) {
  if (!em.hasStorageApi) {
    return;
  }
  return chrome.storage.local.set(payload);
};

em.storageClear = async function () {
  if (!em.hasStorageApi) {
    return;
  }
  return chrome.storage.local.clear();
};

em.preferencesGet = async function (keys) {
  const localData = await em.storageGet(keys);
  if (!em.hasSyncStorageApi) {
    return localData;
  }
  try {
    const syncedData = await chrome.storage.sync.get(keys);
    return { ...localData, ...syncedData };
  } catch (_) {
    return localData;
  }
};

em.preferencesSet = async function (payload) {
  await em.storageSet(payload);
  if (!em.hasSyncStorageApi) {
    return;
  }
  try {
    await chrome.storage.sync.set(payload);
  } catch (_) {
    // Local storage remains a usable fallback if sync is unavailable.
  }
};

em.preferencesClear = async function (keys) {
  if (!em.hasSyncStorageApi) {
    return;
  }
  try {
    await chrome.storage.sync.remove(keys);
  } catch (_) {
    // Clearing synced preferences is best effort.
  }
};
