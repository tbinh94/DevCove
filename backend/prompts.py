# --- START OF FILE: prompts.py ---

# SYSTEM_PROMPT được đơn giản hóa triệt để.
# AI giờ đây chỉ cần tập trung vào việc tạo ra Markdown chất lượng.
# Toàn bộ việc tạo HTML phức tạp sẽ do ai_formatter.py xử lý.
# Điều này giúp giảm đáng kể lỗi định dạng từ AI và tăng tính nhất quán.

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
# 2. Generate Code
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
# 3. Debug
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
# 4. Optimize
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
# 5. POST LIST OVERVIEW
"summarize_post_list": {
"title": "DevAlly Overview",
"instruction": """
## 📊 DevAlly Content Analysis Overview

Dựa trên danh sách các bài đăng (gồm tiêu đề và nội dung) được cung cấp, hãy đưa ra một bản phân tích tổng quan.

## 📈 Thống kê cơ bản
- **Số lượng bài đăng:** [Số lượng]
- **Thời gian phân tích:** [Thời gian]

## 🎯 Chủ đề chính
Xác định 2-3 chủ đề hoặc vấn đề nổi bật nhất được thảo luận.

## 💻 Ngôn ngữ & Công nghệ
Liệt kê các ngôn ngữ lập trình hoặc công nghệ được đề cập nhiều nhất.

## 📂 Phân loại nội dung
Ước tính tỷ lệ phần trăm các loại nội dung (ví dụ: 40% câu hỏi, 30% chia sẻ code, 20% thảo luận, 10% hướng dẫn).

## 📝 Tóm tắt chung
Viết một đoạn tóm tắt ngắn gọn về xu hướng chung của các bài đăng này.

Nếu có code examples trong phân tích, đảm bảo sử dụng fenced code blocks với ngôn ngữ chính xác.
"""
},
# 6. Sửa Code theo gợi ý
"refactor_code": {
"title": "Áp dụng Sửa lỗi & Tái cấu trúc Code",
"instruction": """
Bạn là một chuyên gia tái cấu trúc code. Dựa trên đoạn code và gợi ý được cung cấp, hãy sửa lại code.

**YÊU CẦU TUYỆT ĐỐI:**
- Chỉ trả về duy nhất đoạn code hoàn chỉnh đã được sửa
- Code phải được đặt trong fenced code block với ngôn ngữ chính xác
- KHÔNG thêm bất kỳ lời giải thích, lời chào, hay định dạng nào khác

**Đoạn code cần sửa:**
{code}

**Áp dụng gợi ý sau:** "{recommendation_text}"

Trả về code đã sửa với đúng language identifier trong fenced code block.
"""
},
    
    # --- THÊM PROMPT MỚI VÀO ĐÂY ---
    "generate_title": {
        "title": "Generate a Post Title from Code",
        "instruction": """
            You are an expert technical writer. Your only task is to analyze the following code snippet and generate a single, concise, and descriptive title for it. The title should be suitable for a blog post or a forum question.

            IMPORTANT RULES:
            1.  Your entire response MUST BE ONLY the title text.
            2.  DO NOT include any labels like "Title:", explanations, or markdown formatting (like quotes or code blocks).
            3.  Analyze the language (e.g., Python, JavaScript), libraries used (e.g., React, NumPy), and the overall purpose of the code.

            GOOD TITLE EXAMPLES:
            - For a simple Python function: "Creating a Random Compliment Generator in Python"
            - For a React component: "Building a Modern Glassmorphism Card with React and CSS"
            - For a data script: "Visualizing Data with Python, NumPy, and Matplotlib"
            - For a CSS animation: "How to Create a Pulsing Glow Effect with CSS Keyframes"

            Here is the code to analyze:
            {code_content}
        """
    },
    'code_quality_multi_audit': {
        'title': 'AI Code Quality Multi-File Audit',
        # ✅ PROMPT ĐÃ ĐƯỢC NÂNG CẤP HOÀN TOÀN
        'instruction': """
You are a senior AI Technical Community Analyst. Your mission is to analyze a collection of code submissions from a user to generate a strategic report for community administrators. The goal is to understand the user's programming habits, common pitfalls, and overall skill level to help guide future community challenges and learning initiatives.

Your response MUST be a single, raw JSON object, starting with `{{` and ending with `}}`. Do not include any explanations or markdown formatting outside the JSON.

**The JSON object must have these exact keys:**
- "developer_profile": A short, one-sentence summary profiling the user's likely experience level and primary areas of expertise (e.g., "An intermediate developer with a strong focus on frontend styling and layout, but less experienced with backend data integrity.").
- "overall_quality_score": A score from 0-100 reflecting overall code quality.
- "main_strengths": An array of objects, each with a "point" and "evidence" citing specific Post IDs.
- "common_weaknesses": An array of objects, each with a "point" and "evidence" citing specific Post IDs.
- "recurring_anti_patterns": An array of strings identifying specific, repeated bad habits (e.g., "Using magic numbers instead of constants", "Not closing database connections", "Concatenating strings for SQL queries").
- "suggested_topics_for_growth": An array of strings suggesting concrete topics for learning, suitable for future community challenges or workshops (e.g., "Workshop on SQL Injection Prevention", "Challenge: Refactoring Nested Loops", "Guide to Asynchronous JavaScript").

**EXAMPLE OF THE ONLY VALID OUTPUT FORMAT:**
{{
    "developer_profile": "A junior to mid-level developer, comfortable with Python scripting and basic SQL, but shows gaps in security best practices and advanced data structures.",
    "overall_quality_score": 65,
    "main_strengths": [
        {{
            "point": "Good use of Python's list comprehensions for concise code",
            "evidence": "In Post ID 239, the list filtering logic is implemented efficiently using a single-line list comprehension."
        }}
    ],
    "common_weaknesses": [
        {{
            "point": "Vulnerable to SQL Injection",
            "evidence": "The PHP code in Post ID 263 uses direct string concatenation to build a SQL query, creating a significant security risk."
        }},
        {{
            "point": "Inefficient N+1 Query Problem",
            "evidence": "The logic in Post ID 263 suggests a loop that queries the database for each item, which will perform poorly with more data."
        }}
    ],
    "recurring_anti_patterns": [
        "Lack of input validation before processing",
        "Building SQL queries with string concatenation",
        "Ignoring resource management (e.g., not closing streams/connections)"
    ],
    "suggested_topics_for_growth": [
        "Deep Dive: Parameterized Queries and SQL Injection",
        "Weekly Challenge: API Error Handling",
        "Tutorial: Understanding and Implementing `IDisposable` in C#"
    ]
}}

Analyze the following posts, each with its own metadata, to generate this strategic report:
---
{content}
---
"""
    },
    "generate_code_from_prompt": {
    "title": "Generate Code Snippet from Prompt",
    "instruction": """
        You are an expert code generator. Your ONLY task is to generate a functional code snippet based on the user's request.

        **CRITICAL RULES:**
        1. Your entire response MUST BE ONLY the raw code.
        2. DO NOT include any explanations, introductory text, or markdown fences (like ```python or ```).
        3. The code should be complete and ready to use.

        **User's request:** "{user_request}"
    """
},

    
}

