# DocFlow PDF Renderer Service

Dịch vụ độc lập biên dịch mã nguồn LaTeX sang định dạng PDF vector khổ A4 chuẩn mực, sử dụng Headless Chromium với khả năng bảo mật cao (route abort, zero external SSRF, auto-fit table layout).

## Tính năng
- **Bảo mật tuyệt đối**: Chặn 100% outbound network request (chống SSRF).
- **Chia sẻ Engine**: Sử dụng trực tiếp module `src/shared/latex/` mà không bị duplicate code.
- **Tự động dò tìm Chrome**: Nhận diện Chrome/Edge trên Windows/macOS/Linux hoặc biến môi trường `CHROME_PATH`.
- **Hàng đợi concurrency**: Giới hạn tối đa 3-5 jobs song song chống tràn RAM/CPU.
- **Timeout**: Tự động giải phóng tiến trình sau 40s nếu tài liệu quá tải.
- **Sẵn sàng cho Docker**: Dockerfile multi-stage hỗ trợ Railway, Fly.io, Cloud Run.

## Chạy Local (Development)
```bash
# Cài đặt (ở thư mục gốc)
npm install

# Khởi chạy PDF Service
cd pdf-service
npm run start
```
Dịch vụ sẽ lắng nghe tại `http://localhost:3001`.

## Endpoints
- `GET /health`: Kiểm tra trạng thái service và đường dẫn Chrome phát hiện được.
- `POST /api/render-pdf`: Gửi `{ "code": "\\documentclass...", "options": { "paperSize": "A4" } }` nhận về binary stream `application/pdf`.
