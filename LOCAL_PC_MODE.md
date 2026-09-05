# Chạy MatchPredict hoàn toàn trên PC với SQLite

Chế độ này chỉ dùng tạm khi phát triển cục bộ. Toàn bộ backend PostgreSQL hiện có vẫn được giữ nguyên để sau này kết nối Supabase.

## 1. Giữ nguyên `.env` hiện tại

Bạn có thể giữ `GEMINI_API_KEY` đang có. Khi chạy bằng `run_local.py`, nếu `.env` chưa đặt `DB_BACKEND`, hệ thống sẽ tự dùng SQLite.

Cấu hình khuyến nghị:

```env
DB_BACKEND=sqlite
SQLITE_DB_PATH=data/matchpredict.db

GEMINI_API_KEY=API_KEY_GEMINI_CUA_BAN
GEMINI_MODEL=gemini-2.5-flash
SECRET_KEY=chuoi_bao_mat_ngau_nhien
```

Khi `DB_BACKEND=sqlite`, các biến `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` sẽ không được dùng. Vì vậy các giá trị PostgreSQL mẫu cũ trong `.env` không ảnh hưởng chế độ local.

## 2. Cập nhật và chạy trên PC

```bat
git pull origin main
python run_local.py
```

Không cần chạy `python app.py` trong giai đoạn local. `run_local.py` chỉ là điểm chạy dành cho PC, không làm thay đổi cấu hình production.

SQLite sẽ tự tạo tệp:

```text
data\matchpredict.db
```

và tự tạo các bảng `users`, `match_predictions`, `daily_matches` nếu chưa tồn tại.

## 3. Đăng ký và đăng nhập tài khoản local

Mở:

```text
http://127.0.0.1:8000
```

Bấm **Đăng ký**. Tài khoản mới sẽ được lưu trực tiếp vào `data\matchpredict.db` trên PC.

`run_local.py` cũng tự điều chỉnh cookie cho HTTP localhost để trạng thái đăng nhập hoạt động đúng khi test trên PC.

## 4. Đồng bộ dữ liệu trận đấu vào SQLite

Chạy ở cửa sổ CMD khác:

```bat
python scripts\sync_local_matches.py --days 7
```

Dữ liệu trận đấu sẽ được lưu vào cùng tệp SQLite local.

## 5. Chuyển sang Supabase sau này

Không cần viết lại giao diện hay logic ứng dụng. Chỉ đổi `.env`:

```env
DB_BACKEND=postgres
DB_HOST=...
DB_PORT=5432
DB_NAME=postgres
DB_USER=...
DB_PASS=...
```

Khi đó `scripts/database.py` PostgreSQL gốc sẽ được dùng lại. Khi triển khai online, Vercel vẫn có thể dùng `app.py` như cấu trúc gốc.

## 6. Lưu ý

- `.env` và `data/*.db` đã được đưa vào `.gitignore`, không commit dữ liệu local hoặc khóa API lên GitHub.
- SQLite phù hợp cho chạy local một máy. Khi đưa web online cho nhiều người dùng, hãy chuyển sang PostgreSQL/Supabase.
- Backend PostgreSQL cũ không bị xóa hoặc thay thế.
