window.eminus = window.eminus || {};

var em = window.eminus;

// Descarga de una tarea completa: un .zip con la descripción en PDF y los
// archivos adjuntos por el docente. PDF y ZIP se generan aquí mismo, sin
// dependencias, para no cargar librerías en cada página de Eminus.

em.ACTIVITY_FILE_URL = "https://eminus.uv.mx/eminusapi8/api/Activity/descargaArchivo/";

em.CRC32_TABLE = null;

em.crc32 = function (bytes) {
  if (!em.CRC32_TABLE) {
    em.CRC32_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      em.CRC32_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = em.CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

// ZIP sin compresión (método 0): los adjuntos suelen ser PDF, imágenes u
// Office, que ya vienen comprimidos. Nombres en UTF-8 (bit 11).
em.buildZip = function (files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = em.crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    localParts.push(local.buffer, nameBytes, data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    centralParts.push(central.buffer, nameBytes);

    offset += 30 + nameBytes.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, end.buffer], { type: "application/zip" });
};

// Caracteres de WinAnsiEncoding fuera de Latin-1 (rango 0x80-0x9F).
em.PDF_WIN_ANSI_EXTRA = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91,
  "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98,
  "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f
};

// Texto a cadena literal de PDF en WinAnsi. Lo que no cabe en la fuente
// estándar (emoji, CJK) se sustituye por "?".
em.toPdfString = function (text) {
  let out = "";
  for (const ch of String(text || "")) {
    const code = ch.codePointAt(0);
    let byte;
    if (code >= 0x20 && code < 0x7f) byte = code;
    else if (code >= 0xa0 && code <= 0xff) byte = code;
    else if (em.PDF_WIN_ANSI_EXTRA[ch]) byte = em.PDF_WIN_ANSI_EXTRA[ch];
    else if (code === 0x09) byte = 0x20;
    else byte = 0x3f;
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += "\\" + String.fromCharCode(byte);
    else if (byte >= 0x80) out += "\\" + byte.toString(8).padStart(3, "0");
    else out += String.fromCharCode(byte);
  }
  return "(" + out + ")";
};

em.wrapPdfLine = function (text, maxChars) {
  const words = String(text || "").split(/ +/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    while (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!current) current = word;
    else if (current.length + 1 + word.length <= maxChars) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  });
  lines.push(current);
  return lines;
};

