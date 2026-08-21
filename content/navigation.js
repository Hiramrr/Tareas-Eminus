window.eminus = window.eminus || {};

var em = window.eminus;

em.savePendingNavigationTarget = function (item) {
  sessionStorage.setItem(em.NAV_KEYS.ACTIVITY_ID, String(item.activityId || ""));
  sessionStorage.setItem(em.NAV_KEYS.COURSE_ID, String(item.courseId || ""));
  sessionStorage.setItem(em.NAV_KEYS.TITLE, String(item.title || ""));
  sessionStorage.setItem(em.NAV_KEYS.TS, String(Date.now()));
  sessionStorage.setItem(em.NAV_KEYS.STEP, "activity_detail");
};

em.readPendingNavigationTarget = function () {
  const activityId = sessionStorage.getItem(em.NAV_KEYS.ACTIVITY_ID) || "";
  const courseId = sessionStorage.getItem(em.NAV_KEYS.COURSE_ID) || "";
  const title = sessionStorage.getItem(em.NAV_KEYS.TITLE) || "";
  const step = sessionStorage.getItem(em.NAV_KEYS.STEP) || "content_bootstrap";
  const ts = Number(sessionStorage.getItem(em.NAV_KEYS.TS) || 0);
  if (!activityId) return null;
  if (!ts || Date.now() - ts > 5 * 60 * 1000) {
    em.clearPendingNavigationTarget();
    return null;
  }
  return { activityId, courseId, title, step };
};

em.clearPendingNavigationTarget = function () {
  sessionStorage.removeItem(em.NAV_KEYS.ACTIVITY_ID);
  sessionStorage.removeItem(em.NAV_KEYS.COURSE_ID);
  sessionStorage.removeItem(em.NAV_KEYS.TITLE);
  sessionStorage.removeItem(em.NAV_KEYS.TS);
  sessionStorage.removeItem(em.NAV_KEYS.STEP);
};

em.getActivityIframeElement = function () {
  const candidates = [
    "m-activity-resource-list-student iframe.app-b-frame",
    "iframe.app-b-frame",
    "iframe#iframeActividades"
  ];
  for (const selector of candidates) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLIFrameElement) {
      return el;
    }
  }
  return null;
};

em.buildActivityDetailUrl = function (activityId, courseId) {
  const detailUrl = new URL(location.origin + "/aplicativoEminus/actividad-detalle/" + encodeURIComponent(activityId));
  if (courseId) {
    detailUrl.searchParams.set("courseId", courseId);
  }
  detailUrl.searchParams.set("_cb", Date.now());
  return detailUrl.toString();
};

em.clearEminusAppCache = async function () {
  try {
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => /eminus|aplicativo/i.test(key))
        .map((key) => caches.delete(key)));
    }
  } catch (_) {
  }

  try {
    if (navigator.serviceWorker?.getRegistrations) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations
        .filter((registration) => /eminus|aplicativo/i.test(registration.scope || ""))
        .map((registration) => registration.unregister()));
    }
  } catch (_) {
  }
};

em.ensureIframeLoadsDetail = function (target) {
  const detailUrl = em.buildActivityDetailUrl(target.activityId, target.courseId);
  const principalUrl = location.origin + "/aplicativoEminus/actividad-principal/?courseId=" + encodeURIComponent(target.courseId || "") + "&_timestamp=" + Date.now();
  const maxMs = 15000;
  const startedAt = Date.now();
  let principalLocked = false;

  if (em.detailForceTimer) {
    window.clearInterval(em.detailForceTimer);
    em.detailForceTimer = null;
  }

  const applyDetailUrl = () => {
    if (!location.pathname.includes("/eminus4/page/course/activity")) {
      return false;
    }

    const currentTarget = em.readPendingNavigationTarget();
    if (!currentTarget || currentTarget.activityId !== target.activityId) {
      return true;
    }

    const iframe = em.getActivityIframeElement();
    if (!(iframe instanceof HTMLIFrameElement)) {
      return false;
    }

    const current = String(iframe.getAttribute("src") || iframe.src || "");
    if (current.includes("/actividad-detalle/" + target.activityId)) {
      em.clearPendingNavigationTarget();
      em.setStatus(em.t("status_nav_iframe"));
      return true;
    }

    if (!principalLocked && target.courseId && !current.includes("actividad-principal")) {
      iframe.setAttribute("src", principalUrl);
      return false;
    }
    if (!principalLocked && target.courseId && current.includes("actividad-principal") && current.includes("courseId=" + target.courseId)) {
      principalLocked = true;
    }

    iframe.setAttribute("src", detailUrl);
    return false;
  };

  if (applyDetailUrl()) return;

  em.detailForceTimer = window.setInterval(() => {
    const done = applyDetailUrl();
    const expired = Date.now() - startedAt > maxMs;
    if (done || expired) {
      if (em.detailForceTimer) {
        window.clearInterval(em.detailForceTimer);
        em.detailForceTimer = null;
      }
      if (expired && !done) {
        em.setStatus(em.t("status_nav_error"));
        em.showToast(em.t("status_nav_error"), "error");
      }
    }
  }, 300);
};

