# Eminus Notifier — macOS

Monitorea **Eminus 4 (UV)** y envía notificaciones nativas de macOS cuando detecta
cambios en Actividades, Evaluaciones, Foros y Mensajes.

## Cómo funciona

1. `launchd` ejecuta el script cada 15 minutos en background
2. Selenium abre Chrome en modo headless y hace login automático en el SSO de la UV
3. Las credenciales se guardan en el **Llavero de macOS** (no en texto plano)
4. Si detecta cambios en alguna sección, lanza una notificación nativa de macOS

## Requisitos

- macOS 12+ | Python 3.9+ | Google Chrome instalado

## Instalación

```bash
bash setup.sh
```

## Comandos útiles

```bash
# Probar manualmente
.venv/bin/python3 eminus_notifier.py

# Ver log en tiempo real
tail -f notifier.log

# Desinstalar
bash uninstall.sh
```

## Cambiar el intervalo (default: 15 min)

Edita `~/Library/LaunchAgents/mx.uv.eminus.notifier.plist`:
- Cambia `<integer>900</integer>` → 300 (5min), 600 (10min), 1800 (30min)

Recarga:
```bash
launchctl unload  ~/Library/LaunchAgents/mx.uv.eminus.notifier.plist
launchctl load    ~/Library/LaunchAgents/mx.uv.eminus.notifier.plist
```

## Si el login falla

El formulario del SSO puede tener selectores distintos a lo esperado.
Corre el script manualmente y revisa `notifier.log` para ver qué URL
carga después del redirect. Ajusta `user_candidates` en `login()` si es necesario.

## Privacidad

Las credenciales viven únicamente en el Llavero de macOS.
El script solo accede a `eminus.uv.mx`. Sin servidores externos.
