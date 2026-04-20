@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        Eminus Notifier -- Instalacion para Windows
echo ========================================================
echo.

:: Comprobar si Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python no esta instalado o no esta en el PATH.
    echo Por favor instalalo desde https://python.org asegurandote de marcar la casilla "Add Python to PATH".
    pause
    exit /b 1
)

for /f "delims=" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION% encontrado.

set SCRIPT_DIR=%~dp0
:: Quitar barra invertida final si existe
if "%SCRIPT_DIR:~-1%"=="\" set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
set VENV_DIR=%SCRIPT_DIR%\.venv

if not exist "%VENV_DIR%" (
    echo.
    echo [ ] Creando entorno virtual en .venv...
    python -m venv "%VENV_DIR%"
) else (
    echo.
    echo [OK] Entorno virtual ya existe.
)

set PYTHON_EXE=%VENV_DIR%\Scripts\python.exe
set PIP_EXE=%VENV_DIR%\Scripts\pip.exe

echo.
echo [ ] Instalando dependencias (puede tardar unos segundos)...
"%PIP_EXE%" install --quiet --upgrade pip
"%PIP_EXE%" install --quiet selenium webdriver-manager keyring requests plyer

echo.
echo [ ] Configurando ChromeDriver...
"%PYTHON_EXE%" -c "from webdriver_manager.chrome import ChromeDriverManager; ChromeDriverManager().install()" >nul 2>&1
echo [OK] ChromeDriver listo.

echo.
echo ========================================================
echo  Credenciales UV (Se guardaran seguras en Windows)
echo ========================================================
set /p UV_USER="Usuario / Matricula UV: "

:: Script de powershell temporal para leer la contrasena oculta
set PWD_SCRIPT="%TEMP%\get_pwd.ps1"
echo $pwd = read-host "Contrasena" -AsSecureString; ^
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd); ^
$UnsecurePassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR); ^
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR); ^
Write-Output $UnsecurePassword > %PWD_SCRIPT%

for /f "delims=" %%p in ('powershell -ExecutionPolicy Bypass -File %PWD_SCRIPT%') do set UV_PASS=%%p
del %PWD_SCRIPT%

echo.
:: Guardar en Windows Credential Manager usando keyring
"%PYTHON_EXE%" -c "import keyring, sys; keyring.set_password('eminus-notifier', 'username', sys.argv[1]); keyring.set_password('eminus-notifier', 'password', sys.argv[2]);" "%UV_USER%" "%UV_PASS%"
echo [OK] Credenciales guardadas correctamente.

echo.
echo [ ] Configurando ejecucion automatica cada 15 minutos...
set TASK_NAME=EminusNotifier
set RUN_COMMAND="%PYTHON_EXE%" "%SCRIPT_DIR%\eminus_notifier.py"

:: Eliminar la tarea si ya existia
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: Crear una tarea que se ejecute al iniciar sesion y se repita cada 15 minutos.
:: Usamos un archivo VBS para ejecutar Python sin mostrar la ventana negra de CMD en segundo plano
set VBS_RUNNER="%SCRIPT_DIR%\run_hidden.vbs"
echo Set WinScriptHost = CreateObject("WScript.Shell") > %VBS_RUNNER%
echo WinScriptHost.Run Chr(34) ^& "%PYTHON_EXE%" ^& Chr(34) ^& " " ^& Chr(34) ^& "%SCRIPT_DIR%\eminus_notifier.py" ^& Chr(34), 0, False >> %VBS_RUNNER%

schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%VBS_RUNNER%\"" /sc minute /mo 15 /f >nul 2>&1

if %errorlevel% equ 0 (
    echo [OK] Tarea programada exitosamente.
) else (
    echo [!] No se pudo programar la tarea. Es posible que necesites ejecutar como Administrador.
)

echo.
echo ========================================================
echo   Listo. Eminus Notifier esta instalado y configurado.
echo.
echo   Probar ahora: "%PYTHON_EXE%" "%SCRIPT_DIR%\eminus_notifier.py"
echo ========================================================
echo.
pause
