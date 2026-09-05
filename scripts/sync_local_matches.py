#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đồng bộ dữ liệu trận đấu mới nhất vào backend đang chọn.

- DB_BACKEND=sqlite: lưu vào data/matchpredict.db trên PC.
- DB_BACKEND=postgres: vẫn dùng PostgreSQL/Supabase sau này.
- Chỉ dùng dữ liệu Sporttery trực tiếp, không tạo mock khi nguồn lỗi.
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
from scripts.live_lottery_api import ChinaSportsLotterySpider

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
    parser = argparse.ArgumentParser(description="Đồng bộ trận đấu trực tiếp vào cơ sở dữ liệu hiện tại")
    parser.add_argument("--days", type=int, default=7, help="Số ngày cần đồng bộ, mặc định 7")
    args = parser.parse_args()

    days = min(max(args.days, 1), 7)
    backend = os.getenv("DB_BACKEND", "postgres").strip().lower()
    logger.info("Backend cơ sở dữ liệu: %s", backend)

    spider = ChinaSportsLotterySpider()
    logger.info("Đang lấy dữ liệu trực tiếp trong %s ngày...", days)

    try:
        # get_formatted_matches đã tự lưu qua prediction_db tương ứng backend hiện tại.
        matches = spider.get_formatted_matches(days_ahead=days)
    except Exception as exc:
        logger.error("Đồng bộ dữ liệu trực tiếp thất bại: %s", exc)
        print(f"❌ Không lấy được dữ liệu trực tiếp: {exc}")
        return 1

    if not matches:
        logger.warning("Nguồn trực tiếp không trả về trận nào")
        print("❌ Nguồn trực tiếp không trả về trận nào")
        return 1

    # Gọi thêm save_daily_matches là idempotent (update theo match_id), bảo đảm cache local được ghi.
    stats = prediction_db.save_daily_matches(matches)
    logger.info(
        "Hoàn tất - thêm mới: %s, cập nhật: %s, bỏ qua: %s",
        stats.get("inserted", 0),
        stats.get("updated", 0),
        stats.get("skipped", 0),
    )
    print(
        f"✅ Đồng bộ xong {len(matches)} trận trực tiếp: +{stats.get('inserted', 0)} mới, "
        f"{stats.get('updated', 0)} cập nhật, {stats.get('skipped', 0)} bỏ qua"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
