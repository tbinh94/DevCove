import React, { useState, useEffect, useRef } from 'react';
//import './SearchResults.css';

const SearchResults = () => {
  const [query, setQuery] = useState('react');
  const [posts, setPosts] = useState([
    {
      id: 1,
      title: 'Getting Started with React Hooks',
      author: { username: 'reactdev' },
      community: { slug: 'reactjs' },
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      title: 'React Performance Optimization Tips',
      author: { username: 'webmaster' },
      community: { slug: 'webdev' },
      created_at: '2024-01-14T08:15:00Z'
    }
  ]);
  
  const [users, setUsers] = useState([
    {
      id: 1,
      username: 'reactexpert',
      joined: '2023-06-15T00:00:00Z',
      karma: 1250
    },
    {
      id: 2,
      username: 'reactnewbie',
      joined: '2023-11-20T00:00:00Z',
      karma: 89
    }
  ]);

  const searchInputRef = useRef(null);

  useEffect(() => {
    // Focus on search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.setSelectionRange(query.length, query.length);
    }
  }, []);

  useEffect(() => {
    // Highlight search results
    if (query) {
      const results = document.querySelectorAll('.username, .post-title');
      results.forEach((el) => {
        const text = el.textContent;
        const regex = new RegExp(`(${query})`, 'gi');
        const highlightedText = text.replace(regex, '<mark style="background: #fff3cd; padding: 1px 2px; border-radius: 2px;">$1</mark>');
        el.innerHTML = highlightedText;
      });
    }
  }, [query, posts, users]);

  const handleSearch = (e) => {
    e.preventDefault();
    // In a real app, you'd make an API call here
    console.log('Searching for:', query);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatJoinDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const hasResults = posts.length > 0 || users.length > 0;

  return (
    <div className="search-page-container">
      <div className="search-page-header">
        <h1 className="search-page-title">🔍 Search Results</h1>
        <p className="search-page-subtitle">Find posts and users across the community</p>
      </div>

      <div className="search-form-container">
        <form onSubmit={handleSearch} className="enhanced-search-form" id="searchForm">
          <div className="search-input-wrapper">
            <span className="search-input-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              name="q"
              value={query}
              onChange={handleInputChange}
              placeholder="Search for posts or users..."
              className="enhanced-search-input"
              autoComplete="off"
              required
            />
          </div>
          <button type="submit" className="enhanced-search-button">
            Search
          </button>
        </form>
      </div>

      {query && (
        hasResults ? (
          <>
            {posts.length > 0 && (
              <div className="search-results-section">
                <div className="search-results-header">
                  <h2 className="search-results-title">
                    📝 Posts
                    <span className="search-results-count">{posts.length}</span>
                  </h2>
                </div>
                <ul className="search-results-list">
                  {posts.map(post => (
                    <li key={post.id} className="search-result-item">
                      <a href={`/posts/${post.id}`} className="search-result-link">
                        <div className="post-info" style={{ flex: 1 }}>
                          <div className="username post-title">{post.title}</div>
                          <div className="user-meta">
                            <span>by u/{post.author.username}</span>
                            {post.community && (
                              <span className="user-badge">r/{post.community.slug}</span>
                            )}
                            <span>📅 {formatDate(post.created_at)}</span>
                          </div>
                        </div>
                        <span className="search-result-arrow">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ height: '30px' }}></div>

            {users.length > 0 && (
              <div className="search-results-section">
                <div className="search-results-header">
                  <h2 className="search-results-title">
                    👤 Users
                    <span className="search-results-count">{users.length}</span>
                  </h2>
                </div>
                <ul className="search-results-list">
                  {users.map(user => (
                    <li key={user.id} className="search-result-item">
                      <a href={`/users/${user.username}`} className="search-result-link">
                        <div className="user-avatar-placeholder">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                          <div className="username">{user.username}</div>
                          <div className="user-meta">
                            <span>📅 Joined {formatJoinDate(user.joined)}</span>
                            <span className="user-badge">Karma: {user.karma}</span>
                          </div>
                        </div>
                        <span className="search-result-arrow">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="search-results-section">
            <div className="no-results-container">
              <div className="no-results-icon">🤷</div>
              <h3 className="no-results-title">No results found</h3>
              <p className="no-results-text">
                We couldn't find any posts or users matching "{query}"
              </p>
              <div className="no-results-suggestions">
                <h4>Search Tips:</h4>
                <ul>
                  <li>Check your spelling</li>
                  <li>Try different or more general keywords</li>
                </ul>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default SearchResults;