// src/components/ChallengeCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Pin } from 'lucide-react';
import styles from './ChallengeCard.module.css'; // Sẽ tạo file CSS này
import ReactMarkdown from 'react-markdown';

const ChallengeCard = ({ challenge }) => {
    if (!challenge) return null;

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
                        <p className={styles.meta}>Posted by Admin on {new Date(challenge.published_at).toLocaleDateString()}</p>
                    </div>
                </div>
                 <p className={styles.description}>
                {/* ✅ SỬA Ở ĐÂY: Hiển thị đầy đủ description thay vì "..." */}
                    <ReactMarkdown>
                        {challenge.description}
                    </ReactMarkdown>
                </p>
                {/* ✅ SỬA LINK Ở ĐÂY */}
                <Link to={`/challenges/${challenge.id}`} className={styles.ctaButton}>
                    View Challenge & Submit
                </Link>
            </div>
        </div>
    );
};

export default ChallengeCard;