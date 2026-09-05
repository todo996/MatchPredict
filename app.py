from flask import Flask, request, jsonify, render_template, session, make_response
import os
import json
import logging
import requests
import hashlib
import psycopg2
from datetime import datetime, timedelta

# Thử nạp mô-đun cơ sở dữ liệu
try:
    from scripts.database import prediction_db
    print("✅ Đã nạp mô-đun cơ sở dữ liệu")
except ImportError as e:
    print(f"⚠️ Không thể nạp mô-đun cơ sở dữ liệu: {e}")
    prediction_db = None

# Nạp trễ để tránh vấn đề trong môi trường Vercel
try:
    from lottery_api import ChinaSportsLotterySpider
except ImportError as e:
    print(f"Không thể nạp API xổ số thể thao: {e}")
    ChinaSportsLotterySpider = None

try:
    from ai_predictor import AIFootballPredictor
except ImportError as e:
    print(f"Không thể nạp trình dự đoán AI: {e}")
    AIFootballPredictor = None

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')  # Bắt buộc dùng SECRET_KEY mạnh và ngẫu nhiên trong production
# Cấu hình Session/Cookie để trạng thái đăng nhập hoạt động ổn định
app.config.update(
    SESSION_COOKIE_NAME='mp_session',
    # 'None' hỗ trợ yêu cầu khác site (ví dụ frontend và backend khác domain) nhưng yêu cầu Secure=True (HTTPS)
    # Nếu frontend và backend ở các subdomain của cùng domain chính,
    # có thể đặt SESSION_COOKIE_DOMAIN thành '.example.com' để chia sẻ Cookie giữa các subdomain.
    SESSION_COOKIE_SAMESITE=os.environ.get('SESSION_COOKIE_SAMESITE', 'None'),
    SESSION_COOKIE_SECURE=True,
    # Tùy chọn: cấu hình domain Cookie qua biến môi trường; chỉ cần khi chia sẻ Cookie giữa các subdomain.
    SESSION_COOKIE_DOMAIN=os.environ.get('SESSION_COOKIE_DOMAIN'),
    PERMANENT_SESSION_LIFETIME=timedelta(days=7)
)

# Cấu hình log
logging.basicConfig(level=logging.INFO)

# Biến toàn cục
lottery_spider = None
ai_predictor = None

# Cấu hình giải đấu (bản đơn giản)
LEAGUES = {
    "PL": "Ngoại hạng Anh",
    "PD": "La Liga",
    "SA": "Serie A",
    "BL1": "Bundesliga",
    "FL1": "Ligue 1"
}

# Dữ liệu đội bóng dạng đơn giản
TEAMS_DATA = {
    "PL": ["Arsenal FC", "Manchester City FC", "Liverpool FC", "Manchester United FC", "Chelsea FC", "Tottenham Hotspur FC", "Newcastle United FC", "Brighton & Hove Albion FC"],
    "PD": ["Real Madrid CF", "FC Barcelona", "Atlético de Madrid", "Sevilla FC", "Valencia CF", "Real Betis Balompié", "Real Sociedad de Fútbol", "Athletic Club"],
    "SA": ["FC Internazionale Milano", "AC Milan", "Juventus FC", "SSC Napoli", "AS Roma", "SS Lazio", "Atalanta BC", "ACF Fiorentina"],
    "BL1": ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer 04 Leverkusen", "VfB Stuttgart", "Eintracht Frankfurt", "VfL Wolfsburg", "SC Freiburg"],
    "FL1": ["Paris Saint-Germain FC", "Olympique de Marseille", "AS Monaco FC", "Olympique Lyonnais", "OGC Nice", "Stade Rennais FC", "RC Lens", "LOSC Lille"]
}


