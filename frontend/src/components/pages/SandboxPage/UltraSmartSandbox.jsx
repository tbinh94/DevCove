import React, { useState, useRef, useEffect } from 'react';
import apiService from '../../../services/api';
// CSS cho phiên bản nâng cấp
const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #444',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '1200px',
    margin: '20px auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#2d2d2d',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'row',
    height: '500px',
  },
  editorWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #444',
  },
  header: {
    backgroundColor: '#3a3a3a',
    padding: '10px 15px',
    borderBottom: '1px solid #444',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#e0e0e0',
  },
  runButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
  },
  codeTypeIndicator: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginLeft: '10px',
  },
  textarea: {
    flex: 1,
    border: 'none',
    padding: '15px',
    fontSize: '14px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    resize: 'none',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    lineHeight: '1.5',
  },
  previewWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  iframe: {
    flex: 1,
    border: 'none',
    backgroundColor: 'white',
  },
  output: {
    height: '180px',
    backgroundColor: '#1e1e1e',
    color: '#ccc',
    padding: '15px',
    fontSize: '13px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowY: 'auto',
    borderTop: '1px solid #444',
  },
  error: {
    color: '#ff6b6b',
  },
  warning: {
    color: '#ffa726',
  },
  success: {
    color: '#66bb6a',
  },
  info: {
    color: '#29b6f6',
  },
  errorStack: {
    color: '#c98282',
    paddingLeft: '15px',
    fontSize: '11px',
    opacity: 0.8,
  },
};

