# --- START OF FILE prompts.py ---

# --- General instructions for the AI, setting its role and rules ---
SYSTEM_PROMPT = """
You are DevAlly, a professional AI Programming Assistant.
All your responses MUST be formatted using Markdown (GitHub Flavored Markdown).

**ABSOLUTE RULE FOR CODE FORMATTING:**
WHENEVER you write code, even a single line, you MUST place it inside the following HTML structure.
DO NOT use ``` (three backticks) to create code blocks.

- Replace `{lang}` with the provided language name (e.g., java, python, sql, text).
- Replace `{your_code_here}` with your code.
- You must generate a unique random ID (e.g., a 5-character string) for `random_id`.
- The `<code>` tag's ID MUST be `code-content-{random_id}`.
- The `copyCode` function MUST be called with the `<code>` tag's ID.
- To display code correctly, place it inside the `<code>` tag, which is inside a `<pre>` tag.

<div class="code-block-container">
    <div class="code-header">
        <div class="header-dots">
            <span class="dot" style="background:#ff5f56;"></span>
            <span class="dot" style="background:#ffbd2e;"></span>
            <span class="dot" style="background:#27c93f;"></span>
        </div>
        <span class="code-language">{lang}</span>
        <button class="copy-btn" onclick="copyCode('code-content-{random_id}')">
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy</span>
        </button>
    </div>
    <pre><code id="code-content-{random_id}" class="language-{lang}">{your_code_here}</code></pre>
</div>
"""

# --- Prompt templates for specific tasks ---
TASK_PROMPTS = {
    # 1. Explain Code
    "explain_code_flow": {
        "title": "Explain Code Idea & Flow",
        "instruction": """
Hãy giải thích ý tưởng tổng thể và luồng hoạt động (flow) của đoạn code được cung cấp.
- **Mục đích chính:** Nêu rõ mục đích của đoạn code.
- **Các thành phần chính:** Liệt kê và mô tả ngắn gọn các hàm hoặc module quan trọng.
- **Luồng dữ liệu/logic:** Diễn giải cách dữ liệu được xử lý hoặc logic được thực thi theo từng bước chính.
"""
    },

    # 2. Generate Code
    "generate_snippet": {
        "title": "Generate Sample Code Snippet",
        "instruction": """
Tạo một snippet code mẫu cho chức năng `{functionality}` bằng ngôn ngữ `{language}`.
- Cung cấp đoạn code hoàn chỉnh theo đúng cấu trúc HTML bắt buộc.
- Bao gồm các comment giải thích ngắn gọn trong code.
"""
    },

    # 3. Debug
    "debug_code": {
        "title": "Debug Code & Propose Solution",
        "instruction": """
Kiểm tra đoạn code được cung cấp để tìm lỗi.
- **Nguyên nhân:** Mô tả lỗi được tìm thấy.
- **Giải pháp:** Cung cấp đoạn code đã sửa trong cấu trúc HTML bắt buộc.
- **Các bước debug:** Gợi ý các bước debug step-by-step nếu cần.
"""
    },

    # 4. Optimize
    "optimize_performance": {
        "title": "Optimize Performance",
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
    },
    # 6. Sửa Code theo gợi ý
    "refactor_code": {
    "title": "Áp dụng Sửa lỗi & Tái cấu trúc Code",
    "instruction": """
Bạn là một chuyên gia tái cấu trúc code. Dựa trên đoạn code và gợi ý được cung cấp, hãy sửa lại code.
YÊU CẦU TUYỆT ĐỐI:
Chỉ trả về duy nhất đoạn code hoàn chỉnh đã được sửa.
KHÔNG thêm bất kỳ lời giải thích, lời chào, hay định dạng markdown nào khác như ```.
Đoạn code cần sửa:
{code}
Áp dụng gợi ý sau: "{recommendation_text}"
"""
    }
}


# Default prompt when the user types a question or general request
CUSTOM_PROMPT_TEMPLATE = """
Hãy trả lời trực tiếp và ngắn gọn yêu cầu sau của người dùng: "{user_request}"
"""

# --- Function to build the final prompt ---
def build_prompt(content: str, language: str, prompt_type: str, user_prompt_text: str = None, **kwargs) -> str:
    """
    Constructs the final prompt string to send to the AI.
    """

    if prompt_type == "summarize_post_list":
        task_data = TASK_PROMPTS[prompt_type]
        # For summarize, no code is involved, so no need to pass the language
        return f"{SYSTEM_PROMPT}\n\n{task_data['instruction']}\n\n**Dữ liệu các bài đăng (dạng JSON):**\n```json\n{content}\n```"

    if prompt_type == 'refactor_code':
        task_data = TASK_PROMPTS[prompt_type]
        # Đối với refactor, 'content' chính là code cần sửa
        # và 'recommendation_text' nằm trong kwargs
        instruction = task_data['instruction'].format(code=content, recommendation_text=kwargs.get('recommendation_text', ''))
        # Prompt này không cần SYSTEM_PROMPT phức tạp vì chỉ cần raw code output
        return instruction

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
    
    # Provide content and language clearly for the AI to apply to the HTML template
    final_prompt = f"""{SYSTEM_PROMPT}

{task_instruction}

**Content to analyze (language: {language or 'text'}):**
---
{content}
---

IMPORTANT: Make sure you:
1. Use the correct language name `{language or 'text'}` in the HTML structure for the code block.
2. Place the code inside the `<code>` tag which is inside the `<pre>` tag as shown in the example.
3. Generate a unique random ID for each code block.
4. Call `copyCode` with the ID of the `<code>` tag, which must be in the format `code-content-your_random_id`.
"""
    return final_prompt