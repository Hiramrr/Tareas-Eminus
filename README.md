# Miyu --pendientes

Extensión Manifest V3 para Eminus (eminus.uv.mx). Muestra tus pendientes sin abrir cada curso.

Funciones:

- Tareas por materia con nivel de urgencia
- Historial de revisiones
- Animación al entregar tarea
- Resumen, filtros y notificaciones que abren la tarea
- Vista Hoy, orden configurable y exportación a .ics
- Recordatorios escalonados con horas silenciosas y opción de posponer 1 h
- Perfil con apodo, nombre del panel, símbolo y mensaje al terminar
- Avisos por tipo: tareas, contenido, vencimientos y recordatorios
- Preferencias sincronizadas entre navegadores con respaldo local
- Popup con resumen, estado de sincronización y próximas entregas
- Portada con carga semanal y siguiente tarea
- Marcar contenido como leído o no leído

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `manifest.json` | Configuración de la extensión |
| `content.js` | Arranque del panel: mensajes, atajos y eventos globales |
| `content/` | Módulos del panel (API, render, estado, temas, i18n, etc.) |
| `styles.css` | Estilos del panel |
| `content/themes.css` | Temas de color del panel |
| `service-worker.js` | Badge, notificaciones, alarmas y proxy de API |
| `popup.html` / `popup.js` / `popup.css` | Resumen al pulsar el icono |
| `detail-nav.js` / `detail-nav.css` | Botón volver en el detalle de actividad |
| `logo.png` | Icono |
| `jazmin.png` | Fondo decorativo del tema Jazmín |

## Instalación (modo desarrollador)

1. Abre `chrome://extensions/`
2. Activa Developer mode
3. Clic en Load unpacked
4. Selecciona esta carpeta

## Uso

1. Inicia sesión en Eminus
2. Abre cualquier página en `https://eminus.uv.mx/eminus4/`
3. Verás el panel a la derecha
4. Pulsa el icono para ver el resumen desde cualquier pestaña
5. Usa `[ actualizar ]` para refrescar
6. En `Historial` ves los cambios
7. `Alt+E` pliega y despliega el panel
8. `/` busca, `R` actualiza y `T` abre Hoy

## Desarrollo

- `node scripts/check-i18n.js` verifica que los 6 idiomas tengan las mismas claves que `es` y que el código no use claves inexistentes. Córrelo tras tocar `content/i18n.js` o textos de la interfaz.

## Notas

- Usa el `accessToken` de tu sesión en Eminus.
- Consulta `GET /Course/getAllCourses` y `GET /Activity/getActividadesEstudiante/{idCurso}`
- Guarda en `chrome.storage.local` claves como `eminusLastSnapshot`, `eminusPendingLog`, `eminusPanelTheme`
- Sincroniza apariencia y avisos con `chrome.storage.sync`

El auto-refresh usa `chrome.alarms` y funciona con el panel plegado si hay una pestaña de Eminus abierta.
