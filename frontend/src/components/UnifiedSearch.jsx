import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const UnifiedSearch = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('posts');
  const [results, setResults] = useState({ posts: [], users: [] });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const searchTimeout = useRef(null);

  // Perform search
  const performSearch = async (searchQuery) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search/?q=${encodeURIComponent(searchQuery)}&type=${searchType}`,
        {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      setResults(data);
      setIsDropdownOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults({ posts: [], users: [], error: 'Search failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value.trim();
    setQuery(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (value.length >= 2) {
      searchTimeout.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setIsDropdownOpen(false);
      setResults({ posts: [], users: [] });
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search/?q=${encodeURIComponent(query)}`);
      setIsDropdownOpen(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const resultElements = document.querySelectorAll('.search-result');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, resultElements.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && resultElements[selectedIndex]) {
          e.preventDefault();
          resultElements[selectedIndex].click();
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Highlight search terms
  const highlightText = (text, searchQuery) => {
    if (!searchQuery || !text) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="unified-search">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <button
            type="button"
            className="search-type-selector"
            onClick={() => setSearchType(searchType === 'posts' ? 'users' : 'posts')}
          >
            {searchType === 'posts' ? 'Posts' : 'Users'}
          </button>
          
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && setIsDropdownOpen(true)}
            placeholder={searchType === 'posts' ? 'Search posts...' : 'Search users...'}
            className="search-input"
          />
          
          <button type="submit" className="search-submit">
            🔍
          </button>
        </div>
      </form>
      
      {isDropdownOpen && (
        <div className="search-dropdown show">
          {isLoading ? (
            <div className="search-loading">🔍 Searching...</div>
          ) : results.error ? (
            <div className="search-error">❌ {results.error}</div>
          ) : (
            <div className="search-results">
              {results.posts.length > 0 && (
                <>
                  <div className="search-category">📝 Posts</div>
                  {results.posts.map((post, index) => (
                    <div
                      key={`post-${index}`}
                      className={`search-result ${selectedIndex === index ? 'selected' : ''}`}
                      onClick={() => navigate(post.url)}
                    >
                      <div className="result-title">
                        <span className="result-icon">📝</span>
                        <span 
                          dangerouslySetInnerHTML={{
                            __html: highlightText(post.title, query)
                          }}
                        />
                      </div>
                      {post.content_snippet && (
                        <div 
                          className="result-snippet"
                          dangerouslySetInnerHTML={{
                            __html: highlightText(post.content_snippet, query)
                          }}
                        />
                      )}
                      <div className="result-meta">
                        <span className="result-author">by u/{post.author}</span>
                        <span className="result-date">{post.created_at}</span>
                        {post.community && (
                          <span className="result-community">in r/{post.community}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {results.users.length > 0 && (
                <>
                  <div className="search-category">👤 Users</div>
                  {results.users.map((user, index) => (
                    <div
                      key={`user-${index}`}
                      className={`search-result ${
                        selectedIndex === index + results.posts.length ? 'selected' : ''
                      }`}
                      onClick={() => navigate(user.url)}
                    >
                      <div className="result-title">
                        <span className="result-icon">👤</span>
                        u/
                        <span 
                          dangerouslySetInnerHTML={{
                            __html: highlightText(user.username, query)
                          }}
                        />
                      </div>
                      <div className="result-meta">
                        <span className="result-karma">Karma: {user.karma}</span>
                        <span className="result-joined">Joined: {user.joined}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {results.posts.length === 0 && results.users.length === 0 && !isLoading && (
                <div className="search-no-results">
                  <div className="no-results-icon">🔍</div>
                  <div className="no-results-text">No results found for "{query}"</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default UnifiedSearch;