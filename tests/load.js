"use strict";
// Carga módulos de content/ con un stub de window, en el orden indicado
// (igual que hace el manifest), y devuelve window.eminus.
const path = require("path");

module.exports = function loadEminus(...files) {
  global.window = global.window || {};
  for (const file of files) {
    require(path.join(__dirname, "..", "content", file));
  }
  return global.window.eminus;
};
