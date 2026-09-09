"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadEminus = require("./load");

// utils.js usa em.t para textos de fechas, así que i18n.js va primero.
const em = loadEminus("i18n.js", "utils.js");

const HOUR = 60 * 60 * 1000;

test("parseEminusDate: formato de Eminus dd/mes/aaaa - hh:mm", () => {
  assert.deepEqual(em.parseEminusDate("15/mar/2025 - 23:59"), new Date(2025, 2, 15, 23, 59));
  assert.deepEqual(em.parseEminusDate("01/ene/2026 - 08:05"), new Date(2026, 0, 1, 8, 5));
  assert.deepEqual(em.parseEminusDate("31/DIC/2024 - 0:00"), new Date(2024, 11, 31, 0, 0));
});

test("parseEminusDate: acepta ISO como respaldo", () => {
  assert.deepEqual(em.parseEminusDate("2025-03-15T10:30:00"), new Date(2025, 2, 15, 10, 30));
});

test("parseEminusDate: sin fecha o basura devuelve null", () => {
  assert.equal(em.parseEminusDate("Sin fecha"), null);
  assert.equal(em.parseEminusDate(""), null);
  assert.equal(em.parseEminusDate(null), null);
  assert.equal(em.parseEminusDate("no es una fecha"), null);
});

test("classifyUrgency: umbrales de 24 h y 48 h", () => {
  const now = Date.now();
  assert.equal(em.classifyUrgency(null), "normal");
  assert.equal(em.classifyUrgency(new Date(now - HOUR)), "overdue");
  assert.equal(em.classifyUrgency(new Date(now + HOUR)), "imminent");
  assert.equal(em.classifyUrgency(new Date(now + 30 * HOUR)), "urgent");
  assert.equal(em.classifyUrgency(new Date(now + 72 * HOUR)), "normal");
});

test("asBool: valores de la API de Eminus", () => {
  assert.equal(em.asBool("sin entregar"), false);
  assert.equal(em.asBool("pendiente"), false);
  assert.equal(em.asBool("Entregada"), true);
  assert.equal(em.asBool("sí"), true);
  assert.equal(em.asBool(0), false);
  assert.equal(em.asBool(1), true);
  assert.equal(em.asBool(null), false);
  assert.equal(em.asBool(""), false);
});

test("hasDeliveryDate: distingue fechas reales de marcadores vacíos", () => {
  assert.equal(em.hasDeliveryDate(null), false);
  assert.equal(em.hasDeliveryDate(""), false);
  assert.equal(em.hasDeliveryDate("null"), false);
  assert.equal(em.hasDeliveryDate("Sin entregar"), false);
  assert.equal(em.hasDeliveryDate("15/mar/2025 - 10:00"), true);
});

test("isActivityPending: entregada o completada no está pendiente", () => {
  assert.equal(em.isActivityPending({}), true);
  assert.equal(em.isActivityPending({ entregada: true }), false);
  assert.equal(em.isActivityPending({ completada: "sí" }), false);
  assert.equal(em.isActivityPending({ estatus: "Calificada" }), false);
});

test("isActivityPending: fechaEntrega igual al deadline no cuenta como entrega", () => {
  const deadline = "10/mar/2025 - 10:00";
  assert.equal(em.isActivityPending({ fechaEntrega: deadline, fechaTermino: deadline }), true);
  assert.equal(em.isActivityPending({ fechaEntrega: "09/mar/2025 - 10:00", fechaTermino: deadline }), false);
  assert.equal(
    em.isActivityPending({ fechaEntrega: "09/mar/2025 - 10:00", fechaTermino: deadline, estatus: "pendiente" }),
    true
  );
});

test("escapeHtml: escapa todo lo peligroso", () => {
  assert.equal(em.escapeHtml(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  assert.equal(em.escapeHtml(null), "");
});

test("stripHtml: quita etiquetas y decodifica entidades (sin DOM)", () => {
  assert.equal(em.stripHtml("<p>Hola &amp; adiós</p>"), "Hola & adiós");
  assert.equal(em.stripHtml("<style>p{}</style>texto  <b>en</b> negritas"), "texto en negritas");
});

test("formatBytes: unidades y redondeo", () => {
  assert.equal(em.formatBytes(0), "");
  assert.equal(em.formatBytes(512), "512 B");
  assert.equal(em.formatBytes(2048), "2.00 KB");
  assert.equal(em.formatBytes(10 * 1024 * 1024), "10.0 MB");
});

test("normalizePositiveId: solo enteros positivos", () => {
  assert.equal(em.normalizePositiveId("007"), "7");
  assert.equal(em.normalizePositiveId(42), "42");
  assert.equal(em.normalizePositiveId("0"), "");
  assert.equal(em.normalizePositiveId("-5"), "");
  assert.equal(em.normalizePositiveId("12a"), "");
});

test("isPublishedContentEntry: borradores, ocultos y fechas futuras no se publican", () => {
  assert.equal(em.isPublishedContentEntry({}), true);
  assert.equal(em.isPublishedContentEntry({ visible: 3 }), false);
  assert.equal(em.isPublishedContentEntry({ estado: "borrador" }), false);
  assert.equal(em.isPublishedContentEntry({ visible: "0" }), false);
  const future = new Date(Date.now() + 24 * HOUR);
  const futureStr = future.getFullYear() + 1 + "-01-01T00:00:00";
  assert.equal(em.isPublishedContentEntry({ fechaPublicacionInicio: futureStr }), false);
});
