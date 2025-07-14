// PostList.jsx - Đã cập nhật

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 1. Import Link để điều hướng
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react'; // 2. Import icons cho UI
import styles from './PostList.module.css'; // 3. Import CSS module để tạo kiểu

const PostList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCSRFToken = () => {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/posts/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        // Giả sử API trả về một object có key 'results' khi phân trang
        const postData = Array.isArray(data) ? data : data.results || [];
        
        // Lấy thông tin vote của user cho từng post
        const postsWithUserVote = await Promise.all(postData.map(async (post) => {
            const voteResponse = await fetch(`/api/posts/${post.id}/user_vote/`);
            if(voteResponse.ok) {
                const voteData = await voteResponse.json();
                return { ...post, user_vote: voteData.user_vote };
            }
            return { ...post, user_vote: null };
        }));

        setPosts(postsWithUserVote);

      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleVote = async (postId, voteType) => {
    try {
      const response = await fetch(`/api/posts/${postId}/vote/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify({ vote_type: voteType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Hiển thị lỗi cụ thể hơn nếu có, ví dụ "You must be logged in..."
        throw new Error(errorData.detail || 'Vote failed');
      }

      const data = await response.json();
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { 
                ...post, 
                calculated_score: data.score, 
                // Cập nhật trạng thái vote của user
                user_vote: data.action === 'removed' ? null : voteType 
              }
            : post
        )
      );
    } catch (err) {
      // Thông báo lỗi cho người dùng
      alert(err.message || "An error occurred while voting.");
    }
  };

  if (loading) return <div className={styles.message}>Loading posts...</div>;
  if (error) return <div className={styles.message}>Error: {error}</div>;
  if (posts.length === 0) return <div className={styles.message}>No posts found.</div>;


  return (
    <div className={styles.postListContainer}>
      {posts.map(post => (
        // 4. Bọc mỗi bài post trong một card
        <div key={post.id} className={styles.postCard}>
          {/* 5. Tích hợp hệ thống vote ở bên trái */}
          <div className={styles.voteSection}>
            <button
              onClick={() => handleVote(post.id, 'up')}
              className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.activeUp : ''}`}
            >
              <ChevronUp size={22} />
            </button>
            <span className={styles.voteScore}>{post.calculated_score}</span>
            <button
              onClick={() => handleVote(post.id, 'down')}
              className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.activeDown : ''}`}
            >
              <ChevronDown size={22} />
            </button>
          </div>
          
          {/* 6. Phần nội dung chính của post có thể click được */}
          <div className={styles.postContentArea}>
            <Link to={`/posts/${post.id}`} className={styles.postLink}>
                <div className={styles.postMeta}>
                    <span>Posted by u/{post.author?.username || 'Unknown'}</span>
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>
                
                {/* 7. Hiển thị ảnh nếu có */}
                {post.image_url && (
                    <div className={styles.imageContainer}>
                        <img src={post.image_url} alt={post.title} className={styles.postImage} />
                    </div>
                )}
            </Link>

            {/* 8. Footer cho các hành động như bình luận */}
            <div className={styles.postFooter}>
                <Link to={`/posts/${post.id}`} className={styles.actionButton}>
                    <MessageCircle size={16} />
                    <span>{post.num_comments || 0} Comments</span>
                </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;