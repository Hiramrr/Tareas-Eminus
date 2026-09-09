#!/usr/bin/env node
// Verificador de i18n. Uso: node scripts/check-i18n.js
//
// Comprueba:
// 1. Paridad de claves: cada idioma debe tener exactamente las claves de `es`
//    (es es el idioma de referencia: em.t hace fallback a es).
// 2. Claves usadas en el código (em.t("..."), t("..."), data-i18n="...") que
//    no existen en el diccionario es (typos). Las claves dinámicas
//    (em.t("prefijo_" + x)) se validan exigiendo que exista al menos una
//    clave es con ese prefijo.
// 3. Claves de es que nada referencia (aviso, no falla).
//
// Sale con código 1 si falla 1 o 2.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// Carga content/i18n.js con un stub de window.
global.window = {};
require(path.join(root, "content", "i18n.js"));
const i18n = global.window.eminus.i18n;

const REFERENCE_LANG = "es";
const esKeys = new Set(Object.keys(i18n[REFERENCE_LANG]));
let failed = false;

// 1. Paridad de claves entre idiomas.
for (const lang of Object.keys(i18n)) {
  if (lang === REFERENCE_LANG) continue;
  const langKeys = new Set(Object.keys(i18n[lang]));
  const missing = [...esKeys].filter((key) => !langKeys.has(key));
  const extra = [...langKeys].filter((key) => !esKeys.has(key));
  if (missing.length) {
    failed = true;
    console.error(`[${lang}] faltan ${missing.length} claves (usarán el texto en español):`);
    missing.forEach((key) => console.error(`  - ${key}`));
  }
  if (extra.length) {
    failed = true;
    console.error(`[${lang}] ${extra.length} claves sobrantes que no existen en es:`);
    extra.forEach((key) => console.error(`  - ${key}`));
  }
}

// 2. Claves referenciadas en el código.
// Se incluye i18n.js porque applyTranslations referencia claves con em.t(...);
// las definiciones del diccionario (clave: "texto") no coinciden con CALL_RE.
const sourceFiles = [
  ...fs.readdirSync(path.join(root, "content")).filter((f) => f.endsWith(".js")).map((f) => path.join("content", f)),
  "content.js",
  "popup.js",
  "popup.html"
];

const literalKeys = new Map(); // clave -> primer archivo que la usa
const prefixKeys = new Map(); // prefijo dinámico -> primer archivo
// Captura el argumento de t(...) hasta el primer cierre de paréntesis; cubre
// literales simples, ternarios (t(x ? "a" : "b")) y prefijos (t("a_" + x)).
const CALL_RE = /(?:\bem\.t|(?<![\w$.])t)\(([^()]*)/g;
const LITERAL_RE = /(["'])([a-z0-9_]+)\1\s*(\+)?/g;
const DATA_I18N_RE = /data-i18n="([a-z0-9_]+)"/g;

for (const file of sourceFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const call of text.matchAll(CALL_RE)) {
    // Solo el primer argumento es la clave; el segundo de t(clave, fallback) no.
    const keyArg = call[1].split(",")[0];
    for (const match of keyArg.matchAll(LITERAL_RE)) {
      const target = match[3] === "+" ? prefixKeys : literalKeys;
      if (!target.has(match[2])) target.set(match[2], file);
    }
  }
  for (const match of text.matchAll(DATA_I18N_RE)) {
    if (!literalKeys.has(match[1])) literalKeys.set(match[1], file);
  }
}

for (const [key, file] of literalKeys) {
  if (!esKeys.has(key)) {
    failed = true;
    console.error(`[uso] clave inexistente "${key}" referenciada en ${file}`);
  }
}
for (const [prefix, file] of prefixKeys) {
  if (![...esKeys].some((key) => key.startsWith(prefix))) {
    failed = true;
    console.error(`[uso] ningúna clave es empieza con el prefijo dinámico "${prefix}" (${file})`);
  }
}

// 3. Claves definidas que nada referencia (solo aviso).
const unused = [...esKeys].filter(
  (key) => !literalKeys.has(key) && ![...prefixKeys.keys()].some((prefix) => key.startsWith(prefix))
);
if (unused.length) {
  console.warn(`aviso: ${unused.length} claves de es sin referencias en el código:`);
  unused.forEach((key) => console.warn(`  - ${key}`));
}

if (failed) {
  console.error("\ni18n: FALLÓ");
  process.exit(1);
}
console.log(`i18n: OK (${esKeys.size} claves, ${Object.keys(i18n).length} idiomas, ${literalKeys.size} usos literales, ${prefixKeys.size} prefijos dinámicos)`);
