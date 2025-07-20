import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom'; // 1. Import useSearchParams
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import styles from './PostList.module.css';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const PostList = ({ showAllTags = false }) => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);
  const [searchParams] = useSearchParams(); // 2. Lấy searchParams từ URL

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const tags = searchParams.get('tags'); // 3. Lấy giá trị của param 'tags'
        const searchQuery = searchParams.get('search'); // Lấy luôn cả search query để lọc toàn diện

        const params = {
          page: currentPage,
          page_size: postsPerPage,
          sort: 'new',
        };

        // 4. Thêm tags và search vào params nếu chúng tồn tại
        if (tags) {
          params.tags = tags;
        }
        if (searchQuery) {
          params.search = searchQuery;
        }

        console.log('Fetching posts with params:', params);
        const data = await apiService.getPosts(params);

        const postData = Array.isArray(data) ? data : data.results || [];
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
    // 5. Thêm searchParams vào dependency array để component re-render khi URL thay đổi
  }, [isAuthenticated, currentPage, postsPerPage, searchParams]);

  const handleVote = async (postId, type) => {
    if (!isAuthenticated) return;
    try {
      const updated = await apiService.vote(postId, type);
      setPosts(posts.map(p => p.id === postId ? { ...p, calculated_score: updated.score, user_vote: updated.user_vote } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const renderTags = (tags) => {
    console.log('Post Tags:', tags);
    // Handle different tag formats that might come from the API
    if (!tags || tags.length === 0) {
      return null;
    }

    // Convert tags to a consistent format
    const normalizedTags = tags.map(tag => {
      // If tag is already an object with name and slug
      if (typeof tag === 'object' && tag.name) {
        return tag;
      }
      // If tag is a string, create a simple object
      if (typeof tag === 'string') {
        return {
          id: tag,
          name: tag,
          slug: tag.toLowerCase().replace(/\s+/g, '-')
        };
      }
      // If tag has other structure, try to extract name
      return {
        id: tag.id || tag,
        name: tag.name || tag.toString(),
        slug: tag.slug || (tag.name || tag.toString()).toLowerCase().replace(/\s+/g, '-')
      };
    });

    return (
      <div className={styles.postTags}>
        {normalizedTags.map((tag, index) => (
          <Link
            to={`/?tags=${tag.slug}`} // Cập nhật link để filter khi click vào tag
            key={tag.id || index}
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
    window.scrollTo(0,0);
  };

  const renderPagination = () => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max/2));
    let end = Math.min(totalPages, start + max -1);
    if (end - start +1 < max) start = Math.max(1, end - max +1);
    if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
    for (let i=start; i<=end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages -1) pages.push('...'); pages.push(totalPages); }
    return (
      <div className={styles.pagination}>
        <button onClick={() => changePage(currentPage-1)} disabled={currentPage===1} className={styles.pageBtn}>Previous</button>
        {pages.map((p,i) => p==='...' ? <span key={i} className={styles.pageInfo}>...</span> : <button key={i} onClick={()=>changePage(p)} className={`${styles.pageBtn} ${currentPage===p?styles.activePage:''}`}>{p}</button>)}
        <button onClick={() => changePage(currentPage+1)} disabled={currentPage===totalPages} className={styles.pageBtn}>Next</button>
      </div>
    );
  };

  if (loading) return <div className={styles.message}>Loading posts...</div>;
  if (error) return <div className={styles.message}>Error: {error}</div>;
  if (!posts.length) return <div className={styles.message}>No posts found matching your filters.</div>;

  return (
    <div className={styles.postListContainer}>
      {posts.map(post => (
        <div key={post.id} className={styles.postCard}>
          <div className={styles.voteSection}>
            <button onClick={()=>handleVote(post.id,'up')} className={`${styles.voteButton} ${post.user_vote==='up'?styles.activeUp:''}`}><ChevronUp size={22} /></button>
            <span className={styles.voteScore}>{post.calculated_score||0}</span>
            <button onClick={()=>handleVote(post.id,'down')} className={`${styles.voteButton} ${post.user_vote==='down'?styles.activeDown:''}`}><ChevronDown size={22} /></button>
          </div>
          <div className={styles.postContentArea}>
            <Link to={`/post/${post.id}`} className={styles.postLink}>
              <div className={styles.postMeta}>u/{post.author?.username}{post.community && ` in r/${post.community.name}`}</div>
              <h3 className={styles.postTitle}>{post.title}</h3>
              {renderTags(post.tags)}
              {post.image_url && <div className={styles.imageContainer}><img src={post.image_url} alt={post.title} className={styles.postImage} /></div>}
              {post.content && <p className={styles.postContentPreview}>{post.content.length>200?`${post.content.slice(0,200)}...`:post.content}</p>}
            </Link>
            <div className={styles.postFooter}><Link to={`/post/${post.id}`} className={styles.actionButton}><MessageCircle size={16} /><span>{post.comment_count||0} Comments</span></Link></div>
          </div>
        </div>
      ))}
      {totalPosts>postsPerPage && renderPagination()}
    </div>
  );
};

export default PostList;