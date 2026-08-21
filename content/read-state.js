window.eminus = window.eminus || {};

var em = window.eminus;

em.normalizeReadContentIds = function (raw) {
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.map((id) => String(id || "")).filter(Boolean));
};

em.isContentRead = function (item) {
  return !!item?.id && em.state.readContentIds.has(item.id);
};

em.getUnreadContent = function (items) {
  return em.getContentItems(items || em.state.pending).filter((item) => !item.archived && !em.isContentRead(item));
};

em.getUnreadContentCount = function (items) {
  return em.getUnreadContent(items).length;
};

em.pruneReadContentIds = function (items, readSet) {
  const visibleIds = new Set(em.getContentItems(items).map((item) => item.id).filter(Boolean));
  return new Set(Array.from(readSet || []).filter((id) => visibleIds.has(id)));
};

em.persistReadContentIds = async function () {
  const payload = {};
  payload[em.STORAGE_KEYS.READ_CONTENT_IDS] = Array.from(em.state.readContentIds);
  await em.storageSet(payload);
};

em.markContentReadByIndex = async function (index, isRead) {
  const item = em.state.pending[index];
  if (!item || item.kind !== "content" || !item.id) return;
  if (isRead === false) {
    em.state.readContentIds.delete(item.id);
  } else {
    em.state.readContentIds.add(item.id);
  }
  await em.persistReadContentIds();
  em.renderPending(em.state.pending);
  em.setStatus(em.t(isRead === false ? "status_content_unread" : "status_content_read") + ": " + item.title);
};

em.markAllContentRead = async function () {
  const unread = em.getUnreadContent(em.state.pending);
  if (!unread.length) return;
  unread.forEach((item) => em.state.readContentIds.add(item.id));
  await em.persistReadContentIds();
  em.renderPending(em.state.pending);
  em.setStatus(em.t("status_content_all_read").replace("{n}", unread.length));
};
