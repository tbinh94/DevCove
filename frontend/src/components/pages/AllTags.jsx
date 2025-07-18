import React, { useState, useEffect } from 'react';
import styles from './AllTags.module.css';

const AllTags = ({ onTagSelect, onClose }) => {
  const [allTags, setAllTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'popularity', 'recent'

  // Fetch all tags from backend
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/tags/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Transform data để match với format cần thiết
        const transformedTags = data.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
          post_count: tag.posts_count || 0,
          created_at: tag.created_at
        }));

        setAllTags(transformedTags);
        setFilteredTags(transformedTags);
      } catch (err) {
        console.error('Error fetching all tags:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTags();
  }, []);

  // Filter tags based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTags(allTags);
    } else {
      const filtered = allTags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    }
  }, [searchQuery, allTags]);

  // Sort tags
  useEffect(() => {
    const sorted = [...filteredTags].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popularity':
          return b.post_count - a.post_count;
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at);
        default:
          return 0;
      }
    });
    setFilteredTags(sorted);
  }, [sortBy, allTags, searchQuery]);

  // Helper function to get CSRF token
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const handleTagClick = (tag) => {
    if (onTagSelect) {
      onTagSelect(tag);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>All Tags</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>

          <div className={styles.sortContainer}>
            <label htmlFor="sort">Sort by:</label>
            <select 
              id="sort"
              value={sortBy} 
              onChange={handleSortChange}
              className={styles.sortSelect}
            >
              <option value="name">Name (A-Z)</option>
              <option value="popularity">Popularity</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading tags...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p>Error loading tags: {error}</p>
              <button 
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className={styles.statsBar}>
                <span className={styles.resultCount}>
                  {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'} found
                </span>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className={styles.clearSearch}
                  >
                    Clear search
                  </button>
                )}
              </div>

              <div className={styles.tagsGrid}>
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <div
                      key={tag.slug}
                      className={styles.tagCard}
                      onClick={() => handleTagClick(tag)}
                      style={{ '--tag-color': tag.color }}
                    >
                      <div className={styles.tagHeader}>
                        <span 
                          className={styles.tagName}
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                        <span className={styles.tagCount}>
                          {tag.post_count} {tag.post_count === 1 ? 'post' : 'posts'}
                        </span>
                      </div>
                      <div className={styles.tagSlug}>
                        #{tag.slug}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noResults}>
                    <p>No tags found matching "{searchQuery}"</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className={styles.clearSearch}
                    >
                      Show all tags
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTags;