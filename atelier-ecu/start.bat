@echo off
chcp 65001 >nul
cd /d "%~dp0"
py --version >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080
  py server.py
  goto :end
)
python --version >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080
  python server.py
  goto :end
)
echo Nu gasesc Python. Deschide un CMD si scrie: py --version
echo Daca nu apare o versiune, reinstaleaza Python de pe python.org/downloads si bifeaza "Add python.exe to PATH".
:end
pause
