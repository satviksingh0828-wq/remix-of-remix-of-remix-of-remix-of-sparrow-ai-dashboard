@echo off
echo ============================================
echo  HRMS Payroll - Build Setup
echo ============================================

echo.
echo [1/4] Setting npm registry to public...
call npm config set registry https://registry.npmjs.org

echo.
echo [2/4] Removing lock file (contains old Replit registry URLs)...
if exist "package-lock.json" del /f "package-lock.json"

echo.
echo [3/4] Installing npm dependencies...
echo       (First run downloads Electron ~120 MB - please wait)
call npm install --registry https://registry.npmjs.org
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    echo.
    echo Common fixes:
    echo   - Make sure you have internet access
    echo   - Try running this bat file as Administrator
    echo   - If behind a corporate proxy, set: npm config set proxy http://your-proxy:port
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Initialising data directory...
if not exist "data" mkdir data
if not exist "data\.gitkeep" type nul > "data\.gitkeep"

echo.
echo ============================================
echo  Setup complete!
echo  Run start.bat to launch the app.
echo  Run buildexe.bat to package a portable .exe
echo ============================================
pause
