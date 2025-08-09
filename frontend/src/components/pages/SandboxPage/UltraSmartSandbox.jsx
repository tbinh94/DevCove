import React, { useState, useRef, useEffect } from 'react';

// Sử dụng API service thật
import apiService from '../../../services/api';

// Component hiển thị sự khác biệt của AI
const AiDiffViewer = ({ diff }) => {
    const diffStyles = {
        container: {
            fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            marginTop: '12px',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            borderLeft: '4px solid #00d4ff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        line: {
            display: 'block',
            minHeight: '1.4em',
            padding: '2px 0',
        },
        added: {
            backgroundColor: 'rgba(46, 164, 79, 0.2)',
            color: '#4ade80',
            borderRadius: '4px',
            padding: '2px 4px',
            margin: '1px 0',
        },
        removed: {
            backgroundColor: 'rgba(248, 81, 73, 0.2)',
            color: '#f87171',
            borderRadius: '4px',
            padding: '2px 4px',
            margin: '1px 0',
        },
    };

    return (
        <div style={diffStyles.container}>
            {diff.split('\n').map((line, index) => {
                let style = diffStyles.line;
                if (line.startsWith('+ ')) {
                    style = { ...style, ...diffStyles.added };
                } else if (line.startsWith('- ')) {
                    style = { ...style, ...diffStyles.removed };
                }
                return (
                    <span key={index} style={style}>
                        {line || ' '}
                    </span>
                );
            })}
        </div>
    );
};

// Modern CSS styles
const styles = {
  container: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1400px',
    margin: '20px auto',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'row',
    height: '600px',
  },
  editorWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'linear-gradient(180deg, #1e293b 0%, #111827 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#f8fafc',
    backdropFilter: 'blur(10px)',
  },
  runButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginRight: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  clearButton: {
    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginRight: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px 0 rgba(107, 114, 128, 0.39)',
  },
  templateSelect: {
    background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginRight: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },
  codeTypeIndicator: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    marginLeft: '12px',
    boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  textarea: {
    flex: 1,
    border: 'none',
    padding: '20px',
    fontSize: '14px',
    fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
    resize: 'none',
    boxSizing: 'border-box',
    outline: 'none',
    background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
    color: '#e2e8f0',
    lineHeight: '1.6',
    letterSpacing: '0.025em',
  },
  previewWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #1e293b 0%, #111827 100%)',
  },
  iframe: {
    flex: 1,
    border: 'none',
    backgroundColor: 'white',
    borderRadius: '0 0 8px 0',
  },
  output: {
    height: '200px',
    background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
    color: '#cbd5e1',
    padding: '20px',
    fontSize: '13px',
    fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowY: 'auto',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
  },
  error: { color: '#f87171', textShadow: '0 0 10px rgba(248, 113, 113, 0.3)' },
  warning: { color: '#fbbf24', textShadow: '0 0 10px rgba(251, 191, 36, 0.3)' },
  success: { color: '#4ade80', textShadow: '0 0 10px rgba(74, 222, 128, 0.3)' },
  info: { color: '#60a5fa', textShadow: '0 0 10px rgba(96, 165, 250, 0.3)' },
  errorStack: {
    color: '#f87171',
    paddingLeft: '15px',
    fontSize: '11px',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  brandTitle: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: '16px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  libraryBadge: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    marginLeft: '8px',
    boxShadow: '0 2px 8px 0 rgba(245, 158, 11, 0.39)',
  },
  errorBox: {
    marginBottom: '16px',
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  aiFixButton: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.39)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  applyFixButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
    marginTop: '12px',
  },
};

