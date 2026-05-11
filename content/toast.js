/* ══════════════════════════════════════════
   TOAST & NOTIFICATIONS
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

em.showToast = function (message, type) {
  type = type || "info";
  if (!em.panelEls || !em.panelEls.root) return;
  let toast = em.panelEls.root.querySelector(".ep-toast");
  if (toast) {
    toast.remove();
  }

  toast = document.createElement("div");
  toast.className = "ep-toast ep-toast-" + type;
  toast.textContent = message;

  em.panelEls.root.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("ep-toast-visible");
  });

  setTimeout(() => {
    toast.classList.remove("ep-toast-visible");
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }, 4000);
};

em.notifyUser = async function (title, body) {
  if (!em.hasRuntimeApi) return;
  try {
    await browser.runtime.sendMessage({
      type: "SHOW_NOTIFICATION",
      title,
      body
    });
  } catch (err) {
    console.debug("No se pudo enviar notificación", err);
  }
};

em.syncBadge = async function (count, newCount, overdueCount) {
  if (!em.hasRuntimeApi) return;
  newCount = Number(newCount || 0);
  overdueCount = Number(overdueCount || 0);
  count = Number(count || 0);
  try {
    await browser.runtime.sendMessage({ type: "UPDATE_BADGE", count, newCount, overdueCount });
  } catch (err) {
    console.debug("No se pudo actualizar badge", err);
  }
};
