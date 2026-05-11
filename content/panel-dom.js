/* ══════════════════════════════════════════
   PANEL DOM CREATION
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

em.createPanel = function () {
  const root = document.createElement("aside");
  root.id = "eminus-pending-panel";
  root.classList.add("ep-collapsed");

  const archiveBtnHtml = em.ARCHIVE_BUTTON_HTML;
  const archiveIconSvg = em.ARCHIVE_ICON_SVG;

  root.innerHTML = `
      <header class="ep-header">
        <div class="ep-brand-inline">
          <div style="display: flex; gap: 16px; align-items: center;">
            <pre class="ep-seal-art" id="ep-seal-art">
 ▒▒▒▒         ▒▒▒▒
 ▒▒▒▒▒▒▒░░░░░░▒▒▒▒
   ▒▒░░░▒▒▒░░▒▒▒░▒▒
   ▒▒▓▒▓▒░░░░▒▒▓█▓▒
  ▒░▒▓▓▓▒▒▒░░░▒▒▓▓▒▒
  ░▒▒░░░░░░▒▒▒▒▒▒▒▒▒
  ░░▒▒▒░░░▒▓▓▓▓▓▓▒▒▒
  ░░░▒░░░░░▒▓▓█▓▒▒▒▒
  ░░░░░░▒▒▒▒▒▓▓▓▓▓▓▒▒
  ░░░░░░░▒▒▓▓▓▓▓▓▓▓
  ░░░░░░▒▒▒▒▓▓▓▓▓▓▓</pre>
            <pre class="ep-miyu-text">
           _                 
 _ __ ___ (_)_   _ _   _     
 | '_ \` _ \\| | | | | | | |    
 | | | | | | | |_| | |_| |    
 |_| |_| |_|_|\\__, |\\__,_|    
              |___/ --pendientes</pre>
          </div>
        </div>
        <div class="ep-title-wrap">
          <div class="ep-title">pendientes eminus</div>
          <div class="ep-subtitle" id="ep-subtitle">Sin lectura</div>
        </div>
        <div class="ep-actions" style="position: relative;">
          <button class="ep-btn" id="ep-refresh" title="Actualizar">[ ref ]</button>
          <div class="ep-archive-stack">
            <button class="ep-btn ep-archive-btn" id="ep-archive-toggle" title="Archivadas" aria-label="Archivadas">
              ${archiveBtnHtml}
            </button>
            <button class="ep-btn" id="ep-collapse" title="Desplegar">[ + ]</button>
          </div>
        </div>
      </header>

      <div class="ep-tabs">
        <button class="ep-tab ep-tab-active" data-tab="pending">Pendientes</button>
        <button class="ep-tab" data-tab="overdue">Vencidas</button>
        <button class="ep-tab" data-tab="agenda">Agenda</button>
        <button class="ep-tab" data-tab="log">Log</button>
        <button class="ep-tab" data-tab="config">Config</button>
      </div>

      <section class="ep-body" id="ep-body-pending"></section>
      <section class="ep-body ep-hidden" id="ep-body-overdue"></section>
      <section class="ep-body ep-hidden" id="ep-body-agenda"></section>
      <section class="ep-body ep-hidden" id="ep-body-log"></section>
      <section class="ep-body ep-hidden" id="ep-body-config">
        <div class="ep-config-group">
          <label class="ep-config-label">Tema del panel</label>
          <div class="ep-theme-grid">
             <button class="ep-theme-chip" data-theme="light">Light</button>
             <button class="ep-theme-chip" data-theme="jazmin">Jazmín</button>
             <button class="ep-theme-chip" data-theme="dark">Dark</button>
             <button class="ep-theme-chip" data-theme="hacker">Hacker</button>
             <button class="ep-theme-chip" data-theme="ocean">Ocean</button>
             <button class="ep-theme-chip" data-theme="dracula">Dracula</button>
             <button class="ep-theme-chip" data-theme="nord">Nord</button>
             <button class="ep-theme-chip" data-theme="solarized">Solarized</button>
             <button class="ep-theme-chip" data-theme="solarizedlight">Solarized Light</button>
             <button class="ep-theme-chip" data-theme="gruvbox">Gruvbox</button>
             <button class="ep-theme-chip" data-theme="sakura">Sakura</button>
             <button class="ep-theme-chip" data-theme="lavender">Lavender</button>
             <button class="ep-theme-chip" data-theme="rosa">Rosa</button>
             <button class="ep-theme-chip" data-theme="sandia">Sandia</button>
             <button class="ep-theme-chip" data-theme="matcha">Matcha</button>
             <button class="ep-theme-chip" data-theme="moka">Moka</button>
             <button class="ep-theme-chip" data-theme="candy">Candy</button>
             <button class="ep-theme-chip" data-theme="aurora">Aurora</button>
             <button class="ep-theme-chip" data-theme="synthwave">Synthwave</button>
             <button class="ep-theme-chip" data-theme="minimal">Minimal</button>
             <button class="ep-theme-chip" data-theme="wispr">Wispr</button>
             <button class="ep-theme-chip" data-theme="solarized-osaka">Solarized Osaka</button>
             <button class="ep-theme-chip" data-theme="olivia">Olivia</button>
             <button class="ep-theme-chip" data-theme="passion-fruit">Passion Fruit</button>
           </div>
        </div>

        <div class="ep-config-row">
          <div class="ep-config-group">
            <label class="ep-config-label">Auto-refresh</label>
            <select class="ep-config-select ep-autorefresh-select" id="ep-autorefresh">
              <option value="0">desactivado</option>
              <option value="1">cada 1 min</option>
              <option value="5">cada 5 min</option>
              <option value="10">cada 10 min</option>
              <option value="15">cada 15 min</option>
              <option value="30">cada 30 min</option>
            </select>
          </div>

          <div class="ep-config-group">
            <label class="ep-config-label">Avisos preventivos</label>
            <select class="ep-config-select ep-autorefresh-select" id="ep-reminder">
              <option value="0">desactivado</option>
              <option value="1">1 hora antes</option>
              <option value="3">3 horas antes</option>
              <option value="6">6 horas antes</option>
              <option value="12">12 horas antes</option>
              <option value="24">24 horas antes</option>
              <option value="48">48 horas antes</option>
            </select>
          </div>
        </div>

        <div class="ep-config-group">
          <label class="ep-config-label">Fuente de la interfaz</label>
          <select class="ep-config-select" id="ep-font">
            <optgroup label="Coding Fonts (Monospace)">
              <option value="mono">Default Mono</option>
              <option value="fira">Fira Code</option>
              <option value="jetbrains">JetBrains Mono</option>
              <option value="cascadia">Cascadia Code</option>
              <option value="hack">Hack Mono</option>
              <option value="input">Input Mono</option>
              <option value="dank">Dank Mono</option>
              <option value="monolisa">MonoLisa</option>
              <option value="operator">Operator Mono</option>
              <option value="comic-mono">Comic Mono</option>
            </optgroup>
            <optgroup label="Modern Sans">
              <option value="sans">Inter / Standard Sans</option>
              <option value="roboto">Roboto</option>
              <option value="open-sans">Open Sans</option>
              <option value="montserrat">Montserrat</option>
            </optgroup>
            <optgroup label="Other">
              <option value="serif">Classic Serif</option>
              <option value="system">System Native</option>
            </optgroup>
          </select>
        </div>
        <div class="ep-config-group">
          <label class="ep-config-label" id="ep-lang-label">Idioma</label>
          <select class="ep-config-select" id="ep-lang">
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </section>

      <footer class="ep-footer" id="ep-footer-status">Listo</footer>
      <img class="ep-jazmin-bg" id="ep-jazmin-bg" src="" alt="" />
    `;

  document.body.appendChild(root);

  const jazminBg = root.querySelector("#ep-jazmin-bg");
  if (jazminBg) {
    jazminBg.src = browser.runtime.getURL("jazmin.png");
  }

  em.panelEls = {
    root,
    subtitle: root.querySelector("#ep-subtitle"),
    sealArt: root.querySelector("#ep-seal-art"),
    header: root.querySelector(".ep-header"),
    refreshBtn: root.querySelector("#ep-refresh"),
    autoRefreshSelect: root.querySelector("#ep-autorefresh"),
    reminderSelect: root.querySelector("#ep-reminder"),
    fontSelect: root.querySelector("#ep-font"),
    langSelect: root.querySelector("#ep-lang"),
    archiveBtn: root.querySelector("#ep-archive-toggle"),
    collapseBtn: root.querySelector("#ep-collapse"),
    tabButtons: root.querySelectorAll(".ep-tab"),
    pendingBody: root.querySelector("#ep-body-pending"),
    overdueBody: root.querySelector("#ep-body-overdue"),
    agendaBody: root.querySelector("#ep-body-agenda"),
    logBody: root.querySelector("#ep-body-log"),
    configBody: root.querySelector("#ep-body-config"),
    themeChips: root.querySelectorAll(".ep-theme-chip"),
    footer: root.querySelector("#ep-footer-status"),
    jazminBg: root.querySelector("#ep-jazmin-bg"),
    
    // Labels for i18n
    themeLabel: root.querySelector(".ep-config-group:nth-child(1) .ep-config-label"),
    autorefreshLabel: root.querySelector("#ep-autorefresh").previousElementSibling,
    reminderLabel: root.querySelector("#ep-reminder").previousElementSibling,
    fontLabel: root.querySelector("#ep-font").previousElementSibling,
    langLabel: root.querySelector("#ep-lang-label")
  };

  em.panelEls.refreshBtn.addEventListener("click", () => em.scanPending());
  em.panelEls.autoRefreshSelect.addEventListener("change", (e) => {
    const minutes = parseInt(e.target.value, 10);
    em.setAutoRefresh(minutes);
  });
  em.panelEls.reminderSelect.addEventListener("change", (e) => {
    const hours = parseInt(e.target.value, 10);
    em.setReminderHours(hours);
  });
  em.panelEls.fontSelect.addEventListener("change", (e) => {
    em.setFont(e.target.value);
  });
  em.panelEls.langSelect.addEventListener("change", (e) => {
    if (em.setLanguage) em.setLanguage(e.target.value);
  });
  em.panelEls.themeChips.forEach((chip) => {
    chip.addEventListener("click", () => em.setTheme(chip.dataset.theme));
  });
  em.panelEls.archiveBtn.addEventListener("click", em.toggleArchiveView);
  em.panelEls.collapseBtn.addEventListener("click", em.toggleCollapse);
  em.panelEls.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => em.setTab(btn.dataset.tab));
  });

  document.addEventListener("click", (e) => {
    // No longer need theme menu click-outside logic
  });

  em.updateArchiveToggleButton();
  if (em.applyTranslations) em.applyTranslations();
  em.setupPanelDrag();
  em.filterAvailableFonts();
};
