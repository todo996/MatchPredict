#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Nguồn dữ liệu Xổ số Thể thao trực tiếp.

Mô-đun này chỉ bổ sung nguồn live, không xóa crawler/logic cũ. Dữ liệu được lấy
trực tiếp từ web API của Sporttery và tuyệt đối không sinh mock data khi lỗi.
Sau khi lấy thành công, dữ liệu được lưu qua prediction_db đang được chọn
(SQLite local hoặc PostgreSQL/Supabase).
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class ChinaSportsLotterySpider:
    """Đọc danh sách trận và tỷ lệ 1X2 trực tiếp từ Sporttery."""

    BASE_URL = "https://webapi.sporttery.cn"
    ENDPOINTS = (
        "/gateway/jc/football/getMatchCalculatorV1.qry",
        "/gateway/uniform/football/getMatchCalculatorV1.qry",
    )

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 "
                "Mobile/15E148 Safari/604.1"
            ),
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://m.sporttery.cn/mjc/jsq/zqspf/",
            "Origin": "https://m.sporttery.cn",
            "X-Requested-With": "XMLHttpRequest",
            "Connection": "keep-alive",
        })

    def _request(self) -> Dict[str, Any]:
        last_error: Optional[Exception] = None
        params = {"channel": "c", "poolCode": "had,hhad"}

        for endpoint in self.ENDPOINTS:
            url = f"{self.BASE_URL}{endpoint}"
            for attempt in range(2):
                try:
                    logger.info("Đang lấy dữ liệu trực tiếp: %s", url)
                    response = self.session.get(url, params=params, timeout=15)
                    content_type = (response.headers.get("content-type") or "").lower()

                    if response.status_code >= 400:
                        raise RuntimeError(f"HTTP {response.status_code}")
                    if "json" not in content_type and response.text.lstrip().startswith("<"):
                        raise RuntimeError("Nguồn dữ liệu trả về HTML/WAF thay vì JSON")

                    data = response.json()
                    if not data.get("success"):
                        raise RuntimeError(data.get("errorMessage") or "API báo không thành công")
                    if not data.get("value", {}).get("matchInfoList"):
                        raise RuntimeError("API không trả về danh sách trận")
                    return data
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "Nguồn %s thất bại lần %s: %s", endpoint, attempt + 1, exc
                    )
                    if attempt == 0:
                        time.sleep(1)

        raise RuntimeError(f"Không thể lấy dữ liệu Sporttery trực tiếp: {last_error}")

    @staticmethod
    def _extract_odds(match: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for key in ("had", "hhad"):
            pool = match.get(key)
            if isinstance(pool, dict) and all(pool.get(k) not in (None, "") for k in ("h", "d", "a")):
                return {
                    "hhad": {
                        "h": str(pool["h"]),
                        "d": str(pool["d"]),
                        "a": str(pool["a"]),
                    },
                    "type": key,
                    "goal_line": pool.get("goalLine", ""),
                    "update_time": f"{pool.get('updateDate', '')} {pool.get('updateTime', '')}".strip(),
                }

        for item in match.get("oddsList") or []:
            code = str(item.get("poolCode", "")).lower()
            if code in {"had", "hhad"} and all(item.get(k) not in (None, "") for k in ("h", "d", "a")):
                return {
                    "hhad": {
                        "h": str(item["h"]),
                        "d": str(item["d"]),
                        "a": str(item["a"]),
                    },
                    "type": code,
                    "goal_line": item.get("goalLine", ""),
                    "update_time": f"{item.get('updateDate', '')} {item.get('updateTime', '')}".strip(),
                }
        return None

    @staticmethod
    def _valid_odds(odds: Dict[str, Any]) -> bool:
        try:
            values = odds["hhad"]
            return all(1.01 <= float(values[k]) <= 99.99 for k in ("h", "d", "a"))
        except Exception:
            return False

    def _parse(self, payload: Dict[str, Any], days_ahead: int) -> List[Dict[str, Any]]:
        today = datetime.now().date()
        end_date = today + timedelta(days=days_ahead)
        results: List[Dict[str, Any]] = []

        for date_block in payload.get("value", {}).get("matchInfoList", []):
            for raw in date_block.get("subMatchList", []) or []:
                odds = self._extract_odds(raw)
                if not odds or not self._valid_odds(odds):
                    continue

                match_date_text = str(raw.get("matchDate") or date_block.get("businessDate") or "").strip()
                try:
                    match_date = datetime.strptime(match_date_text, "%Y-%m-%d").date()
                except ValueError:
                    continue
                if not (today <= match_date <= end_date):
                    continue

                match_id = str(raw.get("matchId") or "").strip()
                home = str(raw.get("homeTeamAllName") or raw.get("homeTeamAbbName") or "").strip()
                away = str(raw.get("awayTeamAllName") or raw.get("awayTeamAbbName") or "").strip()
                league = str(raw.get("leagueAbbName") or raw.get("leagueAllName") or "").strip()
                if not match_id or not home or not away:
                    continue

                match_time = str(raw.get("matchTime") or "").strip()
                full_time = f"{match_date_text} {match_time}".strip()
                results.append({
                    "match_id": f"lottery_{match_id}",
                    "home_team": home,
                    "away_team": away,
                    "league_name": league or "Bóng đá",
                    "match_time": full_time,
                    "match_date": match_date_text,
                    "match_num": str(raw.get("matchNumStr") or raw.get("matchNum") or ""),
                    "status": str(raw.get("matchStatus") or "PENDING"),
                    "source": "china_lottery_live",
                    "odds": odds,
                })

        results.sort(key=lambda item: (item.get("match_date", ""), item.get("match_time", "")))
        return results

    def _persist(self, matches: List[Dict[str, Any]]) -> None:
        if not matches:
            return
        try:
            # Import tại runtime để dùng đúng backend đang chọn bởi scripts/__init__.py.
            from scripts.database import prediction_db

            stats = prediction_db.save_daily_matches(matches)
            logger.info("Đã lưu dữ liệu live vào database: %s", stats)
        except Exception as exc:
            # Không làm hỏng việc hiển thị live nếu cache local tạm thời không ghi được.
            logger.warning("Không thể lưu cache dữ liệu live: %s", exc)

    def get_formatted_matches(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        days = min(max(int(days_ahead or 1), 1), 7)
        payload = self._request()
        matches = self._parse(payload, days)
        if not matches:
            raise RuntimeError(f"Nguồn trực tiếp không có trận khả dụng trong {days} ngày tới")
        self._persist(matches)
        logger.info("Đã lấy %s trận trực tiếp từ Sporttery", len(matches))
        return matches