def initialize_services():
    """Khởi tạo các dịch vụ."""
    global lottery_spider, ai_predictor

    try:
        if ChinaSportsLotterySpider:
            lottery_spider = ChinaSportsLotterySpider()
            app.logger.info("Đã khởi tạo API xổ số thể thao")
        else:
            app.logger.warning("Chưa nạp lớp API xổ số thể thao")
    except Exception as e:
        app.logger.error(f"Khởi tạo API xổ số thể thao thất bại: {e}")
        lottery_spider = None

    try:
        if AIFootballPredictor:
            gemini_api_key = os.environ.get('GEMINI_API_KEY')
            gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite-preview-06-17')

            if not gemini_api_key:
                app.logger.warning("Chưa đặt biến môi trường GEMINI_API_KEY, chức năng dự đoán AI sẽ không khả dụng")
                ai_predictor = None
            else:
                ai_predictor = AIFootballPredictor(
                    api_key=gemini_api_key,
                    model_name=gemini_model
                )
                app.logger.info("Đã khởi tạo trình dự đoán AI")
        else:
            app.logger.warning("Chưa nạp lớp trình dự đoán AI")
    except Exception as e:
        app.logger.error(f"Khởi tạo trình dự đoán AI thất bại: {e}")
        ai_predictor = None


try:
    initialize_services()
except Exception as e:
    app.logger.error(f"Khởi tạo dịch vụ thất bại: {e}")


# Hàm hỗ trợ xác thực người dùng
def hash_password(password):
    """Băm mật khẩu."""
    return hashlib.sha256(password.encode()).hexdigest()


# Đã loại bỏ simple_create_user_db vì prediction_db.create_user đã đủ ổn định.
def get_current_user():
    """Lấy người dùng đang đăng nhập."""
    if 'user_id' in session:
        return prediction_db.get_user_by_username(session['username']) if prediction_db else None
    return None


def require_login():
    """Kiểm tra người dùng có cần đăng nhập hay không."""
    return get_current_user() is None


@app.after_request
def add_cors_headers(response):
    """Bổ sung CORS cơ bản cho các endpoint cần thiết và tránh OPTIONS 405."""
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        app.logger.debug(f"Đã thêm header CORS cho {request.path}, Origin: {origin}")
    if request.method == 'OPTIONS':
        response.status_code = 204
        app.logger.debug(f"Xử lý yêu cầu OPTIONS: {request.path}")
    return response


@app.route('/api/session/debug')
def session_debug():
    """Dùng để gỡ lỗi: kiểm tra phiên hiện tại. Có thể xóa khi production."""
    return jsonify({
        'logged_in': 'user_id' in session,
        'user_id': session.get('user_id'),
        'username': session.get('username')
    })


@app.route('/')
def index():
    try:
        gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
        gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite-preview-06-17')

        current_user = get_current_user()

        return render_template('index.html',
                             gemini_api_key=gemini_api_key,
                             gemini_model=gemini_model,
                             current_user=current_user)
    except Exception as e:
        app.logger.error(f"Không thể hiển thị trang chủ: {e}")
        return f"Lỗi tải trang: {str(e)}", 500


@app.route('/api/teams')
def get_teams():
    """Lấy dữ liệu đội bóng."""
    try:
        teams = {
            "PL": ["Arsenal FC", "Manchester City FC", "Liverpool FC", "Manchester United FC",
                   "Chelsea FC", "Tottenham Hotspur FC", "Newcastle United FC", "Brighton & Hove Albion FC"],
            "PD": ["Real Madrid CF", "FC Barcelona", "Atlético de Madrid", "Sevilla FC",
                   "Valencia CF", "Real Betis Balompié", "Real Sociedad", "Athletic Bilbao"],
            "SA": ["FC Internazionale Milano", "AC Milan", "Juventus FC", "SSC Napoli",
                   "AS Roma", "SS Lazio", "Atalanta BC", "ACF Fiorentina"],
            "BL1": ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer 04 Leverkusen",
                    "VfB Stuttgart", "Eintracht Frankfurt", "Borussia Mönchengladbach", "VfL Wolfsburg"],
            "FL1": ["Paris Saint-Germain FC", "Olympique de Marseille", "AS Monaco FC", "Olympique Lyonnais",
                    "OGC Nice", "Stade Rennais FC", "RC Lens", "RC Strasbourg Alsace"]
        }

        return jsonify({
            'success': True,
            'teams': teams,
            'message': 'Đã lấy dữ liệu đội bóng'
        })

    except Exception as e:
        app.logger.error(f"Không thể lấy dữ liệu đội bóng: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Không thể lấy dữ liệu đội bóng'
        }), 500


