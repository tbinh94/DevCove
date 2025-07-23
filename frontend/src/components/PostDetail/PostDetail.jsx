// PostDetail.jsx - Modern Blue Theme Design with Image Modal

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Share2, Bookmark, ChevronUp, ChevronDown, Heart, Eye, Clock, X, ZoomIn, Tag, Trash2, CheckCircle } from 'lucide-react';
import styles from './PostDetail.module.css';
import apiService from '../../services/api'; 
import { useAuth } from '../../contexts/AuthContext';
import DOMPurify from 'dompurify';

const PostDetail = () => {
    const { postId } = useParams();
    const {user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    // const [comments, setComments] = useState([]); // Không cần dùng nữa vì comment nằm trong post
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [botLoading, setBotLoading] = useState(false);
    const [botError, setBotError]   = useState(null);

    // delete modal
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Define copy functionality globally
    useEffect(() => {
        const script = document.createElement('script');
        script.textContent = `
            function copyCode(elementId) {
                const element = document.getElementById(elementId);
                const text = element.textContent || element.innerText;
                
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(function() {
                        showCopySuccess(elementId);
                    }).catch(function() {
                        fallbackCopyTextToClipboard(text, elementId);
                    });
                } else {
                    fallbackCopyTextToClipboard(text, elementId);
                }
            }
            
            function fallbackCopyTextToClipboard(text, elementId) {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    showCopySuccess(elementId);
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                }
                
                document.body.removeChild(textArea);
            }
            
            function showCopySuccess (elementId) {
                const codeBlock = document.getElementById(elementId).closest('.code-block-container');
                const copyBtn = codeBlock.querySelector('.copy-btn');
                const copyText = copyBtn.querySelector('.copy-text');
                const copyIcon = copyBtn.querySelector('.copy-icon');
                
                const originalText = copyText.textContent;
                const originalIcon = copyIcon.textContent;
                
                copyText.textContent = 'Copied!';
                copyIcon.textContent = '✅';
                copyBtn.classList.add('copied');
                
                setTimeout(() => {
                    copyText.textContent = originalText;
                    copyIcon.textContent = originalIcon;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }
        `;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!postId) return;
            setLoading(true);
            setError(null);
            try {
                // CHỈ CẦN 1 API CALL DUY NHẤT
                const postData = await apiService.getPost(postId);
                
                // Sắp xếp comment theo thứ tự mới nhất trước
                if (postData.comments) {
                    postData.comments.sort((a, b) => new Date(b.created_at || b.created) - new Date(a.created_at || a.created));
                }
                
                setPost(postData);
            } catch (err) {
                console.error('Error fetching post details:', err);
                setError(err.message || 'Failed to load post details.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [postId]);

    // Handle modal close on ESC key
    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape') setIsImageModalOpen(false);
        };
        if (isImageModalOpen) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [isImageModalOpen]);

    const handleVote = async (voteType) => {
        if (!isAuthenticated) {
            // Có thể chuyển hướng đến trang login
            alert("You must be logged in to vote.");
            return;
        }
        const originalVote = post.user_vote;
        const originalScore = post.calculated_score;

        // Optimistic update
        let newVoteStatus = voteType;
        let newScore = originalScore;
        if (originalVote === voteType) { // Un-voting
            newVoteStatus = null;
            newScore += (voteType === 'up' ? -1 : 1);
        } else if (originalVote) { // Changing vote
            newScore += (voteType === 'up' ? 2 : -2);
        } else { // New vote
            newScore += (voteType === 'up' ? 1 : -1);
        }
        setPost(p => ({...p, user_vote: newVoteStatus, calculated_score: newScore}));

        try {
            // API call trả về score chính xác từ server
            const data = await apiService.vote(post.id, voteType);
            setPost(prevPost => ({
                ...prevPost,
                calculated_score: data.score, // Cập nhật score từ server
                // Cập nhật lại vote status dựa trên action trả về
                user_vote: data.action === 'removed' ? null : voteType,
            }));
        } catch (err) {
            // Rollback on error
            setPost(p => ({...p, user_vote: originalVote, calculated_score: originalScore}));
            console.error('Vote error:', err);
            alert(err.message || "An error occurred while voting.");
        }
    };
    
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !isAuthenticated) return;
        
        setIsSubmitting(true);
        try {
            const newCommentData = await apiService.createComment({
                post: postId,
                text: newComment 
            });

            // Cập nhật lại state post để thêm comment mới
            setPost(prevPost => ({
                ...prevPost,
                comments: [newCommentData, ...prevPost.comments]
            }));
            setNewComment('');
        } catch (err) {
            console.error('Comment error:', err);
            alert(err.message || "Failed to post comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBookmark = () => {
        // TODO: Implement API call to save bookmark on the server
        setIsBookmarked(!isBookmarked);
        alert("Bookmark feature is in development!");
    };

    const handleDeletePost = async () => {
        setShowDeleteConfirm(true);
    };

    const handleDeletePostConfirm = async () => {
        setShowDeleteConfirm(false); // Đóng modal xác nhận

        try {
            await apiService.deletePost(postId);
            setShowSuccessModal(true); // Hiển thị modal thông báo thành công
            setTimeout(() => {
                setShowSuccessModal(false); // Ẩn modal sau 2 giây
                navigate('/'); // Chuyển hướng về trang chủ
            }, 2000); // Thời gian hiển thị modal thành công
        } catch (err) {
            console.error('Failed to delete post:', err);
            alert(err.message || 'An error occurred while deleting the post.'); // Giữ alert tạm thời cho lỗi, có thể cải thiện sau
        }
    };

    const openImageModal = () => {
        setIsImageModalOpen(true);
    };

    const closeImageModal = () => {
        setIsImageModalOpen(false);
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const past = new Date(dateString);
        const diffInSeconds = Math.floor((now - past) / 1000);
        
        if (diffInSeconds < 60) return "just now";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const days = Math.floor(diffInHours / 24);
        return `${days}d ago`;
    };

    // chatbot
    const handleAskBot = async () => {
        if (botLoading) return;
        setBotLoading(true);
        setBotError(null);

        try {
            // This API call now returns the created bot comment directly
            const newBotComment = await apiService.askBot(post.id);

            // Add the new bot comment to the top of the comments list
            setPost(prev => ({
                ...prev,
                comments: [newBotComment, ...prev.comments],
                // Cập nhật các trường bot review sau khi bot comment mới được thêm
                is_bot_reviewed: true,
                bot_reviews_count: (prev.bot_reviews_count || 0) + 1,
                latest_bot_review_date: new Date().toISOString(), // Hoặc lấy từ newBotComment.created_at
                bot_review_summary: newBotComment.text.slice(0, 100) + "..."
            }));
        } catch (err) {
            console.error('AskBot error:', err);
            const errorMessage = err.response?.data?.error || err.message || "An error occurred while asking the bot.";
            setBotError(errorMessage);
        } finally {
            setBotLoading(false);
        }
    };


    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingText}>Loading post...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorIcon}>⚠️</div>
                <h3 className={styles.errorTitle}>Something went wrong</h3>
                <p className={styles.errorMessage}>{error}</p>
            </div>
        );
    }
    
    if (!post) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorIcon}>🔍</div>
                <h3 className={styles.errorTitle}>Post not found</h3>
                <p className={styles.errorMessage}>The post you're looking for doesn't exist.</p>
            </div>
        );
    }

    const isOwner = isAuthenticated && user?.id === post?.author?.id;
    const comments = post.comments || [];

    return (
        <div className={styles.container}>
            <div className={styles.maxWidth}>
                {/* Main Post Card */}
                <div className={styles.postCard}>
                    {/* Post Header */}
                    <div className={styles.postHeader}>
                        <div className={styles.postHeaderContent}>
                            <h1 className={styles.postTitle}>
                                {post.title}
                                {post.is_bot_reviewed && (
                                  <span 
                                    className={styles.botReviewedBadgeDetail} 
                                    title={`This post has been reviewed by the bot ${post.bot_reviews_count} time(s). Latest review: ${formatTimeAgo(post.latest_bot_review_date)} - "${post.bot_review_summary}"`}
                                  >
                                    🤖 Reviewed ({post.bot_reviews_count})
                                  </span>
                                )}
                            </h1>
                            <div className={styles.postMeta}>
                                <div className={styles.authorInfo}>
                                    <div className={styles.authorAvatar}>
                                        {post.author?.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className={styles.authorDetails}>
                                        <span className={styles.authorName}>
                                            {post.author?.username || 'Unknown'}
                                        </span>
                                        <div className={styles.postStats}>
                                            <span className={styles.statItem}>
                                                <Clock size={12} />
                                                {formatTimeAgo(post.created_at)}
                                            </span>
                                            <span className={styles.statItem}>
                                                <Eye size={12} />
                                                {post.views || 0} views
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Post Image */}
                    {post.image_url && (
                        <div className={styles.postImageContainer}>
                            <div className={styles.postImageWrapper} onClick={openImageModal}>
                                <img src={post.image_url} alt={post.title} className={styles.postImage} />
                                <div className={styles.imageOverlay}>
                                    <div className={styles.zoomIcon}>
                                        <ZoomIn size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Post Content */}
                    {post.content && (
                        <div className={styles.postContent}>
                            <div className={styles.contentText}>
                                {DOMPurify.sanitize(post.content)}
                            </div>
                        </div>
                    )}
                    
                    {/* Post Tags */}
                    {/* fix lỗi khi click tag để filter */}
                    {post.tags && post.tags.length > 0 && (
                        <div className={styles.tagsContainer}>
                            <Tag size={16} className={styles.tagIcon} />
                            {post.tags.map((tag, index) => {
                                // Lấy tên tag, dù tag là string hay object
                                const tagName = typeof tag === 'object' ? tag.name : tag.toString();
                                
                                // Tạo slug từ name nếu slug không tồn tại, và chuyển thành chữ thường
                                const tagSlug = (tag.slug || tagName).toLowerCase().replace(/\s+/g, '-');

                                return (
                                    <Link to={`/?tags=${tagSlug}`} key={tag.id || index} className={styles.tagItem}>
                                        {tagName}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Post Actions */}
                    <div className={styles.postActions}>
                        <div className={styles.leftActions}>
                            <div className={styles.voteSection}>
                                <button 
                                    onClick={() => handleVote('up')} 
                                    className={`${styles.voteButton} ${styles.upvote} ${post.user_vote === 'up' ? styles.active : ''}`}
                                >
                                    <ChevronUp size={18} />
                                </button>
                                <span className={styles.voteScore}>{post.calculated_score || 0}</span>
                                <button 
                                    onClick={() => handleVote('down')} 
                                    className={`${styles.voteButton} ${styles.downvote} ${post.user_vote === 'down' ? styles.active : ''}`}
                                >
                                    <ChevronDown size={18} />
                                </button>
                            </div>
                            
                            <button className={styles.actionButton}>
                                <MessageCircle size={16} />
                                <span>{comments.length}</span>
                            </button>

                            <button
                                onClick={handleAskBot}
                                disabled={botLoading || !isAuthenticated}
                                className={styles.actionButton}
                                title={!isAuthenticated ? "You must be logged in to use the bot" : "Ask AI to review the code"}
                                style={{ marginLeft: '1rem' }}
                            >
                                {botLoading ? '🤖 Reviewing...' : '🤖 Ask Bot'}
                            </button>
                            {botError && (
                                <div className={styles.botError}>
                                    {botError}
                                </div>
                            )}
                        </div>
                        
                        <div className={styles.rightActions}>
                            {isOwner && (
                                <button
                                    onClick={handleDeletePost}
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    title="Delete Post"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button 
                                onClick={handleBookmark}
                                className={`${styles.actionButton} ${isBookmarked ? styles.bookmarked : ''}`}
                            >
                                <Bookmark size={16} />
                            </button>
                            <button className={styles.actionButton}>
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className={styles.commentsSection}>
                    <div className={styles.commentsHeader}>
                        <h2 className={styles.commentsTitle}>
                            Comments ({post.comments?.length || 0})
                        </h2>
                    </div>
                    
                    {/* Comment Form */}
                    {isAuthenticated ? (
                        <div className={styles.commentFormContainer}>
                            <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                                <div className={styles.commentInputWrapper}>
                                    <textarea 
                                        value={newComment} 
                                        onChange={(e) => setNewComment(e.target.value)} 
                                        placeholder="Share your thoughts..." 
                                        className={styles.commentTextarea} 
                                        required 
                                    />
                                    <div className={styles.commentFormActions}>
                                        <button 
                                            type="submit" 
                                            className={styles.commentSubmitButton} 
                                            disabled={isSubmitting || !newComment.trim()}
                                        >
                                            {isSubmitting ? (
                                                <div className={styles.buttonSpinner}></div>
                                            ) : (
                                                'Post Comment'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className={styles.loginPrompt}>
                            <p>
                                <Link to="/login" className={styles.loginLink}>Sign in</Link> to join the conversation
                            </p>
                        </div>
                    )}
                    
                    {/* Comments List */}
                    {/* Comments List */}
                    <div className={styles.commentsList}>
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className={`${styles.commentItem} ${comment.is_bot ? styles.botComment : ''}`}
                                >
                                    <div className={styles.commentHeader}>
                                        <div className={styles.commentAuthor}>
                                            <div className={styles.commentAvatar}>
                                                {comment.author?.username?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className={styles.commentAuthorInfo}>
                                                <span className={styles.commentAuthorName}>
                                                    {comment.is_bot ? '🤖 DevAlly Bot' : (comment.author?.username || 'Unknown')}
                                                </span>
                                                <span className={styles.commentTime}>
                                                    {formatTimeAgo(comment.created_at || comment.created)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.commentContent}>
                                        {comment.is_bot ? (
                                            <div
                                                className={styles.commentText}
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.text) }}
                                            />
                                        ) : (
                                            <p className={styles.commentText}>{comment.text}</p>
                                        )}
                                        {!comment.is_bot && (
                                            <div className={styles.commentActions}>
                                                <button className={styles.commentActionButton}>
                                                    <Heart size={12} />
                                                    <span>Like</span>
                                                </button>
                                                <button className={styles.commentActionButton}>
                                                    <MessageCircle size={12} />
                                                    <span>Reply</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.noComments}>
                                <div className={styles.noCommentsIcon}>💬</div>
                                <h3 className={styles.noCommentsTitle}>No comments yet</h3>
                                <p className={styles.noCommentsText}>Be the first to share your thoughts!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className={styles.deleteConfirmModalOverlay}>
                    <div className={styles.deleteConfirmModal}>
                        <h3 className={styles.deleteConfirmTitle}>Confirm Deletion</h3>
                        <p className={styles.deleteConfirmMessage}>Are you sure you want to delete this post? This action cannot be undone.</p>
                        <div className={styles.deleteConfirmActions}>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)} 
                                className={styles.deleteConfirmCancel}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeletePostConfirm} 
                                className={styles.deleteConfirmButton}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Notification Modal */}
            {showSuccessModal && (
                <div className={styles.successModalOverlay}>
                    <div className={styles.successModal}>
                        <CheckCircle size={48} className={styles.successIcon} />
                        <h3 className={styles.successTitle}>Success!</h3>
                        <p className={styles.successMessage}>Your post has been deleted successfully.</p>
                    </div>
                </div>
            )}
            {/* Image Modal */}
            {isImageModalOpen && post.image_url && (
                <div className={styles.imageModal} onClick={closeImageModal}>
                    <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={closeImageModal}>
                            <X size={24} />
                        </button>
                        <div className={styles.imageModalWrapper}>
                            <img 
                                src={post.image_url} 
                                alt={post.title} 
                                className={styles.modalImage} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostDetail;