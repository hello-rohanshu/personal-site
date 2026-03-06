@echo off
setlocal enabledelayedexpansion
set OUTPUT=__STRUCTURE_MAP__.txt
echo.
echo ============================================
echo    FOLDER STRUCTURE MAPPER
echo ============================================
echo.
echo Current directory: %CD%
echo.
echo Available subfolders:
echo --------------------
for /d %%D in (*) do echo   [%%D]
echo.
set /p FOLDERS="Enter folder names to map (space-separated, or * for all): "

if "%FOLDERS%"=="" (
    echo.
    echo No folders entered. Exiting.
    timeout /t 3 >nul
    exit /b
)

echo.
echo Creating structure map in "%OUTPUT%"...
echo.

rem Clear output file and add minimal header
> "%OUTPUT%" echo STRUCTURE: %CD%
>> "%OUTPUT%" echo.

rem Process each folder
if "%FOLDERS%"=="*" (
    for /d %%F in (*) do (
        call :ProcessFolder "%%F"
    )
) else (
    for %%F in (%FOLDERS%) do (
        call :ProcessFolder "%%F"
    )
)

>> "%OUTPUT%" echo.
rem Done - no footer needed

echo.
echo Done! "%OUTPUT%" created successfully.
echo.
echo Opening file...
start "" "%OUTPUT%"
echo.

rem Countdown
set COUNT=5
:Countdown
if %COUNT% LEQ 0 goto EndCountdown
echo Closing in %COUNT% seconds... (Press any key to exit now^)
set /a COUNT-=1
timeout /t 1 >nul
goto Countdown

:EndCountdown
exit /b

rem ============================================
rem Function: ProcessFolder
rem ============================================
:ProcessFolder
set "FOLDER=%~1"
if not exist "%FOLDER%" (
    >> "%OUTPUT%" echo ! Folder not found: %FOLDER%
    goto :eof
)
>> "%OUTPUT%" echo %FOLDER%/
call :ListFolder "%FOLDER%" "  "
goto :eof

rem ============================================
rem Function: ListFolder (Recursive)
rem ============================================
:ListFolder
set "BASE=%~1"
set "PREFIX=%~2"

rem Process folders first
for /f "delims=" %%D in ('dir "%BASE%" /b /ad /o:n 2^>nul') do (
    >> "%OUTPUT%" echo %PREFIX%%%D/
    call :ListFolder "%BASE%\%%D" "%PREFIX%  "
)

rem Then files
for /f "delims=" %%I in ('dir "%BASE%" /b /a-d /o:n 2^>nul') do (
    >> "%OUTPUT%" echo %PREFIX%%%I
)

goto :eof