@app.route('/api/lottery/matches')
def get_lottery_matches():
    """Lấy dữ liệu trận Xổ số Thể thao Trung Quốc - chỉ từ cơ sở dữ liệu."""
    try:
        days = request.args.get('days', 3, type=int)
        days = min(max(days, 1), 7)

        app.logger.info(f"📊 Lấy dữ liệu xổ số thể thao từ cơ sở dữ liệu - số ngày: {days}")

        if not prediction_db:
            app.logger.error("❌ Cơ sở dữ liệu chưa được khởi tạo")
            return jsonify({
                'success': False,
                'error': 'Chưa cấu hình cơ sở dữ liệu',
                'message': 'Không thể kết nối cơ sở dữ liệu. Vui lòng liên hệ quản trị viên'
            }), 500

        try:
            db_matches = prediction_db.get_daily_matches(days_ahead=days)

            if db_matches and len(db_matches) > 0:
                app.logger.info(f"✅ Đã lấy {len(db_matches)} trận từ cơ sở dữ liệu")

                return jsonify({
                    'success': True,
                    'matches': db_matches,
                    'count': len(db_matches),
                    'message': f'Đã lấy {len(db_matches)} trận từ cơ sở dữ liệu',
                    'source': 'database'
                })
            else:
                app.logger.warning("⚠️ Không tìm thấy dữ liệu trận đấu trong cơ sở dữ liệu")

                return jsonify({
                    'success': False,
                    'error': 'Chưa có dữ liệu trận đấu',
                    'message': 'Cơ sở dữ liệu chưa có dữ liệu trận đấu. Hãy chạy script đồng bộ: python scripts/sync_daily_matches.py --days 7'
                }), 404

        except Exception as db_error:
            app.logger.error(f"❌ Truy vấn cơ sở dữ liệu thất bại: {db_error}")

            return jsonify({
                'success': False,
                'error': str(db_error),
                'message': 'Truy vấn cơ sở dữ liệu thất bại, vui lòng thử lại sau'
            }), 500

    except Exception as e:
        app.logger.error(f"❌ Không thể lấy dữ liệu xổ số thể thao: {e}")

        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Lỗi hệ thống, hiện chưa thể lấy dữ liệu'
        }), 500


@app.route('/api/save-prediction', methods=['POST'])
def save_prediction():
    """Lưu kết quả dự đoán vào cơ sở dữ liệu."""
    try:
        if not prediction_db:
            return jsonify({
                'success': False,
                'message': 'Chưa cấu hình cơ sở dữ liệu'
            }), 500

        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Vui lòng đăng nhập trước khi dự đoán'
            }), 401

        can_predict = prediction_db.can_user_predict(
            current_user['id'],
            current_user['user_type'],
            current_user['daily_predictions_used']
        )

        if not can_predict:
            return jsonify({
                'success': False,
                'message': 'Bạn đã dùng hết lượt dự đoán miễn phí hôm nay. Vui lòng nâng cấp VIP'
            }), 403

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dữ liệu yêu cầu đang trống'
            }), 400

        prediction_mode = data.get('mode', '').lower()
        match_data = data.get('match_data', {})
        prediction_result = data.get('prediction_result', '')
        confidence = data.get('confidence', 0)
        ai_analysis = data.get('ai_analysis', '')
        user_ip = request.remote_addr

        success = False

        if prediction_mode == 'ai':
            success = prediction_db.save_ai_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                ai_analysis=ai_analysis,
                user_ip=user_ip,
                user_id=current_user['id'],
                username=current_user['username']
            )
        elif prediction_mode == 'classic':
            success = prediction_db.save_classic_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                user_ip=user_ip,
                user_id=current_user['id'],
                username=current_user['username']
            )
        elif prediction_mode == 'lottery':
            success = prediction_db.save_lottery_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                ai_analysis=ai_analysis,
                user_ip=user_ip,
                user_id=current_user['id'],
                username=current_user['username']
            )
        else:
            return jsonify({
                'success': False,
                'message': 'Chế độ dự đoán không hợp lệ'
            }), 400

        if success:
            prediction_db.increment_user_predictions(current_user['id'])

            updated_user = prediction_db.get_user_by_username(current_user['username'])

            if updated_user:
                session['user_id'] = updated_user['id']
                session['username'] = updated_user['username']
                session.permanent = True
                app.logger.info(f"Đã cập nhật số lượt dự đoán của {updated_user['username']}: {updated_user['daily_predictions_used']}")
                return jsonify({
                    'success': True,
                    'message': 'Đã lưu kết quả dự đoán',
                    'user': {
                        'username': updated_user['username'],
                        'user_type': updated_user['user_type'],
                        'daily_predictions_used': updated_user['daily_predictions_used'],
                        'total_predictions': updated_user['total_predictions'],
                        'membership_expires': updated_user['membership_expires'].isoformat() if updated_user['membership_expires'] else None
                    }
                })
            else:
                app.logger.error(f"Không thể lấy dữ liệu người dùng sau khi lưu dự đoán: {current_user['username']}", exc_info=True)
                return jsonify({'success': False, 'message': 'Dự đoán đã lưu nhưng không thể cập nhật trạng thái người dùng'}), 500
        else:
            return jsonify({
                'success': False,
                'message': 'Không thể lưu kết quả dự đoán'
            }), 500

    except Exception as e:
        app.logger.error(f"Không thể lưu kết quả dự đoán: {e}")
        return jsonify({
            'success': False,
            'message': f'Lỗi máy chủ: {str(e)}'
        }), 500


