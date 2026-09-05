import pandas as pd
import numpy as np
import os
from datetime import datetime
from config import *


def process_match_data(matches_data):
    """Xử lý dữ liệu trận đấu."""
    if not matches_data or 'matches' not in matches_data:
        print("Dữ liệu trận đấu không hợp lệ")
        return None

    processed_data = []

    for match in matches_data['matches']:
        match_info = {
            'match_id': match['id'],
            'home_team': match['homeTeam']['name'],
            'away_team': match['awayTeam']['name'],
            'competition': match['competition']['name'],
            'match_date': match['utcDate'],
            'status': match['status']
        }

        # Thêm dữ liệu tỷ số nếu trận đã kết thúc
        if match['status'] == 'FINISHED':
            match_info['home_score'] = match['score']['fullTime']['homeTeam'] if 'homeTeam' in match['score']['fullTime'] else match['score']['fullTime']['home']
            match_info['away_score'] = match['score']['fullTime']['awayTeam'] if 'awayTeam' in match['score']['fullTime'] else match['score']['fullTime']['away']

            # Tỷ số hiệp 1
            if 'halfTime' in match['score'] and match['score']['halfTime'] is not None:
                match_info['half_time_home'] = match['score']['halfTime']['homeTeam'] if 'homeTeam' in match['score']['halfTime'] else match['score']['halfTime']['home']
                match_info['half_time_away'] = match['score']['halfTime']['awayTeam'] if 'awayTeam' in match['score']['halfTime'] else match['score']['halfTime']['away']
            else:
                match_info['half_time_home'] = None
                match_info['half_time_away'] = None

            # Tính kết quả 1X2; H/D/A là mã kỹ thuật nội bộ
            if match_info['home_score'] > match_info['away_score']:
                match_info['result'] = 'H'  # Chủ nhà thắng
            elif match_info['home_score'] < match_info['away_score']:
                match_info['result'] = 'A'  # Khách thắng
            else:
                match_info['result'] = 'D'  # Hòa

            # Tính kết quả hiệp 1/cả trận
            if 'half_time_home' in match_info and match_info['half_time_home'] is not None:
                if match_info['half_time_home'] > match_info['half_time_away']:
                    half_result = 'H'
                elif match_info['half_time_home'] < match_info['half_time_away']:
                    half_result = 'A'
                else:
                    half_result = 'D'

                match_info['half_full_result'] = f"{half_result}/{match_info['result']}"

        processed_data.append(match_info)

    df = pd.DataFrame(processed_data)

    # Chuyển định dạng ngày giờ
    df['match_date'] = pd.to_datetime(df['match_date'])

    # Lưu dữ liệu đã xử lý
    ensure_data_dir()
    df.to_csv(MATCHES_DATA_FILE, index=False)
    print(f"Đã lưu dữ liệu trận đấu đã xử lý vào {MATCHES_DATA_FILE}")

    return df


def process_odds_data(odds_data):
    """Xử lý dữ liệu tỷ lệ cược."""
    if not odds_data:
        print("Dữ liệu tỷ lệ cược không hợp lệ")
        return None

    processed_data = []

    for match in odds_data:
        # Thông tin cơ bản của trận đấu
        match_info = {
            'match_id': match['id'],
            'home_team': match['home_team'],
            'away_team': match['away_team'],
            'commence_time': match['commence_time'],
            'sport': match['sport_key']
        }

        # Xử lý tỷ lệ của từng nhà cái
        for bookmaker in match['bookmakers']:
            bookmaker_name = bookmaker['key']

            for market in bookmaker['markets']:
                market_type = market['key']

                for outcome in market['outcomes']:
                    outcome_name = outcome['name']
                    price = outcome['price']

                    # Tạo bản ghi tỷ lệ cược
                    odds_record = match_info.copy()
                    odds_record['bookmaker'] = bookmaker_name
                    odds_record['market'] = market_type
                    odds_record['outcome'] = outcome_name
                    odds_record['price'] = price

                    processed_data.append(odds_record)

    df = pd.DataFrame(processed_data)

    # Chuyển định dạng ngày giờ
    df['commence_time'] = pd.to_datetime(df['commence_time'])

    # Lưu dữ liệu đã xử lý
    ensure_data_dir()
    df.to_csv(ODDS_DATA_FILE, index=False)
    print(f"Đã lưu dữ liệu tỷ lệ cược đã xử lý vào {ODDS_DATA_FILE}")

    return df


def ensure_data_dir():
    """Bảo đảm thư mục dữ liệu tồn tại."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)


def load_or_process_data(raw_data=None):
    """Tải hoặc xử lý dữ liệu."""
    if raw_data:
        matches_df = process_match_data(raw_data['matches'])
        odds_df = process_odds_data(raw_data['odds'])
    else:
        # Thử tải dữ liệu từ tệp
        try:
            matches_df = pd.read_csv(MATCHES_DATA_FILE)
            matches_df['match_date'] = pd.to_datetime(matches_df['match_date'])
            print(f"Đã tải dữ liệu trận đấu từ {MATCHES_DATA_FILE}")
        except:
            print(f"Không thể tải {MATCHES_DATA_FILE}; hãy thu thập và xử lý dữ liệu trước")
            matches_df = None

        try:
            odds_df = pd.read_csv(ODDS_DATA_FILE)
            odds_df['commence_time'] = pd.to_datetime(odds_df['commence_time'])
            print(f"Đã tải dữ liệu tỷ lệ cược từ {ODDS_DATA_FILE}")
        except:
            print(f"Không thể tải {ODDS_DATA_FILE}; hãy thu thập và xử lý dữ liệu trước")
            odds_df = None

    return {
        "matches": matches_df,
        "odds": odds_df
    }


if __name__ == "__main__":
    # Kiểm tra chức năng xử lý dữ liệu
    from data_collection import collect_all_data

    raw_data = collect_all_data()
    processed_data = load_or_process_data(raw_data)
    print("Đã hoàn tất xử lý dữ liệu")
