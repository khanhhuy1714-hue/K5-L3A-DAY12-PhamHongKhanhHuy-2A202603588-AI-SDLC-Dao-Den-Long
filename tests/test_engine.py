"""Unit, Contract v1.2, Phase 1–2 Regression, and Phase 3 ("Đèn cạn dầu") Tests."""

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


class TestPhase1And2RegressionV12(unittest.TestCase):
    """Non-replaced Phase 1–2 behaviors verified under Contract v1.2 (Ticket-03)."""

    def setUp(self) -> None:
        self.contract = load_contract(REPO_ROOT / "game.contract.json")
        self.tuning = self.contract["tuning"]

    def test_contract_v1_2_schema(self) -> None:
        self.assertEqual(self.contract["contract_version"], "1.2")
        for key in (
            "fuel_max", "fuel_decay_per_s", "fuel_per_mote", "relight_cost",
            "win_ratio", "drain_per_s", "low_fuel_threshold", "capacity_max",
        ):
            self.assertIn(key, self.tuning)
        self.assertEqual(self.tuning["night1_duration_s"], 240)
        self.assertEqual(self.tuning["night2_duration_s"], 270)
        self.assertEqual(self.tuning["night3_duration_s"], 300)

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

    def test_mote_pickup_and_initial_capacity_10(self) -> None:
        motes = [[0, 0, 0.5] for _ in range(12)]
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario={"random_motes": False, "random_shades": False, "motes": motes})
        events = engine.step(InputState())
        picked = [e for e in events if e["name"] == "mote_picked"]
        self.assertEqual(len(picked), 10)
        self.assertEqual(engine.player_carried, 10)
        self.assertEqual(engine.carry_capacity, 10)
        self.assertEqual(engine.score, 0)

    def test_first_light_does_not_end_night_early_ticket03(self) -> None:
        # REPLACED from Phase 1/2: Ticket-03 removes early `all_lit` win; lighting all 5 lanterns keeps playing until dawn.
        # New scoring (Ticket-03): +5 per mote deposited, +100 first light.
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
        self.assertEqual([e["name"] for e in events], ["deposit", "lantern_lit"])
        self.assertEqual(events[1]["data"], {"lantern_id": "L1", "relight": False})
        self.assertEqual(engine.state, "playing")
        # 10 * 5 (deposit) + 100 (first light) = 150
        self.assertEqual(engine.score, 150)
        self.assertEqual(engine.carry_capacity, 12)  # 10 + 2*1

    def test_pulse_3d_stun_and_push_normal_shade(self) -> None:
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
        self.assertEqual(engine.score, 5)
        for _ in range(14):
            engine.step(InputState())
        self.assertAlmostEqual(engine.shades[0].pos[0], 7.0, places=2)

    def test_safe_radius_blocks_shade_when_fuel_ge_30(self) -> None:
        scenario = {
            "player": {"pos": [0, 0, 0], "carried": 0, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "lanterns": [{"id": "L1", "pos": [0, 0, 0], "lit": True, "fuel": 80}],
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
        self.assertEqual(engine.shades[0].state, "recoil")


class TestPhase3LanternFuelAndDawnSurvival(unittest.TestCase):
    """Dedicated unit tests for every Ticket-03 / Contract v1.2 rule."""

    def setUp(self) -> None:
        self.tuning = load_contract(REPO_ROOT / "game.contract.json")["tuning"]

    def test_fuel_decay_refuel_and_full_lantern_not_selected(self) -> None:
        scenario = {
            "player": {"pos": [0, 0, 24], "carried": 5, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 100}],
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        # Step 60 ticks => decays 1.0 fuel -> 99.0
        for _ in range(60):
            engine.step(InputState())
        self.assertEqual(engine.lanterns[0].fuel_60, 5940)  # 99.0 exact
        # Press interact: ceil((100 - 98.983)/10) = 1 mote used -> fuel 100.0, +5 score
        evs = engine.step(InputState(interact=True))
        refuel_evs = [e for e in evs if e["name"] == "refuel"]
        self.assertEqual(len(refuel_evs), 1)
        self.assertEqual(refuel_evs[0]["data"], {"lantern_id": "L1", "amount": 1, "fuel": 100.0})
        self.assertEqual(engine.player_carried, 4)
        self.assertEqual(engine.score, 5)

        # Release interact, then immediately refuel on full lantern: at fuel=100 (after decay 99.983) -> check exact full case at tick 0
        eng_full = GameEngine(
            seed=1, night=1, tuning=self.tuning,
            scenario={
                "player": {"pos": [0, 0, 24], "carried": 5, "flames": 3},
                "random_motes": False, "random_shades": False,
                "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 100}],
            },
        )
        # Note: Step 2 decays fuel from 6000 to 5999 before Step 5 interact; verify if fuel_60 == 6000 it won't select
        eng_full.lanterns[0].fuel_60 = 6001  # so after -1 decay in Step 2 it is exactly 6000 (full)
        evs_full = eng_full.step(InputState(interact=True))
        self.assertEqual([e for e in evs_full if e["name"] == "refuel"], [])
        self.assertEqual(eng_full.player_carried, 5)

    def test_lantern_out_relight_5_motes_and_progressive_capacity(self) -> None:
        scenario = {
            "player": {"pos": [0, 0, 24], "carried": 8, "flames": 3, "successful_lights": 4},
            "random_motes": False,
            "random_shades": False,
            "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 0.1}],
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        self.assertEqual(engine.carry_capacity, 18)  # 10 + 2*4
        out_ev = None
        for _ in range(10):
            evs = engine.step(InputState())
            for e in evs:
                if e["name"] == "lantern_out":
                    out_ev = e
            if out_ev:
                break
        self.assertIsNotNone(out_ev)
        self.assertEqual(out_ev["data"], {"lantern_id": "L1"})
        self.assertFalse(engine.lanterns[0].lit)
        self.assertTrue(engine.lanterns[0].ever_lit)
        self.assertEqual(engine.snapshot()["lanterns"][0]["fuel"], 0.0)

        # Relight costs only 5 motes, awards 5*5 + 40 = 65 score, sets relight=True, caps capacity at 20
        evs2 = engine.step(InputState(interact=True))
        self.assertEqual([e["name"] for e in evs2], ["deposit", "lantern_lit"])
        self.assertEqual(evs2[0]["data"]["amount"], 5)
        self.assertEqual(evs2[1]["data"], {"lantern_id": "L1", "relight": True})
        self.assertEqual(engine.score, 65)
        self.assertEqual(engine.lanterns[0].relit_count, 1)
        self.assertEqual(engine.carry_capacity, 20)

    def test_shade_drain_ai_fuel_drain_event_and_pulse_15_bonus(self) -> None:
        scenario = {
            "player": {"pos": [0, 0, -20], "carried": 5, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 25}],
            "shades": [{"id": "S1", "pos": [0, 0, 21.5], "state": "wander"}],
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        drain_events = []
        entered_drain = False
        for _ in range(120):
            evs = engine.step(InputState())
            if engine.shades[0].state == "drain":
                entered_drain = True
            drain_events.extend(e for e in evs if e["name"] == "fuel_drain")
        self.assertTrue(entered_drain)
        self.assertGreaterEqual(len(drain_events), 1)
        self.assertEqual(drain_events[0]["data"]["lantern_id"], "L1")
        self.assertEqual(drain_events[0]["data"]["shade_id"], "S1")

        # Move player close (<= 5m 3D) and pulse while shade is draining -> +15 total score!
        engine.player_pos = [0.0, 0.0, 24.0]
        engine.shades[0].state = "drain"
        engine.shades[0].target_lantern_id = "L1"
        evs_pulse = engine.step(InputState(pulse=True))
        pulse_ev = [e for e in evs_pulse if e["name"] == "pulse"]
        self.assertEqual(len(pulse_ev), 1)
        self.assertEqual(pulse_ev[0]["data"]["stunned_ids"], ["S1"])
        self.assertEqual(engine.score, 15)
        self.assertEqual(engine.shades[0].state, "stunned")

    def test_refuel_above_30_restores_safe_zone_and_pushes_draining_shade(self) -> None:
        scenario = {
            "player": {"pos": [0, 0, 24], "carried": 2, "flames": 3},
            "random_motes": False,
            "random_shades": False,
            "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 25}],
            "shades": [{"id": "S1", "pos": [0, 0, 23.5], "state": "drain", "target_lantern_id": "L1"}],
        }
        engine = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=scenario)
        # Refuel +20 -> fuel ~45 (>= 30) -> shade exits drain & is pushed to 6m edge within 30 ticks
        engine.step(InputState(interact=True))
        self.assertEqual(engine.shades[0].state, "wander")
        for _ in range(30):
            engine.step(InputState())
        self.assertGreaterEqual(xz_dist(engine.shades[0].pos, [0, 0, 25]), 6.0 - 0.05)

    def test_dawn_survived_win_dawn_lose_and_no_flames_priority(self) -> None:
        # 1. Dawn survived (3/5 lit on Night 1) -> won + bonus (50 + floor(fuel)) per lit lantern + 50 * flames
        s_win = {
            "player": {"pos": [0, 0, 0], "carried": 0, "flames": 2},
            "random_motes": False, "random_shades": False,
            "lanterns": [
                {"id": "L1", "lit": True, "fuel": 50.5},
                {"id": "L2", "lit": True, "fuel": 40.5},
                {"id": "L3", "lit": True, "fuel": 30.5},
            ],
            "time_left_s": 0.05,  # 3 ticks
        }
        e_win = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=s_win)
        last_ev = []
        for _ in range(5):
            last_ev = e_win.step(InputState())
            if e_win.state != "playing":
                break
        self.assertEqual(e_win.state, "won")
        self.assertEqual(last_ev[-1]["data"], {"result": "won", "reason": "dawn_survived"})
        # Each lantern decayed 3/60=0.05 -> fuels 50.45, 40.45, 30.45 -> floors 50, 40, 30 -> bonus=(50+50)+(50+40)+(50+30)+2*50 = 370
        self.assertEqual(e_win.score, 370)

        # 2. Dawn failed (only 2/5 lit on Night 1) -> lost / dawn
        s_lose = {
            "player": {"pos": [0, 0, 0], "carried": 0, "flames": 3},
            "random_motes": False, "random_shades": False,
            "lanterns": [
                {"id": "L1", "lit": True, "fuel": 80},
                {"id": "L2", "lit": True, "fuel": 80},
            ],
            "time_left_s": 0.05,
        }
        e_lose = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=s_lose)
        for _ in range(5):
            last_ev = e_lose.step(InputState())
            if e_lose.state != "playing":
                break
        self.assertEqual(e_lose.state, "lost")
        self.assertEqual(last_ev[-1]["data"], {"result": "lost", "reason": "dawn"})

        # 3. Last-tick death takes priority over dawn_survived -> lost / no_flames
        s_dead = {
            "player": {"pos": [0, 0, 0], "carried": 0, "flames": 1},
            "random_motes": False, "random_shades": False,
            "lanterns": [
                {"id": "L1", "lit": True, "fuel": 80},
                {"id": "L2", "lit": True, "fuel": 80},
                {"id": "L3", "lit": True, "fuel": 80},
            ],
            "shades": [{"id": "S1", "pos": [0.5, 0, 0], "state": "chase"}],
            "time_left_s": 1.0 / 60.0,
        }
        e_dead = GameEngine(seed=1, night=1, tuning=self.tuning, scenario=s_dead)
        evs_dead = e_dead.step(InputState())
        self.assertEqual(e_dead.state, "lost")
        self.assertEqual(evs_dead[-1]["data"], {"result": "lost", "reason": "no_flames"})


