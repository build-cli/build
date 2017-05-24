: '"
@echo off
goto batch
"'

#bash
TOOLSDIR="$(cd "$(dirname "$0")" && pwd)"
$TOOLSDIR/shell
exit 0

:batch
set "TOOLSDIR=%~dp0"
call "%TOOLSDIR%\platform\windows\shell.bat"
exit /b 0