// Lớp phân tích code siêu thông minh
class UltraCodeAnalyzer {
  static analyzeCode(code) {
    const patterns = {
      // HTML/XML patterns
      htmlDocument: /<!DOCTYPE\s+html|<html[\s>]/i,
      htmlTags: /<\/?\w+[^>]*>/,
      htmlComplete: /<html[\s>].*<\/html>/is,
      
      // CSS patterns  
      cssRules: /[.#]?[\w-]+\s*\{[^}]*\}/,
      cssInline: /style\s*=\s*["'][^"']*["']/,
      cssImport: /@import|@media|@keyframes/,
      
      // JavaScript patterns
      scriptTags: /<script[\s>].*?<\/script>/is,
      jsInline: /on\w+\s*=\s*["'][^"']*["']/,
      
      // ES6+ Module syntax
      esModule: /^\s*(import|export)\s/m,
      
      // Top-level await
      topLevelAwait: /(?:^|\n)\s*await\s+(?!.*(?:function|=>|\{))/m,
      
      // Async/await functions
      asyncFunction: /async\s+function|=\s*async\s*\(|=>\s*async|async\s*\(/,
      
      // Promise usage
      promises: /new\s+Promise|\.then\s*\(|\.catch\s*\(|Promise\.(all|race|resolve|reject)/,
      
      // DOM manipulation
      domManipulation: /document\.|getElementById|querySelector|addEventListener|createElement/,
      
      // Class definitions
      classes: /class\s+\w+|\bextends\b/,
      
      // Modern JS features
      destructuring: /\{[^}]*\}\s*=|\[[^\]]*\]\s*=/,
      spreadOperator: /\.{3}\w+/,
      templateLiterals: /`[^`]*\${[^}]*}[^`]*`/,
      arrowFunctions: /=>\s*[{(]?/,
      
      // React/JSX (but not HTML)
      reactJsx: /React\.|useState|useEffect|jsx|import.*react/i,
      jsxElements: /<[A-Z]\w*[^>]*>/,
      
      // Framework patterns
      vue: /new\s+Vue|@click|v-if|v-for/,
      angular: /ng-|angular\.|@Component/,
      
      // API calls
      apiCalls: /fetch\s*\(|axios\.|XMLHttpRequest|$.ajax/,
      
      // JSON operations
      jsonOps: /JSON\.(parse|stringify)/,
      
      // Canvas/WebGL
      canvas: /getContext\s*\(\s*['"]2d['"]|['"]webgl['"]|CanvasRenderingContext/,
      
      // Web APIs
      webAPIs: /navigator\.|location\.|history\.|localStorage|sessionStorage/,
      
      // Animation
      animation: /requestAnimationFrame|setInterval|setTimeout.*\d+/,
    };

    const features = {};
    let executionStrategy = 'sync';
    let complexity = 'basic';
    let codeType = 'javascript';

    // Phân tích từng pattern
    for (const [feature, pattern] of Object.entries(patterns)) {
      features[feature] = pattern.test(code);
    }

    // Xác định loại code chính
    if (features.htmlDocument || features.htmlComplete) {
      codeType = 'html_document';
      executionStrategy = 'html_full';
      complexity = 'intermediate';
    } else if (features.htmlTags && features.cssRules) {
      codeType = 'html_mixed';
      executionStrategy = 'html_mixed';
      complexity = 'intermediate';
    } else if (features.htmlTags) {
      codeType = 'html_fragment';
      executionStrategy = 'html_fragment';
      complexity = 'basic';
    } else if (features.cssRules && !features.htmlTags) {
      codeType = 'css_only';
      executionStrategy = 'css_inject';
      complexity = 'basic';
    } else if (features.reactJsx && features.jsxElements) {
      codeType = 'react_jsx';
      executionStrategy = 'react';
      complexity = 'advanced';
    } else if (features.esModule || features.topLevelAwait) {
      codeType = 'es_module';
      executionStrategy = 'module';
      complexity = 'advanced';
    } else if (features.asyncFunction || features.promises || features.apiCalls) {
      codeType = 'async_js';
      executionStrategy = 'async';
      complexity = 'intermediate';
    } else if (features.domManipulation || features.classes) {
      codeType = 'dom_js';
      executionStrategy = 'dom';
      complexity = 'intermediate';
    } else if (features.canvas) {
      codeType = 'canvas_js';
      executionStrategy = 'canvas';
      complexity = 'advanced';
    }

    // Tính điểm phức tạp
    const complexityScore = Object.values(features).filter(Boolean).length;
    if (complexityScore > 12) complexity = 'expert';
    else if (complexityScore > 8) complexity = 'advanced';
    else if (complexityScore > 4) complexity = 'intermediate';

    return {
      features,
      executionStrategy,
      complexity,
      codeType,
      score: complexityScore,
      recommendations: this.getRecommendations(features, codeType)
    };
  }

  static getRecommendations(features, codeType) {
    const recommendations = [];
    
    if (codeType === 'html_fragment' && !features.cssRules) {
      recommendations.push('Consider adding CSS styles for better presentation');
    }
    
    if (features.htmlTags && features.jsInline) {
      recommendations.push('Consider moving inline JS to <script> tags');
    }
    
    if (features.scriptTags && features.asyncFunction && !features.topLevelAwait) {
      recommendations.push('Async functions detected - ensure proper error handling');
    }
    
    if (features.domManipulation && codeType.includes('html')) {
      recommendations.push('DOM manipulation detected - ensure elements exist');
    }
    
    if (features.apiCalls && !features.promises) {
      recommendations.push('API calls should include error handling');
    }

    if (features.canvas && !features.animation) {
      recommendations.push('Canvas detected - consider adding animations');
    }

    return recommendations;
  }

  static getTypeLabel(analysis) {
    const { features, complexity, codeType } = analysis;
    
    if (codeType === 'html_document') return { label: 'HTML Document', color: '#e67e22' };
    if (codeType === 'html_mixed') return { label: 'HTML+CSS+JS', color: '#e74c3c' };
    if (codeType === 'html_fragment') return { label: 'HTML Fragment', color: '#f39c12' };
    if (codeType === 'css_only') return { label: 'CSS Styles', color: '#3498db' };
    if (codeType === 'react_jsx') return { label: 'React/JSX', color: '#61dafb' };
    if (codeType === 'es_module') return { label: 'ES Module', color: '#e74c3c' };
    if (codeType === 'canvas_js') return { label: 'Canvas/Graphics', color: '#9b59b6' };
    if (features.vue) return { label: 'Vue.js', color: '#4fc08d' };
    if (features.angular) return { label: 'Angular', color: '#dd0031' };
    if (features.asyncFunction || features.promises) return { label: 'Async/Promise', color: '#f39c12' };
    if (features.classes) return { label: 'ES6 Classes', color: '#9b59b6' };
    if (features.domManipulation) return { label: 'DOM Script', color: '#3498db' };
    if (features.webAPIs) return { label: 'Web APIs', color: '#16a085' };
    if (complexity === 'advanced') return { label: 'Modern JS', color: '#2ecc71' };
    
    return { label: 'Basic JS', color: '#95a5a6' };
  }

  static extractParts(code, codeType) {
    let html = '';
    let css = '';
    let js = '';

    if (codeType === 'html_document' || codeType === 'html_mixed') {
      // Extract full HTML
      html = code;
    } else if (codeType === 'html_fragment') {
      // Wrap fragment in basic HTML
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Preview</title>
</head>
<body>
  ${code}
</body>
</html>`;
    } else if (codeType === 'css_only') {
      // CSS only - create basic HTML with styles
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Preview</title>
  <style>
    ${code}
  </style>
</head>
<body>
  <div id="root">
    <h2>CSS Styles Applied</h2>
    <p>Your CSS styles are loaded and ready!</p>
    <div class="demo-content">
      <button>Sample Button</button>
      <div class="box">Sample Box</div>
    </div>
  </div>
</body>
</html>`;
    } else {
      // JavaScript only - create HTML with script
      js = code;
    }

    return { html, css, js };
  }
}

const UltraSmartSandbox = () => {
  const [code, setCode] = useState(`// Paste your code here or click "Run in Sandbox" from a post!`); // Cập nhật placeholder

  
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const iframeRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [fixingRecommendation, setFixingRecommendation] = useState(null);

  const handleApplyAiFix = async (recommendation) => {
    if (fixingRecommendation) return;

    setFixingRecommendation(recommendation);
    setOutput(prev => [...prev, {
      type: 'info',
      message: `🤖 Sending code to AI for fix: "${recommendation}"...`
    }]);

    try {
      const response = await apiService.getAiCodeFix(code, recommendation);
      const parser = new DOMParser();
      const doc = parser.parseFromString(response, 'text/html');
      const codeElement = doc.querySelector('code');

      if (codeElement) {
        const fixedCode = codeElement.textContent;
        setCode(fixedCode); 
        setOutput(prev => [...prev, {
          type: 'success',
          message: '✅ AI applied the fix successfully!'
        }]);
      } else {
        setCode(response);
        setOutput(prev => [...prev, {
          type: 'success',
          message: '✅ AI applied the fix successfully! (raw response)'
        }]);
      }

    } catch (error) {
      console.error("AI fix failed:", error);
      setOutput(prev => [...prev, {
        type: 'error',
        message: `❌ AI fix failed: ${error.message || 'Unknown error'}`
      }]);
    } finally {
      setFixingRecommendation(null);
    }
};

  // >>>>> START: THAY ĐỔI CHÍNH <<<<<
  // useEffect để nhận code từ sessionStorage và tự động chạy
  // useEffect để nhận code từ sessionStorage và tự động chạy - CẢI THIỆN
  useEffect(() => {
    const codeFromStorage = sessionStorage.getItem('sandbox_code');
    const languageFromStorage = sessionStorage.getItem('sandbox_code_language');

    if (codeFromStorage) {
      // 1. Cập nhật code trong editor
      setCode(codeFromStorage);
      
      // 2. Xóa items khỏi storage để không chạy lại khi refresh
      sessionStorage.removeItem('sandbox_code');
      sessionStorage.removeItem('sandbox_code_language');
      
      // 3. Hiển thị thông tin về code được import
      const language = languageFromStorage || 'unknown';
      setOutput([{ 
        type: 'info', 
        message: `🚀 Code imported from post (${language.toUpperCase()}). Auto-running...` 
      }]);
      
      setTimeout(() => {
        // Auto-run imported code
        if (iframeRef.current) {
          setHasError(false);
          setOutput(prev => [...prev, { 
            type: 'info', 
            message: '🔄 Analyzing imported code and preparing execution...' 
          }]);
          setIsRunning(true);
          
          const analysis = UltraCodeAnalyzer.analyzeCode(codeFromStorage);
          const srcDoc = createUltraSmartIframeSrcDoc(analysis);
          iframeRef.current.srcdoc = srcDoc;
          
          if (analysis.codeType.includes('html') || analysis.codeType === 'css_only') {
            setTimeout(() => setIsRunning(false), 500);
          } else {
            iframeRef.current.onload = () => {
              setTimeout(() => {
                iframeRef.current.contentWindow.postMessage({
                  code: codeFromStorage,
                  strategy: analysis.executionStrategy
                }, '*');
              }, 100);
            };
          }
        }
      }, 300); // Slightly longer delay for better UX
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy một lần khi component mount

  // useEffect để phân tích code khi nó thay đổi
  useEffect(() => {
    if (code.trim()) {
      const analysis = UltraCodeAnalyzer.analyzeCode(code);
      setCodeAnalysis(analysis);
    }
  }, [code]);

  /**
   * Tạo HTML thông minh cho iframe
   */
  const createUltraSmartIframeSrcDoc = (analysis) => {
    const { codeType, executionStrategy } = analysis;
    const { html, css, js } = UltraCodeAnalyzer.extractParts(code, codeType);

    if (html && (codeType === 'html_document' || codeType === 'html_mixed' || codeType === 'html_fragment')) {
      return html.replace(
        '</head>',
        `
  <script>
    const logs = [];
    const originalMethods = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    const createLogHandler = (type, originalMethod) => (...args) => {
      const formattedArgs = args.map(arg => {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
        if (typeof arg === 'symbol') return arg.toString();
        if (typeof arg === 'bigint') return arg.toString() + 'n';
        if (arg instanceof Date) return arg.toISOString();
        if (arg instanceof RegExp) return arg.toString();
        if (arg instanceof Error) return \`\${arg.name}: \${arg.message}\`;
        if (typeof arg === 'object') {
          try {
            if (Array.isArray(arg)) {
              return '[' + arg.map(item => typeof item === 'object' && item !== null ? '[Object]' : String(item)).join(', ') + ']';
            }
            return JSON.stringify(arg, (key, value) => {
              if (typeof value === 'function') return '[Function]';
              return value;
            }, 2);
          } catch (e) { return '[Object (circular reference)]'; }
        }
        return String(arg);
      });
      
      // >> GIẢI PHÁP TỐI ƯU HÓA: KIỂM TRA NaN VÀ CHUỖI CHỨA 'NaN' <<
      let hasRuntimeIssue = false;
      for (const arg of args) {
        if (Number.isNaN(arg)) { // Check for the actual NaN value
          hasRuntimeIssue = true;
          break;
        }
        if (typeof arg === 'string' && arg.includes('NaN')) { // Check for strings containing 'NaN'
          hasRuntimeIssue = true;
          break;
        }
      }

      if (hasRuntimeIssue) {
        logs.push({
          type: 'error',
          message: 'Potential logic error detected: The result is NaN (Not a Number).',
          timestamp: Date.now()
        });
      }
      // =====================================================================
      
      logs.push({ 
        type, 
        message: formattedArgs.join(' '),
        timestamp: Date.now()
      });

      originalMethod.apply(console, args);
    };

    console.log = createLogHandler('log', originalMethods.log);
    console.error = createLogHandler('error', originalMethods.error);
    console.warn = createLogHandler('warning', originalMethods.warn);
    console.info = createLogHandler('info', originalMethods.info);

    window.addEventListener('error', (event) => {
      logs.push({ type: 'error', message: event.error?.message || event.message || 'Runtime Error', stack: event.error?.stack, filename: event.filename, lineno: event.lineno, colno: event.colno, timestamp: Date.now() });
    });
    window.addEventListener('unhandledrejection', (event) => {
      logs.push({ type: 'error', message: 'Promise Rejection: ' + (event.reason?.message || event.reason || 'Unknown'), stack: event.reason?.stack, timestamp: Date.now() });
    });

    setInterval(() => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); }, 500);
    window.parent.postMessage({ type: 'ready' }, '*');
  </script>
</head>`
      );
    }

    if (codeType === 'css_only') return html;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JavaScript Sandbox</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 10px; background: #f8f9fa; }
    #root { padding: 20px; min-height: 90vh; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .error-display { background: #ffe6e6; border: 1px solid #ff9999; color: #cc0000; padding: 15px; border-radius: 5px; margin: 10px 0; font-family: monospace; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    const logs = [];
    const originalMethods = { log: console.log, error: console.error, warn: console.warn, info: console.info };
    
    const createLogHandler = (type, originalMethod) => (...args) => {
      const formattedArgs = args.map(arg => {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg, null, 2); } catch (e) { return '[Object]'; }
        }
        return String(arg);
      });

      // >> GIẢI PHÁP TỐI ƯU HÓA: KIỂM TRA NaN VÀ CHUỖI CHỨA 'NaN' <<
      let hasRuntimeIssue = false;
      for (const arg of args) {
        if (Number.isNaN(arg)) { // Check for the actual NaN value
          hasRuntimeIssue = true;
          break;
        }
        if (typeof arg === 'string' && arg.includes('NaN')) { // Check for strings containing 'NaN'
          hasRuntimeIssue = true;
          break;
        }
      }

      if (hasRuntimeIssue) {
        logs.push({
          type: 'error',
          message: 'Potential logic error detected: The result is NaN (Not a Number).',
          timestamp: Date.now()
        });
      }
      // =====================================================================
      
      logs.push({ type, message: formattedArgs.join(' '), timestamp: Date.now() });
      originalMethod.apply(console, args);
    };

    console.log = createLogHandler('log', originalMethods.log);
    console.error = createLogHandler('error', originalMethods.error);
    console.warn = createLogHandler('warning', originalMethods.warn);
    console.info = createLogHandler('info', originalMethods.info);

    window.addEventListener('error', (event) => {
      const errorInfo = { type: 'error', message: event.error?.message || event.message || 'Runtime Error', stack: event.error?.stack, lineno: event.lineno, timestamp: Date.now() };
      logs.push(errorInfo);
      const root = document.getElementById('root');
      if (root && !root.querySelector('.error-display')) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-display';
        errorDiv.innerHTML = \`<strong>❌ Runtime Error:</strong><br>\${errorInfo.message}<br><small>Line \${errorInfo.lineno || 'unknown'}</small>\`;
        root.appendChild(errorDiv);
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const errorInfo = { type: 'error', message: 'Promise Rejection: ' + (event.reason?.message || event.reason || 'Unknown'), stack: event.reason?.stack, timestamp: Date.now() };
      logs.push(errorInfo);
    });

    window.addEventListener('message', async (event) => {
      if (!event.data?.code) return;
      const { code: userCode, strategy } = event.data;
      logs.length = 0;
      logs.push({ type: 'info', message: \`🚀 Executing \${strategy} code...\`, timestamp: Date.now() });
      try {
        const root = document.getElementById('root');
        if (root) root.innerHTML = '';
        if (strategy === 'module' || (userCode.includes('await') && !userCode.match(/^\\s*(?:async\\s+)?function/))) {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          await new AsyncFunction(userCode)();
        } else {
          eval(userCode);
        }
        logs.push({ type: 'success', message: '✅ Code executed successfully', timestamp: Date.now() });
      } catch (error) {
        logs.push({ type: 'error', message: \`\${error.name || 'Error'}: \${error.message}\`, stack: error.stack, timestamp: Date.now() });
      } finally {
        event.source.postMessage(logs, event.origin);
      }
    });
    
    setInterval(() => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); }, 500);
    window.parent.postMessage({ type: 'ready' }, '*');
  </script>
</body>
</html>`;
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source === iframeRef.current?.contentWindow) {
        if (event.data?.type === 'ready') return;
        if (Array.isArray(event.data)) {
          if (event.data.some(log => log.type === 'error')) {
            setHasError(true);
          }
          setOutput(prev => [...prev, ...event.data]);
        }
        setIsRunning(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRunCode = () => {
    if (iframeRef.current && !isRunning && code.trim()) {
      setHasError(false);
      setOutput([{ type: 'info', message: '🔄 Analyzing code and preparing execution...' }]);
      setIsRunning(true);
      
      const analysis = UltraCodeAnalyzer.analyzeCode(code);
      const srcDoc = createUltraSmartIframeSrcDoc(analysis);
      iframeRef.current.srcdoc = srcDoc;
      
      if (analysis.codeType.includes('html') || analysis.codeType === 'css_only') {
        setTimeout(() => setIsRunning(false), 500);
      } else {
        iframeRef.current.onload = () => {
          setTimeout(() => {
            iframeRef.current.contentWindow.postMessage({
              code: code,
              strategy: analysis.executionStrategy
            }, '*');
          }, 100);
        };
      }
    }
  };

  const handleClear = () => {
    setHasError(false);
    setOutput([]);
    if (iframeRef.current) {
      const analysis = codeAnalysis || { codeType: 'javascript', executionStrategy: 'sync' };
      const srcDoc = createUltraSmartIframeSrcDoc(analysis);
      iframeRef.current.srcdoc = srcDoc;
    }
  };

  const handleCodeChange = (e) => {
    setHasError(false);
    setCode(e.target.value);
  }
  
  const getLogStyle = (type) => {
    switch (type) {
      case 'error': return styles.error;
      case 'warning': return styles.warning;
      case 'info': return styles.info;
      case 'success': return styles.success;
      default: return {};
    }
  };

  const typeInfo = codeAnalysis ? UltraCodeAnalyzer.getTypeLabel(codeAnalysis) : { label: 'Unknown', color: '#95a5a6' };

  const templates = {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Interactive Page</title>
  <style> 
    body { 
      font-family: Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 10px;
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello from Sandbox! 🚀</h1>
    <button onclick="alert('Button clicked!')">Click me!</button>
  </div>
</body>
</html>`,
    css: `.card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
  color: white;
}

.button { 
  background: #007bff; 
  color: white; 
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:hover {
  background: #0056b3;
  transform: translateY(-2px);
}`,
    js: `// Modern JavaScript Demo with AI-enhanced features
console.log('🚀 Starting interactive demo...');

// Create dynamic content
const root = document.getElementById('root');
if (root) {
  root.innerHTML = \`
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333;">🎯 Interactive JavaScript Demo</h2>
      <div id="counter-display" style="font-size: 2em; margin: 20px 0;">Count: 0</div>
      <button id="increment-btn" style="padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Increment ➕
      </button>
      <button id="reset-btn" style="padding: 10px 20px; margin: 5px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Reset 🔄
      </button>
      <div id="log" style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-family: monospace;"></div>
    </div>
  \`;

  // Interactive counter logic
  let count = 0;
  const display = document.getElementById('counter-display');
  const logDiv = document.getElementById('log');
  
  const updateDisplay = () => {
    display.textContent = \`Count: \${count}\`;
    logDiv.innerHTML += \`<div>[\${new Date().toLocaleTimeString()}] Count updated to: \${count}</div>\`;
    logDiv.scrollTop = logDiv.scrollHeight;
  };

  document.getElementById('increment-btn').onclick = () => {
    count++;
    updateDisplay();
    console.log(\`✅ Count incremented to: \${count}\`);
  };

  document.getElementById('reset-btn').onclick = () => {
    count = 0;
    updateDisplay();
    logDiv.innerHTML = '<div>Log cleared and counter reset! 🔄</div>';
    console.log('🔄 Counter reset to 0');
  };
}

console.log('✅ Interactive demo ready! Try the buttons above.');`
  };

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Code Editor */}
        <div style={styles.editorWrapper}>
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>🌟 Ultra Smart Sandbox</span>
              <div style={{...styles.codeTypeIndicator, backgroundColor: typeInfo.color}}>
                {typeInfo.label}
              </div>
              {codeAnalysis && (
                <div style={{...styles.codeTypeIndicator, backgroundColor: '#6c757d', marginLeft: '5px'}}>
                  Score: {codeAnalysis.score}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select 
                onChange={(e) => { setCode(templates[e.target.value] || ''); e.target.value = ''; }}
                style={{ backgroundColor: '#4a4a4a', color: 'white', border: '1px solid #666', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', marginRight: '8px' }}
              >
                <option value="">📋 Quick Templates</option>
                <option value="html">🌐 Interactive HTML</option>
                <option value="css">🎨 Modern CSS</option>
                <option value="js">⚡ Interactive JS</option>
              </select>
              <button onClick={handleRunCode} style={{ ...styles.runButton, opacity: isRunning ? 0.6 : 1 }} disabled={isRunning}>
                {isRunning ? '⏳ Processing...' : '🚀 Ultra Run'}
              </button>
              <button onClick={handleClear} style={styles.clearButton}>🗑 Clear</button>
            </div>
          </div>
          
          <textarea
            value={code}
            onChange={handleCodeChange}
            style={styles.textarea}
            placeholder="// Paste your HTML, CSS, or JS code here. The sandbox will auto-detect and run it! 🚀
// Or click 'Run in Sandbox' from any code block in posts!"
          />
        </div>
        
        {/* Preview Panel */}
        <div style={styles.previewWrapper}>
          <div style={styles.header}>
            <span>📱 Live Preview</span>
          </div>
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts allow-same-origin"
            style={styles.iframe}
            title="Ultra Smart Sandbox Preview"
          />
        </div>
      </div>
      
      {/* Console Output - Enhanced error handling */}
      <div style={styles.output}>
        {hasError && (
          <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#4d2a2a', borderRadius: '4px' }}>
            <div style={{ color: '#ff8a80', fontSize: '12px', fontWeight: 'bold' }}>
              ⚠️ Code execution error detected.
            </div>
            <div style={{ color: '#ffc1b8', fontSize: '11px', marginLeft: '15px', display: 'flex', alignItems: 'center' }}>
              <span>Would you like AI to help fix this error?</span>
              <button
                style={{ 
                  opacity: fixingRecommendation ? 0.5 : 1, 
                  cursor: fixingRecommendation ? 'not-allowed' : 'pointer', 
                  marginLeft: '10px', 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  padding: '4px 8px', 
                  borderRadius: '4px' 
                }}
                onClick={() => handleApplyAiFix("Find and fix the errors in this code so it can run successfully.")}
                disabled={!!fixingRecommendation}
              >
                {fixingRecommendation ? '⏳ Fixing...' : '🪄 AI Fix Code'}
              </button>
            </div>
          </div>
        )}
        
        {output.length > 0 ? (
          output.map((line, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <span style={getLogStyle(line.type)}>
                {line.type === 'error' ? '❌' : 
                 line.type === 'warning' ? '⚠️' : 
                 line.type === 'info' ? 'ℹ️' : 
                 line.type === 'success' ? '✅' : '▶'} {line.message}
              </span>
              {line.stack && ( 
                <div style={styles.errorStack}>
                  {line.stack.split('\n').slice(0, 4).join('\n')}
                </div> 
              )}
            </div>
          ))
        ) : (
          <div style={{ color: '#888' }}>
            Console output, errors, and smart tips will appear here...
            <br />
            <small style={{ color: '#666' }}>💡 Try running some code or import from a post!</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default UltraSmartSandbox;