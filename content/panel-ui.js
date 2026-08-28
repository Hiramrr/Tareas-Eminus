window.eminus = window.eminus || {};

var em = window.eminus;

em.getPanelUiState = function () {
  return {
    isCollapsed: !!em.state.isCollapsed,
    activeTab: em.state.activeTab || "summary",
    filters: { ...(em.state.filters || {}) },
    contentFilters: { ...(em.state.contentFilters || {}) }
  };
};

em.persistPanelUiState = async function () {
  const payload = {};
  payload[em.STORAGE_KEYS.PANEL_UI_STATE] = em.getPanelUiState();
  await em.storageSet(payload);
};

em.schedulePanelUiStatePersist = function () {
  if (em.panelUiStatePersistTimer) {
    window.clearTimeout(em.panelUiStatePersistTimer);
  }
  em.panelUiStatePersistTimer = window.setTimeout(() => {
    em.panelUiStatePersistTimer = null;
    em.persistPanelUiState();
  }, 200);
};

em.setPanelCollapsed = function (isCollapsed, shouldPersist = true) {
  em.state.isCollapsed = !!isCollapsed;
  if (em.panelEls && em.panelEls.root) {
    em.panelEls.root.classList.toggle("ep-collapsed", em.state.isCollapsed);
  }
  if (em.panelEls && em.panelEls.collapseBtn) {
    em.panelEls.collapseBtn.textContent = em.state.isCollapsed ? em.t("panel_open_label") : em.t("panel_fold_label");
    em.panelEls.collapseBtn.title = em.state.isCollapsed ? em.t("expand_tooltip") : em.t("collapse_tooltip");
  }
  if (em.updateCollapsedSummary) em.updateCollapsedSummary();
  if (shouldPersist) em.schedulePanelUiStatePersist();
};

em.toggleCollapse = function () {
  em.setPanelCollapsed(!em.state.isCollapsed);
};

em.applyStoredPanelUiState = function (storedState) {
  const filters = storedState && typeof storedState.filters === "object" ? storedState.filters : {};
  const contentFilters = storedState && typeof storedState.contentFilters === "object" ? storedState.contentFilters : {};

  em.state.filters = {
    query: String(filters.query || ""),
    course: String(filters.course || "all"),
    urgency: ["all", "overdue", "imminent", "urgent", "normal"].includes(filters.urgency) ? filters.urgency : "all",
    dateRange: ["all", "today", "3d", "7d", "30d", "nodate", "overdue"].includes(filters.dateRange) ? filters.dateRange : "all",
    sort: ["deadline", "urgency", "course", "title"].includes(filters.sort) ? filters.sort : "deadline"
  };
  em.state.contentFilters = {
    type: ["all", "unit", "element", "files"].includes(contentFilters.type) ? contentFilters.type : "all",
    module: String(contentFilters.module || "all"),
    sort: ["newest", "oldest", "course", "module", "title"].includes(contentFilters.sort) ? contentFilters.sort : "newest"
  };
  const allowedTabs = ["summary", "pending", "today", "overdue", "agenda", "content", "log", "config"];
  em.state.activeTab = allowedTabs.includes(storedState?.activeTab) ? storedState.activeTab : "summary";

  if (em.panelEls) {
    if (em.panelEls.filterQuery) em.panelEls.filterQuery.value = em.state.filters.query;
    if (em.panelEls.filterUrgency) em.panelEls.filterUrgency.value = em.state.filters.urgency;
    if (em.panelEls.filterDate) em.panelEls.filterDate.value = em.state.filters.dateRange;
    if (em.panelEls.filterTaskSort) em.panelEls.filterTaskSort.value = em.state.filters.sort;
    if (em.panelEls.filterContentType) em.panelEls.filterContentType.value = em.state.contentFilters.type;
    if (em.panelEls.filterContentSort) em.panelEls.filterContentSort.value = em.state.contentFilters.sort;
  }

  const isFirstRun = !storedState;
  em.setPanelCollapsed(isFirstRun ? false : storedState?.isCollapsed !== false, false);
  if (em.updateTabVisibility) em.updateTabVisibility();
  if (em.updateFilterClearButton) em.updateFilterClearButton();
};

