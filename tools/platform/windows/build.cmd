@echo off
set "TOOLSDIR=%~dp0"
pushd "%TOOLSDIR%\..\..\.." && set "ROOTDIR=%CD%" && popd
set "BUILD=%ROOTDIR%\build.js"
node --harmony_trailing_commas "%BUILD%" %*