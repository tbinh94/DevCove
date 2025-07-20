import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './SearchResults.module.css';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'posts');
  const [results, setResults] = useState({ posts: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Perform search when component mounts or search params change
  useEffect(() => {
    const searchQuery = searchParams.get('q');
    const type = searchParams.get('type') || 'posts';
    
    if (searchQuery) {
      setQuery(searchQuery);
      setSearchType(type);
      performSearch(searchQuery, type);
    }
  }, [searchParams]);

  // Perform the actual search
  const performSearch = async (searchQuery, type = 'posts') => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/search/?q=${encodeURIComponent(searchQuery)}&type=${type}`,
        {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please try again.');
      // Fallback to mock data for demonstration
      setResults({
        posts: query.toLowerCase().includes('react') ? [
          {
            id: 1,
            title: 'Getting Started with React Hooks',
            author: 'reactdev',
            community: 'reactjs',
            created_at: 'Jan 15, 2024',
            content_snippet: 'Learn how to use React hooks effectively in your applications...'
          },
          {
            id: 2,
            title: 'React Performance Optimization Tips',
            author: 'webmaster',
            community: 'webdev',
            created_at: 'Jan 14, 2024',
            content_snippet: 'Improve your React app performance with these proven techniques...'
          }
        ] : [],
        users: query.toLowerCase().includes('react') ? [
          {
            id: 1,
            username: 'reactexpert',
            joined: 'Jun 2023',
            karma: 1250,
            url: '/user/reactexpert'
          },
          {
            id: 2,
            username: 'reactnewbie',
            joined: 'Nov 2023',
            karma: 89,
            url: '/user/reactnewbie'
          }
        ] : []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search type change
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    if (query.trim()) {
      navigate(`/search/?q=${encodeURIComponent(query)}&type=${type}`);
    }
  };

  // Highlight search terms in text
  const highlightText = (text, searchQuery) => {
    if (!searchQuery || !text) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background: #fef3c7; color: #92400e; padding: 2px 4px; border-radius: 3px; font-weight: 500;">$1</mark>');
  };

  // Handle result click
  const handleResultClick = (result, type) => {
    if (type === 'post') {
      navigate(`/post/${result.id}`);
    } else if (type === 'user') {
      navigate(result.url || `/user/${result.username}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // If already formatted, return as is
    if (typeof dateString === 'string' && !dateString.includes('T')) {
      return dateString;
    }
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const hasResults = (results.posts && results.posts.length > 0) || (results.users && results.users.length > 0);
  const showingPosts = searchType === 'posts' || searchType === 'all';
  const showingUsers = searchType === 'users' || searchType === 'all';

  return (
    <div className={styles.searchPageContainer}>
      <div className={styles.searchPageHeader}>
        <h1 className={styles.searchPageTitle}>🔍 Search Results</h1>
        <p className={styles.searchPageSubtitle}>Find posts and users across the community</p>
      </div>

      <div className={styles.searchFormContainer}>
        <div className={styles.searchTypeSelector}>
          <button
            type="button"
            className={`${styles.searchTypeBtn} ${searchType === 'posts' ? styles.active : ''}`}
            onClick={() => handleSearchTypeChange('posts')}
          >
            📝 Posts
          </button>
          <button
            type="button"
            className={`${styles.searchTypeBtn} ${searchType === 'users' ? styles.active : ''}`}
            onClick={() => handleSearchTypeChange('users')}
          >
            👤 Users
          </button>
          <button
            type="button"
            className={`${styles.searchTypeBtn} ${searchType === 'all' ? styles.active : ''}`}
            onClick={() => handleSearchTypeChange('all')}
          >
            🔍 All
          </button>
        </div>
      </div>

      {isLoading && (
        <div className={styles.searchResultsSection}>
          <div className={styles.searchLoading}>
            <div className={styles.loadingSpinner}>🔍</div>
            <p>Searching for "{query}"...</p>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.searchResultsSection}>
          <div className={styles.searchError}>
            <div className={styles.errorIcon}>❌</div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!isLoading && query && (
        hasResults ? (
          <>
            {/* Posts Results */}
            {showingPosts && results.posts && results.posts.length > 0 && (
              <div className={styles.searchResultsSection}>
                <div className={styles.searchResultsHeader}>
                  <h2 className={styles.searchResultsTitle}>
                    📝 Posts
                    <span className={styles.searchResultsCount}>{results.posts.length}</span>
                  </h2>
                </div>
                <ul className={styles.searchResultsList}>
                  {results.posts.map(post => (
                    <li key={post.id} className={styles.searchResultItem}>
                      <div 
                        className={styles.searchResultLink}
                        onClick={() => handleResultClick(post, 'post')}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={styles.postInfo} style={{ flex: 1 }}>
                          <div 
                            className={styles.postTitle}
                            dangerouslySetInnerHTML={{
                              __html: highlightText(post.title, query)
                            }}
                          />
                          {post.content_snippet && (
                            <div 
                              className={styles.postSnippet}
                              dangerouslySetInnerHTML={{
                                __html: highlightText(post.content_snippet, query)
                              }}
                            />
                          )}
                          <div className={styles.userMeta}>
                            <span>by u/{post.author}</span>
                            {post.community && (
                              <span className={styles.userBadge}>r/{post.community}</span>
                            )}
                            <span>📅 {formatDate(post.created_at)}</span>
                          </div>
                        </div>
                        <span className={styles.searchResultArrow}>→</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ height: '30px' }}></div>

            {/* Users Results */}
            {showingUsers && results.users && results.users.length > 0 && (
              <div className={styles.searchResultsSection}>
                <div className={styles.searchResultsHeader}>
                  <h2 className={styles.searchResultsTitle}>
                    👤 Users
                    <span className={styles.searchResultsCount}>{results.users.length}</span>
                  </h2>
                </div>
                <ul className={styles.searchResultsList}>
                  {results.users.map(user => (
                    <li key={user.id} className={styles.searchResultItem}>
                      <div 
                        className={styles.searchResultLink}
                        onClick={() => handleResultClick(user, 'user')}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={styles.userAvatarPlaceholder}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userInfo}>
                          <div 
                            className={styles.username}
                            dangerouslySetInnerHTML={{
                              __html: highlightText(user.username, query)
                            }}
                          />
                          <div className={styles.userMeta}>
                            <span>📅 Joined {user.joined}</span>
                            <span className={styles.userBadge}>Karma: {user.karma}</span>
                          </div>
                        </div>
                        <span className={styles.searchResultArrow}>→</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className={styles.searchResultsSection}>
            <div className={styles.noResultsContainer}>
              <div className={styles.noResultsIcon}>🤷</div>
              <h3 className={styles.noResultsTitle}>No results found</h3>
              <p className={styles.noResultsText}>
                We couldn't find any {searchType === 'all' ? 'results' : searchType} matching "{query}"
              </p>
              <div className={styles.noResultsSuggestions}>
                <h4>Search Tips:</h4>
                <ul>
                  <li>Check your spelling</li>
                  <li>Try different or more general keywords</li>
                  <li>Try searching in a different category</li>
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