em.updateCollapsedSummary = function () {
  if (!em.panelEls || !em.panelEls.collapsedSummary) return;
  const visible = em.getVisiblePending(em.state.pending);
  const overdueCount = visible.filter((item) => item.urgency === "overdue").length;
  const next = visible
    .filter((item) => item.deadlineRaw && item.urgency !== "overdue")
    .sort((a, b) => new Date(a.deadlineRaw).getTime() - new Date(b.deadlineRaw).getTime())[0];
  const parts = [visible.length + " " + em.t("status_pending")];
  if (overdueCount > 0) {
    parts.push(overdueCount + " " + em.t("filter_urgency_overdue"));
  }
  if (next) {
    parts.push(em.t("summary_next") + " " + em.getTimeRemaining(new Date(next.deadlineRaw)));
  }
  em.panelEls.collapsedSummary.textContent = parts.join(" · ");
};

em.getActiveFilterCount = function () {
  const filters = em.state.filters || {};
  const contentFilters = em.state.contentFilters || {};
  return [
    String(filters.query || "").trim(),
    filters.course !== "all",
    filters.urgency !== "all",
    filters.dateRange !== "all",
    filters.sort !== "deadline",
    contentFilters.type !== "all",
    contentFilters.module !== "all",
    contentFilters.sort !== "newest"
  ].filter(Boolean).length;
};

em.updateFilterClearButton = function () {
  if (!em.panelEls || !em.panelEls.filterClearBtn) return;
  const count = em.getActiveFilterCount();
  em.panelEls.filterClearBtn.textContent = em.t("filter_clear");
  let chip = em.panelEls.filterClearBtn.querySelector(".ep-filter-chip");
  if (count > 0) {
    if (!chip) {
      chip = document.createElement("span");
      chip.className = "ep-filter-chip";
      em.panelEls.filterClearBtn.appendChild(chip);
    }
    chip.textContent = String(count);
    em.panelEls.filterClearBtn.classList.add("ep-filter-clear-active");
    em.panelEls.filterClearBtn.disabled = false;
  } else {
    if (chip) chip.remove();
    em.panelEls.filterClearBtn.classList.remove("ep-filter-clear-active");
    em.panelEls.filterClearBtn.disabled = true;
  }
};

em.clearFilters = function () {
  em.state.filters = {
    query: "",
    course: "all",
    urgency: "all",
    dateRange: "all",
    sort: "deadline"
  };
  em.state.contentFilters = {
    type: "all",
    module: "all",
    sort: "newest"
  };
  if (em.panelEls) {
    if (em.panelEls.filterQuery) em.panelEls.filterQuery.value = "";
    if (em.panelEls.filterCourse) em.panelEls.filterCourse.value = "all";
    if (em.panelEls.filterUrgency) em.panelEls.filterUrgency.value = "all";
    if (em.panelEls.filterDate) em.panelEls.filterDate.value = "all";
    if (em.panelEls.filterTaskSort) em.panelEls.filterTaskSort.value = "deadline";
    if (em.panelEls.filterContentType) em.panelEls.filterContentType.value = "all";
    if (em.panelEls.filterContentModule) em.panelEls.filterContentModule.value = "all";
    if (em.panelEls.filterContentSort) em.panelEls.filterContentSort.value = "newest";
  }
  em.updateFilterClearButton();
  em.persistPanelUiState();
  em.renderPending(em.state.pending);
  em.setStatus(em.t("status_filters_cleared"));
};

em.updateFiltersCompactButton = function () {
  if (!em.panelEls || !em.panelEls.filterCompactBtn) return;
  em.panelEls.filterCompactBtn.textContent = em.state.isFiltersCompact ? em.t("filter_expand") : em.t("filter_compact");
};

em.setFiltersCompact = async function (isCompact) {
  em.state.isFiltersCompact = !!isCompact;
  if (em.panelEls && em.panelEls.root) {
    em.panelEls.root.classList.toggle("ep-filters-compact", em.state.isFiltersCompact);
  }
  em.updateFiltersCompactButton();
  const payload = {};
  payload[em.STORAGE_KEYS.FILTERS_COMPACT] = em.state.isFiltersCompact;
  await em.preferencesSet(payload);
};

