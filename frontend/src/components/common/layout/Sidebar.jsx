// Sidebar.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, Zap, Calendar, ArrowDownAZ } from 'lucide-react';
import styles from './Sidebar.module.css';
import TagsModal from '../../pages/TagsModal';
import { useAuth } from '../../../contexts/AuthContext';

const Sidebar = ({ 
  className,
  isOpen, // NEW: Controls visibility on mobile
  onClose, // NEW: Function to close the sidebar (e.g., by clicking overlay)
  user = null,
  posts = [],
  onGenerateOverview,
  isOverviewLoading = false,
  overviewError = null,
}) => {
  const { isAuthenticated } = useAuth();
  const [popularTags, setPopularTags] = useState([]);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get current filters from URL
  const getCurrentFilters = () => {
    const urlTags = searchParams.get('tags');
    const ordering = searchParams.get('ordering') || '-created_at';
    return {
      selectedTags: urlTags ? urlTags.split(',').map(slug => ({
        slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      })) : [],
      ordering
    };
  };

  const { selectedTags, ordering, searchQuery } = getCurrentFilters();

  // Fetch popular tags from backend
  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/tags/popular/', {
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

  const updateUrlParams = (newTags, newSearch = null, newOrdering = null) => {
    const params = new URLSearchParams(searchParams);
    
    if (newTags && newTags.length > 0) {
      params.set('tags', newTags.join(','));
    } else {
      params.delete('tags');
    }

    if (newOrdering) {
      params.set('ordering', newOrdering);
      params.set('page', '1');
    }
    
    navigate(params.toString() ? `/?${params.toString()}` : '/');
  };

  const handleTagToggle = (tagSlug) => {
    const currentTagSlugs = selectedTags.map(tag => tag.slug);
    let newTagSlugs;
    if (currentTagSlugs.includes(tagSlug)) {
      newTagSlugs = currentTagSlugs.filter(slug => slug !== tagSlug);
    } else {
      newTagSlugs = [...currentTagSlugs, tagSlug];
    }
    updateUrlParams(newTagSlugs);
  };

  const handleTagRemove = (tagSlug) => {
    const newTagSlugs = selectedTags
      .map(tag => tag.slug)
      .filter(slug => slug !== tagSlug);
    
    updateUrlParams(newTagSlugs);
  };

  const handleClearAllFilters = () => {
    navigate('/');
  };

  const handleClearSearch = () => {
    const currentTagSlugs = selectedTags.map(tag => tag.slug);
    updateUrlParams(currentTagSlugs, '');
  };

  const handleSortChange = (newOrdering) => {
    const currentTagSlugs = selectedTags.map(tag => tag.slug);
    updateUrlParams(currentTagSlugs, null, newOrdering);
  };

  const handleGenerateOverviewClick = () => {
    if (!isAuthenticated) {
      alert("Bạn cần đăng nhập để dùng tính năng này.");
      return;
    }
    if (posts.length === 0) {
      return;
    }
    if (onGenerateOverview) {
      onGenerateOverview();
    }
  };

  const isTagSelected = (tagSlug) => {
    return selectedTags.some(selectedTag => selectedTag.slug === tagSlug);
  };

  const getTagDisplayInfo = (tag) => {
    const selected = selectedTags.find(selectedTag => selectedTag.slug === tag.slug);
    return selected || tag;
  };

  const getSortButtonClass = (sortType) => {
    return `${styles.sortButton} ${ordering === sortType ? styles.activeSort : ''}`;
  };

  return (
    <>
      {/* --- NEW: Overlay for mobile view --- */}
      <div 
        className={`${styles.sidebarOverlay} ${isOpen ? styles.sidebarOverlayActive : ''}`} 
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      {/* --- END: Overlay --- */}

      {/* --- MODIFIED: Added classes for mobile open/close state --- */}
      <div className={`${styles.sidebar} ${className || ''} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* AI Overview & Sort Controls Section */}
        <div className={styles.controlsSection}>
          <h3>Smart Tools</h3>
          
          <button 
            onClick={handleGenerateOverviewClick} 
            disabled={isOverviewLoading || !isAuthenticated || posts.length === 0}
            className={`${styles.overviewButton} ${isOverviewLoading ? styles.loading : ''}`}
            title={!isAuthenticated ? "Đăng nhập để sử dụng" : "Tạo tổng quan cho các bài đăng hiện tại bằng AI"}
          >
            <div className={styles.overviewButtonInner}>
              <Bot size={18} />
              <span>{isOverviewLoading ? 'Analyzing...' : 'AI Overview'}</span>
            </div>
          </button>
          
          <div className={styles.sortControls}>
            <div className={styles.sortLabel}>Sort by:</div>
            <div className={styles.sortButtons}>
              <button 
                onClick={() => handleSortChange('-calculated_score')}
                className={getSortButtonClass('-calculated_score')}
                title="Sort by popularity (votes)"
              >
                <Zap size={16} />
                <span>Hot</span>
              </button>
              <button 
                onClick={() => handleSortChange('-created_at')}
                className={getSortButtonClass('-created_at')}
                title="Sort by creation time"
              >
                <Calendar size={16} />
                <span>New</span>
              </button>
              <button 
                onClick={() => handleSortChange('title')}
                className={getSortButtonClass('title')}
                title="Sort alphabetically"
              >
                <ArrowDownAZ size={16} />
                <span>A-Z</span>
              </button>
            </div>
          </div>
          {overviewError && (
            <div className={styles.overviewError}>
              {overviewError}
            </div>
          )}
        </div>

        <div className={styles.tagsSection}>
          <h3>Popular Tags</h3>
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
            <div className={styles.tagsList}>
              {popularTags.length > 0 ? (
                <>
                  {popularTags.map((tag) => {
                    const selected = isTagSelected(tag.slug);
                    const displayTag = getTagDisplayInfo(tag);
                    
                    return (
                      <button
                        key={tag.slug}
                        className={`${styles.tagBadge} ${styles.tagToggle} ${
                          selected ? styles.active : ''
                        }`}
                        onClick={() => handleTagToggle(tag.slug)}
                        style={{ 
                          backgroundColor: tag.color,
                          opacity: selected ? 0.9 : 1,
                          fontWeight: selected ? 'bold' : 'normal'
                        }}
                      >
                        {displayTag.name}
                        <span className={styles.tagCount}>{tag.post_count}</span>
                        {selected && <span className={styles.selectedIndicator}>✓</span>}
                      </button>
                    );
                  })}
                  <button 
                      className={styles.viewAllButton} 
                      onClick={() => setIsTagsModalOpen(true)}
                  >
                      View all tags →
                  </button>
                </>
              ) : (
                <p className={styles.noTags}>No popular tags found</p>
              )}
            </div>
          )}
        </div>
        {(selectedTags.length > 0 || searchQuery) && (
          <div className={styles.filterStatus}>
            <div className={styles.filterHeader}>
              <h4>Active Filters</h4>
              <button
                className={styles.clearAllBtn}
                onClick={handleClearAllFilters}
              >
                Clear All
              </button>
            </div>
            {selectedTags.length > 0 && (
              <div className={styles.filterItem}>
                <div className={styles.filterLabel}>
                  <strong>Tags:</strong>
                </div>
                <div className={styles.selectedTags}>
                  {selectedTags.map((tag) => {
                    const popularTag = popularTags.find(pt => pt.slug === tag.slug);
                    const tagColor = popularTag?.color || '#6B7280';
                    return (
                      <span
                        key={tag.slug}
                        className={styles.filterValue}
                        style={{ backgroundColor: tagColor }}
                      >
                        {tag.name}
                        <button
                          className={`${styles.clearFilter} ${styles.tagRemove}`}
                          onClick={() => handleTagRemove(tag.slug)}
                          title={`Remove ${tag.name} filter`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {searchQuery && (
              <div className={styles.filterItem}>
                <div className={styles.filterLabel}>
                  <strong>Search:</strong>
                </div>
                <span className={styles.filterValue}>
                  "{searchQuery}"
                  <button
                    className={styles.clearFilter}
                    onClick={handleClearSearch}
                    title="Clear search filter"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
            <div className={styles.filterStats}>
              Filtering {selectedTags.length > 0 ? `by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''}` : ''}
              {selectedTags.length > 0 && searchQuery ? ' and ' : ''}
              {searchQuery ? 'search term' : ''}
            </div>
          </div>
        )}
        {user && isAuthenticated && (
          <div className={styles.userSection}>
            <h3>Quick Actions</h3>
            <div className={styles.userActions}>
              <button className={styles.actionBtn} onClick={() => navigate('/create-post')}>
                Create Post
              </button>
              <button 
                className={styles.actionBtn} 
                onClick={() => navigate(`/profile/${user.username}`)}
                disabled={!user.username}
              >
                My Profile
              </button>
            </div>
          </div>
        )}
        {isTagsModalOpen && (
            <TagsModal 
              onClose={() => setIsTagsModalOpen(false)} 
              onTagSelect={handleTagToggle}
              selectedTags={selectedTags}
            />
        )}
      </div>
    </>
  );
};

export default Sidebar;