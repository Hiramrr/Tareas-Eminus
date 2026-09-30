"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

const em = loadEminus("i18n.js", "utils.js", "constants.js", "state.js", "read-state.js", "qol.js", "api.js", "scan.js");
const fetchJson = em.fetchJson;

test("buildPendingData: consulta cursos y actividades y conserva solo pendientes", async () => {
  const paths = [];
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  em.fetchJson = async (path) => {
    paths.push(path);
    if (path === "/Course/getAllCourses") return [{ curso: { idCurso: 17, nombre: "Álgebra" } }];
    if (path === "/Activity/getActividadesEstudiante/17") {
      return [
        { idActividad: 42, titulo: "Tarea", fechaTermino: deadline },
        { idActividad: 43, titulo: "Entregada", fechaTermino: deadline, entregada: true }
      ];
    }
    if (path === "/Contenido/getUnidades/17/0") return [];
    throw new Error("Endpoint inesperado: " + path);
  };

  try {
    const pending = await em.buildPendingData("token", new Set());

    assert.deepEqual(paths, [
      "/Course/getAllCourses",
      "/Activity/getActividadesEstudiante/17",
      "/Contenido/getUnidades/17/0"
    ]);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, "17:42");
    assert.equal(pending[0].title, "Tarea");
  } finally {
    em.fetchJson = fetchJson;
  }
});

test("fetchJson: conserva el estado HTTP 401 para detectar la sesión vencida", async () => {
  em.hasRuntimeApi = true;
  global.chrome = {
    runtime: {
      sendMessage: async () => ({ ok: false, status: 401, error: "HTTP 401" })
    }
  };

  await assert.rejects(em.fetchJson("/Course/getAllCourses", "token"), (error) => {
    assert.equal(error.status, 401);
    assert.match(error.message, /401/);
    assert.equal(em.isUnauthorizedError(error), true);
    return true;
  });
});

test("hydrateFromStorage: borra los datos asociados a la cuenta anterior", async () => {
  let saved;
  em.getToken = () => "token-nuevo";
  em.getAccountIdFromToken = () => "cuenta-nueva";
  em.storageGet = async () => ({ [em.STORAGE_KEYS.ACCOUNT_ID]: "cuenta-anterior" });
  em.preferencesGet = async () => ({});
  em.storageSet = async (payload) => { saved = payload; };
  em.renderPending = () => {};
  em.renderLogs = () => {};
  em.syncBadge = async () => {};
  em.applyCustomTheme = () => {};
  em.setFont = () => {};
  em.panelEls = null;

  await em.hydrateFromStorage();

  assert.equal(saved[em.STORAGE_KEYS.SNAPSHOT], null);
  assert.deepEqual(saved[em.STORAGE_KEYS.LOG], []);
  assert.equal(saved[em.STORAGE_KEYS.ACCOUNT_ID], "cuenta-nueva");
});

test("renderCachedSnapshotFallback: restaura la última lectura y sus fijados", async () => {
  const item = { id: "17:42", title: "Tarea", deadlineRaw: "", pinned: false };
  em.storageGet = async () => ({
    [em.STORAGE_KEYS.SNAPSHOT]: { pending: [item], updatedAt: "2026-09-24T12:00:00.000Z" },
    [em.STORAGE_KEYS.PINNED]: [item.id]
  });
  em.renderPending = () => {};
  em.renderLogs = () => {};
  em.updateAutoRefreshLabel = () => {};
  em.panelEls = null;

  const restored = await em.renderCachedSnapshotFallback();

  assert.equal(restored, true);
  assert.equal(em.state.pending[0].id, item.id);
  assert.equal(em.state.pending[0].pinned, true);
  assert.equal(em.state.lastUpdatedAt, "2026-09-24T12:00:00.000Z");
});

test("buildPendingData: anota en failures los cursos que no se pudieron leer", async () => {
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  em.fetchJson = async (path) => {
    if (path === "/Course/getAllCourses") {
      return [{ curso: { idCurso: 17, nombre: "Álgebra" } }, { curso: { idCurso: 18, nombre: "Física" } }];
    }
    if (path === "/Activity/getActividadesEstudiante/17") return [{ idActividad: 42, titulo: "Tarea", fechaTermino: deadline }];
    if (path === "/Activity/getActividadesEstudiante/18") throw new Error("HTTP 500");
    if (path === "/Contenido/getUnidades/17/0") return [];
    if (path === "/Contenido/getUnidades/18/0") throw new Error("timeout");
    throw new Error("Endpoint inesperado: " + path);
  };

  try {
    const failures = [];
    const pending = await em.buildPendingData("token", new Set(), { failures });

    assert.deepEqual(pending.map((item) => item.id), ["17:42"]);
    assert.deepEqual(failures.sort(), ["/Activity/getActividadesEstudiante/18", "/Contenido/getUnidades/18/0"]);
  } finally {
    em.fetchJson = fetchJson;
  }
});

test("fetchJson: nunca hay más de MAX_INFLIGHT_REQUESTS peticiones en vuelo", async () => {
  let active = 0;
  let peak = 0;
  em.hasRuntimeApi = true;
  global.chrome = {
    runtime: {
      sendMessage: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return { ok: true, contenido: [] };
      }
    }
  };

  // Fan-out anidado como el de buildPublishedContentData: 6 cursos × 6 unidades.
  const ids = Array.from({ length: 6 }, (_, i) => i + 1);
  await em.mapWithConcurrency(ids, 6, (course) =>
    em.mapWithConcurrency(ids, 6, (unit) => em.fetchJson("/Activity/x/" + course + "/" + unit, "token"))
  );

  assert.equal(peak, em.MAX_INFLIGHT_REQUESTS);
  assert.equal(em.inflightRequests, 0);
  assert.equal(em.inflightQueue.length, 0);
});
