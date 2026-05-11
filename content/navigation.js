/* ══════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════ */

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

em.ensureIframeLoadsDetail = function (target) {
  const detailUrlObj = new URL(location.origin + "/aplicativoEminus/actividad-detalle/" + encodeURIComponent(target.activityId));
  if (target.courseId) {
    detailUrlObj.searchParams.set("courseId", target.courseId);
  }
  const detailUrl = detailUrlObj.toString();
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
  const fallbackUrl = new URL(location.origin + "/aplicativoEminus/actividad-detalle/" + encodeURIComponent(target.activityId));
  if (target.courseId) {
    fallbackUrl.searchParams.set("courseId", target.courseId);
  }
  window.location.assign(fallbackUrl.toString());
};

em.setCourseContext = async function (courseId) {
  if (!courseId || !em.hasRuntimeApi) {
    return false;
  }
  const token = em.getToken();
  if (!token) {
    return false;
  }
  try {
    const res = await browser.runtime.sendMessage({
      type: "SET_COURSE_CONTEXT",
      courseId,
      token
    });
    return !!res?.ok;
  } catch (err) {
    return false;
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
  const activityId = em.normalizePositiveId(item.activityId);
  const courseId = em.normalizePositiveId(item.courseId);
  if (activityId) {
    em.clearPendingNavigationTarget();
    if (courseId) {
      em.savePendingNavigationTarget({ ...item, activityId, courseId });
      await em.setCourseContext(courseId);

      try {
        em.setStatus(em.t("status_nav_context"));
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
      } catch (e) {
        console.warn("Error preload actividad-principal iframe:", e);
      }
    }
    em.setStatus(em.t("status_nav_opening") + ": " + item.title);
    const detailUrl = new URL(location.origin + "/aplicativoEminus/actividad-detalle/" + encodeURIComponent(activityId));
    if (courseId) {
      detailUrl.searchParams.set("courseId", courseId);
    }
    window.location.assign(detailUrl.toString());
    return;
  }
  em.setStatus(em.t("error_nav_no_id"));
};