@echo off
setlocal enabledelayedexpansion
echo ==========================================
echo    PREPARING YOUR ISLAMIC APP FOR RELEASE
echo ==========================================

:: 1. محاولة استخدام الجافا الموجودة في النظام أولا
java -version >nul 2>&1
if %errorlevel% == 0 (
    echo System Java found.
    goto :start_build
)

:: 2. البحث عن جافا أندرويد ستوديو في مسارات متعددة
echo Searching for Android Studio Java...
for %%D in ("C:\Program Files\Android\Android Studio" "C:\Program Files (x86)\Android\Android Studio" "%LOCALAPPDATA%\Android\Android Studio") do (
    if exist "%%~D" (
        for /f "delims=" %%F in ('dir /s /b "%%~D\java.exe" 2^>nul') do (
            set "JAVA_BIN=%%F"
            for %%A in ("!JAVA_BIN!") do set "BIN_DIR=%%~dpA"
            set "JAVA_HOME=!BIN_DIR:~0,-5!"
            set "PATH=!JAVA_HOME!\bin;!PATH!"
            echo Found Java at: !JAVA_HOME!
            goto :start_build
        )
    )
)

:no_java
echo [ERROR] Could not find Java.
echo Please open Android Studio and click the "Sync" icon (Elephant icon) first.
pause
exit /b

:start_build
cd android
echo Cleaning project...
call gradlew.bat clean
echo Building APK...
call gradlew.bat assembleRelease

echo.
echo ==========================================
if exist "app\build\outputs\apk\release\app-release-unsigned.apk" (
    echo SUCCESS! Your App is Ready.
    echo.
    echo Your APK is here:
    echo %cd%\app\build\outputs\apk\release\
) else (
    echo FAILED! Something is still wrong.
)
echo ==========================================
pause
