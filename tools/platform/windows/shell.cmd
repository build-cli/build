@echo off
setlocal EnableDelayedExpansion
set "TOOLSDIR=%~dp0"
set "TOOLSPATH=%TOOLSDIR%"

if "!path:%TOOLSPATH%=!" equ "%path%" (
    endlocal
    echo tools added to Path
    set "Path=%TOOLSPATH%;%Path%"
) else (
    echo tools found in Path
)