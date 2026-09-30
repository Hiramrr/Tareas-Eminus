"use strict";
// Carga módulos de content/ con un stub de window, en el orden indicado
// (igual que hace el manifest), y devuelve window.eminus. "i18n.js" incluye
// antes los diccionarios de content/i18n/, como en el manifest.
const path = require("path");

const I18N_FILES = ["es", "en", "fr", "ja", "ko", "zh"].map((lang) => path.join("i18n", lang + ".js"));

module.exports = function loadEminus(...files) {
  global.window = global.window || {};
  for (const file of files.flatMap((f) => (f === "i18n.js" ? [...I18N_FILES, f] : [f]))) {
    require(path.join(__dirname, "..", "content", file));
  }
  return global.window.eminus;
};
