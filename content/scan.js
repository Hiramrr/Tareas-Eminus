window.eminus = window.eminus || {};

var em = window.eminus;

em.hydrateFromStorage = async function () {
  let data = await em.storageGet([
    em.STORAGE_KEYS.LOG,
    em.STORAGE_KEYS.SNAPSHOT,
    em.STORAGE_KEYS.THEME,
    em.STORAGE_KEYS.ACCOUNT_ID,
    em.STORAGE_KEYS.ARCHIVED,
    em.STORAGE_KEYS.PINNED,
    em.STORAGE_KEYS.AUTO_REFRESH,
    em.STORAGE_KEYS.REMINDER_HOURS,
    em.STORAGE_KEYS.REMINDER_MODE,
    em.STORAGE_KEYS.QUIET_HOURS,
    em.STORAGE_KEYS.NOTIFIED_UPCOMING,
    em.STORAGE_KEYS.READ_CONTENT_IDS,
    em.STORAGE_KEYS.LAST_URGENCY_BY_ID,
    em.STORAGE_KEYS.FONT,
    em.STORAGE_KEYS.LANG,
    em.STORAGE_KEYS.LOG_TAB_VISIBLE,
    em.STORAGE_KEYS.FILTERS_COMPACT,
    em.STORAGE_KEYS.CUSTOM_THEME,
    em.STORAGE_KEYS.PANEL_SIZE,
    em.STORAGE_KEYS.DELIVERY_ANIMATION,
    em.STORAGE_KEYS.PANEL_UI_STATE
  ]);
  const preferenceData = await em.preferencesGet(em.PREFERENCE_STORAGE_KEYS);
  if (Object.keys(preferenceData).length) {
    await em.preferencesSet(preferenceData);
  }
  data = { ...data, ...preferenceData };
  if (em.hydratePersonalization) {
    await em.hydratePersonalization(data);
  }

  const storedAccountId = data[em.STORAGE_KEYS.ACCOUNT_ID];
  const currentToken = em.getToken();
  const currentAccountId = em.getAccountIdFromToken(currentToken);

  if (storedAccountId && currentAccountId && storedAccountId !== currentAccountId) {
    const clearPayload = {};
    clearPayload[em.STORAGE_KEYS.LOG] = [];
    clearPayload[em.STORAGE_KEYS.SNAPSHOT] = null;
    clearPayload[em.STORAGE_KEYS.KNOWN_IDS] = [];
    clearPayload[em.STORAGE_KEYS.ARCHIVED] = [];
    clearPayload[em.STORAGE_KEYS.PINNED] = [];
    clearPayload[em.STORAGE_KEYS.NOTIFIED_UPCOMING] = [];
    clearPayload[em.STORAGE_KEYS.READ_CONTENT_IDS] = [];
    clearPayload[em.STORAGE_KEYS.LAST_URGENCY_BY_ID] = {};
    clearPayload[em.STORAGE_KEYS.ACCOUNT_ID] = currentAccountId;
    if (em.clearContentApiCache) em.clearContentApiCache();
    await em.storageSet(clearPayload);
    data[em.STORAGE_KEYS.LOG] = [];
    data[em.STORAGE_KEYS.SNAPSHOT] = null;
    data[em.STORAGE_KEYS.ARCHIVED] = [];
    data[em.STORAGE_KEYS.PINNED] = [];
    data[em.STORAGE_KEYS.NOTIFIED_UPCOMING] = [];
    data[em.STORAGE_KEYS.READ_CONTENT_IDS] = [];
    data[em.STORAGE_KEYS.LAST_URGENCY_BY_ID] = {};
    await em.syncBadge(0);
  } else if (currentAccountId && !storedAccountId) {
    const idPayload = {};
    idPayload[em.STORAGE_KEYS.ACCOUNT_ID] = currentAccountId;
    await em.storageSet(idPayload);
  } else if (!currentToken && storedAccountId) {
    await em.syncBadge(0);
  }

  em.state.logs = Array.isArray(data[em.STORAGE_KEYS.LOG]) ? data[em.STORAGE_KEYS.LOG] : [];
  em.state.archivedIds = em.normalizeArchivedIds(data[em.STORAGE_KEYS.ARCHIVED]);
  em.state.pinnedIds = em.normalizePinnedIds(data[em.STORAGE_KEYS.PINNED]);
  em.state.notifiedUpcomingIds = em.normalizeNotifiedUpcomingIds(data[em.STORAGE_KEYS.NOTIFIED_UPCOMING]);
  em.state.readContentIds = em.normalizeReadContentIds(data[em.STORAGE_KEYS.READ_CONTENT_IDS]);
  if (em.applyStoredPanelUiState) {
    em.applyStoredPanelUiState(data[em.STORAGE_KEYS.PANEL_UI_STATE]);
  }

  em.applyCustomTheme(data[em.STORAGE_KEYS.CUSTOM_THEME]);

  const storedPanelSize = data[em.STORAGE_KEYS.PANEL_SIZE] || "normal";
  if (em.setPanelSize) {
    await em.setPanelSize(storedPanelSize, false);
  }

  const storedDeliveryAnimation = data[em.STORAGE_KEYS.DELIVERY_ANIMATION] || "cycle";
  if (em.setDeliveryAnimation) {
    await em.setDeliveryAnimation(storedDeliveryAnimation, false);
  }

  const theme = data[em.STORAGE_KEYS.THEME] || "light";
  if (em.PANEL_THEME_CLASSES) {
    em.panelEls.root.classList.remove(...em.PANEL_THEME_CLASSES);
  }
  if (theme !== "light") {
    em.panelEls.root.classList.add("ep-" + theme + "-theme");
  }
  em.updateActiveThemeChip && em.updateActiveThemeChip(theme);
  em.updateCustomThemeVisibility && em.updateCustomThemeVisibility(theme);

  const snapshot = data[em.STORAGE_KEYS.SNAPSHOT];
  if (snapshot && Array.isArray(snapshot.pending)) {
    em.state.pending = em.applyArchivedState(snapshot.pending, em.state.archivedIds);
    em.applyPinnedState(em.state.pending, em.state.pinnedIds);
    em.state.lastUpdatedAt = snapshot.updatedAt || null;
    em.state.lastContentScanAt = Number(snapshot.contentScanAt) || 0;

    // Solo escribe las claves cuya poda cambió algo; en la mayoría de cargas
    // no cambia nada y no hace falta tocar storage.
    const prunePayload = {};
    const prunedSets = [
      [em.STORAGE_KEYS.ARCHIVED, "archivedIds", em.pruneArchivedIds],
      [em.STORAGE_KEYS.PINNED, "pinnedIds", em.prunePinnedIds],
      [em.STORAGE_KEYS.NOTIFIED_UPCOMING, "notifiedUpcomingIds", em.pruneNotifiedUpcomingIds],
      [em.STORAGE_KEYS.READ_CONTENT_IDS, "readContentIds", em.pruneReadContentIds]
    ];
    prunedSets.forEach(([storageKey, stateKey, prune]) => {
      const pruned = prune(em.state.pending, em.state[stateKey]);
      if (!em.setsEqual(pruned, em.state[stateKey])) {
        em.state[stateKey] = pruned;
        prunePayload[storageKey] = Array.from(pruned);
      }
    });
    if (Object.keys(prunePayload).length) {
      await em.storageSet(prunePayload);
    }

    em.sortPendingItems(em.state.pending);

    if (em.panelEls && em.panelEls.subtitle) {
      em.panelEls.subtitle.textContent = em.t("last_read") + ": " + em.formatDateTime(snapshot.updatedAt);
    }
    em.renderPending(em.state.pending);
    const visibleCount = em.getVisiblePendingCount(em.state.pending);
    const overdueCount = em.state.pending.filter((item) => item.urgency === "overdue" && !item.archived).length;
    await em.syncBadge(visibleCount, 0, overdueCount);
  } else {
    em.state.pending = [];
    em.state.lastUpdatedAt = null;
    em.state.lastContentScanAt = 0;
    em.renderPending([]);
    if (em.panelEls && em.panelEls.subtitle) {
      em.panelEls.subtitle.textContent = em.t("last_read") + ": " + em.t("never");
    }
    await em.syncBadge(0, 0, 0);
  }

  em.renderLogs(em.state.logs);

  const storedAutoRefresh = Number(data[em.STORAGE_KEYS.AUTO_REFRESH]) || 0;
  if (storedAutoRefresh > 0 && em.panelEls && em.panelEls.autoRefreshSelect) {
    em.startAutoRefresh(storedAutoRefresh);
  }

  const storedReminderMode = data[em.STORAGE_KEYS.REMINDER_MODE] ?? data[em.STORAGE_KEYS.REMINDER_HOURS] ?? "staggered";
  em.state.reminderMode = em.normalizeReminderMode(storedReminderMode);
  if (em.panelEls && em.panelEls.reminderSelect) {
    em.panelEls.reminderSelect.value = em.state.reminderMode === "off"
      ? "0"
      : em.state.reminderMode === "staggered"
        ? "staggered"
        : em.state.reminderMode.replace("single-", "");
  }
  const storedQuietHours = data[em.STORAGE_KEYS.QUIET_HOURS];
  em.state.quietHours = {
    start: em.normalizeQuietHour(storedQuietHours?.start),
    end: em.normalizeQuietHour(storedQuietHours?.end)
  };
  if (em.panelEls && em.panelEls.quietStartSelect) em.panelEls.quietStartSelect.value = em.state.quietHours.start;
  if (em.panelEls && em.panelEls.quietEndSelect) em.panelEls.quietEndSelect.value = em.state.quietHours.end;

  const storedFont = data[em.STORAGE_KEYS.FONT] || "mono";
  em.setFont(storedFont);

  em.state.isLogTabVisible = data[em.STORAGE_KEYS.LOG_TAB_VISIBLE] !== false;
  if (em.panelEls && em.panelEls.logVisibilitySelect) {
    em.panelEls.logVisibilitySelect.value = em.state.isLogTabVisible ? "visible" : "removed";
  }
  if (em.updateTabVisibility) em.updateTabVisibility();

  em.state.isFiltersCompact = data[em.STORAGE_KEYS.FILTERS_COMPACT] === true;
  if (em.panelEls && em.panelEls.root) {
    em.panelEls.root.classList.toggle("ep-filters-compact", em.state.isFiltersCompact);
  }
  if (em.updateFiltersCompactButton) em.updateFiltersCompactButton();
  
  const storedLang = data[em.STORAGE_KEYS.LANG] || "es";
  em.state.lang = storedLang;
  if (em.panelEls && em.panelEls.langSelect) {
    em.panelEls.langSelect.value = storedLang;
  }
  if (em.applyTranslations) em.applyTranslations();
};

