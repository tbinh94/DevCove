// src/components/CreatePost.jsx - Đã cập nhật để hỗ trợ AI Code Generator và tự động phát hiện ngôn ngữ
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import styles from './CreatePost.module.css';
import { PlusCircle, Loader, Sparkles, Wand2 } from 'lucide-react';

const CreatePost = ({ onPostCreated }) => {
    const navigate = useNavigate();

    // Form states
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [language, setLanguage] = useState('text'); // <-- Thêm state để lưu ngôn ngữ, mặc định là text
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    // ... các state khác giữ nguyên ...
    // Tag states
    const [allAvailableTags, setAllAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [initialTagName, setInitialTagName] = useState(null);

    // AI Review prompt states
    const [promptOptions, setPromptOptions] = useState([]); 
    const [selectedPrompt, setSelectedPrompt] = useState(''); 

    // --- THÊM STATE MỚI CHO AI CODE GENERATOR ---
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [codePrompt, setCodePrompt] = useState('');
    const [isGeneratorLoading, setIsGeneratorLoading] = useState(false);
    const [generatorError, setGeneratorError] = useState('');

    // UI states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const tagInputRef = useRef(null);

    // ... useEffects giữ nguyên ...
    useEffect(() => {
        const fetchData = async () => {
            try {
                const tagsResponse = await apiService.getTags({ page_size: 1000 });
                setAllAvailableTags(tagsResponse.results || tagsResponse || []);
                
                const promptsResponse = await apiService.getAvailablePrompts();
                if (promptsResponse.available_prompts) {
                    const suitablePrompts = promptsResponse.available_prompts.filter(
                        p => p.key !== 'summarize_post_list' && p.key !== 'custom_analysis'
                    );
                    setPromptOptions(suitablePrompts);
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
            }
        };
        fetchData();
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

    useEffect(() => {
        const storedCode = sessionStorage.getItem('create_post_code');
        const storedTitle = sessionStorage.getItem('create_post_title');
        const storedTagName = sessionStorage.getItem('create_post_tag_name');

        if (storedCode) {
            setContent(storedCode);
            sessionStorage.removeItem('create_post_code');
        }
        if (storedTitle) {
            setTitle(storedTitle);
            sessionStorage.removeItem('create_post_title');
        }
        if (storedTagName) {
            setInitialTagName(storedTagName);
            sessionStorage.removeItem('create_post_tag_name');
        }
    }, []);

    useEffect(() => {
        if (initialTagName && allAvailableTags.length > 0) {
            const tagToSelect = allAvailableTags.find(
                tag => tag.name.toLowerCase() === initialTagName.toLowerCase()
            );
            if (tagToSelect) {
                addTagToSelected(tagToSelect);
                setInitialTagName(null);
            } else {
                console.warn(`Tag "${initialTagName}" not found in available tags.`);
                setInitialTagName(null);
            }
        }
    }, [initialTagName, allAvailableTags]);


    // --- HÀM MỚI ĐỂ XỬ LÝ VIỆC TẠO CODE ---
    const handleGenerateCode = async () => {
        if (!codePrompt.trim()) {
            setGeneratorError('Please describe the code you want to generate.');
            return;
        }
        setIsGeneratorLoading(true);
        setGeneratorError('');
        try {
            // --- LOGIC SUY LUẬN NGÔN NGỮ ---
            const promptLowerCase = codePrompt.toLowerCase();
            const knownLanguages = ['c++', 'c#', 'c', 'python', 'javascript', 'java', 'go', 'rust', 'php', 'ruby', 'html', 'css', 'sql'];
            const detectedLang = knownLanguages.find(lang => promptLowerCase.includes(lang)) || 'javascript';            setLanguage(detectedLang.replace('c#', 'csharp').replace('c++', 'cpp')); // Cập nhật state ngôn ngữ
            const finalLang = detectedLang.replace('c#', 'csharp').replace('c++', 'cpp');
            setLanguage(finalLang); // Cập nhật state ngôn ngữ
            // ---------------------------------

            const response = await apiService.generateCodeSnippet(codePrompt);
            setContent(response.code);
            setIsGeneratingCode(false);
            setCodePrompt('');
        } catch (err) {
            console.error('AI code generation error:', err);
            const errorMessage = err.data?.error || err.message || 'Failed to generate code.';
            setGeneratorError(errorMessage);
        } finally {
            setIsGeneratorLoading(false);
        }
    };
    
    // Reset ngôn ngữ nếu người dùng xóa content
    useEffect(() => {
        if (!content.trim()) {
            setLanguage('text');
        }
    }, [content]);


    // ... (các hàm xử lý tag, image, v.v. giữ nguyên) ...
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

            // --- THAY ĐỔI QUAN TRỌNG Ở ĐÂY ---
            if (selectedPrompt) {
                try {
                    // Gửi cả `prompt_type` và `language` đã được suy luận
                    await apiService.askBot(newPost.id, { 
                        prompt_type: selectedPrompt,
                        language: language // Sử dụng state language
                    });
                } catch (err) {
                    console.error('Auto AskBot error:', err);
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
                
                {/* --- Giao diện không đổi, không cần thêm dropdown --- */}
                <div className={styles.formGroup}>
                    <div className={styles.contentHeader}>
                         <label htmlFor="content">Content</label>
                         <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isGeneratingCode}
                                onChange={(e) => setIsGeneratingCode(e.target.checked)}
                                disabled={isLoading}
                            />
                            <Sparkles size={16} />
                            AI Code Snippet Generator
                        </label>
                    </div>

                    {isGeneratingCode ? (
                        <div className={styles.aiGeneratorBox}>
                            <label htmlFor="codePrompt" className={styles.label}>Describe the code you want to generate</label>
                            <textarea
                                id="codePrompt"
                                className={styles.aiGeneratorInput}
                                value={codePrompt}
                                onChange={(e) => setCodePrompt(e.target.value)}
                                placeholder="e.g., a python function to merge sort a list of numbers"
                                disabled={isGeneratorLoading}
                                rows="3"
                            />
                            {generatorError && <div className={styles.generatorError}>{generatorError}</div>}
                            <button
                                type="button"
                                className={styles.aiGeneratorButton}
                                onClick={handleGenerateCode}
                                disabled={isGeneratorLoading}
                            >
                                {isGeneratorLoading ? (
                                    <Loader size={18} className={styles.spinner} />
                                ) : (
                                    <Wand2 size={18} />
                                )}
                                <span>{isGeneratorLoading ? 'Generating...' : 'Generate Code'}</span>
                            </button>
                        </div>
                    ) : (
                        <textarea
                            id="content"
                            className={styles.textarea}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Your text post (optional). Or use the AI generator above!"
                            disabled={isLoading}
                            rows="10"
                        />
                    )}
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

                <div className={styles.formGroup}>
                    <label htmlFor="ai-review-prompt" className={styles.label}>
                        Auto-review with AI bot (Optional)
                    </label>
                    <select
                        id="ai-review-prompt"
                        className={styles.input}
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

                <button type="submit" className={styles.submitBtn} disabled={isLoading || isCreatingTag || isGeneratorLoading}>
                    {isLoading ? 'Submitting...' : 'Create Post'}
                </button>
            </form>
        </div>
    );
};

export default CreatePost;