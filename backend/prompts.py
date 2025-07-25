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
    # 1. Giải thích và hướng dẫn
    "explain_code_flow": {
        "title": "💡 Giải thích ý tưởng & Luồng chạy của Code",
        "instruction": """
## {title}
Hãy giải thích ý tưởng tổng thể và luồng hoạt động (flow) của đoạn code được cung cấp.
- **Mục đích chính:** Nêu rõ mục đích của đoạn code.
- **Các thành phần chính:** Liệt kê và mô tả ngắn gọn các lớp, hàm, hoặc module quan trọng.
- **Luồng dữ liệu/logic:** Diễn giải cách dữ liệu được xử lý hoặc logic được thực thi theo từng bước chính.
- **Tương tác:** Mô tả bất kỳ tương tác nào với các hệ thống bên ngoài (API, database, file system).
- Tránh đi sâu vào chi tiết triển khai cụ thể trừ khi nó cần thiết để giải thích luồng.
"""
    },
    "guide_library_usage": {
        "title": "📚 Hướng dẫn sử dụng Thư viện/Framework/API",
        "instruction": """
## {title}
Hướng dẫn cách sử dụng {entity_type} '{entity_name}'.
- **Giới thiệu:** Tóm tắt ngắn gọn về {entity_type}.
- **Cài đặt:** Hướng dẫn các bước cài đặt hoặc cách bao gồm trong dự án.
- **Các khái niệm chính:** Giải thích các khái niệm cốt lõi.
- **Ví dụ sử dụng:** Cung cấp các đoạn code ví dụ (snippet) cho các trường hợp sử dụng phổ biến (ví dụ: khởi tạo, gọi hàm, xử lý phản hồi).
- **Lưu ý quan trọng:** Đề cập đến các best practices hoặc hạn chế cần biết.
"""
    },
    "explain_cs_concept": {
        "title": "🎓 Giải thích Khái niệm Khoa học Máy tính",
        "instruction": """
## {title}
Hãy giải thích rõ ràng khái niệm "{concept_name}".
- **Định nghĩa:** Cung cấp một định nghĩa chính xác.
- **Giải thích chi tiết:** Diễn giải khái niệm một cách dễ hiểu.
- **Ví dụ:** Cung cấp ví dụ cụ thể (nếu có thể, bằng code snippet hoặc ví dụ minh họa).
- **Ứng dụng/Trường hợp sử dụng:** Nêu các trường hợp thực tế mà khái niệm này được áp dụng.
- **Ưu và nhược điểm** (nếu có).
"""
    },

    # 2. Sinh và hoàn thiện code
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
    "complete_code": {
        "title": "✍️ Hoàn thiện Code",
        "instruction": """
## {title}
Hoàn thiện đoạn code được cung cấp dựa trên ngữ cảnh và các comment/yêu cầu có sẵn.
- Chỉ trả về đoạn code đã được hoàn thiện.
- Đảm bảo đoạn code mới tương thích và giữ vững logic ban đầu.
- Trả về toàn bộ đoạn code, không chỉ phần bổ sung.
"""
    },
    "generate_full_code": {
        "title": "🚀 Sinh Code Theo Yêu cầu",
        "instruction": """
## {title}
Sinh code hoàn chỉnh theo yêu cầu sau: "{user_request}".
- Ngôn ngữ: {language}.
- Cung cấp đoạn code hoàn chỉnh trong một khối code.
- Đảm bảo code hoạt động, dễ đọc và tuân thủ best practices.
- Bao gồm các comment hoặc giải thích cần thiết.
"""
    },

    # 3. Tìm và sửa lỗi (debugging)
    "analyze_log_trace": {
        "title": "🐞 Phân tích Log / Stack Trace",
        "instruction": """
## {title}
Phân tích log / stack trace được cung cấp để xác định nguyên nhân gốc rễ của lỗi.
- **Nguyên nhân tiềm ẩn:** Nêu rõ nguyên nhân chính gây ra lỗi.
- **Giải thích:** Diễn giải các dòng trong log/stack trace liên quan đến lỗi.
- **Hướng khắc phục ban đầu:** Đề xuất một vài hướng để bắt đầu khắc phục.
"""
    },
    "debug_code": {
        "title": "🛠️ Debug Code & Đề xuất Giải pháp",
        "instruction": """
## {title}
Kiểm tra đoạn code được cung cấp để tìm lỗi.
- **Vấn đề:** Mô tả lỗi được tìm thấy.
- **Giải pháp khắc phục:** Cung cấp đoạn code đã sửa trong một khối code.
- **Các bước debug:** Gợi ý các bước debug step-by-step nếu cần để tự tìm lỗi.
- **Kiểm tra Edge-cases:** Liệt kê các trường hợp biên (edge-cases) mà đoạn code có thể chưa xử lý tốt và gợi ý cách xử lý.
"""
    },

    # 4. Tối ưu hóa & Refactoring
    "optimize_performance": {
        "title": "⚡ Tối ưu hóa Hiệu năng",
        "instruction": """
## {title}
Đề xuất các cải tiến để tối ưu hóa hiệu năng của đoạn code, bao gồm độ phức tạp thuật toán (complexity) và sử dụng bộ nhớ (memory).
- **Đánh giá hiện trạng:** Nhận xét về hiệu năng hiện tại.
- **Đề xuất cải tiến:** Cung cấp đoạn code đã tối ưu hóa trong một khối code.
- **Giải thích:** Nêu rõ các thay đổi và lý do chúng cải thiện hiệu năng.
"""
    },
    "refactor_code": {
        "title": "✨ Refactoring & Cải thiện Chất lượng Code",
        "instruction": """
## {title}
Refactor đoạn code để cải thiện khả năng đọc, bảo trì và tuân thủ style guide (ví dụ: ESLint, PEP8).
- **Code đã refactor:** Cung cấp toàn bộ đoạn code đã được refactor trong một khối code.
- **Các cải tiến chính:** Liệt kê các thay đổi lớn và lý do chúng là cải tiến.
- **Phân tích "Code Smell":** Nếu có, chỉ ra các "code smell" và cách refactor đã giải quyết chúng.
"""
    },

    # 5. Sinh test & Đảm bảo chất lượng
    "generate_tests": {
        "title": "🧪 Sinh Test & Đảm bảo Chất lượng",
        "instruction": """
## {title}
Viết unit test hoặc integration test cho đoạn code được cung cấp bằng ngôn ngữ {language}.
- **Test Code:** Cung cấp đoạn code test hoàn chỉnh trong một khối code.
- **Mocking/Fixtures/Setup:** Gợi ý cách sử dụng mocking, fixtures hoặc setup dữ liệu để kiểm tra các trường hợp cụ thể.
- **Code Coverage:** Nếu có thể, đề xuất các test case bổ sung để tăng độ bao phủ code (code coverage).
"""
    },

    # 6. Tạo tài liệu & Comment
    "generate_comments_docs": {
        "title": "✍️ Tạo Tài liệu & Comment",
        "instruction": """
## {title}
Sinh comment chi tiết cho từng hàm/lớp hoặc tạo tài liệu API (OpenAPI/Swagger) hoặc tóm tắt module theo yêu cầu.
- **Loại tài liệu:** {document_type}
- **Nội dung:** Cung cấp tài liệu/comment trong một khối code hoặc văn bản Markdown phù hợp.
- **Đối với comment:** Đảm bảo mỗi hàm/lớp có docstring hoặc comment rõ ràng về mục đích, tham số, giá trị trả về và các ngoại lệ.
- **Đối với tài liệu API:** Cung cấp định dạng OpenAPI/Swagger JSON/YAML.
"""
    },

    # 7. Chuyển đổi ngôn ngữ lập trình
    "translate_code": {
        "title": "🔄 Chuyển đổi Ngôn ngữ Lập trình",
        "instruction": """
## {title}
Dịch đoạn code từ {source_language} sang {target_language}.
- **Code đã dịch:** Cung cấp đoạn code đã dịch hoàn chỉnh trong một khối code.
- **Điểm tương đồng/khác biệt:** Giải thích các điểm tương đồng và khác biệt chính trong cú pháp hoặc cách tiếp cận giữa hai ngôn ngữ trong ngữ cảnh của đoạn code này.
"""
    },

    # 8. Kiểm tra bảo mật & Code Audit
    "security_audit": {
        "title": "🔒 Kiểm tra Bảo mật & Code Audit",
        "instruction": """
## {title}
Thực hiện kiểm tra bảo mật (code audit) trên đoạn code được cung cấp.
- **Lỗ hổng:** Phát hiện các lỗ hổng bảo mật tiềm ẩn (ví dụ: OWASP Top 10 như SQL Injection, XSS, CSRF). Liệt kê từng lỗ hổng và giải thích nguy cơ.
- **Giải pháp/Best Practices:** Đề xuất các giải pháp khắc phục hoặc các best practices về authentication, mã hóa dữ liệu.
- **Đánh giá Dependency:** Nếu có thể, đánh giá các thư viện/dependency được sử dụng để tìm kiếm các lỗ hổng đã biết.
"""
    },

    # 9. Tích hợp quy trình CI/CD
    "ci_cd_integration": {
        "title": "⚙️ Tích hợp Quy trình CI/CD",
        "instruction": """
## {title}
Gợi ý cấu hình pipeline CI/CD hoặc script deploy dựa trên yêu cầu.
- **Hệ thống/Nền tảng:** {platform_name} (ví dụ: GitHub Actions, GitLab CI, Heroku, AWS, Docker).
- **Cấu hình/Script:** Cung cấp đoạn cấu hình/script hoàn chỉnh trong một khối code (ví dụ: `.github/workflows/main.yml`, `Dockerfile`, `deploy.sh`).
- **Giải thích:** Giải thích các bước trong pipeline/script và mục đích của chúng.
- **Giám sát:** Gợi ý cách giám sát quá trình build/test/report.
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
```{language}
{content}
```

**Yêu cầu của bạn:**
{task_instruction}
"""
    
    return final_prompt