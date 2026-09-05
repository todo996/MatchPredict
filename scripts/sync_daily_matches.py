#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đồng bộ dữ liệu bóng đá hằng ngày từ WorldCup26.

WorldCup26 là nguồn dữ liệu bóng đá bên ngoài duy nhất. Script dùng cùng
prediction_db với ứng dụng nên chạy được với SQLite local lẫn PostgreSQL/Supabase.
"""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Dict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.database import prediction_db
from scripts.worldcup26_api import WorldCup26FootballAPI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(PROJECT_ROOT / "sync_matches.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class MatchSyncManager:
    def __init__(self):
        self.api = WorldCup26FootballAPI()
        self.db = prediction_db

    def sync_matches(self, days_ahead: int = 7, force_update: bool = False) -> Dict[str, int]:
        days = min(max(int(days_ahead or 1), 1), 14)
        logger.info("Đồng bộ WorldCup26 trong %s ngày tới", days)
        try:
            # Provider tự lưu dữ liệu vào backend hiện tại.
            matches = self.api.get_formatted_matches(days_ahead=days)
            return {
                "matches": len(matches),
                "leagues": len({m.get("league_slug") or m.get("league_name") for m in matches}),
                "with_odds": sum(1 for m in matches if (m.get("odds") or {}).get("hhad")),
            }
        except Exception as exc:
            logger.error("Đồng bộ WorldCup26 thất bại: %s", exc)
            return {"matches": 0, "leagues": 0, "with_odds": 0, "error": str(exc)}

    def cleanup_old_data(self, days_to_keep: int = 30) -> int:
        try:
            return self.db.cleanup_old_matches(days_to_keep)
        except Exception as exc:
            logger.error("Dọn dữ liệu cũ thất bại: %s", exc)
            return 0

    def get_database_stats(self) -> Dict[str, int]:
        try:
            matches = self.db.get_daily_matches(days_ahead=30)
            return {
                "total_matches": len(matches),
                "dates_count": len({m.get("match_date") for m in matches if m.get("match_date")}),
                "leagues_count": len({m.get("league_name") for m in matches if m.get("league_name")}),
            }
        except Exception as exc:
            logger.error("Không thể lấy thống kê database: %s", exc)
            return {}

    def test_connection(self) -> bool:
        try:
            conn = self.db.connect_to_database()
            conn.close()
            return True
        except Exception as exc:
            logger.error("Kết nối database thất bại: %s", exc)
            return False

    def test_source(self) -> bool:
        try:
            meta = self.api.get_meta()
            service = meta.get("service") or {}
            logger.info("WorldCup26 API OK: %s", service.get("name") or "soccer API")
            return True
        except Exception as exc:
            logger.error("WorldCup26 API không khả dụng: %s", exc)
            return False


def main():
    parser = argparse.ArgumentParser(description="Đồng bộ dữ liệu bóng đá WorldCup26")
    parser.add_argument("--days", type=int, default=7, help="Số ngày phía trước, tối đa 14")
    parser.add_argument("--cleanup", type=int, help="Xóa cache cũ hơn N ngày")
    parser.add_argument("--stats", action="store_true", help="Hiển thị thống kê database")
    parser.add_argument("--test", action="store_true", help="Kiểm tra database và WorldCup26")
    parser.add_argument("--force", action="store_true", help="Giữ tương thích CLI cũ; provider tự quản lý cache")
    args = parser.parse_args()

    manager = MatchSyncManager()
    print("=" * 60)
    print("⚽ Đồng bộ dữ liệu bóng đá - WorldCup26")
    print(f"Backend: {os.getenv('DB_BACKEND', 'postgres')}")
    print("=" * 60)

    if args.test:
        db_ok = manager.test_connection()
        api_ok = manager.test_source()
        print(f"Database: {'OK' if db_ok else 'LỖI'}")
        print(f"WorldCup26 API: {'OK' if api_ok else 'LỖI'}")
        return 0 if db_ok and api_ok else 1

    if args.stats:
        stats = manager.get_database_stats()
        print(f"Tổng số trận: {stats.get('total_matches', 0)}")
        print(f"Số ngày: {stats.get('dates_count', 0)}")
        print(f"Số giải: {stats.get('leagues_count', 0)}")
        return 0

    if args.cleanup:
        deleted = manager.cleanup_old_data(args.cleanup)
        print(f"Đã xóa {deleted} bản ghi cũ")
        return 0

    result = manager.sync_matches(args.days, args.force)
    if result.get("error"):
        print(f"❌ Đồng bộ thất bại: {result['error']}")
        return 1

    print(f"✅ Đã đồng bộ {result['matches']} trận / {result['leagues']} giải")
    print(f"   Trận có tỷ lệ 1X2 từ nguồn: {result['with_odds']}/{result['matches']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
