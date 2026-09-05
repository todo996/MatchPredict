<div align="center">

<img src="https://img.shields.io/badge/MatchPredict-AI%20Football%20Prediction-38c073?style=for-the-badge&logo=futbol&logoColor=white" alt="MatchPredict"/>

# ⚽ MatchPredict

**Nền tảng phân tích trận đấu bóng đá kết hợp dữ liệu lớn của 5 giải hàng đầu châu Âu × mô hình ngôn ngữ lớn AI**

[🌐 Trải nghiệm trực tuyến](https://match-predict.vercel.app) &nbsp;·&nbsp; [🎯 Đề xuất chiến lược](https://match-predict.vercel.app) &nbsp;·&nbsp; [📋 Điều khoản người dùng](https://match-predict.vercel.app/terms)

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 📌 Giới thiệu dự án

MatchPredict là một nền tảng phân tích bóng đá bằng AI **phục vụ nghiên cứu kỹ thuật**, tạo phân tích trận đấu theo quy trình sau:

1. **Thu thập dữ liệu**: tự động đồng bộ lịch thi đấu và tỷ lệ cược thời gian thực của Ngoại hạng Anh, La Liga, Serie A, Bundesliga và Ligue 1 (giao diện công khai của Pinnacle)
2. **Phân tích AI**: gọi mô hình ngôn ngữ lớn (thông qua OpenRouter) để phân tích sâu từng trận, đưa ra dự đoán 1X2, tỷ số và hiệp 1/cả trận
3. **Backtest lịch sử**: so sánh dự đoán trước đây với tỷ số thực tế, thống kê tỷ lệ chính xác và ROI của từng chiến lược
4. **Chiến lược tổ hợp nhiều trận**: dùng mô hình toán học để đưa ra 5 phương án tổ hợp tham khảo

> ⚠️ **Tuyên bố**: dự án chỉ phục vụ nghiên cứu học thuật và trình diễn kỹ thuật, không cấu thành khuyến nghị đặt cược dưới bất kỳ hình thức nào. Việc sử dụng nền tảng phải tuân thủ [Điều khoản người dùng](https://match-predict.vercel.app/terms).

---

## ✨ Chức năng cốt lõi

| Mô-đun | Mô tả |
|---------|------|
| 🤖 **Phân tích trận đấu bằng AI** | LLM tạo dự đoán 1X2, tỷ số, hiệp 1/cả trận và hiển thị độ tin cậy |
| 📊 **Tỷ lệ cược thời gian thực** | Lấy tỷ lệ 1X2 của 5 giải hàng đầu qua giao diện công khai của Pinnacle, tự động lọc thị trường Bookings/Corners |
| 🏆 **Độ chính xác lịch sử** | Dữ liệu backtest đầy đủ, cho phép so sánh dự đoán với tỷ số thực tế và duyệt theo ngày |
| 🎯 **Bộ máy chiến lược tổ hợp** | 5 chế độ: ưu tiên an toàn / tìm bất ngờ / tối ưu mức trả thưởng / cân bằng / tìm giá trị |
| 📅 **Trung tâm lịch sử** | Duyệt toàn bộ dự đoán lịch sử theo ngày, có lịch chuyển ngày và thống kê độ chính xác trong ngày |
| 👤 **Hệ thống điểm người dùng** | Đăng ký → điểm danh hằng ngày → dùng điểm để xem phân tích AI; VIP nhận thêm 30 điểm mỗi ngày |
| 🔧 **Trang quản trị** | Quản lý trận đấu, người dùng, VIP, đồng bộ thủ công và backtest chiến lược |

---

## 🖥️ Xem trước giao diện
<img width="2914" height="2242" alt="71554b2a245d11e0d22786d22e513a95" src="https://github.com/user-attachments/assets/d3e33cff-8aa5-435c-af5f-856310cd03f8" />

## 🌟 Điểm nổi bật của chức năng mới

### Ba chế độ dự đoán
- **Chế độ cổ điển**: phân tích thống kê dựa trên dữ liệu lịch sử của 5 giải hàng đầu (bố cục hai cột, quản lý trận theo danh sách chọn)
- **Chế độ xổ số thể thao**: tích hợp dữ liệu trận đấu và tỷ lệ cược thời gian thực từ Xổ số Thể thao Trung Quốc
- **Chế độ AI thông minh**: tích hợp mô hình ngôn ngữ lớn để phân tích và dự đoán (hỗ trợ cấu hình an toàn bằng biến môi trường)

### Các loại dự đoán toàn diện
- ✅ **1X2**: xác suất chủ nhà thắng, hòa, khách thắng
- ✅ **Hiệp 1/Cả trận**: dự đoán 9 tổ hợp kết quả hiệp 1 và cả trận
- ✅ **Tổng bàn thắng**: dự đoán theo các khoảng 0-1, 2-3, 4-6, 7+ bàn
- ✅ **Tỷ số**: 5 tỷ số chính xác có khả năng cao nhất và xác suất tương ứng
- ✅ **Phân tích giá trị**: AI nhận diện các lựa chọn có giá trị kỳ vọng dương

### Phân tích AI thông minh
- 🧠 Sử dụng các mô hình lớn như GPT-4 để phân tích chuyên sâu
- 📊 Tổng hợp sức mạnh đội bóng, phong độ gần đây, lợi thế sân nhà/sân khách và các yếu tố khác
- 🎯 Cung cấp lý do phân tích chi tiết và chiến lược tham khảo
- 🔍 Tự động tìm các cơ hội có giá trị kỳ vọng tốt

| Độ chính xác | Ngày | Mã trận | Dự đoán | Kết quả | Tỷ lệ | Mã trận | Dự đoán | Kết quả | Tỷ lệ |
|---:|:-----------|:--------|:--------|:--------|:-----------|:-------|:-------|:-------|:-------|
| 100% | 2025-03-02 | CN008 | Thắng | 1-0 | @2.900 | CN011 | Thắng | 2-1 | @1.430 |
| 100% | 2025-03-03 | CN019 | Thua | 1-2 | @3.40 | CN021 | Hòa | 3-3 | @2.83 |

## Giới thiệu dự án

Hệ thống dự đoán bóng đá là công cụ kết hợp phân tích thống kê truyền thống và AI. Hệ thống đã được mở rộng để hỗ trợ dữ liệu Xổ số Thể thao Trung Quốc và phân tích bằng mô hình ngôn ngữ lớn. Dữ liệu được phân tích theo nhiều chiều nhằm cung cấp kết quả dự đoán và thông tin tham khảo cho người dùng; kết quả thử nghiệm tổng hợp được tài liệu gốc ghi nhận ở mức trên 90%.

### ⚠️ Lưu ý: bóng đá luôn có tính bất định, không có trận đấu nào tuyệt đối.

1. Kết quả dự đoán chỉ để tham khảo, không cấu thành khuyến nghị đặt cược
2. Kết quả thực tế chịu ảnh hưởng bởi nhiều yếu tố mà hệ thống không thể bao quát hoàn toàn
3. Hãy bảo đảm việc sử dụng API tuân thủ điều khoản dịch vụ của nhà cung cấp dữ liệu
4. Hoạt động cá cược có thể bị giới hạn theo pháp luật tại một số khu vực; hãy tuân thủ quy định địa phương
5. Không sử dụng dự án cho bất kỳ hành vi trái pháp luật hoặc hoạt động bất hợp pháp nào

## Đã hoàn thành

1. Nạp dữ liệu của 5 mùa giải gần nhất và mô hình dự đoán
2. Tham số lợi thế sân nhà/sân khách và tham số hòa theo giải đấu
3. Phát triển giao diện Web và ứng dụng di động

## Cải tiến trong tương lai

1. Bổ sung thêm đặc trưng (chấn thương cầu thủ, thời tiết, huấn luyện viên, bảng xếp hạng thời gian thực...)
2. Hoàn thiện mô hình dự đoán
3. Cập nhật dữ liệu và tỷ số các trận đáng chú ý theo thời gian thực
4. Thống kê độ chính xác của các dự đoán trước đây
5. Hỗ trợ thêm giải đấu, loại trận và chức năng đề xuất trận

## Cách sử dụng

### Sử dụng trực tuyến
Truy cập https://match-predict.vercel.app để sử dụng chức năng dự đoán.

### Hướng dẫn chức năng mới

#### 1. Chế độ Xổ số Thể thao Trung Quốc
1. Nhấn nút "Chế độ xổ số thể thao"
2. Chọn số ngày cần lấy dữ liệu (1-7 ngày)
3. Nhấn "Làm mới dữ liệu" để lấy danh sách trận mới nhất
4. Chọn các trận cần phân tích
5. Nhấn "Dự đoán bằng AI" để nhận kết quả phân tích

#### 2. Chế độ phân tích AI thông minh
1. Nhấn nút "Chế độ AI thông minh"
2. Nhập thủ công thông tin trận đấu:
   - Tên đội chủ nhà và đội khách
   - Tên giải đấu
   - Tỷ lệ 1X2
3. Nhấn "Thêm trận để AI phân tích"
4. Nhấn "Dự đoán bằng AI" để nhận phân tích đầy đủ

#### 3. Kết quả phân tích AI bao gồm
- **Dự đoán 1X2**: phân bố xác suất và lựa chọn có xác suất cao nhất
- **Dự đoán hiệp 1/cả trận**: xếp hạng xác suất 9 tổ hợp
- **Dự đoán tổng bàn thắng**: phân bố xác suất theo 4 khoảng
- **Dự đoán tỷ số**: 5 tỷ số chính xác có khả năng cao nhất
- **Phân tích giá trị**: các lựa chọn có giá trị kỳ vọng dương
- **Lý do phân tích**: giải thích chi tiết logic phân tích

### Triển khai cục bộ

1. Clone dự án về máy:
   ```bash
   git clone https://github.com/yourusername/football-prediction.git
   cd football-prediction
   ```

2. Tạo môi trường ảo:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. Cài đặt phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```

4. Cấu hình khóa API (tùy chọn, dùng cho chức năng AI):
   ```bash
   # Sao chép tệp cấu hình
   cp config_example.py config_local.py

   # Đặt biến môi trường (khuyến nghị)
   export GEMINI_API_KEY="your_api_key_here"
   export GEMINI_MODEL="gemini-2.0-flash-exp"

   # Hoặc sửa config_local.py (không còn khuyến nghị; nên dùng biến môi trường)
   ```

5. Chạy ứng dụng:
   ```bash
   python app.py
   ```

6. Mở trình duyệt và truy cập: http://localhost:5000

4. Đưa thông tin trận cần dự đoán vào `matches.json` và nhập tỷ lệ cược:
```bash
{
  "league_code": "PD",
  "home_team": "CD Leganés",
  "away_team": "Getafe CF",
  "home_odds": 2.9,
  "draw_odds": 2.48,
  "away_odds": 2.62
}

python parlay_predictor.py --matches matches.json

Đã nạp dữ liệu Ngoại hạng Anh
Đã nạp dữ liệu La Liga
Đã nạp dữ liệu Serie A

Kết quả dự đoán từng trận:
==================================================

Trận #1: CD Leganés vs Getafe CF
Xác suất chủ nhà thắng: 0.36 (35.6%), tỷ lệ: 2.9
Xác suất hòa: 0.29 (29.2%), tỷ lệ: 2.48
Xác suất khách thắng: 0.35 (35.0%), tỷ lệ: 2.62
Tất cả lựa chọn (sắp xếp theo giá trị kỳ vọng):
  Chủ nhà thắng: giá trị kỳ vọng=0.0316, tỷ lệ=2.9, xác suất=0.36
  Khách thắng: giá trị kỳ vọng=-0.0824, tỷ lệ=2.62, xác suất=0.35
  Hòa: giá trị kỳ vọng=-0.2754, tỷ lệ=2.48, xác suất=0.29
Lựa chọn tốt nhất: Chủ nhà thắng, giá trị kỳ vọng: 0.0316

Tổ hợp tốt nhất:
==================================================
Tổng tỷ lệ: 33.54
Xác suất trúng: 0.0378 (3.78%)
Giá trị kỳ vọng: 0.2674

Lựa chọn:
1. CD Leganés vs Getafe CF: Chủ nhà thắng (tỷ lệ: 2.9, xác suất: 0.36)

Các tổ hợp giá trị cao khác:
==================================================

Tổ hợp #1:
Tổng tỷ lệ: 30.30
Xác suất trúng: 0.0372 (3.72%)
Giá trị kỳ vọng: 0.1273
Lựa chọn:
1. CD Leganés vs Getafe CF: Khách thắng (tỷ lệ: 2.62, xác suất: 0.35)
2. Newcastle United FC vs Brighton & Hove Albion FC: Chủ nhà thắng (tỷ lệ: 1.89, xác suất: 0.66)
3. Genoa CFC vs Empoli FC: Khách thắng (tỷ lệ: 4.22, xác suất: 0.25)
4. Bologna FC 1909 vs Cagliari Calcio: Chủ nhà thắng (tỷ lệ: 1.45, xác suất: 0.64)
```

## Công nghệ sử dụng

- **Ngôn ngữ lập trình**: Python 3.8+
- **Phân tích dữ liệu**: Pandas, NumPy
- **Mô hình thống kê**: SciPy (phân phối Poisson)
- **Machine Learning**: Scikit-learn (mở rộng tùy chọn)
- **Thu thập dữ liệu**: Requests (gọi API)
- **Giao diện dòng lệnh**: Argparse

## Chức năng hệ thống

1. **Thu thập dữ liệu**: lấy dữ liệu trận đấu của 5 giải hàng đầu từ API công khai
2. **Feature Engineering**: tính các chỉ số hiệu suất của đội bóng
3. **Dự đoán kết quả**: dự đoán 1X2 và tỷ số chính xác
4. **Dự đoán hiệp 1/cả trận**: dự đoán tổ hợp kết quả hiệp 1 và cả trận
5. **Phân tích tỷ lệ cược**: phân tích tỷ lệ và cung cấp thông tin tham khảo
6. **Giao diện tương tác**: hỗ trợ tham số dòng lệnh và nhập liệu tương tác

## Cấu trúc dự án
```text
football_prediction/
├── data/ # Thư mục dữ liệu
│ ├── features.csv # Dữ liệu đặc trưng đội bóng
│ ├── premier_league_features.csv
│ ├── la_liga_features.csv
│ ├── serie_a_features.csv
│ ├── bundesliga_features.csv
│ └── ligue_1_features.csv
├── cache/ # Bộ nhớ đệm dữ liệu API
├── models/ # Thư mục mô hình
│ ├── init.py
│ ├── feature_engineering.py # Feature Engineering
│ ├── match_predictor.py # Dự đoán kết quả trận đấu
│ └── score_predictor.py # Dự đoán tỷ số
├── collect_league_data.py # Script thu thập dữ liệu
├── match.py # Script dự đoán trận đấu
└── README.md # Tài liệu dự án
```

## Mã giải và các đội thuộc 5 giải hàng đầu

### Ngoại hạng Anh (Premier League, PL)

Các đội chính:
- Manchester City FC (Manchester City)
- Arsenal FC (Arsenal)
- Liverpool FC (Liverpool)
- Manchester United FC (Manchester United)
- Chelsea FC (Chelsea)
- Tottenham Hotspur FC (Tottenham Hotspur)
- Newcastle United FC (Newcastle United)
- Aston Villa FC (Aston Villa)
- Brighton & Hove Albion FC (Brighton)
- West Ham United FC (West Ham United)
- Crystal Palace FC (Crystal Palace)
- Brentford FC (Brentford)
- Fulham FC (Fulham)
- Wolverhampton Wanderers FC (Wolverhampton)
- AFC Bournemouth (Bournemouth)
- Nottingham Forest FC (Nottingham Forest)
- Everton FC (Everton)
- Luton Town FC (Luton Town)
- Burnley FC (Burnley)
- Sheffield United FC (Sheffield United)

### La Liga (PD)

Các đội chính:
- Real Madrid CF (Real Madrid)
- FC Barcelona (Barcelona)
- Atlético de Madrid (Atlético Madrid)
- Girona FC (Girona)
- Athletic Club (Athletic Bilbao)
- Real Sociedad de Fútbol (Real Sociedad)
- Real Betis Balompié (Real Betis)
- Villarreal CF (Villarreal)
- Valencia CF (Valencia)
- Sevilla FC (Sevilla)
- RCD Mallorca (Mallorca)
- Deportivo Alavés (Alavés)
- CA Osasuna (Osasuna)
- Getafe CF (Getafe)
- Rayo Vallecano (Rayo Vallecano)
- UD Las Palmas (Las Palmas)
- Celta de Vigo (Celta Vigo)
- Cádiz CF (Cádiz)
- Granada CF (Granada)
- UD Almería (Almería)

### Serie A (SA)

Các đội chính:
- FC Internazionale Milano (Inter Milan)
- AC Milan (AC Milan)
- Juventus FC (Juventus)
- SSC Napoli (Napoli)
- AS Roma (Roma)
- SS Lazio (Lazio)
- Atalanta BC (Atalanta)
- Bologna FC 1909 (Bologna)
- ACF Fiorentina (Fiorentina)
- Torino FC (Torino)
- AC Monza (Monza)
- Genoa CFC (Genoa)
- US Lecce (Lecce)
- Udinese Calcio (Udinese)
- Cagliari Calcio (Cagliari)
- Hellas Verona FC (Verona)
- Empoli FC (Empoli)
- Frosinone Calcio (Frosinone)
- US Salernitana 1919 (Salernitana)
- US Sassuolo Calcio (Sassuolo)

### Bundesliga (BL1)

Các đội chính:
- FC Bayern München (Bayern Munich)
- Borussia Dortmund (Borussia Dortmund)
- RB Leipzig (RB Leipzig)
- Bayer 04 Leverkusen (Bayer Leverkusen)
- VfB Stuttgart (Stuttgart)
- Eintracht Frankfurt (Eintracht Frankfurt)
- VfL Wolfsburg (Wolfsburg)
- SC Freiburg (Freiburg)
- 1. FC Union Berlin (Union Berlin)
- 1. FSV Mainz 05 (Mainz 05)
- TSG 1899 Hoffenheim (Hoffenheim)
- Borussia Mönchengladbach (Mönchengladbach)
- FC Augsburg (Augsburg)
- SV Werder Bremen (Werder Bremen)
- 1. FC Heidenheim 1846 (Heidenheim)
- VfL Bochum 1848 (Bochum)
- 1. FC Köln (Köln)
- SV Darmstadt 98 (Darmstadt)

### Ligue 1 (FL1)

Các đội chính:
- Paris Saint-Germain FC (Paris Saint-Germain)
- AS Monaco FC (Monaco)
- Olympique de Marseille (Marseille)
- LOSC Lille (Lille)
- OGC Nice (Nice)
- RC Lens (Lens)
- Olympique Lyonnais (Lyon)
- Stade Rennais FC (Rennes)
- RC Strasbourg Alsace (Strasbourg)
- Stade de Reims (Reims)
- Montpellier HSC (Montpellier)
- Toulouse FC (Toulouse)
- FC Nantes (Nantes)
- FC Lorient (Lorient)
- Stade Brestois 29 (Brest)
- AJ Auxerre (Auxerre)
- Clermont Foot 63 (Clermont)
- FC Metz (Metz)

## Hướng dẫn sử dụng

### Cài đặt phụ thuộc

```bash
pip install pandas numpy scipy scikit-learn requests argparse
```

### Thu thập dữ liệu

```bash
python collect_league_data.py
```

Lệnh này sẽ thu thập dữ liệu La Liga và Serie A. Nếu cần thu thập giải khác, hãy sửa mã giải trong script.

### Dự đoán trận đấu

**Dùng dòng lệnh**:

```bash
python match.py --home "Real Madrid CF" --away "FC Barcelona" --home_odds 2.10 --draw_odds 3.50 --away_odds 3.20
```

**Dùng chế độ tương tác**:

```bash
python match.py
```

Sau đó nhập tên đội và tỷ lệ theo hướng dẫn.

**Xem danh sách đội khả dụng**:

```bash
python match.py --list_teams
```

## Phương án triển khai

### Triển khai trên máy chủ

1. Cài Python 3.8+ trên máy chủ

2. Clone dự án và thiết lập môi trường:
   ```bash
   git clone https://github.com/yourusername/football-prediction.git
   cd football-prediction
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Cấu hình tác vụ định kỳ để cập nhật dữ liệu:
   ```bash
   crontab -e
   # Thêm dòng sau để cập nhật dữ liệu lúc 2:00 mỗi ngày
   0 2 * * * cd /path/to/football-prediction && /path/to/venv/bin/python collect_league_data.py
   ```

4. Thiết lập Web API (tùy chọn):
   ```bash
   pip install flask gunicorn
   ```

   Tạo `app.py`:
   ```python
   from flask import Flask, request, jsonify
   import subprocess
   import json

   app = Flask(__name__)

   @app.route('/predict', methods=['POST'])
   def predict():
       data = request.json
       home_team = data.get('home_team')
       away_team = data.get('away_team')
       home_odds = data.get('home_odds', 2.0)
       draw_odds = data.get('draw_odds', 3.0)
       away_odds = data.get('away_odds', 4.0)

       cmd = f"python match.py --home '{home_team}' --away '{away_team}' --home_odds {home_odds} --draw_odds {draw_odds} --away_odds {away_odds} --json"
       result = subprocess.check_output(cmd, shell=True)
       return jsonify(json.loads(result))

   if __name__ == '__main__':
       app.run(debug=True)
   ```

5. Chạy bằng Gunicorn:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

6. Cấu hình Nginx reverse proxy (tùy chọn)

### Triển khai bằng Docker

1. Tạo `Dockerfile`:
   ```dockerfile
   FROM python:3.9-slim

   WORKDIR /app

   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   COPY . .

   # Thu thập dữ liệu ban đầu
   RUN python collect_league_data.py

   # Nếu sử dụng API
   EXPOSE 5000
   CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]

   # Nếu chỉ dùng dòng lệnh
   # CMD ["python", "match.py"]
   ```

2. Build và chạy Docker image:
   ```bash
   docker build -t football-prediction .
   docker run -p 5000:5000 football-prediction
   ```

## Lưu ý

1. Kết quả dự đoán chỉ để tham khảo, không cấu thành khuyến nghị đặt cược
2. Kết quả thực tế chịu ảnh hưởng bởi nhiều yếu tố mà hệ thống không thể tính hết
3. Hãy bảo đảm việc sử dụng API tuân thủ điều khoản dịch vụ của nhà cung cấp dữ liệu
4. Hoạt động cá cược có thể bị giới hạn tại một số khu vực; hãy tuân thủ pháp luật địa phương

---
Hy vọng dự án giúp bạn hiểu rõ hơn về các kỹ thuật dự đoán bóng đá. Nếu có vấn đề hoặc đề xuất, hãy gửi Issue hoặc Pull Request.