class TestHeadlessScenariosV12(unittest.TestCase):
    """End-to-end headless CLI tests for Phase 2 + Phase 3 scenarios & performance."""

    def _run_cli(self, args: list[str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(REPO_ROOT / "src" / "headless.py"), *args],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_p3_headless_fuel_relight_and_dawn_survived(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "p3_dawn.jsonl"
            r = self._run_cli([
                "--seed", "33", "--night", "1",
                "--scenario", str(REPO_ROOT / "tests/scenarios/p3_fuel_dawn_scenario.json"),
                "--inputs", str(REPO_ROOT / "tests/scenarios/p3_fuel_dawn_inputs.json"),
                "--ticks", "300", "--out", str(out), "--snapshot-every", "30",
            ])
            self.assertEqual(r.returncode, 0, r.stderr)
            recs = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
            snap0 = recs[0]
            self.assertIn("capacity", snap0["player"])
            self.assertIn("fuel", snap0["lanterns"][0])
            self.assertIn("ever_lit", snap0["lanterns"][0])
            self.assertIn("relit_count", snap0["lanterns"][0])
            ev_names = [x["name"] for x in recs if x["type"] == "event"]
            self.assertIn("lantern_out", ev_names)
            self.assertIn("lantern_lit", ev_names)
            self.assertEqual(recs[-1]["type"], "end")
            self.assertEqual(recs[-1]["state"], "won")

    def test_p2_dash_charm_regression(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "dash.jsonl"
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
            self.assertGreaterEqual(ev_names.count("dash"), 2)

    def test_p2_fall_drifter_pause_jumppad_regressions(self) -> None:
        cases = [
            ("1", "p2_fall_scenario.json", "p2_fall_inputs.json", "180"),
            ("2", "p2_drifter_scenario.json", "p2_drifter_inputs.json", "60"),
            ("1", "p2_pause_scenario.json", "p2_pause_inputs.json", "50"),
            ("2", "p2_jumppad_scenario.json", "p2_jumppad_inputs.json", "120"),
        ]
        with tempfile.TemporaryDirectory() as td:
            for idx, (night, sc, inp, ticks) in enumerate(cases):
                out = Path(td) / f"reg_{idx}.jsonl"
                r = self._run_cli([
                    "--seed", "15", "--night", night,
                    "--scenario", str(REPO_ROOT / "tests/scenarios" / sc),
                    "--inputs", str(REPO_ROOT / "tests/scenarios" / inp),
                    "--ticks", ticks, "--out", str(out), "--snapshot-every", "20",
                ])
                self.assertEqual(r.returncode, 0, f"Case {sc} failed: {r.stderr}")

    def test_full_night3_performance_and_determinism(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out1 = Path(td) / "n3_1.jsonl"
            out2 = Path(td) / "n3_2.jsonl"
            t0 = time.perf_counter()
            r1 = self._run_cli(["--seed", "99", "--night", "3", "--ticks", "18000", "--out", str(out1), "--snapshot-every", "600"])
            elapsed = time.perf_counter() - t0
            r2 = self._run_cli(["--seed", "99", "--night", "3", "--ticks", "18000", "--out", str(out2), "--snapshot-every", "600"])
            self.assertEqual(r1.returncode, 0, r1.stderr)
            self.assertEqual(r2.returncode, 0, r2.stderr)
            self.assertLessEqual(elapsed, 30.0)
            self.assertEqual(out1.read_text(encoding="utf-8"), out2.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
