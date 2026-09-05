#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đồng bộ dữ liệu trận đấu vào backend đang chọn, tối ưu cho chạy local trên PC.

Khi .env có DB_BACKEND=sqlite, dữ liệu sẽ được lưu vào data/matchpredict.db.
Khi đổi DB_BACKEND=postgres, script vẫn dùng backend PostgreSQL/Supabase cũ.
"""

import argparse
import logging
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.database import prediction_db
from scripts.china_lottery_spider import ChinaLotterySpider

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
    parser = argparse.ArgumentParser(description="Đồng bộ trận đấu vào cơ sở dữ liệu hiện tại")
    parser.add_argument("--days", type=int, default=7, help="Số ngày cần đồng bộ, mặc định 7")
    args = parser.parse_args()

    days = min(max(args.days, 1), 7)
    backend = os.getenv("DB_BACKEND", "postgres").strip().lower()
    logger.info("Backend cơ sở dữ liệu: %s", backend)

    spider = ChinaLotterySpider()
    logger.info("Đang lấy dữ liệu trận đấu trong %s ngày...", days)
    matches = spider.get_formatted_matches(days_ahead=days)

    if not matches:
        logger.warning("Không nhận được dữ liệu trận đấu")
        return 1

    logger.info("Đã lấy %s trận, bắt đầu lưu...", len(matches))
    stats = prediction_db.save_daily_matches(matches)
    logger.info(
        "Hoàn tất - thêm mới: %s, cập nhật: %s, bỏ qua: %s",
        stats.get("inserted", 0),
        stats.get("updated", 0),
        stats.get("skipped", 0),
    )
    print(
        f"✅ Đồng bộ xong: +{stats.get('inserted', 0)} mới, "
        f"{stats.get('updated', 0)} cập nhật, {stats.get('skipped', 0)} bỏ qua"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
