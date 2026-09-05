import pandas as pd
import numpy as np
from scipy.stats import poisson
import argparse
import os
import json
from itertools import product


class ParlayPredictor:
    """Trình dự đoán tổ hợp nhiều trận bóng đá."""

    def __init__(self):
        """Khởi tạo trình dự đoán."""
        self.leagues = {
            "PL": "Ngoại hạng Anh",
            "PD": "La Liga",
            "SA": "Serie A",
            "BL1": "Bundesliga",
            "FL1": "Ligue 1"
        }

        # Tải toàn bộ dữ liệu đặc trưng đang có
        self.features = {}
        for league_code in self.leagues.keys():
            file_path = f"data/features_{league_code}2024.csv"
            if os.path.exists(file_path):
                self.features[league_code] = pd.read_csv(file_path, index_col=0)
                print(f"Đã tải dữ liệu {self.leagues[league_code]}")

        if not self.features:
            print("Lỗi: không tìm thấy tệp dữ liệu của bất kỳ giải đấu nào")

    def get_team_features(self, team_name, league_code=None):
        """Lấy dữ liệu đặc trưng của đội bóng."""
        if league_code and league_code in self.features:
            if team_name in self.features[league_code].index:
                return self.features[league_code].loc[team_name]

        for code, df in self.features.items():
            if team_name in df.index:
                return df.loc[team_name]

        print(f"Cảnh báo: không tìm thấy dữ liệu của đội '{team_name}'")
        return None

    def predict_match(self, home_team, away_team, home_odds, draw_odds, away_odds, league_code=None):
        """Dự đoán một trận đấu."""
        home_features = self.get_team_features(home_team, league_code)
        away_features = self.get_team_features(away_team, league_code)

        if home_features is None or away_features is None:
            return None

        # Tính số bàn thắng kỳ vọng
        home_expected_goals = (home_features['home_goals_scored_avg'] * 0.7 +
                              away_features['away_goals_conceded_avg'] * 0.3) * 1.1

        away_expected_goals = (away_features['away_goals_scored_avg'] * 0.7 +
                              home_features['home_goals_conceded_avg'] * 0.3) * 0.9

        # Dùng phân phối Poisson để tính xác suất tỷ số
        max_goals = 5
        score_probs = {}
        for i in range(max_goals + 1):
            for j in range(max_goals + 1):
                score_probs[(i, j)] = (poisson.pmf(i, home_expected_goals) *
                                      poisson.pmf(j, away_expected_goals))

        # Tính xác suất 1X2
        home_win_prob = sum(prob for (i, j), prob in score_probs.items() if i > j)
        draw_prob = sum(prob for (i, j), prob in score_probs.items() if i == j)
        away_win_prob = sum(prob for (i, j), prob in score_probs.items() if i < j)

        # H/D/A là mã kỹ thuật, giữ nguyên để không thay đổi logic
        result_probs = {'H': home_win_prob, 'D': draw_prob, 'A': away_win_prob}
        ev_home = result_probs['H'] * home_odds - 1
        ev_draw = result_probs['D'] * draw_odds - 1
        ev_away = result_probs['A'] * away_odds - 1

        best_bet = max(
            ("H", ev_home, home_odds, home_win_prob),
            ("D", ev_draw, draw_odds, draw_prob),
            ("A", ev_away, away_odds, away_win_prob),
            key=lambda x: x[1]
        )

        all_bets = [
            ("H", ev_home, home_odds, home_win_prob),
            ("D", ev_draw, draw_odds, draw_prob),
            ("A", ev_away, away_odds, away_win_prob)
        ]
        all_bets.sort(key=lambda x: x[1], reverse=True)

        return {
            'home_team': home_team,
            'away_team': away_team,
            'home_win_prob': home_win_prob,
            'draw_prob': draw_prob,
            'away_win_prob': away_win_prob,
            'home_odds': home_odds,
            'draw_odds': draw_odds,
            'away_odds': away_odds,
            'best_bet': best_bet[0],
            'best_ev': best_bet[1],
            'best_odds': best_bet[2],
            'best_prob': best_bet[3],
            'all_bets': all_bets
        }

    def predict_parlay(self, matches):
        """Dự đoán tổ hợp nhiều trận."""
        predictions = []
        all_combinations = []

        # Dự đoán từng trận
        for match in matches:
            home_team = match['home_team']
            away_team = match['away_team']
            home_odds = match['home_odds']
            draw_odds = match['draw_odds']
            away_odds = match['away_odds']
            league_code = match.get('league_code')

            pred = self.predict_match(home_team, away_team, home_odds, draw_odds, away_odds, league_code)
            if pred:
                predictions.append(pred)

        if not predictions:
            return None

        best_parlay = {
            'selections': [],
            'total_odds': 1.0,
            'total_prob': 1.0,
            'expected_value': 0.0
        }

        for pred in predictions:
            best_bet = pred['best_bet']
            best_odds = pred['best_odds']
            best_prob = pred['best_prob']

            best_parlay['selections'].append({
                'match': f"{pred['home_team']} vs {pred['away_team']}",
                'pick': best_bet,
                'odds': best_odds,
                'prob': best_prob
            })

            best_parlay['total_odds'] *= best_odds
            best_parlay['total_prob'] *= best_prob

        best_parlay['expected_value'] = best_parlay['total_odds'] * best_parlay['total_prob'] - 1

        # Tính tất cả tổ hợp có thể có
        all_bets = [pred['all_bets'] for pred in predictions]
        for combo in product(*all_bets):
            parlay = {
                'selections': [],
                'total_odds': 1.0,
                'total_prob': 1.0
            }

            for i, (bet_type, ev, odds, prob) in enumerate(combo):
                pred = predictions[i]
                parlay['selections'].append({
                    'match': f"{pred['home_team']} vs {pred['away_team']}",
                    'pick': bet_type,
                    'odds': odds,
                    'prob': prob
                })

                parlay['total_odds'] *= odds
                parlay['total_prob'] *= prob

            parlay['expected_value'] = parlay['total_odds'] * parlay['total_prob'] - 1
            all_combinations.append(parlay)

        all_combinations.sort(key=lambda x: x['expected_value'], reverse=True)

        return {
            'individual_predictions': predictions,
            'best_parlay': best_parlay,
            'all_combinations': all_combinations[:10]
        }


