@echo off
echo ================================================
echo    Building V-GPU Windows Installer & Binary   
echo ================================================
echo.

echo [1/3] Installing Node.js frontend dependencies...
cd /d "%~dp0\..\frontend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend npm install failed.
    exit /b %ERRORLEVEL%
)

echo [2/3] Building Web Frontend assets (Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend Vite build failed.
    exit /b %ERRORLEVEL%
)

echo [3/3] Compiling Tauri Rust Application & Packaging Windows Installer...
call npm run tauri build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Tauri build failed. Please ensure Rust and Visual Studio C++ Build Tools are installed.
    exit /b %ERRORLEVEL%
)

echo.
echo ================================================
echo SUCCESS: Windows Build Complete!
echo Installers are available in:
echo   frontend\src-tauri\target\release\bundle\msi\
echo   frontend\src-tauri\target\release\bundle\nsis\
echo ================================================
pause
