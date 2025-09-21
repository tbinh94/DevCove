// PostList.jsx - PHIÊN BẢN ĐẦY ĐỦ VÀ HOÀN CHỈNH
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useOutletContext } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import DOMPurify from 'dompurify';
import ChallengeCard from './ChallengeCard';


DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const PostList = ({ showAllTags = false }) => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { onPostsLoaded } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPosts, setTotalPosts] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [postsPerPage] = useState(10);

  const [latestChallenge, setLatestChallenge] = useState(null);

  const urlParams = useMemo(() => {
    return {
      tags: searchParams.get('tags'),
      search: searchParams.get('search'),
      ordering: searchParams.get('ordering') || '-created_at'
    };
  }, [searchParams]);

  // useEffect để fetch dữ liệu
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // --- Phần fetch posts giữ nguyên như của bạn ---
        const postParams = {
          page: currentPage,
          page_size: postsPerPage,
          ordering: urlParams.ordering,
        };
        if (urlParams.tags) postParams.tags = urlParams.tags;
        if (urlParams.search) postParams.search = urlParams.search;

        // Gọi API fetch posts
        const postsDataResponse = await apiService.getPosts(postParams);
        const postResults = Array.isArray(postsDataResponse) ? postsDataResponse : postsDataResponse.results || [];
        setPosts(postResults);
        setTotalPosts(postsDataResponse.count || postResults.length);
        
        if (onPostsLoaded) {
          onPostsLoaded(postResults);
        }

        // --- Thêm phần fetch challenge ---
        // Chỉ fetch challenge ở trang đầu tiên và không có filter
        if (currentPage === 1 && !urlParams.tags && !urlParams.search) {
            try {
                const challengeData = await apiService.getLatestChallenge();
                setLatestChallenge(challengeData);
            } catch (challengeError) {
                // Không làm sập cả trang nếu chỉ lỗi fetch challenge
                console.warn('Could not fetch the latest challenge:', challengeError);
                setLatestChallenge(null);
            }
        } else {
            // Xóa challenge nếu người dùng chuyển trang hoặc filter
            setLatestChallenge(null);
        }

      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message || 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [isAuthenticated, currentPage, postsPerPage, urlParams.tags, urlParams.search, urlParams.ordering, onPostsLoaded]);


  // HỆ THỐNG VOTE 
  const handleVote = async (postId, voteType) => {
    if (!isAuthenticated) return;

    const originalPost = posts.find(p => p.id === postId);
    if (!originalPost) return;

    // Cập nhật UI ngay lập tức
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const currentVote = post.user_vote;
          let newVote = voteType;
          let newScore = post.calculated_score || 0;
          
          if (currentVote === voteType) {
            newVote = null;
            newScore += voteType === 'up' ? -1 : 1;
          } else if (currentVote) {
            newScore += voteType === 'up' ? 2 : -2;
          } else {
            newScore += voteType === 'up' ? 1 : -1;
          }
          
          return { ...post, calculated_score: newScore, user_vote: newVote };
        }
        return post;
      })
    );

    // Gửi request tới server
    try {
      const updated = await apiService.vote(postId, voteType);
      // Cập nhật lại với dữ liệu chính xác từ server
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                calculated_score: updated.score ?? updated.calculated_score ?? post.calculated_score,
                user_vote: updated.user_vote ?? updated.vote_type ?? post.user_vote,
              }
            : post
        )
      );
    } catch (err) {
      console.error('Vote error:', err);
      // Nếu lỗi, quay lại trạng thái ban đầu
      setPosts(prevPosts =>
        prevPosts.map(post => (post.id === postId ? originalPost : post))
      );
      setError('Failed to vote. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Hàm render các tag
  const renderTags = (tags) => {
    if (!tags || tags.length === 0) return null;
    return (
      <div className={styles.postTags}>
        {tags.map((tag) => (
          <Link to={`/?tags=${tag.slug}`} key={tag.id} className={styles.tagItem}>
            {tag.name}
          </Link>
        ))}
      </div>
    );
  };

  // Hàm thay đổi trang
  const changePage = (num) => {
    const totalPages = Math.ceil(totalPosts / postsPerPage);
    if (num < 1 || num > totalPages) return;
    
    // Cập nhật state nội bộ để trigger useEffect
    setCurrentPage(num);

    // Cập nhật URL
    setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('page', String(num));
        return newParams;
    });

    window.scrollTo(0, 0);
  };

  // Hàm render phân trang
  const renderPagination = () => {
    const totalPages = Math.ceil(totalPosts / postsPerPage);
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

  // ----- RENDER LOGIC -----
  if (loading) return <div className={styles.message}>Loading posts...</div>;
  if (error) return <div className={styles.message}>Error: {error}<button onClick={() => window.location.reload()}>Retry</button></div>;
  if (!posts.length && !latestChallenge) return <div className={styles.message}>No posts found.</div>;

  return (
    <div className={styles.postListContainer}>
      {currentPage === 1 && !urlParams.tags && !urlParams.search && (
          <ChallengeCard challenge={latestChallenge} />
      )}
      {posts.map(post => (
        <div key={post.id} className={styles.postCard}>
          <div className={styles.voteSection}>
            <button 
              onClick={() => handleVote(post.id, 'up')} 
              className={`${styles.voteButton} ${post.user_vote === 'up' ? styles.activeUp : ''}`} 
              disabled={!isAuthenticated}
              title={!isAuthenticated ? "Login to vote" : (post.user_vote === 'up' ? "Remove upvote" : "Upvote")}
            >
              <ChevronUp size={22} />
            </button>
            <span className={styles.voteScore}>{post.calculated_score || 0}</span>
            <button 
              onClick={() => handleVote(post.id, 'down')} 
              className={`${styles.voteButton} ${post.user_vote === 'down' ? styles.activeDown : ''}`} 
              disabled={!isAuthenticated}
              title={!isAuthenticated ? "Login to vote" : (post.user_vote === 'down' ? "Remove downvote" : "Downvote")}
            >
              <ChevronDown size={22} />
            </button>
          </div>
          <div className={styles.postContentArea}>
            {post.is_bot_reviewed && (<span className={styles.botReviewedBadge} title={post.bot_review_summary}>🤖 Reviewed</span>)}
            <Link to={`/post/${post.id}`} className={styles.postLink}>
              <div className={styles.postMeta}>
                Posted by u/{post.author?.username}
                {post.community && ` in r/${post.community.name}`}
              </div>
              <h3 className={styles.postTitle}>{post.title}</h3>
              {post.image_url && (
                <div className={styles.imageContainer}>
                  <img src={post.image_url} alt={post.title} className={styles.postImage} loading="lazy" />
                </div>
              )}
              {post.content && (
                <p className={styles.postContentPreview}>{post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}</p>
              )}
            </Link>
            {renderTags(post.tags)}
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