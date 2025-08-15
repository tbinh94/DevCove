// src/components/ChallengeCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Pin } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // Đảm bảo đã import
import styles from './ChallengeCard.module.css';

const ChallengeCard = ({ challenge }) => {
    if (!challenge) return null;

    // Trích xuất một đoạn mô tả ngắn cho preview
    // Tìm dòng đầu tiên sau "## Problem" hoặc dòng đầu tiên của mô tả
    const getShortDescription = (desc) => {
        if (!desc) return '';
        const lines = desc.split('\n');
        let contentStarted = false;
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (contentStarted && trimmedLine.length > 10) {
                return trimmedLine.substring(0, 250) + (trimmedLine.length > 250 ? '...' : '');
            }
            if (trimmedLine.toLowerCase().includes('problem')) {
                contentStarted = true;
            }
        }
        // Fallback: lấy 250 ký tự đầu tiên
        return desc.substring(0, 250) + (desc.length > 250 ? '...' : '');
    };

    return (
        <div className={`${styles.card} ${styles.pinned}`}>
            <div className={styles.pinIcon}>
                <Pin size={16} /> Pinned
            </div>
            <div className={styles.contentArea}>
                <div className={styles.header}>
                    <Trophy size={24} className={styles.trophyIcon} />
                    <div>
                        <h3 className={styles.title}>Weekly Challenge: {challenge.title}</h3>
                        <p className={styles.meta}>Posted by {challenge.created_by.username} on {new Date(challenge.published_at).toLocaleDateString()}</p>
                    </div>
                </div>
                
                {/* ✅ THAY ĐỔI TỪ <p> SANG <div> */}
                <div className={styles.description}>
                    {getShortDescription(challenge.description)}
                </div>

                <Link to={`/challenges/${challenge.id}`} className={styles.ctaButton}>
                    View Challenge Detail & Submit
                </Link>
            </div>
        </div>
    );
};

export default ChallengeCard;