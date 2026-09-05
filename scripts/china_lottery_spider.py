#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crawler dữ liệu bóng đá Xổ số Thể thao Trung Quốc.
Sử dụng API chính thức để lấy dữ liệu trận đấu thực tế.
"""

import requests
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import time
import random

# Cấu hình log
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/sco/Desktop/MatchPredict/lottery_spider.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class ChinaLotterySpider:
    """Crawler Xổ số Thể thao Trung Quốc."""

    def __init__(self):
        self.base_url = "https://webapi.sporttery.cn"
        self.api_endpoint = "/gateway/uniform/football/getMatchCalculatorV1.qry"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Referer": "https://www.lottery.gov.cn/",
            "Origin": "https://www.lottery.gov.cn"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def fetch_lottery_data(self, pool_code: str = "hhad", channel: str = "c") -> Optional[Dict[str, Any]]:
        """
        Lấy dữ liệu xổ số thể thao.

        Args:
            pool_code: mã pool (hhad=1X2 có chấp, had=1X2 không chấp, spf=1X2)
            channel: kênh (c=chung, pc=PC, wap=di động)

        Returns:
            dữ liệu phản hồi API hoặc None
        """
        url = f"{self.base_url}{self.api_endpoint}"
        params = {
            "poolCode": pool_code,
            "channel": channel
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Đang lấy dữ liệu xổ số thể thao (lần {attempt + 1}/{max_retries}): {url}")
                response = self.session.get(url, params=params, timeout=15)
                response.raise_for_status()

                data = response.json()

                if data.get('success'):
                    logger.info(f"✅ Lấy dữ liệu API thành công: {data.get('errorMessage', 'Xử lý thành công')}")
                    return data
                else:
                    error_msg = data.get('errorMessage', 'Lỗi chưa xác định')
                    logger.warning(f"⚠️ API trả về lỗi: {error_msg}")
                    if attempt == max_retries - 1:
                        raise Exception(f"Gọi API thất bại: {error_msg}")

            except requests.exceptions.RequestException as e:
                logger.warning(f"❌ Yêu cầu mạng thất bại (lần {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    wait_time = random.uniform(1, 3)
                    logger.info(f"⏳ Chờ {wait_time:.1f} giây trước khi thử lại...")
                    time.sleep(wait_time)
                else:
                    raise Exception(f"Yêu cầu mạng thất bại: {e}")
            except json.JSONDecodeError as e:
                logger.error(f"❌ Phân tích JSON thất bại: {e}")
                raise Exception(f"Định dạng dữ liệu phản hồi không hợp lệ: {e}")
            except Exception as e:
                logger.error(f"❌ Lấy dữ liệu thất bại: {e}")
                if attempt == max_retries - 1:
                    raise

        return None

    def parse_match_data(self, api_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Chuẩn hóa dữ liệu API về định dạng trận đấu của hệ thống.

        Args:
            api_data: dữ liệu gốc do API trả về

        Returns:
            danh sách trận đấu đã chuẩn hóa
        """
        matches = []

        try:
            # Lấy danh sách trận đấu
            value = api_data.get('value', {})
            match_info_list = value.get('matchInfoList', [])

            if not match_info_list:
                logger.warning("⚠️ Dữ liệu API không có thông tin trận đấu")
                return matches

            logger.info(f"📊 Bắt đầu phân tích dữ liệu của {len(match_info_list)} ngày")

            # Duyệt từng ngày
            for date_info in match_info_list:
                sub_match_list = date_info.get('subMatchList', [])
                business_date = date_info.get('businessDate', '')

                logger.info(f"📅 Xử lý {len(sub_match_list)} trận ngày {business_date}")

                for match_data in sub_match_list:
                    try:
                        # Trích xuất thông tin cơ bản
                        match_info = {
                            'match_id': f"lottery_{match_data.get('matchId', '')}",
                            'home_team': self.clean_team_name(match_data.get('homeTeamAllName', match_data.get('homeTeamAbbName', ''))),
                            'away_team': self.clean_team_name(match_data.get('awayTeamAllName', match_data.get('awayTeamAbbName', ''))),
                            'league_name': match_data.get('leagueAbbName', match_data.get('leagueAllName', '')),
                            'match_time': f"{match_data.get('matchDate', '')} {match_data.get('matchTime', '')}",
                            'match_date': match_data.get('matchDate', ''),
                            'match_num': match_data.get('matchNumStr', ''),
                            'status': match_data.get('matchStatus', 'Unknown'),
                            'source': 'china_lottery'
                        }

                        # Trích xuất tỷ lệ cược
                        odds_info = self.extract_odds(match_data)
                        if odds_info:
                            match_info['odds'] = odds_info

                            # Kiểm tra tính đầy đủ của dữ liệu
                            if self.validate_match(match_info):
                                matches.append(match_info)
                                logger.debug(f"✅ Phân tích trận thành công: {match_info['home_team']} vs {match_info['away_team']}")
                            else:
                                logger.warning(f"⚠️ Dữ liệu trận không đầy đủ, bỏ qua: {match_info}")
                        else:
                            logger.warning(
                                f"⚠️ Không lấy được tỷ lệ, bỏ qua trận: "
                                f"{match_data.get('homeTeamAbbName', '')} vs {match_data.get('awayTeamAbbName', '')}"
                            )

                    except Exception as e:
                        logger.warning(f"⚠️ Phân tích một trận thất bại: {e}")
                        continue

            logger.info(f"📈 Phân tích thành công {len(matches)} trận hợp lệ")
            return matches

        except Exception as e:
            logger.error(f"❌ Phân tích dữ liệu trận thất bại: {e}")
            raise Exception(f"Lỗi phân tích dữ liệu: {e}")

    def extract_odds(self, match_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Trích xuất tỷ lệ cược; dùng key hhad để giữ tương thích với cấu trúc hiện có.

        Args:
            match_data: dữ liệu của một trận

        Returns:
            dict tỷ lệ cược, thống nhất dùng key hhad
        """
        try:
            # Cách 1: lấy từ trường had hiện tại (1X2 không chấp)
            if 'had' in match_data and match_data['had']:
                had_data = match_data['had']
                if all(key in had_data for key in ['h', 'd', 'a']):
                    return {
                        'hhad': {  # Giữ tên key hhad để tương thích
                            'h': str(had_data['h']),
                            'd': str(had_data['d']),
                            'a': str(had_data['a'])
                        },
                        'type': 'had',  # Đánh dấu loại thực tế là 1X2 không chấp
                        'update_time': f"{had_data.get('updateDate', '')} {had_data.get('updateTime', '')}"
                    }

            # Cách 2: tìm loại HAD trong oddsList
            if 'oddsList' in match_data and match_data['oddsList']:
                for odds_item in match_data['oddsList']:
                    if odds_item.get('poolCode') == 'HAD' and all(key in odds_item for key in ['h', 'd', 'a']):
                        return {
                            'hhad': {
                                'h': str(odds_item['h']),
                                'd': str(odds_item['d']),
                                'a': str(odds_item['a'])
                            },
                            'type': 'had',
                            'update_time': f"{odds_item.get('updateDate', '')} {odds_item.get('updateTime', '')}"
                        }

            # Cách 3: dự phòng từ hhad (1X2 có chấp)
            if 'hhad' in match_data and match_data['hhad']:
                hhad_data = match_data['hhad']
                if all(key in hhad_data for key in ['h', 'd', 'a']):
                    return {
                        'hhad': {
                            'h': str(hhad_data['h']),
                            'd': str(hhad_data['d']),
                            'a': str(hhad_data['a'])
                        },
                        'type': 'hhad',
                        'goal_line': hhad_data.get('goalLine', ''),
                        'update_time': f"{hhad_data.get('updateDate', '')} {hhad_data.get('updateTime', '')}"
                    }

            # Cách 4: tìm HHAD trong oddsList làm phương án dự phòng cuối
            if 'oddsList' in match_data and match_data['oddsList']:
                for odds_item in match_data['oddsList']:
                    if odds_item.get('poolCode') == 'HHAD' and all(key in odds_item for key in ['h', 'd', 'a']):
                        return {
                            'hhad': {
                                'h': str(odds_item['h']),
                                'd': str(odds_item['d']),
                                'a': str(odds_item['a'])
                            },
                            'type': 'hhad',
                            'goal_line': odds_item.get('goalLine', ''),
                            'update_time': f"{odds_item.get('updateDate', '')} {odds_item.get('updateTime', '')}"
                        }

            logger.debug(
                f"⚠️ Không tìm thấy dữ liệu tỷ lệ hợp lệ: "
                f"{match_data.get('homeTeamAbbName', '')} vs {match_data.get('awayTeamAbbName', '')}"
            )
            return None

        except Exception as e:
            logger.warning(f"⚠️ Trích xuất tỷ lệ thất bại: {e}")
            return None

    def clean_team_name(self, team_name: str) -> str:
        """
        Làm sạch tên đội bóng.

        Args:
            team_name: tên đội gốc

        Returns:
            tên đội sau khi làm sạch
        """
        if not team_name:
            return ""

        # Loại bỏ tiền tố/hậu tố và thông tin phụ phổ biến
        cleaned = team_name.strip()

        import re
        cleaned = re.sub(r'\[.*?\]', '', cleaned)  # Loại bỏ nội dung trong []
        cleaned = re.sub(r'\(.*?\)', '', cleaned)  # Loại bỏ nội dung trong ()

        return cleaned.strip()

    def validate_match(self, match: Dict[str, Any]) -> bool:
        """Kiểm tra tính đầy đủ và hợp lệ của dữ liệu trận đấu."""
        required_fields = ['match_id', 'home_team', 'away_team', 'league_name', 'odds']

        # Kiểm tra trường bắt buộc
        for field in required_fields:
            if not match.get(field):
                logger.debug(f"❌ Thiếu trường bắt buộc: {field}")
                return False

        # Kiểm tra dữ liệu tỷ lệ cược
        odds = match.get('odds', {})
        if 'hhad' not in odds:
            logger.debug("❌ Thiếu dữ liệu tỷ lệ cược")
            return False

        hhad = odds['hhad']
        if not all(key in hhad and hhad[key] for key in ['h', 'd', 'a']):
            logger.debug("❌ Dữ liệu tỷ lệ cược không đầy đủ")
            return False

        # Kiểm tra giá trị tỷ lệ cược
        try:
            for odds_value in [hhad['h'], hhad['d'], hhad['a']]:
                float_val = float(odds_value)
                if float_val < 1.01 or float_val > 99.99:
                    logger.debug(f"❌ Giá trị tỷ lệ bất thường: {odds_value}")
                    return False
        except (ValueError, TypeError):
            logger.debug("❌ Định dạng giá trị tỷ lệ không hợp lệ")
            return False

        return True

    def filter_matches_by_date(self, matches: List[Dict[str, Any]], days_ahead: int = 3) -> List[Dict[str, Any]]:
        """Lọc trận theo khoảng ngày phía trước."""
        if not matches:
            return []

        try:
            current_date = datetime.now().date()
            end_date = current_date + timedelta(days=days_ahead)

            filtered_matches = []
            for match in matches:
                match_date_str = match.get('match_date', '')
                if match_date_str:
                    try:
                        match_date = datetime.strptime(match_date_str, '%Y-%m-%d').date()
                        if current_date <= match_date <= end_date:
                            filtered_matches.append(match)
                    except ValueError:
                        logger.warning(f"⚠️ Sai định dạng ngày: {match_date_str}")
                        continue

            logger.info(f"📅 Lọc theo ngày: {len(matches)} -> {len(filtered_matches)} trận ({days_ahead} ngày tới)")
            return filtered_matches

        except Exception as e:
            logger.error(f"❌ Lọc trận thất bại: {e}")
            return matches

    def get_formatted_matches(self, days_ahead: int = 3) -> List[Dict[str, Any]]:
        """Lấy dữ liệu trận đã chuẩn hóa, ưu tiên tỷ lệ HAD không chấp."""
        try:
            # Trước tiên thử lấy HAD (1X2 không chấp)
            logger.info("🎯 Đang thử lấy dữ liệu HAD (1X2 không chấp)...")
            had_data = None
            try:
                had_data = self.fetch_lottery_data(pool_code="had")
                if had_data:
                    logger.info("✅ Lấy dữ liệu HAD thành công")
            except Exception as e:
                logger.warning(f"⚠️ Lấy dữ liệu HAD thất bại: {e}")

            # Lấy HHAD (1X2 có chấp) làm dữ liệu bổ sung
            logger.info("🎯 Đang lấy dữ liệu HHAD (1X2 có chấp) làm dự phòng...")
            hhad_data = self.fetch_lottery_data(pool_code="hhad")
            if not hhad_data:
                raise Exception("Không thể lấy bất kỳ dữ liệu API nào")

            # Phân tích dữ liệu, ưu tiên HAD rồi dùng HHAD bổ sung
            matches = self.parse_match_data_with_odds_priority(had_data, hhad_data)
            if not matches:
                raise Exception("Không phân tích được trận hợp lệ nào")

            filtered_matches = self.filter_matches_by_date(matches, days_ahead)
            if not filtered_matches:
                raise Exception(f"Không có trận khả dụng trong {days_ahead} ngày tới")

            # Thống kê loại tỷ lệ
            had_count = sum(1 for m in filtered_matches if m.get('odds', {}).get('type') == 'had')
            hhad_count = sum(1 for m in filtered_matches if m.get('odds', {}).get('type') == 'hhad')
            logger.info(f"📊 Thống kê tỷ lệ: không chấp {had_count} trận, có chấp {hhad_count} trận")
            logger.info(f"✅ Lấy thành công {len(filtered_matches)} trận")
            return filtered_matches

        except Exception as e:
            logger.error(f"❌ Lấy dữ liệu trận đã chuẩn hóa thất bại: {e}")
            raise Exception(f"Tạm thời không thể lấy dữ liệu xổ số thể thao: {e}")

    def parse_match_data_with_odds_priority(self, had_data: Optional[Dict[str, Any]], hhad_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Phân tích dữ liệu trận, ưu tiên HAD và dùng HHAD làm bổ sung."""
        matches = []

        # Tạo bảng ánh xạ tỷ lệ HAD theo matchId
        had_odds_map = {}
        if had_data and 'value' in had_data:
            for date_info in had_data['value'].get('matchInfoList', []):
                for match_data in date_info.get('subMatchList', []):
                    match_id = match_data.get('matchId', '')
                    if match_id and 'had' in match_data and match_data['had']:
                        had_odds = match_data['had']
                        if all(key in had_odds for key in ['h', 'd', 'a']):
                            had_odds_map[match_id] = {
                                'hhad': {  # Giữ tên key hhad để tương thích
                                    'h': str(had_odds['h']),
                                    'd': str(had_odds['d']),
                                    'a': str(had_odds['a'])
                                },
                                'type': 'had',
                                'update_time': f"{had_odds.get('updateDate', '')} {had_odds.get('updateTime', '')}"
                            }

        # Xử lý HHAD và ưu tiên tỷ lệ HAD nếu có
        try:
            value = hhad_data.get('value', {})
            match_info_list = value.get('matchInfoList', [])

            logger.info(f"📊 Bắt đầu phân tích dữ liệu trận (ánh xạ HAD: {len(had_odds_map)} trận)")

            for date_info in match_info_list:
                sub_match_list = date_info.get('subMatchList', [])
                business_date = date_info.get('businessDate', '')

                logger.info(f"📅 Xử lý {len(sub_match_list)} trận ngày {business_date}")

                for match_data in sub_match_list:
                    try:
                        match_id = match_data.get('matchId', '')

                        match_info = {
                            'match_id': f"lottery_{match_id}",
                            'home_team': self.clean_team_name(match_data.get('homeTeamAllName', match_data.get('homeTeamAbbName', ''))),
                            'away_team': self.clean_team_name(match_data.get('awayTeamAllName', match_data.get('awayTeamAbbName', ''))),
                            'league_name': match_data.get('leagueAbbName', match_data.get('leagueAllName', '')),
                            'match_time': f"{match_data.get('matchDate', '')} {match_data.get('matchTime', '')}",
                            'match_date': match_data.get('matchDate', ''),
                            'match_num': match_data.get('matchNumStr', ''),
                            'status': match_data.get('matchStatus', 'Unknown'),
                            'source': 'china_lottery'
                        }

                        # Ưu tiên tỷ lệ HAD
                        odds_info = None
                        if match_id in had_odds_map:
                            odds_info = had_odds_map[match_id]
                            logger.debug(f"✅ Dùng tỷ lệ HAD: {match_info['home_team']} vs {match_info['away_team']}")
                        else:
                            # Dùng HHAD làm dự phòng
                            odds_info = self.extract_odds(match_data)
                            if odds_info and odds_info.get('type') == 'hhad':
                                logger.debug(f"⚠️ Dùng tỷ lệ HHAD: {match_info['home_team']} vs {match_info['away_team']}")

                        if odds_info:
                            match_info['odds'] = odds_info
                            if self.validate_match(match_info):
                                matches.append(match_info)
                            else:
                                logger.warning(f"⚠️ Dữ liệu trận không đầy đủ, bỏ qua: {match_info}")
                        else:
                            logger.warning(
                                f"⚠️ Không lấy được tỷ lệ nào, bỏ qua trận: "
                                f"{match_data.get('homeTeamAbbName', '')} vs {match_data.get('awayTeamAbbName', '')}"
                            )

                    except Exception as e:
                        logger.warning(f"⚠️ Phân tích một trận thất bại: {e}")
                        continue

            logger.info(f"📈 Phân tích thành công {len(matches)} trận hợp lệ")
            return matches

        except Exception as e:
            logger.error(f"❌ Phân tích dữ liệu trận thất bại: {e}")
            raise Exception(f"Lỗi phân tích dữ liệu: {e}")


def main():
    """Hàm kiểm tra."""
    spider = ChinaLotterySpider()

    try:
        print("🕷️ Kiểm tra crawler Xổ số Thể thao Trung Quốc...")
        matches = spider.get_formatted_matches(days_ahead=7)

        print(f"\n✅ Lấy thành công {len(matches)} trận")

        # Hiển thị 3 trận đầu
        for i, match in enumerate(matches[:3]):
            print(f"\nTrận {i+1}:")
            print(f"  {match['match_num']}: {match['home_team']} vs {match['away_team']}")
            print(f"  Giải: {match['league_name']}")
            print(f"  Thời gian: {match['match_time']}")
            if 'hhad' in match['odds']:
                odds = match['odds']['hhad']
                odds_type = match['odds'].get('type', 'hhad')
                type_label = "Không chấp" if odds_type == 'had' else "Có chấp"
                print(f"  Tỷ lệ ({type_label}): Chủ nhà {odds['h']} Hòa {odds['d']} Khách {odds['a']}")

    except Exception as e:
        print(f"❌ Kiểm tra thất bại: {e}")


if __name__ == "__main__":
    main()
