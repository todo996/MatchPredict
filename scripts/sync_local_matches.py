#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đồng bộ dữ liệu bóng đá WorldCup26 vào backend đang chọn.

- DB_BACKEND=sqlite: lưu vào data/matchpredict.db trên PC.
- DB_BACKEND=postgres: dùng PostgreSQL/Supabase khi chuyển sang production.
- WorldCup26 là nguồn dữ liệu bóng đá bên ngoài duy nhất.
- Không tạo mock/fallback giả khi nguồn lỗi.
"""

import argparse
import logging
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.worldcup26_api import WorldCup26FootballAPI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(PROJECT_ROOT / "sync_matches_local.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Đồng bộ trận đấu WorldCup26 vào cơ sở dữ liệu hiện tại")
    parser.add_argument("--days", type=int, default=7, help="Số ngày cần đồng bộ, mặc định 7")
    args = parser.parse_args()

    days = min(max(args.days, 1), 14)
    backend = os.getenv("DB_BACKEND", "postgres").strip().lower()
    logger.info("Backend cơ sở dữ liệu: %s", backend)
    logger.info("Nguồn dữ liệu chính: https://worldcup26.ir")

    api = WorldCup26FootballAPI()
    logger.info("Đang lấy dữ liệu WorldCup26 trong %s ngày...", days)

    try:
        # Provider tự lưu vào prediction_db tương ứng backend đang chọn.
        matches = api.get_formatted_matches(days_ahead=days)
    except Exception as exc:
        logger.error("Đồng bộ WorldCup26 thất bại: %s", exc)
        print(f"❌ Không lấy được dữ liệu WorldCup26: {exc}")
        return 1

    if not matches:
        print("❌ WorldCup26 không trả về trận nào trong khoảng ngày đã chọn")
        return 1

    leagues = len({match.get("league_slug") or match.get("league_name") for match in matches})
    with_odds = sum(1 for match in matches if (match.get("odds") or {}).get("hhad"))
    print(f"✅ Đồng bộ xong {len(matches)} trận từ WorldCup26 / {leagues} giải")
    print(f"   Có tỷ lệ 1X2 từ nguồn: {with_odds}/{len(matches)} trận")
    print("   Dữ liệu đã được lưu vào backend hiện tại.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