em.toggleFiltersCompact = function () {
  em.state.isFiltersCompact = !em.state.isFiltersCompact;
  em.setFiltersCompact(em.state.isFiltersCompact);
};

em.PANEL_THEME_CLASSES = [
  "ep-dark-theme",
  "ep-hacker-theme",
  "ep-ocean-theme",
  "ep-dracula-theme",
  "ep-nord-theme",
  "ep-solarized-theme",
  "ep-solarizedlight-theme",
  "ep-gruvbox-theme",
  "ep-sakura-theme",
  "ep-lavender-theme",
  "ep-rosa-theme",
  "ep-sandia-theme",
  "ep-matcha-theme",
  "ep-moka-theme",
  "ep-jazmin-theme",
  "ep-candy-theme",
  "ep-aurora-theme",
  "ep-synthwave-theme",
  "ep-minimal-theme",
  "ep-wispr-theme",
  "ep-solarized-osaka-theme",
  "ep-olivia-theme",
  "ep-codex-theme",
  "ep-custom-theme"
];

em.DEFAULT_CUSTOM_THEME = {
  bg: "#ffffff",
  text: "#111111",
  border: "#111111",
  accent: "#6c5ce7",
  overdue: "#e74c3c",
  imminent: "#f1c40f",
  urgent: "#e67e22"
};

em.CUSTOM_THEME_PRESETS = {
  light: { bg: "#ffffff", text: "#000000", border: "#000000", accent: "#000000", overdue: "#c0392b", imminent: "#f1c40f", urgent: "#e67e22" },
  jazmin: { bg: "#fffdf5", text: "#3d3a28", border: "#ddd8c0", accent: "#6a8a50", overdue: "#c06850", imminent: "#b8a030", urgent: "#6a8a50" },
  dark: { bg: "#121212", text: "#e0e0e0", border: "#444444", accent: "#e0e0e0", overdue: "#ff6b6b", imminent: "#f6e58d", urgent: "#a3e635" },
  hacker: { bg: "#000000", text: "#00ff00", border: "#00ff00", accent: "#00ff00", overdue: "#ff0000", imminent: "#ffff00", urgent: "#ccff00" },
  ocean: { bg: "#0f172a", text: "#38bdf8", border: "#1e293b", accent: "#38bdf8", overdue: "#f43f5e", imminent: "#eab308", urgent: "#a3e635" },
  dracula: { bg: "#282a36", text: "#f8f8f2", border: "#44475a", accent: "#f8f8f2", overdue: "#ff5555", imminent: "#f1fa8c", urgent: "#50fa7b" },
  nord: { bg: "#2E3440", text: "#D8DEE9", border: "#4C566A", accent: "#D8DEE9", overdue: "#bf616a", imminent: "#ebcb8b", urgent: "#a3be8c" },
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
  minimal: { bg: "#ffffff", text: "#1a1a1a", border: "#f0f0f0", accent: "#f0f0f0", overdue: "#ff4d4f", imminent: "#ffc53d", urgent: "#73d13d" },
  wispr: { bg: "#fbfaf3", text: "#1a1a1a", border: "#e5e4da", accent: "#1a342d", overdue: "#ff4d4f", imminent: "#ffc53d", urgent: "#73d13d" },
  "solarized-osaka": { bg: "#001f27", text: "#fdf6e3", border: "#073642", accent: "#2aa198", overdue: "#dc322f", imminent: "#b58900", urgent: "#859900" },
  olivia: { bg: "#1c1b1a", text: "#f7f0e6", border: "#3d3330", accent: "#cba694", overdue: "#c05858", imminent: "#c0a058", urgent: "#72c058" },
  codex: { bg: "#0d1117", text: "#d7e0ea", border: "#2a3441", accent: "#42d392", overdue: "#ff6b6b", imminent: "#ffd166", urgent: "#4cc9f0" }
};

