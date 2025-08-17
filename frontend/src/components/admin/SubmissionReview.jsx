// Ở phía Admin, chúng ta sẽ tạo một trang để review các bài nộp của người dùng
// Trang này sẽ hiển thị thông tin bài nộp, challenge liên quan và cho phép admin phê duyệt hoặc từ chối bài nộp
// src/components/admin/SubmissionReview.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
// ✅ 1. IMPORT THÊM ICON MỚI
import { CheckCircle, XCircle, User, Clock, BrainCircuit } from 'lucide-react';
import apiService from '../../services/api';
import styles from './SubmissionReview.module.css';

const SubmissionReview = () => {
    const { submissionId } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    
    // ✅ 2. THÊM STATE MỚI ĐỂ QUẢN LÝ VIỆC HIỂN THỊ SOLUTION CỦA AI
    const [showAiSolution, setShowAiSolution] = useState(false);

    useEffect(() => {
        const fetchSubmission = async () => {
            if (!submissionId) return;
            setLoading(true);
            try {
                const data = await apiService.getSubmissionDetail(submissionId);
                setSubmission(data);
            } catch (err) {
                setError(err.message || 'Failed to load submission.');
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission();
    }, [submissionId]);

    const handleUpdateStatus = async (status) => {
        setIsUpdating(true);
        try {
            const updatedSubmission = await apiService.updateSubmissionStatus(submissionId, {
                status: status,
                feedback: feedback,
            });
            setSubmission(updatedSubmission);
        } catch (err) {
            alert('Failed to update status. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) return <div className={styles.statusMessage}>Loading submission...</div>;
    if (error) return <div className={styles.statusMessage} style={{color: 'red'}}>{error}</div>;
    if (!submission) return <div className={styles.statusMessage}>Submission not found.</div>;

    const challengeDetails = submission.challenge_details;
    
    if (!challengeDetails) {
        return <div className={styles.statusMessage} style={{color: 'orange'}}>Submission data is incomplete. Missing challenge details.</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.mainTitle}>Review Submission</h1>
            <div className={styles.metaInfo}>
                <span><User size={16} /> Submitted by: <strong>{submission.user.username}</strong></span>
                <span><Clock size={16} /> On: {new Date(submission.submitted_at).toLocaleString()}</span>
                <span>Status: <strong className={styles[submission.status]}>{submission.status}</strong></span>
            </div>

            <div className={styles.reviewLayout}>
                {/* Cột Trái: Thông tin Challenge */}
                <div className={styles.challengeInfo}>
                    <h2>Challenge: {challengeDetails.title}</h2>
                    <div className={styles.description}>
                        <ReactMarkdown>{challengeDetails.description}</ReactMarkdown>
                    </div>
                    
                    {showAiSolution ? (
                        <div>
                            <h4>Solution provided by AI</h4>
                            <pre className={styles.codeBlock}>{challengeDetails.solution_code}</pre>
                        </div>
                    ) : (
                        <button 
                            className={`${styles.button} ${styles.aiButton}`}
                            onClick={() => setShowAiSolution(true)}
                        >
                            <BrainCircuit size={18} /> Show AI Solution
                        </button>
                    )}
                </div>

                {/* ✅ CỘT PHẢI: THÊM LẠI TOÀN BỘ NỘI DUNG ĐÃ MẤT */}
                <div className={styles.submissionPanel}>
                    <h2>User's Solution ({submission.language})</h2>
                    <pre className={styles.codeBlock}>{submission.submitted_code}</pre>
                    
                    <div className={styles.feedbackSection}>
                        <h3>Feedback (Optional)</h3>
                        <textarea
                            className={styles.feedbackInput}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Provide constructive feedback to the user..."
                            rows="4"
                            disabled={isUpdating}
                        />
                    </div>
                    
                    <div className={styles.actionButtons}>
                        <button 
                            className={`${styles.button} ${styles.reject}`}
                            onClick={() => handleUpdateStatus('rejected')}
                            disabled={isUpdating || submission.status === 'rejected'}
                        >
                            <XCircle size={18} /> Reject
                        </button>
                        <button 
                            className={`${styles.button} ${styles.approve}`}
                            onClick={() => handleUpdateStatus('approved')}
                            disabled={isUpdating || submission.status === 'approved'}
                        >
                            <CheckCircle size={18} /> Approve
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default SubmissionReview;