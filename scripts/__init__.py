"""Khởi tạo gói scripts và nạp biến môi trường cục bộ.

Khi chạy local, python-dotenv sẽ đọc tệp .env ở thư mục dự án.
Trên Vercel/production, các biến môi trường hệ thống vẫn được ưu tiên vì
load_dotenv() mặc định không ghi đè biến đã tồn tại.
"""

from dotenv import load_dotenv

load_dotenv()
