"use strict";
const test = require("node:test");
const assert = require("node:assert");
const loadEminus = require("./load");

const em = loadEminus("i18n.js", "utils.js", "export.js");

test("crc32: valor conocido", () => {
  assert.strictEqual(em.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("buildZip: cabeceras y nombres UTF-8", async () => {
  const blob = em.buildZip([{ name: "adjuntos/guía.txt", data: new TextEncoder().encode("hola") }]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.strictEqual(view.getUint32(0, true), 0x04034b50);
  assert.strictEqual(view.getUint16(6, true) & 0x0800, 0x0800);
  assert.strictEqual(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.strictEqual(view.getUint16(bytes.length - 12, true), 1);
});

test("toPdfString: escapa paréntesis, WinAnsi y sustituye lo que no cabe", () => {
  assert.strictEqual(em.toPdfString("a(b)\\"), "(a\\(b\\)\\\\)");
  assert.strictEqual(em.toPdfString("ñ€"), "(\\361\\200)");
  assert.strictEqual(em.toPdfString("日😀"), "(??)");
});

test("buildTextPdf: xref apunta a cada objeto", () => {
  const text = String.fromCharCode(...em.buildTextPdf([{ text: "Tarea", bold: true }, { text: "x ".repeat(4000) }]));
  assert.ok(text.startsWith("%PDF-1.4"));
  const xrefAt = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.ok(text.slice(xrefAt).startsWith("xref"));
  const offsets = [...text.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  offsets.forEach((offset, index) => assert.ok(text.slice(offset).startsWith(index + 1 + " 0 obj")));
  assert.ok(/\/Count [2-9]/.test(text));
});

test("sanitizeFileName y uniqueFileName", () => {
  assert.strictEqual(em.sanitizeFileName("a/b:c?.pdf"), "a_b_c_.pdf");
  const used = new Set();
  assert.strictEqual(em.uniqueFileName("x.pdf", used), "x.pdf");
  assert.strictEqual(em.uniqueFileName("X.pdf", used), "X (2).pdf");
});
