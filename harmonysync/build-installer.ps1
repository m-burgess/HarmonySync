#!/usr/bin/env pwsh
# Windows Installer Build Script for HarmonySync (PowerShell)
# This script builds Windows installers (NSIS and MSI)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HarmonySync Windows Installer Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the harmonysync directory
if (-not (Test-Path "src-tauri/tauri.conf.json")) {
    Write-Host "Error: This script must be run from the harmonysync directory" -ForegroundColor Red
    Write-Host "Please cd to harmonysync and try again" -ForegroundColor Red
    exit 1
}

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check for Rust
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Rust is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Rust from https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

# Check for FFmpeg
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "Warning: FFmpeg is not found in PATH" -ForegroundColor Yellow
    Write-Host "The application requires FFmpeg for audio/video processing" -ForegroundColor Yellow
    Write-Host "Please install FFmpeg from https://ffmpeg.org/" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (Y/N)"
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
}

Write-Host "Checking dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Select installer type:" -ForegroundColor Cyan
Write-Host "1. NSIS (.exe) - Recommended" -ForegroundColor White
Write-Host "2. MSI (requires WiX Toolset)" -ForegroundColor White
Write-Host "3. Both NSIS and MSI" -ForegroundColor White
Write-Host "4. Cancel" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Building NSIS installer..." -ForegroundColor Green
        npm run tauri build -- --target nsis
    }
    "2" {
        Write-Host ""
        # Check for WiX
        if (-not (Get-Command candle -ErrorAction SilentlyContinue)) {
            Write-Host "Error: WiX Toolset is not installed or not in PATH" -ForegroundColor Red
            Write-Host "Please install WiX Toolset from https://wixtoolset.org/" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "Building MSI installer..." -ForegroundColor Green
        npm run tauri build -- --target msi
    }
    "3" {
        Write-Host ""
        Write-Host "Building both NSIS and MSI installers..." -ForegroundColor Green
        npm run tauri build
    }
    "4" {
        Write-Host "Build cancelled" -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Build FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Check the error messages above for details" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Build SUCCESSFUL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installers are located in:" -ForegroundColor Cyan
Write-Host "  NSIS: src-tauri/target/release/bundle/nsis/" -ForegroundColor White
Write-Host "  MSI:  src-tauri/target/release/bundle/msi/" -ForegroundColor White
Write-Host ""
Write-Host "Opening build directory..." -ForegroundColor Green

# Open the build directory in Windows Explorer
$bundlePath = Join-Path $PSScriptRoot "src-tauri/target/release/bundle"
if (Test-Path $bundlePath) {
    Start-Process explorer.exe $bundlePath
} else {
    Write-Host "Note: Build directory not found. This is normal if the build just completed." -ForegroundColor Yellow
}
