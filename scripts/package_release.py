#!/usr/bin/env python3
"""Package a self-contained runnable release archive for GitHub Release v1.0.0."""

from __future__ import annotations

import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DIST_DIR = REPO_ROOT / "dist"
ARCHIVE_PATH = DIST_DIR / "dao-den-long-v1.0.0.zip"

INCLUDE_PATHS = [
    "README.md",
    "LICENSE",
    "CREDITS.md",
    "CHANGELOG.md",
    "Dockerfile",
    "game.contract.json",
    "src",
    "web",
]


def main() -> int:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ARCHIVE_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for rel in INCLUDE_PATHS:
            target = REPO_ROOT / rel
            if target.is_file():
                zf.write(target, rel)
            elif target.is_dir():
                for f in sorted(target.rglob("*")):
                    if f.is_file() and "__pycache__" not in f.parts and not f.name.endswith(".pyc"):
                        zf.write(f, f.relative_to(REPO_ROOT).as_posix())
    size_kb = ARCHIVE_PATH.stat().st_size / 1024.0
    print(f"Packaged {ARCHIVE_PATH} ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
