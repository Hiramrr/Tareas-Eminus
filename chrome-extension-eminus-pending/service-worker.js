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
    const count = Number(message.count || 0);
    chrome.action.setBadgeBackgroundColor({ color: "#1b7f2a" });
    chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : "" });
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
