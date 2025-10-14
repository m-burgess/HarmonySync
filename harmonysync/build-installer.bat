@echo off
REM Windows Installer Build Script for HarmonySync
REM This script builds Windows installers (NSIS and MSI)

echo ========================================
echo HarmonySync Windows Installer Builder
echo ========================================
echo.

REM Check if we're in the harmonysync directory
if not exist "src-tauri\tauri.conf.json" (
    echo Error: This script must be run from the harmonysync directory
    echo Please cd to harmonysync and try again
    pause
    exit /b 1
)

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check for Rust
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Rust is not installed or not in PATH
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

REM Check for FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo Warning: FFmpeg is not found in PATH
    echo The application requires FFmpeg for audio/video processing
    echo Please install FFmpeg from https://ffmpeg.org/
    echo.
    echo Continue anyway? (Y/N)
    choice /c YN /n
    if errorlevel 2 exit /b 1
)

echo Checking dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: npm install failed
    pause
    exit /b 1
)

echo.
echo Select installer type:
echo 1. NSIS (.exe) - Recommended
echo 2. MSI (requires WiX Toolset)
echo 3. Both NSIS and MSI
echo 4. Cancel
echo.
choice /c 1234 /n /m "Enter your choice: "

if errorlevel 4 (
    echo Build cancelled
    exit /b 0
)

if errorlevel 3 (
    echo.
    echo Building both NSIS and MSI installers...
    call npm run tauri build
    goto :check_result
)

if errorlevel 2 (
    echo.
    echo Building MSI installer...
    REM Check for WiX
    where candle >nul 2>nul
    if %errorlevel% neq 0 (
        echo Error: WiX Toolset is not installed or not in PATH
        echo Please install WiX Toolset from https://wixtoolset.org/
        pause
        exit /b 1
    )
    call npm run tauri build -- --target msi
    goto :check_result
)

if errorlevel 1 (
    echo.
    echo Building NSIS installer...
    call npm run tauri build -- --target nsis
    goto :check_result
)

:check_result
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo Build FAILED
    echo ========================================
    echo Check the error messages above for details
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build SUCCESSFUL
echo ========================================
echo.
echo Installers are located in:
echo   NSIS: src-tauri\target\release\bundle\nsis\
echo   MSI:  src-tauri\target\release\bundle\msi\
echo.
echo Opening build directory...
start explorer src-tauri\target\release\bundle\

pause
