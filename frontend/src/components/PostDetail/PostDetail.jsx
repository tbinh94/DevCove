// PostDetail.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Share2, Bookmark, Edit3, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import styles from './PostDetail.module.css';

const PostDetail = () => {
    const { postId } = useParams(); // Lấy ID từ URL
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get CSRF token (giống notification)
    const getCSRFToken = () => {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!postId) return;
            setLoading(true);
            setError(null);
            try {
                // Fetch post data
                const postResponse = await fetch(`/api/posts/${postId}/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                });

                if (!postResponse.ok) {
                    throw new Error(`Failed to fetch post: ${postResponse.status}`);
                }

                const postData = await postResponse.json();

                // Fetch comments data
                const commentsResponse = await fetch(`/api/posts/${postId}/comments/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                });

                if (!commentsResponse.ok) {
                    throw new Error(`Failed to fetch comments: ${commentsResponse.status}`);
                }

                const commentsData = await commentsResponse.json();

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

    const handleVote = async (voteType) => {
        try {
            const response = await fetch(`/api/posts/${post.id}/vote/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({ vote_type: voteType }),
            });

            if (!response.ok) {
                throw new Error('Vote failed');
            }

            const data = await response.json();
            setPost(prevPost => ({
                ...prevPost,
                calculated_score: data.score,
                user_vote: data.action === 'removed' ? null : voteType
            }));
        } catch (err) {
            console.error('Vote error:', err);
            alert(err.message || "You must be logged in to vote.");
        }
    };
    
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/posts/${postId}/comments/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({ content: newComment }),
            });

            if (!response.ok) {
                throw new Error('Failed to post comment');
            }

            const commentData = await response.json();
            setComments(prevComments => [commentData, ...prevComments]);
            setNewComment('');
        } catch (err) {
            console.error('Comment error:', err);
            alert(err.message || "Failed to post comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTimeAgo = (dateString) => {
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

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (error) return <div className={styles.loading}>{error}</div>;
    if (!post) return <div className={styles.loading}>Post not found.</div>;

    return (
        <div className={styles.container}>
            <div className={styles.maxWidth}>
                <div className={styles.postCard}>
                    <div className={styles.postHeader}>
                        <h1 className={styles.postTitle}>{post.title}</h1>
                    </div>
                    
                    {/* Post meta info */}
                    <div className={styles.postMeta}>
                        <span className={styles.author}>u/{post.author?.username || 'Unknown'}</span>
                        <span className={styles.separator}>•</span>
                        <span className={styles.time}>{formatTimeAgo(post.created_at)}</span>
                        {post.community && (
                            <>
                                <span className={styles.separator}>•</span>
                                <Link to={`/r/${post.community.slug}`} className={styles.communityBadge}>
                                    r/{post.community.name}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Post tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className={styles.postTags}>
                            {post.tags.map(tag => (
                                <span 
                                    key={tag.slug} 
                                    className={styles.tagBadge} 
                                    style={{ backgroundColor: tag.color }}
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Post image */}
                    {post.image_url && (
                        <div className={styles.postImageContainer}>
                            <img src={post.image_url} alt={post.title} className={styles.postImage} />
                        </div>
                    )}

                    {/* Post content */}
                    {post.content && (
                        <div className={styles.postContent}>
                            {post.content}
                        </div>
                    )}

                    {/* Post footer with voting and actions */}
                    <div className={styles.postFooter}>
                        <div className={styles.voteSection}>
                            <button 
                                onClick={() => handleVote('up')} 
                                className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.active : ''}`}
                            >
                                <ChevronUp size={20} />
                            </button>
                            <span className={styles.voteScore}>{post.calculated_score || 0}</span>
                            <button 
                                onClick={() => handleVote('down')} 
                                className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.active : ''}`}
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>
                        
                        <div className={styles.actionButtons}>
                            <button className={styles.actionButton}>
                                <MessageCircle size={16} />
                                <span>{comments.length} comments</span>
                            </button>
                            <button className={styles.actionButton}>
                                <Share2 size={16} />
                                <span>Share</span>
                            </button>
                            <button className={styles.actionButton}>
                                <Bookmark size={16} />
                                <span>Save</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments section */}
                <div className={styles.commentsSection}>
                    <h2 className={styles.commentsTitle}>Comments ({comments.length})</h2>
                    
                    {/* Comment form */}
                    <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                        <textarea 
                            value={newComment} 
                            onChange={(e) => setNewComment(e.target.value)} 
                            placeholder="What are your thoughts?" 
                            className={styles.commentTextarea} 
                            required 
                        />
                        <button 
                            type="submit" 
                            className={styles.commentSubmitButton} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </form>
                    
                    {/* Comments list */}
                    <div className={styles.commentsList}>
                        {comments.length === 0 ? (
                            <div className={styles.noComments}>No comments yet. Be the first to comment!</div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className={styles.commentItem}>
                                    <div className={styles.commentHeader}>
                                        <span className={styles.commentAuthor}>
                                            u/{comment.author?.username || 'Unknown'}
                                        </span>
                                        <span className={styles.commentTime}>
                                            {formatTimeAgo(comment.created_at)}
                                        </span>
                                    </div>
                                    <div className={styles.commentText}>
                                        {comment.content}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostDetail;