import pandas as pd
import numpy as np
from scipy.stats import poisson
import argparse


def predict_match(home_team, away_team, home_odds, draw_odds, away_odds):
    """
    Dự đoán kết quả trận đấu giữa hai đội.

    Tham số:
        home_team: tên đội chủ nhà
        away_team: tên đội khách
        home_odds: tỷ lệ chủ nhà thắng
        draw_odds: tỷ lệ hòa
        away_odds: tỷ lệ khách thắng
    """
    try:
        # Tải dữ liệu đặc trưng
        features_df = pd.read_csv('data/features.csv', index_col=0)

        # Kiểm tra dữ liệu đội bóng
        if home_team not in features_df.index:
            print(f"Lỗi: không tìm thấy dữ liệu của đội '{home_team}'")
            return

        if away_team not in features_df.index:
            print(f"Lỗi: không tìm thấy dữ liệu của đội '{away_team}'")
            return

        # Lấy đặc trưng của hai đội
        home_features = features_df.loc[home_team]
        away_features = features_df.loc[away_team]

        print(f"\nDự đoán trận {home_team} vs {away_team}")
        print("=" * 50)

        print(f"\nĐặc trưng {home_team}:")
        print(home_features)
        print(f"\nĐặc trưng {away_team}:")
        print(away_features)

        # Tính xác suất 1X2
        home_advantage = 0.1  # Lợi thế sân nhà

        home_win_prob = (home_features['home_win_rate'] * 0.4 +
                         home_features['overall_win_rate'] * 0.3 +
                         home_features['recent_form'] * 0.3 +
                         home_advantage)

        away_win_prob = (away_features['away_win_rate'] * 0.4 +
                         away_features['overall_win_rate'] * 0.3 +
                         away_features['recent_form'] * 0.3)

        draw_prob = 1 - home_win_prob - away_win_prob
        if draw_prob < 0:
            total = home_win_prob + away_win_prob
            home_win_prob = home_win_prob / total * 0.9
            away_win_prob = away_win_prob / total * 0.9
            draw_prob = 0.1

        # Chuẩn hóa xác suất
        total_prob = home_win_prob + draw_prob + away_win_prob
        home_win_prob /= total_prob
        draw_prob /= total_prob
        away_win_prob /= total_prob

        print("\nDự đoán 1X2:")
        print(f"Chủ nhà thắng ({home_team}): {home_win_prob:.2f} ({home_win_prob*100:.1f}%)")
        print(f"Hòa: {draw_prob:.2f} ({draw_prob*100:.1f}%)")
        print(f"Khách thắng ({away_team}): {away_win_prob:.2f} ({away_win_prob*100:.1f}%)")

        # Dự đoán tỷ số
        home_goals_mean = home_features['home_goals_scored_avg']
        away_goals_mean = away_features['away_goals_scored_avg']

        # Tính xác suất tỷ số
        score_probs = {}
        total_prob = 0

        for h in range(6):
            for a in range(6):
                h_prob = poisson.pmf(h, home_goals_mean)
                a_prob = poisson.pmf(a, away_goals_mean)
                score_prob = h_prob * a_prob
                score_probs[f"{h}-{a}"] = score_prob
                total_prob += score_prob

        # Chuẩn hóa xác suất
        for score in score_probs:
            score_probs[score] /= total_prob

        sorted_scores = sorted(score_probs.items(), key=lambda x: x[1], reverse=True)

        print("\nCác tỷ số có khả năng cao nhất:")
        for score, prob in sorted_scores[:5]:
            print(f"{score}: {prob:.4f} ({prob*100:.1f}%)")

        # Dự đoán bàn thắng hiệp 1
        ht_home_goals_mean = home_goals_mean * 0.45
        ht_away_goals_mean = away_goals_mean * 0.45

        # Tính xác suất tỷ số hiệp 1
        ht_score_probs = {}
        ht_total_prob = 0

        for h in range(4):
            for a in range(4):
                h_prob = poisson.pmf(h, ht_home_goals_mean)
                a_prob = poisson.pmf(a, ht_away_goals_mean)
                score_prob = h_prob * a_prob
                ht_score_probs[f"{h}-{a}"] = score_prob
                ht_total_prob += score_prob

        for score in ht_score_probs:
            ht_score_probs[score] /= ht_total_prob

        sorted_ht_scores = sorted(ht_score_probs.items(), key=lambda x: x[1], reverse=True)

        print("\nCác tỷ số hiệp 1 có khả năng cao nhất:")
        for score, prob in sorted_ht_scores[:5]:
            print(f"{score}: {prob:.4f} ({prob*100:.1f}%)")

        # Tính xác suất tổ hợp hiệp 1/cả trận
        ht_ft_probs = {}

        for ht_score, ht_prob in ht_score_probs.items():
            ht_home, ht_away = map(int, ht_score.split('-'))
            ht_result = 'H' if ht_home > ht_away else ('D' if ht_home == ht_away else 'A')

            for ft_score, ft_prob in score_probs.items():
                ft_home, ft_away = map(int, ft_score.split('-'))
                ft_result = 'H' if ft_home > ft_away else ('D' if ft_home == ft_away else 'A')

                combo = f"{ht_result}/{ft_result}"
                if combo not in ht_ft_probs:
                    ht_ft_probs[combo] = 0
                ht_ft_probs[combo] += ht_prob * ft_prob

        sorted_ht_ft = sorted(ht_ft_probs.items(), key=lambda x: x[1], reverse=True)

        print("\nCác tổ hợp hiệp 1/cả trận có khả năng cao nhất:")
        for combo, prob in sorted_ht_ft[:5]:
            print(f"{combo}: {prob:.4f} ({prob*100:.1f}%)")

        # Phân tích tỷ lệ cược. Giữ H/D/A là mã kỹ thuật nội bộ.
        odds = {
            'H': home_odds,
            'D': draw_odds,
            'A': away_odds
        }

        # Tính giá trị kỳ vọng
        result_probs = {'H': home_win_prob, 'D': draw_prob, 'A': away_win_prob}
        ev_home = result_probs['H'] * odds['H'] - (1 - result_probs['H'])
        ev_draw = result_probs['D'] * odds['D'] - (1 - result_probs['D'])
        ev_away = result_probs['A'] * odds['A'] - (1 - result_probs['A'])

        print("\nPhân tích tỷ lệ cược:")
        print(f"Chủ nhà thắng: {odds['H']}, giá trị kỳ vọng: {ev_home:.4f}")
        print(f"Hòa: {odds['D']}, giá trị kỳ vọng: {ev_draw:.4f}")
        print(f"Khách thắng: {odds['A']}, giá trị kỳ vọng: {ev_away:.4f}")

        best_bet = max(
            ("Chủ nhà thắng", ev_home, odds['H']),
            ("Hòa", ev_draw, odds['D']),
            ("Khách thắng", ev_away, odds['A']),
            key=lambda x: x[1]
        )

        if best_bet[1] > 0:
            print(f"\nLựa chọn có EV cao nhất: {best_bet[0]}, tỷ lệ: {best_bet[2]}, EV: {best_bet[1]:.4f}")
        else:
            print("\nKhông tìm thấy lựa chọn có giá trị kỳ vọng dương")

    except Exception as e:
        print(f"Đã xảy ra lỗi: {e}")


