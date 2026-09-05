import os
import requests
import json
import pandas as pd
from datetime import datetime
import time
from config import *


def ensure_data_dir():
    """Bảo đảm thư mục dữ liệu tồn tại."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)


def fetch_matches_data(league_id=DEFAULT_LEAGUE, season=DEFAULT_SEASON):
    """Lấy dữ liệu trận đấu từ Football-Data.org."""
    url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{league_id}/matches?season={season}"
    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}

    print(f"Đang lấy dữ liệu trận của giải {league_id}, mùa {season}...")
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        # Lưu dữ liệu gốc
        ensure_data_dir()
        with open(f"{DATA_DIR}/raw_matches_{league_id}_{season}.json", "w") as f:
            json.dump(data, f)
        print(f"Đã lấy {len(data['matches'])} trận")
        return data
    else:
        print(f"Lấy dữ liệu trận thất bại: {response.status_code}")
        print(response.text)
        return None


def fetch_odds_data(sport="soccer"):
    """Lấy dữ liệu tỷ lệ cược từ Odds API."""
    url = f"{ODDS_API_BASE_URL}/sports/{sport}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": "uk,eu,us",
        "markets": "h2h,spreads,totals",
        "oddsFormat": "decimal"
    }

    print("Đang lấy dữ liệu tỷ lệ cược mới nhất...")
    response = requests.get(url, params=params)

    if response.status_code == 200:
        data = response.json()
        # Lưu dữ liệu gốc
        ensure_data_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        with open(f"{DATA_DIR}/raw_odds_{timestamp}.json", "w") as f:
            json.dump(data, f)
        print(f"Đã lấy tỷ lệ cược của {len(data)} trận")
        return data
    else:
        print(f"Lấy dữ liệu tỷ lệ cược thất bại: {response.status_code}")
        print(response.text)
        return None


def fetch_team_data(league_id=DEFAULT_LEAGUE):
    """Lấy thông tin chi tiết của các đội bóng."""
    url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{league_id}/teams"
    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}

    print(f"Đang lấy dữ liệu đội bóng của giải {league_id}...")
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        # Lưu dữ liệu gốc
        ensure_data_dir()
        with open(f"{DATA_DIR}/raw_teams_{league_id}.json", "w") as f:
            json.dump(data, f)
        print(f"Đã lấy dữ liệu của {len(data['teams'])} đội")
        return data
    else:
        print(f"Lấy dữ liệu đội bóng thất bại: {response.status_code}")
        print(response.text)
        return None


def collect_all_data():
    """Thu thập toàn bộ dữ liệu cần thiết."""
    matches_data = fetch_matches_data()
    odds_data = fetch_odds_data()
    team_data = fetch_team_data()

    return {
        "matches": matches_data,
        "odds": odds_data,
        "teams": team_data
    }


if __name__ == "__main__":
    # Kiểm tra chức năng thu thập dữ liệu
    data = collect_all_data()
    print("Đã hoàn tất thu thập dữ liệu")
