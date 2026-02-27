// PostList.jsx - PHIÊN BẢN ĐẦY ĐỦ VÀ HOÀN CHỈNH
import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const PostList = ({ showAllTags = false, filter = null }) => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { onPostsLoaded } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const [page, setPage] = useState(1);
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
  // Reset when filters change
  useEffect(() => {
    setPage(1);
    setPosts([]);
    setHasMore(true);
  }, [urlParams.tags, urlParams.search, urlParams.ordering, filter]);

  // Fetch data
  useEffect(() => {
    const fetchAllData = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        let postsDataResponse;

        if (filter === 'bookmarks') {
          const bookmarksResponse = await apiService.getMyBookmarks(page);
          const bookmarkResults = Array.isArray(bookmarksResponse) ? bookmarksResponse : bookmarksResponse.results || [];
          const extractedPosts = bookmarkResults.map(b => (b.post ? { ...b.post, is_bookmarked: true } : null)).filter(Boolean);

          postsDataResponse = Array.isArray(bookmarksResponse)
            ? { next: null, results: extractedPosts }
            : { ...bookmarksResponse, results: extractedPosts };
        } else {
          const postParams = {
            page: page,
            page_size: postsPerPage,
            ordering: urlParams.ordering,
          };
          if (urlParams.tags) postParams.tags = urlParams.tags;
          if (urlParams.search) postParams.search = urlParams.search;

          postsDataResponse = await apiService.getPosts(postParams);
        }

        const postResults = Array.isArray(postsDataResponse) ? postsDataResponse : postsDataResponse.results || [];
        setPosts(prev => page === 1 ? postResults : [...prev, ...postResults]);
        setHasMore(!!postsDataResponse.next);

        if (onPostsLoaded && page === 1) {
          onPostsLoaded(postResults);
        }

        // --- Thêm phần fetch challenge ---
        if (page === 1 && !urlParams.tags && !urlParams.search) {
          try {
            const challengeData = await apiService.getLatestChallenge();
            setLatestChallenge(challengeData);
          } catch (challengeError) {
            console.warn('Could not fetch the latest challenge:', challengeError);
            setLatestChallenge(null);
          }
        } else if (page === 1) {
          setLatestChallenge(null);
        }

      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message || 'Failed to fetch posts');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchAllData();
  }, [isAuthenticated, page, postsPerPage, urlParams.tags, urlParams.search, urlParams.ordering, filter]);

  const observerTarget = useRef(null);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: '200px' } // Trigger earlier before reaching the absolute bottom
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMore, loading, loadingMore]);


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

  // Removed old pagination logic to support infinite scroll

  // ----- RENDER LOGIC -----
  if (loading) return <div className={styles.message}>Loading posts...</div>;
  if (error) return <div className={styles.message}>Error: {error}<button onClick={() => window.location.reload()}>Retry</button></div>;
  if (!posts.length && !latestChallenge) return <div className={styles.message}>No posts found.</div>;

  return (
    <div className={styles.postListContainer}>
      {page === 1 && !urlParams.tags && !urlParams.search && (
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

      {loadingMore && (
        <div className={styles.loadingMoreContainer}>
          <div className={styles.loadingSpinner}></div>
          <span className={styles.loadingMoreText}>Fetching more posts...</span>
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <div className={styles.noMorePosts}>You've reached the end! 🎉</div>
      )}

      {/* Target for IntersectionObserver */}
      <div ref={observerTarget} style={{ height: '20px' }}></div>

    </div>
  );
};

export default PostList;