import React from 'react';
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
export default AiDiffViewer;
