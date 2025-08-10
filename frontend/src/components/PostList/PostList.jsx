// PostList.jsx - CẢI THIỆN HỆ THỐNG VOTE
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle, Bot, X, Zap, ChevronsUpDown, Calendar, ArrowDownAZ } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const PostList = ({ showAllTags = false }) => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [postsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);

  const [overview, setOverview] = useState(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  
  const overviewModalRef = useRef(null);

  const urlParams = useMemo(() => {
    try {
      return {
        tags: searchParams.get('tags'),
        search: searchParams.get('search'),
        ordering: searchParams.get('ordering') || '-created_at'
      };
    } catch (error) {
      console.error('Error reading search params:', error);
      return { tags: null, search: null, ordering: '-created_at' };
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      setOverview(null); 
      
      try {
        const params = {
          page: currentPage,
          page_size: postsPerPage,
          ordering: urlParams.ordering,
        };

        if (urlParams.tags) params.tags = urlParams.tags;
        if (urlParams.search) params.search = urlParams.search;

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
  }, [isAuthenticated, currentPage, postsPerPage, urlParams.tags, urlParams.search, urlParams.ordering]);
  
  useEffect(() => {
    if (isOverviewModalOpen && overviewModalRef.current) {
        setTimeout(() => {
            overviewModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
  }, [isOverviewModalOpen]);

  const handleSortChange = (newOrdering) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('ordering', newOrdering);
      newParams.set('page', '1');
      return newParams;
    });
    setCurrentPage(1);
  };

  // ✨ CẢI THIỆN HÀM VOTE VỚI OPTIMISTIC UPDATE GIỐNG USER PROFILE
  const handleVote = async (postId, voteType) => {
    if (!isAuthenticated) {
      return;
    }

    // Lưu trữ trạng thái gốc để có thể revert nếu lỗi
    const originalPost = posts.find(p => p.id === postId);
    if (!originalPost) return;

    console.log('Vote clicked:', { 
      postId, 
      voteType, 
      originalVote: originalPost.user_vote, 
      originalScore: originalPost.calculated_score 
    });

    // 🚀 OPTIMISTIC UI UPDATE - Cập nhật giao diện ngay lập tức
    setPosts(prevPosts => {
      return prevPosts.map(post => {
        if (post.id === postId) {
          const currentVote = post.user_vote;
          let newVote = voteType;
          let newScore = post.calculated_score || 0;
          
          // Logic xử lý vote hiển thị siêu nhanh như User Profile
          if (currentVote === voteType) {
            // Cùng vote - bỏ vote
            newVote = null;
            newScore += (voteType === 'up') ? -1 : 1;
          } else if (currentVote) {
            // Vote khác - chuyển đổi
            newScore += (voteType === 'up') ? 2 : -2;
          } else {
            // Chưa vote - thêm vote mới
            newScore += (voteType === 'up') ? 1 : -1;
          }
          
          console.log('Optimistic update:', { newVote, newScore });
          
          return {
            ...post,
            calculated_score: newScore,
            user_vote: newVote
          };
        }
        return post;
      });
    });

    // 📡 GỬI REQUEST ĐẾN SERVER
    try {
      const updated = await apiService.vote(postId, voteType);
      console.log('API response:', updated);
      
      // Cập nhật với phản hồi từ server
      setPosts(prevPosts => {
        return prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                // Xử lý các định dạng phản hồi khác nhau từ API
                calculated_score: updated.score ?? updated.calculated_score ?? updated.vote_score ?? post.calculated_score,
                user_vote: updated.user_vote ?? updated.vote_type ?? post.user_vote
              }
            : post
        );
      });
      
      console.log('Updated with server response');
      
    } catch (err) {
      console.error('Vote error:', err);
      
      // 🔄 REVERT VỀ TRẠNG THÁI GỐC KHI CÓ LỖI
      setPosts(prevPosts => {
        return prevPosts.map(post => 
          post.id === postId 
            ? {
                ...post,
                calculated_score: originalPost.calculated_score,
                user_vote: originalPost.user_vote
              }
            : post
        );
      });
      
      // Hiển thị lỗi tạm thời
      setError('Failed to vote. Please try again.');
      // Tự động xóa lỗi sau 3 giây
      setTimeout(() => setError(null), 3000);
    }
  };

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
      <div className={styles.controlsContainer}>
        <button 
          onClick={handleGenerateOverview} 
          disabled={isOverviewLoading || !isAuthenticated || posts.length === 0}
          className={styles.overviewButton}
          title={!isAuthenticated ? "Đăng nhập để sử dụng" : "Tạo tổng quan cho các bài đăng hiện tại bằng AI"}
        >
          <div className={styles.overviewButtonInner}>
            <Bot size={18} />
            {isOverviewLoading ? 'Đang phân tích...' : 'AI Post Overview'}
          </div>
        </button>
        
        <div className={styles.sortControls}>
            <button 
                onClick={() => handleSortChange('-calculated_score')}
                className={`${styles.sortButton} ${urlParams.ordering === '-calculated_score' ? styles.activeSort : ''}`}
            >
                <Zap size={16} /> Hot
            </button>
            <button 
                onClick={() => handleSortChange('-created_at')}
                className={`${styles.sortButton} ${urlParams.ordering === '-created_at' ? styles.activeSort : ''}`}
            >
                <Calendar size={16} /> New
            </button>
            <button 
                onClick={() => handleSortChange('title')}
                className={`${styles.sortButton} ${urlParams.ordering === 'title' ? styles.activeSort : ''}`}
            >
                <ArrowDownAZ size={16} /> A-Z
            </button>
        </div>

        {overviewError && <p className={styles.overviewError}>{overviewError}</p>}
      </div>

      {posts.map(post => (
        <div key={post.id} className={styles.postCard}>
          <div className={styles.voteSection}>
            {/* ✨ CẢI THIỆN CÁC NÚT VOTE VỚI LOGIC TƯƠNG TỰ USER PROFILE */}
            <button 
              onClick={() => handleVote(post.id, 'up')} 
              className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.activeUp : ''}`} 
              disabled={!isAuthenticated}
              title={!isAuthenticated ? "Đăng nhập để vote" : (post.user_vote === 'up' ? "Remove upvote" : "Upvote")}
            >
              <ChevronUp size={22} />
            </button>
            <span className={styles.voteScore}>{post.calculated_score || 0}</span>
            <button 
              onClick={() => handleVote(post.id, 'down')} 
              className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.activeDown : ''}`} 
              disabled={!isAuthenticated}
              title={!isAuthenticated ? "Đăng nhập để vote" : (post.user_vote === 'down' ? "Remove downvote" : "Downvote")}
            >
              <ChevronDown size={22} />
            </button>
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

      {isOverviewModalOpen && (
        <div ref={overviewModalRef} className={styles.overviewModalOverlay}>
          <div className={styles.overviewModal}>
            <div className={styles.overviewModalHeader}>
              <h3>📊 DevAlly Overview</h3>
              <button onClick={() => setIsOverviewModalOpen(false)} className={styles.closeButton}><X size={24} /></button>
            </div>
            <div className={styles.overviewModalContent} dangerouslySetInnerHTML={{ 
                                                              __html: DOMPurify.sanitize(overview, {
                                                                  ADD_TAGS: ['style', 'script'],
                                                                  ADD_ATTR: ['onclick']
                                                              })
                                                          }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PostList;