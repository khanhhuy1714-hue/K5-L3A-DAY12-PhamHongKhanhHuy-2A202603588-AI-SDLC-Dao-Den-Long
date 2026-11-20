#!/usr/bin/env python3
"""Soak test runner for Đảo Đèn Lồng (Ticket-04 / Contract v1.3).

Usage:
  python3 src/soak.py --seed 7 --nights 10 --out soak.json
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import json
import math
import os
import random
import sys
import time
from pathlib import Path
from typing import List, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.core.engine import GameEngine, InputState, TICK_RATE, load_contract  # noqa: E402


def get_rss_mb() -> float:
    """Return current process RSS memory in MiB (cross-platform, zero external deps)."""
    if sys.platform == "win32":
        class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
            _fields_ = [
                ("cb", ctypes.c_ulong),
                ("PageFaultCount", ctypes.c_ulong),
                ("PeakWorkingSetSize", ctypes.c_size_t),
                ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t),
                ("PeakPagefileUsage", ctypes.c_size_t),
            ]

        counters = PROCESS_MEMORY_COUNTERS()
        counters.cb = ctypes.sizeof(counters)
        kernel32 = ctypes.windll.kernel32
        kernel32.GetCurrentProcess.restype = ctypes.c_void_p
        psapi = ctypes.windll.psapi
        psapi.GetProcessMemoryInfo.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ulong]
        psapi.GetProcessMemoryInfo.restype = ctypes.c_int
        handle = kernel32.GetCurrentProcess()
        if psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb):
            return counters.WorkingSetSize / (1024.0 * 1024.0)
        return 0.0

    # Linux: /proc/self/statm gives current resident pages
    statm = Path("/proc/self/statm")
    if statm.is_file():
        parts = statm.read_text(encoding="utf-8").split()
        if len(parts) >= 2:
            pages = int(parts[1])
            return (pages * os.sysconf("SC_PAGE_SIZE")) / (1024.0 * 1024.0)

    # macOS / POSIX fallback via resource.getrusage
    import resource  # noqa: PLC0415

    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if sys.platform == "darwin":
        return rss / (1024.0 * 1024.0)
    return rss / 1024.0


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng — Headless Soak Test (Contract v1.3)")
    parser.add_argument("--seed", type=int, default=7, help="Base deterministic seed")
    parser.add_argument("--nights", type=int, default=10, help="Number of consecutive nights to run")
    parser.add_argument("--out", type=str, required=True, help="Output soak JSON path")
    return parser.parse_args(argv)


def run_soak(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    if args.nights <= 0:
        print("Error: --nights must be positive", file=sys.stderr)
        return 1

    contract = load_contract(REPO_ROOT / "game.contract.json")
    tuning = contract["tuning"]

    results: List[str] = []
    crashes = 0
    mem_start_mb: Optional[float] = None
    t0 = time.perf_counter()

    for i in range(args.nights):
        night_num = (i % 3) + 1
        night_seed = args.seed + i
        inp_rng = random.Random(night_seed ^ 0x5A5A5A5A)

        try:
            engine = GameEngine(seed=night_seed, night=night_num, tuning=tuning)
            if i == 0:
                gc.collect()
                mem_start_mb = get_rss_mb()

            max_ticks = int(round(engine.initial_time_left_s * TICK_RATE))
            move_vec = [0.0, 0.0]

            for step_k in range(max_ticks):
                if engine.state in ("won", "lost"):
                    break

                if step_k % 30 == 0:
                    ang = inp_rng.uniform(0.0, 2.0 * math.pi)
                    move_vec = [math.cos(ang), math.sin(ang)]

                # Rising-edge friendly random triggers (5% jump, 3% dash, 2% pulse, 10% interact)
                inp = InputState(
                    move=move_vec,
                    cam_yaw_deg=0.0,
                    jump=(inp_rng.random() < 0.05) and not engine._prev_input.jump,
                    dash=(inp_rng.random() < 0.03) and not engine._prev_input.dash,
                    pulse=(inp_rng.random() < 0.02) and not engine._prev_input.pulse,
                    interact=(inp_rng.random() < 0.10) and not engine._prev_input.interact,
                )
                engine.step(inp)

            results.append(engine.state if engine.state in ("won", "lost") else "lost")
            # Reset / release night resources explicitly
            del engine
        except Exception as exc:
            crashes += 1
            results.append("crash")
            print(f"Soak night {i} (night={night_num}, seed={night_seed}) crashed: {exc}", file=sys.stderr)

    gc.collect()
    mem_end_mb = get_rss_mb()
    duration_s = round(time.perf_counter() - t0, 2)

    if mem_start_mb is None:
        mem_start_mb = mem_end_mb

    payload = {
        "nights": args.nights,
        "crashes": crashes,
        "results": results,
        "mem_start_mb": round(mem_start_mb, 2),
        "mem_end_mb": round(mem_end_mb, 2),
        "duration_s": duration_s,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))
    return 0 if crashes == 0 else 1


if __name__ == "__main__":
    sys.exit(run_soak())
