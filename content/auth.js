window.eminus = window.eminus || {};

var em = window.eminus;

em.TOKEN_WATCH_INTERVAL_MS = 500;
em.tokenWatchTimer = null;
em.tokenStorageListener = null;
em.pendingTokenCallback = null;
em.tokenWatchOptions = null;

em.getToken = function () {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";
};

em.stopTokenWatcher = function () {
  if (em.tokenWatchTimer) {
    window.clearInterval(em.tokenWatchTimer);
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

  em.tokenWatchTimer = window.setInterval(notifyIfReady, em.TOKEN_WATCH_INTERVAL_MS);
  em.tokenStorageListener = (event) => {
    if (!event || event.key === "accessToken") notifyIfReady();
  };
  window.addEventListener("storage", em.tokenStorageListener);
};

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
    return parsed.nameid || parsed.unique_name || parsed.sub || parsed.email || parsed.idPersona || parsed.matricula || base64Url;
  } catch (err) {
    return token.split(".")[1] || token;
  }
};
