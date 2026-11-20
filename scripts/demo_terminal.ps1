# One-click terminal verification showcase for Demo Video (Phase 4 / v1.0.0)
Write-Host "`n=== 1. UNIT, CONTRACT v1.3 & REGRESSION TESTS ===" -ForegroundColor Yellow
python -m unittest discover -s tests -v

Write-Host "`n=== 2. HEADLESS MODE (CONTRACT v1.3) ===" -ForegroundColor Yellow
python src/headless.py --seed 33 --night 1 --scenario tests/scenarios/p3_fuel_dawn_scenario.json --inputs tests/scenarios/p3_fuel_dawn_inputs.json --ticks 300 --out docs/proof/phase-4/demo_headless.jsonl --snapshot-every 60
Get-Content docs/proof/phase-4/demo_headless.jsonl | Select-Object -Last 4

Write-Host "`n=== 3. SOAK TEST (10 CONSECUTIVE NIGHTS) ===" -ForegroundColor Yellow
python src/soak.py --seed 7 --nights 10 --out soak.json

Write-Host "`n=== 4. 3D BENCHMARK (1280x720, 200 SHADES, 100 MOTES, 30s) ===" -ForegroundColor Yellow
python src/bench.py --seed 42 --duration 30 --out bench.json

Write-Host "`n=== 5. AI HARNESS & GIT HISTORY ===" -ForegroundColor Yellow
Get-ChildItem AGENTS.md, .agents/skills/verify-phase/SKILL.md, .github/workflows/ci.yml
git tag --list
git log -n 8 --oneline
Write-Host "`n=== DEMO VERIFICATION COMPLETE ===" -ForegroundColor Green
