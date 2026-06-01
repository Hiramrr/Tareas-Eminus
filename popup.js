const SNAPSHOT_KEY = "eminusLastSnapshot";
const READ_CONTENT_IDS_KEY = "eminusReadContentIds";
const THEME_KEY = "eminusPanelTheme";
const CUSTOM_THEME_KEY = "eminusCustomTheme";
const POPUP_TARGET_VIEW_KEY = "eminusPopupTargetView";
const EMINUS_URL = "https://eminus.uv.mx/eminus4/page/course/list";
const PANEL_VIEWS = new Set(["summary", "pending", "today", "overdue", "agenda", "content"]);
const THEME_PRESETS = {
  light: { bg: "#ffffff", text: "#000000", border: "#000000", accent: "#000000", overdue: "#c0392b", imminent: "#f1c40f", urgent: "#e67e22" },
  jazmin: { bg: "#fffdf5", text: "#3d3a28", border: "#ddd8c0", accent: "#6a8a50", overdue: "#c06850", imminent: "#b8a030", urgent: "#6a8a50" },
  dark: { bg: "#121212", text: "#e0e0e0", border: "#444444", accent: "#e0e0e0", overdue: "#ff6b6b", imminent: "#f6e58d", urgent: "#a3e635" },
  hacker: { bg: "#000000", text: "#00ff00", border: "#00ff00", accent: "#00ff00", overdue: "#ff0000", imminent: "#ffff00", urgent: "#ccff00" },
  ocean: { bg: "#0f172a", text: "#38bdf8", border: "#1e293b", accent: "#38bdf8", overdue: "#f43f5e", imminent: "#eab308", urgent: "#a3e635" },
  dracula: { bg: "#282a36", text: "#f8f8f2", border: "#44475a", accent: "#f8f8f2", overdue: "#ff5555", imminent: "#f1fa8c", urgent: "#50fa7b" },
  nord: { bg: "#2e3440", text: "#d8dee9", border: "#4c566a", accent: "#d8dee9", overdue: "#bf616a", imminent: "#ebcb8b", urgent: "#a3be8c" },
  solarized: { bg: "#002b36", text: "#839496", border: "#073642", accent: "#839496", overdue: "#dc322f", imminent: "#b58900", urgent: "#859900" },
  solarizedlight: { bg: "#fdf6e3", text: "#586e75", border: "#eee8d5", accent: "#586e75", overdue: "#dc322f", imminent: "#b58900", urgent: "#859900" },
  gruvbox: { bg: "#282828", text: "#ebdbb2", border: "#504945", accent: "#ebdbb2", overdue: "#cc241d", imminent: "#d79921", urgent: "#98971a" },
  sakura: { bg: "#1a1225", text: "#f0d0e0", border: "#3d2a4a", accent: "#f8a4c8", overdue: "#e84a6f", imminent: "#f0c060", urgent: "#88c890" },
  lavender: { bg: "#f5f0fa", text: "#2d2049", border: "#c9b8e8", accent: "#7c5cbf", overdue: "#c0392b", imminent: "#d4a017", urgent: "#4a8c4a" },
  rosa: { bg: "#fff5f7", text: "#4a1028", border: "#f0c0cf", accent: "#e85080", overdue: "#c0392b", imminent: "#d4a017", urgent: "#4a8c4a" },
  sandia: { bg: "#1a3a1a", text: "#f0c8c8", border: "#2d5a2d", accent: "#c0392b", overdue: "#e74c3c", imminent: "#f0c040", urgent: "#50d050" },
  matcha: { bg: "#f4f1e8", text: "#2c3e2c", border: "#b8c9a8", accent: "#5a7a4a", overdue: "#b04040", imminent: "#b89030", urgent: "#5a8a3a" },
  moka: { bg: "#3e2723", text: "#f8c0d0", border: "#6d4c41", accent: "#f48fb1", overdue: "#ef5350", imminent: "#fdd835", urgent: "#66bb6a" },
  candy: { bg: "#fdf0f8", text: "#3a2050", border: "#e8b8d0", accent: "#80b8f0", overdue: "#e86080", imminent: "#e0a040", urgent: "#60b080" },
  aurora: { bg: "#0a0e1a", text: "#e4e8f0", border: "#1e293b", accent: "#34d399", overdue: "#ef4444", imminent: "#f59e0b", urgent: "#34d399" },
  synthwave: { bg: "#1a1b26", text: "#c0caf5", border: "#24283b", accent: "#7aa2f7", overdue: "#f7768e", imminent: "#e0af68", urgent: "#9ece6a" },
  minimal: { bg: "#ffffff", text: "#1a1a1a", border: "#f0f0f0", accent: "#1a1a1a", overdue: "#ff4d4f", imminent: "#ffc53d", urgent: "#73d13d" },
  wispr: { bg: "#fbfaf3", text: "#1a1a1a", border: "#e5e4da", accent: "#1a342d", overdue: "#ff4d4f", imminent: "#ffc53d", urgent: "#73d13d" },
  "solarized-osaka": { bg: "#001f27", text: "#fdf6e3", border: "#073642", accent: "#2aa198", overdue: "#dc322f", imminent: "#b58900", urgent: "#859900" },
  olivia: { bg: "#1c1b1a", text: "#f7f0e6", border: "#3d3330", accent: "#cba694", overdue: "#c05858", imminent: "#c0a058", urgent: "#72c058" },
  codex: { bg: "#0d1117", text: "#d7e0ea", border: "#2a3441", accent: "#42d392", overdue: "#ff6b6b", imminent: "#ffd166", urgent: "#4cc9f0" }
};
let refreshResetTimer = null;

