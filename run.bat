@echo off
title Hangeul Valley Launcher
echo.
echo  ==========================================
echo   Hangeul Valley - Level Mode  ^🌾
echo  ==========================================
echo.

REM Path to Python (Anki's standalone Python 3.13 with pywebview installed)
set PYTHON="C:\Users\NCPC\AppData\Local\AnkiProgramFiles\python\cpython-3.13.5-windows-x86_64-none\python.exe"

REM Fall back to system python if available
if not exist %PYTHON% (
    echo [INFO] Anki Python not found, trying system python...
    set PYTHON=python
)

echo [INFO] Starting game...
%PYTHON% main.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Game exited with an error. See above for details.
    pause
)
