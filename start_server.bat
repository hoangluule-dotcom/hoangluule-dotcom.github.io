@echo off
cd /d "%~dp0"
echo ========================================
echo  DBV247 Local Server dang chay...
echo  Mo trinh duyet: http://localhost:8000
echo  Nhan Ctrl+C de dung server
echo ========================================
python -m http.server 8000
pause
