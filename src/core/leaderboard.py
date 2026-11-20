"""Persistent local Top-10 leaderboard storage for Đảo Đèn Lồng (Ticket-04)."""

from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LEADERBOARD_PATH = REPO_ROOT / "data" / "leaderboard.json"

# 3-12 chars: ASCII letters, digits, underscore, or Vietnamese accented letters
NAME_PATTERN = re.compile(r"^[A-Za-z0-9_\u00C0-\u024F\u1E00-\u1EFF]{3,12}$")


def validate_player_name(name: str) -> str:
    cleaned = name.strip()
    if not NAME_PATTERN.match(cleaned):
        raise ValueError("Name must be 3-12 characters ([A-Za-z0-9_] or Vietnamese letters)")
    return cleaned


def _parse_iso_ts(ts: str) -> float:
    try:
        return dt.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except Exception:
        return float("inf")


def sort_entries(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort by score descending; ties broken by earliest achieved_at."""
    return sorted(
        entries,
        key=lambda e: (-int(e.get("score", 0)), _parse_iso_ts(str(e.get("achieved_at", "")))),
    )[:10]


def load_leaderboard(path: Optional[Path] = None) -> List[Dict[str, Any]]:
    lb_path = path or DEFAULT_LEADERBOARD_PATH
    if not lb_path.is_file():
        return []
    try:
        data = json.loads(lb_path.read_text(encoding="utf-8"))
        entries = data.get("entries", []) if isinstance(data, dict) else []
        if not isinstance(entries, list):
            return []
        return sort_entries(entries)
    except Exception:
        return []


def save_leaderboard(entries: List[Dict[str, Any]], path: Optional[Path] = None) -> List[Dict[str, Any]]:
    lb_path = path or DEFAULT_LEADERBOARD_PATH
    lb_path.parent.mkdir(parents=True, exist_ok=True)
    sorted_top = sort_entries(entries)
    lb_path.write_text(
        json.dumps({"entries": sorted_top}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return sorted_top


def add_leaderboard_entry(
    name: str,
    score: int,
    nights_won: int,
    seed: int,
    achieved_at: Optional[str] = None,
    path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    clean_name = validate_player_name(name)
    nights_clamped = max(0, min(3, int(nights_won)))
    if achieved_at is None:
        achieved_at = dt.datetime.now().astimezone().isoformat(timespec="seconds")

    entries = load_leaderboard(path)
    entries.append({
        "name": clean_name,
        "score": int(score),
        "nights_won": nights_clamped,
        "achieved_at": achieved_at,
        "seed": int(seed),
    })
    return save_leaderboard(entries, path)


def export_leaderboard(out_path: Path, path: Optional[Path] = None) -> Dict[str, Any]:
    entries = load_leaderboard(path)
    payload = {"entries": entries}
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return payload
