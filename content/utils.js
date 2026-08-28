window.eminus = window.eminus || {};

var em = window.eminus;

em.asBool = function (value) {
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
};

em.hasDeliveryDate = function (value) {
  if (value === null || value === undefined) return false;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  return !["", "null", "none", "sin entrega", "sin entregar", "pendiente"].includes(normalized);
};

em.getActivityDeadlineStr = function (activity) {
  if (!activity || typeof activity !== "object") return em.t("due_nodate");
  const fields = ["fechaTermino", "fechaVencimiento", "fechaFin"];
  for (const field of fields) {
    const val = activity[field];
    if (val && String(val).trim().toLowerCase() !== "sin fecha") {
      return String(val).trim();
    }
  }
  return em.t("due_nodate");
};

em.parseEminusDate = function (dateStr) {
  if (!dateStr || dateStr === "Sin fecha" || dateStr === em.t("due_nodate")) return null;

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
};

em.pickFirst = function (source, fields) {
  if (!source || typeof source !== "object" || !Array.isArray(fields)) return "";
  for (const field of fields) {
    const value = source[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

em.stripHtml = function (text) {
  const raw = String(text || "");
  if (!raw) return "";
  const withoutTags = raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const decoded = (() => {
    try {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = withoutTags;
      return textarea.value;
    } catch (_) {
      return withoutTags
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&aacute;/gi, "á")
        .replace(/&eacute;/gi, "é")
        .replace(/&iacute;/gi, "í")
        .replace(/&oacute;/gi, "ó")
        .replace(/&uacute;/gi, "ú")
        .replace(/&ntilde;/gi, "ñ");
    }
  })();
  return decoded
    .replace(/\s+/g, " ")
    .trim();
};

em.formatBytes = function (bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return (unitIndex === 0 ? String(Math.round(size)) : size.toFixed(size >= 10 ? 1 : 2)) + " " + units[unitIndex];
};

em.isPublishedContentEntry = function (entry) {
  if (!entry || typeof entry !== "object") return false;

  const visible = entry.visible ?? entry.Visible ?? entry.estado ?? entry.estatus;
  const visibleStr = String(visible ?? "").trim().toLowerCase();
  if (["0", "false", "borrador", "draft", "oculto", "eliminado", "eliminada"].includes(visibleStr)) {
    return false;
  }
  if (Number(visible) === 3) return false;

  const dateValue = em.pickFirst(entry, [
    "fechaPublicacionInicio",
    "FechaPublicacionInicio",
    "fechaPublicacion",
    "FechaPublicacion"
  ]);
  const date = em.parseEminusDate(dateValue);
  if (date && date.getTime() > Date.now()) return false;

  return true;
};

em.getTimeRemaining = function (deadline) {
  if (!deadline) return "";
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff < 0) return em.t("due_vencida");
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  
  const inStr = em.t("due_in");
  const space = inStr ? " " : "";
  
  if (days > 0) return `${inStr}${space}${days}${em.t("due_days")} ${hours}${em.t("due_hours")}`;
  if (hours > 0) return `${inStr}${space}${hours}${em.t("due_hours")} ${minutes}${em.t("due_minutes")}`;
  return `${inStr}${space}${minutes}${em.t("due_minutes")}`;
};

em.isActivityPending = function (activity) {
  if (!activity || typeof activity !== "object") return false;

  if (em.asBool(activity.entregada)) return false;
  if (em.asBool(activity.completada)) return false;

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
  if (em.hasDeliveryDate(fechaEntrega)) {
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
};

em.classifyUrgency = function (deadline) {
  if (!deadline) return "normal";
  const diff = deadline.getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 24 * 60 * 60 * 1000) return "imminent";
  if (diff < 48 * 60 * 60 * 1000) return "urgent";
  return "normal";
};

em.escapeHtml = function (text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

em.wrapTextSpans = function (text) {
  if (!text) return "";
  return text.split("").map((char, index) => {
    if (char === " ") {
      return `<span class="ep-space" style="--i:${index}">&nbsp;</span>`;
    }
    return `<span style="--i:${index}">${em.escapeHtml(char)}</span>`;
  }).join("");
};

em.normalizePositiveId = function (value) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return "";
  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return "";
  return String(asNumber);
};

em.formatDateTime = function (iso) {
  if (!iso) return em.t("due_nodate");
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  
  const lang = em.state?.lang || "es";
  try {
    return dt.toLocaleString(lang);
  } catch (e) {
    return dt.toLocaleString();
  }
};

em.setsEqual = function (a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
};