def format_result(result_type):
    """Đổi mã kết quả sang tên hiển thị tiếng Việt."""
    if result_type == 'H':
        return 'Chủ nhà thắng'
    elif result_type == 'D':
        return 'Hòa'
    elif result_type == 'A':
        return 'Khách thắng'
    return result_type


def main():
    parser = argparse.ArgumentParser(description='Công cụ dự đoán tổ hợp nhiều trận bóng đá')
    parser.add_argument('--matches', type=str, help='Tệp JSON chứa thông tin trận đấu')
    args = parser.parse_args()

    predictor = ParlayPredictor()

    if args.matches and os.path.exists(args.matches):
        with open(args.matches, 'r', encoding='utf-8') as f:
            matches = json.load(f)
    else:
        matches = []
        print("\nCông cụ dự đoán tổ hợp nhiều trận bóng đá")
        print("=" * 50)

        num_matches = int(input("Nhập số trận cần dự đoán: "))

        for i in range(num_matches):
            print(f"\nTrận #{i+1}")
            league = input("Mã giải (PL, PD, SA...; để trống để tự nhận diện): ")
            home_team = input("Tên đội chủ nhà: ")
            away_team = input("Tên đội khách: ")

            try:
                home_odds = float(input("Tỷ lệ chủ nhà thắng: "))
                draw_odds = float(input("Tỷ lệ hòa: "))
                away_odds = float(input("Tỷ lệ khách thắng: "))
            except ValueError:
                print("Tỷ lệ cược phải là số!")
                continue

            match = {
                'home_team': home_team,
                'away_team': away_team,
                'home_odds': home_odds,
                'draw_odds': draw_odds,
                'away_odds': away_odds
            }

            if league:
                match['league_code'] = league

            matches.append(match)

    result = predictor.predict_parlay(matches)

    if not result:
        print("Không thể tạo dự đoán. Hãy kiểm tra lại tên đội và dữ liệu đầu vào")
        return

    print("\nKết quả dự đoán từng trận:")
    print("=" * 50)

    for i, pred in enumerate(result['individual_predictions']):
        print(f"\nTrận #{i+1}: {pred['home_team']} vs {pred['away_team']}")
        print(f"Xác suất chủ nhà thắng: {pred['home_win_prob']:.2f} ({pred['home_win_prob']*100:.1f}%), tỷ lệ: {pred['home_odds']}")
        print(f"Xác suất hòa: {pred['draw_prob']:.2f} ({pred['draw_prob']*100:.1f}%), tỷ lệ: {pred['draw_odds']}")
        print(f"Xác suất khách thắng: {pred['away_win_prob']:.2f} ({pred['away_win_prob']*100:.1f}%), tỷ lệ: {pred['away_odds']}")

        print("Các lựa chọn, sắp xếp theo giá trị kỳ vọng:")
        for bet_type, ev, odds, prob in pred['all_bets']:
            result_name = format_result(bet_type)
            print(f"  {result_name}: EV={ev:.4f}, tỷ lệ={odds}, xác suất={prob:.2f}")

        print(f"Lựa chọn có EV cao nhất: {format_result(pred['best_bet'])}, EV: {pred['best_ev']:.4f}")

    print("\nTổ hợp tốt nhất:")
    print("=" * 50)
    best = result['best_parlay']
    print(f"Tổng tỷ lệ: {best['total_odds']:.2f}")
    print(f"Xác suất: {best['total_prob']:.4f} ({best['total_prob']*100:.2f}%)")
    print(f"Giá trị kỳ vọng: {best['expected_value']:.4f}")

    print("\nCác lựa chọn:")
    for i, sel in enumerate(best['selections']):
        print(f"{i+1}. {sel['match']}: {format_result(sel['pick'])} (tỷ lệ: {sel['odds']}, xác suất: {sel['prob']:.2f})")

    print("\nCác tổ hợp có giá trị cao khác:")
    print("=" * 50)

    for i, combo in enumerate(result['all_combinations'][:5]):
        if i == 0:
            continue

        print(f"\nTổ hợp #{i}:")
        print(f"Tổng tỷ lệ: {combo['total_odds']:.2f}")
        print(f"Xác suất: {combo['total_prob']:.4f} ({combo['total_prob']*100:.2f}%)")
        print(f"Giá trị kỳ vọng: {combo['expected_value']:.4f}")

        print("Lựa chọn:")
        for j, sel in enumerate(combo['selections']):
            print(f"{j+1}. {sel['match']}: {format_result(sel['pick'])} (tỷ lệ: {sel['odds']}, xác suất: {sel['prob']:.2f})")


if __name__ == "__main__":
    main()
