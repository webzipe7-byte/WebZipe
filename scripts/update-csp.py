#!/usr/bin/env python3
"""Regenera la política CSP de index.html con los hashes SHA-256 de sus <script> en línea.

Úsalo cada vez que edites cualquier <script> de index.html:
    python3 scripts/update-csp.py
"""
import base64, hashlib, pathlib, re

PATH = pathlib.Path(__file__).resolve().parent.parent / "index.html"
SUPABASE = "https://jsllxsbfkwaxdxstheew.supabase.co"

html = PATH.read_text(encoding="utf-8")
hashes = []
for m in re.finditer(r"<script>(.*?)</script>", html, re.S):
    digest = base64.b64encode(hashlib.sha256(m.group(1).encode("utf-8")).digest()).decode()
    h = f"'sha256-{digest}'"
    if h not in hashes:
        hashes.append(h)

csp = "; ".join([
    "default-src 'none'",
    "script-src " + " ".join(hashes),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "media-src 'self'",
    f"connect-src {SUPABASE}",
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "upgrade-insecure-requests",
])

new, n = re.subn(r'(<meta http-equiv="Content-Security-Policy" content=")[^"]*(">)',
                 lambda m: m.group(1) + csp + m.group(2), html)
assert n == 1, "No se encontró la etiqueta meta de CSP"
PATH.write_text(new, encoding="utf-8")
print(f"CSP actualizada con {len(hashes)} scripts")
