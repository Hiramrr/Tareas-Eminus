/* ══════════════════════════════════════════
   Miyu --pendientes v1.0.0
   Panel principal — inyectado en eminus.uv.mx/eminus4/*

   La lógica se ha distribuido en módulos
   con responsabilidades únicas dentro de content/
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

(function () {
  if (window.__eminusPendingPanelInjected) return;
  window.__eminusPendingPanelInjected = true;

  const em = window.eminus;
  const popupTargetViewKey = "eminusPopupTargetView";
  const allowedPanelViews = new Set(["summary", "pending", "today", "overdue", "agenda", "content"]);

  const openPanelView = function (view, shouldRefresh) {
    const selectedView = allowedPanelViews.has(view) ? view : "summary";
    if (em.state.isArchiveView && em.setArchiveView) em.setArchiveView(false);
    if (em.state.isCollapsed) em.toggleCollapse();
    if (em.setTab) em.setTab(selectedView);
    if (shouldRefresh) em.scanPendingWhenTokenReady();
  };

  const consumePopupTargetView = async function () {
    const data = await em.storageGet([popupTargetViewKey]);
    const target = data[popupTargetViewKey];
    if (!target) return;
    await em.storageSet({ [popupTargetViewKey]: null });
    const requestedAt = Number(target.requestedAt || 0);
    const isRecent = requestedAt > 0 && Date.now() - requestedAt < 2 * 60 * 1000;
    if (!isRecent || !allowedPanelViews.has(target.view)) return;
    openPanelView(target.view, false);
  };

  if (em.hasRuntimeApi && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "OPEN_AND_REFRESH_PANEL") {
        if (em.state.isCollapsed) em.toggleCollapse();
        em.scanPendingWhenTokenReady();
        sendResponse({ ok: true });
      } else if (message?.type === "OPEN_PANEL_VIEW") {
        openPanelView(message.view, message.refresh === true);
        sendResponse({ ok: true });
      } else if (message?.type === "BACKGROUND_REFRESH_PANEL") {
        em.scanPendingWhenTokenReady();
        sendResponse({ ok: true });
      } else if (message?.type === "SYNC_READ_CONTENT_IDS") {
        em.state.readContentIds = em.normalizeReadContentIds(message.ids);
        em.renderPending(em.state.pending);
        sendResponse({ ok: true });
      }
    });
  }

  em.createPanel();
  em.restorePanelPosition();
  window.addEventListener("resize", () => {
    if (!em.panelEls?.root) return;
    const left = parseFloat(em.panelEls.root.style.left);
    const top = parseFloat(em.panelEls.root.style.top);
    if (Number.isFinite(left) && Number.isFinite(top)) em.applyPanelPosition({ left, top });
  });
  em.startRouteObserver();
  em.hydrateFromStorage().then(async () => {
    await consumePopupTargetView();
    em.loadDetailIntoActivityIframeIfNeeded();
    em.scanPendingWhenTokenReady();
  });

  document.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "e" || e.code === "KeyE")) {
      e.preventDefault();
      em.toggleCollapse();
      return;
    }

    const target = e.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (isTyping || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "/") {
      e.preventDefault();
      if (em.state.isCollapsed) em.toggleCollapse();
      em.panelEls?.filterQuery?.focus();
    } else if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      em.scanPendingWhenTokenReady();
    } else if (e.key.toLowerCase() === "t") {
      e.preventDefault();
      if (em.state.isCollapsed) em.toggleCollapse();
      em.setTab("today");
    }
  });

  window.addEventListener("online", () => {
    if (em.panelEls?.footer) {
      const offlineLabel = em.t("offline");
      const regex = new RegExp(`^${offlineLabel}\\s*(—\\s*)?`);
      const txt = em.panelEls.footer.textContent.replace(regex, "");
      em.panelEls.footer.textContent = txt || em.t("online");
    }
    em.scanPendingWhenTokenReady();
  });

  window.addEventListener("offline", () => {
    em.setStatus(em.t("offline"));
  });
})();
