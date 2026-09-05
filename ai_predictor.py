"""Lớp tương thích cho mô-đun dự đoán AI.

Giữ đường dẫn import cũ của ứng dụng trong khi phần triển khai thật nằm trong
``scripts/ai_predictor.py``.
"""

from scripts.ai_predictor import AIFootballPredictor, SimpleMatchAnalysis

__all__ = ["AIFootballPredictor", "SimpleMatchAnalysis"]
