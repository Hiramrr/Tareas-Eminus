"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

const em = loadEminus("i18n.js");

test("t: traduce según el idioma activo", () => {
  em.state = { lang: "en" };
  assert.equal(em.t("tab_today"), "Today");
  em.state = { lang: "es" };
  assert.equal(em.t("tab_today"), "Hoy");
});

test("t: cae a español si el idioma no existe y devuelve la clave si no hay texto", () => {
  em.state = { lang: "de" };
  assert.equal(em.t("tab_today"), "Hoy");
  em.state = { lang: "es" };
  assert.equal(em.t("clave_inexistente"), "clave_inexistente");
});

test("la agenda tiene los 7 días en todos los idiomas", () => {
  for (const lang of Object.keys(em.i18n)) {
    for (let day = 0; day < 7; day++) {
      assert.ok(em.i18n[lang]["day_" + day], `falta day_${day} en ${lang}`);
    }
  }
});
