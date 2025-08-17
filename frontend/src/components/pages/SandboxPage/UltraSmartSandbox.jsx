import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Sử dụng API service thật
import apiService from '../../../services/api';
import styles from './UltraSmartSandbox.module.css';

import AiDiffViewer from '../AiDiffViewer'; // Giả sử bạn đặt nó trong src/components/common

// Memoized PreviewControls để tránh re-render không cần thiết
const PreviewControls = React.memo(({ onZoomChange, onFullscreen, currentZoom = 100 }) => {
    const zoomLevels = useMemo(() => [25, 50, 75, 100, 125, 150, 200], []);
    
    return (
        <div className={styles.previewControls}>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Zoom:</span>
            {zoomLevels.map(zoom => (
                <button
                    key={zoom}
                    onClick={() => onZoomChange(zoom)}
                    className={styles.zoomButton}
                    style={{
                        backgroundColor: zoom === currentZoom ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                        fontWeight: zoom === currentZoom ? 'bold' : 'normal'
                    }}
                >
                    {zoom}%
                </button>
            ))}
            <button 
                onClick={onFullscreen}
                className={styles.zoomButton}
                style={{ 
                    marginLeft: '8px', 
                    backgroundColor: 'rgba(34, 197, 94, 0.3)',
                    padding: '4px 12px'
                }}
            >
                🔍 Full
            </button>
        </div>
    );
});

// Component phát lại quá trình sửa lỗi của AI - Memoized và optimized
const AiReplayViewer = React.memo(({ replayState, setReplayState, onApply, onCancel }) => {
    const { steps, currentIndex, isPlaying } = replayState;
    const currentStep = useMemo(() => steps[currentIndex] || {}, [steps, currentIndex]);

    const handleNext = useCallback(() => {
        if (currentIndex < steps.length - 1) {
            setReplayState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1, isPlaying: false }));
        }
    }, [currentIndex, steps.length, setReplayState]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setReplayState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1, isPlaying: false }));
        }
    }, [currentIndex, setReplayState]);

    const handlePlayPause = useCallback(() => {
        setReplayState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }, [setReplayState]);

    // Optimized timer effect
    useEffect(() => {
        if (!isPlaying || currentIndex >= steps.length - 1) {
            if (isPlaying && currentIndex >= steps.length - 1) {
                setReplayState(prev => ({ ...prev, isPlaying: false }));
            }
            return;
        }

        const timer = setTimeout(handleNext, 2000);
        return () => clearTimeout(timer);
    }, [isPlaying, currentIndex, steps.length, handleNext, setReplayState]);

    const handleStepClick = useCallback((index) => {
        setReplayState(prev => ({ ...prev, currentIndex: index, isPlaying: false }));
    }, [setReplayState]);

    return (
        <div className={styles.replayContainer}>
            <div className={styles.replayHeader}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>🤖 AI Debug Replay</span>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Reviewing {steps.length} suggested changes</span>
            </div>
            
            <div className={styles.replayProgress}>
                {steps.map((_, index) => (
                    <div 
                        key={index} 
                        className={`${styles.replayProgressStep} ${index === currentIndex ? styles.replayProgressStepActive : ''}`}
                        onClick={() => handleStepClick(index)}
                    />
                ))}
            </div>

            <div className={styles.replayStepInfo}>
                <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                    Step {currentIndex + 1}/{steps.length}: {currentStep.title}
                </div>
                <p style={{ margin: '8px 0', color: '#e2e8f0', fontSize: '14px' }}>{currentStep.explanation}</p>
            </div>
            
            <AiDiffViewer diff={currentStep.diff} />

            <div className={styles.replayControls}>
                <button onClick={handlePrev} disabled={currentIndex <= 0} className={styles.replayButton}>Prev</button>
                <button onClick={handlePlayPause} className={styles.replayButton}>
                    {isPlaying && currentIndex < steps.length - 1 ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button onClick={handleNext} disabled={currentIndex >= steps.length - 1} className={styles.replayButton}>Next</button>
            </div>

            <div className={styles.replayFooter}>
                <button onClick={onCancel} className={styles.clearButton}>Cancel & Revert</button>
                <button onClick={onApply} className={styles.applyFixButton}>Apply Final Fix & Run</button>
            </div>
        </div>
    );
});

