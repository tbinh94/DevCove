// component chứa logic tìm kiếm thống nhất cho posts và users
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api'; 
import styles from './UnifiedSearch.module.css';

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

  const performSearch = async (searchQuery) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const data = await apiService.search(searchQuery, searchType);
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
    const value = e.target.value;
    setQuery(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue.length >= 2) {
      searchTimeout.current = setTimeout(() => {
        performSearch(trimmedValue);
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
      navigate(`/search?q=${encodeURIComponent(query)}&type=${searchType}`);
      setIsDropdownOpen(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const resultElements = document.querySelectorAll(`.${styles.searchResult}`);
    
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

  // Handle result click
  const handleResultClick = (result, type) => {
    if (type === 'post') {
      // Navigate to post detail page using the same pattern as PostList
      navigate(`/post/${result.id}`);
    } else if (type === 'user') {
      // Navigate to user profile page
      navigate(result.url || `/user/${result.username}`);
    }
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
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
    <div ref={searchRef} className={styles.unifiedSearch}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={styles.searchInputContainer}>
          <button
            type="button"
            className={styles.searchTypeSelector}
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
            className={styles.searchInput}
          />
          
          <button type="submit" className={styles.searchSubmit}>
            🔍
          </button>
        </div>
      </form>
      
      {isDropdownOpen && (
        <div className={`${styles.searchDropdown} ${styles.show}`}>
          {isLoading ? (
            <div className={styles.searchLoading}>🔍 Searching...</div>
          ) : results.error ? (
            <div className={styles.searchError}>❌ {results.error}</div>
          ) : (
            <div className={styles.searchResults}>
              {results.posts.length > 0 && (
                <>
                  <div className={styles.searchCategory}>📝 Posts</div>
                  {results.posts.map((post, index) => (
                    <div
                      key={`post-${post.id || index}`}
                      className={`${styles.searchResult} ${selectedIndex === index ? styles.selected : ''}`}
                      onClick={() => handleResultClick(post, 'post')}
                    >
                      <div className={styles.resultTitle}>
                        <span className={styles.resultIcon}>📝</span>
                        <span 
                          dangerouslySetInnerHTML={{
                            __html: highlightText(post.title, query)
                          }}
                        />
                      </div>
                      {post.content_snippet && (
                        <div 
                          className={styles.resultSnippet}
                          dangerouslySetInnerHTML={{
                            __html: highlightText(post.content_snippet, query)
                          }}
                        />
                      )}
                      <div className={styles.resultMeta}>
                        <span className={styles.resultAuthor}>by u/{post.author}</span>
                        <span className={styles.resultDate}>{post.created_at}</span>
                        {post.community && (
                          <span className={styles.resultCommunity}>in r/{post.community}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {results.users.length > 0 && (
                <>
                  <div className={styles.searchCategory}>👤 Users</div>
                  {results.users.map((user, index) => (
                    <div
                      key={`user-${user.id || index}`}
                      className={`${styles.searchResult} ${
                        selectedIndex === index + results.posts.length ? styles.selected : ''
                      }`}
                      onClick={() => handleResultClick(user, 'user')}
                    >
                      <div className={styles.resultTitle}>
                        <span className={styles.resultIcon}>👤</span>
                        u/
                        <span 
                          dangerouslySetInnerHTML={{
                            __html: highlightText(user.username, query)
                          }}
                        />
                      </div>
                      <div className={styles.resultMeta}>
                        <span className={styles.resultKarma}>Karma: {user.karma}</span>
                        <span className={styles.resultJoined}>Joined: {user.joined}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {results.posts.length === 0 && results.users.length === 0 && !isLoading && (
                <div className={styles.searchNoResults}>
                  <div className={styles.noResultsIcon}>🔍</div>
                  <div className={styles.noResultsText}>No results found for "{query}"</div>
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