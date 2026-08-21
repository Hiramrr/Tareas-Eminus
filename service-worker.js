async function requestJson({ url, method = "GET", token = "", body = null }) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  return { ok: response.ok, status: response.status, data };
}

const EMINUS_CONTENT_URLS = [
  "https://eminus.uv.mx/eminus4/",
  "https://eminus.uv.mx/aplicativoEminus/actividad-detalle/"
];
const NOTIFICATION_TARGETS_KEY = "eminusNotificationTargets";
const AUTO_REFRESH_ALARM = "eminus-auto-refresh";
const AUTO_REFRESH_KEY = "eminusAutoRefreshMinutes";
const SNOOZE_ALARM_PREFIX = "eminus-snooze-";
const SNOOZE_TARGETS_KEY = "eminusSnoozeTargets";

function isAllowedSender(sender) {
  const rawUrl = sender?.url || sender?.tab?.url || "";
  try {
    const url = new URL(rawUrl);
    if (url.origin !== "https://eminus.uv.mx") return false;
    return EMINUS_CONTENT_URLS.some((prefix) => rawUrl.startsWith(prefix));
  } catch (_) {
    return false;
  }
}

function normalizePositiveId(value) {
  const id = String(value || "").trim();
  return /^[1-9]\d{0,18}$/.test(id) ? id : "";
}

function normalizeNotificationTarget(target) {
  if (!target || target.kind !== "activity") return null;
  const activityId = normalizePositiveId(target.activityId);
  const courseId = normalizePositiveId(target.courseId);
  if (!activityId) return null;
  return { kind: "activity", activityId, courseId };
}

function buildNotificationTargetUrl(target) {
  const normalized = normalizeNotificationTarget(target);
  if (!normalized) return "";
  const url = new URL("https://eminus.uv.mx/aplicativoEminus/actividad-detalle/" + encodeURIComponent(normalized.activityId));
  if (normalized.courseId) {
    url.searchParams.set("courseId", normalized.courseId);
  }
  return url.toString();
}

async function storeNotificationTarget(notificationId, target, options) {
  const normalized = normalizeNotificationTarget(target);
  if (!normalized) return;
  const data = await chrome.storage.local.get(NOTIFICATION_TARGETS_KEY);
  const stored = data[NOTIFICATION_TARGETS_KEY];
  const targets = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const entries = Object.entries(targets).slice(-49);
  const snoozeMinutes = Number(options?.snoozeMinutes || 0);
  await chrome.storage.local.set({
    [NOTIFICATION_TARGETS_KEY]: Object.fromEntries([...entries, [notificationId, {
      target: normalized,
      title: String(options?.title || "Eminus"),
      body: String(options?.body || ""),
      snoozeMinutes: snoozeMinutes > 0 ? snoozeMinutes : 0,
      snoozeLabel: String(options?.snoozeLabel || "Posponer")
    }]])
  });
}

async function removeNotificationTarget(notificationId) {
  const data = await chrome.storage.local.get(NOTIFICATION_TARGETS_KEY);
  const stored = data[NOTIFICATION_TARGETS_KEY];
  if (!stored || typeof stored !== "object" || Array.isArray(stored) || !stored[notificationId]) return;
  const targets = { ...stored };
  delete targets[notificationId];
  await chrome.storage.local.set({ [NOTIFICATION_TARGETS_KEY]: targets });
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    const data = await chrome.storage.local.get(NOTIFICATION_TARGETS_KEY);
    const metadata = data[NOTIFICATION_TARGETS_KEY]?.[notificationId];
    const url = buildNotificationTargetUrl(metadata?.target || metadata);
    if (url) {
      await chrome.tabs.create({ url });
    }
    await chrome.notifications.clear(notificationId);
  } catch (_) {
    // Notification clicks are best effort.
  } finally {
    await removeNotificationTarget(notificationId).catch(() => {});
  }
});

chrome.notifications.onClosed.addListener((notificationId) => {
  removeNotificationTarget(notificationId).catch(() => {});
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex !== 0) return;
  try {
    const data = await chrome.storage.local.get([NOTIFICATION_TARGETS_KEY, SNOOZE_TARGETS_KEY]);
    const metadata = data[NOTIFICATION_TARGETS_KEY]?.[notificationId];
    const minutes = Number(metadata?.snoozeMinutes || 0);
    if (!metadata?.target || minutes <= 0) return;
    const alarmName = SNOOZE_ALARM_PREFIX + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const snoozed = data[SNOOZE_TARGETS_KEY] && typeof data[SNOOZE_TARGETS_KEY] === "object"
      ? data[SNOOZE_TARGETS_KEY]
      : {};
    await chrome.storage.local.set({ [SNOOZE_TARGETS_KEY]: { ...snoozed, [alarmName]: metadata } });
    chrome.alarms.create(alarmName, { delayInMinutes: minutes });
    await chrome.notifications.clear(notificationId);
  } catch (_) {
    // Snoozing notifications is best effort.
  } finally {
    await removeNotificationTarget(notificationId).catch(() => {});
  }
});