@app.route('/api/prediction-stats', methods=['GET'])
def get_prediction_stats():
    """Lấy thống kê dự đoán."""
    try:
        if not prediction_db:
            return jsonify({
                'success': False,
                'message': 'Chưa cấu hình cơ sở dữ liệu'
            }), 500

        stats = prediction_db.get_prediction_stats()
        return jsonify({
            'success': True,
            'data': stats
        })

    except Exception as e:
        app.logger.error(f"Không thể lấy thống kê dự đoán: {e}")
        return jsonify({
            'success': False,
            'message': f'Không thể lấy thống kê dự đoán: {str(e)}'
        }), 500


@app.route('/api/ai/predict', methods=['POST'])
def ai_predict():
    """API dự đoán AI thông minh."""
    try:
        data = request.get_json()
        matches = data.get('matches', [])

        if not matches:
            return jsonify({
                'success': False,
                'error': 'Chưa cung cấp dữ liệu trận đấu'
            }), 400

        app.logger.info(f"Nhận yêu cầu dự đoán AI, số trận: {len(matches)}")

        current_predictor = ai_predictor
        if not current_predictor:
            try:
                gemini_api_key = os.environ.get('GEMINI_API_KEY')
                gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite-preview-06-17')

                if not gemini_api_key:
                    return jsonify({
                        'success': False,
                        'error': 'Chưa đặt biến môi trường GEMINI_API_KEY'
                    }), 500

                current_predictor = AIFootballPredictor(
                    api_key=gemini_api_key,
                    model_name=gemini_model
                )
                app.logger.info("Đã tạo tạm trình dự đoán AI")
            except Exception as e:
                app.logger.error(f"Không thể tạo trình dự đoán AI: {e}")
                return jsonify({
                    'success': False,
                    'error': 'Khởi tạo trình dự đoán AI thất bại'
                }), 500

        analyses = current_predictor.analyze_matches(matches)

        results = []
        for analysis in analyses:
            results.append({
                'match_id': analysis.match_id,
                'home_team': analysis.home_team,
                'away_team': analysis.away_team,
                'league_name': analysis.league_name,
                'ai_analysis': analysis.ai_analysis,
                'odds': {
                    'home': analysis.home_odds,
                    'draw': analysis.draw_odds,
                    'away': analysis.away_odds
                }
            })

        return jsonify({
            'success': True,
            'predictions': results,
            'count': len(results)
        })

    except Exception as e:
        app.logger.error(f"Dự đoán AI thất bại: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/predict', methods=['POST'])
def predict():
    """API dự đoán dạng đơn giản."""
    try:
        data = request.json
        matches = data.get('matches', [])

        if not matches:
            return jsonify({
                'success': False,
                'message': 'Chưa cung cấp dữ liệu trận đấu'
            })

        log_user_prediction(matches)

        individual_predictions = []
        for match in matches:
            prediction = simple_predict_match(match)
            individual_predictions.append(prediction)

        return jsonify({
            'success': True,
            'individual_predictions': individual_predictions,
            'message': 'Đang dùng chế độ dự đoán đơn giản. Nên dùng dự đoán AI để nhận phân tích chi tiết hơn'
        })

    except Exception as e:
        app.logger.error(f"Lỗi dự đoán: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Đã xảy ra lỗi trong quá trình dự đoán: {str(e)}'
        })