// Optimized linters - now as constants to avoid recreation
const SimpleHtmlLinter = {
    lint: (code) => {
        const errors = [];
        const tags = code.match(/<(\w+)[^>]*>|<\/(\w+)>/g) || [];
        const stack = [];
        const selfClosingTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
        
        tags.forEach(tag => {
            const isClosing = tag.startsWith('</');
            const tagName = isClosing ? tag.slice(2, -1) : tag.slice(1).split(/[\s>]/)[0];
            
            if (selfClosingTags.has(tagName)) {
                return; 
            }

            if (isClosing) {
                if (stack.length > 0 && stack[stack.length - 1] === tagName) {
                    stack.pop();
                } else {
                    errors.push({ message: `HTML Syntax Error: Mismatched or unexpected closing tag </${tagName}>.` });
                }
            } else {
                stack.push(tagName);
            }
        });
        
        if (stack.length > 0) {
            errors.push({ message: `HTML Syntax Error: Unclosed tag(s) found: <${stack.join('>, <')}>.` });
        }
        return errors;
    }
};

const SimpleCssLinter = {
    lint: (code) => {
        const errors = [];
        const lines = code.split('\n');
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.includes(':') && !trimmed.endsWith(';') && !trimmed.endsWith('{')) {
                 errors.push({ message: `CSS Syntax Error: Missing semicolon on line ${index + 1}? -> "${trimmed}"` });
            }
        });
        return errors;
    }
};

