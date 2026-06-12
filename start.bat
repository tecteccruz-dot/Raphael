@echo off
color 0E
echo ===================================================
echo             MOTOR DE ROL IA - INICIO
echo ===================================================
echo.

cd /d "%~dp0"

if not exist "node_modules\" (
    echo [INFO] Dependencias no encontradas. Instalando...
    call npm install
    echo.
)

echo [INFO] Iniciando el servidor de desarrollo (accesible en red local / ZeroTier)...
echo [INFO] Una vez iniciado, tu amigo puede entrar usando tu IP de ZeroTier en el puerto 5173
echo [INFO] Ejemplo: http://10.x.x.x:5173
echo.
npm run dev -- --host
