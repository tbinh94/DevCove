// Fixed PostList.jsx with improved Tags Display and Debugging
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle, Tag } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const PostList = ({ filter = 'hot', showAllTags = false }) => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: postsPerPage,
          // Add ordering if needed
          ordering: filter === 'hot' ? '-calculated_score' : '-created_at'
        };
        
        console.log('Fetching posts with params:', params);
        const data = await apiService.getPosts(params);
        console.log('Raw posts data received:', data);

        // Handle different API response formats
        const postData = Array.isArray(data) ? data : data.results || [];
        console.log('Processed posts data:', postData);
        
        // Debug: Log the first post to check tags structure
        if (postData.length > 0) {
          console.log('First post structure:', postData[0]);
          console.log('First post tags:', postData[0].tags);
        }

        setPosts(postData);
        setTotalPosts(data.count || postData.length);

      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isAuthenticated, currentPage, postsPerPage, filter]);

  async function handleVote(postId, type) {
    if (!isAuthenticated) {
      console.log("User must be logged in to vote.");
      return;
    }

    try {
      const updatedPost = await apiService.vote(postId, type);
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, calculated_score: updatedPost.score, user_vote: updatedPost.user_vote }
          : post
      ));
    } catch (err) {
      console.error('Error voting:', err);
    }
  }

  // IMPROVED: Helper function to render tags with better error handling
  const renderTags = (tags) => {
    // Debug logging
    console.log('renderTags called with:', tags);
    
    if (!tags) {
      console.log('Tags is null or undefined');
      return null;
    }

    if (!Array.isArray(tags)) {
      console.log('Tags is not an array:', typeof tags, tags);
      return null;
    }

    if (tags.length === 0) {
      console.log('Tags array is empty');
      return null;
    }

    const tagsToShow = showAllTags ? tags : tags.slice(0, 3);
    const remainingCount = tags.length - tagsToShow.length;

    console.log('Rendering tags:', tagsToShow);

    return (
      <div className={styles.tagsContainer}>
        <Tag size={14} className={styles.tagIcon} />
        {tagsToShow.map((tag, index) => {
          // Handle different tag formats
          const tagId = tag.id || tag.pk || index;
          const tagName = tag.name || tag.title || tag;
          const tagColor = tag.color || '#ccc';
          
          console.log('Rendering tag:', { tagId, tagName, tagColor });
          
          return (
            <span 
              key={tagId} 
              className={styles.tag}
              style={{ 
                backgroundColor: tagColor ? `${tagColor}20` : '#f0f0f0',
                borderColor: tagColor || '#ccc',
                color: tagColor || '#333'
              }}
            >
              {tagName}
            </span>
          );
        })}
        {remainingCount > 0 && (
          <span className={styles.moreTagsCount}>
            +{remainingCount} more
          </span>
        )}
      </div>
    );
  };

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
      {/* DEBUG: Show total posts count */}
      <div className={styles.debugInfo} style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
        Debug: Showing {posts.length} posts out of {totalPosts} total
      </div>

      {posts.map(post => {
        // Debug logging for each post
        console.log(`Post ${post.id} tags:`, post.tags);
        
        return (
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
                  {post.community && (
                    <span> in r/{post.community.name}</span>
                  )}
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>

                {/* IMPROVED: Display tags with debugging */}
                <div className={styles.tagsDebug}>
                  {/* Debug info - remove in production */}
                  <small style={{ color: '#999', fontSize: '10px' }}>
                    Debug: Tags data - {JSON.stringify(post.tags)}
                  </small>
                  
                  {/* Actual tags display */}
                  {renderTags(post.tags)}
                </div>

                {post.image_url && (
                  <div className={styles.imageContainer}>
                    <img src={post.image_url} alt={post.title} className={styles.postImage} />
                  </div>
                )}

                {/* Show content preview for text posts */}
                {post.content && (
                  <p className={styles.postContentPreview}>
                    {post.content.length > 200 
                      ? `${post.content.substring(0, 200)}...` 
                      : post.content
                    }
                  </p>
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
        );
      })}
      
      {totalPosts > postsPerPage && renderPaginationButtons()}
    </div>
  );
};

export default PostList;