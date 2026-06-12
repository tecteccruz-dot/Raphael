@echo off
color 0C
echo ===================================================
echo             MOTOR DE ROL IA - APAGADO
echo ===================================================
echo.
echo [INFO] Deteniendo todos los procesos de Node.js...
taskkill /F /IM node.exe /T >nul 2>&1
echo [INFO] Servidor detenido.
echo.
pause
