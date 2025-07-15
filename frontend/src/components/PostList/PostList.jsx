// Fixed PostList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';

const PostList = ({ filter = 'hot', showAllTags = false }) => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Improved CSRF token handling
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const getCSRFToken = async () => {
    // Try to get from cookie first
    let token = getCookie('csrftoken');

    // If no token, fetch from Django
    if (!token) {
      try {
        const response = await fetch('/api/csrf/', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          token = getCookie('csrftoken');
        }
      } catch (err) {
        console.error('Error fetching CSRF token:', err);
      }
    }

    return token;
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/posts/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const postData = Array.isArray(data) ? data : data.results || [];
        setPosts(postData);

      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isAuthenticated]);

  const handleVote = async (postId, voteType) => {
    if (!isAuthenticated) {
      alert('Please login to vote!');
      return;
    }

    try {
      const csrfToken = getCookie('csrftoken');

      // Use the same format as Vote.jsx which works
      const response = await fetch('/vote/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          post_id: postId,
          vote_type: voteType,
          csrfmiddlewaretoken: csrfToken
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update the post's vote count and user_vote status locally
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? {
                  ...post,
                  calculated_score: data.score,
                  user_vote: data.action === 'removed' ? '' : voteType,
                }
              : post
          )
        );
      } else {
        console.error('Vote error:', data.error);
        alert(`Failed to vote: ${data.error}`);
      }

    } catch (err) {
      console.error('Error voting:', err);
      alert(`Failed to vote: ${err.message}`);
    }
  };

  if (loading) return <div className={styles.message}>Loading posts...</div>;
  if (error) return <div className={styles.message}>Error: {error}</div>;
  if (posts.length === 0) return <div className={styles.message}>No posts found.</div>;

  return (
    <div className={styles.postListContainer}>
      {posts.map(post => (
        <div key={post.id} className={styles.postCard}>
          <div className={styles.voteSection}>
            <button
              onClick={() => handleVote(post.id, 'up')}
              className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.activeUp : ''}`}
            >
              <ChevronUp size={22} />
            </button>
            <span className={styles.voteScore}>{post.calculated_score || 0}</span>
            <button
              onClick={() => handleVote(post.id, 'down')}
              className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.activeDown : ''}`}
            >
              <ChevronDown size={22} />
            </button>
          </div>

          <div className={styles.postContentArea}>
            <Link to={`/posts/${post.id}`} className={styles.postLink}>
                <div className={styles.postMeta}>
                    <span>Posted by u/{post.author?.username || 'Unknown'}</span>
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>

                {post.image_url && (
                    <div className={styles.imageContainer}>
                        <img src={post.image_url} alt={post.title} className={styles.postImage} />
                    </div>
                )}
            </Link>

            <div className={styles.postFooter}>
                <Link to={`/posts/${post.id}`} className={styles.actionButton}>
                    <MessageCircle size={16} />
                    <span>{post.comment_count || 0} Comments</span>
                </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;