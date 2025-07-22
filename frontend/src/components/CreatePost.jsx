// CreatePost.jsx - Improved Hybrid Tagging Logic

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import styles from './CreatePost.module.css';
import { PlusCircle, Loader } from 'lucide-react'; // Import icons

const CreatePost = ({ onPostCreated }) => {
    const navigate = useNavigate();

    // Form states
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Tag states
    const [allAvailableTags, setAllAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isCreatingTag, setIsCreatingTag] = useState(false);

    // UI states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const tagInputRef = useRef(null);

    // chatbot
    const [autoAskBot, setAutoAskBot] = useState(false);


    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await apiService.getTags({ page_size: 1000 });
                setAllAvailableTags(response.results || response || []);
            } catch (err) {
                console.error('Error fetching tags:', err);
            }
        };
        fetchTags();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tagInputRef.current && !tagInputRef.current.contains(event.target)) {
                setIsTagDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setImage(null);
            setImagePreview(null);
        }
    };

    const addTagToSelected = (tag) => {
        if (!selectedTags.some(t => t.id === tag.id)) {
            setSelectedTags([...selectedTags, tag]);
        }
        setTagInput('');
        setIsTagDropdownOpen(false);
    };

    const handleTagRemoval = (tagToRemove) => {
        setSelectedTags(selectedTags.filter(tag => tag.id !== tagToRemove.id));
    };

    const handleCreateAndSelectTag = async () => {
        const tagName = tagInput.trim();
        if (tagName.length < 2 || isCreatingTag) return;

        setIsCreatingTag(true);
        setError('');
        try {
            const newTag = await apiService.createTag({ name: tagName });
            // Cập nhật danh sách tag tổng thể nếu nó là tag mới
            if (!allAvailableTags.some(t => t.id === newTag.id)) {
                setAllAvailableTags(prevTags => [...prevTags, newTag]);
            }
            addTagToSelected(newTag);
        } catch (err) {
            console.error('Error creating tag:', err);
            setError(err.data?.error || 'Could not create new tag.');
        } finally {
            setIsCreatingTag(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Title is required.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const tagIds = selectedTags.map(tag => tag.id);

            // Dùng FormData để hỗ trợ upload file
            const postData = new FormData();
            postData.append('title', title.trim());
            postData.append('content', content.trim());
            if (image) {
                postData.append('image', image);
            }
            // Backend mong đợi một mảng các ID, gửi dưới dạng chuỗi JSON khi dùng FormData
            if (tagIds.length > 0) {
                 postData.append('tag_ids', JSON.stringify(tagIds));
            }
            
            let finalData = postData;
            // Nếu không có ảnh, có thể gửi JSON thuần túy
            if (!image) {
                finalData = {
                    title: title.trim(),
                    content: content.trim(),
                    tag_ids: tagIds,
                };
            }

            const newPost = await apiService.createPost(finalData);

            // Nếu bật autoAskBot, gửi yêu cầu đến bot
            if (autoAskBot) {
                try {
                    await apiService.askBot(newPost.id);
                } catch (err) {
                    console.error('Auto AskBot error:', err);
                    // không block, chỉ logging
                }
            }

            setSuccess('Post created successfully!');
            if (onPostCreated) {
                onPostCreated(newPost);
            }

            setTimeout(() => navigate(`/post/${newPost.id}`), 1500);

        } catch (err) {
            console.error('Create post error:', err);
            const errorMessage = err.data ? JSON.stringify(err.data) : err.message;
            setError(`Failed to create post: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTags = tagInput
        ? allAvailableTags.filter(tag =>
            tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
            !selectedTags.some(selected => selected.id === tag.id)
          )
        : [];
    
    // Kiểm tra xem có nên hiển thị tùy chọn "Create Tag" không
    const canCreateTag = tagInput.trim().length > 1 && !filteredTags.some(t => t.name.toLowerCase() === tagInput.trim().toLowerCase());

    return (
        <div className={styles.createPostContainer}>
            <h2 className={styles.title}>Create a Post</h2>
            {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
            {success && <div className={`${styles.message} ${styles.success}`}>{success}</div>}

            <form className={styles.postForm} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="title">Title *</label>
                    <input type="text" id="title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="An interesting title" required disabled={isLoading} />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="content">Content</label>
                    <textarea id="content" className={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Your text post (optional)" disabled={isLoading} rows="6" />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="image" className={styles.label}>Upload Image (Optional)</label>
                    <input type="file" id="image" className={styles.fileInput} accept="image/*" onChange={handleImageChange} disabled={isLoading} />
                    {imagePreview && <img src={imagePreview} alt="Preview" className={styles.previewImage} />}
                </div>
                
                <div className={styles.formGroup} ref={tagInputRef}>
                    <label htmlFor="tagInput">Tags</label>
                    <input
                        type="text" id="tagInput" className={styles.input}
                        placeholder="Search or create tags..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onFocus={() => setIsTagDropdownOpen(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                // Nếu có gợi ý đầu tiên, chọn nó. Nếu không, tạo mới.
                                if(filteredTags.length > 0) {
                                    addTagToSelected(filteredTags[0]);
                                } else if(canCreateTag) {
                                    handleCreateAndSelectTag();
                                }
                            }
                        }}
                        disabled={isLoading}
                    />
                    
                    {isTagDropdownOpen && tagInput && (
                        <div className={styles.tagsSuggestions}>
                            {filteredTags.slice(0, 5).map(tag => (
                                <div key={tag.id} className={styles.suggestionItem} onClick={() => addTagToSelected(tag)}>
                                    {tag.name}
                                </div>
                            ))}
                            {canCreateTag && (
                                <div className={styles.suggestionItem} onClick={handleCreateAndSelectTag}>
                                    {isCreatingTag ? (
                                        <Loader size={16} className={styles.spinner} />
                                    ) : (
                                        <PlusCircle size={16} />
                                    )}
                                    <span>Create tag "{tagInput.trim()}"</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                        <input
                        type="checkbox"
                        checked={autoAskBot}
                        onChange={() => setAutoAskBot(!autoAskBot)}
                        disabled={isLoading}
                        />
                        {' '}Auto-review with AI bot
                    </label>
                </div>

                {selectedTags.length > 0 && (
                    <div className={styles.selectedTagsContainer}>
                        {selectedTags.map(tag => (
                            <span key={tag.id} className={styles.selectedTagItem}>
                                {tag.name}
                                <button type="button" onClick={() => handleTagRemoval(tag)} className={styles.removeTagBtn}>×</button>
                            </span>
                        ))}
                    </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={isLoading || isCreatingTag}>
                    {isLoading ? 'Submitting...' : 'Create Post'}
                </button>
            </form>
        </div>
    );
};

export default CreatePost;