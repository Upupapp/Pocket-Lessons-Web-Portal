@echo off
rem Starts the Pocket Lessons teacher portal on this computer and opens it in the browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages for the first time. This can take several minutes...
  call npm install || goto :fail
)
echo Starting the Pocket Lessons pilot preview at http://localhost:4200  (close this window to stop)
echo Work is saved in this browser. To use the Pocket Lessons server instead, run: npm start
start "" http://localhost:4200
call npx ng serve --port 4200 --configuration demo
goto :eof
:fail
echo Could not install packages. Check that Node.js 22 or newer is installed.
pause
