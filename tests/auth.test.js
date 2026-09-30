"use strict";
const { test, mock } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

global.window = global.window || {};
window.setTimeout = (...args) => setTimeout(...args);
window.clearTimeout = (id) => clearTimeout(id);
window.addEventListener = () => {};
window.removeEventListener = () => {};

const em = loadEminus("auth.js");

test("startTokenWatcher: sondea rápido al inicio, se espacia después y avisa al llegar el token", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let token = "";
  let reads = 0;
  em.getToken = () => { reads += 1; return token; };
  const received = [];
  // tick no dispara los timers programados dentro de otro timer en el mismo
  // avance, así que se avanza en pasos de 100 ms.
  const advance = (ms) => { for (let t = 0; t < ms; t += 100) mock.timers.tick(100); };

  try {
    em.startTokenWatcher((value) => received.push(value));
    const afterStart = reads;

    advance(10 * 1000);
    assert.equal(reads - afterStart, 20, "cada 0.5 s en la ventana rápida");

    advance(em.TOKEN_WATCH_FAST_WINDOW_MS);
    const slowStart = reads;
    advance(60 * 1000);
    assert.equal(reads - slowStart, 12, "cada 5 s después");

    token = "nuevo";
    advance(em.TOKEN_WATCH_SLOW_INTERVAL_MS);
    assert.deepEqual(received, ["nuevo"]);
    assert.equal(em.tokenWatchTimer, null);

    const readsAfterStop = reads;
    advance(60 * 1000);
    assert.equal(reads, readsAfterStop, "no sigue sondeando tras avisar");
  } finally {
    em.stopTokenWatcher();
    mock.timers.reset();
  }
});