function isActivity(item) {
  return item && item.kind !== "content" && !item.archived;
}

function isUnreadContent(item, readIds) {
  return item?.kind === "content" && !item.archived && item.id && !readIds.has(item.id);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRelativeTime(value) {
  const date = new Date(value);
  const elapsed = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime())) return "Sin lectura guardada";
  if (elapsed < 60 * 1000) return "Actualizado hace menos de 1 min";
  if (elapsed < 60 * 60 * 1000) return "Actualizado hace " + Math.floor(elapsed / (60 * 1000)) + " min";
  if (elapsed < 24 * 60 * 60 * 1000) return "Actualizado hace " + Math.floor(elapsed / (60 * 60 * 1000)) + " h";
  return "Actualizado el " + date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getSyncState(value) {
  if (!value) return { label: "sin datos", className: "sync-empty" };
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed)) return { label: "sin datos", className: "sync-empty" };
  if (elapsed <= 15 * 60 * 1000) return { label: "al día", className: "sync-fresh" };
  if (elapsed <= 2 * 60 * 60 * 1000) return { label: "revisar", className: "sync-warning" };
  return { label: "desactualizado", className: "sync-stale" };
}

function setNotice(message, tone = "") {
  const notice = document.querySelector("#popup-notice");
  notice.textContent = message;
  notice.className = "notice" + (tone ? " notice-" + tone : "");
}

function normalizeThemeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function applyTheme(themeName, customTheme) {
  const selectedTheme = themeName === "custom" ? customTheme : THEME_PRESETS[themeName];
  const fallback = THEME_PRESETS.light;
  const theme = {
    bg: normalizeThemeColor(selectedTheme?.bg, fallback.bg),
    text: normalizeThemeColor(selectedTheme?.text, fallback.text),
    border: normalizeThemeColor(selectedTheme?.border, fallback.border),
    accent: normalizeThemeColor(selectedTheme?.accent, fallback.accent),
    overdue: normalizeThemeColor(selectedTheme?.overdue, fallback.overdue),
    imminent: normalizeThemeColor(selectedTheme?.imminent, fallback.imminent),
    urgent: normalizeThemeColor(selectedTheme?.urgent, fallback.urgent)
  };
  const root = document.documentElement;
  root.dataset.theme = (THEME_PRESETS[themeName] || themeName === "custom") ? themeName : "light";
  root.style.setProperty("--popup-bg", theme.bg);
  root.style.setProperty("--popup-text", theme.text);
  root.style.setProperty("--popup-border", theme.border);
  root.style.setProperty("--popup-accent", theme.accent);
  root.style.setProperty("--popup-active-text", theme.bg);
  root.style.setProperty("--popup-overdue", theme.overdue);
  root.style.setProperty("--popup-imminent", theme.imminent);
  root.style.setProperty("--popup-urgent", theme.urgent);
}

