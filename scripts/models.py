import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
from config import *


def prepare_training_data(match_features_df):
    """Chuẩn bị dữ liệu huấn luyện."""
    if match_features_df is None or match_features_df.empty:
        print("Dữ liệu đặc trưng trận đấu không hợp lệ")
        return None, None

    # Chỉ sử dụng các trận đã kết thúc
    completed_matches = match_features_df[match_features_df['status'] == 'FINISHED'].copy()

    if completed_matches.empty:
        print("Không có dữ liệu trận đã kết thúc")
        return None, None

    # Chọn các cột đặc trưng
    feature_cols = [col for col in completed_matches.columns if col.startswith('home_') or col.startswith('away_')]
    feature_cols = [col for col in feature_cols if col not in ['home_team', 'away_team', 'home_score', 'away_score']]

    # Chuẩn bị đặc trưng và biến mục tiêu
    X = completed_matches[feature_cols].copy()
    y = completed_matches['result'].copy()

    # Xử lý giá trị thiếu
    X = X.fillna(0)

    # Chuẩn hóa đặc trưng
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y, feature_cols, scaler


def train_match_result_model(match_features_df, model_type='rf'):
    """Huấn luyện mô hình dự đoán kết quả trận đấu."""
    X, y, feature_cols, scaler = prepare_training_data(match_features_df)

    if X is None or y is None:
        return None

    # Chia tập huấn luyện và kiểm thử
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Chọn mô hình
    if model_type == 'rf':
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [None, 10, 20, 30],
            'min_samples_split': [2, 5, 10]
        }
    elif model_type == 'gb':
        model = GradientBoostingClassifier(random_state=42)
        param_grid = {
            'n_estimators': [50, 100, 200],
            'learning_rate': [0.01, 0.1, 0.2],
            'max_depth': [3, 5, 7]
        }
    else:
        print(f"Loại mô hình không được hỗ trợ: {model_type}")
        return None

    # Tìm bộ tham số tốt nhất bằng grid search
    print("Đang chạy grid search để tìm tham số tốt nhất...")
    grid_search = GridSearchCV(model, param_grid, cv=5, scoring='accuracy')
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_
    print(f"Tham số tốt nhất: {grid_search.best_params_}")

    # Đánh giá mô hình trên tập kiểm thử
    y_pred = best_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"Độ chính xác của mô hình: {accuracy:.4f}")
    print("Báo cáo phân loại:")
    print(classification_report(y_test, y_pred))
    print("Ma trận nhầm lẫn:")
    print(confusion_matrix(y_test, y_pred))

    # Lưu mô hình
    if not os.path.exists(os.path.dirname(MODEL_SAVE_PATH)):
        os.makedirs(os.path.dirname(MODEL_SAVE_PATH))

    with open(MODEL_SAVE_PATH, 'wb') as f:
        pickle.dump({
            'model': best_model,
            'feature_cols': feature_cols,
            'scaler': scaler
        }, f)

    print(f"Đã lưu mô hình vào {MODEL_SAVE_PATH}")

    return {
        'model': best_model,
        'feature_cols': feature_cols,
        'scaler': scaler
    }


def load_model():
    """Tải mô hình đã lưu."""
    try:
        with open(MODEL_SAVE_PATH, 'rb') as f:
            model_data = pickle.load(f)
        print(f"Đã tải mô hình từ {MODEL_SAVE_PATH}")
        return model_data
    except:
        print("Không thể tải mô hình; hãy huấn luyện mô hình trước")
        return None


def predict_match(model_data, match_features):
    """Dự đoán kết quả một trận đấu."""
    if model_data is None:
        print("Dữ liệu mô hình không hợp lệ")
        return None

    model = model_data['model']
    feature_cols = model_data['feature_cols']
    scaler = model_data['scaler']

    # Trích xuất đặc trưng
    X = match_features[feature_cols].values.reshape(1, -1)

    # Chuẩn hóa đặc trưng
    X_scaled = scaler.transform(X)

    # Dự đoán xác suất kết quả
    proba = model.predict_proba(X_scaled)[0]

    # Lấy nhãn lớp
    classes = model.classes_

    # Tạo kết quả. Giữ H/D/A làm mã kỹ thuật nội bộ.
    result = {}
    for i, cls in enumerate(classes):
        if cls == 'H':
            result['home_win'] = proba[i]
        elif cls == 'D':
            result['draw'] = proba[i]
        elif cls == 'A':
            result['away_win'] = proba[i]

    return result


if __name__ == "__main__":
    # Kiểm tra chức năng huấn luyện mô hình
    from data_processing import load_or_process_data
    from models.feature_engineering import load_or_create_features, prepare_match_features

    processed_data = load_or_process_data()
    features_df = load_or_create_features(processed_data['matches'])

    if features_df is not None:
        match_features_df = prepare_match_features(processed_data['matches'], features_df)
        model_data = train_match_result_model(match_features_df)
        print("Đã hoàn tất huấn luyện mô hình")
