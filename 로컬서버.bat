@echo off
chcp 65001 >nul
title 로컬 서버 실행
color 0B

echo ============================================
echo    로컬 서버 실행
echo ============================================
echo.

cd /d "%~dp0wedding2"

echo [1/2] 로컬 서버 시작 중...
echo.
echo 서버 주소: http://localhost:8080
echo.
echo 브라우저가 자동으로 열립니다.
echo 서버를 종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo.

start http://localhost:8080

python -m http.server 8080

pause