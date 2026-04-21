#!/bin/bash
set -e
echo ""
echo "╔════════════════════════════════════════╗"
echo "║      Eminus Notifier — Instalación     ║"
echo "╚════════════════════════════════════════╝"
echo ""

if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 no encontrado. Instálalo desde https://python.org"
  exit 1
fi
echo "✅ Python 3: $(python3 --version)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

if [ ! -d "$VENV" ]; then
  echo "📦 Creando entorno virtual..."
  python3 -m venv "$VENV"
fi

echo "📦 Instalando dependencias..."
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet selenium webdriver-manager keyring requests plyer beautifulsoup4

echo "🌐 Descargando ChromeDriver..."
"$VENV/bin/python3" -c "from webdriver_manager.chrome import ChromeDriverManager; ChromeDriverManager().install()" 2>/dev/null
echo "✅ ChromeDriver listo"

echo ""
echo "🔐 Credenciales UV (se guardan en el Llavero de macOS):"
read -p "   Matrícula/usuario UV: " UV_USER
read -s -p "   Contraseña: " UV_PASS
echo ""

"$VENV/bin/python3" -c "
import keyring, sys
u = sys.argv[1]
p = sys.argv[2]
keyring.set_password('eminus-notifier', 'username', u)
keyring.set_password('eminus-notifier', 'password', p)
print('✅ Credenciales guardadas en Keychain')
" "$UV_USER" "$UV_PASS"

PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST="$PLIST_DIR/mx.uv.eminus.notifier.plist"
mkdir -p "$PLIST_DIR"

cat > "$PLIST" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>mx.uv.eminus.notifier</string>
  <key>ProgramArguments</key>
  <array>
    <string>$VENV/bin/python3</string>
    <string>$SCRIPT_DIR/eminus_notifier.py</string>
  </array>
  <key>StartInterval</key>
  <integer>900</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$SCRIPT_DIR/notifier.log</string>
  <key>StandardErrorPath</key>
  <string>$SCRIPT_DIR/notifier.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
  </dict>
</dict>
</plist>
PLISTEOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Listo. Eminus Notifier corre cada 15 minutos.       ║"
echo "║                                                      ║"
echo "║  Probar ahora:  .venv/bin/python3 eminus_notifier.py ║"
echo "║  Ver log:       tail -f notifier.log                 ║"
echo "║  Desinstalar:   bash uninstall.sh                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
