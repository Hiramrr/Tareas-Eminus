window.eminus = window.eminus || {};

var em = window.eminus;

// Si inicias sesión en la misma pestaña no llega el evento "storage", así que
// el sondeo es lo único que detecta el token nuevo y no se detiene. Tras unos
// minutos sin sesión se espacia: nadie espera medio segundo de respuesta ahí.
em.TOKEN_WATCH_INTERVAL_MS = 500;
em.TOKEN_WATCH_SLOW_INTERVAL_MS = 5000;
em.TOKEN_WATCH_FAST_WINDOW_MS = 2 * 60 * 1000;
em.tokenWatchTimer = null;
em.tokenStorageListener = null;
em.pendingTokenCallback = null;
em.tokenWatchOptions = null;

em.getToken = function () {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";
};

em.stopTokenWatcher = function () {
  if (em.tokenWatchTimer) {
    window.clearTimeout(em.tokenWatchTimer);
    em.tokenWatchTimer = null;
  }
  if (em.tokenStorageListener) {
    window.removeEventListener("storage", em.tokenStorageListener);
    em.tokenStorageListener = null;
  }
  em.pendingTokenCallback = null;
  em.tokenWatchOptions = null;
};

em.startTokenWatcher = function (onToken, options) {
  const previousToken = String(options?.previousToken || "");
  em.pendingTokenCallback = typeof onToken === "function" ? onToken : null;
  em.tokenWatchOptions = {
    previousToken,
    requireChange: options?.requireChange === true && !!previousToken
  };

  const notifyIfReady = () => {
    const token = em.getToken();
    if (!token) return false;
    const watchOptions = em.tokenWatchOptions || {};
    if (watchOptions.requireChange && token === watchOptions.previousToken) return false;

    const callback = em.pendingTokenCallback;
    em.stopTokenWatcher();
    if (callback) callback(token);
    return true;
  };

  if (notifyIfReady() || em.tokenWatchTimer) return;

  const startedAt = Date.now();
  const scheduleNext = () => {
    const fast = Date.now() - startedAt < em.TOKEN_WATCH_FAST_WINDOW_MS;
    em.tokenWatchTimer = window.setTimeout(() => {
      if (!notifyIfReady()) scheduleNext();
    }, fast ? em.TOKEN_WATCH_INTERVAL_MS : em.TOKEN_WATCH_SLOW_INTERVAL_MS);
  };
  scheduleNext();
  em.tokenStorageListener = (event) => {
    if (!event || event.key === "accessToken") notifyIfReady();
  };
  window.addEventListener("storage", em.tokenStorageListener);
};

// Identificador estable de la cuenta, o null si el token no trae ninguno.
// No hay que caer al payload del JWT: cambia con cada token nuevo, y quien
// compara cuentas (hydrateFromStorage, scanPending) lo tomaría por otra cuenta
// y borraría archivados, fijados y log. null significa "no comparar".
em.getAccountIdFromToken = function (token) {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + "=".repeat(4 - pad) : base64;
    const jsonPayload = decodeURIComponent(
      atob(paddedBase64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    const id = parsed.nameid || parsed.unique_name || parsed.sub || parsed.email || parsed.idPersona || parsed.matricula;
    return id ? String(id) : null;
  } catch (_) {
    return null;
  }
};
