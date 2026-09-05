#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mô-đun quản lý cơ sở dữ liệu.
Dùng để lưu kết quả dự đoán vào PostgreSQL.
"""

import psycopg2
import psycopg2.extras
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import json
import contextlib  # Nạp contextlib

# Cấu hình log
logger = logging.getLogger(__name__)


class PredictionDatabase:
    """Quản lý cơ sở dữ liệu kết quả dự đoán."""

    def __init__(self):
        logger.info("Đang khởi tạo tham số kết nối cơ sở dữ liệu...")
        self.connection_params = {
            "host": os.getenv("DB_HOST", "dbprovider.ap-southeast-1.clawcloudrun.com"),
            "port": int(os.getenv("DB_PORT", "49674")),
            "database": os.getenv("DB_NAME", "postgres"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASS", "sbdx497p"),  # Bắt buộc cấu hình biến môi trường này trong production
            "sslmode": "prefer"
        }
        # self.init_tables()  # Không tự khởi tạo bảng khi ứng dụng chạy; thao tác này cần được gọi thủ công

    @contextlib.contextmanager
    def get_db_connection(self):
        """Lấy kết nối cơ sở dữ liệu bằng context manager và quản lý transaction."""
        conn = None
        try:
            conn = psycopg2.connect(**self.connection_params)
            conn.autocommit = False  # Tắt tự động commit để quản lý transaction thủ công
            logger.info("Kết nối cơ sở dữ liệu thành công, bắt đầu quản lý transaction")
            yield conn
            conn.commit()  # Commit khi thao tác thành công
            logger.info("Commit transaction thành công")
        except Exception as e:
            if conn:
                conn.rollback()  # Rollback khi thất bại
                logger.error(f"Thao tác cơ sở dữ liệu thất bại, đã rollback transaction: {e}")
            else:
                logger.error(f"Kết nối cơ sở dữ liệu thất bại: {e}", exc_info=True)
            raise  # Ném lại lỗi để tầng trên xử lý
        finally:
            if conn:
                conn.close()
                logger.info("Đã đóng kết nối cơ sở dữ liệu")

    # Đổi connect_to_database thành _get_conn, chỉ dùng nội bộ để lấy kết nối thô
    def _get_conn(self):
        """Phương thức nội bộ: lấy trực tiếp kết nối cơ sở dữ liệu, không quản lý transaction."""
        conn = None
        try:
            conn = psycopg2.connect(**self.connection_params)
            logger.debug("Kết nối cơ sở dữ liệu nội bộ thành công")
            return conn
        except Exception as e:
            logger.error(
                f"Kết nối cơ sở dữ liệu nội bộ thất bại: {e}, tham số: "
                f"{self.connection_params.get('host')}:{self.connection_params.get('port')}/"
                f"{self.connection_params.get('database')}",
                exc_info=True
            )
            if conn:
                conn.close()
            raise Exception(f"Kết nối cơ sở dữ liệu thất bại: {e}")

    def init_tables(self):
        """Khởi tạo bảng cơ sở dữ liệu; nên chạy như tác vụ quản trị độc lập, không tự chạy khi ứng dụng khởi động."""
        conn = None
        try:
            conn = self._get_conn()  # Dùng phương thức nội bộ để lấy kết nối thô
            cursor = conn.cursor()

            # Tạo bảng người dùng
            create_users_table = """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                user_type VARCHAR(20) DEFAULT 'free',
                membership_expires DATE,
                daily_predictions_used INTEGER DEFAULT 0,
                last_prediction_date DATE DEFAULT CURRENT_DATE,
                total_predictions INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
            """

            # Tạo bảng bản ghi dự đoán
            create_predictions_table = """
            CREATE TABLE IF NOT EXISTS match_predictions (
                id SERIAL PRIMARY KEY,
                prediction_id VARCHAR(100) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id),
                username VARCHAR(50),
                prediction_mode VARCHAR(20) NOT NULL,
                home_team VARCHAR(100) NOT NULL,
                away_team VARCHAR(100) NOT NULL,
                league_name VARCHAR(100),
                match_time TIMESTAMP,
                home_odds DECIMAL(6,2),
                draw_odds DECIMAL(6,2),
                away_odds DECIMAL(6,2),
                predicted_result VARCHAR(20),
                prediction_confidence DECIMAL(5,2),
                ai_analysis TEXT,
                user_ip VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actual_result VARCHAR(20),
                actual_score VARCHAR(20),
                is_correct BOOLEAN,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """

            # Tạo bảng trận đấu hằng ngày
            create_daily_matches_table = """
            CREATE TABLE IF NOT EXISTS daily_matches (
                id SERIAL PRIMARY KEY,
                match_id VARCHAR(100) UNIQUE NOT NULL,
                home_team VARCHAR(100) NOT NULL,
                away_team VARCHAR(100) NOT NULL,
                league_name VARCHAR(100),
                match_date DATE NOT NULL,
                match_time TIME,
                match_datetime TIMESTAMP,
                match_num VARCHAR(20),
                match_status VARCHAR(20),
                home_odds DECIMAL(6,2),
                draw_odds DECIMAL(6,2),
                away_odds DECIMAL(6,2),
                goal_line VARCHAR(10),
                data_source VARCHAR(50) DEFAULT 'china_lottery',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
            """

            cursor.execute(create_users_table)
            cursor.execute(create_predictions_table)
            cursor.execute(create_daily_matches_table)

            # Tạo index
            create_index_sql = [
                # Index cho bảng dự đoán
                "CREATE INDEX IF NOT EXISTS idx_predictions_mode ON match_predictions(prediction_mode);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_created ON match_predictions(created_at);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_teams ON match_predictions(home_team, away_team);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_result ON match_predictions(is_correct);",

                # Index cho bảng trận đấu hằng ngày
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_date ON daily_matches(match_date);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_teams ON daily_matches(home_team, away_team);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_league ON daily_matches(league_name);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_status ON daily_matches(match_status);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_active ON daily_matches(is_active);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_datetime ON daily_matches(match_datetime);"
            ]

            for sql in create_index_sql:
                cursor.execute(sql)

            conn.commit()
            cursor.close()
            logger.info("Khởi tạo bảng cơ sở dữ liệu thành công")

        except Exception as e:
            logger.error(f"Khởi tạo bảng cơ sở dữ liệu thất bại: {e}", exc_info=True)
            if conn:
                conn.rollback()
                conn.close()
            raise Exception(f"Khởi tạo cơ sở dữ liệu thất bại: {e}")
        finally:
            if conn:
                try:
                    conn.close()
                    logger.info("Đã đóng kết nối cơ sở dữ liệu")
                except Exception as e:
                    logger.error(f"Đóng kết nối cơ sở dữ liệu thất bại: {e}", exc_info=True)

    def save_prediction(self, prediction_data: Dict[str, Any]) -> bool:
        """
        Lưu kết quả dự đoán vào cơ sở dữ liệu.

        Args:
            prediction_data: dict dữ liệu dự đoán

        Returns:
            trạng thái lưu thành công hay không
        """
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()

                # Chuẩn bị dữ liệu insert
                insert_sql = """
            INSERT INTO match_predictions (
                prediction_id, prediction_mode, home_team, away_team, league_name,
                match_time, home_odds, draw_odds, away_odds, predicted_result,
                prediction_confidence, ai_analysis, user_ip
            ) VALUES (
                %(prediction_id)s, %(prediction_mode)s, %(home_team)s, %(away_team)s, %(league_name)s,
                %(match_time)s, %(home_odds)s, %(draw_odds)s, %(away_odds)s, %(predicted_result)s,
                %(prediction_confidence)s, %(ai_analysis)s, %(user_ip)s
            ) ON CONFLICT (prediction_id) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP,
                predicted_result = EXCLUDED.predicted_result,
                prediction_confidence = EXCLUDED.prediction_confidence,
                ai_analysis = EXCLUDED.ai_analysis;
            """

                cursor.execute(insert_sql, prediction_data)
                # conn.commit()  # Context manager xử lý
                cursor.close()
                # conn.close()  # Context manager xử lý

                logger.info(f"Lưu kết quả dự đoán thành công: {prediction_data.get('prediction_id')}")
                return True

        except Exception as e:
            logger.error(f"Lưu kết quả dự đoán thất bại: {e}")
            return False

    def save_ai_prediction(self, match_data: Dict[str, Any], prediction_result: str,
                          confidence: float, ai_analysis: str, user_ip: str = None,
                          user_id: int = None, username: str = None) -> bool:
        """
        Lưu kết quả dự đoán chế độ AI.

        Args:
            match_data: dữ liệu trận đấu
            prediction_result: kết quả dự đoán
            confidence: độ tin cậy dự đoán (0-10)
            ai_analysis: nội dung phân tích AI
            user_ip: IP người dùng

        Returns:
            trạng thái lưu thành công hay không
        """
        try:
            # Trích xuất tỷ lệ cược
            odds = match_data.get('odds', {})

            # Tạo ID dự đoán
            prediction_id = f"ai_{match_data.get('home_team', '')}_{match_data.get('away_team', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

            # Phân tích thời gian trận đấu
            match_time = None
            if match_data.get('match_time'):
                try:
                    match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M:%S')
                except:
                    try:
                        match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M')
                    except:
                        pass

            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'AI',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': match_time,
                'home_odds': float(odds.get('home_odds', 0)) if odds.get('home_odds') else None,
                'draw_odds': float(odds.get('draw_odds', 0)) if odds.get('draw_odds') else None,
                'away_odds': float(odds.get('away_odds', 0)) if odds.get('away_odds') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': confidence,
                'ai_analysis': ai_analysis,
                'user_ip': user_ip or 'unknown'
            }

            return self.save_prediction(prediction_data)

        except Exception as e:
            logger.error(f"Lưu dự đoán AI thất bại: {e}")
            return False

    def save_classic_prediction(self, match_data: Dict[str, Any], prediction_result: str,
                               confidence: float, user_ip: str = None,
                               user_id: int = None, username: str = None) -> bool:
        """
        Lưu kết quả dự đoán chế độ cổ điển.

        Args:
            match_data: dữ liệu trận đấu
            prediction_result: kết quả dự đoán
            confidence: độ tin cậy dự đoán
            user_ip: IP người dùng

        Returns:
            trạng thái lưu thành công hay không
        """
        try:
            prediction_id = f"classic_{match_data.get('home_team', '')}_{match_data.get('away_team', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'Classic',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': None,
                'home_odds': float(match_data.get('home_odds', 0)) if match_data.get('home_odds') else None,
                'draw_odds': float(match_data.get('draw_odds', 0)) if match_data.get('draw_odds') else None,
                'away_odds': float(match_data.get('away_odds', 0)) if match_data.get('away_odds') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': confidence,
                'ai_analysis': 'Dự đoán chế độ cổ điển',
                'user_ip': user_ip or 'unknown'
            }

            return self.save_prediction(prediction_data)

        except Exception as e:
            logger.error(f"Lưu dự đoán cổ điển thất bại: {e}")
            return False

    def save_lottery_prediction(self, match_data: Dict[str, Any], prediction_result: str,
                               confidence: float, ai_analysis: str, user_ip: str = None,
                               user_id: int = None, username: str = None) -> bool:
        """
        Lưu kết quả dự đoán chế độ xổ số thể thao.

        Args:
            match_data: dữ liệu trận đấu
            prediction_result: kết quả dự đoán
            confidence: độ tin cậy dự đoán
            ai_analysis: nội dung phân tích AI
            user_ip: IP người dùng

        Returns:
            trạng thái lưu thành công hay không
        """
        try:
            # Trích xuất tỷ lệ cược
            odds = match_data.get('odds', {})
            hhad_odds = odds.get('hhad', {})

            prediction_id = f"lottery_{match_data.get('match_id', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

            # Phân tích thời gian trận đấu
            match_time = None
            if match_data.get('match_time'):
                try:
                    match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M:%S')
                except:
                    try:
                        match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M')
                    except:
                        pass

            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'Lottery',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': match_time,
                'home_odds': float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                'draw_odds': float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                'away_odds': float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': confidence,
                'ai_analysis': ai_analysis,
                'user_ip': user_ip or 'unknown'
            }

            return self.save_prediction(prediction_data)

        except Exception as e:
            logger.error(f"Lưu dự đoán xổ số thể thao thất bại: {e}")
            return False

    def get_prediction_stats(self) -> Dict[str, Any]:
        """Lấy thống kê dự đoán."""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

                # Thống kê tổng thể
                stats_sql = """
            SELECT 
                prediction_mode,
                COUNT(*) as total_predictions,
                COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_predictions,
                ROUND(AVG(prediction_confidence), 2) as avg_confidence
            FROM match_predictions 
            GROUP BY prediction_mode
            ORDER BY prediction_mode;
            """

                cursor.execute(stats_sql)
                mode_stats = cursor.fetchall()

                # Các dự đoán gần nhất
                recent_sql = """
            SELECT home_team, away_team, predicted_result, is_correct, created_at
            FROM match_predictions 
            ORDER BY created_at DESC 
            LIMIT 10;
            """

                cursor.execute(recent_sql)
                recent_predictions = cursor.fetchall()

                cursor.close()

                return {
                    'mode_stats': [dict(row) for row in mode_stats],
                    'recent_predictions': [dict(row) for row in recent_predictions]
                }

        except Exception as e:
            logger.error(f"Lấy thống kê thất bại: {e}")
            return {'mode_stats': [], 'recent_predictions': []}

    def save_daily_matches(self, matches_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Lưu dữ liệu trận đấu hằng ngày vào cơ sở dữ liệu.

        Args:
            matches_data: danh sách dữ liệu trận đấu

        Returns:
            dict thống kê {'inserted': số thêm mới, 'updated': số cập nhật, 'skipped': số bỏ qua}
        """
        stats = {'inserted': 0, 'updated': 0, 'skipped': 0}
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()

                for match in matches_data:
                    try:
                        # Phân tích thời gian trận đấu
                        match_datetime = None
                        match_date = None
                        match_time = None

                        if match.get('match_time'):
                            try:
                                match_datetime = datetime.strptime(match['match_time'], '%Y-%m-%d %H:%M:%S')
                                match_date = match_datetime.date()
                                match_time = match_datetime.time()
                            except:
                                try:
                                    match_datetime = datetime.strptime(match['match_time'], '%Y-%m-%d %H:%M')
                                    match_date = match_datetime.date()
                                    match_time = match_datetime.time()
                                except:
                                    if match.get('match_date'):
                                        match_date = datetime.strptime(match['match_date'], '%Y-%m-%d').date()

                        # Trích xuất tỷ lệ cược
                        odds = match.get('odds', {})
                        hhad_odds = odds.get('hhad', {})

                        # Kiểm tra bản ghi đã tồn tại chưa
                        check_sql = "SELECT id FROM daily_matches WHERE match_id = %s"
                        cursor.execute(check_sql, (match.get('match_id'),))
                        existing = cursor.fetchone()

                        if existing:
                            # Cập nhật bản ghi hiện có
                            update_sql = """
                        UPDATE daily_matches SET
                            home_team = %s,
                            away_team = %s,
                            league_name = %s,
                            match_date = %s,
                            match_time = %s,
                            match_datetime = %s,
                            match_num = %s,
                            match_status = %s,
                            home_odds = %s,
                            draw_odds = %s,
                            away_odds = %s,
                            goal_line = %s,
                            data_source = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE match_id = %s
                        """

                            cursor.execute(update_sql, (
                                match.get('home_team', ''),
                                match.get('away_team', ''),
                                match.get('league_name', ''),
                                match_date,
                                match_time,
                                match_datetime,
                                match.get('match_num', ''),
                                match.get('status', ''),
                                float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                                float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                                float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                                odds.get('goal_line', ''),
                                match.get('source', 'china_lottery'),
                                match.get('match_id')
                            ))
                            stats['updated'] += 1

                        else:
                            # Thêm bản ghi mới
                            insert_sql = """
                        INSERT INTO daily_matches (
                            match_id, home_team, away_team, league_name,
                            match_date, match_time, match_datetime, match_num,
                            match_status, home_odds, draw_odds, away_odds,
                            goal_line, data_source
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        """

                            cursor.execute(insert_sql, (
                                match.get('match_id', ''),
                                match.get('home_team', ''),
                                match.get('away_team', ''),
                                match.get('league_name', ''),
                                match_date,
                                match_time,
                                match_datetime,
                                match.get('match_num', ''),
                                match.get('status', ''),
                                float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                                float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                                float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                                odds.get('goal_line', ''),
                                match.get('source', 'china_lottery')
                            ))
                            stats['inserted'] += 1

                    except Exception as match_error:
                        logger.warning(f"Lưu một trận thất bại: {match_error}")
                        stats['skipped'] += 1
                        continue

                cursor.close()

                logger.info(
                    f"Lưu dữ liệu trận hằng ngày hoàn tất - Thêm mới:{stats['inserted']}, "
                    f"Cập nhật:{stats['updated']}, Bỏ qua:{stats['skipped']}"
                )
                return stats

        except Exception as e:
            logger.error(f"Lưu dữ liệu trận hằng ngày thất bại: {e}")
            return stats

    def get_daily_matches(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """
        Lấy dữ liệu trận đấu hằng ngày từ cơ sở dữ liệu.

        Args:
            days_ahead: số ngày phía trước

        Returns:
            danh sách dữ liệu trận đấu
        """
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

                # Tính phạm vi ngày
                today = datetime.now().date()
                end_date = today + timedelta(days=days_ahead)

                query_sql = """
            SELECT 
                match_id, home_team, away_team, league_name,
                match_date, match_time, match_datetime, match_num,
                match_status, home_odds, draw_odds, away_odds,
                goal_line, data_source, updated_at
            FROM daily_matches 
            WHERE match_date >= %s AND match_date <= %s 
            AND is_active = TRUE
            ORDER BY match_datetime ASC, match_date ASC, match_time ASC
            """

                cursor.execute(query_sql, (today, end_date))
                results = cursor.fetchall()

                # Chuyển về định dạng chuẩn
                matches = []
                for row in results:
                    match_time_str = ''
                    if row['match_datetime']:
                        match_time_str = row['match_datetime'].strftime('%Y-%m-%d %H:%M:%S')
                    elif row['match_date'] and row['match_time']:
                        match_time_str = f"{row['match_date']} {row['match_time']}"
                    elif row['match_date']:
                        match_time_str = str(row['match_date'])

                    match_data = {
                        'match_id': row['match_id'],
                        'home_team': row['home_team'],
                        'away_team': row['away_team'],
                        'league_name': row['league_name'],
                        'match_time': match_time_str,
                        'match_date': str(row['match_date']) if row['match_date'] else '',
                        'match_num': row['match_num'],
                        'status': row['match_status'],
                        'source': 'database',
                        'odds': {
                            'hhad': {
                                'h': str(row['home_odds']) if row['home_odds'] else '0',
                                'd': str(row['draw_odds']) if row['draw_odds'] else '0',
                                'a': str(row['away_odds']) if row['away_odds'] else '0'
                            },
                            'goal_line': row['goal_line']
                        }
                    }
                    matches.append(match_data)

                cursor.close()

                logger.info(f"Đã lấy {len(matches)} trận từ cơ sở dữ liệu")
                return matches

        except Exception as e:
            logger.error(f"Lấy dữ liệu trận từ cơ sở dữ liệu thất bại: {e}")
            return []

    def cleanup_old_matches(self, days_to_keep: int = 30) -> int:
        """
        Dọn dữ liệu trận đấu cũ.

        Args:
            days_to_keep: số ngày cần giữ lại

        Returns:
            số bản ghi đã xóa
        """
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()

                cutoff_date = datetime.now().date() - timedelta(days=days_to_keep)

                delete_sql = """
            DELETE FROM daily_matches 
            WHERE match_date < %s
            """

                cursor.execute(delete_sql, (cutoff_date,))
                deleted_count = cursor.rowcount

                conn.commit()
                cursor.close()

                logger.info(f"Đã dọn {deleted_count} bản ghi trận đấu cũ")
                return deleted_count

        except Exception as e:
            logger.error(f"Dọn dữ liệu trận cũ thất bại: {e}")
            return 0

    # Các phương thức quản lý người dùng
    def create_user(self, username: str, email: str, password_hash: str, user_type: str = 'free') -> bool:
        """Tạo người dùng mới."""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()

                insert_sql = """
            INSERT INTO users (username, email, password_hash, user_type)
            VALUES (%s, %s, %s, %s)
            """
                cursor.execute(insert_sql, (username, email, password_hash, user_type))

                logger.info(f"Tạo người dùng thành công: {username}")
                return True

        except psycopg2.IntegrityError as e:
            logger.warning(f"Tạo người dùng thất bại, tên người dùng hoặc email đã tồn tại: {username}, {email}")
            return False
        except Exception as e:
            logger.error(f"Tạo người dùng thất bại: {e}")
            return False

    def authenticate_user(self, username: str, password_hash: str) -> dict:
        """Xác thực người dùng."""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

                select_sql = """
            SELECT id, username, email, user_type, membership_expires, 
                   daily_predictions_used, last_prediction_date, total_predictions
            FROM users 
            WHERE username = %s AND password_hash = %s AND is_active = TRUE
            """
                cursor.execute(select_sql, (username, password_hash))
                user_data = cursor.fetchone()

                if user_data:
                    # Cập nhật thời gian đăng nhập gần nhất
                    update_sql = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s"
                    cursor.execute(update_sql, (user_data['id'],))
                    conn.commit()

                    # Kiểm tra có cần đặt lại số lượt dùng hằng ngày hay không
                    today = datetime.now().date()
                    last_prediction_date = user_data['last_prediction_date']

                    if last_prediction_date and last_prediction_date < today:
                        reset_sql = """
                    UPDATE users SET daily_predictions_used = 0, last_prediction_date = %s 
                    WHERE id = %s
                    """
                        cursor.execute(reset_sql, (today, user_data['id']))
                        conn.commit()
                        user_data['daily_predictions_used'] = 0

                    logger.info(f"Xác thực người dùng thành công: {username}")
                    return user_data
                else:
                    logger.warning(f"Xác thực thất bại: tên người dùng hoặc mật khẩu không đúng - {username}")
                    return None

        except Exception as e:
            logger.error(f"Xác thực người dùng thất bại: {e}", exc_info=True)
            return None

    def get_user_by_username(self, username: str) -> dict:
        """Lấy thông tin người dùng theo tên đăng nhập."""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

                select_sql = """
            SELECT id, username, email, user_type, membership_expires, 
                   daily_predictions_used, last_prediction_date, total_predictions
            FROM users 
            WHERE username = %s AND is_active = TRUE
            """
                cursor.execute(select_sql, (username,))
                user_data = cursor.fetchone()

                if user_data:
                    # Kiểm tra có cần đặt lại số lượt dùng hằng ngày hay không; chỉ cập nhật dữ liệu trả về
                    today = datetime.now().date()
                    last_prediction_date = user_data['last_prediction_date']

                    if last_prediction_date and last_prediction_date < today:
                        user_data['daily_predictions_used'] = 0
                        # Không commit ở đây vì đây là thao tác đọc; logic đặt lại chính nằm trong authenticate_user

                    return user_data
                return None

        except Exception as e:
            logger.error(f"Lấy thông tin người dùng thất bại: {e}", exc_info=True)
            return None

    def increment_user_predictions(self, user_id: int) -> bool:
        """Tăng số lượt dự đoán của người dùng."""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()

                today = datetime.now().date()
                update_sql = """
            UPDATE users SET 
                daily_predictions_used = daily_predictions_used + 1,
                total_predictions = total_predictions + 1,
                last_prediction_date = %s
            WHERE id = %s
            """
                cursor.execute(update_sql, (today, user_id))

                return True

        except Exception as e:
            logger.error(f"Cập nhật số lượt dự đoán của người dùng thất bại: {e}")
            return False

    def can_user_predict(self, user_id: int, user_type: str, daily_used: int) -> bool:
        """Kiểm tra người dùng có thể tiếp tục dự đoán hay không."""
        if user_type == 'premium':
            return True
        else:
            return daily_used < 3


# Tạo instance cơ sở dữ liệu toàn cục
prediction_db = PredictionDatabase()


def main():
    """Hàm kiểm tra."""
    try:
        db = PredictionDatabase()
        print("✅ Kết nối cơ sở dữ liệu và tạo bảng thành công")

        # Kiểm tra lưu dự đoán AI
        test_match = {
            'home_team': 'Đội chủ nhà thử nghiệm',
            'away_team': 'Đội khách thử nghiệm',
            'league_name': 'Giải đấu thử nghiệm',
            'match_time': '2025-09-20 15:00:00',
            'odds': {
                'home_odds': '2.10',
                'draw_odds': '3.20',
                'away_odds': '2.80'
            }
        }

        success = db.save_ai_prediction(
            match_data=test_match,
            prediction_result='Chủ nhà thắng',
            confidence=7.5,
            ai_analysis='Đây là một dự đoán thử nghiệm',
            user_ip='127.0.0.1'
        )

        if success:
            print("✅ Lưu dự đoán thử nghiệm thành công")
        else:
            print("❌ Lưu dự đoán thử nghiệm thất bại")

        # Lấy thống kê
        stats = db.get_prediction_stats()
        print(f"📊 Thống kê: {stats}")

    except Exception as e:
        print(f"❌ Kiểm tra thất bại: {e}")


if __name__ == "__main__":
    main()
