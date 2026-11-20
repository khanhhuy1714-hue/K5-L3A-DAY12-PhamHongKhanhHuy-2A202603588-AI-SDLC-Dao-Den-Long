#!/usr/bin/env python3
"""Local HTTP server to launch Đảo Đèn Lồng (3D Web Game)."""

from __future__ import annotations

import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A002
        pass


def find_free_port(preferred: int = 8000) -> int:
    for port in (preferred, 8080, 8888, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return s.getsockname()[1]
            except OSError:
                continue
    return 0


def main() -> int:
    port = int(os.environ.get("PORT", find_free_port(8000)))
    url = f"http://127.0.0.1:{port}/web/"

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), QuietHandler) as httpd:
        print(f"Dao Den Long 3D server running at: {url}")
        print("Press Ctrl+C to stop.")
        if "--no-browser" not in sys.argv:
            threading.Timer(0.4, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