async function getPopupData() {
  const keys = [SNAPSHOT_KEY, READ_CONTENT_IDS_KEY, THEME_KEY, CUSTOM_THEME_KEY];
  const localData = await chrome.storage.local.get(keys);
  try {
    const syncedData = await chrome.storage.sync.get([THEME_KEY, CUSTOM_THEME_KEY]);
    return { ...localData, ...syncedData };
  } catch (_) {
    return localData;
  }
}

function activityUrl(item) {
  if (!item?.activityId) return EMINUS_URL;
  const url = new URL("https://eminus.uv.mx/aplicativoEminus/actividad-detalle/" + encodeURIComponent(item.activityId));
  if (item.courseId) url.searchParams.set("courseId", item.courseId);
  return url.toString();
}

async function getEminusTabs() {
  return chrome.tabs.query({ url: ["https://eminus.uv.mx/eminus4/*"] });
}

async function focusTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
}

async function openPanel(view = "summary", shouldRefresh = false) {
  const selectedView = PANEL_VIEWS.has(view) ? view : "summary";
  await chrome.storage.local.set({
    [POPUP_TARGET_VIEW_KEY]: {
      view: selectedView,
      refresh: shouldRefresh,
      requestedAt: Date.now()
    }
  });
  const tabs = await getEminusTabs();
  const tab = tabs.find((entry) => entry.id);
  if (tab?.id) {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "OPEN_PANEL_VIEW",
      view: selectedView,
      refresh: shouldRefresh
    }).catch(() => null);
    if (response?.ok) {
      await chrome.storage.local.remove(POPUP_TARGET_VIEW_KEY);
    } else {
      await chrome.tabs.reload(tab.id);
    }
    await focusTab(tab);
  } else {
    await chrome.tabs.create({ url: EMINUS_URL });
  }
  window.close();
}

async function refreshPending() {
  const button = document.querySelector("#refresh-pending");
  const tabs = await getEminusTabs();
  const tab = tabs.find((entry) => entry.id);
  if (!tab?.id) {
    await chrome.tabs.create({ url: EMINUS_URL });
    window.close();
    return;
  }
  button.disabled = true;
  setNotice("Actualizando pendientes...", "working");
  const response = await chrome.tabs.sendMessage(tab.id, { type: "BACKGROUND_REFRESH_PANEL" }).catch(() => null);
  if (!response?.ok) {
    setNotice("Abre o recarga Eminus para actualizar los datos.", "warning");
    button.disabled = false;
    return;
  }
  window.clearTimeout(refreshResetTimer);
  refreshResetTimer = window.setTimeout(() => {
    button.disabled = false;
    setNotice("La actualización sigue pendiente. Revisa la pestaña de Eminus.", "warning");
  }, 10000);
}

async function syncReadContentIds(ids) {
  const tabs = await getEminusTabs();
  await Promise.all(tabs
    .filter((tab) => tab.id)
    .map((tab) => chrome.tabs.sendMessage(tab.id, { type: "SYNC_READ_CONTENT_IDS", ids }).catch(() => null)));
}

