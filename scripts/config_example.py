# Tệp cấu hình mẫu
# Sao chép tệp này thành config_local.py nếu cần cấu hình cục bộ.

# Cấu hình Gemini API
# Khuyến nghị dùng biến môi trường: export GEMINI_API_KEY="your_api_key_here"
GEMINI_API_KEY = ""  # Khóa thực tế được chuyển sang biến môi trường
GEMINI_MODEL = "gemini-2.5-flash-preview-05-20"

# Cấu hình Flask
DEBUG = True
SECRET_KEY = "your_secret_key_here"

# Cấu hình API Xổ số Thể thao Trung Quốc
LOTTERY_API_BASE_URL = "https://webapi.sporttery.cn"
LOTTERY_REQUEST_TIMEOUT = 10
LOTTERY_REQUEST_DELAY = 0.5  # Khoảng nghỉ giữa các yêu cầu (giây)

# Cấu hình log
LOG_LEVEL = "INFO"
LOG_FILE = "user_predictions.log"

# Đường dẫn dữ liệu
DATA_PATH = "data/"
FEATURES_FILE_PATTERN = "features_{league_code}2024.csv"

# Cấu hình dự đoán AI
AI_PREDICTION_TIMEOUT = 30  # Thời gian chờ tối đa cho dự đoán AI (giây)
AI_MAX_RETRIES = 3  # Số lần thử lại tối đa
AI_CONFIDENCE_THRESHOLD = 0.6  # Ngưỡng độ tin cậy

# Cấu hình cache
CACHE_ENABLED = True
CACHE_TIMEOUT = 3600  # Thời gian hết hạn cache (giây)

# Cấu hình giải đấu
SUPPORTED_LEAGUES = {
    "PL": "Ngoại hạng Anh",
    "PD": "La Liga",
    "SA": "Serie A",
    "BL1": "Bundesliga",
    "FL1": "Ligue 1",
    "CL": "UEFA Champions League",
    "EL": "UEFA Europa League",
    "CSL": "Chinese Super League",
    "AFC": "AFC Champions League"
}

# Cấu hình chế độ dự đoán
PREDICTION_MODES = {
    "classic": {
        "name": "Chế độ cổ điển",
        "description": "Phân tích thống kê dựa trên dữ liệu lịch sử",
        "enabled": True
    },
    "lottery": {
        "name": "Xổ số thể thao",
        "description": "Dữ liệu Xổ số Thể thao Trung Quốc",
        "enabled": True
    },
    "ai": {
        "name": "AI thông minh",
        "description": "Phân tích và dự đoán bằng mô hình ngôn ngữ lớn",
        "enabled": True
    }
}

# Cấu hình loại kèo. Giữ nguyên key kỹ thuật để tương thích dữ liệu/API.
BET_TYPES = {
    "hhad": {
        "name": "1X2",
        "description": "Chủ nhà thắng, hòa, khách thắng",
        "enabled": True
    },
    "haad": {
        "name": "1X2 có chấp",
        "description": "Kết quả thắng/hòa/thua sau khi áp dụng mức chấp",
        "enabled": True
    },
    "crs": {
        "name": "Tỷ số chính xác",
        "description": "Dự đoán tỷ số chính xác",
        "enabled": True
    },
    "ttg": {
        "name": "Tổng bàn thắng",
        "description": "Khoảng tổng số bàn của trận đấu",
        "enabled": True
    },
    "hhft": {
        "name": "Hiệp 1/Cả trận",
        "description": "Tổ hợp kết quả hiệp 1 và cả trận",
        "enabled": True
    }
}
