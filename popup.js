const SNAPSHOT_KEY = "eminusLastSnapshot";
const READ_CONTENT_IDS_KEY = "eminusReadContentIds";
const THEME_KEY = "eminusPanelTheme";
const CUSTOM_THEME_KEY = "eminusCustomTheme";
const POPUP_TARGET_VIEW_KEY = "eminusPopupTargetView";
const LANG_KEY = "eminusLanguage";
const em = window.eminus || {};

function t(key, fallback) {
  const value = typeof em.t === "function" ? em.t(key) : null;
  return !value || value === key ? fallback : value;
}

function locale() {
  return em.state?.lang === "en" ? "en-US" : "es-MX";
}
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
  return t("popup_updated_at", "Actualizado el {d}").replace("{d}", date.toLocaleString(locale(), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }));
}

function formatDeadline(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("due_nodate", "sin fecha");
  return date.toLocaleString(locale(), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRelativeTime(value) {
  const date = new Date(value);
  const elapsed = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime())) return t("popup_sync_none", "Sin lectura guardada");
  if (elapsed < 60 * 1000) return t("popup_updated_just_now", "Actualizado hace menos de 1 min");
  if (elapsed < 60 * 60 * 1000) return t("popup_updated_min_ago", "Actualizado hace {n} min").replace("{n}", Math.floor(elapsed / (60 * 1000)));
  if (elapsed < 24 * 60 * 60 * 1000) return t("popup_updated_hours_ago", "Actualizado hace {n} h").replace("{n}", Math.floor(elapsed / (60 * 60 * 1000)));
  return formatDate(value);
}

function getSyncState(value) {
  if (!value) return { label: t("popup_sync_none", "sin datos"), icon: "○", className: "sync-empty" };
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed)) return { label: t("popup_sync_none", "sin datos"), icon: "○", className: "sync-empty" };
  if (elapsed <= 15 * 60 * 1000) return { label: t("popup_sync_fresh", "al día"), icon: "●", className: "sync-fresh" };
  if (elapsed <= 2 * 60 * 60 * 1000) return { label: t("popup_sync_check", "revisar"), icon: "◷", className: "sync-warning" };
  return { label: t("popup_sync_stale", "desactualizado"), icon: "!", className: "sync-stale" };
}

