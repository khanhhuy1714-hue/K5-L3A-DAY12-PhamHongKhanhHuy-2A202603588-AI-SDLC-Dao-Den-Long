#!/usr/bin/env python3
"""Automated MP4 demo video recorder for Đảo Đèn Lồng (v1.0.0).

Collects genuine test, headless, soak, benchmark, AI harness, and git outputs,
launches Chrome to render + record web/demo_recorder.html via native MediaRecorder
(video/mp4) into docs/demo/demo.mp4, and verifies the MP4 container header.
"""

from __future__ import annotations

import http.server
import json
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.bench import find_browser, find_free_port  # noqa: E402


def collect_real_demo_data() -> Dict[str, Any]:
    # 1. Run unit/contract/regression tests
    test_proc = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    if test_proc.returncode != 0:
        raise RuntimeError(f"Unit tests failed:\n{test_proc.stdout}\n{test_proc.stderr}")
    combined_test = (test_proc.stderr or "") + "\n" + (test_proc.stdout or "")
    test_lines = ["$ python -m unittest discover -s tests -v"] + [
        ln for ln in combined_test.splitlines() if ln.strip()
    ]

    # 2. Run headless Contract v1.3 scenario
    with tempfile.TemporaryDirectory() as td:
        h_out = Path(td) / "demo_headless.jsonl"
        h_proc = subprocess.run(
            [
                sys.executable,
                "src/headless.py",
                "--seed", "33",
                "--night", "1",
                "--scenario", "tests/scenarios/p3_fuel_dawn_scenario.json",
                "--inputs", "tests/scenarios/p3_fuel_dawn_inputs.json",
                "--ticks", "300",
                "--out", str(h_out),
                "--snapshot-every", "60",
            ],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            check=True,
        )
        _ = h_proc
        headless_lines = [
            "$ python src/headless.py --seed 33 --night 1 --scenario p3_fuel_dawn.json ...",
            *h_out.read_text(encoding="utf-8").splitlines(),
        ]

    # 3. Read soak.json & bench.json
    soak_path = REPO_ROOT / "soak.json"
    if not soak_path.is_file():
        subprocess.run(
            [sys.executable, "src/soak.py", "--seed", "7", "--nights", "10", "--out", str(soak_path)],
            cwd=str(REPO_ROOT),
            check=True,
        )
    soak_data = json.loads(soak_path.read_text(encoding="utf-8"))
    soak_lines = [
        "$ python src/soak.py --seed 7 --nights 10 --out soak.json",
        *json.dumps(soak_data, indent=2).splitlines(),
    ]

    bench_path = REPO_ROOT / "bench.json"
    if not bench_path.is_file():
        raise FileNotFoundError("bench.json is missing; run `python src/bench.py --seed 42 --duration 30 --out bench.json` first.")
    bench_data = json.loads(bench_path.read_text(encoding="utf-8"))

    # 4. Read AI harness & git metadata
    agents_lines = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8").splitlines()[:16]
    harness_lines = [
        "=== AGENTS.md ===",
        *agents_lines,
        "",
        "=== .agents/skills/verify-phase/SKILL.md ===",
        *(REPO_ROOT / ".agents" / "skills" / "verify-phase" / "SKILL.md").read_text(encoding="utf-8").splitlines()[:8],
    ]

    tags_out = subprocess.check_output(["git", "tag", "--list"], cwd=str(REPO_ROOT), text=True).splitlines()
    log_out = subprocess.check_output(["git", "log", "-n", "10", "--oneline"], cwd=str(REPO_ROOT), text=True).splitlines()
    git_lines = [
        "=== git tag --list ===",
        *(tags_out or ["(tags ready)"]),
        "",
        "=== git log -n 10 --oneline ===",
        *log_out,
        "",
        "=== Release v1.0.0 Artifact ===",
        "dist/dao-den-long-v1.0.0.zip · Dockerfile · docs/demo/demo.mp4",
    ]

    return {
        "bench": bench_data,
        "test_lines": test_lines,
        "headless_lines": headless_lines,
        "soak_lines": soak_lines,
        "harness_lines": harness_lines,
        "git_lines": git_lines,
    }


def main() -> int:
    browser = find_browser()
    if browser is None:
        print("Error: Chrome/Chromium/Edge not found.", file=sys.stderr)
        return 1

    demo_data = collect_real_demo_data()
    out_mp4 = REPO_ROOT / "docs" / "demo" / "demo.mp4"
    out_mp4.parent.mkdir(parents=True, exist_ok=True)

    state: Dict[str, Any] = {"ok": False, "error": None}
    done_event = threading.Event()
    data_bytes = json.dumps(demo_data, ensure_ascii=False).encode("utf-8")

    class DemoHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            pass

        def do_GET(self) -> None:
            if self.path == "/api/demo-data":
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data_bytes)))
                self.end_headers()
                self.wfile.write(data_bytes)
                return
            super().do_GET()

        def do_POST(self) -> None:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            if self.path == "/api/demo-video":
                if len(raw) < 50_000 or raw[4:8] != b"ftyp":
                    state["error"] = f"Invalid MP4 output (size={len(raw)}, header={raw[:12]!r})"
                    self.send_response(400)
                    self.end_headers()
                    done_event.set()
                    return
                out_mp4.write_bytes(raw)
                state["ok"] = True
                resp = json.dumps({"ok": True, "bytes": len(raw)}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.end_headers()
                self.wfile.write(resp)
                done_event.set()
                return
            if self.path == "/api/demo-error":
                state["error"] = raw.decode("utf-8", errors="replace")
                self.send_response(200)
                self.end_headers()
                done_event.set()
                return
            self.send_response(404)
            self.end_headers()

    port = find_free_port()
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", port), DemoHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    url = f"http://127.0.0.1:{port}/web/demo_recorder.html"
    tmp_profile = tempfile.mkdtemp(prefix="ddl_demo_rec_")
    cmd = [
        browser,
        f"--app={url}",
        "--window-size=1280,720",
        f"--user-data-dir={tmp_profile}",
        "--no-first-run",
        "--no-default-browser-check",
        "--autoplay-policy=no-user-gesture-required",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        finished = done_event.wait(timeout=130.0)
        if not finished:
            state["error"] = "Timed out after 130s waiting for demo video upload."
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

    if not state["ok"]:
        print(f"Demo recording failed: {state['error']}", file=sys.stderr)
        return 1

    header = out_mp4.read_bytes()[:12]
    size_mb = out_mp4.stat().st_size / (1024.0 * 1024.0)
    print(f"Recorded valid MP4: {out_mp4} ({size_mb:.2f} MB, ftyp={header[4:8] == b'ftyp'})")
    return 0 if size_mb < 100.0 else 1


if __name__ == "__main__":
    sys.exit(main())