em.loadDetailIntoActivityIframeIfNeeded = async function () {
  const target = em.readPendingNavigationTarget();
  if (!target) return;
  if (target.step !== "activity_detail") return;
  if (!location.pathname.includes("/eminus4/page/course/activity")) return;

  em.setStatus(em.t("status_nav_loading") + ": " + (target.title || target.activityId));

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i += 1) {
    const iframe = em.getActivityIframeElement();
    if (iframe instanceof HTMLIFrameElement) {
      em.ensureIframeLoadsDetail(target);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  em.clearPendingNavigationTarget();
  em.setStatus(em.t("status_nav_no_iframe"));
  em.showToast(em.t("status_nav_no_iframe"), "error");
  window.location.assign(em.buildActivityDetailUrl(target.activityId, target.courseId));
};

em.setCourseContext = async function (courseId, moduleId) {
  if (!courseId || !em.hasRuntimeApi) {
    return false;
  }
  const token = em.getToken();
  if (!token) {
    return false;
  }
  try {
    const res = await chrome.runtime.sendMessage({
      type: "SET_COURSE_CONTEXT",
      courseId,
      moduleId: moduleId || 5,
      token
    });
    return !!res?.ok;
  } catch (err) {
    return false;
  }
};

em.mergeLayoutNavigation = function (courseId, unitId) {
  try {
    const raw = localStorage.getItem("layoutConfigNavegation");
    const parsed = raw ? JSON.parse(raw) : {};
    const next = {
      ...parsed,
      config: {
        ...(parsed.config || {}),
        navegation: {
          ...((parsed.config && parsed.config.navegation) || {}),
          course: {
            ...(((parsed.config && parsed.config.navegation) || {}).course || {}),
            id: Number(courseId) || courseId,
            unit: Number(unitId) || unitId || 0
          }
        }
      }
    };
    localStorage.setItem("layoutConfigNavegation", JSON.stringify(next));
  } catch (_) {
  }
};

em.navigateToContent = async function (item) {
  if (!item) return;
  const courseId = em.normalizePositiveId(item.courseId);
  const unitId = em.normalizeNonNegativeId(item.unitId);
  if (!courseId) {
    em.setStatus(em.t("error_nav_no_id"));
    em.showToast(em.t("error_nav_no_id"), "error");
    return;
  }

  em.mergeLayoutNavigation(courseId, unitId);
  await em.setCourseContext(courseId, 1);
  em.setStatus("Abriendo contenido: " + item.title);
  window.location.assign(location.origin + "/eminus4/page/course/content/view/unit");
};

em.downloadContentAttachment = async function (item, attachment) {
  if (!item || !attachment) return;
  const courseId = em.normalizePositiveId(item.courseId);
  const elementId = em.normalizePositiveId(attachment.elementId || item.elementId);
  const fileId = em.normalizePositiveId(attachment.id);
  const token = em.getToken();
  if (!courseId || !elementId || !fileId || !token) {
    em.setStatus("No se pudo preparar la descarga.");
    em.showToast("No se pudo preparar la descarga.", "error");
    return;
  }

  const url = "https://eminus.uv.mx/eminusapi/api/contenido/descargaElementoArchivo/" +
    encodeURIComponent(courseId) + "/" +
    encodeURIComponent(elementId) + "/" +
    encodeURIComponent(fileId);

  try {
    em.setStatus("Descargando: " + attachment.name);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token
      }
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = attachment.name || "archivo";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    em.setStatus("Descarga iniciada: " + attachment.name);
  } catch (err) {
    console.error("[Eminus Pending] Error al descargar archivo de contenido", err);
    em.setStatus("No se pudo descargar el archivo.");
    em.showToast("No se pudo descargar el archivo.", "error");
  }
};

em.startRouteObserver = function () {
  if (em.routeObserverStarted) return;
  em.routeObserverStarted = true;

  let lastHref = location.href;
  window.setInterval(() => {
    const currentHref = location.href;
    const hasTarget = !!em.readPendingNavigationTarget();
    const routeChanged = currentHref !== lastHref;
    if (routeChanged || hasTarget) {
      lastHref = currentHref;
      em.loadDetailIntoActivityIframeIfNeeded();
    }
  }, 350);
};

em.navigateToActivity = async function (item) {
  if (!item) return;
  if (item.kind === "content") {
    await em.navigateToContent(item);
    return;
  }
  const activityId = em.normalizePositiveId(item.activityId);
  const courseId = em.normalizePositiveId(item.courseId);
  if (activityId) {
    em.clearPendingNavigationTarget();
    if (courseId) {
      em.savePendingNavigationTarget({ ...item, activityId, courseId });
      await em.setCourseContext(courseId);

      try {
        em.setStatus(em.t("status_nav_context"));
        await em.clearEminusAppCache();
        await new Promise((resolve) => {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = location.origin + "/aplicativoEminus/actividad-principal/?courseId=" + encodeURIComponent(courseId) + "&_timestamp=" + Date.now();

          const cleanup = () => {
            if (iframe.parentElement) {
              iframe.parentElement.removeChild(iframe);
            }
            resolve();
          };

          iframe.onload = () => {
            setTimeout(cleanup, 500);
          };
          iframe.onerror = cleanup;

          document.body.appendChild(iframe);

          setTimeout(cleanup, 5000);
        });
      } catch (_) {
        console.warn("Error preload actividad-principal iframe");
      }
    }
    em.setStatus(em.t("status_nav_opening") + ": " + item.title);
    window.location.assign(em.buildActivityDetailUrl(activityId, courseId));
    return;
  }
  em.setStatus(em.t("error_nav_no_id"));
  em.showToast(em.t("error_nav_no_id"), "error");
};