async function configureAutoRefreshAlarm(minutes) {
  await chrome.alarms.clear(AUTO_REFRESH_ALARM);
  const value = Number(minutes || 0);
  if (value > 0) {
    chrome.alarms.create(AUTO_REFRESH_ALARM, { periodInMinutes: Math.max(1, value) });
  }
}

async function restoreAutoRefreshAlarm() {
  const data = await chrome.storage.local.get(AUTO_REFRESH_KEY);
  await configureAutoRefreshAlarm(data[AUTO_REFRESH_KEY]);
}

async function refreshOneEminusTab() {
  const tabs = await chrome.tabs.query({ url: ["https://eminus.uv.mx/eminus4/*"] });
  const tab = tabs.find((entry) => entry.id);
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "BACKGROUND_REFRESH_PANEL", auto: true }).catch(() => {});
  }
}

chrome.runtime.onInstalled.addListener(() => {
  restoreAutoRefreshAlarm().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  restoreAutoRefreshAlarm().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_REFRESH_ALARM) {
    refreshOneEminusTab().catch(() => {});
    return;
  }
  if (alarm.name.startsWith(SNOOZE_ALARM_PREFIX)) {
    (async () => {
      const data = await chrome.storage.local.get(SNOOZE_TARGETS_KEY);
      const snoozed = data[SNOOZE_TARGETS_KEY] || {};
      const metadata = snoozed[alarm.name];
      if (!metadata) return;
      const next = { ...snoozed };
      delete next[alarm.name];
      await chrome.storage.local.set({ [SNOOZE_TARGETS_KEY]: next });
      const notificationId = "eminus-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      await storeNotificationTarget(notificationId, metadata.target, metadata);
      await chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23e74c3c'/%3E%3Ctext x='64' y='92' font-size='80' text-anchor='middle' fill='white'%3E!%3C/text%3E%3C/svg%3E",
        title: metadata.title,
        message: metadata.body,
        priority: 1,
        buttons: [{ title: metadata.snoozeLabel || "Posponer" }]
      });
    })().catch(() => {});
  }
});

function buildEminusApi8Url(path) {
  const normalizedPath = String(path || "").trim();
  if (normalizedPath === "/Course/getAllCourses") {
    return "https://eminus.uv.mx/eminusapi8/api/Course/getAllCourses";
  }

  const activityMatch = normalizedPath.match(/^\/Activity\/getActividadesEstudiante\/([1-9]\d{0,18})$/);
  if (activityMatch) {
    return "https://eminus.uv.mx/eminusapi8/api/Activity/getActividadesEstudiante/" + encodeURIComponent(activityMatch[1]);
  }

  return "";
}

function buildEminusApiUrl(path) {
  const normalizedPath = String(path || "").trim();

  const unitMatch = normalizedPath.match(/^\/Contenido\/getUnidades\/([1-9]\d{0,18})\/0$/);
  if (unitMatch) {
    return "https://eminus.uv.mx/eminusapi/api/Contenido/getUnidades/" + encodeURIComponent(unitMatch[1]) + "/0";
  }

  const elementsMatch = normalizedPath.match(/^\/Contenido\/getElementos\/([1-9]\d{0,18})\/(\d{1,18})$/);
  if (elementsMatch) {
    return "https://eminus.uv.mx/eminusapi/api/Contenido/getElementos/" + encodeURIComponent(elementsMatch[1]) + "/" + encodeURIComponent(elementsMatch[2]);
  }

  const elementMatch = normalizedPath.match(/^\/Contenido\/getElemento\/([1-9]\d{0,18})\/([1-9]\d{0,18})$/);
  if (elementMatch) {
    return "https://eminus.uv.mx/eminusapi/api/Contenido/getElemento/" + encodeURIComponent(elementMatch[1]) + "/" + encodeURIComponent(elementMatch[2]);
  }

  const fileLocationMatch = normalizedPath.match(/^\/Contenido\/UbicacionArchivos\/([1-9]\d{0,18})$/);
  if (fileLocationMatch) {
    return "https://eminus.uv.mx/eminusapi/api/Contenido/UbicacionArchivos/" + encodeURIComponent(fileLocationMatch[1]);
  }

  return "";
}

