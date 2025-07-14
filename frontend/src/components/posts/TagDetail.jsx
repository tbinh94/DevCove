import React, { useState, useEffect } from 'react';
//import './TagDetail.css';

const TagDetail = ({ tagSlug }) => {
  const [tag, setTag] = useState({
    name: 'Technology',
    color: '#007bff',
    posts_count: 42
  });
  
  const [posts, setPosts] = useState([
    {
      id: 1,
      title: 'The Future of AI Development',
      content: 'Artificial intelligence is rapidly evolving and transforming how we work and live. This comprehensive guide explores the latest trends and developments in AI technology.',
      author: { username: 'techguru' },
      community: { slug: 'technology' },
      created_at: '2024-01-15T10:30:00Z',
      num_comments: 23,
      score: 156,
      tags: [
        { name: 'AI', color: '#28a745', slug: 'ai' },
        { name: 'Machine Learning', color: '#ffc107', slug: 'ml' }
      ]
    },
    {
      id: 2,
      title: 'Web Development Best Practices 2024',
      content: 'Learn the essential practices for modern web development including performance optimization, accessibility, and security considerations.',
      author: { username: 'webdev_pro' },
      community: { slug: 'webdev' },
      created_at: '2024-01-14T08:15:00Z',
      num_comments: 31,
      score: 89,
      tags: [
        { name: 'JavaScript', color: '#f39c12', slug: 'javascript' },
        { name: 'React', color: '#61dafb', slug: 'react' }
      ]
    }
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(5);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days`;
    }
  };

  const truncateWords = (text, limit) => {
    const words = text.split(' ');
    if (words.length > limit) {
      return words.slice(0, limit).join(' ') + '...';
    }
    return text;
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // In a real app, you'd fetch new data here
  };

  return (
    <div className="tag-detail-container">
      <div className="tag-header">
        <h1 className="tag-title">
          <span className="tag-badge large" style={{ backgroundColor: tag.color }}>
            {tag.name}
          </span>
        </h1>
        <p className="tag-stats">{tag.posts_count} posts tagged with "{tag.name}"</p>
      </div>

      <div className="posts-list">
        {posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-body">
                <div className="post-meta">
                  {post.community && (
                    <>
                      <a href={`/r/${post.community.slug}`} className="community-badge">
                        r/{post.community.slug}
                      </a>
                      <span className="separator">•</span>
                    </>
                  )}
                  <span className="author">Posted by u/{post.author.username}</span>
                  <span className="separator">•</span>
                  <span className="time">{formatTimeAgo(post.created_at)} ago</span>
                </div>
                
                <h3 className="post-title">
                  <a href={`/posts/${post.id}`}>{post.title}</a>
                </h3>
                
                {/* Other tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="post-tags">
                    {post.tags.map(ptag => (
                      ptag.name !== tag.name && (
                        <a 
                          key={ptag.slug}
                          href={`/tags/${ptag.slug}`} 
                          className="tag-badge small"
                          style={{ backgroundColor: ptag.color }}
                        >
                          {ptag.name}
                        </a>
                      )
                    ))}
                  </div>
                )}
                
                {post.content && (
                  <div className="post-content">
                    {truncateWords(post.content, 30)}
                  </div>
                )}
                
                <div className="post-actions">
                  <a href={`/posts/${post.id}`} className="action-btn">
                    <span className="icon">💬</span>
                    {post.num_comments} Comments
                  </a>
                  <span className="action-btn">
                    <span className="icon">👍</span>
                    {post.score} votes
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏷️</div>
            <h3>No posts with this tag yet</h3>
            <p>Be the first to create a post with the "{tag.name}" tag!</p>
            {isAuthenticated && (
              <a href="/posts/create" className="btn">Create Post</a>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          {currentPage > 1 && (
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              className="page-btn"
            >
              ← Previous
            </button>
          )}
          
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          
          {currentPage < totalPages && (
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              className="page-btn"
            >
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TagDetail;