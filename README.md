# GREEN APP — Steam ID Lookup

Ứng dụng web/PWA tra cứu hồ sơ Steam với giao diện xanh lá - đen.

## 1. Yêu cầu
- Node.js 18 trở lên
- Steam Web API Key

## 2. Cài đặt trong VS Code
Mở thư mục `green-app` bằng VS Code, mở Terminal và chạy:

```bash
npm install
```

Tạo file `.env` từ `.env.example` (hoặc tự tạo `.env`) và điền:

```env
STEAM_API_KEY=API_KEY_CUA_BAN
PORT=3000
```

Lấy API Key tại: https://steamcommunity.com/dev/apikey

Không gửi API Key cho người khác và tuyệt đối không đưa file `.env` lên GitHub.

## 3. Chạy ứng dụng

```bash
npm start
```

Mở trình duyệt tại: http://localhost:3000

## 4. Đưa code lên GitHub

Tạo repository mới trên GitHub tên `green-app` (không cần tạo README nếu đã có file).

Trong Terminal tại thư mục dự án, chạy:

```bash
git init
git add .
git commit -m "Initial GREEN APP"
git branch -M main
git remote add origin https://github.com/USERNAME/green-app.git
git push -u origin main
```

Thay `USERNAME` bằng tên tài khoản GitHub của bạn. Nếu đã cấu hình remote trước đó, dùng `git remote set-url origin https://github.com/USERNAME/green-app.git`.

## 5. Đưa lên Render
1. Đăng nhập Render và chọn **New + → Web Service**.
2. Kết nối repository `green-app` trên GitHub.
3. Runtime: Node.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Trong **Environment**, thêm `STEAM_API_KEY` với API key của bạn.
7. Deploy. Render tự cấp URL HTTPS cho ứng dụng.

Không cần đặt `PORT` trên Render; nền tảng tự cung cấp.

## Chức năng và giới hạn dữ liệu
- Hỗ trợ SteamID64, URL `/profiles/SteamID64` và URL vanity `/id/ten`.
- Tên, avatar, trạng thái hiện tại, game đang chơi (nếu Steam trả về), lần hoạt động cuối và ngày tạo tài khoản (nếu có).
- Steam API không cung cấp lịch sử hoạt động đầy đủ hoặc thời lượng chơi chính xác qua endpoint hồ sơ này.
- Hồ sơ riêng tư/giới hạn có thể không trả về đủ dữ liệu.
- Lịch sử tra cứu được lưu cục bộ trong trình duyệt của thiết bị.

## Bảo mật
- API key chỉ nằm ở server trong `.env` hoặc biến môi trường Render.
- `.env` được loại trừ khỏi Git bằng `.gitignore`.
- API tra cứu có giới hạn 25 yêu cầu/phút cho mỗi địa chỉ IP.
