# Nhật ký thay đổi

## v2.2.0 - 2024-12-19

### 🚀 Tối ưu triển khai Vercel
- **Kiến trúc gọn nhẹ**: loại bỏ các gói khoa học dữ liệu dung lượng lớn như pandas, numpy và scipy khỏi luồng triển khai chính.
- **Tối ưu kích thước gói**: giảm từ hơn 250 MB xuống dưới 50 MB để phù hợp giới hạn Vercel.
- **Giữ các chức năng cốt lõi**:
  - ✅ Dự đoán AI bằng Gemini API.
  - ✅ Dữ liệu Xổ số Thể thao Trung Quốc.
  - ✅ Dự đoán thống kê đơn giản.
  - ❌ Mô hình thống kê phức tạp tạm thời không nằm trong bản triển khai gọn nhẹ.

### 📱 Kiến trúc frontend
- Ba chế độ dự đoán tiếp tục được giữ nguyên.
- Giao diện đáp ứng cho thiết bị di động và máy tính.
- Tương tác qua AJAX + RESTful API.

### 🔧 Stack kỹ thuật gọn nhẹ
```text
Frontend: HTML5 + CSS3 + JavaScript thuần
Backend: Flask 3.0 + Requests + Python-dotenv
AI: Google Gemini 2.0 Flash Experimental
Triển khai: Vercel Serverless Functions
```

### 🎯 Thân thiện với triển khai
- Chỉ giữ các phụ thuộc cốt lõi cần thiết.
- Giảm tải khi khởi động.
- Tinh gọn API nhưng giữ chức năng dự đoán chính.

## v2.1.0 - 2024-12-19

### 🚀 Thay đổi lớn
- Chuyển mô hình AI từ OpenAI GPT-4 sang Google Gemini 2.0 Flash Experimental.
- Tích hợp Gemini API cho phân tích AI.
- Cập nhật cấu hình và dependency cho Gemini.

### 🔧 Cải tiến kỹ thuật
- Bỏ dependency OpenAI trong luồng này, dùng `requests` gọi Gemini API.
- Cải thiện tham số gọi API và xử lý lỗi.
- Cập nhật tệp cấu hình mẫu và tài liệu hướng dẫn.

### 📝 Thay đổi cấu hình
- Thêm `GEMINI_API_KEY`.
- Thêm `GEMINI_MODEL`.
- Bỏ cấu hình `OPENAI_API_KEY` và `OPENAI_MODEL` khỏi luồng mới.

## v2.0.0 - 2024-01-15

Đây là bản nâng cấp lớn của hệ thống dự đoán bóng đá, bổ sung dữ liệu Xổ số Thể thao Trung Quốc và phân tích AI.

### ✨ Chức năng mới

**Ba chế độ dự đoán**
- **Cổ điển**: phân tích thống kê dựa trên dữ liệu lịch sử các giải lớn.
- **Xổ số thể thao**: lấy dữ liệu trận và tỷ lệ cược từ nguồn xổ số thể thao.
- **AI thông minh**: phân tích trận bằng mô hình ngôn ngữ lớn.

**Phân tích AI**
- Phân tích sức mạnh đội bóng, phong độ, sân nhà/sân khách và các yếu tố liên quan.
- Trả về lý do phân tích chi tiết.
- Hỗ trợ nhận diện lựa chọn có giá trị kỳ vọng đáng chú ý.

**Các loại dự đoán**
- 1X2: chủ nhà thắng, hòa, khách thắng.
- Hiệp 1/cả trận.
- Tổng bàn thắng.
- Tỷ số chính xác.
- Phân tích giá trị kỳ vọng.

**Dữ liệu xổ số thể thao**
- Lấy dữ liệu trận đấu và tỷ lệ cược.
- Hỗ trợ các cấu trúc 1X2, chấp, tỷ số, tổng bàn và hiệp 1/cả trận tùy dữ liệu nguồn.
- Có thể chọn phạm vi 1-7 ngày.
- Nhóm trận theo giải đấu.

### 🔧 Kiến trúc kỹ thuật

**Backend**
- `lottery_api.py`: xử lý dữ liệu xổ số thể thao.
- `ai_predictor.py`: dự đoán/phân tích AI.
- Mở rộng Flask API cho các chế độ mới.

**Frontend**
- `lottery.js`: quản lý dữ liệu và lựa chọn trận xổ số thể thao.
- `ai-prediction.js`: quản lý giao diện và luồng dự đoán AI.
- Giao diện ba chế độ.

### 📋 Endpoint được bổ sung
- `GET /api/lottery/matches`
- `POST /api/lottery/refresh`
- `POST /api/ai/predict`
- `POST /api/ai/batch-predict`

### ⚙️ Cấu hình
- `config_example.py`: cấu hình mẫu.
- Hỗ trợ khóa API cho AI.
- Cấu hình nguồn dữ liệu và tham số dự đoán.

### 🚀 Chạy cục bộ
```bash
pip install -r requirements.txt
python app.py
```

Sau đó truy cập địa chỉ do Flask hiển thị trong terminal.

### ⚠️ Lưu ý
1. Chức năng AI cần khóa API hợp lệ.
2. Nguồn dữ liệu bên ngoài cần kết nối mạng ổn định.
3. Kết quả dự đoán chỉ mang tính tham khảo.
4. Cần tuân thủ điều khoản của nhà cung cấp dữ liệu và quy định pháp luật áp dụng.

### 🐛 Vấn đề đã biết
- Nguồn dữ liệu bên ngoài có thể phản hồi chậm vào thời điểm cao tải.
- Phân tích AI có độ trễ tùy model và mạng.
- Một số trải nghiệm trên màn hình nhỏ có thể tiếp tục được tối ưu.

### 🔮 Định hướng
- Hỗ trợ thêm giải đấu và loại trận.
- Thống kê độ chính xác dự đoán lịch sử.
- Cải thiện mô hình AI và thuật toán cục bộ.
- Thêm tùy chọn cá nhân hóa người dùng.

---

## v1.x.x - Các phiên bản trước
Xem lịch sử commit để biết chi tiết các thay đổi cũ hơn.
