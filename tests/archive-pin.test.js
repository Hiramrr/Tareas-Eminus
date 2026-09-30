"use strict";
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

const em = loadEminus("i18n.js", "utils.js", "constants.js", "state.js", "qol.js", "api.js", "archive-pin.js");

let store;
let lastToast;

beforeEach(() => {
  store = {};
  lastToast = null;
  em.storageSet = async (payload) => Object.assign(store, payload);
  em.renderPending = () => {};
  em.setStatus = () => {};
  em.syncBadge = async () => {};
  em.showToast = (message, type, options) => { lastToast = options || null; };
  em.state.archivedIds = new Set();
  em.state.pinnedIds = new Set();
  em.state.lastScanIncomplete = false;
  em.state.lastUpdatedAt = null;
});

const undo = () => lastToast.action.onClick();

function task(id, extra) {
  return { id, course: "A", title: id, urgency: "normal", deadlineRaw: "", ...extra };
}

test("archiveItemByIndex: solo archiva tareas vencidas o contenido, y deshacer lo restaura", async () => {
  em.state.pending = [task("normal"), task("vencida", { urgency: "overdue" })];

  await em.archiveItemByIndex(0);
  assert.equal(em.state.pending[0].archived, undefined);
  assert.equal(lastToast, null);

  await em.archiveItemByIndex(1);
  assert.equal(em.state.pending[1].archived, true);
  assert.deepEqual(store[em.STORAGE_KEYS.ARCHIVED], ["vencida"]);

  await undo();
  assert.equal(em.state.pending[1].archived, false);
  assert.deepEqual(store[em.STORAGE_KEYS.ARCHIVED], []);
});

test("persistArchiveState: conserva la marca de lectura incompleta en el snapshot", async () => {
  em.state.pending = [task("vencida", { urgency: "overdue" })];
  em.state.lastScanIncomplete = true;

  await em.archiveItemByIndex(0);

  assert.equal(store[em.STORAGE_KEYS.SNAPSHOT].incomplete, true);
  assert.equal(store[em.STORAGE_KEYS.SNAPSHOT].pendingCount, 0);
});

test("archiveAllOverdue: deshacer no revierte lo archivado después", async () => {
  em.state.pending = [
    task("v1", { urgency: "overdue" }),
    task("v2", { urgency: "overdue" }),
    task("c1", { kind: "content" })
  ];

  await em.archiveAllOverdue();
  const undoOverdue = lastToast.action.onClick;
  await em.hideContentItemWithUndo(2);
  await undoOverdue();

  assert.deepEqual([...em.state.archivedIds], ["c1"]);
  assert.deepEqual(em.state.pending.map((item) => item.archived), [false, false, true]);
});

test("archiveContentByCourse: deshacer tras un re-escaneo también afecta a los items nuevos", async () => {
  em.state.pending = [task("c1", { kind: "content" }), task("c2", { kind: "content", course: "B" })];

  await em.archiveContentByCourse("A");
  assert.deepEqual([...em.state.archivedIds], ["c1"]);

  // Un escaneo reemplaza los objetos y reaplica el estado archivado.
  em.state.pending = em.applyArchivedState([task("c1", { kind: "content" }), task("c2", { kind: "content", course: "B" })], em.state.archivedIds);
  assert.equal(em.state.pending[0].archived, true);

  await undo();
  assert.equal(em.state.pending[0].archived, false);
  assert.deepEqual([...em.state.archivedIds], []);
});

test("restoreHiddenContentByCourse: solo restaura el curso indicado", async () => {
  em.state.pending = [task("c1", { kind: "content", archived: true }), task("c2", { kind: "content", course: "B", archived: true })];
  em.state.archivedIds = new Set(["c1", "c2"]);

  await em.restoreHiddenContentByCourse("A");

  assert.deepEqual([...em.state.archivedIds], ["c2"]);
  assert.equal(em.state.pending.find((item) => item.id === "c1").archived, false);
});

test("pinItemByIndex / unpinItemByIndex: persisten y suben lo fijado al inicio", async () => {
  em.state.pending = [task("a", { deadlineRaw: inDays(1) }), task("b", { deadlineRaw: inDays(5) })];

  await em.pinItemByIndex(1);
  assert.deepEqual(em.state.pending.map((item) => item.id), ["b", "a"]);
  assert.deepEqual(store[em.STORAGE_KEYS.PINNED], ["b"]);

  await em.unpinItemByIndex(0);
  assert.deepEqual(em.state.pending.map((item) => item.id), ["a", "b"]);
  assert.deepEqual(store[em.STORAGE_KEYS.PINNED], []);
});

test("unpinAllItems: deshacer vuelve a fijar solo esos y respeta lo fijado después", async () => {
  em.state.pending = [task("a", { pinned: true }), task("b", { pinned: true }), task("c")];
  em.state.pinnedIds = new Set(["a", "b"]);

  await em.unpinAllItems();
  const undoUnpin = lastToast.action.onClick;
  assert.deepEqual([...em.state.pinnedIds], []);

  await em.pinItemByIndex(em.state.pending.findIndex((item) => item.id === "c"));
  await undoUnpin();

  assert.deepEqual([...em.state.pinnedIds].sort(), ["a", "b", "c"]);
  assert.deepEqual(store[em.STORAGE_KEYS.PINNED].sort(), ["a", "b", "c"]);
  assert.ok(em.state.pending.every((item) => item.pinned));
});

function inDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
