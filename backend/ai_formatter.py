# --- START OF FILE ai_formatter.py (Corrected) ---

import markdown2
from bs4 import BeautifulSoup
import uuid
import re

class AICommentFormatter:
    """
    Formats raw markdown response from an AI into a styled HTML comment.
    Uses markdown2 for robust conversion and BeautifulSoup for custom styling.
    Enhanced with better language detection and Run button functionality.
    """
    
    def __init__(self):
        # Enhanced language mapping for better detection
        self.language_aliases = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'sh': 'bash',
            'shell': 'bash',
            'yml': 'yaml',
            'md': 'markdown',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'vue': 'javascript',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'cpp': 'cpp',
            'c++': 'cpp',
            'cs': 'csharp',
            'java': 'java',
            'kt': 'kotlin',
            'swift': 'swift',
            'dart': 'dart',
            'sql': 'sql',
            'xml': 'xml',
            'json': 'json'
        }
        
        # Languages that support running in browser/sandbox
        self.runnable_languages = [
            'javascript', 'js', 'python', 'py'
        ]

    def format_full_response(self, ai_text: str, post=None) -> str:
        """
        Main method to format the complete AI response into HTML.
        Enhanced with better language detection from AI markdown.
        """
        # Step 1: Pre-process the AI text to improve language detection
        processed_text = self._preprocess_ai_markdown(ai_text)
        
        # Step 2: Convert markdown to HTML
        base_html = markdown2.markdown(
            processed_text,
            extras=["fenced-code-blocks", "tables", "cuddled-lists", "break-on-newline"]
        )

        # Step 3: Use BeautifulSoup to enhance the HTML
        soup = BeautifulSoup(base_html, 'html.parser')

        self._style_headings(soup)
        self._style_code_blocks(soup)

        # Get CSS
        css_styles = self._get_css_styles()

        # Create the final report (NO SCRIPT TAG - Logic is handled by React)
        return f"""
        <div class="ai-analysis-report">
            <style>{css_styles}</style>
            <div class="ai-content-body">
                {str(soup)}
            </div>
        </div>
        """

    def _preprocess_ai_markdown(self, ai_text: str) -> str:
        """
        Pre-process AI markdown to ensure proper code block closure and language detection.
        This fixes issues where code blocks aren't properly closed or lack language identifiers.
        """
        
        def detect_language_from_content(code_content):
            """Detect programming language from code content using heuristics."""
            if not code_content or not code_content.strip():
                return 'text'
                
            code_lower = code_content.lower().strip()
            
            # JavaScript/TypeScript patterns
            if any(pattern in code_lower for pattern in [
                'console.log', 'function(', '=>', 'const ', 'let ', 'var ',
                'document.', 'window.', '.addEventListener', 'require(',
                'import ', 'export ', 'async ', 'await '
            ]):
                if any(ts_pattern in code_lower for ts_pattern in [
                    'interface ', 'type ', ': string', ': number', ': boolean',
                    '<T>', 'extends ', 'implements '
                ]):
                    return 'typescript'
                return 'javascript'
            
            # Python patterns
            elif any(pattern in code_lower for pattern in [
                'def ', 'import ', 'from ', 'print(', 'if __name__',
                'self.', 'class ', 'elif ', 'isinstance(', 'len('
            ]):
                return 'python'
            
            # HTML patterns
            elif any(pattern in code_lower for pattern in [
                '<html', '<head', '<body', '<div', '<span', '<p>',
                '<!doctype', '<script', '<style', '<link'
            ]):
                return 'html'
            
            # CSS patterns
            elif any(pattern in code_lower for pattern in [
                '{', '}', ':', ';', 'background:', 'color:', 'font-',
                'margin:', 'padding:', 'width:', 'height:', 'display:'
            ]) and not any(pattern in code_lower for pattern in ['function', 'console', 'var ', 'let ']):
                return 'css'
            
            # JSON patterns
            elif (code_lower.strip().startswith('{') and code_lower.strip().endswith('}')) or \
                 (code_lower.strip().startswith('[') and code_lower.strip().endswith(']')):
                return 'json'
            
            # SQL patterns
            elif any(pattern in code_lower for pattern in [
                'select ', 'from ', 'where ', 'insert ', 'update ',
                'delete ', 'create table', 'alter table', 'drop table'
            ]):
                return 'sql'
            
            # Bash/Shell patterns
            elif any(pattern in code_lower for pattern in [
                '#!/bin/', 'echo ', 'cd ', 'ls ', 'mkdir ', 'rm ',
                'grep ', 'sed ', 'awk ', 'curl ', 'wget '
            ]):
                return 'bash'
            
            return 'text'

        # Split text into lines and process
        lines = ai_text.split('\n')
        processed_lines = []
        i = 0
        in_code_block = False
        
        while i < len(lines):
            line = lines[i]
            stripped_line = line.strip()
            
            # Check for code block start
            if stripped_line.startswith('```'):
                if not in_code_block:
                    # Starting a code block
                    in_code_block = True
                    lang_match = re.match(r'^```(\w*)', stripped_line)
                    current_lang = lang_match.group(1) if lang_match and lang_match.group(1) else ''
                    
                    # If no language or generic language, try to detect from content
                    if not current_lang or current_lang in ['text', 'plain', 'code']:
                        # Look ahead to get code content
                        code_content_lines = []
                        j = i + 1
                        while j < len(lines) and not lines[j].strip().startswith('```'):
                            code_content_lines.append(lines[j])
                            j += 1
                        
                        code_content = '\n'.join(code_content_lines)
                        detected_lang = detect_language_from_content(code_content)
                        
                        # Use detected language or fallback
                        final_lang = self.language_aliases.get(detected_lang.lower(), detected_lang.lower())
                        processed_lines.append(f'```{final_lang}')
                    else:
                        # Normalize known language aliases
                        normalized_lang = self.language_aliases.get(current_lang.lower(), current_lang.lower())
                        processed_lines.append(f'```{normalized_lang}')
                else:
                    # Closing a code block
                    in_code_block = False
                    processed_lines.append('```')
            else:
                processed_lines.append(line)
            
            i += 1
        
        # Ensure any unclosed code block is properly closed
        if in_code_block:
            processed_lines.append('```')
            
        return '\n'.join(processed_lines)

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

    # Hàm thêm nút Run Và Copy cho các khối code
    def _style_code_blocks(self, soup):
        """Enhanced code block styling with data attributes for React instead of onclick."""
        for pre in soup.find_all('pre'):
            if pre.find_parent('div', class_='code-block-container'):
                continue

            code_tag = pre.find('code')
            if not code_tag:
                continue

            language = self._detect_language_from_code_tag(code_tag)
            language = self.language_aliases.get(language.lower(), language.lower())
            display_language = self._get_display_language_name(language)
            is_runnable = language.lower() in self.runnable_languages

            block_id = f"code-content-{uuid.uuid4().hex}"
            code_tag['id'] = block_id
            
            # Create Run button if language is runnable, using data attributes
            run_button_html = ""
            if is_runnable:
                run_button_html = f"""
                <button class="run-btn" data-action="run" data-target-id="{block_id}" title="Run this code">
                    <span class="btn-icon">▶️</span>
                    <span class="btn-text">Run</span>
                </button>
                """

            # Create header with data attributes on buttons for React event handling
            header_html = f"""
            <div class="code-header">
                <div class="header-dots">
                    <span class="dot red"></span>
                    <span class="dot yellow"></span>
                    <span class="dot green"></span>
                </div>
                <span class="code-language">{display_language}</span>
                <div class="header-buttons">
                    {run_button_html}
                    <button class="copy-btn" data-action="copy" data-target-id="{block_id}" title="Copy code">
                        <span class="btn-icon">📋</span>
                        <span class="btn-text">Copy</span>
                    </button>
                </div>
            </div>
            """

            # Wrap the pre tag in a container with header
            container_div = soup.new_tag('div', **{'class': 'code-block-container'})
            pre.insert_before(BeautifulSoup(header_html, 'html.parser'))
            pre.wrap(container_div)

    def _detect_language_from_code_tag(self, code_tag):
        """Detect language from code tag classes and content."""
        # First, check class attributes
        lang_class = code_tag.get('class', [])
        if lang_class:
            for cls in lang_class:
                if cls.startswith('language-'):
                    detected_lang = cls.replace('language-', '')
                    if detected_lang and detected_lang != 'text':
                        return detected_lang
        
        # If no valid class, try to detect from content
        code_content = code_tag.get_text()
        return self._detect_language_from_content_heuristics(code_content)

    def _detect_language_from_content_heuristics(self, code_content):
        """
        Improved heuristics to detect programming language from code content.
        Uses weighted scoring system to avoid false positives.
        """
        if not code_content or not code_content.strip():
            return 'text'
        
        code_lower = code_content.lower().strip()
        code_lines = code_content.split('\n')
        
        # Language scoring system
        scores = {
            'go': 0,
            'javascript': 0,
            'typescript': 0,
            'python': 0,
            'html': 0,
            'css': 0,
            'json': 0,
            'java': 0,
            'csharp': 0,
            'rust': 0,
            'cpp': 0
        }
        
        # Go-specific patterns (HIGH WEIGHT)
        go_patterns = [
            ('package main', 10),
            ('func main()', 10),
            ('import (', 8),
            ('type ', 6),
            ('struct {', 8),
            ('var ', 6),
            (':=', 7),
            ('fmt.', 8),
            ('json:"', 7),
            ('net/http', 9),
            ('encoding/json', 9),
            ('log.', 6),
            ('func (', 7)
        ]
        
        # JavaScript-specific patterns (HIGH WEIGHT)
        js_patterns = [
            ('console.log', 8),
            ('document.', 9),
            ('window.', 9),
            ('.addEventListener', 9),
            ('require(', 7),
            ('module.exports', 8),
            ('const ', 4),  # Lower weight as Go also uses const
            ('let ', 6),
            ('var ', 2),    # Lower weight as many languages use var
            ('=>', 5),      # Arrow functions
            ('function(', 7),
            ('async ', 6),
            ('await ', 6),
            ('import ', 3)  # Lower weight as many languages use import
        ]
        
        # TypeScript-specific patterns
        ts_patterns = [
            ('interface ', 10),
            (': string', 8),
            (': number', 8),
            (': boolean', 8),
            ('extends ', 6),
            ('implements ', 8),
            ('enum ', 9),
            ('<T>', 7),
            ('namespace ', 9)
        ]
        
        # Python-specific patterns
        python_patterns = [
            ('def ', 8),
            ('if __name__', 10),
            ('self.', 8),
            ('elif ', 9),
            ('isinstance(', 9),
            ('range(', 8),
            ('enumerate(', 9),
            ('lambda ', 8),
            ('yield ', 9),
            ('print(', 6),
            ('import ', 3),
            ('from ', 4)
        ]
        
        # HTML patterns
        html_patterns = [
            ('<!doctype', 10),
            ('<html', 9),
            ('<head>', 8),
            ('<body>', 8),
            ('<div', 6),
            ('<script', 7),
            ('<style', 7)
        ]
        
        # CSS patterns
        css_patterns = [
            ('background:', 7),
            ('color:', 6),
            ('font-', 6),
            ('margin:', 7),
            ('padding:', 7),
            ('display:', 7),
            ('position:', 7),
            ('width:', 5),
            ('height:', 5)
        ]
        
        # Java patterns
        java_patterns = [
            ('public class', 10),
            ('public static void main', 10),
            ('System.out.', 9),
            ('String[] args', 9),
            ('public ', 4),
            ('private ', 4),
            ('protected ', 6),
            ('extends ', 5),
            ('implements ', 6)
        ]
        
        # C# patterns
        csharp_patterns = [
            ('using System', 10),
            ('namespace ', 7),
            ('Console.WriteLine', 9),
            ('public class', 6),
            ('static void Main', 10),
            ('string[] args', 8)
        ]
        
        # Rust patterns
        rust_patterns = [
            ('fn main()', 10),
            ('let mut', 8),
            ('println!', 9),
            ('use std::', 9),
            ('impl ', 7),
            ('match ', 7),
            ('enum ', 6)
        ]
        
        # C++ patterns
        cpp_patterns = [
            ('#include', 9),
            ('std::', 8),
            ('cout <<', 9),
            ('cin >>', 9),
            ('int main()', 10),
            ('namespace std', 8),
            ('using namespace', 7)
        ]
        
        # Apply pattern matching with weights
        pattern_sets = {
            'go': go_patterns,
            'javascript': js_patterns,
            'typescript': ts_patterns,
            'python': python_patterns,
            'html': html_patterns,
            'css': css_patterns,
            'java': java_patterns,
            'csharp': csharp_patterns,
            'rust': rust_patterns,
            'cpp': cpp_patterns
        }
        
        for lang, patterns in pattern_sets.items():
            for pattern, weight in patterns:
                if pattern in code_lower:
                    scores[lang] += weight
        
        # Special JSON detection
        if self._is_valid_json_structure(code_content):
            scores['json'] = 15
        
        # CSS structure detection (more reliable than keyword-based)
        if self._has_css_structure(code_content):
            scores['css'] += 10
        
        # Find language with highest score
        max_score = max(scores.values())
        if max_score >= 6:  # Minimum threshold
            detected_lang = max(scores, key=scores.get)
            return detected_lang
        
        return 'text'

    def _is_valid_json_structure(self, code_content):
        """Check if content has valid JSON structure"""
        stripped = code_content.strip()
        if (stripped.startswith('{') and stripped.endswith('}')) or \
        (stripped.startswith('[') and stripped.endswith(']')):
            try:
                import json
                json.loads(code_content)
                return True
            except:
                pass
        return False

    def _has_css_structure(self, code_content):
        """Check for CSS-like structure patterns"""
        # Look for CSS rule patterns: selector { property: value; }
        css_pattern = re.compile(r'[a-zA-Z0-9\-\.#\s]+\s*\{\s*[a-zA-Z\-]+\s*:\s*[^;]+;')
        return bool(css_pattern.search(code_content))

    def detect_language_from_content(self, code_content):
        """
        Updated version of the original detect_language_from_content function
        using the improved heuristics.
        """
        return self._detect_language_from_content_heuristics(code_content)

    def _get_display_language_name(self, language):
        """Get proper display name for language."""
        display_names = {
            'javascript': 'JAVASCRIPT',
            'typescript': 'TYPESCRIPT',
            'python': 'PYTHON',
            'html': 'HTML',
            'css': 'CSS',
            'json': 'JSON',
            'bash': 'BASH',
            'sql': 'SQL',
            'php': 'PHP',
            'java': 'JAVA',
            'cpp': 'C++',
            'csharp': 'C#',
            'go': 'GO',
            'rust': 'RUST',
            'swift': 'SWIFT',
            'kotlin': 'KOTLIN',
            'dart': 'DART',
            'ruby': 'RUBY',
            'markdown': 'MARKDOWN',
            'yaml': 'YAML',
            'xml': 'XML'
        }
        return display_names.get(language.lower(), language.upper())

    def _get_css_styles(self) -> str:
        """Enhanced CSS with improved button styling and animations"""
        return """
        /* Main Report Container */
        .ai-analysis-report {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.7;
            background-color: #1e1e1e;
            color: #d4d4d4;
            border: 1px solid #404040;
            border-radius: 12px;
            padding: 2rem;
            margin-top: 1rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        /* Section Headers */
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px;
            margin: 24px 0 16px 0;
            border-bottom: 2px solid #404040;
        }
        
        .section-emoji { 
            font-size: 1.6rem; 
            line-height: 1; 
        }
        
        .section-title { 
            margin: 0; 
            font-size: 1.4rem; 
            color: #ffffff; 
            font-weight: 600; 
        }

        /* Content Styling */
        .ai-content-body ul, .ai-content-body ol { 
            padding-left: 25px; 
        }
        
        .ai-content-body li { 
            margin-bottom: 0.8rem; 
        }
        
        .ai-content-body strong { 
            color: #ffffff; 
            font-weight: 600; 
        }
        
        .ai-content-body a { 
            color: #4e94ce; 
            text-decoration: none; 
        }
        
        .ai-content-body a:hover { 
            text-decoration: underline; 
        }

        /* Inline Code */
        .ai-content-body p code, .ai-content-body li code {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            color: #ce9178;
            background-color: rgba(110, 118, 129, 0.2);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
            border: 1px solid rgba(110, 118, 129, 0.3);
        }

        /* Code Block Container */
        .code-block-container {
            border-radius: 12px;
            overflow: hidden;
            margin: 2rem 0;
            border: 1px solid #404040;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            background: #2d2d2d;
        }

        /* Code Header - macOS Style */
        .code-header {
            background: linear-gradient(180deg, #3c3c3c 0%, #2d2d2d 100%);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid #404040;
            position: relative;
        }

        /* macOS Window Controls */
        .header-dots {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            transition: opacity 0.2s ease;
        }

        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27c93f; }

        .code-header:hover .dot {
            opacity: 1;
        }

        /* Language Label */
        .code-language {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            color: #a0a0a0;
            font-weight: 600;
            font-size: 0.75rem;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        /* Header Buttons */
        .header-buttons {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .copy-btn, .run-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .copy-btn {
            background-color: #0066cc;
            color: white;
        }

        .copy-btn:hover {
            background-color: #0052a3;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
        }

        .run-btn {
            background-color: #28a745;
            color: white;
        }

        .run-btn:hover {
            background-color: #218838;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .run-btn:active, .copy-btn:active {
            transform: translateY(0);
        }

        .copy-btn.copied {
            background-color: #28a745;
        }

        .run-btn.running {
            background-color: #ffc107;
            color: #212529;
        }

        .btn-icon {
            line-height: 1;
            font-size: 0.9em;
            transition: transform 0.2s ease;
        }

        .run-btn:hover .btn-icon {
            transform: scale(1.1);
        }

        .btn-text {
            font-weight: 500;
        }

        /* Code Content */
        pre {
            background: #1e1e1e !important;
            color: #d4d4d4 !important;
            margin: 0 !important;
            padding: 1.5rem !important;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            overflow-x: auto;
        }

        /* Code syntax highlighting preservation */
        pre code {
            font-family: inherit !important;
            color: inherit !important;
            background-color: transparent !important;
            padding: 0 !important;
            font-size: inherit !important;
            border: none !important;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .ai-analysis-report {
                padding: 1.5rem;
            }
            
            .code-header {
                padding: 10px 12px;
            }
            
            .header-buttons {
                gap: 6px;
            }
            
            .copy-btn, .run-btn {
                padding: 5px 10px;
                font-size: 0.75rem;
            }
            
            .code-language {
                font-size: 0.7rem;
            }
            
            pre {
                padding: 1rem !important;
                font-size: 13px !important;
            }
        }
        """

    # The _get_copy_script method has been removed as it's no longer needed.