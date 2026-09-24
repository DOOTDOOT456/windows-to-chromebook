
Crossen, Blake <233778@mcpsmd.net>
11:57 AM (9 minutes ago)
to me

@echo off

:: 1. Point to your local Node folder
set "NODE_BIN=C:\Users\233778\Downloads\node-v26.10.0-win-x64"
set "PATH=%NODE_BIN%;%PATH%"

:: 2. Force map your school folder to virtual drive Z:
net use Z: "\\DM701-DATA\STUHOME" /persistent:no >nul 2>&1

:: 3. Switch directly to drive Z: and navigate to the project
Z:
cd "\233778\Documents\windows-to-chromebook-main\remote-desktop"

echo Local path verified: %cd%
echo Installing dependencies using Node v26...
call "%NODE_BIN%\npm.cmd" install

echo Starting node server...
"%NODE_BIN%\node.exe" server\server.js

pause
