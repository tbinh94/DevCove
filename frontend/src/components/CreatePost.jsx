import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import styles from './CreatePost.module.css';

const CreatePost = ({ isAuthenticated = true, onPostCreated }) => {
  const navigate = useNavigate();

  const [postType, setPostType] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagsOptions, setTagsOptions] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formRef = useRef(null);
  const textareaRef = useRef(null);

  // Fetch tags on mount
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await apiService.getTags();
        console.log('Loaded tags:', tags);
        setTagsOptions(tags);
      } catch (err) {
        console.error('Failed to load tags', err);
      }
    }
    loadTags();
  }, []);

  // Toggle a tag in selectedTags
  const handleTagToggle = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Helper to get CSRF token
  const getCookie = (name) => {
    let value = null;
    document.cookie.split(';').forEach(c => {
      c = c.trim();
      if (c.startsWith(name + '=')) {
        value = decodeURIComponent(c.substring(name.length + 1));
      }
    });
    return value;
  };

  // Debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Update textarea height
  const handleTextareaResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 400) + 'px';
    }
  }, []);

  useEffect(() => {
    handleTextareaResize();
  }, [content, handleTextareaResize]);

  // Handle tab click events
  const handleTabClick = (type) => {
    setPostType(type);
    setError('');
    if (type !== 'text') setContent('');
    if (type !== 'image') setImage(null);
    if (type !== 'link') setImageUrl('');
    if (type !== 'poll') setPollOptions(['', '']);
  };

  // Validate files
  const validateFiles = (files) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (let file of files) {
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }

      if (!allowedTypes.includes(file.type)) {
        setError(`File "${file.name}" is not a supported image type.`);
        return false;
      }
    }
    return true;
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      if (validateFiles(files)) {
        setImage(files[0]);
        setError('');
      } else {
        setImage(null);
      }
    } else {
      setImage(null);
    }
  };

  // Handle poll option changes
  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index) => {
    const newOptions = pollOptions.filter((_, i) => i !== index);
    setPollOptions(newOptions);
  };

  // Form validation
  const validateForm = () => {
    if (!title.trim()) {
      setError('Title is required.');
      return false;
    }
    if (title.length > 300) {
      setError('Title must be less than 300 characters.');
      return false;
    }
    if (postType === 'text' && !content.trim()) {
      setError('Text content is required for text posts.');
      return false;
    }
    if (postType === 'image' && !image) {
      setError('An image is required for image posts.');
      return false;
    }
    if (postType === 'link' && (!imageUrl.trim() || !/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(imageUrl.trim()))) {
      setError('A valid URL is required for link posts.');
      return false;
    }
    if (postType === 'poll' && pollOptions.filter(o => o.trim()).length < 2) {
      setError('A poll must have at least two options.');
      return false;
    }
    setError('');
    return true;
  };

  // FIXED: Handle form submission with proper tag handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('post_type', postType);

      if (postType === 'text') {
        formData.append('content', content);
      } else if (postType === 'image') {
        formData.append('image', image);
      } else if (postType === 'link') {
        formData.append('link_url', imageUrl);
      } else if (postType === 'poll') {
        formData.append('poll_options', JSON.stringify(pollOptions.filter(o => o.trim())));
      }

      // FIXED: Multiple approaches for sending tags
      if (selectedTags.length > 0) {
        // Method 1: Send each tag ID as separate 'tags' field (most common Django approach)
        selectedTags.forEach(tagId => {
          formData.append('tags', tagId);
        });
        
        // Method 2: Also send as JSON array (backup approach)
        formData.append('tag_ids', JSON.stringify(selectedTags));
        
        // Method 3: Send as comma-separated string (another common approach)
        formData.append('tags_string', selectedTags.join(','));
      }

      // Debug logging
      console.log('Submitting post with data:');
      console.log('- title:', title);
      console.log('- post_type:', postType);
      console.log('- selectedTags:', selectedTags);
      
      // Log all FormData entries
      for (let pair of formData.entries()) {
        console.log(`- ${pair[0]}:`, pair[1]);
      }

      const response = await apiService.createPost(formData);
      console.log('Create post response:', response);

      setSuccess('Post created successfully!');
      
      // Clear form
      setTitle('');
      setContent('');
      setImage(null);
      setImageUrl('');
      setPollOptions(['', '']);
      setSelectedTags([]);
      
      if (onPostCreated) onPostCreated();
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/');
        // Force refresh to show the new post
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error('Create post error:', err);
      
      let errorMessage = 'An unexpected error occurred.';
      
      if (err.message) {
        errorMessage = err.message;
        
        // Try to parse validation errors if it's a 400 error
        if (err.message.includes('400')) {
          try {
            const jsonMatch = err.message.match(/\{.*\}/);
            if (jsonMatch) {
              const errorData = JSON.parse(jsonMatch[0]);
              console.log('Parsed error data:', errorData);
              
              // Format validation errors
              const validationErrors = Object.entries(errorData)
                .map(([field, errors]) => {
                  const errorText = Array.isArray(errors) ? errors.join(', ') : errors;
                  return `${field}: ${errorText}`;
                })
                .join('; ');
              
              errorMessage = `Validation errors: ${validationErrors}`;
            }
          } catch (parseError) {
            console.log('Could not parse error details:', parseError);
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-hide error/success messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Handle keyboard shortcut for submission
  const handleKeyDown = useCallback(debounce((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  }, 100), []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get selected tag names for preview
  const getSelectedTagNames = () => {
    return selectedTags.map(tagId => {
      const tag = tagsOptions.find(t => t.id === tagId);
      return tag ? tag.name : '';
    }).filter(name => name);
  };

  return (
    <div className={styles.createPostContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Create a Post</h2>
        {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
        {success && <div className={`${styles.message} ${styles.success}`}>{success}</div>}
      </div>

      <div className={styles.postTypeTabs}>
        <button
          className={`${styles.tab} ${postType === 'text' ? styles.active : ''}`}
          onClick={() => handleTabClick('text')}
        >
          Text
        </button>
        <button
          className={`${styles.tab} ${postType === 'image' ? styles.active : ''}`}
          onClick={() => handleTabClick('image')}
        >
          Image
        </button>
        <button
          className={`${styles.tab} ${postType === 'link' ? styles.active : ''}`}
          onClick={() => handleTabClick('link')}
        >
          Link
        </button>
        <button
          className={`${styles.tab} ${postType === 'poll' ? styles.active : ''}`}
          onClick={() => handleTabClick('poll')}
        >
          Poll
        </button>
      </div>

      <form ref={formRef} className={styles.postForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>Title</label>
          <input
            type="text"
            id="title"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title (max 300 characters)"
            maxLength={300}
            required
            disabled={isLoading}
          />
        </div>

        {postType === 'text' && (
          <div id="textContent" className={styles.formGroup}>
            <label htmlFor="content" className={styles.label}>Content</label>
            <textarea
              id="content"
              ref={textareaRef}
              className={`${styles.textarea} ${styles.contentInput}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are your thoughts?"
              disabled={isLoading}
              rows="5"
            ></textarea>
          </div>
        )}

        {/* IMPROVED: Tags Selection with better UI */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Tags {selectedTags.length > 0 && `(${selectedTags.length} selected)`}
          </label>
          <div className={styles.tagsContainer}>
            {tagsOptions.map(tag => (
              <label key={tag.id} className={styles.tagOption}>
                <input
                  type="checkbox"
                  value={tag.id}
                  checked={selectedTags.includes(tag.id)}
                  onChange={() => handleTagToggle(tag.id)}
                  disabled={isLoading}
                />
                <span className={styles.tagLabel}>{tag.name}</span>
              </label>
            ))}
            {tagsOptions.length === 0 && <p>No tags available.</p>}
          </div>
          {/* Show selected tags preview */}
          {selectedTags.length > 0 && (
            <div className={styles.selectedTagsPreview}>
              <small>Selected tags: {getSelectedTagNames().join(', ')}</small>
            </div>
          )}
        </div>

        {postType === 'image' && (
          <div id="imageContent" className={styles.formGroup}>
            <label htmlFor="image" className={styles.label}>Upload Image</label>
            <input
              type="file"
              id="image"
              className={styles.fileInput}
              accept="image/jpeg, image/png, image/gif, image/webp"
              onChange={handleImageChange}
              disabled={isLoading}
            />
            {image && (
              <p className={styles.fileLabel}>Selected: {image.name}</p>
            )}
            {!image && (
              <p className={styles.fileLabel}>No file chosen</p>
            )}
          </div>
        )}

        {postType === 'link' && (
          <div id="linkContent" className={styles.formGroup}>
            <label htmlFor="linkUrl" className={styles.label}>Link URL</label>
            <input
              type="url"
              id="linkUrl"
              className={styles.input}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter URL (e.g., https://example.com)"
              required
              disabled={isLoading}
            />
          </div>
        )}

        {postType === 'poll' && (
          <div id="pollContent" className={styles.formGroup}>
            <label className={styles.label}>Poll Options</label>
            {pollOptions.map((option, index) => (
              <div key={index} className={styles.pollOption}>
                <input
                  type="text"
                  className={styles.input}
                  value={option}
                  onChange={(e) => handlePollOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  maxLength={100}
                  disabled={isLoading}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePollOption(index)}
                    className={styles.removeOptionBtn}
                    disabled={isLoading}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 10 && (
              <button
                type="button"
                onClick={addPollOption}
                className={styles.addOptionBtn}
                disabled={isLoading}
              >
                + Add Option
              </button>
            )}
            <p className={styles.pollNote}>Polls must have at least two options. You can add up to 10 options.</p>
          </div>
        )}

        <div className={styles.postPreview} id="postPreview">
          <h3 className={styles.previewTitle} id="previewTitle">
            Preview: {title || 'Your Post Title Will Appear Here'}
          </h3>
          
          {/* IMPROVED: Show selected tags in preview */}
          {selectedTags.length > 0 && (
            <div className={styles.previewTags}>
              <strong>Tags: </strong>
              {getSelectedTagNames().map((tagName, index) => (
                <span key={index} className={styles.previewTag}>
                  {tagName}
                  {index < getSelectedTagNames().length - 1 && ', '}
                </span>
              ))}
            </div>
          )}
          
          {postType === 'text' && (
            <p className={styles.previewContent} id="previewContent">
              {content || 'No additional text for preview'}
            </p>
          )}
          {postType === 'image' && image && (
            <img src={URL.createObjectURL(image)} alt="Image Preview" className={styles.previewImage} />
          )}
          {postType === 'link' && imageUrl && (
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
              {imageUrl}
            </a>
          )}
          {postType === 'poll' && pollOptions.filter(opt => opt.trim() !== '').length > 0 && (
            <ul className={styles.previewPollOptions}>
              {pollOptions.filter(opt => opt.trim() !== '').map((option, index) => (
                <li key={index}>{option}</li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className={styles.submitBtn} id="submitBtn" disabled={isLoading}>
          {isLoading ? 'Creating Post...' : 'Create Post'}
        </button>
      </form>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>Creating your post...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;