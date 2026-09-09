"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

const em = loadEminus("themes-data.js");

const PALETTE_KEYS = ["bg", "text", "border", "accent", "overdue", "imminent", "urgent"];
const HEX = /^#[0-9a-f]{6}$/;

test("themes-data: ids únicos y etiquetas presentes", () => {
  const ids = em.THEMES.map((theme) => theme.id);
  assert.equal(new Set(ids).size, ids.length, "hay ids de tema repetidos");
  for (const theme of em.THEMES) {
    assert.ok(theme.id && theme.label, `tema sin id o etiqueta: ${JSON.stringify(theme)}`);
  }
});

test("themes-data: cada paleta tiene los 7 colores en hex válido", () => {
  for (const theme of em.THEMES) {
    assert.deepEqual(Object.keys(theme.palette).sort(), [...PALETTE_KEYS].sort(), `paleta incompleta en ${theme.id}`);
    for (const key of PALETTE_KEYS) {
      assert.match(theme.palette[key], HEX, `color inválido en ${theme.id}.${key}`);
    }
  }
});

test("themes-data: THEME_PRESETS refleja la lista", () => {
  assert.equal(Object.keys(em.THEME_PRESETS).length, em.THEMES.length);
  for (const theme of em.THEMES) {
    assert.equal(em.THEME_PRESETS[theme.id], theme.palette);
  }
});
