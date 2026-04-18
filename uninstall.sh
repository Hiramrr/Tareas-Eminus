#!/bin/bash
PLIST="$HOME/Library/LaunchAgents/mx.uv.eminus.notifier.plist"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Desinstalando Eminus Notifier..."
launchctl unload "$PLIST" 2>/dev/null && echo "LaunchAgent detenido." || true
rm -f "$PLIST" && echo "Plist eliminado."
if [ -d "$SCRIPT_DIR/.venv" ]; then
  "$SCRIPT_DIR/.venv/bin/python3" -c "
import keyring
for k in ['username','password']:
    try: keyring.delete_password('eminus-notifier', k)
    except: pass
print('Credenciales eliminadas del Keychain.')
"
fi
echo "Desinstalacion completa."