em.normalizeUrgencyMap = function (raw) {
  const allowed = new Set(["overdue", "imminent", "urgent", "normal"]);
  const normalized = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return normalized;

  Object.keys(raw).forEach((id) => {
    const key = String(id || "");
    const urgency = String(raw[id] || "");
    if (key && allowed.has(urgency)) {
      normalized[key] = urgency;
    }
  });

  return normalized;
};

em.buildUrgencyMap = function (items) {
  const map = {};
  if (!Array.isArray(items)) return map;

  items.forEach((item) => {
    if (item && item.id) {
      map[item.id] = item.urgency || "normal";
    }
  });

  return map;
};

em.scanPendingWhenTokenReady = function (options = {}) {
  if (em.getToken()) {
    if (em.stopTokenWatcher) em.stopTokenWatcher();
    if (em._waitingTokenTimer) { window.clearTimeout(em._waitingTokenTimer); em._waitingTokenTimer = null; }
    em.scanPending(options);
    return;
  }

  em.setStatus(em.t("status_waiting_token"));
  // refuerzo visual: mostrar onboarding mientras no hay token
  if (!em.state.lastUpdatedAt) em.renderPending(em.state.pending || []);
  if (em._waitingTokenTimer) window.clearTimeout(em._waitingTokenTimer);
  em._waitingTokenTimer = window.setTimeout(() => {
    em._waitingTokenTimer = null;
    if (!em.getToken()) {
      em.setStatus(em.t("error_no_token"));
      if (!em.state.lastUpdatedAt) em.renderPending(em.state.pending || []);
    }
  }, 7000);
  if (em.startTokenWatcher) {
    em.startTokenWatcher((token) => {
      if (em._waitingTokenTimer) { window.clearTimeout(em._waitingTokenTimer); em._waitingTokenTimer = null; }
      em.scanPending(options);
    });
  }
};