async function markAllContentRead() {
  const data = await getPopupData();
  const snapshot = data[SNAPSHOT_KEY] || {};
  const items = Array.isArray(snapshot.pending) ? snapshot.pending : [];
  const readIds = new Set(Array.isArray(data[READ_CONTENT_IDS_KEY]) ? data[READ_CONTENT_IDS_KEY] : []);
  const unread = items.filter((item) => isUnreadContent(item, readIds));
  unread.forEach((item) => readIds.add(item.id));
  const ids = Array.from(readIds);
  await chrome.storage.local.set({ [READ_CONTENT_IDS_KEY]: ids });
  await syncReadContentIds(ids);
  await render();
  setNotice(unread.length + " publicaciones marcadas como leídas.", "success");
}

function renderTaskList(items) {
  const list = document.querySelector("#task-list");
  list.textContent = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No hay entregas próximas con fecha.";
    list.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    const course = document.createElement("span");
    const title = document.createElement("strong");
    const due = document.createElement("small");
    button.className = "task task-" + (item.urgency || "normal");
    button.type = "button";
    course.textContent = item.course || "Eminus";
    title.textContent = item.title || "Actividad sin título";
    due.textContent = "vence: " + formatDate(item.deadlineRaw);
    button.append(course, title, due);
    button.addEventListener("click", async () => {
      await chrome.tabs.create({ url: activityUrl(item) });
      window.close();
    });
    list.appendChild(button);
  });
}

async function render() {
  const data = await getPopupData();
  const snapshot = data[SNAPSHOT_KEY] || {};
  const items = Array.isArray(snapshot.pending) ? snapshot.pending : [];
  const activities = items.filter(isActivity);
  const now = new Date();
  const readIds = new Set(Array.isArray(data[READ_CONTENT_IDS_KEY]) ? data[READ_CONTENT_IDS_KEY] : []);
  const unreadContent = items.filter((item) => isUnreadContent(item, readIds));
  const upcoming = activities
    .filter((item) => item.deadlineRaw && new Date(item.deadlineRaw).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.deadlineRaw).getTime() - new Date(b.deadlineRaw).getTime())
    .slice(0, 3);

  document.querySelector("#pending-count").textContent = String(activities.length);
  document.querySelector("#today-count").textContent = String(activities.filter((item) => item.deadlineRaw && isSameDay(new Date(item.deadlineRaw), now)).length);
  document.querySelector("#overdue-count").textContent = String(activities.filter((item) => item.urgency === "overdue").length);
  document.querySelector("#content-count").textContent = String(unreadContent.length);
  document.querySelector("#last-sync").textContent = formatRelativeTime(snapshot.updatedAt);
  const syncState = getSyncState(snapshot.updatedAt);
  const syncStateElement = document.querySelector("#sync-state");
  syncStateElement.textContent = syncState.label;
  syncStateElement.className = "sync-state " + syncState.className;
  const markReadButton = document.querySelector("#mark-content-read");
  markReadButton.hidden = unreadContent.length === 0;
  markReadButton.textContent = "Marcar contenido leído (" + unreadContent.length + ")";
  applyTheme(data[THEME_KEY] || "light", data[CUSTOM_THEME_KEY]);
  renderTaskList(upcoming);
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => openPanel(button.getAttribute("data-view")));
});
document.querySelector("#refresh-pending").addEventListener("click", refreshPending);
document.querySelector("#mark-content-read").addEventListener("click", markAllContentRead);
document.querySelector("#open-eminus").addEventListener("click", () => openPanel("summary", true));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" && areaName !== "sync") return;
  if (changes[SNAPSHOT_KEY] || changes[READ_CONTENT_IDS_KEY] || changes[THEME_KEY] || changes[CUSTOM_THEME_KEY]) {
    render();
    if (changes[SNAPSHOT_KEY]) {
      window.clearTimeout(refreshResetTimer);
      refreshResetTimer = null;
      document.querySelector("#refresh-pending").disabled = false;
      setNotice("Lectura actualizada.", "success");
    }
  }
});
render();
