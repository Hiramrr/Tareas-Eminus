# Eminus Pending Panel (Chrome Extension)

Extensión de Chrome (Manifest V3) para inyectar un panel en `eminus.uv.mx/eminus4` y mostrar:

- Tareas pendientes por curso
- Estado de urgencia (vencida, inminente, urgente, normal)
- Log histórico de revisiones

Todo vive en la raíz de este repositorio.

## Archivos

- `manifest.json`: configuración de la extensión
- `content.js`: inyección del panel y consumo de API Eminus
- `styles.css`: estilos del panel flotante
- `service-worker.js`: badge en el ícono de la extensión
- `popup.html` + `popup.js`: popup rápido para abrir/actualizar panel

## Instalación (modo desarrollador)

1. Abre `chrome://extensions/`
2. Activa **Developer mode**
3. Clic en **Load unpacked**
4. Selecciona la carpeta de este repositorio

## Uso

1. Inicia sesión en Eminus normalmente
2. Abre cualquier página bajo `https://eminus.uv.mx/eminus4/`
3. Verás el panel flotante a la derecha
4. Usa el botón `↻` para refrescar pendientes
5. En la pestaña `Log` verás el historial de lecturas

## Notas técnicas

- Usa `accessToken` de la sesión web de Eminus.
- Consulta:
  - `GET /Course/getAllCourses`
  - `GET /Activity/getActividadesEstudiante/{idCurso}`
- Guarda en `chrome.storage.local`:
  - `eminusLastSnapshot`
  - `eminusPendingLog`
  - `eminusKnownPendingIds`
