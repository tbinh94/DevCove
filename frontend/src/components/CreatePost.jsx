import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import styles from './CreatePost.module.css';

const CreatePost = ({ onPostCreated }) => {
  const navigate = useNavigate();

  // State cho form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // State cho Tags
  const [allAvailableTags, setAllAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // State cho UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tagInputRef = useRef(null);

  // Fetch tất cả các tag khi component được mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await apiService.getTags({page_size: 1000}); // Lấy nhiều tag
        setAllAvailableTags(response.results || response || []);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Xử lý sự kiện click ra ngoài để đóng dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target)) {
        setIsTagDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTagSelection = (tag) => {
    // Tránh thêm tag trùng lặp
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagInput(''); // Reset input
    setIsTagDropdownOpen(false); // Đóng dropdown
  };

  const handleTagRemoval = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag.id !== tagToRemove.id));
  };
  
  const handleCreateAndSelectTag = async () => {
    const tagName = tagInput.trim();
    if (tagName.length < 2) return;

    // Kiểm tra xem tag đã có trong danh sách suggestion chưa
    const existingTag = filteredTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (existingTag) {
      handleTagSelection(existingTag);
      return;
    }

    setIsLoading(true);
    try {
      const newTag = await apiService.createTag({ name: tagName });
      setAllAvailableTags([...allAvailableTags, newTag]);
      handleTagSelection(newTag);
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('Could not create new tag.');
    } finally {
      setIsLoading(false);
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
      // Lấy danh sách ID từ các tag đã chọn
      const tagIds = selectedTags.map(tag => tag.id);

      // Chuẩn bị dữ liệu để gửi đi
      const postData = new FormData();
      postData.append('title', title.trim());
      postData.append('content', content.trim());
      
      if (image) {
        postData.append('image', image);
      }
      
      // Quan trọng: Gửi mảng ID dưới dạng một chuỗi JSON
      // Backend sẽ parse chuỗi này
      if (tagIds.length > 0) {
        postData.append('tag_ids', JSON.stringify(tagIds));
      }
      
      // Nếu không có ảnh, chúng ta có thể gửi dưới dạng JSON object thuần túy
      // Nhưng để đơn giản, chúng ta dùng FormData cho cả 2 trường hợp
      let finalData = postData;
      if (!image) {
          finalData = {
              title: title.trim(),
              content: content.trim(),
              tag_ids: tagIds,
          };
      }


      const newPost = await apiService.createPost(finalData);
      
      setSuccess('Post created successfully!');
      
      if (onPostCreated) {
        onPostCreated(newPost);
      }
      
      // Reset form và điều hướng sau 1.5s
      setTimeout(() => navigate(`/posts/${newPost.id}`), 1500);

    } catch (err) {
      console.error('Create post error:', err);
      const errorMessage = err.data?.error || err.message || 'An unknown error occurred.';
      setError(`Failed to create post: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Lọc danh sách tag để gợi ý cho người dùng
  const filteredTags = tagInput
    ? allAvailableTags.filter(tag =>
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTags.some(selected => selected.id === tag.id)
      )
    : [];

  return (
    <div className={styles.createPostContainer}>
      <h2 className={styles.title}>Create a Post</h2>
      {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
      {success && <div className={`${styles.message} ${styles.success}`}>{success}</div>}

      <form className={styles.postForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Title *</label>
          <input
            type="text" id="title" className={styles.input}
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="An interesting title" required disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="content">Content</label>
          <textarea
            id="content" className={styles.textarea} value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your text post (optional)" disabled={isLoading} rows="6"
          />
        </div>

        <div className={styles.formGroup}>
            <label htmlFor="image" className={styles.label}>Upload Image (Optional)</label>
            <input
              type="file" id="image" className={styles.fileInput}
              accept="image/*" onChange={handleImageChange} disabled={isLoading}
            />
            {imagePreview && <img src={imagePreview} alt="Preview" className={styles.previewImage} />}
        </div>
        
        {/* --- TAGS INPUT SECTION --- */}
        <div className={styles.formGroup} ref={tagInputRef}>
          <label htmlFor="tagInput">Tags</label>
          <input
            type="text" id="tagInput" className={styles.input}
            placeholder="Search or create tags (e.g., Python, React)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setIsTagDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateAndSelectTag();
              }
            }}
            disabled={isLoading}
          />
          
          {isTagDropdownOpen && filteredTags.length > 0 && (
            <div className={styles.tagsSuggestions}>
              {filteredTags.slice(0, 7).map(tag => (
                <div key={tag.id} className={styles.suggestionItem} onClick={() => handleTagSelection(tag)}>
                  {tag.name}
                </div>
              ))}
            </div>
          )}
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
        {/* --- END TAGS INPUT SECTION --- */}

        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;