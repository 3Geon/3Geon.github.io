@echo off
chcp 65001 >nul
title GitHub 업로드 자동화
color 0A

echo ============================================
echo    GitHub 업로드 자동화
echo ============================================
echo.

cd /d "%~dp0"

echo [1/4] 변경된 파일 확인 중...
echo.
git status
echo.

echo ============================================
echo    위에 변경된 파일들이 표시됩니다.
echo    업로드할 파일이 맞는지 확인해주세요.
echo ============================================
echo.

set /p commit_msg="커밋 메시지를 입력하세요 (예: 사진 변경, 레이아웃 수정): "

if "%commit_msg%"=="" (
    echo.
    echo [오류] 커밋 메시지가 비어있습니다. 다시 실행해주세요.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/4] 파일 스테이징 중...
git add .
if errorlevel 1 (
    echo [오류] 파일 스테이징 실패!
    pause
    exit /b 1
)
echo 완료!
echo.

echo [3/4] 커밋 중...
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo.
    echo [오류] 커밋 실패!
    echo 변경된 파일이 없거나 오류가 발생했습니다.
    echo.
    pause
    exit /b 1
)
echo 완료!
echo.

echo [4/4] GitHub 업로드 중...
git push origin main
if errorlevel 1 (
    echo.
    echo [오류] GitHub 업로드 실패!
    echo 인터넷 연결을 확인하거나 GitHub 로그인 상태를 확인해주세요.
    echo.
    pause
    exit /b 1
)
echo.
echo ============================================
echo    업로드 완료! 🎉
echo    https://3geon.github.io/wedding2/
echo    사이트가 몇 초 후에 업데이트됩니다.
echo ============================================
echo.
pause