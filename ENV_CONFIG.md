# Hướng dẫn cấu hình biến môi trường

Dự án đã chuyển toàn bộ thông tin nhạy cảm (ví dụ khóa API) sang biến môi trường để tăng mức độ an toàn.

## Các biến môi trường cần thiết

### 1. `GEMINI_API_KEY`
- **Mô tả**: khóa Google Gemini API
- **Bắt buộc**: Có, nếu sử dụng chức năng dự đoán AI
- **Ví dụ**: `GEMINI_API_KEY=your_api_key_here`

### 2. `GEMINI_MODEL`
- **Mô tả**: tên mô hình Gemini
- **Bắt buộc**: Không, đã có giá trị mặc định
- **Giá trị mặc định**: `gemini-2.0-flash-exp`
- **Ví dụ**: `GEMINI_MODEL=gemini-2.0-flash-exp`

## Cấu hình môi trường phát triển cục bộ

### Cách 1: dùng tệp `.env`
Tạo tệp `.env` (đã được khai báo trong `.gitignore`):
```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Cách 2: đặt biến môi trường trực tiếp
```bash
export GEMINI_API_KEY="your_api_key_here"
export GEMINI_MODEL="gemini-2.0-flash-exp"
```

## Cấu hình triển khai trên Vercel

1. Đăng nhập bảng điều khiển Vercel
2. Chọn dự án
3. Vào **Settings** → **Environment Variables**
4. Thêm các biến môi trường sau:
   - Name: `GEMINI_API_KEY`, Value: `khóa API của bạn`
   - Name: `GEMINI_MODEL`, Value: `gemini-2.0-flash-exp`

## Lưu ý bảo mật

1. **Tuyệt đối không** commit khóa API vào hệ thống quản lý phiên bản
2. **Tuyệt đối không** hard-code thông tin nhạy cảm trong mã nguồn
3. Định kỳ thay mới khóa API
4. Áp dụng nguyên tắc phân quyền tối thiểu khi cấu hình khóa API

## Hành vi của hệ thống

- Nếu chưa đặt `GEMINI_API_KEY`, chức năng dự đoán AI sẽ không khả dụng, nhưng chế độ cổ điển và chế độ xổ số thể thao vẫn có thể hoạt động
- Chế độ cổ điển sử dụng thuật toán cục bộ, không phụ thuộc API bên ngoài
- Chế độ xổ số thể thao sử dụng dữ liệu công khai và không cần khóa API Gemini