def simple_predict_match(match):
    """Dự đoán trận đấu dạng đơn giản."""
    home_odds = float(match.get('home_odds', 2.0))
    draw_odds = float(match.get('draw_odds', 3.0))
    away_odds = float(match.get('away_odds', 2.5))

    home_prob = 1 / home_odds
    draw_prob = 1 / draw_odds
    away_prob = 1 / away_odds

    total_prob = home_prob + draw_prob + away_prob

    home_prob /= total_prob
    draw_prob /= total_prob
    away_prob /= total_prob

    return {
        'match': f"{match['home_team']} vs {match['away_team']}",
        'home_team': match['home_team'],
        'away_team': match['away_team'],
        'probabilities': {
            'home': round(home_prob, 3),
            'draw': round(draw_prob, 3),
            'away': round(away_prob, 3)
        },
        'odds': {
            'home': home_odds,
            'draw': draw_odds,
            'away': away_odds
        },
        'recommendation': 'Chủ nhà thắng' if home_prob > max(draw_prob, away_prob) else ('Hòa' if draw_prob > away_prob else 'Khách thắng')
    }


def generate_ai_combinations(ai_analyses):
    """Tạo tổ hợp dự đoán dựa trên phân tích AI."""
    combinations = []

    best_wdl_combo = []
    total_confidence = 1.0

    for analysis in ai_analyses:
        wdl = analysis['win_draw_loss']
        best_outcome = max(wdl, key=wdl.get)

        best_wdl_combo.append({
            'match': f"{analysis['home_team']} vs {analysis['away_team']}",
            'prediction': best_outcome,
            'probability': wdl[best_outcome],
            'confidence': analysis['confidence_level']
        })

        total_confidence *= analysis['confidence_level']

    combinations.append({
        'type': 'Tổ hợp 1X2 tốt nhất',
        'selections': best_wdl_combo,
        'total_confidence': total_confidence,
        'description': 'Tổ hợp 1X2 có xác suất cao nhất dựa trên phân tích AI'
    })

    return combinations


def log_user_prediction(matches):
    """Ghi lại yêu cầu dự đoán của người dùng."""
    try:
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'matches_count': len(matches),
            'matches': matches
        }

        with open('user_predictions.log', 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')

    except Exception as e:
        app.logger.error(f"Không thể ghi lịch sử dự đoán của người dùng: {str(e)}")


@app.route('/api/lottery/refresh', methods=['POST'])
def refresh_lottery_data():
    """Làm mới dữ liệu xổ số thể thao."""
    try:
        data = request.json
        days = data.get('days', 3)

        if not lottery_spider:
            return jsonify({
                'success': False,
                'message': 'API xổ số thể thao chưa được khởi tạo'
            })

        matches = lottery_spider.get_formatted_matches(days)

        return jsonify({
            'success': True,
            'matches': matches,
            'count': len(matches)
        })

    except Exception as e:
        app.logger.error(f"Làm mới dữ liệu xổ số thể thao thất bại: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Làm mới dữ liệu thất bại: {str(e)}'
        })


@app.route('/api/ai/batch-predict', methods=['POST'])
def ai_batch_predict():
    """Dự đoán AI hàng loạt."""
    try:
        data = request.json
        matches = data.get('matches', [])

        if not matches:
            return jsonify({
                'success': False,
                'message': 'Chưa cung cấp dữ liệu trận đấu'
            })

        return ai_predict()

    except Exception as e:
        app.logger.error(f"Lỗi dự đoán AI hàng loạt: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Dự đoán hàng loạt thất bại: {str(e)}'
        })


