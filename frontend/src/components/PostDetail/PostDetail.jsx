// PostDetail.jsx - Modern Blue Theme Design with Image Modal

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Share2, Bookmark, Edit3, Trash2, ChevronUp, ChevronDown, Heart, Eye, Clock, X, ZoomIn } from 'lucide-react';
import styles from './PostDetail.module.css';
import apiService from '../../services/api'; 
import { useAuth } from '../../contexts/AuthContext';

const PostDetail = () => {
    const { postId } = useParams();
    const { isAuthenticated } = useAuth();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    useEffect(() => {
        console.log('PostDetail mounted with postId:', postId);
        const fetchData = async () => {
            if (!postId) return;
            setLoading(true);
            setError(null);
            try {
                console.log('Fetching post:', postId);

                const [postData, commentsData] = await Promise.all([
                    apiService.getPost(postId),
                    apiService.getCommentsForPost(postId) 
                ]);
                console.log('Post data:', postData);
                console.log('Comments data:', commentsData);
                setPost(postData);
                setComments(Array.isArray(commentsData) ? commentsData : commentsData.results || []);

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
            if (e.key === 'Escape' && isImageModalOpen) {
                setIsImageModalOpen(false);
            }
        };
        
        if (isImageModalOpen) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden'; // Prevent body scroll
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [isImageModalOpen]);

    const handleVote = async (voteType) => {
        if (!isAuthenticated) {
            alert("You must be logged in to vote.");
            return;
        }
        try {
            const data = await apiService.vote(post.id, voteType);
            
            setPost(prevPost => ({
                ...prevPost,
                calculated_score: data.score,
                user_vote: data.user_vote 
            }));
        } catch (err) {
            console.error('Vote error:', err);
            alert(err.message || "An error occurred while voting.");
        }
    };
    
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !isAuthenticated) {
            if (!isAuthenticated) alert("Please log in to comment.");
            return;
        }
        setIsSubmitting(true);
        try {
            const commentData = await apiService.createComment({
                post: postId,
                text: newComment 
            });

            setComments(prevComments => [commentData, ...prevComments]);
            setNewComment('');
        } catch (err) {
            console.error('Comment error:', err);
            alert(err.message || "Failed to post comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBookmark = () => {
        if (!isAuthenticated) {
            alert("You must be logged in to bookmark.");
            return;
        }
        setIsBookmarked(!isBookmarked);
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
        const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return "just now";
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const days = Math.floor(diffInHours / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
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
                            Comments ({comments.length})
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
                            comments.map((comment) => (
                                <div key={comment.id} className={styles.commentItem}>
                                    <div className={styles.commentHeader}>
                                        <div className={styles.commentAuthor}>
                                            <div className={styles.commentAvatar}>
                                                {comment.author?.username?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className={styles.commentAuthorInfo}>
                                                <span className={styles.commentAuthorName}>
                                                    {comment.author?.username || 'Unknown'}
                                                </span>
                                                <span className={styles.commentTime}>
                                                    {formatTimeAgo(comment.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.commentContent}>
                                        <p className={styles.commentText}>{comment.text}</p>
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