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

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Use apiService.getPosts for a consistent API-calling approach.
        const params = {
          page: currentPage,
          page_size: postsPerPage,
          // You can add other filters here if needed, e.g., filter: filter
        };
        const data = await apiService.getPosts(params);

        // Assuming your API returns an object with 'results' (the posts) and 'count' (total posts)
        const postData = Array.isArray(data) ? data : data.results || [];
        setPosts(postData);
        setTotalPosts(data.count || postData.length); // Update total posts based on API response

      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isAuthenticated, currentPage, postsPerPage, filter]); // Re-fetch when dependencies change

  async function handleVote(postId, type) {
    // Ensure the user is authenticated before allowing a vote
    if (!isAuthenticated) {
      // You can redirect to login or show a message
      console.log("User must be logged in to vote.");
      // Optionally, trigger a login modal or redirect
      return;
    }

    try {
      const updatedPost = await apiService.vote(postId, type);
      // Update the specific post in the list with the new score and vote status
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, calculated_score: updatedPost.score, user_vote: updatedPost.user_vote }
          : post
      ));
    } catch (err) {
      console.error('Error voting:', err);
      // Handle error, e.g., show a notification to the user
    }
  }

  const totalPages = Math.ceil(totalPosts / postsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const renderPaginationButtons = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
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
            <Link to={`/post/${post.id}`} className={styles.postLink}>
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
                <Link to={`/post/${post.id}`} className={styles.actionButton}>
                    <MessageCircle size={16} />
                    <span>{post.comment_count || 0} Comments</span>
                </Link>
            </div>
          </div>
        </div>
      ))}
      {totalPosts > postsPerPage && renderPaginationButtons()}
    </div>
  );
};

export default PostList;