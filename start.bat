@echo off
echo ============================================
echo  HRMS Payroll - Start Development App
echo ============================================
echo.
echo Starting Vite dev server and Electron...
echo (The app window will open automatically)
echo.
call npx concurrently -k -n VITE,ELECTRON -c cyan,green ^
    "vite" ^
    "wait-on http://127.0.0.1:8080 && electron ."
