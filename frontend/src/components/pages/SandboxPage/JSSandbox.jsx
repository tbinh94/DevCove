import React, { useState, useRef, useEffect } from 'react';
import CodeTabs from './CodeTabs';
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
  exampleSelect: {
    backgroundColor: '#4a4a4a',
    color: 'white',
    border: '1px solid #666',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '14px',
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

// Các ví dụ code mẫu
const codeExamples = {
  'basic': `// Basic JavaScript
console.log('Hello World!');
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);

document.getElementById('root').innerHTML = '<h2>Basic Example</h2><p>Check console for output!</p>';`,

  'async': `// Async/Await Example
async function fetchUserData() {
  console.log('🔄 Fetching user data...');
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const userData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  };
  
  console.log('✅ User data fetched:', userData);
  return userData;
}

async function displayUser() {
  try {
    const user = await fetchUserData();
    document.getElementById('root').innerHTML = \`
      <div style="padding: 20px; font-family: Arial;">
        <h2>User Profile</h2>
        <p><strong>Name:</strong> \${user.name}</p>
        <p><strong>Email:</strong> \${user.email}</p>
        <p><strong>Age:</strong> \${user.age}</p>
      </div>
    \`;
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

displayUser();`,

  'dom': `// DOM Manipulation Example
const root = document.getElementById('root');

// Create interactive counter
let count = 0;

function createCounter() {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 20px; text-align: center; font-family: Arial;';
  
  const title = document.createElement('h2');
  title.textContent = 'Interactive Counter';
  
  const display = document.createElement('div');
  display.style.cssText = 'font-size: 48px; margin: 20px; color: #007bff;';
  display.textContent = count;
  
  const buttonsDiv = document.createElement('div');
  
  const incrementBtn = document.createElement('button');
  incrementBtn.textContent = '+ Increment';
  incrementBtn.style.cssText = 'margin: 5px; padding: 10px 20px; font-size: 16px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;';
  
  const decrementBtn = document.createElement('button');
  decrementBtn.textContent = '- Decrement';
  decrementBtn.style.cssText = 'margin: 5px; padding: 10px 20px; font-size: 16px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;';
  
  const resetBtn = document.createElement('button');
  resetBtn.textContent = '↻ Reset';
  resetBtn.style.cssText = 'margin: 5px; padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;';
  
  incrementBtn.onclick = () => {
    count++;
    display.textContent = count;
    console.log('Count incremented to:', count);
  };
  
  decrementBtn.onclick = () => {
    count--;
    display.textContent = count;
    console.log('Count decremented to:', count);
  };
  
  resetBtn.onclick = () => {
    count = 0;
    display.textContent = count;
    console.log('Count reset to:', count);
  };
  
  buttonsDiv.appendChild(incrementBtn);
  buttonsDiv.appendChild(decrementBtn);
  buttonsDiv.appendChild(resetBtn);
  
  container.appendChild(title);
  container.appendChild(display);
  container.appendChild(buttonsDiv);
  
  return container;
}

root.appendChild(createCounter());
console.log('🎯 Interactive counter created!');`,

  'classes': `// ES6 Classes and Modern JavaScript
class Animal {
  constructor(name, species) {
    this.name = name;
    this.species = species;
  }
  
  speak() {
    return \`\${this.name} makes a sound\`;
  }
  
  introduce() {
    return \`Hi, I'm \${this.name}, a \${this.species}\`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name, 'Dog');
    this.breed = breed;
  }
  
  speak() {
    return \`\${this.name} barks: Woof! Woof!\`;
  }
  
  wagTail() {
    return \`\${this.name} is wagging tail happily! 🐕\`;
  }
}

// Create instances
const animals = [
  new Animal('Generic Pet', 'Unknown'),
  new Dog('Buddy', 'Golden Retriever'),
  new Dog('Max', 'German Shepherd')
];

console.log('🐾 Animal Farm:');
animals.forEach((animal, index) => {
  console.log(\`\${index + 1}. \${animal.introduce()}\`);
  console.log(\`   Says: \${animal.speak()}\`);
  
  if (animal instanceof Dog) {
    console.log(\`   \${animal.wagTail()}\`);
  }
  console.log('');
});

// Display in DOM
const root = document.getElementById('root');
root.innerHTML = \`
  <div style="padding: 20px; font-family: Arial;">
    <h2>🐾 Animal Farm Demo</h2>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
      \${animals.map((animal, i) => \`
        <div style="margin: 10px 0; padding: 10px; border-left: 4px solid #007bff;">
          <strong>\${animal.introduce()}</strong><br>
          <em>\${animal.speak()}</em>
          \${animal instanceof Dog ? \`<br><span style="color: #28a745;">\${animal.wagTail()}</span>\` : ''}
        </div>
      \`).join('')}
    </div>
  </div>
\`;`,

  'promises': `// Promises and Error Handling
function simulateAPICall(endpoint, delay = 1000, shouldFail = false) {
  return new Promise((resolve, reject) => {
    console.log(\`🔄 Making API call to \${endpoint}...\`);
    
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error(\`Failed to fetch from \${endpoint}\`));
      } else {
        const data = {
          endpoint,
          timestamp: new Date().toISOString(),
          data: \`Sample data from \${endpoint}\`
        };
        resolve(data);
      }
    }, delay);
  });
}

async function handleMultipleAPIs() {
  const root = document.getElementById('root');
  root.innerHTML = '<div style="padding: 20px;"><h2>API Calls Demo</h2><div id="status">Starting...</div></div>';
  
  const statusDiv = document.getElementById('status');
  
  try {
    // Sequential calls
    console.log('📡 Starting sequential API calls...');
    statusDiv.innerHTML += '<p>🔄 Sequential calls starting...</p>';
    
    const result1 = await simulateAPICall('/users', 800);
    console.log('✅ Users fetched:', result1);
    statusDiv.innerHTML += '<p>✅ Users data loaded</p>';
    
    const result2 = await simulateAPICall('/posts', 600);
    console.log('✅ Posts fetched:', result2);
    statusDiv.innerHTML += '<p>✅ Posts data loaded</p>';
    
    // Parallel calls
    console.log('🚀 Starting parallel API calls...');
    statusDiv.innerHTML += '<p>🚀 Parallel calls starting...</p>';
    
    const [comments, likes, shares] = await Promise.all([
      simulateAPICall('/comments', 500),
      simulateAPICall('/likes', 300),
      simulateAPICall('/shares', 700)
    ]);
    
    console.log('✅ All parallel calls completed');
    statusDiv.innerHTML += '<p>✅ All parallel data loaded</p>';
    
    // One call that fails
    console.log('❌ Testing error handling...');
    statusDiv.innerHTML += '<p>🧪 Testing error handling...</p>';
    
    try {
      await simulateAPICall('/error-endpoint', 400, true);
    } catch (error) {
      console.log('🛡️ Error caught and handled:', error.message);
      statusDiv.innerHTML += '<p style="color: orange;">🛡️ Error handled gracefully</p>';
    }
    
    statusDiv.innerHTML += '<p style="color: green; font-weight: bold;">🎉 All demos completed!</p>';
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    statusDiv.innerHTML += \`<p style="color: red;">💥 Error: \${error.message}</p>\`;
  }
}

handleMultipleAPIs();`,

  'modern': `// Modern JavaScript Features
// Destructuring, Spread, Template Literals, Arrow Functions

const users = [
  { id: 1, name: 'Alice', age: 25, city: 'New York', hobbies: ['reading', 'coding'] },
  { id: 2, name: 'Bob', age: 30, city: 'San Francisco', hobbies: ['gaming', 'cooking'] },
  { id: 3, name: 'Charlie', age: 28, city: 'Chicago', hobbies: ['music', 'travel'] }
];

// Destructuring and spread operator
const [firstUser, ...otherUsers] = users;
console.log('First user:', firstUser);
console.log('Other users:', otherUsers);

// Object destructuring
const { name, age, ...rest } = firstUser;
console.log(\`Name: \${name}, Age: \${age}\`);
console.log('Rest:', rest);

// Array methods with arrow functions
const youngUsers = users.filter(user => user.age < 30);
const userNames = users.map(({ name, city }) => \`\${name} from \${city}\`);
const totalAge = users.reduce((sum, user) => sum + user.age, 0);

console.log('Young users:', youngUsers);
console.log('User locations:', userNames);
console.log('Average age:', totalAge / users.length);

// Template literals and optional chaining
const createUserCard = (user) => {
  const hobbiesText = user.hobbies?.join(', ') ?? 'No hobbies listed';
  return \`
    <div style="border: 1px solid #ddd; margin: 10px; padding: 15px; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #333;">\${user.name}</h3>
      <p><strong>Age:</strong> \${user.age}</p>
      <p><strong>City:</strong> \${user.city}</p>
      <p><strong>Hobbies:</strong> \${hobbiesText}</p>
    </div>
  \`;
};

// Set and Map examples
const uniqueCities = new Set(users.map(user => user.city));
const userMap = new Map(users.map(user => [user.id, user]));

console.log('Unique cities:', [...uniqueCities]);
console.log('User map:', userMap);

// Display everything
const root = document.getElementById('root');
root.innerHTML = \`
  <div style="padding: 20px; font-family: Arial;">
    <h2>🚀 Modern JavaScript Features</h2>
    <h3>User Cards:</h3>
    \${users.map(createUserCard).join('')}
    
    <h3>Statistics:</h3>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
      <p><strong>Total Users:</strong> \${users.length}</p>
      <p><strong>Average Age:</strong> \${(totalAge / users.length).toFixed(1)}</p>
      <p><strong>Cities:</strong> \${[...uniqueCities].join(', ')}</p>
      <p><strong>Young Users (&lt;30):</strong> \${youngUsers.length}</p>
    </div>
  </div>
\`;

console.log('🎨 Modern JavaScript demo completed!');`
};

const JSSandbox = () => {
    const [activeTab, setActiveTab] = useState('basic');  
    const [code, setCode] = useState(codeExamples[activeTab]);
    const [output, setOutput] = useState([]);
    const [selectedExample, setSelectedExample] = useState('basic');
    const [isRunning, setIsRunning] = useState(false);
    const iframeRef = useRef(null);
    
  /**
   * HTML và script cho iframe với khả năng tương thích cao hơn
   */
  const iframeSrcDoc = `
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 0;
            background: #fff;
          }
          #root { 
            padding: 10px; 
            min-height: 100vh;
            box-sizing: border-box;
          }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="module">
          const logs = [];
          const originalMethods = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
          };
          
          // Enhanced console methods
          const createLogHandler = (type, originalMethod, color) => (...args) => {
            const stringifiedArgs = args.map(arg => {
              if (arg === null) return 'null';
              if (arg === undefined) return 'undefined';
              if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg, null, 2);
                } catch (e) {
                  if (arg instanceof Error) {
                    return \`Error: \${arg.message}\`;
                  }
                  return '[Object (circular or non-serializable)]';
                }
              }
              return String(arg);
            });
            
            logs.push({ 
              type, 
              message: stringifiedArgs.join(' '),
              timestamp: new Date().toISOString()
            });
            originalMethod.apply(console, args);
          };

          console.log = createLogHandler('log', originalMethods.log);
          console.error = createLogHandler('error', originalMethods.error);
          console.warn = createLogHandler('warning', originalMethods.warn);
          console.info = createLogHandler('info', originalMethods.info);

          // Global error handlers
          window.addEventListener('error', (event) => {
            logs.push({
              type: 'error',
              message: event.error?.message || event.message || 'Unknown error',
              stack: event.error?.stack,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            });
          });

          window.addEventListener('unhandledrejection', (event) => {
            logs.push({
              type: 'error',
              message: 'Unhandled Promise Rejection: ' + (event.reason?.message || event.reason || 'Unknown reason'),
              stack: event.reason?.stack
            });
          });

          // Message handler for code execution
          window.addEventListener('message', async (event) => {
            if (!event.data || typeof event.data !== 'string') return;
            
            const userCode = event.data;
            logs.length = 0; // Clear previous logs
            
            try {
              // Clear the root element
              const root = document.getElementById('root');
              if (root) {
                root.innerHTML = '';
              }
              
              // Execute code in different ways based on content
              let codeToExecute = userCode;
              
              // Check if it's a simple expression or contains top-level await
              const hasTopLevelAwait = /\\bawait\\b.*(?!.*function|.*=>|.*\\{)/.test(userCode) && 
                                      !/^\\s*(?:async\\s+)?function/.test(userCode) &&
                                      !/(?:^|\\n)\\s*(?:async\\s+)?function/.test(userCode);
              
              if (hasTopLevelAwait || userCode.includes('import ') || userCode.includes('export ')) {
                // Use dynamic import for modern JS features
                const dataUrl = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(codeToExecute);
                await import(dataUrl);
              } else {
                // Use AsyncFunction for backward compatibility
                const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                const fn = new AsyncFunction(codeToExecute);
                await fn();
              }
              
            } catch (error) {
              logs.push({
                type: 'error',
                message: error.message || 'Unknown error occurred',
                stack: error.stack,
                name: error.name
              });
              originalMethods.error('Execution Error:', error);
            } finally {
              // Send logs back to parent
              event.source.postMessage(logs, event.origin);
            }
          });
          
          // Ready signal
          window.parent.postMessage({ type: 'ready' }, '*');
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source === iframeRef.current?.contentWindow) {
        if (event.data?.type === 'ready') {
          // Iframe is ready
          return;
        }
        setOutput(event.data || []);
        setIsRunning(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = iframeSrcDoc;
    }
  }, [iframeSrcDoc]);

  const handleRunCode = () => {
    if (iframeRef.current && !isRunning) {
      setIsRunning(true);
      setOutput([{ type: 'info', message: 'Running code...' }]);
      
      // Reset iframe
      iframeRef.current.srcdoc = iframeSrcDoc;
      
      // Send code after iframe loads
      iframeRef.current.onload = () => {
        setTimeout(() => {
          iframeRef.current.contentWindow.postMessage(code, '*');
        }, 100);
      };
    }
  };

  const handleClear = () => {
    setOutput([]);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = iframeSrcDoc;
    }
  };

  const handleExampleChange = (example) => {
    setSelectedExample(example);
    setCode(codeExamples[example]);
    setOutput([]);
  };

  const getLogStyle = (type) => {
    switch (type) {
      case 'error': return styles.error;
      case 'warning': return styles.warning;
      case 'info': return styles.info;
      case 'log': 
      default: return {};
    }
  };
  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setCode(codeExamples[tabKey]);
    setOutput([]); // Xóa output cũ khi chuyển tab
  };
  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Code Editor */}
        <div style={styles.editorWrapper}>
          <div style={styles.header}>
            <span>JavaScript Editor</span>
            <div>
              {/* Bỏ <select> ở đây */}
              <button 
                onClick={handleRunCode} 
                style={{
                  ...styles.runButton,
                  opacity: isRunning ? 0.6 : 1,
                  cursor: isRunning ? 'not-allowed' : 'pointer'
                }} // giữ nguyên
                disabled={isRunning}
              >
                {isRunning ? '⏳ Running...' : '▶ Run'}
              </button>
              <button onClick={handleClear} style={styles.clearButton}>🗑 Clear</button>
            </div>
          </div>

          {/* === THAY ĐỔI: Thêm CodeTabs vào đây === */}
          <CodeTabs 
            examples={codeExamples}
            activeTab={activeTab}
            onTabClick={handleTabClick}
          />
          
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={styles.textarea}
            // ... (giữ nguyên)
          />
        </div>
        
        {/* Preview Panel */}
        <div style={styles.previewWrapper}>
          <div style={styles.header}>
            <span>Live Preview</span>
          </div>
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts allow-same-origin"
            style={styles.iframe}
            title="JS Sandbox Preview"
          />
        </div>
      </div>
      
      {/* Console Output */}
      <div style={styles.output}>
        {output.length > 0 ? (
          output.map((line, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <span style={getLogStyle(line.type)}>
                {line.type === 'error' ? '❌' : 
                 line.type === 'warning' ? '⚠️' : 
                 line.type === 'info' ? 'ℹ️' : '▶'} {line.message}
              </span>
              {line.stack && (
                <div style={styles.errorStack}>
                  {line.stack.split('\n').slice(0, 3).join('\n')}
                </div>
              )}
            </div>
          ))
        ) : (
          <span style={{ color: '#888' }}>
            💡 Console output will appear here. Try running some code!
          </span>
        )}
      </div>
    </div>
  );
};

export default JSSandbox;