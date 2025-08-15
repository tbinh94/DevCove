// src/components/admin/ChallengeGenerator.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import apiService from '../../services/api';
import styles from './ChallengeGenerator.module.css'; // Tạo file CSS này
import ReactMarkdown from 'react-markdown';
const ChallengeGenerator = () => {
    const navigate = useNavigate(); // Khởi tạo hook
    const [topic, setTopic] = useState('');
    const [generatedChallenge, setGeneratedChallenge] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false); // State mới
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); 

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedChallenge(null);

        try {
            const data = await apiService.generateAiChallenge({ topic });
            setGeneratedChallenge(data);
        } catch (err) {
            const errorMessage = err.data?.error || err.message || 'Failed to generate challenge.';
            setError(errorMessage);
            // Nếu có raw_response, log ra để debug
            if (err.data?.raw_response) {
                console.error("Raw response from AI:", err.data.raw_response);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!generatedChallenge) return;

        setIsPublishing(true);
        setError('');
        setSuccessMessage('');

        try {
            // ✅ SỬA Ở ĐÂY: Gộp `topic` vào dữ liệu gửi đi
            const dataToPublish = {
                ...generatedChallenge, // Dữ liệu từ AI
                topic: topic,          // Thêm topic gốc do admin nhập
            };

            const publishedChallenge = await apiService.publishChallenge(dataToPublish);
            
            setSuccessMessage(`Challenge "${publishedChallenge.title}" published successfully! Redirecting...`);
            
            setGeneratedChallenge(null);
            setTopic('');

            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (err) {
            const errorMessage = err.data?.error || err.message || 'Failed to publish challenge.';
            setError(errorMessage);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>AI Auto Challenge Generator</h1>
                <p>Enter a topic (e.g., "Python decorators", "async JavaScript", "binary search") and let AI create a challenge for you.</p>
            </div>
            
            <div className={styles.form}>
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter challenge topic..."
                    className={styles.input}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button onClick={handleGenerate} disabled={isLoading} className={styles.button}>
                    {isLoading ? 'Generating...' : 'Generate ✨'}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {generatedChallenge && (
                <div className={styles.results}>
                    <h2>Generated Challenge Preview</h2>
                    <h3 className={styles.challengeTitle}>{generatedChallenge.title}</h3>
                    
                    <h4>Description</h4>
                    <div className={styles.prose}>
                        <ReactMarkdown>
                            {generatedChallenge.description}
                        </ReactMarkdown>
                    </div>
                    <h4>Solution Code (Python)</h4>
                    <pre className={styles.codeBlock}>{generatedChallenge.solution_code}</pre>
                    
                    <h4>Test Cases</h4>
                    <pre className={styles.codeBlock}>
                        {JSON.stringify(generatedChallenge.test_cases, null, 2)}
                    </pre>

                    <button 
                      onClick={handlePublish} 
                      className={`${styles.button} ${styles.publishButton}`}
                      disabled={isPublishing} // Disable nút khi đang publish
                    >
                        {isPublishing ? 'Publishing...' : 'Looks Good, Publish as Weekly Challenge!'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChallengeGenerator;