// src/components/CreatePost.jsx - Đã cập nhật để hỗ trợ chọn prompt AI
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import styles from './CreatePost.module.css';
import { PlusCircle, Loader } from 'lucide-react';

const CreatePost = ({ onPostCreated }) => {
    const navigate = useNavigate();

    // Form states
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    // Tag states
    const [allAvailableTags, setAllAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isCreatingTag, setIsCreatingTag] = useState(false);

    // --- THAY ĐỔI 1: Cập nhật state cho chatbot ---
    // State để lưu các tùy chọn prompt từ API
    const [promptOptions, setPromptOptions] = useState([]); 
    // State để lưu prompt người dùng đã chọn
    const [selectedPrompt, setSelectedPrompt] = useState(''); 
    // Bỏ state cũ: const [autoAskBot, setAutoAskBot] = useState(false);

    // UI states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const tagInputRef = useRef(null);

    // --- THÊM STATE MỚI ĐỂ XỬ LÝ TAG TỰ ĐỘNG ---
    const [initialTagName, setInitialTagName] = useState(null);

    // Fetch tags khi component mount
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

    // --- THAY ĐỔI 2: Fetch các tùy chọn prompt AI ---
    useEffect(() => {
        const fetchPromptOptions = async () => {
            try {
                // Giả sử apiService có phương thức getAvailablePrompts() để gọi endpoint
                const response = await apiService.getAvailablePrompts();
                if (response.available_prompts) {
                    // Lọc ra các prompt không phù hợp cho việc review tự động 1 bài post
                    const suitablePrompts = response.available_prompts.filter(
                        p => p.key !== 'summarize_post_list' && p.key !== 'custom_analysis'
                    );
                    setPromptOptions(suitablePrompts);
                }
            } catch (err) {
                console.error('Error fetching prompt options:', err);
            }
        };
        fetchPromptOptions();
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


    // --- THÊM useEffect MỚI ĐỂ LẤY DỮ LIỆU TỪ SANDBOX ---
    useEffect(() => {
        const storedCode = sessionStorage.getItem('create_post_code');
        const storedTitle = sessionStorage.getItem('create_post_title');
        const storedTagName = sessionStorage.getItem('create_post_tag_name'); // <--- ĐỌC TÊN TAG

        if (storedCode) {
            setContent(storedCode);
            sessionStorage.removeItem('create_post_code');
        }
        if (storedTitle) {
            setTitle(storedTitle);
            sessionStorage.removeItem('create_post_title');
        }
        if (storedTagName) {
            setInitialTagName(storedTagName); // <--- LƯU TÊN TAG VÀO STATE
            sessionStorage.removeItem('create_post_tag_name');
        }
    }, []); // Chỉ chạy một lần

    // Hook để fetch tất cả các tag có sẵn
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

    // --- HOOK MỚI: Tự động chọn tag khi đã có đủ thông tin ---
    // Hook này sẽ chạy khi `initialTagName` được set hoặc khi `allAvailableTags` được load xong.
    useEffect(() => {
        if (initialTagName && allAvailableTags.length > 0) {
            // Tìm tag trong danh sách các tag đã fetch
            const tagToSelect = allAvailableTags.find(
                tag => tag.name.toLowerCase() === initialTagName.toLowerCase()
            );

            if (tagToSelect) {
                // Nếu tìm thấy, thêm nó vào danh sách các tag đã chọn
                addTagToSelected(tagToSelect);
                // Reset state để tránh chạy lại không cần thiết
                setInitialTagName(null);
            } else {
                // Nếu không tìm thấy tag (ví dụ: 'python' chưa có trong DB), bạn có thể
                // bỏ qua hoặc tự động tạo nó. Hiện tại, chúng ta chỉ bỏ qua.
                console.warn(`Tag "${initialTagName}" not found in available tags.`);
                setInitialTagName(null); // Reset để không tìm nữa
            }
        }
    }, [initialTagName, allAvailableTags]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setImage(null);
            setImagePreview('');
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
        if (tagName.length < 1 || isCreatingTag) return;
        if (!/\S/.test(tagName)) {
            setError('Tag name cannot be empty or contain only whitespace.');
            return;
        }
        setIsCreatingTag(true);
        setError('');
        try {
            const newTag = await apiService.createTag({ name: tagName });
            if (!allAvailableTags.some(t => t.id === newTag.id)) {
                setAllAvailableTags(prevTags => [...prevTags, newTag]);
            }
            addTagToSelected(newTag);
            setSuccess(`Tag "${tagName}" created successfully!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error creating tag:', err);
            const errorMessage = err.data?.error || err.data?.name?.[0] || err.message || 'Could not create new tag.';
            setError(`Failed to create tag "${tagName}": ${errorMessage}`);
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
            const postData = new FormData();
            postData.append('title', title.trim());
            postData.append('content', content.trim());
            if (image) {
                postData.append('image', image);
            }
            if (tagIds.length > 0) {
                postData.append('tag_ids', JSON.stringify(tagIds));
            }
            
            let finalData = postData;
            if (!image) {
                finalData = {
                    title: title.trim(),
                    content: content.trim(),
                    tag_ids: tagIds,
                };
            }

            const newPost = await apiService.createPost(finalData);

            // --- THAY ĐỔI 3: Cập nhật logic gọi bot ---
            // Nếu người dùng đã chọn một tùy chọn review, hãy gọi bot với prompt_type tương ứng
            if (selectedPrompt) {
                try {
                    // Truyền prompt_type vào body của request askBot
                    await apiService.askBot(newPost.id, { prompt_type: selectedPrompt });
                } catch (err) {
                    console.error('Auto AskBot error:', err);
                    // Không chặn luồng chính, chỉ log lỗi
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
    
    const canCreateTag = tagInput.trim().length > 0 && 
                        !/^\s*$/.test(tagInput) &&
                        !filteredTags.some(t => t.name.toLowerCase() === tagInput.trim().toLowerCase());

    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredTags.length > 0) {
                addTagToSelected(filteredTags[0]);
            } else if (canCreateTag) {
                handleCreateAndSelectTag();
            }
        }
    };

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
                    <input type="text" id="tagInput" className={styles.input} placeholder="Search or create tags (e.g., c++, c#, javascript)..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onFocus={() => setIsTagDropdownOpen(true)} onKeyDown={handleTagInputKeyDown} disabled={isLoading} />
                    {isTagDropdownOpen && tagInput && (
                        <div className={styles.tagsSuggestions}>
                            {filteredTags.slice(0, 5).map(tag => (
                                <div key={tag.id} className={styles.suggestionItem} onClick={() => addTagToSelected(tag)}>
                                    {tag.name}
                                </div>
                            ))}
                            {canCreateTag && (
                                <div className={styles.suggestionItem} onClick={handleCreateAndSelectTag}>
                                    {isCreatingTag ? <Loader size={16} className={styles.spinner} /> : <PlusCircle size={16} />}
                                    <span>Create tag "{tagInput.trim()}"</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- THAY ĐỔI 4: Thay thế checkbox bằng dropdown --- */}
                <div className={styles.formGroup}>
                    <label htmlFor="ai-review-prompt" className={styles.label}>
                        Auto-review with AI bot (Optional)
                    </label>
                    <select
                        id="ai-review-prompt"
                        className={styles.input} // Tái sử dụng style của input
                        value={selectedPrompt}
                        onChange={(e) => setSelectedPrompt(e.target.value)}
                        disabled={isLoading || promptOptions.length === 0}
                    >
                        <option value="">-- No AI Review --</option>
                        {promptOptions.map(option => (
                            <option key={option.key} value={option.key}>
                                {option.title}
                            </option>
                        ))}
                    </select>
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