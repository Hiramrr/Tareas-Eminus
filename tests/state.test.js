"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

const em = loadEminus("i18n.js", "utils.js", "constants.js", "state.js", "qol.js");

const HOUR = 60 * 60 * 1000;
const inHours = (hours) => new Date(Date.now() + hours * HOUR).toISOString();

test("normalize*Ids: solo arreglos, sin vacíos y como texto", () => {
  for (const normalize of [em.normalizeArchivedIds, em.normalizePinnedIds, em.normalizeNotifiedUpcomingIds]) {
    assert.deepEqual(normalize(null), new Set());
    assert.deepEqual(normalize({ a: 1 }), new Set());
    assert.deepEqual(normalize(["17:42", "", 18, "17:42"]), new Set(["17:42", "18"]));
  }
});

test("applyArchivedState / pruneArchivedIds: marca y poda según los items presentes", () => {
  const items = [{ id: "a" }, { id: "b" }, null, {}];
  em.applyArchivedState(items, new Set(["a", "gone"]));

  assert.equal(items[0].archived, true);
  assert.equal(items[1].archived, false);
  assert.deepEqual(em.pruneArchivedIds(items, new Set(["a", "gone"])), new Set(["a"]));
  assert.deepEqual(em.pruneArchivedIds(null, new Set(["a"])), new Set());
});

test("applyPinnedState / prunePinnedIds: marca y poda según los items presentes", () => {
  const items = [{ id: "a" }, { id: "b" }];
  em.applyPinnedState(items, new Set(["b", "gone"]));

  assert.equal(items[0].pinned, false);
  assert.equal(items[1].pinned, true);
  assert.deepEqual(em.prunePinnedIds(items, new Set(["b", "gone"])), new Set(["b"]));
});

test("getVisiblePending / getVisibleContent: separan tareas y contenido y ocultan archivados", () => {
  const items = [
    { id: "t1" },
    { id: "t2", archived: true },
    { id: "c1", kind: "content" },
    { id: "c2", kind: "content", archived: true }
  ];

  assert.deepEqual(em.getVisiblePending(items).map((i) => i.id), ["t1"]);
  assert.deepEqual(em.getVisibleContent(items).map((i) => i.id), ["c1"]);
  assert.equal(em.getVisiblePendingCount(items), 1);
  assert.deepEqual(em.getVisiblePending("x"), []);
});

function filterIds(items, filters) {
  return em.applyAdvancedFilters(items, { query: "", course: "all", urgency: "all", dateRange: "all", sort: "deadline", ...filters })
    .map((item) => item.id)
    .sort();
}

test("applyAdvancedFilters: curso, urgencia y búsqueda en título, curso y descripción", () => {
  const items = [
    { id: "a", course: "Álgebra", title: "Matrices", urgency: "urgent", deadlineRaw: inHours(30) },
    { id: "b", course: "Física", title: "Vectores", urgency: "normal", deadlineRaw: inHours(100), description: "Leer capítulo de matrices" },
    { id: "c", course: "Física", title: "Óptica", urgency: "overdue", deadlineRaw: inHours(-5) }
  ];

  assert.deepEqual(filterIds(items, { course: "Física" }), ["b", "c"]);
  assert.deepEqual(filterIds(items, { urgency: "overdue" }), ["c"]);
  assert.deepEqual(filterIds(items, { query: "  MATRICES " }), ["a", "b"]);
  assert.deepEqual(filterIds(items, { course: "Física", query: "matrices" }), ["b"]);
});

test("applyAdvancedFilters: rangos de fecha", () => {
  const items = [
    { id: "sin-fecha", deadlineRaw: "" },
    { id: "vencida-hace-un-minuto", deadlineRaw: new Date(Date.now() - 60 * 1000).toISOString() },
    { id: "vencida-ayer", deadlineRaw: inHours(-30) },
    { id: "en-2-dias", deadlineRaw: inHours(48) },
    { id: "en-5-dias", deadlineRaw: inHours(120) },
    { id: "en-20-dias", deadlineRaw: inHours(480) },
    { id: "fecha-rota", deadlineRaw: "no es fecha" }
  ];

  assert.deepEqual(filterIds(items, { dateRange: "nodate" }), ["sin-fecha"]);
  assert.deepEqual(filterIds(items, { dateRange: "3d" }), ["en-2-dias"]);
  assert.deepEqual(filterIds(items, { dateRange: "7d" }), ["en-2-dias", "en-5-dias"]);
  assert.deepEqual(filterIds(items, { dateRange: "30d" }), ["en-2-dias", "en-20-dias", "en-5-dias"]);
  // Vencida en cuanto pasa la hora, como classifyUrgency: también las de hoy.
  assert.deepEqual(filterIds(items, { dateRange: "overdue" }), ["vencida-ayer", "vencida-hace-un-minuto"]);
});

test("applyContentFilters: tipo, módulo, búsqueda y orden", () => {
  em.state.contentFilters = { type: "all", module: "all", sort: "newest" };
  const items = [
    { id: "viejo", course: "A", courseId: "1", unitId: "10", title: "Beta", contentType: "file", publishedRaw: "2026-01-01T00:00:00Z", fileLocationLoaded: true },
    { id: "nuevo", course: "A", courseId: "1", unitId: "11", title: "Alfa", contentType: "message", publishedRaw: "2026-03-01T00:00:00Z" },
    { id: "unidad", course: "B", courseId: "2", unitId: "20", title: "Gamma", contentType: "unit", publishedRaw: "2026-02-01T00:00:00Z" }
  ];
  const run = (contentFilters, filters) => {
    em.state.contentFilters = { type: "all", module: "all", sort: "newest", ...contentFilters };
    return em.applyContentFilters(items, { query: "", course: "all", ...filters }).map((item) => item.id);
  };

  assert.deepEqual(run({}), ["nuevo", "unidad", "viejo"]);
  assert.deepEqual(run({ sort: "oldest" }), ["viejo", "unidad", "nuevo"]);
  assert.deepEqual(run({ sort: "title" }), ["nuevo", "viejo", "unidad"]);
  assert.deepEqual(run({ module: "1:10" }), ["viejo"]);
  assert.deepEqual(run({}, { course: "B" }), ["unidad"]);
  assert.deepEqual(run({}, { query: "alfa" }), ["nuevo"]);
  assert.deepEqual(run({ type: "file" }), ["viejo"]);
  // Con "files", una unidad cuyos archivos aún no se cargan puede contenerlos:
  // no se descarta.
  assert.deepEqual(run({ type: "files" }), ["unidad"]);
});
