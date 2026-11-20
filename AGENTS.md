# AGENTS.md — Đảo Đèn Lồng (AI SDLC Harness — Phase 2 / Contract v1.1)

## Project Overview
3D third-person game **Đảo Đèn Lồng** spanning 3 Nights (Đảo Bến, Đảo Cau, Đảo Chuông):
- `src/core/maps.py`: Standard map geometry, terrain heights, ramps, jump pads, obstacles, and spawn points for Nights 1–3.
- `src/core/engine.py`: Pure Python 3 standard-library deterministic simulation engine (60 ticks/sec, zero external deps, Contract v1.1).
- `src/headless.py`: Headless CLI supporting `--night 1|2|3` and **Test Contract v1.1**.
- `src/play.py` + `web/`: Three.js 3D renderer with 3-Night campaign, pause/settings menu, standard color palette, full HUD, and Web Audio.

## Essential Commands
- Build / syntax check: `python3 -m compileall -q src`
- Run all unit, contract & regression tests: `python3 -m unittest discover -s tests -v`
- Run headless smoke test (Night 1/2/3): `python3 src/headless.py --seed 42 --night 1 --ticks 600 --out /tmp/out.jsonl`
- Play 3D game: `python3 src/play.py`

## Non-Negotiable Rules (Phase 2)
1. **Single Source of Truth:** All tuning constants MUST match `game.contract.json` (Contract v1.1 standard values). Never diverge between `engine.py` and `web/game.js`.
2. **Exact 12-Step Tick Order:** Follow Ticket-02 tick order strictly (Pause → Timers → Move/Fall → Pickup → Interact → Safe Zones → Pulse → Move Enemies → Collisions [Drifter then Shade by ascending id] → Spawns → Win/Lose → Snapshot).
3. **Strict Determinism:** Never use global `random`. Always use `self.rng = random.Random(seed)` inside `GameEngine`.
4. **Exact Shade State Names:** Only use `spawning`, `wander`, `chase`, `recoil`, `stunned`.
5. **Headless Performance:** A full Night (21,600 ticks) MUST complete in `<= 30s`.
6. **No Fake Evidence:** Never write always-pass tests, never hand-edit output JSONL, and never disable failing tests silently. Update legacy Phase 1 tests with explicit reasons when standardized values change.
7. **Creativity Isolation & Security:** Visual/audio enhancements in `web/` must not alter headless output. Never commit `.env`, API keys, or tokens.

## Skills
- `.agents/skills/verify-phase/SKILL.md`: Standard verification & proof-generation workflow to run before tagging any phase.
