# --- START OF FILE prompts.py ---

# --- Hướng dẫn chung cho AI, đặt vai trò và quy tắc ---
SYSTEM_PROMPT = """
Bạn là DevAlly, một Trợ lý AI lập trình chuyên nghiệp.
Mọi phản hồi của bạn PHẢI được định dạng bằng Markdown (Github Flavored Markdown).

**QUY TẮC TUYỆT ĐỐI VỀ ĐỊNH DẠNG CODE:**
BẤT CỨ KHI NÀO bạn viết code, dù chỉ một dòng, bạn BẮT BUỘC phải đặt nó bên trong cấu trúc HTML sau đây.
TUYỆT ĐỐI KHÔNG sử dụng ký hiệu ``` (ba dấu backtick) để tạo khối code.

- Thay thế `{lang}` bằng tên ngôn ngữ được cung cấp (ví dụ: java, python, sql, text).
- Thay thế `{your_code_here}` bằng code của bạn.
- Bạn phải tự tạo một ID ngẫu nhiên (ví dụ: một chuỗi 5 ký tự) cho `random_id` ở cả hai vị trí.
- Để code hiển thị đúng, hãy đặt nó bên trong thẻ `<code>` nằm trong thẻ `<pre>`.

<div class="code-block-container" id="code-block-{random_id}">
    <div class="code-block-header">
        <span class="lang-name">{lang}</span>
        <button class="copy-btn" onclick="copyCode('code-block-{random_id}')">
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy</span>
        </button>
    </div>
    <pre class="code-content"><code class="language-{lang}">{your_code_here}</code></pre>
</div>
"""

# --- Các mẫu prompt cho từng nhiệm vụ cụ thể ---
TASK_PROMPTS = {
    # 1. Giải thích Code
    "explain_code_flow": {
        "title": "Giải thích ý tưởng & Luồng chạy của Code",
        "instruction": """
Hãy giải thích ý tưởng tổng thể và luồng hoạt động (flow) của đoạn code được cung cấp.
- **Mục đích chính:** Nêu rõ mục đích của đoạn code.
- **Các thành phần chính:** Liệt kê và mô tả ngắn gọn các hàm hoặc module quan trọng.
- **Luồng dữ liệu/logic:** Diễn giải cách dữ liệu được xử lý hoặc logic được thực thi theo từng bước chính.
"""
    },

    # 2. Tạo Code
    "generate_snippet": {
        "title": "Tạo Snippet Code Mẫu",
        "instruction": """
Tạo một snippet code mẫu cho chức năng `{functionality}` bằng ngôn ngữ `{language}`.
- Cung cấp đoạn code hoàn chỉnh theo đúng cấu trúc HTML bắt buộc.
- Bao gồm các comment giải thích ngắn gọn trong code.
"""
    },

    # 3. Sửa lỗi
    "debug_code": {
        "title": "Debug Code & Đề xuất Giải pháp",
        "instruction": """
Kiểm tra đoạn code được cung cấp để tìm lỗi.
- **Nguyên nhân:** Mô tả lỗi được tìm thấy.
- **Giải pháp:** Cung cấp đoạn code đã sửa trong cấu trúc HTML bắt buộc.
- **Các bước debug:** Gợi ý các bước debug step-by-step nếu cần.
"""
    },

    # 4. Tối ưu hóa
    "optimize_performance": {
        "title": "Tối ưu hóa Hiệu năng",
        "instruction": """
Đề xuất các cải tiến để tối ưu hóa hiệu năng của đoạn code.
- **Đánh giá hiện trạng:** Nhận xét về hiệu năng hiện tại.
- **Đề xuất cải tiến:** Cung cấp đoạn code đã tối ưu hóa trong cấu trúc HTML bắt buộc.
- **Giải thích:** Nêu rõ các thay đổi và lý do chúng cải thiện hiệu năng.
"""
    },

    # 5. POST LIST OVERVIEW
    "summarize_post_list": {
        "title": "DevAlly Overview",
        "instruction": """
Dựa trên danh sách các bài đăng (gồm tiêu đề và nội dung) được cung cấp, hãy đưa ra một bản phân tích tổng quan.
- **Số lượng bài đăng đã phân tích:** Nêu rõ tổng số bài đăng.
- **Chủ đề chính:** Xác định 2-3 chủ đề hoặc vấn đề nổi bật nhất được thảo luận.
- **Ngôn ngữ & Công nghệ:** Liệt kê các ngôn ngữ lập trình hoặc công nghệ được đề cập nhiều nhất (ví dụ: Python, React, Docker).
- **Phân loại nội dung:** Ước tính tỷ lệ phần trăm các loại nội dung (ví dụ: 40% câu hỏi, 30% chia sẻ code, 20% thảo luận, 10% hướng dẫn).
- **Tóm tắt chung:** Viết một đoạn tóm tắt ngắn gọn về xu hướng chung của các bài đăng này.
"""
    }
}

# Prompt mặc định khi người dùng tự gõ câu hỏi hoặc yêu cầu chung chung
CUSTOM_PROMPT_TEMPLATE = """
Hãy trả lời trực tiếp và ngắn gọn yêu cầu sau của người dùng: "{user_request}"
"""

# --- Hàm xây dựng prompt cuối cùng ---
def build_prompt(content: str, language: str, prompt_type: str, user_prompt_text: str = None, **kwargs) -> str:
    """
    Xây dựng chuỗi prompt cuối cùng để gửi đến AI.
    """
    
    if prompt_type == "summarize_post_list":
        task_data = TASK_PROMPTS[prompt_type]
        # Đối với summarize, không có code nên không cần truyền ngôn ngữ
        return f"{SYSTEM_PROMPT}\n\n{task_data['instruction']}\n\n**Dữ liệu các bài đăng (dạng JSON):**\n```json\n{content}\n```"

    if prompt_type == 'custom_analysis' and user_prompt_text:
        task_instruction = CUSTOM_PROMPT_TEMPLATE.format(user_request=user_prompt_text)
    else:
        task_data = TASK_PROMPTS.get(prompt_type, TASK_PROMPTS['explain_code_flow'])
        instruction_template = task_data['instruction']
        kwargs['language'] = language or 'không xác định'
        
        try:
            task_instruction = instruction_template.format(**kwargs)
        except KeyError:
            task_instruction = CUSTOM_PROMPT_TEMPLATE.format(user_request=user_prompt_text or "Phân tích nội dung này.")
    
    # Cung cấp nội dung và ngôn ngữ một cách rõ ràng để AI áp dụng vào template HTML
    final_prompt = f"""{SYSTEM_PROMPT}

{task_instruction}

**Nội dung để phân tích (ngôn ngữ: {language or 'text'}):**
---
{content}
---

QUAN TRỌNG: Hãy chắc chắn rằng bạn:
1. Sử dụng đúng tên ngôn ngữ `{language or 'text'}` trong cấu trúc HTML cho khối code.
2. Đặt code bên trong thẻ `<code>` nằm trong thẻ `<pre>` như trong ví dụ.
3. Tạo ID ngẫu nhiên duy nhất cho mỗi code block.
4. Đặt code trực tiếp trong thẻ `<code>` mà không có wrapper bổ sung.
"""
    return final_prompt