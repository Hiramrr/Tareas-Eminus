window.eminus = window.eminus || {};

var em = window.eminus;

// Única fuente de verdad de los temas del panel y del popup.
// El orden de esta lista define el orden de los chips y del selector "tomar como base".
// Los estilos completos de cada tema viven en content/themes.css (clase ep-<id>-theme).
em.THEMES = [
  { id: "light", label: "Light", palette: { bg: "#ffffff", text: "#000000", border: "#000000", accent: "#000000", overdue: "#c0392b", imminent: "#f1c40f", urgent: "#e67e22" } },
  { id: "jazmin", label: "Jazmín", palette: { bg: "#fffdf5", text: "#3d3a28", border: "#ddd8c0", accent: "#6a8a50", overdue: "#c06850", imminent: "#b8a030", urgent: "#6a8a50" } },
  { id: "dark", label: "Dark", palette: { bg: "#121212", text: "#e0e0e0", border: "#444444", accent: "#e0e0e0", overdue: "#ff6b6b", imminent: "#f6e58d", urgent: "#a3e635" } },
  { id: "hacker", label: "Hacker", palette: { bg: "#000000", text: "#00ff00", border: "#00ff00", accent: "#00ff00", overdue: "#ff0000", imminent: "#ffff00", urgent: "#ccff00" } },
  { id: "ocean", label: "Ocean", palette: { bg: "#0f172a", text: "#38bdf8", border: "#1e293b", accent: "#38bdf8", overdue: "#f43f5e", imminent: "#eab308", urgent: "#a3e635" } },
  { id: "dracula", label: "Dracula", palette: { bg: "#282a36", text: "#f8f8f2", border: "#44475a", accent: "#f8f8f2", overdue: "#ff5555", imminent: "#f1fa8c", urgent: "#50fa7b" } },
  { id: "nord", label: "Nord", palette: { bg: "#2e3440", text: "#d8dee9", border: "#4c566a", accent: "#d8dee9", overdue: "#bf616a", imminent: "#ebcb8b", urgent: "#a3be8c" } },
  { id: "solarized", label: "Solarized", palette: { bg: "#002b36", text: "#839496", border: "#073642", accent: "#839496", overdue: "#dc322f", imminent: "#b58900", urgent: "#859900" } },
  { id: "solarizedlight", label: "Solarized Light", palette: { bg: "#fdf6e3", text: "#586e75", border: "#eee8d5", accent: "#586e75", overdue: "#dc322f", imminent: "#b58900", urgent: "#859900" } },
  { id: "gruvbox", label: "Gruvbox", palette: { bg: "#282828", text: "#ebdbb2", border: "#504945", accent: "#ebdbb2", overdue: "#cc241d", imminent: "#d79921", urgent: "#98971a" } },
  { id: "sakura", label: "Sakura", palette: { bg: "#1a1225", text: "#f0d0e0", border: "#3d2a4a", accent: "#f8a4c8", overdue: "#e84a6f", imminent: "#f0c060", urgent: "#88c890" } },
  { id: "lavender", label: "Lavender", palette: { bg: "#f5f0fa", text: "#2d2049", border: "#c9b8e8", accent: "#7c5cbf", overdue: "#c0392b", imminent: "#d4a017", urgent: "#4a8c4a" } },
  { id: "rosa", label: "Rosa", palette: { bg: "#fff5f7", text: "#4a1028", border: "#f0c0cf", accent: "#e85080", overdue: "#c0392b", imminent: "#d4a017", urgent: "#4a8c4a" } },
  { id: "sandia", label: "Sandia", palette: { bg: "#1a3a1a", text: "#f0c8c8", border: "#2d5a2d", accent: "#c0392b", overdue: "#e74c3c", imminent: "#f0c040", urgent: "#50d050" } },
  { id: "matcha", label: "Matcha", palette: { bg: "#f4f1e8", text: "#2c3e2c", border: "#b8c9a8", accent: "#5a7a4a", overdue: "#b04040", imminent: "#b89030", urgent: "#5a8a3a" } },
  { id: "moka", label: "Moka", palette: { bg: "#3e2723", text: "#f8c0d0", border: "#6d4c41", accent: "#f48fb1", overdue: "#ef5350", imminent: "#fdd835", urgent: "#66bb6a" } },
  { id: "candy", label: "Candy", palette: { bg: "#fdf0f8", text: "#3a2050", border: "#e8b8d0", accent: "#80b8f0", overdue: "#e86080", imminent: "#e0a040", urgent: "#60b080" } },
  { id: "aurora", label: "Aurora", palette: { bg: "#0a0e1a", text: "#e4e8f0", border: "#1e293b", accent: "#34d399", overdue: "#ef4444", imminent: "#f59e0b", urgent: "#34d399" } },
  { id: "synthwave", label: "Synthwave", palette: { bg: "#1a1b26", text: "#c0caf5", border: "#24283b", accent: "#7aa2f7", overdue: "#f7768e", imminent: "#e0af68", urgent: "#9ece6a" } },
  { id: "minimal", label: "Minimal", palette: { bg: "#ffffff", text: "#1a1a1a", border: "#f0f0f0", accent: "#1a1a1a", overdue: "#ff4d4f", imminent: "#ffc53d", urgent: "#73d13d" } },
  { id: "wispr", label: "Wispr", palette: { bg: "#fbfaf3", text: "#1a1a1a", border: "#e5e4da", accent: "#1a342d", overdue: "#ff4d4f", imminent: "#ffc53d", urgent: "#73d13d" } },
  { id: "solarized-osaka", label: "Solarized Osaka", palette: { bg: "#001f27", text: "#fdf6e3", border: "#073642", accent: "#2aa198", overdue: "#dc322f", imminent: "#b58900", urgent: "#859900" } },
  { id: "olivia", label: "Olivia", palette: { bg: "#1c1b1a", text: "#f7f0e6", border: "#3d3330", accent: "#cba694", overdue: "#c05858", imminent: "#c0a058", urgent: "#72c058" } },
  { id: "codex", label: "Codex", palette: { bg: "#0d1117", text: "#d7e0ea", border: "#2a3441", accent: "#42d392", overdue: "#ff6b6b", imminent: "#ffd166", urgent: "#4cc9f0" } }
];

// Mapa id -> paleta, para consumo directo (popup y panel).
em.THEME_PRESETS = {};
em.THEMES.forEach(function (theme) {
  em.THEME_PRESETS[theme.id] = theme.palette;
});