// Lớp phân tích code (giữ nguyên logic)
class UltraCodeAnalyzer {
    static analyzeCode(code) {
        const pythonPatterns = {
            comment: /^\s*#/m,
            print: /^\s*print\s*\(/m,
            def: /^\s*def\s+.*:/m,
            class: /^\s*class\s+.*:/m,
            imports: /^\s*(from|import)\s/m,
            libraries: /import\s+(numpy|pandas|matplotlib|requests|scipy|scikit-learn)\b/m,
        };
        let isPython = Object.values(pythonPatterns).some(pattern => pattern.test(code));
        let executionStrategy = 'sync', complexity = 'basic', codeType = 'javascript', features = {};
        if (isPython) {
            codeType = 'python';
            executionStrategy = 'python_pyodide';
            features.hasLibraries = pythonPatterns.libraries.test(code);
            features.libraryList = (code.match(/import\s+(numpy|pandas|matplotlib|requests|scipy|scikit-learn)\b/g) || [])
                .map(m => m.replace('import ', ''));
        } else {
            const jsPatterns = {
                htmlDocument: /<!DOCTYPE\s+html|<html[\s>]/i,
                htmlTags: /<\/?\w+[^>]*>/,
                cssRules: /[.#]?[\w-]+\s*\{[^}]*\}/,
                esModule: /^\s*(import|export)\s/m,
                topLevelAwait: /(?:^|\n)\s*await\s+(?!.*(?:function|=>|\{))/m,
                asyncFunction: /async\s+function|=\s*async\s*\(|=>\s*async|async\s*\(/,
                domManipulation: /document\.|getElementById|querySelector|addEventListener|createElement/,
                reactJsx: /React\.|useState|useEffect|jsx|import.*react/i,
            };
            for (const [feature, pattern] of Object.entries(jsPatterns)) {
                features[feature] = pattern.test(code);
            }
            if (features.htmlDocument) codeType = 'html_document';
            else if (features.htmlTags) codeType = 'html_fragment';
            else if (features.cssRules && !features.htmlTags) codeType = 'css_only';
            else if (features.reactJsx) codeType = 'react_jsx';
            else if (features.esModule || features.topLevelAwait) codeType = 'es_module';
            else if (features.asyncFunction) codeType = 'async_js';
            else if (features.domManipulation) codeType = 'dom_js';
        }
        return { features, executionStrategy, complexity, codeType };
    }
    
    static getTypeLabel(analysis) {
        const { features, codeType } = analysis;
        if (codeType === 'python') {
            const libCount = features.libraryList?.length || 0;
            return { 
                label: libCount > 0 ? `🐍 Python + ${libCount} libs` : '🐍 Python (Pyodide)', 
                color: features.hasLibraries ? '#f59e0b' : '#3b82f6' 
            };
        }
        if (codeType === 'html_document') return { label: '🌐 HTML Document', color: '#f97316' };
        if (codeType === 'css_only') return { label: '🎨 CSS Styles', color: '#06b6d4' };
        if (codeType === 'react_jsx') return { label: '⚛️ React/JSX', color: '#06b6d4' };
        if (features.asyncFunction) return { label: '⚡ Async JS', color: '#f59e0b' };
        if (features.domManipulation) return { label: '🔧 DOM Script', color: '#06b6d4' };
        if (codeType === 'es_module') return { label: '📦 ES Module', color: '#eab308' };
        return { label: '⚡ JavaScript', color: '#eab308' };
    }
}

const UltraSmartSandbox = () => {
    const [code, setCode] = useState(`// Welcome to Ultra Smart Sandbox! 🚀
// Paste your code here or select a template

console.log("Hello, World! 🌍");

// Try some interactive code:
const greeting = "Welcome to the future of coding!";
console.log(greeting);

// This sandbox supports:
// ✨ HTML, CSS, JavaScript
// 🐍 Python with libraries (numpy, pandas, matplotlib)
// 🎯 Real-time preview
// 🤖 AI-powered error fixing`);
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [codeAnalysis, setCodeAnalysis] = useState(null);
    const iframeRef = useRef(null);
    const [hasError, setHasError] = useState(false);
    const [fixingRecommendation, setFixingRecommendation] = useState(null);
    const codeToRun = useRef(null);
    const [lastError, setLastError] = useState(null);
    const [proposedFix, setProposedFix] = useState(null);

    const handleApplyAiFix = async () => {
        if (!lastError) return;
        
        const originalCode = code;
        const detailedPrompt = `Error: ${lastError.message}${lastError.stack ? `\nStack: ${lastError.stack}` : ''}\n\nFix this code:`;
        
        setFixingRecommendation(detailedPrompt);
        setOutput(prev => [...prev, { type: 'info', message: `🤖 AI is analyzing the error...` }]);
        
        try {
            const response = await apiService.getAiCodeFix(originalCode, detailedPrompt);
            const fixedCodeRaw = response.fixed_code || response;
            
            const markdownMatch = fixedCodeRaw.match(/```(?:python|javascript|html|css)?\s*\n([\s\S]*?)\n?```/);
            const fixedCode = markdownMatch && markdownMatch[1] ? markdownMatch[1].trim() : fixedCodeRaw.trim();
            
            const originalLines = new Set(originalCode.split('\n'));
            const fixedLines = new Set(fixedCode.split('\n'));
            
            const removedLines = [...originalCode.split('\n')].filter(line => !fixedLines.has(line));
            const addedLines = [...fixedCode.split('\n')].filter(line => !originalLines.has(line));

            if (addedLines.length > 0 || removedLines.length > 0) {
                const diffText = [
                    ...removedLines.map(line => `- ${line}`),
                    ...addedLines.map(line => `+ ${line}`)
                ].join('\n');
                const diffOutput = { type: 'ai_diff', content: diffText, message: '🤖 AI has suggested the following changes:' };
                setOutput(prev => [...prev, diffOutput]);
                setProposedFix(fixedCode);
            } else {
                setOutput(prev => [...prev, { type: 'info', message: 'ℹ️ AI analyzed the code but found no specific lines to change.' }]);
            }

        } catch (error) {
            setOutput(prev => [...prev, { type: 'error', message: `❌ AI fix failed: ${error.message}` }]);
        } finally {
            setFixingRecommendation(null);
        }
    };

    const handleAcceptAndRunFix = () => {
        if (!proposedFix) return;

        const codeToRun = proposedFix;
        setCode(codeToRun);
        setProposedFix(null);
        setOutput(prev => [...prev, { type: 'success', message: '✅ Fix applied. Running again...' }]);

        setTimeout(() => {
            handleRunCode(codeToRun);
        }, 50);
    };

    useEffect(() => {
        const codeFromStorage = sessionStorage.getItem('sandbox_code');
        if (codeFromStorage) {
            setCode(codeFromStorage);
            sessionStorage.removeItem('sandbox_code');
            const language = sessionStorage.getItem('sandbox_code_language') || 'unknown';
            sessionStorage.removeItem('sandbox_code_language');
            setOutput([{ type: 'info', message: `🚀 Code imported from post (${language.toUpperCase()}). Auto-running...` }]);
            setTimeout(() => handleRunCode(codeFromStorage), 300);
        }
    }, []);

    useEffect(() => {
        if (code.trim()) {
            setCodeAnalysis(UltraCodeAnalyzer.analyzeCode(code));
        }
    }, [code]);

    const createPythonIframe = () => {
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Python Sandbox</title><style>body{font-family:sans-serif;margin:10px;background:#f8f9fa}#output{white-space:pre-wrap;font-family:monospace}.error{color:#cc0000}</style><script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"><\/script></head><body><div id="status">Loading Python Environment... 🐍</div><div id="output"></div><script>
const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); };
const logInterval = setInterval(postLogs, 400);
const addToLog = (type, message, stack = null) => { String(message || '').split('\\n').filter(line => line.trim() !== '').forEach(line => logs.push({ type, message: line, stack })); };
function custom_js_input(prompt_text = '') { const r = window.prompt(prompt_text); if (r === null) throw new Error("Input cancelled by user."); return r; }
async function main() {
    try {
        let pyodide = await loadPyodide();
        document.getElementById('status').textContent = 'Pyodide Ready!';
        pyodide.setStdout({ batched: (str) => addToLog('log', str) });
        pyodide.setStderr({ batched: (str) => addToLog('error', str) });
        pyodide.globals.set('js_input', custom_js_input);
        await pyodide.runPythonAsync('import __main__\\n__builtins__.input = __main__.js_input');
        window.parent.postMessage({ type: 'pyodide_ready' }, '*');
        window.addEventListener('message', async (event) => {
            if (!event.data?.code) return;
            const { code, libraries } = event.data;
            let success = true;
            try {
                if (libraries && libraries.length > 0) {
                    addToLog('info', \`📦 Installing \${libraries.join(', ')}...\`); postLogs();
                    await pyodide.loadPackage(libraries);
                    addToLog('success', \`✅ Libraries installed successfully.\`);
                }
                addToLog('info', '🚀 Executing Python code...'); postLogs();
                await pyodide.runPythonAsync(code);
                addToLog('success', '✅ Code executed successfully');
            } catch (err) {
                success = false;
                const errorMessage = err.message.includes('JavascriptError:') ? err.message.split('\\n').pop().trim() : err.message;
                addToLog('error', errorMessage, err.stack);
            } finally { 
                postLogs(); window.parent.postMessage({ type: 'execution_complete', success }, '*'); 
            }
        });
    } catch (err) {
        addToLog('error', 'Failed to load Pyodide: ' + err.message);
        window.parent.postMessage({ type: 'execution_complete', success: false }, '*');
    }
}
main();
<\/script></body></html>`;
    };

    const createJavaScriptIframe = (codeToUse, codeType) => {
        if (codeType === 'html_fragment') codeToUse = `<!DOCTYPE html><html><head><title>Preview</title></head><body>${codeToUse}</body></html>`;
        else if (codeType === 'css_only') codeToUse = `<!DOCTYPE html><html><head><title>CSS Preview</title><style>${codeToUse}</style></head><body><div>CSS Applied</div></body></html>`;
        if (codeType.includes('html') || codeType === 'css_only') return codeToUse.replace('</head>', `<script>const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); }; setInterval(postLogs, 400); const createLogHandler = (type) => (...args) => logs.push({ type, message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') }); console.log = createLogHandler('log'); console.error = createLogHandler('error'); console.warn = createLogHandler('warning'); console.info = createLogHandler('info'); window.addEventListener('error', e => logs.push({ type: 'error', message: e.message, stack: e.error?.stack })); window.addEventListener('load', () => setTimeout(() => { postLogs(); window.parent.postMessage({ type: 'execution_complete', success: true }, '*'); }, 200)); <\/script></head>`);
        return `<!DOCTYPE html><html><head><title>JS Sandbox</title></head><body><div id="root"></div><script type="module">const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); }; setInterval(postLogs, 400); const createLogHandler = (type) => (...args) => logs.push({ type, message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') }); console.log = createLogHandler('log'); console.error = createLogHandler('error'); console.warn = createLogHandler('warning'); console.info = createLogHandler('info'); window.addEventListener('error', e => logs.push({ type: 'error', message: e.message, stack: e.error?.stack })); window.addEventListener('message', async (event) => { if (!event.data?.code) return; logs.push({ type: 'info', message: '🚀 Executing JS code...' }); postLogs(); let success = true; try { const { code, strategy } = event.data; if (strategy === 'module') { const blob = new Blob([code], { type: 'text/javascript' }); const url = URL.createObjectURL(blob); await import(url); URL.revokeObjectURL(url); } else if (strategy === 'async') { await (Object.getPrototypeOf(async function(){}).constructor)(code)(); } else { (new Function(code))(); } logs.push({ type: 'success', message: '✅ Code executed successfully' }); } catch (error) { success = false; logs.push({ type: 'error', message: \`\${error.name}: \${error.message}\`, stack: error.stack }); } finally { postLogs(); event.source.postMessage({ type: 'execution_complete', success }, event.origin); } }); window.parent.postMessage({ type: 'js_ready' }, '*'); <\/script></body></html>`;
    };

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.source !== iframeRef.current?.contentWindow) return;
            const { data } = event;
            if (data?.type === 'pyodide_ready' || data?.type === 'js_ready') {
                if (codeToRun.current) {
                    iframeRef.current.contentWindow.postMessage(codeToRun.current, '*');
                    codeToRun.current = null;
                }
            } else if (data?.type === 'execution_complete') {
                setIsRunning(false);
                if (data.success === false) setHasError(true);
            } else if (Array.isArray(data)) {
                const errorLog = data.find(log => log.type === 'error');
                if (errorLog) { setHasError(true); setLastError(errorLog); }
                setOutput(prev => [...prev, ...data]);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleRunCode = (codeOverride) => {
        const codeToExecute = typeof codeOverride === 'string' ? codeOverride : code;
        if (iframeRef.current && !isRunning && codeToExecute.trim()) {
            setHasError(false); setLastError(null);
            setProposedFix(null);
            setOutput([{ type: 'info', message: '🔄 Analyzing and preparing execution...' }]);
            setIsRunning(true);
            
            const analysis = UltraCodeAnalyzer.analyzeCode(codeToExecute);
            const newIframeType = analysis.codeType;
            const currentIframeType = iframeRef.current.dataset.type;

            const message = analysis.codeType === 'python'
                ? { code: codeToExecute, libraries: analysis.features.libraryList || [] }
                : { code: codeToExecute, strategy: analysis.executionStrategy };

            if (currentIframeType !== newIframeType) {
                if (analysis.codeType === 'python') {
                    iframeRef.current.srcdoc = createPythonIframe();
                    codeToRun.current = message;
                } else {
                    iframeRef.current.srcdoc = createJavaScriptIframe(codeToExecute, analysis.codeType);
                    codeToRun.current = analysis.codeType.includes('html') || analysis.codeType === 'css_only' ? null : message;
                }
                iframeRef.current.dataset.type = newIframeType;
            } else {
                iframeRef.current.contentWindow.postMessage(message, '*');
            }
        }
    };

    const handleClear = () => {
        setHasError(false); setLastError(null); setOutput([]);
        setProposedFix(null);
        if (iframeRef.current) {
            iframeRef.current.srcdoc = 'about:blank';
            iframeRef.current.dataset.type = 'blank';
        }
    };
    
    const getLogStyle = (type) => ({...styles[type]});
    const typeInfo = codeAnalysis ? UltraCodeAnalyzer.getTypeLabel(codeAnalysis) : { label: 'Unknown', color: '#64748b' };
    
    const templates = {
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Beautiful Page</title>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
            animation: fadeIn 1s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        h1 { margin: 0; font-size: 2.5rem; }
        p { margin: 1rem 0; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🚀 Hello, Beautiful World!</h1>
        <p>This is a modern, glass-morphic design</p>
        <button onclick="alert('Interactive!')">Click me!</button>
    </div>
</body>
</html>`,
        css: `.modern-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transform: translateY(0);
    transition: all 0.3s ease;
}

.modern-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.3);
}

.glow-text {
    text-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}`,
        js: `// ✨ Modern JavaScript Example
console.log("🚀 Welcome to Ultra Smart Sandbox!");

// Interactive array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const sum = numbers.reduce((acc, n) => acc + n, 0);

console.log("Original:", numbers);
console.log("Doubled:", doubled);
console.log("Sum:", sum);

// Async/await example
const fetchData = async () => {
    console.log("📡 Simulating API call...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: "Data loaded successfully! ✅" };
};

fetchData().then(data => console.log(data.message));

// Modern ES6+ features
const user = { name: "Developer", level: "Pro" };
const greeting = \`Hello \${user.name}, you're a \${user.level} developer! 🎉\`;
console.log(greeting);`,
        esmodule: `// 🚀 ES Module with dynamic imports
import { format } from 'https://cdn.skypack.dev/date-fns';

// Current date formatting
const now = new Date();
const formatted = format(now, 'PPP');
console.log(\`📅 Today is: \${formatted}\`);

// Dynamic color utility
const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
};

console.log('🎨 Available colors:', colors);

// Async data processing
const processData = async (data) => {
    console.log('⚡ Processing data...');
    return data.map(item => item.toUpperCase());
};

const fruits = ['apple', 'banana', 'orange'];
processData(fruits).then(result => {
    console.log('✨ Processed:', result);
});`,
        python: `# 🐍 Interactive Python Example
print("🚀 Welcome to Python Sandbox!")

# Get user input
name = input("What's your name? ")
age = int(input("How old are you? "))

# Process the data
greeting = f"Hello {name}! You are {age} years old."
print(f"✨ {greeting}")

# Some calculations
years_to_100 = 100 - age
print(f"📊 You have approximately {years_to_100} years until you're 100!")

# List operations
numbers = [1, 2, 3, 4, 5]
squared = [n**2 for n in numbers]
print(f"🔢 Numbers: {numbers}")
print(f"⭐ Squared: {squared}")`,
        numpy: `# 🐍 Python with NumPy & Matplotlib
import numpy as np
import matplotlib.pyplot as plt

print("📊 Creating a beautiful sine wave visualization!")

# Generate data
x = np.linspace(0, 4 * np.pi, 200)
y1 = np.sin(x)
y2 = np.cos(x)
y3 = np.sin(x) * np.cos(x)

print(f"✨ Generated {len(x)} data points")

# Create the plot
plt.figure(figsize=(12, 8))
plt.plot(x, y1, 'b-', linewidth=2, label='sin(x)', alpha=0.8)
plt.plot(x, y2, 'r-', linewidth=2, label='cos(x)', alpha=0.8)
plt.plot(x, y3, 'g-', linewidth=2, label='sin(x)cos(x)', alpha=0.8)

# Styling
plt.title('🌊 Beautiful Wave Functions', fontsize=16, fontweight='bold')
plt.xlabel('x (radians)', fontsize=12)
plt.ylabel('y', fontsize=12)
plt.grid(True, alpha=0.3)
plt.legend(fontsize=12)
plt.tight_layout()

# Add some statistics
print(f"📈 Sine wave stats:")
print(f"   Max: {np.max(y1):.3f}")
print(f"   Min: {np.min(y1):.3f}")
print(f"   Mean: {np.mean(y1):.3f}")

plt.show()`
    };

    return (
        <div style={styles.container}>
            <div style={styles.mainContent}>
                <div style={styles.editorWrapper}>
                    <div style={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={styles.brandTitle}>
                                ✨ Ultra Smart Sandbox
                            </span>
                            <div style={{ ...styles.codeTypeIndicator, backgroundColor: typeInfo.color }}>
                                {typeInfo.label}
                            </div>
                            {codeAnalysis?.features?.libraryList?.length > 0 && (
                                <div style={styles.libraryBadge}>
                                    📦 {codeAnalysis.features.libraryList.join(', ')}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <select 
                                onChange={(e) => { 
                                    if (e.target.value) setCode(templates[e.target.value]); 
                                    e.target.value = ''; 
                                }} 
                                style={styles.templateSelect}
                            >
                                <option value="">📚 Quick Templates</option>
                                <option value="html">🌐 Modern HTML</option>
                                <option value="css">🎨 Modern CSS</option>
                                <option value="js">⚡ JavaScript</option>
                                <option value="esmodule">📦 ES Module</option>
                                <option value="python">🐍 Python Interactive</option>
                                <option value="numpy">📊 Python + Data Viz</option>
                            </select>
                            <button 
                                onClick={() => handleRunCode()} 
                                style={{ 
                                    ...styles.runButton, 
                                    opacity: isRunning ? 0.6 : 1,
                                    transform: isRunning ? 'scale(0.98)' : 'scale(1)'
                                }} 
                                disabled={isRunning}
                                onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                                onMouseOut={e => e.target.style.transform = isRunning ? 'scale(0.98)' : 'scale(1)'}
                            >
                                {isRunning ? '⏳ Processing...' : '🚀 Ultra Run'}
                            </button>
                            <button 
                                onClick={handleClear} 
                                style={styles.clearButton}
                                onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                                onMouseOut={e => e.target.style.transform = 'scale(1)'}
                            >
                                🗑 Clear
                            </button>
                        </div>
                    </div>
                    <textarea 
                        value={code} 
                        onChange={(e) => setCode(e.target.value)} 
                        style={styles.textarea} 
                        placeholder="// 🚀 Welcome to Ultra Smart Sandbox!
// Paste your HTML, CSS, JS, or Python code here
// Libraries supported: numpy, pandas, matplotlib, and more!

console.log('Ready to create something amazing? ✨');" 
                    />
                </div>
                <div style={styles.previewWrapper}>
                    <div style={styles.header}>
                        <span style={styles.brandTitle}>📱 Live Preview / Output</span>
                    </div>
                    <iframe 
                        ref={iframeRef} 
                        sandbox="allow-scripts allow-same-origin allow-modals allow-popups" 
                        style={styles.iframe} 
                        title="Ultra Smart Sandbox Preview" 
                    />
                </div>
            </div>
            <div style={styles.output}>
                {hasError && lastError && !fixingRecommendation && !proposedFix && (
                    <div style={styles.errorBox}>
                        <div style={{ color: '#f87171', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                            ⚠️ Error Detected: <span style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px' }}>{lastError.message}</span>
                        </div>
                        <div style={{ color: '#fca5a5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span>✨ Let AI fix this error automatically?</span>
                            <button 
                                style={styles.aiFixButton} 
                                onClick={handleApplyAiFix}
                                onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                                onMouseOut={e => e.target.style.transform = 'scale(1)'}
                            >
                                🪄 Fix with AI
                            </button>
                        </div>
                    </div>
                )}
                {output.length > 0 ? (
                    output.map((line, index) => (
                        <div key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                            <span style={getLogStyle(line.type)}>
                                {line.type !== 'ai_diff' && (
                                    line.type === 'error' ? '❌' : 
                                    line.type === 'warning' ? '⚠️' : 
                                    line.type === 'info' ? 'ℹ️' : 
                                    line.type === 'success' ? '✅' : '▶️'
                                )} {line.message}
                            </span>
                            {line.type === 'ai_diff' && <AiDiffViewer diff={line.content} />}
                            {line.type === 'ai_diff' && proposedFix && (
                                <div style={{ marginTop: '12px' }}>
                                    <button 
                                        onClick={handleAcceptAndRunFix} 
                                        style={styles.applyFixButton}
                                        onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                                        onMouseOut={e => e.target.style.transform = 'scale(1)'}
                                    >
                                        ✅ Apply Fix & Run Again
                                    </button>
                                </div>
                            )}
                            {line.stack && (
                                <div style={styles.errorStack}>
                                    {line.stack.split('\n').slice(0, 4).join('\n')}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                        <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                            🌟 Console output, errors, and AI-powered suggestions will appear here...
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                            💡 Try running some code or select a template to get started!
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            ✨ Features: Real-time preview • AI error fixing • Multi-language support
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UltraSmartSandbox;