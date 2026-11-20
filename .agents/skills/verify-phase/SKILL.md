---
name: verify-phase
description: Run compile checks, unit/contract/regression tests, determinism diff, and full-night headless performance benchmark before tagging a phase.
---

# Verify Phase Skill

Use this skill before committing or tagging any phase (`phase-1` .. `phase-4`).

## Steps
1. **Syntax / Build Check:**
   ```bash
   python3 -m compileall -q src
   ```
2. **Full Unit, Contract & Regression Test Suite:**
   ```bash
   python3 -m unittest discover -s tests -v
   ```
   All tests must pass. Never skip or silence a failing test; if a contract rule changed, update the test with a clear comment referencing the ticket.
3. **Determinism Verification:**
   Run `src/headless.py` twice with identical `--seed`, `--night`, `--ticks` and verify the two JSONL files have identical SHA-256 hashes.
4. **Full-Night Performance Check (Contract v1.1):**
   Run Night 3 for 21,600 ticks and verify wall-clock execution time is `<= 30.0 s`.
5. **Record Real Evidence:**
   Save unedited command outputs and JSONL artifacts into `docs/proof/phase-N/` and update the traceability table in `docs/proof/phase-N/README.md`.
