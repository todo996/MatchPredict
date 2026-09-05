#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Nguồn dữ liệu bóng đá chính từ https://worldcup26.ir.

Chỉ sử dụng các endpoint công khai `/get/soccer/*` được tài liệu hóa bởi
WorldCup26. Mô-đun không sinh dữ liệu giả khi nguồn lỗi và tự lưu dữ liệu lấy
được vào backend hiện tại (SQLite local hoặc PostgreSQL/Supabase).
"""

from __future__ import annotations

import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

VIETNAM_TZ = timezone(timedelta(hours=7))


class WorldCup26FootballAPI:
    """Client cho API dữ liệu bóng đá công khai WorldCup26."""

    DEFAULT_BASE_URL = "https://worldcup26.ir"

    def __init__(self, base_url: Optional[str] = None, timeout: int = 15):
        self.base_url = (base_url or os.getenv("WORLDCUP26_API_BASE") or self.DEFAULT_BASE_URL).rstrip("/")
        self.timeout = max(5, int(timeout))
        self.headers = {
            "Accept": "application/json",
            "User-Agent": "MatchPredict/1.0 (+https://github.com/todo996/MatchPredict)",
        }
        self._league_cache: Tuple[float, List[Dict[str, Any]]] = (0.0, [])
        self._match_cache: Dict[int, Tuple[float, List[Dict[str, Any]]]] = {}
        self._cache_lock = threading.Lock()

    def _request_json(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        last_error: Optional[Exception] = None

        for attempt in range(3):
            try:
                response = requests.get(
                    url,
                    params=params,
                    headers=self.headers,
                    timeout=self.timeout,
                )
                if response.status_code == 429:
                    raise RuntimeError("API đang giới hạn tần suất (HTTP 429)")
                if response.status_code >= 400:
                    raise RuntimeError(f"HTTP {response.status_code}")

                try:
                    data = response.json()
                except ValueError as exc:
                    raise RuntimeError("API trả về dữ liệu không phải JSON") from exc

                if not isinstance(data, dict):
                    raise RuntimeError("Cấu trúc phản hồi API không hợp lệ")
                if data.get("error"):
                    raise RuntimeError(str(data.get("error")))
                return data
            except Exception as exc:
                last_error = exc
                if attempt >= 2:
                    break
                delay = 0.6 * (2 ** attempt)
                logger.warning("WorldCup26 %s lỗi lần %s: %s; thử lại sau %.1fs", path, attempt + 1, exc, delay)
                time.sleep(delay)

        raise RuntimeError(f"Không thể lấy dữ liệu từ WorldCup26: {last_error}")

    def get_meta(self) -> Dict[str, Any]:
        """Lấy trạng thái/phạm vi dữ liệu của dịch vụ."""
        return self._request_json("/get/soccer/meta")

    def get_leagues(self, force: bool = False) -> List[Dict[str, Any]]:
        """Lấy các giải đang có dữ liệu, cache 10 phút để giảm số request."""
        now = time.time()
        with self._cache_lock:
            cached_at, cached = self._league_cache
            if not force and cached and now - cached_at < 600:
                return [dict(item) for item in cached]

        payload = self._request_json(
            "/get/soccer/leagues",
            {"kind": "all", "available": "true"},
        )
        leagues = payload.get("leagues") or []
        if not isinstance(leagues, list):
            raise RuntimeError("WorldCup26 không trả về danh sách giải đấu hợp lệ")

        result = []
        for league in leagues:
            if not isinstance(league, dict):
                continue
            slug = str(league.get("slug") or "").strip().lower()
            coverage = league.get("coverage") or {}
            has_data = coverage.get("hasData", True)
            matches = coverage.get("matches")
            if slug and has_data is not False and (matches is None or int(matches or 0) > 0):
                result.append(league)

        if not result:
            raise RuntimeError("WorldCup26 hiện không có giải đấu nào có dữ liệu trận")

        with self._cache_lock:
            self._league_cache = (now, [dict(item) for item in result])
        return result

    @staticmethod
    def _parse_iso_datetime(value: Any) -> Optional[datetime]:
        if not value:
            return None
        text = str(value).strip()
        try:
            if text.endswith("Z"):
                text = text[:-1] + "+00:00"
            parsed = datetime.fromisoformat(text)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return None

    @staticmethod
    def _moneyline_to_decimal(value: Any) -> Optional[float]:
        try:
            line = float(value)
        except (TypeError, ValueError):
            return None
        if line == 0:
            return None
        if line > 0:
            return round(1.0 + line / 100.0, 4)
        return round(1.0 + 100.0 / abs(line), 4)

    @classmethod
    def _decimal_value(cls, value: Any) -> Optional[float]:
        if value is None or value == "":
            return None
        if isinstance(value, dict):
            for key in ("decimalOdds", "decimal", "value", "odds"):
                if key in value and value[key] not in (None, ""):
                    try:
                        number = float(value[key])
                        if number > 1:
                            return number
                    except (TypeError, ValueError):
                        pass
            for key in ("moneyLine", "moneyline", "american"):
                if key in value:
                    converted = cls._moneyline_to_decimal(value[key])
                    if converted:
                        return converted
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        return number if number > 1 else None

    @classmethod
    def _extract_1x2_odds(cls, competition: Dict[str, Any]) -> Dict[str, Any]:
        """Chuẩn hóa 1X2 nếu API có lưu odds; không tự tạo tỷ lệ khi thiếu."""
        odds_items = competition.get("odds") or []
        if isinstance(odds_items, dict):
            odds_items = [odds_items]
        if not isinstance(odds_items, list):
            return {}

        for item in odds_items:
            if not isinstance(item, dict):
                continue

            direct_sets = (
                (item.get("home"), item.get("draw"), item.get("away")),
                (item.get("h"), item.get("d"), item.get("a")),
                (item.get("homeOdds"), item.get("drawOdds"), item.get("awayOdds")),
                (item.get("homeTeamOdds"), item.get("drawOdds"), item.get("awayTeamOdds")),
            )
            for home_raw, draw_raw, away_raw in direct_sets:
                home = cls._decimal_value(home_raw)
                draw = cls._decimal_value(draw_raw)
                away = cls._decimal_value(away_raw)
                if home and draw and away:
                    return {
                        "hhad": {"h": str(home), "d": str(draw), "a": str(away)},
                        "type": "1x2",
                        "provider": str((item.get("provider") or {}).get("name") if isinstance(item.get("provider"), dict) else item.get("provider") or "worldcup26"),
                    }
        return {}

    @staticmethod
    def _team_name(competitor: Dict[str, Any]) -> str:
        team = competitor.get("team") or {}
        if not isinstance(team, dict):
            return ""
        return str(
            team.get("displayName")
            or team.get("name")
            or team.get("shortDisplayName")
            or team.get("abbreviation")
            or ""
        ).strip()

    @staticmethod
    def _status_value(event: Dict[str, Any], competition: Dict[str, Any]) -> str:
        status = event.get("status") or competition.get("status") or {}
        status_type = status.get("type") if isinstance(status, dict) else {}
        if not isinstance(status_type, dict):
            status_type = {}
        state = str(status_type.get("state") or "").lower()
        name = str(status_type.get("name") or "").lower()
        description = str(status_type.get("description") or "").lower()
        combined = f"{name} {description}"
        if any(token in combined for token in ("cancel", "postpon", "abandon")):
            return "CANCELLED"
        if state == "in":
            return "LIVE"
        if state == "post" or bool(status_type.get("completed")):
            return "FINISHED"
        if state == "pre":
            return "PENDING"
        return "PENDING"

    def _normalize_event(
        self,
        event: Dict[str, Any],
        league: Dict[str, Any],
        local_start: date,
        local_end: date,
    ) -> Optional[Dict[str, Any]]:
        competitions = event.get("competitions") or []
        if not isinstance(competitions, list) or not competitions:
            return None
        competition = competitions[0] if isinstance(competitions[0], dict) else {}

        competitors = competition.get("competitors") or []
        if not isinstance(competitors, list):
            return None
        home_comp = next((x for x in competitors if isinstance(x, dict) and x.get("homeAway") == "home"), None)
        away_comp = next((x for x in competitors if isinstance(x, dict) and x.get("homeAway") == "away"), None)
        if not home_comp or not away_comp:
            return None

        home = self._team_name(home_comp)
        away = self._team_name(away_comp)
        if not home or not away:
            return None

        kickoff = self._parse_iso_datetime(event.get("date") or competition.get("date") or competition.get("startDate"))
        if not kickoff:
            return None
        local_dt = kickoff.astimezone(VIETNAM_TZ)
        if not (local_start <= local_dt.date() <= local_end):
            return None

        event_id = str(event.get("id") or competition.get("id") or "").strip()
        if not event_id:
            return None

        league_slug = str(league.get("slug") or "unknown").strip().lower()
        league_name = str(league.get("name") or league.get("abbreviation") or league_slug).strip()
        venue = competition.get("venue") or event.get("venue") or {}
        if not isinstance(venue, dict):
            venue = {}
        venue_name = str(venue.get("fullName") or venue.get("displayName") or "").strip()

        return {
            "match_id": f"worldcup26_{league_slug}_{event_id}",
            "event_id": event_id,
            "league_slug": league_slug,
            "league_name": league_name,
            "home_team": home,
            "away_team": away,
            "match_time": local_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "match_date": local_dt.strftime("%Y-%m-%d"),
            "match_num": event_id,
            "status": self._status_value(event, competition),
            "home_score": home_comp.get("score"),
            "away_score": away_comp.get("score"),
            "venue": venue_name,
            "source": "worldcup26",
            "provider": "worldcup26.ir",
            "odds": self._extract_1x2_odds(competition),
        }

    def _fetch_league_fixtures(
        self,
        league: Dict[str, Any],
        api_from: date,
        api_to: date,
        local_start: date,
        local_end: date,
    ) -> List[Dict[str, Any]]:
        slug = str(league.get("slug") or "").strip().lower()
        if not slug:
            return []
        payload = self._request_json(
            f"/get/soccer/{slug}/fixtures",
            {
                "status": "all",
                "from": api_from.strftime("%Y%m%d"),
                "to": api_to.strftime("%Y%m%d"),
                "page": 1,
                "limit": 200,
            },
        )
        events = payload.get("events") or []
        if not isinstance(events, list):
            return []

        normalized: List[Dict[str, Any]] = []
        for event in events:
            if not isinstance(event, dict):
                continue
            item = self._normalize_event(event, payload.get("league") or league, local_start, local_end)
            if item:
                normalized.append(item)
        return normalized

    def _persist(self, matches: Iterable[Dict[str, Any]]) -> None:
        rows = list(matches)
        if not rows:
            return
        try:
            from scripts.database import prediction_db

            stats = prediction_db.save_daily_matches(rows)
            logger.info("Đã lưu dữ liệu WorldCup26 vào database: %s", stats)
        except Exception as exc:
            logger.warning("Không thể lưu cache WorldCup26: %s", exc)

    def get_formatted_matches(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """Lấy fixtures từ mọi giải có dữ liệu và chuẩn hóa cho MatchPredict."""
        days = min(max(int(days_ahead or 1), 1), 14)
        now = time.time()
        with self._cache_lock:
            cached = self._match_cache.get(days)
            if cached and now - cached[0] < 120:
                return [dict(item) for item in cached[1]]

        local_start = datetime.now(VIETNAM_TZ).date()
        local_end = local_start + timedelta(days=days)
        # API lập chỉ mục theo ngày UTC; nới một ngày ở hai đầu rồi lọc lại theo UTC+7.
        api_from = local_start - timedelta(days=1)
        api_to = local_end + timedelta(days=1)
        leagues = self.get_leagues()

        matches: List[Dict[str, Any]] = []
        errors: List[str] = []
        max_workers = min(5, max(1, len(leagues)))
        with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="worldcup26") as executor:
            futures = {
                executor.submit(
                    self._fetch_league_fixtures,
                    league,
                    api_from,
                    api_to,
                    local_start,
                    local_end,
                ): league
                for league in leagues
            }
            for future in as_completed(futures):
                league = futures[future]
                try:
                    matches.extend(future.result())
                except Exception as exc:
                    slug = league.get("slug") or league.get("name") or "unknown"
                    errors.append(f"{slug}: {exc}")
                    logger.warning("Không lấy được fixtures %s: %s", slug, exc)

        # Loại trùng theo ID và sắp xếp theo thời gian.
        unique: Dict[str, Dict[str, Any]] = {}
        for match in matches:
            unique[str(match["match_id"])] = match
        result = sorted(unique.values(), key=lambda item: item.get("match_time", ""))

        if not result:
            detail = "; ".join(errors[:3]) if errors else "không có trận trong khoảng ngày yêu cầu"
            raise RuntimeError(f"WorldCup26 chưa trả về dữ liệu trận đấu: {detail}")

        self._persist(result)
        with self._cache_lock:
            self._match_cache[days] = (now, [dict(item) for item in result])

        logger.info("Đã lấy %s trận từ WorldCup26 (%s giải)", len(result), len(leagues))
        return result


# Alias tương thích tạm với tên lớp mà app.py hiện đang import.
ChinaSportsLotterySpider = WorldCup26FootballAPI

__all__ = ["WorldCup26FootballAPI", "ChinaSportsLotterySpider"]
