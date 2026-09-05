#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Backend SQLite dùng cho chế độ chạy cục bộ trên PC.

Mô-đun này giữ cùng giao diện phương thức với scripts/database.py để app.py
không phải thay đổi. Backend PostgreSQL gốc vẫn được giữ nguyên và sẽ được
sử dụng khi DB_BACKEND=postgres.
"""

import contextlib
import logging
import os
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _to_date(value):
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except (TypeError, ValueError):
        try:
            return datetime.strptime(str(value), "%Y-%m-%d").date()
        except (TypeError, ValueError):
            return None


def _parse_match_datetime(match: Dict[str, Any]):
    raw = match.get("match_time")
    if raw:
        text = str(raw).strip()
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                pass

    raw_date = match.get("match_date")
    if raw_date:
        try:
            return datetime.strptime(str(raw_date), "%Y-%m-%d")
        except ValueError:
            pass
    return None


class SQLitePredictionDatabase:
    """Cơ sở dữ liệu SQLite cục bộ tương thích với PredictionDatabase PostgreSQL."""

    def __init__(self, db_path: Optional[str] = None):
        project_root = Path(__file__).resolve().parent.parent
        configured = db_path or os.getenv("SQLITE_DB_PATH", "data/matchpredict.db")
        path = Path(configured)
        if not path.is_absolute():
            path = project_root / path
        self.db_path = path.resolve()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info("Đang dùng SQLite cục bộ: %s", self.db_path)
        self.init_tables()

    def _get_conn(self):
        conn = sqlite3.connect(str(self.db_path), timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        return conn

    def connect_to_database(self):
        return self._get_conn()

    @contextlib.contextmanager
    def get_db_connection(self):
        conn = self._get_conn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_tables(self):
        with self.get_db_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    user_type TEXT DEFAULT 'free',
                    membership_expires TEXT,
                    daily_predictions_used INTEGER DEFAULT 0,
                    last_prediction_date TEXT DEFAULT (date('now')),
                    total_predictions INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_login TEXT,
                    is_active INTEGER DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS match_predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prediction_id TEXT UNIQUE NOT NULL,
                    user_id INTEGER REFERENCES users(id),
                    username TEXT,
                    prediction_mode TEXT NOT NULL,
                    home_team TEXT NOT NULL,
                    away_team TEXT NOT NULL,
                    league_name TEXT,
                    match_time TEXT,
                    home_odds REAL,
                    draw_odds REAL,
                    away_odds REAL,
                    predicted_result TEXT,
                    prediction_confidence REAL,
                    ai_analysis TEXT,
                    user_ip TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    actual_result TEXT,
                    actual_score TEXT,
                    is_correct INTEGER,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS daily_matches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    match_id TEXT UNIQUE NOT NULL,
                    home_team TEXT NOT NULL,
                    away_team TEXT NOT NULL,
                    league_name TEXT,
                    match_date TEXT NOT NULL,
                    match_time TEXT,
                    match_datetime TEXT,
                    match_num TEXT,
                    match_status TEXT,
                    home_odds REAL,
                    draw_odds REAL,
                    away_odds REAL,
                    goal_line TEXT,
                    data_source TEXT DEFAULT 'china_lottery',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    is_active INTEGER DEFAULT 1
                );

                CREATE INDEX IF NOT EXISTS idx_predictions_mode ON match_predictions(prediction_mode);
                CREATE INDEX IF NOT EXISTS idx_predictions_created ON match_predictions(created_at);
                CREATE INDEX IF NOT EXISTS idx_predictions_teams ON match_predictions(home_team, away_team);
                CREATE INDEX IF NOT EXISTS idx_predictions_result ON match_predictions(is_correct);
                CREATE INDEX IF NOT EXISTS idx_daily_matches_date ON daily_matches(match_date);
                CREATE INDEX IF NOT EXISTS idx_daily_matches_teams ON daily_matches(home_team, away_team);
                CREATE INDEX IF NOT EXISTS idx_daily_matches_league ON daily_matches(league_name);
                CREATE INDEX IF NOT EXISTS idx_daily_matches_status ON daily_matches(match_status);
                CREATE INDEX IF NOT EXISTS idx_daily_matches_active ON daily_matches(is_active);
                CREATE INDEX IF NOT EXISTS idx_daily_matches_datetime ON daily_matches(match_datetime);
                """
            )
        logger.info("Khởi tạo SQLite cục bộ thành công")

    def save_prediction(self, prediction_data: Dict[str, Any]) -> bool:
        try:
            with self.get_db_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO match_predictions (
                        prediction_id, user_id, username, prediction_mode,
                        home_team, away_team, league_name, match_time,
                        home_odds, draw_odds, away_odds, predicted_result,
                        prediction_confidence, ai_analysis, user_ip
                    ) VALUES (
                        :prediction_id, :user_id, :username, :prediction_mode,
                        :home_team, :away_team, :league_name, :match_time,
                        :home_odds, :draw_odds, :away_odds, :predicted_result,
                        :prediction_confidence, :ai_analysis, :user_ip
                    )
                    ON CONFLICT(prediction_id) DO UPDATE SET
                        updated_at = CURRENT_TIMESTAMP,
                        predicted_result = excluded.predicted_result,
                        prediction_confidence = excluded.prediction_confidence,
                        ai_analysis = excluded.ai_analysis
                    """,
                    {
                        "prediction_id": prediction_data.get("prediction_id"),
                        "user_id": prediction_data.get("user_id"),
                        "username": prediction_data.get("username"),
                        "prediction_mode": prediction_data.get("prediction_mode"),
                        "home_team": prediction_data.get("home_team", ""),
                        "away_team": prediction_data.get("away_team", ""),
                        "league_name": prediction_data.get("league_name", ""),
                        "match_time": str(prediction_data.get("match_time") or ""),
                        "home_odds": prediction_data.get("home_odds"),
                        "draw_odds": prediction_data.get("draw_odds"),
                        "away_odds": prediction_data.get("away_odds"),
                        "predicted_result": prediction_data.get("predicted_result", ""),
                        "prediction_confidence": prediction_data.get("prediction_confidence", 0),
                        "ai_analysis": prediction_data.get("ai_analysis", ""),
                        "user_ip": prediction_data.get("user_ip", "unknown"),
                    },
                )
            return True
        except Exception as exc:
            logger.error("Lưu kết quả dự đoán SQLite thất bại: %s", exc, exc_info=True)
            return False

    def save_ai_prediction(self, match_data: Dict[str, Any], prediction_result: str,
                           confidence: float, ai_analysis: str, user_ip: str = None,
                           user_id: int = None, username: str = None) -> bool:
        odds = match_data.get("odds", {})
        prediction_id = (
            f"ai_{match_data.get('home_team', '')}_{match_data.get('away_team', '')}_"
            f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        )
        dt = _parse_match_datetime(match_data)
        return self.save_prediction({
            "prediction_id": prediction_id,
            "prediction_mode": "AI",
            "user_id": user_id,
            "username": username,
            "home_team": match_data.get("home_team", ""),
            "away_team": match_data.get("away_team", ""),
            "league_name": match_data.get("league_name", ""),
            "match_time": dt,
            "home_odds": float(odds.get("home_odds", 0)) if odds.get("home_odds") else None,
            "draw_odds": float(odds.get("draw_odds", 0)) if odds.get("draw_odds") else None,
            "away_odds": float(odds.get("away_odds", 0)) if odds.get("away_odds") else None,
            "predicted_result": prediction_result,
            "prediction_confidence": confidence,
            "ai_analysis": ai_analysis,
            "user_ip": user_ip or "unknown",
        })

    def save_classic_prediction(self, match_data: Dict[str, Any], prediction_result: str,
                                confidence: float, user_ip: str = None,
                                user_id: int = None, username: str = None) -> bool:
        prediction_id = (
            f"classic_{match_data.get('home_team', '')}_{match_data.get('away_team', '')}_"
            f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        )
        return self.save_prediction({
            "prediction_id": prediction_id,
            "prediction_mode": "Classic",
            "user_id": user_id,
            "username": username,
            "home_team": match_data.get("home_team", ""),
            "away_team": match_data.get("away_team", ""),
            "league_name": match_data.get("league_name", ""),
            "match_time": None,
            "home_odds": float(match_data.get("home_odds", 0)) if match_data.get("home_odds") else None,
            "draw_odds": float(match_data.get("draw_odds", 0)) if match_data.get("draw_odds") else None,
            "away_odds": float(match_data.get("away_odds", 0)) if match_data.get("away_odds") else None,
            "predicted_result": prediction_result,
            "prediction_confidence": confidence,
            "ai_analysis": "Dự đoán chế độ cổ điển",
            "user_ip": user_ip or "unknown",
        })

    def save_lottery_prediction(self, match_data: Dict[str, Any], prediction_result: str,
                                confidence: float, ai_analysis: str, user_ip: str = None,
                                user_id: int = None, username: str = None) -> bool:
        odds = match_data.get("odds", {})
        hhad = odds.get("hhad", {})
        prediction_id = (
            f"lottery_{match_data.get('match_id', '')}_"
            f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        )
        dt = _parse_match_datetime(match_data)
        return self.save_prediction({
            "prediction_id": prediction_id,
            "prediction_mode": "Lottery",
            "user_id": user_id,
            "username": username,
            "home_team": match_data.get("home_team", ""),
            "away_team": match_data.get("away_team", ""),
            "league_name": match_data.get("league_name", ""),
            "match_time": dt,
            "home_odds": float(hhad.get("h", 0)) if hhad.get("h") else None,
            "draw_odds": float(hhad.get("d", 0)) if hhad.get("d") else None,
            "away_odds": float(hhad.get("a", 0)) if hhad.get("a") else None,
            "predicted_result": prediction_result,
            "prediction_confidence": confidence,
            "ai_analysis": ai_analysis,
            "user_ip": user_ip or "unknown",
        })

    def get_prediction_stats(self) -> Dict[str, Any]:
        try:
            with self.get_db_connection() as conn:
                mode_rows = conn.execute(
                    """
                    SELECT prediction_mode,
                           COUNT(*) AS total_predictions,
                           SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_predictions,
                           ROUND(AVG(prediction_confidence), 2) AS avg_confidence
                    FROM match_predictions
                    GROUP BY prediction_mode
                    ORDER BY prediction_mode
                    """
                ).fetchall()
                recent_rows = conn.execute(
                    """
                    SELECT home_team, away_team, predicted_result, is_correct, created_at
                    FROM match_predictions
                    ORDER BY created_at DESC
                    LIMIT 10
                    """
                ).fetchall()
            return {
                "mode_stats": [dict(row) for row in mode_rows],
                "recent_predictions": [dict(row) for row in recent_rows],
            }
        except Exception as exc:
            logger.error("Lấy thống kê SQLite thất bại: %s", exc, exc_info=True)
            return {"mode_stats": [], "recent_predictions": []}

    def save_daily_matches(self, matches_data: List[Dict[str, Any]]) -> Dict[str, int]:
        stats = {"inserted": 0, "updated": 0, "skipped": 0}
        try:
            with self.get_db_connection() as conn:
                for match in matches_data:
                    try:
                        match_id = str(match.get("match_id") or "").strip()
                        if not match_id:
                            stats["skipped"] += 1
                            continue

                        dt = _parse_match_datetime(match)
                        match_date = dt.date().isoformat() if dt else str(match.get("match_date") or "").strip()
                        if not match_date:
                            stats["skipped"] += 1
                            continue

                        match_time = dt.time().replace(microsecond=0).isoformat() if dt else ""
                        match_datetime = dt.replace(microsecond=0).isoformat(sep=" ") if dt else ""
                        odds = match.get("odds", {})
                        hhad = odds.get("hhad", {})
                        existing = conn.execute(
                            "SELECT id FROM daily_matches WHERE match_id = ?", (match_id,)
                        ).fetchone()

                        values = (
                            match.get("home_team", ""),
                            match.get("away_team", ""),
                            match.get("league_name", ""),
                            match_date,
                            match_time,
                            match_datetime,
                            match.get("match_num", ""),
                            match.get("status", ""),
                            float(hhad.get("h", 0)) if hhad.get("h") else None,
                            float(hhad.get("d", 0)) if hhad.get("d") else None,
                            float(hhad.get("a", 0)) if hhad.get("a") else None,
                            odds.get("goal_line", ""),
                            match.get("source", "china_lottery"),
                        )

                        if existing:
                            conn.execute(
                                """
                                UPDATE daily_matches SET
                                    home_team = ?, away_team = ?, league_name = ?,
                                    match_date = ?, match_time = ?, match_datetime = ?,
                                    match_num = ?, match_status = ?,
                                    home_odds = ?, draw_odds = ?, away_odds = ?,
                                    goal_line = ?, data_source = ?, updated_at = CURRENT_TIMESTAMP
                                WHERE match_id = ?
                                """,
                                values + (match_id,),
                            )
                            stats["updated"] += 1
                        else:
                            conn.execute(
                                """
                                INSERT INTO daily_matches (
                                    home_team, away_team, league_name,
                                    match_date, match_time, match_datetime,
                                    match_num, match_status,
                                    home_odds, draw_odds, away_odds,
                                    goal_line, data_source, match_id
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                                values + (match_id,),
                            )
                            stats["inserted"] += 1
                    except Exception as match_exc:
                        logger.warning("Lưu một trận vào SQLite thất bại: %s", match_exc)
                        stats["skipped"] += 1
            return stats
        except Exception as exc:
            logger.error("Lưu dữ liệu trận SQLite thất bại: %s", exc, exc_info=True)
            return stats

    def get_daily_matches(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        try:
            today = datetime.now().date()
            end_date = today + timedelta(days=days_ahead)
            with self.get_db_connection() as conn:
                rows = conn.execute(
                    """
                    SELECT match_id, home_team, away_team, league_name,
                           match_date, match_time, match_datetime, match_num,
                           match_status, home_odds, draw_odds, away_odds,
                           goal_line, data_source, updated_at
                    FROM daily_matches
                    WHERE match_date >= ? AND match_date <= ? AND is_active = 1
                    ORDER BY CASE WHEN match_datetime IS NULL OR match_datetime = ''
                                  THEN match_date ELSE match_datetime END ASC
                    """,
                    (today.isoformat(), end_date.isoformat()),
                ).fetchall()

            matches = []
            for row in rows:
                match_time_str = row["match_datetime"] or f"{row['match_date']} {row['match_time']}".strip()
                matches.append({
                    "match_id": row["match_id"],
                    "home_team": row["home_team"],
                    "away_team": row["away_team"],
                    "league_name": row["league_name"],
                    "match_time": match_time_str,
                    "match_date": row["match_date"] or "",
                    "match_num": row["match_num"],
                    "status": row["match_status"],
                    "source": "database",
                    "odds": {
                        "hhad": {
                            "h": str(row["home_odds"]) if row["home_odds"] is not None else "0",
                            "d": str(row["draw_odds"]) if row["draw_odds"] is not None else "0",
                            "a": str(row["away_odds"]) if row["away_odds"] is not None else "0",
                        },
                        "goal_line": row["goal_line"],
                    },
                })
            return matches
        except Exception as exc:
            logger.error("Lấy dữ liệu trận SQLite thất bại: %s", exc, exc_info=True)
            return []

    def cleanup_old_matches(self, days_to_keep: int = 30) -> int:
        cutoff = (datetime.now().date() - timedelta(days=days_to_keep)).isoformat()
        try:
            with self.get_db_connection() as conn:
                cursor = conn.execute("DELETE FROM daily_matches WHERE match_date < ?", (cutoff,))
                return cursor.rowcount
        except Exception as exc:
            logger.error("Dọn dữ liệu SQLite thất bại: %s", exc, exc_info=True)
            return 0

    def create_user(self, username: str, email: str, password_hash: str,
                    user_type: str = "free") -> bool:
        try:
            with self.get_db_connection() as conn:
                conn.execute(
                    "INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)",
                    (username, email, password_hash, user_type),
                )
            logger.info("Tạo người dùng SQLite thành công: %s", username)
            return True
        except sqlite3.IntegrityError:
            logger.warning("Tên người dùng hoặc email đã tồn tại: %s / %s", username, email)
            return False
        except Exception as exc:
            logger.error("Tạo người dùng SQLite thất bại: %s", exc, exc_info=True)
            return False

    def authenticate_user(self, username: str, password_hash: str) -> Optional[Dict[str, Any]]:
        try:
            with self.get_db_connection() as conn:
                row = conn.execute(
                    """
                    SELECT id, username, email, user_type, membership_expires,
                           daily_predictions_used, last_prediction_date, total_predictions
                    FROM users
                    WHERE username = ? AND password_hash = ? AND is_active = 1
                    """,
                    (username, password_hash),
                ).fetchone()
                if not row:
                    return None

                user = dict(row)
                today = datetime.now().date()
                last_date = _to_date(user.get("last_prediction_date"))
                if last_date and last_date < today:
                    conn.execute(
                        "UPDATE users SET daily_predictions_used = 0, last_prediction_date = ? WHERE id = ?",
                        (today.isoformat(), user["id"]),
                    )
                    user["daily_predictions_used"] = 0
                    user["last_prediction_date"] = today
                else:
                    user["last_prediction_date"] = last_date

                conn.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
                user["membership_expires"] = _to_date(user.get("membership_expires"))
                return user
        except Exception as exc:
            logger.error("Xác thực người dùng SQLite thất bại: %s", exc, exc_info=True)
            return None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        try:
            with self.get_db_connection() as conn:
                row = conn.execute(
                    """
                    SELECT id, username, email, user_type, membership_expires,
                           daily_predictions_used, last_prediction_date, total_predictions
                    FROM users
                    WHERE username = ? AND is_active = 1
                    """,
                    (username,),
                ).fetchone()
            if not row:
                return None
            user = dict(row)
            user["membership_expires"] = _to_date(user.get("membership_expires"))
            last_date = _to_date(user.get("last_prediction_date"))
            if last_date and last_date < datetime.now().date():
                user["daily_predictions_used"] = 0
            user["last_prediction_date"] = last_date
            return user
        except Exception as exc:
            logger.error("Lấy người dùng SQLite thất bại: %s", exc, exc_info=True)
            return None

    def increment_user_predictions(self, user_id: int) -> bool:
        try:
            with self.get_db_connection() as conn:
                conn.execute(
                    """
                    UPDATE users SET
                        daily_predictions_used = daily_predictions_used + 1,
                        total_predictions = total_predictions + 1,
                        last_prediction_date = ?
                    WHERE id = ?
                    """,
                    (datetime.now().date().isoformat(), user_id),
                )
            return True
        except Exception as exc:
            logger.error("Cập nhật lượt dự đoán SQLite thất bại: %s", exc, exc_info=True)
            return False

    def can_user_predict(self, user_id: int, user_type: str, daily_used: int) -> bool:
        if user_type == "premium":
            return True
        return int(daily_used or 0) < 3


PredictionDatabase = SQLitePredictionDatabase
prediction_db = SQLitePredictionDatabase()
