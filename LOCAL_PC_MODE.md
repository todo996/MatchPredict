# Chạy MatchPredict hoàn toàn trên PC với SQLite

Chế độ này chỉ dùng tạm khi phát triển cục bộ. Toàn bộ backend PostgreSQL hiện có vẫn được giữ nguyên để sau này kết nối Supabase.

## 1. Cấu hình `.env`

Thêm hoặc sửa các dòng sau:

```env
DB_BACKEND=sqlite
SQLITE_DB_PATH=data/matchpredict.db

GEMINI_API_KEY=API_KEY_GEMINI_CUA_BAN
GEMINI_MODEL=gemini-2.5-flash
SECRET_KEY=chuoi_bao_mat_ngau_nhien
```

Khi `DB_BACKEND=sqlite`, các biến `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` sẽ không được dùng.

## 2. Cập nhật và chạy

```bat
git pull origin main
python app.py
```

SQLite sẽ tự tạo tệp:

```text
data\matchpredict.db
```

và tự tạo các bảng `users`, `match_predictions`, `daily_matches` nếu chưa tồn tại.

## 3. Đăng ký tài khoản local

Mở:

```text
http://127.0.0.1:8000
```

Bấm **Đăng ký**. Tài khoản mới sẽ được lưu trực tiếp vào `data\matchpredict.db` trên PC.

## 4. Đồng bộ dữ liệu trận đấu vào SQLite

Chạy:

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

Khi đó `scripts/database.py` PostgreSQL gốc sẽ được dùng lại.

## 6. Lưu ý

- `.env` và `data/*.db` đã được đưa vào `.gitignore`, không commit dữ liệu local hoặc khóa API lên GitHub.
- SQLite phù hợp cho chạy local một máy. Khi đưa web online cho nhiều người dùng, hãy chuyển sang PostgreSQL/Supabase.
