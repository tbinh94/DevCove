// Ở phía user, chúng ta sẽ tạo một component để hiển thị trạng thái bài nộp của họ
// Component này sẽ hiển thị trạng thái (đã phê duyệt, cần cải thiện, đang chờ review)
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import styles from './SubmissionStatus.module.css';

const SubmissionStatus = ({ submission }) => {
    if (!submission) return null;

    const getStatusInfo = (status) => {
        switch (status) {
            case 'approved':
                return { icon: <CheckCircle />, text: 'Approved', className: styles.approved };
            case 'rejected':
                return { icon: <XCircle />, text: 'Needs Improvement', className: styles.rejected };
            default:
                return { icon: <Clock />, text: 'Pending Review', className: styles.pending };
        }
    };

    const statusInfo = getStatusInfo(submission.status);

    return (
        <div className={`${styles.container} ${statusInfo.className}`}>
            <div className={styles.header}>
                <div className={styles.statusIcon}>{statusInfo.icon}</div>
                <h3 className={styles.statusText}>Your Submission: {statusInfo.text}</h3>
            </div>
            {submission.feedback && (
                <div className={styles.feedback}>
                    <p className={styles.feedbackTitle}>Admin's Feedback:</p>
                    <blockquote className={styles.feedbackContent}>
                        {submission.feedback}
                    </blockquote>
                </div>
            )}
            <p className={styles.submittedAt}>Submitted on {new Date(submission.submitted_at).toLocaleString()}</p>
        </div>
    );
};

export default SubmissionStatus;