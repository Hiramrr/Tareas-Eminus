"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// chrome.* se sustituye por un stub que acepta cualquier llamada: al cargarse,
// el service worker solo registra listeners y restaura alarmas.
function chromeStub() {
  const fn = () => proxy;
  const proxy = new Proxy(fn, {
    get: (_, key) => (key === "then" ? undefined : proxy),
    apply: () => Promise.resolve({})
  });
  return proxy;
}

function loadServiceWorker(fetchImpl) {
  const context = vm.createContext({
    chrome: chromeStub(),
    fetch: fetchImpl,
    AbortSignal,
    URL,
    setTimeout,
    console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8"), context);
  return context;
}

function jsonResponse(status, body, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

const noWait = async () => {};

test("requestJsonWithRetry: reintenta un 503 y devuelve la respuesta buena", async () => {
  const statuses = [503, 200];
  let calls = 0;
  const sw = loadServiceWorker(async () => jsonResponse(statuses[calls++], { contenido: [1] }));

  const result = await sw.requestJsonWithRetry({ url: "https://eminus.uv.mx/x" }, noWait);

  assert.equal(calls, 2);
  assert.equal(result.ok, true);
});

test("requestJsonWithRetry: no reintenta 500 ni 401", async () => {
  for (const status of [500, 401]) {
    let calls = 0;
    const sw = loadServiceWorker(async () => { calls += 1; return jsonResponse(status, {}); });
    const result = await sw.requestJsonWithRetry({ url: "https://eminus.uv.mx/x" }, noWait);
    assert.equal(calls, 1);
    assert.equal(result.status, status);
  }
});

test("requestJsonWithRetry: se rinde tras dos reintentos y respeta Retry-After", async () => {
  let calls = 0;
  const waits = [];
  const sw = loadServiceWorker(async () => { calls += 1; return jsonResponse(429, {}, { "Retry-After": "2" }); });

  const result = await sw.requestJsonWithRetry({ url: "https://eminus.uv.mx/x" }, async (ms) => { waits.push(ms); });

  assert.equal(calls, 3);
  assert.equal(result.status, 429);
  assert.deepEqual(waits, [2000, 2000]);
});

test("requestJsonWithRetry: reintenta errores de red pero no timeouts", async () => {
  let calls = 0;
  const sw = loadServiceWorker(async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("Failed to fetch");
    return jsonResponse(200, {});
  });
  assert.equal((await sw.requestJsonWithRetry({ url: "https://eminus.uv.mx/x" }, noWait)).ok, true);
  assert.equal(calls, 2);

  calls = 0;
  const timeout = loadServiceWorker(async () => {
    calls += 1;
    throw new DOMException("timeout", "TimeoutError");
  });
  await assert.rejects(timeout.requestJsonWithRetry({ url: "https://eminus.uv.mx/x" }, noWait), { name: "TimeoutError" });
  assert.equal(calls, 1);
});
