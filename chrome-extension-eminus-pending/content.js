(() => {
  if (window.__eminusPendingPanelInjected) {
    return;
  }
  window.__eminusPendingPanelInjected = true;

  const API_BASE = "https://eminus.uv.mx/eminusapi8/api";
  const STORAGE_KEYS = {
    LOG: "eminusPendingLog",
    SNAPSHOT: "eminusLastSnapshot",
    KNOWN_IDS: "eminusKnownPendingIds",
    PANEL_POSITION: "eminusPanelPosition",
    THEME: "eminusPanelTheme",
    ACCOUNT_ID: "eminusAccountId"
  };
  const NAV_KEYS = {
    ACTIVITY_ID: "ep_target_activity_id",
    COURSE_ID: "ep_target_course_id",
    TITLE: "ep_target_activity_title",
    TS: "ep_target_activity_ts",
    STEP: "ep_target_step"
  };

  const state = {
    isCollapsed: true,
    activeTab: "pending",
    pending: [],
    logs: []
  };
  let routeObserverStarted = false;
  let detailForceTimer = null;
  let dragState = null;

  let panelEls = null;
  const hasChrome = typeof chrome !== "undefined";
  const hasStorageApi = hasChrome && !!chrome.storage?.local;
  const hasRuntimeApi = hasChrome && !!chrome.runtime;

  function asBool(value) {
    if (typeof value === "boolean") return value;
    if (value === null || value === undefined) return false;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized || ["0", "false", "f", "no", "n", "null", "none", "sin entregar", "pendiente"].includes(normalized)) {
        return false;
      }
      if (["1", "true", "t", "si", "sí", "y", "yes", "entregada", "entregado", "completada", "completado"].includes(normalized)) {
        return true;
      }
    }
    return Boolean(value);
  }

  function hasDeliveryDate(value) {
    if (value === null || value === undefined) return false;
    if (typeof value !== "string") return true;
    const normalized = value.trim().toLowerCase();
    return !["", "null", "none", "sin entrega", "sin entregar", "pendiente"].includes(normalized);
  }

  function getActivityDeadlineStr(activity) {
    if (!activity || typeof activity !== "object") return "Sin fecha";
    const fields = ["fechaTermino", "fechaVencimiento", "fechaFin"];
    for (const field of fields) {
      const val = activity[field];
      if (val && String(val).trim().toLowerCase() !== "sin fecha") {
        return String(val).trim();
      }
    }
    return "Sin fecha";
  }

  function parseEminusDate(dateStr) {
    if (!dateStr || dateStr === "Sin fecha") return null;

    const months = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
      jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
    };

    const lower = String(dateStr).trim().toLowerCase();
    const match = lower.match(/(\d{1,2})\/(\w{3})\/(\d{4})\s*-\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const [, dd, mon, yyyy, hh, mm] = match;
      if (months[mon] !== undefined) {
        const dt = new Date(Number(yyyy), months[mon], Number(dd), Number(hh), Number(mm), 0, 0);
        if (!Number.isNaN(dt.getTime())) return dt;
      }
    }

    const iso = new Date(String(dateStr));
    if (!Number.isNaN(iso.getTime())) return iso;
    return null;
  }

  function getTimeRemaining(deadline) {
    if (!deadline) return "";
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff < 0) return "Vencida";
    const totalHours = Math.floor(diff / 3600000);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days > 0) return `en ${days}d ${hours}h`;
    return `en ${hours}h`;
  }

  function isActivityPending(activity) {
    if (!activity || typeof activity !== "object") return false;

    if (asBool(activity.entregada)) return false;
    if (asBool(activity.completada)) return false;

    const estatus = String(activity.estatus || "").trim().toLowerCase();
    const doneStatuses = [
      "entregada", "entregado", "completada", "completado", "calificada", "cerrada", "cerrado",
      "finalizada", "finalizado", "enviada", "enviado", "revisada", "revisado"
    ];
    if (doneStatuses.includes(estatus)) return false;

    const pendingStatuses = [
      "pendiente", "abierta", "abierto", "activa", "activo", "en progreso", "por entregar",
      "sin entregar", "no entregada", "no entregado"
    ];

    const fechaEntrega = String(activity.fechaEntrega || "").trim();
    if (hasDeliveryDate(fechaEntrega)) {
      const deadlines = new Set([
        String(activity.fechaTermino || "").trim(),
        String(activity.fechaVencimiento || "").trim(),
        String(activity.fechaFin || "").trim()
      ]);
      const looksLikeDeadline = fechaEntrega && deadlines.has(fechaEntrega);
      if (!looksLikeDeadline && !pendingStatuses.includes(estatus)) {
        return false;
      }
    }

    return true;
  }

  function classifyUrgency(deadline) {
    if (!deadline) return "normal";
    const diff = deadline.getTime() - Date.now();
    if (diff < 0) return "overdue";
    if (diff < 24 * 60 * 60 * 1000) return "imminent";
    if (diff < 48 * 60 * 60 * 1000) return "urgent";
    return "normal";
  }

  async function storageGet(keys) {
    if (!hasStorageApi) {
      return {};
    }
    return chrome.storage.local.get(keys);
  }

  async function storageSet(payload) {
    if (!hasStorageApi) {
      return;
    }
    return chrome.storage.local.set(payload);
  }

  function createPanel() {
    const root = document.createElement("aside");
    root.id = "eminus-pending-panel";
    root.classList.add("ep-collapsed");
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
          <button class="ep-btn" id="ep-theme-toggle" title="Temas">[ ⚙ ]</button>
          <div id="ep-theme-menu" class="ep-theme-menu ep-hidden">
             <button class="ep-theme-option" data-theme="light">Light</button>
             <button class="ep-theme-option" data-theme="dark">Dark</button>
             <button class="ep-theme-option" data-theme="hacker">Hacker</button>
             <button class="ep-theme-option" data-theme="ocean">Ocean</button>
          </div>
          <button class="ep-btn" id="ep-refresh" title="Actualizar">[ ref ]</button>
          <button class="ep-btn" id="ep-collapse" title="Desplegar">[ + ]</button>
        </div>
      </header>

      <div class="ep-tabs">
        <button class="ep-tab ep-tab-active" data-tab="pending">Pendientes</button>
        <button class="ep-tab" data-tab="log">Log</button>
      </div>

      <section class="ep-body" id="ep-body-pending"></section>
      <section class="ep-body ep-hidden" id="ep-body-log"></section>

      <footer class="ep-footer" id="ep-footer-status">Listo</footer>
    `;

    document.body.appendChild(root);

    panelEls = {
      root,
      subtitle: root.querySelector("#ep-subtitle"),
      sealArt: root.querySelector("#ep-seal-art"),
      header: root.querySelector(".ep-header"),
      themeBtn: root.querySelector("#ep-theme-toggle"),
      themeMenu: root.querySelector("#ep-theme-menu"),
      themeOptions: root.querySelectorAll(".ep-theme-option"),
      refreshBtn: root.querySelector("#ep-refresh"),
      collapseBtn: root.querySelector("#ep-collapse"),
      tabButtons: root.querySelectorAll(".ep-tab"),
      pendingBody: root.querySelector("#ep-body-pending"),
      logBody: root.querySelector("#ep-body-log"),
      footer: root.querySelector("#ep-footer-status")
    };

    panelEls.themeBtn.addEventListener("click", toggleThemeMenu);
    panelEls.themeOptions.forEach((btn) => {
      btn.addEventListener("click", () => setTheme(btn.dataset.theme));
    });
    panelEls.refreshBtn.addEventListener("click", () => scanPending());
    panelEls.collapseBtn.addEventListener("click", toggleCollapse);
    panelEls.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });

    document.addEventListener("click", (e) => {
      if (
        panelEls.themeMenu && 
        !panelEls.themeMenu.classList.contains("ep-hidden") &&
        e.target instanceof HTMLElement && 
        !e.target.closest("#ep-theme-menu") &&
        !e.target.closest("#ep-theme-toggle")
      ) {
        panelEls.themeMenu.classList.add("ep-hidden");
      }
    });

    setupPanelDrag();
  }

  function clampPanelPosition(left, top) {
    if (!panelEls?.root) {
      return { left, top };
    }

    const panelRect = panelEls.root.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - panelRect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - panelRect.height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop)
    };
  }

  function applyPanelPosition(position) {
    if (!panelEls?.root || !position) return;
    const next = clampPanelPosition(Number(position.left || 16), Number(position.top || 96));
    panelEls.root.style.left = `${next.left}px`;
    panelEls.root.style.top = `${next.top}px`;
    panelEls.root.style.right = "auto";
  }

  async function persistPanelPosition() {
    if (!panelEls?.root) return;
    const left = parseFloat(panelEls.root.style.left);
    const top = parseFloat(panelEls.root.style.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;
    await storageSet({
      [STORAGE_KEYS.PANEL_POSITION]: { left, top }
    });
  }

  async function restorePanelPosition() {
    const data = await storageGet([STORAGE_KEYS.PANEL_POSITION]);
    const saved = data[STORAGE_KEYS.PANEL_POSITION];
    if (saved && typeof saved === "object") {
      applyPanelPosition(saved);
    }
  }

  function setupPanelDrag() {
    if (!panelEls?.header || !panelEls?.root) return;

    panelEls.header.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest("button") || target.closest(".ep-theme-menu"))) {
        return;
      }

      const rect = panelEls.root.getBoundingClientRect();
      dragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        target: event.target
      };
      panelEls.root.classList.add("ep-dragging");
      panelEls.header.setPointerCapture(event.pointerId);
    });

    panelEls.header.addEventListener("pointermove", (event) => {
      if (!dragState) return;
      if (Math.abs(event.clientX - dragState.startX) > 3 || Math.abs(event.clientY - dragState.startY) > 3) {
        dragState.moved = true;
      }
      const next = clampPanelPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
      applyPanelPosition(next);
    });

    const finishDrag = async (event) => {
      if (!dragState) return;
      const wasMoved = dragState.moved;
      const originalTarget = dragState.target;
      dragState = null;
      panelEls.root.classList.remove("ep-dragging");
      await persistPanelPosition();
      
      if (!wasMoved) {
        const isCatClick = originalTarget instanceof HTMLElement && originalTarget.closest("#ep-seal-art");
        if (state.isCollapsed) {
          toggleCollapse();
        } else if (isCatClick) {
          toggleCollapse();
        }
      }
    };

    panelEls.header.addEventListener("pointerup", finishDrag);
    panelEls.header.addEventListener("pointercancel", finishDrag);
  }

  function toggleCollapse() {
    state.isCollapsed = !state.isCollapsed;
    panelEls.root.classList.toggle("ep-collapsed", state.isCollapsed);
    panelEls.collapseBtn.textContent = state.isCollapsed ? "[ + ]" : "[ - ]";
  }

  function toggleThemeMenu() {
    panelEls.themeMenu.classList.toggle("ep-hidden");
  }

  async function setTheme(themeName) {
    panelEls.root.classList.remove("ep-dark-theme", "ep-hacker-theme", "ep-ocean-theme");
    if (themeName !== "light") {
      panelEls.root.classList.add(`ep-${themeName}-theme`);
    }
    panelEls.themeMenu.classList.add("ep-hidden");
    await storageSet({ [STORAGE_KEYS.THEME]: themeName });
  }

  function setTab(tab) {
    state.activeTab = tab;
    panelEls.tabButtons.forEach((btn) => {
      btn.classList.toggle("ep-tab-active", btn.dataset.tab === tab);
    });

    panelEls.pendingBody.classList.toggle("ep-hidden", tab !== "pending");
    panelEls.logBody.classList.toggle("ep-hidden", tab !== "log");
  }

  function setStatus(text) {
    if (panelEls?.footer) {
      panelEls.footer.textContent = text;
    }
  }

  function formatDateTime(iso) {
    if (!iso) return "Sin fecha";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString();
  }

  function renderPending(items) {
    if (!panelEls?.pendingBody) return;

    if (!items.length) {
      panelEls.pendingBody.innerHTML = `<div class="ep-empty">Sin tareas pendientes detectadas.</div>`;
      return;
    }

    panelEls.pendingBody.innerHTML = items
      .map((item, index) => {
        const urgencyClass = `ep-${item.urgency}`;
        const due = item.deadlineLabel || "Sin fecha";
        return `
          <button class="ep-item-btn" type="button" data-item-index="${index}">
            <article class="ep-item ${urgencyClass}">
              <div class="ep-course">${escapeHtml(item.course)}</div>
              <div class="ep-title-task">${escapeHtml(item.title)}</div>
              <div class="ep-meta">Vence: ${escapeHtml(due)}</div>
            </article>
          </button>
        `;
      })
      .join("");

    panelEls.pendingBody.querySelectorAll(".ep-item-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.getAttribute("data-item-index"));
        const item = state.pending[index];
        if (item) {
          navigateToActivity(item);
        }
      });
    });
  }

  function renderLogs(logs) {
    if (!panelEls?.logBody) return;

    const safeLogs = Array.isArray(logs) ? logs.filter((entry) => entry && typeof entry === "object") : [];
    if (!safeLogs.length) {
      panelEls.logBody.innerHTML = `<div class="ep-empty">Aún no hay historial.</div>`;
      return;
    }

    let html = `<button id="ep-clear-log" class="ep-item-btn" style="margin-bottom: 16px; border: 1px dashed #000; padding: 6px; font-size: 11px; text-align: center; cursor: pointer; background: transparent; color: #000; font-family: inherit; width: 100%; box-sizing: border-box;">[ borrar_log ]</button>`;

    html += safeLogs
      .map((entry) => {
        const previewTitles = Array.isArray(entry.previewTitles) ? entry.previewTitles : [];
        const lines = previewTitles.length
          ? `<div class="ep-log-lines">${previewTitles.map((t) => `<div>• ${escapeHtml(t)}</div>`).join("")}</div>`
          : "";
        const pendingCount = Number(entry.pendingCount || 0);
        const newCount = Number(entry.newCount || 0);

        return `
          <article class="ep-log-item">
            <div class="ep-log-time">${escapeHtml(formatDateTime(entry.timestamp))}</div>
            <div class="ep-log-summary">${pendingCount} pendientes (${newCount} nuevas)</div>
            ${lines}
          </article>
        `;
      })
      .join("");
    
    panelEls.logBody.innerHTML = html;
    
    const clearBtn = panelEls.logBody.querySelector("#ep-clear-log");
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        state.logs = [];
        await storageSet({ [STORAGE_KEYS.LOG]: [] });
        renderLogs([]);
      });
    }
  }

  function escapeHtml(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getToken() {
    return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";
  }

  function getAccountIdFromToken(token) {
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
  }

  function normalizePositiveId(value) {
    const raw = String(value ?? "").trim();
    if (!/^\d+$/.test(raw)) return "";
    const asNumber = Number(raw);
    if (!Number.isFinite(asNumber) || asNumber <= 0) return "";
    return String(asNumber);
  }

  function savePendingNavigationTarget(item) {
    sessionStorage.setItem(NAV_KEYS.ACTIVITY_ID, String(item.activityId || ""));
    sessionStorage.setItem(NAV_KEYS.COURSE_ID, String(item.courseId || ""));
    sessionStorage.setItem(NAV_KEYS.TITLE, String(item.title || ""));
    sessionStorage.setItem(NAV_KEYS.TS, String(Date.now()));
    sessionStorage.setItem(NAV_KEYS.STEP, "activity_detail");
  }

  function readPendingNavigationTarget() {
    const activityId = sessionStorage.getItem(NAV_KEYS.ACTIVITY_ID) || "";
    const courseId = sessionStorage.getItem(NAV_KEYS.COURSE_ID) || "";
    const title = sessionStorage.getItem(NAV_KEYS.TITLE) || "";
    const step = sessionStorage.getItem(NAV_KEYS.STEP) || "content_bootstrap";
    const ts = Number(sessionStorage.getItem(NAV_KEYS.TS) || 0);
    if (!activityId) return null;
    if (!ts || Date.now() - ts > 5 * 60 * 1000) {
      clearPendingNavigationTarget();
      return null;
    }
    return { activityId, courseId, title, step };
  }

  function clearPendingNavigationTarget() {
    sessionStorage.removeItem(NAV_KEYS.ACTIVITY_ID);
    sessionStorage.removeItem(NAV_KEYS.COURSE_ID);
    sessionStorage.removeItem(NAV_KEYS.TITLE);
    sessionStorage.removeItem(NAV_KEYS.TS);
    sessionStorage.removeItem(NAV_KEYS.STEP);
  }

  function getActivityIframeElement() {
    const candidates = [
      "m-activity-resource-list-student iframe.app-b-frame",
      "iframe.app-b-frame",
      "iframe#iframeActividades"
    ];
    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (el instanceof HTMLIFrameElement) {
        return el;
      }
    }
    return null;
  }

  function ensureIframeLoadsDetail(target) {
    const detailUrlObj = new URL(`${location.origin}/aplicativoEminus/actividad-detalle/${encodeURIComponent(target.activityId)}`);
    if (target.courseId) {
      detailUrlObj.searchParams.set("courseId", target.courseId);
    }
    const detailUrl = detailUrlObj.toString();
    const principalUrl = `${location.origin}/aplicativoEminus/actividad-principal/?courseId=${encodeURIComponent(target.courseId || "")}&_timestamp=${Date.now()}`;
    const maxMs = 15000;
    const startedAt = Date.now();
    let principalLocked = false;

    if (detailForceTimer) {
      window.clearInterval(detailForceTimer);
      detailForceTimer = null;
    }

    const applyDetailUrl = () => {
      if (!location.pathname.includes("/eminus4/page/course/activity")) {
        return false;
      }

      const currentTarget = readPendingNavigationTarget();
      if (!currentTarget || currentTarget.activityId !== target.activityId) {
        return true;
      }

      const iframe = getActivityIframeElement();
      if (!(iframe instanceof HTMLIFrameElement)) {
        return false;
      }

      const current = String(iframe.getAttribute("src") || iframe.src || "");
      if (current.includes(`/actividad-detalle/${target.activityId}`)) {
        clearPendingNavigationTarget();
        setStatus("Detalle cargado en iframe.");
        return true;
      }

      if (!principalLocked && target.courseId && !current.includes(`actividad-principal`) ) {
        iframe.setAttribute("src", principalUrl);
        return false;
      }
      if (!principalLocked && target.courseId && current.includes(`actividad-principal`) && current.includes(`courseId=${target.courseId}`)) {
        principalLocked = true;
      }

      iframe.setAttribute("src", detailUrl);
      return false;
    };

    if (applyDetailUrl()) return;

    detailForceTimer = window.setInterval(() => {
      const done = applyDetailUrl();
      const expired = Date.now() - startedAt > maxMs;
      if (done || expired) {
        if (detailForceTimer) {
          window.clearInterval(detailForceTimer);
          detailForceTimer = null;
        }
        if (expired && !done) {
          setStatus("No se pudo forzar el detalle en iframe.");
        }
      }
    }, 300);
  }

  async function loadDetailIntoActivityIframeIfNeeded() {
    const target = readPendingNavigationTarget();
    if (!target) return;
    if (target.step !== "activity_detail") return;
    if (!location.pathname.includes("/eminus4/page/course/activity")) return;

    setStatus(`Cargando detalle en Actividades: ${target.title || target.activityId}`);

    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i += 1) {
      const iframe = getActivityIframeElement();
      if (iframe instanceof HTMLIFrameElement) {
        ensureIframeLoadsDetail(target);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    clearPendingNavigationTarget();
    setStatus("No se encontró iframe de Actividades; abriendo detalle directo.");
    const fallbackUrl = new URL(`${location.origin}/aplicativoEminus/actividad-detalle/${encodeURIComponent(target.activityId)}`);
    if (target.courseId) {
      fallbackUrl.searchParams.set("courseId", target.courseId);
    }
    window.location.assign(fallbackUrl.toString());
  }

  async function setCourseContext(courseId) {
    if (!courseId || !hasRuntimeApi) {
      return false;
    }
    const token = getToken();
    if (!token) {
      return false;
    }
    try {
      const res = await chrome.runtime.sendMessage({
        type: "SET_COURSE_CONTEXT",
        courseId,
        token
      });
      return !!res?.ok;
    } catch (err) {
      return false;
    }
  }

  function startRouteObserver() {
    if (routeObserverStarted) return;
    routeObserverStarted = true;

    let lastHref = location.href;
    window.setInterval(() => {
      const currentHref = location.href;
      const hasTarget = !!readPendingNavigationTarget();
      const routeChanged = currentHref !== lastHref;
      if (routeChanged || hasTarget) {
        lastHref = currentHref;
        loadDetailIntoActivityIframeIfNeeded();
      }
    }, 350);
  }

  async function navigateToActivity(item) {
    if (!item) return;
    const activityId = normalizePositiveId(item.activityId);
    const courseId = normalizePositiveId(item.courseId);
    if (activityId) {
      clearPendingNavigationTarget();
      if (courseId) {
        savePendingNavigationTarget({ ...item, activityId, courseId });
        await setCourseContext(courseId);
        
        try {
          setStatus("Inicializando contexto del curso...");
          await fetch(`${location.origin}/aplicativoEminus/actividad-principal/?courseId=${encodeURIComponent(courseId)}&_timestamp=${Date.now()}`);
        } catch (e) {
          console.warn("Error preload actividad-principal:", e);
        }
      }
      setStatus(`Abriendo detalle: ${item.title}`);
      const detailUrl = new URL(`${location.origin}/aplicativoEminus/actividad-detalle/${encodeURIComponent(activityId)}`);
      if (courseId) {
        detailUrl.searchParams.set("courseId", courseId);
      }
      window.location.assign(detailUrl.toString());
      return;
    }
    setStatus("Esta actividad no trae idActividad para abrir detalle directo.");
  }

  async function fetchJson(path, token) {
    if (hasRuntimeApi) {
      try {
        const bgResponse = await chrome.runtime.sendMessage({
          type: "FETCH_EMINUS_JSON",
          path,
          token
        });
        if (!bgResponse?.ok) {
          throw new Error(bgResponse?.error || `Error de red al consultar ${path}`);
        }
        return Array.isArray(bgResponse.contenido) ? bgResponse.contenido : [];
      } catch (err) {
        throw new Error(err.message || `Error de red al consultar ${path}. Recarga Eminus e inténtalo de nuevo.`);
      }
    }

    throw new Error("No hay canal de extensión disponible para consultar API.");
  }

  function filterActiveCourses(courses) {
    const nowSec = Date.now() / 1000;
    const active = courses.filter((entry) => {
      const c = entry?.curso || {};
      const start = c.fechaInicioEpoch;
      const end = c.fechaTerminoEpoch;
      if (typeof start !== "number" || typeof end !== "number" || start <= 0 || end <= 0) {
        return true;
      }
      return nowSec >= (start - 15 * 86400) && nowSec <= (end + 30 * 86400);
    });

    return active.length ? active : courses;
  }

  async function buildPendingData(token) {
    const coursesRaw = await fetchJson("/Course/getAllCourses", token);
    const courses = filterActiveCourses(coursesRaw);
    const pending = [];

    for (const cEntry of courses) {
      const course = cEntry?.curso || {};
      const courseId = normalizePositiveId(course.idCurso ?? cEntry?.idCurso ?? course.courseId ?? cEntry?.courseId);
      const courseName = String(course.nombre || "").trim();
      if (!courseId || !courseName) continue;

      let activities = [];
      try {
        activities = await fetchJson(`/Activity/getActividadesEstudiante/${courseId}`, token);
      } catch (err) {
        console.warn(`[Eminus Pending] No se pudieron cargar actividades del curso ${courseId} (${courseName}):`, err);
        continue;
      }

      for (const act of activities) {
        if (!isActivityPending(act)) continue;

        const deadlineStr = getActivityDeadlineStr(act);
        const deadlineDate = parseEminusDate(deadlineStr);
        const remaining = getTimeRemaining(deadlineDate);
        const urgency = classifyUrgency(deadlineDate);

        const id = `${courseId}:${act.idActividad || act.titulo || Math.random()}`;

        pending.push({
          id,
          courseId,
          activityId: String(act.idActividad || ""),
          course: courseName,
          title: String(act.titulo || "Actividad sin titulo"),
          deadlineRaw: deadlineDate ? deadlineDate.toISOString() : "",
          deadlineLabel: remaining ? `${deadlineStr} (${remaining})` : deadlineStr,
          urgency
        });
      }
    }

    pending.sort((a, b) => {
      if (!a.deadlineRaw && !b.deadlineRaw) return 0;
      if (!a.deadlineRaw) return 1;
      if (!b.deadlineRaw) return -1;
      return new Date(a.deadlineRaw).getTime() - new Date(b.deadlineRaw).getTime();
    });

    return pending;
  }

  async function appendLog(pending, knownIdsBefore) {
    const nowIso = new Date().toISOString();
    const currentIds = pending.map((item) => item.id);
    const newCount = currentIds.filter((id) => !knownIdsBefore.has(id)).length;

    const data = await storageGet([STORAGE_KEYS.LOG]);
    const logs = Array.isArray(data[STORAGE_KEYS.LOG]) ? data[STORAGE_KEYS.LOG] : [];
    
    if (newCount > 0) {
      const entry = {
        timestamp: nowIso,
        pendingCount: pending.length,
        newCount,
        previewTitles: pending.slice(0, 4).map((p) => `${p.course} - ${p.title}`)
      };
      logs.unshift(entry);
    }

    const trimmedLogs = logs.slice(0, 250);
    state.logs = trimmedLogs;

    await storageSet({
      [STORAGE_KEYS.LOG]: trimmedLogs,
      [STORAGE_KEYS.SNAPSHOT]: {
        updatedAt: nowIso,
        pendingCount: pending.length,
        pending
      },
      [STORAGE_KEYS.KNOWN_IDS]: currentIds
    });

    return { newCount, updatedAt: nowIso };
  }

  async function syncBadge(count) {
    if (!hasRuntimeApi) return;
    try {
      await chrome.runtime.sendMessage({ type: "UPDATE_BADGE", count });
    } catch (err) {
      console.debug("No se pudo actualizar badge", err);
    }
  }

  async function hydrateFromStorage() {
    let data = await storageGet([STORAGE_KEYS.LOG, STORAGE_KEYS.SNAPSHOT, STORAGE_KEYS.THEME, STORAGE_KEYS.ACCOUNT_ID]);
    
    const storedAccountId = data[STORAGE_KEYS.ACCOUNT_ID];
    const currentToken = getToken();
    const currentAccountId = getAccountIdFromToken(currentToken);

    if (storedAccountId && currentAccountId && storedAccountId !== currentAccountId) {
      await storageSet({
        [STORAGE_KEYS.LOG]: [],
        [STORAGE_KEYS.SNAPSHOT]: null,
        [STORAGE_KEYS.KNOWN_IDS]: [],
        [STORAGE_KEYS.ACCOUNT_ID]: currentAccountId
      });
      data[STORAGE_KEYS.LOG] = [];
      data[STORAGE_KEYS.SNAPSHOT] = null;
      await syncBadge(0);
    } else if (currentAccountId && !storedAccountId) {
      await storageSet({ [STORAGE_KEYS.ACCOUNT_ID]: currentAccountId });
    } else if (!currentToken && storedAccountId) {
      await storageSet({
        [STORAGE_KEYS.LOG]: [],
        [STORAGE_KEYS.SNAPSHOT]: null,
        [STORAGE_KEYS.KNOWN_IDS]: [],
        [STORAGE_KEYS.ACCOUNT_ID]: null
      });
      data[STORAGE_KEYS.LOG] = [];
      data[STORAGE_KEYS.SNAPSHOT] = null;
      await syncBadge(0);
    }

    state.logs = Array.isArray(data[STORAGE_KEYS.LOG]) ? data[STORAGE_KEYS.LOG] : [];

    const theme = data[STORAGE_KEYS.THEME] || "light";
    if (theme !== "light") {
      panelEls.root.classList.add(`ep-${theme}-theme`);
    }

    const snapshot = data[STORAGE_KEYS.SNAPSHOT];
    if (snapshot && Array.isArray(snapshot.pending)) {
      state.pending = snapshot.pending;
      if (panelEls?.subtitle) {
        panelEls.subtitle.textContent = `Última lectura: ${formatDateTime(snapshot.updatedAt)}`;
      }
      renderPending(state.pending);
      await syncBadge(snapshot.pendingCount || 0);
    } else {
      state.pending = [];
      renderPending([]);
      if (panelEls?.subtitle) {
        panelEls.subtitle.textContent = "Última lectura: Nunca";
      }
    }

    renderLogs(state.logs);
  }

  async function scanPending() {
    setStatus("Consultando cursos y actividades...");
    if (panelEls?.refreshBtn) {
      panelEls.refreshBtn.disabled = true;
    }

    try {
      const token = getToken();
      if (!token) {
        setStatus("No se encontró accessToken. Entra a tu curso y vuelve a intentar.");
        return;
      }

      const currentAccountId = getAccountIdFromToken(token);
      let knownData = await storageGet([STORAGE_KEYS.KNOWN_IDS, STORAGE_KEYS.ACCOUNT_ID]);
      
      if (knownData[STORAGE_KEYS.ACCOUNT_ID] && currentAccountId && knownData[STORAGE_KEYS.ACCOUNT_ID] !== currentAccountId) {
        knownData[STORAGE_KEYS.KNOWN_IDS] = [];
        state.logs = [];
        await storageSet({
          [STORAGE_KEYS.LOG]: [],
          [STORAGE_KEYS.SNAPSHOT]: null,
          [STORAGE_KEYS.KNOWN_IDS]: [],
          [STORAGE_KEYS.ACCOUNT_ID]: currentAccountId
        });
      } else if (!knownData[STORAGE_KEYS.ACCOUNT_ID] && currentAccountId) {
        await storageSet({ [STORAGE_KEYS.ACCOUNT_ID]: currentAccountId });
      }

      const knownIds = new Set(Array.isArray(knownData[STORAGE_KEYS.KNOWN_IDS]) ? knownData[STORAGE_KEYS.KNOWN_IDS] : []);

      const pending = await buildPendingData(token);
      state.pending = pending;
      renderPending(pending);

      const logMeta = await appendLog(pending, knownIds);
      renderLogs(state.logs);

      if (panelEls?.subtitle) {
        panelEls.subtitle.textContent = `Última lectura: ${formatDateTime(logMeta.updatedAt)}`;
      }
      const status = `${pending.length} pendientes | ${logMeta.newCount} nuevas`;
      setStatus(status);

      await syncBadge(pending.length);
    } catch (err) {
      console.error("[Eminus Pending Panel]", err);
      setStatus(err.message || "Error al leer pendientes");
    } finally {
      if (panelEls?.refreshBtn) {
        panelEls.refreshBtn.disabled = false;
      }
    }
  }

  if (hasRuntimeApi && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "OPEN_AND_REFRESH_PANEL") {
        if (state.isCollapsed) {
          toggleCollapse();
        }
        scanPending();
        sendResponse({ ok: true });
      }
    });
  }

  createPanel();
  restorePanelPosition();
  window.addEventListener("resize", () => {
    if (!panelEls?.root) return;
    const left = parseFloat(panelEls.root.style.left);
    const top = parseFloat(panelEls.root.style.top);
    if (Number.isFinite(left) && Number.isFinite(top)) {
      applyPanelPosition({ left, top });
    }
  });
  startRouteObserver();
  hydrateFromStorage().then(() => {
    loadDetailIntoActivityIframeIfNeeded();
    scanPending();
  });
})();
