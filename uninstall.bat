@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        Desinstalando Eminus Notifier
echo ========================================================
echo.

set TASK_NAME=EminusNotifier
set SCRIPT_DIR=%~dp0
if "%SCRIPT_DIR:~-1%"=="\" set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

echo [ ] Deteniendo y eliminando la tarea programada...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Tarea programada eliminada.
) else (
    echo [OK] No se encontro tarea programada activa.
)

set VENV_DIR=%SCRIPT_DIR%\.venv
set PYTHON_EXE=%VENV_DIR%\Scripts\python.exe

if exist "%PYTHON_EXE%" (
    echo.
    echo [ ] Eliminando credenciales del Administrador de Windows...
    "%PYTHON_EXE%" -c "import keyring; keyring.delete_password('eminus-notifier', 'username'); keyring.delete_password('eminus-notifier', 'password');" >nul 2>&1
    echo [OK] Credenciales eliminadas.
)

set VBS_RUNNER="%SCRIPT_DIR%\run_hidden.vbs"
if exist %VBS_RUNNER% (
    del %VBS_RUNNER%
)

echo.
echo ========================================================
echo [OK] Desinstalacion completa. 
echo Puedes eliminar esta carpeta de forma segura.
echo ========================================================
echo.
pause
