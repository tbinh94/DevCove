# Chuyên Trang Trí chatbot

import markdown2
from bs4 import BeautifulSoup
import uuid

class AICommentFormatter:
    """
    Formats raw markdown response from an AI into a styled HTML comment.
    Uses markdown2 for robust conversion and BeautifulSoup for custom styling.
    """
    def format_full_response(self, ai_text: str, post) -> str:
        """Main method to format the complete AI response into HTML."""
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
                parts = h2.string.strip().split(' ', 1)
                if len(parts) > 1:
                    emoji, title = parts
                    h2.string = title
                    emoji_span = f'<span class="section-emoji">{emoji}</span>'

            # Tạo div header mới và thay thế h2 cũ
            header_div = BeautifulSoup(f"""
            <div class="section-header">
                {emoji_span}
                <h2 class="section-title">{h2.decode_contents()}</h2>
            </div>
            """, 'html.parser')
            h2.replace_with(header_div)

    def _style_code_blocks(self, soup):
        """Adds a copy button and header to each code block."""
        for pre in soup.find_all('pre'):
            code_tag = pre.find('code')
            if not code_tag:
                continue

            lang_class = code_tag.get('class', ['language-text'])
            language = lang_class[0].replace('language-', '') if lang_class else 'text'
            block_id = f"code-block-{uuid.uuid4()}"
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
            
            # Bọc <pre> trong container mới
            container_div = soup.new_tag('div', **{'class': 'code-block-container'})
            container_div.append(BeautifulSoup(header_html, 'html.parser'))
            pre.wrap(container_div)

    def _get_css_styles(self) -> str:
        """CSS cho report. Có thể giữ lại phần lớn CSS cũ của bạn."""
        # Giữ lại CSS từ file cũ của bạn, nhưng đảm bảo có các style cho tag HTML chuẩn
        # như h2, h3, ul, li, p, strong...
        return """
        .ai-analysis-report {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333; /* Màu chữ dễ đọc hơn */
            background: #fff;
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            padding: 1rem;
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            margin: 20px -1rem 10px -1rem; /* Căn lề cho đẹp */
            border-bottom: 1px solid #e1e8ed;
            background: #f8f9fa;
        }
        .section-emoji { font-size: 1.4em; }
        .section-title { margin: 0; font-size: 1.2em; color: #2c3e50; }
        .ai-content-body h3 { font-size: 1.1em; color: #34495e; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .ai-content-body p { margin-bottom: 1rem; }
        .ai-content-body ul, .ai-content-body ol { padding-left: 25px; margin-bottom: 1rem; }
        .ai-content-body li { margin-bottom: 0.5rem; }
        .code-block-container { margin: 1.5rem 0; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden; }
        .code-header { background: #f8f9fa; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e1e8ed; }
        .code-language { font-size: 0.85em; font-weight: 600; color: #657786; text-transform: uppercase; }
        .copy-btn { /* ... giữ nguyên style cũ ... */ background: #1da1f2; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; }
        .copy-btn.copied { background: #17bf63; }
        pre { margin: 0; padding: 15px; background: #f6f8fa; white-space: pre-wrap; word-wrap: break-word; }
        code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 0.9em; }
        """

    def _get_copy_script(self) -> str:
        """JavaScript cho nút copy, giữ nguyên như cũ."""
        return """
        function copyCode(elementId) {
            const codeTag = document.getElementById(elementId);
            if (!codeTag) return;
            navigator.clipboard.writeText(codeTag.textContent).then(() => {
                const copyBtn = codeTag.closest('.code-block-container').querySelector('.copy-btn');
                const copyText = copyBtn.querySelector('.copy-text');
                if (!copyText) return;
                const originalText = copyText.textContent;
                copyText.textContent = 'Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyText.textContent = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        }
        """