#!/usr/bin/env python3
"""Package the theme into an installable zip.

Komari expects the archive root to contain `komari-theme.json` next to `dist/`.
The build already writes the `/themes/<short>/dist/` prefix into every asset
URL, so the zip must not add another directory level.

Usage: python tools/pack.py [--short Mono]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAMP = (2026, 1, 1, 0, 0, 0)


def collect(short: str, preview: bool) -> list[Path]:
    files: list[Path] = [ROOT / "komari-theme.json"]
    dist = ROOT / "dist"
    if not dist.is_dir():
        sys.exit("dist/ missing - run `pnpm build` first")
    files += sorted(path for path in dist.rglob("*") if path.is_file())
    if preview and (ROOT / "preview.png").is_file():
        files.append(ROOT / "preview.png")
    missing = [path for path in files if not path.is_file()]
    if missing:
        sys.exit(f"missing files: {missing}")
    return files


def verify(short: str) -> None:
    manifest = json.loads((ROOT / "komari-theme.json").read_text(encoding="utf-8"))
    if manifest.get("short") != short:
        sys.exit(f"manifest short={manifest.get('short')!r} but --short={short!r}")

    html = (ROOT / "dist" / "index.html").read_text(encoding="utf-8")
    required = [
        "<title>Komari Monitor</title>",
        '<meta name="description" content="A simple server monitor tool." />',
        "</head>",
        "</body>",
    ]
    for needle in required:
        if needle not in html:
            sys.exit(f"index.html is missing the sentinel {needle!r}")

    expected = f"/themes/{short}/dist/"
    if expected not in html:
        sys.exit(
            f"index.html does not reference {expected!r}; "
            f"build with THEME_SHORT={short} (see vite.config.ts)"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--short", default="Mono")
    parser.add_argument("--no-preview", action="store_true")
    args = parser.parse_args()

    verify(args.short)
    files = collect(args.short, preview=not args.no_preview)
    out = ROOT / f"komari-theme-{args.short.lower()}-{json.loads((ROOT / 'komari-theme.json').read_text(encoding='utf-8'))['version']}.zip"
    out.unlink(missing_ok=True)

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            arcname = path.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(arcname, date_time=STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())

    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    print(f"package : {out.name}")
    print(f"entries : {len(files)}")
    print(f"size    : {out.stat().st_size / 1024:.1f} KiB")
    print(f"sha256  : {digest}")


if __name__ == "__main__":
    main()
