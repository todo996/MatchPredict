"""Khởi tạo gói scripts, nạp biến môi trường và chọn backend cơ sở dữ liệu.

DB_BACKEND=sqlite   -> dùng SQLite cục bộ trong data/matchpredict.db
DB_BACKEND=postgres -> giữ nguyên backend PostgreSQL hiện có, phù hợp Supabase sau này

Mặc định vẫn là postgres để không làm thay đổi hành vi production cũ.
"""

import os
import sys

from dotenv import load_dotenv

# Khi chạy local, đọc .env. Biến môi trường hệ thống/production vẫn được ưu tiên.
load_dotenv()

_db_backend = os.getenv("DB_BACKEND", "postgres").strip().lower()

if _db_backend == "sqlite":
    # Chỉ định module SQLite thay cho scripts.database trong phiên chạy hiện tại.
    # File scripts/database.py PostgreSQL gốc không bị sửa hoặc xóa.
    from . import sqlite_database as _sqlite_database

    sys.modules[f"{__name__}.database"] = _sqlite_database
