// PostDetail.jsx - Modern Blue Theme Design with Image Modal

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Share2, Bookmark, Edit3, Trash2, ChevronUp, ChevronDown, Heart, Eye, Clock, X, ZoomIn, Tag } from 'lucide-react';
import styles from './PostDetail.module.css';
import apiService from '../../services/api'; 
import { useAuth } from '../../contexts/AuthContext';

const PostDetail = () => {
    const { postId } = useParams();
    const {user, isAuthenticated } = useAuth();
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

    const comments = post.comments || [];

    return (
        <div className={styles.container}>
            <div className={styles.maxWidth}>
                {/* Main Post Card */}
                <div className={styles.postCard}>
                    {/* Post Header */}
                    <div className={styles.postHeader}>
                        <div className={styles.postHeaderContent}>
                            <h1 className={styles.postTitle}>{post.title}</h1>
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
                                {post.content}
                            </div>
                        </div>
                    )}
                    
                    {/* Post Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className={styles.tagsContainer}>
                            <Tag size={16} className={styles.tagIcon} />
                            {post.tags.map(tag => (
                                <Link to={`/tags/${tag.slug}`} key={tag.id} className={styles.tagItem}>
                                    {tag.name}
                                </Link>
                            ))}
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
                    <div className={styles.commentsList}>
                        {comments.length > 0 ? (
                            // START OF MODIFIED SECTION
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
                                                    {formatTimeAgo(comment.created_at || comment.created)} {/* Sử dụng created_at hoặc created */}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.commentContent}>
                                        <p className={styles.commentText}>{comment.text}</p>
                                        {!comment.is_bot && ( // Chỉ hiển thị action cho comment của người dùng
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
                            // END OF MODIFIED SECTION
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