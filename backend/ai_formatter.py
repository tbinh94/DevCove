import markdown2
from bs4 import BeautifulSoup
import uuid

class AICommentFormatter:
    """
    Formats raw markdown response from an AI into a styled HTML comment.
    Uses markdown2 for robust conversion and BeautifulSoup for custom styling.
    """
    def format_full_response(self, ai_text: str, post=None) -> str:
        """
        Main method to format the complete AI response into HTML.
        """
        # Step 1: Convert markdown to HTML
        base_html = markdown2.markdown(
            ai_text,
            extras=["fenced-code-blocks", "tables", "cuddled-lists", "break-on-newline"]
        )

        # Step 2: Use BeautifulSoup to enhance the HTML
        soup = BeautifulSoup(base_html, 'html.parser')

        self._style_headings(soup)
        self._style_code_blocks(soup)

        # Get CSS and JS
        css_styles = self._get_css_styles()
        copy_script = self._get_copy_script()

        # Create the final report
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
            emoji_span = ''
            title_text = h2.decode_contents()

            if h2.string and h2.string.strip():
                parts = h2.string.strip().split(' ', 1)
                if len(parts) > 1 and len(parts[0]) <= 2:
                    emoji, title = parts
                    title_text = title
                    emoji_span = f'<span class="section-emoji">{emoji}</span>'

            header_div_str = f"""
            <div class="section-header">
                {emoji_span}
                <h2 class="section-title">{title_text}</h2>
            </div>
            """
            header_div = BeautifulSoup(header_div_str, 'html.parser')
            h2.replace_with(header_div)

    def _style_code_blocks(self, soup):
        """Adds a copy button and header to each code block if it doesn't have one."""
        for pre in soup.find_all('pre'):
            if pre.find_parent('div', class_='code-block-container'):
                continue

            code_tag = pre.find('code')
            if not code_tag:
                continue

            lang_class = code_tag.get('class', ['language-text'])
            language = lang_class[0].replace('language-', '') if lang_class else 'text'
            block_id = f"code-content-{uuid.uuid4().hex}"
            code_tag['id'] = block_id

            header_html = f"""
            <div class="code-header">
                <div class="header-dots">
                    <span class="dot" style="background:#ff5f56;"></span>
                    <span class="dot" style="background:#ffbd2e;"></span>
                    <span class="dot" style="background:#27c93f;"></span>
                </div>
                <span class="code-language">{language.upper()}</span>
                <button class="copy-btn" onclick="copyCode(this, '{block_id}')">
                    <span class="copy-icon">📋</span>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
            """

            container_div = soup.new_tag('div', **{'class': 'code-block-container'})
            pre.insert_before(BeautifulSoup(header_html, 'html.parser'))
            pre.wrap(container_div)

    def _get_css_styles(self) -> str:
        """CSS for the report, with a cohesive and professional dark theme."""
        return """
        /* --- Cohesive Dark Theme for the Entire Report --- */
        .ai-analysis-report {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.7;
            background-color: #1c1c1c; /* VS Code-like dark background */
            color: #d4d4d4; /* Light text color */
            border: 1px solid #3c3c3c;
            border-radius: 8px;
            padding: 1.5rem 2rem;
            margin-top: 1rem;
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px;
            margin: 20px 0 15px 0;
            border-bottom: 1px solid #3c3c3c;
        }
        .section-emoji { font-size: 1.6rem; line-height: 1; }
        .section-title { margin: 0; font-size: 1.4rem; color: #ffffff; font-weight: 600; }
        .ai-content-body ul, .ai-content-body ol { padding-left: 25px; }
        .ai-content-body li { margin-bottom: 0.6rem; }
        .ai-content-body strong { color: #ffffff; font-weight: 600; }
        .ai-content-body a { color: #4e94ce; text-decoration: none; }
        .ai-content-body a:hover { text-decoration: underline; }
        
        /* CORRECTED: Inline code style with no background highlight */
        .ai-content-body code {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            color: #ce9178; /* VS Code-like orange/tan for inline variables */
            background-color: transparent !important;
            padding: 0 1px;
            font-size: 90%;
        }

        /* --- Polished Dark Theme Code Block --- */
        .code-block-container {
            border-radius: 8px;
            overflow: hidden;
            margin: 1.5rem 0;
            border: 1px solid #3c3c3c;
        }
        .code-header {
            background: #252526; /* VS Code header color */
            display: flex;
            align-items: center;
            padding: 10px 15px;
            position: relative;
        }
        .header-dots { display: flex; align-items: center; gap: 8px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .code-language {
            flex-grow: 1; text-align: center; color: #cccccc; font-weight: 500; font-size: 0.8em;
            letter-spacing: 0.5px; text-transform: uppercase;
        }
        .copy-btn {
            background-color: #0e639c;
            color: #ffffff; border: none; border-radius: 5px; padding: 6px 12px;
            cursor: pointer; font-size: 0.85em; font-weight: 500;
            transition: background-color 0.2s ease; display: flex; align-items: center; gap: 6px;
        }
        .copy-btn:hover { background-color: #1177bb; }
        .copy-btn.copied { background-color: #28a745; }
        .copy-btn .copy-icon { line-height: 1; }

        pre {
            background: #1e1e1e; /* VS Code main editor background */
            color: #d4d4d4;
            margin: 0 !important;
            padding: 1rem 1.5rem;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.6;
        }
        /* Prevent inline styles from affecting code in blocks */
        pre code {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
            color: inherit !important;
            background-color: transparent !important;
            padding: 0 !important;
            font-size: inherit !important;
        }
        """

    def _get_copy_script(self) -> str:
        """Robust and corrected JavaScript for the copy button."""
        return """
        function copyCode(button, elementId) {
            const codeTag = document.getElementById(elementId);
            if (!codeTag) {
                console.error('Code element not found:', elementId);
                return;
            }

            navigator.clipboard.writeText(codeTag.innerText).then(() => {
                const iconSpan = button.querySelector('.copy-icon');
                const textSpan = button.querySelector('.copy-text');
                
                if (!textSpan || !iconSpan) return;

                const originalIcon = iconSpan.innerHTML;
                const originalText = textSpan.textContent;

                iconSpan.innerHTML = '✓';
                textSpan.textContent = 'Copied';
                button.classList.add('copied');
                
                setTimeout(() => {
                    iconSpan.innerHTML = originalIcon;
                    textSpan.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                const textSpan = button.querySelector('.copy-text');
                if (textSpan) {
                    textSpan.textContent = 'Failed';
                    setTimeout(() => { textSpan.textContent = 'Copy'; }, 2000);
                }
            });
        }
        """