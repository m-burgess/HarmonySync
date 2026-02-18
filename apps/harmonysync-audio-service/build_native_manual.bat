@echo off
echo Setting up environment...
call "C:\Program Files\Microsoft Visual Studio\18\Insiders\VC\Auxiliary\Build\vcvars64.bat"
if %errorlevel% neq 0 (
    echo Failed to set up environment
    exit /b %errorlevel%
)
set GYP_MSVS_VERSION=2022
set GYP_MSVS_OVERRIDE_PATH=C:\Program Files\Microsoft Visual Studio\18\Insiders
echo Running build with overrides...
npm run build:native
