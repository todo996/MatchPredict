#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script đồng bộ dữ liệu trận đấu hằng ngày.
Tự động lấy dữ liệu trận mới nhất từ nguồn xổ số thể thao và lưu vào cơ sở dữ liệu.
"""

import sys
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import argparse

# Thêm thư mục gốc của dự án vào đường dẫn import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.database import prediction_db
from scripts.china_lottery_spider import ChinaLotterySpider

# Cấu hình log
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/sco/Desktop/MatchPredict/sync_matches.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class MatchSyncManager:
    """Quản lý đồng bộ dữ liệu trận đấu."""

    def __init__(self):
        self.spider = ChinaLotterySpider()
        self.db = prediction_db

    def sync_matches(self, days_ahead: int = 7, force_update: bool = False) -> Dict[str, int]:
        """
        Đồng bộ dữ liệu trận đấu.

        Args:
            days_ahead: số ngày phía trước cần đồng bộ
            force_update: có ép cập nhật hay không

        Returns:
            thống kê kết quả đồng bộ
        """
        logger.info(f"🔄 Bắt đầu đồng bộ dữ liệu trong {days_ahead} ngày tới...")

        try:
            logger.info("📡 Đang lấy dữ liệu từ nguồn xổ số thể thao...")
            matches_data = self.spider.get_formatted_matches(days_ahead=days_ahead)

            if not matches_data:
                logger.warning("⚠️ Không nhận được dữ liệu trận đấu")
                return {'inserted': 0, 'updated': 0, 'skipped': 0}

            logger.info(f"✅ Đã lấy {len(matches_data)} trận")

            logger.info("💾 Đang lưu vào cơ sở dữ liệu...")
            stats = self.db.save_daily_matches(matches_data)

            logger.info(
                f"📊 Đồng bộ hoàn tất - Thêm mới: {stats['inserted']}, "
                f"Cập nhật: {stats['updated']}, Bỏ qua: {stats['skipped']}"
            )

            return stats

        except Exception as e:
            logger.error(f"❌ Đồng bộ thất bại: {e}")
            return {'inserted': 0, 'updated': 0, 'skipped': 0, 'error': str(e)}

    def cleanup_old_data(self, days_to_keep: int = 30) -> int:
        """
        Dọn dữ liệu cũ.

        Args:
            days_to_keep: số ngày dữ liệu cần giữ lại

        Returns:
            số bản ghi đã xóa
        """
        logger.info(f"🧹 Bắt đầu dọn dữ liệu cũ hơn {days_to_keep} ngày...")

        try:
            deleted_count = self.db.cleanup_old_matches(days_to_keep)
            logger.info(f"✅ Đã dọn xong, xóa {deleted_count} bản ghi")
            return deleted_count

        except Exception as e:
            logger.error(f"❌ Dọn dữ liệu thất bại: {e}")
            return 0

    def get_database_stats(self) -> Dict[str, int]:
        """Lấy thống kê cơ sở dữ liệu."""
        try:
            matches = self.db.get_daily_matches(days_ahead=30)

            date_stats = {}
            league_stats = {}

            for match in matches:
                match_date = match.get('match_date', '')
                league = match.get('league_name', 'Chưa xác định')

                date_stats[match_date] = date_stats.get(match_date, 0) + 1
                league_stats[league] = league_stats.get(league, 0) + 1

            return {
                'total_matches': len(matches),
                'dates_count': len(date_stats),
                'leagues_count': len(league_stats),
                'date_stats': date_stats,
                'league_stats': league_stats
            }

        except Exception as e:
            logger.error(f"Không thể lấy thống kê: {e}")
            return {}

    def test_connection(self) -> bool:
        """Kiểm tra kết nối cơ sở dữ liệu."""
        try:
            conn = self.db.connect_to_database()
            conn.close()
            logger.info("✅ Kết nối cơ sở dữ liệu hoạt động bình thường")
            return True
        except Exception as e:
            logger.error(f"❌ Kiểm tra kết nối cơ sở dữ liệu thất bại: {e}")
            return False


def main():
    """Điểm vào chính của script."""
    parser = argparse.ArgumentParser(description='Đồng bộ dữ liệu trận đấu hằng ngày')
    parser.add_argument('--days', type=int, default=7, help='Số ngày phía trước cần đồng bộ (mặc định: 7)')
    parser.add_argument('--cleanup', type=int, help='Xóa dữ liệu cũ hơn số ngày đã chỉ định')
    parser.add_argument('--stats', action='store_true', help='Hiển thị thống kê cơ sở dữ liệu')
    parser.add_argument('--test', action='store_true', help='Kiểm tra kết nối cơ sở dữ liệu')
    parser.add_argument('--force', action='store_true', help='Ép cập nhật toàn bộ dữ liệu')

    args = parser.parse_args()
    sync_manager = MatchSyncManager()

    print("=" * 60)
    print("🏈 Đồng bộ dữ liệu trận đấu hằng ngày")
    print("=" * 60)

    if args.test:
        print("🔍 Đang kiểm tra kết nối cơ sở dữ liệu...")
        if sync_manager.test_connection():
            print("✅ Kết nối cơ sở dữ liệu bình thường")
        else:
            print("❌ Không thể kết nối cơ sở dữ liệu")
            return 1

    if args.stats:
        print("📊 Đang lấy thống kê cơ sở dữ liệu...")
        stats = sync_manager.get_database_stats()
        if stats:
            print(f"📈 Tổng số trận: {stats.get('total_matches', 0)}")
            print(f"📅 Số ngày có dữ liệu: {stats.get('dates_count', 0)}")
            print(f"🏆 Số giải đấu: {stats.get('leagues_count', 0)}")

            print("\n📅 Phân bố theo ngày:")
            for date, count in sorted(stats.get('date_stats', {}).items()):
                print(f"  {date}: {count} trận")

            print("\n🏆 Phân bố theo giải:")
            for league, count in sorted(stats.get('league_stats', {}).items(), key=lambda x: x[1], reverse=True):
                print(f"  {league}: {count} trận")
        else:
            print("❌ Không thể lấy thống kê")

    if args.cleanup:
        print(f"🧹 Đang xóa dữ liệu cũ hơn {args.cleanup} ngày...")
        deleted = sync_manager.cleanup_old_data(args.cleanup)
        print(f"✅ Đã xóa {deleted} bản ghi")

    if not args.test and not args.stats and not args.cleanup:
        print(f"🔄 Bắt đầu đồng bộ {args.days} ngày tới...")
        stats = sync_manager.sync_matches(days_ahead=args.days, force_update=args.force)

        if 'error' in stats:
            print(f"❌ Đồng bộ thất bại: {stats['error']}")
            return 1
        else:
            print("✅ Đồng bộ hoàn tất!")
            print(f"  📥 Thêm mới: {stats['inserted']} trận")
            print(f"  🔄 Cập nhật: {stats['updated']} trận")
            print(f"  ⏭️ Bỏ qua: {stats['skipped']} trận")

    print("=" * 60)
    print("🎉 Script đã chạy xong")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️ Người dùng đã dừng chương trình")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Script chạy thất bại: {e}")
        sys.exit(1)
