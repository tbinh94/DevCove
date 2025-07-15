// Fixed PostList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api'; // Assuming you have an apiService for API calls
const PostList = ({ filter = 'hot', showAllTags = false }) => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10); // Set posts per page to 10, as requested
  const [totalPosts, setTotalPosts] = useState(0); // To store total number of posts for pagination

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
        // Add pagination parameters to the API call
        const response = await fetch(`/api/posts/?page=${currentPage}&page_size=${postsPerPage}`, { //
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
        // Assuming your API returns an object with 'results' (the posts) and 'count' (total posts)
        const postData = Array.isArray(data) ? data : data.results || [];
        setPosts(postData); //
        setTotalPosts(data.count || postData.length); // Update total posts based on API response

      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isAuthenticated, currentPage, postsPerPage]); // Re-fetch when currentPage or postsPerPage changes

  async function handleVote(postId, type) {
    try {
      const data = await apiService.vote(postId, type);
      console.log('new score', data.score);
      // update local state…
    } catch (err) {
      console.error('Error voting:', err);
    }
  }


  const totalPages = Math.ceil(totalPosts / postsPerPage); // Calculate total pages

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber); // Update current page
    window.scrollTo(0, 0); // Scroll to top when page changes
  };

  const renderPaginationButtons = () => { //
    const pageNumbers = [];
    // Show a range of pages around the current page
    const maxPagesToShow = 5; // Adjust as needed
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(1);
      if (startPage > 2) pageNumbers.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }

    return (
      <div className={styles.pagination}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.pageBtn}
        >
          Previous
        </button>
        {pageNumbers.map((num, index) =>
          num === '...' ? (
            <span key={index} className={styles.pageInfo}>...</span>
          ) : (
            <button
              key={index}
              onClick={() => handlePageChange(num)}
              className={`${styles.pageBtn} ${currentPage === num ? styles.activePage : ''}`}
            >
              {num}
            </button>
          )
        )}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.pageBtn}
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) return <div className={styles.message}>Loading posts...</div>;
  if (error) return <div className={styles.message}>Error: {error}</div>;
  if (posts.length === 0 && !loading) return <div className={styles.message}>No posts found.</div>;

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
      {totalPosts > postsPerPage && renderPaginationButtons()} {/* Render pagination only if there's more than one page */}
    </div>
  );
};

export default PostList;