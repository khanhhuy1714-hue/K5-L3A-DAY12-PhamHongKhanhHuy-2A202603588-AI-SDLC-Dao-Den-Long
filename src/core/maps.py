"""Standardized map definitions for Nights 1, 2, and 3 (Ticket-02 / Contract v1.1).

Angles are measured counter-clockwise from +X on the XZ plane (looking down from +Y).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Tuple


@dataclass(frozen=True)
class JumpPad:
    pos: Tuple[float, float, float]
    radius: float
    vel_y: float
    horiz_speed: float
    target_dir: Tuple[float, float]  # normalized (dx, dz)


@dataclass(frozen=True)
class CharmSpawn:
    id: str
    pos: Tuple[float, float, float]


@dataclass(frozen=True)
class NightMap:
    night: int
    name: str
    duration_s: float
    spawn_pos: Tuple[float, float, float]
    lanterns: List[Tuple[str, Tuple[float, float, float]]]
    mote_points: List[Tuple[float, float, float]]
    shade_points: List[Tuple[float, float, float]]
    shade_interval_ticks: int
    max_shades: int
    shade_speed: float
    jump_pads: List[JumpPad]
    charm_spawns: List[CharmSpawn]
    has_drifters: bool
    has_wind: bool


def _ring_points(
    cx: float,
    cz: float,
    radius: float,
    angles_deg: List[float],
    y: float = 0.0,
) -> List[Tuple[float, float, float]]:
    pts: List[Tuple[float, float, float]] = []
    for deg in angles_deg:
        rad = math.radians(deg)
        pts.append((round(cx + math.cos(rad) * radius, 3), y, round(cz + math.sin(rad) * radius, 3)))
    return pts


def _build_night1() -> NightMap:
    lanterns = [
        ("L1", (0.0, 0.0, 25.0)),
        ("L2", (23.8, 0.0, 7.7)),
        ("L3", (14.7, 0.0, -20.2)),
        ("L4", (-14.7, 0.0, -20.2)),
        ("L5", (-23.8, 0.0, 7.7)),
    ]
    motes = _ring_points(0.0, 0.0, 12.0, [i * 45.0 for i in range(8)], 0.0)
    motes += _ring_points(0.0, 0.0, 33.0, [i * 22.5 for i in range(16)], 0.0)
    shades = _ring_points(0.0, 0.0, 37.0, [15.0 + i * 30.0 for i in range(12)], 0.0)
    return NightMap(
        night=1,
        name="Đảo Bến",
        duration_s=300.0,
        spawn_pos=(0.0, 0.0, 0.0),
        lanterns=lanterns,
        mote_points=motes,
        shade_points=shades,
        shade_interval_ticks=480,
        max_shades=6,
        shade_speed=4.0,
        jump_pads=[],
        charm_spawns=[],
        has_drifters=False,
        has_wind=False,
    )


def _build_night2() -> NightMap:
    lanterns = [
        ("L1", (0.0, 0.0, 20.0)),
        ("L2", (17.0, 0.0, -10.0)),
        ("L3", (-17.0, 0.0, -10.0)),
        ("L4", (70.0, 0.0, 20.0)),
        ("L5", (87.0, 0.0, -10.0)),
        ("L6", (53.0, 0.0, -10.0)),
    ]
    motes: List[Tuple[float, float, float]] = []
    shades: List[Tuple[float, float, float]] = []
    for cx in (0.0, 70.0):
        motes += _ring_points(cx, 0.0, 10.0, [0.0, 90.0, 180.0, 270.0], 0.0)
        motes += _ring_points(cx, 0.0, 22.0, [i * 45.0 for i in range(8)], 0.0)
        shades += _ring_points(cx, 0.0, 26.0, [22.5 + i * 45.0 for i in range(8)], 0.0)

    # Pad at (20,0,18) -> center B (70,0,0)
    d1 = math.hypot(70.0 - 20.0, 0.0 - 18.0)
    dir1 = ((70.0 - 20.0) / d1, (0.0 - 18.0) / d1)
    # Pad at (50,0,-18) -> center A (0,0,0)
    d2 = math.hypot(0.0 - 50.0, 0.0 - (-18.0))
    dir2 = ((0.0 - 50.0) / d2, (0.0 - (-18.0)) / d2)

    jump_pads = [
        JumpPad(pos=(20.0, 0.0, 18.0), radius=1.0, vel_y=14.0, horiz_speed=24.0, target_dir=dir1),
        JumpPad(pos=(50.0, 0.0, -18.0), radius=1.0, vel_y=14.0, horiz_speed=24.0, target_dir=dir2),
    ]
    charms = [CharmSpawn(id="C1", pos=(35.0, 0.0, 0.0))]

    return NightMap(
        night=2,
        name="Đảo Cau",
        duration_s=330.0,
        spawn_pos=(0.0, 0.0, 0.0),
        lanterns=lanterns,
        mote_points=motes,
        shade_points=shades,
        shade_interval_ticks=420,
        max_shades=8,
        shade_speed=4.0,
        jump_pads=jump_pads,
        charm_spawns=charms,
        has_drifters=True,
        has_wind=False,
    )


def _build_night3() -> NightMap:
    lanterns = [
        ("L1", (0.0, 6.0, 6.0)),
        ("L2", (18.0, 3.0, 10.0)),
        ("L3", (-18.0, 3.0, 10.0)),
        ("L4", (35.0, 0.0, -10.0)),
        ("L5", (-35.0, 0.0, -10.0)),
        ("L6", (20.0, 0.0, -35.0)),
        ("L7", (-20.0, 0.0, -35.0)),
    ]
    motes = _ring_points(0.0, 0.0, 34.0, [i * 20.0 for i in range(18)], 0.0)
    motes += _ring_points(0.0, 0.0, 18.0, [20.0 * (i + 1) for i in range(8)], 3.0)
    motes += _ring_points(0.0, 0.0, 5.0, [45.0, 135.0, 225.0, 315.0], 6.0)
    shades = _ring_points(0.0, 0.0, 43.0, [i * 22.5 for i in range(16)], 0.0)

    jump_pads = [
        JumpPad(pos=(0.0, 3.0, 13.0), radius=1.0, vel_y=12.0, horiz_speed=8.0, target_dir=(0.0, -1.0)),
    ]
    charms = [
        CharmSpawn(id="C1", pos=(30.0, 0.0, 25.0)),
        CharmSpawn(id="C2", pos=(-30.0, 0.0, 25.0)),
    ]

    return NightMap(
        night=3,
        name="Đảo Chuông",
        duration_s=360.0,
        spawn_pos=(0.0, 0.0, 32.0),
        lanterns=lanterns,
        mote_points=motes,
        shade_points=shades,
        shade_interval_ticks=360,
        max_shades=10,
        shade_speed=4.5,
        jump_pads=jump_pads,
        charm_spawns=charms,
        has_drifters=True,
        has_wind=True,
    )


MAPS = {
    1: _build_night1(),
    2: _build_night2(),
    3: _build_night3(),
}


def get_night_map(night: int) -> NightMap:
    if night not in MAPS:
        raise ValueError(f"Unsupported night: {night}")
    return MAPS[night]


def _night3_ramp_height(x: float, z: float) -> Optional[float]:
    """Check if (x, z) lies on either of the 2 straight ramps (width 3m, angles 30° & 150°)."""
    for deg in (30.0, 150.0):
        rad = math.radians(deg)
        ux, uz = math.cos(rad), math.sin(rad)
        along = x * ux + z * uz
        perp = abs(-x * uz + z * ux)
        if 24.0 <= along <= 30.0 and perp <= 1.5:
            return 3.0 * (30.0 - along) / 6.0
    return None


def ground_height_at(night: int, x: float, z: float) -> Optional[float]:
    """Return surface Y at (x, z) or None if over the cloud sea (void)."""
    if night == 1:
        return 0.0 if math.hypot(x, z) <= 40.0 else None

    if night == 2:
        if math.hypot(x, z) <= 28.0:
            return 0.0
        if math.hypot(x - 70.0, z) <= 28.0:
            return 0.0
        if 26.0 <= x <= 44.0 and -2.0 <= z <= 2.0:
            return 0.0
        return None

    if night == 3:
        r = math.hypot(x, z)
        if r > 45.0:
            return None
        if r <= 8.0:
            return 6.0
        if 12.0 <= r <= 24.0 and z > 0.0:
            return 3.0
        ramp_y = _night3_ramp_height(x, z)
        if ramp_y is not None:
            return ramp_y
        return 0.0

    return None


def is_blocked_obstacle(night: int, x: float, y: float, z: float) -> bool:
    """Return True if (x, y, z) intersects a solid non-climbable obstacle (Night 3 bell tower)."""
    if night == 3:
        # Bell tower at center of tier 2 (Y=6..14), cylinder radius 2m
        if math.hypot(x, z) < 2.0 and y < 14.0:
            return True
    return False
