# AGENTS.md — Đảo Đèn Lồng (AI SDLC Harness — Phase 4 / Contract v1.3 / v1.0.0)

## Project Overview
3D third-person game **Đảo Đèn Lồng** spanning 3 Nights (Đảo Bến 240s, Đảo Cau 270s, Đảo Chuông 300s):
- `src/core/maps.py`: Standard map geometry, terrain heights, ramps, jump pads, obstacles, and spawn points for Nights 1–3.
- `src/core/engine.py`: Pure Python 3 standard-library deterministic simulation engine (60 ticks/sec, zero external deps, Contract v1.3).
- `src/core/leaderboard.py`: Persistent Top-10 local leaderboard (`data/leaderboard.json`) with tie-break & CLI export.
- `src/headless.py`: Headless CLI supporting `--night 1|2|3` and **Test Contract v1.3**.
- `src/soak.py`: Multi-night headless soak runner (`--seed 7 --nights 10 --out soak.json`) with cross-platform RSS memory check.
- `src/bench.py`: 1280×720 3D benchmark runner (`--seed 42 --duration 30 --out bench.json`).
- `src/play.py` + `web/`: Three.js 3D renderer with 3-Night campaign, standardized `?bench=1` mode, local leaderboard API & UI, full key rebinding, visual subtitles/indicators, reduced motion, 18px+ large-font accessibility, and colorblind mode.

## Essential Commands
- Build / syntax check: `python3 -m compileall -q src`
- Run all unit, contract, regression & soak/leaderboard tests: `python3 -m unittest discover -s tests -v`
- Run headless smoke test: `python3 src/headless.py --seed 42 --night 1 --ticks 600 --out /tmp/out.jsonl`
- Run soak test: `python3 src/soak.py --seed 7 --nights 10 --out soak.json`
- Run 3D benchmark: `python3 src/bench.py --seed 42 --duration 30 --out bench.json`
- Export leaderboard: `python3 src/play.py --export-leaderboard out.json`
- Play 3D game: `python3 src/play.py`

## Non-Negotiable Rules (Phase 4 — Release v1.0.0)
1. **Single Source of Truth:** All tuning constants MUST match `game.contract.json` (Contract v1.3).
2. **Integer 1/60 Fuel Math:** Store lantern fuel as integer `fuel_60` (`0..6000`).
3. **Exact Tick Order & Shade States:** `spawning`, `wander`, `chase`, `recoil`, `stunned`, `drain`.
4. **Benchmark & Soak Purity:** Extra creative decor/effects MUST be disabled in `?bench=1` and headless soak mode so every submission is measured on the exact standard scene.
5. **No Fake Evidence:** Never hand-edit `bench.json`, `soak.json`, or test outputs. Always commit genuine tool outputs.
6. **Security:** Never commit `.env`, API keys, or tokens.

## Skills
- `.agents/skills/verify-phase/SKILL.md`: Standard verification & proof-generation workflow to run before tagging any phase.
