// PostList.jsx - PHIÊN BẢN ĐẦY ĐỦ
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle, Bot, X } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import DOMPurify from 'dompurify'; // Cần để hiển thị Markdown an toàn

const PostList = ({ showAllTags = false }) => {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);

  // === START: AI OVERVIEW STATES ===
  const [overview, setOverview] = useState(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  // === END: AI OVERVIEW STATES ===

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
      setError(null);
      setOverview(null); // Reset overview khi fetch posts mới
      
      try {
        const params = {
          page: currentPage,
          page_size: postsPerPage,
          sort: 'new',
        };

        if (urlParams.tags) params.tags = urlParams.tags;
        if (urlParams.search) params.search = urlParams.search;

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

  // === START: AI OVERVIEW FUNCTION ===
  const handleGenerateOverview = async () => {
    if (!isAuthenticated || posts.length === 0) {
      if (!isAuthenticated) alert("Bạn cần đăng nhập để dùng tính năng này.");
      return;
    }

    setIsOverviewLoading(true);
    setOverviewError(null);
    setOverview(null);

    try {
      const postIds = posts.map(p => p.id);
      // Gọi hàm API service đã được cập nhật
      const response = await apiService.generatePostListOverview({ post_ids: postIds });
      
      setOverview(response.overview);
      setIsOverviewModalOpen(true);
    } catch (err) {
      console.error('Error generating overview:', err);
      const errorMessage = err.response?.data?.error || 'Không thể tạo tổng quan. Vui lòng thử lại.';
      setOverviewError(errorMessage);
    } finally {
      setIsOverviewLoading(false);
    }
  };
  // === END: AI OVERVIEW FUNCTION ===

  const renderTags = (tags) => {
    if (!tags || tags.length === 0) return null;
    const normalizedTags = tags.map((tag, index) => {
        if (typeof tag === 'object' && tag.name) return tag;
        if (typeof tag === 'string') return { id: tag, name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') };
        return {
            id: tag.id || `tag-${index}`,
            name: tag.name || tag.toString(),
            slug: tag.slug || (tag.name || tag.toString()).toLowerCase().replace(/\s+/g, '-')
        };
    });
    return (
      <div className={styles.postTags}>
        {normalizedTags.map((tag) => (
          <Link to={`/?tags=${tag.slug}`} key={tag.id} className={styles.tagItem}>
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
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return (
      <div className={styles.pagination}>
        <button onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} className={styles.pageBtn}>Previous</button>
        {pages.map((p, i) => p === '...' ? <span key={`ellipsis-${i}`} className={styles.pageInfo}>...</span> : <button key={`page-${p}`} onClick={() => changePage(p)} className={`${styles.pageBtn} ${currentPage === p ? styles.activePage : ''}`}>{p}</button>)}
        <button onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} className={styles.pageBtn}>Next</button>
      </div>
    );
  };

  if (loading) return <div className={styles.message}>Loading posts...</div>;
  if (error) return <div className={styles.message}>Error: {error}<button onClick={() => window.location.reload()}>Retry</button></div>;
  if (!posts.length) return <div className={styles.message}>No posts found matching your filters.</div>;

  return (
    <div className={styles.postListContainer}>
      {/* === START: AI OVERVIEW UI === */}
      <div className={styles.overviewControlPanel}>
        <button 
          onClick={handleGenerateOverview} 
          disabled={isOverviewLoading || !isAuthenticated || posts.length === 0}
          className={styles.overviewButton}
          title={!isAuthenticated ? "Đăng nhập để sử dụng" : "Tạo tổng quan cho các bài đăng hiện tại bằng AI"}
        >
          <Bot size={18} />
          {isOverviewLoading ? 'Đang phân tích...' : 'Lấy tổng quan AI'}
        </button>
        {overviewError && <p className={styles.overviewError}>{overviewError}</p>}
      </div>
      {/* === END: AI OVERVIEW UI === */}

      {posts.map(post => (
        <div key={post.id} className={styles.postCard}>
          <div className={styles.voteSection}>
            <button onClick={() => handleVote(post.id, 'up')} className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.activeUp : ''}`} disabled={!isAuthenticated}><ChevronUp size={22} /></button>
            <span className={styles.voteScore}>{post.calculated_score || 0}</span>
            <button onClick={() => handleVote(post.id, 'down')} className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.activeDown : ''}`} disabled={!isAuthenticated}><ChevronDown size={22} /></button>
          </div>
          <div className={styles.postContentArea}>
            {post.is_bot_reviewed && (<span className={styles.botReviewedBadge} title={post.bot_review_summary}>🤖 Reviewed</span>)}
            <Link to={`/post/${post.id}`} className={styles.postLink}>
              <div className={styles.postMeta}>u/{post.author?.username}{post.community && ` in r/${post.community.name}`}</div>
              <h3 className={styles.postTitle}>{post.title}</h3>
              {post.image_url && (
                <div className={styles.imageContainer}><img src={post.image_url} alt={post.title} className={styles.postImage} loading="lazy" /></div>
              )}
              {post.content && (
                <p className={styles.postContentPreview}>{post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}</p>
              )}
            </Link>
            {renderTags(post.tags)}
            <div className={styles.postFooter}>
              <Link to={`/post/${post.id}`} className={styles.actionButton}><MessageCircle size={16} /><span>{post.comment_count || 0} Comments</span></Link>
            </div>
          </div>
        </div>
      ))}
      
      {totalPosts > postsPerPage && renderPagination()}

      {/* === START: AI OVERVIEW MODAL === */}
      {isOverviewModalOpen && (
        <div className={styles.overviewModalOverlay}>
          <div className={styles.overviewModal}>
            <div className={styles.overviewModalHeader}>
              <h3>📊 Tổng quan AI</h3>
              <button onClick={() => setIsOverviewModalOpen(false)} className={styles.closeButton}><X size={24} /></button>
            </div>
            <div className={styles.overviewModalContent} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(overview) }} />
          </div>
        </div>
      )}
      {/* === END: AI OVERVIEW MODAL === */}
    </div>
  );
};

export default PostList;