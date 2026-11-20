# AGENTS.md — Đảo Đèn Lồng (AI SDLC Harness — Phase 3 / Contract v1.2)

## Project Overview
3D third-person game **Đảo Đèn Lồng** spanning 3 Nights (Đảo Bến 240s, Đảo Cau 270s, Đảo Chuông 300s):
- `src/core/maps.py`: Standard map geometry, terrain heights, ramps, jump pads, obstacles, and spawn points for Nights 1–3.
- `src/core/engine.py`: Pure Python 3 standard-library deterministic simulation engine (60 ticks/sec, zero external deps, Contract v1.2 — integer 1/60 lantern fuel, Shade drain AI, dawn survival win condition, progressive capacity).
- `src/headless.py`: Headless CLI supporting `--night 1|2|3` and **Test Contract v1.2**.
- `src/play.py` + `web/`: Three.js 3D renderer with 3-Night campaign, lantern fuel bars & 1 Hz low-fuel blink, torn/squashed unlit lanterns, colorblind mode, pause/settings menu, minimap, and Web Audio.

## Essential Commands
- Build / syntax check: `python3 -m compileall -q src`
- Run all unit, contract & regression tests: `python3 -m unittest discover -s tests -v`
- Run headless smoke test (Night 1/2/3): `python3 src/headless.py --seed 42 --night 1 --ticks 600 --out /tmp/out.jsonl`
- Play 3D game: `python3 src/play.py`

## Non-Negotiable Rules (Phase 3 — Contract v1.2)
1. **Single Source of Truth:** All tuning constants MUST match `game.contract.json` (Contract v1.2). Never diverge between `engine.py` and `web/game.js`.
2. **Integer 1/60 Fuel Math:** Store lantern fuel as integer `fuel_60` (`0..6000`, decay `1`/tick, drain `5`/tick/shade, `10` fuel per mote = `600`) to avoid float drift; round to 1 decimal only at snapshot/event output.
3. **Exact Tick Order:** Pause → Timers + Fuel Decay/Drain → Lantern Out (`fuel <= 0`) → Move/Fall → Pickup → Interact (Light/Relight/Refuel) → Safe Zones → Pulse (`+15` if draining else `+5`) → Move Enemies (Shade `drain` AI) → Collisions (Drifter then Shade by ascending id) → Spawns → Win/Lose (`no_flames` before `dawn_survived`/`dawn`; NO early `all_lit` win) → Snapshot.
4. **Exact Shade State Names:** Only use `spawning`, `wander`, `chase`, `recoil`, `stunned`, `drain`.
5. **Strict Determinism & Performance:** Use `self.rng = random.Random(seed)` only; full Night MUST finish in `<= 30s`.
6. **Transparent Test Updates:** Never skip failing tests silently. When a change request replaces a rule, update/replace legacy tests with explicit ticket references and document breaking changes in `CHANGELOG.md` and ADR.
7. **Creativity Isolation & Security:** Visual/audio/accessibility enhancements in `web/` must not alter headless output. Never commit `.env`, API keys, or tokens.

## Skills
- `.agents/skills/verify-phase/SKILL.md`: Standard verification & proof-generation workflow to run before tagging any phase.
