// PostDetail.jsx - Refactored to use apiService

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Share2, Bookmark, Edit3, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import styles from './PostDetail.module.css';
// FIX 1: Import the centralized apiService
import apiService from '../../services/api'; 
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth to check login status

const PostDetail = () => {
    const { postId } = useParams();
    const { isAuthenticated } = useAuth(); // Get authentication status
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // FIX 2: Remove the local getCSRFToken function, as apiService handles it.

    useEffect(() => {
        console.log('PostDetail mounted with postId:', postId);
        const fetchData = async () => {
            if (!postId) return;
            setLoading(true);
            setError(null);
            try {
                // FIX 3: Use apiService to fetch both post and comments data
                // This runs API calls in parallel for better performance
                console.log('Fetching post:', postId); // Add this

                const [postData, commentsData] = await Promise.all([
                    apiService.getPost(postId),
                    apiService.getCommentsForPost(postId) 
                ]);
                console.log('Post data:', postData); // Add this
                console.log('Comments data:', commentsData); // Add this
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
    }, [postId]); // Dependency array is correct

    const handleVote = async (voteType) => {
        if (!isAuthenticated) {
            alert("You must be logged in to vote.");
            return;
        }
        try {
            // FIX 4: Use apiService.vote for consistency
            const data = await apiService.vote(post.id, voteType);
            
            // Update the post state immediately for better UX
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
            // FIX 5: Use apiService.createComment
            const commentData = await apiService.createComment({
                post: postId, // Ensure the backend gets the post ID
                text: newComment 
            });

            // Add new comment to the top of the list
            setComments(prevComments => [commentData, ...prevComments]);
            setNewComment(''); // Clear the textarea
        } catch (err) {
            console.error('Comment error:', err);
            alert(err.message || "Failed to post comment.");
        } finally {
            setIsSubmitting(false);
        }
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

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (error) return <div className={styles.loading}>Error: {error}</div>;
    if (!post) return <div className={styles.loading}>Post not found.</div>;

    return (
        // JSX content remains the same
        <div className={styles.container}>
            <div className={styles.maxWidth}>
                <div className={styles.postCard}>
                    {/* Post Header, Meta, Tags, Image, Content */}
                    <div className={styles.postHeader}>
                        <h1 className={styles.postTitle}>{post.title}</h1>
                    </div>
                    <div className={styles.postMeta}>
                        <span className={styles.author}>u/{post.author?.username || 'Unknown'}</span>
                        <span className={styles.separator}>•</span>
                        <span className={styles.time}>{formatTimeAgo(post.created_at)}</span>
                    </div>
                     {post.image_url && (
                        <div className={styles.postImageContainer}>
                            <img src={post.image_url} alt={post.title} className={styles.postImage} />
                        </div>
                    )}
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
                                className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.activeUp : ''}`}
                            >
                                <ChevronUp size={20} />
                            </button>
                            <span className={styles.voteScore}>{post.calculated_score || 0}</span>
                            <button 
                                onClick={() => handleVote('down')} 
                                className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.activeDown : ''}`}
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>
                        <div className={styles.actionButtons}>
                            <button className={styles.actionButton}>
                                <MessageCircle size={16} />
                                <span>{comments.length} Comments</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments section */}
                <div className={styles.commentsSection}>
                    <h2 className={styles.commentsTitle}>Comments ({comments.length})</h2>
                    
                    {isAuthenticated ? (
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
                    ) : (
                        <div className={styles.loginPrompt}>
                            <Link to="/login">Log in</Link> or <Link to="/register">sign up</Link> to leave a comment.
                        </div>
                    )}
                    
                    <div className={styles.commentsList}>
                        {comments.length > 0 ? (
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
                                        {comment.text}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.noComments}>No comments yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostDetail;