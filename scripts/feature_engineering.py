import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from config import *


def create_team_features(matches_df, lookback_matches=10):
    """Tạo đặc trưng cho từng đội bóng."""
    if matches_df is None or matches_df.empty:
        print("Dữ liệu trận đấu không hợp lệ")
        return None

    # Bảo đảm dữ liệu được sắp xếp theo ngày
    if 'match_date' in matches_df.columns:
        matches_df = matches_df.sort_values('match_date')

    # Chỉ sử dụng các trận đã kết thúc
    completed_matches = matches_df[matches_df['status'] == 'FINISHED'].copy()

    # Lấy toàn bộ đội bóng và chuyển thành danh sách
    all_teams = list(set(completed_matches['home_team'].unique()) | set(completed_matches['away_team'].unique()))

    # Tạo DataFrame đặc trưng
    features = pd.DataFrame(index=all_teams)

    # Tính đặc trưng của từng đội
    for team in all_teams:
        # Lấy tất cả trận của đội
        team_home_matches = completed_matches[completed_matches['home_team'] == team].copy()
        team_away_matches = completed_matches[completed_matches['away_team'] == team].copy()

        # Các trận gần nhất
        recent_home_matches = team_home_matches.tail(lookback_matches)
        recent_away_matches = team_away_matches.tail(lookback_matches)

        # Tính đặc trưng sân nhà
        if not recent_home_matches.empty:
            features.loc[team, 'home_matches_played'] = len(recent_home_matches)
            features.loc[team, 'home_goals_scored_avg'] = recent_home_matches['home_score'].mean()
            features.loc[team, 'home_goals_conceded_avg'] = recent_home_matches['away_score'].mean()
            features.loc[team, 'home_win_rate'] = (recent_home_matches['result'] == 'H').mean()
            features.loc[team, 'home_draw_rate'] = (recent_home_matches['result'] == 'D').mean()
            features.loc[team, 'home_loss_rate'] = (recent_home_matches['result'] == 'A').mean()
        else:
            features.loc[team, 'home_matches_played'] = 0
            features.loc[team, 'home_goals_scored_avg'] = 0
            features.loc[team, 'home_goals_conceded_avg'] = 0
            features.loc[team, 'home_win_rate'] = 0
            features.loc[team, 'home_draw_rate'] = 0
            features.loc[team, 'home_loss_rate'] = 0

        # Tính đặc trưng sân khách
        if not recent_away_matches.empty:
            features.loc[team, 'away_matches_played'] = len(recent_away_matches)
            features.loc[team, 'away_goals_scored_avg'] = recent_away_matches['away_score'].mean()
            features.loc[team, 'away_goals_conceded_avg'] = recent_away_matches['home_score'].mean()
            features.loc[team, 'away_win_rate'] = (recent_away_matches['result'] == 'A').mean()
            features.loc[team, 'away_draw_rate'] = (recent_away_matches['result'] == 'D').mean()
            features.loc[team, 'away_loss_rate'] = (recent_away_matches['result'] == 'H').mean()
        else:
            features.loc[team, 'away_matches_played'] = 0
            features.loc[team, 'away_goals_scored_avg'] = 0
            features.loc[team, 'away_goals_conceded_avg'] = 0
            features.loc[team, 'away_win_rate'] = 0
            features.loc[team, 'away_draw_rate'] = 0
            features.loc[team, 'away_loss_rate'] = 0

        # Tính đặc trưng tổng thể
        all_team_matches = pd.concat([
            team_home_matches[['match_date', 'home_score', 'away_score', 'result']].rename(
                columns={'home_score': 'team_score', 'away_score': 'opponent_score'}
            ).assign(is_home=True),
            team_away_matches[['match_date', 'home_score', 'away_score', 'result']].rename(
                columns={'away_score': 'team_score', 'home_score': 'opponent_score'}
            ).assign(is_home=False)
        ]).sort_values('match_date')

        recent_matches = all_team_matches.tail(lookback_matches)

        if not recent_matches.empty:
            # Tính hiệu suất gần đây
            features.loc[team, 'total_matches_played'] = len(recent_matches)
            features.loc[team, 'total_goals_scored_avg'] = recent_matches['team_score'].mean()
            features.loc[team, 'total_goals_conceded_avg'] = recent_matches['opponent_score'].mean()

            # Tính tỷ lệ thắng
            home_wins = sum((recent_matches['is_home'] == True) & (recent_matches['result'] == 'H'))
            away_wins = sum((recent_matches['is_home'] == False) & (recent_matches['result'] == 'A'))
            total_wins = home_wins + away_wins

            features.loc[team, 'overall_win_rate'] = total_wins / len(recent_matches)

            # Tính phong độ 5 trận gần nhất
            last_5_matches = recent_matches.tail(5)
            if len(last_5_matches) > 0:
                points = 0
                for _, match in last_5_matches.iterrows():
                    if (match['is_home'] and match['result'] == 'H') or (not match['is_home'] and match['result'] == 'A'):
                        points += 3  # Thắng
                    elif match['result'] == 'D':
                        points += 1  # Hòa

                features.loc[team, 'recent_form'] = points / (len(last_5_matches) * 3)  # Chuẩn hóa về 0-1
            else:
                features.loc[team, 'recent_form'] = 0
        else:
            features.loc[team, 'total_matches_played'] = 0
            features.loc[team, 'total_goals_scored_avg'] = 0
            features.loc[team, 'total_goals_conceded_avg'] = 0
            features.loc[team, 'overall_win_rate'] = 0
            features.loc[team, 'recent_form'] = 0

    # Lưu dữ liệu đặc trưng
    features.to_csv(FEATURES_DATA_FILE)
    print(f"Đã lưu dữ liệu đặc trưng đội bóng vào {FEATURES_DATA_FILE}")

    return features


def prepare_match_features(matches_df, features_df):
    """Chuẩn bị đặc trưng cho từng trận đấu."""
    if matches_df is None or features_df is None:
        print("Dữ liệu không hợp lệ")
        return None

    match_features = []

    for _, match in matches_df.iterrows():
        home_team = match['home_team']
        away_team = match['away_team']

        # Kiểm tra cả hai đội đều có dữ liệu đặc trưng
        if home_team not in features_df.index or away_team not in features_df.index:
            continue

        # Trích xuất đặc trưng
        match_data = {
            'match_id': match['match_id'],
            'home_team': home_team,
            'away_team': away_team,
            'match_date': match['match_date'],
            'status': match['status']
        }

        # Thêm đặc trưng đội chủ nhà
        for col in features_df.columns:
            match_data[f'home_{col}'] = features_df.loc[home_team, col]

        # Thêm đặc trưng đội khách
        for col in features_df.columns:
            match_data[f'away_{col}'] = features_df.loc[away_team, col]

        # Nếu trận đã kết thúc, thêm kết quả
        if match['status'] == 'FINISHED':
            match_data['home_score'] = match['home_score']
            match_data['away_score'] = match['away_score']
            match_data['result'] = match['result']
            if 'half_time_home' in match and 'half_time_away' in match:
                match_data['half_time_home'] = match['half_time_home']
                match_data['half_time_away'] = match['half_time_away']
                if 'half_full_result' in match:
                    match_data['half_full_result'] = match['half_full_result']

        match_features.append(match_data)

    return pd.DataFrame(match_features)


def load_or_create_features(matches_df=None):
    """Tải hoặc tạo dữ liệu đặc trưng."""
    if matches_df is not None:
        features_df = create_team_features(matches_df)
    else:
        # Thử tải từ tệp
        try:
            features_df = pd.read_csv(FEATURES_DATA_FILE, index_col=0)
            print(f"Đã tải dữ liệu đặc trưng từ {FEATURES_DATA_FILE}")
        except:
            print(f"Không thể tải {FEATURES_DATA_FILE}; hãy tạo dữ liệu đặc trưng trước")
            features_df = None

    return features_df


if __name__ == "__main__":
    # Kiểm tra chức năng feature engineering
    from data_processing import load_or_process_data

    processed_data = load_or_process_data()
    features_df = load_or_create_features(processed_data['matches'])

    if features_df is not None:
        print("Đã hoàn tất feature engineering")
        print(f"Đã tạo đặc trưng cho {len(features_df)} đội")
