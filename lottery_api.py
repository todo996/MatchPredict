"""Lớp tương thích cho mô-đun Xổ số Thể thao.

Giữ đường dẫn import cũ của ứng dụng trong khi phần triển khai thật nằm trong
``scripts/lottery_api.py``.
"""

from scripts.lottery_api import ChinaSportsLotterySpider

__all__ = ["ChinaSportsLotterySpider"]
