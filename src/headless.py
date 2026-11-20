#!/usr/bin/env python3
"""Headless CLI runner for Đảo Đèn Lồng (Test Contract v1.1).

Usage:
  python3 src/headless.py --seed <int> --night <1|2|3> [--scenario <file.json>]
                          [--inputs <file.json>] --ticks <int> --out <file.jsonl>
                          [--snapshot-every <int, default 10>]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.core.engine import (  # noqa: E402
    ContractValidationError,
    GameEngine,
    InputState,
    load_contract,
    validate_inputs_data,
    validate_scenario_data,
)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng — Headless Runner (Contract v1.1)")
    parser.add_argument("--seed", type=int, required=True, help="Deterministic RNG seed")
    parser.add_argument("--night", type=int, required=True, help="Night number (1, 2, or 3)")
    parser.add_argument("--scenario", type=str, default=None, help="Optional scenario JSON file")
    parser.add_argument("--inputs", type=str, default=None, help="Optional inputs JSON file")
    parser.add_argument("--ticks", type=int, required=True, help="Maximum simulation ticks to run")
    parser.add_argument("--out", type=str, required=True, help="Output JSONL file path")
    parser.add_argument(
        "--snapshot-every",
        type=int,
        default=10,
        dest="snapshot_every",
        help="Emit snapshot every N ticks (default: 10)",
    )
    return parser.parse_args(argv)


def load_json_file(path_str: str, label: str) -> Any:
    path = Path(path_str)
    if not path.is_file():
        raise ContractValidationError(f"{label} file not found: {path_str}")
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        raise ContractValidationError(f"Invalid JSON in {label} file '{path_str}': {exc}") from exc


def run_headless(argv: Optional[List[str]] = None) -> int:
    try:
        args = parse_args(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 1

    if args.night not in (1, 2, 3):
        print(f"Error: unsupported night {args.night} (expected 1, 2, or 3)", file=sys.stderr)
        return 1
    if args.ticks < 0:
        print("Error: --ticks must be non-negative", file=sys.stderr)
        return 1
    if args.snapshot_every <= 0:
        print("Error: --snapshot-every must be positive", file=sys.stderr)
        return 1

    scenario_data: Optional[Dict[str, Any]] = None
    frames: List[Dict[str, Any]] = []

    try:
        if args.scenario is not None:
            raw_scenario = load_json_file(args.scenario, "scenario")
            scenario_data = validate_scenario_data(raw_scenario)
        if args.inputs is not None:
            raw_inputs = load_json_file(args.inputs, "inputs")
            frames = validate_inputs_data(raw_inputs)
    except ContractValidationError as exc:
        print(f"Contract validation error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"Error reading input files: {exc}", file=sys.stderr)
        return 1

    try:
        contract = load_contract(REPO_ROOT / "game.contract.json")
        engine = GameEngine(
            seed=args.seed,
            night=args.night,
            tuning=contract["tuning"],
            scenario=scenario_data,
        )

        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        frame_idx = 0
        current_input = InputState()

        with out_path.open("w", encoding="utf-8", newline="\n") as out_f:
            # Tick 0 snapshot (after scenario setup, before applying any input)
            out_f.write(json.dumps(engine.snapshot(), separators=(",", ":")) + "\n")

            for step_k in range(args.ticks):
                if engine.state in ("won", "lost"):
                    break

                if frame_idx < len(frames) and frames[frame_idx]["tick"] == step_k:
                    f = frames[frame_idx]
                    if "move" in f:
                        current_input.move = [f["move"][0], f["move"][1]]
                    if "cam_yaw_deg" in f:
                        current_input.cam_yaw_deg = f["cam_yaw_deg"]
                    if "jump" in f:
                        current_input.jump = f["jump"]
                    if "interact" in f:
                        current_input.interact = f["interact"]
                    if "pulse" in f:
                        current_input.pulse = f["pulse"]
                    if "dash" in f:
                        current_input.dash = f["dash"]
                    if "pause" in f:
                        current_input.pause = f["pause"]
                    frame_idx += 1

                events = engine.step(current_input)
                for ev in events:
                    out_f.write(json.dumps(ev, separators=(",", ":")) + "\n")

                if engine.tick % args.snapshot_every == 0:
                    out_f.write(json.dumps(engine.snapshot(), separators=(",", ":")) + "\n")

                if engine.state in ("won", "lost"):
                    break

            end_record = {
                "type": "end",
                "ticks": engine.tick,
                "state": engine.state,
                "score": engine.score,
            }
            out_f.write(json.dumps(end_record, separators=(",", ":")) + "\n")

        return 0
    except Exception as exc:
        print(f"Runtime error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run_headless())
