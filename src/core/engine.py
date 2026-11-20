"""Pure deterministic simulation engine for Đảo Đèn Lồng (Phase 3, Contract v1.2).

Zero external dependencies (Python 3 standard library only).
Runs at a fixed 60 ticks/second (DT = 1/60 s), supporting Nights 1, 2, and 3.
Implements Ticket-03 ("Đèn cạn dầu"): fixed-point 1/60 fuel decay/refuel/relight,
Shade drain state, dawn-survival win condition, and progressive carry capacity.
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.core.maps import get_night_map, ground_height_at, is_blocked_obstacle

TICK_RATE = 60
DT = 1.0 / TICK_RATE
GRAVITY = -20.0
JUMP_VELOCITY = 7.0
FALL_Y_THRESHOLD = -10.0
FALL_RESPAWN_TICKS = 60
CHARM_DURATION_TICKS = 600
CHARM_RESPAWN_TICKS = 2700
CHARM_PLAYER_SPEED = 7.2
DROPPED_MOTE_TTL_TICKS = 480
PULSE_PUSH_TICKS = 15
SHADE_RECOIL_TICKS = 60
SHADE_RECOIL_DIST = 2.0
SHADE_DETECT_RADIUS = 12.0
SHADE_LOSE_RADIUS = 18.0
SHADE_DRAIN_RADIUS = 2.0
SHADE_DRAIN_AGGRO_RADIUS = 6.0
SAFE_PUSH_TICKS = 30
DRIFTER_IDLE_SPEED = 2.0
DRIFTER_SPEED = 7.0
DRIFTER_DETECT_RADIUS = 15.0
DRIFTER_STEAL_RADIUS = 1.2
DRIFTER_FLEE_TICKS = 240
DRIFTER_PULSE_FLEE_TICKS = 120
WIND_INTERVAL_TICKS = 1800  # 30s
WIND_DURATION_TICKS = 300   # 5s
WIND_SPEED = 2.0
EPS = 1e-9

# Fixed-point fuel units (1 unit = 1/60 fuel) to eliminate floating-point drift
FUEL_SCALE = 60

VALID_SHADE_STATES = {"spawning", "wander", "chase", "recoil", "stunned", "drain"}
VALID_DRIFTER_STATES = {"idle", "chase", "flee", "removed"}


class ContractValidationError(ValueError):
    """Raised when scenario or inputs JSON violates Test Contract v1.2."""


def r3(value: float) -> float:
    rounded = round(float(value), 3)
    return 0.0 if rounded == 0.0 else rounded


def r1(value: float) -> float:
    rounded = round(float(value), 1)
    return 0.0 if rounded == 0.0 else rounded


def xz_dist(a: List[float], b: List[float]) -> float:
    return math.hypot(a[0] - b[0], a[2] - b[2])


def dist_3d(a: List[float], b: List[float]) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


def load_contract(contract_path: Optional[Path] = None) -> Dict[str, Any]:
    if contract_path is None:
        contract_path = Path(__file__).resolve().parents[2] / "game.contract.json"
    with contract_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _validate_vec3(val: Any, field_name: str) -> List[float]:
    if not isinstance(val, list) or len(val) != 3:
        raise ContractValidationError(f"'{field_name}' must be a 3-element array [x, y, z]")
    out: List[float] = []
    for item in val:
        if isinstance(item, bool) or not isinstance(item, (int, float)):
            raise ContractValidationError(f"'{field_name}' elements must be numbers")
        out.append(float(item))
    return out


def validate_inputs_data(data: Any) -> List[Dict[str, Any]]:
    if not isinstance(data, dict):
        raise ContractValidationError("Inputs file must be a JSON object")
    if "frames" not in data or not isinstance(data["frames"], list):
        raise ContractValidationError("Inputs JSON must contain a 'frames' array")

    frames = data["frames"]
    prev_tick = -1
    validated: List[Dict[str, Any]] = []
    for idx, frame in enumerate(frames):
        if not isinstance(frame, dict):
            raise ContractValidationError(f"Frame {idx} must be a JSON object")
        if "tick" not in frame or isinstance(frame["tick"], bool) or not isinstance(frame["tick"], int):
            raise ContractValidationError(f"Frame {idx} missing integer 'tick'")
        tick = frame["tick"]
        if tick < 0 or tick <= prev_tick:
            raise ContractValidationError(
                f"Frame ticks must be non-negative and strictly increasing (got {tick} after {prev_tick})"
            )
        prev_tick = tick

        clean: Dict[str, Any] = {"tick": tick}
        if "move" in frame:
            mv = frame["move"]
            if not isinstance(mv, list) or len(mv) != 2:
                raise ContractValidationError(f"Frame {idx} 'move' must be [x, z]")
            for c in mv:
                if isinstance(c, bool) or not isinstance(c, (int, float)):
                    raise ContractValidationError(f"Frame {idx} 'move' components must be numbers")
                if c < -1.0 - EPS or c > 1.0 + EPS:
                    raise ContractValidationError(f"Frame {idx} 'move' components must be in [-1, 1]")
            clean["move"] = [float(mv[0]), float(mv[1])]

        if "cam_yaw_deg" in frame:
            yaw = frame["cam_yaw_deg"]
            if isinstance(yaw, bool) or not isinstance(yaw, (int, float)):
                raise ContractValidationError(f"Frame {idx} 'cam_yaw_deg' must be a number")
            clean["cam_yaw_deg"] = float(yaw)

        for btn in ("jump", "interact", "pulse", "dash", "pause"):
            if btn in frame:
                if not isinstance(frame[btn], bool):
                    raise ContractValidationError(f"Frame {idx} '{btn}' must be a boolean")
                clean[btn] = frame[btn]

        validated.append(clean)

    return validated


def validate_scenario_data(data: Any) -> Dict[str, Any]:
    if not isinstance(data, dict):
        raise ContractValidationError("Scenario file must be a JSON object")

    if "player" in data:
        p = data["player"]
        if not isinstance(p, dict):
            raise ContractValidationError("'player' must be an object")
        if "pos" in p:
            _validate_vec3(p["pos"], "player.pos")
        for key in ("carried", "flames", "invuln_ticks", "dash_cd_ticks", "pulse_cd_ticks", "charm_ticks", "successful_lights"):
            if key in p and (isinstance(p[key], bool) or not isinstance(p[key], int) or p[key] < 0):
                raise ContractValidationError(f"'player.{key}' must be a non-negative integer")

    for bkey in ("random_motes", "random_shades", "random_drifters", "wind_enabled"):
        if bkey in data and not isinstance(data[bkey], bool):
            raise ContractValidationError(f"'{bkey}' must be a boolean")

    if "motes" in data:
        if not isinstance(data["motes"], list):
            raise ContractValidationError("'motes' must be a list")
        for idx, m in enumerate(data["motes"]):
            if isinstance(m, list):
                _validate_vec3(m, f"motes[{idx}]")
            elif isinstance(m, dict) and "pos" in m:
                _validate_vec3(m["pos"], f"motes[{idx}].pos")
            else:
                raise ContractValidationError(f"motes[{idx}] must be [x,y,z] or {{'pos':[x,y,z]}}")

    if "shades" in data:
        if not isinstance(data["shades"], list):
            raise ContractValidationError("'shades' must be a list")
        for idx, s in enumerate(data["shades"]):
            if not isinstance(s, dict) or "pos" not in s:
                raise ContractValidationError(f"shades[{idx}] must be an object with 'pos'")
            _validate_vec3(s["pos"], f"shades[{idx}].pos")
            if "id" in s and not isinstance(s["id"], str):
                raise ContractValidationError(f"shades[{idx}].id must be a string")
            if "state" in s and s["state"] not in VALID_SHADE_STATES:
                raise ContractValidationError(f"shades[{idx}].state invalid: {s['state']}")
            if "state_ticks_left" in s and (
                isinstance(s["state_ticks_left"], bool) or not isinstance(s["state_ticks_left"], int) or s["state_ticks_left"] < 0
            ):
                raise ContractValidationError(f"shades[{idx}].state_ticks_left must be a non-negative integer")
            if "target_lantern_id" in s and s["target_lantern_id"] is not None and not isinstance(s["target_lantern_id"], str):
                raise ContractValidationError(f"shades[{idx}].target_lantern_id must be a string or null")

    if "drifters" in data:
        if not isinstance(data["drifters"], list):
            raise ContractValidationError("'drifters' must be a list")
        for idx, d in enumerate(data["drifters"]):
            if not isinstance(d, dict) or "pos" not in d:
                raise ContractValidationError(f"drifters[{idx}] must be an object with 'pos'")
            _validate_vec3(d["pos"], f"drifters[{idx}].pos")
            if "state" in d and d["state"] not in VALID_DRIFTER_STATES:
                raise ContractValidationError(f"drifters[{idx}].state invalid: {d['state']}")

    if "charms" in data:
        if not isinstance(data["charms"], list):
            raise ContractValidationError("'charms' must be a list")
        for idx, c in enumerate(data["charms"]):
            if not isinstance(c, dict) or "id" not in c:
                raise ContractValidationError(f"charms[{idx}] must be an object with 'id'")
            if "pos" in c:
                _validate_vec3(c["pos"], f"charms[{idx}].pos")

    if "lanterns" in data:
        if not isinstance(data["lanterns"], list):
            raise ContractValidationError("'lanterns' must be a list")
        for idx, l in enumerate(data["lanterns"]):
            if not isinstance(l, dict) or "id" not in l or not isinstance(l["id"], str):
                raise ContractValidationError(f"lanterns[{idx}] must be an object with string 'id'")
            if "pos" in l:
                _validate_vec3(l["pos"], f"lanterns[{idx}].pos")
            if "deposited" in l and (isinstance(l["deposited"], bool) or not isinstance(l["deposited"], int) or l["deposited"] < 0):
                raise ContractValidationError(f"lanterns[{idx}].deposited must be a non-negative integer")
            if "lit" in l and not isinstance(l["lit"], bool):
                raise ContractValidationError(f"lanterns[{idx}].lit must be a boolean")
            if "ever_lit" in l and not isinstance(l["ever_lit"], bool):
                raise ContractValidationError(f"lanterns[{idx}].ever_lit must be a boolean")
            if "fuel" in l and (isinstance(l["fuel"], bool) or not isinstance(l["fuel"], (int, float)) or l["fuel"] < 0):
                raise ContractValidationError(f"lanterns[{idx}].fuel must be a non-negative number")

    if "time_left_s" in data:
        t = data["time_left_s"]
        if isinstance(t, bool) or not isinstance(t, (int, float)) or t < 0:
            raise ContractValidationError("'time_left_s' must be a non-negative number")

    return data


@dataclass
class Lantern:
    id: str
    pos: List[float]
    lit: bool = False
    deposited: int = 0
    fuel_60: int = 0  # integer 1/60 fuel units (0..6000)
    ever_lit: bool = False
    relit_count: int = 0


@dataclass
class Mote:
    id: str
    pos: List[float]
    kind: str = "random"  # "random" | "dropped"
    ttl_ticks: Optional[int] = None
    spawn_tick: int = -1


@dataclass
class Shade:
    id: str
    pos: List[float]
    state: str = "wander"
    state_ticks_left: int = 0
    push_ticks_left: int = 0
    push_dir: Tuple[float, float] = (1.0, 0.0)
    recoil_dir: Tuple[float, float] = (1.0, 0.0)
    safe_push_ticks: int = 0
    safe_push_target: Optional[Tuple[float, float]] = None
    target_lantern_id: Optional[str] = None
    drain_ticks: int = 0
    wander_angle: float = 0.0
    spawn_tick: int = -1


@dataclass
class Drifter:
    id: str
    pos: List[float]
    state: str = "idle"
    stolen: int = 0
    has_stolen: bool = False
    flee_ticks_left: int = 0
    flee_dir: Tuple[float, float] = (1.0, 0.0)
    idle_angle: float = 0.0
    spawn_tick: int = -1


@dataclass
class Charm:
    id: str
    pos: List[float]
    available: bool = True
    respawn_ticks: int = 0


@dataclass
class InputState:
    move: List[float] = field(default_factory=lambda: [0.0, 0.0])
    cam_yaw_deg: float = 0.0
    jump: bool = False
    interact: bool = False
    pulse: bool = False
    dash: bool = False
    pause: bool = False


class GameEngine:
    """Deterministic simulation engine for Đảo Đèn Lồng (Contract v1.2)."""

    def __init__(
        self,
        seed: int,
        night: int = 1,
        tuning: Optional[Dict[str, Any]] = None,
        scenario: Optional[Dict[str, Any]] = None,
    ) -> None:
        if tuning is None:
            tuning = load_contract()["tuning"]
        self.tuning = tuning
        self.night = night
        self.night_map = get_night_map(night)
        self.rng = random.Random(seed)

        # Standardized tuning parameters (Contract v1.2)
        self.player_speed: float = float(tuning["player_speed"])
        self.dash_speed: float = float(tuning.get("dash_speed", 14.0))
        self.dash_duration_ticks: int = max(1, round(float(tuning.get("dash_duration_s", 0.2)) * TICK_RATE))
        self.dash_cooldown_ticks: int = round(float(tuning.get("dash_cooldown_s", 1.5)) * TICK_RATE)
        self.base_capacity: int = int(tuning["carry_capacity"])
        self.capacity_max: int = int(tuning.get("capacity_max", 20))
        self.lantern_cost: int = int(tuning["lantern_cost"])
        self.relight_cost: int = int(tuning.get("relight_cost", 5))
        self.fuel_max: int = int(tuning.get("fuel_max", 100))
        self.fuel_max_60: int = self.fuel_max * FUEL_SCALE
        self.fuel_decay_per_tick_60: int = max(1, round(float(tuning.get("fuel_decay_per_s", 1.0))))
        self.fuel_per_mote_60: int = int(tuning.get("fuel_per_mote", 10)) * FUEL_SCALE
        self.low_fuel_threshold_60: int = int(tuning.get("low_fuel_threshold", 30)) * FUEL_SCALE
        self.drain_per_tick_60: int = max(1, round(float(tuning.get("drain_per_s", 5))))
        self.win_ratio: float = float(tuning.get("win_ratio", 0.6))

        self.pickup_radius: float = float(tuning["pickup_radius"])
        self.interact_radius: float = float(tuning["interact_radius"])
        self.pulse_cost: int = int(tuning["pulse_cost"])
        self.pulse_radius: float = float(tuning["pulse_radius"])
        self.max_flames: int = int(tuning["flames"])
        self.invuln_duration_ticks: int = round(float(tuning["invuln_s"]) * TICK_RATE)
        self.hit_drop_ratio: float = float(tuning["hit_drop_ratio"])
        self.pulse_stun_ticks: int = round(float(tuning["pulse_stun_s"]) * TICK_RATE)
        self.pulse_push_m: float = float(tuning["pulse_push_m"])
        self.pulse_cooldown_ticks: int = round(float(tuning["pulse_cooldown_s"]) * TICK_RATE)
        self.safe_radius: float = float(tuning["safe_radius"])
        self.shade_speed: float = self.night_map.shade_speed
        self.shade_hit_radius: float = float(tuning["shade_hit_radius"])
        self.fall_enabled: bool = bool(tuning.get("fall_enabled", True))
        self.score_cfg: Dict[str, int] = {k: int(v) for k, v in tuning["score"].items()}

        # Simulation state
        self.tick: int = 0
        self.sim_tick: int = 0
        self.state: str = "playing"
        self.initial_time_left_s: float = self.night_map.duration_s
        self.time_left_s: float = self.initial_time_left_s
        self.score: int = 0

        # Player state
        sx, sy, sz = self.night_map.spawn_pos
        self.player_pos: List[float] = [sx, sy, sz]
        self.player_vel: List[float] = [0.0, 0.0, 0.0]
        self.player_facing: Tuple[float, float] = (0.0, 1.0)
        self.grounded: bool = True
        self.player_flames: int = self.max_flames
        self.player_carried: int = 0
        self.successful_lights: int = 0
        self.invuln_ticks: int = 0
        self.dash_cd_ticks: int = 0
        self.dash_ticks_left: int = 0
        self.dash_dir: Tuple[float, float] = (0.0, 1.0)
        self.pulse_cd_ticks: int = 0
        self.charm_ticks: int = 0
        self.fall_wait_ticks: int = 0
        self.launch_locked: bool = False

        # Wind state (Night 3)
        self.wind_enabled: bool = self.night_map.has_wind
        self.wind_active: bool = False
        self.wind_dir_deg: float = 0.0
        self._wind_ticks_left: int = 0

        # Entities
        self.lanterns: List[Lantern] = [
            Lantern(id=lid, pos=[pos[0], pos[1], pos[2]], lit=False, deposited=0, fuel_60=0, ever_lit=False, relit_count=0)
            for lid, pos in self.night_map.lanterns
        ]
        self.motes: List[Mote] = []
        self.shades: List[Shade] = []
        self.drifters: List[Drifter] = []
        self.charms: List[Charm] = [
            Charm(id=c.id, pos=[c.pos[0], c.pos[1], c.pos[2]], available=True, respawn_ticks=0)
            for c in self.night_map.charm_spawns
        ]

        self._next_mote_num: int = 1
        self._next_shade_num: int = 1
        self._next_drifter_num: int = 1
        self._used_shade_ids: set[str] = set()
        self._used_drifter_ids: set[str] = set()

        # Spawning toggles
        self.random_motes: bool = True
        self.random_shades: bool = True
        self.random_drifters: bool = self.night_map.has_drifters

        self._prev_input = InputState()
        self._setup_initial_world(scenario)

    @property
    def carry_capacity(self) -> int:
        return min(self.capacity_max, self.base_capacity + 2 * self.successful_lights)

    def _lantern_by_id(self, lid: Optional[str]) -> Optional[Lantern]:
        if lid is None:
            return None
        for l in self.lanterns:
            if l.id == lid:
                return l
        return None

    def _has_safe_zone(self, l: Lantern) -> bool:
        return l.lit and l.fuel_60 >= self.low_fuel_threshold_60

    def _alloc_mote_id(self) -> str:
        mid = f"M{self._next_mote_num}"
        self._next_mote_num += 1
        return mid

    def _alloc_shade_id(self) -> str:
        while f"S{self._next_shade_num}" in self._used_shade_ids:
            self._next_shade_num += 1
        sid = f"S{self._next_shade_num}"
        self._next_shade_num += 1
        self._used_shade_ids.add(sid)
        return sid

    def _alloc_drifter_id(self) -> str:
        while f"D{self._next_drifter_num}" in self._used_drifter_ids:
            self._next_drifter_num += 1
        did = f"D{self._next_drifter_num}"
        self._next_drifter_num += 1
        self._used_drifter_ids.add(did)
        return did

    def _free_mote_points(self) -> List[Tuple[float, float, float]]:
        free: List[Tuple[float, float, float]] = []
        for pt in self.night_map.mote_points:
            occupied = any(
                math.hypot(m.pos[0] - pt[0], m.pos[2] - pt[2]) < 0.5 and abs(m.pos[1] - pt[1]) < 0.5
                for m in self.motes
            )
            if not occupied:
                free.append(pt)
        return free

    def _spawn_initial_motes(self, count: int = 20) -> None:
        pts = list(self.night_map.mote_points)
        self.rng.shuffle(pts)
        for pt in pts[:count]:
            self.motes.append(Mote(id=self._alloc_mote_id(), pos=[pt[0], pt[1], pt[2]], kind="random", spawn_tick=-1))

    def _spawn_one_random_mote(self) -> Optional[Mote]:
        free = self._free_mote_points()
        if not free:
            return None
        pt = self.rng.choice(free)
        m = Mote(id=self._alloc_mote_id(), pos=[pt[0], pt[1], pt[2]], kind="random", spawn_tick=self.sim_tick)
        self.motes.append(m)
        return m

    def _valid_shade_spawn_points(self) -> List[Tuple[float, float, float]]:
        valid: List[Tuple[float, float, float]] = []
        for pt in self.night_map.shade_points:
            pt_list = [pt[0], pt[1], pt[2]]
            if xz_dist(pt_list, self.player_pos) < 15.0 - EPS:
                continue
            if any(self._has_safe_zone(l) and xz_dist(pt_list, l.pos) < self.safe_radius + 0.5 for l in self.lanterns):
                continue
            valid.append(pt)
        return valid

    def _spawn_one_shade(self) -> Optional[Shade]:
        valid = self._valid_shade_spawn_points()
        if not valid:
            return None
        pt = self.rng.choice(valid)
        s = Shade(
            id=self._alloc_shade_id(),
            pos=[pt[0], pt[1], pt[2]],
            state="wander",
            state_ticks_left=0,
            wander_angle=self.rng.uniform(0.0, 2.0 * math.pi),
            spawn_tick=self.sim_tick,
        )
        self.shades.append(s)
        return s

    def _spawn_one_drifter(self) -> Optional[Drifter]:
        pts = self.night_map.shade_points
        if not pts:
            return None
        pt = self.rng.choice(pts)
        d = Drifter(
            id=self._alloc_drifter_id(),
            pos=[pt[0], pt[1] + 1.2, pt[2]],
            state="idle",
            stolen=0,
            idle_angle=self.rng.uniform(0.0, 2.0 * math.pi),
            spawn_tick=self.sim_tick,
        )
        self.drifters.append(d)
        return d

    def _setup_initial_world(self, scenario: Optional[Dict[str, Any]]) -> None:
        if scenario is not None:
            validate_scenario_data(scenario)
            if "time_left_s" in scenario:
                self.initial_time_left_s = float(scenario["time_left_s"])
                self.time_left_s = self.initial_time_left_s
            if "random_motes" in scenario:
                self.random_motes = bool(scenario["random_motes"])
            if "random_shades" in scenario:
                self.random_shades = bool(scenario["random_shades"])
            if "random_drifters" in scenario:
                self.random_drifters = bool(scenario["random_drifters"])
            if "wind_enabled" in scenario:
                self.wind_enabled = bool(scenario["wind_enabled"])

            if "player" in scenario:
                p = scenario["player"]
                if "pos" in p:
                    self.player_pos = [float(p["pos"][0]), float(p["pos"][1]), float(p["pos"][2])]
                if "carried" in p:
                    self.player_carried = int(p["carried"])
                if "flames" in p:
                    self.player_flames = int(p["flames"])
                if "invuln_ticks" in p:
                    self.invuln_ticks = int(p["invuln_ticks"])
                if "dash_cd_ticks" in p:
                    self.dash_cd_ticks = int(p["dash_cd_ticks"])
                if "pulse_cd_ticks" in p:
                    self.pulse_cd_ticks = int(p["pulse_cd_ticks"])
                if "charm_ticks" in p:
                    self.charm_ticks = int(p["charm_ticks"])
                if "successful_lights" in p:
                    self.successful_lights = int(p["successful_lights"])

            if "lanterns" in scenario:
                by_id = {l.id: l for l in self.lanterns}
                for lcfg in scenario["lanterns"]:
                    lid = lcfg["id"]
                    if lid in by_id:
                        target = by_id[lid]
                        if "pos" in lcfg:
                            target.pos = [float(lcfg["pos"][0]), float(lcfg["pos"][1]), float(lcfg["pos"][2])]
                        if "deposited" in lcfg:
                            target.deposited = int(lcfg["deposited"])
                        if "ever_lit" in lcfg:
                            target.ever_lit = bool(lcfg["ever_lit"])
                        if "lit" in lcfg:
                            target.lit = bool(lcfg["lit"])
                            if target.lit:
                                target.ever_lit = True
                                if "fuel" in lcfg:
                                    target.fuel_60 = min(self.fuel_max_60, max(0, round(float(lcfg["fuel"]) * FUEL_SCALE)))
                                else:
                                    target.fuel_60 = self.fuel_max_60
                            else:
                                target.fuel_60 = 0
                        elif "fuel" in lcfg:
                            f60 = min(self.fuel_max_60, max(0, round(float(lcfg["fuel"]) * FUEL_SCALE)))
                            if f60 > 0:
                                target.lit = True
                                target.ever_lit = True
                                target.fuel_60 = f60
                        elif target.deposited >= (self.relight_cost if target.ever_lit else self.lantern_cost):
                            target.lit = True
                            target.ever_lit = True
                            target.fuel_60 = self.fuel_max_60

            if "motes" in scenario:
                for mcfg in scenario["motes"]:
                    if isinstance(mcfg, list):
                        pos = [float(mcfg[0]), float(mcfg[1]), float(mcfg[2])]
                        mid = self._alloc_mote_id()
                        kind = "random"
                        ttl = None
                    else:
                        pos = [float(mcfg["pos"][0]), float(mcfg["pos"][1]), float(mcfg["pos"][2])]
                        mid = str(mcfg.get("id") or self._alloc_mote_id())
                        kind = str(mcfg.get("kind", "random"))
                        ttl = int(mcfg["ttl_ticks"]) if "ttl_ticks" in mcfg else (
                            DROPPED_MOTE_TTL_TICKS if kind == "dropped" else None
                        )
                    self.motes.append(Mote(id=mid, pos=pos, kind=kind, ttl_ticks=ttl, spawn_tick=-1))
            elif self.random_motes:
                self._spawn_initial_motes(20)

            if "shades" in scenario:
                for scfg in scenario["shades"]:
                    pos = [float(scfg["pos"][0]), float(scfg["pos"][1]), float(scfg["pos"][2])]
                    if "id" in scfg:
                        sid = str(scfg["id"])
                        self._used_shade_ids.add(sid)
                    else:
                        sid = self._alloc_shade_id()
                    default_state = "chase" if xz_dist(pos, self.player_pos) <= SHADE_DETECT_RADIUS + EPS else "wander"
                    st = str(scfg.get("state", default_state))
                    st_ticks = int(scfg.get("state_ticks_left", 0))
                    tgt_lid = scfg.get("target_lantern_id", None)
                    self.shades.append(
                        Shade(
                            id=sid,
                            pos=pos,
                            state=st,
                            state_ticks_left=st_ticks,
                            target_lantern_id=tgt_lid,
                            wander_angle=self.rng.uniform(0.0, 2.0 * math.pi),
                            spawn_tick=-1,
                        )
                    )

            if "drifters" in scenario:
                self.drifters = []
                for dcfg in scenario["drifters"]:
                    pos = [float(dcfg["pos"][0]), float(dcfg["pos"][1]), float(dcfg["pos"][2])]
                    if "id" in dcfg:
                        did = str(dcfg["id"])
                        self._used_drifter_ids.add(did)
                    else:
                        did = self._alloc_drifter_id()
                    st = str(dcfg.get("state", "idle"))
                    stolen = int(dcfg.get("stolen", 0))
                    self.drifters.append(
                        Drifter(
                            id=did,
                            pos=pos,
                            state=st,
                            stolen=stolen,
                            has_stolen=stolen > 0,
                            flee_ticks_left=int(dcfg.get("flee_ticks_left", DRIFTER_FLEE_TICKS if st == "flee" else 0)),
                            idle_angle=self.rng.uniform(0.0, 2.0 * math.pi),
                            spawn_tick=-1,
                        )
                    )

            if "charms" in scenario:
                self.charms = []
                for ccfg in scenario["charms"]:
                    cid = str(ccfg["id"])
                    pos = [float(ccfg["pos"][0]), float(ccfg["pos"][1]), float(ccfg["pos"][2])] if "pos" in ccfg else [0.0, 0.0, 0.0]
                    avail = bool(ccfg.get("available", True))
                    rticks = int(ccfg.get("respawn_ticks", round(float(ccfg.get("respawn_s", 0.0)) * TICK_RATE)))
                    self.charms.append(Charm(id=cid, pos=pos, available=avail, respawn_ticks=rticks))
        else:
            self._spawn_initial_motes(20)

        gy = ground_height_at(self.night, self.player_pos[0], self.player_pos[2])
        self.grounded = gy is not None and abs(self.player_pos[1] - gy) <= 0.05

    def _trigger_safe_push_around_lantern(self, lantern: Lantern) -> None:
        """Push shades inside safe_radius of lantern outward over <= 30 ticks."""
        for s in self.shades:
            if s.state == "drain" and s.target_lantern_id == lantern.id:
                s.state = "wander"
                s.target_lantern_id = None
                s.drain_ticks = 0
            d_l = xz_dist(s.pos, lantern.pos)
            if d_l < self.safe_radius - EPS:
                dx = s.pos[0] - lantern.pos[0]
                dz = s.pos[2] - lantern.pos[2]
                nx, nz = (1.0, 0.0) if d_l <= EPS else (dx / d_l, dz / d_l)
                s.safe_push_ticks = SAFE_PUSH_TICKS
                s.safe_push_target = (
                    lantern.pos[0] + nx * self.safe_radius,
                    lantern.pos[2] + nz * self.safe_radius,
                )

    def _keep_shade_outside_safe_lanterns(self, pos: List[float]) -> None:
        for l in self.lanterns:
            if not self._has_safe_zone(l):
                continue
            dx = pos[0] - l.pos[0]
            dz = pos[2] - l.pos[2]
            d = math.hypot(dx, dz)
            if d < self.safe_radius - EPS:
                nx, nz = (1.0, 0.0) if d <= EPS else (dx / d, dz / d)
                pos[0] = l.pos[0] + nx * self.safe_radius
                pos[2] = l.pos[2] + nz * self.safe_radius

    def _clamp_entity_to_walkable(self, old_pos: List[float], new_x: float, new_z: float) -> Tuple[float, float, bool]:
        if is_blocked_obstacle(self.night, new_x, old_pos[1], new_z):
            return old_pos[0], old_pos[2], True
        gy = ground_height_at(self.night, new_x, new_z)
        if gy is None:
            return old_pos[0], old_pos[2], True
        return new_x, new_z, False

    def snapshot(self) -> Dict[str, Any]:
        return {
            "type": "snapshot",
            "tick": self.tick,
            "sim_tick": self.sim_tick,
            "night": self.night,
            "state": self.state,
            "time_left_s": r3(max(0.0, self.time_left_s)),
            "score": self.score,
            "wind": {
                "active": self.wind_active,
                "dir_deg": r3(self.wind_dir_deg),
            },
            "player": {
                "pos": [r3(self.player_pos[0]), r3(self.player_pos[1]), r3(self.player_pos[2])],
                "vel": [r3(self.player_vel[0]), r3(self.player_vel[1]), r3(self.player_vel[2])],
                "grounded": self.grounded,
                "flames": self.player_flames,
                "carried": self.player_carried,
                "capacity": self.carry_capacity,
                "invuln": self.invuln_ticks > 0,
                "dash_cd_s": r3(self.dash_cd_ticks / float(TICK_RATE)),
                "pulse_cd_s": r3(self.pulse_cd_ticks / float(TICK_RATE)),
                "charm_s": r3(self.charm_ticks / float(TICK_RATE)),
            },
            "lanterns": [
                {
                    "id": l.id,
                    "pos": [r3(l.pos[0]), r3(l.pos[1]), r3(l.pos[2])],
                    "lit": l.lit,
                    "deposited": l.deposited,
                    "fuel": r1(l.fuel_60 / float(FUEL_SCALE)) if l.lit else 0.0,
                    "ever_lit": l.ever_lit,
                    "relit_count": l.relit_count,
                }
                for l in self.lanterns
            ],
            "shades": [
                {
                    "id": s.id,
                    "pos": [r3(s.pos[0]), r3(s.pos[1]), r3(s.pos[2])],
                    "state": s.state,
                }
                for s in self.shades
            ],
            "motes_active": len(self.motes),
            "motes": [
                {
                    "id": m.id,
                    "pos": [r3(m.pos[0]), r3(m.pos[1]), r3(m.pos[2])],
                    "kind": m.kind,
                    "ttl_s": r3(m.ttl_ticks / float(TICK_RATE)) if m.ttl_ticks is not None else None,
                }
                for m in self.motes
            ],
            "drifters": [
                {
                    "id": d.id,
                    "pos": [r3(d.pos[0]), r3(d.pos[1]), r3(d.pos[2])],
                    "state": d.state,
                    "stolen": d.stolen,
                }
                for d in self.drifters
                if d.state != "removed"
            ],
            "charms": [
                {
                    "id": c.id,
                    "available": c.available,
                    "respawn_s": r3(c.respawn_ticks / float(TICK_RATE)),
                }
                for c in self.charms
            ],
        }

    def step(self, inp: InputState) -> List[Dict[str, Any]]:
        """Advance simulation by 1 tick following Ticket-02/03 exact step order."""
        if self.state in ("won", "lost"):
            return []

        events: List[Dict[str, Any]] = []
        self.tick += 1

        # Step 1: Read input & handle pause first
        jump_pressed = inp.jump and not self._prev_input.jump
        interact_pressed = inp.interact and not self._prev_input.interact
        pulse_pressed = inp.pulse and not self._prev_input.pulse
        dash_pressed = inp.dash and not self._prev_input.dash
        pause_pressed = inp.pause and not self._prev_input.pause

        self._prev_input = InputState(
            move=[inp.move[0], inp.move[1]],
            cam_yaw_deg=inp.cam_yaw_deg,
            jump=inp.jump,
            interact=inp.interact,
            pulse=inp.pulse,
            dash=inp.dash,
            pause=inp.pause,
        )

        if pause_pressed:
            if self.state == "playing":
                self.state = "paused"
                events.append({"type": "event", "tick": self.tick, "name": "paused", "data": {}})
                return events
            if self.state == "paused":
                self.state = "playing"
                events.append({"type": "event", "tick": self.tick, "name": "resumed", "data": {}})

        if self.state == "paused":
            return events

        # Active gameplay tick
        self.sim_tick += 1
        self.time_left_s = self.initial_time_left_s - (self.sim_tick / float(TICK_RATE))

        # Step 2: Decrement timers + lantern fuel decay & shade drain
        if self.invuln_ticks > 0:
            self.invuln_ticks -= 1
        if self.dash_cd_ticks > 0:
            self.dash_cd_ticks -= 1
        if self.pulse_cd_ticks > 0:
            self.pulse_cd_ticks -= 1
        if self.charm_ticks > 0:
            self.charm_ticks -= 1

        # Dropped motes TTL
        kept_motes: List[Mote] = []
        for m in self.motes:
            if m.ttl_ticks is not None:
                m.ttl_ticks -= 1
                if m.ttl_ticks <= 0:
                    continue
            kept_motes.append(m)
        self.motes = kept_motes

        # Charm respawns
        for c in self.charms:
            if not c.available and c.respawn_ticks > 0:
                c.respawn_ticks -= 1
                if c.respawn_ticks == 0:
                    c.available = True

        # Shade state timers
        for s in self.shades:
            if s.state_ticks_left > 0:
                s.state_ticks_left -= 1
                if s.state_ticks_left == 0 and s.state in ("spawning", "stunned", "recoil"):
                    s.state = "wander"
                    s.push_ticks_left = 0

        # Drifter flee timers
        for d in self.drifters:
            if d.state == "flee" and d.flee_ticks_left > 0:
                d.flee_ticks_left -= 1
                if d.flee_ticks_left == 0:
                    d.state = "removed"

        # Wind (Night 3)
        if self.wind_enabled:
            if self._wind_ticks_left > 0:
                self._wind_ticks_left -= 1
                if self._wind_ticks_left == 0:
                    self.wind_active = False
            elif self.sim_tick > 0 and self.sim_tick % WIND_INTERVAL_TICKS == 0:
                self.wind_active = True
                self.wind_dir_deg = self.rng.uniform(0.0, 360.0)
                self._wind_ticks_left = WIND_DURATION_TICKS

        # Step 2b (Ticket-03): Lantern fuel decay (1/60) + active shade drain (5/60 each)
        draining_by_lantern: Dict[str, List[Shade]] = {}
        for s in sorted(self.shades, key=lambda x: x.id):
            if s.state == "drain" and s.target_lantern_id is not None:
                draining_by_lantern.setdefault(s.target_lantern_id, []).append(s)

        for l in self.lanterns:
            if not l.lit:
                continue
            drainers = draining_by_lantern.get(l.id, [])
            l.fuel_60 -= self.fuel_decay_per_tick_60 + self.drain_per_tick_60 * len(drainers)
            for s in drainers:
                s.drain_ticks += 1
                if s.drain_ticks % 60 == 0:
                    events.append({
                        "type": "event",
                        "tick": self.tick,
                        "name": "fuel_drain",
                        "data": {
                            "lantern_id": l.id,
                            "shade_id": s.id,
                            "fuel": r1(max(0, l.fuel_60) / float(FUEL_SCALE)),
                        },
                    })
            if l.fuel_60 <= 0:
                l.lit = False
                l.fuel_60 = 0
                l.deposited = 0
                l.ever_lit = True
                events.append({
                    "type": "event",
                    "tick": self.tick,
                    "name": "lantern_out",
                    "data": {"lantern_id": l.id},
                })
                for s in drainers:
                    s.state = "wander"
                    s.target_lantern_id = None
                    s.drain_ticks = 0

        # Step 3: Move Mây (jump, dash, jump pads, wind) then check fall off island
        if self.fall_wait_ticks > 0:
            self.fall_wait_ticks -= 1
            self.player_vel = [0.0, 0.0, 0.0]
            if self.fall_wait_ticks == 0:
                sx, sy, sz = self.night_map.spawn_pos
                self.player_pos = [sx, sy, sz]
                self.player_vel = [0.0, 0.0, 0.0]
                self.grounded = True
                self.launch_locked = False
                self.invuln_ticks = self.invuln_duration_ticks
        else:
            mx, mz = inp.move[0], inp.move[1]
            mag = math.hypot(mx, mz)
            if mag > 1.0:
                mx /= mag
                mz /= mag

            theta = math.radians(inp.cam_yaw_deg)
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)
            wx = mx * cos_t + mz * sin_t
            wz = -mx * sin_t + mz * cos_t
            wmag = math.hypot(wx, wz)
            if wmag > EPS:
                self.player_facing = (wx / wmag, wz / wmag)

            can_dash = self.dash_ticks_left == 0 and (self.charm_ticks > 0 or self.dash_cd_ticks == 0)
            if dash_pressed and can_dash:
                self.dash_ticks_left = self.dash_duration_ticks
                self.dash_cd_ticks = 0 if self.charm_ticks > 0 else self.dash_cooldown_ticks
                self.dash_dir = (wx / wmag, wz / wmag) if wmag > EPS else self.player_facing
                self.launch_locked = False
                events.append({"type": "event", "tick": self.tick, "name": "dash", "data": {}})

            if self.dash_ticks_left > 0:
                self.player_vel[0] = self.dash_dir[0] * self.dash_speed
                self.player_vel[1] = 0.0
                self.player_vel[2] = self.dash_dir[1] * self.dash_speed
                self.dash_ticks_left -= 1
            else:
                if not self.launch_locked:
                    move_speed = CHARM_PLAYER_SPEED if self.charm_ticks > 0 else self.player_speed
                    self.player_vel[0] = wx * move_speed
                    self.player_vel[2] = wz * move_speed

                if jump_pressed and self.grounded:
                    self.player_vel[1] = JUMP_VELOCITY
                    self.grounded = False

                if not self.grounded:
                    self.player_vel[1] += GRAVITY * DT

            wind_vx = 0.0
            wind_vz = 0.0
            if self.wind_active:
                wrad = math.radians(self.wind_dir_deg)
                wind_vx = math.cos(wrad) * WIND_SPEED
                wind_vz = math.sin(wrad) * WIND_SPEED

            old_x, old_y, old_z = self.player_pos[0], self.player_pos[1], self.player_pos[2]
            cand_x = old_x + (self.player_vel[0] + wind_vx) * DT
            cand_z = old_z + (self.player_vel[2] + wind_vz) * DT
            cand_y = old_y + self.player_vel[1] * DT

            target_gy = ground_height_at(self.night, cand_x, cand_z)
            blocked_xz = is_blocked_obstacle(self.night, cand_x, old_y, cand_z)
            if not blocked_xz and target_gy is not None and old_y < target_gy - 0.4:
                blocked_xz = True

            if blocked_xz:
                cand_x, cand_z = old_x, old_z
                target_gy = ground_height_at(self.night, cand_x, cand_z)

            if target_gy is not None and cand_y <= target_gy and old_y >= target_gy - 0.4 and self.player_vel[1] <= 0.0:
                cand_y = target_gy
                self.player_vel[1] = 0.0
                self.grounded = True
                self.launch_locked = False
            else:
                if target_gy is not None and self.grounded and abs(cand_y - target_gy) <= 0.4:
                    cand_y = target_gy
                    self.player_vel[1] = 0.0
                    self.grounded = True
                else:
                    self.grounded = False

            self.player_pos = [cand_x, cand_y, cand_z]

            if self.dash_ticks_left == 0:
                for pad in self.night_map.jump_pads:
                    if (
                        math.hypot(self.player_pos[0] - pad.pos[0], self.player_pos[2] - pad.pos[2]) <= pad.radius + EPS
                        and abs(self.player_pos[1] - pad.pos[1]) <= 0.5
                    ):
                        self.player_vel[0] = pad.target_dir[0] * pad.horiz_speed
                        self.player_vel[1] = pad.vel_y
                        self.player_vel[2] = pad.target_dir[1] * pad.horiz_speed
                        self.grounded = False
                        self.launch_locked = True
                        break

            if self.fall_enabled and self.player_pos[1] < FALL_Y_THRESHOLD:
                self.player_flames = max(0, self.player_flames - 1)
                lost = self.player_carried
                self.player_carried = 0
                self.player_vel = [0.0, 0.0, 0.0]
                self.launch_locked = False
                self.dash_ticks_left = 0
                events.append({
                    "type": "event",
                    "tick": self.tick,
                    "name": "player_hit",
                    "data": {
                        "by": "fall",
                        "flames": self.player_flames,
                        "dropped": 0,
                        "lost": lost,
                    },
                })
                if self.player_flames > 0:
                    self.fall_wait_ticks = FALL_RESPAWN_TICKS

        # Step 4: Pick up motes and charms (respecting dynamic carry_capacity)
        if self.fall_wait_ticks == 0 and self.player_flames > 0:
            remaining_motes: List[Mote] = []
            for m in self.motes:
                if (
                    self.player_carried < self.carry_capacity
                    and m.spawn_tick < self.sim_tick
                    and xz_dist(self.player_pos, m.pos) <= self.pickup_radius + EPS
                    and abs(self.player_pos[1] - m.pos[1]) <= 1.5 + EPS
                ):
                    self.player_carried += 1
                    events.append({
                        "type": "event",
                        "tick": self.tick,
                        "name": "mote_picked",
                        "data": {"carried": self.player_carried},
                    })
                else:
                    remaining_motes.append(m)
            self.motes = remaining_motes

            for c in self.charms:
                if (
                    c.available
                    and xz_dist(self.player_pos, c.pos) <= self.pickup_radius + EPS
                    and abs(self.player_pos[1] - c.pos[1]) <= 1.5 + EPS
                ):
                    c.available = False
                    c.respawn_ticks = CHARM_RESPAWN_TICKS
                    self.charm_ticks = CHARM_DURATION_TICKS
                    self.dash_cd_ticks = 0
                    events.append({
                        "type": "event",
                        "tick": self.tick,
                        "name": "charm_picked",
                        "data": {"charm_id": c.id, "charm_ticks": CHARM_DURATION_TICKS},
                    })

        # Step 5: Interact with lantern (unlit OR lit with fuel < 100; nearest, tie-break smallest id)
        if self.fall_wait_ticks == 0 and self.player_flames > 0 and interact_pressed and self.player_carried > 0:
            candidates = []
            for l in self.lanterns:
                if xz_dist(self.player_pos, l.pos) > self.interact_radius + EPS:
                    continue
                if not l.lit:
                    candidates.append((xz_dist(self.player_pos, l.pos), l.id, l))
                elif l.fuel_60 < self.fuel_max_60:
                    candidates.append((xz_dist(self.player_pos, l.pos), l.id, l))

            if candidates:
                candidates.sort(key=lambda item: (item[0], item[1]))
                target_l = candidates[0][2]
                if not target_l.lit:
                    cost = self.relight_cost if target_l.ever_lit else self.lantern_cost
                    needed = max(0, cost - target_l.deposited)
                    amount = min(self.player_carried, needed)
                    if amount > 0:
                        self.player_carried -= amount
                        target_l.deposited += amount
                        self.score += amount * self.score_cfg["per_mote"]
                        events.append({
                            "type": "event",
                            "tick": self.tick,
                            "name": "deposit",
                            "data": {
                                "lantern_id": target_l.id,
                                "amount": amount,
                                "deposited": target_l.deposited,
                            },
                        })
                        if target_l.deposited >= cost:
                            is_relight = target_l.ever_lit
                            target_l.lit = True
                            target_l.fuel_60 = self.fuel_max_60
                            target_l.ever_lit = True
                            if is_relight:
                                target_l.relit_count += 1
                                self.score += self.score_cfg.get("per_relight", 40)
                            else:
                                self.score += self.score_cfg["per_lantern"]
                            self.successful_lights += 1
                            events.append({
                                "type": "event",
                                "tick": self.tick,
                                "name": "lantern_lit",
                                "data": {"lantern_id": target_l.id, "relight": is_relight},
                            })
                            self._trigger_safe_push_around_lantern(target_l)
                else:
                    # Refuel lit lantern (used = min(carried, ceil((100 - fuel)/10)))
                    missing_60 = self.fuel_max_60 - target_l.fuel_60
                    needed_motes = (missing_60 + self.fuel_per_mote_60 - 1) // self.fuel_per_mote_60
                    used = min(self.player_carried, needed_motes)
                    if used > 0:
                        was_low = target_l.fuel_60 < self.low_fuel_threshold_60
                        self.player_carried -= used
                        target_l.fuel_60 = min(self.fuel_max_60, target_l.fuel_60 + used * self.fuel_per_mote_60)
                        self.score += used * self.score_cfg["per_mote"]
                        events.append({
                            "type": "event",
                            "tick": self.tick,
                            "name": "refuel",
                            "data": {
                                "lantern_id": target_l.id,
                                "amount": used,
                                "fuel": r1(target_l.fuel_60 / float(FUEL_SCALE)),
                            },
                        })
                        if was_low and target_l.fuel_60 >= self.low_fuel_threshold_60:
                            self._trigger_safe_push_around_lantern(target_l)

        # Step 6: Update safe zones
        for s in self.shades:
            if s.safe_push_ticks > 0 and s.safe_push_target is not None:
                tx, tz = s.safe_push_target
                dx = tx - s.pos[0]
                dz = tz - s.pos[2]
                frac = 1.0 / float(s.safe_push_ticks)
                s.pos[0] += dx * frac
                s.pos[2] += dz * frac
                s.safe_push_ticks -= 1
                if s.safe_push_ticks == 0:
                    s.safe_push_target = None

        # Step 7: Pulse (Tỏa Sáng) — +15 if shade was draining, else +5
        if (
            self.fall_wait_ticks == 0
            and self.player_flames > 0
            and pulse_pressed
            and self.player_carried >= self.pulse_cost
            and self.pulse_cd_ticks == 0
        ):
            self.player_carried -= self.pulse_cost
            self.pulse_cd_ticks = self.pulse_cooldown_ticks
            pulse_center = [self.player_pos[0], self.player_pos[1] + 0.8, self.player_pos[2]]
            stunned_ids: List[str] = []

            for s in sorted(self.shades, key=lambda x: x.id):
                if dist_3d(pulse_center, s.pos) <= self.pulse_radius + EPS:
                    was_draining = s.state == "drain"
                    s.state = "stunned"
                    s.state_ticks_left = self.pulse_stun_ticks
                    s.push_ticks_left = PULSE_PUSH_TICKS
                    s.target_lantern_id = None
                    s.drain_ticks = 0
                    dx = s.pos[0] - self.player_pos[0]
                    dz = s.pos[2] - self.player_pos[2]
                    d_xz = math.hypot(dx, dz)
                    s.push_dir = (1.0, 0.0) if d_xz <= EPS else (dx / d_xz, dz / d_xz)
                    stunned_ids.append(s.id)
                    self.score += self.score_cfg.get("per_stun_drain", 15) if was_draining else self.score_cfg["per_stun"]

            for d in sorted(self.drifters, key=lambda x: x.id):
                if d.state == "removed":
                    continue
                if dist_3d(pulse_center, d.pos) <= self.pulse_radius + EPS:
                    dx = d.pos[0] - self.player_pos[0]
                    dz = d.pos[2] - self.player_pos[2]
                    d_xz = math.hypot(dx, dz)
                    d.flee_dir = (1.0, 0.0) if d_xz <= EPS else (dx / d_xz, dz / d_xz)
                    if d.state == "chase":
                        d.state = "flee"
                        d.flee_ticks_left = DRIFTER_FLEE_TICKS
                    elif d.state == "flee" and d.stolen > 0:
                        dropped_amt = d.stolen
                        d.stolen = 0
                        d.flee_ticks_left = DRIFTER_PULSE_FLEE_TICKS
                        gy = ground_height_at(self.night, d.pos[0], d.pos[2])
                        drop_y = gy if gy is not None else 0.0
                        for _ in range(dropped_amt):
                            self.motes.append(
                                Mote(
                                    id=self._alloc_mote_id(),
                                    pos=[d.pos[0], drop_y, d.pos[2]],
                                    kind="dropped",
                                    ttl_ticks=DROPPED_MOTE_TTL_TICKS,
                                    spawn_tick=self.sim_tick,
                                )
                            )
                        events.append({
                            "type": "event",
                            "tick": self.tick,
                            "name": "drifter_drop",
                            "data": {"drifter_id": d.id, "amount": dropped_amt},
                        })

            events.append({
                "type": "event",
                "tick": self.tick,
                "name": "pulse",
                "data": {"stunned_ids": stunned_ids},
            })

        # Step 8: Move Shades and Drifters (including Shade drain AI)
        for s in self.shades:
            if s.safe_push_ticks > 0:
                continue
            if s.state == "spawning":
                continue
            if s.state == "stunned":
                if s.push_ticks_left > 0:
                    step_push = self.pulse_push_m / float(PULSE_PUSH_TICKS)
                    nx = s.pos[0] + s.push_dir[0] * step_push
                    nz = s.pos[2] + s.push_dir[1] * step_push
                    cx, cz, hit_obs = self._clamp_entity_to_walkable(s.pos, nx, nz)
                    s.pos[0], s.pos[2] = cx, cz
                    if hit_obs:
                        s.push_ticks_left = 0
                    else:
                        s.push_ticks_left -= 1
                    self._keep_shade_outside_safe_lanterns(s.pos)
                continue
            if s.state == "recoil":
                step_rec = SHADE_RECOIL_DIST / float(SHADE_RECOIL_TICKS)
                nx = s.pos[0] + s.recoil_dir[0] * step_rec
                nz = s.pos[2] + s.recoil_dir[1] * step_rec
                cx, cz, _ = self._clamp_entity_to_walkable(s.pos, nx, nz)
                s.pos[0], s.pos[2] = cx, cz
                self._keep_shade_outside_safe_lanterns(s.pos)
                continue

            d_player = xz_dist(s.pos, self.player_pos)

            if s.state == "drain":
                tgt = self._lantern_by_id(s.target_lantern_id)
                if d_player <= SHADE_DRAIN_AGGRO_RADIUS + EPS:
                    s.state = "chase"
                    s.target_lantern_id = None
                    s.drain_ticks = 0
                elif (
                    tgt is None
                    or not tgt.lit
                    or tgt.fuel_60 >= self.low_fuel_threshold_60
                    or xz_dist(s.pos, tgt.pos) > SHADE_DRAIN_RADIUS + EPS
                ):
                    s.state = "wander"
                    s.target_lantern_id = None
                    s.drain_ticks = 0
                else:
                    # Stand still and keep draining
                    continue

            # Detect / lose chase
            if s.state == "wander" and d_player <= SHADE_DETECT_RADIUS + EPS:
                s.state = "chase"
                s.target_lantern_id = None
            elif s.state == "chase" and d_player > SHADE_LOSE_RADIUS + EPS:
                s.state = "wander"

            if s.state == "chase":
                dx = self.player_pos[0] - s.pos[0]
                dz = self.player_pos[2] - s.pos[2]
                d = math.hypot(dx, dz)
                if d > EPS:
                    mv = min(self.shade_speed * DT, d)
                    nx = s.pos[0] + (dx / d) * mv
                    nz = s.pos[2] + (dz / d) * mv
                    cx, cz, _ = self._clamp_entity_to_walkable(s.pos, nx, nz)
                    s.pos[0], s.pos[2] = cx, cz
            else:
                # Wander: seek nearest weak lit lantern (fuel < 30), else nearest unlit lantern
                weak_lanterns = [
                    (xz_dist(s.pos, l.pos), l.id, l)
                    for l in self.lanterns
                    if l.lit and l.fuel_60 < self.low_fuel_threshold_60
                ]
                if weak_lanterns:
                    weak_lanterns.sort(key=lambda item: (item[0], item[1]))
                    tgt_l = weak_lanterns[0][2]
                    d_l = weak_lanterns[0][0]
                    if d_l <= SHADE_DRAIN_RADIUS + EPS:
                        s.state = "drain"
                        s.target_lantern_id = tgt_l.id
                        s.drain_ticks = 0
                    else:
                        mv = min(self.shade_speed * DT, d_l)
                        nx = s.pos[0] + ((tgt_l.pos[0] - s.pos[0]) / d_l) * mv
                        nz = s.pos[2] + ((tgt_l.pos[2] - s.pos[2]) / d_l) * mv
                        cx, cz, _ = self._clamp_entity_to_walkable(s.pos, nx, nz)
                        s.pos[0], s.pos[2] = cx, cz
                        if xz_dist(s.pos, tgt_l.pos) <= SHADE_DRAIN_RADIUS + EPS:
                            s.state = "drain"
                            s.target_lantern_id = tgt_l.id
                            s.drain_ticks = 0
                else:
                    unlit_lanterns = [(xz_dist(s.pos, l.pos), l.id, l) for l in self.lanterns if not l.lit]
                    if unlit_lanterns:
                        unlit_lanterns.sort(key=lambda item: (item[0], item[1]))
                        tgt_l = unlit_lanterns[0][2]
                        d_l = unlit_lanterns[0][0]
                        if d_l > 2.5:
                            mv = min(self.shade_speed * 0.55 * DT, d_l - 2.0)
                            nx = s.pos[0] + ((tgt_l.pos[0] - s.pos[0]) / d_l) * mv
                            nz = s.pos[2] + ((tgt_l.pos[2] - s.pos[2]) / d_l) * mv
                            cx, cz, _ = self._clamp_entity_to_walkable(s.pos, nx, nz)
                            s.pos[0], s.pos[2] = cx, cz
                    else:
                        s.wander_angle += 0.4 * DT
                        mv = (self.shade_speed * 0.45) * DT
                        nx = s.pos[0] + math.cos(s.wander_angle) * mv
                        nz = s.pos[2] + math.sin(s.wander_angle) * mv
                        cx, cz, blocked = self._clamp_entity_to_walkable(s.pos, nx, nz)
                        if blocked:
                            s.wander_angle += math.pi * 0.75
                        else:
                            s.pos[0], s.pos[2] = cx, cz

            self._keep_shade_outside_safe_lanterns(s.pos)
            gy = ground_height_at(self.night, s.pos[0], s.pos[2])
            if gy is not None:
                s.pos[1] = gy

        for d in self.drifters:
            if d.state == "removed":
                continue
            if d.state == "flee":
                d.pos[0] += d.flee_dir[0] * DRIFTER_SPEED * DT
                d.pos[2] += d.flee_dir[1] * DRIFTER_SPEED * DT
                continue

            d_player = xz_dist(d.pos, self.player_pos)
            if d.state == "idle":
                if self.player_carried >= 5 and d_player <= DRIFTER_DETECT_RADIUS + EPS:
                    d.state = "chase"
                else:
                    d.idle_angle += 0.6 * DT
                    d.pos[0] += math.cos(d.idle_angle) * DRIFTER_IDLE_SPEED * DT
                    d.pos[2] += math.sin(d.idle_angle) * DRIFTER_IDLE_SPEED * DT
            elif d.state == "chase":
                if self.player_carried < 5 or d_player > DRIFTER_DETECT_RADIUS + EPS:
                    d.state = "idle"
                else:
                    dx = self.player_pos[0] - d.pos[0]
                    dz = self.player_pos[2] - d.pos[2]
                    dist_p = math.hypot(dx, dz)
                    if dist_p > EPS:
                        mv = min(DRIFTER_SPEED * DT, dist_p)
                        d.pos[0] += (dx / dist_p) * mv
                        d.pos[2] += (dz / dist_p) * mv

        # Step 9: Collisions — Drifters steal first, then Shades hit (ascending id)
        if self.fall_wait_ticks == 0 and self.player_flames > 0:
            for d in sorted(self.drifters, key=lambda x: x.id):
                if d.state != "chase" or d.has_stolen or d.spawn_tick >= self.sim_tick:
                    continue
                if xz_dist(self.player_pos, d.pos) <= DRIFTER_STEAL_RADIUS + EPS:
                    amount = min(3, self.player_carried)
                    self.player_carried -= amount
                    d.stolen = amount
                    d.has_stolen = True
                    d.state = "flee"
                    d.flee_ticks_left = DRIFTER_FLEE_TICKS
                    dx = d.pos[0] - self.player_pos[0]
                    dz = d.pos[2] - self.player_pos[2]
                    d_xz = math.hypot(dx, dz)
                    d.flee_dir = (1.0, 0.0) if d_xz <= EPS else (dx / d_xz, dz / d_xz)
                    events.append({
                        "type": "event",
                        "tick": self.tick,
                        "name": "drifter_steal",
                        "data": {"drifter_id": d.id, "amount": amount, "carried": self.player_carried},
                    })

            if self.invuln_ticks == 0:
                for s in sorted(self.shades, key=lambda x: x.id):
                    if s.state not in ("wander", "chase", "drain") or s.safe_push_ticks > 0 or s.spawn_tick >= self.sim_tick:
                        continue
                    if (
                        xz_dist(self.player_pos, s.pos) <= self.shade_hit_radius + EPS
                        and abs(self.player_pos[1] - s.pos[1]) <= 1.5 + EPS
                    ):
                        self.player_flames = max(0, self.player_flames - 1)
                        self.invuln_ticks = self.invuln_duration_ticks
                        dropped = int(math.floor(self.player_carried * self.hit_drop_ratio))
                        self.player_carried = max(0, self.player_carried - dropped)

                        for _ in range(dropped):
                            ang = self.rng.uniform(0.0, 2.0 * math.pi)
                            rad = self.rng.uniform(1.5, 2.5)
                            mx_pos = self.player_pos[0] + math.cos(ang) * rad
                            mz_pos = self.player_pos[2] + math.sin(ang) * rad
                            gy = ground_height_at(self.night, mx_pos, mz_pos)
                            my_pos = gy if gy is not None else self.player_pos[1]
                            self.motes.append(
                                Mote(
                                    id=self._alloc_mote_id(),
                                    pos=[mx_pos, my_pos, mz_pos],
                                    kind="dropped",
                                    ttl_ticks=DROPPED_MOTE_TTL_TICKS,
                                    spawn_tick=self.sim_tick,
                                )
                            )

                        dx = s.pos[0] - self.player_pos[0]
                        dz = s.pos[2] - self.player_pos[2]
                        d_xz = math.hypot(dx, dz)
                        s.recoil_dir = (1.0, 0.0) if d_xz <= EPS else (dx / d_xz, dz / d_xz)
                        s.state = "recoil"
                        s.state_ticks_left = SHADE_RECOIL_TICKS
                        s.target_lantern_id = None
                        s.drain_ticks = 0

                        events.append({
                            "type": "event",
                            "tick": self.tick,
                            "name": "player_hit",
                            "data": {
                                "by": "shade",
                                "flames": self.player_flames,
                                "dropped": dropped,
                            },
                        })
                        break

        # Step 10: Scheduled spawns (interactable from next tick)
        if self.random_motes and self.sim_tick > 0 and self.sim_tick % 240 == 0:
            if len(self.motes) < 30:
                self._spawn_one_random_mote()

        if self.random_shades:
            if self.sim_tick == 300:
                for _ in range(2):
                    if len(self.shades) < self.night_map.max_shades:
                        s_new = self._spawn_one_shade()
                        if s_new is not None:
                            events.append({"type": "event", "tick": self.tick, "name": "shade_spawned", "data": {"id": s_new.id}})
            elif self.sim_tick > 300 and (self.sim_tick - 300) % self.night_map.shade_interval_ticks == 0:
                if len(self.shades) < self.night_map.max_shades:
                    s_new = self._spawn_one_shade()
                    if s_new is not None:
                        events.append({"type": "event", "tick": self.tick, "name": "shade_spawned", "data": {"id": s_new.id}})

        if self.random_drifters and self.night in (2, 3) and self.sim_tick > 0 and self.sim_tick % 1200 == 0:
            active_drifters = sum(1 for d in self.drifters if d.state != "removed")
            if active_drifters < 2:
                self._spawn_one_drifter()

        # Step 11 (Ticket-03): Check Win / Lose (NO early all_lit win!)
        if self.player_flames <= 0:
            self.state = "lost"
            events.append({
                "type": "event",
                "tick": self.tick,
                "name": "game_over",
                "data": {"result": "lost", "reason": "no_flames"},
            })
        elif self.time_left_s <= EPS:
            self.time_left_s = 0.0
            lit_lanterns = [l for l in self.lanterns if l.lit]
            needed_lit = math.ceil(self.win_ratio * len(self.lanterns))
            if len(lit_lanterns) >= needed_lit:
                lantern_bonus = sum(50 + (l.fuel_60 // FUEL_SCALE) for l in lit_lanterns)
                flame_bonus = self.player_flames * self.score_cfg["per_flame_left"]
                self.score += lantern_bonus + flame_bonus
                self.state = "won"
                events.append({
                    "type": "event",
                    "tick": self.tick,
                    "name": "game_over",
                    "data": {"result": "won", "reason": "dawn_survived"},
                })
            else:
                self.state = "lost"
                events.append({
                    "type": "event",
                    "tick": self.tick,
                    "name": "game_over",
                    "data": {"result": "lost", "reason": "dawn"},
                })

        return events