async function updateTabBanner() {
  const banner = document.querySelector("#tab-banner");
  if (!banner) return;
  let tabs = [];
  try {
    tabs = await getEminusTabs();
  } catch (_) {
    tabs = [];
  }
  if (tabs.length === 0) {
    banner.textContent = t("popup_banner_no_tab", "Para que los pendientes se actualicen solos, mantén una pestaña de Eminus abierta.");
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function setNotice(message, tone = "", action = null) {
  const notice = document.querySelector("#popup-notice");
  notice.textContent = message;
  notice.className = "notice" + (tone ? " notice-" + tone : "");
  if (action && typeof action.onClick === "function") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "notice-action";
    button.textContent = action.label || t("popup_undo", "Deshacer");
    button.addEventListener("click", action.onClick);
    notice.appendChild(button);
  }
}

function normalizeThemeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function isDarkColor(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!match) return false;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
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
  const dark = isDarkColor(theme.bg);
  const semantic = dark
    ? { success: "#4ade80", warning: "#fbbf24", danger: "#f87171", bannerBg: "rgba(251, 191, 36, 0.14)", bannerBorder: "#fbbf24", bannerText: "#fbbf24" }
    : { success: "#1b7f2a", warning: "#a36b00", danger: "#b42318", bannerBg: "#fff8e1", bannerBorder: "#b45309", bannerText: "#7c4a03" };
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
  root.style.setProperty("--popup-success", semantic.success);
  root.style.setProperty("--popup-warning", semantic.warning);
  root.style.setProperty("--popup-danger", semantic.danger);
  root.style.setProperty("--popup-banner-bg", semantic.bannerBg);
  root.style.setProperty("--popup-banner-border", semantic.bannerBorder);
  root.style.setProperty("--popup-banner-text", semantic.bannerText);
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
    setNotice(t("popup_refresh_no_tab", "No hay ninguna pestaña de Eminus abierta; hace falta para actualizar."), "warning", {
      label: t("popup_action_open_refresh", "Abrir Eminus y actualizar"),
      onClick: async () => {
        button.disabled = true;
        await chrome.tabs.create({ url: EMINUS_URL });
        window.close();
      }
    });
    return;
  }
  button.disabled = true;
  setNotice(t("popup_notice_updating", "Actualizando pendientes…"), "working");
  const response = await chrome.tabs.sendMessage(tab.id, { type: "BACKGROUND_REFRESH_PANEL" }).catch(() => null);
  if (!response?.ok) {
    setNotice(t("popup_notice_open_reload", "Abre o recarga Eminus para actualizar."), "warning");
    button.disabled = false;
    return;
  }
  window.clearTimeout(refreshResetTimer);
  refreshResetTimer = window.setTimeout(() => {
    button.disabled = false;
    setNotice(t("popup_notice_slow", "Actualización en curso. Revisa la pestaña de Eminus."), "warning");
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
  const previousIds = Array.from(readIds);
  const unread = items.filter((item) => isUnreadContent(item, readIds));
  if (!unread.length) return;
  unread.forEach((item) => readIds.add(item.id));
  const ids = Array.from(readIds);
  await chrome.storage.local.set({ [READ_CONTENT_IDS_KEY]: ids });
  await syncReadContentIds(ids);
  await render();
  setNotice(t("popup_notice_marked", "{n} publicaciones marcadas como leídas.").replace("{n}", unread.length), "success", {
    label: t("popup_undo", "Deshacer"),
    onClick: async () => {
      await chrome.storage.local.set({ [READ_CONTENT_IDS_KEY]: previousIds });
      await syncReadContentIds(previousIds);
      await render();
      setNotice(t("popup_notice_undo_marked", "Se restauraron como no leídas."), "success");
    }
  });
}

function updatePopupOnboarding(snapshot, activities) {
  const card = document.querySelector("#popup-onboarding");
  if (!card) return;
  const hasSnapshot = !!(snapshot && snapshot.updatedAt && Array.isArray(snapshot.pending));
  const isEmpty = !hasSnapshot || activities.length === 0;
  const title = card.querySelector("#onboarding-title");
  const desc = card.querySelector("#onboarding-desc");
  const steps = card.querySelector("#onboarding-steps");
  const icon = card.querySelector(".onboarding-icon");

  if (!hasSnapshot) {
    card.hidden = false;
    card.classList.remove("hidden");
    icon.textContent = "◐";
    icon.classList.remove("is-done");
    icon.style.animationName = "";
    title.textContent = t("popup_ob_welcome", "Bienvenido a Miyu");
    desc.textContent = t("popup_ob_no_data", "Aún no hay lectura. Abre Eminus para empezar.");
    steps.innerHTML = "<li>" + t("popup_ob_step1", "Inicia sesión en <strong>eminus.uv.mx</strong>") + "</li><li>" + t("popup_ob_step2", "Ten Eminus abierto en una pestaña") + "</li><li>" + t("popup_ob_step3", "Pulsa <strong>[ actualizar ]</strong>") + "</li>";
    document.querySelector(".metrics").style.opacity = "0.45";
    document.querySelector(".next").style.opacity = "0.6";
    setNotice(t("popup_notice_updating", "Actualizando pendientes…"), "working");
  } else if (isEmpty && hasSnapshot) {
    card.hidden = false;
    card.classList.remove("hidden");
    icon.textContent = "✓";
    icon.classList.add("is-done");
    title.textContent = t("popup_all_title", "¡Todo al día!");
    desc.textContent = t("popup_all_desc", "No tienes pendientes con fecha. Disfruta el descanso.");
    steps.innerHTML = "<li>" + t("popup_all_step1", "Revisa <strong>Contenido</strong> por si hay publicaciones nuevas") + "</li><li>" + t("popup_all_step2", "Usa <kbd>Alt</kbd>+<kbd>E</kbd> para plegar el panel dentro de Eminus") + "</li>";
    document.querySelector(".metrics").style.opacity = "1";
    document.querySelector(".next").style.opacity = "1";
  } else {
    card.hidden = true;
    card.classList.add("hidden");
    document.querySelector(".metrics").style.opacity = "1";
    document.querySelector(".next").style.opacity = "1";
  }
}

function renderTaskList(items, hasSnapshot) {
  const list = document.querySelector("#task-list");
  list.textContent = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    if (!hasSnapshot) {
      empty.innerHTML = t("popup_empty_nodata", "Aún sin datos. Abre Eminus y pulsa <strong>[ actualizar ]</strong>.") + '<br><small style="opacity:0.7">' + t("popup_empty_tip", "<kbd>Alt</kbd>+<kbd>E</kbd> abre el panel dentro de Eminus.") + "</small>";
    } else {
      empty.textContent = t("popup_empty_nodue", "Sin entregas próximas con fecha.");
    }
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
    if (item.urgency && item.urgency !== "normal") {
      const badge = document.createElement("span");
      badge.className = "task-urgency-badge";
      badge.innerHTML = t("urgency_badge_" + item.urgency, "");
      course.appendChild(badge);
    }
    title.textContent = item.title || "Actividad sin título";
    due.textContent = t("due", "Vence:") + " " + formatDeadline(item.deadlineRaw);
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
  syncStateElement.textContent = syncState.icon + " " + syncState.label;
  syncStateElement.className = "sync-state " + syncState.className;
  const markReadButton = document.querySelector("#mark-content-read");
  markReadButton.hidden = unreadContent.length === 0;
  markReadButton.textContent = t("popup_mark_read", "Marcar contenido leído ({n})").replace("{n}", unreadContent.length);
  applyTheme(data[THEME_KEY] || "light", data[CUSTOM_THEME_KEY]);
  const hasSnapshot = !!(snapshot && snapshot.updatedAt);
  updatePopupOnboarding(snapshot, activities);
  renderTaskList(upcoming, hasSnapshot);
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"), el.textContent);
  });
  const refreshButton = document.querySelector("#refresh-pending");
  if (refreshButton && !refreshButton.disabled) refreshButton.textContent = t("popup_refresh", "[ actualizar ]");
  const openButton = document.querySelector("#open-eminus");
  if (openButton) openButton.textContent = t("popup_open_summary", "Abrir resumen en Eminus");
  const onboardingOpen = document.querySelector("#onboarding-open");
  if (onboardingOpen) onboardingOpen.textContent = t("popup_ob_open", "Abrir Eminus");
  const onboardingRefresh = document.querySelector("#onboarding-refresh");
  if (onboardingRefresh) onboardingRefresh.textContent = t("popup_ob_refresh_now", "[ actualizar ahora ]");
  const hint = document.querySelector("#onboarding-hint");
  if (hint) hint.innerHTML = t("popup_ob_hint", "<kbd>Alt</kbd>+<kbd>E</kbd> abre/cierra el panel · <kbd>/</kbd> busca · <kbd>R</kbd> actualiza");
  document.documentElement.lang = em.state?.lang || "es";
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => openPanel(button.getAttribute("data-view")));
});
document.querySelector("#refresh-pending").addEventListener("click", refreshPending);
document.querySelector("#mark-content-read").addEventListener("click", markAllContentRead);
document.querySelector("#open-eminus").addEventListener("click", () => openPanel("summary", true));
document.querySelector("#onboarding-open")?.addEventListener("click", () => openPanel("summary", true));
document.querySelector("#onboarding-refresh")?.addEventListener("click", refreshPending);
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" && areaName !== "sync") return;
  if (changes[LANG_KEY]) {
    em.state = em.state || {};
    em.state.lang = changes[LANG_KEY].newValue || "es";
    applyStaticTranslations();
  }
  if (changes[SNAPSHOT_KEY] || changes[READ_CONTENT_IDS_KEY] || changes[THEME_KEY] || changes[CUSTOM_THEME_KEY]) {
    render();
    if (changes[SNAPSHOT_KEY]) {
      window.clearTimeout(refreshResetTimer);
      refreshResetTimer = null;
      document.querySelector("#refresh-pending").disabled = false;
      setNotice(t("popup_notice_updated", "Lectura actualizada."), "success");
    }
  }
});
if (chrome.tabs?.onRemoved) chrome.tabs.onRemoved.addListener(() => updateTabBanner());
(async () => {
  try {
    const storedLang = await chrome.storage.local.get(LANG_KEY);
    em.state = em.state || {};
    em.state.lang = storedLang[LANG_KEY] || "es";
  } catch (_) {
    em.state = em.state || {};
  }
  applyStaticTranslations();
  await updateTabBanner();
  render();
})();
