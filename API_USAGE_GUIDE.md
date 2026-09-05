# 🤖 Hướng dẫn sử dụng chức năng dự đoán AI

## 🚀 Tổng quan

Hệ thống hỗ trợ gọi trực tiếp Gemini AI API từ JavaScript để phân tích và dự đoán trận bóng đá, không bắt buộc đi qua backend Python cho luồng này.

## 🔑 Cấu hình khóa API

### Bước 1: Lấy khóa Gemini API
1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey).
2. Chọn **Create API Key** để tạo khóa mới.
3. Sao chép khóa API vừa tạo.

### Bước 2: Cấu hình khóa API

Có thể dùng một trong các cách sau trong Console của trình duyệt:

```javascript
// Cách 1: Hàm tiện ích
setGeminiApiKey("your_api_key_here")

// Cách 2: Trình quản lý cấu hình
window.apiConfigManager.setApiKey("your_api_key_here")

// Cách 3: Ghi trực tiếp vào localStorage
localStorage.setItem("GEMINI_API_KEY", "your_api_key_here")
```

> Thay `your_api_key_here` bằng khóa API thực tế của bạn.

## 🛠️ Các lệnh quản lý cấu hình

### Kiểm tra trạng thái cấu hình
```javascript
checkGeminiConfig()
```

### Kiểm tra kết nối API
```javascript
testGeminiAPI()
```

### Xóa cấu hình
```javascript
clearGeminiApiKey()
```

## 📍 Cách sử dụng

### 1. Chế độ AI thông minh
1. Chuyển sang **AI thông minh**.
2. Nhập đội chủ nhà, đội khách, giải đấu và tỷ lệ 1X2.
3. Thêm trận vào danh sách phân tích.
4. Nhấn **Dự đoán bằng AI**.
5. Hệ thống gọi Gemini API và hiển thị phân tích.

### 2. Chế độ xổ số thể thao
1. Chuyển sang **Xổ số thể thao**.
2. Nhấn **Làm mới dữ liệu** để lấy danh sách trận.
3. Chọn các trận cần phân tích.
4. Nhấn **Dự đoán bằng AI**.
5. Hệ thống phân tích từng trận đã chọn.

### 3. Chế độ cổ điển
Chế độ cổ điển sử dụng thuật toán cục bộ và dữ liệu đặc trưng có sẵn, không phụ thuộc Gemini API.

## 🔧 Cách triển khai kỹ thuật

### Luồng gọi API
1. **Frontend JavaScript** gọi trực tiếp Gemini API.
2. Hệ thống xây dựng prompt phân tích bóng đá.
3. Gemini trả về nội dung phân tích.
4. Frontend định dạng và hiển thị kết quả.

### Nội dung prompt chính
Prompt yêu cầu phân tích:
- Thông tin cơ bản của trận đấu.
- Dự đoán 1X2: chủ nhà thắng, hòa, khách thắng.
- Dự đoán tỷ số.
- Dự đoán hiệp 1/cả trận.
- Tổng bàn thắng.
- Tài/Xỉu và kèo châu Á.
- Cảnh báo rủi ro.

### Endpoint Gemini
`https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent`

## 🛡️ Bảo mật

- Không hardcode khóa API trong mã nguồn hoặc tài liệu.
- Nếu dùng `localStorage`, khóa chỉ được lưu trên trình duyệt hiện tại nhưng vẫn có thể bị JavaScript chạy trên cùng origin đọc được.
- Với môi trường production, nên ưu tiên cấu hình biến môi trường và kiến trúc bảo vệ khóa phù hợp.
- Có thể xóa khóa khỏi trình duyệt bất cứ lúc nào.

## 🚨 Lưu ý

1. Cần kết nối được đến dịch vụ Google AI.
2. Cần theo dõi hạn mức sử dụng Gemini API.
3. Không chia sẻ khóa API công khai.
4. Kết quả phân tích chỉ mang tính tham khảo.

## 🔍 Xử lý sự cố

### Không tìm thấy `GEMINI_API_KEY`
Cấu hình khóa bằng một trong các cách ở phần trên rồi thử lại.

### Gemini API trả về 403
Kiểm tra khóa API, quyền truy cập model và cấu hình dự án Google AI.

### Lỗi mạng
Kiểm tra kết nối Internet và khả năng truy cập dịch vụ Google AI.

### Tất cả trận đều dự đoán thất bại
Chạy:

```javascript
testGeminiAPI()
```

sau đó kiểm tra Console để xem chi tiết lỗi.

## 📞 Gỡ lỗi nhanh

```javascript
checkGeminiConfig()
testGeminiAPI()
console.log(localStorage.getItem('GEMINI_API_KEY'))
```

Khi cần hỗ trợ, hãy kiểm tra log Console, kết nối mạng và cấu hình Gemini API trước tiên.
