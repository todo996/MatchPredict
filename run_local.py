#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Điểm chạy dành riêng cho PC local.

- Mặc định dùng SQLite nếu .env chưa chỉ định DB_BACKEND.
- Cho phép cookie đăng nhập hoạt động trên HTTP localhost.
- Không thay đổi app.py hoặc backend PostgreSQL dùng cho production/Supabase.
"""

import os

from dotenv import load_dotenv

load_dotenv()

# Chỉ đặt SQLite khi người dùng chưa chủ động chọn backend khác.
os.environ.setdefault("DB_BACKEND", "sqlite")

from app import app

# Local chạy HTTP nên không ép Secure cookie. Production app.py vẫn giữ cấu hình cũ.
app.config.update(
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_DOMAIN=None,
)


if __name__ == "__main__":
    host = os.getenv("LOCAL_HOST", "0.0.0.0")
    port = int(os.getenv("LOCAL_PORT", "8000"))
    debug = os.getenv("LOCAL_DEBUG", "1").strip().lower() not in {"0", "false", "no"}

    print("✅ Chế độ PC local")
    print(f"✅ Backend dữ liệu: {os.getenv('DB_BACKEND', 'sqlite')}")
    print("✅ SQLite mặc định: data\\matchpredict.db")
    print(f"🌐 Mở trình duyệt: http://127.0.0.1:{port}")

    app.run(host=host, port=port, debug=debug)