function buildAllowedEminusUrl(path) {
  return buildEminusApi8Url(path) || buildEminusApiUrl(path);
}

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_AND_REFRESH_PANEL" }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CONFIGURE_AUTO_REFRESH") {
    if (!isAllowedSender(sender)) {
      sendResponse({ ok: false, error: "Origen no autorizado" });
      return;
    }
    configureAutoRefreshAlarm(message.minutes)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false, error: "No se pudo configurar auto-refresh" }));
    return true;
  }

  if (message?.type === "UPDATE_BADGE") {
    if (!isAllowedSender(sender)) {
      sendResponse({ ok: false, error: "Origen no autorizado" });
      return;
    }

    const newCount = Number(message.newCount || 0);
    const overdueCount = Number(message.overdueCount || 0);
    const totalCount = Number(message.count || 0);

    const hasAlerts = newCount > 0 || overdueCount > 0;
    const badgeCount = hasAlerts ? Math.max(newCount, overdueCount) : totalCount;

    if (hasAlerts) {
      chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
    } else if (totalCount > 0) {
      chrome.action.setBadgeBackgroundColor({ color: "#1b7f2a" });
    } else {
      chrome.action.setBadgeBackgroundColor({ color: "#95a5a6" });
    }

    chrome.action.setBadgeText({ text: badgeCount > 0 ? String(Math.min(badgeCount, 99)) : "" });
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "SHOW_NOTIFICATION") {
    if (!isAllowedSender(sender)) {
      sendResponse({ ok: false, error: "Origen no autorizado" });
      return;
    }

    const title = String(message.title || "Eminus");
    const body = String(message.body || "");
    const target = normalizeNotificationTarget(message.target);
    const notificationId = "eminus-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const iconUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23e74c3c'/%3E%3Ctext x='64' y='92' font-size='80' text-anchor='middle' fill='white'%3E!%3C/text%3E%3C/svg%3E";
    (async () => {
      try {
        if (target) {
          await storeNotificationTarget(notificationId, target, {
            title,
            body,
            snoozeMinutes: message.snoozeMinutes,
            snoozeLabel: message.snoozeLabel
          });
        }
        const notificationOptions = {
          type: "basic",
          iconUrl,
          title,
          message: body,
          priority: 1
        };
        if (target && Number(message.snoozeMinutes || 0) > 0) {
          notificationOptions.buttons = [{ title: String(message.snoozeLabel || "Posponer") }];
        }
        await chrome.notifications.create(notificationId, notificationOptions);
        sendResponse({ ok: true, actionable: !!target });
      } catch (_) {
        sendResponse({ ok: false, error: "No se pudo mostrar la notificación" });
      }
    })();
    return true;
  }

  if (message?.type === "FETCH_EMINUS_JSON") {
    if (!isAllowedSender(sender)) {
      sendResponse({ ok: false, error: "Origen no autorizado" });
      return;
    }

    const token = String(message.token || "");
    const path = String(message.path || "");
    const url = buildAllowedEminusUrl(path);

    if (!url) {
      sendResponse({ ok: false, error: "Endpoint no permitido" });
      return;
    }

    (async () => {
      try {
        const result = await requestJson({ url, method: "GET", token });
        if (!result.ok) {
          sendResponse({ ok: false, status: result.status, path, error: `HTTP ${result.status} en ${path}` });
          return;
        }
        const contenido = Array.isArray(result.data?.contenido)
          ? result.data.contenido
          : result.data?.contenido && typeof result.data.contenido === "object"
            ? [result.data.contenido]
            : Array.isArray(result.data)
              ? result.data
              : result.data && typeof result.data === "object"
                ? [result.data]
                : [];
        sendResponse({ ok: true, contenido });
      } catch (_) {
        sendResponse({ ok: false, error: `Error de red al consultar ${path}` });
      }
    })();

    return true;
  }

  if (message?.type === "SET_COURSE_CONTEXT") {
    if (!isAllowedSender(sender)) {
      sendResponse({ ok: false, error: "Origen no autorizado" });
      return;
    }

    const token = String(message.token || "");
    const courseId = normalizePositiveId(message.courseId);
    const moduleId = Number(message.moduleId || 5);
    const safeModuleId = Number.isInteger(moduleId) && moduleId > 0 && moduleId < 100 ? moduleId : 5;

    if (!courseId) {
      sendResponse({ ok: false, error: "Curso no válido" });
      return;
    }

    (async () => {
      try {
        const steps = [];

        steps.push(await requestJson({
          url: "https://eminus.uv.mx/eminusapi/api/global/accesoModulo",
          method: "PUT",
          token,
          body: { idModulo: safeModuleId, idCurso: Number(courseId) }
        }));

        steps.push(await requestJson({
          url: "https://eminus.uv.mx/eminusapi/api/Bitacora/BTCursos",
          method: "POST",
          token,
          body: { idCurso: Number(courseId), idModulo: 0 }
        }));

        steps.push(await requestJson({
          url: `https://eminus.uv.mx/eminusapi/api/Cursos/obtieneCurso/${encodeURIComponent(courseId)}`,
          method: "GET",
          token
        }));

        steps.push(await requestJson({
          url: `https://eminus.uv.mx/eminusapi/api/Global/getModulosResumen/${encodeURIComponent(courseId)}/0/0`,
          method: "GET",
          token
        }));

        const ok = steps.every((s) => s.ok);
        sendResponse({
          ok,
          steps: steps.map((s, idx) => ({ index: idx, ok: s.ok, status: s.status }))
        });
      } catch (err) {
        sendResponse({ ok: false, error: "Error de red al establecer contexto de curso" });
      }
    })();

    return true;
  }
});

restoreAutoRefreshAlarm().catch(() => {});
