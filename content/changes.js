window.eminus = window.eminus || {};

var em = window.eminus;

em.detectChanges = function (pending, previousPending) {
  const changes = [];
  if (!Array.isArray(previousPending) || previousPending.length === 0) return changes;

  const prevById = new Map();
  for (const item of previousPending) {
    if (item && item.id) prevById.set(item.id, item);
  }

  for (const item of pending) {
    const prev = prevById.get(item.id);
    if (!prev) continue;

    if (prev.deadlineRaw !== item.deadlineRaw) {
      changes.push({
        type: "deadline",
        title: item.course + " - " + item.title,
        from: prev.deadlineStr || prev.deadlineLabel || em.t("due_nodate"),
        to: item.deadlineStr || item.deadlineLabel || em.t("due_nodate")
      });
    }

    const prevStatus = prev.estatus || (prev.entregada ? em.t("status_delivered") : prev.completada ? em.t("status_completed") : em.t("status_pending_label"));
    const newStatus = item.estatus || (item.entregada ? em.t("status_delivered") : item.completada ? em.t("status_completed") : em.t("status_pending_label"));
    if (prevStatus !== newStatus) {
      changes.push({
        type: "status",
        title: item.course + " - " + item.title,
        from: prevStatus,
        to: newStatus
      });
    }
  }

  return changes;
};

em.appendLog = async function (pending, knownIdsBefore, visiblePending, previousPending) {
  visiblePending = visiblePending || pending;
  previousPending = previousPending || [];
  const nowIso = new Date().toISOString();
  const currentIds = pending.map((item) => item.id);
  const newCount = currentIds.filter((id) => !knownIdsBefore.has(id)).length;
  const newTaskCount = em.getActivityItems(pending).filter((item) => item && item.id && !knownIdsBefore.has(item.id)).length;
  const newContentCount = em.getContentItems(pending).filter((item) => item && item.id && !knownIdsBefore.has(item.id)).length;
  const pendingCount = Array.isArray(visiblePending) ? visiblePending.length : 0;
  const changes = em.detectChanges(pending, previousPending);

  const data = await em.storageGet([em.STORAGE_KEYS.LOG]);
  const logs = Array.isArray(data[em.STORAGE_KEYS.LOG]) ? data[em.STORAGE_KEYS.LOG] : [];

  if (newCount > 0 || changes.length > 0) {
    const previewSource = pendingCount ? visiblePending : pending;
    const entry = {
      timestamp: nowIso,
      pendingCount,
      newCount,
      newTaskCount,
      newContentCount,
      changes,
      previewTitles: previewSource.slice(0, 4).map((p) => p.course + " - " + p.title)
    };
    logs.unshift(entry);
  }

  const trimmedLogs = logs.slice(0, 250);
  em.state.logs = trimmedLogs;

  const overdueCount = pending.filter((item) => item.urgency === "overdue" && !item.archived).length;

  const payload = {};
  payload[em.STORAGE_KEYS.LOG] = trimmedLogs;
  payload[em.STORAGE_KEYS.SNAPSHOT] = {
    updatedAt: nowIso,
    pendingCount,
    newCount,
    newTaskCount,
    newContentCount,
    overdueCount,
    pending
  };
  payload[em.STORAGE_KEYS.KNOWN_IDS] = currentIds;
  await em.storageSet(payload);

  return { newCount, newTaskCount, newContentCount, overdueCount, updatedAt: nowIso, changes };
};
