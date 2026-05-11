# Miyu --pendientes (Cross-browser Extension)

Extensión (Manifest V3) compatible con Chrome y Firefox para inyectar un panel en `eminus.uv.mx` y mostrar:

- Tareas pendientes por curso
- Estado de urgencia (vencida, inminente, urgente, normal)
- Log histórico de revisiones
- Animación de celebración al entregar tareas

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `manifest.json` | Configuración de la extensión (MV3) |
| `content.js` | Inyección del panel flotante y consumo de API Eminus |
| `styles.css` | Estilos del panel flotante (9 temas) |
| `service-worker.js` | Badge en el ícono y proxy de API |
| `detail-nav.js` | Botón volver y animaciones en página de detalle |
| `detail-nav.css` | Estilos del botón volver y animaciones |
| `logo.png` | Ícono de la extensión |

## Instalación (modo desarrollador)

### Chrome
1. Abre `chrome://extensions/`
2. Activa **Developer mode**
3. Clic en **Load unpacked**
4. Selecciona la carpeta de este repositorio

### Firefox
1. Abre `about:debugging#/runtime/this-firefox`
2. Clic en **Load Temporary Add-on...**
3. Selecciona el archivo `manifest.json` de la carpeta de este repositorio

## Uso

1. Inicia sesión en Eminus normalmente
2. Abre cualquier página bajo `https://eminus.uv.mx/eminus4/`
3. Verás el panel flotante a la derecha
4. Usa el botón `[ ref ]` para refrescar pendientes
5. En la pestaña `Log` verás el historial de lecturas
6. `Alt+E` colapsa/expande el panel

## Notas técnicas

- Usa `accessToken` de la sesión web de Eminus.
- Consulta:
  - `GET /Course/getAllCourses`
  - `GET /Activity/getActividadesEstudiante/{idCurso}`
- Guarda en `browser.storage.local`:
  - `eminusLastSnapshot`
  - `eminusPendingLog`
  - `eminusKnownPendingIds`
  - `eminusArchivedPendingIds`
  - `eminusPinnedPendingIds`
  - `eminusPanelTheme`
  - `eminusPanelPosition`
  - `eminusAccountId`
  - `eminusAutoRefreshMinutes`
