/* ══════════════════════════════════════════
   PANEL UI
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

em.toggleCollapse = function () {
  em.state.isCollapsed = !em.state.isCollapsed;
  em.panelEls.root.classList.toggle("ep-collapsed", em.state.isCollapsed);
  em.panelEls.collapseBtn.textContent = em.state.isCollapsed ? "[ + ]" : "[ - ]";
};

em.setTheme = async function (themeName) {
  em.panelEls.root.classList.remove("ep-dark-theme", "ep-hacker-theme", "ep-ocean-theme", "ep-dracula-theme", "ep-nord-theme", "ep-solarized-theme", "ep-solarizedlight-theme", "ep-gruvbox-theme", "ep-sakura-theme", "ep-lavender-theme", "ep-rosa-theme", "ep-sandia-theme", "ep-matcha-theme", "ep-moka-theme", "ep-jazmin-theme", "ep-candy-theme", "ep-aurora-theme", "ep-synthwave-theme", "ep-minimal-theme", "ep-wispr-theme", "ep-solarized-osaka-theme", "ep-olivia-theme", "ep-passion-fruit-theme");
  if (themeName !== "light") {
    em.panelEls.root.classList.add("ep-" + themeName + "-theme");
  }
  const payload = {};
  payload[em.STORAGE_KEYS.THEME] = themeName;
  await em.storageSet(payload);
  em.updateActiveThemeChip(themeName);
};

em.updateActiveThemeChip = function (themeName) {
  if (!em.panelEls || !em.panelEls.themeChips) return;
  em.panelEls.themeChips.forEach((chip) => {
    chip.classList.toggle("ep-theme-chip-active", chip.dataset.theme === themeName);
  });
};

em.setFont = async function (fontKey) {
  const fonts = {
    // Coding Monospace
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fira: '"Fira Code", "Fira Mono", monospace',
    jetbrains: '"JetBrains Mono", monospace',
    cascadia: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
    hack: '"Hack", "Hack NF", monospace',
    input: '"Input Mono", "Input Mono Narrow", monospace',
    dank: '"Dank Mono", "dm", monospace',
    monolisa: '"MonoLisa", monospace',
    operator: '"Operator Mono", "Operator Mono SSm", monospace',
    'comic-mono': '"Comic Mono", "Comic Sans MS", cursive, monospace',
    
    // Modern Sans
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    roboto: '"Roboto", sans-serif',
    'open-sans': '"Open Sans", sans-serif',
    montserrat: '"Montserrat", sans-serif',

    // Others
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    system: 'system-ui, sans-serif'
  };

  const family = fonts[fontKey] || fonts.mono;
  em.panelEls.root.style.setProperty("--ep-font-family", family);
  
  if (em.panelEls.fontSelect) {
    em.panelEls.fontSelect.value = fontKey;
  }

  const payload = {};
  payload[em.STORAGE_KEYS.FONT] = fontKey;
  await em.storageSet(payload);
};

em.setLanguage = async function (lang) {
  em.state.lang = lang;
  if (em.panelEls && em.panelEls.langSelect) {
    em.panelEls.langSelect.value = lang;
  }
  const payload = {};
  payload[em.STORAGE_KEYS.LANG] = lang;
  await em.storageSet(payload);
  
  if (em.applyTranslations) em.applyTranslations();
  
  // Refresh rendering
  em.renderPending(em.state.pending);
  em.renderLogs(em.state.logs);
  
  // Refresh status bar
  const visible = em.getVisiblePending(em.state.pending);
  const data = await em.storageGet(em.STORAGE_KEYS.SNAPSHOT);
  const snapshot = data[em.STORAGE_KEYS.SNAPSHOT];
  const newCount = snapshot ? (snapshot.newCount || 0) : 0;
  const status = visible.length + " " + em.t("status_pending") + " | " + newCount + " " + em.t("status_new");
  em.setStatus(status);
};

em.filterAvailableFonts = function () {
  if (!em.panelEls || !em.panelEls.fontSelect) return;
  const options = em.panelEls.fontSelect.querySelectorAll("option");
  const fontsToCheck = {
    fira: "Fira Code",
    jetbrains: "JetBrains Mono",
    cascadia: "Cascadia Code",
    hack: "Hack",
    input: "Input Mono",
    dank: "Dank Mono",
    monolisa: "MonoLisa",
    operator: "Operator Mono",
    'comic-mono': "Comic Mono",
    roboto: "Roboto",
    'open-sans': "Open Sans",
    montserrat: "Montserrat"
  };

  options.forEach((opt) => {
    const key = opt.value;
    const fontName = fontsToCheck[key];
    if (fontName) {
      if (!em.isFontInstalled(fontName)) {
        opt.style.display = "none";
        opt.disabled = true;
      }
    }
  });

  // Ocultar optgroups vacíos
  const groups = em.panelEls.fontSelect.querySelectorAll("optgroup");
  groups.forEach((group) => {
    const visibleOptions = Array.from(group.querySelectorAll("option")).filter(o => o.style.display !== "none");
    if (visibleOptions.length === 0) {
      group.style.display = "none";
    }
  });
};

em.updateArchiveToggleButton = function () {
  if (!em.panelEls || !em.panelEls.archiveBtn) return;
  const label = em.state.isArchiveView ? em.t("archive_back") : em.t("archive_view");
  em.panelEls.archiveBtn.title = label;
  em.panelEls.archiveBtn.setAttribute("aria-label", label);
  em.panelEls.archiveBtn.innerHTML = em.state.isArchiveView ? em.ARCHIVE_BACK_HTML : em.ARCHIVE_BUTTON_HTML;
};

em.updateTabVisibility = function () {
  em.panelEls.tabButtons.forEach((btn) => {
    btn.classList.toggle("ep-tab-active", btn.dataset.tab === em.state.activeTab);
  });

  if (em.state.isArchiveView) {
    em.panelEls.pendingBody.classList.remove("ep-hidden");
    em.panelEls.overdueBody.classList.add("ep-hidden");
    em.panelEls.agendaBody.classList.add("ep-hidden");
    em.panelEls.logBody.classList.add("ep-hidden");
    em.panelEls.configBody.classList.add("ep-hidden");
    return;
  }

  em.panelEls.pendingBody.classList.toggle("ep-hidden", em.state.activeTab !== "pending");
  em.panelEls.overdueBody.classList.toggle("ep-hidden", em.state.activeTab !== "overdue");
  em.panelEls.agendaBody.classList.toggle("ep-hidden", em.state.activeTab !== "agenda");
  em.panelEls.logBody.classList.toggle("ep-hidden", em.state.activeTab !== "log");
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
  em.state.activeTab = tab;
  em.updateTabVisibility();
};

em.setStatus = function (text) {
  if (em.panelEls && em.panelEls.footer) {
    em.panelEls.footer.textContent = text;
  }
};
