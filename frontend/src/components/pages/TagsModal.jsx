// src/components/TagsModal/TagsModal.jsx - ĐÃ SỬA ĐỔI

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from './TagsModal.module.css';
import apiService from '../../services/api';
import { X, Search, Loader } from 'lucide-react';

// CHANGED: TagItem giờ là một button và gọi hàm onSelect được truyền vào
const TagItem = ({ tag, onSelect, isSelected }) => (
    <button 
        onClick={() => onSelect(tag)} 
        className={`${styles.tagItem} ${isSelected ? styles.selected : ''}`}
    >
        <span className={styles.tagName}>{tag.name}</span>
        <span className={styles.tagCount}>{tag.posts_count}</span>
        {isSelected && <span className={styles.checkIcon}>✓</span>}
    </button>
);

// CHANGED: Modal nhận thêm prop onTagSelect và selectedTags
const TagsModal = ({ onClose, onTagSelect, selectedTags = [] }) => {
    const [allTags, setAllTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name-asc');
    
    // Tạo một Set từ các slug đã chọn để kiểm tra nhanh
    const selectedSlugs = useMemo(() => new Set(selectedTags.map(t => t.slug)), [selectedTags]);

    const fetchTags = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiService.getTags({ page_size: 1000 });
            
            if (response && Array.isArray(response.results)) {
                setAllTags(response.results);
            } else {
                throw new Error("Invalid data format received from API.");
            }
        } catch (err) {
            console.error("Failed to fetch tags:", err);
            setError(err.message || 'Could not load tags.');
        } finally {
            setIsLoading(false);
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        fetchTags();
    }, []);

    const displayedTags = useMemo(() => {
        let tags = [...allTags];
        if (searchTerm) {
            tags = tags.filter(tag => 
                tag.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        tags.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'posts-desc': return b.posts_count - a.posts_count;
                case 'posts-asc': return a.posts_count - b.posts_count;
                default: return 0;
            }
        });
        return tags;
    }, [allTags, searchTerm, sortBy]);

    const handleTagClick = (tag) => {
        // Gọi hàm từ component cha đã được truyền vào qua prop
        if (onTagSelect) {
            onTagSelect(tag.slug);
        }
        // Không cần đóng modal, để người dùng có thể chọn nhiều tag
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                {/* HEADER */}
                <div className={styles.modalHeader}>
                    <h2>All Tags</h2>
                    <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTROLS */}
                <div className={styles.controls}>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} />
                        <input 
                            type="text" 
                            placeholder="Search tags..." 
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.sortWrapper}>
                        <label htmlFor="sort-tags">Sort by:</label>
                        <select 
                            id="sort-tags"
                            className={styles.sortSelect}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                            <option value="posts-desc">Popularity</option>
                            <option value="posts-asc">Less Popular</option>
                        </select>
                    </div>
                </div>

                {/* BODY */}
                <div className={styles.modalBody}>
                    {isLoading && (
                        <div className={styles.statusIndicator}>
                            <Loader className={styles.spinner} size={24} />
                            <p>Loading Tags...</p>
                        </div>
                    )}

                    {!isLoading && error && (
                        <div className={styles.statusIndicator}>
                            <p className={styles.errorMessage}>Error: {error}</p>
                            <button onClick={fetchTags} className={styles.retryButton}>
                                Retry
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && displayedTags.length > 0 && (
                        <div className={styles.tagsList}>
                            {displayedTags.map(tag => (
                                <TagItem 
                                    key={tag.id} 
                                    tag={tag} 
                                    onSelect={handleTagClick}
                                    isSelected={selectedSlugs.has(tag.slug)}
                                />
                            ))}
                        </div>
                    )}
                    
                    {!isLoading && !error && displayedTags.length === 0 && (
                         <div className={styles.statusIndicator}>
                             <p>No tags found.</p>
                         </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className={styles.modalFooter}>
                    <p className={styles.footerText}>
                        {selectedTags.length > 0 
                            ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                            : 'Select tags to filter posts'
                        }
                    </p>
                    <button onClick={onClose} className={styles.doneButton}>
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body // Render modal directly to body
    );
};

export default TagsModal;