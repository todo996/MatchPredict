# Chế độ xổ số thể thao - chỉ đọc từ cơ sở dữ liệu

## ✅ Trạng thái triển khai

Chế độ xổ số thể thao được thiết kế để frontend **chỉ đọc danh sách trận từ cơ sở dữ liệu**. Việc lấy dữ liệu mới từ nguồn bên ngoài được tách sang script đồng bộ chạy phía máy chủ.

## 🔄 Luồng hoạt động

### 1. Đồng bộ phía máy chủ
```bash
python scripts/sync_daily_matches.py --days 7
```

### 2. Hiển thị phía người dùng
- Nguồn dữ liệu frontend: PostgreSQL.
- Không gọi trực tiếp nguồn xổ số thể thao từ trình duyệt.
- Giảm độ trễ và phụ thuộc mạng trong lúc người dùng xem danh sách trận.

## 📊 Trạng thái lịch sử trong tài liệu gốc

Tại thời điểm tài liệu ban đầu được ghi:
- 65 trận trong bảng `daily_matches`.
- Dữ liệu từ 2025-09-19 đến 2025-09-22.
- 15 giải đấu.

Đây là số liệu lịch sử, không phải trạng thái hiện tại theo thời gian thực.

## API đọc trận đấu

```python
@app.route('/api/lottery/matches')
def get_lottery_matches():
    # Đọc dữ liệu từ cơ sở dữ liệu
    db_matches = prediction_db.get_daily_matches(days_ahead=days)
```

Endpoint không cần thay đổi route hoặc cấu trúc JSON khi Việt hóa giao diện.

## 🎯 Giao diện người dùng

Frontend hỗ trợ:
1. **Làm mới dữ liệu**: đọc lại danh sách hiện có từ cơ sở dữ liệu.
2. **Cập nhật dữ liệu**: mở hướng dẫn chạy script đồng bộ trên máy chủ.

Nội dung hướng dẫn:
```text
Nguồn dữ liệu hiện tại: bộ nhớ đệm trong cơ sở dữ liệu.

Để lấy dữ liệu mới nhất, chạy:
python scripts/sync_daily_matches.py --days 7
```

## 💡 Khuyến nghị vận hành

```bash
# Đồng bộ hằng ngày
python scripts/sync_daily_matches.py --days 3

# Xem thống kê
python scripts/sync_daily_matches.py --stats

# Dọn dữ liệu cũ
python scripts/sync_daily_matches.py --cleanup 30
```

Ví dụ cron:
```bash
0 8 * * * cd /path/to/MatchPredict && python scripts/sync_daily_matches.py --days 3
```

## 🔧 Xử lý lỗi

### Cơ sở dữ liệu không có trận
API trả về `success: false` cùng thông báo yêu cầu chạy script đồng bộ.

### Không kết nối được cơ sở dữ liệu
API trả lỗi máy chủ và thông báo liên hệ quản trị viên/kiểm tra cấu hình.

Các key JSON như `success`, `error`, `message`, `matches`, `count` được giữ nguyên vì là hợp đồng kỹ thuật giữa frontend và backend.

## 🎉 Lợi ích

- Frontend phản hồi nhanh hơn.
- Không phụ thuộc trực tiếp vào nguồn bên ngoài cho mỗi lượt xem.
- Có một nguồn dữ liệu ứng dụng thống nhất.
- Việc đồng bộ có thể giám sát, lập lịch và chạy lại độc lập.
- Phù hợp hơn với môi trường serverless khi không muốn crawler chạy theo từng request người dùng.
