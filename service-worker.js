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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "UPDATE_BADGE") {
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
    const title = String(message.title || "Eminus");
    const body = String(message.body || "");
    const iconUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23e74c3c'/%3E%3Ctext x='64' y='92' font-size='80' text-anchor='middle' fill='white'%3E!%3C/text%3E%3C/svg%3E";
    chrome.notifications.create({
      type: "basic",
      iconUrl,
      title,
      message: body,
      priority: 1
    });
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "FETCH_EMINUS_JSON") {
    const token = String(message.token || "");
    const path = String(message.path || "");
    const url = `https://eminus.uv.mx/eminusapi8/api${path}`;

    (async () => {
      try {
        const result = await requestJson({ url, method: "GET", token });
        if (!result.ok) {
          sendResponse({ ok: false, error: `HTTP ${result.status} en ${path}` });
          return;
        }
        sendResponse({ ok: true, contenido: result.data?.contenido || [] });
      } catch (_) {
        sendResponse({ ok: false, error: `Error de red al consultar ${path}` });
      }
    })();

    return true;
  }

  if (message?.type === "SET_COURSE_CONTEXT") {
    const token = String(message.token || "");
    const courseId = String(message.courseId || "");

    (async () => {
      try {
        const steps = [];

        steps.push(await requestJson({
          url: "https://eminus.uv.mx/eminusapi/api/global/accesoModulo",
          method: "PUT",
          token,
          body: { idModulo: 5, idCurso: Number(courseId) }
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
