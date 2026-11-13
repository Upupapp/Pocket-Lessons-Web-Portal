@echo off
rem Starts the Pocket Lessons teacher portal on this computer and opens it in the browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages for the first time. This can take several minutes...
  call npm install || goto :fail
)
echo Starting Pocket Lessons at http://localhost:4200  (close this window to stop)
start "" http://localhost:4200
call npx ng serve --port 4200
goto :eof
:fail
echo Could not install packages. Check that Node.js 22 or newer is installed.
pause