em.isUnauthorizedError = function (err) {
  return Number(err?.status || 0) === 401 || /HTTP\s+401\b/.test(String(err?.message || ""));
};

em.waitForTokenRefresh = function (previousToken) {
  em.setStatus(em.t("status_waiting_token_refresh"));
  if (!em.startTokenWatcher) return;

  em.startTokenWatcher(() => {
    window.setTimeout(() => em.scanPendingWhenTokenReady(), 0);
  }, {
    previousToken,
    requireChange: true  });
};

em.renderCachedSnapshotFallback = async function () {
  const snapshot = await em.storageGet([em.STORAGE_KEYS.SNAPSHOT, em.STORAGE_KEYS.PINNED]);
  const cached = snapshot[em.STORAGE_KEYS.SNAPSHOT];
  if (!cached || !Array.isArray(cached.pending) || cached.pending.length === 0) return false;

  em.state.pinnedIds = em.normalizePinnedIds(snapshot[em.STORAGE_KEYS.PINNED]);
  em.state.pending = em.applyArchivedState(cached.pending, em.state.archivedIds);
  em.applyPinnedState(em.state.pending, em.state.pinnedIds);
  em.sortPendingItems(em.state.pending);
  em.state.lastUpdatedAt = cached.updatedAt;
  em.state.lastContentScanAt = Number(cached.contentScanAt) || 0;
  em.renderPending(em.state.pending);
  em.renderLogs(em.state.logs);
  if (em.panelEls && em.panelEls.subtitle) {
    em.panelEls.subtitle.textContent = em.t("last_read") + ": " + em.formatDateTime(cached.updatedAt);
  }
  em.updateAutoRefreshLabel(em.autoRefreshMinutes);
  return true;
};

