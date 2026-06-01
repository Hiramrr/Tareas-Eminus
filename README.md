# Miyu --pendientes (Chrome Extension)

Extensión de Chrome (Manifest V3) para inyectar un panel en `eminus.uv.mx` y mostrar:

- Tareas pendientes por curso
- Estado de urgencia (vencida, inminente, urgente, normal)
- Log histórico de revisiones
- Animación de celebración al entregar tareas
- Resumen compacto, filtros persistentes y notificaciones que abren la tarea
- Vista Hoy, orden configurable, acciones masivas y exportación semanal `.ics`
- Recordatorios escalonados con horas silenciosas y opción de posponer 1 hora
- Perfil con apodo, nombre del panel, símbolo, mensaje al terminar, materias favoritas y colores por materia
- Avisos configurables por tipo: tareas, contenido, vencimientos y recordatorios
- Preferencias personales sincronizadas entre navegadores con respaldo local
- Popup del ícono adaptado al tema activo con resumen, estado de sincronización, acciones rápidas y próximas entregas
- Portada Resumen con carga semanal, siguiente tarea y accesos rápidos
- Estado leído/no leído para publicaciones de contenido

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `manifest.json` | Configuración de la extensión (MV3) |
| `content.js` | Inyección del panel flotante y consumo de API Eminus |
| `styles.css` | Estilos del panel flotante (9 temas) |
| `service-worker.js` | Badge en el ícono y proxy de API |
| `popup.html` | Resumen rápido al pulsar el ícono de la extensión |
| `detail-nav.js` | Botón volver y animaciones en página de detalle |
| `detail-nav.css` | Estilos del botón volver y animaciones |
| `logo.png` | Ícono de la extensión |

## Instalación (modo desarrollador)

1. Abre `chrome://extensions/`
2. Activa **Developer mode**
3. Clic en **Load unpacked**
4. Selecciona la carpeta de este repositorio

## Uso

1. Inicia sesión en Eminus normalmente
2. Abre cualquier página bajo `https://eminus.uv.mx/eminus4/`
3. Verás el panel flotante a la derecha
4. Pulsa el ícono de la extensión para consultar el resumen desde cualquier pestaña
5. Usa el botón `[ ref ]` para refrescar pendientes
6. En la pestaña `Log` verás el historial de lecturas
7. `Alt+E` colapsa/expande el panel
8. `/` enfoca la búsqueda, `R` actualiza y `T` abre la vista `Hoy`

## Notas técnicas

- Usa `accessToken` de la sesión web de Eminus.
- Consulta:
  - `GET /Course/getAllCourses`
  - `GET /Activity/getActividadesEstudiante/{idCurso}`
- Guarda en `chrome.storage.local`:
  - `eminusLastSnapshot`
  - `eminusPendingLog`
  - `eminusKnownPendingIds`
  - `eminusArchivedPendingIds`
  - `eminusPinnedPendingIds`
  - `eminusPanelTheme`
  - `eminusPanelPosition`
  - `eminusAccountId`
  - `eminusAutoRefreshMinutes`
  - `eminusPanelUiState`
- Sincroniza preferencias de apariencia, avisos y personalización con `chrome.storage.sync`

El auto-refresh usa `chrome.alarms` y puede actualizar con el panel plegado mientras exista una pestaña de Eminus abierta.