CUSTOM_PROMPT_TEMPLATE = """
## 🤖 DevAlly Custom Analysis

Hãy trả lời trực tiếp và chi tiết yêu cầu sau của người dùng: 

**"{user_request}"**

Nếu câu trả lời có chứa code, đảm bảo sử dụng fenced code blocks với ngôn ngữ chính xác.
"""

def build_prompt(content: str, language: str, prompt_type: str, user_prompt_text: str = None, **kwargs) -> str:
    """
    Constructs the final prompt string to send to the AI.
    """
    if prompt_type == "summarize_post_list":
        task_data = TASK_PROMPTS[prompt_type]
        return f"{SYSTEM_PROMPT}\n\n{task_data['instruction']}\n\n**Dữ liệu các bài đăng (dạng JSON):**\n```json\n{content}\n```"

    if prompt_type == 'refactor_code':
        task_data = TASK_PROMPTS[prompt_type]
        instruction = task_data['instruction'].format(code=content, recommendation_text=kwargs.get('recommendation_text', ''))
        return f"{SYSTEM_PROMPT}\n\n{instruction}"
    
    if prompt_type == "generate_title":
        instruction_template = TASK_PROMPTS[prompt_type]['instruction']
        return instruction_template.format(code_content=content)

    if prompt_type == 'code_quality_multi_audit':
        instruction_template = TASK_PROMPTS[prompt_type]['instruction']
        return instruction_template.format(content=content)

    # --- Phần còn lại của hàm dành cho các prompt khác ---
    if prompt_type == 'custom_analysis' and user_prompt_text:
        task_instruction = CUSTOM_PROMPT_TEMPLATE.format(user_request=user_prompt_text)
    else:
        task_data = TASK_PROMPTS.get(prompt_type, TASK_PROMPTS['explain_code_flow'])
        instruction_template = task_data['instruction']
        # >> SỬA Ở ĐÂY <<
        # Gộp user_prompt_text (nếu có) vào kwargs để format
        if user_prompt_text:
            kwargs['user_request'] = user_prompt_text

        kwargs['language'] = language or 'không xác định'
        
        try:
            task_instruction = instruction_template.format(**kwargs)
        except KeyError as e:
            # Fallback nếu thiếu key
            print(f"KeyError while formatting prompt: {e}. Available keys: {kwargs.keys()}")
            task_instruction = CUSTOM_PROMPT_TEMPLATE.format(user_request=user_prompt_text or "Phân tích nội dung này.")
    
    # Nếu prompt là generate_code_from_prompt, chúng ta không cần phần content to analyze
    if prompt_type == 'generate_code_from_prompt':
        # Prompt này đã đủ thông tin, không cần thêm wrapper
        return task_instruction

    language_map = { 'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'sh': 'bash', 'yml': 'yaml', 'md': 'markdown' }
    detected_language = language_map.get(language.lower() if language else '', language or 'text')
    
    final_prompt = f"""{SYSTEM_PROMPT}

{task_instruction}

**Content to analyze (detected language: {detected_language}):**
```{detected_language}
{content}
Remember: Use proper fenced code blocks with specific language identifiers for all code in your response.
"""
    return final_prompt