def list_teams():
    """Liệt kê toàn bộ đội bóng có dữ liệu."""
    try:
        features_df = pd.read_csv('data/features.csv', index_col=0)
        print("\nDanh sách đội bóng có sẵn:")
        for team in features_df.index:
            print(f"- {team}")
    except Exception as e:
        print(f"Không thể tải danh sách đội bóng: {e}")


def main():
    parser = argparse.ArgumentParser(description='Công cụ dự đoán trận bóng đá')
    parser.add_argument('--home', type=str, help='Tên đội chủ nhà')
    parser.add_argument('--away', type=str, help='Tên đội khách')
    parser.add_argument('--home_odds', type=float, help='Tỷ lệ chủ nhà thắng')
    parser.add_argument('--draw_odds', type=float, help='Tỷ lệ hòa')
    parser.add_argument('--away_odds', type=float, help='Tỷ lệ khách thắng')
    parser.add_argument('--list_teams', action='store_true', help='Liệt kê tất cả đội bóng có dữ liệu')

    args = parser.parse_args()

    if args.list_teams:
        list_teams()
        return

    if not args.home or not args.away:
        print("Công cụ dự đoán trận bóng đá")
        print("=" * 50)

        list_teams()

        home_team = input("\nNhập tên đội chủ nhà: ")
        away_team = input("Nhập tên đội khách: ")

        try:
            home_odds = float(input("Nhập tỷ lệ chủ nhà thắng: "))
            draw_odds = float(input("Nhập tỷ lệ hòa: "))
            away_odds = float(input("Nhập tỷ lệ khách thắng: "))
        except ValueError:
            print("Tỷ lệ cược phải là số. Sử dụng giá trị mặc định 2.0, 3.0, 4.0")
            home_odds, draw_odds, away_odds = 2.0, 3.0, 4.0
    else:
        home_team = args.home
        away_team = args.away
        home_odds = args.home_odds if args.home_odds else 2.0
        draw_odds = args.draw_odds if args.draw_odds else 3.0
        away_odds = args.away_odds if args.away_odds else 4.0

    predict_match(home_team, away_team, home_odds, draw_odds, away_odds)


if __name__ == "__main__":
    main()
