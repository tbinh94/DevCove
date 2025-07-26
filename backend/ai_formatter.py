import markdown2
from bs4 import BeautifulSoup
import uuid

class AICommentFormatter:
    """
    Formats raw markdown response from an AI into a styled HTML comment.
    Uses markdown2 for robust conversion and BeautifulSoup for custom styling.
    """
    # =====>>>>> SỬA Ở ĐÂY <<<<<=====
    def format_full_response(self, ai_text: str, post=None) -> str:
        """
        Main method to format the complete AI response into HTML.
        Can accept an optional 'post' object, but does not require it.
        """
        # ==============================
        
        # Bước 1: Chuyển đổi toàn bộ markdown của AI thành HTML chuẩn
        base_html = markdown2.markdown(
            ai_text,
            extras=["fenced-code-blocks", "tables", "cuddled-lists", "break-on-newline"]
        )

        # Bước 2: Dùng BeautifulSoup để "trang trí" thêm cho HTML
        soup = BeautifulSoup(base_html, 'html.parser')
        
        self._style_headings(soup)
        self._style_code_blocks(soup)
        
        # Lấy CSS và JS
        css_styles = self._get_css_styles()
        copy_script = self._get_copy_script()
        
        # Tạo report cuối cùng
        # Logic này không phụ thuộc vào `post` nên sẽ hoạt động tốt
        return f"""
        <div class="ai-analysis-report">
            <style>{css_styles}</style>
            <div class="ai-content-body">
                {str(soup)}
            </div>
            <script>{copy_script}</script>
        </div>
        """

    def _style_headings(self, soup):
        """Finds h2 headings and wraps them in a styled div."""
        for h2 in soup.find_all('h2'):
            # Lấy emoji từ đầu heading (nếu có)
            emoji_span = ''
            if h2.string and h2.string.strip():
                # Tách emoji và title một cách an toàn hơn
                parts = h2.string.strip().split(' ', 1)
                if len(parts) > 1 and len(parts[0]) <= 2: # Giả định emoji là 1-2 ký tự
                    emoji, title = parts
                    h2.string = title
                    emoji_span = f'<span class="section-emoji">{emoji}</span>'

            # Tạo div header mới và thay thế h2 cũ
            header_div_str = f"""
            <div class="section-header">
                {emoji_span}
                <h2 class="section-title">{h2.decode_contents()}</h2>
            </div>
            """
            header_div = BeautifulSoup(header_div_str, 'html.parser')
            h2.replace_with(header_div)

    def _style_code_blocks(self, soup):
        """Adds a copy button and header to each code block, ONLY IF it doesn't have one."""
        for pre in soup.find_all('pre'):
            # =====>>>>> SỬA Ở ĐÂY <<<<<=====
            # KIỂM TRA: Nếu thẻ <pre> này đã nằm trong một container mà AI đã tạo,
            # có nghĩa là nó đã có header rồi -> bỏ qua không xử lý.
            if pre.find_parent('div', class_='code-block-container'):
                continue
            # ==============================

            code_tag = pre.find('code')
            if not code_tag:
                continue

            lang_class = code_tag.get('class', ['language-text'])
            language = lang_class[0].replace('language-', '') if lang_class else 'text'
            block_id = f"code-block-{uuid.uuid4().hex}"
            code_tag['id'] = block_id

            header_html = f"""
            <div class="code-header">
                <span class="code-language">{language.upper()}</span>
                <button class="copy-btn" onclick="copyCode('{block_id}')">
                    <span class="copy-icon">📋</span>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
            """

            container_div = soup.new_tag('div', **{'class': 'code-block-container'})

            pre.insert_before(BeautifulSoup(header_html, 'html.parser'))
            pre.wrap(container_div)

    def _get_css_styles(self) -> str:
        """CSS cho report."""
        return """
        .ai-analysis-report {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #212529;
            background: #fff;
            border-radius: 8px;
            padding: 1rem;
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0px;
            margin: 20px 0 10px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .section-emoji { font-size: 1.5rem; }
        .section-title { margin: 0; font-size: 1.25rem; color: #343a40; font-weight: 600; }
        .ai-content-body h2 { display: none; } /* Ẩn h2 gốc sau khi đã wrap */
        .ai-content-body h3 { font-size: 1.1em; color: #495057; margin-top: 20px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px; }
        .ai-content-body p { margin-bottom: 1rem; }
        .ai-content-body ul, .ai-content-body ol { padding-left: 25px; margin-bottom: 1rem; }
        .ai-content-body li { margin-bottom: 0.5rem; }
        .ai-content-body strong { color: #000; }
        
        /* Cải tiến style cho code block */
        .code-block-container { 
            margin: 1.5rem 0; 
            border: 1px solid #282c34; /* Darker border for contrast */
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); /* Soft shadow for depth */
        }
        .code-header { 
            background: #282c34; /* Dark background for header */
            padding: 10px 15px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 1px solid #3a404a; /* Slightly lighter border */
            color: #abb2bf; /* Light text color */
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        .code-language { 
            font-size: 0.85em; 
            font-weight: bold; 
            color: #61afef; /* A blueish color for language name */
            text-transform: uppercase; 
        }
        .copy-btn { 
            background: #61afef; /* Blue background for button */
            color: #ffffff; /* White text for button */
            border: none; /* No border */
            border-radius: 5px; 
            padding: 6px 12px; 
            cursor: pointer; 
            font-size: 0.85em; 
            transition: background-color 0.2s ease, transform 0.1s ease; /* Smooth transitions */
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .copy-btn:hover { 
            background-color: #529fde; /* Slightly darker blue on hover */
            transform: translateY(-1px); /* Slight lift effect */
        }
        .copy-btn.copied { 
            background: #28a745; /* Green when copied */
            border-color: #28a745; 
        }
        .copy-btn .copy-icon { 
            font-size: 1em; /* Adjust icon size */
            line-height: 1;
        }
        .copy-btn .copy-text { 
            margin-left: 0; 
            color: inherit; /* Inherit color from button */
        }
        pre { 
            margin: 0 !important; 
            padding: 15px; 
            background: #282c34; /* Dark background for code area */
            white-space: pre-wrap; 
            word-wrap: break-word; 
            font-size: 14px; 
            color: #abb2bf; /* Light text color for code */
            line-height: 1.5;
        }
        code { 
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; 
            font-size: inherit; 
        }
        """

    def _get_copy_script(self) -> str:
        """JavaScript cho nút copy, đảm bảo hoạt động độc lập."""
        return """
        function copyCode(elementId) {
            const codeTag = document.getElementById(elementId);
            if (!codeTag) { console.error('Code element not found:', elementId); return; }
            navigator.clipboard.writeText(codeTag.innerText).then(() => {
                const container = codeTag.closest('.code-block-container');
                if (!container) return;
                const copyBtn = container.querySelector('.copy-btn');
                const copyTextSpan = copyBtn.querySelector('.copy-text');
                if (!copyTextSpan) return;
                
                const originalText = copyTextSpan.textContent;
                copyBtn.classList.add('copied');
                copyTextSpan.textContent = 'Copied!';
                
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyTextSpan.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
        """