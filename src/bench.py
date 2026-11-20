#!/usr/bin/env python3
"""Benchmark runner for Đảo Đèn Lồng (Ticket-04 / Contract v1.3).

Usage:
  python3 src/bench.py --seed 42 --duration 30 --out bench.json

Opens a 1280x720 non-fullscreen browser window running the standardized Night 1
benchmark scene (200 wandering Shades, 100 Fireflies, L1-L3 lit, 3s warmup,
orbiting camera r=30m Y=15m CCW 15s/rev), disables vsync via Chromium flags,
collects real per-frame timings, and writes bench.json.
"""

from __future__ import annotations

import argparse
import http.server
import json
import os
import platform
import shutil
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]


def find_browser() -> Optional[str]:
    """Locate Chrome, Chromium, or Edge binary on macOS, Linux, or Windows."""
    candidates: List[str] = []
    if sys.platform == "win32":
        for root in (os.environ.get("PROGRAMFILES", ""), os.environ.get("PROGRAMFILES(X86)", ""), os.environ.get("LOCALAPPDATA", "")):
            if not root:
                continue
            candidates.extend([
                str(Path(root) / "Google/Chrome/Application/chrome.exe"),
                str(Path(root) / "Microsoft/Edge/Application/msedge.exe"),
                str(Path(root) / "BraveSoftware/Brave-Browser/Application/brave.exe"),
            ])
        for name in ("chrome", "msedge", "chromium"):
            found = shutil.which(name)
            if found:
                candidates.append(found)
    elif sys.platform == "darwin":
        candidates.extend([
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ])
    else:
        for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"):
            found = shutil.which(name)
            if found:
                candidates.append(found)

    for path in candidates:
        if path and Path(path).is_file():
            return path
    return None


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def sample_tree_rss_mb(root_pid: int) -> Optional[float]:
    """Best-effort RSS measurement for browser process (returns None if unavailable)."""
    try:
        if sys.platform == "win32":
            out = subprocess.check_output(
                ["tasklist", "/FI", f"PID eq {root_pid}", "/FO", "CSV", "/NH"],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
            if out and "INFO:" not in out:
                parts = [p.strip('"') for p in out.split('","')]
                if len(parts) >= 5:
                    kb_str = "".join(ch for ch in parts[4] if ch.isdigit())
                    if kb_str:
                        return int(kb_str) / 1024.0
        else:
            out = subprocess.check_output(
                ["ps", "-o", "rss=", "-p", str(root_pid)],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
            if out.isdigit():
                return int(out) / 1024.0
    except Exception:
        return None
    return None


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng — 3D Benchmark Runner (Contract v1.3)")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic seed for benchmark scene")
    parser.add_argument("--duration", type=float, default=30.0, help="Measurement duration in seconds (after 3s warmup)")
    parser.add_argument("--out", type=str, required=True, help="Output bench.json path")
    return parser.parse_args(argv)


def run_bench(argv: Optional[List[str]] = None) -> int:
    t_proc_start = time.perf_counter()
    args = parse_args(argv)
    if args.duration <= 0:
        print("Error: --duration must be positive", file=sys.stderr)
        return 1

    browser = find_browser()
    if browser is None:
        print(
            "Error: No Chrome/Chromium/Edge browser found to render the 1280x720 WebGL benchmark.",
            file=sys.stderr,
        )
        return 1

    result_holder: Dict[str, Any] = {}
    done_event = threading.Event()

    class BenchHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *hargs, **hkwargs):
            super().__init__(*hargs, directory=str(REPO_ROOT), **hkwargs)

        def log_message(self, format: str, *hargs) -> None:  # noqa: A002
            pass

        def do_POST(self) -> None:
            if self.path == "/api/bench-result":
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length)
                try:
                    data = json.loads(raw.decode("utf-8"))
                    result_holder.update(data)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"ok":true}')
                    done_event.set()
                except Exception as exc:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(str(exc).encode("utf-8"))
                return
            self.send_response(404)
            self.end_headers()

    port = find_free_port()
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", port), BenchHandler)
    srv_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    srv_thread.start()

    url = f"http://127.0.0.1:{port}/web/?bench=1&seed={args.seed}&duration={args.duration}"
    tmp_profile = tempfile.mkdtemp(prefix="ddl_bench_profile_")

    cmd = [
        browser,
        f"--app={url}",
        "--window-size=1280,720",
        f"--user-data-dir={tmp_profile}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-gpu-vsync",
        "--disable-frame-rate-limit",
        "--autoplay-policy=no-user-gesture-required",
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    peak_mem_mb: Optional[float] = None
    timeout_s = args.duration + 35.0
    deadline = time.perf_counter() + timeout_s

    try:
        while not done_event.is_set() and time.perf_counter() < deadline:
            rss = sample_tree_rss_mb(proc.pid)
            if rss is not None:
                peak_mem_mb = rss if peak_mem_mb is None else max(peak_mem_mb, rss)
            if proc.poll() is not None and not done_event.is_set():
                break
            done_event.wait(0.25)
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=4)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        httpd.shutdown()
        httpd.server_close()
        shutil.rmtree(tmp_profile, ignore_errors=True)

    if not done_event.is_set() or "frames" not in result_holder:
        print("Error: Benchmark timed out or browser exited before reporting results.", file=sys.stderr)
        return 1

    # Compute total load_ms from process start to first bench frame
    client_load_ms = float(result_holder.get("load_ms", 0.0))
    total_elapsed_ms = (time.perf_counter() - t_proc_start) * 1000.0
    measured_ms = float(result_holder.get("measured_ms", args.duration * 1000.0))
    warmup_ms = float(result_holder.get("warmup_ms", 3000.0))
    est_load_ms = max(client_load_ms, total_elapsed_ms - measured_ms - warmup_ms)

    output = {
        "contract_version": "1.3",
        "avg_fps": round(float(result_holder["avg_fps"]), 2),
        "p1_low_fps": round(float(result_holder["p1_low_fps"]), 2),
        "frame_ms_p95": round(float(result_holder["frame_ms_p95"]), 2),
        "frames": int(result_holder["frames"]),
        "load_ms": round(max(1.0, est_load_ms), 1),
        "peak_mem_mb": round(peak_mem_mb, 1) if peak_mem_mb is not None else None,
        "vsync_off": True,
        "renderer": str(result_holder.get("renderer", "Three.js r160 WebGL (1280x720)")),
        "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(run_bench())
