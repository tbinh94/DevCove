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
  error: { color: '#ff6b6b' },
  warning: { color: '#ffa726' },
  success: { color: '#66bb6a' },
  info: { color: '#29b6f6' },
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
        const pythonStrongSignals = {
            comment: /^\s*#/m,
            print: /^\s*print\s*\(/m,
            def: /^\s*def\s+.*:/m,
            class: /^\s*class\s+.*:/m,
            imports: /^\s*(from|import)\s/m,
        };
        let isPython = Object.values(pythonStrongSignals).some(pattern => pattern.test(code));
        let executionStrategy = 'sync', complexity = 'basic', codeType = 'javascript', features = {}, score = 0;

        if (isPython) {
            codeType = 'python';
            executionStrategy = 'python_pyodide';
            complexity = 'intermediate';
            score = Object.values(pythonStrongSignals).filter(p => p.test(code)).length;
        } else {
            const patterns = {
                htmlDocument: /<!DOCTYPE\s+html|<html[\s>]/i,
                htmlTags: /<\/?\w+[^>]*>/,
                htmlComplete: /<html[\s>].*<\/html>/is,
                cssRules: /[.#]?[\w-]+\s*\{[^}]*\}/,
                scriptTags: /<script[\s>].*?<\/script>/is,
                esModule: /^\s*(import|export)\s/m,
                topLevelAwait: /(?:^|\n)\s*await\s+(?!.*(?:function|=>|\{))/m,
                asyncFunction: /async\s+function|=\s*async\s*\(|=>\s*async|async\s*\(/,
                promises: /new\s+Promise|\.then\s*\(|\.catch\s*\(|Promise\.(all|race|resolve|reject)/,
                domManipulation: /document\.|getElementById|querySelector|addEventListener|createElement/,
                classes: /class\s+\w+|\bextends\b/,
                reactJsx: /React\.|useState|useEffect|jsx|import.*react/i,
                jsxElements: /<[A-Z]\w*[^>]*>/,
            };
            for (const [feature, pattern] of Object.entries(patterns)) {
                features[feature] = pattern.test(code);
            }
            score = Object.values(features).filter(Boolean).length;

            if (features.htmlDocument || features.htmlComplete) {
                codeType = 'html_document';
                executionStrategy = 'html_full';
            } else if (features.htmlTags) {
                codeType = 'html_fragment';
                executionStrategy = 'html_fragment';
            } else if (features.cssRules && !features.htmlTags) {
                codeType = 'css_only';
                executionStrategy = 'css_inject';
            } else if (features.reactJsx && features.jsxElements) {
                codeType = 'react_jsx';
                executionStrategy = 'react';
            } else if (features.esModule || features.topLevelAwait) {
                codeType = 'es_module';
                executionStrategy = 'module';
            } else if (features.asyncFunction || features.promises) {
                codeType = 'async_js';
                executionStrategy = 'async';
            } else if (features.domManipulation || features.classes) {
                codeType = 'dom_js';
                executionStrategy = 'dom';
            }
        }

        const complexityScore = score;
        if (complexityScore > 12) {
            complexity = 'expert';
        } else if (complexityScore > 8) {
            complexity = 'advanced';
        } else if (complexityScore > 4) {
            complexity = 'intermediate';
        }

        return { features, executionStrategy, complexity, codeType, score, recommendations: [] };
    }

    static getTypeLabel(analysis) {
        const { features, complexity, codeType } = analysis;
        if (codeType === 'python') return { label: 'Python (Pyodide)', color: '#306998' };
        if (codeType === 'html_document') return { label: 'HTML Document', color: '#e67e22' };
        if (codeType === 'html_fragment') return { label: 'HTML Fragment', color: '#f39c12' };
        if (codeType === 'css_only') return { label: 'CSS Styles', color: '#3498db' };
        if (codeType === 'react_jsx') return { label: 'React/JSX', color: '#61dafb' };
        if (features.asyncFunction || features.promises) return { label: 'Async JS', color: '#f39c12' };
        if (features.domManipulation) return { label: 'DOM Script', color: '#3498db' };
        if (complexity === 'advanced') return { label: 'Modern JS', color: '#2ecc71' };
        return { label: 'Basic JS', color: '#95a5a6' };
    }

    static extractParts(code, codeType) {
        let html = '';
        let js = '';
        if (codeType === 'html_document' || codeType === 'html_mixed') {
            html = code;
        } else if (codeType === 'html_fragment') {
            html = `<!DOCTYPE html><html lang="en"><head><title>Preview</title></head><body>${code}</body></html>`;
        } else if (codeType === 'css_only') {
            html = `<!DOCTYPE html><html lang="en"><head><title>CSS Preview</title><style>${code}</style></head><body><div>Applied</div></body></html>`;
        } else {
            js = code;
        }
        return { html, js };
    }
}

const UltraSmartSandbox = () => {
    const [code, setCode] = useState(`// Paste code here or click "Run in Sandbox" from a post!`);
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [codeAnalysis, setCodeAnalysis] = useState(null);
    const iframeRef = useRef(null);
    const [hasError, setHasError] = useState(false);
    const [fixingRecommendation, setFixingRecommendation] = useState(null);
    const codeToRun = useRef(null);
    const [lastError, setLastError] = useState(null);

    const handleApplyAiFix = async () => {
        if (fixingRecommendation || !lastError) {
            return;
        }
        const detailedPrompt = `The following code failed with this error:\n--- ERROR MESSAGE ---\n${lastError.message}${lastError.stack ? `\n--- STACK TRACE ---\n${lastError.stack}` : ''}\n--- END OF ERROR ---\n\nPlease find and fix the error in the code below so it can run successfully. Only provide the complete, corrected code block.`;
        
        setFixingRecommendation(detailedPrompt);
        setOutput(prev => [...prev, { type: 'info', message: `🤖 Sending code and error context to DevAlly for a fix...` }]);

        try {
            const response = await apiService.getAiCodeFix(code, detailedPrompt);
            const markdownMatch = response.match(/```(?:python|javascript|html|css)?\s*\n([\s\S]*?)\n?```/);

            if (markdownMatch && markdownMatch[1]) {
                setCode(markdownMatch[1].trim());
            } else {
                const parser = new DOMParser();
                const doc = parser.parseFromString(response, 'text/html');
                const codeElement = doc.querySelector('code');
                if (codeElement) {
                    setCode(codeElement.textContent);
                } else {
                    setCode(response);
                }
            }
            setOutput(prev => [...prev, { type: 'success', message: '✅ AI fix has been applied!' }]);
        } catch (error) {
            setOutput(prev => [...prev, { type: 'error', message: `❌ AI fix failed: ${error.message || 'Unknown error'}` }]);
        } finally {
            setFixingRecommendation(null);
        }
    };

    useEffect(() => {
        const codeFromStorage = sessionStorage.getItem('sandbox_code');
        if (codeFromStorage) {
            setCode(codeFromStorage);
            sessionStorage.removeItem('sandbox_code');
            const language = sessionStorage.getItem('sandbox_code_language') || 'unknown';
            sessionStorage.removeItem('sandbox_code_language');
            setOutput([{ type: 'info', message: `🚀 Code imported from post (${language.toUpperCase()}). Auto-running...` }]);
            setTimeout(() => {
                handleRunCode(codeFromStorage);
            }, 300);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (code.trim()) {
            setCodeAnalysis(UltraCodeAnalyzer.analyzeCode(code));
        }
    }, [code]);

    const createUltraSmartIframeSrcDoc = (analysis, codeToUse) => {
        const { codeType } = analysis;
        if (codeType === 'python') {
            return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Python Sandbox</title><style>body{font-family:sans-serif;margin:10px;background:#f8f9fa}#output{white-space:pre-wrap;font-family:monospace}.error{color:#cc0000}</style><script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"><\/script></head><body><div id="status">Loading Python Environment... 🐍</div><div id="output"></div><script>
                const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); };
                const logInterval = setInterval(postLogs, 400);
                const addToLog = (type, message, stack = null) => logs.push({ type, message, stack, timestamp: Date.now() });

                function custom_js_input(prompt_text = '') {
                    const result = window.prompt(prompt_text);
                    if (result === null) { throw new Error("Input cancelled by user."); }
                    return result;
                }

                async function main() {
                    try {
                        let pyodide = await loadPyodide();
                        document.getElementById('status').textContent = 'Pyodide Ready!';
                        pyodide.setStdout({ batched: (str) => addToLog('log', str) });
                        pyodide.setStderr({ batched: (str) => addToLog('error', str) });
                        
                        pyodide.globals.set('js_input', custom_js_input);
                        await pyodide.runPythonAsync('import __main__\\n__builtins__.input = __main__.js_input');
                        addToLog('info', 'Python environment patched for interactive input()');

                        window.parent.postMessage({ type: 'pyodide_ready' }, '*');
                        
                        window.addEventListener('message', async (event) => {
                            if (!event.data?.code) return;
                            addToLog('info', '🚀 Executing Python code...'); postLogs(); let success = true;
                            try {
                                await pyodide.runPythonAsync(event.data.code);
                                addToLog('success', '✅ Code executed successfully');
                            } catch (err) {
                                success = false;
                                const errorMessage = err.message.includes('JavascriptError:') ? err.message.split('\\n').pop().trim() : err.message;
                                addToLog('error', errorMessage, err.stack);
                            }
                            finally { postLogs(); window.parent.postMessage({ type: 'execution_complete', success }, '*'); }
                        });
                    } catch (err) {
                        addToLog('error', 'Failed to load Pyodide: ' + err.message);
                        window.parent.postMessage({ type: 'execution_complete', success: false }, '*');
                    }
                }
                main();
            <\/script></body></html>`;
        }
        
        const { html } = UltraCodeAnalyzer.extractParts(codeToUse, codeType);
        if (codeType.includes('html') || codeType === 'css_only') {
            return html.replace('</head>', `<script>
                const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); }; setInterval(postLogs, 400);
                const createLogHandler = (type) => (...args) => logs.push({ type, message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') });
                console.log = createLogHandler('log'); console.error = createLogHandler('error'); console.warn = createLogHandler('warning'); console.info = createLogHandler('info');
                window.addEventListener('error', e => logs.push({ type: 'error', message: e.message, stack: e.error?.stack }));
                window.addEventListener('unhandledrejection', e => logs.push({ type: 'error', message: 'Promise Rejection: ' + e.reason?.message, stack: e.reason?.stack }));
                window.addEventListener('load', () => setTimeout(() => { postLogs(); window.parent.postMessage({ type: 'execution_complete', success: true }, '*'); }, 200));
            <\/script></head>`);
        }

        return `<!DOCTYPE html><html><head><title>JS Sandbox</title></head><body><div id="root"></div><script type="module">
            const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); }; setInterval(postLogs, 400);
            const createLogHandler = (type) => (...args) => logs.push({ type, message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') });
            console.log = createLogHandler('log'); console.error = createLogHandler('error'); console.warn = createLogHandler('warning'); console.info = createLogHandler('info');
            window.addEventListener('error', e => logs.push({ type: 'error', message: e.message, stack: e.error?.stack }));
            window.addEventListener('message', async (event) => {
                if (!event.data?.code) return;
                logs.push({ type: 'info', message: \`🚀 Executing JS code...\` }); postLogs(); let success = true;
                try {
                    if (event.data.strategy === 'module') {
                        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                        await new AsyncFunction(event.data.code)();
                    } else {
                        eval(event.data.code);
                    }
                    logs.push({ type: 'success', message: '✅ Code executed successfully' });
                } catch (error) {
                    success = false;
                    logs.push({ type: 'error', message: \`\${error.name}: \${error.message}\`, stack: error.stack });
                } finally {
                    postLogs();
                    event.source.postMessage({ type: 'execution_complete', success }, event.origin);
                }
            });
            window.parent.postMessage({ type: 'js_ready' }, '*');
        <\/script></body></html>`;
    };

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.source !== iframeRef.current?.contentWindow) return;
            const { data } = event;
            if (data?.type === 'pyodide_ready') {
                if (codeToRun.current) {
                    iframeRef.current.contentWindow.postMessage({ code: codeToRun.current }, '*');
                    codeToRun.current = null;
                }
            } else if (data?.type === 'js_ready') {
                if (codeToRun.current) {
                    iframeRef.current.contentWindow.postMessage({ code: codeToRun.current.code, strategy: codeToRun.current.strategy }, '*');
                    codeToRun.current = null;
                }
            } else if (data?.type === 'execution_complete') {
                setIsRunning(false);
                if (data.success === false) {
                    setHasError(true);
                }
            } else if (Array.isArray(data)) {
                const errorLog = data.find(log => log.type === 'error');
                if (errorLog) {
                    setHasError(true);
                    setLastError(errorLog);
                }
                setOutput(prev => [...prev, ...data]);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleRunCode = (codeOverride) => {
        const codeToExecute = typeof codeOverride === 'string' ? codeOverride : code;
        if (iframeRef.current && !isRunning && codeToExecute.trim()) {
            setHasError(false);
            setLastError(null);
            setOutput([{ type: 'info', message: '🔄 Analyzing code and preparing execution...' }]);
            setIsRunning(true);
            const analysis = UltraCodeAnalyzer.analyzeCode(codeToExecute);
            const newIframeType = analysis.codeType.includes('html') || analysis.codeType === 'css_only' ? 'html_js' : analysis.codeType;
            const currentIframeType = iframeRef.current.dataset.type;

            if (currentIframeType !== newIframeType) {
                iframeRef.current.srcdoc = createUltraSmartIframeSrcDoc(analysis, codeToExecute);
                iframeRef.current.dataset.type = newIframeType;
                codeToRun.current = analysis.codeType.includes('html') || analysis.codeType === 'css_only' ? null : analysis.codeType === 'python' ? codeToExecute : { code: codeToExecute, strategy: analysis.executionStrategy };
            } else {
                const message = analysis.codeType === 'python' ? { code: codeToExecute } : { code: codeToExecute, strategy: analysis.executionStrategy };
                iframeRef.current.contentWindow.postMessage(message, '*');
            }
        }
    };

    const handleClear = () => {
        setHasError(false);
        setLastError(null);
        setOutput([]);
        if (iframeRef.current) {
            iframeRef.current.srcdoc = 'about:blank';
            iframeRef.current.dataset.type = 'blank';
        }
    };
    
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
        html: `<!DOCTYPE html><html lang="en"><head><title>Page</title><style>body{font-family:sans-serif;}</style></head><body><h1>Hello!</h1></body></html>`,
        css: `.card { background: #eee; padding: 1rem; border-radius: 8px; }`,
        js: `console.log("Hello from JavaScript!");\nconst arr = [1, 2, 3];\nconsole.log('Array:', arr);`,
        python: `# Python script with user input
name = input("What's your name? ")
print(f"Hello, {name}!")

age_str = input("How old are you? ")
if age_str.isdigit():
    age = int(age_str)
    print(f"In 10 years, you will be {age + 10} years old.")
else:
    print("That's not a valid number for age!")`
    };

    return (
        <div style={styles.container}>
            <div style={styles.mainContent}>
                <div style={styles.editorWrapper}>
                    <div style={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span>🌟 Ultra Smart Sandbox</span>
                            <div style={{ ...styles.codeTypeIndicator, backgroundColor: typeInfo.color }}>{typeInfo.label}</div>
                            {codeAnalysis && <div style={{ ...styles.codeTypeIndicator, backgroundColor: '#6c757d', marginLeft: '5px' }}>Score: {codeAnalysis.score}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <select onChange={(e) => { if (e.target.value) setCode(templates[e.target.value]); e.target.value = ''; }} style={{ ...styles.clearButton, backgroundColor: '#4a4a4a', border: '1px solid #666', padding: '6px 12px', fontSize: '12px', marginRight: '8px' }}>
                                <option value="">📋 Quick Templates</option>
                                <option value="html">🌐 HTML</option>
                                <option value="css">🎨 CSS</option>
                                <option value="js">⚡ JavaScript</option>
                                <option value="python">🐍 Python (Interactive)</option>
                            </select>
                            <button onClick={() => handleRunCode()} style={{ ...styles.runButton, opacity: isRunning ? 0.6 : 1 }} disabled={isRunning}>{isRunning ? '⏳ Processing...' : '🚀 Ultra Run'}</button>
                            <button onClick={handleClear} style={styles.clearButton}>🗑 Clear</button>
                        </div>
                    </div>
                    <textarea value={code} onChange={(e) => setCode(e.target.value)} style={styles.textarea} placeholder="// Paste HTML, CSS, JS or Python. The sandbox will auto-detect and run it! 🚀" />
                </div>
                <div style={styles.previewWrapper}>
                    <div style={styles.header}><span>📱 Live Preview / Output</span></div>
                    <iframe ref={iframeRef} sandbox="allow-scripts allow-same-origin allow-modals allow-popups" style={styles.iframe} title="Ultra Smart Sandbox Preview" />
                </div>
            </div>

            <div style={styles.output}>
                {hasError && lastError && (
                    <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: '4px' }}>
                        <div style={{ color: '#ff8a80', fontSize: '12px', fontWeight: 'bold' }}>⚠️ Error Detected: <span style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px' }}>{lastError.message}</span></div>
                        <div style={{ color: '#ffc1b8', fontSize: '11px', marginTop: '5px', display: 'flex', alignItems: 'center' }}>
                            <span>Let AI help fix this specific error?</span>
                            <button style={{ opacity: fixingRecommendation ? 0.5 : 1, cursor: fixingRecommendation ? 'not-allowed' : 'pointer', marginLeft: '10px', background: '#007bff', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px' }} onClick={handleApplyAiFix} disabled={!!fixingRecommendation}>
                                {fixingRecommendation ? '⏳ Thinking...' : '🪄 Fix with DevAlly'}
                            </button>
                        </div>
                    </div>
                )}
                {output.length > 0 ? (
                    output.map((line, index) => (
                        <div key={index} style={{ marginBottom: '4px' }}>
                            <span style={getLogStyle(line.type)}>
                                {line.type === 'error' ? '❌' : line.type === 'warning' ? '⚠️' : line.type === 'info' ? 'ℹ️' : line.type === 'success' ? '✅' : '▶'} {line.message}
                            </span>
                            {line.stack && (<div style={styles.errorStack}>{line.stack.split('\n').slice(0, 4).join('\n')}</div>)}
                        </div>
                    ))
                ) : (
                    <div style={{ color: '#888' }}>Console output, errors, and smart tips will appear here...<br /><small style={{ color: '#666' }}>💡 Try running some code or import from a post!</small></div>
                )}
            </div>
        </div>
    );
};

export default UltraSmartSandbox;