@echo off
REM ============================================================
REM  menagerie-resume.cmd — post-reboot session resurrection
REM  1. waits for the machine to settle, 2. re-arms Defender kill
REM  (if the boot task didn't fire), 3. reopens the last omp
REM  agent session with the original session file, 4. optional:
REM  re-runs the menagerie CLI.
REM ============================================================
setlocal EnableDelayedExpansion
cd /d C:\Users\beebe

echo [menagerie-resume] waiting for boot settle...
ping -n 15 127.0.0.1 >nul
timeout /t 5 /nobreak >nul

echo [menagerie-resume] checking Defender state...
powershell -NoProfile -Command "$s=Get-MpComputerStatus; if($s.RealTimeProtectionEnabled){Write-Output 'Defender still ON -> re-running defender-off'; Start-Process gsudo -ArgumentList 'powershell','-NoProfile','-ExecutionPolicy','Bypass','-File','C:\Users\beebe\menagerie\scripts\defender-off.ps1' -Verb RunAs -Wait}else{Write-Output 'Defender OFF: good'}" 

echo [menagerie-resume] picking newest omp agent session...
for /f "delims=" %%f in ('dir /b /o-d "C:\Users\beebe\.omp\agent\sessions\-tmp\*.jsonl" 2^>nul ^| findstr /v /i "lock" ^| findstr /r ".*"') do (
  set "SESSION=%%f"
  goto :found
)
:found
if not defined SESSION (
  echo [menagerie-resume] no prior session found, launching fresh omp
  start "" "C:\Users\beebe\AppData\Local\omp\omp.exe"
  goto :done
)
set "PI_SESSION_FILE=C:\Users\beebe\.omp\agent\sessions\-tmp\%SESSION%"
echo [menagerie-resume] restoring session: %PI_SESSION_FILE%
start "" /b cmd /c "set PI_SESSION_FILE=%PI_SESSION_FILE% && \"C:\Users\beebe\AppData\Local\omp\omp.exe\""
:done
echo [menagerie-resume] done. your session should be back.
endlocal