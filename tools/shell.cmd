@echo off

:batch
set "TOOLSDIR=%~dp0"
call "%TOOLSDIR%\platform\windows\shell.cmd"
exit /b 0