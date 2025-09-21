# DevCove

DevCove là nền tảng cộng đồng dành cho lập trình viên, nơi bạn có thể đăng bài, thảo luận, chat realtime, và nhận phản hồi AI về code của mình.

## 🚀 Tính năng nổi bật

- **Đăng bài viết, chia sẻ code** với syntax highlight
- **Bình luận, thảo luận** dưới mỗi bài viết
- **Chat realtime** giữa các thành viên (WebSocket)
- **Phản hồi AI tự động**: AI sẽ phân tích và nhận xét code khi bạn đăng bài
- **Tìm kiếm, phân loại bài viết** theo tag
- **Quản lý tài khoản, xác thực đăng nhập** (session-based)
- **Giao diện hiện đại** với ReactJS

## 🖼️ Demo & ERD

<img width="1309" height="630" alt="image" src="https://github.com/user-attachments/assets/ada3e663-0dc1-4bc2-a960-7276dfa4bab8" />
<img width="1088" height="599" alt="image" src="https://github.com/user-attachments/assets/d36bfa7d-e50c-4f16-b3a4-feff9d10af28" />
<img width="1085" height="627" alt="image" src="https://github.com/user-attachments/assets/898d4c83-6d94-4f59-ae11-4d59fa1794aa" />
<img width="2519" height="2049" alt="DevCove_ERD" src="https://github.com/user-attachments/assets/ee4047de-f9a5-492d-9ce8-e28c59b42d72" />

## 🏗️ Kiến trúc hệ thống

- **Frontend:** ReactJS (Vite), giao tiếp REST API & WebSocket
- **Backend:** Django, Django REST Framework, Django Channels (WebSocket)
- **Database:** PostgreSQL
- **Realtime/Cache:** Redis (cho Django Channels)
- **AI Service:** Tích hợp Google Gemini API để sinh phản hồi code tự động

## ⚡ Hướng dẫn chạy nhanh

### 1. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

### 2. Chạy backend
```bash
cd backend
# Cài đặt các package Python cần thiết
pip install -r requirements.txt

# Chạy migrate và tạo superuser nếu cần
python manage.py migrate
python manage.py createsuperuser

# Chạy server backend
python manage.py runserver
```

3. Redis & WebSocket
Đảm bảo Redis đang chạy (mặc định trên localhost:6379)
WebSocket sẽ tự động hoạt động khi backend và Redis đã sẵn sàng

4. Cấu hình AI (Gemini API)
Đăng ký và lấy API key từ Google Gemini
Đặt biến môi trường GEMINI_API_KEY cho backend

##🛠️ Một số lệnh hữu ích
Backup database:
Chạy script backup_db.py hoặc dùng lệnh pg_dump/pg_restore (xem trong file backend/backup_db.py)

## 📂 Cấu trúc thư mục
```bash
DevCove/
├── backend/
│   ├── manage.py
│   ├── devcove/           # Cấu hình Django
│   ├── posts/             # API bài viết, bình luận
│   ├── chat/              # WebSocket chat
│   ├── prompts.py         # Prompt AI
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   └── ...
└── [README.md](http://_vscodecontentref_/0)
```

##📜 Giấy phép
Dự án mang tính học thuật, phi thương mại.
