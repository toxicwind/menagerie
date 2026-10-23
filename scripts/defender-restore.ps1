# defender-restore.ps1 — re-arm Microsoft Defender after menagerie-defender-off
# Runs the POC's option 3 (restore TamperProtection to 5) and re-enables realtime.
$ErrorActionPreference = 'Continue'
$dtp = 'C:/Users/beebe/AppData/Local/Temp/DTP.exe'
Write-Output '[defender-restore] restoring TamperProtection (5)'
& $dtp 3 | Out-Null
Start-Sleep -Seconds 2
reg add 'HKLM\SOFTWARE\Microsoft\Windows Defender\Features' /v TamperProtection /t REG_DWORD /d 5 /f | Out-Null
sc.exe config WinDefend start= demand | Out-Null
sc.exe config WdNisSvc start= demand | Out-Null
Start-Service WinDefend -ErrorAction SilentlyContinue
Set-MpPreference -DisableRealtimeMonitoring $false -DisableBehaviorMonitoring $false -DisableIOAVProtection $false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'menagerie-defender-off' -Confirm:$false -ErrorAction SilentlyContinue
Start-Sleep -Seconds 4
Write-Output ("RTP: " + (Get-MpComputerStatus).RealTimeProtectionEnabled)