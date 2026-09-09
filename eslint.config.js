const js = require("@eslint/js");

// Globals del entorno de extensión (content scripts, popup y service worker).
const browserGlobals = {
  window: "readonly",
  document: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  navigator: "readonly",
  location: "readonly",
  fetch: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  Blob: "readonly",
  atob: "readonly",
  btoa: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  console: "readonly",
  CSS: "readonly",
  caches: "readonly",
  requestAnimationFrame: "readonly",
  Element: "readonly",
  HTMLElement: "readonly",
  HTMLIFrameElement: "readonly",
  HTMLInputElement: "readonly",
  HTMLTextAreaElement: "readonly",
  HTMLSelectElement: "readonly",
  MutationObserver: "readonly",
  IntersectionObserver: "readonly",
  Node: "readonly",
  chrome: "readonly"
};

module.exports = [
  {
    ignores: ["node_modules/"]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: browserGlobals
    },
    rules: {
      // El código usa catch (_) {} de forma deliberada para operaciones best-effort.
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { caughtErrors: "none", args: "none" }]
    }
  },
  {
    files: ["scripts/**", "tests/**", "eslint.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "writable",
        process: "readonly",
        console: "readonly",
        global: "writable",
        __dirname: "readonly"
      }
    }
  }
];
