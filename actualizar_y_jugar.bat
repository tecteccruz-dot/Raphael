@echo off
color 0B
echo ===================================================
echo     Iniciando Raphael (Modo Actualizado)
echo ===================================================
echo.

echo [INFO] Este archivo descargara las ultimas actualizaciones de tu GitHub
echo [INFO] y luego arrancara el juego.
echo.

:: 1. Comprobar actualizaciones
echo [1/3] Buscando nuevas actualizaciones con Git...
git pull
if %errorlevel% neq 0 (
    color 0E
    echo.
    echo [ADVERTENCIA] No se pudo actualizar.
    echo Asegurate de tener Git instalado y de haber clonado el repositorio correctamente.
    echo Se intentara arrancar el juego con la version actual.
    echo.
    color 0B
) else (
    echo [EXITO] Juego actualizado a la ultima version.
)
echo.

:: 2. Instalar posibles nuevas dependencias
echo [2/3] Verificando e instalando componentes (Node.js)...
call npm install
echo [EXITO] Componentes listos.
echo.

:: 3. Arrancar el servidor
echo [3/3] Arrancando el motor de rol...
echo.
echo ===================================================
echo Tu amigo puede entrar usando tu IP de ZeroTier.
echo Ejemplo: http://10.x.x.x:5173
echo ===================================================
echo.

npm run dev -- --host

pause
