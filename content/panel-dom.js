window.eminus = window.eminus || {};

var em = window.eminus;

em.createPanel = function () {
  const root = document.createElement("aside");
  root.id = "eminus-pending-panel";
  root.classList.add("ep-collapsed");

  const archiveBtnHtml = em.ARCHIVE_BUTTON_HTML;
  const themeChipsHtml = em.THEMES
    .map((theme) => `<button class="ep-theme-chip" data-theme="${theme.id}" aria-pressed="false">${theme.label}</button>`)
    .join("\n            ");
  const themeOptionsHtml = em.THEMES
    .map((theme) => `<option value="${theme.id}">${theme.label}</option>`)
    .join("\n              ");
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
          <div class="ep-personal-greeting ep-hidden" id="ep-personal-greeting"></div>
          <div class="ep-personal-title-row">
            <span class="ep-personal-symbol ep-hidden" id="ep-personal-symbol"></span>
            <div class="ep-title">pendientes eminus</div>
            <span class="ep-scan-spinner" aria-hidden="true">◐</span>
          </div>
          <div class="ep-subtitle" id="ep-subtitle">Sin lectura</div>
        </div>
        <div class="ep-collapsed-summary" id="ep-collapsed-summary"></div>
        <div class="ep-actions">
          <button class="ep-btn" id="ep-refresh" title="Actualizar">[ actualizar ]</button>
          <button class="ep-btn ep-archive-btn" id="ep-archive-toggle" title="Archivadas" aria-label="Archivadas">
            ${archiveBtnHtml}
          </button>
          <button class="ep-btn" id="ep-collapse" title="Minimizar">[ minimizar ]</button>
        </div>
      </header>

      <div class="ep-tabs" role="tablist">
        <button class="ep-tab ep-tab-active" data-tab="summary" role="tab" aria-selected="true">Resumen</button>
        <select class="ep-tab ep-config-select ep-task-view-select" id="ep-task-view" aria-label="Vista de pendientes">
          <option value="" disabled>Pendientes</option>
          <option value="pending">Todos</option>
          <option value="today">Hoy</option>
          <option value="overdue">Vencidas</option>
        </select>
        <button class="ep-tab" data-tab="agenda" role="tab" aria-selected="false">Agenda</button>
        <button class="ep-tab" data-tab="content" role="tab" aria-selected="false">Contenido</button>
        <button class="ep-tab" data-tab="log" role="tab" aria-selected="false">Log</button>
        <button class="ep-tab" data-tab="config" role="tab" aria-selected="false">Config</button>
      </div>

      <section class="ep-filters" id="ep-filters">
        <div class="ep-filters-head">
          <button class="ep-btn ep-filter-action-btn" id="ep-export-week" type="button">[ calendario ]</button>
          <button class="ep-btn ep-filter-action-btn" id="ep-unpin-all" type="button">[ desfijar ]</button>
          <button class="ep-btn ep-filter-action-btn" id="ep-archive-all-overdue" type="button">[ archivar vencidas ]</button>
          <button class="ep-btn ep-filter-clear-btn" id="ep-filter-clear" type="button">[ limpiar ]</button>
          <button class="ep-btn ep-filter-compact-btn" id="ep-filter-compact" type="button">[ compactar ]</button>
        </div>
        <div class="ep-filters-grid">
          <input type="text" id="ep-filter-query" class="ep-config-select ep-filter-input" placeholder="buscar tarea o curso" />
          <select id="ep-filter-course" class="ep-config-select">
            <option value="all">todos los cursos</option>
          </select>
          <select id="ep-filter-urgency" class="ep-config-select">
            <option value="all">todas las urgencias</option>
            <option value="overdue">vencidas</option>
            <option value="imminent">inminentes (&lt;24h)</option>
            <option value="urgent">urgentes (&lt;48h)</option>
            <option value="normal">normales</option>
          </select>
          <select id="ep-filter-date" class="ep-config-select">
            <option value="all">cualquier fecha</option>
            <option value="today">vence hoy</option>
            <option value="3d">próximos 3 días</option>
            <option value="7d">próximos 7 días</option>
            <option value="30d">próximos 30 días</option>
            <option value="nodate">sin fecha</option>
            <option value="overdue">ya vencidas</option>
          </select>
          <select id="ep-filter-task-sort" class="ep-config-select ep-task-filter">
            <option value="deadline">ordenar por fecha</option>
            <option value="urgency">ordenar por urgencia</option>
            <option value="course">ordenar por curso</option>
            <option value="title">ordenar por título</option>
          </select>
          <select id="ep-filter-content-type" class="ep-config-select ep-content-filter">
            <option value="all">todo contenido</option>
            <option value="unit">módulos</option>
            <option value="element">mensajes</option>
            <option value="files">archivos</option>
          </select>
          <select id="ep-filter-content-module" class="ep-config-select ep-content-filter">
            <option value="all">todos los módulos</option>
          </select>
          <select id="ep-filter-content-sort" class="ep-config-select ep-content-filter">
            <option value="newest">más reciente</option>
            <option value="oldest">más antiguo</option>
            <option value="course">por curso</option>
            <option value="module">por módulo</option>
            <option value="title">por título</option>
          </select>
        </div>
      </section>

      <section class="ep-body" id="ep-body-summary" role="tabpanel"></section>
      <section class="ep-body ep-hidden" id="ep-body-today" role="tabpanel"></section>
      <section class="ep-body ep-hidden" id="ep-body-pending" role="tabpanel"></section>
      <section class="ep-body ep-hidden" id="ep-body-overdue" role="tabpanel"></section>
      <section class="ep-body ep-hidden" id="ep-body-agenda" role="tabpanel"></section>
      <section class="ep-body ep-hidden" id="ep-body-content" role="tabpanel"></section>
      <section class="ep-body ep-hidden" id="ep-body-log" role="tabpanel"></section>
      <section class="ep-body ep-hidden" id="ep-body-config">
        <details class="ep-config-section ep-config-personal" name="ep-config-sections" open>
          <summary><span class="ep-config-summary-title" id="ep-config-personal-summary">Personalización</span><span class="ep-config-summary-hint" id="ep-config-personal-hint">saludo, apodo y materias</span></summary>
          <div class="ep-config-group">
            <label class="ep-config-label" id="ep-nickname-label" for="ep-nickname">Cómo quieres que te salude Miyu</label>
            <input class="ep-config-select" id="ep-nickname" type="text" maxlength="32" placeholder="Tu apodo" />
          </div>
          <div class="ep-config-row">
            <div class="ep-config-group">
              <label class="ep-config-label" id="ep-panel-name-label" for="ep-panel-name">Nombre del panel</label>
              <input class="ep-config-select" id="ep-panel-name" type="text" maxlength="32" placeholder="pendientes eminus" />
            </div>
            <div class="ep-config-group">
              <label class="ep-config-label" id="ep-personal-symbol-label" for="ep-personal-symbol-select">Símbolo personal</label>
              <select class="ep-config-select" id="ep-personal-symbol-select">
                <option value="">sin símbolo</option>
                <option value="★">★</option>
                <option value="✦">✦</option>
                <option value="☕">☕</option>
                <option value="♡">♡</option>
                <option value="✓">✓</option>
              </select>
            </div>
          </div>
          <div class="ep-config-group">
            <label class="ep-config-label" id="ep-empty-message-label" for="ep-empty-message">Mensaje cuando terminas todo</label>
            <input class="ep-config-select" id="ep-empty-message" type="text" maxlength="100" placeholder="Hoy ya está resuelto." />
          </div>
          <div class="ep-config-group">
            <label class="ep-config-label" id="ep-today-order-label" for="ep-today-order">Orden de la vista Hoy</label>
            <select class="ep-config-select" id="ep-today-order">
              <option value="smart">prioridad inteligente</option>
              <option value="deadline">fecha de entrega</option>
              <option value="course">materia</option>
            </select>
          </div>
          <div class="ep-config-group">
            <label class="ep-config-label" id="ep-course-preferences-label">Tus materias</label>
            <div class="ep-course-preferences" id="ep-course-preferences"></div>
          </div>
        </details>

        <details class="ep-config-section ep-config-appearance" name="ep-config-sections">
          <summary><span class="ep-config-summary-title" id="ep-config-appearance-summary">Apariencia</span><span class="ep-config-summary-hint" id="ep-config-appearance-hint">temas y colores</span></summary>
        <div class="ep-config-group">
          <label class="ep-config-label" id="ep-theme-label">Tema del panel</label>
          <div class="ep-theme-grid">
            ${themeChipsHtml}
            <button class="ep-theme-chip" data-theme="custom" aria-pressed="false">Personalizado</button>
          </div>
        </div>

        <div class="ep-config-group ep-custom-theme-controls ep-hidden" id="ep-custom-theme-controls">
          <label class="ep-config-label">Tema personalizado</label>
          <div class="ep-custom-base-row">
            <label class="ep-custom-base-label" for="ep-custom-base-theme">Tomar como base</label>
            <select class="ep-config-select" id="ep-custom-base-theme">
              <option value="">elige un tema...</option>
              ${themeOptionsHtml}
            </select>
          </div>
          <div class="ep-custom-theme-grid">
            <label class="ep-color-field">Fondo <input type="color" id="ep-custom-bg" value="#ffffff" /></label>
            <label class="ep-color-field">Texto <input type="color" id="ep-custom-text" value="#111111" /></label>
            <label class="ep-color-field">Borde <input type="color" id="ep-custom-border" value="#111111" /></label>
            <label class="ep-color-field">Acento <input type="color" id="ep-custom-accent" value="#6c5ce7" /></label>
            <label class="ep-color-field">Vencida <input type="color" id="ep-custom-overdue" value="#e74c3c" /></label>
            <label class="ep-color-field">Inminente <input type="color" id="ep-custom-imminent" value="#f1c40f" /></label>
            <label class="ep-color-field">Urgente <input type="color" id="ep-custom-urgent" value="#e67e22" /></label>
          </div>
        </div>
        </details>

        <details class="ep-config-section ep-config-daily" name="ep-config-sections">
        <summary><span class="ep-config-summary-title" id="ep-config-daily-summary">Uso diario</span><span class="ep-config-summary-hint" id="ep-config-daily-hint">actualización y avisos</span></summary>
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
              <option value="staggered">escalonados: 48h, 24h, 6h y 1h</option>
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
          <label class="ep-config-label" id="ep-quiet-hours-label">Horas silenciosas</label>
          <div class="ep-config-row">
            <select class="ep-config-select" id="ep-quiet-start">
              <option value="">inicio: sin horario</option>
            </select>
            <select class="ep-config-select" id="ep-quiet-end">
              <option value="">fin: sin horario</option>
            </select>
          </div>
        </div>
        <div class="ep-config-group">
          <label class="ep-config-label" id="ep-notification-preferences-label">Qué quieres recibir</label>
          <div class="ep-preference-checks">
            <label><input type="checkbox" id="ep-notify-new-tasks" checked /> <span id="ep-notify-new-tasks-text">tareas nuevas</span></label>
            <label><input type="checkbox" id="ep-notify-new-content" checked /> <span id="ep-notify-new-content-text">contenido nuevo</span></label>
            <label><input type="checkbox" id="ep-notify-overdue" checked /> <span id="ep-notify-overdue-text">tareas vencidas</span></label>
            <label><input type="checkbox" id="ep-notify-reminders" checked /> <span id="ep-notify-reminders-text">recordatorios próximos</span></label>
          </div>
        </div>
        </details>

        <details class="ep-config-section ep-config-interface" name="ep-config-sections">
        <summary><span class="ep-config-summary-title" id="ep-config-interface-summary">Interfaz</span><span class="ep-config-summary-hint" id="ep-config-interface-hint">fuente, tamaño e idioma</span></summary>
        <div class="ep-config-row">
          <div class="ep-config-group">
            <label class="ep-config-label">Animación de entrega</label>
            <select class="ep-config-select" id="ep-delivery-animation">
              <option value="cycle">rotar animaciones</option>
              <option value="off">desactivada</option>
              <option value="confetti">confetti</option>
              <option value="abduction">ovni</option>
              <option value="teams">disco</option>
              <option value="pinata">piñata</option>
            </select>
          </div>
          <div class="ep-config-group">
            <label class="ep-config-label">Fuente de la interfaz</label>
            <select class="ep-config-select" id="ep-font">
              <option value="mono">Monoespaciada</option>
              <option value="sans">Sans serif</option>
              <option value="serif">Serif</option>
              <option value="system">Sistema</option>
            </select>
          </div>
        </div>
        <div class="ep-config-row">
          <div class="ep-config-group">
            <label class="ep-config-label">Tamaño del panel</label>
            <select class="ep-config-select" id="ep-panel-size">
              <option value="compact">compacto</option>
              <option value="normal">normal</option>
              <option value="wide">ancho</option>
            </select>
          </div>
          <div class="ep-config-group">
            <label class="ep-config-label" id="ep-log-visibility-label">Apartado de log</label>
            <select class="ep-config-select" id="ep-log-visibility">
              <option value="visible">visible</option>
              <option value="removed">oculto</option>
            </select>
          </div>
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
        <div class="ep-config-group ep-shortcuts-hint" id="ep-shortcuts-hint"></div>
        </details>

        <details class="ep-config-section ep-config-danger" name="ep-config-sections">
          <summary><span class="ep-config-summary-title" id="ep-config-danger-summary">Datos y preferencias</span><span class="ep-config-summary-hint" id="ep-config-danger-hint">borrar y reiniciar</span></summary>
        <div class="ep-config-group">
          <button class="ep-btn ep-clear-data-btn" id="ep-clear-snapshot" type="button">Borrar datos de lectura</button>
          <button class="ep-btn ep-clear-data-btn ep-clear-data-danger" id="ep-clear-all" type="button">Borrar todo (datos + preferencias)</button>
        </div>
        </details>
      </section>

      <footer class="ep-footer" id="ep-footer-status" role="status" aria-live="polite">Listo</footer>
      <img class="ep-jazmin-bg" id="ep-jazmin-bg" src="" alt="" />
    `;

  document.body.appendChild(root);

  const jazminBg = root.querySelector("#ep-jazmin-bg");
  if (jazminBg) {
    jazminBg.src = chrome.runtime.getURL("jazmin.png");
  }

  em.panelEls = {
    root,
    subtitle: root.querySelector("#ep-subtitle"),
    title: root.querySelector(".ep-title"),
    personalGreeting: root.querySelector("#ep-personal-greeting"),
    personalSymbol: root.querySelector("#ep-personal-symbol"),
    collapsedSummary: root.querySelector("#ep-collapsed-summary"),
    sealArt: root.querySelector("#ep-seal-art"),
    header: root.querySelector(".ep-header"),
    refreshBtn: root.querySelector("#ep-refresh"),
    autoRefreshSelect: root.querySelector("#ep-autorefresh"),
    reminderSelect: root.querySelector("#ep-reminder"),
    quietStartSelect: root.querySelector("#ep-quiet-start"),
    quietEndSelect: root.querySelector("#ep-quiet-end"),
    deliveryAnimationSelect: root.querySelector("#ep-delivery-animation"),
    fontSelect: root.querySelector("#ep-font"),
    panelSizeSelect: root.querySelector("#ep-panel-size"),
    logVisibilitySelect: root.querySelector("#ep-log-visibility"),
    langSelect: root.querySelector("#ep-lang"),
    nicknameInput: root.querySelector("#ep-nickname"),
    panelNameInput: root.querySelector("#ep-panel-name"),
    personalSymbolSelect: root.querySelector("#ep-personal-symbol-select"),
    emptyMessageInput: root.querySelector("#ep-empty-message"),
    todayOrderSelect: root.querySelector("#ep-today-order"),
    coursePreferencesList: root.querySelector("#ep-course-preferences"),
    nicknameLabel: root.querySelector("#ep-nickname-label"),
    panelNameLabel: root.querySelector("#ep-panel-name-label"),
    personalSymbolLabel: root.querySelector("#ep-personal-symbol-label"),
    emptyMessageLabel: root.querySelector("#ep-empty-message-label"),
    todayOrderLabel: root.querySelector("#ep-today-order-label"),
    coursePreferencesLabel: root.querySelector("#ep-course-preferences-label"),
    notificationPreferencesLabel: root.querySelector("#ep-notification-preferences-label"),
    notificationPreferenceTexts: {
      newTasks: root.querySelector("#ep-notify-new-tasks-text"),
      newContent: root.querySelector("#ep-notify-new-content-text"),
      overdue: root.querySelector("#ep-notify-overdue-text"),
      reminders: root.querySelector("#ep-notify-reminders-text")
    },
    notificationPreferenceInputs: {
      newTasks: root.querySelector("#ep-notify-new-tasks"),
      newContent: root.querySelector("#ep-notify-new-content"),
      overdue: root.querySelector("#ep-notify-overdue"),
      reminders: root.querySelector("#ep-notify-reminders")
    },
    customThemeControls: root.querySelector("#ep-custom-theme-controls"),
    customBaseThemeSelect: root.querySelector("#ep-custom-base-theme"),
    customColorInputs: {
      bg: root.querySelector("#ep-custom-bg"),
      text: root.querySelector("#ep-custom-text"),
      border: root.querySelector("#ep-custom-border"),
      accent: root.querySelector("#ep-custom-accent"),
      overdue: root.querySelector("#ep-custom-overdue"),
      imminent: root.querySelector("#ep-custom-imminent"),
      urgent: root.querySelector("#ep-custom-urgent")
    },
    archiveBtn: root.querySelector("#ep-archive-toggle"),
    collapseBtn: root.querySelector("#ep-collapse"),
    tabButtons: root.querySelectorAll(".ep-tab[data-tab]"),
    taskTab: root.querySelector(".ep-task-view-select"),
    filtersWrap: root.querySelector("#ep-filters"),
    taskViewSelect: root.querySelector("#ep-task-view"),
    filterCompactBtn: root.querySelector("#ep-filter-compact"),
    filterClearBtn: root.querySelector("#ep-filter-clear"),
    filterQuery: root.querySelector("#ep-filter-query"),
    filterCourse: root.querySelector("#ep-filter-course"),
    filterUrgency: root.querySelector("#ep-filter-urgency"),
    filterDate: root.querySelector("#ep-filter-date"),
    filterTaskSort: root.querySelector("#ep-filter-task-sort"),
    contentFilters: root.querySelectorAll(".ep-content-filter"),
    filterContentType: root.querySelector("#ep-filter-content-type"),
    filterContentModule: root.querySelector("#ep-filter-content-module"),
    filterContentSort: root.querySelector("#ep-filter-content-sort"),
    summaryBody: root.querySelector("#ep-body-summary"),
    todayBody: root.querySelector("#ep-body-today"),
    pendingBody: root.querySelector("#ep-body-pending"),
    overdueBody: root.querySelector("#ep-body-overdue"),
    agendaBody: root.querySelector("#ep-body-agenda"),
    contentBody: root.querySelector("#ep-body-content"),
    logBody: root.querySelector("#ep-body-log"),
    configBody: root.querySelector("#ep-body-config"),
    clearSnapshotBtn: root.querySelector("#ep-clear-snapshot"),
    clearAllBtn: root.querySelector("#ep-clear-all"),
    shortcutsHint: root.querySelector("#ep-shortcuts-hint"),
    archiveAllOverdueBtn: root.querySelector("#ep-archive-all-overdue"),
    unpinAllBtn: root.querySelector("#ep-unpin-all"),
    exportWeekBtn: root.querySelector("#ep-export-week"),
    themeChips: root.querySelectorAll(".ep-theme-chip"),
    footer: root.querySelector("#ep-footer-status"),
    jazminBg: root.querySelector("#ep-jazmin-bg"),
    
    themeLabel: root.querySelector("#ep-theme-label"),
    autorefreshLabel: root.querySelector("#ep-autorefresh").previousElementSibling,
    reminderLabel: root.querySelector("#ep-reminder").previousElementSibling,
    quietHoursLabel: root.querySelector("#ep-quiet-hours-label"),
    deliveryAnimationLabel: root.querySelector("#ep-delivery-animation").previousElementSibling,
    fontLabel: root.querySelector("#ep-font").previousElementSibling,
    panelSizeLabel: root.querySelector("#ep-panel-size").previousElementSibling,
    logVisibilityLabel: root.querySelector("#ep-log-visibility-label"),
    langLabel: root.querySelector("#ep-lang-label"),
    filterQueryPlaceholder: root.querySelector("#ep-filter-query"),
    filterCourseSelect: root.querySelector("#ep-filter-course"),
    filterUrgencySelect: root.querySelector("#ep-filter-urgency"),
    filterDateSelect: root.querySelector("#ep-filter-date"),
    filterTaskSortSelect: root.querySelector("#ep-filter-task-sort")
  };
  em.panelEls.configDailySummary = root.querySelector("#ep-config-daily-summary");
  em.panelEls.configPersonalSummary = root.querySelector("#ep-config-personal-summary");
  em.panelEls.configAppearanceSummary = root.querySelector("#ep-config-appearance-summary");
  em.panelEls.configInterfaceSummary = root.querySelector("#ep-config-interface-summary");
  em.panelEls.configDangerSummary = root.querySelector("#ep-config-danger-summary");
  em.panelEls.configDailyHint = root.querySelector("#ep-config-daily-hint");
  em.panelEls.configPersonalHint = root.querySelector("#ep-config-personal-hint");
  em.panelEls.configAppearanceHint = root.querySelector("#ep-config-appearance-hint");
  em.panelEls.configInterfaceHint = root.querySelector("#ep-config-interface-hint");
  em.panelEls.configDangerHint = root.querySelector("#ep-config-danger-hint");

  const hourOptions = Array.from({ length: 24 }, (_, hour) => {
    const value = String(hour);
    const label = String(hour).padStart(2, "0") + ":00";
    return `<option value="${value}">${label}</option>`;
  }).join("");
  em.panelEls.quietStartSelect.insertAdjacentHTML("beforeend", hourOptions);
  em.panelEls.quietEndSelect.insertAdjacentHTML("beforeend", hourOptions);

  em.panelEls.refreshBtn.addEventListener("click", () => em.scanPendingWhenTokenReady());
  em.panelEls.autoRefreshSelect.addEventListener("change", (e) => {
    const minutes = parseInt(e.target.value, 10);
    em.setAutoRefresh(minutes);
  });
  em.panelEls.reminderSelect.addEventListener("change", (e) => {
    em.setReminderMode(e.target.value);
  });
  em.panelEls.quietStartSelect.addEventListener("change", () => {
    em.setQuietHours(em.panelEls.quietStartSelect.value, em.panelEls.quietEndSelect.value);
  });
  em.panelEls.quietEndSelect.addEventListener("change", () => {
    em.setQuietHours(em.panelEls.quietStartSelect.value, em.panelEls.quietEndSelect.value);
  });
  em.panelEls.deliveryAnimationSelect.addEventListener("change", (e) => {
    if (em.setDeliveryAnimation) em.setDeliveryAnimation(e.target.value);
  });
  em.panelEls.fontSelect.addEventListener("change", (e) => {
    em.setFont(e.target.value);
  });
  em.panelEls.panelSizeSelect.addEventListener("change", (e) => {
    if (em.setPanelSize) em.setPanelSize(e.target.value);
  });
  em.panelEls.customBaseThemeSelect.addEventListener("change", (e) => {
    if (em.setCustomThemeFromBase) em.setCustomThemeFromBase(e.target.value);
  });
  Object.keys(em.panelEls.customColorInputs).forEach((key) => {
    const input = em.panelEls.customColorInputs[key];
    if (!input) return;
    input.addEventListener("input", () => {
      if (em.updateCustomThemeFromInputs) em.updateCustomThemeFromInputs(true);
    });
  });
  em.panelEls.logVisibilitySelect.addEventListener("change", (e) => {
    if (em.setLogTabVisible) em.setLogTabVisible(e.target.value !== "removed");
  });
  em.panelEls.langSelect.addEventListener("change", (e) => {
    if (em.setLanguage) em.setLanguage(e.target.value);
  });
  em.panelEls.nicknameInput.addEventListener("change", (e) => {
    if (em.setNickname) em.setNickname(e.target.value);
  });
  em.panelEls.panelNameInput.addEventListener("change", (e) => {
    if (em.setPanelName) em.setPanelName(e.target.value);
  });
  em.panelEls.personalSymbolSelect.addEventListener("change", (e) => {
    if (em.setPersonalSymbol) em.setPersonalSymbol(e.target.value);
  });
  em.panelEls.emptyMessageInput.addEventListener("change", (e) => {
    if (em.setEmptyMessage) em.setEmptyMessage(e.target.value);
  });
  em.panelEls.todayOrderSelect.addEventListener("change", (e) => {
    if (em.setTodayOrder) em.setTodayOrder(e.target.value);
  });
  Object.entries(em.panelEls.notificationPreferenceInputs).forEach(([key, input]) => {
    input.addEventListener("change", () => {
      if (em.setNotificationPreference) em.setNotificationPreference(key, input.checked);
    });
  });
  const armTwoStepConfirm = (button, onConfirm) => {
    if (button.dataset.armed === "1") {
      delete button.dataset.armed;
      button.classList.remove("ep-clear-armed");
      onConfirm();
      return;
    }
    Object.values(clearButtons).forEach((other) => {
      if (other && other !== button) {
        delete other.dataset.armed;
        other.classList.remove("ep-clear-armed");
        other.textContent = other.dataset.originalLabel || other.textContent;
      }
    });
    button.dataset.armed = "1";
    button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
    button.classList.add("ep-clear-armed");
    button.textContent = em.t("config_clear_confirm_arm");
    window.clearTimeout(button._disarmTimer);
    button._disarmTimer = window.setTimeout(() => {
      if (button.dataset.armed === "1") {
        delete button.dataset.armed;
        button.classList.remove("ep-clear-armed");
        button.textContent = button.dataset.originalLabel;
      }
    }, 6000);
  };

  const clearButtons = {
    data: em.panelEls.clearSnapshotBtn,
    all: em.panelEls.clearAllBtn
  };
  clearButtons.data.addEventListener("click", () => {
    armTwoStepConfirm(clearButtons.data, () => em.clearLocalData("data"));
  });
  clearButtons.all.addEventListener("click", () => {
    armTwoStepConfirm(clearButtons.all, () => em.clearLocalData("all"));
  });
  em.panelEls.themeChips.forEach((chip) => {
    chip.addEventListener("click", () => em.setTheme(chip.dataset.theme));
  });
  em.panelEls.archiveBtn.addEventListener("click", em.toggleArchiveView);
  em.panelEls.collapseBtn.addEventListener("click", em.toggleCollapse);
  em.panelEls.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => em.setTab(btn.dataset.tab));
  });
  em.panelEls.taskViewSelect.addEventListener("change", (event) => {
    em.setTab(event.target.value);
  });
  em.panelEls.filterQuery.addEventListener("input", (e) => {
    em.state.filters.query = String(e.target.value || "");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterQuery.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    if (em.panelEls.filterQuery.value) {
      em.panelEls.filterQuery.value = "";
      em.state.filters.query = "";
      em.updateFilterClearButton();
      em.schedulePanelUiStatePersist();
      em.renderPending(em.state.pending);
    } else {
      em.panelEls.filterQuery.blur();
    }
  });
  em.panelEls.filterCourse.addEventListener("change", (e) => {
    em.state.filters.course = String(e.target.value || "all");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterUrgency.addEventListener("change", (e) => {
    em.state.filters.urgency = String(e.target.value || "all");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterDate.addEventListener("change", (e) => {
    em.state.filters.dateRange = String(e.target.value || "all");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterTaskSort.addEventListener("change", (e) => {
    em.state.filters.sort = String(e.target.value || "deadline");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterContentType.addEventListener("change", (e) => {
    em.state.contentFilters.type = String(e.target.value || "all");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterContentModule.addEventListener("change", (e) => {
    em.state.contentFilters.module = String(e.target.value || "all");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterContentSort.addEventListener("change", (e) => {
    em.state.contentFilters.sort = String(e.target.value || "newest");
    em.updateFilterClearButton();
    em.schedulePanelUiStatePersist();
    em.renderPending(em.state.pending);
  });
  em.panelEls.filterClearBtn.addEventListener("click", () => {
    em.clearFilters();
  });
  em.panelEls.archiveAllOverdueBtn.addEventListener("click", () => {
    em.archiveAllOverdue();
  });
  em.panelEls.unpinAllBtn.addEventListener("click", () => {
    em.unpinAllItems();
  });
  em.panelEls.exportWeekBtn.addEventListener("click", () => {
    em.exportWeekCalendar();
  });
  em.panelEls.filterCompactBtn.addEventListener("click", () => {
    em.toggleFiltersCompact();
  });

  document.addEventListener("click", (e) => {
  });

  em.updateArchiveToggleButton();
  if (em.applyTranslations) em.applyTranslations();
  em.setupPanelDrag();
  em.updateFilterClearButton();
};
