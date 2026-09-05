# Hệ thống đồng bộ dữ liệu trận đấu hằng ngày

## 📋 Tổng quan

Hệ thống lấy dữ liệu trận đấu mới nhất từ nguồn Xổ số Thể thao Trung Quốc và lưu vào PostgreSQL. Mục tiêu là hạn chế dữ liệu trùng lặp, giảm số lần gọi nguồn bên ngoài và tăng tốc chế độ xổ số thể thao.

## 🗄️ Cấu trúc cơ sở dữ liệu

### Bảng `daily_matches`
```sql
CREATE TABLE daily_matches (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(100) UNIQUE NOT NULL,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    league_name VARCHAR(100),
    match_date DATE NOT NULL,
    match_time TIME,
    match_datetime TIMESTAMP,
    match_num VARCHAR(20),
    match_status VARCHAR(20),
    home_odds DECIMAL(6,2),
    draw_odds DECIMAL(6,2),
    away_odds DECIMAL(6,2),
    goal_line VARCHAR(10),
    data_source VARCHAR(50) DEFAULT 'china_lottery',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

> Tên cột và giá trị kỹ thuật được giữ nguyên để bảo đảm tương thích với mã nguồn và dữ liệu hiện có.

## 🚀 Cách sử dụng

### Đồng bộ dữ liệu mới nhất
```bash
python scripts/sync_daily_matches.py --days 3
python scripts/sync_daily_matches.py --days 7 --force
```

### Xem thống kê
```bash
python scripts/sync_daily_matches.py --stats
```

### Dọn dữ liệu cũ
```bash
python scripts/sync_daily_matches.py --cleanup 30
```

### Kiểm tra kết nối cơ sở dữ liệu
```bash
python scripts/sync_daily_matches.py --test
```

## 📊 Trạng thái dữ liệu được ghi trong tài liệu gốc

Tại thời điểm tài liệu ban đầu được viết:
- Tổng số: 65 trận.
- Phạm vi ngày: 2025-09-19 đến 2025-09-22.
- 15 giải đấu.

Các con số trên là ảnh chụp trạng thái lịch sử trong tài liệu, không phải số liệu thời gian thực.

## 🔧 Luồng hoạt động

### Luồng đồng bộ
1. Lấy dữ liệu trận từ nguồn bên ngoài.
2. Phân tích thông tin trận, thời gian và tỷ lệ cược.
3. Kiểm tra `match_id` để tránh trùng.
4. Thêm trận mới hoặc cập nhật bản ghi đã có.
5. Bỏ qua dữ liệu không hợp lệ.

### Luồng frontend
1. Chế độ xổ số thể thao ưu tiên đọc dữ liệu từ cơ sở dữ liệu.
2. Tùy cấu hình hệ thống, nguồn bên ngoài chỉ được dùng ở bước đồng bộ.
3. Frontend nhận danh sách đã chuẩn hóa từ backend.

## 🎯 Lợi ích

### Hiệu năng
- Truy vấn dữ liệu đã lưu nhanh hơn gọi nguồn bên ngoài cho mỗi người dùng.
- Hạn chế yêu cầu mạng lặp lại.
- Cải thiện thời gian tải danh sách trận.

### Quản lý dữ liệu
- Dùng `match_id` duy nhất để chống trùng.
- Có thể cập nhật tỷ lệ khi dữ liệu thay đổi.
- Có công cụ dọn dữ liệu cũ.

### Độ ổn định
- Có log đồng bộ và thống kê.
- Tách quá trình lấy dữ liệu ra khỏi luồng xem của người dùng.
- Dễ chạy bằng cron hoặc lịch tác vụ khác.

## 📅 Lịch chạy đề xuất

```bash
# Hằng ngày: đồng bộ 3 ngày gần nhất
python scripts/sync_daily_matches.py --days 3

# Hằng tuần: dọn dữ liệu cũ hơn 30 ngày
python scripts/sync_daily_matches.py --cleanup 30

# Kiểm tra định kỳ
python scripts/sync_daily_matches.py --stats
```

## 🔍 Xử lý sự cố

### Không kết nối được cơ sở dữ liệu
```bash
python scripts/sync_daily_matches.py --test
```
Kiểm tra biến môi trường, thông tin kết nối và mạng.

### Không lấy được dữ liệu nguồn
- Kiểm tra kết nối mạng.
- Kiểm tra trạng thái endpoint nguồn.
- Xem `sync_matches.log`.

### Dữ liệu không đồng nhất
```bash
python scripts/sync_daily_matches.py --days 7 --force
```

## 🚀 Ví dụ cron trên máy chủ

```bash
# 08:00 hằng ngày
0 8 * * * cd /path/to/MatchPredict && python scripts/sync_daily_matches.py --days 3

# 02:00 Chủ nhật hằng tuần
0 2 * * 0 cd /path/to/MatchPredict && python scripts/sync_daily_matches.py --cleanup 30
```

Bảo đảm môi trường production đã cấu hình đầy đủ kết nối PostgreSQL trước khi chạy lịch tự động.
