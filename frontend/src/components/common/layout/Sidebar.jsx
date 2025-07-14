import React from 'react';
import styles from './Sidebar.module.css';

const Sidebar = ({ 
  popularTags = [], 
  selectedTags = [], 
  searchQuery = '', 
  onTagToggle,
  onTagRemove,
  onClearAllFilters,
  onClearSearch,
  user = null 
}) => {
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

  return (
    <div className={styles.sidebar}>
      {/* Tags Section */}
      <div className={styles.tagsSection}>
        <h3>Popular Tags</h3>
        <div className={styles.tagsList}>
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
          <a href="/tags" className={styles.viewAllTags}>
            View all tags →
          </a>
        </div>
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
    </div>
  );
};

export default Sidebar;