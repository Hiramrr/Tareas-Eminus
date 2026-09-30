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

function jwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return encode({ alg: "HS256" }) + "." + encode(payload) + ".firma";
}

test("getAccountIdFromToken: usa el primer claim de identidad disponible", () => {
  assert.equal(em.getAccountIdFromToken(jwt({ nameid: "zS21001", exp: 1 })), "zS21001");
  assert.equal(em.getAccountIdFromToken(jwt({ sub: 42 })), "42");
  assert.equal(em.getAccountIdFromToken(jwt({ unique_name: "Ñandú" })), "Ñandú");
});

test("getAccountIdFromToken: sin claim estable devuelve null, no el payload", () => {
  // Dos tokens de la misma cuenta que solo difieren en exp no deben parecer
  // cuentas distintas.
  assert.equal(em.getAccountIdFromToken(jwt({ exp: 1 })), null);
  assert.equal(em.getAccountIdFromToken(jwt({ exp: 2 })), null);
  assert.equal(em.getAccountIdFromToken("no-es-un-jwt"), null);
  assert.equal(em.getAccountIdFromToken("a.%%%.c"), null);
  assert.equal(em.getAccountIdFromToken(""), null);
});

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
