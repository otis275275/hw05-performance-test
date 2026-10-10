@echo off
title EShop Backend SUT Server (Port 3000)
echo ========================================================
echo   Khoi dong eShop SUT Backend cho kiem thu API
echo   Endpoint: http://localhost:3000
echo ========================================================
cd /d "%~dp0\backend"

if not exist node_modules (
    echo Dang cai dat thu vien backend (npm install)...
    call npm install
)

if not exist database.sqlite (
    echo Khoi tao co so du lieu mau (database.sqlite)...
    call node database.js
)

echo.
echo Dang khoi chay server tai http://localhost:3000 ...
echo (Nhan Ctrl+C de dung server khi ket thuc test)
echo.
node server.js
pause
