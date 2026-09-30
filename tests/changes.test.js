"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

const em = loadEminus("i18n.js", "utils.js", "constants.js", "state.js", "changes.js");

function withStorage(initial) {
  const store = { ...initial };
  em.storageGet = async () => ({ ...store });
  em.storageSet = async (payload) => Object.assign(store, payload);
  return store;
}

test("appendLog: una lectura completa reemplaza los IDs conocidos", async () => {
  const store = withStorage({});
  await em.appendLog([{ id: "17:42", course: "A", title: "T" }], new Set(["17:42", "18:7"]));

  assert.deepEqual(store[em.STORAGE_KEYS.KNOWN_IDS], ["17:42"]);
  assert.equal(store[em.STORAGE_KEYS.SNAPSHOT].incomplete, false);
});

test("appendLog: una lectura incompleta conserva los IDs de los cursos que fallaron", async () => {
  const store = withStorage({});
  const known = new Set(["17:42", "18:7"]);
  const meta = await em.appendLog([{ id: "17:42", course: "A", title: "T" }], known, null, null, { incomplete: true });

  assert.equal(meta.newCount, 0);
  assert.deepEqual(store[em.STORAGE_KEYS.KNOWN_IDS].sort(), ["17:42", "18:7"]);
  assert.equal(store[em.STORAGE_KEYS.SNAPSHOT].incomplete, true);

  // La siguiente lectura completa ya no cuenta 18:7 como nueva.
  const next = await em.appendLog(
    [{ id: "17:42", course: "A", title: "T" }, { id: "18:7", course: "B", title: "U" }],
    new Set(store[em.STORAGE_KEYS.KNOWN_IDS])
  );
  assert.equal(next.newCount, 0);
});
