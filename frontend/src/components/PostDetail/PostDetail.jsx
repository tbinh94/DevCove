// --- START OF FILE: PostDetail.jsx (Corrected Version) ---

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
    // Đảm nhận function của nút Copy và Run trong phần bình luận
    /*
    Hàm handleCommentAreaClick đảm nhận việc xử lý sự kiện click trên nút "Run".
    Khi người dùng nhấn nút "Run", hàm này sẽ lấy nội dung của khối code (codeTag.innerText) và ngôn ngữ lập trình.
    Sau đó, nó lưu nội dung code và ngôn ngữ vào sessionStorage với các khóa sandbox_code và sandbox_language.
    Cuối cùng, hàm mở một cửa sổ mới với URL /sandbox để thực thi đoạn code.
    */
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

            // --- START: LOGIC CHO NÚT COPY ĐÃ SỬA ---
            if (action === 'copy') {
                navigator.clipboard.writeText(codeTag.innerText).then(() => {
                    // SỬA LỖI: Sử dụng selector đúng (.btn-icon, .btn-text)
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
            // --- END: LOGIC CHO NÚT COPY ĐÃ SỬA ---


            // Logic cho nút Run (đã hoạt động đúng)
            if (action === 'run') {
                const codeText = codeTag.innerText;
                
                const container = button.closest('.code-block-container');
                const langElement = container?.querySelector('.code-language');
                const language = langElement ? langElement.textContent.toLowerCase() : 'javascript';
                
                try {
                    sessionStorage.setItem('sandbox_code', codeText);
                    sessionStorage.setItem('sandbox_language', language); // Có thể gửi ngôn ngữ để sandbox biết cách chạy
                    window.open('/sandbox', '_blank'); // mở sandbox runner trong tab mới

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

        // SỬA LỖI 2: Luôn kiểm tra context và hàm tồn tại trước khi gọi
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

        // Hàm dọn dẹp cũng phải kiểm tra
        return () => {
            document.removeEventListener('keydown', handleEscKey);
            if (outletContext && typeof outletContext.setBodyScrollLock === 'function') {
                outletContext.setBodyScrollLock(false);
            }
        };
    // SỬA LỖI 3: Thêm outletContext vào mảng dependencies
    }, [isImageModalOpen, isChatModalOpen, outletContext]);
    
    const sanitizeBotComment = (commentText) => {
        return DOMPurify.sanitize(commentText, { 
            ADD_TAGS: ['style', 'button'],
            // Thêm data-action và data-target-id vào danh sách cho phép
            ADD_ATTR: ['class', 'id', 'title', 'style', 'data-action', 'data-target-id'],
        });
    };
    
    const handleVote = async (voteType) => {
        if (!isAuthenticated) return alert("Bạn cần đăng nhập để bỏ phiếu.");
        
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
            alert(err.message || "Đã xảy ra lỗi khi bỏ phiếu.");
        }
    };
    
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        if (!isAuthenticated) return alert("Bạn cần đăng nhập để bình luận.");
        
        setIsSubmitting(true);
        try {
            const newCommentData = await apiService.createComment({ post: postId, text: newComment });
            setPost(prevPost => ({ ...prevPost, comments: [newCommentData, ...prevPost.comments] }));
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
            alert(err.message || 'Đã xảy ra lỗi khi xóa bài đăng.');
        }
    };

    const openImageModal = () => setIsImageModalOpen(true);
    const closeImageModal = () => setIsImageModalOpen(false);

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
        if (!isAuthenticated) return alert("Bạn cần đăng nhập để sử dụng bot chat.");
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
                <p className={styles.errorMessage}>Bài đăng bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
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
                addBotResponse={latestBotResponse}
            />
        </div>
    );
};

export default PostDetail;