// Optimized UltraCodeAnalyzer with cached regex patterns
class UltraCodeAnalyzer {
    // Cache regex patterns as static properties to avoid recreation
    static pythonPatterns = {
        comment: /^\s*#/m,
        print: /^\s*print\s*\(/m,
        def: /^\s*def\s+.*:/m,
        class: /^\s*class\s+.*:/m,
        imports: /^\s*(from|import)\s/m,
    };

    static jsPatterns = {
        htmlDocument: /<!DOCTYPE\s+html|<html[\s>]/i,
        htmlTags: /<\/?\w+[^>]*>/,
        cssRules: /[.#]?[\w-]+\s*\{[^}]*\}/,
        jsKeywords: /\b(function|const|let|var|return|=>|class|import|export|async|await)\b/,
        esModule: /^\s*(import|export)\s/m,
        topLevelAwait: /(?:^|\n)\s*await\s+(?!.*(?:function|=>|\{))/m,
        asyncFunction: /async\s+function|=\s*async\s*\(|=>\s*async|async\s*\(/,
        domManipulation: /document\.|getElementById|querySelector|addEventListener|createElement/,
        reactJsx: /React\.|useState|useEffect|jsx|import.*react/i,
    };

    static supportedLibs = ['numpy', 'pandas', 'matplotlib', 'requests', 'scipy', 'scikit-learn'];

    static analyzeCode(code) {
        let isPython = Object.values(this.pythonPatterns).some(pattern => pattern.test(code));
        let executionStrategy = 'sync', complexity = 'basic', codeType = 'javascript', features = {};
        
        if (isPython) {
            codeType = 'python';
            executionStrategy = 'python_pyodide';
            
            // Optimized library detection
            const foundLibs = this.supportedLibs.filter(lib => {
                const libPattern = new RegExp(`(?:import|from)\\s+${lib}`);
                return libPattern.test(code);
            });
            
            features.hasLibraries = foundLibs.length > 0;
            features.libraryList = foundLibs;
        } else {
            // Batch test all patterns at once
            for (const [feature, pattern] of Object.entries(this.jsPatterns)) {
                features[feature] = pattern.test(code);
            }
            
            // Optimized type detection logic
            if (features.htmlDocument) codeType = 'html_document';
            else if (features.htmlTags) codeType = 'html_fragment';
            else if (features.cssRules && !features.htmlTags && !features.htmlDocument && !features.jsKeywords) codeType = 'css_only';
            else if (features.reactJsx) codeType = 'react_jsx';
            else if (features.esModule || features.topLevelAwait) codeType = 'es_module';
            else if (features.asyncFunction) codeType = 'async_js';
            else if (features.domManipulation) codeType = 'dom_js';
        }
        return { features, executionStrategy, complexity, codeType };
    }
    
    static getTypeLabel(analysis) {
        const { features, codeType } = analysis;
        
        // Use a lookup table for better performance
        const typeLabels = {
            python: () => {
                const libCount = features.libraryList?.length || 0;
                return { 
                    label: libCount > 0 ? `🐍 Python + ${libCount} libs` : '🐍 Python (Pyodide)', 
                    color: features.hasLibraries ? '#f59e0b' : '#3b82f6' 
                };
            },
            html_document: () => ({ label: '🌐 HTML Document', color: '#f97316' }),
            css_only: () => ({ label: '🎨 CSS Styles', color: '#06b6d4' }),
            react_jsx: () => ({ label: '⚛️ React/JSX', color: '#06b6d4' }),
            es_module: () => ({ label: '📦 ES Module', color: '#eab308' }),
        };

        if (typeLabels[codeType]) {
            return typeLabels[codeType]();
        }

        if (features.asyncFunction) return { label: '⚡ Async JS', color: '#f59e0b' };
        if (features.domManipulation) return { label: '🔧 DOM Script', color: '#06b6d4' };
        return { label: '⚡ JavaScript', color: '#eab308' };
    }
}

const UltraSmartSandbox = () => {
    // State declarations
    const [code, setCode] = useState(`<!DOCTYPE html>
<html>
<hea>
    <title>Buggy Page</title>
</head>
<body>
    <h1>This page has an error.
</body>
</html>`);
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [codeAnalysis, setCodeAnalysis] = useState(null);
    const [hasError, setHasError] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [lastError, setLastError] = useState(null);
    const [aiReplay, setAiReplay] = useState({ steps: [], currentIndex: -1, isPlaying: false });
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(100);

    // Refs
    const iframeRef = useRef(null);
    const codeToRun = useRef(null);
    const originalCodeBeforeFix = useRef(null);
    const previewContainerRef = useRef(null);
    const navigate = useNavigate();

    // Memoized templates to avoid recreation
    const templates = useMemo(() => ({
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
        python: `# 🎯 Interactive Python Example
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
        numpy: `# 📊 Python with NumPy & Matplotlib
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
print(f"📈 Sine-wave stats:")
print(f"   Max: {np.max(y1):.3f}")
print(f"   Min: {np.min(y1):.3f}")
print(f"   Mean: {np.mean(y1):.3f}")

plt.show()`
    }), []);

    // Optimized utility functions
    const generateDiff = useCallback((oldCode, newCode) => {
        const oldLines = new Set(oldCode.split('\n'));
        const newLines = new Set(newCode.split('\n'));
        
        const removed = oldCode.split('\n').filter(line => !newLines.has(line) && line.trim() !== '');
        const added = newCode.split('\n').filter(line => !oldLines.has(line) && line.trim() !== '');

        if (added.length === 0 && removed.length === 0) return "No significant changes found.";
        
        return [
            ...removed.map(line => `- ${line}`),
            ...added.map(line => `+ ${line}`)
        ].join('\n');
    }, []);

    const normalizeTagName = useCallback((codeType) => {
        if (!codeType) return 'general';
        if (codeType.includes('html')) return 'html';
        if (codeType.includes('css')) return 'css';
        if (codeType.includes('js') || codeType.includes('module') || codeType.includes('react')) return 'javascript';
        if (codeType === 'python') return 'python';
        return 'code';
    }, []);

    // Optimized iframe creation functions
    const createPythonIframe = useCallback(() => {
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Python Sandbox</title><style>body{font-family:sans-serif;margin:10px;background:#f8f9fa}#output{white-space:pre-wrap;font-family:monospace}.error{color:#cc0000}</style><script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"><\/script></head><body><div id="status">Loading Python Environment... 🐍</div><div id="output"></div><script>
const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); };
const logInterval = setInterval(postLogs, 400);
const addToLog = (type, message, stack = null) => { String(message || '').split('\\n').filter(line => line.trim() !== '').forEach(line => logs.push({ type, message: line, stack })); };
function custom_js_input(prompt_text = '') { const r = window.prompt(prompt_text); if (r === null) throw new Error("Input cancelled by user."); return r; }
async function main() {
    try {
        let pyodide = await loadPyodide();
        document.getElementById('status').textContent = 'Pyodide Ready!';
        try {
            await pyodide.runPythonAsync("import matplotlib\\nmatplotlib.rcParams['toolbar'] = 'none'");
        } catch(e) { 
            console.warn("Could not pre-configure matplotlib:", e); 
        }
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
    }, []);

    const createJavaScriptIframe = useCallback((codeToUse, codeType) => {
        if (codeType === 'html_fragment') codeToUse = `<!DOCTYPE html><html><head><title>Preview</title></head><body>${codeToUse}</body></html>`;
        else if (codeType === 'css_only') codeToUse = `<!DOCTYPE html><html><head><title>CSS Preview</title><style>${codeToUse}</style></head><body><div>CSS Applied</div></body></html>`;
        
        if (codeType.includes('html') || codeType === 'css_only') {
            const injectedScript = `
                <script>
                    const logs = [];
                    let anErrorOccurred = false; 

                    const postLogs = () => {
                        if (logs.length > 0) {
                            window.parent.postMessage(logs.splice(0), '*');
                        }
                    };
                    
                    setInterval(postLogs, 400);

                    const createLogHandler = (type) => (...args) => {
                        logs.push({ type, message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') });
                    };

                    console.log = createLogHandler('log');
                    console.error = createLogHandler('error');
                    console.warn = createLogHandler('warning');
                    console.info = createLogHandler('info');

                    window.addEventListener('error', e => {
                        anErrorOccurred = true; 
                        logs.push({ type: 'error', message: e.message, stack: e.error?.stack });
                        postLogs();
                    });

                    window.addEventListener('load', () => {
                        setTimeout(() => {
                            if (!anErrorOccurred) {
                                logs.push({ type: 'success', message: '✅ Code executed successfully' });
                            }
                            postLogs();
                            window.parent.postMessage({ type: 'execution_complete', success: !anErrorOccurred }, '*');
                        }, 200);
                    });
                <\/script>
            `;
            return codeToUse.replace('</head>', `${injectedScript}</head>`);
        }

        return `<!DOCTYPE html><html><head><title>JS Sandbox</title></head><body><div id="root"></div><script type="module">const logs = []; const postLogs = () => { if (logs.length > 0) window.parent.postMessage(logs.splice(0), '*'); }; setInterval(postLogs, 400); const createLogHandler = (type) => (...args) => logs.push({ type, message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') }); console.log = createLogHandler('log'); console.error = createLogHandler('error'); console.warn = createLogHandler('warning'); console.info = createLogHandler('info'); window.addEventListener('error', e => logs.push({ type: 'error', message: e.message, stack: e.error?.stack })); window.addEventListener('message', async (event) => { if (!event.data?.code) return; logs.push({ type: 'info', message: '🚀 Executing JS code...' }); postLogs(); let success = true; try { const { code, strategy } = event.data; if (strategy === 'module') { const blob = new Blob([code], { type: 'text/javascript' }); const url = URL.createObjectURL(blob); await import(url); URL.revokeObjectURL(url); } else if (strategy === 'async') { await (Object.getPrototypeOf(async function(){}).constructor)(code)(); } else { (new Function(code))(); } if (logs.length === 1) { logs.push({ type: 'info', message: 'ℹ️ Code definitions were processed. To see output, try calling a function or using console.log().' }); } logs.push({ type: 'success', message: '✅ Code executed successfully' }); } catch (error) { success = false; logs.push({ type: 'error', message: \`\${error.name}: \${error.message}\`, stack: error.stack }); } finally { postLogs(); event.source.postMessage({ type: 'execution_complete', success }, event.origin); } }); window.parent.postMessage({ type: 'js_ready' }, '*'); <\/script></body></html>`;
    }, []);

    // Event handlers
    const handleApplyAiFix = useCallback(async () => {
        if (!lastError || isFixing) return;

        originalCodeBeforeFix.current = code;
        setIsFixing(true);
        setHasError(false);
        setOutput([{ type: 'info', message: `🤖 DevAlly is analyzing your code and error...` }]);

        const recommendation = `
            The user's code has encountered an error.
            Error Message: "${lastError.message}"
            ${lastError.stack ? `Stack Trace: ${lastError.stack}` : ''}
            The error could be a JavaScript runtime error, or a syntax error in HTML or CSS detected by a linter.

            Your task is to analyze the following code, identify the root cause of the error, and provide a step-by-step guide to fix it.
            Break down the fix into logical steps. For each step, provide a title, a clear explanation of what you are fixing and why, and the complete code after applying that step's fix.
            Return the result as a raw JSON object with a single key "steps", which is an array of objects. Each object in the array should have three keys: "title", "explanation", and "code". Do not add any conversational text or markdown formatting around the JSON.

            Original Code:
            \`\`\`
            ${code}
            \`\`\`
        `;

        try {
            const response = await apiService.getAiCodeFix(code, recommendation);
            let replaySteps = [];

            if (typeof response === 'object' && response !== null && Array.isArray(response.steps)) {
                replaySteps = response.steps;
            } else {
                console.warn("API did not return the expected { steps: [...] } structure.", response);
                throw new Error("Received an unexpected response format from the server.");
            }

            if (replaySteps.length === 0) {
                throw new Error("AI response was received, but contained no actionable steps.");
            }

            const processedSteps = replaySteps.map((step, index) => {
                const prevCode = index === 0 ? originalCodeBeforeFix.current : replaySteps[index - 1].code;
                return { ...step, diff: generateDiff(prevCode, step.code) };
            });
            
            setOutput([]);
            setAiReplay({ steps: processedSteps, currentIndex: 0, isPlaying: false });

        } catch (error) {
            setOutput(prev => [...prev, { type: 'error', message: `❌ AI fix failed: ${error.message}` }]);
        } finally {
            setIsFixing(false);
        }
    }, [lastError, isFixing, code, generateDiff]);

    const handleCreatePost = useCallback(async () => {
        if (isCreatingPost || !code.trim()) return;

        setIsCreatingPost(true);
        try {
            const recommendation = `
                You are an expert technical writer. Your only task is to analyze the following code snippet and generate a single, concise, and descriptive title for it. The title should be suitable for a blog post or a forum question.
                IMPORTANT RULES:
                1. Your entire response MUST BE ONLY the title text.
                2. DO NOT include any labels like "Title:", explanations, or markdown formatting.
                
                GOOD TITLE EXAMPLES:
                - For a simple Python function: "Creating a Random Compliment Generator in Python"
                - For a React component: "Building a Modern Glassmorphism Card with React and CSS"
                - For a data script: "Visualizing Data with Python, NumPy, and Matplotlib"
                - For a CSS animation: "How to Create a Pulsing Glow Effect with CSS Keyframes"

                Here is the code to analyze:
                \`\`\`
                ${code}
                \`\`\`
            `;

            const response = await apiService.getAiGeneratedTitle(recommendation);
            
            console.log("AI Response for Title:", response);

            let suggestedTitle = "Untitled Code Snippet";

            if (typeof response === 'string' && response.trim()) {
                suggestedTitle = response.trim().replace(/^"|"$/g, '');
            } else if (response?.title) {
                suggestedTitle = response.title;
            } else if (response?.steps?.[0]?.title) {
                suggestedTitle = response.steps[0].title;
            } else if (typeof response === 'object' && response !== null) {
                const firstStringValue = Object.values(response).find(v => typeof v === 'string');
                if (firstStringValue) {
                    suggestedTitle = firstStringValue;
                }
            }
            
            const detectedLanguage = codeAnalysis ? normalizeTagName(codeAnalysis.codeType) : 'code';

            sessionStorage.setItem('create_post_code', code);
            sessionStorage.setItem('create_post_title', suggestedTitle);
            sessionStorage.setItem('create_post_tag_name', detectedLanguage);

            navigate('/create-post');
        } catch (error) {
            console.error("Failed to generate title or navigate:", error);
            const detectedLanguage = codeAnalysis ? normalizeTagName(codeAnalysis.codeType) : 'code';
            sessionStorage.setItem('create_post_code', code);
            sessionStorage.setItem('create_post_title', 'My Code Snippet');
            sessionStorage.setItem('create_post_tag_name', detectedLanguage);
            navigate('/create-post');
        } finally {
            setIsCreatingPost(false);
        }
    }, [isCreatingPost, code, codeAnalysis, normalizeTagName, navigate]);

    const handleAcceptAndRunFinalFix = useCallback(async () => {
        if (aiReplay.steps.length === 0) return;

        const finalCode = aiReplay.steps[aiReplay.steps.length - 1].code;
        
        try {
            const analysis = UltraCodeAnalyzer.analyzeCode(originalCodeBeforeFix.current);
            const bugData = {
                language: analysis.codeType,
                error_message: lastError.message,
                original_code: originalCodeBeforeFix.current,
                fix_step_count: aiReplay.steps.length,
                fixed_code: finalCode,
            };
            
            await apiService.logBugFix(bugData);
            console.log("Bug fix successfully logged to community database via API.");

        } catch (error) {
            console.error("Could not log bug fix to community DB:", error);
        }

        setCode(finalCode);
        setAiReplay({ steps: [], currentIndex: -1, isPlaying: false });
        
        setTimeout(() => {
            handleRunCode(finalCode, { 
                initialLog: { type: 'success', message: '✅ Final fix applied. Running again...' } 
            });
        }, 50);
    }, [aiReplay.steps, lastError]);

    const handleCancelReplay = useCallback(() => {
        setCode(originalCodeBeforeFix.current);
        setAiReplay({ steps: [], currentIndex: -1, isPlaying: false });
        setOutput(prev => [...prev, { type: 'info', message: '↩️ AI fix replay cancelled. Original code restored.' }]);
    }, []);

    const handleRunCode = useCallback((codeOverride, options = {}) => {
        const codeToExecute = typeof codeOverride === 'string' ? codeOverride : code;
        
        if (iframeRef.current && !isRunning && codeToExecute.trim()) {
            setHasError(false);
            setLastError(null);
            setAiReplay({ steps: [], currentIndex: -1, isPlaying: false });
            setIsRunning(true);

            const analysis = UltraCodeAnalyzer.analyzeCode(codeToExecute);
            
            let linterErrors = [];
            if (analysis.codeType.includes('html')) {
                linterErrors = SimpleHtmlLinter.lint(codeToExecute);
            } else if (analysis.codeType === 'css_only') {
                linterErrors = SimpleCssLinter.lint(codeToExecute);
            }

            if (linterErrors.length > 0) {
                const firstError = {
                    type: 'error',
                    message: linterErrors[0].message,
                    stack: `Syntax error detected by linter in ${analysis.codeType}.`
                };
                setOutput([firstError]);
                setLastError(firstError);
                setHasError(true);
                setIsRunning(false);
                return;
            }

            const initialLogs = [];
            if (options.initialLog) {
                initialLogs.push(options.initialLog);
            }
            initialLogs.push({ type: 'info', message: '📄 Analyzing and preparing execution...' });
            setOutput(initialLogs);

            const newIframeType = analysis.codeType;
            const currentIframeType = iframeRef.current.dataset.type;
            const message = analysis.codeType === 'python'
                ? { code: codeToExecute, libraries: analysis.features.libraryList || [] }
                : { code: codeToExecute, strategy: analysis.executionStrategy };

            const forceReloadTypes = ['html_document', 'html_fragment', 'css_only'];
            const shouldReloadIframe = currentIframeType !== newIframeType || forceReloadTypes.includes(newIframeType);

            if (shouldReloadIframe) {
                if (analysis.codeType === 'python') {
                    iframeRef.current.srcdoc = createPythonIframe();
                    codeToRun.current = message; 
                } else {
                    const isSrcDocExecution = forceReloadTypes.includes(analysis.codeType);
                    const newSrcDoc = createJavaScriptIframe(
                        isSrcDocExecution ? codeToExecute : '', 
                        analysis.codeType
                    );
                    iframeRef.current.srcdoc = newSrcDoc;

                    if (!isSrcDocExecution) {
                        codeToRun.current = message; 
                    } else {
                        codeToRun.current = null; 
                    }
                }
                iframeRef.current.dataset.type = newIframeType;
            } else {
                iframeRef.current.contentWindow.postMessage(message, '*');
            }
        }
    }, [code, isRunning, createPythonIframe, createJavaScriptIframe]);

    const handleClear = useCallback(() => {
        setHasError(false);
        setLastError(null);
        setOutput([]);
        setAiReplay({ steps: [], currentIndex: -1, isPlaying: false });
        if (iframeRef.current) {
            iframeRef.current.srcdoc = 'about:blank';
            iframeRef.current.dataset.type = 'blank';
        }
    }, []);

    const handleZoomChange = useCallback((zoom) => {
        setPreviewZoom(zoom);
        if (iframeRef.current) {
            iframeRef.current.style.transform = `scale(${zoom / 100})`;
            iframeRef.current.style.transformOrigin = 'top left';
            iframeRef.current.style.width = `${10000 / zoom}%`;
            iframeRef.current.style.height = `${10000 / zoom}%`;
        }
    }, []);

    const handleFullscreenToggle = useCallback(() => {
        setIsFullscreen(!isFullscreen);
    }, [isFullscreen]);

    const exitFullscreen = useCallback(() => {
        setIsFullscreen(false);
    }, []);

    const handleTemplateChange = useCallback((e) => {
        if (e.target.value && !isReplayActive) {
            setCode(templates[e.target.value]);
        }
        e.target.value = '';
    }, [templates]);

    // Optimized message handler
    const handleMessage = useCallback((event) => {
        if (event.source !== iframeRef.current?.contentWindow) return;

        const { data } = event;
        
        if (data?.type === 'pyodide_ready' || data?.type === 'js_ready') {
            if (codeToRun.current) {
                iframeRef.current.contentWindow.postMessage(codeToRun.current, '*');
                codeToRun.current = null;
            }
        } else if (data?.type === 'execution_complete') {
            setIsRunning(false);
        } else if (Array.isArray(data)) {
            const errorLog = data.find(log => log.type === 'error');
            if (errorLog) {
                setHasError(true);
                setLastError(errorLog);
            }
            setOutput(prev => [...prev, ...data]);
        }
    }, []);

    // Effects
    useEffect(() => {
        if (aiReplay.steps.length > 0 && aiReplay.currentIndex !== -1) {
            setCode(aiReplay.steps[aiReplay.currentIndex].code);
        }
    }, [aiReplay.currentIndex, aiReplay.steps]);

    useEffect(() => {
        const codeFromStorage = sessionStorage.getItem('sandbox_code');
        if (codeFromStorage) {
            const language = sessionStorage.getItem('sandbox_code_language') || 'unknown';
            setCode(codeFromStorage);
            sessionStorage.removeItem('sandbox_code');
            sessionStorage.removeItem('sandbox_code_language');
            
            setTimeout(() => {
                 handleRunCode(codeFromStorage, {
                    initialLog: { type: 'info', message: `🚀 Code imported from post (${language.toUpperCase()}). Auto-running...` }
                 });
            }, 300);
        }
    }, [handleRunCode]);

    useEffect(() => {
        if (code.trim()) {
            setCodeAnalysis(UltraCodeAnalyzer.analyzeCode(code));
        }
    }, [code]);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);
    
    // Memoized computed values
    const typeInfo = useMemo(() => 
        codeAnalysis ? UltraCodeAnalyzer.getTypeLabel(codeAnalysis) : { label: 'Unknown', color: '#64748b' }
    , [codeAnalysis]);
    
    const isReplayActive = useMemo(() => aiReplay.steps.length > 0, [aiReplay.steps.length]);
    
    return (
        <>
            <div className={styles.container}>
                <div className={styles.mainContent}>
                    <div className={styles.editorWrapper}>
                        <div className={styles.header}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span className={styles.brandTitle}>
                                    ✨ DevForge Sandbox
                                </span>
                                <div className={styles.codeTypeIndicator} style={{ backgroundColor: typeInfo.color }}>
                                    {typeInfo.label}
                                </div>
                                {codeAnalysis?.features?.libraryList?.length > 0 && (
                                    <div className={styles.libraryBadge}>
                                        📦 {codeAnalysis.features.libraryList.join(', ')}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <select 
                                    onChange={handleTemplateChange}
                                    className={styles.templateSelect}
                                    disabled={isReplayActive}
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
                                    onClick={handleCreatePost}
                                    className={styles.createPostButton}
                                    style={{
                                        opacity: isCreatingPost ? 0.6 : 1,
                                    }}
                                    disabled={isCreatingPost || isReplayActive}
                                    onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                                    onMouseOut={e => e.target.style.transform = 'scale(1)'}
                                >
                                    {isCreatingPost ? '✨ Generating...' : '📝 Create Post'}
                                </button>

                                <button 
                                    onClick={() => handleRunCode()} 
                                    className={styles.runButton}
                                    style={{ 
                                        opacity: isRunning || isReplayActive ? 0.6 : 1,
                                        transform: isRunning ? 'scale(0.98)' : 'scale(1)'
                                    }} 
                                    disabled={isRunning || isReplayActive}
                                    onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                                    onMouseOut={e => e.target.style.transform = isRunning ? 'scale(0.98)' : 'scale(1)'}
                                >
                                    {isRunning ? '⏳ Processing...' : '🚀 Ultra Run'}
                                </button>
                                <button 
                                    onClick={handleClear} 
                                    className={styles.clearButton}
                                    disabled={isReplayActive}
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
                            className={styles.textarea}
                            readOnly={isReplayActive}
                            placeholder="// 🚀 Welcome to Ultra Smart Sandbox!
// Paste your HTML, CSS, JS, or Python code here
// Libraries supported: numpy, pandas, matplotlib, and more!

console.log('Ready to create something amazing? ✨');" 
                        />
                    </div>
                    {/* CHANGED: Apply conditional class for fullscreen directly on the wrapper */}
                    <div className={`${styles.previewWrapper} ${isFullscreen ? styles.previewFullscreenActive : ''}`}>
                        <div className={styles.header}>
                            {/* CHANGED: Title changes based on state */}
                            <span className={styles.brandTitle}>
                                {isFullscreen ? '📱 Live Preview (Fullscreen)' : '📱 Live Preview / Output'}
                            </span>
                            {/* CHANGED: Exit button is now here, and only shows in fullscreen */}
                            {isFullscreen && (
                                <button onClick={exitFullscreen} className={styles.exitFullscreen}>
                                    Exit Fullscreen
                                </button>
                            )}
                        </div>
                        <PreviewControls 
                            onZoomChange={handleZoomChange}
                            onFullscreen={handleFullscreenToggle}
                            currentZoom={previewZoom}
                        />
                        <div ref={previewContainerRef} className={styles.iframeContainer}>
                            <iframe
                                ref={iframeRef}
                                sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
                                className={styles.iframe}
                                title="Ultra Smart Sandbox Preview"
                            />
                        </div>
                    </div>               
                </div>
                <div className={styles.output}>
                    {isReplayActive ? (
                        <AiReplayViewer
                            replayState={aiReplay}
                            setReplayState={setAiReplay}
                            onApply={handleAcceptAndRunFinalFix}
                            onCancel={handleCancelReplay}
                        />
                    ) : hasError && lastError && !isFixing ? (
                        <div className={styles.errorBox}>
                            <div style={{ color: '#f87171', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                                ⚠️ Error Detected: <span style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px' }}>{lastError.message}</span>
                            </div>
                            <div style={{ color: '#fca5a5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span>✨ Let AI fix this error automatically?</span>
                                <button 
                                    className={styles.aiFixButton}
                                    onClick={handleApplyAiFix}
                                    onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                                    onMouseOut={e => e.target.style.transform = 'scale(1)'}
                                >
                                    🪄 Create Debug Replay?
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {output.length > 0 && !isReplayActive ? (
                        output.map((line, index) => (
                            <div key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                                <span className={styles[line.type] || ''}>
                                    {
                                        line.type === 'error' ? '❌' : 
                                        line.type === 'warning' ? '⚠️' : 
                                        line.type === 'info' ? 'ℹ️' : 
                                        line.type === 'success' ? '✅' : '▶️'
                                    } {line.message}
                                </span>
                                {line.stack && (
                                    <div className={styles.errorStack}>
                                        {line.stack.split('\n').slice(0, 4).join('\n')}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : null}
                    
                    {!isReplayActive && output.length === 0 && (
                        <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                                🌟 Console output, errors, and AI-powered suggestions will appear here...
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                💡 Try running the buggy example code or select a template to get started!
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                ✨ Features: Real-time preview • AI Debug Replay • Multi-language support
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* REMOVED: The entire separate fullscreen modal JSX is gone */}
        </>
    );
};

export default UltraSmartSandbox;