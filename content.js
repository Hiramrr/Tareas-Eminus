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

  if (em.hasRuntimeApi && browser.runtime?.onMessage) {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "OPEN_AND_REFRESH_PANEL") {
        if (em.state.isCollapsed) em.toggleCollapse();
        em.scanPending();
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
  em.hydrateFromStorage().then(() => {
    em.loadDetailIntoActivityIframeIfNeeded();
    em.scanPending();
  });

  document.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "e" || e.code === "KeyE")) {
      e.preventDefault();
      em.toggleCollapse();
    }
  });

  window.addEventListener("online", () => {
    if (em.panelEls?.footer) {
      const offlineLabel = em.t("offline");
      const regex = new RegExp(`^${offlineLabel}\\s*(—\\s*)?`);
      const txt = em.panelEls.footer.textContent.replace(regex, "");
      em.panelEls.footer.textContent = txt || em.t("online");
    }
    em.scanPending();
  });

  window.addEventListener("offline", () => {
    em.setStatus(em.t("offline"));
  });
})();