em.setTheme = async function (themeName) {
  em.panelEls.root.classList.remove(...em.PANEL_THEME_CLASSES);
  if (themeName !== "light") {
    em.panelEls.root.classList.add("ep-" + themeName + "-theme");
  }
  em.updateActiveThemeChip(themeName);
  em.updateCustomThemeVisibility(themeName);
  const payload = {};
  payload[em.STORAGE_KEYS.THEME] = themeName;
  await em.preferencesSet(payload);
};

em.isDarkColor = function (hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!match) return false;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
};

em.updateActiveThemeChip = function (themeName) {
  if (!em.panelEls || !em.panelEls.themeChips) return;
  const presetBg = themeName === "custom"
    ? em.state?.customTheme?.bg
    : em.CUSTOM_THEME_PRESETS?.[themeName]?.bg;
  const dark = em.isDarkColor(presetBg);
  em.panelEls.root.style.setProperty("--ep-chip-active-bg", dark ? "#ffffff" : "#000000");
  em.panelEls.root.style.setProperty("--ep-chip-active-fg", dark ? "#000000" : "#ffffff");
  em.panelEls.themeChips.forEach((chip) => {
    const isActive = chip.dataset.theme === themeName;
    chip.classList.toggle("ep-theme-chip-active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });
};

em.updateCustomThemeVisibility = function (themeName) {
  if (!em.panelEls || !em.panelEls.customThemeControls) return;
  em.panelEls.customThemeControls.classList.toggle("ep-hidden", themeName !== "custom");
};

em.normalizeCustomTheme = function (customTheme) {
  const defaults = em.DEFAULT_CUSTOM_THEME;
  const hex = /^#[0-9a-f]{6}$/i;
  return {
    bg: hex.test(customTheme?.bg || "") ? customTheme.bg : defaults.bg,
    text: hex.test(customTheme?.text || "") ? customTheme.text : defaults.text,
    border: hex.test(customTheme?.border || "") ? customTheme.border : defaults.border,
    accent: hex.test(customTheme?.accent || "") ? customTheme.accent : defaults.accent,
    overdue: hex.test(customTheme?.overdue || "") ? customTheme.overdue : defaults.overdue,
    imminent: hex.test(customTheme?.imminent || "") ? customTheme.imminent : defaults.imminent,
    urgent: hex.test(customTheme?.urgent || "") ? customTheme.urgent : defaults.urgent
  };
};

em.applyCustomTheme = function (customTheme) {
  if (!em.panelEls || !em.panelEls.root) return;
  const theme = em.normalizeCustomTheme(customTheme || em.state.customTheme);
  em.state.customTheme = theme;
  em.panelEls.root.style.setProperty("--ep-custom-bg", theme.bg);
  em.panelEls.root.style.setProperty("--ep-custom-text", theme.text);
  em.panelEls.root.style.setProperty("--ep-custom-border", theme.border);
  em.panelEls.root.style.setProperty("--ep-custom-accent", theme.accent);
  em.panelEls.root.style.setProperty("--ep-custom-overdue", theme.overdue);
  em.panelEls.root.style.setProperty("--ep-custom-imminent", theme.imminent);
  em.panelEls.root.style.setProperty("--ep-custom-urgent", theme.urgent);

  if (em.panelEls.customColorInputs) {
    Object.keys(theme).forEach((key) => {
      if (em.panelEls.customColorInputs[key]) {
        em.panelEls.customColorInputs[key].value = theme[key];
      }
    });
  }
};

em.updateCustomThemeFromInputs = async function (activateTheme) {
  if (!em.panelEls || !em.panelEls.customColorInputs) return;
  const next = {};
  Object.keys(em.panelEls.customColorInputs).forEach((key) => {
    next[key] = em.panelEls.customColorInputs[key].value;
  });
  em.applyCustomTheme(next);
  const payload = {};
  payload[em.STORAGE_KEYS.CUSTOM_THEME] = em.state.customTheme;
  await em.preferencesSet(payload);
  if (activateTheme) {
    await em.setTheme("custom");
  }
};

em.setCustomThemeFromBase = async function (themeName) {
  const preset = em.CUSTOM_THEME_PRESETS[themeName];
  if (!preset) return;
  em.applyCustomTheme(preset);
  const payload = {};
  payload[em.STORAGE_KEYS.CUSTOM_THEME] = em.state.customTheme;
  await em.preferencesSet(payload);
  await em.setTheme("custom");
  if (em.panelEls && em.panelEls.customBaseThemeSelect) {
    em.panelEls.customBaseThemeSelect.value = "";
  }
};

em.setPanelSize = async function (size, shouldPersist = true) {
  const nextSize = ["compact", "normal", "wide"].includes(size) ? size : "normal";
  em.state.panelSize = nextSize;
  if (em.panelEls && em.panelEls.root) {
    em.panelEls.root.classList.remove("ep-size-compact", "ep-size-normal", "ep-size-wide");
    em.panelEls.root.classList.add("ep-size-" + nextSize);
  }
  if (em.panelEls && em.panelEls.panelSizeSelect) {
    em.panelEls.panelSizeSelect.value = nextSize;
  }
  if (!shouldPersist) return;
  const payload = {};
  payload[em.STORAGE_KEYS.PANEL_SIZE] = nextSize;
  await em.preferencesSet(payload);
};

em.setDeliveryAnimation = async function (animationKey, shouldPersist = true) {
  const allowed = ["cycle", "off", "confetti", "abduction", "teams", "pinata"];
  const nextAnimation = allowed.includes(animationKey) ? animationKey : "cycle";
  em.state.deliveryAnimation = nextAnimation;
  if (em.panelEls && em.panelEls.deliveryAnimationSelect) {
    em.panelEls.deliveryAnimationSelect.value = nextAnimation;
  }
  if (!shouldPersist) return;
  const payload = {};
  payload[em.STORAGE_KEYS.DELIVERY_ANIMATION] = nextAnimation;
  await em.preferencesSet(payload);
};

em.setFont = async function (fontKey) {
  const fonts = {
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    system: 'system-ui, sans-serif'
  };

  const normalizedKey = Object.prototype.hasOwnProperty.call(fonts, fontKey) ? fontKey : "mono";
  const family = fonts[normalizedKey];
  em.panelEls.root.style.setProperty("--ep-font-family", family);
  
  if (em.panelEls.fontSelect) {
    em.panelEls.fontSelect.value = normalizedKey;
  }

  const payload = {};
  payload[em.STORAGE_KEYS.FONT] = normalizedKey;
  await em.preferencesSet(payload);
};

em.setLanguage = async function (lang) {
  em.state.lang = lang;
  if (em.panelEls && em.panelEls.langSelect) {
    em.panelEls.langSelect.value = lang;
  }
  const payload = {};
  payload[em.STORAGE_KEYS.LANG] = lang;
  await em.preferencesSet(payload);
  
  if (em.applyTranslations) em.applyTranslations();
  
  em.renderPending(em.state.pending);
  em.renderLogs(em.state.logs);
  
  const visible = em.getVisiblePending(em.state.pending);
  const contentCount = em.getVisibleContent(em.state.pending).length;
  const data = await em.storageGet(em.STORAGE_KEYS.SNAPSHOT);
  const snapshot = data[em.STORAGE_KEYS.SNAPSHOT];
  const newCount = snapshot ? (snapshot.newTaskCount ?? snapshot.newCount ?? 0) : 0;
  const status = visible.length + " " + em.t("status_pending") + " | " + contentCount + " " + em.t("status_content") + " | " + newCount + " " + em.t("status_new");
  em.setStatus(status);
};

em.setLogTabVisible = async function (isVisible) {
  em.state.isLogTabVisible = !!isVisible;
  if (em.panelEls && em.panelEls.logVisibilitySelect) {
    em.panelEls.logVisibilitySelect.value = em.state.isLogTabVisible ? "visible" : "removed";
  }
  if (!em.state.isLogTabVisible && em.state.activeTab === "log") {
    em.state.activeTab = "summary";
  }
  const payload = {};
  payload[em.STORAGE_KEYS.LOG_TAB_VISIBLE] = em.state.isLogTabVisible;
  await em.preferencesSet(payload);
  em.updateTabVisibility();
};

em.updateArchiveToggleButton = function () {
  if (!em.panelEls || !em.panelEls.archiveBtn) return;
  const label = em.state.isArchiveView ? em.t("archive_back") : em.t("archive_view");
  em.panelEls.archiveBtn.title = label;
  em.panelEls.archiveBtn.setAttribute("aria-label", label);
  em.panelEls.archiveBtn.innerHTML = em.state.isArchiveView ? em.ARCHIVE_BACK_HTML : em.ARCHIVE_BUTTON_HTML;
};

em.updateBulkActionButtons = function () {
  if (!em.panelEls) return;
  const overdueCount = em.getVisiblePending(em.state.pending).filter((item) => item.urgency === "overdue").length;
  const pinnedCount = em.state.pending.filter((item) => item.pinned).length;
  if (em.panelEls.archiveAllOverdueBtn) {
    em.panelEls.archiveAllOverdueBtn.disabled = overdueCount === 0;
    em.panelEls.archiveAllOverdueBtn.textContent = em.t("action_archive_all") + (overdueCount ? " (" + overdueCount + ")" : "");
  }
  if (em.panelEls.unpinAllBtn) {
    em.panelEls.unpinAllBtn.disabled = pinnedCount === 0;
    em.panelEls.unpinAllBtn.textContent = em.t("action_unpin_all") + (pinnedCount ? " (" + pinnedCount + ")" : "");
  }
  if (em.panelEls.exportWeekBtn) {
    em.panelEls.exportWeekBtn.textContent = em.t("action_export_week");
  }
};

em.updateTabVisibility = function () {
  if (!em.state.isLogTabVisible && em.state.activeTab === "log") {
    em.state.activeTab = "summary";
  }

  const isPendingView = ["pending", "today", "overdue"].includes(em.state.activeTab);
  em.panelEls.tabButtons.forEach((btn) => {
    const isLogTab = btn.dataset.tab === "log";
    const isActiveTab = btn.dataset.tab === em.state.activeTab;
    btn.classList.toggle("ep-hidden", isLogTab && !em.state.isLogTabVisible);
    btn.classList.toggle("ep-tab-active", isActiveTab);
    btn.setAttribute("aria-selected", String(isActiveTab));
  });
  if (em.panelEls.taskTab) {
    em.panelEls.taskTab.classList.toggle("ep-tab-active", isPendingView);
  }
  if (em.panelEls.taskViewSelect) {
    em.panelEls.taskViewSelect.value = isPendingView ? em.state.activeTab : "";
  }

  if (em.state.isArchiveView) {
    em.panelEls.filtersWrap.classList.add("ep-hidden");
    em.panelEls.summaryBody.classList.add("ep-hidden");
    em.panelEls.todayBody.classList.add("ep-hidden");
    em.panelEls.pendingBody.classList.remove("ep-hidden");
    em.panelEls.overdueBody.classList.add("ep-hidden");
    em.panelEls.agendaBody.classList.add("ep-hidden");
    em.panelEls.contentBody.classList.add("ep-hidden");
    em.panelEls.logBody.classList.add("ep-hidden");
    em.panelEls.configBody.classList.add("ep-hidden");
    return;
  }

  const showFilters = em.state.activeTab === "today" || em.state.activeTab === "pending" || em.state.activeTab === "overdue" || em.state.activeTab === "agenda" || em.state.activeTab === "content";
  em.panelEls.filtersWrap.classList.toggle("ep-hidden", !showFilters);
  const isContentTab = em.state.activeTab === "content";
  if (em.panelEls.filterUrgency) em.panelEls.filterUrgency.classList.toggle("ep-hidden", isContentTab);
  if (em.panelEls.filterDate) em.panelEls.filterDate.classList.toggle("ep-hidden", isContentTab);
  if (em.panelEls.filterTaskSort) em.panelEls.filterTaskSort.classList.toggle("ep-hidden", isContentTab);
  if (em.panelEls.contentFilters) {
    em.panelEls.contentFilters.forEach((el) => el.classList.toggle("ep-hidden", !isContentTab));
  }

  em.panelEls.summaryBody.classList.toggle("ep-hidden", em.state.activeTab !== "summary");
  em.panelEls.todayBody.classList.toggle("ep-hidden", em.state.activeTab !== "today");
  em.panelEls.pendingBody.classList.toggle("ep-hidden", em.state.activeTab !== "pending");
  em.panelEls.overdueBody.classList.toggle("ep-hidden", em.state.activeTab !== "overdue");
  em.panelEls.agendaBody.classList.toggle("ep-hidden", em.state.activeTab !== "agenda");
  em.panelEls.contentBody.classList.toggle("ep-hidden", em.state.activeTab !== "content");
  em.panelEls.logBody.classList.toggle("ep-hidden", !em.state.isLogTabVisible || em.state.activeTab !== "log");
  em.panelEls.configBody.classList.toggle("ep-hidden", em.state.activeTab !== "config");
};

em.setArchiveView = function (isOpen) {
  if (em.state.isArchiveView === isOpen) return;
  if (isOpen) {
    em.state.lastTabBeforeArchive = em.state.activeTab;
    em.state.activeTab = "pending";
  }
  em.state.isArchiveView = isOpen;
  em.panelEls.root.classList.toggle("ep-archive-view", isOpen);
  em.updateArchiveToggleButton();

  if (!isOpen && em.state.lastTabBeforeArchive) {
    em.state.activeTab = em.state.lastTabBeforeArchive;
  }

  em.updateTabVisibility();
  em.renderPending(em.state.pending);
};

em.toggleArchiveView = function () {
  em.setArchiveView(!em.state.isArchiveView);
};

em.setTab = function (tab) {
  if (tab === "log" && !em.state.isLogTabVisible) {
    tab = "summary";
  }
  em.state.activeTab = tab;
  em.updateTabVisibility();
  em.schedulePanelUiStatePersist();
};

em.setStatus = function (text) {
  if (em.panelEls && em.panelEls.footer) {
    em.panelEls.footer.textContent = text;
  }
};

em.setScanningUi = function (isScanning) {
  if (!em.panelEls || !em.panelEls.root) return;
  em.panelEls.root.classList.toggle("ep-scanning", !!isScanning);
};

em.clearLocalData = async function (scope = "all") {
  if (em.panelUiStatePersistTimer) {
    window.clearTimeout(em.panelUiStatePersistTimer);
    em.panelUiStatePersistTimer = null;
  }

  if (scope === "data") {
    await em.storageRemove([
      em.STORAGE_KEYS.SNAPSHOT,
      em.STORAGE_KEYS.LOG,
      em.STORAGE_KEYS.KNOWN_IDS,
      em.STORAGE_KEYS.ARCHIVED,
      em.STORAGE_KEYS.PINNED,
      em.STORAGE_KEYS.NOTIFIED_UPCOMING,
      em.STORAGE_KEYS.LAST_URGENCY_BY_ID,
      em.STORAGE_KEYS.READ_CONTENT_IDS
    ]);
    em.state.pending = [];
    em.state.logs = [];
    em.state.archivedIds = new Set();
    em.state.pinnedIds = new Set();
    em.state.contentExpandedIds = new Set();
    em.state.readContentIds = new Set();
    em.state.notifiedUpcomingIds = new Set();
    em.state.lastUpdatedAt = null;
    if (em.panelEls && em.panelEls.subtitle) {
      em.panelEls.subtitle.textContent = em.t("last_read") + ": " + em.t("never");
    }
    em.renderPending([]);
    em.renderLogs([]);
    await em.syncBadge(0, 0, 0);
    em.setStatus(em.t("config_clear_done_data"));
    return;
  }

  await em.storageClear();
  await em.preferencesClear(em.PREFERENCE_STORAGE_KEYS);

  em.state.pending = [];
  em.state.logs = [];
  em.state.archivedIds = new Set();
  em.state.pinnedIds = new Set();
  em.state.contentExpandedIds = new Set();
  em.state.contentFileLocationCache = new Map();
  em.state.readContentIds = new Set();
  em.state.notifiedUpcomingIds = new Set();
  em.state.lastUpdatedAt = null;
  em.state.isArchiveView = false;
  em.state.activeTab = "summary";
  em.state.filters = {
    query: "",
    course: "all",
    urgency: "all",
    dateRange: "all",
    sort: "deadline"
  };
  em.state.contentFilters = {
    type: "all",
    module: "all",
    sort: "newest"
  };

  em.stopAutoRefresh();
  em.state.reminderMode = "staggered";
  em.state.quietHours = { start: "", end: "" };
  em.state.isLogTabVisible = true;
  em.state.isFiltersCompact = true;
  em.state.customTheme = { ...em.DEFAULT_CUSTOM_THEME };
  em.state.panelSize = "normal";
  em.state.deliveryAnimation = "cycle";
  if (em.resetPersonalization) em.resetPersonalization();
  em.setPanelCollapsed(true, false);

  if (em.panelEls) {
    em.panelEls.root.classList.remove(...em.PANEL_THEME_CLASSES);
    em.panelEls.root.classList.remove("ep-filters-compact");
    em.panelEls.root.classList.remove("ep-archive-view");
    if (em.panelEls.filterQuery) em.panelEls.filterQuery.value = "";
    if (em.panelEls.filterCourse) em.panelEls.filterCourse.value = "all";
    if (em.panelEls.filterUrgency) em.panelEls.filterUrgency.value = "all";
    if (em.panelEls.filterDate) em.panelEls.filterDate.value = "all";
    if (em.panelEls.filterTaskSort) em.panelEls.filterTaskSort.value = "deadline";
    if (em.panelEls.filterContentType) em.panelEls.filterContentType.value = "all";
    if (em.panelEls.filterContentModule) em.panelEls.filterContentModule.value = "all";
    if (em.panelEls.filterContentSort) em.panelEls.filterContentSort.value = "newest";
    if (em.panelEls.customBaseThemeSelect) em.panelEls.customBaseThemeSelect.value = "";
    if (em.panelEls.reminderSelect) em.panelEls.reminderSelect.value = "staggered";
    if (em.panelEls.quietStartSelect) em.panelEls.quietStartSelect.value = "";
    if (em.panelEls.quietEndSelect) em.panelEls.quietEndSelect.value = "";
    if (em.panelEls.deliveryAnimationSelect) em.panelEls.deliveryAnimationSelect.value = "cycle";
    if (em.panelEls.panelSizeSelect) em.panelEls.panelSizeSelect.value = "normal";
    if (em.panelEls.logVisibilitySelect) em.panelEls.logVisibilitySelect.value = "visible";
    if (em.panelEls.langSelect) em.panelEls.langSelect.value = "es";
    if (em.panelEls.subtitle) em.panelEls.subtitle.textContent = em.t("last_read") + ": " + em.t("never");
  }

  em.state.lang = "es";
  if (em.applyCustomTheme) em.applyCustomTheme(em.state.customTheme);
  if (em.setPanelSize) await em.setPanelSize("normal", false);
  if (em.setDeliveryAnimation) await em.setDeliveryAnimation("cycle", false);
  if (em.updateCustomThemeVisibility) em.updateCustomThemeVisibility("light");
  if (em.applyTranslations) em.applyTranslations();
  if (em.updateActiveThemeChip) em.updateActiveThemeChip("light");
  if (em.updateArchiveToggleButton) em.updateArchiveToggleButton();
  if (em.updateTabVisibility) em.updateTabVisibility();
  if (em.panelEls && em.panelEls.root) {
    em.panelEls.root.style.setProperty("--ep-font-family", 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace');
  }
  if (em.panelEls && em.panelEls.fontSelect) {
    em.panelEls.fontSelect.value = "mono";
  }
  em.renderPending([]);
  em.renderLogs([]);
  await em.syncBadge(0, 0, 0);
  em.setStatus(em.t("config_clear_done_all"));
};
