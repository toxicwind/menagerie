#!/usr/bin/env python3
"""
Firefox Saved Passwords Decryptor

Decrypt saved logins from Firefox profile backup (logins.json + key4.db).
Supports Firefox profiles using PBES2 + PBKDF2-HMAC-SHA256 + AES-256-CBC.

Requirements:
    pip install pycryptodome pyasn1

Usage:
    python firefox_decrypt_logins.py --profile /path/to/firefox/profile
    python firefox_decrypt_logins.py --key4 /path/to/key4.db --logins /path/to/logins.json
    python firefox_decrypt_logins.py --profile /path/to/profile --filter example.com
"""

import argparse
import base64
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

from pyasn1.codec.der.decoder import decode as der_decode
from pyasn1.codec.der.encoder import encode as der_encode
from Crypto.Cipher import AES


def pbes2_decrypt(global_salt: bytes, master_pwd: bytes, raw_data: bytes) -> bytes:
    """
    Decrypt PBES2-encrypted data from key4.db.

    Firefox key4.db uses:
      - PBKDF2 with HMAC-SHA256, keyed by SHA1(globalSalt + masterPassword)
      - AES-256-CBC encryption
      - IV stored as raw DER-encoded OctetString (tag + length + value = 16 bytes)
    """
    decoded, _ = der_decode(raw_data)
    pbes2_params = decoded[0][1]

    # KDF parameters
    kdf_params = pbes2_params[0][1]
    entry_salt = bytes(kdf_params[0])
    iterations = int(kdf_params[1])
    key_length = int(kdf_params[2])

    # Encryption parameters
    # NOTE: Firefox stores the IV as a 14-byte OctetString; its full DER encoding
    # (tag 0x04 + length 0x0e + 14 value bytes = 16 bytes) is used as the AES IV.
    iv = der_encode(pbes2_params[1][1])
    encrypted = bytes(decoded[1])

    # Firefox NSS key derivation: SHA1(globalSalt + masterPassword) -> PBKDF2
    k = hashlib.sha1(global_salt + master_pwd).digest()
    key = hashlib.pbkdf2_hmac("sha256", k, entry_salt, iterations, dklen=key_length)

    cipher = AES.new(key, AES.MODE_CBC, iv)
    dec = cipher.decrypt(encrypted)

    # PKCS#7 unpad
    pad = dec[-1]
    return dec[:-pad] if 0 < pad <= 16 else dec


def extract_master_key(key4_path: str, master_pwd: bytes = b"") -> bytes:
    """Extract the AES-256 master key from key4.db."""
    conn = sqlite3.connect(key4_path)
    c = conn.cursor()

    # Get global salt from metaData
    c.execute("SELECT item1, item2 FROM metaData WHERE id = 'password'")
    row = c.fetchone()
    if row is None:
        raise RuntimeError("No 'password' entry in metaData — is this a valid key4.db?")

    global_salt = row[0]
    item2_raw = row[1]

    # Verify master password
    check = pbes2_decrypt(global_salt, master_pwd, item2_raw)
    if b"password-check" not in check:
        raise RuntimeError(
            "Master password verification failed. "
            "A master password may be set on this profile."
        )

    # Extract encryption key from nssPrivate (look for the 32-byte AES-256 key)
    c.execute("SELECT a11 FROM nssPrivate")
    rows = c.fetchall()
    conn.close()

    for (a11,) in rows:
        try:
            dk = pbes2_decrypt(global_salt, master_pwd, a11)
            if len(dk) == 32:
                return dk
        except Exception:
            continue

    raise RuntimeError("Could not extract 32-byte master key from nssPrivate")


def decrypt_login_field(b64_data: str, master_key: bytes) -> str:
    """Decrypt a single encrypted login field (username or password)."""
    raw = base64.b64decode(b64_data)
    decoded, _ = der_decode(raw)

    iv = bytes(decoded[1][1])
    encrypted = bytes(decoded[2])

    # If IV < 16 bytes, use its DER encoding (same quirk as key4.db)
    if len(iv) < 16:
        iv = der_encode(decoded[1][1])

    cipher = AES.new(master_key, AES.MODE_CBC, iv)
    dec = cipher.decrypt(encrypted)

    pad = dec[-1]
    if 0 < pad <= 16:
        dec = dec[:-pad]

    return dec.decode("utf-8", errors="replace")


def decrypt_logins(key4_path: str, logins_path: str, domain_filter: str = ""):
    """Main routine: extract key, decrypt all logins, print results."""
    print("[*] Extracting master key from key4.db ...")
    master_key = extract_master_key(key4_path)
    print(f"[+] Master key extracted ({len(master_key)} bytes, no master password)\n")

    with open(logins_path) as f:
        data = json.load(f)

    logins = data.get("logins", [])
    print(f"[*] Found {len(logins)} saved login(s)\n")

    results = []
    for login in logins:
        hostname = login["hostname"]

        if domain_filter and domain_filter.lower() not in hostname.lower():
            continue

        try:
            username = decrypt_login_field(login["encryptedUsername"], master_key)
            password = decrypt_login_field(login["encryptedPassword"], master_key)
        except Exception as e:
            username = f"[decrypt error: {e}]"
            password = f"[decrypt error: {e}]"

        results.append(
            {
                "hostname": hostname,
                "username": username,
                "password": password,
                "timesUsed": login.get("timesUsed", 0),
                "timeCreated": login.get("timeCreated", 0),
            }
        )

    if not results:
        print(f"[!] No logins found" + (f" matching '{domain_filter}'" if domain_filter else ""))
        return

    # Print results
    for r in results:
        print(f"  Site:     {r['hostname']}")
        print(f"  Username: {r['username']}")
        print(f"  Password: {r['password']}")
        print(f"  Used:     {r['timesUsed']} time(s)")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Decrypt saved passwords from a Firefox profile (key4.db + logins.json)"
    )
    parser.add_argument(
        "--profile", "-p",
        help="Path to Firefox profile directory (contains key4.db and logins.json)",
    )
    parser.add_argument("--key4", help="Path to key4.db (overrides --profile)")
    parser.add_argument("--logins", help="Path to logins.json (overrides --profile)")
    parser.add_argument(
        "--filter", "-f",
        default="",
        help="Only show logins matching this domain substring",
    )

    args = parser.parse_args()

    if args.key4 and args.logins:
        key4 = args.key4
        logins = args.logins
    elif args.profile:
        profile = Path(args.profile)
        key4 = str(profile / "key4.db")
        logins = str(profile / "logins.json")
    else:
        parser.error("Provide either --profile or both --key4 and --logins")

    if not Path(key4).exists():
        sys.exit(f"[!] key4.db not found: {key4}")
    if not Path(logins).exists():
        sys.exit(f"[!] logins.json not found: {logins}")

    decrypt_logins(key4, logins, args.filter)


if __name__ == "__main__":
    main()