@app.route('/test')
def test():
    """Endpoint kiểm tra dịch vụ."""
    return jsonify({
        'status': 'ok',
        'message': 'Dịch vụ đang hoạt động bình thường',
        'lottery_spider': lottery_spider is not None,
        'ai_predictor': ai_predictor is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/health')
def health():
    """Kiểm tra sức khỏe dịch vụ."""
    return "OK", 200


@app.route('/data/<filename>')
def serve_data_files(filename):
    """Phục vụ tệp dữ liệu."""
    try:
        from flask import send_from_directory
        return send_from_directory('data', filename)
    except Exception as e:
        app.logger.error(f"Không thể phục vụ tệp dữ liệu: {e}")
        return jsonify({'error': 'Không tìm thấy tệp'}), 404


# Các route xác thực người dùng
@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register():
    """Đăng ký người dùng."""
    app.logger.info(f"Nhận yêu cầu đăng ký: {request.json}")
    try:
        if not prediction_db:
            app.logger.error("Đăng ký thất bại: cơ sở dữ liệu chưa được cấu hình hoặc khởi tạo", exc_info=True)
            return jsonify({'success': False, 'message': 'Đăng ký thất bại: dịch vụ cơ sở dữ liệu không khả dụng'}), 500

        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not username or len(username) < 3:
            app.logger.warning(f"Đăng ký thất bại: tên người dùng không hợp lệ - {username}")
            return jsonify({'success': False, 'message': 'Tên người dùng phải có ít nhất 3 ký tự'}), 400
        if not email or '@' not in email:
            app.logger.warning(f"Đăng ký thất bại: email không hợp lệ - {email}")
            return jsonify({'success': False, 'message': 'Vui lòng nhập địa chỉ email hợp lệ'}), 400
        if not password or len(password) < 6:
            app.logger.warning("Đăng ký thất bại: mật khẩu không đạt yêu cầu")
            return jsonify({'success': False, 'message': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400

        password_hash = hash_password(password)

        success = prediction_db.create_user(username, email, password_hash)

        if success:
            app.logger.info(f"Đăng ký người dùng thành công: {username}")
            resp = jsonify({'success': True, 'message': 'Đăng ký thành công, vui lòng đăng nhập'})
            try:
                pass  # Đã loại bỏ Cookie kiểm thử
            except Exception as e:
                app.logger.warning(f"Không thể đặt Cookie kiểm thử: {e}", exc_info=True)
                pass
            return resp
        else:
            app.logger.warning(f"Đăng ký thất bại: tên người dùng hoặc email đã tồn tại, hoặc thao tác cơ sở dữ liệu thất bại - {username}, {email}")
            return jsonify({'success': False, 'message': 'Đăng ký thất bại: tên người dùng/email đã tồn tại hoặc không thể ghi cơ sở dữ liệu'}), 409

    except Exception as e:
        app.logger.error(f"Đăng ký người dùng thất bại: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Đăng ký thất bại, vui lòng thử lại sau'}), 500


@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    """Đăng nhập người dùng."""
    app.logger.info(f"Nhận yêu cầu đăng nhập: {request.json}")
    try:
        if not prediction_db:
            app.logger.error("Đăng nhập thất bại: cơ sở dữ liệu chưa được cấu hình hoặc khởi tạo", exc_info=True)
            return jsonify({'success': False, 'message': 'Đăng nhập thất bại: dịch vụ cơ sở dữ liệu không khả dụng'}), 500

        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            app.logger.warning("Đăng nhập thất bại: thiếu tên người dùng hoặc mật khẩu")
            return jsonify({'success': False, 'message': 'Vui lòng nhập tên người dùng và mật khẩu'}), 400

        password_hash = hash_password(password)

        user = prediction_db.authenticate_user(username, password_hash)

        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session.permanent = True

            app.logger.info(f"Đăng nhập thành công, đã thiết lập phiên: {username}")
            resp = jsonify({
                'success': True,
                'message': 'Đăng nhập thành công',
                'user': {
                    'username': user['username'],
                    'user_type': user['user_type'],
                    'daily_predictions_used': user['daily_predictions_used'],
                    'total_predictions': user['total_predictions']
                }
            })
            try:
                serializer = app.session_interface.get_signing_serializer(app)
                if serializer:
                    session_cookie_val = serializer.dumps(dict(session))
                    resp.set_cookie(app.config.get('SESSION_COOKIE_NAME', 'mp_session'),
                                    session_cookie_val,
                                    samesite=os.environ.get('SESSION_COOKIE_SAMESITE', 'None'),
                                    secure=True,
                                    httponly=True,
                                    domain=app.config.get('SESSION_COOKIE_DOMAIN'))
                pass  # Đã loại bỏ Cookie kiểm thử bổ sung
            except Exception as e:
                app.logger.warning(f"Không thể đặt Cookie: {e}", exc_info=True)
                pass
            return resp
        else:
            app.logger.warning(f"Đăng nhập thất bại: sai tên người dùng hoặc mật khẩu - {username}")
            return jsonify({'success': False, 'message': 'Tên người dùng hoặc mật khẩu không đúng'}), 401

    except Exception as e:
        app.logger.error(f"Đăng nhập người dùng thất bại: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Đăng nhập thất bại, vui lòng thử lại sau'}), 500


@app.route('/api/logout', methods=['POST', 'OPTIONS'])
def logout():
    """Đăng xuất người dùng."""
    session.clear()
    return jsonify({'success': True, 'message': 'Đã đăng xuất an toàn'})


@app.route('/api/user/info', methods=['GET'])
def get_user_info():
    """Lấy thông tin người dùng."""
    app.logger.info("Nhận yêu cầu lấy thông tin người dùng")
    try:
        current_user = get_current_user()
        if not current_user:
            app.logger.warning("Không thể lấy thông tin người dùng: chưa đăng nhập")
            return jsonify({'success': False, 'message': 'Chưa đăng nhập'}), 401

        if not prediction_db:
            app.logger.error("Không thể lấy thông tin người dùng: cơ sở dữ liệu chưa được cấu hình hoặc khởi tạo", exc_info=True)
            return jsonify({'success': False, 'message': 'Không thể lấy thông tin người dùng: dịch vụ cơ sở dữ liệu không khả dụng'}), 500

        user_data_from_db = prediction_db.get_user_by_username(current_user['username'])
        if not user_data_from_db:
            app.logger.error(f"Không tìm thấy người dùng trong cơ sở dữ liệu: {current_user['username']}", exc_info=True)
            session.clear()
            return jsonify({'success': False, 'message': 'Dữ liệu người dùng không hợp lệ, vui lòng đăng nhập lại'}), 401

        app.logger.info(f"Đã lấy thông tin người dùng {user_data_from_db['username']}")
        return jsonify({
            'success': True,
            'user': {
                'username': user_data_from_db['username'],
                'email': user_data_from_db['email'],
                'user_type': user_data_from_db['user_type'],
                'daily_predictions_used': user_data_from_db['daily_predictions_used'],
                'total_predictions': user_data_from_db['total_predictions'],
                'membership_expires': user_data_from_db['membership_expires'].isoformat() if user_data_from_db['membership_expires'] else None
            }
        })

    except Exception as e:
        app.logger.error(f"Không thể lấy thông tin người dùng: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Không thể lấy thông tin người dùng'}), 500


@app.route('/api/user/can-predict', methods=['GET'])
def can_user_predict_api():
    """Kiểm tra người dùng có quyền dự đoán hay không."""
    app.logger.info("Nhận yêu cầu kiểm tra quyền dự đoán")
    try:
        current_user = get_current_user()
        if not current_user:
            app.logger.warning("Kiểm tra quyền dự đoán thất bại: người dùng chưa đăng nhập")
            return jsonify({'success': False, 'message': 'Chưa đăng nhập', 'can_predict': False}), 401

        if not prediction_db:
            app.logger.error("Kiểm tra quyền dự đoán thất bại: cơ sở dữ liệu chưa được cấu hình hoặc khởi tạo", exc_info=True)
            return jsonify({'success': False, 'message': 'Kiểm tra thất bại: dịch vụ cơ sở dữ liệu không khả dụng'}), 500

        user_data_from_db = prediction_db.get_user_by_username(current_user['username'])
        if not user_data_from_db:
            app.logger.error(f"Không tìm thấy người dùng khi kiểm tra quyền: {current_user['username']}", exc_info=True)
            session.clear()
            return jsonify({'success': False, 'message': 'Dữ liệu người dùng không hợp lệ, vui lòng đăng nhập lại', 'can_predict': False}), 401

        can_predict = prediction_db.can_user_predict(
            user_data_from_db['id'],
            user_data_from_db['user_type'],
            user_data_from_db['daily_predictions_used']
        )

        remaining = 0
        if user_data_from_db['user_type'] == 'free':
            remaining = max(0, 3 - user_data_from_db['daily_predictions_used'])

        app.logger.info(f"Kết quả kiểm tra quyền của {user_data_from_db['username']}: can_predict={can_predict}, remaining={remaining}")
        return jsonify({
            'success': True,
            'can_predict': can_predict,
            'user_type': user_data_from_db['user_type'],
            'daily_used': user_data_from_db['daily_predictions_used'],
            'remaining': remaining
        })

    except Exception as e:
        app.logger.error(f"Kiểm tra quyền dự đoán thất bại: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Kiểm tra thất bại'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
