#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mô-đun phân tích và dự đoán trận bóng đá bằng mô hình ngôn ngữ lớn.
Tích hợp Gemini để tạo phân tích cho từng trận.
"""

import json
import logging
import time
import random
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import requests

# Cấu hình log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SimpleMatchAnalysis:
    """Kết quả phân tích trận đấu dạng đơn giản."""
    match_id: str
    home_team: str
    away_team: str
    league_name: str
    ai_analysis: str
    home_odds: float
    draw_odds: float
    away_odds: float


class AIFootballPredictor:
    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash-exp"):
        self.api_key = api_key
        self.model_name = model_name
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def analyze_matches(self, matches: List[Dict[str, Any]]) -> List[SimpleMatchAnalysis]:
        """Phân tích danh sách trận và tạo kết quả AI độc lập cho từng trận."""
        analyses = []

        for match in matches:
            try:
                analysis = self._analyze_single_match(match)
                if analysis:
                    analyses.append(analysis)
            except Exception as e:
                logger.error(
                    f"Phân tích trận thất bại {match.get('home_team', '')} vs "
                    f"{match.get('away_team', '')}: {e}"
                )
                analyses.append(self._create_error_analysis(match, str(e)))

        return analyses

    def _analyze_single_match(self, match: Dict[str, Any]) -> Optional[SimpleMatchAnalysis]:
        """Phân tích một trận đấu."""
        home_team = match.get('home_team', '')
        away_team = match.get('away_team', '')
        league_name = match.get('league_name', 'Giải đấu chưa xác định')

        odds = match.get('odds', {})
        hhad_odds = odds.get('hhad', {})
        home_odds = float(hhad_odds.get('h', 2.0))
        draw_odds = float(hhad_odds.get('d', 3.2))
        away_odds = float(hhad_odds.get('a', 2.8))

        prompt = f"""Hãy phân tích chi tiết trận bóng đá sau và đưa ra dự đoán đầy đủ bằng tiếng Việt:

Trận đấu: {home_team} vs {away_team}
Giải đấu: {league_name}
Tỷ lệ cược: Chủ nhà thắng {home_odds} | Hòa {draw_odds} | Khách thắng {away_odds}

Hãy trả lời theo cấu trúc sau:

**1. Phân tích trận đấu**
Đánh giá sức mạnh hai đội, phong độ gần đây, lịch sử đối đầu, lợi thế sân nhà/sân khách và các yếu tố liên quan.

**2. Dự đoán 1X2**
Kết quả đề xuất: [Chủ nhà thắng/Hòa/Khách thắng]
Lý do:
Độ tin cậy: [1-10]

**3. Dự đoán tỷ số**
Tỷ số có khả năng cao nhất:
Các tỷ số khác có thể xảy ra:

**4. Dự đoán hiệp 1/cả trận**
Kết quả hiệp 1: [Chủ nhà thắng/Hòa/Khách thắng]
Kết quả cả trận: [Chủ nhà thắng/Hòa/Khách thắng]
Tổ hợp hiệp 1/cả trận:

**5. Dự đoán tổng bàn thắng**
Tổng bàn: [0-1 bàn/2-3 bàn/Từ 4 bàn trở lên]
Bàn thắng đội chủ nhà:
Bàn thắng đội khách:

**6. Phân tích bổ sung**
- Tài/Xỉu
- Kèo châu Á
- Cảnh báo rủi ro

Hãy trả lời hoàn toàn bằng tiếng Việt, dùng thuật ngữ bóng đá tự nhiên và giữ giọng phân tích chuyên nghiệp."""

        ai_response = self._call_ai_model(prompt)

        if ai_response:
            return SimpleMatchAnalysis(
                match_id=match.get('match_id', f"match_{int(time.time())}"),
                home_team=home_team,
                away_team=away_team,
                league_name=league_name,
                ai_analysis=ai_response,
                home_odds=home_odds,
                draw_odds=draw_odds,
                away_odds=away_odds
            )

        return None

    def _create_error_analysis(self, match: Dict[str, Any], error_msg: str) -> SimpleMatchAnalysis:
        """Tạo kết quả phân tích khi AI gặp lỗi."""
        return SimpleMatchAnalysis(
            match_id=match.get('match_id', f"error_{int(time.time())}"),
            home_team=match.get('home_team', 'Chưa xác định'),
            away_team=match.get('away_team', 'Chưa xác định'),
            league_name=match.get('league_name', 'Giải đấu chưa xác định'),
            ai_analysis=f"Hiện chưa thể lấy phân tích AI. Vui lòng thử lại sau.\n\nChi tiết lỗi: {error_msg}",
            home_odds=2.0,
            draw_odds=3.2,
            away_odds=2.8
        )

    def _call_ai_model(self, prompt: str) -> Optional[str]:
        """Gọi Gemini API."""
        url = f"{self.base_url}/{self.model_name}:generateContent"

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1000
            }
        }

        max_retries = 3
        base_delay = 1

        for attempt in range(max_retries):
            try:
                logger.info(f"Gọi Gemini API (lần {attempt + 1}/{max_retries})")

                response = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=30
                )

                logger.info(f"Mã trạng thái API: {response.status_code}")

                if response.status_code == 200:
                    data = response.json()
                    if 'candidates' in data and len(data['candidates']) > 0:
                        content = data['candidates'][0]['content']['parts'][0]['text']
                        logger.info("Đã nhận phân tích AI")
                        return content.strip()
                    logger.warning("Phản hồi API không có nội dung hợp lệ")
                    return None

                if response.status_code == 429:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Gemini API giới hạn tần suất, thử lại sau {delay:.2f} giây")
                    time.sleep(delay)
                    continue

                logger.error(f"Yêu cầu API thất bại: {response.status_code} - {response.text}")
                if attempt == max_retries - 1:
                    return None

            except requests.exceptions.Timeout:
                logger.warning(f"Yêu cầu hết thời gian chờ (lần {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    time.sleep(base_delay * (attempt + 1))
                    continue
                return None

            except Exception as e:
                logger.error(f"Lỗi khi gọi mô hình AI: {e}")
                if attempt < max_retries - 1:
                    time.sleep(base_delay * (attempt + 1))
                    continue
                return None

        return None


if __name__ == "__main__":
    import os

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("Vui lòng cấu hình biến môi trường GEMINI_API_KEY")
        exit(1)

    predictor = AIFootballPredictor(api_key)

    sample_match = {
        'match_id': '12345',
        'home_team': 'Manchester City FC',
        'away_team': 'Liverpool FC',
        'league_name': 'Ngoại hạng Anh',
        'odds': {
            'hhad': {'h': '2.10', 'd': '3.50', 'a': '2.80'}
        }
    }

    analyses = predictor.analyze_matches([sample_match])

    for analysis in analyses:
        print(f"Trận đấu: {analysis.home_team} vs {analysis.away_team}")
        print(f"Phân tích AI: {analysis.ai_analysis}")
        print(
            f"Tỷ lệ: Chủ nhà {analysis.home_odds}, "
            f"Hòa {analysis.draw_odds}, Khách {analysis.away_odds}"
        )
