# Windows field notes — brush shell, winget aliases, machine PATH, Defender saga

## 1. The brush shell (why "command not found" for valid exes)

The omp/agent tool shell on Windows is a Rust **bash-emulator** (`brush`,
`packages/coding-agent/src/exec/bash-executor.ts`). Facts learned the hard way:
- Tool calls ALWAYS route through brush; `useUserShell: true` is only ever set for
  interactive `!` bang-commands, never the tool path (18.12.6).
- brush does **not** translate MSYS-style paths (`/c/...`) — `cd /c/x` fails,
  `./prog` then resolves against the wrong dir.
- **mingw-built PEs refuse to spawn under brush** ("command not found: ./g++.exe")
  even with Windows-style paths, while MSVC/Go/Python-built exes spawn fine.
- There is **no config key** to switch the tool shell to the real bash
  (`sandbox`, `exec.executor`, `shell.mode` etc. are all unknown settings).

**Working channels**: `powershell`/`ssh beebe@localhost` for native executables,
`C:/...` (never `/c/...`) paths, and full paths to MSVC/Go/python binaries.

## 2. winget / pwsh "0-byte alias" trap

`C:\Users\<u>\AppData\Local\Microsoft\WindowsApps\winget.exe` and `pwsh.exe` are
**reparse aliases**. On stripped images the backing package dir
(`Microsoft.DesktopAppInstaller_8wekyb3d8bbwe`, `Microsoft.PowerShell_8wekyb3d8bbwe`)
can be empty — the alias resolves to nothing, and bash/cmd both report
"not recognized". Diagnostics:

```bash
ls "C:/Users/<u>/AppData/Local/Microsoft/WindowsApps/"   # 0-byte stubs
ls -d "C:/Program Files/WindowsApps/Microsoft.DesktopAppInstaller*"  # empty dir = broken
```

A **shim** (`~/.local/bin/winget`) that bridges to cmd is only useful once the
package is repaired (install the real MSIX). `pwsh` fix: portable zip from
PowerShell releases → extract → `~/.local/bin/pwsh` shim → works because the
real exe is a .NET PE that spawns fine.

## 3. Machine PATH surgery (global toolchain)

```powershell
# elevated
$p=[Environment]::GetEnvironmentVariable('PATH','Machine')
[Environment]::SetEnvironmentVariable('PATH', $p + ';C:\Users\beebe\tools\mingw64\mingw64\bin;C:\Users\beebe\tools\powershell7;C:\Users\beebe\.local\bin', 'Machine')
```

New processes inherit; the agent client needs a restart to see it.

## 4. choco NuGet lock war

`choco install mingw` failed repeatedly with a lock on
`C:\ProgramData\chocolatey\lib\<hash>` even after deleting it — a live ghost
choco/nuget process re-creates it. `taskkill //F //IM choco.exe` + delete, or
skip choco entirely: winlibs portable GCC (GitHub releases) is lock-free and
statically links.

## 5. Defender tamper chronology (as of 2026-10-23)

- `Set-MpPreference -DisableRealtimeMonitoring` doesn't stick with Tamper ON.
- Plain-admin reg writes to `HKLM\...\Windows Defender\Features` → Access denied (SYSTEM-only ACL).
- `AlteredSecurity/Disable-TamperProtection` (vendored, built with mingw
  `g++ -O2 -static -municode -DUNICODE -D_UNICODE -lfltlib`):
  - option 1: TrustedInstaller-privileged `reg.exe` deletes WdFilter's Altitude key (breaks the minidriver binding),
  - option 2: TI-spawned reg sets `TamperProtection` 5→4 **but only fires when the filter reports unloaded** (getMiniFilterData()==99),
  - option 3: restores.
- Result so far: altitude deletion lands, then Defender re-arms it while the
  driver still runs; the sequence wants a reboot _between_ deletion and step 2,
  with the field notes above: the delete must persist with the driver down.
- Residual: `scripts/defender-off.ps1` / `scripts/defender-restore.ps1` are the
  runbook; boss said "forget it for now, this sucks" — status: **parked, not buried**.

## 6. scp path styles

Windows OpenSSH `scp.exe` can't stat MSYS `/c/...` paths → use `C:/...` on the
local side, and `C:\...` on the remote side. When scp "dest open" fails for a
file that exists remotely as a 0-byte ghost, delete the ghost first.
