# --- Hướng dẫn chung cho AI, đặt vai trò và quy tắc ---
SYSTEM_PROMPT = """
Bạn là DevAlly, một Trợ lý AI lập trình chuyên nghiệp.
Bạn có khả năng giải thích, hướng dẫn, tạo code, sửa lỗi, tối ưu hóa, viết test, tạo tài liệu, chuyển đổi ngôn ngữ, kiểm tra bảo mật và tư vấn CI/CD.
Mọi phản hồi của bạn PHẢI được định dạng bằng Markdown (Github Flavored Markdown).
Hãy trình bày thông tin một cách rõ ràng, ngắn gọn và trực tiếp.
Luôn tập trung vào yêu cầu của người dùng.
"""

# --- Các mẫu prompt cho từng nhiệm vụ cụ thể ---
# Mỗi prompt đều yêu cầu AI trả lời theo một cấu trúc Markdown cụ thể
TASK_PROMPTS = {
    # 1. Giải thích Code
    "explain_code_flow": {
        "title": "💡 Giải thích ý tưởng & Luồng chạy của Code",
        "instruction": """
## {title}
Hãy giải thích ý tưởng tổng thể và luồng hoạt động (flow) của đoạn code được cung cấp.
- **Mục đích chính:** Nêu rõ mục đích của đoạn code.
- **Các thành phần chính:** Liệt kê và mô tả ngắn gọn các hàm hoặc module quan trọng.
- **Luồng dữ liệu/logic:** Diễn giải cách dữ liệu được xử lý hoặc logic được thực thi theo từng bước chính.
"""
    },

    # 2. Tạo Code
    "generate_snippet": {
        "title": "📝 Tạo Snippet Code Mẫu",
        "instruction": """
## {title}
Tạo một snippet code mẫu cho chức năng `{functionality}` bằng ngôn ngữ {language}.
- Cung cấp đoạn code hoàn chỉnh trong một khối code.
- Bao gồm các comment giải thích ngắn gọn trong code.
- Đảm bảo code hoạt động và tuân thủ các best practices cơ bản.
"""
    },

    # 3. Sửa lỗi
    "debug_code": {
        "title": "🛠️ Debug Code & Đề xuất Giải pháp",
        "instruction": """
## {title}
Kiểm tra đoạn code được cung cấp để tìm lỗi.
- **Nguyên nhân:** Mô tả lỗi được tìm thấy.
- **Giải pháp:** Cung cấp đoạn code đã sửa trong một khối code.
- **Các bước debug:** Gợi ý các bước debug step-by-step nếu cần.
"""
    },

    # 4. Tối ưu hóa
    "optimize_performance": {
        "title": "⚡ Tối ưu hóa Hiệu năng",
        "instruction": """
## {title}
Đề xuất các cải tiến để tối ưu hóa hiệu năng của đoạn code.
- **Đánh giá hiện trạng:** Nhận xét về hiệu năng hiện tại.
- **Đề xuất cải tiến:** Cung cấp đoạn code đã tối ưu hóa trong một khối code.
- **Giải thích:** Nêu rõ các thay đổi và lý do chúng cải thiện hiệu năng.
"""
    },

    # 5. *** NEW PROMPT FOR POST LIST OVERVIEW ***
    "summarize_post_list": {
        "title": "📊 Tổng quan danh sách bài đăng",
        "instruction": """
## {title}
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
## ❓ Yêu cầu tùy chỉnh
Hãy trả lời trực tiếp và ngắn gọn yêu cầu sau của người dùng: "{user_request}"
"""

# --- Hàm xây dựng prompt cuối cùng ---
def build_prompt(content: str, language: str, prompt_type: str, user_prompt_text: str = None, **kwargs) -> str:
    """
    Xây dựng chuỗi prompt cuối cùng để gửi đến AI.

    :param content: Nội dung code hoặc log để phân tích.
    :param language: Ngôn ngữ lập trình của content (ví dụ: 'python', 'javascript', 'php').
    :param prompt_type: Loại tác vụ mong muốn (ví dụ: 'explain_code_flow', 'generate_snippet').
    :param user_prompt_text: Văn bản yêu cầu tùy chỉnh của người dùng (nếu có).
    :param kwargs: Các tham số bổ sung tùy thuộc vào prompt_type.
    :return: Chuỗi prompt hoàn chỉnh.
    """
    
    # Xử lý trường hợp custom analysis
    if prompt_type == 'custom_analysis' and user_prompt_text:
        task_instruction = CUSTOM_PROMPT_TEMPLATE.format(user_request=user_prompt_text)
    else:
        # Lấy task data từ TASK_PROMPTS
        task_data = TASK_PROMPTS.get(prompt_type)
        if not task_data:
            # Fallback về explain_code_flow nếu prompt_type không hợp lệ
            task_data = TASK_PROMPTS['explain_code_flow']
        
        # Format instruction với các parameters cụ thể
        instruction_template = task_data['instruction']
        title = task_data['title']
        
        # Thêm language vào kwargs để format
        kwargs['language'] = language
        
        try:
            # Format instruction với title và kwargs
            formatted_instruction = instruction_template.format(title=title, **kwargs)
            task_instruction = formatted_instruction
        except KeyError as e:
            # Nếu thiếu parameter, sử dụng fallback
            task_instruction = CUSTOM_PROMPT_TEMPLATE.format(user_request=user_prompt_text or "Phân tích code này")

    # Xây dựng prompt cuối cùng
    final_prompt = f"""{SYSTEM_PROMPT}

**Nội dung để phân tích ({language}):**
```text
{content}
{task_instruction}
"""
    return final_prompt
