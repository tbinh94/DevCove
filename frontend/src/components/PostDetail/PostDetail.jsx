import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { MessageCircle, Bot, Share2, Bookmark, ChevronUp, ChevronDown, Heart, Eye, Clock, X, ZoomIn, Tag, Trash2, CheckCircle, EyeOff } from 'lucide-react';
import styles from './PostDetail.module.css';
import apiService from '../../services/api'; 
import { useAuth } from '../../contexts/AuthContext';
import DOMPurify from 'dompurify';
import BotChatInterface from './BotChatInterface';

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const PostDetail = () => {
    const { postId } = useParams();
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const [botLoading, setBotLoading] = useState(false);
    const [botError, setBotError] = useState(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [latestBotResponse, setLatestBotResponse] = useState(null);
    const [latestBotCommentId, setLatestBotCommentId] = useState(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    const [showBotComments, setShowBotComments] = useState(true);

    const outletContext = useOutletContext(); 

    useEffect(() => {
        const handleCommentAreaClick = (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;

            const { action, targetId } = button.dataset;
            if (!action || !targetId) return;

            const codeTag = document.getElementById(targetId);
            if (!codeTag) {
                console.error(`Element with ID "${targetId}" not found for action "${action}".`);
                return;
            }

            // LOGIC FOR THE COPY BUTTON
            if (action === 'copy') {
                navigator.clipboard.writeText(codeTag.innerText).then(() => {
                    // FIX: Use correct selectors (.btn-icon, .btn-text)
                    const iconSpan = button.querySelector('.btn-icon');
                    const textSpan = button.querySelector('.btn-text');
                    if (!textSpan || !iconSpan) return;

                    const originalIcon = iconSpan.innerHTML;
                    const originalText = textSpan.textContent;

                    iconSpan.innerHTML = '✓';
                    textSpan.textContent = 'Copied';
                    button.classList.add('copied');

                    setTimeout(() => {
                        iconSpan.innerHTML = originalIcon;
                        textSpan.textContent = originalText;
                        button.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
            // Logic for the Run button (already works correctly)
            if (action === 'run') {
                const codeText = codeTag.innerText;
                
                const container = button.closest('.code-block-container');
                const langElement = container?.querySelector('.code-language');
                const language = langElement ? langElement.textContent.toLowerCase() : 'javascript';
                
                try {
                    sessionStorage.setItem('sandbox_code', codeText);
                    sessionStorage.setItem('sandbox_language', language); // Can send the language so the sandbox knows how to run it
                    window.open('/sandbox', '_blank'); // open sandbox runner in a new tab

                } catch (err) {
                    console.error('Failed to prepare sandbox run:', err);
                    alert('Could not open the sandbox. Please check the console for errors.');
                }
            }
        };

        const commentContainer = document.getElementById('comments-list-container');
        if (commentContainer) {
            commentContainer.addEventListener('click', handleCommentAreaClick);
        }

        return () => {
            if (commentContainer) {
                commentContainer.removeEventListener('click', handleCommentAreaClick);
            }
        };
    }, [post?.comments]);

    useEffect(() => {
        const fetchData = async () => {
            if (!postId) return;
            setLoading(true);
            setError(null);
            try {
                const postData = await apiService.getPost(postId);
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

    useEffect(() => {
        const isAnyModalOpen = isImageModalOpen || isChatModalOpen;

        if (outletContext && typeof outletContext.setBodyScrollLock === 'function') {
            outletContext.setBodyScrollLock(isAnyModalOpen);
        }

        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                if (isImageModalOpen) setIsImageModalOpen(false);
                if (isChatModalOpen) handleCloseChatModal();
            }
        };

        if (isAnyModalOpen) {
            document.addEventListener('keydown', handleEscKey);
        }

        // The cleanup function must also check
        return () => {
            document.removeEventListener('keydown', handleEscKey);
            if (outletContext && typeof outletContext.setBodyScrollLock === 'function') {
                outletContext.setBodyScrollLock(false);
            }
        };
    // FIX 3: Add outletContext to the dependencies array
    }, [isImageModalOpen, isChatModalOpen, outletContext]);
    
    const sanitizeBotComment = (commentText) => {
        return DOMPurify.sanitize(commentText, { 
            ADD_TAGS: ['style', 'button'],
            // Add data-action and data-target-id to the allowed list
            ADD_ATTR: ['class', 'id', 'title', 'style', 'data-action', 'data-target-id'],
        });
    };
    
    const handleVote = async (voteType) => {
        if (!isAuthenticated) return alert("You need to log in to vote.");
        
        const originalVote = post.user_vote;
        const originalScore = post.calculated_score;

        let newVoteStatus = voteType;
        let newScore = originalScore;
        
        if (originalVote === voteType) {
            newVoteStatus = null;
            newScore += (voteType === 'up' ? -1 : 1);
        } else if (originalVote) {
            newScore += (voteType === 'up' ? 2 : -2);
        } else {
            newScore += (voteType === 'up' ? 1 : -1);
        }
        
        setPost(p => ({ ...p, user_vote: newVoteStatus, calculated_score: newScore }));

        try {
            const data = await apiService.vote(post.id, voteType);
            setPost(prevPost => ({
                ...prevPost,
                calculated_score: data.score,
                user_vote: data.action === 'removed' ? null : voteType,
            }));
        } catch (err) {
            setPost(p => ({ ...p, user_vote: originalVote, calculated_score: originalScore }));
            console.error('Vote error:', err);
            alert(err.message || "An error occurred while voting.");
        }
    };
    
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        if (!isAuthenticated) return alert("You need to log in to comment.");
        
        setIsSubmitting(true);
        try {
            const newCommentData = await apiService.createComment({ post: postId, text: newComment });
            setPost(prevPost => ({ ...prevPost, comments: [newCommentData, ...prevPost.comments] }));
            setNewComment('');
        } catch (err) {
            console.error('Comment error:', err);
            alert(err.message || "Failed to post comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        alert("Bookmark feature is under development!");
    };

    const handleDeletePost = () => setShowDeleteConfirm(true);

    const handleDeletePostConfirm = async () => {
        setShowDeleteConfirm(false);
        try {
            await apiService.deletePost(postId);
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                navigate('/');
            }, 2000);
        } catch (err)
        {
            console.error('Failed to delete post:', err);
            alert(err.message || 'An error occurred while deleting the post.');
        }
    };

    const openImageModal = () => setIsImageModalOpen(true);
    const closeImageModal = () => setIsImageModalOpen(false);

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const past = new Date(dateString);
        const diffInSeconds = Math.floor((now - past) / 1000);
        
        if (diffInSeconds < 60) return "just now";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        const days = Math.floor(diffInHours / 24);
        return `${days} days ago`;
    };

    const handleSendBotMessage = async (promptText, promptType) => {
        setBotLoading(true);
        setBotError(null);
        setLatestBotResponse(null);

        try {
            const languageForBot = post.language || 'javascript'; 
            
            const payload = {
                prompt_type: promptType,
                prompt_text: promptText,
                language: languageForBot,
            };

            const newBotComment = await apiService.askBot(post.id, payload);

            if (newBotComment && newBotComment.text) {
                setPost(prev => ({
                    ...prev,
                    comments: [newBotComment, ...prev.comments],
                    is_bot_reviewed: true,
                    bot_reviews_count: (prev.bot_reviews_count || 0) + 1,
                    latest_bot_review_date: new Date().toISOString(),
                }));
                setLatestBotCommentId(newBotComment.id);
                setTimeout(() => {
                    setIsChatModalOpen(false);
                    setBotError(null);
                    setLatestBotResponse(null);
                }, 500);
            } else {
                throw new Error('Invalid response from bot service');
            }
        } catch (err) {
            console.error('Bot message error:', err);
            const errorMessage = err.response?.data?.error ||
                                 err.response?.data?.message ||
                                 err.message ||
                                 "An error occurred while asking the bot.";
            setBotError(errorMessage);
            setLatestBotResponse(null);
        } finally {
            setBotLoading(false);
        }
    };

    useEffect(() => {
        if (!isChatModalOpen && latestBotCommentId) {
            setTimeout(() => {
                const commentElement = document.getElementById(`comment-${latestBotCommentId}`);
                if (commentElement) {
                    commentElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    commentElement.classList.add(styles.highlightComment);
                    setTimeout(() => {
                        commentElement.classList.remove(styles.highlightComment);
                    }, 3000);
                }
                setLatestBotCommentId(null);
            }, 600);
        }
    }, [isChatModalOpen, latestBotCommentId]);

    const handleOpenChatModal = () => {
        if (!isAuthenticated) return alert("You need to log in to use the chat bot.");
        setBotError(null);
        setLatestBotResponse(null);
        setIsChatModalOpen(true);
    };

    const handleCloseChatModal = () => {
        setIsChatModalOpen(false);
        setLatestBotResponse(null);
        setBotError(null);
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
                <h3 className={styles.errorTitle}>An error occurred</h3>
                <p className={styles.errorMessage}>{error}</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorIcon}>🔍</div>
                <h3 className={styles.errorTitle}>Post not found</h3>
                <p className={styles.errorMessage}>The post you are looking for does not exist or has been deleted.</p>
            </div>
        );
    }

    const isOwner = isAuthenticated && user?.id === post?.author?.id;
    const comments = post.comments || [];
    const hasBotComments = comments.some(comment => comment.is_bot);
    const filteredComments = comments.filter(comment => showBotComments || !comment.is_bot);

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
                                        title={`This post has been reviewed by the bot ${post.bot_reviews_count} times. Latest review: ${formatTimeAgo(post.latest_bot_review_date)} - "${post.bot_review_summary}"`}
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
                                            {post.author?.username || 'Anonymous'}
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
                            <div 
                                className={styles.contentText}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
                            />
                        </div>
                    )}
                    
                    {/* Post Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className={styles.tagsContainer}>
                            <Tag size={16} className={styles.tagIcon} />
                            {post.tags.map((tag, index) => {
                                const tagName = typeof tag === 'object' ? tag.name : tag.toString();
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
                                    disabled={!isAuthenticated}
                                >
                                    <ChevronUp size={18} />
                                </button>
                                <span className={styles.voteScore}>{post.calculated_score || 0}</span>
                                <button 
                                    onClick={() => handleVote('down')} 
                                    className={`${styles.voteButton} ${styles.downvote} ${post.user_vote === 'down' ? styles.active : ''}`}
                                    disabled={!isAuthenticated}
                                >
                                    <ChevronDown size={18} />
                                </button>
                            </div>
                            
                            <button className={styles.actionButton}>
                                <MessageCircle size={16} />
                                <span>{filteredComments.length}</span>
                            </button>

                            <button
                                onClick={handleOpenChatModal}
                                disabled={botLoading || !isAuthenticated}
                                className={`${styles.actionButton} ${botLoading ? styles.loading : ''}`}
                                title={!isAuthenticated ? "You need to log in to use the bot" : "Ask the AI to analyze this post"}
                            >
                                {botLoading ? (
                                    <span className={styles.loadingSpinnerSmall}></span>
                                ) : (
                                    <Bot size={18} />
                                )} 
                                Ask Bot
                            </button>
                            
                            {botError && !isChatModalOpen && (
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
                                    title="Delete post"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            {hasBotComments && (
                                <button
                                    onClick={() => setShowBotComments(prev => !prev)}
                                    className={styles.actionButton}
                                    title={showBotComments ? "Hide Bot comments" : "Show Bot comments"}
                                >
                                    {showBotComments ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            )}
                            <button 
                                onClick={handleBookmark}
                                className={`${styles.actionButton} ${isBookmarked ? styles.bookmarked : ''}`}
                                title="Bookmark this post"
                            >
                                <Bookmark size={16} />
                            </button>
                            <button className={styles.actionButton} title="Share this post">
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className={styles.commentsSection}>
                    <div className={styles.commentsHeader}>
                        <h2 className={styles.commentsTitle}>
                            Comments ({filteredComments.length})
                        </h2>
                    </div>
                    
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
                                                'Post comment'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className={styles.loginPrompt}>
                            <p>
                                <Link to="/login" className={styles.loginLink}>Please login</Link> to comment
                            </p>
                        </div>
                    )}
                    
                    <div id="comments-list-container" className={styles.commentsList}>
                {filteredComments.length > 0 ? (
                    filteredComments.map((comment) => (
                        <div
                            key={comment.id}
                            id={`comment-${comment.id}`}
                            className={`${styles.commentItem} ${comment.is_bot ? styles.botComment : ''}`}
                        >
                            <div className={styles.commentHeader}>
                                <div className={styles.commentAuthor}>
                                    <div className={`${styles.commentAvatar} ${comment.is_bot ? styles.botAvatar : ''}`}>
                                        {comment.is_bot ? '🤖' : (comment.author?.username?.[0]?.toUpperCase() || 'U')}
                                    </div>
                                    <div className={styles.commentAuthorInfo}>
                                        <span className={styles.commentAuthorName}>
                                            {comment.is_bot ? 'DevAlly Bot' : (comment.author?.username || 'Anonymous')}
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
                                        dangerouslySetInnerHTML={{ 
                                            __html: sanitizeBotComment(comment.text)
                                        }}
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
                        <p className={styles.deleteConfirmMessage}>
                            Are you sure you want to delete this post? This action cannot be undone.
                        </p>
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
                        <p className={styles.successMessage}>Your post has been successfully deleted.</p>
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
            
            {/* Bot Chat Interface Component */}
            <BotChatInterface
                isOpen={isChatModalOpen}
                onClose={handleCloseChatModal}
                post={post}
                onSendMessage={handleSendBotMessage}
                isLoading={botLoading}
                error={botError}
                addBotResponse={latestBotResponse}
            />
        </div>
    );
};

export default PostDetail;