import React, { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';
import AllTags from '../../pages/AllTags';

const Sidebar = ({ 
  selectedTags = [], 
  searchQuery = '', 
  onTagToggle,
  onTagRemove,
  onClearAllFilters,
  onClearSearch,
  user = null 
}) => {
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllTags, setShowAllTags] = useState(false);

  // Fetch popular tags from backend
  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Gọi API để lấy popular tags
        const response = await fetch('/api/tags/popular/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Thêm CSRF token nếu cần
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
          post_count: tag.posts_count || 0
        }));

        setPopularTags(transformedTags);
      } catch (err) {
        console.error('Error fetching popular tags:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularTags();
  }, []);

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

  const handleTagToggle = (tagSlug) => {
    if (onTagToggle) {
      onTagToggle(tagSlug);
    }
  };

  const handleTagRemove = (tagSlug) => {
    if (onTagRemove) {
      onTagRemove(tagSlug);
    }
  };

  const handleClearAllFilters = () => {
    if (onClearAllFilters) {
      onClearAllFilters();
    }
  };

  const handleClearSearch = () => {
    if (onClearSearch) {
      onClearSearch();
    }
  };

  const handleViewAllTags = (e) => {
    e.preventDefault();
    setShowAllTags(true);
  };

  const handleAllTagsClose = () => {
    setShowAllTags(false);
  };

  const handleTagSelectFromModal = (tag) => {
    handleTagToggle(tag.slug);
    setShowAllTags(false);
  };

  return (
    <div className={styles.sidebar}>
      {/* Tags Section */}
      <div className={styles.tagsSection}>
        <h3>Popular Tags</h3>
        
        {loading && (
          <div className={styles.loading}>
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
          <div className={styles.tagsList}>
            {popularTags.length > 0 ? (
              <>
                {popularTags.map((tag) => (
                  <a
                    key={tag.slug}
                    href="#"
                    className={`${styles.tagBadge} ${styles.tagToggle} ${
                      selectedTags.some(selectedTag => selectedTag.slug === tag.slug) ? styles.active : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleTagToggle(tag.slug);
                    }}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <span className={styles.tagCount}>{tag.post_count}</span>
                  </a>
                ))}
                <a 
                  href="/tags" 
                  className={styles.viewAllTags}
                  onClick={handleViewAllTags}
                >
                  View all tags →
                </a>
              </>
            ) : (
              <p className={styles.noTags}>No popular tags found</p>
            )}
          </div>
        )}
      </div>

      {/* Active Filters */}
      {(selectedTags.length > 0 || searchQuery) && (
        <div className={styles.filterStatus}>
          <h4>Active Filters:</h4>
          
          {selectedTags.length > 0 && (
            <div className={styles.filterItem}>
              <span>Tags:</span>
              <div className={styles.selectedTags}>
                {selectedTags.map((tag) => (
                  <span
                    key={tag.slug}
                    className={styles.filterValue}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      className={`${styles.clearFilter} ${styles.tagRemove}`}
                      onClick={() => handleTagRemove(tag.slug)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {searchQuery && (
            <div className={styles.filterItem}>
              <span>Search:</span>
              <span className={styles.filterValue}>
                {searchQuery}
                <button
                  className={styles.clearFilter}
                  onClick={handleClearSearch}
                >
                  ×
                </button>
              </span>
            </div>
          )}
          
          <a
            href="#"
            className={styles.clearAllFilters}
            onClick={(e) => {
              e.preventDefault();
              handleClearAllFilters();
            }}
          >
            Clear all filters
          </a>
        </div>
      )}
      
      {/* All Tags Modal */}
      {showAllTags && (
        <AllTags
          onTagSelect={handleTagSelectFromModal}
          onClose={handleAllTagsClose}
        />
      )}
    </div>
  );
};

export default Sidebar;