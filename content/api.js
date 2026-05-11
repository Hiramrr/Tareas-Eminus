/* ══════════════════════════════════════════
   API & DATA FETCHING
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

em.fetchJson = async function (path, token) {
  if (em.hasRuntimeApi) {
    try {
      const bgResponse = await browser.runtime.sendMessage({
        type: "FETCH_EMINUS_JSON",
        path,
        token
      });
      if (!bgResponse?.ok) {
        throw new Error(bgResponse?.error || em.t("error_network") + " " + path);
      }
      return Array.isArray(bgResponse.contenido) ? bgResponse.contenido : [];
    } catch (err) {
      throw new Error(err.message || em.t("error_network") + " " + path + ". " + em.t("error_reload"));
    }
  }

  throw new Error(em.t("error_no_channel"));
};

em.filterActiveCourses = function (courses) {
  const nowSec = Date.now() / 1000;
  const active = courses.filter((entry) => {
    const c = entry?.curso || {};
    const start = c.fechaInicioEpoch;
    const end = c.fechaTerminoEpoch;
    if (typeof start !== "number" || typeof end !== "number" || start <= 0 || end <= 0) {
      return true;
    }
    return nowSec >= (start - 15 * 86400) && nowSec <= (end + 30 * 86400);
  });

  return active.length ? active : courses;
};

em.buildPendingData = async function (token, pinnedSet) {
  pinnedSet = pinnedSet || new Set();
  const coursesRaw = await em.fetchJson("/Course/getAllCourses", token);
  const courses = em.filterActiveCourses(coursesRaw);
  const pending = [];

  for (const cEntry of courses) {
    const course = cEntry?.curso || {};
    const courseId = em.normalizePositiveId(course.idCurso ?? cEntry?.idCurso ?? course.courseId ?? cEntry?.courseId);
    const courseName = String(course.nombre || "").trim();
    if (!courseId || !courseName) continue;

    let activities = [];
    try {
      activities = await em.fetchJson("/Activity/getActividadesEstudiante/" + courseId, token);
    } catch (err) {
      console.warn("[Eminus Pending] " + em.t("error_load_activities") + " " + courseId + " (" + courseName + "):", err);
      continue;
    }

    for (const act of activities) {
      if (!em.isActivityPending(act)) continue;

      const deadlineStr = em.getActivityDeadlineStr(act);
      const deadlineDate = em.parseEminusDate(deadlineStr);
      const remaining = em.getTimeRemaining(deadlineDate);
      const urgency = em.classifyUrgency(deadlineDate);

      const id = courseId + ":" + (act.idActividad || act.titulo || Math.random());

      pending.push({
        id,
        courseId,
        activityId: String(act.idActividad || ""),
        course: courseName,
        title: String(act.titulo || em.t("no_title")),
        deadlineRaw: deadlineDate ? deadlineDate.toISOString() : "",
        deadlineStr,
        deadlineLabel: remaining ? deadlineStr + " (" + remaining + ")" : deadlineStr,
        urgency,
        archived: false,
        pinned: pinnedSet.has(id),
        estatus: String(act.estatus || "").trim(),
        entregada: em.asBool(act.entregada),
        completada: em.asBool(act.completada),
        fechaEntrega: String(act.fechaEntrega || "").trim()
      });
    }
  }

  pending.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (!a.deadlineRaw && !b.deadlineRaw) return 0;
    if (!a.deadlineRaw) return 1;
    if (!b.deadlineRaw) return -1;
    return new Date(a.deadlineRaw).getTime() - new Date(b.deadlineRaw).getTime();
  });

  return pending;
};