#!/usr/bin/env python3
"""Local HTTP server & CLI launcher for Đảo Đèn Lồng (Contract v1.3).

Supports:
  python3 src/play.py                             # Launch 3D game in browser
  python3 src/play.py --no-browser                # Start server without opening browser
  python3 src/play.py --export-leaderboard out.json  # Export local Top-10 leaderboard
"""

from __future__ import annotations

import argparse
import http.server
import json
import os
import socket
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path
from typing import List, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.core.leaderboard import (  # noqa: E402
    add_leaderboard_entry,
    export_leaderboard,
    load_leaderboard,
)


class GameHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A002
        pass

    def _send_json(self, code: int, obj: object) -> None:
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path == "/api/leaderboard":
            self._send_json(200, {"entries": load_leaderboard()})
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/leaderboard":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            try:
                body = json.loads(raw.decode("utf-8"))
                entries = add_leaderboard_entry(
                    name=str(body.get("name", "")),
                    score=int(body.get("score", 0)),
                    nights_won=int(body.get("nights_won", 0)),
                    seed=int(body.get("seed", 0)),
                )
                self._send_json(200, {"entries": entries})
            except ValueError as exc:
                self._send_json(400, {"error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"error": str(exc)})
            return
        self._send_json(404, {"error": "Not found"})


def find_free_port(preferred: int = 8000) -> int:
    for port in (preferred, 8080, 8888, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return int(s.getsockname()[1])
            except OSError:
                continue
    return 0


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng — 3D Game Server & Leaderboard CLI")
    parser.add_argument("--no-browser", action="store_true", help="Do not auto-open browser")
    parser.add_argument(
        "--export-leaderboard",
        type=str,
        default=None,
        dest="export_leaderboard",
        help="Export local Top-10 leaderboard to JSON file and exit",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    if args.export_leaderboard is not None:
        export_leaderboard(Path(args.export_leaderboard))
        return 0

    port = int(os.environ.get("PORT", find_free_port(8000)))
    url = f"http://127.0.0.1:{port}/web/"

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), GameHTTPHandler) as httpd:
        print(f"Dao Den Long 3D server running at: {url}")
        print("Press Ctrl+C to stop.")
        if not args.no_browser:
            threading.Timer(0.4, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
