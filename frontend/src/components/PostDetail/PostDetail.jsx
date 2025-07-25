import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Bot, Share2, Bookmark, ChevronUp, ChevronDown, Heart, Eye, Clock, X, ZoomIn, Tag, Trash2, CheckCircle, EyeOff } from 'lucide-react';
import styles from './PostDetail.module.css';
import apiService from '../../services/api'; 
import { useAuth } from '../../contexts/AuthContext';
import DOMPurify from 'dompurify';
import BotChatInterface from './BotChatInterface';

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

    // Bot chat states
    const [botLoading, setBotLoading] = useState(false);
    const [botError, setBotError] = useState(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [latestBotResponse, setLatestBotResponse] = useState(null); // This state isn't directly used for display, but can be for internal tracking if needed
    const [latestBotCommentId, setLatestBotCommentId] = useState(null);

    // Delete modal states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // State to toggle bot comment visibility
    const [showBotComments, setShowBotComments] = useState(true);

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
            
            function showCopySuccess(elementId) {
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

    // Fetch post data
    useEffect(() => {
        const fetchData = async () => {
            if (!postId) return;
            setLoading(true);
            setError(null);
            try {
                const postData = await apiService.getPost(postId);
                if (postData.comments) {
                    // Sort comments by creation date (newest first)
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
            if (e.key === 'Escape') {
                if (isImageModalOpen) {
                    setIsImageModalOpen(false);
                }
                if (isChatModalOpen) {
                    handleCloseChatModal();
                }
            }
        };
        
        if (isImageModalOpen || isChatModalOpen) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset'; // Restore scrolling
        };
    }, [isImageModalOpen, isChatModalOpen]);

    const handleVote = async (voteType) => {
        if (!isAuthenticated) {
            alert("Bạn cần đăng nhập để bỏ phiếu.");
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
        
        setPost(p => ({ ...p, user_vote: newVoteStatus, calculated_score: newScore }));

        try {
            const data = await apiService.vote(post.id, voteType);
            setPost(prevPost => ({
                ...prevPost,
                calculated_score: data.score,
                user_vote: data.action === 'removed' ? null : voteType,
            }));
        } catch (err) {
            // Rollback on error
            setPost(p => ({ ...p, user_vote: originalVote, calculated_score: originalScore }));
            console.error('Vote error:', err);
            alert(err.message || "Đã xảy ra lỗi khi bỏ phiếu.");
        }
    };
    
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !isAuthenticated) {
            if (!isAuthenticated) alert("Bạn cần đăng nhập để bình luận.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            const newCommentData = await apiService.createComment({
                post: postId,
                text: newComment 
            });

            setPost(prevPost => ({
                ...prevPost,
                comments: [newCommentData, ...prevPost.comments]
            }));
            setNewComment('');
        } catch (err) {
            console.error('Comment error:', err);
            alert(err.message || "Gửi bình luận thất bại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        alert("Tính năng đánh dấu đang được phát triển!");
    };

    const handleDeletePost = async () => {
        setShowDeleteConfirm(true);
    };

    const handleDeletePostConfirm = async () => {
        setShowDeleteConfirm(false);

        try {
            await apiService.deletePost(postId);
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                navigate('/');
            }, 2000);
        } catch (err) {
            console.error('Failed to delete post:', err);
            alert(err.message || 'Đã xảy ra lỗi khi xóa bài đăng.');
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
        
        if (diffInSeconds < 60) return "vừa xong";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} giờ trước`;
        const days = Math.floor(diffInHours / 24);
        return `${days} ngày trước`;
    };

    // Hàm xử lý gửi tin nhắn tới bot
    const handleSendBotMessage = async (promptText, promptType) => {
        setBotLoading(true);
        setBotError(null);
        setLatestBotResponse(null);

        try {
            const payload = {
                prompt_type: promptType,
                prompt_text: promptText,
                // language: post.language || 'text', // Thêm nếu cần
            };

            const newBotComment = await apiService.askBot(post.id, payload);

            if (newBotComment && newBotComment.text) {
                setPost(prev => ({
                    ...prev,
                    comments: [newBotComment, ...prev.comments],
                    is_bot_reviewed: true,
                    bot_reviews_count: (prev.bot_reviews_count || 0) + 1,
                    latest_bot_review_date: new Date().toISOString(),
                    bot_review_summary: newBotComment.text.slice(0, 100) + "..."
                }));
                setLatestBotCommentId(newBotComment.id);
                setTimeout(() => {
                    setIsChatModalOpen(false);
                    setBotError(null);
                    setLatestBotResponse(null);
                }, 500);
            } else {
                throw new Error('Phản hồi không hợp lệ từ dịch vụ bot');
            }
        } catch (err) {
            console.error('Bot message error:', err);
            const errorMessage = err.response?.data?.error ||
                                err.response?.data?.message ||
                                err.message ||
                                "Đã xảy ra lỗi khi hỏi bot.";
            setBotError(errorMessage);
            setLatestBotResponse(null);
        } finally {
            setBotLoading(false);
        }
    };

    // Logic cuộn đến bình luận của bot và highlight sau khi modal đóng
    useEffect(() => {
        if (!isChatModalOpen && latestBotCommentId) {
            // Chờ animation đóng modal hoàn tất
            setTimeout(() => {
                const commentElement = document.getElementById(`comment-${latestBotCommentId}`);
                if (commentElement) {
                    // Cuộn đến bình luận với hiệu ứng mượt mà
                    commentElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                    
                    // Thêm hiệu ứng highlight
                    commentElement.classList.add(styles.highlightComment);
                    
                    // Xóa hiệu ứng highlight sau animation
                    setTimeout(() => {
                        commentElement.classList.remove(styles.highlightComment);
                    }, 3000);
                }
                
                // Đặt lại ID bình luận để không kích hoạt lại hiệu ứng
                setLatestBotCommentId(null);
            }, 600); // Chờ chuyển đổi đóng modal
        }
    }, [isChatModalOpen, latestBotCommentId]);

    // Xử lý mở modal chat
    const handleOpenChatModal = () => {
        if (!isAuthenticated) {
            alert("Bạn cần đăng nhập để sử dụng bot chat.");
            return;
        }
        
        // Xóa trạng thái trước đó khi mở modal
        setBotError(null);
        setLatestBotResponse(null);
        setIsChatModalOpen(true);
    };

    // Xử lý đóng modal chat với dọn dẹp trạng thái
    const handleCloseChatModal = () => {
        setIsChatModalOpen(false);
        setLatestBotResponse(null);
        setBotError(null);
        // Lưu ý: Không xóa botLoading ở đây phòng trường hợp có yêu cầu đang diễn ra
    };

    // --- Legacy function handleAskBot đã bị loại bỏ vì không còn phù hợp với prompt mới ---
    // const handleAskBot = async () => { ... }; 

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingText}>Đang tải bài đăng...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorIcon}>⚠️</div>
                <h3 className={styles.errorTitle}>Đã xảy ra lỗi</h3>
                <p className={styles.errorMessage}>{error}</p>
            </div>
        );
    }
    
    if (!post) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorIcon}>🔍</div>
                <h3 className={styles.errorTitle}>Không tìm thấy bài đăng</h3>
                <p className={styles.errorMessage}>Bài đăng bạn đang tìm kiếm không tồn tại.</p>
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
                                        title={`Bài đăng này đã được bot xem xét ${post.bot_reviews_count} lần. Lần xem xét gần nhất: ${formatTimeAgo(post.latest_bot_review_date)} - "${post.bot_review_summary}"`}
                                    >
                                        🤖 Đã xem xét ({post.bot_reviews_count})
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
                                            {post.author?.username || 'Ẩn danh'}
                                        </span>
                                        <div className={styles.postStats}>
                                            <span className={styles.statItem}>
                                                <Clock size={12} />
                                                {formatTimeAgo(post.created_at)}
                                            </span>
                                            <span className={styles.statItem}>
                                                <Eye size={12} />
                                                {post.views || 0} lượt xem
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

                            {/* Cập nhật nút Ask Bot để mở modal */}
                            <button
                                onClick={handleOpenChatModal}
                                disabled={botLoading || !isAuthenticated}
                                className={`${styles.actionButton} ${botLoading ? styles.loading : ''}`}
                                title={!isAuthenticated ? "Bạn cần đăng nhập để sử dụng bot" : "Yêu cầu AI phân tích bài đăng này"}
                            >
                                {botLoading ? (
                                    <span className={styles.loadingSpinnerSmall}></span>
                                ) : (
                                    <Bot size={18} />
                                )} 
                                Hỏi Bot
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
                                    title="Xóa bài đăng"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            {hasBotComments && (
                                <button
                                    onClick={() => setShowBotComments(prev => !prev)}
                                    className={styles.actionButton}
                                    title={showBotComments ? "Ẩn bình luận của Bot" : "Hiện bình luận của Bot"}
                                >
                                    {showBotComments ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            )}
                            <button 
                                onClick={handleBookmark}
                                className={`${styles.actionButton} ${isBookmarked ? styles.bookmarked : ''}`}
                                title="Đánh dấu bài đăng này"
                            >
                                <Bookmark size={16} />
                            </button>
                            <button className={styles.actionButton} title="Chia sẻ bài đăng này">
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className={styles.commentsSection}>
                    <div className={styles.commentsHeader}>
                        <h2 className={styles.commentsTitle}>
                            Bình luận ({filteredComments.length})
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
                                        placeholder="Chia sẻ suy nghĩ của bạn..." 
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
                                                'Đăng bình luận'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className={styles.loginPrompt}>
                            <p>
                                <Link to="/login" className={styles.loginLink}>Đăng nhập</Link> để tham gia bình luận
                            </p>
                        </div>
                    )}
                    
                    {/* Comments List */}
                    <div className={styles.commentsList}>
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
                                                    {comment.is_bot ? 'DevAlly Bot' : (comment.author?.username || 'Ẩn danh')}
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
                                                    <span>Thích</span>
                                                </button>
                                                <button className={styles.commentActionButton}>
                                                    <MessageCircle size={12} />
                                                    <span>Trả lời</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.noComments}>
                                <div className={styles.noCommentsIcon}>💬</div>
                                <h3 className={styles.noCommentsTitle}>Chưa có bình luận nào</h3>
                                <p className={styles.noCommentsText}>Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className={styles.deleteConfirmModalOverlay}>
                    <div className={styles.deleteConfirmModal}>
                        <h3 className={styles.deleteConfirmTitle}>Xác nhận xóa</h3>
                        <p className={styles.deleteConfirmMessage}>
                            Bạn có chắc chắn muốn xóa bài đăng này? Hành động này không thể hoàn tác.
                        </p>
                        <div className={styles.deleteConfirmActions}>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)} 
                                className={styles.deleteConfirmCancel}
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                onClick={handleDeletePostConfirm} 
                                className={styles.deleteConfirmButton}
                            >
                                Xóa
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
                        <h3 className={styles.successTitle}>Thành công!</h3>
                        <p className={styles.successMessage}>Bài đăng của bạn đã được xóa thành công.</p>
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
                addBotResponse={latestBotResponse} // This prop is not directly used for display in BotChatInterface but for internal state management if needed.
            />
        </div>
    );
};

export default PostDetail;