// PDF A4 de texto en Courier. blocks: [{ text, bold?, size?, gap? }].
em.buildTextPdf = function (blocks) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const pages = [];
  let ops = [];
  let y = pageHeight - margin;

  const newPage = () => {
    if (ops.length) pages.push(ops.join("\n"));
    ops = [];
    y = pageHeight - margin;
  };

  blocks.forEach((block) => {
    const size = block.size || 10;
    const leading = Math.round(size * 1.4);
    const maxChars = Math.floor((pageWidth - margin * 2) / (size * 0.6));
    const font = block.bold ? "/F2" : "/F1";
    y -= block.gap || 0;
    String(block.text || "").split(/\r?\n/).forEach((paragraph) => {
      em.wrapPdfLine(paragraph, maxChars).forEach((line) => {
        if (y - leading < margin) newPage();
        y -= leading;
        if (line) ops.push("BT " + font + " " + size + " Tf " + margin + " " + y + " Td " + em.toPdfString(line) + " Tj ET");
      });
    });
  });
  newPage();
  if (!pages.length) pages.push("");

  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>";
  const kids = [];
  pages.forEach((content, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    kids.push(pageId + " 0 R");
    objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageWidth + " " + pageHeight + "] " +
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentId + " 0 R >>";
    objects[contentId] = "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream";
  });
  objects[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + pages.length + " >>";

  // Todo el contenido ya es ASCII (toPdfString escapa en octal), así que la
  // longitud en caracteres coincide con la de bytes para los offsets.
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += id + " 0 obj\n" + objects[id] + "\nendobj\n";
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let id = 1; id < objects.length; id += 1) {
    pdf += String(offsets[id]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n";
  return new TextEncoder().encode(pdf);
};

// Conserva saltos de párrafo antes de pasar por stripHtml, que colapsa
// todo el espacio en blanco.
em.htmlToPlainText = function (html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .split("\n")
    .map((line) => em.stripHtml(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

em.sanitizeFileName = function (name, fallback) {
  const clean = String(name || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[^\x20-\uffff]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return clean || fallback || "archivo";
};

em.uniqueFileName = function (name, used) {
  let candidate = name;
  let counter = 2;
  while (used.has(candidate.toLowerCase())) {
    const dot = name.lastIndexOf(".");
    candidate = dot > 0
      ? name.slice(0, dot) + " (" + counter + ")" + name.slice(dot)
      : name + " (" + counter + ")";
    counter += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

em.getActivityAttachments = function (detail) {
  const raw = em.pickFirst(detail, ["archivosActsConTamano", "ArchivosActsConTamano", "archivosActividad", "archivos", "Archivos"]);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((file) => {
      if (!file || typeof file !== "object") return null;
      const id = em.normalizePositiveId(em.pickFirst(file, ["idArchivosActividades", "IdArchivosActividades", "idArchivo", "IdArchivo", "id"]));
      if (!id) return null;
      return {
        id,
        name: String(em.pickFirst(file, ["nombreTratado", "NombreTratado", "nombreOriginal", "NombreOriginal", "nombre", "Nombre"]) || "archivo").trim(),
        size: Number(em.pickFirst(file, ["tamano", "Tamano", "size"]) || 0)
      };
    })
    .filter(Boolean);
};

em.buildActivityPdfBlocks = function (item, detail, description, fileResults) {
  const blocks = [
    { text: item.title || em.t("no_title"), bold: true, size: 14 },
    { text: item.course || "", gap: 4 },
    { text: "Entrega: " + (item.deadlineStr || em.t("due_nodate")) },
    { text: "Descargado: " + new Date().toLocaleString("es-MX") }
  ];
  const value = em.pickFirst(detail, ["valor", "Valor"]);
  if (value !== "" && value !== undefined && value !== null) blocks.push({ text: "Valor: " + value });
  blocks.push({ text: "Descripción", bold: true, size: 11, gap: 14 });
  blocks.push({ text: description || "(sin descripción)", gap: 4 });
  if (fileResults.length) {
    blocks.push({ text: "Archivos adjuntos", bold: true, size: 11, gap: 14 });
    blocks.push({
      text: fileResults.map((file) => "- " + file.name + (file.ok ? "" : "  [no se pudo descargar]")).join("\n"),
      gap: 4
    });
  }
  return blocks;
};

em.downloadActivityBundle = async function (item) {
  if (!item || item.kind === "content") return;
  const courseId = em.normalizePositiveId(item.courseId);
  const activityId = em.normalizePositiveId(item.activityId);
  const token = em.getToken();
  if (!token) {
    em.setStatus(em.t("error_no_token"));
    return;
  }
  if (!courseId || !activityId) {
    em.setStatus(em.t("error_nav_no_id"));
    em.showToast(em.t("error_nav_no_id"), "error");
    return;
  }
  if (em.state.bundleDownloads?.has(item.id)) return;
  em.state.bundleDownloads = em.state.bundleDownloads || new Set();
  em.state.bundleDownloads.add(item.id);

  try {
    em.setStatus(em.t("status_zip_preparing") + ": " + item.title);
    const rows = await em.fetchJson("/Activity/getActividadEstudiante/" + courseId + "/" + activityId, token);
    const detail = rows[0] || {};
    const description = em.htmlToPlainText(em.pickFirst(detail, ["descripcion", "Descripcion", "instrucciones", "Instrucciones"]));
    const attachments = em.getActivityAttachments(detail);

    const usedNames = new Set();
    const baseName = em.sanitizeFileName(item.title, "tarea-" + activityId);
    const pdfName = em.uniqueFileName(baseName + ".pdf", usedNames);
    const fileResults = await em.mapWithConcurrency(attachments, 3, async (attachment) => {
      const name = em.sanitizeFileName(attachment.name, "archivo-" + attachment.id);
      try {
        const response = await fetch(em.ACTIVITY_FILE_URL +
          encodeURIComponent(courseId) + "/" +
          encodeURIComponent(activityId) + "/" +
          encodeURIComponent(attachment.id) + "/1", {
          method: "GET",
          headers: { Authorization: "Bearer " + token }
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return { name, ok: true, data: new Uint8Array(await response.arrayBuffer()) };
      } catch (err) {
        console.warn("[Eminus Pending] No se pudo descargar el adjunto " + attachment.id, err);
        return { name, ok: false };
      }
    });

    const zipFiles = [{ name: pdfName, data: em.buildTextPdf(em.buildActivityPdfBlocks(item, detail, description, fileResults)) }];
    fileResults.forEach((file) => {
      if (file.ok) zipFiles.push({ name: "adjuntos/" + em.uniqueFileName(file.name, usedNames), data: file.data });
    });

    const url = URL.createObjectURL(em.buildZip(zipFiles));
    const link = document.createElement("a");
    link.href = url;
    link.download = baseName + ".zip";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);

    const failed = fileResults.filter((file) => !file.ok).length;
    em.setStatus(em.t("status_zip_done").replace("{n}", String(fileResults.length - failed)));
    if (failed) em.showToast(em.t("status_zip_partial").replace("{n}", String(failed)), "error");
  } catch (err) {
    console.error("[Eminus Pending] Error al descargar la tarea", err);
    em.setStatus(em.t("status_zip_error"));
    em.showToast(em.t("status_zip_error"), "error");
  } finally {
    em.state.bundleDownloads.delete(item.id);
  }
};
