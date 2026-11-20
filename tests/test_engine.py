"""Unit, Contract v1.1, Phase 1 Regression, and Phase 2 Feature Tests for Đảo Đèn Lồng."""

from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.core.engine import GameEngine, InputState, load_contract, xz_dist  # noqa: E402


class TestPhase1RegressionStandardized(unittest.TestCase):
    """Phase 1 regression tests updated for Ticket-02 standardized tuning (Contract v1.1)."""

    def setUp(self) -> None:
        self.contract = load_contract(REPO_ROOT / "game.contract.json")
        self.tuning = self.contract["tuning"]

    def test_contract_v1_1_schema(self) -> None:
        self.assertEqual(self.contract["contract_version"], "1.1")
        for key in ("dash_speed", "dash_duration_s", "dash_cooldown_s", "night2_duration_s", "night3_duration_s"):
            self.assertIn(key, self.tuning)
        self.assertEqual(self.tuning["player_speed"], 6.0)
        self.assertEqual(self.tuning["carry_capacity"], 10)
        self.assertEqual(self.tuning["lantern_cost"], 10)
        self.assertEqual(self.tuning["pulse_cost"], 3)
        self.assertEqual(self.tuning["pulse_radius"], 5.0)
        self.assertTrue(self.tuning["fall_enabled"])

    def test_movement_yaw_and_normalization(self) -> None:
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario={"random_motes": False, "random_shades": False})
        for _ in range(60):
            engine.step(InputState(move=[0.0, 1.0], cam_yaw_deg=0.0))
        self.assertAlmostEqual(engine.player_pos[0], 0.0, places=3)
        self.assertAlmostEqual(engine.player_pos[2], 6.0, places=3)

        engine2 = GameEngine(seed=1, night=1, tuning=self.tuning, scenario={"random_motes": False, "random_shades": False})
        for _ in range(60):
            engine2.step(InputState(move=[1.0, 1.0], cam_yaw_deg=0.0))
        self.assertAlmostEqual(math.hypot(engine2.player_pos[0], engine2.player_pos[2]), 6.0, places=3)

        engine3 = GameEngine(seed=1, night=1, tuning=self.tuning, scenario={"random_motes": False, "random_shades": False})
        for _ in range(60):
            engine3.step(InputState(move=[0.0, 1.0], cam_yaw_deg=90.0))
        self.assertAlmostEqual(engine3.player_pos[0], 6.0, places=3)
        self.assertAlmostEqual(engine3.player_pos[2], 0.0, places=3)

    def test_jump_physics_and_rising_edge(self) -> None:
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario={"random_motes": False, "random_shades": False})
        engine.step(InputState(jump=True))
        self.assertGreater(engine.player_pos[1], 0.0)
        for _ in range(120):
            engine.step(InputState(jump=True))
        self.assertAlmostEqual(engine.player_pos[1], 0.0, places=3)
        self.assertTrue(engine.grounded)

    def test_mote_pickup_and_capacity_10(self) -> None:
        # Ticket-02: carry_capacity=10, pickup_radius=1.0, score awarded on deposit (not pickup)
        motes = [[0, 0, 0.5] for _ in range(12)]
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario={"random_motes": False, "random_shades": False, "motes": motes})
        events = engine.step(InputState())
        picked = [e for e in events if e["name"] == "mote_picked"]
        self.assertEqual(len(picked), 10)
        self.assertEqual(engine.player_carried, 10)
        self.assertEqual(len(engine.motes), 2)
        self.assertEqual(engine.score, 0)

    def test_deposit_light_lantern_and_win_standardized_score(self) -> None:
        # Ticket-02: lantern_cost=10, +10 per mote deposited, +100 per lantern lit, +floor(s)*2 + flames*50
        scenario = {
            "player": {"pos": [0, 0, 24], "carried": 10, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "lanterns": [
                {"id": "L1", "pos": [0, 0, 25], "deposited": 0, "lit": False},
                {"id": "L2", "lit": True},
                {"id": "L3", "lit": True},
                {"id": "L4", "lit": True},
                {"id": "L5", "lit": True},
            ],
            "time_left_s": 100,
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        events = engine.step(InputState(interact=True))
        self.assertEqual([e["name"] for e in events], ["deposit", "lantern_lit", "game_over"])
        self.assertEqual(engine.state, "won")
        # 10*10 (deposited) + 100 (lit) + 99*2 (time) + 3*50 (flames) = 548
        self.assertEqual(engine.score, 548)

    def test_pulse_3d_stun_120_and_push_4m_over_15_ticks(self) -> None:
        # Ticket-02: pulse_cost=3, radius=5m 3D, stun=120 ticks, push=4m over 15 ticks, +5 score
        scenario = {
            "player": {"pos": [0, 0, 0], "carried": 4, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "shades": [{"id": "S1", "pos": [3.0, 0.0, 0.0], "state": "chase"}],
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        events = engine.step(InputState(pulse=True))
        self.assertEqual([e["name"] for e in events], ["pulse"])
        self.assertEqual(events[0]["data"]["stunned_ids"], ["S1"])
        self.assertEqual(engine.player_carried, 1)
        self.assertEqual(engine.score, 5)
        self.assertEqual(engine.shades[0].state, "stunned")
        # Run 14 more ticks to finish 15-tick push (total 4.0m push -> x = 7.0)
        for _ in range(14):
            engine.step(InputState())
        self.assertAlmostEqual(engine.shades[0].pos[0], 7.0, places=2)

    def test_safe_radius_blocks_shade(self) -> None:
        scenario = {
            "player": {"pos": [0, 0, 0], "carried": 0, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "lanterns": [{"id": "L1", "pos": [0, 0, 0], "lit": True}],
            "shades": [{"id": "S1", "pos": [9, 0, 0], "state": "chase"}],
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        for _ in range(180):
            engine.step(InputState())
        self.assertGreaterEqual(xz_dist(engine.shades[0].pos, [0, 0, 0]), 6.0 - 1e-3)
        self.assertEqual(engine.player_flames, 3)

    def test_shade_hit_drops_motes_with_ttl_and_recoil(self) -> None:
        scenario = {
            "player": {"pos": [0, 0, 0], "carried": 5, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "shades": [{"id": "S1", "pos": [0.5, 0, 0], "state": "chase"}],
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        events = engine.step(InputState())
        self.assertEqual([e["name"] for e in events], ["player_hit"])
        self.assertEqual(events[0]["data"], {"by": "shade", "flames": 2, "dropped": 2})
        self.assertEqual(engine.player_carried, 3)
        self.assertEqual(engine.shades[0].state, "recoil")
        dropped = [m for m in engine.motes if m.kind == "dropped"]
        self.assertEqual(len(dropped), 2)


class TestPhase2FeaturesAndHeadlessScenarios(unittest.TestCase):
    """Tests & headless scenarios for every new Phase 2 feature (Ticket-02 / Contract v1.1)."""

    def _run_cli(self, args: list[str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(REPO_ROOT / "src" / "headless.py"), *args],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_scenario_dash_and_wind_charm(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "dash_charm.jsonl"
            r = self._run_cli([
                "--seed", "10", "--night", "2",
                "--scenario", str(REPO_ROOT / "tests/scenarios/p2_dash_charm_scenario.json"),
                "--inputs", str(REPO_ROOT / "tests/scenarios/p2_dash_charm_inputs.json"),
                "--ticks", "120", "--out", str(out), "--snapshot-every", "20",
            ])
            self.assertEqual(r.returncode, 0, r.stderr)
            recs = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
            ev_names = [x["name"] for x in recs if x["type"] == "event"]
            self.assertIn("charm_picked", ev_names)
            self.assertGreaterEqual(ev_names.count("dash"), 2)  # zero cooldown with charm!

    def test_scenario_fall_off_island_and_respawn(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "fall.jsonl"
            r = self._run_cli([
                "--seed", "11", "--night", "1",
                "--scenario", str(REPO_ROOT / "tests/scenarios/p2_fall_scenario.json"),
                "--inputs", str(REPO_ROOT / "tests/scenarios/p2_fall_inputs.json"),
                "--ticks", "180", "--out", str(out), "--snapshot-every", "30",
            ])
            self.assertEqual(r.returncode, 0, r.stderr)
            recs = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
            fall_hits = [x for x in recs if x["type"] == "event" and x["name"] == "player_hit" and x["data"]["by"] == "fall"]
            self.assertEqual(len(fall_hits), 1)
            self.assertEqual(fall_hits[0]["data"]["lost"], 4)
            self.assertEqual(fall_hits[0]["data"]["flames"], 2)
            # Final snapshot should have respawned at (0,0,0) with invuln
            snaps = [x for x in recs if x["type"] == "snapshot"]
            self.assertAlmostEqual(snaps[-1]["player"]["pos"][0], 0.0, places=2)
            self.assertAlmostEqual(snaps[-1]["player"]["pos"][1], 0.0, places=2)

    def test_scenario_drifter_steal_and_pulse_drop(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "drifter.jsonl"
            r = self._run_cli([
                "--seed", "12", "--night", "2",
                "--scenario", str(REPO_ROOT / "tests/scenarios/p2_drifter_scenario.json"),
                "--inputs", str(REPO_ROOT / "tests/scenarios/p2_drifter_inputs.json"),
                "--ticks", "60", "--out", str(out), "--snapshot-every", "10",
            ])
            self.assertEqual(r.returncode, 0, r.stderr)
            recs = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
            ev_names = [x["name"] for x in recs if x["type"] == "event"]
            self.assertIn("drifter_steal", ev_names)
            self.assertIn("drifter_drop", ev_names)

    def test_scenario_pause_and_resume(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "pause.jsonl"
            r = self._run_cli([
                "--seed", "13", "--night", "1",
                "--scenario", str(REPO_ROOT / "tests/scenarios/p2_pause_scenario.json"),
                "--inputs", str(REPO_ROOT / "tests/scenarios/p2_pause_inputs.json"),
                "--ticks", "50", "--out", str(out), "--snapshot-every", "10",
            ])
            self.assertEqual(r.returncode, 0, r.stderr)
            recs = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
            ev_names = [x["name"] for x in recs if x["type"] == "event"]
            self.assertIn("paused", ev_names)
            self.assertIn("resumed", ev_names)
            snaps = {x["tick"]: x for x in recs if x["type"] == "snapshot"}
            self.assertEqual(snaps[20]["state"], "paused")
            self.assertLess(snaps[50]["sim_tick"], 50)

    def test_scenario_night2_jump_pad(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "jumppad.jsonl"
            r = self._run_cli([
                "--seed", "14", "--night", "2",
                "--scenario", str(REPO_ROOT / "tests/scenarios/p2_jumppad_scenario.json"),
                "--inputs", str(REPO_ROOT / "tests/scenarios/p2_jumppad_inputs.json"),
                "--ticks", "120", "--out", str(out), "--snapshot-every", "20",
            ])
            self.assertEqual(r.returncode, 0, r.stderr)
            recs = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
            snaps = [x for x in recs if x["type"] == "snapshot"]
            # Should have launched across from Island A (x=20) onto Island B (x > 45)
            self.assertGreater(snaps[-1]["player"]["pos"][0], 45.0)
            self.assertTrue(snaps[-1]["player"]["grounded"])

    def test_scenario_night3_wind_and_full_night_performance(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "night3_full.jsonl"
            t0 = time.perf_counter()
            r = self._run_cli([
                "--seed", "99", "--night", "3",
                "--ticks", "21600", "--out", str(out), "--snapshot-every", "600",
            ])
            elapsed = time.perf_counter() - t0
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertLessEqual(elapsed, 30.0, f"Full Night 3 took {elapsed:.2f}s (> 30s limit)")
            recs = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(recs[0]["night"], 3)
            self.assertIn("wind", recs[0])
            self.assertIn("drifters", recs[0])
            self.assertIn("charms", recs[0])

    def test_determinism_and_exit_code_2(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out1 = Path(td) / "d1.jsonl"
            out2 = Path(td) / "d2.jsonl"
            r1 = self._run_cli(["--seed", "77", "--night", "2", "--ticks", "600", "--out", str(out1)])
            r2 = self._run_cli(["--seed", "77", "--night", "2", "--ticks", "600", "--out", str(out2)])
            self.assertEqual(r1.returncode, 0)
            self.assertEqual(r2.returncode, 0)
            self.assertEqual(out1.read_text(encoding="utf-8"), out2.read_text(encoding="utf-8"))

            bad = Path(td) / "bad.json"
            bad.write_text('{"frames":[{"tick":5},{"tick":5}]}', encoding="utf-8")
            rb = self._run_cli(["--seed", "1", "--night", "1", "--inputs", str(bad), "--ticks", "10", "--out", str(out1)])
            self.assertEqual(rb.returncode, 2)


if __name__ == "__main__":
    unittest.main()