em.scanPending = async function (options = {}) {
  if (em.state.isScanning) return;
  let token = "";
  try {
    token = em.getToken();
  } catch (_) {
    token = "";
  }
  if (!token) {
    em.setStatus(em.t("status_waiting_token"));
    if (!em.state.lastUpdatedAt) em.renderPending(em.state.pending || []);
    if (em.startTokenWatcher) {
      em.startTokenWatcher(() => em.scanPending());
    }
    return;
  }
  em.state.isScanning = true;
  const isFirstScan = !em.state.lastUpdatedAt;
  const scanningMessage = isFirstScan ? em.t("status_scanning") : (em.t("status_scanning_refresh") || "Actualizando cursos y actividades…");
  em.setStatus(scanningMessage);
  if (em.renderPending) em.renderPending(em.state.pending || []);
  if (em.setScanningUi) em.setScanningUi(true);
  if (!options?.silent && em.showToast) em.showToast(scanningMessage, "info");
  if (em.panelEls && em.panelEls.refreshBtn) {
    em.panelEls.refreshBtn.disabled = true;
  }

  let scanError = null;

  try {
    if (em.stopTokenWatcher) em.stopTokenWatcher();

    const currentAccountId = em.getAccountIdFromToken(token);
    let knownData = await em.storageGet([
      em.STORAGE_KEYS.KNOWN_IDS,
      em.STORAGE_KEYS.ACCOUNT_ID,
      em.STORAGE_KEYS.ARCHIVED,
      em.STORAGE_KEYS.PINNED,
      em.STORAGE_KEYS.NOTIFIED_UPCOMING,
      em.STORAGE_KEYS.READ_CONTENT_IDS,
      em.STORAGE_KEYS.LAST_URGENCY_BY_ID
    ]);

    if (knownData[em.STORAGE_KEYS.ACCOUNT_ID] && currentAccountId && knownData[em.STORAGE_KEYS.ACCOUNT_ID] !== currentAccountId) {
      knownData[em.STORAGE_KEYS.KNOWN_IDS] = [];
      knownData[em.STORAGE_KEYS.ARCHIVED] = [];
      knownData[em.STORAGE_KEYS.PINNED] = [];
      knownData[em.STORAGE_KEYS.NOTIFIED_UPCOMING] = [];
      knownData[em.STORAGE_KEYS.READ_CONTENT_IDS] = [];
      knownData[em.STORAGE_KEYS.LAST_URGENCY_BY_ID] = {};
      em.state.logs = [];
      const clearPayload = {};
      clearPayload[em.STORAGE_KEYS.LOG] = [];
      clearPayload[em.STORAGE_KEYS.SNAPSHOT] = null;
      clearPayload[em.STORAGE_KEYS.KNOWN_IDS] = [];
      clearPayload[em.STORAGE_KEYS.ARCHIVED] = [];
      clearPayload[em.STORAGE_KEYS.PINNED] = [];
      clearPayload[em.STORAGE_KEYS.NOTIFIED_UPCOMING] = [];
      clearPayload[em.STORAGE_KEYS.READ_CONTENT_IDS] = [];
    clearPayload[em.STORAGE_KEYS.LAST_URGENCY_BY_ID] = {};
    clearPayload[em.STORAGE_KEYS.ACCOUNT_ID] = currentAccountId;
    if (em.clearContentApiCache) em.clearContentApiCache();
    em.state.lastContentScanAt = 0;
    await em.storageSet(clearPayload);
  } else if (!knownData[em.STORAGE_KEYS.ACCOUNT_ID] && currentAccountId) {
      const idPayload = {};
      idPayload[em.STORAGE_KEYS.ACCOUNT_ID] = currentAccountId;
      await em.storageSet(idPayload);
    }

    const knownIds = new Set(Array.isArray(knownData[em.STORAGE_KEYS.KNOWN_IDS]) ? knownData[em.STORAGE_KEYS.KNOWN_IDS] : []);
    em.state.archivedIds = em.normalizeArchivedIds(knownData[em.STORAGE_KEYS.ARCHIVED]);
    em.state.pinnedIds = em.normalizePinnedIds(knownData[em.STORAGE_KEYS.PINNED]);
    em.state.notifiedUpcomingIds = em.normalizeNotifiedUpcomingIds(knownData[em.STORAGE_KEYS.NOTIFIED_UPCOMING]);
    em.state.readContentIds = em.normalizeReadContentIds(knownData[em.STORAGE_KEYS.READ_CONTENT_IDS]);
    em.state.contentExpandedIds = new Set();
    em.state.contentFileLocationCache = new Map();
    const lastUrgencyById = em.normalizeUrgencyMap(knownData[em.STORAGE_KEYS.LAST_URGENCY_BY_ID]);

    // El contenido publicado cambia poco: los escaneos automáticos (silent)
    // reutilizan el último resultado si es reciente y así evitan el fan-out de
    // getUnidades/getElementos por curso. Un refresco manual siempre lo rehace.
    const previousContentItems = em.getContentItems(em.state.pending || []);
    const contentIsFresh = Number(em.state.lastContentScanAt) > 0 &&
      (Date.now() - Number(em.state.lastContentScanAt)) < em.CONTENT_RESCAN_MS;
    const reuseContent = options.silent === true && contentIsFresh && previousContentItems.length > 0;

    const pending = await em.buildPendingData(token, em.state.pinnedIds, {
      reusedContentItems: reuseContent ? previousContentItems : null,
      onActivitiesReady: async (activityPending) => {
        em.applyArchivedState(activityPending, em.state.archivedIds);
        em.applyPinnedState(activityPending, em.state.pinnedIds);
        em.state.pending = activityPending;
        em.renderPending(activityPending);
        if (reuseContent) return;
        if (em.panelEls && em.panelEls.contentBody) {
          if (em.renderSetHtml) {
            em.renderSetHtml(em.panelEls.contentBody, `<div class="ep-empty">${em.escapeHtml(em.t("status_content"))}: ${em.escapeHtml(em.t("status_loading"))}</div>`);
          } else {
            em.panelEls.contentBody.innerHTML = `<div class="ep-empty">${em.escapeHtml(em.t("status_content"))}: ${em.escapeHtml(em.t("status_loading"))}</div>`;
          }
        }

        const visibleActivities = em.getVisiblePending(activityPending);
        const overdueCount = visibleActivities.filter((item) => item.urgency === "overdue").length;
        const status = visibleActivities.length + " " + em.t("status_pending") + " | " + em.t("status_content") + ": " + em.t("status_loading");
        em.setStatus(status);
        await em.syncBadge(visibleActivities.length, 0, overdueCount);
      }
    });
    if (!reuseContent) {
      em.state.lastContentScanAt = Date.now();
    }
    em.applyArchivedState(pending, em.state.archivedIds);
    em.applyPinnedState(pending, em.state.pinnedIds);
    em.state.readContentIds = em.pruneReadContentIds(pending, em.state.readContentIds);

    // Una sola escritura agrupada en lugar de varios storageSet secuenciales.
    const prunePayload = {};
    const prunedArchived = em.pruneArchivedIds(pending, em.state.archivedIds);
    if (!em.setsEqual(prunedArchived, em.state.archivedIds)) {
      em.state.archivedIds = prunedArchived;
      prunePayload[em.STORAGE_KEYS.ARCHIVED] = Array.from(prunedArchived);
    }

    const prunedPinned = em.prunePinnedIds(pending, em.state.pinnedIds);
    if (!em.setsEqual(prunedPinned, em.state.pinnedIds)) {
      em.state.pinnedIds = prunedPinned;
      prunePayload[em.STORAGE_KEYS.PINNED] = Array.from(prunedPinned);
    }

    const visiblePending = em.getVisiblePending(pending);
    prunePayload[em.STORAGE_KEYS.READ_CONTENT_IDS] = Array.from(em.state.readContentIds);
    await em.storageSet(prunePayload);

    const previousPending = em.state.pending || [];
    const previousOverdueIds = new Set(previousPending.filter((item) => item.urgency === "overdue" && !item.archived).map((item) => item.id));
    const currentOverdue = visiblePending.filter((item) => item.urgency === "overdue");
    const newlyOverdue = currentOverdue.filter((item) => {
      const lastUrgency = lastUrgencyById[item.id];
      if (lastUrgency) return lastUrgency !== "overdue";
      return previousPending.length > 0 && !previousOverdueIds.has(item.id);
    });

    const upcomingNotifications = [];
    const reminderThresholds = em.getReminderThresholds().slice().sort((a, b) => a - b);
    if (reminderThresholds.length && !em.isQuietHoursNow() && (!em.isNotificationEnabled || em.isNotificationEnabled("reminders"))) {
      const now = Date.now();
      for (const item of visiblePending) {
        if (!item.deadlineRaw || item.urgency === "overdue") continue;
        const deadline = new Date(item.deadlineRaw).getTime();
        const diff = deadline - now;
        if (diff <= 0) continue;
        const threshold = reminderThresholds.find((hours) => diff <= hours * 60 * 60 * 1000);
        if (!threshold) continue;
        const reminderKey = em.getReminderNotificationKey(item.id, threshold);
        if (!em.state.notifiedUpcomingIds.has(reminderKey)) {
          upcomingNotifications.push({ item, threshold });
          em.state.notifiedUpcomingIds.add(reminderKey);
        }
      }
    }

    em.state.pending = pending;
    em.state.isScanning = false;
    em.renderPending(pending);

    const logMeta = await em.appendLog(pending, knownIds, visiblePending, previousPending);

    const postScanPayload = {};
    if (upcomingNotifications.length > 0) {
      postScanPayload[em.STORAGE_KEYS.NOTIFIED_UPCOMING] = Array.from(em.state.notifiedUpcomingIds);
    }
    postScanPayload[em.STORAGE_KEYS.LAST_URGENCY_BY_ID] = em.buildUrgencyMap(pending);
    await em.storageSet(postScanPayload);

    em.renderLogs(em.state.logs);
    em.state.lastUpdatedAt = logMeta.updatedAt;

    if (em.panelEls && em.panelEls.subtitle) {
      em.panelEls.subtitle.textContent = em.t("last_read") + ": " + em.formatDateTime(logMeta.updatedAt);
    }
    em.updateAutoRefreshLabel(em.autoRefreshMinutes);
    const visibleContentCount = em.getVisibleContent(pending).length;
    const newTaskCount = Number(logMeta.newTaskCount ?? logMeta.newCount ?? 0);
    const newContentCount = Number(logMeta.newContentCount || 0);
    const newTaskItems = em.getActivityItems(pending).filter((item) => item && item.id && !knownIds.has(item.id));
    const newContentItems = em.getContentItems(pending).filter((item) => item && item.id && !knownIds.has(item.id));
    const notificationsAllowed = !em.isQuietHoursNow();
    const status = visiblePending.length + " " + em.t("status_pending") + " | " + visibleContentCount + " " + em.t("status_content") + " | " + newTaskCount + " " + em.t("status_new");
    em.setStatus(status);

    if (newTaskCount > 0 && (!em.isNotificationEnabled || em.isNotificationEnabled("newTasks"))) {
      const msg = newTaskCount === 1 ? em.t("new_task_toast_1") : newTaskCount + " " + em.t("new_task_toast_n");
      em.showToast(msg, "new");
      const target = newTaskItems.length === 1 ? em.getActivityNotificationTarget(newTaskItems[0]) : null;
      if (notificationsAllowed) await em.notifyUser(em.t("new_task_notif"), msg, target);
    }

    if (newContentCount > 0 && (!em.isNotificationEnabled || em.isNotificationEnabled("newContent"))) {
      const msg = newContentCount === 1 ? em.t("new_content_toast_1") : newContentCount + " " + em.t("new_content_toast_n");
      em.showToast(msg, "info");
      if (notificationsAllowed) {
        const byCourse = new Map();
        newContentItems.forEach((item) => {
          const course = item.course || em.t("status_content");
          byCourse.set(course, (byCourse.get(course) || 0) + 1);
        });
        for (const [course, count] of byCourse) {
          await em.notifyUser(em.t("new_content_notif"), course + ": " + count + " " + em.t("status_content"));
        }
      }
    }

    if (newlyOverdue.length > 0 && (!em.isNotificationEnabled || em.isNotificationEnabled("overdue"))) {
      const msg = newlyOverdue.length === 1 ? em.t("overdue_toast_1") : newlyOverdue.length + " " + em.t("overdue_toast_n");
      em.showToast(msg, "overdue");
      const target = newlyOverdue.length === 1 ? em.getActivityNotificationTarget(newlyOverdue[0]) : null;
      if (notificationsAllowed) await em.notifyUser(em.t("overdue_notif"), msg, target);
    }

    for (const reminder of upcomingNotifications) {
      const msg = em.t("reminder_toast").replace("{h}", reminder.threshold) + ": " + reminder.item.title;
      em.showToast(msg, "urgent");
      await em.notifyUser(em.t("reminder_title"), msg, em.getActivityNotificationTarget(reminder.item), {
        snoozeMinutes: 60,
        snoozeLabel: em.t("action_snooze")
      });
    }

    await em.syncBadge(visiblePending.length, newTaskCount, currentOverdue.length);
  } catch (err) {
    scanError = err;
    console.error("[Eminus Pending Panel] Error de lectura", err);
    if (em.isUnauthorizedError(err)) {
      em.waitForTokenRefresh(token);
    } else {
      // Ante cualquier fallo (offline, 5xx, timeout) es mejor mostrar el
      // último snapshot que dejar al usuario sin datos.
      const errorLabel = !navigator.onLine ? em.t("offline") : (err.message || em.t("error_read"));
      const restored = await em.renderCachedSnapshotFallback();
      if (restored) {
        const visible = em.getVisiblePending(em.state.pending);
        const overdueCount = visible.filter((item) => item.urgency === "overdue").length;
        em.setStatus(errorLabel + ", " + visible.length + " " + em.t("status_pending") + " " + em.t("status_cache"));
        await em.syncBadge(visible.length, 0, overdueCount);
      } else {
        em.setStatus(errorLabel + ", " + em.t("no_cache"));
      }
    }
  } finally {
    em.state.isScanning = false;
    if (em.setScanningUi) em.setScanningUi(false);
    if (em.panelEls && em.panelEls.refreshBtn) {
      em.panelEls.refreshBtn.disabled = false;
    }
    if (scanError && em.renderPending) {
      em.renderPending(em.state.pending || []);
    }
  }
};
