"""Lớp tương thích cho mô-đun dữ liệu trận đấu.

Ứng dụng cũ import ``ChinaSportsLotterySpider`` từ file này. Tên import được giữ
để không phá vỡ app.py, nhưng nguồn dữ liệu duy nhất hiện tại là WorldCup26.
"""

from scripts.worldcup26_api import WorldCup26FootballAPI

ChinaSportsLotterySpider = WorldCup26FootballAPI

__all__ = ["ChinaSportsLotterySpider", "WorldCup26FootballAPI"]
