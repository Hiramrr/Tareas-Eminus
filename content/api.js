/* ══════════════════════════════════════════
   API & DATA FETCHING
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

em.fetchJson = async function (path, token) {
  if (em.hasRuntimeApi) {
    try {
      const bgResponse = await chrome.runtime.sendMessage({
        type: "FETCH_EMINUS_JSON",
        path,
        token
      });
      if (!bgResponse?.ok) {
        const responseError = new Error(bgResponse?.error || em.t("error_network") + " " + path);
        responseError.status = Number(bgResponse?.status || 0);
        responseError.path = bgResponse?.path || path;
        throw responseError;
      }
      return Array.isArray(bgResponse.contenido) ? bgResponse.contenido : [];
    } catch (err) {
      const wrappedError = new Error(err.message || em.t("error_network") + " " + path + ". " + em.t("error_reload"));
      wrappedError.status = Number(err.status || 0);
      wrappedError.path = err.path || path;
      throw wrappedError;
    }
  }

  throw new Error(em.t("error_no_channel"));
};

em.filterActiveCourses = function (courses) {
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
};

em.getContentUnitId = function (unit) {
  return em.normalizeNonNegativeId(em.pickFirst(unit, ["idUnidad", "IdUnidad", "idContenido", "IdContenido", "id"]));
};

em.getContentElementId = function (element) {
  return em.normalizePositiveId(em.pickFirst(element, ["idElemento", "IdElemento", "idContenido", "IdContenido", "id"]));
};

em.normalizeNonNegativeId = function (value) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return "";
  return String(Number(raw));
};

em.describeContentKind = function (element) {
  const attachments = em.getContentAttachments(element);
  const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;
  const hasAttachments = attachmentCount > 0 || em.asBool(em.pickFirst(element, ["tieneAdjuntos", "TieneAdjuntos"]));
  if (hasAttachments) return attachmentCount > 1 ? "Archivos" : "Archivo";

  const type = String(em.pickFirst(element, ["tipo", "tipoElemento", "TipoElemento", "tipoRecurso", "TipoRecurso"])).toLowerCase();
  if (type.includes("archivo") || type.includes("file") || type.includes("zip") || type.includes("recurso")) return "Archivo";
  return "Mensaje";
};

em.getContentAttachments = function (element) {
  const raw = em.pickFirst(element, ["archivos", "Archivos", "adjuntos", "Adjuntos", "archivosElementos", "ArchivosElementos"]);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((file) => {
      if (!file || typeof file !== "object") return null;
      const fileId = em.normalizePositiveId(em.pickFirst(file, [
        "idArchivosElementos",
        "IdArchivosElementos",
        "idarchivoselementos",
        "idArchivoElemento",
        "IdArchivoElemento",
        "idarchivoelemento",
        "idArchivo",
        "IdArchivo",
        "idarchivo",
        "id"
      ]));
      const name = String(em.pickFirst(file, ["nombreOriginal", "NombreOriginal", "nombreoriginal", "nombreArchivo", "NombreArchivo", "nombrearchivo", "nombre", "Nombre", "name"]) || "archivo").trim();
      const rawSize = em.pickFirst(file, ["tamano", "Tamano", "size", "Size"]);
      const numericSize = typeof rawSize === "number" ? rawSize : Number(String(rawSize || "").replace(/[^\d.]/g, ""));
      const rawSizeLabel = typeof rawSize === "string" && /[a-z]/i.test(rawSize) ? rawSize.trim() : "";
      if (!fileId) return null;
      return {
        id: fileId,
        elementId: em.normalizePositiveId(em.pickFirst(file, ["idElemento", "IdElemento", "idelemento", "idContenido", "IdContenido", "idcontenido"])),
        name,
        size: Number.isFinite(numericSize) ? numericSize : 0,
        sizeLabel: rawSizeLabel || em.formatBytes(numericSize),
        location: String(em.pickFirst(file, ["ubicacion", "Ubicacion", "location", "Location", "unidad", "Unidad"]) || "").trim(),
        modifiedLabel: em.getContentFileDateLabel(file),
        downloads: em.pickFirst(file, ["descargasAlumno", "DescargasAlumno", "descargasalumno", "descargas", "Descargas", "downloads"])
      };
    })
    .filter(Boolean);
};

em.getContentFileDateLabel = function (row) {
  const rawDate = em.pickFirst(row, ["fechaModificacion", "FechaModificacion", "fechamodificacion", "fechaActualizacion", "FechaActualizacion", "fechaactualizacion", "fecha", "Fecha"]);
  if (rawDate) return String(rawDate).trim();

  const epoch = Number(em.pickFirst(row, ["fechaModificacionEpoch", "FechaModificacionEpoch", "fechamodificacionepoch"]));
  if (Number.isFinite(epoch) && epoch > 0) {
    const ms = epoch > 9999999999 ? epoch : epoch * 1000;
    return em.formatDateTime(new Date(ms).toISOString());
  }

  return "";
};

em.getContentDescription = function (entry) {
  return em.stripHtml(em.pickFirst(entry, [
    "descripcion",
    "Descripcion",
    "description",
    "contenido",
    "Contenido",
    "mensaje",
    "Mensaje",
    "texto",
    "Texto",
    "cuerpo",
    "Cuerpo",
    "detalle",
    "Detalle",
    "instrucciones",
    "Instrucciones",
    "observaciones",
    "Observaciones"
  ]));
};

em.normalizeContentFileLocationAttachment = function (row) {
  if (!row || typeof row !== "object") return null;
  const fileId = em.normalizePositiveId(em.pickFirst(row, [
    "idArchivosElementos",
    "IdArchivosElementos",
    "idarchivoselementos",
    "idArchivoElemento",
    "IdArchivoElemento",
    "idarchivoelemento",
    "idArchivo",
    "IdArchivo",
    "idarchivo",
    "id"
  ]));
  const elementId = em.normalizePositiveId(em.pickFirst(row, ["idElemento", "IdElemento", "idelemento", "idContenido", "IdContenido", "idcontenido"]));
  const name = String(em.pickFirst(row, ["nombreOriginal", "NombreOriginal", "nombreoriginal", "nombreArchivo", "NombreArchivo", "nombrearchivo", "nombre", "Nombre", "name"]) || "archivo").trim();
  if (!fileId || !name) return null;

  const rawSize = em.pickFirst(row, ["tamano", "Tamano", "size", "Size", "peso", "Peso"]);
  const numericSize = typeof rawSize === "number" ? rawSize : Number(String(rawSize || "").replace(/[^\d.]/g, ""));
  const rawSizeLabel = typeof rawSize === "string" && /[a-z]/i.test(rawSize) ? rawSize.trim() : "";

  return {
    id: fileId,
    elementId,
    name,
    size: Number.isFinite(numericSize) ? numericSize : 0,
    sizeLabel: rawSizeLabel || em.formatBytes(numericSize),
    location: String(em.pickFirst(row, ["ubicacion", "Ubicacion", "location", "Location", "unidad", "Unidad"]) || "").trim(),
    modifiedLabel: em.getContentFileDateLabel(row),
    downloads: em.pickFirst(row, ["descargasAlumno", "DescargasAlumno", "descargasalumno", "descargas", "Descargas", "downloads"])
  };
};

em.parseContentFileLocationRows = function (rows, courseId, courseName, units, pinnedSet) {
  rows = Array.isArray(rows) ? rows : [];
  const unitNames = new Map();
  if (Array.isArray(units)) {
    units.forEach((unit) => {
      const unitId = em.getContentUnitId(unit);
      const unitName = String(em.pickFirst(unit, ["nombre", "Nombre", "unidad", "Unidad", "titulo", "Titulo"]) || "").trim();
      if (unitId && unitName) unitNames.set(unitId, unitName);
    });
  }

  const groups = new Map();
  rows.forEach((row) => {
    const groupUnitId = em.normalizeNonNegativeId(em.pickFirst(row, ["idunidad", "idUnidad", "IdUnidad"]));
    const groupName = String(em.pickFirst(row, ["nombreUnidad", "nombreunidad", "NombreUnidad", "nombre", "Nombre"]) || "").trim();
    const rowFiles = Array.isArray(row?.archivos) ? row.archivos : [row];

    rowFiles.forEach((fileRow) => {
      const attachment = em.normalizeContentFileLocationAttachment(fileRow);
      if (!attachment) return;

      const fileUnitId = em.normalizeNonNegativeId(em.pickFirst(fileRow, ["idunidad", "idUnidad", "IdUnidad"]));
      const unitId = groupUnitId || fileUnitId;
      const location = groupName || attachment.location || unitNames.get(unitId) || "Archivos";
      attachment.location = location;

      const key = (unitId || location) + ":" + location;
      if (!groups.has(key)) {
        groups.set(key, {
          unitId,
          unitName: unitNames.get(unitId) || location,
          title: location,
          attachments: []
        });
      }
      groups.get(key).attachments.push(attachment);
    });
  });

  return Array.from(groups.values()).map((group) => {
    const id = courseId + ":content:file-location:" + (group.unitId || group.title);
    return {
      id,
      kind: "content",
      contentType: "files",
      contentTypeLabel: group.attachments.length === 1 ? "Archivo" : "Archivos",
      source: "file-location",
      courseId,
      unitId: group.unitId || "",
      elementId: "",
      activityId: "",
      course: courseName,
      title: group.title,
      description: group.attachments.length + " archivos en File location",
      attachments: group.attachments,
      hasFiles: true,
      unitName: group.unitName,
      deadlineRaw: "",
      deadlineStr: "",
      deadlineLabel: "",
      publishedRaw: "",
      publishedLabel: "",
      urgency: "normal",
      archived: false,
      pinned: pinnedSet.has(id),
      estatus: "Publicado",
      entregada: false,
      completada: false,
      fechaEntrega: ""
    };
  });
};

em.buildContentFileLocationItems = async function (token, courseId, courseName, units, pinnedSet) {
  let rows = [];
  try {
    rows = await em.fetchJson("/Contenido/UbicacionArchivos/" + courseId, token);
  } catch (_) {
    return [];
  }
  return em.parseContentFileLocationRows(rows, courseId, courseName, units, pinnedSet);
};

em.findContentFileLocationAttachments = function (groups, item) {
  if (!Array.isArray(groups) || !item) return [];
  const itemUnitId = em.normalizeNonNegativeId(item.unitId);
  const itemElementId = em.normalizePositiveId(item.elementId);
  const itemUnitName = String(item.unitName || "").trim().toLowerCase();
  const itemTitle = String(item.title || "").trim().toLowerCase();
  let attachments = [];

  if (itemElementId) {
    groups.forEach((group) => {
      (group.attachments || []).forEach((attachment) => {
        if (em.normalizePositiveId(attachment.elementId) === itemElementId) {
          attachments.push(attachment);
        }
      });
    });
  }

  if (!attachments.length && itemUnitId) {
    const group = groups.find((entry) => em.normalizeNonNegativeId(entry.unitId) === itemUnitId);
    if (group) attachments = group.attachments || [];
  }

  if (!attachments.length && (itemUnitName || itemTitle)) {
    const group = groups.find((entry) => {
      const unitName = String(entry.unitName || "").trim().toLowerCase();
      const title = String(entry.title || "").trim().toLowerCase();
      return (itemUnitName && (unitName === itemUnitName || title === itemUnitName)) ||
        (itemTitle && (unitName === itemTitle || title === itemTitle));
    });
    if (group) attachments = group.attachments || [];
  }

  return attachments.slice();
};

em.getLazyContentDetails = async function (token, item) {
  if (!token || !item) return { attachments: [], description: "" };
  const courseId = em.normalizePositiveId(item.courseId);
  if (!courseId) return { attachments: [], description: "" };

  let attachments = [];
  let description = "";
  try {
    em.state.contentFileLocationCache = em.state.contentFileLocationCache || new Map();
    let rows = em.state.contentFileLocationCache.get(courseId);
    if (!rows) {
      rows = await em.fetchJson("/Contenido/UbicacionArchivos/" + courseId, token);
      em.state.contentFileLocationCache.set(courseId, rows);
    }
    const groups = em.parseContentFileLocationRows(rows, courseId, item.course || "", [], new Set());
    attachments = em.findContentFileLocationAttachments(groups, item);
  } catch (_) {
    attachments = [];
  }

  const elementId = em.normalizePositiveId(item.elementId);
  if (elementId) {
    try {
      const detail = await em.fetchJson("/Contenido/getElemento/" + courseId + "/" + elementId, token);
      const detailItem = detail[0] || {};
      description = em.getContentDescription(detailItem);
      if (!attachments.length) {
        attachments = em.getContentAttachments(detailItem);
      }
    } catch (_) {
      description = "";
    }
  }

  return { attachments, description };
};

em.loadContentFilesForItem = async function (index) {
  const item = em.state.pending[index];
  if (!item || item.kind !== "content" || item.fileLocationLoaded || item.fileLocationLoading) return;
  const token = em.getToken();
  if (!token) {
    em.setStatus(em.t("error_no_token"));
    return;
  }

  item.fileLocationLoading = true;
  item.fileLocationError = "";
  em.renderPending(em.state.pending);

  try {
    const existingAttachments = Array.isArray(item.attachments) ? item.attachments : [];
    const lazyDetails = await em.getLazyContentDetails(token, item);
    const lazyAttachments = Array.isArray(lazyDetails.attachments) ? lazyDetails.attachments : [];
    const byId = new Map();
    existingAttachments.concat(lazyAttachments).forEach((attachment) => {
      if (!attachment) return;
      const key = String(attachment.id || attachment.name || "") + ":" + String(attachment.elementId || "");
      if (key && !byId.has(key)) byId.set(key, attachment);
    });
    item.attachments = Array.from(byId.values());
    if (!item.description && lazyDetails.description) {
      item.description = lazyDetails.description;
    }
    item.hasFiles = item.attachments.length > 0;
    if (item.hasFiles) {
      item.contentType = "files";
      item.contentTypeLabel = item.attachments.length === 1 ? "Archivo" : "Archivos";
    }
    item.fileLocationLoaded = true;
  } catch (err) {
    console.error("[Eminus Pending] No se pudieron cargar archivos de contenido", err);
    item.fileLocationError = "No se pudieron cargar los archivos.";
  } finally {
    item.fileLocationLoading = false;
    em.renderPending(em.state.pending);
  }
};

em.getContentPublishDate = function (entry) {
  const raw = em.pickFirst(entry, [
    "fechaPublicacionInicio",
    "FechaPublicacionInicio",
    "fechaPublicacion",
    "FechaPublicacion",
    "fechaRegistro",
    "FechaRegistro",
    "fechaAlta",
    "FechaAlta"
  ]);
  const parsed = em.parseEminusDate(raw);
  return {
    raw: parsed ? parsed.toISOString() : "",
    label: raw ? String(raw).trim() : ""
  };
};

em.buildContentItemFromUnit = function (unit, courseId, courseName, pinnedSet) {
  const unitId = em.getContentUnitId(unit);
  const unitName = String(em.pickFirst(unit, ["nombre", "Nombre", "unidad", "Unidad", "titulo", "Titulo"]) || em.t("no_title")).trim();
  if (!unitId || !unitName) return null;

  const publishDate = em.getContentPublishDate(unit);
  const id = courseId + ":content:unit:" + unitId;
  return {
    id,
    kind: "content",
    contentType: "unit",
    contentTypeLabel: "Módulo",
    courseId,
    unitId,
    elementId: "",
    activityId: "",
    course: courseName,
    title: unitName,
    description: em.getContentDescription(unit),
    deadlineRaw: "",
    deadlineStr: "",
    deadlineLabel: "",
    publishedRaw: publishDate.raw,
    publishedLabel: publishDate.label,
    urgency: "normal",
    archived: false,
    pinned: pinnedSet.has(id),
    estatus: "Publicado",
    entregada: false,
    completada: false,
    fechaEntrega: ""
  };
};

em.buildContentItemFromElement = function (element, unit, courseId, courseName, pinnedSet) {
  const elementId = em.getContentElementId(element);
  const unitId = em.getContentUnitId(unit) || em.normalizePositiveId(em.pickFirst(element, ["idUnidad", "IdUnidad"]));
  const title = String(em.pickFirst(element, ["titulo", "Titulo", "nombre", "Nombre"]) || em.t("no_title")).trim();
  if (!elementId || !title) return null;

  const unitName = String(em.pickFirst(unit, ["nombre", "Nombre", "unidad", "Unidad", "titulo", "Titulo"]) || em.pickFirst(element, ["unidad", "Unidad"]) || "").trim();
  const kindLabel = em.describeContentKind(element);
  const publishDate = em.getContentPublishDate(element);
  const attachments = em.getContentAttachments(element);
  const hasFiles = attachments.length > 0 || em.asBool(em.pickFirst(element, ["tieneAdjuntos", "TieneAdjuntos"]));
  const id = courseId + ":content:element:" + elementId;

  return {
    id,
    kind: "content",
    contentType: hasFiles ? "files" : "element",
    contentTypeLabel: kindLabel,
    courseId,
    unitId,
    elementId,
    activityId: "",
    course: courseName,
    title,
    description: em.getContentDescription(element),
    attachments,
    hasFiles,
    unitName,
    deadlineRaw: "",
    deadlineStr: "",
    deadlineLabel: "",
    publishedRaw: publishDate.raw,
    publishedLabel: publishDate.label,
    urgency: "normal",
    archived: false,
    pinned: pinnedSet.has(id),
    estatus: "Publicado",
    entregada: false,
    completada: false,
    fechaEntrega: ""
  };
};

em.mapWithConcurrency = async function (items, limit, mapper) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];

  const results = new Array(list.length);
  const workerCount = Math.min(Math.max(1, Number(limit) || 1), list.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(list[index], index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
};

em.buildPublishedContentData = async function (token, courses, pinnedSet) {
  pinnedSet = pinnedSet || new Set();
  const itemsByCourse = await em.mapWithConcurrency(courses, 3, async (cEntry) => {
    const course = cEntry?.curso || {};
    const courseId = em.normalizePositiveId(course.idCurso ?? cEntry?.idCurso ?? course.courseId ?? cEntry?.courseId);
    const courseName = String(course.nombre || "").trim();
    if (!courseId || !courseName) return [];

    let units = [];
    try {
      units = await em.fetchJson("/Contenido/getUnidades/" + courseId + "/0", token);
    } catch (_) {
      console.warn("[Eminus Pending] No se pudo cargar contenido del curso " + courseId + " (" + courseName + ")");
      return [];
    }

    const publishedUnits = units.filter(em.isPublishedContentEntry);
    const itemsByUnit = await em.mapWithConcurrency(publishedUnits, 4, async (unit) => {
      const unitItems = [];
      const unitItem = em.buildContentItemFromUnit(unit, courseId, courseName, pinnedSet);
      if (unitItem) unitItems.push(unitItem);

      const unitId = em.getContentUnitId(unit);
      if (!unitId) return unitItems;

      let elements = [];
      try {
        elements = await em.fetchJson("/Contenido/getElementos/" + courseId + "/" + unitId, token);
      } catch (_) {
        elements = [];
      }

      for (const element of elements.filter(em.isPublishedContentEntry)) {
        const elementItem = em.buildContentItemFromElement(element, unit, courseId, courseName, pinnedSet);
        if (elementItem) unitItems.push(elementItem);
      }
      return unitItems;
    });

    return itemsByUnit.flat();
  });

  const seen = new Set();
  return itemsByCourse.flat().filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

em.sortPendingItems = function (items) {
  if (!Array.isArray(items)) return [];
  items.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.kind === "content" && b.kind !== "content") return 1;
    if (a.kind !== "content" && b.kind === "content") return -1;
    if (a.kind === "content" && b.kind === "content") {
      if (a.publishedRaw && b.publishedRaw) {
        return new Date(b.publishedRaw).getTime() - new Date(a.publishedRaw).getTime();
      }
      if (a.publishedRaw) return -1;
      if (b.publishedRaw) return 1;
      return a.title.localeCompare(b.title);
    }
    if (!a.deadlineRaw && !b.deadlineRaw) return 0;
    if (!a.deadlineRaw) return 1;
    if (!b.deadlineRaw) return -1;
    return new Date(a.deadlineRaw).getTime() - new Date(b.deadlineRaw).getTime();
  });
  return items;
};

em.buildPendingData = async function (token, pinnedSet, options) {
  pinnedSet = pinnedSet || new Set();
  options = options || {};
  const coursesRaw = await em.fetchJson("/Course/getAllCourses", token);
  const courses = em.filterActiveCourses(coursesRaw);
  const pending = [];

  const activitiesByCourse = await em.mapWithConcurrency(courses, 4, async (cEntry) => {
    const course = cEntry?.curso || {};
    const courseId = em.normalizePositiveId(course.idCurso ?? cEntry?.idCurso ?? course.courseId ?? cEntry?.courseId);
    const courseName = String(course.nombre || "").trim();
    if (!courseId || !courseName) return [];

    let activities = [];
    try {
      activities = await em.fetchJson("/Activity/getActividadesEstudiante/" + courseId, token);
    } catch (_) {
      console.warn("[Eminus Pending] " + em.t("error_load_activities") + " " + courseId + " (" + courseName + ")");
      return [];
    }

    const coursePending = [];
    for (const act of activities) {
      if (!em.isActivityPending(act)) continue;

      const deadlineStr = em.getActivityDeadlineStr(act);
      const deadlineDate = em.parseEminusDate(deadlineStr);
      const remaining = em.getTimeRemaining(deadlineDate);
      const urgency = em.classifyUrgency(deadlineDate);

      const id = courseId + ":" + (act.idActividad || act.titulo || Math.random());

      coursePending.push({
        id,
        courseId,
        activityId: String(act.idActividad || ""),
        course: courseName,
        title: String(act.titulo || em.t("no_title")),
        deadlineRaw: deadlineDate ? deadlineDate.toISOString() : "",
        deadlineStr,
        deadlineLabel: remaining ? deadlineStr + " (" + remaining + ")" : deadlineStr,
        urgency,
        archived: false,
        pinned: pinnedSet.has(id),
        estatus: String(act.estatus || "").trim(),
        entregada: em.asBool(act.entregada),
        completada: em.asBool(act.completada),
        fechaEntrega: String(act.fechaEntrega || "").trim()
      });
    }
    return coursePending;
  });
  pending.push(...activitiesByCourse.flat());

  em.sortPendingItems(pending);
  if (typeof options.onActivitiesReady === "function") {
    await options.onActivitiesReady(pending.slice());
  }

  const contentItems = await em.buildPublishedContentData(token, courses, pinnedSet);
  pending.push(...contentItems);

  return em.sortPendingItems(pending);
};
