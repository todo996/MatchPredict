"""Lớp tương thích cho mô-đun Xổ số Thể thao.

Giữ đường dẫn import cũ của ứng dụng. Bản chạy hiện tại ưu tiên nguồn dữ liệu
Sporttery trực tiếp và không sinh dữ liệu mô phỏng khi upstream lỗi.
Crawler cũ trong scripts/lottery_api.py vẫn được giữ nguyên để tham khảo/tương thích.
"""

from scripts.live_lottery_api import ChinaSportsLotterySpider

__all__ = ["ChinaSportsLotterySpider"]
