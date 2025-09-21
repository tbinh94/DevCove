Dựa trên codebase DevCove mà bạn đã cung cấp, tôi sẽ viết một README toàn diện cho dự án này trên GitHub. <cite/>

# DevCove - Nền tảng Chia sẻ Code với AI Assistant

DevCove là một nền tảng mạng xã hội dành cho lập trình viên, kết hợp tính năng chia sẻ code với AI-powered analysis và real-time chat. [1](#0-0)  Nền tảng được xây dựng với React frontend và Django REST API backend, tích hợp DevAlly AI Assistant sử dụng Google Gemini. <cite/>

## ✨ Tính năng chính

### 🔐 Quản lý người dùng
- Đăng ký, đăng nhập, đăng xuất
- Profile cá nhân với avatar và thông tin chi tiết
- Hệ thống follow và weekly helper recognition [2](#0-1) 

### 📝 Quản lý bài đăng
- Tạo, chỉnh sửa, xóa bài đăng với rich text content [3](#0-2) 
- Upload hình ảnh và preview
- Hệ thống tag linh hoạt cho phân loại nội dung
- Voting system (upvote/downvote) với real-time score calculation

### 🤖 DevAlly AI Assistant
- Phân tích code tự động với nhiều loại prompt [4](#0-3) 
- Hỗ trợ debug, optimize, refactor code
- Generate code snippets và test cases
- Interactive code blocks với Run/Copy buttons
- Chat interface cho tương tác trực tiếp với AI [5](#0-4) 

### 💬 Real-time Communication
- Private messaging system
- WebSocket-based live chat
- Notification system

### 🏗️ Community Features
- Tổ chức bài đăng theo communities
- Tag-based content discovery
- Search và filtering system

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18+ [6](#0-5) 
- **Routing**: React Router DOM
- **Styling**: CSS Modules
- **HTTP Client**: Axios [7](#0-6) 
- **Security**: DOMPurify cho HTML sanitization [8](#0-7) 

### Backend
- **Framework**: Django + Django REST Framework
- **Database**: PostgreSQL
- **Real-time**: Django Channels + Redis
- **AI Integration**: Google Gemini API
- **Authentication**: Django Auth + JWT

## 🚀 Cài đặt và Chạy

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL
- Redis (cho real-time features)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
``` [9](#0-8) 

### Frontend Setup
```bash
cd frontend
npm install
npm start
``` [10](#0-9) 

Truy cập ứng dụng tại:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## 📂 Cấu trúc dự án

```
DevCove/
├── backend/
│   ├── posts/              # Post management system
│   │   ├── api_views.py    # REST API endpoints
│   │   ├── models.py       # Database models
│   │   └── serializers.py  # API serializers
│   ├── ai_formatter.py     # AI response formatting
│   ├── prompts.py          # AI prompt templates
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── CreatePost.jsx
│   │   │   ├── PostDetail/
│   │   │   └── PostList/
│   │   ├── services/       # API services
│   │   └── App.jsx
│   └── package.json
```

## 🔧 Cấu hình

### Environment Variables
Tạo file `.env` trong thư mục backend:
```
GOOGLE_AI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@localhost/devcove
REDIS_URL=redis://localhost:6379
```

### AI Assistant Setup
DevAlly AI Assistant sử dụng Google Gemini API. [11](#0-10)  Đảm bảo bạn có API key hợp lệ và cấu hình đúng trong settings.

## 🎯 Tính năng nổi bật

### AI-Powered Code Analysis
- **Code Explanation**: Giải thích ý tưởng và flow của code [12](#0-11) 
- **Debug Assistant**: Tìm lỗi và đề xuất giải pháp [13](#0-12) 
- **Performance Optimization**: Đề xuất cải tiến hiệu năng [14](#0-13) 
- **Code Generation**: Tạo code snippets theo yêu cầu [15](#0-14) 

### Interactive Code Blocks
AI responses được format với interactive elements: [16](#0-15) 
- Syntax highlighting tự động
- Copy-to-clipboard functionality  
- Run buttons cho executable code
- Language detection

## 🧪 Demo Commands

Populate database với demo data:
```bash
python manage.py populate_comments --count 100
``` [17](#0-16) 

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

Project Link: [https://github.com/tbinh94/DevCove](https://github.com/tbinh94/DevCove)

---

**DevCove** - Nơi code meets community meets AI! 🚀

## Notes

README này được tạo dựa trên phân tích codebase hiện tại của DevCove. <cite/> Dự án có cấu trúc rõ ràng với frontend React và backend Django, tích hợp AI assistant mạnh mẽ thông qua Google Gemini API. <cite/> Các tính năng chính bao gồm post management system, AI-powered code analysis, và real-time communication features. <cite/>

Wiki pages you might want to explore:
- [Overview (tbinh94/DevCove)](/wiki/tbinh94/DevCove#1)
- [Post Management System (tbinh94/DevCove)](/wiki/tbinh94/DevCove#3.1)

### Citations

**File:** backend/prompts.py (L8-47)
```python
SYSTEM_PROMPT = """
You are DevAlly, a professional AI Programming Assistant.
Your entire response MUST be formatted using GitHub Flavored Markdown.

**CRITICAL RULE FOR CODE:**
WHENEVER you provide code, even a single line, you MUST place it inside a fenced code block with the appropriate language identifier.

CORRECT Examples:
```javascript
console.log('Hello World!');
```

```python
print("Hello World!")
```

```html
<div>Hello World!</div>
```

```css
.container { background: #1e1e1e; }
```

**LANGUAGE IDENTIFIERS TO USE:**
- For JavaScript: use `javascript` (not `js`)
- For TypeScript: use `typescript` (not `ts`)
- For Python: use `python` (not `py`)
- For HTML: use `html`
- For CSS: use `css`
- For Bash/Shell: use `bash`
- For JSON: use `json`
- For SQL: use `sql`
- For JavaScript: use `javascript` (not js)
- For TypeScript: use `typescript` (not ts)
- For Python: use `python` (not py)

NEVER use generic identifiers like `text` or leave the language blank.
The application's backend will automatically handle the visual formatting, syntax highlighting, and interactive features for these code blocks.
"""
```

**File:** backend/prompts.py (L49-67)
```python
TASK_PROMPTS = {
# 1. Explain Code
"explain_code_flow": {
"title": "Explain Code Idea & Flow",
"instruction": """
Hãy giải thích ý tưởng tổng thể và luồng hoạt động (flow) của đoạn code được cung cấp.

## 🎯 Mục đích chính
Nêu rõ mục đích chính của đoạn code.

## 🧩 Các thành phần chính
Liệt kê và mô tả ngắn gọn các hàm hoặc module quan trọng.

## 🔄 Luồng dữ liệu/logic
Diễn giải cách dữ liệu được xử lý hoặc logic được thực thi theo từng bước chính.

Đảm bảo tất cả code examples phải được đặt trong fenced code blocks với ngôn ngữ phù hợp.
"""
},
```

**File:** backend/prompts.py (L69-84)
```python
"generate_snippet": {
"title": "Generate Sample Code Snippet",
"instruction": """
## 🚀 Code Generation Request

Tạo một snippet code mẫu cho chức năng **{functionality}** bằng ngôn ngữ **{language}**.

Requirements:
- Cung cấp đoạn code hoàn chỉnh và có thể chạy được
- Bao gồm các comment giải thích ngắn gọn trong code
- Code phải được đặt trong fenced code block với ngôn ngữ chính xác
- Nếu cần thiết, cung cấp ví dụ sử dụng

Đảm bảo sử dụng đúng language identifier cho fenced code blocks.
"""
},
```

**File:** backend/prompts.py (L86-107)
```python
"debug_code": {
"title": "Debug Code & Propose Solution",
"instruction": """
## 🐛 Code Debugging Analysis

Kiểm tra đoạn code được cung cấp để tìm lỗi và đưa ra giải pháp.

## 🔍 Nguyên nhân lỗi
Mô tả chi tiết lỗi được tìm thấy và nguyên nhân gây ra.

## ✅ Code đã sửa
Cung cấp đoạn code đã được sửa lỗi:

## 📝 Giải thích thay đổi
Nêu rõ những thay đổi đã thực hiện và lý do.

## 🔧 Các bước debug
Gợi ý các bước debug step-by-step cho tương lai.

Lưu ý: Tất cả code phải được đặt trong fenced code blocks với ngôn ngữ chính xác.
"""
},
```

**File:** backend/prompts.py (L109-130)
```python
"optimize_performance": {
"title": "Optimize Performance",
"instruction": """
## ⚡ Performance Optimization Analysis

Đề xuất các cải tiến để tối ưu hóa hiệu năng của đoạn code.

## 📊 Đánh giá hiện trạng
Nhận xét về hiệu năng hiện tại và các vấn đề tiềm ẩn.

## 🚀 Code tối ưu hóa
Cung cấp đoạn code đã được tối ưu hóa:

## 💡 Giải thích cải tiến
Nêu rõ các thay đổi và lý do chúng cải thiện hiệu năng.

## 📈 Lợi ích dự kiến
Mô tả những cải thiện về hiệu năng mong đợi.

Đảm bảo tất cả code được đặt trong fenced code blocks với ngôn ngữ phù hợp.
"""
},
```

**File:** backend/posts/api_views.py (L844-850)
```python
    @action(detail=False, methods=['POST'], permission_classes=[IsAuthenticated])
    def update_helper_status(self, request):
        """
        Tính toán lại trạng thái 'is_weekly_helper' cho tất cả người dùng.
        Một người dùng là "Weekly Helper" nếu họ bình luận trên ít nhất 5 bài viết
        của người khác trong 7 ngày qua.
        """      
```

**File:** backend/posts/api_views.py (L2638-2644)
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_with_ai_view(request):
    """
    Xử lý tin nhắn trò chuyện với AI Assistant, có hỗ trợ ngữ cảnh hội thoại.
    Sử dụng hàm get_ai_response để gọi AI.
    """
```

**File:** frontend/src/components/CreatePost.jsx (L341-353)
```javascript
                            placeholder="Your text post (optional). Or use the AI generator above!"
                            disabled={isLoading}
                            rows="10"
                        />
                    )}
                </div>


                <div className={styles.formGroup}>
                    <label htmlFor="image" className={styles.label}>Upload Image (Optional)</label>
                    <input type="file" id="image" className={styles.fileInput} accept="image/*" onChange={handleImageChange} disabled={isLoading} />
                    {imagePreview && <img src={imagePreview} alt="Preview" className={styles.previewImage} />}
                </div>
```

**File:** frontend/package.json (L9-9)
```json
    "axios": "^1.11.0",
```

**File:** frontend/package.json (L10-10)
```json
    "dompurify": "^3.2.6",
```

**File:** frontend/package.json (L13-13)
```json
    "react": "^18.2.0",
```

**File:** backend/README.md (L29-34)
```markdown
Run the server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
Access at: http://127.0.0.1:8000/
```

**File:** frontend/README.md (L9-12)
```markdown
### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
```

**File:** frontend/src/components/PostDetail/PostDetail.jsx (L494-503)
```javascript
                                )} 
                                Hỏi Bot
                            </button>
                            
                            {botError && !isChatModalOpen && (
                                <div className={styles.botError}>
                                    {botError}
                                </div>
                            )}
                        </div>
```

**File:** backend/posts/management/commands/populate_comments.py (L9-18)
```python
class Command(BaseCommand):
    help = "Populate the database with random demo comments"

    def add_arguments(self, parser):
        parser.add_argument(
            '--count', '-n',
            type=int,
            default=100,
            help="Số lượng comment sẽ tạo (mặc định=100)"
        )
```
