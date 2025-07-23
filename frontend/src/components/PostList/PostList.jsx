// PostList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const PostList = ({ showAllTags = false }) => {
  // 1. Đảm bảo tất cả hooks được gọi ở đầu component
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);

  // 2. Sử dụng useMemo để tránh re-render không cần thiết
  const urlParams = useMemo(() => {
    try {
      return {
        tags: searchParams.get('tags'),
        search: searchParams.get('search')
      };
    } catch (error) {
      console.error('Error reading search params:', error);
      return { tags: null, search: null };
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null); // Reset error state
      
      try {
        const params = {
          page: currentPage,
          page_size: postsPerPage,
          sort: 'new',
        };

        // 3. Sử dụng urlParams thay vì trực tiếp searchParams
        if (urlParams.tags) {
          params.tags = urlParams.tags;
        }
        if (urlParams.search) {
          params.search = urlParams.search;
        }

        console.log('Fetching posts with params:', params);
        const data = await apiService.getPosts(params);

        const postData = Array.isArray(data) ? data : data.results || [];
        setPosts(postData);
        setTotalPosts(data.count || postData.length);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message || 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isAuthenticated, currentPage, postsPerPage, urlParams.tags, urlParams.search]);

  // 4. Đảm bảo handleVote không gọi hooks
  const handleVote = async (postId, type) => {
    if (!isAuthenticated) return;
    
    try {
      const updated = await apiService.vote(postId, type);
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { ...p, calculated_score: updated.score, user_vote: updated.user_vote } 
            : p
        )
      );
    } catch (err) {
      console.error('Vote error:', err);
      setError('Failed to vote. Please try again.');
    }
  };

  // 5. Render functions không được chứa hooks
  const renderTags = (tags) => {
    if (!tags || tags.length === 0) {
      return null;
    }

    const normalizedTags = tags.map((tag, index) => {
      if (typeof tag === 'object' && tag.name) {
        return tag;
      }
      if (typeof tag === 'string') {
        return {
          id: tag,
          name: tag,
          slug: tag.toLowerCase().replace(/\s+/g, '-')
        };
      }
      return {
        id: tag.id || `tag-${index}`,
        name: tag.name || tag.toString(),
        slug: tag.slug || (tag.name || tag.toString()).toLowerCase().replace(/\s+/g, '-')
      };
    });

    return (
      <div className={styles.postTags}>
        {normalizedTags.map((tag, index) => (
          <Link
            to={`/?tags=${tag.slug}`}
            key={tag.id || `tag-${index}`}
            className={styles.tagItem}
          >
            {tag.name}
          </Link>
        ))}
      </div>
    );
  };

  const totalPages = Math.ceil(totalPosts / postsPerPage);
  
  const changePage = (num) => {
    if (num < 1 || num > totalPages) return;
    setCurrentPage(num);
    window.scrollTo(0, 0);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    let end = Math.min(totalPages, start + max - 1);
    
    if (end - start + 1 < max) {
      start = Math.max(1, end - max + 1);
    }
    
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <div className={styles.pagination}>
        <button 
          onClick={() => changePage(currentPage - 1)} 
          disabled={currentPage === 1} 
          className={styles.pageBtn}
        >
          Previous
        </button>
        {pages.map((p, i) => 
          p === '...' ? (
            <span key={`ellipsis-${i}`} className={styles.pageInfo}>...</span>
          ) : (
            <button 
              key={`page-${p}`}
              onClick={() => changePage(p)} 
              className={`${styles.pageBtn} ${currentPage === p ? styles.activePage : ''}`}
            >
              {p}
            </button>
          )
        )}
        <button 
          onClick={() => changePage(currentPage + 1)} 
          disabled={currentPage === totalPages} 
          className={styles.pageBtn}
        >
          Next
        </button>
      </div>
    );
  };

  // 6. Early returns sau khi tất cả hooks đã được gọi
  if (loading) {
    return <div className={styles.message}>Loading posts...</div>;
  }
  
  if (error) {
    return (
      <div className={styles.message}>
        Error: {error}
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  
  if (!posts.length) {
    return <div className={styles.message}>No posts found matching your filters.</div>;
  }

  return (
    <div className={styles.postListContainer}>
      {posts.map(post => (
        <div key={post.id} className={styles.postCard}>
          <div className={styles.voteSection}>
            <button 
              onClick={() => handleVote(post.id, 'up')} 
              className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.activeUp : ''}`}
              disabled={!isAuthenticated}
            >
              <ChevronUp size={22} />
            </button>
            <span className={styles.voteScore}>{post.calculated_score || 0}</span>
            <button 
              onClick={() => handleVote(post.id, 'down')} 
              className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.activeDown : ''}`}
              disabled={!isAuthenticated}
            >
              <ChevronDown size={22} />
            </button>
          </div>
          
          <div className={styles.postContentArea}>
            {post.is_bot_reviewed && (
              <span className={styles.botReviewedBadge} title={post.bot_review_summary}>
                🤖 Reviewed
              </span>
            )}
            <Link to={`/post/${post.id}`} className={styles.postLink}>
              <div className={styles.postMeta}>
                u/{post.author?.username}
                {post.community && ` in r/${post.community.name}`}
              </div>
              <h3 className={styles.postTitle}>
                {post.title}
              </h3>
              {post.image_url && (
                <div className={styles.imageContainer}>
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className={styles.postImage}
                    loading="lazy"
                  />
                </div>
              )}
              {post.content && (
                <p className={styles.postContentPreview}>
                  {post.content.length > 200
                    ? `${post.content.slice(0, 200)}...`
                    : post.content}
                </p>
              )}
            </Link>
            {renderTags(post.tags)} {/* Di chuyển ra ngoài Link */}
            <div className={styles.postFooter}>
              <Link to={`/post/${post.id}`} className={styles.actionButton}>
                <MessageCircle size={16} />
                <span>{post.comment_count || 0} Comments</span>
              </Link>
            </div>
          </div>
        </div>
      ))}
      
      {totalPosts > postsPerPage && renderPagination()}
    </div>
  );
};

export default PostList;